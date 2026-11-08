using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    /// <summary>
    /// Filmed or AI-made clips cut into the video. Frames stream from Director/inserts/name/ and are chosen by time,
    /// so a clip scrubs, reverses, slows down and renders exactly like the 3D, which a VideoPlayer can't do.
    /// </summary>
    [TrackColor(0.9f, 0.9f, 0.5f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class InsertTrack : MVTrack { protected override Driver MakeDriver() => new InsertDriver(); }

    public static class InsertCache
    {
        static string Root = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Director", "inserts"));
        /// <summary>Each video has its own footage folder.</summary>
        public static void Use(string folder) { folder = Path.GetFullPath(folder); if (folder == Root) return; Root = folder; Forget(); }
        static readonly Dictionary<string, int> Counts = new Dictionary<string, int>();
        static readonly Dictionary<string, Texture2D> Live = new Dictionary<string, Texture2D>();
        static readonly Queue<string> Order = new Queue<string>();
        const int Keep = 120;

        public static int Count(string name)
        {
            if (Counts.TryGetValue(name, out var n)) return n;
            var d = Path.Combine(Root, name);
            n = Directory.Exists(d) ? Directory.GetFiles(d, "f_*.jpg").Length : 0;
            Counts[name] = n;
            return n;
        }

        public static Texture2D Get(string name, int i)
        {
            var key = name + "/" + i;
            if (Live.TryGetValue(key, out var t) && t) return t;
            var f = Path.Combine(Root, name, $"f_{i + 1:0000}.jpg");
            if (!File.Exists(f)) return null;
            t = new Texture2D(2, 2, TextureFormat.RGB24, false) { hideFlags = HideFlags.HideAndDontSave, wrapMode = TextureWrapMode.Clamp };
            t.LoadImage(File.ReadAllBytes(f), true);
            Live[key] = t; Order.Enqueue(key);
            while (Order.Count > Keep)
            {
                var old = Order.Dequeue();
                if (Live.TryGetValue(old, out var o)) { if (o) Object.DestroyImmediate(o); Live.Remove(old); }
            }
            return t;
        }

        public static void Forget() { Counts.Clear(); }
    }

    public class InsertDriver : Driver
    {
        static readonly int Mix = Shader.PropertyToID("_MV_InsertMix");

        public override void Apply(double t, object binding)
        {
            Op on = null;
            foreach (var op in Ops) { if (t < op.start) break; if (t <= op.end) on = op; }
            var name = on?.a.S("name");
            int n = name == null ? 0 : InsertCache.Count(name);
            if (n == 0) { Shader.SetGlobalFloat(Mix, 0); return; }
            bool song = on.a.F("scene") <= 0; // footage stays at song speed unless told to follow slow motion
            double local = song ? t - on.start : Song.Warp(t) - on.ws;
            float fps = on.a.F("fps", 16), rate = on.a.F("rate", 1);
            if (on.a.F("fit") > 0) { fps = (n - 1 - on.a.F("first")) / (float)on.Dur; rate = 1; }
            int i = (int)(local * fps * rate + on.a.F("first"));
            if (on.a.F("back") > 0) i = n - 1 - i;
            if (on.a.F("loop") > 0) { int period = Mathf.Max(1, 2 * n - 2); i = ((i % period) + period) % period; if (i >= n) i = period - i; } // ping-pong
            i = Mathf.Clamp(i, 0, n - 1);
            var c = on.a.C("tint", Color.white);
            Shader.SetGlobalFloat("_MV_InsertGray", on.a.F("tvlink"));
            if (on.a.F("tvlink") > 0)
            {
                // The footage is lit by the same TV as the room: its colour and its brightness, beat for beat.
                float k = on.a.F("tvlink"), level = Mathf.Clamp(MVClock.TvLevel * on.a.F("gain", .5f), .3f, 1.4f);
                c = Color.Lerp(c, MVClock.TvColor, k) * level;
            }
            float fade = on.a.F("fade");
            float mix = fade > 0 ? Mathf.Clamp01(Mathf.Min((float)(t - on.start), (float)(on.end - t)) / fade) : 1;
            Shader.SetGlobalTexture("_MV_Insert", InsertCache.Get(name, i));
            Shader.SetGlobalFloat(Mix, mix);
            Shader.SetGlobalFloat("_MV_InsertScale", 1 + (float)(local / on.Dur) * on.a.F("push") + on.a.F("zoom"));
            Shader.SetGlobalVector("_MV_InsertTint", c);
        }
    }
}
