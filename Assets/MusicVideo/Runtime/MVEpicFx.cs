using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// The epic toolkit's shared state (Hawkes Punch's space, 2026-11-07): what the Post track and the effects computed for this evaluation, read by
    /// MVCamFx (trauma shake, FOV punch) and pushed to MV/Stylize (impact frame, speed lines, shock distortion) as globals. All 0 when unused, so a video
    /// that uses none of it renders exactly as before.
    /// </summary>
    public static class MVEpic
    {
        /// <summary>Look keys and cue kinds this toolkit reads (lint takes key names from string lists like this one).</summary>
        static readonly string[] Keys = { "epic", "plain", "trauma", "heavy", "punch", "impactframe", "speedlines", "shock", "silence", "freeze", "hitshake", "smear", "debris", "icewake" };

        public static float Trauma, Heavy, Punch;
        static int Id(string n) => Shader.PropertyToID(n);
        static readonly int LinesId = Id("_MV_Lines"), LinesP = Id("_MV_LinesP"), LinesQ = Id("_MV_LinesQ"), LinesAt = Id("_MV_LinesAt"),
            ImpactId = Id("_MV_Impact"), ImpactP = Id("_MV_ImpactP"), ImpactAt = Id("_MV_ImpactAt"), ImpactAccent = Id("_MV_ImpactAccent"),
            ShockW = Id("_MV_ShockW"), ShockP = Id("_MV_ShockP");

        // this evaluation's values
        static float _lines, _impact; static Vector4 _linesP, _linesQ, _linesAt, _impactP, _impactAt, _accent;
        public static bool FlashOn; public static Color FlashColor;
        static bool _any;

        /// <summary>Start of the Post track's Apply.</summary>
        public static void BeginPost()
        {
            Trauma = Heavy = Punch = 0; _lines = _impact = 0; FlashOn = false;
            _linesP = _linesQ = _linesAt = _impactP = _impactAt = _accent = Vector4.zero;
        }

        static double FrameLen(Op op) => 1.0 / Mathf.Max(1, op.a.F("fps", 30));
        /// <summary>The frame number of song time t counted from the first frame at or after the cue, on the render's frame grid.</summary>
        static int FrameOf(Op op, double t) { double fps = op.a.F("fps", 30); return (int)System.Math.Round(t * fps) - (int)System.Math.Ceiling(op.start * fps - 1e-4); }

        static Vector4 Point(Op op, string key, double t)
        {
            if (op.a.Vec.TryGetValue(key, out var v)) return new Vector4(v.x, v.y, v.z, 1);
            var s = op.a.S(key); if (string.IsNullOrEmpty(s)) return Vector4.zero;
            var tr = MVActor.Point(s, t); if (!tr) return Vector4.zero;
            var p = tr.position; return new Vector4(p.x, p.y, p.z, 1);
        }

        /// <summary>The toolkit's own Post ops, on song time (they keep running through a hitstop, as the camera does). True when handled.</summary>
        public static bool PostOp(Op op, double t, double tl)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "impactframe":
                    {
                        _any = true;
                        int n = FrameOf(op, t), flash = (int)a.F("flash", 1), frames = (int)a.F("frames", 2);
                        if (n < 0 || n >= flash + frames) return true;
                        if (n < flash) { FlashOn = true; FlashColor = a.C("flashColor", Color.white); FlashColor.a = a.F("flashAlpha", 1); return true; }
                        int k = n - flash; string style = a.S("style", "flip");
                        // black: the subject black on white. white: the reverse. flip: black-on-white, then the reverse, and so on.
                        float inv = style == "white" ? 1 : style == "flip" ? (k % 2) : 0;
                        _impact = 1;
                        _impactP = new Vector4(inv, a.F("cut", 1.35f), a.F("lines", 1), Mathf.Floor((float)t * 24f) + op.index * 17);
                        _impactAt = Point(op, "on", t);
                        _accent = a.C("accent", new Color(1, 1, 1, 0));
                        if (!a.Col.ContainsKey("accent")) _accent = new Vector4(1, 1, 1, 0);
                        _impactAt.w = _impactAt.w > 0 ? 1 : 0;
                        if (a.F("threshold") > 0) _impactP.y = -a.F("threshold");   // negative: a luminance cut instead of a depth cut
                        return true;
                    }
                case "speedlines":
                    {
                        _any = true;
                        if (tl > op.Dur) return true;
                        float fin = a.F("fadeIn", .08f), fout = a.F("fadeOut", .15f);
                        float w = Mathf.Clamp01(Mathf.Min(fin > 0 ? (float)tl / fin : 1, fout > 0 ? (float)(op.Dur - tl) / fout : 1));
                        float amt = a.F("amount", .8f) * w;
                        if (amt <= _lines) return true;
                        _lines = amt;
                        float hz = a.F("hz", 12);                                           // a new set of lines every 2nd frame at 24 fps
                        float seed = Mathf.Floor((float)t * hz + 1e-3f) + op.index * 31;
                        bool parallel = a.S("style", "radial") == "parallel";
                        _linesP = new Vector4(parallel ? 1 : 0, a.F("angle") * Mathf.Deg2Rad, a.F("ink"), seed);
                        _linesQ = new Vector4(a.F("density", .55f), a.F("clear", parallel ? .18f : .22f), a.F("width", .14f), a.F("count", parallel ? 70 : 150));
                        _linesAt = Point(op, "on", t);
                        if (a.Vec.TryGetValue("center", out var c)) _linesAt = new Vector4(c.x, c.y, 0, 2);  // a screen point, 0..1
                        return true;
                    }
                case "trauma":
                    {
                        // Eiserloh's trauma: it falls linearly to 0 over the cue; the camera squares it (MVCamFx). `heavy` is the slow shake for a planet's weight.
                        if (tl > op.Dur) return true;
                        float d = 1 - (float)(tl / op.Dur);
                        Trauma += a.F("trauma") * d; Heavy += a.F("heavy") * d;
                        float pf = a.F("punchFor", .18f);
                        if (a.F("punch") > 0 && tl < pf) Punch += a.F("punch") * (1 - (float)tl / pf) * (1 - (float)tl / pf);
                        return true;
                    }
            }
            return false;
        }

        /// <summary>The two registers, on top of whatever grade is on: epic is harder, rimmed and graphic; plain is flat, soft and frontally lit.
        /// Switched by a card's `look` with a 0-length grade, so they change on the cut and never blend.</summary>
        public static void Register(Dictionary<string, float> v)
        {
            v.TryGetValue("epic", out var e); v.TryGetValue("plain", out var p);
            if (e == 0 && p == 0) return;
            void Add(string k, float d) { v.TryGetValue(k, out var x); v[k] = x + d; }
            Add("contrast", 16 * e - 18 * p); Add("saturation", 8 * e - 14 * p); Add("vignette", .12f * e - .12f * p);
            Add("sunRim", .8f * e - .45f * p); Add("faceFill", -.1f * e + .5f * p); Add("exposure", -.06f * e + .05f * p);
            Add("bloom", .12f * e - .1f * p); Add("chroma", .03f * e); Add("halation", .08f * e - .1f * p);
            if (v.TryGetValue("vignette", out var vg) && vg < 0) v["vignette"] = 0;
        }

        /// <summary>End of the Post track's Apply: plain kills speed lines and impact frames.</summary>
        public static void EndPost(float plain)
        {
            float allow = 1 - Mathf.Clamp01(plain);
            Shader.SetGlobalFloat(LinesId, _lines * allow); Shader.SetGlobalVector(LinesP, _linesP); Shader.SetGlobalVector(LinesQ, _linesQ); Shader.SetGlobalVector(LinesAt, _linesAt);
            Shader.SetGlobalFloat(ImpactId, _impact * allow); Shader.SetGlobalVector(ImpactP, _impactP); Shader.SetGlobalVector(ImpactAt, _impactAt); Shader.SetGlobalVector(ImpactAccent, _accent);
            Trauma = Mathf.Clamp01(Trauma); Heavy = Mathf.Clamp01(Heavy);
        }

        // ---- the shock distortion, from the fx track ----
        static Vector4 _shockW, _shockP; static bool _shockSet;
        public static void BeginFx() { _shockW = _shockP = Vector4.zero; _shockSet = false; _farSet = false; }
        public static void Shock(Vector3 c, float r, float strength, float width, float glow)
        {
            if (strength <= _shockP.x) return;
            _shockW = new Vector4(c.x, c.y, c.z, r); _shockP = new Vector4(strength, width, glow, 0); _shockSet = true;
        }
        public static void EndFx()
        {
            Shader.SetGlobalVector(ShockW, _shockW); Shader.SetGlobalVector(ShockP, _shockSet ? _shockP : Vector4.zero);
            if (!_farSet) FarBody = null;
            Shader.SetGlobalVector(FarA, _farSet ? _farA : Vector4.zero); Shader.SetGlobalVector(FarB, _farSet ? _farB : Vector4.zero); Shader.SetGlobalColor(FarC, _farC);
        }

        // ---- a planet-size shock for the space set's far layer (MVSpace.cs draws it; this only says where and how big) ----
        /// <summary>The far body a planet-scale shock is on (its actor name), or null. The ring is the small circle at `angle` (radians) from `axis`
        /// (a unit vector in the body's own frame, from its centre to the hit), `width` radians wide, at `alpha`: globals _MV_FarShockA (axis, angle),
        /// _MV_FarShockB (width, alpha, glow), _MV_FarShockC (colour).</summary>
        public static string FarBody;
        static readonly int FarA = Id("_MV_FarShockA"), FarB = Id("_MV_FarShockB"), FarC = Id("_MV_FarShockC");
        static Vector4 _farA, _farB; static Color _farC; static bool _farSet;
        public static void FarShock(string body, Vector3 axis, float angle, float width, float alpha, float glow, Color c)
        {
            if (_farSet && alpha <= _farB.y) return;
            FarBody = body; _farA = new Vector4(axis.x, axis.y, axis.z, angle); _farB = new Vector4(width, alpha, glow, 0); _farC = c; _farSet = true;
        }
    }

    /// <summary>
    /// The epic toolkit's mesh effects. Each is rebuilt from the song time just before every camera renders (so billboards face that camera and the
    /// smear reads the Animator's finished pose), a pure function of time: same time, same picture, forward, backward or jumped to.
    ///   shock   an expanding ring (fast out: 70% of its radius in the first third), free in space facing the camera or along a `normal`, or on a sphere's
    ///           surface (`sphere`: an actor; a small circle that hugs it, growing over `angle` degrees). Metres to kilometres, plus the screen distortion.
    ///   debris  faceted chunks flung from a point: a few big slow ones, many small fast ones, spinning at a constant rate, `gravity` 0 in space, `drag`
    ///           to slow them, and dust puffs that settle and hang (no gravity).
    ///   icewake ice boulders blown out of the path of a flyer (`on`), as he punches through a ring: a long wake, emitted along his path over `emitFor`.
    ///   smear   1-2 frames: the striking limb stretched back along its motion, and/or 2-4 multiples of it (Spider-Verse), from the posed mesh.
    /// </summary>
    public static class MVEpicFx
    {
        public static bool Handles(string kind) => kind == "shock" || kind == "debris" || kind == "icewake" || kind == "smear";

        class Live
        {
            public GameObject go, go2; public Mesh mesh, mesh2; public MeshRenderer r, r2;
            public Op op; public double t; public bool active;
        }
        static readonly Dictionary<Op, Live> All = new Dictionary<Op, Live>();
        static readonly Dictionary<Op, Vector3[]> Paths = new Dictionary<Op, Vector3[]>();
        static bool _hooked;

        static void Hook()
        {
            if (_hooked) return; _hooked = true;
            RenderPipelineManager.beginCameraRendering += (ctx, cam) => BuildAll(cam);
        }

        /// <summary>From FxDriver.Apply, for each op of these kinds: shows or hides it and notes the time; the mesh is built before each camera renders.</summary>
        public static void Run(Op op, double t, SongMap song, MVStage st)
        {
            Hook();
            double age = Elapsed(song, op.start, t);
            bool on = t >= op.start && age <= op.Dur;
            if (op.kind == "smear") on = t >= op.start && t < op.end - 1e-6;   // frames are frames: no hitstop stretch
            All.TryGetValue(op, out var l);
            if (!on) { if (l != null) { l.active = false; if (l.go && l.go.activeSelf) l.go.SetActive(false); if (l.go2 && l.go2.activeSelf) l.go2.SetActive(false); } return; }
            if (l == null || !l.go) { l = Make(op, st); All[op] = l; }
            l.op = op; l.t = t; l.active = true;
            if (!l.go.activeSelf) l.go.SetActive(true);
            if (op.kind == "icewake" && !Paths.ContainsKey(op)) SamplePath(op, t);
            if (op.kind == "shock") { ShockScreen(op, t, (float)age); FarRing(op, (float)age); }
        }

        static Live Make(Op op, MVStage st)
        {
            var l = new Live();
            GameObject Go(string n, out Mesh m, out MeshRenderer r)
            {
                var go = new GameObject("fx_" + n) { hideFlags = HideFlags.DontSave };
                go.transform.SetParent(st.fxRoot, false);
                m = new Mesh { hideFlags = HideFlags.DontSave, indexFormat = IndexFormat.UInt32 }; m.MarkDynamic();
                go.AddComponent<MeshFilter>().sharedMesh = m;
                r = go.AddComponent<MeshRenderer>(); r.shadowCastingMode = ShadowCastingMode.Off; r.receiveShadows = false;
                return go;
            }
            l.go = Go(op.kind, out l.mesh, out l.r);
            var a = op.a;
            switch (op.kind)
            {
                case "shock": l.r.sharedMaterial = FxLibrary.Mat("square", true); break;
                case "smear": break; // materials from the body
                default:
                    {
                        var m = new Material(Shader.Find("MV/Lit") ?? Shader.Find("Universal Render Pipeline/Lit")) { hideFlags = HideFlags.DontSave };
                        bool ice = op.kind == "icewake" || a.S("kind") == "ice";
                        var baseCol = a.C("color", ice ? new Color(.86f, .92f, .97f) : new Color(.42f, .38f, .35f));
                        m.SetColor("_BaseColor", baseCol);
                        m.SetFloat("_Smoothness", a.F("smooth", ice ? .62f : .15f));
                        // "emit": self-lit share of the colour, so a white-blue wake stays white-blue under a warm sun (s05, 2026-11-08); "emitColor" overrides the hue
                        float emit = a.F("emit", 0);
                        if (emit > 0) { m.EnableKeyword("_EMISSION"); m.SetColor("_EmissionColor", a.C("emitColor", baseCol) * emit); m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None; }
                        l.r.sharedMaterial = m;
                        l.r.shadowCastingMode = a.F("shadows") > 0 ? ShadowCastingMode.On : ShadowCastingMode.Off;
                        if (a.F("dust", ice ? 60 : 40) > 0) { l.go2 = Go(op.kind + "_dust", out l.mesh2, out l.r2); l.r2.sharedMaterial = FxLibrary.Mat("puff", false); }
                        break;
                    }
            }
            return l;
        }

        static void BuildAll(Camera cam)
        {
            if (All.Count == 0 || !cam) return;
            MVLate.Flush();
            foreach (var l in All.Values)
            {
                if (!l.active || !l.go) continue;
                try
                {
                    switch (l.op.kind)
                    {
                        case "shock": BuildShock(l, cam); break;
                        case "debris": BuildDebris(l, cam); break;
                        case "icewake": BuildWake(l, cam); break;
                        case "smear": BuildSmear(l, cam); break;
                    }
                }
                catch (System.Exception e) { Debug.LogWarning("epic fx " + l.op.kind + ": " + e.Message); }
            }
        }

        static float Age(Live l) => (float)Elapsed(MVClock.Song, l.op.start, l.t);

        /// <summary>Scene time that really passed from song time a to b: each step's warp increment, never more than the song's own, so a slow motion
        /// slows an effect and a hitstop stops it, but the warp's jump back onto the song after a hold is not counted. An effect that starts at a hit
        /// holds through its hitstop and goes on from there; one that starts as the hold ends starts at 0 (the warp's own ws was the frozen value).</summary>
        static double Elapsed(SongMap s, double a, double b)
        {
            if (b <= a) return b - a;
            if (!s || s.warp == null || s.warp.Length < 2) return b - a;
            double hz = SongMap.WarpHz, sum = 0, x = a;
            while (x < b - 1e-9)
            {
                double next = System.Math.Min(b, (System.Math.Floor(x * hz + 1e-9) + 1) / hz);
                double dw = s.WarpRaw(next) - s.WarpRaw(x);
                sum += System.Math.Max(0, System.Math.Min(dw, next - x));
                x = next;
            }
            return sum;
        }
        static float Life(Live l) => (float)l.op.WDur;

        static Vector3 Center(Op op, double t)
        {
            var a = op.a; var p = a.V("pos");
            var on = a.S("on");
            if (on != null) { var tr = MVActor.Point(on, t, false); if (tr) p = tr.position; }
            return p + a.V("offset");
        }

        static float Hash(int i) { uint x = (uint)(i * 2654435761u + 1013904223u); x ^= x >> 15; x *= 2246822519u; x ^= x >> 13; return (x & 0xFFFFFF) / (float)0xFFFFFF; }
        static Vector3 HashDir(int i)
        {
            for (int k = 0; k < 8; k++)
            {
                var v = new Vector3(Hash(i * 3 + k * 101) * 2 - 1, Hash(i * 3 + 1 + k * 101) * 2 - 1, Hash(i * 3 + 2 + k * 101) * 2 - 1);
                float m = v.sqrMagnitude; if (m > 1e-3f && m <= 1) return v / Mathf.Sqrt(m);
            }
            return Vector3.up;
        }

        static readonly List<Vector3> V = new List<Vector3>(); static readonly List<Vector3> N = new List<Vector3>(); static readonly List<Color> C = new List<Color>();
        static readonly List<Vector2> U = new List<Vector2>(); static readonly List<int> I = new List<int>();
        static void Begin() { V.Clear(); N.Clear(); C.Clear(); U.Clear(); I.Clear(); }
        static void Commit(Mesh m, bool normals)
        {
            m.Clear();
            if (V.Count == 0) return;
            m.SetVertices(V); if (C.Count == V.Count) m.SetColors(C); if (U.Count == V.Count) m.SetUVs(0, U);
            if (normals && N.Count == V.Count) m.SetNormals(N);
            m.SetTriangles(I, 0); m.RecalculateBounds();
        }

        // ---------- shock ----------

        static float ShockRadius(Op op, float age, out float x)
        {
            x = Mathf.Clamp01(age / (float)op.WDur);
            return Ease.Apply(op.a.S("ease", "out"), x);   // cubic out: 70% of the way at a third
        }

        static void ShockScreen(Op op, double t, float age)
        {
            var a = op.a;
            float distort = a.F("distort", a.Has("sphere") || a.Has("far") ? 0 : .6f); if (distort <= 0) return;
            float k = ShockRadius(op, age, out float x);
            float fade = (1 - x) * Mathf.Clamp01(x * 12);
            MVEpic.Shock(Center(op, t), a.F("size", 6) * k, distort * fade, a.F("width", .08f), a.F("glow", .25f) * fade);
        }

        /// <summary>`far`: a body of the space set's far layer. The ring there grows over `angle` degrees round `normal` (in the body's frame), slow reads as huge.</summary>
        static void FarRing(Op op, float age)
        {
            var a = op.a; var body = a.S("far"); if (string.IsNullOrEmpty(body)) return;
            float k = ShockRadius(op, age, out float x);
            float alpha = a.F("alpha", 1) * Mathf.Pow(1 - x, 1.4f) * Mathf.Clamp01(x * 20 + .05f);
            float th = a.F("angle", 40) * Mathf.Deg2Rad * k;
            MVEpic.FarShock(body, a.V("normal", Vector3.up).normalized, th, Mathf.Max(th * a.F("width", .08f) * 2.5f, .002f), alpha, a.F("glow", .3f), a.C("color", new Color(1, .97f, .9f)));
        }

        static void BuildShock(Live l, Camera cam)
        {
            var a = l.op.a; float age = Age(l);
            if (a.Has("far")) { Begin(); Commit(l.mesh, false); return; }   // drawn by the far layer
            float k = ShockRadius(l.op, age, out float x);
            float alpha = a.F("alpha", 1) * Mathf.Pow(1 - x, 1.4f) * Mathf.Clamp01(x * 20 + .05f);
            Color col = a.C("color", new Color(1, .97f, .9f)), inner = a.C("color2", col);
            Begin();
            if (alpha > .002f && k > 0)
            {
                int seg = (int)a.F("segments", 128);
                float w = a.F("width", .08f);
                string sphere = a.S("sphere");
                if (!string.IsNullOrEmpty(sphere))
                {
                    // A small circle on the sphere: centre C, radius R; the hit point P sets the axis n. The band spans angles th-w..th, lifted off the surface.
                    var st = MVActor.Point(sphere, l.t, false, out var act); if (!st) { Commit(l.mesh, false); return; }
                    Vector3 c = st.position; float R = a.Has("radius") ? a.F("radius") : RadiusOf(act, st);
                    Vector3 p = Center(l.op, l.t), n = (p - c).sqrMagnitude > 1e-6f ? (p - c).normalized : Vector3.up;
                    if (a.Vec.TryGetValue("normal", out var nn)) n = nn.normalized;
                    float lift = a.F("lift", .004f), th = a.F("angle", 60) * Mathf.Deg2Rad * k, wa = Mathf.Max(th * w * 2.5f, .002f);
                    Basis(n, out var u, out var v);
                    float[] ths = { Mathf.Max(0, th - wa), Mathf.Max(0, th - wa * .25f), th };
                    float[] als = { 0, 1, 0 };
                    for (int j = 0; j <= seg; j++)
                    {
                        float ph = j * Mathf.PI * 2 / seg; var radial = u * Mathf.Cos(ph) + v * Mathf.Sin(ph);
                        for (int q = 0; q < 3; q++) { var d = n * Mathf.Cos(ths[q]) + radial * Mathf.Sin(ths[q]); V.Add(c + d * (R * (1 + lift))); C.Add(Mul(q == 0 ? inner : col, alpha * als[q])); U.Add(new Vector2(.5f, .5f)); }
                    }
                    Strip(seg, 3);
                }
                else
                {
                    Vector3 c = Center(l.op, l.t); float r = a.F("size", 6) * k;
                    Vector3 n = a.Vec.TryGetValue("normal", out var nn) ? nn.normalized : (cam.transform.position - c).normalized;
                    Basis(n, out var u, out var v);
                    float[] rs = { r * (1 - w * 3.2f), r * (1 - w * .7f), r, 0 };
                    float[] als = { 0, 1, 0 };
                    float fill = a.F("fill", .12f);
                    for (int j = 0; j <= seg; j++)
                    {
                        float ph = j * Mathf.PI * 2 / seg; var d = u * Mathf.Cos(ph) + v * Mathf.Sin(ph);
                        for (int q = 0; q < 3; q++) { V.Add(c + d * Mathf.Max(0, rs[q])); C.Add(Mul(q == 0 ? inner : col, alpha * (q == 0 ? fill : als[q]))); U.Add(new Vector2(.5f, .5f)); }
                    }
                    Strip(seg, 3);
                    if (fill > 0)
                    {
                        // a faint pressure disc inside the ring
                        int c0 = V.Count; V.Add(c); C.Add(Mul(inner, 0)); U.Add(new Vector2(.5f, .5f));
                        for (int j = 0; j < seg; j++) { int i0 = j * 3, i1 = (j + 1) * 3; I.Add(c0); I.Add(i0); I.Add(i1); I.Add(c0); I.Add(i1); I.Add(i0); }
                    }
                }
            }
            Commit(l.mesh, false);
        }

        static Color Mul(Color c, float a) { c.a *= a; return c; }
        static void Basis(Vector3 n, out Vector3 u, out Vector3 v)
        {
            u = Vector3.Cross(n, Mathf.Abs(n.y) < .95f ? Vector3.up : Vector3.right).normalized; v = Vector3.Cross(n, u);
        }
        /// <summary>Quads between `rings` rings of `seg`+1 vertices each, laid ring-major per segment column: both faces.</summary>
        static void Strip(int seg, int rings)
        {
            for (int j = 0; j < seg; j++)
                for (int q = 0; q < rings - 1; q++)
                {
                    int a0 = j * rings + q, a1 = a0 + 1, b0 = (j + 1) * rings + q, b1 = b0 + 1;
                    I.Add(a0); I.Add(b0); I.Add(a1); I.Add(a1); I.Add(b0); I.Add(b1);
                    I.Add(a0); I.Add(a1); I.Add(b0); I.Add(a1); I.Add(b1); I.Add(b0);
                }
        }

        static readonly Dictionary<string, float> Radii = new Dictionary<string, float>();
        static float RadiusOf(MVActor actor, Transform tr)
        {
            if (actor == null) return 1;
            if (Radii.TryGetValue(actor.name, out var r)) return r;
            var b = new Bounds(tr.position, Vector3.zero); bool any = false;
            foreach (var rd in actor.GetComponentsInChildren<Renderer>(true)) { if (rd is ParticleSystemRenderer || rd.GetComponentInParent<MVActor>() != actor) continue; if (!any) { b = rd.bounds; any = true; } else b.Encapsulate(rd.bounds); }
            r = any ? Mathf.Max(b.extents.x, b.extents.y, b.extents.z) : 1;
            return Radii[actor.name] = r;
        }

        // ---------- rocks, shared by debris and the wake ----------

        static Vector3[][] _rocks;
        /// <summary>Four faceted rock shapes: an icosahedron with its corners pushed in and out, flat-shaded (each face its own three vertices).</summary>
        static Vector3[][] Rocks()
        {
            if (_rocks != null) return _rocks;
            float t = (1 + Mathf.Sqrt(5)) / 2;
            var p = new[] { new Vector3(-1, t, 0), new Vector3(1, t, 0), new Vector3(-1, -t, 0), new Vector3(1, -t, 0), new Vector3(0, -1, t), new Vector3(0, 1, t), new Vector3(0, -1, -t), new Vector3(0, 1, -t), new Vector3(t, 0, -1), new Vector3(t, 0, 1), new Vector3(-t, 0, -1), new Vector3(-t, 0, 1) };
            int[] f = { 0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1 };
            _rocks = new Vector3[4][];
            for (int k = 0; k < 4; k++)
            {
                var q = new Vector3[12];
                var stretch = new Vector3(1 + .5f * Hash(k * 7 + 1), .65f + .3f * Hash(k * 7 + 2), .8f + .4f * Hash(k * 7 + 3));
                for (int i = 0; i < 12; i++) q[i] = Vector3.Scale(p[i].normalized * (.7f + .55f * Hash(k * 50 + i)), stretch) * .5f;
                var tri = new Vector3[f.Length];
                for (int i = 0; i < f.Length; i++) tri[i] = q[f[i]];
                _rocks[k] = tri;
            }
            return _rocks;
        }

        static void AddRock(int shape, Vector3 pos, Quaternion rot, float size, Color col)
        {
            var tri = Rocks()[shape & 3];
            for (int i = 0; i < tri.Length; i += 3)
            {
                Vector3 a = pos + rot * (tri[i] * size), b = pos + rot * (tri[i + 1] * size), c = pos + rot * (tri[i + 2] * size);
                var n = Vector3.Cross(b - a, c - a).normalized;
                if (Vector3.Dot(n, (a + b + c) / 3 - pos) < 0) { var sw = b; b = c; c = sw; n = -n; }   // Unity's front face: the normal Cross(b-a, c-a) points out
                int v0 = V.Count; V.Add(a); V.Add(b); V.Add(c); N.Add(n); N.Add(n); N.Add(n);   // no vertex colour: MV/Lit reads it as something else (rocks came out saturated blue)
                I.Add(v0); I.Add(v0 + 1); I.Add(v0 + 2);
            }
        }

        static void AddPuff(Vector3 pos, float size, float rot, Color col, Camera cam)
        {
            var ct = cam.transform; var r = Quaternion.AngleAxis(rot, ct.forward);
            Vector3 x = r * ct.right * size * .5f, y = r * ct.up * size * .5f;
            int v0 = V.Count;
            V.Add(pos - x - y); V.Add(pos + x - y); V.Add(pos + x + y); V.Add(pos - x + y);
            U.Add(new Vector2(0, 0)); U.Add(new Vector2(1, 0)); U.Add(new Vector2(1, 1)); U.Add(new Vector2(0, 1));
            for (int k = 0; k < 4; k++) C.Add(col);
            I.Add(v0); I.Add(v0 + 2); I.Add(v0 + 1); I.Add(v0); I.Add(v0 + 3); I.Add(v0 + 2);
        }

        /// <summary>Distance along a straight launch with linear drag k: v/k (1 - e^-kt); plain v t when k is 0.</summary>
        static float Travel(float v, float k, float t) => k > 1e-4f ? v / k * (1 - Mathf.Exp(-k * t)) : v * t;

        // ---------- debris ----------

        static void BuildDebris(Live l, Camera cam)
        {
            var a = l.op.a; float age = Mathf.Max(0, Age(l)), life = Life(l);
            Vector3 c0 = Center(l.op, l.op.start);   // where the hit was: fixed at the cue's start
            if (!Fixed.TryGetValue(l.op, out var cfix)) { Fixed[l.op] = cfix = c0; MVActor.Point(a.S("on") ?? "", l.t, false); }
            c0 = cfix;
            int n = (int)a.F("count", 120), seed = l.op.index * 7919;
            float size = a.F("size", 4), speed = a.F("speed", size * 1.6f), drag = a.F("drag", .5f), g = a.F("gravity", 0), spin = a.F("spin", 220);
            float smin = a.F("min", .012f), smax = a.F("max", .16f);
            Vector3 normal = a.V("normal", Vector3.zero); float cone = a.F("spread", normal == Vector3.zero ? 180 : 75);
            Color col = Color.white, col2 = a.C("color2", new Color(.8f, .78f, .76f));
            float fadeFrom = Mathf.Clamp01(a.F("fadeFrom", .85f)), end = Mathf.Clamp01((age - life * fadeFrom) / Mathf.Max(life * (1 - fadeFrom), 1e-3f)); // fadeFrom 1: whole to the end of its life, then gone (a wake that must end on a cut, s05)
            Begin();
            for (int i = 0; i < n; i++)
            {
                int h = seed + i * 13;
                float u = Hash(h), sz = size * (smin + (smax - smin) * u * u * u);       // many small, a few big
                var dir = HashDir(h + 5);
                if (normal != Vector3.zero) dir = Vector3.Slerp(normal.normalized, dir, cone / 180f * Hash(h + 9)).normalized;
                float v = speed * (1.25f - u * u * .9f) * (.6f + .8f * Hash(h + 3));    // small fast, big slow
                var pos = c0 + dir * Travel(v, drag, age) + .5f * g * age * age * Vector3.down;
                var axis = HashDir(h + 11);
                var rot = Quaternion.AngleAxis(spin * (.3f + Hash(h + 17)) * (Hash(h + 19) > .5f ? 1 : -1) * age, axis) * Quaternion.LookRotation(HashDir(h + 23));
                float grow = Mathf.Clamp01(age * 30 + .2f) * (1 - end);
                AddRock((int)(Hash(h + 29) * 4), pos, rot, sz * grow, Color.Lerp(col, col2, Hash(h + 31)));
            }
            Commit(l.mesh, true);
            Dust(l, cam, c0, size, age, life, a.F("dust", 40), seed);
        }
        static readonly Dictionary<Op, Vector3> Fixed = new Dictionary<Op, Vector3>();

        /// <summary>Dust that blooms out and settles: heavy drag, so it slows to a hang (no gravity), grows, and fades only at the end.</summary>
        static void Dust(Live l, Camera cam, Vector3 c0, float size, float age, float life, float count, int seed)
        {
            if (!l.go2) return;
            var a = l.op.a;
            Color dc = a.C("dustColor", l.op.kind == "icewake" ? new Color(.92f, .96f, 1f, .35f) : new Color(.55f, .5f, .45f, .55f));
            float drag = a.F("dustDrag", 2.2f), sp = a.F("dustSpeed", size * .9f);
            float fade = 1 - Mathf.Clamp01((age - life * .7f) / Mathf.Max(life * .3f, 1e-3f));
            Begin();
            for (int i = 0; i < (int)count; i++)
            {
                int h = seed + 50000 + i * 7;
                var dir = HashDir(h);
                var pos = c0 + dir * Travel(sp * (.3f + .9f * Hash(h + 1)), drag, age);
                float s = size * (.18f + .3f * Hash(h + 2)) * (.35f + .65f * (1 - Mathf.Exp(-1.2f * age)) + .08f * age);
                float al = Mathf.Clamp01(age * 8) * fade * (.5f + .5f * Hash(h + 3));
                AddPuff(pos, s, Hash(h + 4) * 360 + age * 6 * (Hash(h + 5) - .5f), Mul(dc, al), cam);
            }
            Commit(l.mesh2, false);
        }

        // ---------- ice wake ----------

        const int PathN = 48;
        static void SamplePath(Op op, double t)
        {
            var a = op.a; var on = a.S("on");
            float emit = a.F("emitFor", (float)op.Dur * .5f);
            var pts = new Vector3[PathN];
            for (int k = 0; k < PathN; k++) { var tr = MVActor.Point(on, op.start + emit * k / (PathN - 1)); pts[k] = tr ? tr.position + a.V("offset") : a.V("pos"); }
            if (on != null) MVActor.Point(on, t);   // and back to now
            Paths[op] = pts;
        }
        static Vector3 PathAt(Vector3[] p, float s, out Vector3 dir)
        {
            float x = Mathf.Clamp01(s) * (p.Length - 1); int i = Mathf.Min((int)x, p.Length - 2); float f = x - i;
            dir = p[i + 1] - p[i];
            return Vector3.Lerp(p[i], p[i + 1], f);
        }

        static void BuildWake(Live l, Camera cam)
        {
            var a = l.op.a; float age = Mathf.Max(0, Age(l)), life = Life(l);
            if (!Paths.TryGetValue(l.op, out var path)) { Commit(l.mesh, true); return; }
            float emit = a.F("emitFor", (float)l.op.Dur * .5f);
            int n = (int)a.F("count", 500), seed = l.op.index * 4241;
            float size = a.F("size", 2.2f), spread = a.F("spread", 9), drag = a.F("drag", .35f), along = a.F("along", .12f), rad = a.F("radius", .6f), spin = a.F("spin", 120);
            float smin = a.F("min", .04f), smax = 1;
            Color c1 = Color.white, c2 = a.C("color2", new Color(.78f, .86f, .95f));
            float fadeFrom = Mathf.Clamp01(a.F("fadeFrom", .85f)), end = Mathf.Clamp01((age - life * fadeFrom) / Mathf.Max(life * (1 - fadeFrom), 1e-3f)); // fadeFrom 1: whole to the end of its life, then gone (a wake that must end on a cut, s05)
            float pathLen = 0; for (int k = 1; k < path.Length; k++) pathLen += Vector3.Distance(path[k - 1], path[k]);
            float flyerSpeed = pathLen / Mathf.Max(emit, .01f);
            Begin();
            for (int i = 0; i < n; i++)
            {
                int h = seed + i * 13;
                float s = (i + Hash(h)) / n, te = s * emit, tau = age - te;
                if (tau < 0) continue;
                var p0 = PathAt(path, s, out var d); d = d.sqrMagnitude > 1e-8f ? d.normalized : Vector3.forward;
                Basis(d, out var u, out var v);
                float ph = Hash(h + 1) * Mathf.PI * 2; var perp = u * Mathf.Cos(ph) + v * Mathf.Sin(ph);
                float uu = Hash(h + 2), sz = size * (smin + (smax - smin) * uu * uu * uu);
                float vel = spread * (1.3f - uu * .9f) * (.5f + .8f * Hash(h + 3));
                var vdir = (perp + d * (along * flyerSpeed / Mathf.Max(spread, .01f)) * Hash(h + 4)).normalized;
                float vmag = Mathf.Sqrt(vel * vel + (along * flyerSpeed * Hash(h + 4)) * (along * flyerSpeed * Hash(h + 4)));
                var pos = p0 + perp * rad * (.4f + Hash(h + 5)) + vdir * Travel(vmag, drag, tau);
                var axis = HashDir(h + 11);
                var rot = Quaternion.AngleAxis(spin * (.2f + Hash(h + 17)) * tau, axis) * Quaternion.LookRotation(HashDir(h + 23));
                float grow = Mathf.Clamp01(tau * 20 + .3f) * (1 - end);
                AddRock((int)(Hash(h + 29) * 4), pos, rot, sz * grow, Color.Lerp(c1, c2, Hash(h + 31)));
            }
            Commit(l.mesh, true);
            // ice dust along the path
            if (l.go2)
            {
                Color dc = a.C("dustColor", new Color(.92f, .96f, 1f, .3f)); int dn = (int)a.F("dust", 60);
                Begin();
                for (int i = 0; i < dn; i++)
                {
                    int h = seed + 90000 + i * 7; float s = (i + Hash(h)) / dn, tau = age - s * emit; if (tau < 0) continue;
                    var p0 = PathAt(path, s, out _); var dir = HashDir(h + 1);
                    var pos = p0 + dir * Travel(spread * .5f * (.3f + Hash(h + 2)), 1.6f, tau);
                    float sz = size * (.8f + 1.2f * Hash(h + 3)) * (.4f + .6f * (1 - Mathf.Exp(-tau)));
                    float al = Mathf.Clamp01(tau * 6) * (1 - Mathf.Clamp01((age - life * .7f) / Mathf.Max(life * .3f, 1e-3f)));
                    AddPuff(pos, sz, Hash(h + 4) * 360, Mul(dc, al), cam);
                }
                Commit(l.mesh2, false);
            }
        }

        // ---------- smear ----------

        class Chain { public float[] w, m; }
        static readonly Dictionary<(int, string), Chain> Chains = new Dictionary<(int, string), Chain>();
        static readonly Dictionary<SkinnedMeshRenderer, Mesh> Baked = new Dictionary<SkinnedMeshRenderer, Mesh>();
        static readonly Dictionary<SkinnedMeshRenderer, int> BakeSpace = new Dictionary<SkinnedMeshRenderer, int>();

        static HumanBodyBones[] Bones(string spec, out string key)
        {
            var low = (spec ?? "").ToLowerInvariant(); bool left = low.Contains("left"); bool leg = low.Contains("foot") || low.Contains("leg") || low.Contains("toe");
            key = (left ? "l" : "r") + (leg ? "leg" : "arm");
            if (leg) return left ? new[] { HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes } : new[] { HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, HumanBodyBones.RightToes };
            var list = new List<HumanBodyBones> { left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm, left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm, left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand };
            for (int b = (int)(left ? HumanBodyBones.LeftThumbProximal : HumanBodyBones.RightThumbProximal), e = b + 15; b < e; b++) list.Add((HumanBodyBones)b);
            return list.ToArray();
        }

        /// <summary>Per vertex: how much it belongs to the limb (m) and how far down it is (w: the shoulder 0.15, the forearm 0.6, the hand 1).</summary>
        static Chain ChainOf(SkinnedMeshRenderer smr, MVActor actor, HumanBodyBones[] chain, string key)
        {
            var k = (smr.GetInstanceID(), key);
            if (Chains.TryGetValue(k, out var c)) return c;
            var mesh = smr.sharedMesh; var bw = mesh.boneWeights; var bones = smr.bones;
            var factor = new Dictionary<int, float>();
            for (int i = 0; i < bones.Length; i++)
                for (int j = 0; j < chain.Length; j++)
                    if ((int)chain[j] < actor.human.Length && actor.human[(int)chain[j]] == bones[i]) factor[i] = j == 0 ? .15f : j == 1 ? .6f : 1f;
            c = new Chain { w = new float[bw.Length], m = new float[bw.Length] };
            for (int v = 0; v < bw.Length; v++)
            {
                var b = bw[v]; float w = 0, m = 0;
                void Acc(int bi, float wt) { if (wt > 0 && factor.TryGetValue(bi, out var f)) { m += wt; w += wt * f; } }
                Acc(b.boneIndex0, b.weight0); Acc(b.boneIndex1, b.weight1); Acc(b.boneIndex2, b.weight2); Acc(b.boneIndex3, b.weight3);
                c.w[v] = w; c.m[v] = m;
            }
            return Chains[k] = c;
        }

        static void BuildSmear(Live l, Camera cam)
        {
            var a = l.op.a; var spec = a.S("on") ?? "person.rightHand";
            var actor = MVActor.Named(spec.Split('.')[0]); if (!actor || actor.human.Length == 0) return;
            var chain = Bones(spec.Contains(".") ? spec.Substring(spec.IndexOf('.') + 1) : "rightHand", out var key);
            Transform b0 = actor.human[(int)chain[0]], b1 = actor.human[(int)chain[1]], b2 = actor.human[(int)chain[2]];
            if (!b0 || !b1 || !b2) return;
            // the motion's direction: given, else down the forearm (a punch drives along it)
            Vector3 dir = a.Vec.TryGetValue("dir", out var dv) ? dv.normalized : (b2.position - b1.position).normalized;
            float L = a.F("length", .55f); string style = a.S("style", "both"); int copies = (int)a.F("copies", 3);
            // The multiples swing back round the shoulder along the strike's arc (`fan` degrees each, about `arc`, world up by default; a straight
            // punch seen from the side reads as a longer, fatter arm, so the stretched copy is also `fat` times wider round the limb's own axis).
            float fan = a.F("fan", 9), fat = a.F("fat", 1.3f); var arcAxis = a.V("arc", Vector3.up).normalized; var pivot = b0.position;
            var toCam = (cam.transform.position - b2.position).normalized;
            var mats = new List<Material>(); var subs = new List<List<int>>();
            Begin();
            foreach (var smr in actor.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                if (!smr.sharedMesh || !smr.enabled || !smr.gameObject.activeInHierarchy) continue;
                var ch = ChainOf(smr, actor, chain, key);
                if (!Baked.TryGetValue(smr, out var bake) || !bake) { bake = new Mesh { hideFlags = HideFlags.HideAndDontSave }; Baked[smr] = bake; }
                smr.BakeMesh(bake, true);
                var vs = bake.vertices; var uv = bake.uv; var tr = smr.transform;
                // Which space the bake is in differs by rig and Unity version: take the one that puts the limb's end vertex on its end bone.
                if (!BakeSpace.TryGetValue(smr, out var mode))
                {
                    int best = 0; for (int i = 1; i < ch.w.Length && i < vs.Length; i++) if (ch.w[i] > ch.w[best]) best = i;
                    float d0 = Vector3.Distance(tr.position + tr.rotation * vs[best], b2.position), d1 = Vector3.Distance(tr.localToWorldMatrix.MultiplyPoint3x4(vs[best]), b2.position), d2 = Vector3.Distance(tr.position + vs[best], b2.position);
                    mode = d0 <= d1 && d0 <= d2 ? 0 : d1 <= d2 ? 1 : 2; BakeSpace[smr] = mode;
                }
                var world = new Vector3[vs.Length]; var m4 = tr.localToWorldMatrix;
                for (int i = 0; i < vs.Length; i++) world[i] = mode == 0 ? tr.position + tr.rotation * vs[i] : mode == 1 ? m4.MultiplyPoint3x4(vs[i]) : tr.position + vs[i];
                var shared = smr.sharedMaterials;
                for (int sm = 0; sm < bake.subMeshCount && sm < shared.Length; sm++)
                {
                    var tris = bake.GetTriangles(sm); var keep = new List<int>();
                    for (int i = 0; i < tris.Length; i += 3) if (ch.m[tris[i]] > .5f && ch.m[tris[i + 1]] > .5f && ch.m[tris[i + 2]] > .5f) { keep.Add(tris[i]); keep.Add(tris[i + 1]); keep.Add(tris[i + 2]); }
                    if (keep.Count == 0) continue;
                    var outIdx = new List<int>();
                    void Copy(float stretch, float shift, float push, float swing)
                    {
                        var map = new Dictionary<int, int>();
                        var q = Quaternion.AngleAxis(swing, arcAxis);
                        foreach (var vi in keep)
                        {
                            if (!map.TryGetValue(vi, out var ni))
                            {
                                ni = V.Count; map[vi] = ni;
                                float w = ch.w[vi];
                                var p0 = world[vi];
                                if (stretch > 0 && fat != 1) { var ax = b1.position + Vector3.Project(p0 - b1.position, dir); p0 = ax + (p0 - ax) * Mathf.Lerp(1, fat, Mathf.Clamp01(w)); }
                                if (swing != 0) p0 = pivot + q * (p0 - pivot);
                                V.Add(p0 - dir * (L * w * stretch + L * shift * w) - toCam * push);
                                U.Add(uv.Length == vs.Length ? uv[vi] : Vector2.zero); C.Add(Color.white);
                            }
                            outIdx.Add(ni);
                        }
                    }
                    if (style != "multi") Copy(1, 0, .004f, 0);                                     // the stretched limb
                    if (style != "stretch") for (int j = 1; j <= copies; j++) Copy(0, .35f * j / copies, .004f + .002f * j, fan * j); // multiples back along the strike's arc
                    mats.Add(shared[sm]); subs.Add(outIdx);
                }
            }
            var m = l.mesh; m.Clear();
            if (V.Count == 0) return;
            m.SetVertices(V); m.SetUVs(0, U); m.SetColors(C); m.subMeshCount = subs.Count;
            for (int s = 0; s < subs.Count; s++) m.SetTriangles(subs[s], s);
            m.RecalculateNormals(); m.RecalculateBounds();
            l.r.sharedMaterials = mats.ToArray();
        }

        /// <summary>For `call epicprobe`: every live effect, whether it is on, its mesh and material.</summary>
        public static List<string> Probe()
        {
            var r = new List<string>();
            foreach (var l in All.Values)
                r.Add($"{l.op.kind} start {l.op.start:0.###} active {l.active} go {(l.go ? l.go.activeInHierarchy.ToString() : "null")} verts {(l.mesh ? l.mesh.vertexCount : -1)} bounds {(l.mesh ? l.mesh.bounds.ToString() : "")} mat {(l.r && l.r.sharedMaterial ? l.r.sharedMaterial.shader.name : "none")} layer {(l.go ? l.go.layer : -1)} t {l.t:0.###}");
            return r;
        }

        public static void Clear()
        {
            foreach (var l in All.Values) { if (l.go) Object.DestroyImmediate(l.go); if (l.go2) Object.DestroyImmediate(l.go2); }
            All.Clear(); Paths.Clear(); Fixed.Clear(); Radii.Clear(); Chains.Clear(); BakeSpace.Clear();
            foreach (var m in Baked.Values) if (m) Object.DestroyImmediate(m);
            Baked.Clear();
        }
    }
}
