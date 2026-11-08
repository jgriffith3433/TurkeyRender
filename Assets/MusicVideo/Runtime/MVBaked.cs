using System;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// A baked take: a performance evaluated through the whole stack and cleaned (Director/tools/bake.mjs), played back as one plain clip.
    /// The clip already holds ground, limits, overlap, stance, gaze and fingers, so while it plays they stand down, fading with the clip's own `blend` so
    /// nothing pops at either end. A card's own cues (`gaze` at a world point, `reach`, `fingers`) still go over it. A pure function of time, as any clip.
    /// </summary>
    public partial class MotionDriver
    {
        // Parts of the stack the bake can switch off, to find which one makes a spike.
        public bool NoLimits, NoOverlap, NoFingers, NoInertia;
        float _bk; bool _gazeBk, _bkBody;

        void BeginBaked() { _bk = 0; _gazeBk = false; _bkBody = false; }

        void FoldBaked(Op op, double tl)
        {
            float blend = Mathf.Max(op.a.F("blend", .2f), .05f), k = Ease.Apply("inout", Mathf.Clamp01((float)(tl / blend)));
            bool me = op.a.F("baked") > 0;
            _bk = _bkBody ? Mathf.Lerp(_bk, me ? 1 : 0, k) : me ? 1 : 0;   // the first thing to drive the body has nothing to fade from
            _bkBody = true;
            if (me && k >= 1) { _pose.Clear(); _poseLocal.Clear(); Array.Clear(_curl, 0, 10); Array.Clear(_handW, 0, 10); }
        }

        void GateBaked()
        {
            if (NoLimits) _lim = 0;
            if (NoOverlap) _ovlAll = 0;
            if (_bk <= 0) return;
            float k = 1 - _bk;
            _stArms *= k; _stLegs *= k; _ovlAll *= k; _gAmt *= k; _lim *= k;
            if (_gaze != null && _gazeBk) _gaze.w *= k;
        }

        /// <summary>The bones a clip drives, in the order the rig holds them, for the bake.</summary>
        public Transform[] BakeRig(MVActor actor) { RigInit(actor); return _rig; }
    }
}
