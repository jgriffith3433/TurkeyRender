using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Which video the editor is working on, and where its files live. TK Shock keeps the paths it always had (Director/ and
    /// Assets/MusicVideo/Generated). Any other video is Director/videos/name plus Assets/Videos/name. mv sends the name with every call.
    /// </summary>
    public static class Video
    {
        public const string Default = "tkshock";
        static string _name;

        public static string Name => _name ?? (_name = Saved());

        static string Saved()
        {
            try
            {
                var f = Path.Combine(Bridge.Root, "current-video");
                if (File.Exists(f)) { var s = File.ReadAllText(f).Trim(); if (s.Length > 0 && Exists(s)) return s; }
            }
            catch { }
            return Default;
        }

        static bool OwnFolder(string n) => File.Exists(Path.Combine(Bridge.Root, "videos", n, "score.json"));
        public static bool Exists(string n) => n == Default || OwnFolder(n);
        public static bool IsLegacy => !OwnFolder(Name);
        public static string Dir => IsLegacy ? Bridge.Root : Path.Combine(Bridge.Root, "videos", Name);
        public static string Captures { get { var d = Path.Combine(Dir, "captures"); Directory.CreateDirectory(d); return d; } }
        public static string Gen => IsLegacy ? "Assets/MusicVideo/Generated" : "Assets/Videos/" + Name + "/Generated";
        public static string ScenePath => IsLegacy ? "Assets/Scenes/MusicVideo.unity" : "Assets/Videos/" + Name + "/" + Name + ".unity";
        public static string AimFile => Path.Combine(Bridge.Root, "gen", "aim-" + Name + ".json");

        /// <summary>Makes this the video for this call. When the call needs the scene, opens it, and builds it if it holds no set.</summary>
        public static void Use(string name, bool needsScene)
        {
            if (string.IsNullOrEmpty(name)) name = Name;
            if (!Exists(name)) throw new System.Exception("no video called " + name);
            _name = name;
            InsertCache.Use(Path.Combine(Dir, "inserts"));
            if (!needsScene || !File.Exists(ScenePath)) return;
            if (SceneManager.GetActiveScene().path != ScenePath)
            {
                EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
                MVActor.ForgetNames();
            }
            SceneKeeper.EnsureBuilt();
        }
    }

    /// <summary>
    /// The set is rebuilt from the score, so it never goes in the scene file: the scene holds the camera and the director and little else.
    /// Everything under _Generated is marked not to save for the moment of saving, and a scene that opens without it builds it.
    /// </summary>
    [InitializeOnLoad]
    public static class SceneKeeper
    {
        public const string Root = "_Generated";
        static readonly List<Object> Marked = new List<Object>();
        public static bool Building;

        static SceneKeeper()
        {
            EditorSceneManager.sceneSaving += (s, p) => Mark(s);
            EditorSceneManager.sceneSaved += s => Unmark();
            EditorSceneManager.sceneOpened += (s, mode) => EditorApplication.delayCall += OpenedLater;
        }

        static void OpenedLater() { if (!EditorApplication.isPlayingOrWillChangePlaymode && !EditorApplication.isCompiling) EnsureBuilt(); }

        static GameObject Find(Scene s)
        {
            foreach (var g in s.GetRootGameObjects()) if (g.name == Root) return g;
            return null;
        }

        static void Flag(Object o)
        {
            if ((o.hideFlags & HideFlags.DontSaveInEditor) != 0) return;
            o.hideFlags |= HideFlags.DontSaveInEditor; Marked.Add(o);
        }

        static void Mark(Scene s)
        {
            var g = Find(s); if (!g) return;
            foreach (var t in g.GetComponentsInChildren<Transform>(true))
            {
                Flag(t.gameObject);
                foreach (var c in t.GetComponents<Component>()) if (c) Flag(c);
            }
        }

        static void Unmark()
        {
            foreach (var o in Marked) if (o) o.hideFlags &= ~HideFlags.DontSaveInEditor;
            Marked.Clear();
        }

        /// <summary>The video's scene is open with no set in it: a fresh start of Unity, or a switch of video.</summary>
        public static void EnsureBuilt()
        {
            if (Building || EditorApplication.isPlayingOrWillChangePlaymode) return;
            var s = SceneManager.GetActiveScene();
            if (s.path != Video.ScenePath || Find(s)) return;
            if (!File.Exists(ScoreCompiler.ScoreFile)) return;
            Debug.Log("Building " + Video.Name + " from the score: the scene doesn't store it.");
            new ScoreCompiler().BuildFor(true);
        }
    }
}
