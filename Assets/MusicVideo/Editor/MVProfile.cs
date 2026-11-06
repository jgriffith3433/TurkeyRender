using System.Diagnostics;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>`call evalcost '{"t":20}'` times the timeline evaluate apart from the camera render, and names the slowest scripts.</summary>
    public static class MVProfile
    {
        [BridgeCommand("warpat")]
        static object WarpAt(JObject m)
        {
            var dd = Transport.Director; if (!dd.playableGraph.IsValid()) dd.RebuildGraph(); dd.time = 171.3; dd.Evaluate();
            var song = MVClock.Song ?? UnityEditor.AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath); double t0 = (double?)m["t"] ?? 171.3; var o = new JArray();
            for (int i = 0; i < 8; i++) { double t = t0 + i * .01; o.Add(new JArray(t, song.Warp(t), song.WarpRaw(t), song.BeatAt(t))); }
            return o;
        }

        [BridgeCommand("evalcost")]
        static object EvalCost(JObject m)
        {
            double t = (double?)m["t"] ?? 20; int n = (int?)m["n"] ?? 8;
            var d = Transport.Director; if (!d.playableGraph.IsValid()) d.RebuildGraph();
            var a = Stopwatch.StartNew();
            for (int i = 0; i < n; i++) { d.time = t + i / 30.0; d.Evaluate(); }
            double eval = a.ElapsedMilliseconds / (double)n;
            a.Restart();
            double render = 0;
            a.Restart();
            for (int i = 0; i < 100; i++) MVActor.Named("__nobody__");
            double miss = a.ElapsedMilliseconds / 100.0;
            return new { eval, render, namedMiss = miss, lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Length, renderers = Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length };
        }
    }
}
