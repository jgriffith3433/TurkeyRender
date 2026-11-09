using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// The alive layer (roadmap item 3): what a body does when nobody is acting it. `{"do":"alive","on":"person","at":..,"for":..,"rate":13,
    /// "breath":1,"sway":1,"head":1,"shift":0,"level":0,"seed":3,"in":0.25,"out":0.25}`, written by `tools/alive.mjs` (acts/62-alive.json), never by hand.
    /// It runs on a native body after Unity's Animator, first in the MVLate pass (before gaze, eyes, reach and grips, so a reach still lands and a gaze
    /// still finds its target), and only ADDS small rotations to the pose the clip wrote:
    ///   breath  0-1.5: chest and spine extend about 1.7 deg and the shoulders rise about 2 deg on the inhale (inhale 38% of the cycle, exhale 47%, a rest),
    ///           the neck and head take the extension back so the eyes stay where they were, the upper arms take most of the shoulder rise back so the
    ///           hands stay on what they hold; `rate` breaths a minute.
    ///   sway    0-1: seated or standing upper-body drift, about 0.8 deg roll and 1 deg yaw spread down the spine on slow incommensurate waves; neck and
    ///           head counter 70% of it (the eyes hold their target, as a real head does).
    ///   head    0-1: head and neck micro-motion, about 1.1 deg yaw, 0.7 pitch, 0.5 roll. `level` 1 keeps only the yaw (zero-g: head level).
    ///   shift   0-1: standing weight shift, the hips 1.5 cm side to side and rolled 1.2 deg, feet held where the clip has them by two-bone IK.
    /// Overlapping cues add, each weighted by its own `in`/`out` fade, so a generator crossfades two settings by overlapping them. Everything reads the
    /// driver's warped scene time (`_tw`): a hitstop or freeze holds the breath with the clip, slow motion slows it, and any frame is a pure function of
    /// its time (scrub and reverse work). A driver with no alive cue costs one null test a frame.
    /// </summary>
    public partial class MotionDriver
    {
        bool _alInit; List<Op> _alOps;

        static float AlSmooth(float x) { x = Mathf.Clamp01(x); return x * x * (3 - 2 * x); }
        // 0 exhaled .. 1 full
        static float AlBreath(double ph) { float p = (float)(ph - Math.Floor(ph)); return p < .38f ? AlSmooth(p / .38f) : p < .85f ? 1 - AlSmooth((p - .38f) / .47f) : 0; }
        // -1..1, three incommensurate sines: smooth, never repeats within a shot
        static float AlNoise(double t, float s, float f1, float f2, float f3) =>
            (float)((Math.Sin(t * f1 * 6.28318 + s) + .6 * Math.Sin(t * f2 * 6.28318 + s * 1.7 + 1.3) + .35 * Math.Sin(t * f3 * 6.28318 + s * 2.9 + 4.1)) / 1.95);
        static void AlRot(Transform b, Vector3 axis, float deg) { if (b && Mathf.Abs(deg) > 1e-5f) b.rotation = Quaternion.AngleAxis(deg, axis) * b.rotation; }

        void ApplyAlive(MVActor actor)
        {
            if (!_alInit) { _alInit = true; foreach (var op in Ops) if (op.kind == "alive") (_alOps ?? (_alOps = new List<Op>())).Add(op); }
            if (_alOps == null || actor.human.Length == 0) return;
            double t = _tw;
            float breath = 0, roll = 0, yaw = 0, hY = 0, hP = 0, hR = 0, shift = 0;
            foreach (var op in _alOps)
            {
                if (_t < op.start) continue;
                double tl = t - op.ws, dur = op.WDur; if (tl < 0 || tl > dur) continue;
                var a = op.a;
                float fin = Mathf.Min(a.F("in"), (float)dur * .5f), fout = Mathf.Min(a.F("out"), (float)dur * .5f), w = 1;
                if (fin > 1e-4f && tl < fin) w *= AlSmooth((float)(tl / fin));
                if (fout > 1e-4f && tl > dur - fout) w *= AlSmooth((float)((dur - tl) / fout));
                if (w <= 0) continue;
                float s = a.F("seed");
                breath += w * a.F("breath", 1) * AlBreath(t * a.F("rate", 13) / 60.0 + s * .618);
                float sw = w * a.F("sway");
                if (sw != 0) { roll += sw * AlNoise(t, s + 3, .11f, .071f, .23f); yaw += sw * AlNoise(t, s + 7, .089f, .15f, .047f); }
                float hd = w * a.F("head"), lv = Mathf.Clamp01(a.F("level"));
                if (hd != 0) { hY += hd * AlNoise(t, s + 11, .17f, .31f, .53f); hP += hd * (1 - lv) * AlNoise(t, s + 17, .21f, .37f, .61f); hR += hd * (1 - lv) * AlNoise(t, s + 23, .13f, .29f, .47f); }
                shift += w * a.F("shift") * AlNoise(t, s + 29, .12f, .053f, .19f);
            }
            if (breath == 0 && roll == 0 && yaw == 0 && hY == 0 && hP == 0 && hR == 0 && shift == 0) return;

            Transform B(HumanBodyBones b) => actor.human[(int)b];
            Transform hips = B(HumanBodyBones.Hips), spine = B(HumanBodyBones.Spine), chest = B(HumanBodyBones.Chest), upper = B(HumanBodyBones.UpperChest),
                neck = B(HumanBodyBones.Neck), head = B(HumanBodyBones.Head), ls = B(HumanBodyBones.LeftShoulder), rs = B(HumanBodyBones.RightShoulder),
                la = B(HumanBodyBones.LeftUpperArm), ra = B(HumanBodyBones.RightUpperArm);
            if (!hips || !spine || !head) return;
            // the body's own axes from the pose the clip wrote (a floating body is tilted; the actor's transform is not)
            Vector3 right = la && ra ? (ra.position - la.position).normalized : actor.transform.right;
            Vector3 up = ((neck ? neck.position : head.position) - hips.position).normalized;
            right = (right - Vector3.Dot(right, up) * up).normalized; if (right.sqrMagnitude < .5f) right = actor.transform.right;
            Vector3 fwd = Vector3.Cross(right, up);

            if (Mathf.Abs(shift) > 1e-5f) AlShift(actor, hips, spine, chest, right, fwd, shift);

            // breath: + about `right` tips forward, so the inhale is negative on the spine
            float sp = -.35f * breath, ch = -.8f * breath, uc = (upper ? -.55f : 0) * breath, lift = 2f * breath;
            float sr = .4f * roll, cr = .35f * roll, ur = .25f * roll, sy = .4f * yaw, cy = .35f * yaw, uy = .25f * yaw;
            const float ROLL = .8f, YAW = 1f;
            AlRot(spine, right, sp); AlRot(spine, fwd, sr * ROLL); AlRot(spine, up, sy * YAW);
            AlRot(chest, right, ch); AlRot(chest, fwd, cr * ROLL); AlRot(chest, up, cy * YAW);
            AlRot(upper, right, uc); AlRot(upper, fwd, ur * ROLL); AlRot(upper, up, uy * YAW);
            // shoulders: + about fwd turns +right toward up, so the right shoulder lifts with +, the left with -; the upper arms take 70% back
            AlRot(rs, fwd, lift); AlRot(ls, fwd, -lift);
            AlRot(ra, fwd, -lift * .7f); AlRot(la, fwd, lift * .7f);
            // neck and head: give back the spine's pitch and 70% of the sway, then the micro-motion on top
            float back = -(sp + ch + uc), cRoll = -(sr + cr + ur) * ROLL * .7f, cYaw = -(sy + cy + uy) * YAW * .7f;
            AlRot(neck, right, back * .65f + hP * .7f * .35f); AlRot(neck, fwd, cRoll * .4f + hR * .5f * .35f); AlRot(neck, up, cYaw * .4f + hY * 1.1f * .35f);
            AlRot(head, right, back * (neck ? .35f : 1) + hP * .7f * .65f); AlRot(head, fwd, cRoll * (neck ? .6f : 1) + hR * .5f * .65f); AlRot(head, up, cYaw * (neck ? .6f : 1) + hY * 1.1f * .65f);
        }

        // standing weight shift: hips aside and rolled, the spine takes the roll back, the feet stay where the clip put them
        void AlShift(MVActor actor, Transform hips, Transform spine, Transform chest, Vector3 right, Vector3 fwd, float s)
        {
            Transform lu = actor.human[(int)HumanBodyBones.LeftUpperLeg], ll = actor.human[(int)HumanBodyBones.LeftLowerLeg], lf = actor.human[(int)HumanBodyBones.LeftFoot];
            Transform ru = actor.human[(int)HumanBodyBones.RightUpperLeg], rl = actor.human[(int)HumanBodyBones.RightLowerLeg], rf = actor.human[(int)HumanBodyBones.RightFoot];
            if (!lu || !ll || !lf || !ru || !rl || !rf) return;
            Vector3 lp = lf.position, rp = rf.position; Quaternion lr = lf.rotation, rr = rf.rotation;
            hips.position += right * (.015f * s);
            float r = 1.2f * s;
            AlRot(hips, fwd, -r); AlRot(spine, fwd, r * .6f); AlRot(chest, fwd, r * .4f);
            TwoBone(lu, ll, lf, lp, null, Bias(actor, "footleft")); lf.rotation = lr;
            TwoBone(ru, rl, rf, rp, null, Bias(actor, "footright")); rf.rotation = rr;
        }
    }
}
