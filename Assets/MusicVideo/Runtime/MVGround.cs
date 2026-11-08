using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// A human stands on the floor, whatever the clip says. Runs on the finished pose after clips, stance and overlap and before contacts and joint limits,
    /// from nothing but that pose, so it is a function of time: no state from the last frame.
    /// The lower foot decides the hips (up if the clip sinks him, down if he hovers). A foot near the floor is eased to it and flat, ankle and toes, with leg IK
    /// keeping the knee; a foot clearly lifted stays as the clip has it, blended by height so nothing pops.
    /// `{"do":"ground","on":"person","amount":0,"for":"0.2s"}` turns it off. Also `floor` (world height, until his next mark), `sink`, `width`.
    /// Off by itself in a ragdoll, in `stretch`, while attached, in sits, kneels and lying down (hips not over the feet, or a knee near the floor).
    /// </summary>
    public partial class MotionDriver
    {
        const float GroundSink = .045f, GroundWidth = .18f;
        float _gAmt = 1, _gFloor, _gCue, _gCueK, _gRagW = 1, _gSink = GroundSink, _gWidth = GroundWidth;
        bool _gStretch, _gAttached; Vector3 _gSlope;
        float _gAnkle = -1, _gBall;   // sole to ankle and to the tip of the foot at rest, in foot lengths
        public bool NoGround;
        public string GroundInfo = "";

        void BeginGround(MVActor actor)
        {
            _gAmt = 1; _gFloor = actor.basePos.y; _gCueK = 0; _gRagW = 1; _gSlope = default; _gStretch = _gAttached = false; _gSink = GroundSink; _gWidth = GroundWidth;
        }

        /// <summary>The floor under him is where his last mark put him. A `jump`, `hop`, root motion or `keys` root leaves the floor where it was, so he leaves it.</summary>
        void FoldGround(Op op, double tl, float rootY)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "ground":
                    {
                        float k = Ease.Apply(a.S("ease"), (float)(tl / op.WDur));
                        if (a.Has("amount")) _gAmt = Mathf.Lerp(_gAmt, a.F("amount", 1), k);
                        if (a.Has("sink")) _gSink = Mathf.Lerp(_gSink, a.F("sink"), k);
                        if (a.Has("width")) _gWidth = Mathf.Lerp(_gWidth, a.F("width"), k);
                        if (a.Has("floor")) { _gCue = Mathf.Lerp(_gCueK > 0 ? _gCue : _gFloor, a.F("floor"), k); _gCueK = 1; }
                        break;
                    }
                case "set": if (a.Has("pos")) { _gFloor = rootY; _gCueK = 0; } break;
                case "move": case "walk": case "rootwalk": _gFloor = rootY; _gCueK = 0; break;
                case "anim":
                    if (a.F("stay") > 0) _gRagW = 1 - Mathf.Clamp01((float)tl / .12f);   // a ragdoll
                    else { float b = Mathf.Max(a.F("blend", .2f), .05f); _gRagW = Mathf.Lerp(_gRagW, 1, Mathf.Clamp01((float)tl / b)); }
                    break;
                case "stretch": _gStretch = a.F("amount", 1) > 0; break;
                case "fly": case "swing": case "throwobj": _gAmt = Mathf.Lerp(_gAmt, 0, Mathf.Clamp01((float)tl / .15f)); break; // in the air
                case "attach": _gAttached = true; break;
                case "detach": _gAttached = false; break;
            }
        }

        /// <summary>On a walk that climbs, the floor under each foot follows the walk's slope.</summary>
        void GroundWalk(Op op, double tl, Vector3 from, Vector3 now)
        {
            var d = now - from; float dy = d.y; d.y = 0;
            float m = d.sqrMagnitude, edge = Mathf.Clamp01(Mathf.Min((float)tl, (float)(op.WDur - tl)) / .15f);
            _gSlope = m > 1e-4f && Mathf.Abs(dy) > 1e-4f ? d * (dy / m * edge) : default;
        }

        static float Rise(float a, float b, float x) { x = Mathf.Clamp01((x - a) / (b - a)); return x * x * (3 - 2 * x); }

        /// <summary>The same bone with the pitch and roll taken out, keeping its heading, measured against the rig's rest pose.</summary>
        static Quaternion Flat(Quaternion q, Quaternion rest) => Quaternion.FromToRotation(q * Quaternion.Inverse(rest) * Vector3.up, Vector3.up) * q;

        // On our rig the Toes bone is the tip of the foot: a stiff foot, ankle to tip, with the tip a hair off the floor when flat. So the rest pose gives the rest:
        // sole to ankle is the drop from ankle to tip at rest, plus that hair. Per unit of foot length, so it holds at any scale. The rest pose's foot is the flat foot.
        const float TipLift = .04f;
        public static float AnkleRatio(MVActor actor, bool left = true)
        {
            Transform f = actor.human[(int)(left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot)], t = actor.human[(int)(left ? HumanBodyBones.LeftToes : HumanBodyBones.RightToes)];
            if (!f || !t) return .635f;
            var rest = actor.humanRest[(int)(left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot)];
            var d = (rest * (Quaternion.Inverse(f.rotation) * (t.position - f.position))).normalized;
            return Mathf.Clamp(-d.y, .2f, .9f) + TipLift;
        }

        void ApplyGround(MVActor actor)
        {
            _gSeated = 0;
            float amt = NoGround || _gStretch || _gAttached ? 0 : Mathf.Clamp01(_gAmt * _gRagW);
            if (amt <= .001f || actor.humanRest.Length == 0) return;
            Transform B(HumanBodyBones x) => actor.human[(int)x];
            Transform hips = B(HumanBodyBones.Hips), lu = B(HumanBodyBones.LeftUpperLeg), ll = B(HumanBodyBones.LeftLowerLeg), lf = B(HumanBodyBones.LeftFoot), lt = B(HumanBodyBones.LeftToes);
            Transform ru = B(HumanBodyBones.RightUpperLeg), rl = B(HumanBodyBones.RightLowerLeg), rf = B(HumanBodyBones.RightFoot), rt = B(HumanBodyBones.RightToes);
            if (!hips || !lu || !ll || !lf || !lt || !ru || !rl || !rf || !rt) return;
            if (_gAnkle < 0) { _gAnkle = AnkleRatio(actor); _gBall = TipLift; GroundInfo = "ankle " + _gAnkle.ToString("0.000") + " x foot length"; }

            Vector3 lp = lf.position, rp = rf.position, hp = hips.position, at = actor.transform.position;
            float s = Mathf.Abs(actor.transform.lossyScale.y), len = (lt.position - lp).magnitude, ankle = _gAnkle * len, ball = _gBall * len;
            float floor = _gCueK > 0 ? _gCue : _gFloor;
            if (actor.transform.parent) floor = actor.transform.parent.TransformPoint(0, floor, 0).y;
            float fl = floor + Vector3.Dot(_gSlope, lp - at), fr = floor + Vector3.Dot(_gSlope, rp - at);

            // Hips not over the feet, or a knee down: he is sitting, kneeling or lying, and the floor is not under his feet alone.
            var mid = (lp + rp) * .5f; float hz = new Vector2(hp.x - mid.x, hp.z - mid.z).magnitude, vt = Mathf.Max(hp.y - mid.y, .01f * s);
            float gate = amt * (1 - Rise(.55f, .95f, hz / vt)) * Rise(.17f, .27f, Mathf.Min(ll.position.y - fl, rl.position.y - fr) / s);
            if (gate <= .001f) return;

            float eL = lp.y - fl - ankle, eR = rp.y - fr - ankle, low = Mathf.Min(eL, eR);
            // Both feet well off the floor: he left it on purpose. Far under it: the stored floor isn't his (he was dropped, or carried).
            float keep = (1 - Rise(.08f, .24f, low / s)) * (1 - Rise(.22f, .34f, -low / s));
            float dy = -(low + _gSink * s) * keep * gate;
            if (MeasureLimits) { LimitWorst.TryGetValue("groundHipsCm", out var w); if (Mathf.Abs(dy) * 100 > w) LimitWorst["groundHipsCm"] = Mathf.Abs(dy) * 100; }
            hips.position = hp + Vector3.up * dy;
            eL += dy; eR += dy;

            // Natural width: ankles at least this far apart across his hips while both are down. Crossing is how the clip steps; held on the floor it reads as tiptoe.
            float dL = 1 - Rise(.03f, .1f, eL / s), dR = 1 - Rise(.03f, .1f, eR / s);
            var side = ru.position - lu.position; side.y = 0; side = side.sqrMagnitude > 1e-6f ? side.normalized : actor.transform.right;
            float sep = Vector3.Dot(rp - lp, side), push = Mathf.Max(0, _gWidth * s - sep) * .5f * dL * dR * gate;
            lp += Vector3.up * dy; rp += Vector3.up * dy;
            GroundLeg(actor, 0, lu, ll, lf, lt, lp - side * push, fl, eL, ankle, ball, s, gate, "footleft", HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes);
            GroundLeg(actor, 1, ru, rl, rf, rt, rp + side * push, fr, eR, ankle, ball, s, gate, "footright", HumanBodyBones.RightFoot, HumanBodyBones.RightToes);
        }

        // Joint limits run after this and can push a foot back through the floor, so the legs are seated once more on what the limits left. A foot in a `plant` or `reach` is theirs.
        readonly (Transform u, Transform l, Transform f, Vector3 aim, Quaternion rot, Vector3 bias, string key)[] _gSeat = new (Transform, Transform, Transform, Vector3, Quaternion, Vector3, string)[2];
        int _gSeated;
        void ReseatGround()
        {
            for (int i = 0; i < _gSeated; i++)
            {
                var g = _gSeat[i];
                if ((_plant.TryGetValue(g.key, out var p) && p.w > .001f) || (_reach.TryGetValue(g.key, out var q) && q.w > .001f)) continue;
                if ((g.f.position - g.aim).sqrMagnitude > 1e-6f) TwoBone(g.u, g.l, g.f, g.aim, null, g.bias);
                g.f.rotation = g.rot;
            }
        }

        // A clip's quick step can skim the floor, and flat on it that is a skate. How fast each foot travels is read from the score: where the body would have
        // the feet on a fixed grid of scene time, kept per grid line, so it needs nothing from the last frame and only one extra body a frame while playing.
        // The foot travelling faster lifts with its speed, so a skim becomes a step and it lands where the clip lands. Same grid as overlap, so a cut is one fast line at most.
        const float FootHz = 30;
        readonly Dictionary<int, (Vector3 l, Vector3 r)> _gFeet = new Dictionary<int, (Vector3, Vector3)>();
        Vector3 _gRecL, _gRecR; float _gVL, _gVR;

        void RecordFeet(MVActor actor)
        {
            var a = actor.human[(int)HumanBodyBones.LeftFoot]; var b = actor.human[(int)HumanBodyBones.RightFoot];
            if (a && b) { _gRecL = a.position; _gRecR = b.position; }
        }

        (Vector3 l, Vector3 r) FeetAt(int g, MVActor actor)
        {
            if (_gFeet.TryGetValue(g, out var f)) return f;
            Run(Song.Unwarp(Math.Max(g, 0) / FootHz), actor);
            return _gFeet[g] = (_gRecL, _gRecR);
        }

        static float Flat2(Vector3 a, Vector3 b) { a -= b; a.y = 0; return a.magnitude; }

        void PrepareGround(double t, MVActor actor)
        {
            _gVL = _gVR = 0;
            if (History > 0 || NoGround || actor.human.Length == 0 || actor.humanRest.Length == 0) return;
            double w = Song.Warp(t) * FootHz; int g = (int)Math.Floor(w); float x = (float)(w - g);
            double keep = _stamp;
            History++; _lite = true;
            try
            {
                var a = FeetAt(g - 1, actor); var b = FeetAt(g, actor); var c = FeetAt(g + 1, actor);
                float Fast(float v) => v > 12 ? 0 : v;   // a cut or a teleport is not a step
                _gVL = Mathf.Lerp(Fast(Flat2(b.l, a.l) * FootHz), Fast(Flat2(c.l, b.l) * FootHz), x);
                _gVR = Mathf.Lerp(Fast(Flat2(b.r, a.r) * FootHz), Fast(Flat2(c.r, b.r) * FootHz), x);
            }
            finally { _lite = false; History--; _stamp = keep; }
            Flush(t);
        }

        float StepLift(float v, float other, float s)
        {
            if (History > 0) return 0;
            v /= s; other /= s;
            return s * .06f * Rise(.7f, 1.8f, v) * Rise(.7f, 1.1f, v / Mathf.Max(other, .01f));
        }

        void GroundLeg(MVActor actor, int slot, Transform u, Transform l, Transform f, Transform t, Vector3 aim, float floor, float e, float ankle, float ball, float s, float gate, string key, HumanBodyBones footBone, HumanBodyBones toeBone)
        {
            var keep = f.rotation; var toLocal = Quaternion.Inverse(keep) * (t.position - f.position);
            float hold = e <= 0 ? 0 : e * Rise(.004f, .03f, e / s);                  // how far a foot above the floor stays up. Near it, none: it meets the floor. Under it: on it.
            hold = Mathf.Max(hold, slot == 0 ? StepLift(_gVL, _gVR, s) : StepLift(_gVR, _gVL, s));
            aim.y = floor + ankle + Mathf.Lerp(e, hold, gate);
            TwoBone(u, l, f, aim, null, Bias(actor, key));

            var flat = Flat(keep, actor.humanRest[(int)footBone]);
            float w = (1 - Rise(.03f, .12f, e / s)) * gate;
            var a = f.position; float now = (a + keep * toLocal).y, lie = (a + flat * toLocal).y, need = floor + ball;
            if (now < need && lie > now + 1e-4f) w = Mathf.Max(w, Mathf.Clamp01((need - now) / (lie - now)) * gate);   // a lifted foot pointing down never goes through the floor
            f.rotation = Quaternion.Slerp(keep, flat, w);
            _gSeat[slot] = (u, l, f, aim, f.rotation, Bias(actor, key), key); _gSeated = slot + 1;

            float over = t.position.y - need, tw = (1 - Rise(.02f, .09f, over / s)) * gate;
            if (tw > .001f) t.rotation = Quaternion.Slerp(t.rotation, Flat(t.rotation, actor.humanRest[(int)toeBone]), tw);
        }
    }
}
