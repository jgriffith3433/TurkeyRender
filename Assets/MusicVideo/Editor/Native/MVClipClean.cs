using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// The bake moved from takes to clips: each humanoid source clip is cleaned once, in Unity's own muscle space, and every video plays the result
    /// (Assets/MusicVideo/Motion/Clean/&lt;name&gt;.anim, a humanoid clip). Quaternion curves made continuous, one- and two-frame spikes (the 180 degree
    /// flips) taken out, a Savitzky-Golay pass on the jitter band only (it keeps peaks, so hand and foot speeds stay), muscles held inside their
    /// ranges (-1..1 is the Avatar's joint range), and on in-place clips where Foot IK doesn't flip a knee the foot goals held still through each
    /// contact, played with Foot IK. Each clean clip is measured against its source on the person's rig. `mv call cleanclips '{"prefix":"mx_"}'`.
    /// `call clipderive` makes a new clip from one with muscle offsets keyed over time (a knee kick on a sit).
    /// </summary>
    public static class MVClipClean
    {
        public const string CleanDir = "Assets/MusicVideo/Motion/Clean";
        public const string Suffix = "__clean";   // never the source's own name, so a lookup by name on the old path still finds the source
        const float Hz = 60;

        public static AnimationClip CleanOf(string name) => (bool?)MVClipImport.Choices["clips"]?[name]?["clean"]?["use"] == false ? null : AssetDatabase.LoadAssetAtPath<AnimationClip>(CleanDir + "/" + name + Suffix + ".anim");
        public static bool CleanFootIK(string name) => (bool?)MVClipImport.Choices["clips"]?[name]?["clean"]?["footIK"] == true;

        class Chan { public EditorCurveBinding b; public float[] v; }

        static List<Chan> Read(AnimationClip src, int n)
        {
            var o = new List<Chan>();
            foreach (var b in AnimationUtility.GetCurveBindings(src))
            {
                var c = AnimationUtility.GetEditorCurve(src, b); if (c == null) continue;
                var v = new float[n]; for (int i = 0; i < n; i++) v[i] = c.Evaluate(Mathf.Min(i / Hz, src.length));
                o.Add(new Chan { b = b, v = v });
            }
            return o;
        }

        static void Continuous(List<Chan> ch)
        {
            foreach (var g in ch.Where(c => c.b.propertyName.EndsWith("Q.x")).Select(c => c.b.propertyName.Substring(0, c.b.propertyName.Length - 2)).ToList())
            {
                var q = new[] { "x", "y", "z", "w" }.Select(a => ch.FirstOrDefault(c => c.b.propertyName == g + "." + a)).ToArray(); if (q.Any(c => c == null)) continue;
                for (int i = 1; i < q[0].v.Length; i++)
                {
                    float d = 0; for (int k = 0; k < 4; k++) d += q[k].v[i] * q[k].v[i - 1];
                    if (d < 0) for (int k = 0; k < 4; k++) q[k].v[i] = -q[k].v[i];
                }
            }
        }

        /// <summary>A value that leaves its neighbours for one or two frames and comes back is a glitch, not motion.</summary>
        static int Despike(float[] v)
        {
            int n = v.Length, fixedN = 0; if (n < 5) return 0;
            var d = new float[n - 1]; for (int i = 0; i + 1 < n; i++) d[i] = Mathf.Abs(v[i + 1] - v[i]);
            var s = d.OrderBy(x => x).ToArray(); float med = s[s.Length / 2], thr = Mathf.Max(med * 8, .12f);
            for (int w = 1; w <= 2; w++)
                for (int i = 1; i + w < n; i++)
                {
                    float a = v[i - 1], b = v[i + w], jump = 0;
                    for (int k = 0; k < w; k++) jump = Mathf.Max(jump, Mathf.Abs(v[i + k] - Mathf.Lerp(a, b, (k + 1f) / (w + 1))));
                    if (jump > thr && Mathf.Abs(b - a) < thr * .5f)
                    {
                        for (int k = 0; k < w; k++) v[i + k] = Mathf.Lerp(a, b, (k + 1f) / (w + 1));
                        fixedN++;
                    }
                }
            return fixedN;
        }

        static readonly float[] SG7 = { -2, 3, 6, 7, 6, 3, -2 };   // quadratic Savitzky-Golay, 7 taps at 60 Hz: passes a hit's peak, takes the frame-to-frame buzz
        static void Smooth(float[] v)
        {
            int n = v.Length; if (n < 7) return; var o = (float[])v.Clone();
            for (int i = 3; i < n - 3; i++) { float s = 0; for (int k = -3; k <= 3; k++) s += SG7[k + 3] * v[i + k]; o[i] = s / 21f; }
            Array.Copy(o, v, n);
        }

        static AnimationCurve Curve(float[] v)
        {
            var keys = new Keyframe[v.Length];
            for (int i = 0; i < v.Length; i++)
            {
                float t = (v[Mathf.Min(i + 1, v.Length - 1)] - v[Mathf.Max(i - 1, 0)]) / ((Mathf.Min(i + 1, v.Length - 1) - Mathf.Max(i - 1, 0)) / Hz + 1e-6f);
                keys[i] = new Keyframe(i / Hz, v[i], t, t);
            }
            return new AnimationCurve(keys);
        }

        static AnimationClip Write(AnimationClip src, List<Chan> ch, string name, bool? loop = null)
        {
            if (!Directory.Exists(CleanDir)) Directory.CreateDirectory(CleanDir);
            var path = CleanDir + "/" + name + ".anim";
            var clip = new AnimationClip { name = name, frameRate = Hz };
            AnimationUtility.SetEditorCurves(clip, ch.Select(c => c.b).ToArray(), ch.Select(c => Curve(c.v)).ToArray());
            var st = AnimationUtility.GetAnimationClipSettings(src); if (loop.HasValue) st.loopTime = loop.Value;
            AnimationUtility.SetAnimationClipSettings(clip, st);
            var old = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            if (old) { EditorUtility.CopySerialized(clip, old); old.name = name; EditorUtility.SetDirty(old); return old; }
            AssetDatabase.CreateAsset(clip, path); return clip;
        }

        // ---- measuring on the rig ----

        class Take { public Quaternion[][] q; public Vector3[][] p; }
        static readonly HumanBodyBones[] Ends = { HumanBodyBones.LeftHand, HumanBodyBones.RightHand, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot };

        static Take Play(GameObject src, AnimationClip clip, bool ik, int n)
        {
            var go = UnityEngine.Object.Instantiate(src); go.hideFlags = HideFlags.DontSave; go.transform.position = new Vector3(950, 0, 950);
            var an = go.GetComponentInChildren<Animator>(true); an.enabled = true; an.applyRootMotion = false; an.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var bones = Enumerable.Range(0, (int)HumanBodyBones.LastBone).Select(i => an.GetBoneTransform((HumanBodyBones)i)).ToArray();
            var g = PlayableGraph.Create("clean"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
            var t = new Take { q = new Quaternion[n][], p = new Vector3[n][] };
            try
            {
                var p = AnimationClipPlayable.Create(g, clip); p.SetApplyFootIK(ik);
                AnimationPlayableOutput.Create(g, "o", an).SetSourcePlayable(p);
                for (int f = 0; f < n; f++)
                {
                    p.SetTime(Mathf.Min(f / Hz, clip.length - 1 / Hz)); g.Evaluate(0);
                    t.q[f] = bones.Select(b => b ? b.localRotation : Quaternion.identity).ToArray();
                    t.p[f] = Ends.Select(b => go.transform.InverseTransformPoint(an.GetBoneTransform(b).position)).Append(go.transform.InverseTransformPoint(an.GetBoneTransform(HumanBodyBones.Hips).position)).ToArray();
                }
            }
            finally { g.Destroy(); UnityEngine.Object.DestroyImmediate(go); }
            return t;
        }

        static JObject Numbers(Take t)
        {
            int n = t.q.Length; var jit = new List<float>(); int snaps = 0;
            for (int b = 0; b < t.q[0].Length; b++)
            {
                bool finger = b >= (int)HumanBodyBones.LeftThumbProximal && b <= (int)HumanBodyBones.RightLittleDistal;
                for (int f = 1; f < n; f++)
                {
                    if (Quaternion.Angle(t.q[f][b], t.q[f - 1][b]) > 8) snaps++;
                    if (!finger && f < n - 1) jit.Add(Quaternion.Angle(t.q[f + 1][b] * Quaternion.Inverse(t.q[f][b]), t.q[f][b] * Quaternion.Inverse(t.q[f - 1][b])));
                }
            }
            jit.Sort();
            float slide = 0;
            for (int s = 2; s < 4; s++)
            {
                float low = t.p.Min(x => x[s].y);
                for (int f = 1; f < n; f++) if (t.p[f][s].y < low + .03f && t.p[f - 1][s].y < low + .03f) { var d = t.p[f][s] - t.p[f - 1][s]; d.y = 0; slide += d.magnitude; }
            }
            float peak = 0;   // fastest hand or foot, against the hips, m/s
            for (int f = 1; f < n; f++) for (int s = 0; s < 4; s++) peak = Mathf.Max(peak, ((t.p[f][s] - t.p[f][4]) - (t.p[f - 1][s] - t.p[f - 1][4])).magnitude * Hz);
            return new JObject { ["jitterP99"] = Math.Round(jit.Count > 0 ? jit[(int)(.99f * (jit.Count - 1))] : 0, 3), ["jitterMax"] = Math.Round(jit.Count > 0 ? jit[jit.Count - 1] : 0, 2), ["snaps"] = snaps, ["footSlideCmPerS"] = Math.Round(slide * 100 / (n / Hz), 1), ["peakEndSpeed"] = Math.Round(peak, 2) };
        }

        // ---- feet ----

        /// <summary>Holds each foot still in the world while it is down. A humanoid clip keeps a foot's IK goal in the frame of its body (RootT, RootQ), so the goal is
        /// carried to that frame, held there through the contact (low, within 2.5 cm of its lowest, and slower than 0.35 m/s), and carried back.</summary>
        static int LockFeet(List<Chan> ch)
        {
            Chan C(string p) => ch.FirstOrDefault(c => c.b.propertyName == p);
            var RT = new[] { "x", "y", "z" }.Select(a => C("RootT." + a)).ToArray(); var RQ = new[] { "x", "y", "z", "w" }.Select(a => C("RootQ." + a)).ToArray();
            if (RT.Any(c => c == null) || RQ.Any(c => c == null)) return 0;
            int locks = 0, n = RT[0].v.Length;
            Vector3 Rt(int i) => new Vector3(RT[0].v[i], RT[1].v[i], RT[2].v[i]);
            Quaternion Rq(int i) => new Quaternion(RQ[0].v[i], RQ[1].v[i], RQ[2].v[i], RQ[3].v[i]).normalized;
            foreach (var side in new[] { "LeftFoot", "RightFoot" })
            {
                var T = new[] { "x", "y", "z" }.Select(a => C(side + "T." + a)).ToArray(); if (T.Any(c => c == null)) continue;
                var w = new Vector3[n]; for (int i = 0; i < n; i++) w[i] = Rt(i) + Rq(i) * new Vector3(T[0].v[i], T[1].v[i], T[2].v[i]);
                float low = w.Min(x => x.y);
                bool Down(int i) { if (w[i].y > low + .025f) return false; int j = Mathf.Max(i - 1, 0), k = Mathf.Min(i + 1, n - 1); var d = w[k] - w[j]; d.y = 0; return d.magnitude * Hz / Mathf.Max(k - j, 1) < .35f; }
                var o = (Vector3[])w.Clone();
                for (int i = 0; i < n;)
                {
                    if (!Down(i)) { i++; continue; }
                    int e = i; while (e + 1 < n && Down(e + 1)) e++;
                    if (e - i >= 3)
                    {
                        var hold = w[i]; for (int f = i; f <= e; f++) hold.y = Mathf.Min(hold.y, w[f].y);   // where it landed, not an average of a slide
                        const int ease = 3;
                        for (int f = Mathf.Max(0, i - ease); f <= Mathf.Min(n - 1, e + ease); f++)
                        {
                            float k = f < i ? 1 - (i - f) / (ease + 1f) : f > e ? 1 - (f - e) / (ease + 1f) : 1;
                            o[f] = Vector3.Lerp(w[f], hold, k * k * (3 - 2 * k));
                        }
                        locks++;
                    }
                    i = e + 1;
                }
                for (int i = 0; i < n; i++) { var g = Quaternion.Inverse(Rq(i)) * (o[i] - Rt(i)); T[0].v[i] = g.x; T[1].v[i] = g.y; T[2].v[i] = g.z; }
            }
            return locks;
        }

        static void NormalizeQ(List<Chan> ch)
        {
            foreach (var g in ch.Where(c => c.b.propertyName.EndsWith("Q.x")).Select(c => c.b.propertyName.Substring(0, c.b.propertyName.Length - 2)).ToList())
            {
                var q = new[] { "x", "y", "z", "w" }.Select(a => ch.FirstOrDefault(c => c.b.propertyName == g + "." + a)).ToArray(); if (q.Any(c => c == null)) continue;
                for (int i = 0; i < q[0].v.Length; i++) { float m = Mathf.Sqrt(q.Sum(c => c.v[i] * c.v[i])); if (m > 1e-6f) foreach (var c in q) c.v[i] /= m; }
            }
        }

        [BridgeCommand("cleanclips")]
        static object Clean(JObject m)
        {
            string prefix = (string)m?["prefix"]; var only = (m?["only"] as JArray)?.Select(x => ((string)x).ToLowerInvariant()).ToHashSet();
            var person = MVActor.Named((string)m?["on"] ?? "person"); if (!person || !person.animRoot) throw new Exception("no person in the open scene");
            var doc = File.Exists(MVClipImport.ChoicesFile) ? JObject.Parse(File.ReadAllText(MVClipImport.ChoicesFile)) : new JObject();
            if (!(doc["clips"] is JObject clips)) doc["clips"] = clips = new JObject();
            var rows = new JArray(); int made = 0;
            foreach (var f in Directory.GetFiles(ScoreCompiler.MotionFolder, "*.fbx"))
            {
                foreach (var src in AssetDatabase.LoadAllAssetsAtPath(f.Replace('\\', '/')).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview")))
                {
                    if (prefix != null && !src.name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;
                    if (only != null && !only.Contains(src.name.ToLowerInvariant())) continue;
                    if (!src.humanMotion) continue;
                    int n = Mathf.Max(2, Mathf.CeilToInt(src.length * Hz) + 1);
                    var ch = Read(src, n); if (ch.Count == 0) { rows.Add(src.name + ": no curves readable"); continue; }
                    Continuous(ch);
                    int spikes = 0;
                    foreach (var c in ch)
                    {
                        string p = c.b.propertyName; bool goal = p.Contains("T.") || p.Contains("Q.");
                        spikes += Despike(c.v);
                        if (!p.StartsWith("Root")) Smooth(c.v);
                        if (!goal) for (int i = 0; i < n; i++) c.v[i] = Mathf.Clamp(c.v[i], -1, 1);   // a muscle at +-1 is the Avatar's joint limit
                    }
                    NormalizeQ(ch);
                    var rec = clips[src.name] as JObject;
                    bool travelling = (bool?)rec?["travelling"] ?? false, flips = (bool?)rec?["footIKTest"]?["kneeFlip"] ?? true;
                    int locks = !flips && m?["lock"]?.Type != JTokenType.Boolean || (bool?)m?["lock"] == true ? (!flips ? LockFeet(ch) : 0) : 0;
                    bool ik = locks > 0 || MVClipImport.FootIKFor(src.name);
                    var clean = Write(src, ch, src.name + Suffix);
                    made++;
                    var a = Numbers(Play(person.animRoot, src, MVClipImport.FootIKFor(src.name), n)); var b = Numbers(Play(person.animRoot, clean, ik, n));
                    bool Good(JObject x) => (double)x["jitterP99"] <= (double)a["jitterP99"] * 1.05 + .01 && (int)x["snaps"] <= (int)a["snaps"] && (double)x["footSlideCmPerS"] <= (double)a["footSlideCmPerS"] + 1 && Math.Abs((double)x["peakEndSpeed"] / Math.Max((double)a["peakEndSpeed"], 1e-3) - 1) <= .15;
                    string why = flips ? "Foot IK flips a knee: feet not held" : locks > 0 ? "feet held in the world through contacts, played with Foot IK" : "no contact long enough to hold";
                    if (!Good(b) && locks > 0)
                    {
                        // The held feet made it worse: the same clean without them.
                        var bare = Read(src, n); Continuous(bare);
                        foreach (var c in bare) { Despike(c.v); if (!c.b.propertyName.StartsWith("Root")) Smooth(c.v); if (!(c.b.propertyName.Contains("T.") || c.b.propertyName.Contains("Q."))) for (int i = 0; i < n; i++) c.v[i] = Mathf.Clamp(c.v[i], -1, 1); }
                        NormalizeQ(bare);
                        var clean2 = Write(src, bare, src.name + Suffix); var b2 = Numbers(Play(person.animRoot, clean2, MVClipImport.FootIKFor(src.name), n));
                        if (Good(b2) || (double)b2["footSlideCmPerS"] < (double)b["footSlideCmPerS"]) { b = b2; locks = 0; ik = MVClipImport.FootIKFor(src.name); why = "held feet made it worse; cleaned without them"; }
                        else Write(src, ch, src.name + Suffix);
                    }
                    bool use = Good(b);
                    var r = new JObject { ["clip"] = src.name, ["file"] = CleanDir + "/" + src.name + Suffix + ".anim", ["use"] = use, ["spikesRemoved"] = spikes, ["footLocks"] = locks, ["footIK"] = ik, ["why"] = use ? why : why + "; not better than the source on every measure, so the source plays", ["source"] = a, ["clean"] = b, ["peakKept"] = Math.Round((double)b["peakEndSpeed"] / Math.Max((double)a["peakEndSpeed"], 1e-3), 3) };
                    if (rec != null) rec["clean"] = r;
                    rows.Add(r);
                }
            }
            AssetDatabase.SaveAssets();
            File.WriteAllText(MVClipImport.ChoicesFile, doc.ToString()); MVClipImport.Forget();
            var good = rows.OfType<JObject>().ToList();
            double Avg(string side, string key) => good.Count == 0 ? 0 : Math.Round(good.Average(x => (double)x[side][key]), 2);
            return new JObject
            {
                ["made"] = made,
                ["average"] = new JObject { ["jitterP99"] = $"{Avg("source", "jitterP99")} -> {Avg("clean", "jitterP99")}", ["snaps"] = $"{Avg("source", "snaps")} -> {Avg("clean", "snaps")}", ["footSlideCmPerS"] = $"{Avg("source", "footSlideCmPerS")} -> {Avg("clean", "footSlideCmPerS")}", ["peakKept"] = good.Count == 0 ? 0 : Math.Round(good.Average(x => (double)x["peakKept"]), 3) },
                ["rows"] = m?["rows"] != null && (bool)m["rows"] ? new JArray(rows) : new JArray(rows.Take(6)),
            };
        }

        /// <summary>A new clip from one clip's stretch, with muscle offsets keyed over it (seconds into the new clip, eased between keys).
        /// `call clipderive '{"src":"IdleSit13","out":"sit_knee_kick_r","from":0,"len":2,"add":{"Right Lower Leg Stretch":[[0,0],[0.12,0.7],[0.3,-0.1],[0.6,0]]}}'`.</summary>
        [BridgeCommand("clipderive")]
        static object Derive(JObject m)
        {
            var srcName = (string)m["src"]; var src = CleanOf(srcName) ?? MotionLab.FindAny(srcName);   // a derived clip starts from the clean one when it is used if (!src) throw new Exception("no clip " + srcName);
            float from = (float?)m["from"] ?? 0, len = (float?)m["len"] ?? src.length; int n = Mathf.Max(2, Mathf.CeilToInt(len * Hz) + 1);
            var ch = new List<Chan>();
            foreach (var b in AnimationUtility.GetCurveBindings(src))
            {
                var c = AnimationUtility.GetEditorCurve(src, b); if (c == null) continue;
                var v = new float[n]; for (int i = 0; i < n; i++) v[i] = c.Evaluate(Mathf.Min(from + i / Hz, src.length));
                ch.Add(new Chan { b = b, v = v });
            }
            var missing = new JArray();
            foreach (var kv in (JObject)m["add"])
            {
                var c = ch.FirstOrDefault(x => x.b.propertyName == kv.Key); if (c == null) { missing.Add(kv.Key); continue; }
                var keys = ((JArray)kv.Value).Select(k => (t: (float)k[0], v: (float)k[1])).OrderBy(k => k.t).ToArray();
                for (int i = 0; i < n; i++)
                {
                    float t = i / Hz, add = keys[keys.Length - 1].v;
                    if (t <= keys[0].t) add = keys[0].v;
                    else for (int j = 0; j + 1 < keys.Length; j++) if (t <= keys[j + 1].t) { add = Mathf.Lerp(keys[j].v, keys[j + 1].v, Ease.Apply("inout", (t - keys[j].t) / Mathf.Max(keys[j + 1].t - keys[j].t, 1e-4f))); break; }
                    c.v[i] = Mathf.Clamp(c.v[i] + add, -1, 1);
                }
            }
            var o = Write(src, ch, (string)m["out"], (bool?)m["loop"] ?? false);
            AssetDatabase.SaveAssets();
            return new JObject { ["clip"] = o.name, ["file"] = CleanDir + "/" + o.name + ".anim", ["length"] = o.length, ["human"] = o.humanMotion, ["missing"] = missing, ["muscles"] = new JArray(ch.Select(c => c.b.propertyName).Where(p => p.Contains("Leg")).Take(12)) };
        }
    }
}
