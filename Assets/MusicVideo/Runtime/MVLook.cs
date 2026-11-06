using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.Timeline;
using UnityEngine.UI;

namespace TKShock.MV
{
    /// <summary>"grade" tweens values and holds them. "pulse" adds a hit that decays, once or on every beat.</summary>
    public class PostDriver : Driver
    {
        static readonly string[] Reserved = { "every", "sharp", "fade" };
        // Numbers sent straight to the world-warp and stylize shaders.
        static readonly string[] Style = { "suck", "twist", "wave", "toon", "pixel", "poster", "halftone", "ink", "scan", "rgb", "swirl", "pinch", "radial", "tear", "invert", "kaleido", "blur", "duo", "mirror", "mask", "eyePupil", "eyeTV", "wall", "neon", "hatch", "snow" };
        static readonly Dictionary<string, int> Ids = new Dictionary<string, int>();
        static int Id(string k) { if (!Ids.TryGetValue(k, out var i)) Ids[k] = i = Shader.PropertyToID("_MV_" + char.ToUpper(k[0]) + k.Substring(1)); return i; }
        readonly Dictionary<string, float> _v = new Dictionary<string, float>();
        readonly Dictionary<string, float> _add = new Dictionary<string, float>();
        readonly List<string> _keys = new List<string>();
        Bloom _bloom; ChromaticAberration _ca; Vignette _vig; LensDistortion _lens; ColorAdjustments _grade; FilmGrain _grain; DepthOfField _dof; MotionBlur _mb;
        VolumeProfile _bound;

        void Reset()
        {
            _v.Clear(); _add.Clear();
            _v["bloom"] = .2f; _v["threshold"] = 1; _v["chroma"] = 0; _v["vignette"] = .2f; _v["distort"] = 0;
            _v["exposure"] = 0; _v["contrast"] = 0; _v["saturation"] = 0; _v["hue"] = 0; _v["grain"] = 0;
            _v["focus"] = 10; _v["aperture"] = 16; _v["motionblur"] = 0;
            foreach (var k in Style) _v[k] = 0;
            _v["suckRadius"] = 6; _v["stretch"] = 0; _v["wall"] = 1;
            _v["shake"] = 0; _v["dutch"] = 0; _v["zoom"] = 0; _v["handheld"] = 0; _v["flash"] = 0; _v["bars"] = 0;
        }

        /// <summary>Every look value at the last evaluated frame, for debugging from chat.</summary>
        public static readonly Dictionary<string, float> Last = new Dictionary<string, float>();

        float Get(string k) { _v.TryGetValue(k, out var a); _add.TryGetValue(k, out var b); return a + b; }

