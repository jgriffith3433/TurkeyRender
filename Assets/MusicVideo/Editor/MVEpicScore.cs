using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Timeline;
using TKShock.MV;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// The epic toolkit's cues (Hawkes Punch's space, 2026-11-07; Runtime/MVEpicFx.cs draws them). See AGENTS.md "Epic toolkit".
    /// Frames are counted at the score's `fps` (30 when it has none, so every older video compiles exactly as before).
    /// </summary>
    public partial class ScoreCompiler
    {
        /// <summary>The frame rate frames are counted at: the score's `fps`, else 30 (the old hard-coded hitstop rate).</summary>
        double Fps() { var f = (double?)_score?["fps"] ?? 30; return f > 0 ? f : 30; }

        /// <summary>A length: `"4f"` is frames at the score's fps, anything else as Dur.</summary>
        double Secs(JToken v, double t, double def)
        {
            if (v == null) return def;
            if (v.Type == JTokenType.String) { var s = ((string)v).Trim(); if (s.EndsWith("f") && double.TryParse(s.Substring(0, s.Length - 1), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n)) return n / Fps(); }
            return Dur(v, t, def);
        }

        /// <summary>A hitstop's length: a number is frames at the score's fps, a string a length (`"0.2s"`, `"5f"`).</summary>
        double HoldSecs(JToken v, double t, double defFrames)
        {
            if (v == null) return defFrames / Fps();
            if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) return (double)v / Fps();
            return Secs(v, t, defFrames / Fps());
        }

        /// <summary>Silences before hits: the whole mix (song, lines, sfx) gated to nothing from `from` to `to` (tools/mv/sound.mjs reads silence.json).</summary>
        readonly List<(double from, double to)> _silence = new List<(double, double)>();
        void Silence(double from, double to) { if (to > from + 1e-4) _silence.Add((Math.Max(0, from), to)); }
        void WriteSilence()
        {
            var f = Path.Combine(Video.Dir, "silence.json");
            if (_silence.Count == 0) { if (File.Exists(f)) File.Delete(f); return; }
            var arr = new JArray(_silence.OrderBy(s => s.from).Select(s => new JObject { ["from"] = Math.Round(s.from, 4), ["to"] = Math.Round(s.to, 4) }));
            File.WriteAllText(f, arr.ToString());
        }

        /// <summary>Per-actor freezes (`do: freeze`): the native body's clips stand still, then go on from where they stopped.</summary>
        readonly Dictionary<string, List<(double t, double d)>> _freezes = new Dictionary<string, List<(double, double)>>();

        static IEnumerable<string> Ons(JToken on) => on is JArray arr ? arr.Select(x => (string)x) : on != null ? new[] { (string)on } : new string[0];

        /// <summary>`do` cues of the toolkit, before the per-actor loop: some take no `on` (impactframe, speedlines, shake, silence), the rest are not motion
        /// ops (freeze, hitshake, smear). True when handled.</summary>
        bool EpicDo(JObject c, double t)
        {
            string kind = (string)c["do"];
            double fl = 1.0 / Fps();
            double Len(double def) => c["for"] != null ? Secs(c["for"], t, def) : c["until"] != null ? T(c["until"], t) - t : def;
            switch (kind)
            {
                case "impactframe":
                    {
                        // [flash frames][two-tone frames]: a white (or flashColor) frame, then the subject black on white, white on black, or flip between them.
                        var a = ArgsOf(c); a["fps"] = Fps();
                        if (c["on"] != null) a["on"] = c["on"];
                        int flash = (int?)c["flash"] ?? 1, frames = (int?)c["frames"] ?? 2;
                        if (frames > 4) { _warn.Add($"impactframe at {t:0.00}: {frames} frames is over the flash-safety ceiling of 4 (2 inversions); using 4"); frames = 4; }
                        a["flash"] = flash; a["frames"] = frames;
                        Op(_post, "impactframe", t, (flash + frames + .5) * fl, a);
                        if (c["silence"] != null) Silence(t - (c["silence"].Type == JTokenType.String ? Secs(c["silence"], t, 4 * fl) : (double)c["silence"] * fl), t);
                        return true;
                    }
                case "speedlines":
                    {
                        var a = ArgsOf(c);
                        if (c["on"] != null) a["on"] = c["on"];
                        foreach (var k in new[] { "fadeIn", "fadeOut" }) if (c[k] != null) a[k] = Secs(c[k], t, 0);
                        Op(_post, "speedlines", t, Len(1), a);
                        return true;
                    }
                case "shake":
                    {
                        // trauma (impact: sharp, then decaying, squared by the camera) and/or heavy (the slow weight of a planet), and a FOV punch.
                        if (c["on"] != null) return false;   // an actor's own `shake` oscillator
                        var a = ArgsOf(c);
                        if (c["trauma"] == null && c["heavy"] == null) a["trauma"] = .6;
                        if (c["punchFor"] != null) a["punchFor"] = Secs(c["punchFor"], t, .18);
                        Op(_post, "trauma", t, Len(c["heavy"] != null && c["trauma"] == null ? 1.6 : .6), a);
                        return true;
                    }
                case "silence":
                    {
                        // the frames before a hit: `frames` (4) at the score's fps, ending at `at`; or `for` from `at`
                        if (c["for"] != null || c["until"] != null) Silence(t, t + Len(0));
                        else Silence(t - ((double?)c["frames"] ?? 4) * fl, t);
                        return true;
                    }
                case "freeze":
                    {
                        // a held pose: the body stands still for `frames` or `for`, then the clip goes on from there (a native body; legacy: use keys `hold`)
                        double d = c["frames"] != null ? (double)c["frames"] * fl : Len(12 * fl);
                        foreach (var name in Ons(c["on"]))
                        {
                            if (!_actors.ContainsKey(name)) { _warn.Add("freeze: no actor '" + name + "'"); continue; }
                            if (!_freezes.TryGetValue(name, out var l)) _freezes[name] = l = new List<(double, double)>();
                            l.Add((t, d));
                            if (c["tremble"] != null) Op(Track(name), "hitshake", t, d, new JObject { ["amount"] = c["tremble"], ["hz"] = c["hz"] ?? 18, ["axis"] = c["axis"] ?? new JArray(1, 0, 0), ["decay"] = 0 });
                        }
                        return true;
                    }
                case "hitshake":
                    {
                        var a = ArgsOf(c);
                        foreach (var name in Ons(c["on"])) if (_actors.ContainsKey(name)) Op(Track(name), "hitshake", t, Len(6 * fl), a);
                        return true;
                    }
                case "smear":
                    {
                        var a = ArgsOf(c); a["on"] = (string)c["on"] ?? "person.rightHand";
                        double d = c["frames"] != null ? (double)c["frames"] * fl : Len(fl);
                        Op(_fx, "smear", t, d * .999, a);
                        return true;
                    }
            }
            return false;
        }

        /// <summary>Extras on an `fx` cue: an impact's `victim` shakes through its hitstop, `silence` frames before it; frames for the toolkit's own fx.</summary>
        void EpicFx(string name, JObject c, JObject a, double t)
        {
            double fl = 1.0 / Fps();
            if (c["silence"] != null) { Silence(t - (c["silence"].Type == JTokenType.String ? Secs(c["silence"], t, 4 * fl) : (double)c["silence"] * fl), t); a.Remove("silence"); }
            if (name == "smear" && c["frames"] != null && c["for"] == null) c["for"] = (double)c["frames"] * fl * .999;
        }

        /// <summary>The victim of a hitstop shakes across the hit, decaying to nothing as the hold ends (Sakurai: airborne up and down, so `axis` [0,1,0] by default).</summary>
        void Victim(JObject c, double t, double d)
        {
            foreach (var v in Ons(c["victim"]))
            {
                if (!_actors.ContainsKey(v)) { _warn.Add("hitstop: no victim '" + v + "'"); continue; }
                Op(Track(v), "hitshake", t, Math.Max(d, 1.0 / Fps()), new JObject { ["amount"] = c["victimShake"] ?? .05, ["axis"] = c["axis"] ?? new JArray(0, 1, 0), ["hz"] = c["victimHz"] ?? 20 });
            }
            foreach (var at in Ons(c["attacker"]))
                if (_actors.ContainsKey(at) && c["creep"] != null) Op(Track(at), "hitshake", t, d, new JObject { ["creep"] = c["creep"], ["dir"] = c["creepDir"] ?? new JArray(0, 0, 1), ["amount"] = 0 });
        }

        /// <summary>The first cut (a shot's start) at or after t, else the song's end: where a hitstop's owed time is paid back (BakeWarp, HoldNative).</summary>
        double NextCut(double t)
        {
            foreach (var sh in _shots) if (sh.t >= t - 1e-4) return sh.t;
            return _song ? Math.Max(_song.duration, t) : t + 1e6;
        }

        /// <summary>
        /// Holds on a native body's Animation track. Unity's Animator plays it on song time, so the world's hitstop (a hold in the warp) never reached
        /// it by itself. Every clip playing when a hitstop or a freeze of this actor starts (one that starts on the hold's first frame too: a hit on a
        /// cut) is cut in pieces: up to the hold; the hold (clip time stands still at the contact pose: time scale 0.001); after it, on from the
        /// contact pose's clip time (song time minus the hold), so nothing pops. After a hitstop that lasts until the next cut, where the clip
        /// rejoins song time (the jump is hidden in the cut, as the world's warp does: BakeWarp); after a freeze, to the clip's end. Pure functions
        /// of time, so it scrubs and reverses. Put holds on a clip playing alone (blend 0): see the fade guard below.
        /// (2026-11-08, engine agent: before, the clip resumed at song time when the hold ended, a pop of the hold's length of motion: 65 deg in one
        /// frame on _layer_test, 74 deg on the doctor's arm in the punch; and a clip starting on the hold's first frame was not held at all.)
        /// </summary>
        void HoldNative(AnimationTrack track, string actor)
        {
            // The world's hitstops (owed until the next cut) and this actor's freezes (owed to the clip's end).
            // A hitstop that falls in a crossfade or a layer's fade is left alone, with a note: cutting there would restart the fade after the hold.
            var holds = new List<(double t, double d, bool freeze)>();
            var clips = track.GetClips().ToList();
            foreach (var h in _holds)
            {
                double h0 = h.t - 1e-4, h1 = h.t + h.d + 1e-4; bool fading = false;
                foreach (var c in clips)
                {
                    if (c.easeInDuration > 0 && c.start < h1 && c.start + c.easeInDuration > h0) fading = true;
                    if (c.easeOutDuration > 0 && c.end - c.easeOutDuration < h1 && c.end > h0) fading = true;
                    foreach (var o in clips) if (o != c && Math.Max(c.start, o.start) < Math.Min(c.end, o.end) - 1e-6 && Math.Max(c.start, o.start) < h1 && Math.Min(c.end, o.end) > h0) fading = true;
                }
                if (fading) _warn.Add($"{actor} ({track.name}): the hitstop at {h.t:0.00} s falls in a crossfade, so this body plays through it; give the clip there blend 0");
                else holds.Add((h.t, h.d, false));
            }
            if (_freezes.TryGetValue(actor, out var fz)) holds.AddRange(fz.Select(h => (h.t, h.d, true)));
            if (holds.Count == 0) return;
            foreach (var (h0, hd, freeze) in holds.OrderBy(x => x.t))
            {
                double h1 = h0 + hd, back = freeze ? double.MaxValue : NextCut(h1);
                foreach (var tc in track.GetClips().ToList())
                {
                    if (!(tc.start < h0 + 1e-6 && tc.end > h0 + 1e-6)) continue;   // clips playing when the hold starts, or starting on its first frame
                    if (tc.start > h0 - 1e-6 && tc.easeInDuration > 1e-6) continue;   // one fading in on the hold (a freeze's clip; hitstops are guarded above): left as it was
                    var src = (AnimationPlayableAsset)tc.asset;
                    double start = tc.start, end = tc.end, ci = tc.clipIn, k = tc.timeScale, easeOut = tc.easeOutDuration;
                    string name = tc.displayName;
                    double At(double T) => ci + (T - start) * k;
                    var pre = tc.preExtrapolationMode; var post = tc.postExtrapolationMode;
                    TimelineClip hold;
                    if (h0 - start > 1e-6)
                    {
                        tc.duration = h0 - start; tc.easeOutDuration = 0;
                        if (tc.easeInDuration > tc.duration) tc.easeInDuration = tc.duration;
                        SetExtrapolation(tc, pre, TimelineClip.ClipExtrapolation.None);
                        hold = track.CreateClip(src.clip); Copy(src, hold); pre = TimelineClip.ClipExtrapolation.None;
                    }
                    else { hold = tc; hold.easeInDuration = 0; }   // it starts on the hold: it becomes the hold
                    hold.start = h0; hold.duration = Math.Max(Math.Min(h1, end) - h0, 1e-4); hold.clipIn = Math.Max(0, At(h0)); hold.timeScale = .001;
                    hold.easeOutDuration = 0; hold.displayName = name + " (hold)";
                    var pieces = new List<TimelineClip> { hold };
                    void Piece(double from, double to, double clipIn)
                    {
                        if (to - from < 1e-4) return;
                        var c = track.CreateClip(src.clip); Copy(src, c);
                        c.start = from; c.duration = to - from; c.clipIn = Math.Max(0, clipIn); c.timeScale = k; c.displayName = name;
                        pieces.Add(c);
                    }
                    if (end > h1 + 1e-4)
                    {
                        Piece(h1, Math.Min(end, back), At(h0));                 // on from the contact pose: song time minus the hold
                        if (end > back + 1e-4) Piece(back, end, At(back));      // after the cut: back on song time
                    }
                    for (int i = 0; i < pieces.Count; i++)
                        SetExtrapolation(pieces[i], i == 0 ? pre : TimelineClip.ClipExtrapolation.None, i == pieces.Count - 1 ? post : TimelineClip.ClipExtrapolation.None);
                    var last = pieces[pieces.Count - 1];
                    last.easeOutDuration = Math.Min(easeOut, last.duration * .5);
                }
            }
        }

        /// <summary>`mv call epicprobe '{"t":2.75}'`: evaluates and renders the main camera at t, then lists the toolkit's live effects.</summary>
        [BridgeCommand("epicprobe")]
        static object EpicProbe(JObject m)
        {
            var dir = UnityEngine.Object.FindAnyObjectByType<UnityEngine.Playables.PlayableDirector>();
            if (m?["t"] != null && dir) { dir.time = (double)m["t"]; dir.Evaluate(); MVLate.Flush(); }
            var cam = Camera.main; if (cam) cam.Render();
            return new JObject { ["t"] = dir ? dir.time : -1, ["fx"] = new JArray(MVEpicFx.Probe().ToArray()), ["shock"] = Shader.GetGlobalVector("_MV_ShockP").ToString(), ["lines"] = Shader.GetGlobalFloat("_MV_Lines") };
        }

        static void Copy(AnimationPlayableAsset src, TimelineClip to)
        {
            var a = (AnimationPlayableAsset)to.asset; a.loop = src.loop; a.applyFootIK = src.applyFootIK;
        }
    }
}
