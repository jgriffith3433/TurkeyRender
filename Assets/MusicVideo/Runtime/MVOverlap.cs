using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Overlap and contact. Overlap is a damped spring on each limb's tip, solved in closed form: the offset at time t is the
    /// acceleration of the character's own motion, sampled at earlier scene times on a fixed grid, convolved with the spring's
    /// impulse response. Nothing is integrated frame to frame, so reverse matches forward. The grid is only a memo of a pure function.
    /// </summary>
    public partial class MotionDriver
    {
        public static int History; static readonly HashSet<MotionDriver> Dirty = new HashSet<MotionDriver>();
        bool _lite;

        const float GridHz = 30; const int Window = 30;
        class Chain { public Transform bone, tip; public Vector3 tipLocal; public int group; public float gain; public float[] g; }
        List<Chain> _chains; Vector3[] _tips;
        readonly Dictionary<int, Vector3[]> _grid = new Dictionary<int, Vector3[]>(), _xs = new Dictionary<int, Vector3[]>();
        readonly float[] _ovl = new float[4]; float _ovlAll; readonly List<Op> _ovlOps = new List<Op>(); bool _ovlScanned;

        void BeginPerform() { BeginLimits(); _keyOps.Clear(); _layerOps.Clear(); _ovlAll = 0; Array.Clear(_ovl, 0, 4); }

        static readonly string[] OvlGroup = { "torso", "head", "arms", "hands" };

        void FoldOverlap(Op op, double tl)
        {
            float k = Ease.Apply(op.a.S("ease"), (float)(tl / op.WDur));
            _ovlAll = Mathf.LerpUnclamped(_ovlAll, op.a.F("amount", 1), k);
            for (int i = 0; i < 4; i++) _ovl[i] = Mathf.LerpUnclamped(_ovl[i], op.a.F(OvlGroup[i], 1), k);
        }

        float[] Kernel(float hz, float zeta)
        {
            float w = 2 * Mathf.PI * hz, wd = w * Mathf.Sqrt(1 - zeta * zeta), dt = 1 / GridHz;
            var g = new float[Window + 1];
            for (int i = 1; i <= Window; i++) { float s = i * dt; g[i] = Mathf.Exp(-zeta * w * s) * Mathf.Sin(wd * s) / wd * dt; }
            return g;
        }

        void AddChain(Transform bone, Transform tip, Vector3 tipLocal, int group, float hz, float zeta, float gain)
        {
            if (!bone) return;
            _chains.Add(new Chain { bone = bone, tip = tip, tipLocal = tipLocal, group = group, gain = gain, g = Kernel(hz, zeta) });
        }

        void BuildChains(MVActor actor)
        {
            _chains = new List<Chain>();
            float fm = 1, dm = 1; string words = null;
            foreach (var op in _ovlOps) { fm = op.a.F("freq", fm); dm = op.a.F("damp", dm); words = op.a.S("chains", words); }
            if (actor.human.Length > 0)
            {
                Transform B(HumanBodyBones b) => actor.human[(int)b];
                AddChain(B(HumanBodyBones.Chest), B(HumanBodyBones.Neck), default, 0, 2.2f * fm, .6f * dm, .5f);
                AddChain(B(HumanBodyBones.Neck), B(HumanBodyBones.Head), default, 1, 2.6f * fm, .5f * dm, .8f);
                var hd = B(HumanBodyBones.Head);
                if (hd) AddChain(hd, null, hd.InverseTransformVector((hd.position - B(HumanBodyBones.Neck).position).normalized * .18f), 1, 2.1f * fm, .45f * dm, 1.1f);
                foreach (var s in new[] { 0, 1 })
                {
                    HumanBodyBones U = s == 0 ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm, L = s == 0 ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm, H = s == 0 ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand, M = s == 0 ? HumanBodyBones.LeftMiddleProximal : HumanBodyBones.RightMiddleProximal;
                    AddChain(B(U), B(L), default, 2, 1.5f * fm, .38f * dm, 1.3f);
                    AddChain(B(L), B(H), default, 2, 1.9f * fm, .4f * dm, 1f);
                    AddChain(B(H), B(M), default, 3, 3f * fm, .4f * dm, .9f);
                }
                return;
            }
            // Any other rig: every bone whose name has one of the words, parents first, tip at its first child.
            var list = new List<string>((words ?? "neck,tail").ToLowerInvariant().Split(','));
            RigInit(actor);
            foreach (var b in _rig)
            {
                var n = b.name.ToLowerInvariant(); bool hit = false;
                foreach (var w in list) if (n.Contains(w.Trim())) hit = true;
                if (!hit) continue;
                if (b.childCount > 0) AddChain(b, b.GetChild(0), default, 1, 2.4f * fm, .42f * dm, 1.2f);
                else if (b.parent) AddChain(b, null, b.InverseTransformVector(b.position - b.parent.position), 1, 2.8f * fm, .42f * dm, 1.2f);
            }
        }

        static Vector3 TipOf(Chain c) => c.tip ? c.tip.position : c.bone.TransformPoint(c.tipLocal);

        void RecordTips()
        {
            if (_tips == null || _chains == null) return;
            for (int i = 0; i < _chains.Count; i++) _tips[i] = TipOf(_chains[i]);
        }

        /// <summary>Run before the frame itself: fills the memo with the body at the grid times this moment needs.</summary>
        void PrepareOverlap(double t, MVActor actor)
        {
            if (History > 0) return;
            if (!_ovlScanned) { _ovlScanned = true; foreach (var op in Ops) if (op.kind == "overlap") _ovlOps.Add(op); }
            if (_ovlOps.Count == 0) return;
            Op last = null; foreach (var op in _ovlOps) { if (op.start > t) break; last = op; }
            if (last == null || (last.a.F("amount", 1) <= 0 && t >= last.end)) return;
            if (_chains == null) { BuildChains(actor); _tips = new Vector3[_chains.Count]; }
            int top = (int)Math.Floor(Song.Warp(t) * GridHz) + 1, bottom = top - Window - 2, missing = 0;
            for (int g = bottom; g <= top; g++) if (!_grid.ContainsKey(g)) missing++;
            if (missing == 0) return;
            double keepStamp = _stamp;
            History++; _lite = true;
            try
            {
                for (int g = bottom; g <= top; g++)
                {
                    if (_grid.ContainsKey(g)) continue;
                    Run(Song.Unwarp(Math.Max(g, 0) / GridHz), actor);
                    _grid[g] = (Vector3[])_tips.Clone();
                }
            }
            finally { _lite = false; History--; _stamp = keepStamp; }
            Flush(t);
        }

        static void Flush(double t)
        {
            if (History > 0 || Dirty.Count == 0) return;
            var list = new List<MotionDriver>(Dirty); Dirty.Clear();
            foreach (var d in list) { d._stamp = double.NaN; if (d._actor != null) d.Apply(t, d._actor); }
        }

        Vector3 Acc(int chain, int h)
        {
            if (!_grid.TryGetValue(h - 1, out var a) || !_grid.TryGetValue(h, out var b) || !_grid.TryGetValue(h + 1, out var c)) return default;
            Vector3 d0 = b[chain] - a[chain], d1 = c[chain] - b[chain];
            const float jump = .55f;
            if (d0.sqrMagnitude > jump * jump || d1.sqrMagnitude > jump * jump) return default; // a cut or a teleport, not motion
            return Vector3.ClampMagnitude((d1 - d0) * (GridHz * GridHz), 80);
        }

        Vector3[] Offsets(int g)
        {
            if (_xs.TryGetValue(g, out var x)) return x;
            x = new Vector3[_chains.Count];
            for (int c = 0; c < x.Length; c++)
            {
                var k = _chains[c].g;
                for (int i = 1; i <= Window; i++) x[c] -= Acc(c, g - i) * k[i];
            }
            return _xs[g] = x;
        }

        void ApplyOverlap(MVActor actor)
        {
            if (History > 0 || _chains == null || _ovlAll == 0) return;
            double s = _tw * GridHz; int g = (int)Math.Floor(s); float f = (float)(s - g);
            Vector3[] a = Offsets(g), b = Offsets(g + 1);
            for (int c = 0; c < _chains.Count; c++)
            {
                var ch = _chains[c]; float amt = _ovlAll * _ovl[ch.group] * ch.gain; if (amt == 0) continue;
                var dir = TipOf(ch) - ch.bone.position; float L = dir.magnitude; if (L < 1e-4f) continue;
                var x = Vector3.ClampMagnitude(Vector3.LerpUnclamped(a[c], b[c], f) * amt, L * .7f);
                ch.bone.rotation = Quaternion.FromToRotation(dir, (dir + x).normalized * L) * ch.bone.rotation;
            }
        }

        // ---- contact ----

        readonly Dictionary<string, (Vector3 p, Quaternion q)> _contact = new Dictionary<string, (Vector3, Quaternion)>();

        /// <summary>Where a locked limb must be now. `to` is a moving actor or bone: the limb keeps the place on it that it had when the lock began (or `offset`).</summary>
        bool ContactGoal(MVActor actor, string key, Op op, Transform end, out Vector3 goal, out Quaternion rot, out bool hasRot)
        {
            var a = op.a; goal = end.position; rot = end.rotation; hasRot = false;
            if (a.Vec.TryGetValue("pos", out var wp)) { goal = wp; return true; }
            if (a.Vec.TryGetValue("to", out var tv)) { goal = tv; return true; }
            var spec = a.S("to");
            bool have = _contact.TryGetValue(op.index + key, out var c);
            if (spec != null)
            {
                var tr = MVActor.Point(spec, _t, !spec.StartsWith(actor.name + ".")); if (!tr) return false;
                if (a.Vec.TryGetValue("offset", out var off)) goal = tr.position + tr.rotation * off;
                else if (have) goal = tr.position + tr.rotation * c.p;
                else return false;
                if (have && a.F("lockRot", 1) > 0) { rot = tr.rotation * c.q; hasRot = true; }
                return true;
            }
            if (have) { goal = c.p; return true; }
            return false;
        }

        /// <summary>Records each limb's place when each lock begins, on the thing it locks to. The body is posed at that moment, so it never depends on play order.</summary>
        void RecordContact(MVActor actor, Op op, string key)
        {
            Limb(key, out _, out _, out var end);
            var e = actor.human[(int)end]; if (!e) return;
            var spec = op.a.S("to");
            if (spec != null)
            {
                var tr = MVActor.Point(spec, op.start, !spec.StartsWith(actor.name + ".")); if (!tr) return;
                _contact[op.index + key] = (Quaternion.Inverse(tr.rotation) * (e.position - tr.position), Quaternion.Inverse(tr.rotation) * e.rotation);
            }
            else _contact[op.index + key] = (e.position, e.rotation);
        }

        /// <summary>A locked hand the arm can't reach drags the body after it: the spine bends a little, the hips make up the rest.</summary>
        void ContactBody(MVActor actor)
        {
            var hips = actor.human[(int)HumanBodyBones.Hips]; if (!hips) return;
            for (int pass = 0; pass < 2; pass++)
            {
                Vector3 shift = default; int n = 0;
                foreach (var kv in _plant)
                {
                    var tw = kv.Value; if (tw.w <= .001f) continue;
                    float follow = tw.to.a.F("follow", kv.Key.StartsWith("hand") ? 1 : 0); if (follow <= 0) continue;
                    Limb(kv.Key, out var up, out var mid, out var end);
                    Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) continue;
                    if (!ContactGoal(actor, kv.Key, tw.to, h, out var goal, out _, out _)) continue;
                    float reach = ((l.position - u.position).magnitude + (h.position - l.position).magnitude) * .97f;
                    var d = goal - u.position; float ex = d.magnitude - reach;
                    if (ex > 0) { shift += d.normalized * (ex * follow * tw.w); n++; }
                }
                if (n == 0) return;
                shift /= n;
                var spine = actor.human[(int)HumanBodyBones.Spine]; var neck = actor.human[(int)HumanBodyBones.Neck];
                if (pass == 0 && spine && neck)
                {
                    var v = neck.position - spine.position;
                    spine.rotation = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(v, v + shift), .6f) * spine.rotation;
                }
                else hips.position += shift;
            }
        }
    }
}
