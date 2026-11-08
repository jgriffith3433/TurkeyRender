using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using TMPro;
using Unity.Cinemachine;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEditor.Timeline;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.Splines;
using UnityEngine.Timeline;
using UnityEngine.UI;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Turns Director/score.json (the whole video as text) into the scene and the Timeline. The score is the source of
    /// truth: everything under _Generated and every track is rebuilt from it, so nothing is ever patched by hand.
    /// </summary>
    public partial class ScoreCompiler
    {
        public static string Gen => Video.Gen; public static string ScenePath => Video.ScenePath;
        public static string TimelinePath => Gen + "/MusicVideo.playable"; public static string SongPath => Gen + "/Song.asset"; public static string PostPath => Gen + "/Post.asset";
        public const long MaxSceneBytes = 50000000;
        public static string ScoreFile => Path.Combine(Video.Dir, "score.json");

        /// <summary>score.json with its "sharedModels" link followed: the models of another score come first, this score's own win.</summary>
        public static JObject ReadScore()
        {
            var s = JObject.Parse(File.ReadAllText(ScoreFile));
            if (s["sharedModels"] != null)
            {
                var shared = (JObject)JObject.Parse(File.ReadAllText(Path.GetFullPath(Path.Combine(Video.Dir, (string)s["sharedModels"]))))["models"]?.DeepClone() ?? new JObject();
                foreach (var kv in (s["models"] as JObject) ?? new JObject()) shared[kv.Key] = kv.Value;
                s["models"] = shared;
            }
            return s;
        }

        /// <summary>The song's file, for mixing renders.</summary>
        public static string SongAudio() => (string)JObject.Parse(File.ReadAllText(ScoreFile))["song"] ?? "Assets/Song/Audio.mp3";

        static readonly string[] Meta = { "at", "for", "until", "on", "do", "repeat", "times", "onsets", "note", "shot", "fx", "grade", "pulse", "light", "strobe", "sky", "sfx", "macro", "every", "text", "speed", "tv", "tvflash", "tvchange", "tvreact", "tvclip", "insert", "steps", "lightreact", "gfx", "flip", "sfxAt", "sfxVolume" };

        JObject _score; SongMap _song; TimelineAsset _tl; PlayableDirector _dir; MVStage _stage; Transform _root;
        readonly Dictionary<string, MVActor> _actors = new Dictionary<string, MVActor>();
        readonly Dictionary<string, Lane> _motion = new Dictionary<string, Lane>();
        readonly Dictionary<string, double> _sections = new Dictionary<string, double>();
        readonly List<string> _warn = new List<string>();
        readonly Dictionary<int, double> _marks = new Dictionary<int, double>();
        readonly List<ShotInfo> _shots = new List<ShotInfo>();
        readonly List<AudioTrack> _sfxLanes = new List<AudioTrack>(); readonly List<double> _sfxEnd = new List<double>();
        readonly List<object> _sfxList = new List<object>();
        Lane _post, _light, _fx, _text, _time, _insert, _gfx; CinemachineTrack _cam;
        readonly Dictionary<string, Lane> _tvs = new Dictionary<string, Lane>();
        readonly List<(double t, double dur, double v, string ease)> _speeds = new List<(double, double, double, string)>();
        /// <summary>Hitstops: scene time held at `t` for `d` seconds, then back on the song's clock, so nothing after a freeze lands early against the cuts.</summary>
        readonly List<(double t, double d)> _holds = new List<(double, double)>();
        readonly List<(double t, double dur, float hz)> _steps = new List<(double, double, float)>();
        int _ops; double _prev;

        class ShotInfo { public double t; public double? end; public JObject s; }

        [BridgeCommand("build")]
        public static object BuildCommand(JObject m) => new ScoreCompiler { _fast = (bool?)m?["fast"] == true, _noReuse = (bool?)m?["full"] == true }.Run();

        object Run() { SceneKeeper.Building = true; try { return Build(); } finally { SceneKeeper.Building = false; } }
        public object BuildFor(bool fast) { _fast = fast; return Run(); }

        bool _fast; // for animators: skips saving the scene and redrawing the Timeline window; the next plain build saves
        readonly System.Diagnostics.Stopwatch _clock = System.Diagnostics.Stopwatch.StartNew();
        readonly Dictionary<string, long> _took = new Dictionary<string, long>();
        void Took(string what) { _took[what] = _clock.ElapsedMilliseconds; _clock.Restart(); }

        public object Build()
        {
            EnsureFolders();
            InsertCache.Forget();
            _clipFound.Clear();
            MVActor.ForgetNames();
            _score = ReadScore();
            foreach (var f in Directory.GetFiles(Path.Combine(Video.Dir, "acts"), "*.json").OrderBy(x => x))
            {
                var act = JObject.Parse(File.ReadAllText(f));
                foreach (var key in new[] { "models", "actors", "macros", "sections", "shows" })
                    if (act[key] is JObject o) { if (!(_score[key] is JObject d)) _score[key] = d = new JObject(); foreach (var kv in o) d[kv.Key] = kv.Value; }
                if (act["lights"] is JObject l) foreach (var kv in l) ((JObject)_score["stage"]["lights"])[kv.Key] = kv.Value;
                if (act["cues"] is JArray cs) { if (!(_score["cues"] is JArray all)) _score["cues"] = all = new JArray(); foreach (var q in cs) all.Add(q); }
            }
            _song = BakeSong();
            ApplyLibrary();
            if (File.Exists(MarksFile))
                foreach (var mk in JArray.Parse(File.ReadAllText(MarksFile))) _marks[(int)mk["id"]] = (double)mk["t"];

            double keep = 0;
            var old = UnityEngine.Object.FindAnyObjectByType<PlayableDirector>();
            if (old) keep = old.time;

            string setHash = SetHash();
            _reuse = _fast && !_noReuse && Reusable(setHash);
            Took("read");
            OpenScene();
            Took("openScene");
            if (!_reuse) { MakeStage(); ApplyCanvas(); }
            MakeTimeline();
            if (!_reuse) MakeLights();
            Took("stage");
            MakeActors();
            BoneParents();
            Took("actors");
            if (!_reuse) MakeShows();
            Took("shows");
            foreach (var kv in (_score["sections"] as JObject) ?? new JObject()) _sections[kv.Key] = T(kv.Value, 0);
            var cues = ((_score["cues"] as JArray) ?? new JArray()).OfType<JObject>().ToList();
            _prev = 0;
            foreach (var c in cues) Cue(c, null);
            FinishShots();
            FinishMarks();
            BakeWarp();
            Took("cues");
            Realize();
            NativeTracks();
            Took("clips");

            foreach (var kv in _motion) _dir.SetGenericBinding(kv.Value.track, _actors[kv.Key]);
            foreach (var l in new[] { _post, _light, _fx, _text, _insert, _gfx }) _dir.SetGenericBinding(l.track, _stage);
            foreach (var kv in _tvs) _dir.SetGenericBinding(kv.Value.track, _actors[kv.Key]);
            foreach (var t in _tl.GetOutputTracks().OfType<MVTrack>()) t.song = _song;
            EditorUtility.SetDirty(_tl);
            if (!_fast) AssetDatabase.SaveAssets();
            Took("saveAssets");

            File.WriteAllText(Path.Combine(Video.Dir, "sfx-map.json"), JToken.FromObject(_sfxList).ToString());
            WriteSilence(); // the epic toolkit's pre-hit silences (MVEpicScore.cs), only when a cue asks
            _dir.playableAsset = _tl;
            MVActor.ForgetNames();
            _dir.RebuildGraph();
            _dir.time = Math.Min(keep, _tl.fixedDuration);
            _dir.Evaluate();
            Took("graph");
            foreach (var d in UnityEngine.Object.FindObjectsByType<MVDeform>(FindObjectsSortMode.None)) d.Restore();
            BakeRagdolls();
            Took("ragdolls");
            string aimKey = Hash(_score.ToString(Newtonsoft.Json.Formatting.None));
            if (!_fast) { BakeAim(); SaveAim(aimKey); } else LoadAim(aimKey);
            Took("aim");
            EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());
            if (!_fast) EditorSceneManager.SaveOpenScenes();
            Took("saveScene");
            _dir.Evaluate();
            if (!Quality.Preview) Quality.Set(true);
            if (!_fast) { Transport.ShowAll(); TimelineEditor.Refresh(RefreshReason.ContentsAddedOrRemoved); }
            else { var win = TimelineEditor.GetWindow(); if (win != null) win.SetTimeline(_dir); }
            _memo = _fast ? Remember(setHash) : null;
            Took("finish");
            long sceneBytes = File.Exists(ScenePath) ? new FileInfo(ScenePath).Length : 0;
            if (!_fast && sceneBytes > MaxSceneBytes) throw new Exception($"The scene is {sceneBytes / 1000000} MB, over the {MaxSceneBytes / 1000000} MB limit. Something is being written into it: look for timeline objects, or a set that should be built from the score.");
            return new { video = Video.Name, tracks = _tl.outputTrackCount, ops = _ops, actors = _actors.Count, shots = _shots.Count, reused = _reuse ? $"actors, and {_keptTracks} of {_lanes.Count} tracks" : "nothing: " + _whyNot, aim = _fast ? _aimState : "baked", scrubbed = _scrubbed, sceneBytes, warnings = _warn, took = _took };
        }

        // ---------- time ----------

        static readonly Regex Parts = new Regex(@"^(?<base>[^+\-]*)(?<off>[+\-].*)?$");
        static readonly Regex Amount = new Regex(@"^(?<n>[+\-]?[0-9.]+)\s*(?<u>bars?|b|beats?|s|ms)?$");

        /// <summary>"12:3" bar:beat, "12" bar, "41.2s", "m3" a mark, "chorus" a section, any of them + an offset ("m3+2b"), or "+1b" after the last cue.</summary>
        public double T(JToken v, double prev)
        {
            if (v == null) return prev;
            if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) return (double)v;
            var m = Parts.Match(((string)v).Trim());
            string b = m.Groups["base"].Value.Trim(), off = m.Groups["off"].Value.Trim();
            double t = prev;
            if (b.Length > 0)
            {
                Match x;
                if ((x = Regex.Match(b, @"^(\d+):([0-9.]+)$")).Success) t = _song.TimeOf(_song.BeatOfBar(double.Parse(x.Groups[1].Value), double.Parse(x.Groups[2].Value)));
                else if (Regex.IsMatch(b, @"^\d+$")) t = _song.TimeOf(_song.BeatOfBar(double.Parse(b), 1));
                else if (Regex.IsMatch(b, @"^[0-9.]+s$")) t = double.Parse(b.TrimEnd('s'));
                else if (Regex.IsMatch(b, @"^m\d+$")) { if (!_marks.TryGetValue(int.Parse(b.Substring(1)), out t)) throw new Exception("no mark " + b); }
                else if (_sections.TryGetValue(b, out var sec)) t = sec;
                else throw new Exception("can't read the time '" + v + "'");
            }
            if (off.Length > 0) t = Add(t, off);
            return t;
        }

        double Add(double t, string amount)
        {
            var m = Amount.Match(amount.Trim());
            if (!m.Success) throw new Exception("can't read the length '" + amount + "'");
            double n = double.Parse(m.Groups["n"].Value); string u = m.Groups["u"].Value;
            if (u == "s") return t + n;
            if (u == "ms") return t + n / 1000;
            double beats = u.StartsWith("bar") ? n * _song.meter : n;
            return _song.TimeOf(_song.BeatAt(t) + beats);
        }

        double Dur(JToken v, double t, double def)
        {
            if (v == null) return def;
            if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) return (double)v;
            return Add(t, (string)v) - t;
        }

        double Beats(JToken v)
        {
            if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) return (double)v;
            var m = Amount.Match(((string)v).Trim());
            double n = double.Parse(m.Groups["n"].Value);
            return m.Groups["u"].Value.StartsWith("bar") ? n * _song.meter : n;
        }

        // ---------- scene ----------

        static void EnsureFolders()
        {
            Folder(Gen); Folder(Gen + "/Materials");
        }

        static void Folder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path).Replace(Path.DirectorySeparatorChar, '/');
            Folder(parent); AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        public static string MarksFile => Path.Combine(Video.Dir, "marks.json");

        SongMap BakeSong()
        {
            var j = JObject.Parse(File.ReadAllText(Path.Combine(Video.Dir, "song.json")));
            var s = AssetDatabase.LoadAssetAtPath<SongMap>(SongPath);
            if (!s) { s = ScriptableObject.CreateInstance<SongMap>(); AssetDatabase.CreateAsset(s, SongPath); }
            float[] A(JToken t) => t.Select(x => (float)x).ToArray();
            s.duration = (float)j["duration"]; s.tempo = (float)j["tempo"]; s.meter = (int)j["meter"]; s.phase = (int)j["downbeatPhase"];
            s.beats = A(j["beats"]);
            var e = (JObject)j["envelopes"]; s.envFps = (float)e["fps"];
            s.envelopes = e.Properties().Where(p => p.Name != "fps").Select(p => new SongMap.Series { name = p.Name, v = A(p.Value) }).ToArray();
            s.hits = ((JObject)j["onsets"]).Properties().Select(p => new SongMap.Series { name = p.Name, v = A(p.Value) }).ToArray();
            s.secNames = j["sections"].Select(x => (string)x["name"]).ToArray(); s.secTimes = j["sections"].Select(x => (float)x["t"]).ToArray();
            for (int i = 0; i < s.secNames.Length; i++) _sections[s.secNames[i]] = s.secTimes[i];
            EditorUtility.SetDirty(s);
            return s;
        }

        void OpenScene()
        {
            if (SceneManager.GetActiveScene().path != ScenePath)
            {
                if (File.Exists(ScenePath)) EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
                else
                {
                    var sc = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                    EditorSceneManager.SaveScene(sc, ScenePath);
                }
            }
            var dgo = GameObject.Find("_Director"); if (!dgo) dgo = new GameObject("_Director");
            if (_reuse)
            {
                _dir = dgo.GetComponent<PlayableDirector>();
                _root = GameObject.Find(SceneKeeper.Root).transform;
                _stage = _root.Find("Stage").GetComponent<MVStage>();
                foreach (var go in _memo.cameras) if (go) UnityEngine.Object.DestroyImmediate(go); // shots are rebuilt every time
                foreach (var r in _memo.refs) _dir.ClearReferenceValue(r);
                return;
            }
            // A director keeps a binding for every track it ever saw, and those bindings write the tracks into the scene file.
            var stale = dgo.GetComponent<PlayableDirector>(); if (stale) UnityEngine.Object.DestroyImmediate(stale);
            _memo = null;
            _scrubbed = Scrub();
            _dir = Comp<PlayableDirector>(dgo);
            _dir.playOnAwake = false; _dir.timeUpdateMode = DirectorUpdateMode.DSPClock; _dir.extrapolationMode = DirectorWrapMode.Hold;
            foreach (var n in new[] { "Music", "Sfx" })
            {
                var tr = dgo.transform.Find(n); if (!tr) tr = new GameObject(n).transform; tr.SetParent(dgo.transform, false);
                var src = Comp<AudioSource>(tr.gameObject);
                src.playOnAwake = false; src.spatialBlend = 0;
            }
            var camGo = GameObject.Find("Main Camera"); if (!camGo) camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = Comp<Camera>(camGo);
            if (!camGo.GetComponent<AudioListener>()) camGo.AddComponent<AudioListener>();
            var ucd = Comp<UniversalAdditionalCameraData>(camGo);
            ucd.renderPostProcessing = true; ucd.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            cam.clearFlags = CameraClearFlags.Skybox; cam.farClipPlane = 2000;
            var brain = Comp<CinemachineBrain>(camGo);
            brain.DefaultBlend = new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.Cut, 0);

            var g = GameObject.Find(SceneKeeper.Root); if (g) UnityEngine.Object.DestroyImmediate(g);
            _root = new GameObject(SceneKeeper.Root).transform;
        }

        int _scrubbed;

        /// <summary>Destroys every Timeline object that lives in no asset: what earlier fast builds left in memory. Nothing else may own one.</summary>
        static int Scrub()
        {
            int n = 0;
            foreach (var o in Resources.FindObjectsOfTypeAll<ScriptableObject>())
                if ((o is PlayableAsset || o is IMarker) && !EditorUtility.IsPersistent(o)) { UnityEngine.Object.DestroyImmediate(o); n++; }
            return n;
        }

        static T Comp<T>(GameObject g) where T : Component { var c = g.GetComponent<T>(); return c ? c : g.AddComponent<T>(); }

        static T Child<T>(Transform p, string n) where T : Component
        {
            var go = new GameObject(n, typeof(RectTransform)); go.transform.SetParent(p, false); return go.AddComponent<T>();
        }

        void MakeStage()
        {
            var go = new GameObject("Stage"); go.transform.SetParent(_root, false);
            _stage = go.AddComponent<MVStage>();
            var fx = new GameObject("Fx").transform; fx.SetParent(go.transform, false); _stage.fxRoot = fx;

            var prof = AssetDatabase.LoadAssetAtPath<VolumeProfile>(PostPath);
            if (!prof) { prof = ScriptableObject.CreateInstance<VolumeProfile>(); AssetDatabase.CreateAsset(prof, PostPath); }
            void Need<C>() where C : VolumeComponent
            {
                if (prof.TryGet<C>(out _)) return;
                var c = prof.Add<C>(true); c.name = typeof(C).Name; AssetDatabase.AddObjectToAsset(c, prof);
            }
            Need<Bloom>(); Need<ChromaticAberration>(); Need<Vignette>(); Need<LensDistortion>(); Need<ColorAdjustments>(); Need<FilmGrain>(); Need<DepthOfField>(); Need<MotionBlur>(); Need<Tonemapping>();
            prof.TryGet<DepthOfField>(out var dof); dof.mode.value = DepthOfFieldMode.Bokeh;
            prof.TryGet<Tonemapping>(out var tm); tm.mode.value = TonemappingMode.ACES;
            EditorUtility.SetDirty(prof);
            var v = go.AddComponent<Volume>(); v.isGlobal = true; v.priority = 10; v.sharedProfile = prof;
            _stage.volume = v;

            var sky = AssetDatabase.LoadAssetAtPath<Material>(Gen + "/Sky.mat");
            if (!sky) { sky = new Material(Shader.Find("MV/SkyGradient")); AssetDatabase.CreateAsset(sky, Gen + "/Sky.mat"); }
            _stage.sky = sky; RenderSettings.skybox = sky;

            var cgo = new GameObject("Overlay", typeof(RectTransform)); cgo.transform.SetParent(go.transform, false);
            var canvas = cgo.AddComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceCamera; canvas.worldCamera = Camera.main; canvas.planeDistance = .12f; canvas.sortingOrder = 100;
            var sc = cgo.AddComponent<CanvasScaler>(); sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; sc.referenceResolution = new Vector2(1920, 1080); sc.matchWidthOrHeight = .5f;
            Image Full(string n, Vector2 min, Vector2 max, float pivotY, Color c)
            {
                var i = Child<Image>(cgo.transform, n); var r = i.rectTransform;
                r.pivot = new Vector2(.5f, pivotY); r.anchorMin = min; r.anchorMax = max; r.offsetMin = r.offsetMax = Vector2.zero; i.color = c; i.raycastTarget = false; i.enabled = false;
                return i;
            }
            var ins = Child<RawImage>(cgo.transform, "Insert"); ins.rectTransform.anchorMin = Vector2.zero; ins.rectTransform.anchorMax = Vector2.one;
            ins.rectTransform.offsetMin = ins.rectTransform.offsetMax = Vector2.zero; ins.raycastTarget = false; ins.enabled = false; _stage.insert = ins;
            _stage.flash = Full("Flash", Vector2.zero, Vector2.one, .5f, Color.clear);
            _stage.barTop = Full("BarTop", new Vector2(0, 1), Vector2.one, 1, Color.black);
            _stage.barBottom = Full("BarBottom", Vector2.zero, new Vector2(1, 0), 0, Color.black);
            var labels = new List<TextMeshProUGUI>();
            for (int i = 0; i < 6; i++)
            {
                var t = Child<TextMeshProUGUI>(cgo.transform, "Label" + i);
                t.alignment = TextAlignmentOptions.Center; t.textWrappingMode = TextWrappingModes.NoWrap; t.rectTransform.sizeDelta = new Vector2(1800, 300); t.raycastTarget = false; t.fontStyle = FontStyles.Bold;
                t.gameObject.SetActive(false); labels.Add(t);
            }
            _stage.labels = labels.ToArray();
            _stage.gfx = new[] { MakeGfx(cgo.transform), null };
        }


        void MakeTimeline()
        {
            // A fast build keeps the timeline in memory: writing thousands of clips into the asset one by one is most of a full build.
            // DontSave: Timeline passes the flag to every track and clip made under it, so none of it can reach the scene file.
            if (_reuse) _tl = _memo.tl;
            else if (_fast) { _tl = ScriptableObject.CreateInstance<TimelineAsset>(); _tl.name = "MusicVideo (fast build)"; _tl.hideFlags = HideFlags.DontSave; }
            else AssetDatabase.DeleteAsset(TimelinePath); // a new file: deleting 500 tracks out of the old one took over a minute
            if (!_tl) { _tl = ScriptableObject.CreateInstance<TimelineAsset>(); AssetDatabase.CreateAsset(_tl, TimelinePath); }
            // A build that reuses keeps the tracks whose clips haven't changed. Song, cameras and sounds are cheap: those are remade.
            foreach (var t in _tl.GetRootTracks().ToList()) if (!(_reuse && t is MVTrack)) _tl.DeleteTrack(t);
            var mt = _tl.markerTrack;
            if (mt != null) foreach (var mk in mt.GetMarkers().ToList()) mt.DeleteMarker(mk);
            _tl.durationMode = TimelineAsset.DurationMode.FixedLength; _tl.fixedDuration = _song.duration;
            _tl.editorSettings.frameRate = 60;

            var audioPath = (string)_score["song"] ?? "Assets/Song/Audio.mp3";
            var music = _tl.CreateTrack<AudioTrack>(null, "Song");
            var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(audioPath);
            if (!clip) throw new Exception("no audio at " + audioPath);
            var tc = music.CreateClip(clip); tc.start = 0; tc.displayName = "Audio.mp3";
            _dir.SetGenericBinding(music, _dir.transform.Find("Music").GetComponent<AudioSource>());

            _cam = _tl.CreateTrack<CinemachineTrack>(null, "Cameras");
            _dir.SetGenericBinding(_cam, Camera.main.GetComponent<CinemachineBrain>());
            _post = NewLane("Post", typeof(PostTrack));
            _light = NewLane("Lights", typeof(LightTrack));
            _fx = NewLane("FX", typeof(FxTrack));
            _text = NewLane("Text", typeof(TextTrack));
            _time = NewLane("Time", typeof(TimeTrack));
            _insert = NewLane("Inserts", typeof(InsertTrack));
            _gfx = NewLane("Graphics", typeof(MVBroadcastTrack));
        }

        // ---------- lanes: a build first writes what each track should hold, then touches the Timeline only where that changed ----------

        class LaneOp { public string kind, args; public double start, dur; public UnityEngine.Object[] refs; }
        class Lane { public string name; public Type type; public MVTrack track; public readonly List<LaneOp> ops = new List<LaneOp>(); }
        class Memo { public string video, setHash; public int root; public TimelineAsset tl; public readonly Dictionary<string, (MVTrack track, string hash)> tracks = new Dictionary<string, (MVTrack, string)>(); public readonly List<GameObject> cameras = new List<GameObject>(); public readonly List<PropertyName> refs = new List<PropertyName>(); }

        /// <summary>What the last fast build left standing. Statics go at a domain reload, so new code always builds everything once.</summary>
        static Memo _memo;
        readonly List<Lane> _lanes = new List<Lane>(); bool _reuse, _noReuse; int _keptTracks; string _whyNot = "plain build"; string _aimState = "none";
        readonly List<GameObject> _shotObjects = new List<GameObject>(); readonly List<PropertyName> _shotRefs = new List<PropertyName>();

        Lane NewLane(string name, Type type) { var l = new Lane { name = name, type = type }; _lanes.Add(l); return l; }
        Lane TvLane(string name) { if (!_tvs.TryGetValue(name, out var l)) _tvs[name] = l = NewLane("TV " + name, typeof(TvTrack)); return l; }

        static string Hash(string s) { using (var md5 = System.Security.Cryptography.MD5.Create()) return BitConverter.ToString(md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(s))); }

        /// <summary>Everything that decides the objects on the set. Cues are not in it.</summary>
        string SetHash()
        {
            var o = new JObject { ["video"] = Video.Name, ["song"] = _score["song"], ["models"] = _score["models"], ["actors"] = _score["actors"], ["stage"] = _score["stage"], ["shows"] = _score["shows"] };
            return Hash(o.ToString(Newtonsoft.Json.Formatting.None));
        }

        bool Reusable(string setHash)
        {
            var m = _memo;
            if (m == null) { _whyNot = "nothing to reuse: first fast build since a plain build or a reload"; return false; }
            if (m.video != Video.Name) { _whyNot = "another video was built"; return false; }
            if (m.setHash != setHash) { _whyNot = "actors, models, stage or shows changed"; return false; }
            var g = GameObject.Find(SceneKeeper.Root);
            if (!m.tl || !g || g.GetInstanceID() != m.root || SceneManager.GetActiveScene().path != ScenePath || UnityEngine.Object.FindAnyObjectByType<PlayableDirector>()?.playableAsset != m.tl) { _whyNot = "the scene or timeline was replaced"; return false; }
            return true;
        }

        Memo Remember(string setHash)
        {
            var m = new Memo { video = Video.Name, setHash = setHash, root = _root.gameObject.GetInstanceID(), tl = _tl };
            foreach (var l in _lanes) m.tracks[l.name] = (l.track, LaneHash(l));
            m.cameras.AddRange(_shotObjects); m.refs.AddRange(_shotRefs);
            return m;
        }

        static string LaneHash(Lane l)
        {
            var b = new System.Text.StringBuilder();
            foreach (var o in l.ops)
            {
                b.Append(o.kind).Append('|').Append(o.start.ToString("R")).Append('|').Append(o.dur.ToString("R")).Append('|').Append(o.args);
                foreach (var r in o.refs ?? new UnityEngine.Object[0]) b.Append('|').Append(r ? r.GetInstanceID() : 0);
                b.Append((char)10);
            }
            return b.ToString();
        }

        /// <summary>Puts each lane on its track. Writing thousands of clips was most of a build, so an unchanged lane keeps the track it has.</summary>
        void Realize()
        {
            var keep = new HashSet<string>();
            foreach (var l in _lanes)
            {
                keep.Add(l.name);
                if (_reuse && _memo.tracks.TryGetValue(l.name, out var old) && old.track)
                {
                    l.track = old.track;
                    if (old.hash == LaneHash(l)) { _keptTracks++; continue; }
                }
                else l.track = (MVTrack)_tl.CreateTrack(l.type, null, l.name);
                // A clip only carries an op, so a changed lane rewrites the clips it has: making and deleting them is the slow part.
                var have = l.track.GetClips().ToArray();
                for (int i = 0; i < l.ops.Count; i++)
                {
                    var o = l.ops[i]; var c = i < have.Length ? have[i] : l.track.CreateClip<MVClip>();
                    c.start = o.start; c.duration = o.dur; c.displayName = o.kind;
                    var m = (MVClip)c.asset; m.kind = o.kind; m.args = o.args; m.refs = o.refs;
                }
                for (int i = l.ops.Count; i < have.Length; i++) _tl.DeleteClip(have[i]);
            }
            if (_reuse)
                foreach (var t in _tl.GetRootTracks().OfType<MVTrack>().ToList()) if (!keep.Contains(t.name)) _tl.DeleteTrack(t);
        }

        // Dead zones take a walk through the whole timeline, so a plain build keeps them for a fast build of the same score.
        void SaveAim(string key)
        {
            var list = new JArray();
            foreach (var (vc, sh, end) in _aims)
            {
                var fx = vc.GetComponent<MVCamFx>();
                list.Add(new JObject { ["s"] = fx.aimStart, ["d"] = fx.aimStep, ["p"] = new JArray(fx.aimPath.SelectMany(v => new[] { v.x, v.y, v.z })) });
            }
            File.WriteAllText(Video.AimFile, new JObject { ["key"] = key, ["aims"] = list }.ToString(Newtonsoft.Json.Formatting.None));
        }

        void LoadAim(string key)
        {
            try
            {
                if (!File.Exists(Video.AimFile)) return;
                var o = JObject.Parse(File.ReadAllText(Video.AimFile));
                var list = (JArray)o["aims"];
                if ((string)o["key"] != key || list.Count != _aims.Count) { _aimState = "off: the score changed since the last plain build"; return; }
                for (int i = 0; i < list.Count; i++)
                {
                    var fx = _aims[i].vc.GetComponent<MVCamFx>(); var p = (JArray)list[i]["p"];
                    var v = new Vector3[p.Count / 3];
                    for (int k = 0; k < v.Length; k++) v[k] = new Vector3((float)p[k * 3], (float)p[k * 3 + 1], (float)p[k * 3 + 2]);
                    fx.aimPath = v; fx.aimStart = (double)list[i]["s"]; fx.aimStep = (float)list[i]["d"];
                }
                _aimState = "from the last plain build";
            }
            catch (Exception e) { _aimState = "off: " + e.Message; }
        }

        static readonly Dictionary<string, PrimitiveType> Prims = new Dictionary<string, PrimitiveType> {
            {"cube",PrimitiveType.Cube},{"sphere",PrimitiveType.Sphere},{"plane",PrimitiveType.Plane},{"cylinder",PrimitiveType.Cylinder},{"capsule",PrimitiveType.Capsule},{"quad",PrimitiveType.Quad} };

        void MakeLights()
        {
            var names = new List<string>(); var ls = new List<Light>(); var cs = new List<Color>(); var ins = new List<float>();
            foreach (var kv in (_score["stage"]?["lights"] as JObject) ?? new JObject { ["key"] = new JObject { ["type"] = "directional", ["rot"] = new JArray(50, -30, 0), ["intensity"] = 1.4, ["shadows"] = true } })
            {
                var o = (JObject)kv.Value;
                var go = new GameObject("light_" + kv.Key); go.transform.SetParent(_root, false);
                var l = go.AddComponent<Light>();
                l.type = (string)o["type"] == "spot" ? LightType.Spot : (string)o["type"] == "point" ? LightType.Point : LightType.Directional;
                go.transform.position = V(o["pos"], Vector3.up * 5); go.transform.eulerAngles = V(o["rot"], new Vector3(50, -30, 0));
                l.range = (float?)o["range"] ?? 30; l.spotAngle = (float?)o["angle"] ?? 40;
                if ((bool?)o["shadows"] == true) l.shadows = LightShadows.Soft;
                var c = Col(o["color"], Color.white); float i = (float?)o["intensity"] ?? 1;
                l.color = c; l.intensity = i; names.Add(kv.Key); ls.Add(l); cs.Add(c); ins.Add(i);
            }
            _stage.lights = ls.ToArray(); _stage.lightNames = names.ToArray(); _stage.lightColors = cs.ToArray(); _stage.lightIntensities = ins.ToArray();
        }

        static Vector3 V(JToken t, Vector3 d) => t is JArray a && a.Count == 3 ? new Vector3((float)a[0], (float)a[1], (float)a[2]) : (t != null && t.Type != JTokenType.Array ? Vector3.one * (float)t : d);
        static Color Col(JToken t, Color d)
        {
            if (t == null) return d;
            if (t.Type == JTokenType.String && ColorUtility.TryParseHtmlString((string)t, out var c)) return c;
            if (t is JArray a) return new Color((float)a[0], (float)a[1], (float)a[2], a.Count > 3 ? (float)a[3] : 1);
            return d;
        }

        GameObject Spawn(string model, JObject def, Transform parent)
        {
            var aliases = _score["models"] as JObject;
            if (aliases != null && aliases[model] != null) model = (string)aliases[model];
            GameObject go;
            if (model == "none") { go = new GameObject("empty"); }
            else if (model.StartsWith("prim:"))
            {
                go = GameObject.CreatePrimitive(Prims[model.Substring(5)]);
                UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());
                if (def["shader"] != null)
                {
                    var sn = (string)def["shader"]; var sp = Gen + "/Materials/s_" + sn.Replace("/", "_") + ".mat";
                    var sm = AssetDatabase.LoadAssetAtPath<Material>(sp);
                    if (!sm) { sm = new Material(Shader.Find(sn)); AssetDatabase.CreateAsset(sm, sp); }
                    go.GetComponent<Renderer>().sharedMaterial = sm;
                }
                else if (def["texture"] != null) go.GetComponent<Renderer>().sharedMaterial = TexMat((string)def["texture"], def["tile"] != null ? V2(def["tile"], Vector2.one) : Vector2.one, (float?)def["unlit"] ?? 0, Col(def["color"], Color.white), (float?)def["smooth"] ?? .3f);
                else go.GetComponent<Renderer>().sharedMaterial = def["tvworld"] != null ? TvWorld((float)def["tvworld"], (float?)def["bright"] ?? 1) : LitMat(Col(def["color"], Color.gray), Col(def["emission"], Color.black), (float?)def["smooth"] ?? .3f, (float?)def["metal"] ?? 0);
            }
            else
            {
                var asset = AssetDatabase.LoadAssetAtPath<GameObject>(model);
                if (!asset) throw new Exception("no model at " + model);
                go = (GameObject)PrefabUtility.InstantiatePrefab(asset);
                PrefabUtility.UnpackPrefabInstance(go, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);
                foreach (var tr in go.GetComponentsInChildren<Transform>(true)) GameObjectUtility.RemoveMonoBehavioursWithMissingScript(tr.gameObject);
                foreach (var a in go.GetComponentsInChildren<Animator>(true)) a.enabled = false;
                foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                foreach (var col in go.GetComponentsInChildren<Collider>(true)) col.enabled = false;
                foreach (var sk in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                {
                    sk.forceMatrixRecalculationPerRender = true; sk.updateWhenOffscreen = true; sk.quality = SkinQuality.Bone4;
                }
                if (def["material"] != null)
                {
                    var mm = AssetDatabase.LoadAssetAtPath<Material>((string)def["material"]);
                    var m2 = def["material2"] != null ? AssetDatabase.LoadAssetAtPath<Material>((string)def["material2"]) : null;
                    foreach (var r in go.GetComponentsInChildren<Renderer>(true))
                    {
                        // The head is whichever submesh sits highest, in whatever order the FBX has them.
                        bool swap = false;
                        var mesh = r is SkinnedMeshRenderer smr ? smr.sharedMesh : null;
                        if (m2 && mesh && mesh.subMeshCount > 1) swap = mesh.GetSubMesh(0).bounds.center.y > mesh.GetSubMesh(1).bounds.center.y;
                        r.sharedMaterials = m2 ? (swap ? new[] { m2, mm } : new[] { mm, m2 }) : new[] { mm }; r.receiveShadows = (bool?)def["shadows"] ?? r is SkinnedMeshRenderer; // bodies shade themselves unless told not to
                    }
                }
                if (model.StartsWith("Assets/MusicVideo/Turkey/") && def["material"] == null)
                {
                    var tm = AssetDatabase.LoadAssetAtPath<Material>("Assets/MusicVideo/Turkey/turkey_" + (model.Contains("brown") ? "brown" : model.Contains("black") ? "black" : "white") + ".mat");
                    foreach (var r in go.GetComponentsInChildren<Renderer>(true)) r.sharedMaterial = tm;
                }
                if (def["keep"] is JArray keep) // only these top-level parts of the model; "pivot" puts one of them at the actor's origin
                {
                    var names = keep.Select(x => (string)x).ToArray();
                    for (int i = go.transform.childCount - 1; i >= 0; i--)
                    { var ch = go.transform.GetChild(i); if (!names.Contains(ch.name)) UnityEngine.Object.DestroyImmediate(ch.gameObject); }
                    if (def["pivot"] != null) { var pv = go.transform.Find((string)def["pivot"]); if (pv) go.transform.localPosition = -pv.localPosition; }
                }
                if (def["skin"] != null) // a material copy, so skinned meshes keep working
                {
                    var c = Col(def["skin"], Color.white);
                    foreach (var r in go.GetComponentsInChildren<Renderer>(true))
                    {
                        var mats = r.sharedMaterials;
                        for (int i = 0; i < mats.Length; i++)
                        {
                            if (!mats[i]) continue;
                            var path = Gen + "/Materials/skin_" + mats[i].name + "_" + ColorUtility.ToHtmlStringRGB(c) + ".mat";
                            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
                            if (!m) { m = new Material(mats[i]); m.SetColor("_BaseColor", c); if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", .35f); AssetDatabase.CreateAsset(m, path); }
                            mats[i] = m;
                        }
                        r.sharedMaterials = mats;
                    }
                }
            }
            if (def["boxUV"] != null) BoxUV(go, def);
            if (def["wear"] is JArray wear) Wear(go, wear); // garments skinned to this body's own bones (her lab coat)
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>"wear":[{"model":"Assets/MusicVideo/Person2/Coat/Coat.fbx","materials":{"Coat_Cloth":"...Coat_Cloth.mat",...}}] (or just the path): each garment's
        /// skinned meshes are bound by bone name to this body's own bones and become part of the body: its Animator plays them, they hide and show
        /// with it, and the motion check counts them as the body. The garment must be skinned to the same rest skeleton (blender_coat.py exports
        /// her armature with the coat). "materials" maps the FBX's material names to .mat files (a list goes on the slots in order). The garment's own armature is dropped.</summary>
        static void Wear(GameObject body, JArray wear)
        {
            var bones = new Dictionary<string, Transform>();
            foreach (var t in body.GetComponentsInChildren<Transform>(true)) if (!bones.ContainsKey(t.name)) bones[t.name] = t;
            foreach (var w in wear)
            {
                var path = w is JObject wo ? (string)wo["model"] : (string)w;
                var asset = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (!asset) throw new Exception("no garment at " + path);
                var g = (GameObject)PrefabUtility.InstantiatePrefab(asset);
                PrefabUtility.UnpackPrefabInstance(g, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);
                var mats = (w as JObject)?["materials"];
                var skins = g.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                if (skins.Length == 0) { UnityEngine.Object.DestroyImmediate(g); throw new Exception(path + " has no skinned mesh: import it as Generic (animationType 2), not None"); }
                foreach (var r in skins)
                {
                    var bs = new Transform[r.bones.Length];
                    for (int i = 0; i < bs.Length; i++)
                        if (!r.bones[i] || !bones.TryGetValue(r.bones[i].name, out bs[i])) throw new Exception($"{path}: bone {(r.bones[i] ? r.bones[i].name : "null")} is not on the body");
                    r.bones = bs;
                    r.rootBone = r.rootBone && bones.TryGetValue(r.rootBone.name, out var rb) ? rb : bones.TryGetValue("Hips", out var hb) ? hb : body.transform;
                    if (mats != null)
                    {
                        var sm = r.sharedMaterials;
                        for (int i = 0; i < sm.Length; i++)
                        {
                            // by the FBX's own material name ({"Coat_Cloth":"...mat"}), or by slot order (a list)
                            var key = mats is JObject mo ? (sm[i] ? (string)mo[sm[i].name] : null) : mats is JArray ma && i < ma.Count ? (string)ma[i] : null;
                            if (key == null) continue;
                            var m = AssetDatabase.LoadAssetAtPath<Material>(key); if (!m) throw new Exception("no material at " + key); sm[i] = m;
                        }
                        r.sharedMaterials = sm;
                    }
                    r.forceMatrixRecalculationPerRender = true; r.updateWhenOffscreen = true; r.quality = SkinQuality.Bone4; r.receiveShadows = true;
                    r.transform.SetParent(body.transform, false);
                    r.gameObject.name = "wear_" + r.gameObject.name;
                }
                UnityEngine.Object.DestroyImmediate(g);
            }
        }

        /// <summary>"boxUV":tiles a metre: new UVs thrown onto the mesh along its faces, at true size whatever the scale, so a palette prop or a stretched cube can wear a real texture ("texture", "tile", "smooth"). The copy lives with the scene and is never saved.</summary>
        static void BoxUV(GameObject go, JObject def)
        {
            float t = (float)def["boxUV"]; var sc = def["scale"] != null ? V(def["scale"], Vector3.one) : Vector3.one;
            if (def["scale"] is JValue one) sc = Vector3.one * (float)one;
            Material mat = null;
            if (def["texture"] != null) mat = TexMat((string)def["texture"], def["tile"] != null ? V2(def["tile"], Vector2.one) : Vector2.one, (float?)def["unlit"] ?? 0, Col(def["color"], Color.white), (float?)def["smooth"] ?? .25f);
            foreach (var mf in go.GetComponentsInChildren<MeshFilter>(true))
            {
                if (!mf.sharedMesh) continue;
                var m = UnityEngine.Object.Instantiate(mf.sharedMesh); m.name = mf.sharedMesh.name + "_box"; m.hideFlags = HideFlags.DontSave;
                var v = m.vertices; var n = m.normals; var uv = new Vector2[v.Length];
                var s = Vector3.Scale(mf.transform.lossyScale, sc);
                float ox = Mathf.Abs(go.name.GetHashCode() % 97) / 97f;
                for (int i = 0; i < v.Length; i++)
                {
                    var p = Vector3.Scale(v[i], s); var a = n.Length > i ? new Vector3(Mathf.Abs(n[i].x), Mathf.Abs(n[i].y), Mathf.Abs(n[i].z)) : Vector3.up;
                    uv[i] = (a.x >= a.y && a.x >= a.z ? new Vector2(p.z, p.y) : a.y >= a.z ? new Vector2(p.x, p.z) : new Vector2(p.x, p.y)) * t + new Vector2(ox, 0);
                }
                m.uv = uv; mf.sharedMesh = m;
                if (mat) { var r = mf.GetComponent<Renderer>(); if (r) r.sharedMaterial = mat; }
            }
        }

        /// <summary>A prim wearing a picture. With "unlit" it glows at that strength, so screens and signs need no light.</summary>
        static Material TexMat(string tex, Vector2 tile, float unlit, Color c, float smooth)
        {
            var t = AssetDatabase.LoadAssetAtPath<Texture2D>(tex);
            if (!t) throw new Exception("no texture at " + tex);
            string path = Gen + "/Materials/tex_" + MeshTools.Clean(Path.GetFileNameWithoutExtension(tex)) + $"_{tile.x:0.##}x{tile.y:0.##}_{unlit:0.##}_" + ColorUtility.ToHtmlStringRGB(c) + ".mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!m) { m = new Material(Shader.Find("MV/Lit")); AssetDatabase.CreateAsset(m, path); }
            m.SetTexture("_BaseMap", t); m.SetTextureScale("_BaseMap", tile); m.SetColor("_BaseColor", c); m.SetFloat("_Smoothness", smooth);
            if (unlit > 0) { m.EnableKeyword("_EMISSION"); m.SetTexture("_EmissionMap", t); m.SetTextureScale("_EmissionMap", tile); m.SetColor("_EmissionColor", c * unlit); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.EmissiveIsBlack; }
            EditorUtility.SetDirty(m);
            return m;
        }

        static Material TvWorld(float tiles, float bright)
        {
            string path = Gen + $"/Materials/tvworld_{tiles:0.#}_{bright:0.#}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m) return m;
            m = new Material(Shader.Find("MV/TvScreen")); m.SetFloat("_World", tiles); m.SetFloat("_Bright", bright);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        static Material LitMat(Color c, Color e, float smooth, float metal)
        {
            string key = ColorUtility.ToHtmlStringRGBA(c) + "_" + ColorUtility.ToHtmlStringRGB(e) + $"_{smooth:0.##}_{metal:0.##}";
            string path = Gen + "/Materials/m_" + key + ".mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m) return m;
            m = new Material(Shader.Find("MV/Lit"));
            m.SetColor("_BaseColor", c); m.SetFloat("_Smoothness", smooth); m.SetFloat("_Metallic", metal);
            if (e.maxColorComponent > 0) { m.EnableKeyword("_EMISSION"); m.SetColor("_EmissionColor", e * 3); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.EmissiveIsBlack; }
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        static AnimationClip[] ClipsOf(GameObject instance, string model)
        {
            var set = new HashSet<AnimationClip>();
            var src = (GameObject)null;
            foreach (var an in instance.GetComponentsInChildren<Animator>(true))
                if (an.runtimeAnimatorController != null) foreach (var c in an.runtimeAnimatorController.animationClips) set.Add(c);
            var path = src ? AssetDatabase.GetAssetPath(src) : model;
            if (!string.IsNullOrEmpty(path) && !path.StartsWith("prim:"))
                foreach (var o in AssetDatabase.LoadAllAssetsAtPath(path)) if (o is AnimationClip c && !c.name.StartsWith("__preview")) set.Add(c);
            return set.ToArray();
        }

        void MakeActors()
        {
            if (_reuse)
            {
                foreach (var a in _root.GetComponentsInChildren<MVActor>(true)) _actors[a.name] = a;
                foreach (var kv in (_score["actors"] as JObject) ?? new JObject())
                {
                    var def = (JObject)kv.Value; string parentName = (string)def["parent"];
                    if (parentName != null && (parentName.Contains(".") || parentName.Contains("#"))) _boneParents.Add((kv.Key, parentName, def));
                    ActorOps(kv.Key, def);
                }
                return;
            }
            foreach (var kv in (_score["actors"] as JObject) ?? new JObject())
            {
                var def = (JObject)kv.Value;
                var go = new GameObject(kv.Key);
                string parentName = (string)def["parent"];
                bool boneParent = parentName != null && (parentName.Contains(".") || parentName.Contains("#"));
                go.transform.SetParent(!boneParent && parentName != null && _actors.TryGetValue(parentName, out var dad) ? dad.transform : _root, false);
                if (boneParent) _boneParents.Add((kv.Key, parentName, def));
                var a = go.AddComponent<MVActor>();
                a.basePos = V(def["pos"], Vector3.zero); a.baseEuler = V(def["rot"], Vector3.zero); a.baseScale = def["scale"] != null ? V(def["scale"], Vector3.one) : Vector3.one;
                go.transform.localPosition = a.basePos; go.transform.localEulerAngles = a.baseEuler; go.transform.localScale = a.baseScale;
                string model = (string)def["model"] ?? "prim:cube";
                var crowd = def["crowd"] as JObject;
                var models = def["models"] as JArray;
                if (crowd != null)
                {
                    int n = (int?)crowd["count"] ?? 20; string shape = (string)crowd["shape"] ?? "scatter";
                    float sp = (float?)crowd["spacing"] ?? 2, rad = (float?)crowd["radius"] ?? 10, sv = (float?)crowd["scaleVar"] ?? .1f, ms = (float?)crowd["modelScale"] ?? 1;
                    var rng = new System.Random((int?)crowd["seed"] ?? 1);
                    int side = Mathf.CeilToInt(Mathf.Sqrt(n));
                    var mem = new List<Transform>(); var clips = new List<AnimationClip>();
                    for (int i = 0; i < n; i++)
                    {
                        var mdl = models != null ? (string)models[i % models.Count] : model;
                        var o = Spawn(mdl, def, go.transform);
                        Vector3 p;
                        if (shape == "grid") p = new Vector3((i % side - (side - 1) / 2f) * sp, 0, (i / side - (side - 1) / 2f) * sp);
                        else if (shape == "line") p = new Vector3((i - (n - 1) / 2f) * sp, 0, 0);
                        else if (shape == "wall") p = new Vector3((i % side - (side - 1) / 2f) * sp * 1.15f, i / side * sp * .8f, 0);
                        else if (shape == "dome") { float q = (float)rng.NextDouble() * Mathf.PI * 2, y = (float)rng.NextDouble() * 1.7f - .7f, r = Mathf.Sqrt(Mathf.Max(0, 1 - y * y)); p = new Vector3(Mathf.Sin(q) * r, y, Mathf.Cos(q) * r) * rad; }
                        else if (shape == "circle") { float q = i * Mathf.PI * 2 / n; p = new Vector3(Mathf.Sin(q) * rad, 0, Mathf.Cos(q) * rad); }
                        else { float q = (float)rng.NextDouble() * Mathf.PI * 2, inner = (float?)crowd["inner"] ?? 0, r = Mathf.Lerp(inner, rad, Mathf.Sqrt((float)rng.NextDouble())); p = new Vector3(Mathf.Sin(q) * r, 0, Mathf.Cos(q) * r); }
                        if (crowd["yRange"] is JArray yr) p.y = Mathf.Lerp((float)yr[0], (float)yr[1], (float)rng.NextDouble());
                        o.transform.localPosition = p;
                        if (crowd["screen"] is JObject sc) WallScreen(o, sc);
                        o.transform.localEulerAngles = shape == "circle" ? new Vector3(0, i * 360f / n + 180, 0) : new Vector3(0, (crowd["face"] != null ? (float)crowd["face"] : (float)rng.NextDouble() * 360), 0);
                        o.transform.localScale = o.transform.localScale * (ms * (1 + ((float)rng.NextDouble() - .5f) * 2 * sv));
                        mem.Add(o.transform); clips.AddRange(ClipsOf(o, mdl));
                    }
                    a.members = mem.ToArray();
                    a.memberPos = mem.Select(x => x.localPosition).ToArray(); a.memberEuler = mem.Select(x => x.localEulerAngles).ToArray(); a.memberScale = mem.Select(x => x.localScale).ToArray();
                    a.clips = clips.Distinct().ToArray();
                }
                else
                {
                    var o = Spawn(model, def, go.transform);
                    a.animRoot = o; a.clips = ClipsOf(o, model);
                    FillHuman(a, o);
                }
                _actors[kv.Key] = a;
                if (def["shell"] != null) a.gameObject.AddComponent<MVShell>().room = (string)def["shell"] == "room";
                if (def["grass"] != null) a.gameObject.AddComponent<MVGrass>().Setup(def["grass"].ToString());
                if (def["fence"] is JObject fe) a.gameObject.AddComponent<MVFence>().Setup(fe.ToString(), TexMat((string)fe["texture"], Vector2.one, 0, Col(fe["color"], Color.white), .25f));
                if (def["mountain"] != null) a.gameObject.AddComponent<MVFeatherMountain>().Setup(def["mountain"].ToString());
                if (def["eye"] != null) a.gameObject.AddComponent<MVEyeRig>().Setup(def["eye"].ToString());
                if (def["space"] != null) a.gameObject.AddComponent<MVSpace>().Setup(def["space"].ToString());
                if (def["tv"] is JObject tv) MakeTv(a, tv);
                ActorOps(kv.Key, def);
            }
        }

        /// <summary>What an actor's definition puts on its track, apart from the object itself.</summary>
        void ActorOps(string name, JObject def)
        {
            if (def["mountain"] != null || def["grass"] != null) Op(Track(name), "show", 0, .01, new JObject());
            if (def["eye"] != null || def["space"] != null) Op(Track(name), "show", 0, .01, new JObject());
            if (def["from"] != null || def["until"] != null)
            {
                double from = T(def["from"], 0);
                if (from > 0) Op(Track(name), "hide", 0, from, new JObject());
                Op(Track(name), "show", from, .01, new JObject());
                if (def["until"] != null) Op(Track(name), "hide", T(def["until"], 0), .01, new JObject());
            }
        }

        readonly List<(string name, string parent, JObject def)> _boneParents = new List<(string, string, JObject)>();

        /// <summary>Records a Humanoid's bones and how they sit at rest, so the score can pose it in terms of the actor.</summary>
        /// <summary>A stand-in for the lab that isn't in the open scene: a prim, a model path or an alias from the score's models, as a plain actor.</summary>
        public static MVActor LabActor(JObject score, string name, string model, JObject def)
        {
            var sc = new ScoreCompiler { _score = score ?? new JObject() };
            var go = new GameObject(name);
            var a = go.AddComponent<MVActor>();
            a.basePos = V(def["pos"], Vector3.zero); a.baseEuler = V(def["rot"], Vector3.zero); a.baseScale = def["scale"] != null ? V(def["scale"], Vector3.one) : Vector3.one;
            go.transform.localPosition = a.basePos; go.transform.localEulerAngles = a.baseEuler; go.transform.localScale = a.baseScale;
            var o = sc.Spawn(model, def, go.transform);
            a.animRoot = o; a.clips = ClipsOf(o, model);
            FillHuman(a, o);
            return a;
        }

        static void FillHuman(MVActor a, GameObject o)
        {
            var an = o.GetComponentInChildren<Animator>(true);
            if (!an || !an.isHuman) return;
            int n = (int)HumanBodyBones.LastBone;
            a.human = new Transform[n]; a.humanRest = new Quaternion[n]; a.curlAxis = new Vector3[n];
            for (int i = 0; i < n; i++)
            {
                var t = an.GetBoneTransform((HumanBodyBones)i); a.human[i] = t;
                if (t) a.humanRest[i] = Quaternion.Inverse(o.transform.rotation) * t.rotation;
            }
            var head = a.human[(int)HumanBodyBones.Head];
            if (head)
            {
                var m = new GameObject("mouth").transform; m.SetParent(head, false);
                m.position = head.position + o.transform.up * .045f + o.transform.forward * .1f;
            }
            for (int side = 0; side < 2; side++)
            {
                int first = (int)HumanBodyBones.LeftThumbProximal + side * 15;
                var hand = a.human[(int)(side == 0 ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand)];
                Transform ix = a.human[first + 3], li = a.human[first + 12];
                if (!hand || !ix || !li) continue;
                var palm = Vector3.Cross(ix.position - hand.position, li.position - hand.position).normalized;
                if (Vector3.Dot(palm, Vector3.down) < 0) palm = -palm;
                for (int f = 0; f < 5; f++)
                    for (int j = 0; j < 3; j++)
                    {
                        var b = a.human[first + f * 3 + j]; if (!b) continue;
                        var next = j < 2 ? a.human[first + f * 3 + j + 1] : null;
                        var dir = next ? (next.position - b.position).normalized : (b.position - b.parent.position).normalized;
                        a.curlAxis[first + f * 3 + j] = Quaternion.Inverse(b.rotation) * Vector3.Cross(dir, palm).normalized;
                    }
            }
        }

        void BoneParents()
        {
            foreach (var (name, parent, def) in _boneParents)
                Op(Track(name), "attach", 0, .01, new JObject { ["to"] = parent, ["pos"] = def["pos"] ?? new JArray(0, 0, 0), ["rot"] = def["rot"] ?? new JArray(0, 0, 0), ["scaled"] = (float?)def["scaled"] ?? 0 });
        }

        void EnsureDeform(MVActor a, float edge)
        {
            if (a.GetComponent<MVDeform>()) return;
            var d = a.gameObject.AddComponent<MVDeform>();
            var fs = new List<MeshFilter>(); var ms = new List<Mesh>();
            foreach (var f in a.GetComponentsInChildren<MeshFilter>(true))
            {
                if (!f.sharedMesh || f.GetComponent<TMPro.TMP_Text>()) continue;
                float sc = (f.transform.lossyScale.x + f.transform.lossyScale.y + f.transform.lossyScale.z) / 3;
                var m = MeshTools.Tessellate(f.sharedMesh, edge / Mathf.Max(sc, .001f));
                f.sharedMesh = m; fs.Add(f); ms.Add(m);
            }
            d.filters = fs.ToArray(); d.rest = ms.ToArray();
        }

        /// <summary>A screen on a crowd TV, showing the shared feed.</summary>
        void WallScreen(GameObject tv, JObject d)
        {
            var path = Gen + "/TvWall.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!mat) { mat = new Material(Shader.Find("MV/TvScreen")); AssetDatabase.CreateAsset(mat, path); }
            var rt = AssetDatabase.LoadAssetAtPath<RenderTexture>(Gen + "/TvFeed.renderTexture");
            mat.SetTexture("_Feed", rt); mat.SetFloat("_FeedMix", 1); mat.SetFloat("_Bright", 2.2f); mat.SetFloat("_UseWall", 1);
            var own = ScreenOf(tv);
            GameObject scr = own ? own.gameObject : GameObject.CreatePrimitive(PrimitiveType.Quad);
            if (!own)
            {
                UnityEngine.Object.DestroyImmediate(scr.GetComponent<Collider>());
                scr.transform.SetParent(tv.transform, false);
                scr.transform.localPosition = V(d["pos"], Vector3.zero);
                var size = V2(d["size"], Vector2.one); scr.transform.localScale = new Vector3(size.x, size.y, 1);
            }
            var r = scr.GetComponent<Renderer>(); r.sharedMaterial = mat; r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        /// <summary>A model that brings its own glass: a child mesh called "screen".</summary>
        static Renderer ScreenOf(GameObject g)
        {
            foreach (var r in g.GetComponentsInChildren<MeshRenderer>(true)) if (r.name.Equals("screen", StringComparison.OrdinalIgnoreCase)) return r;
            return null;
        }

        void MakeTv(MVActor a, JObject d)
        {
            var mv = a.gameObject.AddComponent<MVTv>();
            var own = ScreenOf(a.gameObject);
            GameObject scr = own ? own.gameObject : GameObject.CreatePrimitive(PrimitiveType.Quad);
            if (!own)
            {
                UnityEngine.Object.DestroyImmediate(scr.GetComponent<Collider>());
                scr.name = "screen"; scr.transform.SetParent(a.transform, false);
                scr.transform.localPosition = V(d["screenPos"], new Vector3(0, .5f, 0));
                scr.transform.localEulerAngles = V(d["screenRot"], Vector3.zero);
                var size = V2(d["size"], new Vector2(1.2f, .7f)); scr.transform.localScale = new Vector3(size.x, size.y, 1);
            }
            var mat = AssetDatabase.LoadAssetAtPath<Material>(Gen + "/TvScreen.mat");
            if (!mat) { mat = new Material(Shader.Find("MV/TvScreen")); AssetDatabase.CreateAsset(mat, Gen + "/TvScreen.mat"); }
            var rend = scr.GetComponent<Renderer>(); rend.sharedMaterial = mat; rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            mv.screen = rend;
            var dir = scr.transform.rotation * Vector3.back; // a quad shows its face toward -z, the picture looks out along this
            var ls = new List<Light>(); var sc = new List<float>();
            var spot = new GameObject("spill").AddComponent<Light>(); spot.transform.SetParent(scr.transform, false);
            spot.transform.position = scr.transform.position; spot.transform.rotation = Quaternion.LookRotation(dir);
            spot.type = LightType.Spot; spot.spotAngle = (float?)d["angle"] ?? 130; spot.innerSpotAngle = 30; spot.range = (float?)d["range"] ?? 14; spot.shadows = LightShadows.Soft;
            ls.Add(spot); sc.Add((float?)d["spill"] ?? 12);
            var glow = new GameObject("glow").AddComponent<Light>(); glow.transform.SetParent(scr.transform, false);
            glow.transform.position = scr.transform.position + dir * .3f; glow.type = LightType.Point; glow.range = (float?)d["glowRange"] ?? 5;
            ls.Add(glow); sc.Add((float?)d["glow"] ?? 2);
            mv.lights = ls.ToArray(); mv.lightScale = sc.ToArray();
            if ((bool?)d["suck"] != false) { _stage.suckPoint = scr.transform.position; mv.lead = true; }
            if (d["share"] != null && _actors.TryGetValue((string)d["share"], out var other)) mv.feed = other.GetComponent<MVTv>().feed;
            if (d["feed"] is JObject f)
            {
                var path = Gen + "/TvFeed.renderTexture";
                var rt = AssetDatabase.LoadAssetAtPath<RenderTexture>(path);
                if (rt && (rt.width != 640 || rt.height != 480)) { AssetDatabase.DeleteAsset(path); rt = null; }
                mv.stage = _stage;
                if (!rt) { rt = new RenderTexture(640, 480, 24, RenderTextureFormat.ARGB32); AssetDatabase.CreateAsset(rt, path); }
                mv.feed = rt;
                if (GameObject.Find("FeedCamera") == null)
                {
                    // feedcam is the corner camera as an actor (it can sit under cctv_head); the real camera copies whichever source is on.
                    var src = new GameObject("feedcam");
                    src.transform.SetParent(f["parent"] != null && _actors.TryGetValue((string)f["parent"], out var fp) ? fp.transform : _root, false);
                    src.transform.localPosition = V(f["pos"], Vector3.up); src.transform.localEulerAngles = V(f["rot"], Vector3.zero);
                    var ca = src.AddComponent<MVActor>(); ca.basePos = src.transform.localPosition; ca.baseEuler = src.transform.localEulerAngles; ca.fov = (float?)f["fov"] ?? 70; _actors["feedcam"] = ca;
                    var cg = new GameObject("FeedCamera"); cg.transform.SetParent(_root, false);
                    cg.transform.SetPositionAndRotation(src.transform.position, src.transform.rotation);
                    var fc = cg.AddComponent<Camera>(); fc.fieldOfView = ca.fov; fc.targetTexture = rt; fc.nearClipPlane = .05f; fc.farClipPlane = 900; fc.depth = -10;
                    var ud = cg.AddComponent<UniversalAdditionalCameraData>(); ud.renderPostProcessing = false; ud.antialiasing = AntialiasingMode.None; ud.renderShadows = (bool?)f["shadows"] ?? false;
                    mv.feedCamera = fc;
                    var fcanvas = new GameObject("FeedOverlay", typeof(RectTransform)); fcanvas.transform.SetParent(_stage.transform, false);
                    var can = fcanvas.AddComponent<Canvas>(); can.renderMode = RenderMode.ScreenSpaceCamera; can.worldCamera = fc; can.planeDistance = .1f;
                    var cs = fcanvas.AddComponent<CanvasScaler>(); cs.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; cs.referenceResolution = new Vector2(1440, 1080); cs.matchWidthOrHeight = .5f;
                    _stage.gfx[1] = MakeGfx(fcanvas.transform);
                }
            }
        }

        Lane Track(string actor)
        {
            if (!_actors.ContainsKey(actor)) throw new Exception("no actor named '" + actor + "'");
            if (_labOps != null) return null;
            if (!_motion.TryGetValue(actor, out var t)) _motion[actor] = t = NewLane(actor, typeof(MotionTrack));
            return t;
        }

        void Op(Lane track, string kind, double start, double dur, JObject args, params UnityEngine.Object[] refs)
        {
            if (_labOps != null) { _labOps.Add(new Op { start = Math.Max(0, start), end = Math.Max(0, start) + Math.Max(dur, 1.0 / 60), kind = kind, a = Args.Parse(args.ToString(Newtonsoft.Json.Formatting.None)), refs = refs }); return; }
            track.ops.Add(new LaneOp { kind = kind, start = Math.Max(0, start), dur = Math.Max(dur, 1.0 / 60), args = args.ToString(Newtonsoft.Json.Formatting.None), refs = refs });
            _ops++;
        }

        // ---------- cues ----------

        void Cue(JObject c, Dictionary<string, JToken> subs)
        {
            if (subs != null) c = Substitute(c, subs);
            double t = T(c["at"], _prev);
            _prev = t;

            if (c["onsets"] != null)
            {
                var src = _song.Hits((string)c["onsets"]);
                if (src == null) { _warn.Add("no hits called " + c["onsets"]); return; }
                double until = T(c["until"], _song.duration);
                foreach (var o in src.Where(x => x >= t - .01 && x < until)) Fire(With(c, o));
                return;
            }
            if (c["repeat"] != null)
            {
                double b0 = _song.BeatAt(t), step = Beats(c["repeat"]);
                int times = (int?)c["times"] ?? 1000000;
                double until = c["until"] != null ? T(c["until"], t) : double.MaxValue;
                for (int i = 0; i < times; i++)
                {
                    double ti = _song.TimeOf(b0 + i * step);
                    if (ti >= until || ti >= _song.duration) break;
                    Fire(With(c, ti));
                }
                return;
            }
            Fire(With(c, t));
        }

        /// <summary>A tween is at 0 on its own first frame. "for":0 means already there, so it starts a tick early and is done on that frame.</summary>
        static double Now0(double t, double len) => len <= 0 ? t - 1.0 / 60 : t;

        static JObject With(JObject c, double t) { var x = (JObject)c.DeepClone(); x["__t"] = t; return x; }

        static JObject Substitute(JObject c, Dictionary<string, JToken> subs)
        {
            var s = c.ToString(Newtonsoft.Json.Formatting.None);
            foreach (var kv in subs)
                s = s.Replace("\"$" + kv.Key + "\"", kv.Value.ToString(Newtonsoft.Json.Formatting.None));
            return JObject.Parse(s);
        }

        JObject ArgsOf(JObject c)
        {
            var a = new JObject();
            foreach (var kv in c) if (!kv.Key.StartsWith("__") && Array.IndexOf(Meta, kv.Key) < 0) a[kv.Key] = kv.Value;
            return a;
        }

        void Fire(JObject c)
        {
            double t = (double)c["__t"];
            double Len(double def) => c["for"] != null || c["repeat"] != null || c["onsets"] != null ? Dur(c["for"], t, def) : c["until"] != null ? T(c["until"], t) - t : def;
            // Any cue can carry a sound: "sfx":"couch_slam", with "sfxAt":"+2b" and "sfxVolume":0.8.
            if (c["sfx"] != null && c["macro"] == null) CueSound(c, t);
            if (c["macro"] != null)
            {
                var def = _score["macros"]?[(string)c["macro"]] as JArray;
                if (def == null) { _warn.Add("no macro " + c["macro"]); return; }
                var subs = new Dictionary<string, JToken>();
                foreach (var kv in c) if (kv.Key != "macro" && kv.Key != "at" && !kv.Key.StartsWith("__")) subs[kv.Key] = kv.Value;
                double keep = _prev;
                foreach (var inner in def.OfType<JObject>()) { _prev = t; Cue(inner, subs); }
                _prev = keep;
            }
            else if (c["shot"] != null) _shots.Add(new ShotInfo { t = t, s = (JObject)c["shot"], end = c["for"] != null || c["until"] != null ? t + Len(0) : (double?)null });
            else if (c["do"] != null && EpicDo(c, t)) { } // impactframe, speedlines, shake, silence, freeze, hitshake, smear (MVEpicScore.cs)
            else if (c["do"] != null)
            {
                var targets = c["on"] is JArray arr ? arr.Select(x => (string)x).ToArray() : new[] { (string)c["on"] };
                foreach (var name in targets)
                {
                    if (name == null) { _warn.Add("'do' needs 'on': " + c); continue; }
                    var a = ArgsOf(c); string kind = (string)c["do"];
                    if (c["every"] != null) a["every"] = Beats(c["every"]);
                    if (c["stagger"] != null) a["stagger"] = Dur(c["stagger"], t, 0);
                    if (!_actors.ContainsKey(name)) { _warn.Add("no actor '" + name + "'"); continue; }
                    var actor = _actors[name];
                    if (actor.members.Length > 0 && a["each"] == null) a["each"] = 1;
                    if (kind == "suck" && a["to"] == null) { var sp = _stage.suckPoint - (actor.members.Length > 0 ? actor.basePos : Vector3.zero); a["to"] = new JArray(sp.x, sp.y, sp.z); }
                    foreach (var key in new[] { "blend", "return", "turn", "jerk", "delay", "release" })
                        if (a[key] != null) a[key] = Dur(a[key], t, 0);
                    if (kind == "ripple" || kind == "peel" || kind == "bulge") EnsureDeform(actor, (float?)c["edge"] ?? (kind == "peel" ? .1f : .14f));
                    double len = Len(kind == "set" || kind == "pose" && false ? .01 : 1);
                    if (kind == "topple" && c["land"] != null) a["land"] = (T(c["land"], t) - t) / Math.Max(len, 1e-4);
                    if (kind == "anim" && c["blendTree"] != null) { TreeCue(name, actor, c, a, t, len); continue; }
                    if (kind == "anim" || kind == "walk")
                    {
                        var clip = actor.FindClip((string)c["clip"] ?? "") ?? ProjectClip((string)c["clip"]);
                        if (!clip) { _warn.Add($"{name}: no clip '{c["clip"]}' on it or in the project. Find it with mv find, then mv pull"); continue; }
                        if (a["start"] != null) a["start"] = (float)a["start"];
                        CheckAdmitted(name, actor, clip);
                        if (kind == "anim" && c["warpTo"] != null) WarpCue(name, actor, c, a, clip, t, len);
                        Op(Track(name), c["rootOnly"] != null ? "root" + kind : kind, t, len, a, clip);
                        continue;
                    }
                    if (MotionCue(name, actor, kind, c, a, t, len)) continue;
                    Op(Track(name), kind, t, len, a);
                }
            }
            else if (c["fx"] != null)
            {
                var name = (string)c["fx"]; var a = ArgsOf(c);
                if (c["on"] != null) a["on"] = c["on"];
                PunchFx(name, c, a, t);
                EpicFx(name, c, a, t);
                UnityEngine.Object prefab = null;
                if (name.StartsWith("prefab:")) { prefab = AssetDatabase.LoadAssetAtPath<GameObject>(name.Substring(7)); if (!prefab) _warn.Add("no prefab " + name); }
                Op(_fx, prefab ? "prefab" : name, t, Len(FxLibrary.DefaultLife(name)), a, prefab ? new[] { prefab } : new UnityEngine.Object[0]);
            }
            else if (c["insert"] != null)
            {
                var a = ArgsOf(c); a["name"] = c["insert"];
                if (!Directory.Exists(Path.Combine(Video.Dir, "inserts", (string)c["insert"]))) { _warn.Add("no footage called " + c["insert"]); return; }
                Op(_insert, "insert", t, Len(3), a);
            }
            else if (c["steps"] != null) _steps.Add((t, Len(.01), (float)c["steps"]));
            else if (c["lightreact"] != null) { var a = ArgsOf(c); a["name"] = c["lightreact"]; Op(_light, "react", t, Len(1), a); }
            else if (c["speed"] != null && c["gfx"] == null) // a ticker's speed is its scroll, not scene time
            {
                double len = Len(.01); float v = (float)c["speed"];
                _speeds.Add((t, len, v, (string)c["ease"] ?? "inout"));
                Op(_time, "x" + v, t, len, new JObject());
            }
            else if (c["gfx"] != null) { if (!GfxCue(c, t, Len(2))) return; }
            else if (c["flip"] != null) FlipCue(c, t, Len(_song.TimeOf(_song.BeatAt(t) + .5) - t));
            else if (c["tv"] != null || c["tvflash"] != null || c["tvchange"] != null || c["tvreact"] != null || c["tvclip"] != null)
            {
                string kind = c["tv"] != null ? "tv" : c["tvflash"] != null ? "tvflash" : c["tvchange"] != null ? "tvchange" : c["tvclip"] != null ? "tvclip" : "tvreact";
                var name = (string)c[kind]; var a = ArgsOf(c);
                if (c["every"] != null) a["every"] = Beats(c["every"]);
                if (!_actors.ContainsKey(name) || !_actors[name].GetComponent<MVTv>()) { _warn.Add("no TV called '" + name + "'"); return; }
                var tr = TvLane(name);
                if (a["flip"] != null) a["flip"] = Dur(a["flip"], t, 0);
                if (kind == "tv" && c.Property("show") != null && c["show"].Type == JTokenType.Null) a["show"] = "";
                if (kind == "tv" && a["show"] != null && (string)a["show"] != "" && _score["shows"]?[(string)a["show"]] == null) _warn.Add("no show called " + a["show"]);
                Op(tr, kind, t, Len(kind == "tv" || kind == "tvclip" ? .01 : 1), a);
            }
            else if (c["grade"] != null) { var a = (JObject)c["grade"].DeepClone(); if (c["ease"] != null) a["ease"] = c["ease"]; var ln = Len(.01); Op(_post, "grade", Now0(t, ln), ln, a); }
            else if (c["pulse"] != null)
            {
                var a = (JObject)c["pulse"].DeepClone();
                if (c["every"] != null) a["every"] = Beats(c["every"]);
                Op(_post, "pulse", t, Len(_song.TimeOf(_song.BeatAt(t) + 1) - t), a);
            }
            else if (c["light"] != null) { var a = ArgsOf(c); a["name"] = c["light"]; var ln = Len(.01); Op(_light, "light", Now0(t, ln), ln, a); }
            else if (c["strobe"] != null) { var a = ArgsOf(c); a["name"] = c["strobe"]; if (c["every"] != null) a["every"] = Beats(c["every"]); Op(_light, "strobe", t, Len(1), a); }
            else if (c["sky"] != null) { var a = (JObject)c["sky"].DeepClone(); if (c["ease"] != null) a["ease"] = c["ease"]; var ln = Len(.01); Op(_light, "sky", Now0(t, ln), ln, a); }
            else if (c["text"] != null) { var tc = TypeCue(c); var a = ArgsOf(tc); a["text"] = tc["text"]; Op(_text, "text", t, Len(2), a); }
            else if (c["sfx"] != null) { }
            else _warn.Add("cue does nothing: " + c.ToString(Newtonsoft.Json.Formatting.None));
        }

        static readonly Dictionary<string, AnimationClip> _clipFound = new Dictionary<string, AnimationClip>();

        static AnimationClip ProjectClip(string name)
        {
            if (!_clipFound.TryGetValue(name, out var c0)) _clipFound[name] = c0 = FindClip(name);
            return c0;
        }

        static AnimationClip FindClip(string name)
        {
            var dropped = DroppedClip(name); if (dropped) return dropped;
            foreach (var g in AssetDatabase.FindAssets(name + " t:AnimationClip"))
            {
                var p = AssetDatabase.GUIDToAssetPath(g);
                foreach (var o in AssetDatabase.LoadAllAssetsAtPath(p))
                    if (o is AnimationClip c && !c.name.StartsWith("__preview") && c.name.Equals(name, StringComparison.OrdinalIgnoreCase)) return c;
            }
            foreach (var g in AssetDatabase.FindAssets(name + " t:AnimationClip"))
                foreach (var o in AssetDatabase.LoadAllAssetsAtPath(AssetDatabase.GUIDToAssetPath(g)))
                    if (o is AnimationClip c && !c.name.StartsWith("__preview")) return c;
            return null;
        }

        void HumanClip(MVActor a, string name, string clipName, double t, double len)
        {
            var an = a.animRoot ? a.animRoot.GetComponentInChildren<Animator>(true) : null;
            if (!an) { _warn.Add(name + " has no Animator for humanoid clip " + clipName); return; }
            an.enabled = true; an.applyRootMotion = false;
            var tr = _tl.GetOutputTracks().OfType<AnimationTrack>().FirstOrDefault(x => x.name == "anim_" + name);
            if (!tr) { tr = _tl.CreateTrack<AnimationTrack>(null, "anim_" + name); _dir.SetGenericBinding(tr, an); }
            var clip = a.FindClip(clipName);
            var tc = tr.CreateClip(clip); tc.start = t; tc.duration = len; tc.displayName = clip.name;
            if (clip.isLooping || len > clip.length) ((AnimationPlayableAsset)tc.asset).loop = AnimationPlayableAsset.LoopMode.On;
        }

        void Sfx(string path, double t, float vol)
        {
            if (!path.StartsWith("Assets/"))
                foreach (var e in new[] { ".wav", ".mp3", ".ogg" }) if (File.Exists("Assets/MusicVideo/Sfx/" + path + e)) { path = "Assets/MusicVideo/Sfx/" + path + e; break; }
            var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(path);
            if (!clip) { _warn.Add("no sound at " + path); return; }
            int lane = _sfxEnd.FindIndex(e => e <= t);
            if (lane < 0)
            {
                lane = _sfxLanes.Count;
                var tr = _tl.CreateTrack<AudioTrack>(null, "Sfx " + (lane + 1));
                _dir.SetGenericBinding(tr, _dir.transform.Find("Sfx").GetComponent<AudioSource>());
                _sfxLanes.Add(tr); _sfxEnd.Add(0);
            }
            var tc = _sfxLanes[lane].CreateClip(clip); tc.start = t;
            var so = new SerializedObject((UnityEngine.Object)tc.asset);
            var vp = so.FindProperty("m_ClipProperties.volume"); if (vp != null) { vp.floatValue = vol; so.ApplyModifiedPropertiesWithoutUndo(); }
            _sfxEnd[lane] = t + clip.length;
            _sfxList.Add(new { path = Path.GetFullPath(path), t, volume = vol });
        }

        // ---------- shots ----------

        readonly List<(CinemachineCamera vc, ShotInfo sh, double end)> _aims = new List<(CinemachineCamera, ShotInfo, double)>();

        /// <summary>Follows each moving subject through its shot, then holds the aim until it leaves a dead zone of about a fifth of the frame.</summary>
        void BakeAim()
        {
            const float step = .2f;
            foreach (var (vc, sh, end) in _aims)
            {
                int n = Mathf.Max(2, (int)Math.Ceiling((end - sh.t) / step) + 1);
                var raw = new Vector3[n];
                for (int i = 0; i < n; i++) { _dir.time = Math.Min(sh.t + i * step, end - .001); _dir.Evaluate(); MVLate.Flush(); raw[i] = vc.LookAt.position; }
                var cam = V(sh.s["pos"], vc.transform.position);
                float fov = (float?)sh.s["fov"] ?? 40, r = Vector3.Distance(cam, raw[0]) * Mathf.Tan(fov * .5f * Mathf.Deg2Rad) * .2f;
                var p = raw[0];
                for (int i = 0; i < n; i++) { var d = raw[i] - p; if (d.magnitude > r) p += d * (1 - r / d.magnitude); raw[i] = p; }
                for (int pass = 0; pass < 3; pass++)
                {
                    var o = (Vector3[])raw.Clone();
                    for (int i = 1; i < n - 1; i++) raw[i] = (o[i - 1] + o[i] * 2 + o[i + 1]) / 4;
                }
                var fx = vc.GetComponent<MVCamFx>(); fx.aimPath = raw; fx.aimStart = sh.t; fx.aimStep = step;
            }
            _dir.time = 0; _dir.Evaluate();
        }

        void FinishShots()
        {
            if (_shots.Count == 0) _shots.Add(new ShotInfo { t = 0, s = new JObject { ["pos"] = new JArray(0, 2, -10), ["fov"] = 40 } });
            _shots.Sort((a, b) => a.t.CompareTo(b.t));
            foreach (var sh in _shots) StyleShot(sh.s);
            TimelineClip prev = null;
            for (int i = 0; i < _shots.Count; i++)
            {
                var sh = _shots[i];
                double end = sh.end ?? (i + 1 < _shots.Count ? _shots[i + 1].t : _song.duration);
                double blend = sh.s["blend"] != null ? Dur(sh.s["blend"], sh.t, 0) : 0;
                string name = $"shot_{i + 1:000}";
                var vc = MakeCam(name, sh.s);
                var clip = _cam.CreateClip<CinemachineShot>(); clip.start = sh.t; clip.duration = end - sh.t; clip.displayName = (string)sh.s["name"] ?? name;
                var shot = (CinemachineShot)clip.asset;
                shot.VirtualCamera.exposedName = GUID.Generate().ToString();
                _dir.SetReferenceValue(shot.VirtualCamera.exposedName, vc);
                _shotRefs.Add(shot.VirtualCamera.exposedName); _shotObjects.Add(vc.gameObject);
                if (prev != null && blend > 0)
                {
                    prev.duration = Math.Max(prev.duration, sh.t + blend - prev.start);
                    prev.blendOutDuration = blend; clip.blendInDuration = blend;
                }
                prev = clip;
                ShotMotion(name, sh, end);
                if (vc.LookAt && (bool?)sh.s["deadzone"] != false && (vc.LookAt.GetComponentInParent<Animator>() || vc.LookAt.name.EndsWith("_lead"))) _aims.Add((vc, sh, end));
                if (sh.s["fovTo"] != null)
                {
                    var fx = vc.GetComponent<MVCamFx>();
                    fx.fovFrom = (float?)sh.s["fov"] ?? 40; fx.fovTo = (float)sh.s["fovTo"]; fx.fovStart = sh.t;
                    fx.fovEnd = sh.s["fovFor"] != null ? sh.t + Dur(sh.s["fovFor"], sh.t, end - sh.t) : end; fx.fovEase = (string)sh.s["fovEase"] ?? "linear";
                }
            }
        }

        Transform Resolve(string name)
        {
            if (name == null) return null;
            var parts = name.Split('.');
            var nm = parts[0]; int member = -1; int h = nm.IndexOf('#');
            if (h > 0) { int.TryParse(nm.Substring(h + 1), out member); nm = nm.Substring(0, h); }
            if (!_actors.TryGetValue(nm, out var a)) { _warn.Add("no actor '" + name + "' for camera"); return null; }
            var from = member >= 0 && member < a.members.Length ? a.members[member] : a.transform;
            if (parts.Length == 1) return from;
            var tr = a.Bone(parts[1], from);
            if (tr) return tr;
            if (a.human.Length > 0 && a.human[(int)HumanBodyBones.Head]) return a.human[(int)HumanBodyBones.Head];
            _warn.Add("no bone '" + name + "'");
            return a.transform;
        }

        CinemachineCamera MakeCam(string name, JObject s)
        {
            var go = new GameObject(name); go.transform.SetParent(_root, false);
            var a = go.AddComponent<MVActor>();
            a.smoothTime = true;
            _actors[name] = a;
            a.basePos = V(s["pos"], new Vector3(0, 2, -10)); a.baseEuler = V(s["rot"], Vector3.zero);
            go.transform.position = a.basePos; go.transform.eulerAngles = a.baseEuler;
            var vc = go.AddComponent<CinemachineCamera>();
            var lens = LensSettings.Default; lens.FieldOfView = (float?)s["fov"] ?? 40; lens.NearClipPlane = .1f; lens.FarClipPlane = 2000; lens.Dutch = (float?)s["dutch"] ?? 0;
            vc.Lens = lens;
            var fx = go.AddComponent<MVCamFx>(); fx.handheld = (float?)s["handheld"] ?? 0; fx.aperture = (float?)s["aperture"] ?? 0;
            if (s["focus"] != null) fx.focus = Resolve((string)s["focus"]);

            Transform Find(JToken t) => Resolve((string)t);
            if (s["frame"] is JArray group)
            {
                var gg = new GameObject(name + "_group"); gg.transform.SetParent(_root, false); _shotObjects.Add(gg);
                var tg = gg.AddComponent<CinemachineTargetGroup>();
                foreach (var g in group) { var tr = Find(g); if (tr) tg.AddMember(tr, 1, 1); }
                vc.LookAt = gg.transform; vc.Follow = gg.transform;
                var rc = go.AddComponent<CinemachineRotationComposer>(); rc.Damping = Vector2.zero;
                var gf = go.AddComponent<CinemachineGroupFraming>(); gf.FramingSize = (float?)s["framing"] ?? .7f; gf.Damping = 0;
            }
            var look = Find(s["look"]);
            if (look)
            {
                vc.LookAt = look;
                var rc = go.AddComponent<CinemachineRotationComposer>(); rc.Damping = V2(s["damping"], Vector2.zero);
                rc.TargetOffset = V(s["lookOffset"], Vector3.zero);
                var comp = rc.Composition; comp.DeadZone.Enabled = false; comp.ScreenPosition = V2(s["screen"], Vector2.zero); rc.Composition = comp;
            }
            var follow = Find(s["follow"]);
            if (follow && s["lag"] == null && s["lead"] == null) // with lag or lead the camera chases on its own track (MVPunchScore.cs)
            {
                vc.Follow = follow;
                var f = go.AddComponent<CinemachineFollow>(); f.FollowOffset = V(s["offset"], new Vector3(0, 2, -6));
                var ts = f.TrackerSettings; ts.PositionDamping = V(s["followDamping"], Vector3.zero); f.TrackerSettings = ts;
            }
            if (s["dolly"] is JArray pts)
            {
                var sg = new GameObject(name + "_path"); sg.transform.SetParent(_root, false); _shotObjects.Add(sg);
                var sc = sg.AddComponent<SplineContainer>();
                var knots = pts.Select(p => (Unity.Mathematics.float3)V(p, Vector3.zero)).ToList();
                sc.Spline.Clear();
                foreach (var k in knots) sc.Spline.Add(new BezierKnot(k), TangentMode.AutoSmooth);
                var d = go.AddComponent<CinemachineSplineDolly>(); d.Spline = sc; d.PositionUnits = PathIndexUnit.Normalized; d.CameraRotation = CinemachineSplineDolly.RotationMode.Default;
            }
            if (s["noise"] != null)
            {
                var n = go.AddComponent<CinemachineBasicMultiChannelPerlin>();
                n.NoiseProfile = AssetDatabase.LoadAssetAtPath<NoiseSettings>(AssetDatabase.GUIDToAssetPath(AssetDatabase.FindAssets((string)s["noise"] + " t:NoiseSettings").FirstOrDefault() ?? ""));
                n.AmplitudeGain = (float?)s["noiseAmp"] ?? 1; n.FrequencyGain = (float?)s["noiseFreq"] ?? 1;
            }
            return vc;
        }

        static Vector2 V2(JToken t, Vector2 d) => t is JArray a && a.Count == 2 ? new Vector2((float)a[0], (float)a[1]) : d;

        void ShotMotion(string name, ShotInfo sh, double end)
        {
            var s = sh.s; double len = end - sh.t;
            PunchShot(name, sh, end);
            if (s["move"] != null) Op(Track(name), "move", sh.t, len, new JObject { ["pos"] = s["move"], ["ease"] = s["ease"] ?? "linear" });
            if (s["rotate"] != null) Op(Track(name), "rotate", sh.t, len, new JObject { ["rot"] = s["rotate"], ["ease"] = s["ease"] ?? "linear" });
            if (s["dolly"] != null) Op(Track(name), "dolly", sh.t, len, new JObject { ["ease"] = s["ease"] ?? "inout" });
            if (s["orbit"] is JObject o)
            {
                var a = new JObject { ["radius"] = o["radius"] ?? 6, ["y"] = o["y"] ?? 2, ["rate"] = o["rate"] ?? 10, ["angle"] = o["angle"] ?? 0 };
                if (o["around"] != null) a["around"] = o["around"]; // follows the actor as it moves
                var c = o["around"] != null && _actors.TryGetValue((string)o["around"], out var ac) ? ac.basePos : V(o["center"], Vector3.zero);
                a["center"] = new JArray(c.x, c.y, c.z);
                Op(Track(name), "orbit", sh.t, len, a);
            }
        }

        /// <summary>Integrates the speed changes into scene time. Song time never changes, so slow motion can not touch the audio.</summary>
        void BakeWarp()
        {
            int n = Mathf.CeilToInt(_song.duration * SongMap.WarpHz) + 2;
            var w = new float[n];
            _speeds.Sort((a, b) => a.t.CompareTo(b.t));
            double scene = 0, dt = 1.0 / SongMap.WarpHz;
            for (int i = 0; i < n; i++)
            {
                w[i] = (float)scene;
                double t = i * dt, sp = 1;
                foreach (var s in _speeds)
                {
                    if (t < s.t) break;
                    sp = Mathf.LerpUnclamped((float)sp, (float)s.v, Ease.Apply(s.ease, (float)((t - s.t) / Math.Max(s.dur, 1e-4))));
                }
                scene += sp * dt;
            }
            // Holds freeze the picture without moving the clock: inside one, scene time stays where it was at its start; after it, scene time is where
            // it would have been without it. A slowdown (`speed`) still shifts what follows, by design; a hitstop never does (Hawkes Punch: 9 frames of
            // freezes put every later cast change 0.3 s before its cut).
            foreach (var (ht, hd) in _holds)
            {
                int a = Mathf.Max(0, Mathf.CeilToInt((float)(ht * SongMap.WarpHz))), b = Mathf.Min(n - 1, Mathf.CeilToInt((float)((ht + hd) * SongMap.WarpHz)) - 1);
                if (a > b) continue;
                double f = ht * SongMap.WarpHz; int i0 = Mathf.Clamp((int)Math.Floor(f), 0, n - 2);
                float at = (float)(w[i0] + (w[i0 + 1] - w[i0]) * (f - i0));
                for (int i = a; i <= b; i++) w[i] = at;
            }
            _song.warp = w;
            var st = new float[n];
            foreach (var s in _steps)
                for (int i = Mathf.Max(0, (int)(s.t * SongMap.WarpHz)); i < n && i * dt < s.t + s.dur; i++) st[i] = s.hz;
            _song.stepHz = st;
            EditorUtility.SetDirty(_song);
        }

        void FinishMarks()
        {
            if (!File.Exists(MarksFile)) return;
            foreach (var mk in JArray.Parse(File.ReadAllText(MarksFile)))
            {
                var m = _tl.markerTrack == null ? null : (MVMark)null;
                _tl.CreateMarkerTrack();
                var x = _tl.markerTrack.CreateMarker<MVMark>((double)mk["t"]);
                x.id = (int)mk["id"]; x.note = (string)mk["note"]; x.name = "m" + x.id;
            }
        }
    }
}
