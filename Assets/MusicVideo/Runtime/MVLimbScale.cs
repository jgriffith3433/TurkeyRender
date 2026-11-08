using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Impact-frame exaggeration (epic-anime-action.md 4.6, Guilty Gear Xrd's per-shot scale rigs): `{"do":"limbscale","on":"person","bone":"rightHand",
    /// "scale":1.5,"for":"0.25s","in":0.04,"out":0.12}` scales a bone (and so everything under it: a fist, a forearm and its hand) after Unity's Animator has
    /// written the pose, in the MVLate pass on a native body, and last on a legacy body. It ramps up over `in` seconds, holds, and comes back to rest over
    /// `out`, all inside `for`. `bones` takes several: `["rightHand","rightLowerArm"]` at `scale`, or `{"rightHand":1.6,"rightLowerArm":1.2}`. `scale` is a
    /// number or [x,y,z] in the bone's own axes. Stacked cues multiply. Humanoid clips cannot carry bone scale, which is why this is not in posederive.
    /// Off by default: a driver with no limbscale cue never touches a scale (one bool test a frame). A driver with one sets every bone it ever names on
    /// every evaluation (rest is a scale of 1), so it stays a pure function of time and scrubs. A bone's rest scale is taken as 1 (true on his rig).
    /// </summary>
    public partial class MotionDriver
    {
        bool _lsInit; List<Op> _lsOps; readonly List<Transform> _lsBones = new List<Transform>(); readonly List<Vector3> _lsWant = new List<Vector3>();

        void ApplyLimbScale(MVActor actor)
        {
            if (!_lsInit)
            {
                _lsInit = true;
                foreach (var op in Ops) if (op.kind == "limbscale") (_lsOps ?? (_lsOps = new List<Op>())).Add(op);
            }
            if (_lsOps == null) return;
            for (int i = 0; i < _lsWant.Count; i++) _lsWant[i] = Vector3.one;
            foreach (var op in _lsOps)
            {
                var a = op.a;
                // register every bone up front, so a bone scaled at one time is put back at every other
                foreach (var (name, s) in LimbTargets(a))
                {
                    var b = actor.Bone(name); if (!b) continue;
                    int bi = _lsBones.IndexOf(b); if (bi < 0) { _lsBones.Add(b); _lsWant.Add(Vector3.one); bi = _lsBones.Count - 1; }
                    if (_t < op.start) continue;
                    double tl = _tw - op.ws, dur = op.WDur; if (tl < 0 || tl > dur) continue;
                    float tin = Mathf.Min(a.F("in", .04f), (float)dur * .5f), tout = Mathf.Min(a.F("out", .12f), (float)dur - tin);
                    float w = tin > 1e-4f && tl < tin ? Ease.Apply("out", (float)(tl / tin)) : tout > 1e-4f && tl > dur - tout ? 1 - Ease.Apply("inout", (float)((tl - (dur - tout)) / tout)) : 1;
                    _lsWant[bi] = Vector3.Scale(_lsWant[bi], Vector3.LerpUnclamped(Vector3.one, s, w));
                }
            }
            for (int i = 0; i < _lsBones.Count; i++) if (_lsBones[i]) _lsBones[i].localScale = _lsWant[i];
        }

        static IEnumerable<(string, Vector3)> LimbTargets(Args a)
        {
            Vector3 s = a.Vec.TryGetValue("scale", out var v) ? v : Vector3.one * a.F("scale", 1.3f);
            if (a.Str.TryGetValue("bone", out var one)) yield return (one, s);
            if (a.Arr.TryGetValue("bones", out var list)) foreach (var n in list) yield return (n, s);
            if (a.Obj.TryGetValue("bones", out var map)) foreach (var kv in map) yield return (kv.Key, Vector3.one * (float)kv.Value);
        }
    }
}
