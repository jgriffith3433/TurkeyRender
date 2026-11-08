using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Motion beats: the moments a body stops and turns, the same idea as Kim, Park and Shin 2003. A sharp dip in how fast hands, feet, head and hips move.</summary>
    public static class MotionBeats
    {
        public class Found { public float[] t, s; public float energy; }
        static readonly Dictionary<AnimationClip, Found> Cache = new Dictionary<AnimationClip, Found>();
        const float Hz = 60;

        /// <summary>Beats in a curve of body speed sampled at hz: dips with a real rise on both sides, strongest first when two are too close.</summary>
        public static Found Detect(float[] raw, float hz)
        {
            int n = raw.Length; var f = new Found { t = new float[0], s = new float[0] };
            if (n < 5) return f;
            var v = new float[n];
            for (int i = 0; i < n; i++) { float sum = 0; int c = 0; for (int j = Mathf.Max(0, i - 1); j <= Mathf.Min(n - 1, i + 1); j++) { sum += raw[j]; c++; } v[i] = sum / c; }
            float lo = v.Min(), hi = v.Max(), span = Mathf.Max(hi - lo, 1e-3f);
            f.energy = v.Average();
            int reach = Mathf.RoundToInt(.28f * hz); var all = new List<(int i, float s)>();
            for (int i = 2; i + 2 < n; i++)
            {
                if (v[i] > v[i - 1] || v[i] > v[i + 1]) continue;
                float l = v[i], r = v[i];
                for (int j = Mathf.Max(0, i - reach); j < i; j++) l = Mathf.Max(l, v[j]);
                for (int j = i + 1; j <= Mathf.Min(n - 1, i + reach); j++) r = Mathf.Max(r, v[j]);
                float s = (Mathf.Min(l, r) - v[i]) / span;
                if (s >= .22f) all.Add((i, s));
            }
            int gap = Mathf.RoundToInt(.16f * hz); var keep = new List<(int i, float s)>();
            foreach (var x in all.OrderByDescending(a => a.s)) if (keep.All(k => Math.Abs(k.i - x.i) >= gap)) keep.Add(x);
            keep.Sort((a, b) => a.i.CompareTo(b.i));
            f.t = keep.Select(k => k.i / hz).ToArray(); f.s = keep.Select(k => k.s).ToArray();
            return f;
        }

        public static float SpeedOf(IList<Vector3> a, IList<Vector3> b, float dt)
        {
            float s = 0;
            for (int i = 0; i < a.Count; i++) s += (b[i] - a[i]).magnitude * Weights[Mathf.Min(i, Weights.Length - 1)];
            return s / dt;
        }

        // Hands and feet carry the phrase, the hips the weight.
        static readonly float[] Weights = { 1f, 1f, 1f, .7f, .7f, .6f };

        public static readonly HumanBodyBones[] Points = { HumanBodyBones.LeftHand, HumanBodyBones.RightHand, HumanBodyBones.Hips, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.Head };

        /// <summary>Beats of a clip on an actor's rig, in the rig's own frame so travel does not count.</summary>
        public static Found Of(AnimationClip clip, MVActor actor)
        {
            if (Cache.TryGetValue(clip, out var f)) return f;
            var go = actor.animRoot ? actor.animRoot : actor.gameObject; var tr = go.transform;
            tr.GetLocalPositionAndRotation(out var kp, out var kq); var ks = tr.localScale;
            var bones = Points.Select(b => actor.human.Length > (int)b ? actor.human[(int)b] : null).Where(x => x).ToArray();
            int n = Mathf.Max(2, Mathf.CeilToInt(clip.length * Hz));
            var speed = new float[n]; Vector3[] last = null;
            for (int i = 0; i <= n; i++)
            {
                clip.SampleAnimation(go, clip.length * i / n);
                var now = bones.Select(b => tr.InverseTransformPoint(b.position)).ToArray();
                // Hips stay put while the rest is read against them, so a clip whose hips bob reads as weight, not as every limb moving.
                if (last != null) speed[i - 1] = SpeedOf(last, now, clip.length / n);
                last = now;
            }
            tr.SetLocalPositionAndRotation(kp, kq); tr.localScale = ks;
            f = Detect(speed, n / clip.length);
            f.t = f.t.Select(x => x + .5f / Hz).ToArray();
            return Cache[clip] = f;
        }
    }

    public partial class ScoreCompiler
    {
        public static readonly List<JObject> WarpLog = new List<JObject>();

        IEnumerable<double> HitsFor(string spec, double t, double len)
        {
            if (spec == "beat" || spec == "bar")
            {
                int every = spec == "bar" ? _song.meter : 1;
                for (double b = Math.Ceiling(_song.BeatAt(t)); _song.TimeOf(b) < t + len; b += 1)
                    if (spec == "beat" || (((long)b - _song.phase) % every + every) % every == 0) yield return _song.TimeOf(b);
                yield break;
            }
            var h = _song.Hits(spec); if (h == null) yield break;
            foreach (var x in h) if (x >= t && x < t + len) yield return x;
        }

        /// <summary>Beat-warp: picks which motion beats land on which hits, without the clip running faster or slower than maxRate, and bakes the curve into the cue.
        /// Dynamic programming over (motion beat, hit) pairs: each aligned pair scores its beat's strength, each stretch pays for how far it leaves the clip's own speed.</summary>
        void WarpCue(string name, MVActor actor, JObject c, JObject a, AnimationClip clip, double t, double len)
        {
            string spec = (string)c["warpTo"];
            if (actor.human.Length == 0) { _warn.Add($"{name}: warpTo needs a human rig"); return; }
            var hits = HitsFor(spec, t, len).Select(h => h - t).Where(h => h > 1e-3).ToArray();
            if (hits.Length == 0) { _warn.Add($"{name}: warpTo '{spec}': no such hits in this cue. Use kick snare hat all beat bar"); return; }
            float L = clip.length, maxRate = (float?)c["maxRate"] ?? 1.5f, keepTempo = (float?)c["warpStiff"] ?? 1.2f;
            double cycle = (double?)c["beats"] ?? 0, speed = (double?)c["speed"] ?? 1;
            double s = cycle > 0 ? L / (_song.TimeOf(_song.BeatAt(t) + cycle) - t) : speed;
            double c0 = ((double?)c["offset"] ?? 0) * L + ((double?)c["start"] ?? 0);
            var found = MotionBeats.Of(clip, actor);
            bool once = (float?)c["once"] > 0;
            var ms = new List<(double c, float s)>();
            double reach = c0 + len * s * maxRate;
            for (int k = 0; k < 256 && (k == 0 || !once); k++)
            {
                bool past = false;
                for (int i = 0; i < found.t.Length; i++)
                {
                    double x = found.t[i] + k * L;
                    if (x > reach) { past = true; break; }
                    if (x > c0 + .02) ms.Add((x, found.s[i]));
                }
                if (past || found.t.Length == 0) break;
            }
            if (ms.Count == 0) { _warn.Add($"{name}: {clip.name} has no motion beats to warp"); return; }
            int M = ms.Count, H = hits.Length;
            var best = new double[M, H]; var from = new (int, int)[M, H];
            double lo = 1 / maxRate, hi = maxRate;
            double Cost(double dc, double dt) { double r = dc / dt / s; if (r < lo || r > hi) return double.NegativeInfinity; double l = Math.Log(r); return -keepTempo * l * l * Math.Max(1, dt); }
            double top = double.NegativeInfinity; (int, int) end = (-1, -1);
            for (int i = 0; i < M; i++)
                for (int j = 0; j < H; j++)
                {
                    double b = Cost(ms[i].c - c0, hits[j]); var f = (-1, -1);
                    for (int k = Math.Max(0, i - 8); k < i; k++)
                        for (int l = Math.Max(0, j - 12); l < j; l++)
                        {
                            if (double.IsNegativeInfinity(best[k, l])) continue;
                            double v = best[k, l] + Cost(ms[i].c - ms[k].c, hits[j] - hits[l]);
                            if (v > b) { b = v; f = (k, l); }
                        }
                    best[i, j] = double.IsNegativeInfinity(b) ? b : b + ms[i].s;
                    from[i, j] = f;
                    if (best[i, j] > top) { top = best[i, j]; end = (i, j); }
                }
            if (end.Item1 < 0) { _warn.Add($"{name}: warpTo '{spec}': no beat of {clip.name} can reach a hit within maxRate {maxRate}"); return; }
            var path = new List<(int, int)>();
            for (var p = end; p.Item1 >= 0; p = from[p.Item1, p.Item2]) path.Add(p);
            path.Reverse();
            var ts = new JArray(0.0); var cs = new JArray(c0); var pairs = new JArray();
            foreach (var (i, j) in path) { ts.Add(hits[j]); cs.Add(ms[i].c); pairs.Add(new JArray(Math.Round(ms[i].c, 3), Math.Round(hits[j], 3))); }
            double lastT = hits[path[path.Count - 1].Item2], lastC = ms[path[path.Count - 1].Item1].c;
            if (len - lastT > .05) { ts.Add(len); cs.Add(lastC + (len - lastT) * s); }
            a["warp"] = new JObject { ["t"] = ts, ["c"] = cs };
            WarpLog.Add(new JObject { ["clip"] = clip.name, ["to"] = spec, ["at"] = Math.Round(t, 3), ["motionBeats"] = M, ["hits"] = H, ["aligned"] = pairs, ["unaligned"] = ms.Where(x => x.c < lastC && !path.Any(p => ms[p.Item1].c == x.c)).Select(x => Math.Round(x.c, 3)).Count() });
        }

        // ---- the catalogue ----

        static Dictionary<string, JObject> _catalogue; static DateTime _catStamp;
        readonly HashSet<string> _unadmitted = new HashSet<string>();

        static Dictionary<string, JObject> Catalogue()
        {
            var f = Path.Combine(Bridge.Root, "library", "clips.json");
            if (!File.Exists(f)) return null;
            var w = File.GetLastWriteTimeUtc(f);
            if (_catalogue != null && w == _catStamp) return _catalogue;
            _catStamp = w; _catalogue = new Dictionary<string, JObject>(StringComparer.OrdinalIgnoreCase);
            foreach (var kv in (JObject)JObject.Parse(File.ReadAllText(f))["clips"]) _catalogue[kv.Key] = (JObject)kv.Value;
            return _catalogue;
        }

        /// <summary>A human's performance plays admitted clips only: anything else is reported on every build until it has been through clip_admit.</summary>
        void CheckAdmitted(string name, MVActor actor, AnimationClip clip)
        {
            if (actor.human.Length == 0 || !clip || clip.name.StartsWith("rag_")) return;
            var cat = Catalogue(); if (cat == null || !_unadmitted.Add(clip.name)) return;
            if (!cat.TryGetValue(clip.name, out var card)) _warn.Add($"{name}: clip {clip.name} is not admitted. Run node Director/tools/clip_admit.mjs {clip.name}");
            else if ((string)card["status"] != "admitted") _warn.Add($"{name}: clip {clip.name} was rejected by admission: {string.Join("; ", (card["issues"] as JArray)?.Select(x => (string)x) ?? new string[0])}");
        }
    }
}
