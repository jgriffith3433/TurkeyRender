using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Acting on a native actor (Unity's Animator plays its clips from Timeline). Unity writes the pose before our tracks run in the same
    /// evaluation (measured: `call evalorder`), so these go on top of the finished clip in the same frame, as pure functions of time:
    /// `reach` (two-bone, blended by joint rotation, the elbow held in the plane the clip has it bending in), `gaze` (neck and head only,
    /// clamped and eased, fading out when the target is behind him; the eyes lead), `eyes`, and grips from `fingers` (only the fingers a cue asks for;
    /// no rest curl, the clip's hands stay the clip's). No ground, limits, stance, overlap, keys or pose: on a native actor acting comes from clips.
    /// </summary>
    public partial class MotionDriver
    {
        void NativeActing(MVActor actor)
        {
            ApplyAlive(actor);   // breath, sway, weight shift, head micro-motion under everything else (MVAlive.cs; only drivers with an alive cue)
            if (_gaze != null && _gaze.w > .001f) GazeNative(actor);
            if (_eyeYaw != 0 || _eyePitch != 0) ApplyEyes(actor);
            foreach (var kv in _reach) if (kv.Value.w > .001f) ReachNative(actor, kv.Key, kv.Value);
            GripsNative(actor);
            ApplyLimbScale(actor);   // impact-frame bone scale, only on drivers with a limbscale cue (MVLimbScale.cs)
        }

        void ReachNative(MVActor actor, string key, Tween tw)
        {
            Limb(key, out var up, out var mid, out var end);
            Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) return;
            var keep = h.rotation;
            Vector3 g0 = TargetPos(tw.from, actor, h.position), g1 = TargetPos(tw.to, actor, h.position), sp = u.position;
            var goal = sp + Vector3.SlerpUnclamped(g0 - sp, g1 - sp, tw.k);
            // The pole is where the clip has the elbow (knee) now, so the solved joint stays in the clip's hinge plane; a straight limb takes the anatomical nudge.
            var bend = l.position - (u.position + h.position) * .5f;
            Vector3 hint = tw.to.a.Vec.TryGetValue("hint", out var hv) ? hv : bend.sqrMagnitude > 1e-4f ? l.position + bend : l.position + Bias(actor, key) * 4;
            BlendTwoBone(u, l, h, goal, hint, Vector3.zero, tw.w, key.StartsWith("hand") ? tw.w2 : -1);
            if (tw.to.a.Vec.TryGetValue("handRot", out var hr)) h.rotation = Quaternion.Slerp(keep, (tw.to.a.F("worldRot") > 0 ? Quaternion.identity : actor.transform.rotation) * Quaternion.Euler(hr) * actor.humanRest[(int)end], tw.w);
            else if (tw.to.a.F("freeWrist", 1) <= 0) h.rotation = keep;
        }

        void GazeNative(MVActor actor)
        {
            var head = actor.human[(int)HumanBodyBones.Head]; var neck = actor.human[(int)HumanBodyBones.Neck]; if (!head) return;
            var fb = head.position + Forward(actor, HumanBodyBones.Head);
            Vector3 p0 = TargetPos(_gaze.from, actor, fb), p1 = TargetPos(_gaze.to, actor, fb);
            var tgt = Vector3.Lerp(p0, p1, _gaze.k);
            float max = _gaze.to.a.F("limit", 60), lead = _gaze.to.a.F("lead", 2.6f);
            float body = Mathf.Lerp(_gaze.from != null ? _gaze.from.a.F("head", 1) : _gaze.to.a.F("head", 1), _gaze.to.a.F("head", 1), _gaze.k);
            float w = _gaze.w * (1 - Rise(95, 150, Vector3.Angle(Forward(actor, HumanBodyBones.Head), tgt - head.position)));   // behind him: let it go rather than wrench round
            if (body > 0 && w > .001f)
            {
                Quaternion Turn(float limit) => Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, HumanBodyBones.Head), (tgt - head.position).normalized), limit);
                if (neck) neck.rotation = Quaternion.Slerp(Quaternion.identity, Turn(max * .4f), .4f * w * body) * neck.rotation;
                head.rotation = Quaternion.Slerp(Quaternion.identity, Turn(max * .75f), w * body) * head.rotation;   // the head takes what is left, inside its own share
            }
            var eyes = Vector3.Lerp(p0, p1, Mathf.Clamp01(_gaze.k * lead)); float we = Mathf.Clamp01(_gaze.w * lead);
            foreach (var eb in new[] { HumanBodyBones.LeftEye, HumanBodyBones.RightEye })
            {
                var e = actor.human[(int)eb]; if (!e) continue;
                var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, eb), (eyes - e.position).normalized), 28);
                e.rotation = Quaternion.Slerp(Quaternion.identity, rot, we) * e.rotation;
            }
        }

        void GripsNative(MVActor actor)
        {
            if (!_anyCurl || actor.curlAxis.Length == 0) return;
            for (int f = 0; f < 10; f++)
            {
                float setW = _handW[f], curl = _curl[f]; if (setW <= 0 && curl == 0) continue;
                bool thumb = f % 5 == 0; float setCurl = _handSet[f] * SetFan[f % 5];
                int first = (int)HumanBodyBones.LeftThumbProximal + (f < 5 ? 0 : 15) + (f % 5) * 3;
                for (int j = 0; j < 3; j++)
                {
                    var b = actor.human[first + j]; if (!b) continue;
                    float span = thumb ? (j == 0 ? 15f : j == 1 ? 35f : 40f) : (j == 0 ? 60f : j == 1 ? 95f : 60f);
                    var q = b.localRotation * Quaternion.AngleAxis(span * curl, actor.curlAxis[first + j]);
                    if (setW > 0)
                    {
                        var abs = RestLocal(actor, first + j, j == 0, f < 5) * Quaternion.AngleAxis(span * setCurl, actor.curlAxis[first + j]);
                        if (thumb && j == 0 && b.childCount > 0)
                        {
                            var palm = Vector3.Cross(actor.curlAxis[first], actor.human[first + 1] ? actor.human[first + 1].localPosition.normalized : Vector3.up);
                            abs *= Quaternion.AngleAxis((f < 5 ? 1 : -1) * 38f, palm.normalized);
                        }
                        q = Quaternion.Slerp(q, abs, setW);
                    }
                    b.localRotation = q;
                }
            }
        }
    }
}
