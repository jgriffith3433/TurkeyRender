using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// The last thing that happens to a human body: every joint eased back inside what a person can do, measured from his rest pose in his own
    /// frame, whatever each bone's axes are. A soft stop, so a limb slows into it instead of hitting it. Runs on the finished pose, so it is a function of time.
    /// </summary>
    public partial class MotionDriver
    {
        class Joint { public Transform b, p; public Quaternion rest, restRel; public Vector3 h, t, d; public float hLo, hHi, tLo, tHi, twist; }
        List<Joint> _joints; float _lim; bool _limOff; float _limCue;
        public readonly Dictionary<string, float> LimitWorst = new Dictionary<string, float>();
        public bool MeasureLimits;

        void BeginLimits() { _lim = 1; _limOff = false; _limCue = 1; }

        void FoldLimits(Op op, double tl)
        {
            if (op.kind == "limits") _lim = Mathf.LerpUnclamped(_lim, op.a.F("amount", 1), Ease.Apply(op.a.S("ease"), (float)(tl / op.WDur)));
            else if (op.kind == "stretch") _limOff = op.a.F("amount", 1) > 0;
            else if (op.a.Num.TryGetValue("limits", out var v) && v <= 0)
            {
                // "limits":0 on any cue: off while it runs, with a short ease at each end so nothing snaps.
                const float fade = .15f;
                float x = Mathf.Min((float)tl / fade, (float)(op.WDur + fade - tl) / fade);
                _limCue = Mathf.Min(_limCue, 1 - Mathf.Clamp01(x));
            }
        }

        static float Soft(float c, float lo, float hi)
        {
            float m = Mathf.Min(.21f, (hi - lo) * .25f);
            if (c > hi - m) return hi - m + m * (1 - Mathf.Exp(-(c - (hi - m)) / m));
            if (c < lo + m) return lo + m - m * (1 - Mathf.Exp(((lo + m) - c) / -m));
            return c;
        }

        void AddJoint(MVActor actor, HumanBodyBones bone, Transform tip, float hLo, float hHi, float tLo, float tHi, float twist)
        {
            var b = actor.human[(int)bone]; if (!b) return;
            Transform par = b.parent; int pi = -1;
            for (; par != null; par = par.parent) { pi = System.Array.IndexOf(actor.human, par); if (pi >= 0) break; }
            if (pi < 0) return;
            var restB = actor.humanRest[(int)bone]; var restP = actor.humanRest[pi];
            var local = tip ? Quaternion.Inverse(b.rotation) * (tip.position - b.position) : Quaternion.Inverse(b.rotation) * (bone == HumanBodyBones.Head ? actor.transform.up : actor.transform.forward);
            var d = (restB * local).normalized;
            var refDir = Mathf.Abs(Vector3.Dot(d, Vector3.forward)) > .8f ? Vector3.up : Vector3.forward;
            var h = Vector3.Cross(d, refDir).normalized; var t = Vector3.Cross(d, h).normalized;
            const float R = Mathf.Deg2Rad;
            _joints.Add(new Joint { b = b, p = par, rest = restB, restRel = Quaternion.Inverse(restP) * restB, d = d, h = h, t = t, hLo = hLo * R, hHi = hHi * R, tLo = tLo * R, tHi = tHi * R, twist = twist * R });
        }

        void BuildJoints(MVActor actor)
        {
            _joints = new List<Joint>();
            Transform B(HumanBodyBones x) => actor.human[(int)x];
            var up1 = B(HumanBodyBones.Chest) ? B(HumanBodyBones.Chest) : B(HumanBodyBones.Neck);
            var up2 = B(HumanBodyBones.UpperChest) ? B(HumanBodyBones.UpperChest) : B(HumanBodyBones.Neck);
            AddJoint(actor, HumanBodyBones.Spine, up1, -35, 45, -30, 30, 35);
            AddJoint(actor, HumanBodyBones.Chest, up2, -25, 35, -25, 25, 30);
            AddJoint(actor, HumanBodyBones.UpperChest, B(HumanBodyBones.Neck), -25, 30, -25, 25, 30);
            AddJoint(actor, HumanBodyBones.Neck, B(HumanBodyBones.Head), -45, 50, -40, 40, 55);
            AddJoint(actor, HumanBodyBones.Head, null, -45, 50, -40, 40, 55);
            foreach (var s in new[] { 0, 1 })
            {
                HumanBodyBones P(HumanBodyBones l, HumanBodyBones r) => s == 0 ? l : r;
                AddJoint(actor, P(HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder), B(P(HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm)), -45, 45, -45, 45, 50);
                AddJoint(actor, P(HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm), B(P(HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm)), -80, 150, -125, 125, 115);
                AddJoint(actor, P(HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm), B(P(HumanBodyBones.LeftHand, HumanBodyBones.RightHand)), -15, 165, -50, 50, 150);
                AddJoint(actor, P(HumanBodyBones.LeftHand, HumanBodyBones.RightHand), B(P(HumanBodyBones.LeftMiddleProximal, HumanBodyBones.RightMiddleProximal)), -100, 100, -100, 100, 90);
                AddJoint(actor, P(HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg), B(P(HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg)), -55, 150, -90, 90, 80);
                AddJoint(actor, P(HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg), B(P(HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot)), -170, 15, -40, 40, 70);
                AddJoint(actor, P(HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot), B(P(HumanBodyBones.LeftToes, HumanBodyBones.RightToes)), -75, 75, -60, 60, 60);
            }
        }

        void ApplyLimits(MVActor actor)
        {
            float w = _limOff ? 0 : Mathf.Clamp01(_lim * _limCue);
            if (w <= 0 || actor.human.Length == 0 || actor.humanRest.Length == 0) return;
            if (_joints == null) BuildJoints(actor);
            foreach (var j in _joints)
            {
                var P = j.p.rotation; var q = Quaternion.Inverse(j.restRel) * (Quaternion.Inverse(P) * j.b.rotation);
                var v = Log(j.rest * q * Quaternion.Inverse(j.rest));
                float ch = Vector3.Dot(v, j.h), ct = Vector3.Dot(v, j.t), cd = Vector3.Dot(v, j.d);
                float nh = Soft(ch, j.hLo, j.hHi), nt = Soft(ct, j.tLo, j.tHi), nd = Soft(cd, -j.twist, j.twist);
                if (nh == ch && nt == ct && nd == cd) continue;
                if (MeasureLimits)
                {
                    float off = Mathf.Max(Mathf.Abs(nh - ch), Mathf.Abs(nt - ct), Mathf.Abs(nd - cd)) * Mathf.Rad2Deg;
                    LimitWorst.TryGetValue(j.b.name, out var cur); if (off > cur) LimitWorst[j.b.name] = off;
                }
                var nv = v + j.h * ((nh - ch) * w) + j.t * ((nt - ct) * w) + j.d * ((nd - cd) * w);
                var nq = Quaternion.Inverse(j.rest) * Exp(nv) * j.rest;
                j.b.rotation = P * j.restRel * nq;
            }
        }

        /// <summary>Elbows point back and out, knees forward: a nudge so small it only decides when the limb is nearly straight and the side would otherwise flip.</summary>
        static Vector3 Bias(MVActor actor, string key)
        {
            var r = actor.transform.rotation;
            if (key.StartsWith("foot")) return r * new Vector3(0, 0, .06f);
            return r * new Vector3(key.EndsWith("left") ? -.03f : .03f, -.03f, -.05f);
        }

        /// <summary>A hand reaching past arm's length: the torso leans toward it, by up to 30 degrees, and the hand stops short of the rest. `"lean":0` to not.</summary>
        void ReachLean(MVActor actor)
        {
            var spine = actor.human[(int)HumanBodyBones.Spine]; var neck = actor.human[(int)HumanBodyBones.Neck]; if (!spine || !neck) return;
            Vector3 shift = default; int n = 0;
            foreach (var kv in _reach)
            {
                var tw = kv.Value; if (tw.w <= .001f || !kv.Key.StartsWith("hand")) continue;
                float lean = tw.to.a.F("lean", 1); if (lean <= 0) continue;
                Limb(kv.Key, out var up, out var mid, out var end);
                Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) continue;
                var goal = Vector3.Lerp(TargetPos(tw.from, actor, h.position), TargetPos(tw.to, actor, h.position), tw.k);
                float reach = ((l.position - u.position).magnitude + (h.position - l.position).magnitude) * .97f;
                var d = goal - u.position; float ex = d.magnitude - reach;
                if (ex > 0) { shift += d.normalized * (ex * lean * tw.w); n++; }
            }
            if (n == 0) return;
            shift /= n;
            var v = neck.position - spine.position;
            var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(v, v + shift), 30);
            spine.rotation = rot * spine.rotation;
        }
    }
}
