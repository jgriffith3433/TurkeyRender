using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Which performances have a baked clip. A bake is `baked/&lt;file&gt;_&lt;hash&gt;.json`, and the hash covers the take's own text, what it nests, the parameters it reads,
    /// its length and where it sits in the song: change any of them and the bake is stale, so the take plays from source and the build says so.</summary>
    public partial class ScoreCompiler
    {
        public static bool IgnoreBakes;
        public static string LastBakeKey, LastBakeFile; public static double LastBakeT, LastBakeLen;
        int _bakeHide;

        static string BakeDir => Path.Combine(Bridge.Root, "library", "performances", "baked");

        static string PerfText(string file, HashSet<string> seen)
        {
            if (!seen.Add(file)) return "";
            var path = Path.Combine(Bridge.Root, "library", "performances", file + ".json");
            if (!File.Exists(path)) return "";
            var s = File.ReadAllText(path).Replace("\r", "");
            var b = new StringBuilder(s);
            foreach (Match m in Regex.Matches(s, "\"do\"\\s*:\\s*\"perform\"[^{}]*?\"name\"\\s*:\\s*\"([\\w-]+)\"")) b.Append(PerfText(m.Groups[1].Value, seen));
            return b.ToString();
        }

        static string BakeKey(string file, Dictionary<string, JToken> vars, double t, double len)
        {
            var text = PerfText(file, new HashSet<string>());
            var b = new StringBuilder(text);
            foreach (var kv in vars.OrderBy(x => x.Key, StringComparer.Ordinal))
            {
                if (kv.Key == "for" || kv.Key == "length") continue;
                if (Regex.IsMatch(text, "\\$" + Regex.Escape(kv.Key) + "\\b|\"=[^\"]*\\b" + Regex.Escape(kv.Key) + "\\b")) b.Append('|').Append(kv.Key).Append('=').Append(kv.Value.ToString(Newtonsoft.Json.Formatting.None));
            }
            b.Append('|').Append(Math.Round(t, 3).ToString("0.000")).Append('|').Append(Math.Round(len, 3).ToString("0.000"));
            ulong h = 14695981039346656037ul;
            foreach (var ch in b.ToString()) { h ^= ch; h *= 1099511628211ul; }
            return file + "_" + h.ToString("x16").Substring(0, 10);
        }

        /// <summary>Plays the bake in place of a take's body. True when there is one: the cues that follow keep only what moves the actor or the face.</summary>
        bool BakeStart(string name, string file, Dictionary<string, JToken> vars, double t, double len, double lead)
        {
            string key = BakeKey(file, vars, t, len);
            if (_performDepth == 0) { LastBakeKey = key; LastBakeFile = file; LastBakeT = t; LastBakeLen = len; }
            if (IgnoreBakes || _bakeHide > 0 || NativeActor(name)) return false;   // a native actor plays the take from source on Unity's Animator
            var idx = Path.Combine(BakeDir, key + ".json");
            if (!File.Exists(idx))
            {
                if (Directory.Exists(BakeDir) && Directory.GetFiles(BakeDir, file + "_*.json").Length > 0) _warn.Add($"{name}: the bake of '{file}' is stale, so it plays from source. Run: node Director/tools/bake.mjs {file}");
                return false;
            }
            var j = JObject.Parse(File.ReadAllText(idx));
            var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>((string)j["clip"]);
            if (!clip) { _warn.Add($"{name}: no clip {j["clip"]} for the bake of '{file}', so it plays from source"); return false; }
            var a = new JObject { ["once"] = 1, ["baked"] = 1, ["blend"] = (double?)j["blend"] ?? .2 };
            if (lead > 0) a["start"] = (float)lead;
            Op(Track(name), "anim", t, Math.Max(len - lead, clip.length - lead), a, clip);
            return true;
        }

        /// <summary>What a baked take keeps of its own cues. The clip has the body; these stay for the actor's path, the face and the state that carries on after it.</summary>
        static bool BakeKeep(JObject c)
        {
            switch ((string)c["do"])
            {
                case "layer": case "pose": case "keys": case "fingers": case "plant": case "reach": case "eyes": return false;
                case "anim": case "walk": c["rootOnly"] = 1; return true;
                case "gaze": c["bk"] = 1; return true;
                default: return true;
            }
        }
    }

    public static partial class MotionLab
    {
        /// <summary>{"cues":[...],"pos":[x,y,z],"rot":[x,y,z],"out":"x","fps":60,"tail":0.5,"baked":0,"off":["ground","limits","overlap","fingers","inertia"]}:
        /// plays the take through the whole stack on a throwaway copy and writes every rig bone at each frame to Director/gen/bake/x.bin (frames x bones x 7 floats, position then rotation, local)
        /// and x.root.bin (the top of the rig in the world), with what the numbers need in x.json. `baked` 1 plays the baked clip if there is one, 0 the source.</summary>
        [BridgeCommand("bakedump")]
        static object BakeDump(JObject m)
        {
            if (m["path"] != null) { var over = m; m = JObject.Parse(File.ReadAllText((string)m["path"])); foreach (var kv in over) if (kv.Key != "cmd" && kv.Key != "path") m[kv.Key] = kv.Value; }
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            var def = new JObject { ["model"] = "person", ["pos"] = m["pos"] ?? new JArray(500, 0, 500), ["rot"] = m["rot"] ?? new JArray(0, 0, 0) };
            var cl = Spawn("__lab_person", (string)m["model"] ?? "person", def);
            bool keep = ScoreCompiler.IgnoreBakes;
            // A world `steps` section freezes scene time in holds. The clip holds the smooth motion and the engine steps it on playback, as it steps any clip.
            var keepSteps = song.stepHz; song.stepHz = null;
            try
            {
                ScoreCompiler.IgnoreBakes = ((int?)m["baked"] ?? 0) == 0;
                var sc = ScoreCompiler.ForLab(song, new Dictionary<string, MVActor> { ["person"] = cl.a }, cl.ops, ScoreCompiler.ReadScore());
                foreach (var cue in ((JArray)m["cues"]).OfType<JObject>()) { var c = (JObject)cue.DeepClone(); c["on"] = "person"; sc.LabCue(c); }
                string key = ScoreCompiler.LastBakeKey, file = ScoreCompiler.LastBakeFile; double t0 = ScoreCompiler.LastBakeT, len = ScoreCompiler.LastBakeLen;
                Arm(cl, song);
                var off = (m["off"] as JArray)?.Select(x => (string)x).ToArray() ?? new string[0];
                cl.d.NoGround = off.Contains("ground"); cl.d.NoLimits = off.Contains("limits"); cl.d.NoOverlap = off.Contains("overlap"); cl.d.NoFingers = off.Contains("fingers"); cl.d.NoInertia = off.Contains("inertia");
                cl.d.MeasureLimits = true;
                float fps = (float?)m["fps"] ?? 60, tail = (float?)m["tail"] ?? .5f;
                int frames = Mathf.CeilToInt((float)(len + tail) * fps) + 1;
                cl.d.Eval(t0);
                var rig = cl.d.BakeRig(cl.a); var a = cl.a; var top = a.animRoot != null ? a.animRoot.transform : a.transform;
                var name = (string)m["out"]; var dir = Path.Combine(Bridge.Root, "gen", "bake"); Directory.CreateDirectory(dir);
                using (var w = new BinaryWriter(File.Create(Path.Combine(dir, name + ".bin"))))
                using (var r = new BinaryWriter(File.Create(Path.Combine(dir, name + ".root.bin"))))
                    for (int f = 0; f < frames; f++)
                    {
                        cl.d.Eval(t0 + f / (double)fps);
                        foreach (var b in rig)
                        {
                            b.GetLocalPositionAndRotation(out var p, out var q);
                            w.Write(p.x); w.Write(p.y); w.Write(p.z); w.Write(q.x); w.Write(q.y); w.Write(q.z); w.Write(q.w);
                        }
                        var tp = top.position; var tq = top.rotation;
                        r.Write(tp.x); r.Write(tp.y); r.Write(tp.z); r.Write(tq.x); r.Write(tq.y); r.Write(tq.z); r.Write(tq.w);
                    }
                var ix = new Dictionary<Transform, int>(); for (int i = 0; i < rig.Length; i++) ix[rig[i]] = i;
                var bones = new JArray(rig.Select(b => new JObject { ["name"] = b.name, ["path"] = AnimationUtility.CalculateTransformPath(b, top), ["parent"] = b.parent && ix.TryGetValue(b.parent, out var pi) ? pi : -1, ["scale"] = new JArray(b.localScale.x, b.localScale.y, b.localScale.z) }));
                var human = new JObject(); var rest = new JObject(); var curl = new JObject();
                for (int i = 0; i < a.human.Length; i++)
                {
                    if (!a.human[i] || !ix.TryGetValue(a.human[i], out var at)) continue;
                    var nm = ((HumanBodyBones)i).ToString(); human[nm] = at;
                    if (i < a.humanRest.Length) { var q = a.humanRest[i]; rest[nm] = new JArray(q.x, q.y, q.z, q.w); }
                    if (i < a.curlAxis.Length) { var v = a.curlAxis[i]; curl[nm] = new JArray(v.x, v.y, v.z); }
                }
                var tl = top.lossyScale;
                var head = new JObject { ["key"] = key, ["file"] = file, ["t0"] = t0, ["len"] = len, ["fps"] = fps, ["frames"] = frames, ["bones"] = bones, ["human"] = human, ["rest"] = rest, ["curl"] = curl,
                    ["topScale"] = new JArray(tl.x, tl.y, tl.z), ["actorRot"] = new JArray(a.transform.rotation.x, a.transform.rotation.y, a.transform.rotation.z, a.transform.rotation.w),
                    ["ops"] = new JArray(cl.ops.Where(o => o.kind == "anim" || o.kind == "layer" || o.kind == "walk" || o.kind == "pose" || o.kind == "gaze" || o.kind == "rootanim").OrderBy(o => o.start).Select(o => new JObject { ["kind"] = o.kind, ["t"] = Math.Round(o.start - t0, 3), ["end"] = Math.Round(o.end - t0, 3), ["clip"] = o.refs != null && o.refs.Length > 0 && o.refs[0] ? o.refs[0].name : o.a.S("clip", ""), ["blend"] = o.a.F("blend", -1), ["mask"] = o.a.S("mask", "") })),
                    ["limitsMoved"] = JObject.FromObject(cl.d.LimitWorst.OrderByDescending(x => x.Value).Take(14).ToDictionary(x => x.Key, x => (float)Math.Round(x.Value, 1))) };
                File.WriteAllText(Path.Combine(dir, name + ".json"), head.ToString(Newtonsoft.Json.Formatting.None));
                return new JObject { ["out"] = name, ["key"] = key, ["frames"] = frames, ["bones"] = rig.Length, ["t0"] = t0, ["len"] = len, ["warnings"] = new JArray(sc.Warnings.Take(10)) };
            }
            finally
            {
                ScoreCompiler.IgnoreBakes = keep; song.stepHz = keepSteps;
                if (cl.a) UnityEngine.Object.DestroyImmediate(cl.a.gameObject);
                MotionDriver.History = 0;
            }
        }

        static AnimationCurve Reduced(float[] v, float dt, float tol)
        {
            int n = v.Length; var on = new bool[n]; on[0] = on[n - 1] = true;
            var st = new Stack<(int a, int b)>(); st.Push((0, n - 1));
            while (st.Count > 0)
            {
                var (a, b) = st.Pop(); if (b - a < 2) continue;
                int at = -1; float far = tol;
                for (int i = a + 1; i < b; i++) { float d = Mathf.Abs(Mathf.Lerp(v[a], v[b], (i - a) / (float)(b - a)) - v[i]); if (d > far) { far = d; at = i; } }
                if (at < 0) continue;
                on[at] = true; st.Push((a, at)); st.Push((at, b));
            }
            var idx = new List<int>(); for (int i = 0; i < n; i++) if (on[i]) idx.Add(i);
            var keys = new Keyframe[idx.Count];
            for (int k = 0; k < idx.Count; k++)
            {
                int i = idx[k];
                float inT = k > 0 ? (v[i] - v[idx[k - 1]]) / ((i - idx[k - 1]) * dt) : 0, outT = k + 1 < idx.Count ? (v[idx[k + 1]] - v[i]) / ((idx[k + 1] - i) * dt) : 0;
                if (k == 0) inT = outT; if (k == idx.Count - 1) outT = inT;
                keys[k] = new Keyframe(i * dt, v[i], inT, outT);
            }
            return new AnimationCurve(keys);
        }

        /// <summary>{"in":"x.clean","head":"x","key":"dance_chorus_ab12","blend":0.12}: writes the cleaned rotations as Assets/MusicVideo/Generated/Baked/bk_key.anim, a plain transform clip like a ragdoll's, and the bake's entry in library/performances/baked.</summary>
        [BridgeCommand("bakewrite")]
        static object BakeWrite(JObject m)
        {
            var dir = Path.Combine(Bridge.Root, "gen", "bake");
            var head = JObject.Parse(File.ReadAllText(Path.Combine(dir, (string)m["head"] + ".json")));
            var bones = (JArray)head["bones"]; int nb = bones.Count, nf = (int)head["frames"]; float dt = 1 / (float)head["fps"];
            var raw = File.ReadAllBytes(Path.Combine(dir, (string)m["in"] + ".bin"));
            if (raw.Length != nb * nf * 7 * 4) throw new Exception("size " + raw.Length + " is not " + nb + " x " + nf + " x 28");
            var data = new float[raw.Length / 4]; Buffer.BlockCopy(raw, 0, data, 0, raw.Length);
            var key = (string)m["key"]; var folder = "Assets/MusicVideo/Generated/Baked";
            if (!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder("Assets/MusicVideo/Generated", "Baked");
            var path = folder + "/bk_" + key + ".anim";
            var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(path); bool fresh = !clip;
            if (fresh) clip = new AnimationClip { name = "bk_" + key };
            clip.ClearCurves(); clip.legacy = true; clip.wrapMode = WrapMode.ClampForever;
            float rotTol = (float?)m["rotTol"] ?? .00025f, posTol = (float?)m["posTol"] ?? .0002f; int keysN = 0;
            var ch = new float[nf];
            string[] props = { "localPosition.x", "localPosition.y", "localPosition.z", "localRotation.x", "localRotation.y", "localRotation.z", "localRotation.w" };
            for (int b = 0; b < nb; b++)
            {
                var bp = (string)bones[b]["path"];
                for (int c = 0; c < 7; c++)
                {
                    for (int f = 0; f < nf; f++) ch[f] = data[(f * nb + b) * 7 + c];
                    var cv = Reduced(ch, dt, c < 3 ? posTol : rotTol); keysN += cv.length;
                    clip.SetCurve(bp, typeof(Transform), props[c], cv);
                }
            }
            clip.EnsureQuaternionContinuity();
            if (fresh) AssetDatabase.CreateAsset(clip, path); else EditorUtility.SetDirty(clip);
            AssetDatabase.SaveAssets();
            var idx = Path.Combine(Bridge.Root, "library", "performances", "baked"); Directory.CreateDirectory(idx);
            File.WriteAllText(Path.Combine(idx, key + ".json"), new JObject { ["clip"] = path, ["blend"] = m["blend"] ?? .2, ["length"] = dt * (nf - 1), ["file"] = head["file"] }.ToString());
            return new JObject { ["clip"] = path, ["keys"] = keysN, ["bytes"] = new FileInfo(Path.Combine(Application.dataPath, "..", path)).Length };
        }
    }
}
