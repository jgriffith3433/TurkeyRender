using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// The performance layer: root motion on clips, whole-body pose-to-pose keys, automatic weight (anticipation,
    /// overshoot, settle, successive timing). All of it is a function of time: a key curve is sampled at earlier
    /// times per bone, nothing is read from the previous frame.
    /// </summary>
    public partial class MotionDriver
    {
        // ---- root motion ----

        class RootTable { public Vector3[] p; public Quaternion[] q; public float hz, len; }
        readonly Dictionary<AnimationClip, RootTable> _rootTables = new Dictionary<AnimationClip, RootTable>();
        readonly Dictionary<int, double> _rootCut = new Dictionary<int, double>();

        /// <summary>The clip's root curve, baked once by sampling. A clip's own root is what `Sample` throws away.</summary>
        RootTable RootOf(MVActor actor, AnimationClip clip)
        {
            if (_rootTables.TryGetValue(clip, out var tab)) return tab;
            var go = actor.animRoot != null ? actor.animRoot : actor.gameObject;
            var tr = go.transform; var keepP = tr.localPosition; var keepR = tr.localRotation; var keepS = tr.localScale;
            int n = Mathf.Clamp(Mathf.CeilToInt(clip.length * 60), 2, 3600);
            tab = new RootTable { p = new Vector3[n + 1], q = new Quaternion[n + 1], hz = n / Mathf.Max(clip.length, 1e-3f), len = clip.length };
            for (int i = 0; i <= n; i++)
            {
                tr.localPosition = Vector3.zero; tr.localRotation = Quaternion.identity;
                clip.SampleAnimation(go, clip.length * i / n);
                tab.p[i] = tr.localPosition; tab.q[i] = tr.localRotation;
            }
            tr.localPosition = keepP; tr.localRotation = keepR; tr.localScale = keepS;
            return _rootTables[clip] = tab;
        }

        static void RootAt(RootTable t, double u, out Vector3 p, out Quaternion q)
        {
            double f = Math.Max(0, u) * t.hz; int i = Mathf.Clamp((int)f, 0, t.p.Length - 2); float x = Mathf.Clamp01((float)(f - i));
            p = Vector3.LerpUnclamped(t.p[i], t.p[i + 1], x); q = Quaternion.Slerp(t.q[i], t.q[i + 1], x);
        }

        /// <summary>Travel of the root up to clip time u, cycles stacked end to end.</summary>
        static void RootUnrolled(RootTable t, double u, out Vector3 p, out Quaternion q)
        {
            if (t.len <= 0) { p = Vector3.zero; q = Quaternion.identity; return; }
            int n = (int)Math.Floor(u / t.len); if (u >= t.len && Math.Abs(u - n * t.len) < 1e-6) n--;
            n = Mathf.Clamp(n, 0, 512);
            Vector3 acc = Vector3.zero; Quaternion rot = Quaternion.identity;
            if (n > 0)
            {
                var dp = t.p[t.p.Length - 1] - t.p[0]; var dq = t.q[t.q.Length - 1] * Quaternion.Inverse(t.q[0]);
                for (int i = 0; i < n; i++) { acc += rot * dp; rot = dq * rot; }
            }
            RootAt(t, u - n * t.len, out var lp, out var lq);
            p = acc + rot * (lp - t.p[0]); q = rot * lq;
        }

        /// <summary>Unwrapped clip time, for root motion: the same clock as AddLayer but without the loop.</summary>
        double ClipClock(AnimationClip clip, Op op, double tl)
        {
            double len = clip.length, local;
            float cycle = op.a.F("beats"), speed = op.a.F("speed", 1);
            if (cycle > 0) local = (Song.BeatAt(op.start + tl) - Song.BeatAt(op.start)) / cycle * len; else local = tl * speed;
            local += op.a.F("offset") * len + op.a.F("start");
            if (op.a.F("once") > 0) local = Math.Min(local, op.a.Has("stop") ? op.a.F("stop") : len);
            return local;
        }

        /// <summary>Where the next clip takes over: the travel stops halfway through its blend, so it never snaps.</summary>
        double RootCut(Op op)
        {
            if (_rootCut.TryGetValue(op.index, out var c)) return c;
            c = double.MaxValue;
            foreach (var o in Ops)
                if (o.start > op.start && (o.kind == "anim" || o.kind == "walk") && o.a.F("each") <= 0) { c = o.ws - op.ws + o.a.F("blend", .2f) * .5f; break; }
            return _rootCut[op.index] = c;
        }

        void ApplyRootMotion(ref Pose p, MVActor actor, Op op, double tl)
        {
            if (op.a.Obj.ContainsKey("T")) { TreeRoot(ref p, actor, op, tl); return; }
            var clip = ClipOf(actor, op); if (clip == null) return;
            string axes = op.a.S("root"); float amt = axes != null ? 1 : op.a.F("root");
            var tab = RootOf(actor, clip);
            tl = Math.Min(tl, RootCut(op));
            RootUnrolled(tab, ClipClock(clip, op, 0), out var p0, out var q0);
            RootUnrolled(tab, ClipClock(clip, op, tl), out var p1, out var q1);
            var head = p.q * Quaternion.Euler(p.euler);
            // Clip frame at the start of the cue: the actor's facing is where the clip's forward goes.
            var yaw0 = Quaternion.Euler(0, q0.eulerAngles.y, 0);
            var d = Quaternion.Inverse(yaw0) * (p1 - p0);
            float dy = Mathf.DeltaAngle(q0.eulerAngles.y, q1.eulerAngles.y);
            if (axes == "y") { d.x = d.z = 0; dy = 0; }
            else if (axes == "xz") d.y = 0;
            p.pos += head * Vector3.Scale(d, p.scale) * amt;
            p.euler.y += dy * amt;
        }

        readonly Dictionary<int, Vector3> _stay = new Dictionary<int, Vector3>();

        /// <summary>A body that ended up somewhere else on its own clip (a ragdoll): as the next clip blends in, the actor walks over to where the
        /// hips are at the same rate the hips blend home, so they stay put in the world and the next clip starts where he fell.</summary>
        void ApplyStay(ref Pose p, MVActor actor, Op op, double tw)
        {
            Op next = null;
            foreach (var o in Ops) if (o.start > op.start && (o.kind == "anim" || o.kind == "walk") && o.a.F("each") <= 0) { next = o; break; }
            if (next == null || tw <= next.ws) return;
            if (!_stay.TryGetValue(op.index, out var d))
            {
                var clip = ClipOf(actor, op); var go = actor.animRoot; var hips = actor.human.Length > 0 ? actor.human[(int)HumanBodyBones.Hips] : null;
                if (!clip || !hips) return;
                Sample(clip, 0, go); var a = actor.transform.InverseTransformPoint(hips.position);
                Sample(clip, clip.length, go); var b = actor.transform.InverseTransformPoint(hips.position);
                d = b - a; d.y = 0; _stay[op.index] = d;
            }
            float blend = next.a.F("blend", .2f), w = blend > 0 ? Ease.Apply("inout", (float)((tw - next.ws) / blend)) : 1;
            p.pos += (p.q * Quaternion.Euler(p.euler)) * d * w;
        }

        // ---- the rig as flat arrays ----

        int[] _par; float[] _succ; int[] _cls; float[] _clsStep; int _hipsIx = -1; Quaternion[] _g; Vector3[] _bp; Quaternion[] _bq;

        /// <summary>The skeleton only, parents first: things parented to bones at run time (feathers, the mouth) come and go and are not ours to blend.</summary>
        void BuildRig(GameObject go)
        {
            var keep = new HashSet<Transform>();
            foreach (var s in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                foreach (var b in s.bones)
                    for (var t = b; t != null && t != go.transform; t = t.parent) keep.Add(t);
            var l = new List<Transform>();
            foreach (var t in go.GetComponentsInChildren<Transform>(true))
                if (t != go.transform && (keep.Count == 0 || keep.Contains(t))) l.Add(t);
            _rig = l.ToArray(); _p = new Vector3[_rig.Length]; _r = new Quaternion[_rig.Length];
        }

        void RigInit(MVActor actor)
        {
            if (_par != null) return;
            var go = actor.animRoot != null ? actor.animRoot : actor.gameObject;
            if (_rig == null)
            {
                BuildRig(go);
            }
            int n = _rig.Length;
            _par = new int[n]; _succ = new float[n]; _cls = new int[n]; _g = new Quaternion[n]; _bp = new Vector3[n]; _bq = new Quaternion[n];
            var ix = new Dictionary<Transform, int>();
            for (int i = 0; i < n; i++) ix[_rig[i]] = i;
            for (int i = 0; i < n; i++) _par[i] = _rig[i].parent != null && ix.TryGetValue(_rig[i].parent, out var pi) ? pi : -1;
            if (actor.human.Length > 0)
            {
                for (int b = 0; b < actor.human.Length; b++)
                    if (actor.human[b] && ix.TryGetValue(actor.human[b], out var i)) _succ[i] = Step((HumanBodyBones)b);
                if (actor.human[(int)HumanBodyBones.Hips] && ix.TryGetValue(actor.human[(int)HumanBodyBones.Hips], out var h)) _hipsIx = h;
            }
            else
            {
                // A generic rig: the delay grows down each chain, from the first bone with children.
                for (int i = 0; i < n; i++) if (_par[i] >= 0) _succ[i] = _succ[_par[i]] + .5f;
                for (int i = 0; i < n; i++) if (_rig[i].childCount > 0) { _hipsIx = i; break; }
            }
            var steps = new List<float>();
            for (int i = 0; i < n; i++) { if (!steps.Contains(_succ[i])) steps.Add(_succ[i]); _cls[i] = steps.IndexOf(_succ[i]); }
            _clsStep = steps.ToArray();
        }

        /// <summary>Successive timing, in steps of delay: hips lead, then the chest, neck, head, then arms, hands and fingers.</summary>
        static float Step(HumanBodyBones b)
        {
            switch (b)
            {
                case HumanBodyBones.Spine: return 1;
                case HumanBodyBones.Chest: return 1.5f;
                case HumanBodyBones.UpperChest: return 2;
                case HumanBodyBones.Neck: case HumanBodyBones.LeftShoulder: case HumanBodyBones.RightShoulder: return 2.5f;
                case HumanBodyBones.Head: case HumanBodyBones.LeftUpperArm: case HumanBodyBones.RightUpperArm: return 3;
                case HumanBodyBones.LeftLowerArm: case HumanBodyBones.RightLowerArm: return 4;
                case HumanBodyBones.LeftHand: case HumanBodyBones.RightHand: return 5;
                default:
                    if (b >= HumanBodyBones.LeftThumbProximal && b <= HumanBodyBones.RightLittleDistal) return 6;
                    return 0; // legs stay with the hips
            }
        }

        static float StepOf(MVActor actor, Transform b)
        {
            for (int i = 0; i < actor.human.Length; i++) if (actor.human[i] == b) return Step((HumanBodyBones)i);
            return 0;
        }

        // ---- quaternion log and exp, for splines in rotation space ----

        static Vector3 Log(Quaternion q)
        {
            if (q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
            var v = new Vector3(q.x, q.y, q.z); float s = v.magnitude;
            if (s < 1e-6f) return v * 2;
            return v * (2 * Mathf.Atan2(s, q.w) / s);
        }

        static Quaternion Exp(Vector3 v)
        {
            float a = v.magnitude;
            if (a < 1e-6f) return new Quaternion(v.x * .5f, v.y * .5f, v.z * .5f, 1);
            float s = Mathf.Sin(a * .5f) / a;
            return new Quaternion(v.x * s, v.y * s, v.z * s, Mathf.Cos(a * .5f));
        }

        /// <summary>Rises from 0 past the end of a move, swings over and dies away. Starts with a slope, so a move arriving with speed carries through it.</summary>
        static float Ring(float x, float settle)
        {
            if (x <= 0 || x >= settle) return 0;
            const float cycles = 1.25f;
            float q = x / settle, env = (1 - q) * (1 - q);
            return Mathf.Sin(q * cycles * 2 * Mathf.PI) * env * 1.45f;
        }

        /// <summary>The dip before a move: out to -1 at the moment the move starts, gone a little way into it.</summary>
        static float Wind(float x, float lead, float back)
        {
            if (x <= -lead || x >= back) return 0;
            if (x <= 0) { float q = 1 + x / lead; return -q * q * (3 - 2 * q); }
            { float q = x / back; return -(1 - q) * (1 - q); }
        }

        /// <summary>A tween's progress with anticipation, overshoot and settle. tau is scene seconds from the move's start, dur its length.</summary>
        static float Weigh(string ease, float tau, float dur, float lead, float ant, float over, float settle)
        {
            float k = tau <= 0 ? 0 : Ease.Apply(ease, tau / dur);
            if (ant != 0) k += ant * Wind(tau, lead, dur * .4f);
            if (over != 0) k += over * Ring(tau - dur, settle);
            return k;
        }

        const float DefaultLead = .16f, DefaultSettle = .4f, DefaultOver = .1f;

        /// <summary>Pose cue progress for one bone, weighted and delayed.</summary>
        float PoseK(Op op, double tl, float step)
        {
            var a = op.a; float lead = a.F("lead"), sc = LeadScene(op, lead), dur = Mathf.Max((float)op.WDur - sc, 1e-4f);
            float tau = (float)tl - sc - step * a.F("successive");
            float over = a.Has("overshoot") ? a.F("overshoot") : a.Has("settle") ? DefaultOver : 0;
            return Weigh(a.S("ease"), tau, dur, sc > 0 ? sc : DefaultLead, a.F("anticipate"), over, a.F("settle", DefaultSettle));
        }

        float LeadScene(Op op, float lead) => lead <= 0 ? 0 : (float)(Song.WarpRaw(op.start + lead) - op.ws);

        static bool Weighted(Args a) => a.Has("anticipate") || a.Has("overshoot") || a.Has("settle") || a.Has("successive");

        // ---- pose to pose ----

        class Knot
        {
            public float t, ant, over, settle; public bool rel = true, flat, hasRoot; public string ease;
            public int clip = -1; public float ct, cf = -1;
            public List<(int bone, Quaternion e, bool local)> add = new List<(int, Quaternion, bool)>();
            public Vector3 hips, rootP, rootR;
            public Vector3[] p; public Quaternion[] q; public int stamp = -1;
        }

        class KeySet
        {
            public List<Knot> k = new List<Knot>(); public float succ, tension, blend, release, lead; public bool hasRoot; public double relStart = double.MaxValue, relLen;
        }

        readonly Dictionary<int, KeySet> _keysets = new Dictionary<int, KeySet>();
        readonly List<(Op op, double tl, KeySet ks)> _keyOps = new List<(Op, double, KeySet)>();
        int _frame;

        static Vector3 V3(JToken j) => j is JArray a && a.Count == 3 ? new Vector3((float)a[0], (float)a[1], (float)a[2]) : Vector3.zero;

        KeySet KeysOf(MVActor actor, Op op)
        {
            if (_keysets.TryGetValue(op.index, out var ks)) return ks;
            ks = new KeySet { succ = op.a.F("successive"), tension = op.a.F("tension"), blend = op.a.F("blend", .2f), lead = op.a.F("lead") };
            RigInit(actor);
            var list = op.a.Obj.TryGetValue("K", out var jk) ? jk["list"] as JArray : null;
            float defAnt = op.a.F("anticipate"), defOver = op.a.Has("overshoot") ? op.a.F("overshoot") : op.a.Has("settle") ? DefaultOver : 0, defSettle = op.a.F("settle", DefaultSettle);
            double sc(float kt) => Song.WarpRaw(op.start + kt) - op.ws; // key times are song seconds, curves run in scene time
            var bonesIx = new Dictionary<Transform, int>();
            for (int i = 0; i < _rig.Length; i++) bonesIx[_rig[i]] = i;
            if (list != null)
                foreach (JObject j in list)
                {
                    var n = new Knot { t = (float)sc((float?)j["t"] ?? 0), ease = (string)j["ease"], flat = ((bool?)j["flat"] ?? false) };
                    n.ant = (float?)j["anticipate"] ?? defAnt; n.settle = (float?)j["settle"] ?? defSettle;
                    n.over = (float?)j["overshoot"] ?? (j["settle"] != null ? DefaultOver : defOver);
                    if (j["clip"] != null) { n.clip = (int)j["clip"]; n.ct = (float?)j["ct"] ?? 0; n.cf = (float?)j["cf"] ?? -1; n.rel = false; }
                    if (j["bones"] is JObject bs)
                    {
                        bool local = (string)j["space"] == "local";
                        foreach (var kv in bs)
                        {
                            var b = actor.Bone(kv.Key); if (!b || !bonesIx.TryGetValue(b, out var ix)) continue;
                            n.add.Add((ix, Quaternion.Euler(V3(kv.Value)), local));
                        }
                    }
                    n.hips = V3(j["hips"]);
                    if (j["rootPos"] != null || j["rootRot"] != null) { n.hasRoot = ks.hasRoot = true; n.rootP = V3(j["rootPos"]); n.rootR = V3(j["rootRot"]); }
                    float hold = (float?)j["hold"] ?? 0;
                    ks.k.Add(n);
                    if (hold > 0)
                    {
                        // A hold is the same pose twice with flat tangents between. The second copy shares the first's baked pose.
                        var m = new Knot { t = (float)sc(((float?)j["t"] ?? 0) + hold), rel = n.rel, clip = n.clip, ct = n.ct, cf = n.cf, add = n.add, hips = n.hips, flat = true, hasRoot = n.hasRoot, rootP = n.rootP, rootR = n.rootR };
                        n.flat = true; ks.k.Add(m);
                    }
                }
            if (ks.k.Count == 0) ks.k.Add(new Knot { t = 0 });
            ks.k.Sort((x, y) => x.t.CompareTo(y.t));
            // What plays underneath is a knot too: the first move starts from it.
            float first = ks.k.Count > 0 ? ks.k[0].t : 0;
            if (first > 1e-3f) { ks.k.Insert(0, new Knot { t = 0, flat = true }); ks.blend = 0; }
            if (ks.lead > 0 && ks.k.Count > 1 && ks.k[1].t > (float)sc(ks.lead)) ks.k.Insert(1, new Knot { t = (float)sc(ks.lead), flat = true });
            ks.k[ks.k.Count - 1].flat = true; ks.k[0].flat = true;
            // After the last key it holds, until `release` runs out or the next clip takes over within its blend.
            float tail = ks.k[ks.k.Count - 1].t, rel = op.a.F("release");
            if (rel > 0) { ks.relStart = tail; ks.relLen = rel; }
            else foreach (var o in Ops)
                    if (o.start > op.start && o.ws - op.ws >= tail - 1e-4 && (o.kind == "anim" || o.kind == "walk") && o.a.F("each") <= 0) { ks.relStart = o.ws - op.ws; ks.relLen = Math.Max(o.a.F("blend", .2f), .001f); break; }
            foreach (var n in ks.k) Bake(actor, op, n);
            return _keysets[op.index] = ks;
        }

        /// <summary>Takes the frame of a clip the knot was captured from. Its height comes with it, so a pose off a clip that drops its root stands where the clip stood.</summary>
        void Bake(MVActor actor, Op op, Knot n)
        {
            if (n.rel) return;
            var clip = n.clip < (op.refs?.Length ?? 0) ? op.refs[n.clip] as AnimationClip : null;
            if (!clip) { n.rel = true; return; }
            var go = actor.animRoot != null ? actor.animRoot : actor.gameObject; var tr = go.transform;
            for (int i = 0; i < _rig.Length; i++) _rig[i].GetLocalPositionAndRotation(out _p[i], out _r[i]);
            var keepP = tr.localPosition; var keepR = tr.localRotation; var keepS = tr.localScale;
            tr.localPosition = Vector3.zero; tr.localRotation = Quaternion.identity;
            clip.SampleAnimation(go, n.cf >= 0 ? n.cf * clip.length : n.ct);
            float dy = tr.localPosition.y;
            n.p = new Vector3[_rig.Length]; n.q = new Quaternion[_rig.Length];
            for (int i = 0; i < _rig.Length; i++) _rig[i].GetLocalPositionAndRotation(out n.p[i], out n.q[i]);
            if (_hipsIx >= 0 && dy != 0)
            {
                var par = _rig[_hipsIx].parent;
                n.p[_hipsIx] += par.InverseTransformVector(tr.parent.TransformVector(Vector3.up * dy));
            }
            AddTo(n, n.p, n.q, actor);
            n.hips = Vector3.zero; n.add = new List<(int, Quaternion, bool)>();
            tr.localPosition = keepP; tr.localRotation = keepR; tr.localScale = keepS;
            for (int i = 0; i < _rig.Length; i++) _rig[i].SetLocalPositionAndRotation(_p[i], _r[i]);
        }

        /// <summary>Puts a knot's additive rotations on a pose: actor-frame degrees, parents first, whatever each bone's axes are.</summary>
        void AddTo(Knot n, Vector3[] p, Quaternion[] q, MVActor actor)
        {
            if (n.hips != Vector3.zero && _hipsIx >= 0)
            {
                var par = _rig[_hipsIx].parent;
                p[_hipsIx] += par.InverseTransformVector(actor.transform.rotation * n.hips);
            }
            if (n.add.Count == 0) return;
            for (int i = 0; i < _rig.Length; i++)
            {
                var pg = _par[i] >= 0 ? _g[_par[i]] : Quaternion.identity;
                _g[i] = pg * q[i];
                foreach (var (bone, e, local) in n.add)
                {
                    if (bone != i) continue;
                    if (local) q[i] *= e; else q[i] = Quaternion.Inverse(pg) * e * _g[i];
                    _g[i] = pg * q[i];
                }
            }
        }

        // Where a time falls on the knots, per delay class.
        struct Seg { public int j; public float u, dt; public float h10, h01, h11; public bool eased; public float e; public float a0, a1, a2; }
        Seg[] _segs = new Seg[0];

        Seg Find(KeySet ks, float tau)
        {
            var k = ks.k; int n = k.Count, j = 0;
            if (n < 2) return new Seg { j = 0, u = 0 };
            while (j < n - 2 && k[j + 1].t <= tau) j++;
            float dt = Mathf.Max(k[j + 1].t - k[j].t, 1e-4f), u = Mathf.Clamp01((tau - k[j].t) / dt);
            var s = new Seg { j = j, u = u, dt = dt };
            float u2 = u * u, u3 = u2 * u;
            s.h10 = u3 - 2 * u2 + u; s.h01 = -2 * u3 + 3 * u2; s.h11 = u3 - u2;
            var e = k[j + 1].ease;
            if (e != null) { s.eased = true; s.e = Ease.Apply(e, u); }
            // Weight terms: the move before this segment overshooting, this one, the next one winding up.
            s.a0 = j > 0 ? Impulse(ks, j - 1, tau) : 0; s.a1 = Impulse(ks, j, tau); s.a2 = j + 2 < n ? Impulse(ks, j + 1, tau) : 0;
            return s;
        }

        /// <summary>How much of the move from knot s to s+1 is added at this moment, past either end of it.</summary>
        float Impulse(KeySet ks, int s, float tau)
        {
            Knot a = ks.k[s], b = ks.k[s + 1]; float v = 0;
            if (b.ant != 0) v += b.ant * Wind(tau - a.t, ks.lead > 0 ? Mathf.Min(ks.lead, DefaultLead * 1.5f) : DefaultLead, (b.t - a.t) * .4f);
            if (b.over != 0) v += b.over * Ring(tau - b.t, b.settle);
            return v;
        }

        void KnotPose(KeySet ks, int i, Vector3[] bp, Quaternion[] bq, MVActor actor)
        {
            var n = ks.k[i]; if (n.stamp == _frame) return; n.stamp = _frame;
            if (!n.rel) return;
            if (n.p == null) { n.p = new Vector3[bp.Length]; n.q = new Quaternion[bq.Length]; }
            Array.Copy(bp, n.p, bp.Length); Array.Copy(bq, n.q, bq.Length);
            AddTo(n, n.p, n.q, actor);
        }

        void ApplyKeys(MVActor actor, Op op, double tl, KeySet ks)
        {
            int n = _rig.Length, nk = ks.k.Count; if (nk == 0) return;
            for (int i = 0; i < n; i++) _rig[i].GetLocalPositionAndRotation(out _bp[i], out _bq[i]);
            _frame++;
            float tau = (float)tl, w = 1;
            if (ks.blend > 0) w = Ease.Apply("inout", tau / ks.blend);
            if (tl > ks.relStart) w *= 1 - Ease.Apply("inout", (float)((tl - ks.relStart) / ks.relLen));
            if (w <= 0) return;
            if (_segs.Length < _clsStep.Length) _segs = new Seg[_clsStep.Length];
            int lo = nk, hi = 0;
            for (int c = 0; c < _clsStep.Length; c++)
            {
                _segs[c] = Find(ks, tau - _clsStep[c] * ks.succ);
                lo = Mathf.Min(lo, _segs[c].j - 2); hi = Mathf.Max(hi, _segs[c].j + 3);
            }
            for (int i = Mathf.Max(lo, 0); i <= Mathf.Min(hi, nk - 1); i++) KnotPose(ks, i, _bp, _bq, actor);
            float tens = 1 - ks.tension;
            for (int b = 0; b < n; b++)
            {
                ref var s = ref _segs[_cls[b]];
                int j = s.j; var k1 = ks.k[j]; var k2 = ks.k[Mathf.Min(j + 1, nk - 1)];
                Quaternion q1 = k1.q[b], q2 = k2.q[b], inv = Quaternion.Inverse(q1);
                var rel = inv * q2; var D = Log(rel);
                Vector3 v;
                if (s.eased) v = D * s.e;
                else
                {
                    Vector3 m1 = default, m2 = default;
                    if (!k1.flat && j > 0)
                    {
                        float dp = Mathf.Max(k1.t - ks.k[j - 1].t, 1e-4f);
                        m1 = (D / s.dt - Log(inv * ks.k[j - 1].q[b]) / dp) * (.5f * tens);
                    }
                    if (!k2.flat && j + 2 < nk)
                    {
                        float dn = Mathf.Max(ks.k[j + 2].t - k2.t, 1e-4f); var inv2 = Quaternion.Inverse(q2);
                        m2 = rel * ((Log(inv2 * ks.k[j + 2].q[b]) / dn - Log(inv2 * q1) / s.dt) * (.5f * tens));
                    }
                    v = D * s.h01 + (m1 * s.h10 + m2 * s.h11) * s.dt;
                }
                var q = q1 * Exp(v);
                if (s.a1 != 0) q *= Exp(D * s.a1);
                if (s.a0 != 0 && j > 0) q *= Exp(Log(Quaternion.Inverse(ks.k[j - 1].q[b]) * q1) * s.a0);
                if (s.a2 != 0 && j + 2 < nk) q *= Exp(Log(Quaternion.Inverse(q2) * ks.k[j + 2].q[b]) * s.a2);

                Vector3 p1 = k1.p[b], p2 = k2.p[b], dpos = p2 - p1, pos;
                if (s.eased) pos = p1 + dpos * s.e;
                else
                {
                    Vector3 m1 = default, m2 = default;
                    if (!k1.flat && j > 0) m1 = (p2 - ks.k[j - 1].p[b]) / Mathf.Max(k2.t - ks.k[j - 1].t, 1e-4f) * tens;
                    if (!k2.flat && j + 2 < nk) m2 = (ks.k[j + 2].p[b] - p1) / Mathf.Max(ks.k[j + 2].t - k1.t, 1e-4f) * tens;
                    pos = p1 + dpos * s.h01 + (m1 * s.h10 + m2 * s.h11) * s.dt;
                }
                if (s.a1 != 0) pos += dpos * s.a1;
                if (s.a0 != 0 && j > 0) pos += (p1 - ks.k[j - 1].p[b]) * s.a0;
                if (s.a2 != 0 && j + 2 < nk) pos += (ks.k[j + 2].p[b] - p2) * s.a2;

                if (w < 1) { q = Quaternion.Slerp(_bq[b], q, w); pos = Vector3.LerpUnclamped(_bp[b], pos, w); }
                _rig[b].SetLocalPositionAndRotation(pos, q);
            }
        }

        /// <summary>The keys' whole-body travel: added to the actor in its own frame, from where it stood when the cue began. It stays after the keys end.</summary>
        void KeysRoot(ref Pose p, KeySet ks, double tl)
        {
            if (!ks.hasRoot) return;
            var k = ks.k; int n = k.Count; float tau = (float)tl;
            var head = p.q * Quaternion.Euler(p.euler);
            var seg = Find(ks, tau); int j = seg.j, last = Mathf.Min(j + 1, n - 1);
            Vector3 P(int i) { for (int a = i; a >= 0; a--) if (k[a].hasRoot) return k[a].rootP; return Vector3.zero; }
            Vector3 R(int i) { for (int a = i; a >= 0; a--) if (k[a].hasRoot) return k[a].rootR; return Vector3.zero; }
            Vector3 Curve(Func<int, Vector3> f)
            {
                Vector3 a = f(j), b = f(last), d = b - a;
                if (seg.eased) return a + d * seg.e;
                Vector3 m1 = default, m2 = default;
                if (!k[j].flat && j > 0) m1 = (b - f(j - 1)) / Mathf.Max(k[last].t - k[j - 1].t, 1e-4f);
                if (!k[last].flat && j + 2 < n) m2 = (f(j + 2) - a) / Mathf.Max(k[j + 2].t - k[j].t, 1e-4f);
                var v = a + d * seg.h01 + (m1 * seg.h10 + m2 * seg.h11) * seg.dt;
                if (seg.a1 != 0) v += d * seg.a1;
                if (seg.a0 != 0 && j > 0) v += (a - f(j - 1)) * seg.a0;
                if (seg.a2 != 0 && j + 2 < n) v += (f(j + 2) - b) * seg.a2;
                return v;
            }
            p.pos += head * Vector3.Scale(Curve(P), p.scale);
            p.euler += Curve(R);
        }
    }
}
