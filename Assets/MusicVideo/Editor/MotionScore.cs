using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Compiles the performance cues: keys, named poses, captured poses, weight options.</summary>
    public partial class ScoreCompiler
    {
        internal List<Op> _labOps; JObject _poses;
        const double Successive = .035;

        JObject Poses()
        {
            if (_poses != null) return _poses;
            var f = Path.Combine(Bridge.Root, "poses.json");
            return _poses = File.Exists(f) ? JObject.Parse(File.ReadAllText(f)) : new JObject();
        }

        double KeyTime(JToken v, double t)
        {
            if (v == null) return 0;
            if (v.Type == JTokenType.String && ((string)v).Contains(":")) return T(v, t) - t;
            return Dur(v, t, 0);
        }

        /// <summary>Folds a named pose (and what it builds on) into the key, then the key's own bones on top.</summary>
        bool Resolve(JObject k, JObject o, string who, int depth = 0)
        {
            if (k["pose"] != null)
            {
                var name = (string)k["pose"];
                if (!(Poses()[name] is JObject p)) { _warn.Add($"{who}: no pose '{name}' in Director/poses.json"); return false; }
                if (depth > 4 || !Resolve(p, o, who, depth + 1)) return false;
            }
            if (k["from"] != null) o["from"] = k["from"];
            if (k["hips"] != null) o["hips"] = k["hips"];
            if (k["space"] != null) o["space"] = k["space"];
            if (k["bones"] is JObject bs)
            {
                var b = o["bones"] as JObject ?? new JObject();
                foreach (var kv in bs)
                {
                    if (b[kv.Key] is JArray old && kv.Value is JArray add && add.Count == 3)
                        b[kv.Key] = new JArray((float)old[0] + (float)add[0], (float)old[1] + (float)add[1], (float)old[2] + (float)add[2]);
                    else b[kv.Key] = kv.Value;
                }
                o["bones"] = b;
            }
            return true;
        }

        void FromClip(MVActor actor, string name, string spec, JObject o, List<UnityEngine.Object> refs)
        {
            int at = spec.LastIndexOf('@'); string clipName = at >= 0 ? spec.Substring(0, at) : spec, when = at >= 0 ? spec.Substring(at + 1).Trim() : "0";
            var clip = DroppedClip(clipName) ?? actor.FindClip(clipName) ?? ProjectClip(clipName);
            if (!clip) { _warn.Add($"{name}: no clip '{clipName}' on it or in the project. Find it with mv find, then mv pull"); return; }
            int i = refs.IndexOf(clip); if (i < 0) { i = refs.Count; refs.Add(clip); }
            o["clip"] = i;
            if (when.EndsWith("%")) o["cf"] = float.Parse(when.TrimEnd('%'), System.Globalization.CultureInfo.InvariantCulture) / 100;
            else o["ct"] = float.Parse(when.TrimEnd('s'), System.Globalization.CultureInfo.InvariantCulture);
            o.Remove("from");
        }

        /// <summary>True when the cue was a performance cue and has been written.</summary>
        bool MotionCue(string name, MVActor actor, string kind, JObject c, JObject a, double t, double len)
        {
            if (a["successive"] != null) a["successive"] = a["successive"].Type == JTokenType.Boolean ? ((bool)a["successive"] ? Successive : 0) : Dur(a["successive"], t, Successive);
            if (a["settle"] != null) a["settle"] = Dur(a["settle"], t, .4);
            if (PunchCue(name, actor, kind, c, a, t, len)) return true;
            if (kind == "perform") { PerformCue(name, c, t); return true; }
            if (kind == "ragdoll") { RagdollCue(name, c, a, t, len); return true; }
            if (kind == "layer") { LayerCue(name, actor, c, a, t, len); return true; }
            bool wholeBody = kind == "pose" && (c["pose"] != null || c["from"] != null);
            if (kind == "pose" && !wholeBody)
            {
                if (a["anticipate"] == null) return false;
                double lead = Dur(c["lead"], t, .16);
                a["lead"] = lead;
                Op(Track(name), kind, t - lead, len + lead, a);
                return true;
            }
            if (kind != "keys" && !wholeBody) return false;

            JArray src;
            if (wholeBody)
            {
                var one = new JObject { ["t"] = len };
                foreach (var key in new[] { "pose", "from", "bones", "hips", "root", "hold", "space" }) if (c[key] != null) one[key] = c[key].DeepClone();
                src = new JArray(one);
                foreach (var key in new[] { "pose", "from", "bones", "hips", "root", "hold", "bone", "rot" }) a.Remove(key);
            }
            else { src = c["keys"] as JArray; a.Remove("keys"); }
            if (src == null || src.Count == 0) { _warn.Add($"{name}: keys needs a list of keys"); return true; }

            bool anyAnt = a["anticipate"] != null || src.Any(k => k["anticipate"] != null);
            double leadK = anyAnt ? Dur(c["lead"], t, .16) : 0, end = 0;
            var refs = new List<UnityEngine.Object>(); var list = new JArray();
            foreach (var kt in src.OfType<JObject>())
            {
                var o = new JObject();
                double kTime = KeyTime(kt["t"], t) + leadK, hold = kt["hold"] != null ? Dur(kt["hold"], t, 0) : 0;
                o["t"] = kTime; if (hold > 0) o["hold"] = hold;
                end = Math.Max(end, kTime + hold);
                if (!Resolve(kt, o, name)) continue;
                if (o["from"] != null) FromClip(actor, name, (string)o["from"], o, refs);
                foreach (var key in new[] { "ease", "flat", "anticipate", "overshoot" }) if (kt[key] != null) o[key] = kt[key];
                if (kt["settle"] != null) o["settle"] = Dur(kt["settle"], t, .4);
                if (kt["root"] is JObject r) { if (r["pos"] != null) o["rootPos"] = r["pos"]; if (r["rot"] != null) o["rootRot"] = r["rot"]; }
                list.Add(o);
            }
            a["K"] = new JObject { ["list"] = list }; a["lead"] = leadK;
            Op(Track(name), "keys", t - leadK, Math.Max(end, .01), a, refs.ToArray());
            return true;
        }

        // ---- performances: Director/library/performances/<name>.json, named actions that expand to cues here ----

        int _performDepth;

        /// <summary>{"do":"perform","on":"person","name":"walk_tired","for":"2bars","dist":3}. Every other key of the cue is a parameter.
        /// In the file, "$x" is a parameter (or `for`, in seconds), "=for-0.4" is arithmetic on them and gives seconds, "if":"$x" drops a cue
        /// when x is 0 or false, and `at` and all lengths are seconds from the start of the cue. See Director/library/performances/README.md.</summary>
        void PerformCue(string name, JObject c, double t)
        {
            var file = (string)c["name"] ?? (string)c["performance"];
            var path = Path.Combine(Bridge.Root, "library", "performances", file + ".json");
            if (file == null || !File.Exists(path)) { _warn.Add($"{name}: no performance '{file}' in Director/library/performances"); return; }
            if (_performDepth > 4) { _warn.Add($"{name}: performances nested too deep at '{file}'"); return; }
            var perf = JObject.Parse(File.ReadAllText(path));
            var vars = new Dictionary<string, JToken>();
            if (perf["params"] is JObject defs) foreach (var kv in defs) vars[kv.Key] = kv.Value;
            var skip = new[] { "do", "on", "at", "name", "performance", "for", "until", "lead" };
            foreach (var kv in c) if (!kv.Key.StartsWith("__") && Array.IndexOf(skip, kv.Key) < 0) vars[kv.Key] = kv.Value;
            double natural = Dur(perf["length"], t, 1);
            double len = c["for"] != null ? Dur(c["for"], t, natural) : c["until"] != null ? T(c["until"], t) - t : natural;
            vars["for"] = len; vars["length"] = natural;
            if (perf["min"] != null && len < Dur(perf["min"], t, 0) - .001) _warn.Add($"{name}: '{file}' wants at least {perf["min"]}, got {len:0.##} s");
            // "lead":"2b" joins the take that far in: a take that started under the shot before. Clips start further on, nothing before it plays.
            double lead = c["lead"] != null ? Dur(c["lead"], t, 0) : 0;
            bool baked = BakeStart(name, file, vars, t, len, lead); if (baked) _bakeHide++;
            double keep = _prev; _performDepth++;
            try
            {
                foreach (var src in (perf["cues"] as JArray ?? new JArray()).OfType<JObject>())
                {
                    if (!(Fill(src, vars) is JObject inner)) continue;
                    if (inner["if"] != null) { var w = inner["if"]; if (w.Type == JTokenType.Null || w.Type == JTokenType.Boolean && !(bool)w || (w.Type == JTokenType.Float || w.Type == JTokenType.Integer) && Math.Abs((double)w) < 1e-6) continue; inner.Remove("if"); }
                    if (_bakeHide > 0 && !BakeKeep(inner)) continue;
                    double at0 = Dur(inner["at"], t, 0), late = lead - at0;
                    if (late > 1e-6)
                    {
                        var kind = (string)inner["do"];
                        double dur = inner["for"] != null ? Dur(inner["for"], t, 0) : -1;
                        if (kind == "perform") inner["lead"] = late;
                        else if (kind == "anim" || kind == "layer")
                        {
                            if (dur >= 0 && dur <= late) continue;
                            inner["start"] = ((double?)inner["start"] ?? 0) + late * ((double?)inner["speed"] ?? 1);
                            if (dur >= 0) inner["for"] = dur - late;
                        }
                        else if (dur >= 0) inner["for"] = Math.Max(.05, dur - late);
                        inner["at"] = t;
                    }
                    else inner["at"] = t + at0 - lead;
                    if (inner["on"] == null) inner["on"] = name;
                    _prev = t; Cue(inner, null);
                }
            }
            finally { _performDepth--; _prev = keep; if (baked) _bakeHide--; }
        }

        static readonly System.Data.DataTable Calc = new System.Data.DataTable();

        static JToken Fill(JToken v, Dictionary<string, JToken> vars)
        {
            if (v is JObject o) { var n = new JObject(); foreach (var kv in o) n[kv.Key] = Fill(kv.Value, vars); return n; }
            if (v is JArray a) return new JArray(a.Select(x => Fill(x, vars)));
            if (v.Type != JTokenType.String) return v.DeepClone();
            var s = (string)v;
            if (s.StartsWith("=")) return Convert.ToDouble(Calc.Compute(Words(s.Substring(1), vars), ""), System.Globalization.CultureInfo.InvariantCulture);
            if (s.StartsWith("$") && vars.TryGetValue(s.Substring(1), out var whole)) return whole.DeepClone();
            return s.Contains("$") ? Words(s, vars, true) : s;
        }

        static string Words(string s, Dictionary<string, JToken> vars, bool dollar = false) =>
            System.Text.RegularExpressions.Regex.Replace(s, dollar ? @"\$([A-Za-z_]\w*)" : @"\$?([A-Za-z_]\w*)", m =>
            {
                if (!vars.TryGetValue(m.Groups[1].Value, out var x)) return m.Value;
                return x.Type == JTokenType.Float || x.Type == JTokenType.Integer ? ((double)x).ToString("0.######", System.Globalization.CultureInfo.InvariantCulture) : (string)x;
            });

        // ---- layers and blend trees ----

        AnimationClip Named(MVActor actor, string who, string clip)
        {
            var found = DroppedClip(clip) ?? actor.FindClip(clip) ?? ProjectClip(clip);
            if (!found) _warn.Add($"{who}: no clip '{clip}' on it or in the project. Find it with mv find, then mv pull");
            return found;
        }

        /// <summary>[["2b",[0.2,0.8]],...] or [["2b",0.7],...] into times from the cue and values.</summary>
        JArray KeyList(JToken src, double t)
        {
            var o = new JArray();
            foreach (var k in src.OfType<JArray>()) o.Add(new JObject { ["t"] = KeyTime(k[0], t), ["w"] = k[1] });
            return o;
        }

        void LayerCue(string name, MVActor actor, JObject c, JObject a, double t, double len)
        {
            var clip = Named(actor, name, (string)c["clip"]); if (!clip) return;
            if (c["weight"] is JArray keyed) { a.Remove("weight"); a["W"] = new JObject { ["list"] = KeyList(keyed, t) }; }
            if (c["for"] == null && c["until"] == null) a["hold"] = 1;
            CheckAdmitted(name, actor, clip);
            if (c["warpTo"] != null) WarpCue(name, actor, c, a, clip, t, len);
            Op(Track(name), "layer", t, len, a, clip);
        }

        void TreeCue(string name, MVActor actor, JObject c, JObject a, double t, double len)
        {
            var refs = new List<UnityEngine.Object>(); var w = new JArray();
            foreach (var row in ((JArray)c["blendTree"]).OfType<JArray>())
            {
                var clip = Named(actor, name, (string)row[0]); if (!clip) return;
                refs.Add(clip); w.Add(row.Count > 1 ? row[1] : 1);
            }
            var tree = new JObject { ["w"] = w };
            if (c["mix"] != null) tree["mix"] = KeyList(c["mix"], t);
            a.Remove("blendTree"); a.Remove("mix"); a["T"] = tree;
            if (a["cycle"] != null) a["cycle"] = Dur(a["cycle"], t, 1);
            Op(Track(name), "anim", t, len, a, refs.ToArray());
        }

        // ---- ragdoll: the cue plays a clip, which is filled in at the end of the build from his pose at that moment ----

        public const string MotionFolder = "Assets/MusicVideo/Motion";
        internal readonly List<RagJob> _rags = new List<RagJob>();

        void RagdollCue(string name, JObject c, JObject a, double t, double len)
        {
            var job = new RagJob { name = name, t = t, len = len, cue = (JObject)c.DeepClone() };
            job.cue.Remove("__t");
            string nm = $"rag_{name}_{(int)Math.Round(t * 1000)}";
            if (_labOps != null) job.clip = new AnimationClip { name = nm, hideFlags = HideFlags.DontSave };
            else
            {
                var folder = Gen + "/Ragdoll";
                if (!AssetDatabase.IsValidFolder(folder)) AssetDatabase.CreateFolder(Gen, "Ragdoll");
                job.file = folder + "/" + nm + ".anim";
                job.clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(job.file);
                if (!job.clip) { job.clip = new AnimationClip { name = nm }; AssetDatabase.CreateAsset(job.clip, job.file); }
            }
            if (c["pose"] != null || c["from"] != null)
            {
                // `pose`/`from` is what `drive` holds him toward. Only a frame of a clip can be fought for.
                var o = new JObject(); var refs = new List<UnityEngine.Object>();
                if (Resolve(c, o, name) && o["from"] != null)
                {
                    FromClip(_actors[name], name, (string)o["from"], o, refs);
                    if (refs.Count > 0) { job.target = (AnimationClip)refs[0]; job.targetTime = o["cf"] != null ? (float)o["cf"] * job.target.length : (float?)o["ct"] ?? 0; }
                }
            }
            _rags.Add(job);
            var play = new JObject { ["once"] = 1, ["stay"] = c["blendOut"] != null ? 0 : 1, ["blend"] = c["blendIn"] != null ? Dur(c["blendIn"], t, .1) : .1 };
            if (c["blendOut"] != null) play["return"] = Dur(c["blendOut"], t, .3);
            Op(Track(name), "anim", t, len, play, job.clip);
        }

        void BakeRagdolls()
        {
            if (_rags.Count == 0) return;
            RagdollBaker.BakeAll(_rags, n => _actors.TryGetValue(n, out var a) ? a : null, (a, t) => a.Driver?.Eval(t), _warn);
            _dir.time = Math.Min(_dir.time, _tl.fixedDuration); _dir.RebuildGraph(); _dir.Evaluate();
        }

        /// <summary>A clip dropped in Assets/MusicVideo/Motion, by the file's name, whatever the clip inside is called.</summary>
        public static AnimationClip DroppedClip(string name)
        {
            foreach (var ext in new[] { ".fbx", ".FBX" })
                foreach (var file in new[] { "Humanoid@" + name, name })
                {
                    var path = MotionFolder + "/" + file + ext;
                    if (!File.Exists(path)) continue;
                    foreach (var o in AssetDatabase.LoadAllAssetsAtPath(path))
                        if (o is AnimationClip c && !c.name.StartsWith("__preview")) return c;
                }
            return null;
        }

        /// <summary>The compiler with no scene, for the lab: cues compile exactly as in the score and land in a list.</summary>
        public static ScoreCompiler ForLab(SongMap song, Dictionary<string, MVActor> actors, List<Op> ops, JObject score)
        {
            var s = new ScoreCompiler { _song = song, _labOps = ops, _score = score ?? new JObject() };
            foreach (var kv in actors) s._actors[kv.Key] = kv.Value;
            return s;
        }
        public void LabCue(JObject c) => Cue(c, null);
        public IEnumerable<string> Warnings => _warn;
        public List<RagJob> Rags => _rags;
    }
}
