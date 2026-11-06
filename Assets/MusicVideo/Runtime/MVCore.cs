using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    public static class Ease
    {
        public static float Apply(string e, float p)
        {
            p = Mathf.Clamp01(p);
            switch (e)
            {
                case "linear": return p;
                case "in": return p * p * p;
                case "out": { float q = 1 - p; return 1 - q * q * q; }
                case "expo": return p >= 1 ? 1 : 1 - Mathf.Pow(2, -10 * p);
                case "back": { const float c = 1.70158f; float q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; }
                case "elastic": return p <= 0 ? 0 : p >= 1 ? 1 : Mathf.Pow(2, -10 * p) * Mathf.Sin((p * 10 - 0.75f) * 2.0944f) + 1;
                case "bounce":
                    if (p < 1 / 2.75f) return 7.5625f * p * p;
                    if (p < 2 / 2.75f) { p -= 1.5f / 2.75f; return 7.5625f * p * p + 0.75f; }
                    if (p < 2.5f / 2.75f) { p -= 2.25f / 2.75f; return 7.5625f * p * p + 0.9375f; }
                    p -= 2.625f / 2.75f; return 7.5625f * p * p + 0.984375f;
                default: return p * p * (3 - 2 * p); // inout
            }
        }
    }

    /// <summary>Parsed clip arguments, read every frame, so kept in plain dictionaries.</summary>
    public class Args
    {
        public readonly Dictionary<string, float> Num = new Dictionary<string, float>();
        public readonly Dictionary<string, Vector3> Vec = new Dictionary<string, Vector3>();
        public readonly Dictionary<string, Color> Col = new Dictionary<string, Color>();
        public readonly Dictionary<string, string> Str = new Dictionary<string, string>();
        public readonly Dictionary<string, JObject> Obj = new Dictionary<string, JObject>();
        public readonly Dictionary<string, string[]> Arr = new Dictionary<string, string[]>();

        public static Args Parse(string json)
        {
            var a = new Args();
            if (string.IsNullOrEmpty(json)) return a;
            foreach (var kv in JObject.Parse(json))
            {
                var v = kv.Value;
                if (v.Type == JTokenType.Float || v.Type == JTokenType.Integer) a.Num[kv.Key] = (float)v;
                else if (v.Type == JTokenType.Boolean) a.Num[kv.Key] = (bool)v ? 1 : 0;
                else if (v.Type == JTokenType.String)
                {
                    var s = (string)v;
                    if (s.StartsWith("#") && ColorUtility.TryParseHtmlString(s, out var c)) a.Col[kv.Key] = c;
                    else a.Str[kv.Key] = s;
                }
                else if (v.Type == JTokenType.Null) a.Str[kv.Key] = "";
                else if (v is JObject jo) a.Obj[kv.Key] = jo;
                else if (v is JArray s0 && s0.Count > 0 && s0[0].Type == JTokenType.String) { var l = new string[s0.Count]; for (int i = 0; i < l.Length; i++) l[i] = (string)s0[i]; a.Arr[kv.Key] = l; }
                else if (v is JArray r && r.Count == 3) a.Vec[kv.Key] = new Vector3((float)r[0], (float)r[1], (float)r[2]);
                else if (v is JArray q && q.Count == 4) a.Col[kv.Key] = new Color((float)q[0], (float)q[1], (float)q[2], (float)q[3]);
            }
            return a;
        }

        public float F(string k, float d = 0) => Num.TryGetValue(k, out var v) ? v : d;
        public Vector3 V(string k, Vector3 d = default) => Vec.TryGetValue(k, out var v) ? v : d;
        public bool Has(string k) => Num.ContainsKey(k) || Vec.ContainsKey(k) || Col.ContainsKey(k) || Str.ContainsKey(k) || Obj.ContainsKey(k) || Arr.ContainsKey(k);
        public string S(string k, string d = null) => Str.TryGetValue(k, out var v) ? v : d;
        public Color C(string k, Color d) => Col.TryGetValue(k, out var v) ? v : d;
    }

    /// <summary>One instruction on a track. Tracks fold over all of them by absolute time, so any frame can be computed on its own.</summary>
    public class Op
    {
        public double start, end;
        public string kind;
        public Args a;
        public UnityEngine.Object[] refs;
        public int index;
        public double ws, we; // the clip in scene time
        public double Dur => Math.Max(end - start, 1e-4);
        public double WDur => Math.Max(Math.Abs(we - ws), 1e-4);
    }

    public static class MVClock
    {
        public static double T;
        public static SongMap Song;
        public static float Shake, ShakeSpeed = 22, Dutch, Zoom, Handheld;
        public static UnityEngine.Rendering.Universal.DepthOfField Dof;
        public static Vector3 SuckPoint;
        public static Color TvColor = Color.white;
        public static float TvLevel = 1;
        public static bool Preview;
        public static float Suck, Twist, Wave, Radius = 6, Stretch, SceneTime;

        /// <summary>The same bend as MVWarp.hlsl, so the camera can aim at where a warped body really is.</summary>
        public static Vector3 WarpPoint(Vector3 p)
        {
            if (Suck == 0 && Twist == 0 && Wave == 0) return p;
            var d = p - SuckPoint;
            float r = d.magnitude + .001f, f = Mathf.Clamp01(Radius / r), near = f * f;
            float a = Twist * near, s = Mathf.Sin(a), c = Mathf.Cos(a);
            d = new Vector3(d.x * c - d.y * s, d.x * s + d.y * c, d.z);
            d *= 1 - Mathf.Clamp01(Suck * near) * (1 - .05f * Mathf.Clamp01(1 - Stretch));
            var q = SuckPoint + d;
            float tt = SceneTime;
            q += Wave * .25f * new Vector3(Mathf.Sin(p.y * 1.3f + tt * 2.1f), Mathf.Sin(p.x * 1.1f + p.z * .7f + tt * 1.7f), Mathf.Sin(p.z * 1.2f - tt * 2.4f));
            return q;
        }
    }

    public abstract class Driver
    {
        protected List<Op> Ops; protected SongMap Song;
        public void Init(List<Op> ops, SongMap song)
        {
            Ops = ops; Song = song;
            if (song) foreach (var o in ops) { o.ws = song.WarpRaw(o.start); o.we = song.WarpRaw(o.end); }
            Start();
        }
        protected virtual void Start() { }
        public abstract void Apply(double t, object binding);
        public virtual void Dispose() { }
    }

    public class MVMixer : PlayableBehaviour
    {
        public Driver Driver; public PlayableDirector Director; public SongMap Song;
        public override void ProcessFrame(Playable playable, FrameData info, object playerData)
        {
            if (Director == null) return;
            MVClock.T = Director.time; MVClock.Song = Song;
            Driver?.Apply(Director.time, playerData);
        }
        public override void OnPlayableDestroy(Playable playable) => Driver?.Dispose();
    }

    public abstract class MVTrack : TrackAsset
    {
        public SongMap song;
        protected abstract Driver MakeDriver();

        public override Playable CreateTrackMixer(PlayableGraph graph, GameObject go, int inputCount)
        {
            var sp = ScriptPlayable<MVMixer>.Create(graph, inputCount);
            var ops = new List<Op>();
            foreach (var c in GetClips())
                if (c.asset is MVClip m)
                    ops.Add(new Op { start = c.start, end = c.end, kind = m.kind, a = Args.Parse(m.args), refs = m.refs });
            ops.Sort((x, y) => x.start.CompareTo(y.start));
            for (int i = 0; i < ops.Count; i++) ops[i].index = i;
            var d = MakeDriver(); d.Init(ops, song);
            var b = sp.GetBehaviour();
            b.Driver = d; b.Song = song; b.Director = go.GetComponent<PlayableDirector>();
            // Motion is pulled, not pushed: anything attached to an actor asks that actor's driver for this moment first.
            if (d is MotionDriver md && b.Director != null && b.Director.GetGenericBinding(this) is MVActor ac) md.Bind(ac);
            return sp;
        }
    }
}
