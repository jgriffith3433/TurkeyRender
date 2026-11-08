using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Hawkes Punch mechanics: flight along a path, things thrown from hand to hand, a swing around a mover, panels folding out,
    /// and the chase camera. Every one is a pure function of the clip's local time: fixed-time samples of other actors are taken at
    /// the cue's own start or end (never "the previous frame"), so scrubbing and reverse give the same picture.
    /// </summary>
    public partial class MotionDriver
    {
        readonly Dictionary<string, Vector3> _fixed = new Dictionary<string, Vector3>();

        /// <summary>Where `spec` is at song time `at`: a fixed-time sample, cached per op, then the actor is put back to now.</summary>
        Vector3 At(string spec, double at, int opIndex, string tag, Vector3 fallback)
        {
            string key = opIndex + "/" + tag;
            if (_fixed.TryGetValue(key, out var v)) return v;
            var tr = MVActor.Point(spec, at);
            if (!tr) return fallback;
            v = tr.position;
            MVActor.Point(spec, _t); // and back to now
            _fixed[key] = v;
            return v;
        }

        /// <summary>Where `spec` is now (song time `_t` plus `shift` seconds), and the actor is put back to now.</summary>
        static Transform Live(string spec, double t, double shift, out Vector3 pos, out Quaternion rot)
        {
            pos = default; rot = Quaternion.identity;
            var tr = MVActor.Point(spec, t + shift);
            if (!tr) return null;
            pos = tr.position; rot = tr.rotation;
            if (Math.Abs(shift) > 1e-6) MVActor.Point(spec, t);
            return tr;
        }

        /// <summary>The new kinds. Returns false for a kind it doesn't know.</summary>
        bool PunchStep(ref Pose p, Op op, double tl, float raw, float k, int i, MVActor actor)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "fly":
                    {
                        var pts = Flight.Points(a, p.pos);
                        float s = Mathf.Clamp01(k);
                        Flight.Sample(pts, s, out var pos, out var dir, out float len);
                        p.pos = pos;
                        if (a.F("face", 1) > 0 && dir.sqrMagnitude > 1e-6f)
                        {
                            // Bank from the turn: a real flyer rolls into the curve by atan(v^2 k / g); `roll` adds a barrel roll over the flight.
                            float v = len / (float)op.WDur;
                            Flight.Sample(pts, Mathf.Clamp01(s + .01f), out _, out var dir2, out _);
                            float turn = Vector3.Angle(dir, dir2) * Mathf.Deg2Rad / Mathf.Max(len * .01f, 1e-3f); // curvature, rad per metre
                            float bank = Mathf.Clamp(Mathf.Atan(v * v * turn / 9.8f) * Mathf.Rad2Deg, 0, a.F("bank", 40));
                            float side = Vector3.Dot(Vector3.Cross(dir, dir2), Vector3.up) >= 0 ? -1 : 1;
                            if (a.S("face") == "yaw") dir.y = 0;
                            var look = dir.sqrMagnitude > 1e-6f ? Quaternion.LookRotation(dir.normalized, Vector3.up) : p.FinalRot;
                            var target = look * Quaternion.Euler(a.V("tilt")) * Quaternion.AngleAxis(bank * side + a.F("roll") * s, Vector3.forward);
                            float turnIn = a.F("turn", .3f);
                            var now = p.q * Quaternion.Euler(p.euler);
                            p.q = turnIn > 0 ? Quaternion.Slerp(now, target, Mathf.Clamp01((float)tl / turnIn)) : target;
                            p.euler = Vector3.zero;
                        }
                        break;
                    }
                case "throwobj":
                    {
                        // Leaves where the hand was at the cue's start, arrives where the other hand will be at its end, so a moving catcher still catches.
                        Vector3 from = p.pos;
                        if (a.S("from") == "swing") from = SwingAt(op, op.start, p.pos);
                        else if (a.S("from") != null) from = At(a.S("from"), op.start, op.index, "from", p.pos) + Offset(a, "fromOffset", a.S("from"), op.start, op.index, "fromQ");
                        Vector3 to = a.Vec.TryGetValue("to", out var tv) ? tv : At(a.S("to"), op.start + op.WDur, op.index, "to", from) + Offset(a, "toOffset", a.S("to"), op.start + op.WDur, op.index, "toQ");
                        float q = Mathf.Clamp01(a.Has("ease") ? k : raw);
                        float arc = a.Has("arc") ? a.F("arc") : Vector3.Distance(from, to) * .18f;
                        if (a.F("straight") > 0) arc = 0;
                        p.pos = Vector3.Lerp(from, to, q) + a.V("up", Vector3.up) * (4 * q * (1 - q) * arc);
                        float spin = a.F("spin", 360);
                        if (spin != 0) { p.q = Quaternion.AngleAxis(spin * q, a.V("axis", new Vector3(1, 0, .3f)).normalized) * p.q; }
                        break;
                    }
                case "swing":
                    {
                        p.pos = SwingAt(op, _t, p.pos);
                        if (a.F("spin") != 0) { float s = Mathf.Clamp01(k); p.q = Quaternion.AngleAxis(a.F("spin") * s, a.V("axis", Vector3.up)) * p.q; }
                        break;
                    }
                case "fold":
                    {
                        // A panel on a hinge: folded flat (turned `angle` about `axis` at `pivot`) and shrunk at `from`, it swings open and grows to its place.
                        float e = Ease.Apply(a.S("ease", "back"), Mathf.Clamp01(raw));
                        var q = Quaternion.AngleAxis(a.F("angle", 90) * (1 - e), a.V("axis", Vector3.right).normalized);
                        var piv = a.F("world") > 0 ? a.V("pivot") : p.pos + a.V("pivot");
                        p.pos = piv + q * (p.pos - piv);
                        p.q = q * p.q;
                        if (a.Has("from")) { float g = Mathf.Clamp01(raw); float gs = Ease.Apply("out", g); p.pos = Vector3.Lerp(a.V("from"), p.pos, gs); p.scaleMul *= Mathf.Max(.001f, Mathf.Clamp01(e)); }
                        break;
                    }
                case "chase":
                    {
                        // The camera rides `lag` seconds behind the target's path, at `offset` in the world or in the target's own heading.
                        if (Live(a.S("target"), _t, -a.F("lag"), out var tp, out var tq) == null) break;
                        var off = a.V("offset", new Vector3(0, 2, -6));
                        if (a.S("space") == "target") { var f = tq * Vector3.forward; f.y = 0; off = (f.sqrMagnitude > 1e-4f ? Quaternion.LookRotation(f.normalized) : Quaternion.identity) * off; }
                        else if (a.S("space") == "full") off = tq * off;
                        p.pos = tp + off;
                        break;
                    }
                case "leadpoint":
                    {
                        // Where the subject will be `lead` seconds from now: the camera aims ahead of a fast flyer.
                        if (Live(a.S("target"), _t, a.F("lead"), out var tp, out _) == null) break;
                        p.pos = tp + a.V("offset");
                        break;
                    }
                case "hitshake":
                    {
                        // A hit body shaking through a hitstop, on song time (the warp stands still in the hold): sharp, decaying to nothing at the end.
                        // `creep` instead moves the attacker forward along `dir` a little through the hold (Sakurai's trick).
                        double s = (_t - op.start) / op.Dur; if (s < 0 || s >= 1) break;
                        float fall = a.F("decay", 1) > 0 ? 1 - (float)s : 1, hz = a.F("hz", 20);
                        float wave = Mathf.Cos((float)(_t - op.start) * hz * Mathf.PI * 2);
                        p.addPos += a.V("axis", Vector3.up).normalized * (a.F("amount", .05f) * fall * wave);
                        if (a.F("creep") != 0) p.addPos += (p.q * Quaternion.Euler(p.euler)) * a.V("dir", Vector3.forward).normalized * (a.F("creep") * (float)s);
                        break;
                    }
                default: return SpaceStep(ref p, op, tl, raw, k, i, actor); // focus, planet_*, ring_hoop, crater (MVSpace.cs)
            }
            return true;
        }

        Vector3 Offset(Args a, string key, string spec, double at, int opIndex, string tag)
        {
            var o = a.V(key);
            if (o == Vector3.zero || a.F("rel") <= 0 || spec == null) return o;
            // in the bone's own frame: a fixed-time sample of its rotation
            string k = opIndex + "/" + tag;
            if (!_fixedQ.TryGetValue(k, out var q))
            {
                var tr = MVActor.Point(spec, at); q = tr ? tr.rotation : Quaternion.identity;
                if (tr) MVActor.Point(spec, _t);
                _fixedQ[k] = q;
            }
            return q * o;
        }
        readonly Dictionary<string, Quaternion> _fixedQ = new Dictionary<string, Quaternion>();

        /// <summary>The swing's position at song time `at`: around the mover, from where the object was when the swing began.</summary>
        Vector3 SwingAt(Op op, double at, Vector3 held)
        {
            var a = op.a;
            var swing = op;
            if (op.kind != "swing")
            {
                swing = null;
                foreach (var o in Ops) { if (o.start >= op.start) break; if (o.kind == "swing") swing = o; }
                if (swing == null) return held;
                a = swing.a;
            }
            double tl = Math.Min(Song.Warp(at) - swing.ws, swing.WDur);
            float s = Ease.Apply(a.S("ease", "inout"), (float)(tl / swing.WDur));
            var c0 = At(a.S("around"), swing.start, swing.index, "around0", Vector3.zero);
            Vector3 d0;
            if (op.kind == "swing") { d0 = held - c0; _swingD0[swing.index] = d0; }
            else if (!_swingD0.TryGetValue(swing.index, out d0)) d0 = held - c0;
            if (!Live(a.S("around"), _t, at - _t, out var c, out _)) c = c0;
            var axis = a.V("axis", Vector3.up).normalized;
            float ang = a.F("turns", 1) * 360 * s + a.F("angle");
            var d = Quaternion.AngleAxis(ang, axis) * d0;
            d *= 1 + (a.F("radius", 1) - 1) * s;
            return c + d + Vector3.up * (a.F("lift") * Mathf.Sin(s * Mathf.PI));
        }
        readonly Dictionary<int, Vector3> _swingD0 = new Dictionary<int, Vector3>();
    }

    /// <summary>The flight path: a Catmull-Rom through `pts` ("x,y,z;x,y,z"), or from here to `to` over an `arc`. Shared with the trail fx.</summary>
    public static class Flight
    {
        static readonly Dictionary<string, Vector3[]> Parsed = new Dictionary<string, Vector3[]>();

        public static Vector3[] Points(Args a, Vector3 here)
        {
            var s = a.S("pts");
            Vector3[] pts;
            if (!string.IsNullOrEmpty(s))
            {
                if (!Parsed.TryGetValue(s, out pts))
                {
                    var parts = s.Split(';'); pts = new Vector3[parts.Length];
                    for (int i = 0; i < parts.Length; i++) { var c = parts[i].Split(','); pts[i] = new Vector3(float.Parse(c[0], System.Globalization.CultureInfo.InvariantCulture), float.Parse(c[1], System.Globalization.CultureInfo.InvariantCulture), float.Parse(c[2], System.Globalization.CultureInfo.InvariantCulture)); }
                    Parsed[s] = pts;
                }
                if (a.F("fromHere") > 0) { var q = new Vector3[pts.Length + 1]; q[0] = here; Array.Copy(pts, 0, q, 1, pts.Length); return q; }
                return pts;
            }
            var to = a.V("to", here + Vector3.forward * 10);
            float arc = a.F("arc");
            var mid = (here + to) * .5f + a.V("up", Vector3.up) * arc;
            return arc != 0 ? new[] { here, mid, to } : new[] { here, to };
        }

        static Vector3 CR(Vector3[] p, int i, float u)
        {
            Vector3 a = p[Mathf.Max(i - 1, 0)], b = p[i], c = p[Mathf.Min(i + 1, p.Length - 1)], d = p[Mathf.Min(i + 2, p.Length - 1)];
            return .5f * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
        }

        /// <summary>Position and direction at arc fraction s (0..1), and the path's length. The table is built each call: 24 samples a segment.</summary>
        public static void Sample(Vector3[] pts, float s, out Vector3 pos, out Vector3 dir, out float length)
        {
            if (pts.Length < 2) { pos = pts.Length > 0 ? pts[0] : Vector3.zero; dir = Vector3.forward; length = 0; return; }
            const int N = 24; int segs = pts.Length - 1, n = segs * N;
            float total = 0; var prev = pts[0];
            // first pass: length
            var cum = new float[n + 1];
            for (int j = 1; j <= n; j++) { int i = (j - 1) / N; float u = (j - 1 - i * N + 1f) / N; var q = CR(pts, i, u); total += Vector3.Distance(prev, q); cum[j] = total; prev = q; }
            length = total;
            float want = s * total; int lo = 0, hi = n;
            while (hi - lo > 1) { int m = (lo + hi) / 2; if (cum[m] <= want) lo = m; else hi = m; }
            float f = cum[hi] > cum[lo] ? (want - cum[lo]) / (cum[hi] - cum[lo]) : 0;
            Vector3 P(int j) { if (j <= 0) return pts[0]; if (j >= n) return pts[pts.Length - 1]; int i = (j - 1) / N; float u = (j - 1 - i * N + 1f) / N; return CR(pts, i, u); }
            var A = P(lo); var B = P(hi);
            pos = Vector3.Lerp(A, B, f);
            dir = B - A; if (dir.sqrMagnitude < 1e-8f) dir = P(Mathf.Min(hi + 1, n)) - A;
            dir = dir.sqrMagnitude > 1e-8f ? dir.normalized : Vector3.forward;
        }
    }
}
