using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Playables;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// When, inside one director Evaluate, does a native body's pose change? A probe output added to the built timeline's own graph records a bone in
    /// PrepareFrame and ProcessFrame; the bone is read again after Evaluate. `call nativeorder '{"actor":"doctor","bone":"RightHand","t":56,"from":50}'`.
    /// Shows whether our tracks (script outputs, like the probe) see this evaluation's Animator pose or the one before. Puts time back.
    /// </summary>
    static class NativeOrderProbe
    {
        class Probe : PlayableBehaviour
        {
            public Transform bone; public readonly List<string> log = new List<string>();
            public override void PrepareFrame(Playable p, FrameData info) { if (bone) log.Add("prepare " + V(bone.position)); }
            public override void ProcessFrame(Playable p, FrameData info, object data) { if (bone) log.Add("process " + V(bone.position)); }
        }

        static string V(Vector3 v) => $"{v.x:0.000},{v.y:0.000},{v.z:0.000}";

        [BridgeCommand("nativeorder")]
        static object Run(JObject m)
        {
            var d = Transport.Director; if (!d.playableGraph.IsValid()) d.RebuildGraph();
            var a = MVActor.Named((string)m["actor"] ?? "doctor"); if (!a) throw new Exception("no actor");
            var hb = (HumanBodyBones)Enum.Parse(typeof(HumanBodyBones), (string)m["bone"] ?? "RightHand", true);
            var bone = a.human[(int)hb];
            double t = (double)m["t"], keep = d.time;
            d.time = (double?)m["from"] ?? t - 1; d.Evaluate();
            var before = V(bone.position);
            var g = d.playableGraph;
            var sp = ScriptPlayable<Probe>.Create(g); sp.GetBehaviour().bone = bone;
            var outp = ScriptPlayableOutput.Create(g, "nativeorder"); outp.SetSourcePlayable(sp);
            d.time = t; d.Evaluate();
            var after = V(bone.position);
            var log = sp.GetBehaviour().log.ToArray();
            g.DestroyOutput(outp); sp.Destroy();
            var outs = new List<string>(); for (int i = 0; i < g.GetOutputCount(); i++) { var o = g.GetOutput(i); outs.Add(o.GetPlayableOutputType().Name + " " + (o.GetSourcePlayable().IsValid() ? o.GetSourcePlayable().GetPlayableType()?.Name : "")); }
            Transport.Seek(keep);
            return new { native = a.native, animatorEnabled = a.GetComponentInChildren<Animator>(true)?.enabled, before, during = log, after, outputs = outs.Count > 40 ? outs.GetRange(0, 40) : outs };
        }
    }
}
