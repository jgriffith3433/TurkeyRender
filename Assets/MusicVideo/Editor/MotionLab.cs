using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Motion review: contact sheets of an actor from a fixed view as unlit silhouettes with the hips path, numbers for pops
    /// and foot slide, and a lab that plays cues on a throwaway copy of an actor without building the score.</summary>
    public static class MotionLab
    {
        // ---- the sheet ----

        class Frame { public double t; public Vector3 hips, lf, rf, lh, rh; public Vector3[] pts; public List<(Mesh m, Matrix4x4 x)> meshes = new List<(Mesh, Matrix4x4)>(); }

        static Vector3 PosOf(MVActor a, HumanBodyBones b, Transform fallback) => a.human.Length > (int)b && a.human[(int)b] ? a.human[(int)b].position : fallback.position;

        static Frame Grab(MVActor a, double t, Transform[] bones)
        {
            var f = new Frame { t = t };
            f.hips = bones.Length > 0 ? PosOf(a, HumanBodyBones.Hips, bones[0]) : a.transform.position;
            f.lf = PosOf(a, HumanBodyBones.LeftFoot, a.transform); f.rf = PosOf(a, HumanBodyBones.RightFoot, a.transform);
            f.lh = PosOf(a, HumanBodyBones.LeftHand, a.transform); f.rh = PosOf(a, HumanBodyBones.RightHand, a.transform);
            f.pts = bones.Select(b => b.position).ToArray();
            foreach (var r in a.GetComponentsInChildren<Renderer>(true))
            {
                if (r is SkinnedMeshRenderer s && s.sharedMesh)
                {
                    var m = new Mesh { hideFlags = HideFlags.HideAndDontSave, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
                    s.BakeMesh(m, true);
                    f.meshes.Add((m, Matrix4x4.TRS(s.transform.position, s.transform.rotation, Vector3.one)));
                }
                else if (r is MeshRenderer && r.TryGetComponent<MeshFilter>(out var mf) && mf.sharedMesh) f.meshes.Add((mf.sharedMesh, r.transform.localToWorldMatrix));
            }
            return f;
        }

        static Material _flat;
        static Material Flat => _flat ? _flat : _flat = MakeFlat();
        static Material MakeFlat()
        {
            var m = new Material(Shader.Find("Hidden/Internal-Colored")) { hideFlags = HideFlags.HideAndDontSave };
            m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha); m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            m.SetInt("_Cull", 0); m.SetInt("_ZWrite", 0); m.SetInt("_ZTest", (int)UnityEngine.Rendering.CompareFunction.Always);
            return m;
        }

        static void Line(Color c, params Vector3[] pts)
        {
            Flat.SetColor("_Color", Color.white); Flat.SetPass(0);
            GL.Begin(GL.LINE_STRIP); GL.Color(c);
            foreach (var p in pts) GL.Vertex(p);
            GL.End();
        }

        static void Dot(Color c, Vector3 p, Vector3 right, Vector3 up, float r)
        {
            Flat.SetColor("_Color", Color.white); Flat.SetPass(0);
            GL.Begin(GL.QUADS); GL.Color(c);
            GL.Vertex(p - right * r - up * r); GL.Vertex(p + right * r - up * r); GL.Vertex(p + right * r + up * r); GL.Vertex(p - right * r + up * r);
            GL.End();
        }

        static void Sil(Frame f, Color c)
        {
            Flat.SetColor("_Color", c); Flat.SetPass(0);
            foreach (var (m, x) in f.meshes) Graphics.DrawMeshNow(m, x);
        }

        static string DrawSheet(List<Frame> frames, MVActor actor, JObject m, string file)
        {
            string view = (string)m["view"] ?? "side";
            int cols = (int?)m["cols"] ?? 8, cell = (int?)m["cell"] ?? 240;
            int rows = Mathf.CeilToInt(frames.Count / (float)cols);
            var fwd0 = actor.transform.rotation * Vector3.forward; fwd0.y = 0; fwd0.Normalize();
            // The direction the camera looks. Side: he faces screen left to right at the start of the span.
            Vector3 look = view == "front" ? -fwd0 : view == "back" ? fwd0 : view == "top" ? Vector3.down : Vector3.Cross(fwd0, Vector3.up);
            if (m["dir"] is JArray dj) look = new Vector3((float)dj[0], (float)dj[1], (float)dj[2]).normalized;
            var up = view == "top" ? fwd0 : Vector3.up;
            var right = Vector3.Cross(up, look).normalized;
            up = Vector3.Cross(look, right).normalized;

            var pts = frames.SelectMany(f => new[] { f.hips, f.lf, f.rf, f.lh, f.rh }).ToList();
            float xmin = pts.Min(p => Vector3.Dot(p, right)), xmax = pts.Max(p => Vector3.Dot(p, right)), ymin = pts.Min(p => Vector3.Dot(p, up)), ymax = pts.Max(p => Vector3.Dot(p, up));
            float hw = Mathf.Max(1.15f, Mathf.Max((ymax - ymin) * .5f + .55f, (xmax - xmin) * .5f + .55f));
            var depth = Vector3.Dot(frames[0].hips, look);
            var center = right * ((xmin + xmax) * .5f) + up * ((ymin + ymax) * .5f) + look * depth;

            int W = cols * cell, panel = (int?)m["panel"] ?? cell * 3, H = rows * cell + panel;
            var rt = RenderTexture.GetTemporary(W, H, 0, RenderTextureFormat.ARGB32); var keep = RenderTexture.active;
            RenderTexture.active = rt;
            GL.Clear(true, true, new Color(.93f, .92f, .89f));
            GL.PushMatrix();
            var viewM = Matrix4x4.TRS(center, Quaternion.LookRotation(look, up), new Vector3(1, 1, -1)).inverse;
            void Cam(int px, int py, int pw, int ph)
            {
                GL.Viewport(new Rect(px, py, pw, ph));
                float asp = pw / (float)ph, ww = hw * Mathf.Max(asp, 1), hh2 = ww / asp;
                GL.LoadProjectionMatrix(GL.GetGPUProjectionMatrix(Matrix4x4.Ortho(-ww, ww, -hh2, hh2, -100, 100), false));
                GL.modelview = viewM;
            }
            var hipPath = frames.Select(f => f.hips).ToArray();
            float ground = Mathf.Min(frames.Min(f => f.lf.y), frames.Min(f => f.rf.y)) - .08f;
            void Ground()
            {
                if (view == "top") return;
                var o = center; o.y = ground;
                Line(new Color(.45f, .42f, .38f), o - right * 50, o + right * 50);
            }
            float dotR = hw * .022f;
            for (int i = 0; i < frames.Count; i++)
            {
                int cx = i % cols, cy = i / cols;
                Cam(cx * cell, H - (cy + 1) * cell, cell, cell);
                Ground();
                Sil(frames[i], new Color(.1f, .1f, .13f));
                Line(new Color(.1f, .45f, .95f), hipPath);
                Dot(new Color(1, .75f, .1f), frames[i].hips, right, up, dotR);
                Dot(new Color(.1f, .8f, .3f), frames[i].lf, right, up, dotR * .7f); Dot(new Color(.9f, .2f, .2f), frames[i].rf, right, up, dotR * .7f);
                Dot(new Color(.1f, .8f, .3f), frames[i].lh, right, up, dotR * .5f); Dot(new Color(.9f, .2f, .2f), frames[i].rh, right, up, dotR * .5f);
            }
            // The whole move on one panel: ghosts and paths of hips, feet and hands.
            Cam(0, 0, W, panel);
            Ground();
            float alpha = Mathf.Clamp(5f / frames.Count, .06f, .4f);
            foreach (var f in frames) Sil(f, new Color(.1f, .1f, .15f, alpha));
            Line(new Color(.1f, .8f, .3f, .7f), frames.Select(f => f.lf).ToArray()); Line(new Color(.9f, .2f, .2f, .7f), frames.Select(f => f.rf).ToArray());
            Line(new Color(.1f, .8f, .3f, .4f), frames.Select(f => f.lh).ToArray()); Line(new Color(.9f, .2f, .2f, .4f), frames.Select(f => f.rh).ToArray());
            Line(new Color(.1f, .45f, .95f), hipPath);
            foreach (var f in frames) Dot(new Color(1, .75f, .1f), f.hips, right, up, dotR * .5f);
            GL.PopMatrix();
            var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, W, H), 0, 0); tex.Apply();
            RenderTexture.active = keep; RenderTexture.ReleaseTemporary(rt);
            var path = Path.Combine(Bridge.Root, "captures", file);
            File.WriteAllBytes(path, tex.EncodeToPNG());
            UnityEngine.Object.DestroyImmediate(tex);
            return path;
        }

        /// <summary>Numbers for what the eye misses at speed: a pop is a bone whose path kinks, a slide is a foot moving while it is on the floor.</summary>
        static JObject Stats(List<Frame> f, Transform[] bones)
        {
            var o = new JObject(); var pops = new JArray(); var slides = new JArray();
            float dt = f.Count > 1 ? (float)(f[1].t - f[0].t) : 1 / 30f;
            for (int i = 1; i + 1 < f.Count; i++)
            {
                float worst = 0; int who = -1;
                for (int b = 0; b < bones.Length; b++)
                {
                    float a = (f[i + 1].pts[b] - 2 * f[i].pts[b] + f[i - 1].pts[b]).magnitude;
                    if (a > worst) { worst = a; who = b; }
                }
                if (worst > .05f * (dt * 30) * (dt * 30) + .03f) pops.Add($"{f[i].t:0.000}s {bones[who].name} kink {worst:0.000} m");
            }
            float floor = Mathf.Min(f.Min(x => x.lf.y), f.Min(x => x.rf.y));
            foreach (var (name, get) in new (string, Func<Frame, Vector3>)[] { ("left", x => x.lf), ("right", x => x.rf) })
            {
                float total = 0, worst = 0, at = 0;
                for (int i = 1; i < f.Count; i++)
                {
                    Vector3 a = get(f[i - 1]), b = get(f[i]); if (a.y > floor + .05f || b.y > floor + .05f) continue;
                    var d = b - a; d.y = 0; float v = d.magnitude; total += v; if (v > worst) { worst = v; at = (float)f[i].t; }
                }
                slides.Add($"{name} foot on floor moved {total:0.000} m, worst step {worst:0.000} m at {at:0.00}s");
            }
            o["pops"] = new JArray(pops.Take(20)); o["popCount"] = pops.Count; o["feet"] = slides;
            float maxHip = 0; for (int i = 1; i < f.Count; i++) maxHip = Mathf.Max(maxHip, (f[i].hips - f[i - 1].hips).magnitude / dt);
            o["hipsTop"] = f.Max(x => x.hips.y); o["hipsLow"] = f.Min(x => x.hips.y); o["hipsMaxSpeed"] = maxHip;
            o["hipsTravel"] = (f[f.Count - 1].hips - f[0].hips).ToString("0.00");
            return o;
        }

        static double[] Grid(double from, double to, int every, float fps)
        {
            var l = new List<double>(); double step = every / (double)fps;
            for (double t = from; t <= to + 1e-6; t += step) l.Add(t);
            return l.ToArray();
        }

        static Transform[] BonesOf(MVActor a)
        {
            if (a.human.Length > 0) return a.human.Where(x => x).Distinct().ToArray();
            var go = a.animRoot ? a.animRoot : a.gameObject;
            return go.GetComponentsInChildren<Transform>(true).Where(x => x.childCount > 0 && x != go.transform).ToArray();
        }

        static void Release(List<Frame> frames)
        {
            foreach (var f in frames) foreach (var (m, _) in f.meshes) if (m.hideFlags == HideFlags.HideAndDontSave) UnityEngine.Object.DestroyImmediate(m);
        }

        // ---- mv motion ----

        [BridgeCommand("motion")]
        static object Motion(JObject m)
        {
            var name = (string)m["on"] ?? "person";
            var actor = MVActor.Named(name); if (!actor) throw new Exception("no actor " + name);
            var d = Transport.Director; double keep = d.time;
            if (!d.playableGraph.IsValid()) d.RebuildGraph();
            double from = (double)m["from"], to = (double)m["to"];
            d.time = from; d.Evaluate();
            if (actor.Driver == null) throw new Exception(name + " has no motion track");
            var bones = BonesOf(actor); var frames = new List<Frame>();
            foreach (var t in Grid(from, to, (int?)m["every"] ?? 2, (float?)m["fps"] ?? 30))
            {
                actor.Driver.Eval(t);
                frames.Add(Grab(actor, t, bones));
            }
            var path = DrawSheet(frames, actor, m, (string)m["file"] ?? "motion.png");
            var stats = Stats(frames, bones);
            Release(frames);
            Transport.Seek(keep);
            stats["sheet"] = path; stats["frames"] = frames.Count;
            return stats;
        }

        // ---- mv lab ----

        class Clone { public MVActor a; public MotionDriver d; public List<Op> ops; }

        static Clone Spawn(string name, string source, JObject def)
        {
            var src = MVActor.Named(source); if (!src) throw new Exception("no actor " + source);
            var go = UnityEngine.Object.Instantiate(src.gameObject, src.transform.root, false); go.name = name;
            go.SetActive(true);
            foreach (var r in go.GetComponentsInChildren<Renderer>(true)) r.enabled = true;
            var a = go.GetComponent<MVActor>();
            a.basePos = def["pos"] is JArray p ? new Vector3((float)p[0], (float)p[1], (float)p[2]) : Vector3.zero;
            a.baseEuler = def["rot"] is JArray r2 ? new Vector3((float)r2[0], (float)r2[1], (float)r2[2]) : Vector3.zero;
            return new Clone { a = a, ops = new List<Op>() };
        }

        static void Arm(Clone c, SongMap song)
        {
            c.ops.Sort((x, y) => x.start.CompareTo(y.start));
            for (int i = 0; i < c.ops.Count; i++) c.ops[i].index = i;
            c.d = new MotionDriver(); c.d.Init(c.ops, song); c.d.Bind(c.a);
        }

        [BridgeCommand("lab")]
        static object Lab(JObject m)
        {
            if (m["path"] != null) { var over = m; m = JObject.Parse(File.ReadAllText((string)m["path"])); foreach (var kv in over) if (kv.Key != "cmd" && kv.Key != "path") m[kv.Key] = kv.Value; }
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            var clones = new Dictionary<string, Clone>();
            var main = (string)m["on"] ?? "person";
            var spec = m["actors"] as JObject ?? new JObject { [main] = new JObject { ["model"] = main } };
            try
            {
                var actors = new Dictionary<string, MVActor>();
                foreach (var kv in spec)
                {
                    clones[kv.Key] = Spawn("__lab_" + kv.Key, (string)kv.Value["model"] ?? kv.Key, (JObject)kv.Value);
                    actors[kv.Key] = clones[kv.Key].a;
                }
                var score = JObject.Parse(File.ReadAllText(ScoreCompiler.ScoreFile));
                var warns = new List<string>();
                var rags = new List<RagJob>();
                foreach (var kv in clones)
                {
                    var sc = ScoreCompiler.ForLab(song, actors, kv.Value.ops, score);
                    foreach (var cue in ((JArray)m["cues"]).OfType<JObject>().Where(x => ((string)x["on"] ?? main) == kv.Key))
                    {
                        var c = (JObject)cue.DeepClone(); c["on"] = kv.Key;
                        // `to` may name another lab actor.
                        if (c["to"]?.Type == JTokenType.String) { var s = (string)c["to"]; if (clones.ContainsKey(s.Split('.')[0])) c["to"] = "__lab_" + s; }
                        if (c["collide"] is JArray ca) c["collide"] = new JArray(ca.Select(x => clones.ContainsKey((string)x) ? "__lab_" + (string)x : (string)x));
                        sc.LabCue(c);
                    }
                    warns.AddRange(sc.Warnings);
                    rags.AddRange(sc.Rags);
                }
                foreach (var c in clones.Values) Arm(c, song);
                RagdollBaker.BakeAll(rags, n => clones[n].a, (x, t) => { foreach (var c in clones.Values) c.d.Eval(t); }, warns);
                foreach (var c in clones.Values) Arm(c, song);
                clones[main].d.MeasureLimits = true;
                double from = (double?)m["from"] ?? 0, to = (double?)m["to"] ?? from + 3;
                var ma = clones[main];
                var bones = BonesOf(ma.a);
                var times = Grid(from, to, (int?)m["every"] ?? 2, (float?)m["fps"] ?? 30);
                var clock = System.Diagnostics.Stopwatch.StartNew();
                var frames = new List<Frame>();
                long evalTicks = 0; var ec = new System.Diagnostics.Stopwatch();
                foreach (var t in times)
                {
                    ec.Restart(); foreach (var c in clones.Values) c.d.Eval(t); evalTicks += ec.ElapsedTicks;
                    frames.Add(Grab(ma.a, t, bones));
                }
                float ms = evalTicks * 1000f / System.Diagnostics.Stopwatch.Frequency / times.Length;
                var path = DrawSheet(frames, ma.a, m, (string)m["sheet"] ?? "lab.png");
                var o = Stats(frames, bones);
                Release(frames);
                o["limitsMovedDegrees"] = JObject.FromObject(clones[main].d.LimitWorst.OrderByDescending(x => x.Value).Take(10).ToDictionary(x => x.Key, x => (float)System.Math.Round(x.Value, 1)));
                o["sheet"] = path; o["frames"] = frames.Count; o["msPerFrame"] = ms; o["warnings"] = new JArray(warns);

                // The proof of purity: the same moments reached backward, and shuffled by a fresh driver, must give the same bones.
                var pos = frames.Select(f => f.pts).ToArray();
                float worstBack = 0, worstFresh = 0;
                for (int i = times.Length - 1; i >= 0; i--)
                {
                    foreach (var c in clones.Values) c.d.Eval(times[i] + 1e-7);
                    foreach (var c in clones.Values) c.d.Eval(times[i]);
                    for (int b = 0; b < bones.Length; b++) worstBack = Mathf.Max(worstBack, (bones[b].position - pos[i][b]).magnitude);
                }
                foreach (var c in clones.Values) Arm(c, song);
                var rnd = new System.Random(3);
                foreach (var i in Enumerable.Range(0, times.Length).OrderBy(_ => rnd.Next()).Take(12))
                {
                    foreach (var c in clones.Values) c.d.Eval(times[i]);
                    for (int b = 0; b < bones.Length; b++) worstFresh = Mathf.Max(worstFresh, (bones[b].position - pos[i][b]).magnitude);
                }
                o["reverseWorstMetres"] = worstBack; o["shuffledFreshWorstMetres"] = worstFresh;
                if (m["probe"] is JArray probe)
                {
                    var rows = new JArray();
                    foreach (var pt in probe)
                    {
                        double t = (double)pt; foreach (var c in clones.Values) c.d.Eval(t);
                        var r = new JObject { ["t"] = t };
                        foreach (var nm in (m["probeBones"] as JArray) ?? new JArray("hips", "head", "rightHand", "leftFoot"))
                        {
                            var parts = ((string)nm).Split('.'); var who = parts.Length > 1 ? clones[parts[0]].a : ma.a;
                            r[(string)nm] = who.Bone(parts[parts.Length - 1])?.position.ToString("0.000");
                        }
                        rows.Add(r);
                    }
                    o["probe"] = rows;
                }
                return o;
            }
            finally
            {
                foreach (var c in clones.Values) if (c.a) UnityEngine.Object.DestroyImmediate(c.a.gameObject);
                MotionDriver.History = 0;
            }
        }

        /// <summary>What a clip does to the root and the hips when sampled.</summary>
        [BridgeCommand("clipprobe")]
        static object ClipProbe(JObject m)
        {
            var person = MVActor.Named((string)m["on"] ?? "person");
            var clone = UnityEngine.Object.Instantiate(person.animRoot); clone.hideFlags = HideFlags.DontSave;
            var o = new JArray();
            try
            {
                foreach (var name in (JArray)m["clips"])
                {
                    var c = person.FindClip((string)name) ?? FindAny((string)name);
                    if (!c) { o.Add((string)name + ": none"); continue; }
                    var hips = clone.GetComponent<Animator>()?.GetBoneTransform(HumanBodyBones.Hips);
                    var row = new JArray();
                    for (int i = 0; i <= 6; i++)
                    {
                        float t = c.length * i / 6f;
                        clone.transform.localPosition = Vector3.zero; clone.transform.localRotation = Quaternion.identity;
                        c.SampleAnimation(clone, t);
                        row.Add($"{t:0.00}: go {clone.transform.localPosition.ToString("0.00")} {clone.transform.localEulerAngles.ToString("0")} hips {(hips ? clone.transform.InverseTransformPoint(hips.position).ToString("0.00") : "")}");
                    }
                    o.Add(new JObject { ["clip"] = c.name, ["len"] = c.length, ["loop"] = c.isLooping, ["frames"] = row });
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(clone); }
            return o;
        }

        public static AnimationClip FindAny(string name)
        {
            foreach (var g in AssetDatabase.FindAssets(name + " t:AnimationClip"))
                foreach (var o in AssetDatabase.LoadAllAssetsAtPath(AssetDatabase.GUIDToAssetPath(g)))
                    if (o is AnimationClip c && !c.name.StartsWith("__preview") && c.name.Equals(name, StringComparison.OrdinalIgnoreCase)) return c;
            return null;
        }
    }
}
