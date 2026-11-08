using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Hand-keyed, pose-to-pose humanoid clips from a pose sheet (Director/library/poses/&lt;name&gt;.json) in Unity's own muscle space, so the native path
    /// (Unity's Animator, Timeline) plays exactly what was keyed. `mv call posederive '{"sheet":"zg_neutral"}'` writes
    /// Assets/MusicVideo/Motion/Keyed/&lt;name&gt;.anim (and &lt;name&gt;_&lt;variant&gt;.anim per variant). Same sheet, same clip: nothing reads the clock or a random seed.
    ///
    /// A pose is any subset of the 95 muscles (HumanTrait.MuscleName, or the clip's own names such as "LeftHand.Index.1 Stretched"), seeded from a frame of
    /// any clip (`from`), another pose, or the sheet's `seed`; `add` offsets on top; `fingers` per hand or per finger (curl 0 flat .. 1 fist, spread);
    /// `root` {pos metres, rot degrees}; `mirror`. A key is {t, pose, interp: step|ease|linear|in|out|overshoot, hold, overshoot, settle, step: 2|3 (on 2s/3s
    /// at `stepFps`, sampled and held), muscles, add, root}. `interp` is how the move ARRIVES at the key (as `keys` on the legacy path): `step` holds the
    /// previous pose and snaps at t; `overshoot` swings past by `overshoot` of the travel and settles over `settle` s. `cycles` add slow sines (breath,
    /// float) on top; `over` makes the sheet additive (poses are offsets on a playing base clip). See AGENTS.md "Keyed poses".
    /// </summary>
    public static class PoseDerive
    {
        public const string OutDir = "Assets/MusicVideo/Motion/Keyed";
        public static string SheetDir => Path.Combine(Bridge.Root, "library", "poses");
        const float DefaultHz = 60;

        // ---------------- muscles ----------------

        static string[] _prop; static Dictionary<string, int> _index;
        static readonly string[] Fingers = { "Thumb", "Index", "Middle", "Ring", "Little" };

        /// <summary>The binding property name a humanoid clip uses for muscle i: body muscles as HumanTrait names them, fingers as "LeftHand.Index.1 Stretched".</summary>
        public static string Prop(int i)
        {
            if (_prop == null)
            {
                var n = HumanTrait.MuscleName; _prop = new string[n.Length];
                for (int k = 0; k < n.Length; k++)
                {
                    string s = n[k], p = s;
                    foreach (var side in new[] { "Left", "Right" })
                        foreach (var f in Fingers)
                            if (s.StartsWith(side + " " + f + " ")) p = side + "Hand." + f + "." + s.Substring(side.Length + f.Length + 2);
                    _prop[k] = p;
                }
            }
            return _prop[i];
        }

        public static int Count => HumanTrait.MuscleCount;

        /// <summary>Muscle index by any of its names (HumanTrait or clip property), case and punctuation forgiving; -1 if none.</summary>
        public static int Index(string name)
        {
            if (_index == null)
            {
                _index = new Dictionary<string, int>();
                for (int i = 0; i < Count; i++) { _index[Norm(HumanTrait.MuscleName[i])] = i; _index[Norm(Prop(i))] = i; }
            }
            return _index.TryGetValue(Norm(name), out var j) ? j : -1;
        }
        static string Norm(string s) => new string(s.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

        static string Suggest(string name)
        {
            var k = Norm(name);
            var best = Enumerable.Range(0, Count).Select(i => HumanTrait.MuscleName[i]).OrderBy(n => Lev(Norm(n), k)).Take(3);
            return string.Join(", ", best);
        }
        static int Lev(string a, string b)
        {
            var d = new int[a.Length + 1, b.Length + 1];
            for (int i = 0; i <= a.Length; i++) d[i, 0] = i; for (int j = 0; j <= b.Length; j++) d[0, j] = j;
            for (int i = 1; i <= a.Length; i++) for (int j = 1; j <= b.Length; j++) d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1), d[i - 1, j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
            return d[a.Length, b.Length];
        }

        /// <summary>The muscle a mirror reads from (Left/Right swapped) and whether its sign flips (a midline Left-Right or twist muscle, the jaw).</summary>
        static int[] _mirFrom; static bool[] _mirNeg;
        static void MirrorTables()
        {
            if (_mirFrom != null) return;
            _mirFrom = new int[Count]; _mirNeg = new bool[Count];
            for (int i = 0; i < Count; i++)
            {
                string n = HumanTrait.MuscleName[i];
                if (n.StartsWith("Left ")) _mirFrom[i] = Index("Right " + n.Substring(5));
                else if (n.StartsWith("Right ")) _mirFrom[i] = Index("Left " + n.Substring(6));
                else { _mirFrom[i] = i; _mirNeg[i] = n.Contains("Left-Right"); }
                if (_mirFrom[i] < 0) _mirFrom[i] = i;
            }
        }

        // ---------------- poses ----------------

        public class P
        {
            public float[] m = new float[HumanTrait.MuscleCount];
            public Vector3 rt; public Quaternion rq = Quaternion.identity;
            public P Copy() { var o = new P { rt = rt, rq = rq }; Array.Copy(m, o.m, m.Length); return o; }
        }

        static P Mirror(P a)
        {
            MirrorTables(); var o = new P { rt = new Vector3(-a.rt.x, a.rt.y, a.rt.z), rq = new Quaternion(a.rq.x, -a.rq.y, -a.rq.z, a.rq.w) };
            for (int i = 0; i < Count; i++) o.m[i] = _mirNeg[i] ? -a.m[_mirFrom[i]] : a.m[_mirFrom[i]];
            return o;
        }

        public static AnimationClip FindClip(string name)
        {
            var keyed = AssetDatabase.LoadAssetAtPath<AnimationClip>(OutDir + "/" + name + ".anim"); if (keyed) return keyed;
            return MVClipClean.CleanOf(name) ?? MotionLab.FindAny(name);
        }

        class Curves { public AnimationCurve[] m; public AnimationCurve[] rt = new AnimationCurve[3]; public AnimationCurve[] rq = new AnimationCurve[4]; public float len; public bool loop; }
        static readonly Dictionary<AnimationClip, Curves> _curves = new Dictionary<AnimationClip, Curves>();
        static Curves CurvesOf(AnimationClip c)
        {
            if (_curves.TryGetValue(c, out var cv)) return cv;
            cv = new Curves { m = new AnimationCurve[Count], len = c.length, loop = c.isLooping };
            var byProp = AnimationUtility.GetCurveBindings(c).Where(b => b.type == typeof(Animator) && b.path == "").ToDictionary(b => b.propertyName, b => b);
            AnimationCurve Get(string p) => byProp.TryGetValue(p, out var b) ? AnimationUtility.GetEditorCurve(c, b) : null;
            for (int i = 0; i < Count; i++) cv.m[i] = Get(Prop(i));
            for (int k = 0; k < 3; k++) cv.rt[k] = Get("RootT." + "xyz"[k]);
            for (int k = 0; k < 4; k++) cv.rq[k] = Get("RootQ." + "xyzw"[k]);
            return _curves[c] = cv;
        }

        /// <summary>One frame of a humanoid clip as a pose: every muscle, the body position and rotation. `t` in seconds (a looping read wraps when `loop`).</summary>
        public static P Frame(AnimationClip c, float t, bool wrap = false)
        {
            var cv = CurvesOf(c); var o = new P();
            if (wrap && cv.len > 1e-4f) { t %= cv.len; if (t < 0) t += cv.len; }
            t = Mathf.Clamp(t, 0, cv.len);
            for (int i = 0; i < Count; i++) o.m[i] = cv.m[i] != null ? cv.m[i].Evaluate(t) : 0;
            o.rt = new Vector3(cv.rt[0]?.Evaluate(t) ?? 0, cv.rt[1]?.Evaluate(t) ?? 1, cv.rt[2]?.Evaluate(t) ?? 0);
            var q = new Quaternion(cv.rq[0]?.Evaluate(t) ?? 0, cv.rq[1]?.Evaluate(t) ?? 0, cv.rq[2]?.Evaluate(t) ?? 0, cv.rq[3]?.Evaluate(t) ?? 1);
            o.rq = q.x == 0 && q.y == 0 && q.z == 0 && q.w == 0 ? Quaternion.identity : q.normalized;
            return o;
        }

        // ---------------- the sheet ----------------

        internal class Key
        {
            public double t, hold, settle, overshoot; public string interp; public int step; public P pose; public string name;
            public double segStart;   // when the move into this key begins (the previous key plus its hold)
        }
        internal class Cycle { public double period, phase; public float[] amp = new float[HumanTrait.MuscleCount]; public Vector3 pos, rot; }

        public class Sheet
        {
            public string name, file; public JObject j; public float hz; public bool loop; public double length; public int step; public double stepFps;
            public bool mirror, additive; public AnimationClip over, seedClip; public double overFrom, overSpeed = 1; public bool overLoop;
            public float humanScale = 1; public AnimationClip settingsFrom;
            internal List<Key> keys = new List<Key>(); internal List<Cycle> cycles = new List<Cycle>();
            public Dictionary<string, P> poses = new Dictionary<string, P>();
            public List<string> warn = new List<string>();
        }

        static JObject Merge(JObject a, JObject b)
        {
            var o = (JObject)a.DeepClone();
            foreach (var kv in b)
            {
                if (kv.Value.Type == JTokenType.Null) o.Remove(kv.Key);
                else if (kv.Value is JObject bo && o[kv.Key] is JObject ao) o[kv.Key] = Merge(ao, bo);
                else o[kv.Key] = kv.Value.DeepClone();
            }
            return o;
        }

        public static string SheetPath(string s)
        {
            if (File.Exists(s)) return Path.GetFullPath(s);
            var p = Path.Combine(SheetDir, s.EndsWith(".json") ? s : s + ".json"); if (File.Exists(p)) return p;
            p = Path.Combine(Bridge.Root, s); if (File.Exists(p)) return p;
            throw new Exception("no pose sheet " + s + " (looked in " + SheetDir + ")");
        }

        public static JObject LoadJson(string s, int depth = 0)
        {
            var path = SheetPath(s);
            var j = JObject.Parse(File.ReadAllText(path), new JsonLoadSettings { CommentHandling = CommentHandling.Ignore });
            j["__file"] = path;
            if (j["inherit"] != null && depth < 6) { var b = LoadJson((string)j["inherit"], depth + 1); j.Remove("inherit"); j = Merge(b, j); j["__file"] = path; }
            return j;
        }

        static double Sec(JToken v, double d = 0)
        {
            if (v == null || v.Type == JTokenType.Null) return d;
            if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) return (double)v;
            var s = ((string)v).Trim();
            if (s.EndsWith("f")) return double.Parse(s.TrimEnd('f'), CultureInfo.InvariantCulture) / 24.0;   // frames are 24 fps frames, as in the research's timing tables
            return double.Parse(s.TrimEnd('s'), CultureInfo.InvariantCulture);
        }

        static Vector3 V3(JToken v) => v is JArray a && a.Count == 3 ? new Vector3((float)a[0], (float)a[1], (float)a[2]) : Vector3.zero;

        /// <summary>Finger stretch muscle for a curl: 0 flat, 1 a fist. Calibrated on his rig with `call posemuscles '{"fingers":true}'` (see AGENTS.md).</summary>
        public static float CurlToMuscle(float curl) => Mathf.Lerp(FingerFlat, -1f, Mathf.Clamp(curl, 0, 1.2f));
        public static float FingerFlat = 1f;

        static void ApplyMuscles(Sheet sh, P p, JObject m, bool add, string where)
        {
            if (m == null) return;
            foreach (var kv in m)
            {
                int i = Index(kv.Key);
                if (i < 0) throw new Exception($"{where}: no muscle '{kv.Key}'. Did you mean: {Suggest(kv.Key)}?");
                float v = (float)kv.Value;
                p.m[i] = add ? p.m[i] + v : v;
            }
        }

        static void ApplyFingers(Sheet sh, P p, JObject f, string where)
        {
            if (f == null) return;
            // "left"/"right"/"both" first, then single fingers ("left.index"), so a finger beats its hand
            foreach (var kv in f.Properties().OrderBy(x => x.Name.Contains(".") ? 1 : 0))
            {
                var parts = kv.Name.ToLowerInvariant().Split('.');
                var sides = parts[0] == "both" ? new[] { "Left", "Right" } : parts[0] == "left" ? new[] { "Left" } : parts[0] == "right" ? new[] { "Right" } : null;
                if (sides == null) throw new Exception($"{where}: fingers key '{kv.Name}' must be left, right, both, or left.index etc.");
                var fingers = parts.Length > 1 ? Fingers.Where(x => x.ToLowerInvariant() == parts[1] || (parts[1] == "pinky" && x == "Little")).ToArray() : Fingers;
                if (fingers.Length == 0) throw new Exception($"{where}: no finger '{parts[1]}' (thumb index middle ring little)");
                float? curl = null, spread = null; float[] joints = null;
                if (kv.Value.Type == JTokenType.Float || kv.Value.Type == JTokenType.Integer) curl = (float)kv.Value;
                else if (kv.Value is JObject o)
                {
                    curl = (float?)o["curl"]; spread = (float?)o["spread"];
                    if (o["joints"] is JArray ja) joints = ja.Select(x => (float)x).ToArray();   // curl per joint, 1..3
                }
                foreach (var s in sides)
                    foreach (var fn in fingers)
                    {
                        for (int jn = 1; jn <= 3; jn++)
                        {
                            float? c = joints != null && joints.Length >= jn ? joints[jn - 1] : curl;
                            if (c == null) continue;
                            int i = Index($"{s} {fn} {jn} Stretched"); if (i >= 0) p.m[i] = CurlToMuscle(c.Value);
                        }
                        if (spread != null) { int i = Index($"{s} {fn} Spread"); if (i >= 0) p.m[i] = spread.Value; }
                    }
            }
        }

        static void ApplyRoot(Sheet sh, P p, JObject r)
        {
            if (r == null) return;
            if (r["pos"] != null) p.rt += V3(r["pos"]) / Mathf.Max(sh.humanScale, 1e-3f);
            if (r["rot"] != null) p.rq = Quaternion.Euler(V3(r["rot"])) * p.rq;
        }

        static P Seed(Sheet sh) => sh.additive ? new P() : Frame(sh.seedClip, (float)Sec(sh.j["seed"]?["t"]));

        static P ResolvePose(Sheet sh, string name, JObject poses, HashSet<string> busy)
        {
            if (sh.poses.TryGetValue(name, out var done)) return done;
            if (!(poses?[name] is JObject d)) throw new Exception($"no pose '{name}' in the sheet (have: {string.Join(", ", poses?.Properties().Select(x => x.Name) ?? new string[0])})");
            if (!busy.Add(name)) throw new Exception("pose '" + name + "' builds on itself");
            var p = BuildPose(sh, d, poses, busy, "pose " + name);
            sh.poses[name] = p; busy.Remove(name);
            return p;
        }

        static P BuildPose(Sheet sh, JObject d, JObject poses, HashSet<string> busy, string where)
        {
            P p;
            var from = d["from"];
            if (from == null) p = Seed(sh);
            else if (from.Type == JTokenType.String) p = ResolvePose(sh, (string)from, poses, busy).Copy();
            else if (from is JObject fo)
            {
                var c = FindClip((string)fo["clip"]); if (!c) throw new Exception($"{where}: no clip '{fo["clip"]}'");
                if (!c.humanMotion) throw new Exception($"{where}: '{fo["clip"]}' is not a humanoid clip");
                p = Frame(c, (float)Sec(fo["t"]));
                if (sh.additive) { var zero = Frame(c, (float)Sec(fo["ref"])); for (int i = 0; i < Count; i++) p.m[i] -= zero.m[i]; p.rt = Vector3.zero; p.rq = Quaternion.identity; }
                else if (fo["keepRoot"] == null || (bool)fo["keepRoot"] == false) { var s = Seed(sh); p.rt = s.rt; p.rq = s.rq; }   // the body stays where the seed has it: a frame from a walk doesn't carry its travel
            }
            else throw new Exception($"{where}: 'from' is a pose name or {{\"clip\":..,\"t\":..}}");
            if ((bool?)d["mirror"] == true) p = Mirror(p);
            ApplyMuscles(sh, p, d["muscles"] as JObject, false, where);
            ApplyMuscles(sh, p, d["add"] as JObject, true, where);
            ApplyFingers(sh, p, d["fingers"] as JObject, where);
            ApplyRoot(sh, p, d["root"] as JObject);
            return p;
        }

        public static Sheet Parse(JObject j, string variant = null)
        {
            if (variant != null)
            {
                if (!(j["variants"]?[variant] is JObject patch)) throw new Exception("no variant '" + variant + "'");
                j = Merge(j, patch); j.Remove("variants");
            }
            var sh = new Sheet { j = j, file = (string)j["__file"] };
            sh.name = ((string)j["name"] ?? Path.GetFileNameWithoutExtension(sh.file)) + (variant != null ? "_" + variant : "");
            sh.hz = (float?)j["fps"] ?? DefaultHz; sh.loop = (bool?)j["loop"] ?? false; sh.mirror = (bool?)j["mirror"] ?? false;
            sh.step = (int?)j["step"] ?? 0; sh.stepFps = (double?)j["stepFps"] ?? 24;
            if (j["over"] is JObject ov)
            {
                sh.additive = true; sh.over = FindClip((string)ov["clip"]); if (!sh.over) throw new Exception("over: no clip " + ov["clip"]);
                sh.overFrom = Sec(ov["from"]); sh.overSpeed = (double?)ov["speed"] ?? 1; sh.overLoop = (bool?)ov["loop"] ?? sh.over.isLooping;
                sh.settingsFrom = sh.over;
            }
            var seedName = (string)j["seed"]?["clip"] ?? "mx_breathing_idle";
            sh.seedClip = FindClip(seedName); if (!sh.seedClip) throw new Exception("seed: no clip " + seedName);
            if (!sh.seedClip.humanMotion) throw new Exception("seed: " + seedName + " is not a humanoid clip");
            if (!sh.settingsFrom) sh.settingsFrom = sh.seedClip;
            var person = MVActor.Named("person"); var an = person && person.animRoot ? person.animRoot.GetComponentInChildren<Animator>(true) : null;
            sh.humanScale = an && an.avatar && an.avatar.isHuman ? (an.humanScale > 0 ? an.humanScale : 1) : 1;

            var poses = j["poses"] as JObject ?? new JObject();
            var keys = j["keys"] as JArray; if (keys == null || keys.Count == 0) throw new Exception("a sheet needs keys");
            var constAdd = j["add"] as JObject; var constFingers = j["fingers"] as JObject;
            int ki = 0;
            foreach (var kt in keys.OfType<JObject>().OrderBy(k => Sec(k["t"])))
            {
                var k = new Key { t = Sec(kt["t"]), hold = Sec(kt["hold"]), interp = (string)kt["interp"] ?? "ease", step = (int?)kt["step"] ?? 0, overshoot = (double?)kt["overshoot"] ?? 0, settle = Sec(kt["settle"]) };
                if (k.interp == "overshoot") { if (kt["overshoot"] == null) k.overshoot = .1; if (kt["settle"] == null) k.settle = .3; }
                if (k.overshoot > 0 && k.settle <= 0) k.settle = .3;
                if (!new[] { "step", "ease", "inout", "linear", "in", "out", "overshoot", "snap" }.Contains(k.interp)) throw new Exception($"key {ki}: interp '{k.interp}' is step, ease, linear, in, out or overshoot");
                var name = (string)kt["pose"]; k.name = name ?? ("key" + ki);
                P p = name != null ? ResolvePose(sh, name, poses, new HashSet<string>()).Copy() : (sh.keys.Count > 0 ? sh.keys[sh.keys.Count - 1].pose.Copy() : Seed(sh));
                if ((bool?)kt["mirror"] == true) p = Mirror(p);
                ApplyMuscles(sh, p, kt["muscles"] as JObject, false, "key " + ki);
                ApplyMuscles(sh, p, kt["add"] as JObject, true, "key " + ki);
                ApplyFingers(sh, p, kt["fingers"] as JObject, "key " + ki);
                ApplyRoot(sh, p, kt["root"] as JObject);
                ApplyMuscles(sh, p, constAdd, true, "sheet add");
                ApplyFingers(sh, p, constFingers, "sheet fingers");
                ApplyRoot(sh, p, j["root"] as JObject);
                k.pose = p; sh.keys.Add(k); ki++;
            }
            for (int i = 0; i < sh.keys.Count; i++)
            {
                var k = sh.keys[i];
                k.segStart = i == 0 ? k.t : sh.keys[i - 1].t + sh.keys[i - 1].hold;
                if (i > 0 && k.segStart > k.t + 1e-6) { sh.warn.Add($"key {i} ({k.name}) at {k.t:0.###}: the hold of the key before runs past it; the move starts late and snaps"); k.segStart = k.t; }
            }
            sh.length = j["length"] != null ? Sec(j["length"]) : sh.keys[sh.keys.Count - 1].t + sh.keys[sh.keys.Count - 1].hold;
            if (sh.length <= 1e-3) sh.length = 1 / sh.hz;

            double phaseAdd = (double?)j["cyclePhase"] ?? 0, ampScale = (double?)j["cycleScale"] ?? 1;
            foreach (var c in (j["cycles"] as JArray ?? new JArray()).OfType<JObject>())
            {
                var cy = new Cycle { period = Sec(c["period"], 4), phase = ((double?)c["phase"] ?? 0) + phaseAdd };
                var tmp = new P(); ApplyMuscles(sh, tmp, c["muscles"] as JObject, false, "cycle");
                for (int i = 0; i < Count; i++) cy.amp[i] = (float)(tmp.m[i] * ampScale);
                cy.pos = V3(c["root"]?["pos"]) / Mathf.Max(sh.humanScale, 1e-3f) * (float)ampScale; cy.rot = V3(c["root"]?["rot"]) * (float)ampScale;
                if (cy.period <= 1e-3) throw new Exception("a cycle's period must be positive");
                double laps = sh.length / cy.period;
                if (sh.loop && Math.Abs(laps - Math.Round(laps)) > 1e-3) sh.warn.Add($"cycle of {cy.period} s does not divide the loop of {sh.length} s: it will jump at the loop");
                sh.cycles.Add(cy);
            }
            if (sh.loop)
            {
                var a = sh.keys[0].pose; var b = sh.keys[sh.keys.Count - 1].pose; float worst = 0;
                for (int i = 0; i < Count; i++) worst = Mathf.Max(worst, Mathf.Abs(a.m[i] - b.m[i]));
                if (worst > 1e-3f) sh.warn.Add($"loop: the last key differs from the first by up to {worst:0.###} in a muscle: the clip jumps at the loop");
            }
            return sh;
        }

        // ---------------- evaluation ----------------

        static float Shape(string interp, double u, double os)
        {
            float x = Mathf.Clamp01((float)u);
            switch (interp)
            {
                case "linear": return x;
                case "in": return x * x * x;
                case "out": { float q = 1 - x; return 1 - q * q * q; }
                case "overshoot": { float q = 1 - x; return (float)(1 + os) * (1 - q * q * q); }   // fast off, arrives past the mark with no speed, the settle takes it back
                default: return x * x * (3 - 2 * x);
            }
        }
        /// <summary>After an overshoot: 1 at the key, 0 at the end of the settle, slow at both ends, a small dip past the mark on the way.</summary>
        static float Settle(double x) { float k = Mathf.Clamp01((float)x); return (1 - k * k * (3 - 2 * k)) * Mathf.Cos(1.5f * Mathf.PI * k); }

        /// <summary>The time a stepped sample shows, and whether t is inside a stepped window. Global `step` steps everything; a key's `step` steps its move,
        /// its hold and its settle (from the move's start to the next move's start).</summary>
        static double Quant(Sheet sh, double t, out bool stepped)
        {
            stepped = false;
            if (sh.step > 0) { stepped = true; double q = sh.step / sh.stepFps; return Math.Floor(t / q + 1e-7) * q; }
            for (int i = 1; i < sh.keys.Count; i++)
            {
                var k = sh.keys[i]; if (k.step <= 0) continue;
                double ws = k.segStart, we = i + 1 < sh.keys.Count ? sh.keys[i + 1].segStart : sh.length + 1;
                if (t >= ws - 1e-9 && t < we - 1e-9) { stepped = true; double q = k.step / sh.stepFps; return ws + Math.Floor((t - ws) / q + 1e-7) * q; }
            }
            return t;
        }

        static void Accum(P acc, P a, P b, float w)
        {
            for (int i = 0; i < Count; i++) acc.m[i] = a.m[i] + (b.m[i] - a.m[i]) * w;
            acc.rt = a.rt + (b.rt - a.rt) * w; acc.rq = Quaternion.SlerpUnclamped(a.rq, b.rq, w);
        }

        /// <summary>The pose at t, unstepped.</summary>
        static P Raw(Sheet sh, double t)
        {
            var ks = sh.keys; var o = new P();
            if (t <= ks[0].t || ks.Count == 1) { Accum(o, ks[0].pose, ks[0].pose, 0); }
            else
            {
                int k = ks.Count - 1; while (k > 0 && ks[k].segStart > t) k--;
                var cur = ks[k];
                if (k == 0) Accum(o, cur.pose, cur.pose, 0);
                else
                {
                    var prev = ks[k - 1].pose;
                    if (t >= cur.t) Accum(o, cur.pose, cur.pose, 0);
                    else if (cur.interp == "step" || cur.interp == "snap") Accum(o, prev, prev, 0);
                    else Accum(o, prev, cur.pose, Shape(cur.interp, (t - cur.segStart) / Math.Max(cur.t - cur.segStart, 1e-6), cur.overshoot));
                }
            }
            // overshoot tails: each key that overshoots adds its settle on top while it lasts
            for (int k = 1; k < ks.Count; k++)
            {
                var key = ks[k]; if (key.overshoot <= 0 || t < key.t || t > key.t + key.settle) continue;
                float f = (float)key.overshoot * Settle((t - key.t) / key.settle); var a = ks[k - 1].pose; var b = key.pose;
                for (int i = 0; i < Count; i++) o.m[i] += (b.m[i] - a.m[i]) * f;
                o.rt += (b.rt - a.rt) * f; o.rq = o.rq * Quaternion.SlerpUnclamped(Quaternion.identity, Quaternion.Inverse(a.rq) * b.rq, f);
            }
            foreach (var c in sh.cycles)
            {
                float s = Mathf.Sin((float)(2 * Math.PI * (t / c.period + c.phase)));
                for (int i = 0; i < Count; i++) if (c.amp[i] != 0) o.m[i] += c.amp[i] * s;
                o.rt += c.pos * s; if (c.rot != Vector3.zero) o.rq = Quaternion.Euler(c.rot * s) * o.rq;
            }
            if (sh.additive)
            {
                double ct = sh.overFrom + t * sh.overSpeed; var b = Frame(sh.over, (float)ct, sh.overLoop);
                for (int i = 0; i < Count; i++) o.m[i] += b.m[i];
                o.rt = b.rt + o.rt; o.rq = b.rq * o.rq;
            }
            return o;
        }

        static P Eval(Sheet sh, double t)
        {
            var p = Raw(sh, Quant(sh, t, out _));
            if (sh.mirror) p = Mirror(p);
            for (int i = 0; i < Count; i++) p.m[i] = Mathf.Clamp(p.m[i], -1, 1);
            p.rq = p.rq.normalized;
            return p;
        }

        /// <summary>Every time the pose jumps: step keys, the edges of stepped samples, the end of a stepped window. A key goes on each, with the held value before it.</summary>
        static List<double> Jumps(Sheet sh)
        {
            var o = new List<double>();
            foreach (var k in sh.keys.Skip(1)) if (k.interp == "step" || k.interp == "snap") o.Add(k.t);
            if (sh.step > 0) { double q = sh.step / sh.stepFps; for (double x = q; x < sh.length - 1e-6; x += q) o.Add(Math.Round(x, 6)); }
            else
                for (int i = 1; i < sh.keys.Count; i++)
                {
                    var k = sh.keys[i]; if (k.step <= 0) continue;
                    double ws = k.segStart, we = Math.Min(i + 1 < sh.keys.Count ? sh.keys[i + 1].segStart : sh.length, sh.length), q = k.step / sh.stepFps;
                    for (double x = ws + q; x < we - 1e-6; x += q) o.Add(Math.Round(x, 6));
                    if (we < sh.length - 1e-6) o.Add(we);
                }
            return o.Where(x => x > 1e-6 && x < sh.length - 1e-6).Distinct().OrderBy(x => x).ToList();
        }

        // ---------------- writing ----------------

        class Sample { public double t; public P p; public bool stepOut; }

        static List<Sample> Samples(Sheet sh)
        {
            var jumps = Jumps(sh); const double eps = 1.0 / 4000;
            var times = new SortedSet<double>();
            int n = Mathf.Max(1, Mathf.CeilToInt((float)(sh.length * sh.hz) - 1e-4f));
            for (int i = 0; i <= n; i++) times.Add(Math.Round(Math.Min(i / (double)sh.hz, sh.length), 6));
            foreach (var b in jumps) { times.Add(b); times.Add(Math.Round(b - eps, 7)); }
            var list = times.ToList(); var o = new List<Sample>();
            for (int i = 0; i < list.Count; i++)
            {
                double t = list[i]; bool atJumpLeft = jumps.Any(b => Math.Abs(b - eps - t) < 1e-7);
                var s = new Sample { t = t, p = Eval(sh, t) };
                o.Add(s);
            }
            // a span is stepped when its two ends show the same stepped sample, or it is the hair before a jump
            for (int i = 0; i + 1 < o.Count; i++)
            {
                double a = Quant(sh, o[i].t, out bool sa), b = Quant(sh, o[i + 1].t - 1e-7, out bool sb);
                bool beforeJump = jumps.Any(x => Math.Abs(x - o[i + 1].t) < 1e-7);
                o[i].stepOut = beforeJump || (sa && sb && Math.Abs(a - b) < 1e-9);
            }
            // drop samples inside a held stretch: the stepped key before them already holds the value
            var kept = new List<Sample>();
            for (int i = 0; i < o.Count; i++)
            {
                if (i > 0 && i < o.Count - 1 && o[i - 1].stepOut && o[i].stepOut && kept.Count > 0 && kept[kept.Count - 1].stepOut && Same(kept[kept.Count - 1].p, o[i].p)) continue;
                kept.Add(o[i]);
            }
            return kept;
        }
        static bool Same(P a, P b)
        {
            for (int i = 0; i < Count; i++) if (a.m[i] != b.m[i]) return false;
            return a.rt == b.rt && a.rq == b.rq;
        }

        static AnimationCurve Curve(List<Sample> s, Func<P, float> get)
        {
            int n = s.Count; var keys = new Keyframe[n]; var v = s.Select(x => get(x.p)).ToArray();
            for (int i = 0; i < n; i++)
            {
                float? L = i > 0 && !s[i - 1].stepOut ? (v[i] - v[i - 1]) / (float)Math.Max(s[i].t - s[i - 1].t, 1e-6) : (float?)null;
                float? R = i + 1 < n && !s[i].stepOut ? (v[i + 1] - v[i]) / (float)Math.Max(s[i + 1].t - s[i].t, 1e-6) : (float?)null;
                float inT = i > 0 && s[i - 1].stepOut ? float.PositiveInfinity : L.HasValue && R.HasValue ? (L.Value + R.Value) * .5f : L ?? R ?? 0;
                float outT = s[i].stepOut ? float.PositiveInfinity : L.HasValue && R.HasValue ? (L.Value + R.Value) * .5f : R ?? L ?? 0;
                keys[i] = new Keyframe((float)s[i].t, v[i], inT, outT);
            }
            var c = new AnimationCurve(keys);
            for (int i = 0; i < n; i++)
            {
                if (s[i].stepOut) AnimationUtility.SetKeyRightTangentMode(c, i, AnimationUtility.TangentMode.Constant);
                if (i > 0 && s[i - 1].stepOut) AnimationUtility.SetKeyLeftTangentMode(c, i, AnimationUtility.TangentMode.Constant);
            }
            return c;
        }

        public static AnimationClip Write(Sheet sh, out JObject info)
        {
            var s = Samples(sh);
            // body rotation curves continuous in sign, so the slerp never takes the long way
            for (int i = 1; i < s.Count; i++) if (Quaternion.Dot(s[i].p.rq, s[i - 1].p.rq) < 0) { var q = s[i].p.rq; s[i].p.rq = new Quaternion(-q.x, -q.y, -q.z, -q.w); }
            var bind = new List<EditorCurveBinding>(); var curves = new List<AnimationCurve>();
            void Add(string prop, Func<P, float> get) { bind.Add(EditorCurveBinding.FloatCurve("", typeof(Animator), prop)); curves.Add(Curve(s, get)); }
            for (int k = 0; k < 3; k++) { int kk = k; Add("RootT." + "xyz"[k], p => p.rt[kk]); }
            for (int k = 0; k < 4; k++) { int kk = k; Add("RootQ." + "xyzw"[k], p => p.rq[kk]); }
            for (int i = 0; i < Count; i++) { int ii = i; Add(Prop(i), p => p.m[ii]); }
            if (!Directory.Exists(OutDir)) Directory.CreateDirectory(OutDir);
            var path = OutDir + "/" + sh.name + ".anim";
            var clip = new AnimationClip { name = sh.name, frameRate = sh.hz };
            AnimationUtility.SetEditorCurves(clip, bind.ToArray(), curves.ToArray());
            var st = AnimationUtility.GetAnimationClipSettings(sh.settingsFrom);
            st.loopTime = sh.loop; st.startTime = 0; st.stopTime = (float)sh.length; st.cycleOffset = 0; st.mirror = false;
            AnimationUtility.SetAnimationClipSettings(clip, st);
            var old = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            AnimationClip result;
            if (old) { EditorUtility.CopySerialized(clip, old); old.name = sh.name; EditorUtility.SetDirty(old); result = old; UnityEngine.Object.DestroyImmediate(clip); }
            else { AssetDatabase.CreateAsset(clip, path); result = clip; }
            _curves.Remove(result);
            info = new JObject
            {
                ["clip"] = sh.name, ["file"] = path, ["length"] = Math.Round(sh.length, 4), ["loop"] = sh.loop, ["keys"] = sh.keys.Count, ["samples"] = s.Count,
                ["stepped"] = s.Count(x => x.stepOut), ["additive"] = sh.additive, ["seed"] = sh.seedClip.name, ["humanScale"] = Math.Round(sh.humanScale, 4),
                ["warnings"] = new JArray(sh.warn.Distinct()),
            };
            return result;
        }

        /// <summary>Each key's resolved muscles (only those that differ from the seed by more than .005, unless all), for posecheck and the record.</summary>
        public static JArray KeyTable(Sheet sh, bool all = false)
        {
            var seed = Seed(sh); var o = new JArray();
            foreach (var k in sh.keys)
            {
                var m = new JObject();
                for (int i = 0; i < Count; i++) if (all || Mathf.Abs(k.pose.m[i] - seed.m[i]) > .005f) m[HumanTrait.MuscleName[i]] = Math.Round(k.pose.m[i], 3);
                o.Add(new JObject { ["name"] = k.name, ["t"] = Math.Round(k.t, 4), ["interp"] = k.interp, ["hold"] = Math.Round(k.hold, 4), ["step"] = k.step, ["show"] = Math.Round(ShowTime(sh, sh.keys.IndexOf(k)), 4), ["muscles"] = m });
            }
            return o;
        }

        /// <summary>When a key's pose is on screen settled: after its settle, inside its hold, before the next move.</summary>
        public static double ShowTime(Sheet sh, int i)
        {
            var k = sh.keys[i]; double t = k.t + Math.Max(k.settle, 0);
            double next = i + 1 < sh.keys.Count ? sh.keys[i + 1].segStart : sh.length;
            if (t > next) t = Math.Max(k.t, next - 1e-3);
            return Math.Min(t, sh.length);
        }

        public static List<string> Variants(JObject j) => (j["variants"] as JObject)?.Properties().Select(p => p.Name).ToList() ?? new List<string>();

        /// <summary>`call posederive '{"sheet":"zg_neutral"}'` writes the clip and every variant's; `"variant":"a"` only that one; `"variants":false` only the base.</summary>
        [BridgeCommand("posederive")]
        static object Run(JObject m)
        {
            var j = LoadJson((string)m["sheet"] ?? throw new Exception("posederive needs a sheet"));
            var outs = new JArray();
            var which = m["variant"] != null ? new List<string> { (string)m["variant"] } : new List<string> { null };
            if (m["variant"] == null && (bool?)m["variants"] != false) which.AddRange(Variants(j));
            foreach (var v in which)
            {
                var sh = Parse(j, v); Write(sh, out var info);
                if ((bool?)m["table"] == true) info["keyTable"] = KeyTable(sh);
                outs.Add(info);
            }
            AssetDatabase.SaveAssets();
            return new JObject { ["clips"] = outs };
        }

        /// <summary>His muscle limits: each muscle's HumanTrait default range in degrees, the Avatar's own range where it overrides it, and the degrees one unit
        /// of muscle is worth each side of 0. `call posemuscles '{"only":"Leg|Foot"}'`.</summary>
        [BridgeCommand("posemuscles")]
        static object Muscles(JObject m)
        {
            var person = MVActor.Named((string)m?["on"] ?? "person"); var an = person && person.animRoot ? person.animRoot.GetComponentInChildren<Animator>(true) : null;
            var desc = an && an.avatar ? an.avatar.humanDescription : default;
            var byBone = new Dictionary<string, HumanLimit>(); if (desc.human != null) foreach (var hb in desc.human) byBone[hb.humanName] = hb.limit;
            var rx = m?["only"] != null ? new System.Text.RegularExpressions.Regex((string)m["only"], System.Text.RegularExpressions.RegexOptions.IgnoreCase) : null;
            var rows = new JArray();
            for (int i = 0; i < Count; i++)
            {
                var n = HumanTrait.MuscleName[i]; if (rx != null && !rx.IsMatch(n)) continue;
                int bone = HumanTrait.BoneFromMuscle(i); string boneName = HumanTrait.BoneName[bone];
                int dof = -1; for (int d = 0; d < 3; d++) if (HumanTrait.MuscleFromBone(bone, d) == i) dof = d;
                float dmin = HumanTrait.GetMuscleDefaultMin(i), dmax = HumanTrait.GetMuscleDefaultMax(i);
                var r = new JObject { ["muscle"] = n, ["prop"] = Prop(i), ["bone"] = boneName, ["axis"] = dof, ["defaultMin"] = dmin, ["defaultMax"] = dmax };
                if (byBone.TryGetValue(boneName, out var lim) && !lim.useDefaultValues && dof >= 0) { r["avatarMin"] = lim.min[dof]; r["avatarMax"] = lim.max[dof]; r["avatarCenter"] = lim.center[dof]; }
                float mn = r["avatarMin"] != null ? (float)r["avatarMin"] : dmin, mx = r["avatarMax"] != null ? (float)r["avatarMax"] : dmax;
                r["degPerUnitNeg"] = Math.Round(-mn, 2); r["degPerUnitPos"] = Math.Round(mx, 2);
                rows.Add(r);
            }
            return new JObject { ["humanScale"] = an ? an.humanScale : 0, ["avatar"] = an && an.avatar ? an.avatar.name : null, ["muscles"] = rows };
        }
    }
}
