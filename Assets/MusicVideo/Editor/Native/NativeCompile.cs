using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Native acting: a human actor played by Unity's own animation system. Its `anim`, `walk` and `layer` cues become clips on a Timeline
    /// AnimationTrack bound to its Animator with the Humanoid Avatar: crossfades in muscle space from overlapping clips (the overlap is `blend`),
    /// Foot IK where clipimport measured that it helps (off otherwise), upper and lower body from Override tracks with an AvatarMask. Our MotionTrack still moves the actor (marks, walks,
    /// root motion) and the face; it no longer touches a bone of a native actor. Timeline is a pure function of its time, so scrub and reverse hold.
    /// `"native":true` on the score or on an actor turns it on; new videos have it on, the videos that existed on 2026-11-07 keep the old path.
    /// </summary>
    public partial class ScoreCompiler
    {
        /// <summary>For a test build: every human native (true) or none (false), whatever the score says. Set by `call buildnative`.</summary>
        public static bool? NativeOverride;
        static readonly string[] LegacyVideos = { "tkshock", "greener", "hawkespunch", "touchgrass", "demo", "_cards_test", "styletest" };
        public const string NativeDir = "Assets/MusicVideo/Generated/Native";

        bool NativeActor(string name)
        {
            if (_labOps != null || !_actors.TryGetValue(name, out var a) || a.human.Length == 0) return false;
            if (NativeOverride.HasValue) return NativeOverride.Value;
            if (_score["actors"]?[name] is JObject def && def["native"] != null) return (bool)def["native"];
            if (_score["native"] != null) return (bool)_score["native"];
            return Array.IndexOf(LegacyVideos, Video.Name) < 0;
        }

        /// <summary>The cleaned copy of a clip when cleanclips has made one (Motion/Clean), else the clip.</summary>
        static AnimationClip NativeClipOf(AnimationClip c) => MVClipClean.CleanOf(c.name) ?? c;
        static bool NativeFootIK(AnimationClip c) => MVClipClean.CleanOf(c.name) ? MVClipClean.CleanFootIK(c.name) : MVClipImport.FootIKFor(c.name);

        class Seg { public AnimationClip clip; public double start, end, clipIn, scale = 1; public bool loop = true; public string why; }

        static void SetExtrapolation(TimelineClip c, TimelineClip.ClipExtrapolation pre, TimelineClip.ClipExtrapolation post)
        {
            var t = typeof(TimelineClip);
            t.GetProperty("preExtrapolationMode")?.GetSetMethod(true)?.Invoke(c, new object[] { pre });
            t.GetProperty("postExtrapolationMode")?.GetSetMethod(true)?.Invoke(c, new object[] { post });
        }

        static AvatarMask NativeMask(string mask)
        {
            if (!Directory.Exists(NativeDir)) Directory.CreateDirectory(NativeDir);
            string key = (mask ?? "all").ToLowerInvariant().Replace(",", "_").Replace(" ", ""), path = NativeDir + "/mask_" + key + ".mask";
            var m = AssetDatabase.LoadAssetAtPath<AvatarMask>(path);
            if (m) return m;
            m = new AvatarMask();
            for (int i = 0; i < (int)AvatarMaskBodyPart.LastBodyPart; i++) m.SetHumanoidBodyPartActive((AvatarMaskBodyPart)i, false);
            foreach (var p in MotionLab.NativeParts(mask)) m.SetHumanoidBodyPartActive(p, true);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        /// <summary>Clip time per scene second and the clip time at the cue's start, as AddLayer/ClipClock would have it.</summary>
        void ClipRate(JObject a, AnimationClip clip, double start, out double clipIn, out double scale, List<string> notes)
        {
            double len = clip.length; scale = (double?)a["speed"] ?? (double?)a["rate"] ?? 1; /* `speed` on a do cue never reaches here (a Meta key: scene speed); `rate` does (the epic toolkit) */ clipIn = ((double?)a["start"] ?? 0) + ((double?)a["offset"] ?? 0) * len;
            double beats = (double?)a["beats"] ?? 0;
            if (beats > 0) { double cyc = _song.TimeOf(_song.BeatAt(start) + beats) - start; if (cyc > 1e-3) scale = len / cyc; }
            if (a["warp"] is JObject w && w["t"] is JArray wt && w["c"] is JArray wc && wt.Count > 1)
            {
                double t0 = (double)wt[0], t1 = (double)wt[wt.Count - 1], c0 = (double)wc[0], c1 = (double)wc[wc.Count - 1];
                scale = (c1 - c0) / Math.Max(t1 - t0, 1e-3); clipIn = c0 - t0 * scale;
                notes.Add("warpTo plays at its average rate (" + scale.ToString("0.00") + "x)");
            }
            if (scale <= 0) scale = 1;
        }

        /// <summary>Writes every native actor's Animation tracks from its compiled lane. Runs after Realize, before the graph is built.</summary>
        void NativeTracks()
        {
            foreach (var t in _tl.GetRootTracks().OfType<AnimationTrack>().Where(x => x.name.StartsWith("native_")).ToList()) _tl.DeleteTrack(t);
            double songEnd = _song ? _song.duration : _tl.duration;
            if (_steps.Count > 0 || _speeds.Count > 0) _warn.Add("native actors play on song time: `steps` and `speed` don't reach their bodies yet (hitstop and freeze do)");
            foreach (var kv in _motion)
            {
                if (!_actors.TryGetValue(kv.Key, out var a)) continue;
                bool on = NativeActor(kv.Key);
                a.native = false;
                if (!on) continue;
                var an = a.animRoot ? a.animRoot.GetComponentInChildren<Animator>(true) : null;
                if (!an || !an.isHuman || !an.avatar) { _warn.Add(kv.Key + ": native needs an Animator with a Humanoid Avatar; it plays on the old path"); continue; }
                a.native = true;
                an.enabled = true; an.applyRootMotion = false; an.cullingMode = AnimatorCullingMode.AlwaysAnimate; an.runtimeAnimatorController = null;
                var notes = new List<string>();
                var ops = kv.Value.ops.Select((o, i) => (o, i)).OrderBy(x => x.o.start).ThenBy(x => x.i).Select(x => x.o).ToList();

                // The body: one clip after another, each overlapping the last by its blend.
                var segs = new List<Seg>(); var blends = new List<double>();
                foreach (var o in ops)
                {
                    if (o.kind != "anim" && o.kind != "walk") continue;
                    var j = JObject.Parse(o.args);
                    AnimationClip clip = null;
                    if (j["T"] is JObject tree)
                    {
                        var w = tree["w"].ToObject<float[]>(); int best = 0; for (int i = 1; i < w.Length; i++) if (w[i] > w[best]) best = i;
                        clip = o.refs != null && o.refs.Length > best ? o.refs[best] as AnimationClip : null;
                        notes.Add("blend tree at " + o.start.ToString("0.00") + " plays its heaviest clip, " + (clip ? clip.name : "none"));
                    }
                    else clip = o.refs != null && o.refs.Length > 0 ? o.refs[0] as AnimationClip : null;
                    if (!clip) continue;
                    if (clip.legacy || !clip.humanMotion) { notes.Add(clip.name + " at " + o.start.ToString("0.00") + " is not a humanoid clip (a bake or a ragdoll?); the clip before it plays on"); continue; }
                    double blend = segs.Count == 0 ? 0 : (double?)j["blend"] ?? .2;
                    ClipRate(j, clip, o.start, out var clipIn, out var scale, notes);
                    if (o.kind == "walk") notes.Add("walk at " + o.start.ToString("0.00") + " plays " + clip.name + " at its own pace, not tied to the distance");
                    var s = new Seg { clip = clip, start = o.start, clipIn = clipIn, scale = scale, loop = !((double?)j["once"] > 0) };
                    segs.Add(s); blends.Add(blend);
                    double ret = (double?)j["return"] ?? 0;
                    if (ret > 0 && segs.Count > 1)
                    {
                        var prev = segs[segs.Count - 2]; double back = o.start + o.dur;
                        segs.Add(new Seg { clip = prev.clip, start = back, clipIn = prev.clipIn + (back - prev.start) * prev.scale, scale = prev.scale, loop = prev.loop });
                        blends.Add(ret);
                    }
                }
                var body = _tl.CreateTrack<AnimationTrack>(null, "native_" + kv.Key);
                _dir.SetGenericBinding(body, an);
                for (int i = 0; i < segs.Count; i++)
                {
                    var s = segs[i];
                    s.end = i + 1 < segs.Count ? segs[i + 1].start + blends[i + 1] : songEnd;
                    if (s.end <= s.start + 1e-3) s.end = s.start + 1e-3;
                    var tc = body.CreateClip(NativeClipOf(s.clip));
                    tc.start = s.start; tc.duration = s.end - s.start; tc.clipIn = Math.Max(0, s.clipIn); tc.timeScale = s.scale; tc.displayName = s.clip.name;
                    var asset = (AnimationPlayableAsset)tc.asset;
                    asset.loop = s.loop ? AnimationPlayableAsset.LoopMode.On : AnimationPlayableAsset.LoopMode.Off;
                    asset.applyFootIK = NativeFootIK(s.clip);
                    SetExtrapolation(tc, i == 0 ? TimelineClip.ClipExtrapolation.Hold : TimelineClip.ClipExtrapolation.None, i == segs.Count - 1 ? TimelineClip.ClipExtrapolation.Hold : TimelineClip.ClipExtrapolation.None);
                }
                HoldNative(body, kv.Key);   // hitstops and freezes hold the body too (MVEpicScore.cs)

                // Layers: one Override track per mask, its own AvatarMask; held layers run to the next on the same mask, overlapping by its blend.
                var byMask = new Dictionary<string, List<LaneOp>>();
                foreach (var o in ops)
                {
                    if (o.kind != "layer") continue;
                    var m = (string)JObject.Parse(o.args)["mask"] ?? "all";
                    if (!byMask.TryGetValue(m, out var l)) byMask[m] = l = new List<LaneOp>();
                    l.Add(o);
                }
                foreach (var mk in byMask)
                {
                    var ov = (AnimationTrack)_tl.CreateTrack(typeof(AnimationTrack), body, "native_" + kv.Key + "_" + mk.Key);
                    ov.avatarMask = NativeMask(mk.Key); ov.applyAvatarMask = true;
                    var list = mk.Value;
                    for (int i = 0; i < list.Count; i++)
                    {
                        var o = list[i]; var j = JObject.Parse(o.args);
                        var clip = o.refs != null && o.refs.Length > 0 ? o.refs[0] as AnimationClip : null; if (!clip) continue;
                        if (clip.legacy || !clip.humanMotion) { notes.Add("layer " + clip.name + " is not a humanoid clip; dropped"); continue; }
                        if ((double?)j["additive"] > 0) { notes.Add("additive layer " + clip.name + " at " + o.start.ToString("0.00") + " dropped: Timeline has no additive track"); continue; }
                        double w = (double?)j["weight"] ?? 1;
                        if (j["W"] != null) notes.Add("keyed layer weight at " + o.start.ToString("0.00") + " plays at full weight");
                        else if (w < .35) { notes.Add("layer " + clip.name + " at weight " + w + " dropped"); continue; }
                        else if (w < .99) notes.Add("layer " + clip.name + " at weight " + w + " plays at full weight");
                        double blend = (double?)j["blend"] ?? .3, end;
                        bool hold = (double?)j["hold"] > 0;
                        if (hold) end = i + 1 < list.Count ? list[i + 1].start + ((double?)JObject.Parse(list[i + 1].args)["blend"] ?? .3) : songEnd;
                        else end = o.start + o.dur + blend;
                        ClipRate(j, clip, o.start, out var clipIn, out var scale, notes);
                        var tc = ov.CreateClip(NativeClipOf(clip));
                        tc.start = o.start; tc.duration = Math.Max(end - o.start, 1e-3); tc.clipIn = Math.Max(0, clipIn); tc.timeScale = scale; tc.displayName = clip.name + " (" + mk.Key + ")";
                        bool overlapIn = i > 0 && list[i - 1].start + 1e-4 < o.start && (hold || o.start < list[i - 1].start + list[i - 1].dur);
                        if (!overlapIn) tc.easeInDuration = Math.Min(blend, tc.duration * .5);
                        if (!hold || i == list.Count - 1) tc.easeOutDuration = hold ? 0 : Math.Min(blend, tc.duration * .5);
                        var asset = (AnimationPlayableAsset)tc.asset;
                        asset.loop = (double?)j["once"] > 0 ? AnimationPlayableAsset.LoopMode.Off : AnimationPlayableAsset.LoopMode.On;
                        asset.applyFootIK = NativeFootIK(clip);
                    }
                    HoldNative(ov, kv.Key);
                }

                // What the old stack did to the body that has no native form yet: said once per actor, not dropped silently.
                int keys = ops.Count(o => o.kind == "keys"), poses = ops.Count(o => o.kind == "pose"), reach = ops.Count(o => o.kind == "reach" || o.kind == "plant"), gaze = ops.Count(o => o.kind == "gaze" || o.kind == "eyes"), stance = ops.Count(o => o.kind == "stance"), fingers = ops.Count(o => o.kind == "fingers");
                int plants = ops.Count(o => o.kind == "plant");
                if (keys + poses > 0) notes.Add($"{keys} keys and {poses} pose cues are ignored: on a native actor acting comes from clips");
                if (plants > 0) notes.Add($"{plants} plant cues are ignored on native actors");
                if (stance > 0) notes.Add($"{stance} stance cues are off on native actors");
                if (notes.Count > 0) _warn.Add(kv.Key + " (native): " + string.Join("; ", notes.Distinct().Take(12)) + (notes.Distinct().Count() > 12 ? $"; and {notes.Distinct().Count() - 12} more" : ""));
            }
        }

        /// <summary>A test build with every human on the native path (true), or none (false). `mv call buildnative '{"native":true,"fast":true}'`.</summary>
        [BridgeCommand("buildnative")]
        static object BuildNative(JObject m)
        {
            NativeOverride = m?["native"] == null || m["native"].Type == JTokenType.Null ? (bool?)null : (bool)m["native"];
            try { return new ScoreCompiler { _fast = (bool?)m?["fast"] == true, _noReuse = true }.Run(); }
            finally { NativeOverride = null; }
        }
    }
}