        public override void Apply(double t, object binding)
        {
            var st = binding as MVStage; if (st == null || st.volume == null) return;
            Reset();
            Vector3 suckAt = st.suckPoint;
            Color tint = Color.white, flashCol = Color.white, tintFrom, duoA = Color.black, duoB = Color.white, chMask = Color.white, neonA = Color.black, neonB = Color.white;
            foreach (var op in Ops)
            {
                double tl = t - op.start; if (tl < 0) break;
                if (op.kind == "grade")
                {
                    float k = Ease.Apply(op.a.S("ease"), (float)(tl / op.Dur));
                    foreach (var kv in op.a.Num) { if (kv.Key == "fade") continue; _v.TryGetValue(kv.Key, out var cur); _v[kv.Key] = Mathf.LerpUnclamped(cur, kv.Value, k); }
                    if (op.a.Vec.TryGetValue("suckAt", out var sa)) suckAt = Vector3.LerpUnclamped(suckAt, sa, k);
                    if (op.a.Str.TryGetValue("suckAt", out var sn)) { var tr = MVActor.Point(sn, t); if (tr) suckAt = Vector3.LerpUnclamped(suckAt, tr.position, k); }
                    if (op.a.Col.TryGetValue("tint", out var c)) { tintFrom = tint; tint = Color.Lerp(tintFrom, c, k); }
                    if (op.a.Col.TryGetValue("flashColor", out var f)) flashCol = f;
                    if (op.a.Col.TryGetValue("duoA", out var da)) duoA = Color.Lerp(duoA, da, k);
                    if (op.a.Col.TryGetValue("duoB", out var db)) duoB = Color.Lerp(duoB, db, k);
                    if (op.a.Col.TryGetValue("neonA", out var na)) neonA = Color.Lerp(neonA, na, k);
                    if (op.a.Col.TryGetValue("neonB", out var nb)) neonB = Color.Lerp(neonB, nb, k);
                    if (op.a.Col.TryGetValue("channel", out var cm)) chMask = cm;
                }
                else if (op.kind == "pulse" && tl <= op.Dur)
                {
                    float every = op.a.F("every"), sharp = op.a.F("sharp", 2), d;
                    if (every > 0)
                    {
                        double b = (Song.BeatAt(op.start + tl) - Song.BeatAt(op.start)) / every;
                        d = Mathf.Pow(1 - (float)(b - System.Math.Floor(b)), sharp);
                    }
                    else d = Mathf.Pow(1 - (float)(tl / op.Dur), sharp);
                    foreach (var kv in op.a.Num)
                    {
                        if (System.Array.IndexOf(Reserved, kv.Key) >= 0) continue;
                        _add.TryGetValue(kv.Key, out var cur); _add[kv.Key] = cur + kv.Value * d;
                    }
                    if (op.a.Col.TryGetValue("flashColor", out var f)) flashCol = f;
                }
            }

            foreach (var k in Style) Shader.SetGlobalFloat(Id(k), Get(k));
            Last.Clear(); foreach (var k in _v.Keys) Last[k] = Get(k);
            Shader.SetGlobalFloat("_MV_Radius", Get("suckRadius")); Shader.SetGlobalFloat("_MV_Stretch", Get("stretch"));
            Shader.SetGlobalVector("_MV_SuckPos", suckAt);
            float scene = (float)Song.Warp(t);
            Shader.SetGlobalFloat("_MV_SceneTime", scene); Shader.SetGlobalFloat("_MV_Time", (float)t);
            Shader.SetGlobalFloat("_MV_BeatNow", (float)Song.BeatAt(t));
            Shader.SetGlobalVector("_MV_DuoA", duoA); Shader.SetGlobalVector("_MV_DuoB", duoB); Shader.SetGlobalVector("_MV_ChannelMask", chMask);
            Shader.SetGlobalVector("_MV_NeonA", neonA); Shader.SetGlobalVector("_MV_NeonB", neonB);
            MVClock.SuckPoint = suckAt;
            MVClock.Suck = Get("suck"); MVClock.Twist = Get("twist"); MVClock.Wave = Get("wave"); MVClock.Radius = Get("suckRadius"); MVClock.Stretch = Get("stretch"); MVClock.SceneTime = scene;
            Shader.SetGlobalColor("_MV_EyeColor", new Color(MVClock.TvColor.r, MVClock.TvColor.g, MVClock.TvColor.b, 1));
            float sh = Get("shake") * .045f, tn = (float)t * 26;
            Shader.SetGlobalVector("_MV_Jolt", new Vector4((Mathf.PerlinNoise(tn, 3.1f) - .5f) * sh * 2, (Mathf.PerlinNoise(9.7f, tn) - .5f) * sh * 2, Get("zoom"), 0));

            var p = st.volume.sharedProfile;
            if (p != _bound)
            {
                _bound = p;
                p.TryGet(out _bloom); p.TryGet(out _ca); p.TryGet(out _vig); p.TryGet(out _lens);
                p.TryGet(out _grade); p.TryGet(out _grain); p.TryGet(out _dof); p.TryGet(out _mb);
            }
            if (_bloom) { _bloom.intensity.value = Get("bloom"); _bloom.threshold.value = Get("threshold"); }
            if (_ca) _ca.intensity.value = Mathf.Clamp01(Get("chroma"));
            if (_vig) _vig.intensity.value = Mathf.Clamp01(Get("vignette"));
            if (_lens) _lens.intensity.value = Mathf.Clamp(Get("distort"), -1, 1);
            if (_grade)
            {
                _grade.postExposure.value = Get("exposure"); _grade.contrast.value = Mathf.Clamp(Get("contrast"), -100, 100);
                _grade.saturation.value = Mathf.Clamp(Get("saturation"), -100, 100); _grade.hueShift.value = Mathf.Clamp(Get("hue"), -180, 180);
                _grade.colorFilter.value = tint;
            }
            if (_grain) _grain.intensity.value = Mathf.Clamp01(Get("grain"));
            MVClock.Dof = _dof;
            if (_dof) _dof.active = !MVClock.Preview;
            if (_dof) { _dof.focusDistance.value = Mathf.Max(.1f, Get("focus")); _dof.aperture.value = Mathf.Clamp(Get("aperture"), 1, 32); }
            if (_mb) { _mb.active = !MVClock.Preview; _mb.intensity.value = Mathf.Clamp01(Get("motionblur")); }
            if (_bloom) _bloom.highQualityFiltering.value = !MVClock.Preview;

            MVClock.Shake = Get("shake"); MVClock.Dutch = Get("dutch"); MVClock.Zoom = Get("zoom"); MVClock.Handheld = Get("handheld");
            if (st.flash) { var c = flashCol; c.a = Mathf.Clamp01(Get("flash")); st.flash.color = c; st.flash.enabled = c.a > .001f; }
            float bars = Mathf.Clamp01(Get("bars")) * .11f;
            Shader.SetGlobalFloat("_MV_Bars", bars);
        }

