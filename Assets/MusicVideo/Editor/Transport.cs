using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.ShortcutManagement;
using UnityEditor.Timeline;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.SceneManagement;
using UnityEngine.Timeline;

namespace TKShock.MV.EditorTools
{
    /// <summary>J's desk: play, pause, and drop a mark with a note. Everything else happens from chat.</summary>
    public class Transport : EditorWindow
    {
        string _note = ""; Vector2 _scroll;
        static int _pendingMarkers;

        public static PlayableDirector Director => UnityEngine.Object.FindAnyObjectByType<PlayableDirector>();
        static SongMap Song => AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);

        [MenuItem("Window/Music Video Desk")]
        public static void Open() => GetWindow<Transport>("Music Video");

        /// <summary>Puts the desk and the Timeline on screen, pointed at the video.</summary>
        public static void ShowAll()
        {
            var d = Director; if (!d) return;
            var win = TimelineEditor.GetOrCreateWindow();
            win.SetTimeline(d);
            Selection.activeGameObject = d.gameObject;
            if (!HasOpenInstances<Transport>()) GetWindow<Transport>("Music Video", false);
        }

        void OnEnable() { EditorApplication.update += Repaint10; }
        void OnDisable() { EditorApplication.update -= Repaint10; }
        double _last;
        void Repaint10()
        {
            if (EditorApplication.timeSinceStartup - _last > .08) { _last = EditorApplication.timeSinceStartup; Repaint(); }
            if (_pendingMarkers > 0 && !IsPlaying) { _pendingMarkers = 0; SyncMarkers(); }
        }

        static bool IsPlaying
        {
            get { var w = TimelineEditor.GetWindow(); return Application.isPlaying || (Director && Director.playableGraph.IsValid() && Director.playableGraph.IsPlaying()); }
        }

        public static double Now
        {
            get { var w = TimelineEditor.GetWindow(); if (w != null && w.playbackControls != null && TimelineEditor.masterDirector) return w.playbackControls.GetCurrentTime(); return Director ? Director.time : 0; }
        }

        public static void TogglePlay()
        {
            ShowAll();
            var w = TimelineEditor.GetWindow(); if (w == null) return;
            if (IsPlaying) w.playbackControls.Pause(); else w.playbackControls.Play();
        }

        public static void Seek(double t)
        {
            var w = TimelineEditor.GetWindow();
            if (w != null && TimelineEditor.masterDirector) w.playbackControls.SetCurrentTime(t);
            var d = Director; if (d) { d.time = t; d.Evaluate(); MVLate.Flush(); }
        }

        static GUIStyle _big, _small;

