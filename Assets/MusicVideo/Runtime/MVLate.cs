using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// What has to wait for Unity's Animator. Inside a director Evaluate our tracks' ProcessFrame runs before the Animator writes a native body's pose
    /// (measured, `call nativeorder`: a script output sees the last evaluation's bones, and the new ones only after Evaluate returns). So anything done to
    /// or read from a native body in ProcessFrame was a frame late or overwritten: an attached prop trailed the hand by a frame and, on the first frame
    /// after a cut, sat where the hand was in the shot before; reach, gaze, eyes and grips were written onto bones the Animator then replaced.
    /// During an Evaluate a native driver's acting, and any driver that read a native body (attach, catch, throw targets), are noted here, and run on the
    /// finished pose by Flush: before every render (beginContextRendering) and explicitly after an Evaluate whose result is read without a render
    /// (frames, the motion check, probes, the dead-zone bake). Same evaluation, same time: still a pure function of the timeline position.
    /// </summary>
    public static class MVLate
    {
        /// <summary>True while a director Evaluate runs our tracks (MVMixer.ProcessFrame); outside it everything is immediate, as before.</summary>
        public static bool Deferring;
        /// <summary>The time the director is evaluating. Drivers are also pulled at other times inside an Evaluate (a lead camera reads its subject 0.25 s
        /// ahead, a throw reads where its catcher will be): what runs late runs at this time, so nothing is left at a time it was only asked about.</summary>
        public static double EvalT;
        static readonly Dictionary<MotionDriver, (MVActor actor, double t)> _native = new Dictionary<MotionDriver, (MVActor, double)>();
        static readonly Dictionary<MotionDriver, (MVActor actor, double t)> _depend = new Dictionary<MotionDriver, (MVActor, double)>();
        static readonly List<MotionDriver> _order = new List<MotionDriver>();
        static bool _hooked, _flushing;
        public static bool Flushing => _flushing;

        static void Hook()
        {
            if (_hooked) return; _hooked = true;
            RenderPipelineManager.beginContextRendering += (c, cams) => Flush();
        }

        /// <summary>A native body's acting (reach, gaze, eyes, grips), to go on after the Animator.</summary>
        public static void Native(MotionDriver d, MVActor actor, double t) { Hook(); _native[d] = (actor, EvalT); }

        /// <summary>A driver that read a native body's bones while they were still the last evaluation's.</summary>
        public static void Depend(MotionDriver d, MVActor actor, double t) { if (_flushing) return; Hook(); if (!_depend.ContainsKey(d)) _order.Add(d); _depend[d] = (actor, EvalT); }

        static readonly List<Transform> _stands = new List<Transform>(); static int _stand;
        /// <summary>A hidden transform to hand out for a pose read at another time during Flush; 64 in a ring, reused every flush.</summary>
        public static Transform StandIn()
        {
            if (_stands.Count < 64 || !_stands[_stand % 64])
            {
                var go = new GameObject("__late_standin") { hideFlags = HideFlags.HideAndDontSave };
                if (_stands.Count < 64) _stands.Add(go.transform); else _stands[_stand % 64] = go.transform;
            }
            return _stands[_stand++ % 64];
        }

        public static bool Pending => _native.Count > 0 || _depend.Count > 0;

        /// <summary>Runs what waited for the Animator, on the pose it wrote. Natives first (their acting moves the hands others hold), then the rest, twice, so a chain (a planet on a can in a hand) settles.</summary>
        public static void Flush()
        {
            if (_flushing || !Pending) return;
            _flushing = true;
            try
            {
                foreach (var kv in _native) if (kv.Value.actor) kv.Key.LateNative(kv.Value.actor, kv.Value.t);
                for (int pass = 0; pass < 2; pass++)
                    foreach (var d in _order) if (_depend.TryGetValue(d, out var v) && v.actor) d.Reapply(v.actor, v.t);
                // A driver run late can pull another to a different time (a gaze reads where its target will be, a lead camera reads ahead) and leave
                // it there: the last pass puts every one of them back at the evaluation's time (Hawkes Punch w_out: `other` left 0.3 s ahead, on the next mark).
                foreach (var kv in _native) if (kv.Value.actor) kv.Key.Restore(kv.Value.actor, kv.Value.t);
                foreach (var d in _order) if (_depend.TryGetValue(d, out var v) && v.actor) d.Restore(v.actor, v.t);
            }
            finally { _native.Clear(); _depend.Clear(); _order.Clear(); _flushing = false; }
        }
    }
}