        static void SetBar(Image i, float h)
        {
            if (!i) return;
            i.enabled = h > .001f;
            var r = i.rectTransform;
            if (r.pivot.y > .5f) { r.anchorMin = new Vector2(0, 1 - h); r.anchorMax = Vector2.one; }
            else { r.anchorMin = Vector2.zero; r.anchorMax = new Vector2(1, h); }
            r.offsetMin = r.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Named lights, sky and fog: "light" and "sky" hold, "strobe" flashes on the beat.</summary>
    public class LightDriver : Driver
    {
        static readonly int Top = Shader.PropertyToID("_Top"), Mid = Shader.PropertyToID("_Mid"), Bot = Shader.PropertyToID("_Bot");
        Color[] _c = new Color[0]; float[] _i = new float[0]; float[] _m = new float[0];

        public override void Apply(double t, object binding)
        {
            var st = binding as MVStage; if (st == null) return;
            int n = st.lights.Length;
            if (_c.Length != n) { _c = new Color[n]; _i = new float[n]; _m = new float[n]; }
            for (int j = 0; j < n; j++) { _c[j] = st.lightColors[j]; _i[j] = st.lightIntensities[j]; _m[j] = 1; }
            Color top = new Color(.05f, .06f, .12f), mid = new Color(.2f, .15f, .25f), bot = new Color(.02f, .02f, .03f);
            Color fog = new Color(.1f, .1f, .14f), ambient = new Color(.2f, .2f, .25f); float density = 0;

            foreach (var op in Ops)
            {
                double tl = t - op.start; if (tl < 0) break;
                float k = Ease.Apply(op.a.S("ease"), (float)(tl / op.Dur));
                if (op.kind == "sky")
                {
                    top = Color.Lerp(top, op.a.C("top", top), k); mid = Color.Lerp(mid, op.a.C("mid", mid), k); bot = Color.Lerp(bot, op.a.C("bottom", bot), k);
                    fog = Color.Lerp(fog, op.a.C("fog", fog), k); ambient = Color.Lerp(ambient, op.a.C("ambient", ambient), k);
                    density = Mathf.Lerp(density, op.a.F("density", density), k);
                    continue;
                }
                int i = System.Array.IndexOf(st.lightNames, op.a.S("name", ""));
                if (i < 0) continue;
                if (op.kind == "light") { _c[i] = Color.Lerp(_c[i], op.a.C("color", _c[i]), k); _i[i] = Mathf.Lerp(_i[i], op.a.F("intensity", _i[i]), k); }
                else if (op.kind == "strobe" && tl <= op.Dur)
                {
                    float every = op.a.F("every", 1);
                    double b = (Song.BeatAt(op.start + tl) - Song.BeatAt(op.start)) / every; float f = (float)(b - System.Math.Floor(b));
                    _m[i] *= Mathf.Lerp(op.a.F("low", .05f), op.a.F("high", 3), Mathf.Pow(1 - f, op.a.F("sharp", 4)));
                }
                else if (op.kind == "react" && tl <= op.Dur)
                    _m[i] *= op.a.F("floor", 1) + Song.Env(op.a.S("band", "kick"), t) * op.a.F("amount", 3);
            }
            for (int j = 0; j < n; j++) if (st.lights[j]) { st.lights[j].color = _c[j]; st.lights[j].intensity = _i[j] * _m[j]; }
            if (st.sky) { st.sky.SetColor(Top, top); st.sky.SetColor(Mid, mid); st.sky.SetColor(Bot, bot); }
            RenderSettings.fog = density > 0; RenderSettings.fogMode = FogMode.ExponentialSquared; RenderSettings.fogColor = fog; RenderSettings.fogDensity = density;
            RenderSettings.ambientMode = AmbientMode.Flat; RenderSettings.ambientLight = ambient;
        }
    }

    public class TextDriver : Driver
    {
        public override void Apply(double t, object binding)
        {
            var st = binding as MVStage; if (st == null) return;
            int used = 0;
            foreach (var op in Ops)
            {
                if (t < op.start) break;
                if (t > op.end || used >= st.labels.Length) continue;
                var l = st.labels[used++]; if (!l) continue;
                float tl = (float)(t - op.start), inn = op.a.F("in", .12f), outt = op.a.F("out", .15f);
                float a = Mathf.Clamp01(Mathf.Min(tl / Mathf.Max(inn, .001f), (float)(op.end - t) / Mathf.Max(outt, .001f)));
                string style = op.a.S("style", "pop"), txt = op.a.S("text", "");
                l.gameObject.SetActive(true);
                if (style == "type") { int n = Mathf.CeilToInt(txt.Length * Mathf.Clamp01(tl / Mathf.Max(op.a.F("typeTime", 1), .01f))); txt = txt.Substring(0, Mathf.Min(n, txt.Length)); }
                l.text = txt;
                l.fontSize = op.a.F("size", 96);
                var c = op.a.C("color", Color.white); c.a *= a; l.color = c;
                var anchor = op.a.V("pos", new Vector3(.5f, .15f));
                var rt = l.rectTransform; rt.anchorMin = rt.anchorMax = new Vector2(anchor.x, anchor.y); rt.anchoredPosition = Vector2.zero;
                float s = 1;
                if (style == "pop") s = Ease.Apply("back", Mathf.Clamp01(tl / Mathf.Max(inn, .001f)));
                else if (style == "slam") s = Mathf.Lerp(2.4f, 1, Ease.Apply("expo", Mathf.Clamp01(tl / Mathf.Max(inn, .001f))));
                rt.localScale = Vector3.one * s;
                rt.localEulerAngles = new Vector3(0, 0, op.a.F("tilt"));
            }
            for (; used < st.labels.Length; used++) if (st.labels[used]) st.labels[used].gameObject.SetActive(false);
        }
    }
}