        void OnGUI()
        {
            if (Event.current.type == EventType.KeyDown && GUIUtility.keyboardControl == 0)
            {
                if (Event.current.keyCode == KeyCode.M) { AddMark(""); Event.current.Use(); }
                if (Event.current.keyCode == KeyCode.Space) { TogglePlay(); Event.current.Use(); }
            }
            _big = _big ?? new GUIStyle(EditorStyles.boldLabel) { fontSize = 30, alignment = TextAnchor.MiddleCenter, fixedHeight = 46 };
            _small = _small ?? new GUIStyle(EditorStyles.label) { alignment = TextAnchor.MiddleCenter };

            var song = Song; var t = Now;
            if (song)
            {
                song.BarBeat(t, out var bar, out var beat);
                GUILayout.Label($"bar {bar}  beat {Math.Floor(beat)}", _big);
                GUILayout.Label($"{TimeSpan.FromSeconds(t):m\\:ss\\.ff}   ·   section {song.SectionAt(t)}   {Capture.Progress}", _small);
                var r = GUILayoutUtility.GetRect(10, 14);
                float f = (float)(beat - Math.Floor(beat));
                EditorGUI.DrawRect(r, new Color(.15f, .15f, .15f));
                for (int i = 0; i < song.meter; i++)
                {
                    var c = new Rect(r.x + r.width * i / song.meter + 1, r.y, r.width / song.meter - 2, r.height);
                    bool on = (int)Math.Floor(beat) - 1 == i;
                    EditorGUI.DrawRect(c, on ? Color.Lerp(new Color(1, .75f, .2f), new Color(.3f, .22f, .1f), f) : new Color(.25f, .25f, .25f));
                }
                var e = GUILayoutUtility.GetRect(10, 6);
                EditorGUI.DrawRect(new Rect(e.x, e.y, e.width * song.Env("kick", t), 3), new Color(1, .4f, .3f));
                EditorGUI.DrawRect(new Rect(e.x, e.y + 3, e.width * song.Env("high", t), 3), new Color(.4f, .7f, 1));
            }
            GUILayout.Space(6);
            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("⏮", GUILayout.Height(38), GUILayout.Width(44))) Seek(0);
                if (GUILayout.Button(IsPlaying ? "Pause  (space)" : "Play  (space)", GUILayout.Height(38))) TogglePlay();
                GUI.backgroundColor = new Color(1, .75f, .3f);
                if (GUILayout.Button("Mark  (F8)", GUILayout.Height(38))) { AddMark(_note); _note = ""; GUI.FocusControl(null); }
                GUI.backgroundColor = Color.white;
            }
            GUILayout.Space(4);
            GUILayout.Label("Note for Claude (optional, saved with the mark):", EditorStyles.miniLabel);
            GUI.SetNextControlName("note");
            _note = EditorGUILayout.TextArea(_note, GUILayout.Height(52));
            if (Event.current.type == EventType.KeyDown && Event.current.keyCode == KeyCode.Return && Event.current.control) { AddMark(_note); _note = ""; GUI.FocusControl(null); Event.current.Use(); }

            GUILayout.Space(6);
            var marks = LoadMarks();
            GUILayout.Label($"Your marks ({marks.Count})", EditorStyles.boldLabel);
            _scroll = EditorGUILayout.BeginScrollView(_scroll);
            foreach (var m in marks.Cast<JObject>().Reverse())
            {
                using (new EditorGUILayout.HorizontalScope())
                {
                    if (GUILayout.Button($"m{m["id"]}", GUILayout.Width(44))) Seek((double)m["t"]);
                    GUILayout.Label((string)m["at"], GUILayout.Width(58));
                    var n = (string)m["note"]; var nn = EditorGUILayout.TextField(n);
                    if (nn != n) { m["note"] = nn; SaveMarks(marks); }
                    if (GUILayout.Button("x", GUILayout.Width(22))) { marks.Remove(marks.First(x => (int)x["id"] == (int)m["id"])); SaveMarks(marks); _pendingMarkers++; GUIUtility.ExitGUI(); }
                }
            }
            EditorGUILayout.EndScrollView();
        }

        public static JArray LoadMarks()
        {
            try { return File.Exists(ScoreCompiler.MarksFile) ? JArray.Parse(File.ReadAllText(ScoreCompiler.MarksFile)) : new JArray(); }
            catch { return new JArray(); }
        }
        static void SaveMarks(JArray a) => File.WriteAllText(ScoreCompiler.MarksFile, a.ToString());

        [Shortcut("Music Video/Mark", KeyCode.F8)]
        static void MarkShortcut() => AddMark("");

        public static object AddMark(string note, double? at = null)
        {
            var song = Song; double t = at ?? Now;
            var marks = LoadMarks();
            int id = marks.Count == 0 ? 1 : marks.Max(x => (int)x["id"]) + 1;
            string shot = Path.Combine(Video.Captures, $"mark-{id}.png");
            try { File.WriteAllBytes(shot, Capture.Png(Capture.Current(960, 540), 960, 540)); } catch (Exception e) { UnityEngine.Debug.LogWarning(e.Message); shot = null; }
            song.BarBeat(t, out var bar, out var beat);
            var m = new JObject { ["id"] = id, ["t"] = Math.Round(t, 3), ["at"] = song.Label(t), ["bar"] = bar, ["beat"] = Math.Round(beat, 2), ["section"] = song.SectionAt(t), ["note"] = note, ["image"] = shot };
            marks.Add(m); SaveMarks(marks); _pendingMarkers++;
            foreach (var w in Resources.FindObjectsOfTypeAll<Transport>()) w.Repaint();
            return m;
        }

        static void SyncMarkers()
        {
            var tl = AssetDatabase.LoadAssetAtPath<TimelineAsset>(ScoreCompiler.TimelinePath); if (!tl) return;
            tl.CreateMarkerTrack();
            foreach (var x in tl.markerTrack.GetMarkers().ToList()) tl.markerTrack.DeleteMarker(x);
            foreach (var mk in LoadMarks())
            {
                var x = tl.markerTrack.CreateMarker<MVMark>((double)mk["t"]); x.id = (int)mk["id"]; x.note = (string)mk["note"]; x.name = "m" + x.id;
            }
            EditorUtility.SetDirty(tl);
            TimelineEditor.Refresh(RefreshReason.ContentsModified);
        }

        // ------- chat side --------
        [BridgeCommand("marks")] static object Marks(JObject m) => LoadMarks();
        [BridgeCommand("mark")] static object MarkCmd(JObject m) => AddMark((string)m["note"] ?? "", (double?)m["t"]);
        [BridgeCommand("marks-clear")] static object Clear(JObject m) { SaveMarks(new JArray()); SyncMarkers(); return "cleared"; }
        [BridgeCommand("open")] static object OpenCmd(JObject m) { ShowAll(); return "open"; }
        [BridgeCommand("play")] static object Play(JObject m) { ShowAll(); if (m["t"] != null) Seek((double)m["t"]); TimelineEditor.GetWindow().playbackControls.Play(); return "playing"; }
        [BridgeCommand("pause")] static object Pause(JObject m) { TimelineEditor.GetWindow()?.playbackControls.Pause(); return Now; }
        [BridgeCommand("seek")] static object SeekCmd(JObject m) { ShowAll(); Seek((double)m["t"]); return Now; }
        [BridgeCommand("status")]
        static object Status(JObject m) => new { scene = SceneManager.GetActiveScene().path, time = Now, playing = IsPlaying, label = Song ? Song.Label(Now) : "", timeline = Director?.playableAsset?.name };
    }

    /// <summary>Renders exact frames: what Claude looks at, and the final video.</summary>
    public static class Capture
    {
        static RenderTexture _rt; static Texture2D _tex;
        public static int ExtrasEvery = 1; static int _extra;

        static void Size(int w, int h)
        {
            if (_rt == null || _rt.width != w || _rt.height != h)
            {
                if (_rt) _rt.Release();
                _rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32) { antiAliasing = 1 };
                _tex = new Texture2D(w, h, TextureFormat.RGB24, false);
            }
        }

        /// <summary>The camera as it stands, without moving time. Used for marks.</summary>
        public static byte[] Current(int w, int h)
        {
            Size(w, h);
            MVGfx.FitCanvases(MVGfx.Stage);   // the graphics' plane follows the lens now the camera has its fov for this frame, or TMP text vanishes on long lenses
            Canvas.ForceUpdateCanvases();
            if (_extra++ % ExtrasEvery == 0) // the TV feed, the eye's reflection and the doors are whole extra renders
            {
                var feed = GameObject.Find("FeedCamera");
                if (feed) feed.GetComponent<Camera>().Render();
                MVEyeRig.RenderAll();
                MVDoor.RenderAll();
            }
            var cam = Camera.main;
            var old = cam.targetTexture; cam.targetTexture = _rt;
            cam.Render();
            cam.targetTexture = old;
            var a = RenderTexture.active; RenderTexture.active = _rt;
            _tex.ReadPixels(new Rect(0, 0, w, h), 0, 0, false); _tex.Apply(false);
            RenderTexture.active = a;
            return _tex.GetRawTextureData();
        }

        public static byte[] At(double t, int w, int h)
        {
            var d = Transport.Director;
            if (!d.playableGraph.IsValid()) d.RebuildGraph();
            d.time = t; d.Evaluate(); MVLate.Flush();   // native bodies' acting and what they hold, on the pose the Animator just wrote, before the camera reads it
            var brain = Camera.main.GetComponent<CinemachineBrain>();
            if (brain)
            {
                var keep = brain.UpdateMethod;
                brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
                var was = brain.ActiveVirtualCamera;
                brain.ManualUpdate(); brain.ManualUpdate();
                // After a cut or a seek the outgoing camera is still live on the first update and writes its focus into the depth of field. A shot with no
                // focus target never overwrites that, so go round once more now only the new camera is live. A frame must not depend on the frame before.
                if (brain.ActiveVirtualCamera != was) { d.Evaluate(); MVLate.Flush(); brain.ManualUpdate(); }
                brain.UpdateMethod = keep;
            }
            return Current(w, h);
        }

        public static byte[] Png(byte[] raw, int w, int h) => ImageConversion.EncodeArrayToPNG(raw, UnityEngine.Experimental.Rendering.GraphicsFormat.R8G8B8_UNorm, (uint)w, (uint)h);

        static double[] Times(JObject m) => m["t"] is JArray a ? a.Select(x => (double)x).ToArray() : new[] { (double)m["t"] };

        [BridgeCommand("capture")]
        static object CaptureCmd(JObject m)
        {
            Quality.Set(false);
            int w = (int?)m["w"] ?? 960, h = (int?)m["h"] ?? 540;
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            var outs = new List<string>(); var dir = Video.Captures;
            double keep = Transport.Director.time;
            foreach (var t in Times(m))
            {
                var p = Path.Combine(dir, $"f_{t:0000.000}.png");
                File.WriteAllBytes(p, Png(At(t, w, h), w, h)); outs.Add(p);
            }
            Quality.Set(true);
            Transport.Seek(keep);
            return outs;
        }

        // ---- The finished video: every frame rendered offline and muxed with the song and sfx, so a slow PC never drops one.
        // It runs a frame per editor tick, so Unity stays usable, and it waits whenever J is playing the timeline.
        class Job { public int w, h, fps, frames, i; public double from, to; public string outPath, tmp, quality; public bool pictureOnly; public Process enc; public System.Diagnostics.Stopwatch clock; }
        static Job _job;
        public static string Progress => _job == null ? null : $"Rendering {100 * _job.i / Mathf.Max(1, _job.frames)}%";

        [BridgeCommand("render")]
        static object Render(JObject m)
        {
            if (_job != null) return RenderStatus(null);
            var j = new Job
            {
                w = (int?)m["w"] ?? 1920, h = (int?)m["h"] ?? 1080, fps = (int?)m["fps"] ?? 30,
                from = (double?)m["from"] ?? 0, to = (double?)m["to"] ?? Transport.Director.duration,
                outPath = (string)m["out"] ?? Path.Combine(Video.Dir, "output", "video.mp4"), clock = System.Diagnostics.Stopwatch.StartNew(),
                quality = (string)m["quality"] ?? "final",
                pictureOnly = (bool?)m["pictureOnly"] ?? false,
            };
            Directory.CreateDirectory(Path.GetDirectoryName(j.outPath));
            j.tmp = j.outPath + ".video.mp4"; j.frames = (int)System.Math.Ceiling((j.to - j.from) * j.fps);
            string enc = j.quality == "previs" ? "-preset ultrafast -crf 28" : j.quality == "draft" || j.quality == "preview" ? "-preset veryfast -crf 23" : "-preset medium -crf 17";
            j.enc = Process.Start(new ProcessStartInfo("ffmpeg",
                $"-y -loglevel error -f rawvideo -pix_fmt rgb24 -s {j.w}x{j.h} -r {j.fps} -i - -vf vflip -c:v libx264 {enc} -pix_fmt yuv420p \"{j.tmp}\"")
            { UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true });
            _job = j;
            EditorApplication.update += Step;
            return "started";
        }

        [BridgeCommand("render-status")]
        static object RenderStatus(JObject m) => _job == null ? (object)new { running = false } : new { running = true, frame = _job.i, _job.frames, seconds = _job.clock.Elapsed.TotalSeconds };

        [BridgeCommand("render-cancel")]
        static object RenderCancel(JObject m)
        {
            if (_job == null) return "nothing running";
            EditorApplication.update -= Step;
            try { _job.enc.StandardInput.Close(); _job.enc.WaitForExit(); File.Delete(_job.tmp); } catch { }
            _job = null; EndQuality();
            return "cancelled";
        }

        static bool _finalOn; // switching quality every tick rebuilt the renderer and cost far more than the frames

        static void Step()
        {
            var j = _job; if (j == null) return;
            if (Transport.Director.playableGraph.IsValid() && Transport.Director.playableGraph.IsPlaying()) return; // J is watching: wait
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) return;
            if (!_finalOn) { StartQuality(j); _finalOn = true; }
            var budget = System.Diagnostics.Stopwatch.StartNew();
            var s = j.enc.StandardInput.BaseStream;
            do
            {
                var raw = At(j.from + (double)j.i / j.fps, j.w, j.h);
                s.Write(raw, 0, raw.Length);
                j.i++;
            } while (j.i < j.frames && budget.ElapsedMilliseconds < 1500);
            if (j.i >= j.frames) { EndQuality(); Finish(j); }
        }

        static void StartQuality(Job j)
        {
            if (j.quality == "previs") { Quality.Previs(true); ExtrasEvery = 4; }
            else if (j.quality == "draft") Quality.Draft();
            else if (j.quality == "preview") Quality.Set(true, 1);
            else Quality.Set(false);
        }

        static void EndQuality() { ExtrasEvery = 1; Quality.Previs(false); _finalOn = false; }

        static void Finish(Job j)
        {
            EditorApplication.update -= Step; _job = null;
            j.enc.StandardInput.Close(); j.enc.WaitForExit();
            // tools/final.mjs mixes the sound once for the whole video. -shortest below can drop a shot's last frames, and a shot has to be every frame.
            if (j.pictureOnly) { File.Delete(j.outPath); File.Move(j.tmp, j.outPath); UnityEngine.Debug.Log("Rendered " + j.outPath); return; }
            var song = Path.GetFullPath(ScoreCompiler.SongAudio());
            var sfxFile = Path.Combine(Video.Dir, "sfx-map.json");
            var sfx = File.Exists(sfxFile) ? JArray.Parse(File.ReadAllText(sfxFile)) : new JArray();
            string inputs = $"-i \"{j.tmp}\" -ss {j.from:0.000} -t {j.to - j.from:0.000} -i \"{song}\"", filter = "";
            var used = new List<(string path, double ts, float vol)>();
            foreach (var x in sfx)
            {
                double ts = (double)x["t"] - j.from; if (ts < 0 || ts > j.to - j.from) continue;
                used.Add(((string)x["path"], ts, (float)x["volume"]));
            }
            string labels = "[1:a]"; int mixed = 1, fileIdx = 2, n = 0;
            foreach (var group in used.GroupBy(u => u.path))
            {
                inputs += $" -i \"{group.Key}\"";
                var list = group.ToList();
                string split = ""; for (int k = 0; k < list.Count; k++) split += $"[c{fileIdx}_{k}]";
                filter += $"[{fileIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit={list.Count}{split};\n";
                for (int k = 0; k < list.Count; k++)
                {
                    long ms = (long)(list[k].ts * 1000);
                    filter += $"[c{fileIdx}_{k}]adelay={ms}|{ms},volume={list[k].vol.ToString(System.Globalization.CultureInfo.InvariantCulture)}[s{n}];\n";
                    labels += $"[s{n}]"; n++; mixed++;
                }
                fileIdx++;
            }
            string script = j.outPath + ".filter.txt";
            if (n > 0) File.WriteAllText(script, $"{filter}{labels}amix=inputs={mixed}:normalize=0:duration=first[a]");
            string map = n > 0 ? $"-filter_complex_script \"{script}\" -map 0:v -map [a]" : "-map 0:v -map 1:a";
            Process.Start(new ProcessStartInfo("ffmpeg", $"-y -loglevel error {inputs} {map} -c:v copy -c:a aac -b:a 256k -shortest \"{j.outPath}\"") { UseShellExecute = false, CreateNoWindow = true }).WaitForExit();
            File.Delete(j.tmp); try { File.Delete(j.outPath + ".filter.txt"); } catch { }
            UnityEngine.Debug.Log("Rendered " + j.outPath);
        }
    }
}
