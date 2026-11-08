using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Three things that keep the body a pure function of time. Inertialized transitions: a change of clip is a hard cut underneath, and what the cut
    /// would jump by, in pose and speed, is added on top and dies away on a critically damped curve. The offsets are measured from the score alone, at
    /// the moment of the change, so they stack without a frame's history. Per-actor stepped animation: the body is evaluated at a quantized time.
    /// Beat-warp: clip time read off a curve baked at build.
    /// </summary>
    public partial class MotionDriver
    {
        // ---- inertialized transitions ----

        /// <summary>One change of what drives the body. Offsets per rig bone, in the bone's parent frame: rotation vectors and metres, with their speeds.</summary>
        class Trans { public double start, ws; public float len, win, y; public bool ready; public Vector3[] r, rv, p, pv; public bool[] on; }

        List<Trans> _trans;
        readonly Dictionary<int, bool> _inert = new Dictionary<int, bool>();
        bool _raw, _rawBefore; double _rawCut;
        Vector3[] _ap, _bp2, _cp, _dp; Quaternion[] _aq, _bq2, _cq, _dq;

        // How fast `blend` dies: half gone at half of `blend`, as the crossfade was, so timing in old acts stays; 85% at `blend`, gone at twice it.
        const float InertY = 3.4f, InertTail = 2f, MaxSpin = 25, MaxSpeed = 6;
        const double VelDt = 1 / 60.0, EdgeEps = 1e-5, InertBack = 1.3;

        /// <summary>Does this cue hand over by inertia? Humans only, unless the cue says "crossfade":1. A ragdoll's next clip crossfades, because the actor walks over to the hips at the blend's own rate.</summary>
        bool Inert(Op op)
        {
            if (_actor == null || _actor.human.Length == 0 || op.a.F("crossfade") > 0) return false;
            if (_inert.TryGetValue(op.index, out var v)) return v;
            v = true;
            if (op.kind == "anim" || op.kind == "walk")
            {
                Op prev = null;
                foreach (var o in Ops) { if (o == op) break; if ((o.kind == "anim" || o.kind == "walk") && o.a.F("each") <= 0) prev = o; }
                if (prev != null && prev.a.F("stay") > 0) v = false;
            }
            return _inert[op.index] = v;
        }

        /// <summary>Past a hard edge in time. A moment exactly on it counts as before when measuring what the cut comes from, after otherwise.</summary>
        bool Past(double tl, double edge) => _raw && _rawBefore ? tl > edge + EdgeEps : tl >= edge - EdgeEps;

        void AddTrans(double ws, float len)
        {
            if (len < .01f) return;
            foreach (var x in _trans) if (Math.Abs(x.ws - ws) < 1e-4) { if (len > x.len) { x.len = len; x.win = len * InertTail; x.y = InertY / len; } return; }
            _trans.Add(new Trans { start = Math.Max(Song.Unwarp(ws), VelDt), ws = ws, len = len, win = len * InertTail, y = InertY / len });
        }

        void BuildTrans(MVActor actor)
        {
            _trans = new List<Trans>();
            if (actor.human.Length == 0 || !Song) return;
            RigInit(actor);
            double body = double.MaxValue; // when something first drove the body: a change needs something earlier to come from
            foreach (var op in Ops)
            {
                if (op.a.F("each") > 0) continue;
                if (op.kind == "anim" || op.kind == "walk")
                {
                    if (Inert(op))
                    {
                        if (body < op.start - EdgeEps) AddTrans(op.ws, op.a.F("blend", .2f));
                        if (op.a.F("return") > 0) AddTrans(op.ws + op.WDur, op.a.F("return"));
                    }
                    body = Math.Min(body, op.start);
                }
                else if (op.kind == "keys" && body < double.MaxValue && Inert(op))
                {
                    var ks = KeysOf(actor, op);
                    if (ks.blend > 0 && body < op.start - EdgeEps) AddTrans(op.ws, ks.blend);
                    if (ks.relStart < double.MaxValue) AddTrans(op.ws + ks.relStart, (float)ks.relLen);
                }
            }
            _trans.Sort((x, y) => x.ws.CompareTo(y.ws));
        }

        /// <summary>Measures the transitions a moment can see, before that moment is built. Each is worked out once, from the score, so the order they are reached in changes nothing.</summary>
        void EnsureTrans(MVActor actor, double tw, double back)
        {
            if (_trans == null) BuildTrans(actor);
            for (int i = 0; i < _trans.Count; i++)
            {
                var tr = _trans[i];
                if (tr.ws > tw + .1) break;
                if (tr.ready || tr.ws + tr.win < tw - back) continue;
                Measure(actor, tr);
            }
        }

        void RawPose(MVActor actor, double t, bool before, double cut, Vector3[] p, Quaternion[] q)
        {
            _raw = true; _rawBefore = before; _rawCut = cut;
            try { Run(t, actor); } finally { _raw = false; }
            for (int b = 0; b < _rig.Length; b++) _rig[b].GetLocalPositionAndRotation(out p[b], out q[b]);
        }

        void Measure(MVActor actor, Trans tr)
        {
            int n = _rig.Length;
            if (_ap == null) { _ap = new Vector3[n]; _bp2 = new Vector3[n]; _cp = new Vector3[n]; _dp = new Vector3[n]; _aq = new Quaternion[n]; _bq2 = new Quaternion[n]; _cq = new Quaternion[n]; _dq = new Quaternion[n]; }
            double t0 = tr.start;
            // What the cut comes from, just before and at the moment; what it goes to, at the moment and just after.
            RawPose(actor, t0 - VelDt, true, t0, _ap, _aq);
            RawPose(actor, t0, true, t0, _bp2, _bq2);
            RawPose(actor, t0, false, t0, _cp, _cq);
            RawPose(actor, t0 + VelDt, false, t0, _dp, _dq);
            double w0 = Song.WarpRaw(t0);
            float d0 = (float)(w0 - Song.WarpRaw(t0 - VelDt)), d1 = (float)(Song.WarpRaw(t0 + VelDt) - w0);
            tr.r = new Vector3[n]; tr.rv = new Vector3[n]; tr.p = new Vector3[n]; tr.pv = new Vector3[n]; tr.on = new bool[n];
            for (int b = 0; b < n; b++)
            {
                tr.r[b] = Log(_bq2[b] * Quaternion.Inverse(_cq[b]));
                tr.p[b] = _bp2[b] - _cp[b];
                Vector3 wa = d0 > 1e-5f ? Log(_bq2[b] * Quaternion.Inverse(_aq[b])) / d0 : default, wb = d1 > 1e-5f ? Log(_dq[b] * Quaternion.Inverse(_cq[b])) / d1 : default;
                Vector3 va = d0 > 1e-5f ? (_bp2[b] - _ap[b]) / d0 : default, vb = d1 > 1e-5f ? (_dp[b] - _cp[b]) / d1 : default;
                tr.rv[b] = Vector3.ClampMagnitude(wa - wb, MaxSpin);
                tr.pv[b] = Vector3.ClampMagnitude(va - vb, MaxSpeed);
                tr.on[b] = tr.r[b].sqrMagnitude + tr.p[b].sqrMagnitude > 1e-9f || tr.rv[b].sqrMagnitude + tr.pv[b].sqrMagnitude > 1e-7f;
            }
            tr.ready = true;
        }

        /// <summary>The offsets on the finished clips, layers and keys. Newest nearest the clip, which is what makes each new cut exact whatever is still dying away.</summary>
        void ApplyInertia()
        {
            if (_trans == null || _trans.Count == 0) return;
            for (int i = _trans.Count - 1; i >= 0; i--)
            {
                var tr = _trans[i];
                if (!tr.ready || _t < tr.start) continue;
                float tau = Mathf.Max(0, (float)(_tw - tr.ws)); if (tau >= tr.win) continue;
                float x = (tau - tr.len * 1.3f) / (tr.win - tr.len * 1.3f), fade = x <= 0 ? 1 : 1 - x * x * (3 - 2 * x), e = Mathf.Exp(-tr.y * tau) * fade;
                for (int b = 0; b < _rig.Length; b++)
                {
                    if (!tr.on[b]) continue;
                    _rig[b].GetLocalPositionAndRotation(out var p, out var q);
                    q = Exp((tr.r[b] + (tr.rv[b] + tr.r[b] * tr.y) * tau) * e) * q;
                    p += (tr.p[b] + (tr.pv[b] + tr.p[b] * tr.y) * tau) * e;
                    _rig[b].SetLocalPositionAndRotation(p, q);
                }
            }
        }

        // ---- stepped animation, per actor ----

        List<Op> _stepOps; Vector3[] _sp; Quaternion[] _sq; bool[] _sset;

        Op StepOp(double t)
        {
            if (_stepOps == null) { _stepOps = new List<Op>(); foreach (var op in Ops) if (op.kind == "steps") _stepOps.Add(op); }
            Op on = null;
            foreach (var op in _stepOps) { if (op.start > t) break; if (t < op.end) on = op; }
            return on;
        }

        static double Quant(double t, double from, float rate) => rate <= 0 ? t : from + Math.Floor((t - from) * rate + 1e-6) / rate;

        /// <summary>True while this actor is on its own steps: its bones jump by design.</summary>
        public bool SteppedAt(double t) => _actor != null && !_actor.smoothTime && StepOp(t) != null;

        /// <summary>What moment the body shows at time t. A cue with bone groups returns itself: each group is built at its own moment.</summary>
        double BodyTime(double t, MVActor actor, out Op groups)
        {
            groups = null;
            if (actor.smoothTime) return t; // a camera stays on ones
            var op = StepOp(t); if (op == null) return t;
            if (op.a.S("mask") != null || op.a.Obj.ContainsKey("bones")) { groups = op; return t; }
            return Quant(t, op.start, op.a.F("rate", 12));
        }

        void RunSteps(double t, Op op, MVActor actor)
        {
            RigInit(actor);
            int n = _rig.Length; if (_sp == null) { _sp = new Vector3[n]; _sq = new Quaternion[n]; _sset = new bool[n]; }
            Array.Clear(_sset, 0, n);
            float rate = op.a.F("rate", 12), baseRate = rate;
            void Group(string mask, float r)
            {
                double g = Quant(t, op.start, r);
                PrepareOverlap(g, actor); Run(g, actor);
                var set = MaskOf(actor, mask);
                for (int b = 0; b < n; b++) if (set[b]) { _rig[b].GetLocalPositionAndRotation(out _sp[b], out _sq[b]); _sset[b] = true; }
            }
            if (op.a.S("mask") != null) { Group(op.a.S("mask"), rate); baseRate = 0; }
            if (op.a.Obj.TryGetValue("bones", out var bones)) foreach (var kv in bones) Group(kv.Key, (float)kv.Value);
            double bt = Quant(t, op.start, baseRate);
            PrepareOverlap(bt, actor); Run(bt, actor);
            for (int b = 0; b < n; b++) if (_sset[b]) _rig[b].SetLocalPositionAndRotation(_sp[b], _sq[b]);
        }

        // ---- beat-warp ----

        /// <summary>Clip time against scene time since the cue, through knots baked at build: a smooth curve that never runs backward.</summary>
        class WarpCurve
        {
            public float[] t, c, m;
            public double Eval(double tl)
            {
                int n = t.Length;
                if (tl <= t[0]) return c[0] + (tl - t[0]) * m[0];
                if (tl >= t[n - 1]) return c[n - 1] + (tl - t[n - 1]) * m[n - 1];
                int j = 0; while (t[j + 1] <= tl) j++;
                double h = t[j + 1] - t[j], u = (tl - t[j]) / h, u2 = u * u, u3 = u2 * u;
                return (2 * u3 - 3 * u2 + 1) * c[j] + (u3 - 2 * u2 + u) * h * m[j] + (-2 * u3 + 3 * u2) * c[j + 1] + (u3 - u2) * h * m[j + 1];
            }
        }

        readonly Dictionary<int, WarpCurve> _warps = new Dictionary<int, WarpCurve>();

        WarpCurve WarpOf(Op op)
        {
            if (!op.a.Obj.TryGetValue("warp", out var j)) return null;
            if (_warps.TryGetValue(op.index, out var w)) return w;
            var ts = j["t"].ToObject<float[]>(); var cs = j["c"].ToObject<float[]>(); int n = ts.Length;
            w = new WarpCurve { t = new float[n], c = cs, m = new float[n] };
            for (int i = 0; i < n; i++) w.t[i] = (float)(Song.WarpRaw(op.start + ts[i]) - op.ws);
            // Monotone cubic (Fritsch-Carlson): between two knots the clip never overshoots either one.
            var d = new float[n - 1];
            for (int i = 0; i + 1 < n; i++) d[i] = (cs[i + 1] - cs[i]) / Mathf.Max(w.t[i + 1] - w.t[i], 1e-4f);
            w.m[0] = d[0]; w.m[n - 1] = d[n - 2];
            for (int i = 1; i + 1 < n; i++) w.m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
            return _warps[op.index] = w;
        }
    }
}
