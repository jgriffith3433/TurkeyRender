using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Layered blending: a clip over part of the body (legs from one clip, arms and chest from another), or additive (an idle breathing over a held
    /// pose), and blend trees that mix clips over the whole body, in step by normalized time. Each frame is sampled from nothing, so reverse matches.
    /// </summary>
    public partial class MotionDriver
    {
        /// <summary>Values keyed over a cue, in scene time, eased between keys.</summary>
        class Keyed
        {
            public float[] t; public float[][] v;
            public void Eval(float tl, float[] o)
            {
                int n = t.Length, j = 0;
                if (tl <= t[0]) { Array.Copy(v[0], o, o.Length); return; }
                if (tl >= t[n - 1]) { Array.Copy(v[n - 1], o, o.Length); return; }
                while (t[j + 1] <= tl) j++;
                float u = Ease.Apply("inout", (tl - t[j]) / Mathf.Max(t[j + 1] - t[j], 1e-4f));
                for (int i = 0; i < o.Length; i++) o[i] = Mathf.Lerp(v[j][i], v[j + 1][i], u);
            }
        }

        Keyed KeyedOf(Op op, JToken list)
        {
            if (!(list is JArray a) || a.Count == 0) return null;
            var k = new Keyed { t = new float[a.Count], v = new float[a.Count][] };
            for (int i = 0; i < a.Count; i++)
            {
                k.t[i] = (float)(Song.WarpRaw(op.start + (double)a[i]["t"]) - op.ws);
                var w = a[i]["w"]; k.v[i] = w is JArray ja ? ja.ToObject<float[]>() : new[] { (float)w };
            }
            return k;
        }

        // ---- blend trees ----

        class Tree { public AnimationClip[] c; public float[] w, now; public Keyed mix; public float cycle; }
        readonly Dictionary<int, Tree> _trees = new Dictionary<int, Tree>();
        Vector3[] _tp; Quaternion[] _tq;

        Tree TreeOf(Op op)
        {
            if (_trees.TryGetValue(op.index, out var t)) return t;
            var j = op.a.Obj["T"];
            t = new Tree { w = j["w"].ToObject<float[]>(), mix = KeyedOf(op, j["mix"]) };
            t.now = new float[t.w.Length];
            t.c = new AnimationClip[t.w.Length];
            for (int i = 0; i < t.c.Length; i++) t.c[i] = op.refs[i] as AnimationClip;
            float sum = 0; for (int i = 0; i < t.w.Length; i++) { t.cycle += t.w[i] * t.c[i].length; sum += t.w[i]; }
            t.cycle = op.a.F("cycle", t.cycle / Mathf.Max(sum, 1e-3f));
            return _trees[op.index] = t;
        }

        static void Normalize(float[] w) { float s = 0; foreach (var x in w) s += x; if (s > 1e-5f) for (int i = 0; i < w.Length; i++) w[i] /= s; }

        void TreeWeights(Tree t, float tl) { if (t.mix != null) t.mix.Eval(tl, t.now); else Array.Copy(t.w, t.now, t.w.Length); Normalize(t.now); }

        /// <summary>Progress through the cycle, not wrapped: every clip in the tree is at the same fraction of itself.</summary>
        double TreeClock(Tree t, Op op, double tl)
        {
            float beats = op.a.F("beats");
            double u = beats > 0 ? (Song.BeatAt(op.start + tl) - Song.BeatAt(op.start)) / beats : tl * op.a.F("speed", 1) / Math.Max(t.cycle, 1e-3f);
            u += op.a.F("offset");
            return op.a.F("once") > 0 ? Math.Min(u, 1) : u;
        }

        void AddTree(MVActor actor, Op op, double tl)
        {
            var t = TreeOf(op); double u = TreeClock(t, op, tl); if (op.a.F("once") <= 0) u -= Math.Floor(u);
            float blend = op.a.F("blend", .2f), ret = op.a.F("return"), w;
            if (Inert(op)) { if (ret > 0 && Past(tl, op.WDur)) return; w = 1; }
            else
            {
                w = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1;
                if (ret > 0 && tl > op.WDur) w *= 1 - Ease.Apply("inout", (float)((tl - op.WDur) / ret));
            }
            if (w <= 0) return;
            _layers.Add(new Layer { clip = t.c[0], time = u, w = w, tree = t, tl = (float)tl });
        }

        void SampleOne(Layer l, GameObject go)
        {
            if (l.tree == null) { Sample(l.clip, l.time, go); return; }
            RigInit(_actor);
            var t = l.tree; TreeWeights(t, l.tl);
            int n = _rig.Length; if (_tp == null) { _tp = new Vector3[n]; _tq = new Quaternion[n]; }
            float have = 0;
            for (int c = 0; c < t.c.Length; c++)
            {
                float w = t.now[c]; if (w <= 1e-4f) continue;
                Sample(t.c[c], l.time * t.c[c].length, go);
                float s = w / (have + w); have += w;
                for (int b = 0; b < n; b++)
                {
                    _rig[b].GetLocalPositionAndRotation(out var p, out var q);
                    if (s >= 1) { _tp[b] = p; _tq[b] = q; }
                    else { _tp[b] = Vector3.LerpUnclamped(_tp[b], p, s); _tq[b] = Quaternion.Slerp(_tq[b], q, s); }
                }
            }
            for (int b = 0; b < n; b++) _rig[b].SetLocalPositionAndRotation(_tp[b], _tq[b]);
        }

        /// <summary>A tree's travel is each clip's travel in its share, added up along the way, so a changing mix doesn't slide him.</summary>
        void TreeRoot(ref Pose p, MVActor actor, Op op, double tl)
        {
            var t = TreeOf(op); tl = Math.Min(tl, RootCut(op));
            string axes = op.a.S("root"); float amt = axes != null ? 1 : op.a.F("root");
            int steps = t.mix != null ? Mathf.Clamp(Mathf.CeilToInt((float)tl * 30), 1, 900) : 1;
            Vector3 d = default; float yaw = 0;
            for (int s = 0; s < steps; s++)
            {
                double a = tl * s / steps, b = tl * (s + 1) / steps;
                TreeWeights(t, (float)((a + b) * .5));
                for (int c = 0; c < t.c.Length; c++)
                {
                    float w = t.now[c]; if (w <= 1e-4f) continue;
                    var tab = RootOf(actor, t.c[c]); float len = t.c[c].length;
                    RootUnrolled(tab, TreeClock(t, op, a) * len, out var p0, out var q0);
                    RootUnrolled(tab, TreeClock(t, op, b) * len, out var p1, out var q1);
                    var step = Quaternion.Inverse(Quaternion.Euler(0, q0.eulerAngles.y, 0)) * (p1 - p0);
                    d += Quaternion.Euler(0, yaw, 0) * step * w;
                    yaw += Mathf.DeltaAngle(q0.eulerAngles.y, q1.eulerAngles.y) * w;
                }
            }
            if (axes == "y") { d.x = d.z = 0; yaw = 0; } else if (axes == "xz") d.y = 0;
            p.pos += (p.q * Quaternion.Euler(p.euler)) * Vector3.Scale(d, p.scale) * amt;
            p.euler.y += yaw * amt;
        }

        // ---- layers ----

        readonly List<(Op op, double tl)> _layerOps = new List<(Op, double)>();
        readonly Dictionary<string, bool[]> _masks = new Dictionary<string, bool[]>();
        readonly Dictionary<int, (Vector3[] p, Quaternion[] q)> _refPose = new Dictionary<int, (Vector3[], Quaternion[])>();
        readonly Dictionary<int, double> _layerEnd = new Dictionary<int, double>();
        readonly Dictionary<int, Keyed> _layerW = new Dictionary<int, Keyed>();
        readonly float[] _one = new float[1];
        Vector3[] _lp; Quaternion[] _lq;

        static bool InMask(HumanBodyBones b, string m)
        {
            bool left = b.ToString().StartsWith("Left"), right = b.ToString().StartsWith("Right"), finger = b >= HumanBodyBones.LeftThumbProximal && b <= HumanBodyBones.RightLittleDistal;
            bool arm = finger || b == HumanBodyBones.LeftShoulder || b == HumanBodyBones.RightShoulder || b == HumanBodyBones.LeftUpperArm || b == HumanBodyBones.RightUpperArm || b == HumanBodyBones.LeftLowerArm || b == HumanBodyBones.RightLowerArm || b == HumanBodyBones.LeftHand || b == HumanBodyBones.RightHand;
            bool spine = b == HumanBodyBones.Spine || b == HumanBodyBones.Chest || b == HumanBodyBones.UpperChest;
            bool head = b == HumanBodyBones.Neck || b == HumanBodyBones.Head || b == HumanBodyBones.Jaw || b == HumanBodyBones.LeftEye || b == HumanBodyBones.RightEye;
            switch (m)
            {
                case "upper": return arm || spine || head;
                case "lower": return !(arm || spine || head);
                case "arms": return arm;
                case "leftarm": return arm && left;
                case "rightarm": return arm && right;
                case "head": return head;
                case "spine": return spine;
                default: return true;
            }
        }

        bool[] MaskOf(MVActor actor, string mask)
        {
            mask = (mask ?? "all").ToLowerInvariant();
            if (_masks.TryGetValue(mask, out var set)) return set;
            set = new bool[_rig.Length];
            var ix = new Dictionary<Transform, int>(); for (int i = 0; i < _rig.Length; i++) ix[_rig[i]] = i;
            foreach (var part in mask.Split(','))
            {
                var m = part.Trim();
                if (actor.human.Length > 0)
                {
                    for (int b = 0; b < actor.human.Length; b++)
                        if (actor.human[b] && ix.TryGetValue(actor.human[b], out var i) && InMask((HumanBodyBones)b, m)) set[i] = true;
                }
                else
                    for (int i = 0; i < _rig.Length; i++) if (m == "all" || _rig[i].name.ToLowerInvariant().Contains(m)) set[i] = true;
            }
            return _masks[mask] = set;
        }

        /// <summary>When a held layer ends: the next layer on the same mask takes over over its own blend.</summary>
        double LayerEnd(Op op)
        {
            if (_layerEnd.TryGetValue(op.index, out var e)) return e;
            e = double.MaxValue;
            foreach (var o in Ops)
                if (o.start > op.start && o.kind == "layer" && o.a.S("mask") == op.a.S("mask")) { e = o.ws - op.ws; break; }
            return _layerEnd[op.index] = e;
        }

        void ApplyLayers(MVActor actor, GameObject go)
        {
            RigInit(actor);
            int n = _rig.Length; if (_lp == null) { _lp = new Vector3[n]; _lq = new Quaternion[n]; }
            foreach (var (op, tl) in _layerOps)
            {
                var a = op.a; float blend = a.F("blend", .3f), w = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1;
                if (!_layerW.TryGetValue(op.index, out var keyed)) _layerW[op.index] = keyed = a.Obj.TryGetValue("W", out var wj) ? KeyedOf(op, wj["list"]) : null;
                if (keyed != null) { keyed.Eval((float)tl, _one); w *= _one[0]; } else w *= a.F("weight", 1);
                if (a.F("hold") <= 0 && tl > op.WDur) w *= 1 - Ease.Apply("inout", (float)((tl - op.WDur) / Math.Max(blend, .001f)));
                double end = LayerEnd(op);
                if (tl > end) { Op next = null; foreach (var o in Ops) if (o.start > op.start && o.kind == "layer" && o.a.S("mask") == a.S("mask")) { next = o; break; } float nb = next != null ? next.a.F("blend", .3f) : blend; w *= 1 - Ease.Apply("inout", (float)((tl - end) / Math.Max(nb, .001f))); }
                if (w <= 0) continue;
                var clip = ClipOf(actor, op); if (clip == null) continue;
                bool add = a.F("additive") > 0;
                double local = ClipClock(clip, op, tl); if (a.F("once") <= 0 && clip.length > 0) local %= clip.length;
                for (int b = 0; b < n; b++) _rig[b].GetLocalPositionAndRotation(out _bp[b], out _bq[b]);
                if (add && !_refPose.ContainsKey(op.index))
                {
                    Sample(clip, a.F("ref"), go);
                    var rp = new Vector3[n]; var rq = new Quaternion[n];
                    for (int b = 0; b < n; b++) _rig[b].GetLocalPositionAndRotation(out rp[b], out rq[b]);
                    _refPose[op.index] = (rp, rq);
                }
                Sample(clip, local, go);
                var mask = MaskOf(actor, a.S("mask"));
                for (int b = 0; b < n; b++)
                {
                    if (!mask[b]) { _rig[b].SetLocalPositionAndRotation(_bp[b], _bq[b]); continue; }
                    _rig[b].GetLocalPositionAndRotation(out var p, out var q);
                    if (add)
                    {
                        var (rp, rq) = _refPose[op.index];
                        p = _bp[b] + (p - rp[b]) * w;
                        q = _bq[b] * Quaternion.SlerpUnclamped(Quaternion.identity, Quaternion.Inverse(rq[b]) * q, w);
                    }
                    else { p = Vector3.LerpUnclamped(_bp[b], p, w); q = Quaternion.Slerp(_bq[b], q, w); }
                    _rig[b].SetLocalPositionAndRotation(p, q);
                }
            }
        }
    }
}
