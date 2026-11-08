using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// The real-scale space set (Hawkes Punch's space, 2026-11-08; Director/videos/hawkespunch/SPACE-EPIC.md). An actor with
    /// "space": {...}. Two layers:
    /// - FAR: planets, moons, rings, the sun and the stars at true size in kilometres (the actors' positions, minus the root's,
    ///   are kilometres). Drawn by MV/SpaceFar, which ray-traces them per pixel along the near camera's own rays: a far camera with
    ///   the near camera's rotation and lens exactly, its position the near camera's divided by 1000 and carried by the focus.
    ///   Everything relative to the camera is worked out here in double precision, so a metre above Jupiter is a metre.
    /// - NEAR: the characters, effects, and true-scale patches (ring boulders, a moon's ground, a cloud deck) in metres around
    ///   the root, drawn on top by the normal pipeline.
    /// The FOCUS (a "focus" cue on the root) says where the near world sits in the far one: free in space, on a body's surface
    /// (lat, lon, alt) or in a ring's plane (radius, angle, alt). Patches stand under the focus and use the far layer's own
    /// surface functions, so the cloud wall at his palms is the planet behind him.
    /// It keeps no state between frames: cues fold into per-evaluation values (stamped with the driver's time), and everything
    /// drawn is computed per camera at render time from the evaluated actors. Scrub, reverse, previs and the checks all see one picture.
    /// </summary>
    [ExecuteAlways]
    public class MVSpace : MonoBehaviour
    {
        public string cfg = "{}";
        public string kind = "body";
        JObject _d = new JObject();
        public static readonly List<MVSpace> All = new List<MVSpace>();

        // ---------------------------------------------------------------- set-up
        public void Setup(string json)
        {
            cfg = json; Parse();
            var a = GetComponent<MVActor>();
            if (a && a.animRoot) { DestroyImmediate(a.animRoot); a.animRoot = null; }
            Build();
        }

        void Parse() { try { _d = JObject.Parse(cfg); } catch { _d = new JObject(); } kind = (string)_d["kind"] ?? "body"; }

        void OnEnable() { Parse(); if (!All.Contains(this)) All.Add(this); Hooks.Up(); Build(); }
        void OnDisable() { All.Remove(this); if (kind == "root") RootOff(); }
        void OnDestroy() { MVGen.DestroyParts(transform); }

        float F(string k, float d) => _d[k] != null && _d[k].Type != JTokenType.Null ? (float)_d[k] : d;
        string S(string k, string d = null) => (string)_d[k] ?? d;
        Color C(string k, Color d) => _d[k] != null && ColorUtility.TryParseHtmlString((string)_d[k], out var c) ? c : d;
        Vector3 V(string k, Vector3 d) { var t = _d[k] as JArray; return t != null && t.Count >= 3 ? new Vector3((float)t[0], (float)t[1], (float)t[2]) : d; }

        Renderer _far, _glare; Light _sun, _bounce, _rim; Material _farMat, _glareMat;

        void Build()
        {
            MVGen.DestroyParts(transform);
            _far = _glare = null;
            if (kind == "root") BuildRoot();
            else if (kind == "field") BuildField();
            else if (kind == "surface") BuildSurface();
        }

        static Mesh Fullscreen(string name)
        {
            var m = new Mesh { name = MVGen.Name(name), hideFlags = HideFlags.DontSave };
            m.vertices = new[] { new Vector3(-1, -1, 0), new Vector3(1, -1, 0), new Vector3(1, 1, 0), new Vector3(-1, 1, 0) };
            m.triangles = new[] { 0, 2, 1, 0, 3, 2 };
            m.bounds = new Bounds(Vector3.zero, Vector3.one * 2);
            return m;
        }

        Renderer Part(string name, Mesh mesh, Material mat, Vector3 at)
        {
            var go = new GameObject(name) { hideFlags = HideFlags.DontSave, layer = gameObject.layer };
            go.transform.SetParent(transform, false); go.transform.position = at;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.Off; r.receiveShadows = false;
            return r;
        }

        void BuildRoot()
        {
            var sh = Shader.Find("MV/SpaceFar"); var gsh = Shader.Find("MV/SpaceGlare"); if (!sh || !gsh) return;
            _farMat = new Material(sh) { name = MVGen.Name("space far"), hideFlags = HideFlags.DontSave };
            _glareMat = new Material(gsh) { name = MVGen.Name("space glare"), hideFlags = HideFlags.DontSave };
            // The quads draw full screen whatever their transform; they sit far below the set so a collider made from them (the motion check) touches nothing,
            // and their bounds are huge so they are never culled.
            var below = transform.position + Vector3.down * 90000;
            _far = Part("far", Fullscreen("space far quad"), _farMat, below);
            _glare = Part("glare", Fullscreen("space glare quad"), _glareMat, below);
            foreach (var r in new[] { _far, _glare }) r.localBounds = new Bounds(Vector3.zero, Vector3.one * 2e6f);
            _sun = MakeLight("sun", true); _bounce = MakeLight("bounce", false); _rim = MakeLight("rim", false);
        }

        static readonly (string, string)[] Maps = { ("_SP_Bands", "bands"), ("_SP_Rings", "rings"), ("_SP_EarthDay", "earth_day"), ("_SP_EarthLights", "earth_lights"), ("_SP_EarthLand", "earth_land"), ("_SP_Moon", "moon") };
        static readonly Dictionary<string, Texture2D> _tex = new Dictionary<string, Texture2D>();
        static Texture2D Tex(string name)
        {
            if (_tex.TryGetValue(name, out var t) && t) return t;
#if UNITY_EDITOR
            t = UnityEditor.AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/MusicVideo/Props/Space/" + name + ".png");
#endif
            _tex[name] = t; return t;
        }

        Light MakeLight(string name, bool shadows)
        {
            var go = new GameObject("space " + name) { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(transform, false);
            var l = go.AddComponent<Light>(); l.type = LightType.Directional; l.intensity = 0; l.enabled = false;
            l.shadows = shadows ? LightShadows.Soft : LightShadows.None; l.shadowStrength = 1; l.shadowBias = .02f; l.shadowNormalBias = .25f;
            return l;
        }

        void RootOff()
        {
            foreach (var l in new[] { _sun, _bounce, _rim }) if (l) l.enabled = false;
            if (_sun && RenderSettings.sun == _sun) RenderSettings.sun = null;
        }

        // ---------------------------------------------------------------- folded cue state (per evaluation, never carried)
        // A driver folds its cues in order on every evaluation. The first fold at a new time (or a lower cue index) starts clean,
        // and the renderer ignores values folded at another time than the clock's, so a scrub back before the first cue is clean too.
        double _foldT = double.NaN; int _lastIdx = int.MaxValue;
        public void Fold(double t, int index)
        {
            if (t != _foldT || index <= _lastIdx) { _foldT = t; ResetFold(); }
            _lastIdx = index;
        }
        bool Current => Math.Abs(_foldT - MVClock.T) < 1e-7;

        // focus (root)
        public class FocusSpec { public string body, ring; public int mode; public double lat, lon, alt, r, heading; public Vector3 pos, rot; }
        FocusSpec _fa, _fb; float _fk;
        // hold (body)
        Vector3 _holdOff; float _holdW; bool _holdFaceOn; Vector2 _holdFace;
        // crater
        float _crater;
        // a ring's turn on itself (degrees), from ring_hoop's spin
        float _spin;

        void ResetFold() { _fa = _fb = null; _fk = 1; _holdW = 0; _holdOff = Vector3.zero; _holdFaceOn = false; _crater = 0; _trailOn = false; _spin = 0; }

        /// <summary>A focus from a cue: a named preset of the root's "focuses" (if "name"), with any key of the cue on top.</summary>
        public FocusSpec SpecOf(Args a)
        {
            var b = new Args();
            if (a.S("name") is string nm && _d["focuses"]?[nm] is JObject pre) b = Args.Parse(pre.ToString());
            float F2(string k, float d) => a.Has(k) ? a.F(k) : b.F(k, d);
            Vector3 V2(string k, Vector3 d) => a.Vec.ContainsKey(k) ? a.V(k) : b.V(k, d);
            string S2(string k) => a.S(k) ?? b.S(k);
            var s = new FocusSpec { heading = F2("heading", 0), rot = V2("rot", Vector3.zero) };
            if (S2("ring") != null) { s.mode = 2; s.ring = S2("ring"); s.r = F2("r", 110000); s.lon = F2("lon", 0); s.alt = F2("alt", 0); }
            else if (S2("body") != null) { s.mode = 1; s.body = S2("body"); s.lat = F2("lat", 0); s.lon = F2("lon", 0); s.alt = F2("alt", 0); }
            else { s.mode = 0; s.pos = V2("pos", Vector3.zero); }
            return s;
        }

        public void FoldFocus(Args a, float k)
        {
            var s = SpecOf(a);
            _fa = _fb ?? DefaultFocus(); _fb = s; _fk = Mathf.Clamp01(k);
        }
        public void FoldHold(Vector3 off, float w, float k) { _holdOff = off; _holdW = Mathf.LerpUnclamped(_holdW, w, Mathf.Clamp01(k)); }
        public void FoldHoldFace(float lat, float lon) { _holdFaceOn = true; _holdFace = new Vector2(lat, lon); }
        public void FoldCrater(float progress) { _crater = Mathf.Max(_crater, progress); }
        public void FoldSpin(float deg) { _spin += deg; }

        FocusSpec DefaultFocus()
        {
            if (_d["focus"] is JObject f) return SpecOf(Args.Parse(f.ToString()));
            return new FocusSpec { mode = 0, pos = Vector3.zero };
        }

        // ---------------------------------------------------------------- the far world, resolved for one camera
        struct D3 { public double x, y, z; public D3(double a, double b, double c) { x = a; y = b; z = c; } public static D3 operator +(D3 a, D3 b) => new D3(a.x + b.x, a.y + b.y, a.z + b.z); public static D3 operator -(D3 a, D3 b) => new D3(a.x - b.x, a.y - b.y, a.z - b.z); public static D3 operator *(D3 a, double s) => new D3(a.x * s, a.y * s, a.z * s); public double Len => Math.Sqrt(x * x + y * y + z * z); public Vector3 F => new Vector3((float)x, (float)y, (float)z); public static D3 Of(Vector3 v) => new D3(v.x, v.y, v.z); public static D3 Rot(Quaternion q, D3 v) { var r = q * v.F; return new D3(r.x, r.y, r.z); } }

        static D3 Rot(Quaternion q, D3 v)
        {
            // rotate in double: q as a matrix in double
            double x = q.x, y = q.y, z = q.z, w = q.w;
            double xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
            return new D3((1 - 2 * (yy + zz)) * v.x + 2 * (xy - wz) * v.y + 2 * (xz + wy) * v.z,
                          2 * (xy + wz) * v.x + (1 - 2 * (xx + zz)) * v.y + 2 * (yz - wx) * v.z,
                          2 * (xz - wy) * v.x + 2 * (yz + wx) * v.y + (1 - 2 * (xx + yy)) * v.z);
        }

        MVSpace Root => All.Find(s => s && s.kind == "root");
        static MVSpace Find(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            foreach (var s in All) if (s && (s.name == name || s.name.EndsWith("_" + name))) return s;
            return null;
        }

        // A body's far position (km, relative to the root) and orientation, including its own day.
        D3 FarPos(MVSpace root) => D3.Of(transform.position) - D3.Of(root.transform.position);
        public Quaternion FarRot
        {
            get
            {
                float day = F("day", 0);
                var q = transform.rotation;
                if (day != 0) q = q * Quaternion.AngleAxis((float)(MVClock.SceneTime * 360.0 / day), Vector3.up);
                return q;
            }
        }
        double Radius => F("radius", 1000);

        // The focus: where the near origin is in the far world (double, km) and how the near axes lie in it.
        bool Resolve(FocusSpec s, out D3 pos, out Quaternion rot, out MVSpace anchor, out Quaternion surface, out double alt)
        {
            var root = Root; pos = default; rot = Quaternion.identity; anchor = null; surface = Quaternion.identity; alt = 0;
            if (s == null || root == null) return false;
            Quaternion extra = Quaternion.AngleAxis((float)s.heading, Vector3.up) * Quaternion.Euler(s.rot);
            if (s.mode == 1)
            {
                var b = Find(s.body); if (!b) return false;
                double lat = s.lat * Math.PI / 180, lon = s.lon * Math.PI / 180;
                var nl = new D3(Math.Sin(lon) * Math.Cos(lat), Math.Sin(lat), Math.Cos(lon) * Math.Cos(lat));
                var east = new D3(Math.Cos(lon), 0, -Math.Sin(lon));
                var north = new D3(-Math.Sin(lon) * Math.Sin(lat), Math.Cos(lat), -Math.Cos(lon) * Math.Sin(lat));
                var q = b.FarRot;
                var n = Rot(q, nl);
                pos = b.FarPos(root) + n * (b.Radius + s.alt);
                surface = Quaternion.LookRotation(Rot(q, north).F, n.F);
                rot = surface * extra; anchor = b; alt = s.alt; return true;
            }
            if (s.mode == 2)
            {
                var g = Find(s.ring); if (!g) return false;
                double lon = s.lon * Math.PI / 180;
                var q = g.transform.rotation;
                var radial = Rot(q, new D3(Math.Sin(lon), 0, Math.Cos(lon)));
                var up = Rot(q, new D3(0, 1, 0));
                pos = g.FarPos(root) + radial * s.r + up * s.alt;
                surface = Quaternion.LookRotation(radial.F, up.F);
                rot = surface * extra; anchor = g; alt = s.alt; return true;
            }
            pos = D3.Of(s.pos); rot = Quaternion.Euler(s.rot) * Quaternion.AngleAxis((float)s.heading, Vector3.up); return true;
        }

        bool Focus(out D3 pos, out Quaternion rot, out MVSpace anchor, out Quaternion surface, out double alt)
        {
            var fb = Current ? _fb : null; var fa = Current ? _fa : null; float k = Current ? _fk : 1;
            if (fb == null) { fb = DefaultFocus(); k = 1; }
            if (!Resolve(fb, out pos, out rot, out anchor, out surface, out alt)) return false;
            if (k >= 1 || fa == null) return true;
            if (!Resolve(fa, out var pa, out var ra, out var aa, out var sa, out var alA)) return true;
            float e = k;
            if (fa.mode == fb.mode && fa.mode > 0 && (fa.body == fb.body) && (fa.ring == fb.ring))
            {
                // the same body: glide over its surface (or along its ring), not through it
                var m = new FocusSpec { mode = fa.mode, body = fa.body, ring = fa.ring, lat = Lerp(fa.lat, fb.lat, e), lon = Lerp(fa.lon, fb.lon, e), alt = Lerp(fa.alt, fb.alt, e), r = Lerp(fa.r, fb.r, e), heading = Lerp(fa.heading, fb.heading, e), rot = Vector3.Lerp(fa.rot, fb.rot, e) };
                return Resolve(m, out pos, out rot, out anchor, out surface, out alt);
            }
            pos = pa + (pos - pa) * e; rot = Quaternion.Slerp(ra, rot, e); if (e < .5f) { anchor = aa; surface = sa; alt = alA; }
            return true;
        }
        static double Lerp(double a, double b, float k) => a + (b - a) * k;

        // ---------------------------------------------------------------- per camera
        static readonly Vector4[] B = new Vector4[8], BH = new Vector4[8], BX = new Vector4[8], BY = new Vector4[8], BZ = new Vector4[8], BA = new Vector4[8], BT = new Vector4[8], BC = new Vector4[8], BC2 = new Vector4[8];
        static readonly Vector4[] R = new Vector4[4], RN = new Vector4[4], RU = new Vector4[4], RP = new Vector4[4], RK = new Vector4[4];
        static readonly Vector4[] Sp = new Vector4[4], SC = new Vector4[4], ST = new Vector4[4];

        public bool Visible => _far && _far.enabled && gameObject.activeInHierarchy;
        /// <summary>While Director/gen/space-debug.flag exists, every far render appends what it resolved to Director/gen/space-debug.txt.</summary>
        void DebugDump(Camera cam, D3 fpos, Quaternion frot, MVSpace anchor, double falt, D3 camFar, int n, List<MVSpace> bodies, Quaternion inv)
        {
            var lines = new List<string>
            {
                "cam " + cam.name + " t " + MVClock.T.ToString("F3") + " current " + Current + " fov " + cam.fieldOfView + " pos " + cam.transform.position + " fwd " + cam.transform.forward,
                "focus mode " + (_fb != null ? _fb.mode : -1) + " pos " + fpos.x.ToString("F1") + "," + fpos.y.ToString("F1") + "," + fpos.z.ToString("F1") + " rot " + frot.eulerAngles + " anchor " + (anchor ? anchor.name : "-") + " alt " + falt,
                "camFar " + camFar.x.ToString("F1") + "," + camFar.y.ToString("F1") + "," + camFar.z.ToString("F1")
            };
            for (int i = 0; i < n; i++) lines.Add(bodies[i].name + " rel " + B[i] + " h " + BH[i].x + " dirInCam " + cam.transform.InverseTransformDirection(inv * ((Vector3)B[i]).normalized));
            try { System.IO.File.AppendAllLines(System.IO.Path.Combine(Application.dataPath, "../Director/gen/space-debug.txt"), lines); } catch { }
        }
        static bool Debugging => System.IO.File.Exists(System.IO.Path.Combine(Application.dataPath, "../Director/gen/space-debug.flag"));

        void RenderCam(Camera cam)
        {
            if (!_farMat || !_far) return;
            if (!Visible) { RootOff(); return; }
            if (!Focus(out var fpos, out var frot, out var anchor, out var surface, out var falt)) { RootOff(); return; }
            var root = this;
            var nearCam = (D3.Of(cam.transform.position) - D3.Of(transform.position)) * .001;
            var camFar = fpos + Rot(frot, nearCam);
            var inv = Quaternion.Inverse(frot);

            // sun: a direction in the far frame (the sun is 1-10 AU off: the same direction everywhere in the set)
            var sunDir = V("sun", new Vector3(-1, .25f, .3f)).normalized;
            float sunAng = F("sunSize", .5f) * Mathf.Deg2Rad;
            Color sunCol = C("sunColor", new Color(1, .96f, .9f));
            float sunInt = F("sunIntensity", 3.2f);

            // bodies
            int n = 0; var bodies = new List<MVSpace>(); var index = new Dictionary<MVSpace, int>();
            foreach (var s in All) if (s && s.kind == "body" && s.gameObject.activeInHierarchy && n < 8) { index[s] = n; bodies.Add(s); n++; }
            MVSpace bestBounce = null; float bestE = 0; Vector3 bestDir = Vector3.down;
            float starDim = 1; float litFrame = 0;
            for (int i = 0; i < n; i++)
            {
                var b = bodies[i];
                var p = b.FarPos(root);
                if (b._holdW > 0 && b.Current) p = p + (fpos + Rot(frot, D3.Of(b._holdOff)) - p) * b._holdW;
                var rel = p - camFar; double rad = b.Radius;
                double h = rel.Len - rad;
                if (b == anchor && anchor.kind == "body")
                {
                    // exact altitude for the body we stand on: its altitude plus the camera's height over the focus
                    var up = Rot(surface, new D3(0, 1, 0)); var cn = Rot(frot, nearCam);
                    double vy = cn.x * up.x + cn.y * up.y + cn.z * up.z;
                    var perp = cn - up * vy;
                    h = falt + vy + (perp.x * perp.x + perp.y * perp.y + perp.z * perp.z) / (2 * (rad + falt));
                }
                var bodyRot = b.FarRot;
                if (b._holdW > 0 && b.Current && b._holdFaceOn)
                {
                    // a held body turns so the place named by "face" (lat, lon) is the one over his head
                    float la = b._holdFace.x * Mathf.Deg2Rad, lo = b._holdFace.y * Mathf.Deg2Rad;
                    var nl = new Vector3(Mathf.Sin(lo) * Mathf.Cos(la), Mathf.Sin(la), Mathf.Cos(lo) * Mathf.Cos(la));
                    var toHim = (-(rel.F)).normalized;
                    var faced = Quaternion.FromToRotation(bodyRot * nl, toHim) * bodyRot;
                    bodyRot = Quaternion.Slerp(bodyRot, faced, b._holdW);
                }
                var q = Quaternion.Inverse(bodyRot);
                B[i] = new Vector4((float)rel.x, (float)rel.y, (float)rel.z, (float)rad);
                float look = LookId(b.S("look", "rock"));
                var cr = All.Find(c => c && c.kind == "crater" && Find(c.S("body")) == b);
                BH[i] = new Vector4((float)h, look, b.F("atmo", 0), 0);
                Matrix4x4 m = Matrix4x4.Rotate(q);
                BX[i] = m.GetRow(0); BY[i] = m.GetRow(1); BZ[i] = m.GetRow(2);
                var ac = b.C("atmoColor", new Color(.35f, .6f, 1));
                BA[i] = new Vector4(ac.r, ac.g, ac.b, b.F("atmoStrength", 0));
                var tc = b.C("tint", Color.white); BT[i] = new Vector4(tc.r, tc.g, tc.b, b.F("bright", 1));
                BC[i] = Vector4.zero; BC2[i] = Vector4.zero;
                if (cr && cr.Visible2)
                {
                    float pr = cr.Current ? cr._crater : 0;
                    if (pr > 0)
                    {
                        float lat = cr.F("lat", 0) * Mathf.Deg2Rad, lon = cr.F("lon", 0) * Mathf.Deg2Rad;
                        var dir = new Vector3(Mathf.Sin(lon) * Mathf.Cos(lat), Mathf.Sin(lat), Mathf.Cos(lon) * Mathf.Cos(lat));
                        float A = cr.F("radius", 30) / (float)rad;
                        float grow = 1 - Mathf.Pow(1 - Mathf.Clamp01(pr / cr.F("grow", .35f)), 3);   // blooms in the first part, then cools
                        BC[i] = new Vector4(dir.x, dir.y, dir.z, A * Mathf.Max(grow, .02f));
                        BC2[i] = new Vector4(Mathf.Clamp01(pr), A, cr.F("glow", 1), 0);
                    }
                }
                // bounce from this body onto the near layer
                double D = rel.Len; float omega = (float)(2 * Math.PI * (1 - Math.Sqrt(Math.Max(0, 1 - (rad / D) * (rad / D)))));
                var relN = rel.F.normalized;
                float litFrac = .5f * (1 + Vector3.Dot(sunDir, -relN));
                float e = b.F("albedo", .3f) * omega / Mathf.PI * litFrac;
                if (e > bestE) { bestE = e; bestBounce = b; bestDir = relN; }
                // how much lit planet the frame holds, to dim the stars (anime shows a few anyway)
                float inFrame = Vector3.Dot(inv * relN, cam.transform.forward) > Mathf.Cos(Mathf.Deg2Rad * (cam.fieldOfView * .8f)) ? 1 : 0;
                float angR = (float)Math.Asin(Math.Min(1, rad / D));
                litFrame += inFrame * Mathf.Min(1, angR / (cam.fieldOfView * Mathf.Deg2Rad * .5f)) * litFrac;
            }
            starDim = Mathf.Lerp(1, F("starsLit", .35f), Mathf.Clamp01(litFrame));

            // rings
            int nr = 0;
            foreach (var s in All)
            {
                if (!s || s.kind != "ring" || !s.gameObject.activeInHierarchy || nr >= 4) continue;
                var c = s.FarPos(root) - camFar;
                var q = s.transform.rotation; var N = q * Vector3.up; var U = q * Vector3.right;
                double hgt = -(c.x * N.x + c.y * N.y + c.z * N.z);
                if (s == anchor) hgt = falt + Vector3.Dot(N, (Rot(frot, nearCam)).F);
                R[nr] = new Vector4((float)c.x, (float)c.y, (float)c.z, (float)hgt);
                RN[nr] = new Vector4(N.x, N.y, N.z, 0);
                RU[nr] = new Vector4(U.x, U.y, U.z, (float)((MVClock.SceneTime * s.F("spin", 0) + (s.Current ? s._spin : 0)) * Mathf.Deg2Rad));
                RP[nr] = new Vector4(s.F("inner", 74490), s.F("outer", 136775), s.F("profileFrom", 66900), s.F("profileTo", 140500));
                var host = Find(s.S("body")); int hi = host && index.TryGetValue(host, out var hx) ? hx : -1;
                RK[nr] = new Vector4(hi, s.F("opacity", 1), s.F("nearFade", 3), s.F("clumps", .3f));
                nr++;
            }
            // specks: a body too small to see, drawn as its light
            int ns = 0;
            foreach (var s in All)
            {
                if (!s || s.kind != "speck" || !s.Visible2 || ns >= 4 || s.transform.lossyScale.x <= 1e-5) continue;   // a speck shows at scale 1 (the set has it at 0)
                var p = s.FarPos(root) - camFar;
                Sp[ns] = new Vector4((float)p.x, (float)p.y, (float)p.z, s.F("size", 6));
                var col = s.C("color", new Color(1, .9f, .7f)) * s.F("glow", 4);
                SC[ns] = new Vector4(col.r, col.g, col.b, 0);
                ST[ns] = Vector4.zero;
                if (s.Current && s._trailOn) { var tp = D3.Of(s._trailFrom) - D3.Of(root.transform.position) - camFar; ST[ns] = new Vector4((float)tp.x, (float)tp.y, (float)tp.z, 1); }
                ns++;
            }

            float pix = 2 * Mathf.Tan(cam.fieldOfView * .5f * Mathf.Deg2Rad) / Mathf.Max(1, cam.pixelHeight);
            if (Debugging) DebugDump(cam, fpos, frot, anchor, falt, camFar, n, bodies, inv);
            var mat = _farMat;
            mat.SetMatrix("_SP_Rot", Matrix4x4.Rotate(frot));
            {
                // the far camera: the near camera's own axes and lens, turned into the far frame (no inverse matrices: what the lens sees is exact)
                var ct = cam.transform; float th = Mathf.Tan(cam.fieldOfView * .5f * Mathf.Deg2Rad);
                Vector3 r = frot * ct.right, u = frot * ct.up, f = frot * ct.forward;
                mat.SetVector("_SP_CamR", new Vector4(r.x, r.y, r.z, th * cam.aspect));
                mat.SetVector("_SP_CamU", new Vector4(u.x, u.y, u.z, th));
                mat.SetVector("_SP_CamF", new Vector4(f.x, f.y, f.z, 0));
            }
            mat.SetVector("_SP_Sun", new Vector4(sunDir.x, sunDir.y, sunDir.z, sunAng));
            var sc = sunCol * F("farSun", 1.6f);
            mat.SetVector("_SP_SunCol", new Vector4(sc.r, sc.g, sc.b, F("sunDisc", 60)));
            mat.SetVector("_SP_Misc", new Vector4(pix, MVClock.SceneTime, F("stars", 1) * starDim, F("exposure", 1)));
            mat.SetInt("_SP_N", n); mat.SetInt("_SP_NR", nr); mat.SetInt("_SP_NS", ns);
            mat.SetVectorArray("_SP_B", B); mat.SetVectorArray("_SP_BH", BH); mat.SetVectorArray("_SP_BX", BX); mat.SetVectorArray("_SP_BY", BY); mat.SetVectorArray("_SP_BZ", BZ);
            mat.SetVectorArray("_SP_BA", BA); mat.SetVectorArray("_SP_BT", BT); mat.SetVectorArray("_SP_BC", BC); mat.SetVectorArray("_SP_BC2", BC2);
            mat.SetVectorArray("_SP_R", R); mat.SetVectorArray("_SP_RN", RN); mat.SetVectorArray("_SP_RU", RU); mat.SetVectorArray("_SP_RP", RP); mat.SetVectorArray("_SP_RK", RK);
            mat.SetVectorArray("_SP_S", Sp); mat.SetVectorArray("_SP_SC", SC); mat.SetVectorArray("_SP_ST", ST);

            // haze: inside a body's air, the far layer and the near patches fade to the same colour over the same distance
            Vector4 haze = Vector4.zero, nearFog = Vector4.zero;
            if (anchor && anchor.kind == "body" && anchor._d["haze"] is JArray hz && hz.Count >= 4 && falt < anchor.F("hazeBelow", 60))
            {
                haze = new Vector4((float)hz[0], (float)hz[1], (float)hz[2], (float)hz[3]);
                nearFog = new Vector4(haze.x, haze.y, haze.z, haze.w * 1000);
            }
            mat.SetVector("_SP_Haze", haze);
            Shader.SetGlobalVector("_SP_NearFog", nearFog);

            // the planets' shared surface settings (the near cloud deck reads them too)
            var jup = All.Find(s => s && s.kind == "body" && s.S("look") == "jupiter");
            if (jup)
            {
                Shader.SetGlobalFloat("_SP_JupWind", jup.F("wind", .004f)); Shader.SetGlobalFloat("_SP_StormSpin", jup.F("stormSpin", .35f));
                Shader.SetGlobalVector("_SP_Storm", new Vector4(jup.F("stormLat", -22.5f) * Mathf.Deg2Rad, jup.F("stormLon", 0) * Mathf.Deg2Rad, jup.F("stormW", .2f), jup.F("stormH", .12f)));
            }
            foreach (var (prop, file) in Maps) { var tex = Tex(file); if (tex) Shader.SetGlobalTexture(prop, tex); }
            var deck = All.Find(x => x && x.kind == "surface" && x.S("look") == "cloud");
            Shader.SetGlobalFloat("_SP_DeckBands", deck ? deck.F("bands", 120) : 120);
            var vx = Vector4.zero;
            if (deck && deck._d["vortex"] is JArray vj && vj.Count >= 4) vx = new Vector4((float)vj[0], (float)vj[1], (float)vj[2], (float)vj[3]);
            Shader.SetGlobalVector("_SP_Vortex", vx);
            if (anchor && anchor.kind == "body")
            {
                // the patch's frame in the body's own coordinates, for the near deck's colour
                var toLocal = Quaternion.Inverse(anchor.FarRot);
                var up = toLocal * (surface * Vector3.up); var e = toLocal * (surface * Vector3.right); var no = toLocal * (surface * Vector3.forward);
                Shader.SetGlobalVector("_SP_PatchN", new Vector4(up.x, up.y, up.z, (float)(anchor.Radius * 1000)));
                Shader.SetGlobalVector("_SP_PatchE", e); Shader.SetGlobalVector("_SP_PatchNo", no);
            }

            // near lights: the sun (hard, shadows), the bounce from the brightest planet, and a rim from behind
            var nearSun = inv * sunDir;
            _sun.enabled = true; _sun.color = sunCol; _sun.intensity = sunInt;
            _sun.transform.rotation = Quaternion.LookRotation(-nearSun, Mathf.Abs(nearSun.y) > .95f ? Vector3.forward : Vector3.up);
            RenderSettings.sun = _sun;
            if (bestBounce)
            {
                var bc = bestBounce.C("bounce", new Color(.6f, .7f, 1));
                var bdir = inv * bestDir;
                _bounce.enabled = true; _bounce.color = bc;
                _bounce.intensity = Mathf.Min(F("bounceMax", 1.2f), bestE * sunInt * F("bounce", 2.5f));
                _bounce.transform.rotation = Quaternion.LookRotation(-bdir, Mathf.Abs(bdir.y) > .95f ? Vector3.forward : Vector3.up);
            }
            else _bounce.enabled = false;
            float rimI = F("rim", 1.6f);
            if (rimI > 0)
            {
                var ct = cam.transform; var side = Vector3.Dot(nearSun, ct.right) > 0 ? -ct.right : ct.right;   // from the side away from the sun
                var toLight = (ct.forward + ct.up * F("rimUp", .45f) + side * F("rimSide", .6f)).normalized;   // the rim light stands behind him, up and away from the sun
                _rim.enabled = true; _rim.color = C("rimColor", new Color(.62f, .74f, 1)); _rim.intensity = rimI;
                _rim.transform.rotation = Quaternion.LookRotation(-toLight, Vector3.up);
            }
            else _rim.enabled = false;
            Shader.SetGlobalVector("_MV_SunDirW", nearSun);

            // the glare: where the sun is on screen, and how much of it the far bodies hide
            var gv = Vector4.zero;
            var vp = cam.WorldToViewportPoint(cam.transform.position + nearSun * 10);
            if (vp.z > 0)
            {
                float vis = 1;
                for (int i = 0; i < n; i++)
                {
                    var c = (Vector3)B[i]; float r = B[i].w; float b = Vector3.Dot(c, sunDir);
                    if (b <= 0) continue;
                    float dd = Vector3.Cross(sunDir, c).magnitude;
                    float soft = Mathf.Max(r * .01f, b * sunAng);
                    vis *= Mathf.Clamp01((dd - (r - soft)) / (2 * soft));
                }
                gv = new Vector4(vp.x, vp.y, vis, cam.aspect);
            }
            _glareMat.SetVector("_SP_GlarePos", gv);
            var glc = sunCol; _glareMat.SetVector("_SP_GlareCol", new Vector4(glc.r, glc.g, glc.b, F("glare", 1)));

            // patches stand under the focus
            foreach (var s in All)
            {
                if (!s || (s.kind != "surface" && s.kind != "field")) continue;
                var host = Find(s.S(s.kind == "surface" ? "body" : "ring"));
                bool on = host && host == anchor;
                foreach (var r in s.GetComponentsInChildren<Renderer>(true)) r.forceRenderingOff = !on;
                if (!on) continue;
                var place = Quaternion.Inverse(Quaternion.Inverse(surface) * frot);   // the surface frame, in near axes
                s.transform.SetPositionAndRotation(transform.position + place * new Vector3(0, -(float)(falt * 1000), 0), place);
            }
        }

        bool Visible2 => gameObject.activeInHierarchy && (Root == null || Root.Visible);

        static float LookId(string s) => s switch { "earth" => 1, "jupiter" => 2, "saturn" => 3, "greymoon" => 4, _ => 0 };

        // speck trail (folded by its move cue)
        bool _trailOn; Vector3 _trailFrom;
        public void FoldTrail(Vector3 from) { _trailOn = true; _trailFrom = from; }

        // ---------------------------------------------------------------- hooks
        static class Hooks
        {
            static bool _up;
            public static void Up()
            {
                if (_up) return; _up = true;
                RenderPipelineManager.beginCameraRendering += (ctx, cam) =>
                {
                    MVSpace root = null;
                    foreach (var s in All) if (s && s.kind == "root" && s.isActiveAndEnabled) { root = s; break; }
                    if (root) root.RenderCam(cam);
                };
            }
        }

        // ---------------------------------------------------------------- near patches
        Material RockMat(Color a, Color b, float ice, float smooth, float detail, Vector2 fade)
        {
            var sh = Shader.Find("MV/SpaceRock"); if (!sh) return null;
            var m = new Material(sh) { name = MVGen.Name("space rock"), hideFlags = HideFlags.DontSave };
            m.SetColor("_Color", a); m.SetColor("_Color2", b); m.SetFloat("_Ice", ice); m.SetFloat("_Smooth", smooth); m.SetFloat("_Detail", detail);
            m.SetVector("_Fade", new Vector4(fade.x, fade.y, 0, 0));
            return m;
        }

        // Deterministic noise for meshes built on the CPU.
        static float H1(int i) { uint x = (uint)(i * 2654435761u + 1013904223u); x ^= x >> 15; x *= 2246822519u; x ^= x >> 13; x *= 3266489917u; x ^= x >> 16; return (x & 0xFFFFFF) / (float)0xFFFFFF; }
        static float VN(Vector3 p, int seed)
        {
            int xi = Mathf.FloorToInt(p.x), yi = Mathf.FloorToInt(p.y), zi = Mathf.FloorToInt(p.z);
            float fx = p.x - xi, fy = p.y - yi, fz = p.z - zi;
            fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
            float h(int a, int b, int c) => H1(a * 73856093 ^ b * 19349663 ^ c * 83492791 ^ seed * 15485863);
            float x00 = Mathf.Lerp(h(xi, yi, zi), h(xi + 1, yi, zi), fx), x10 = Mathf.Lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), fx);
            float x01 = Mathf.Lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), fx), x11 = Mathf.Lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), fx);
            return Mathf.Lerp(Mathf.Lerp(x00, x10, fy), Mathf.Lerp(x01, x11, fy), fz) * 2 - 1;
        }
        static float Fbm(Vector3 p, int seed, int oct) { float s = 0, a = .5f; for (int k = 0; k < oct; k++) { s += a * VN(p, seed + k * 31); p = p * 2.07f + new Vector3(3.1f, 1.7f, 5.3f); a *= .5f; } return s; }

        // An icosphere of a given subdivision, shared per level.
        static readonly Dictionary<int, (List<Vector3> v, List<int> t)> _ico = new Dictionary<int, (List<Vector3>, List<int>)>();
        static (List<Vector3> v, List<int> t) Ico(int level)
        {
            if (_ico.TryGetValue(level, out var c)) return c;
            float g = (1 + Mathf.Sqrt(5)) / 2;
            var v = new List<Vector3> { new Vector3(-1, g, 0), new Vector3(1, g, 0), new Vector3(-1, -g, 0), new Vector3(1, -g, 0), new Vector3(0, -1, g), new Vector3(0, 1, g), new Vector3(0, -1, -g), new Vector3(0, 1, -g), new Vector3(g, 0, -1), new Vector3(g, 0, 1), new Vector3(-g, 0, -1), new Vector3(-g, 0, 1) };
            for (int i = 0; i < v.Count; i++) v[i] = v[i].normalized;
            var t = new List<int> { 0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1 };
            for (int l = 0; l < level; l++)
            {
                var mid = new Dictionary<long, int>(); var nt = new List<int>();
                int M(int a, int b) { long key = a < b ? ((long)a << 32) | (uint)b : ((long)b << 32) | (uint)a; if (mid.TryGetValue(key, out var i)) return i; v.Add(((v[a] + v[b]) * .5f).normalized); mid[key] = v.Count - 1; return v.Count - 1; }
                for (int i = 0; i < t.Count; i += 3) { int a = t[i], b = t[i + 1], cc = t[i + 2]; int ab = M(a, b), bc = M(b, cc), ca = M(cc, a); nt.AddRange(new[] { a, ab, ca, b, bc, ab, cc, ca, bc, ab, bc, ca }); }
                t = nt;
            }
            _ico[level] = (v, t); return (v, t);
        }

        class MeshBuf { public List<Vector3> v = new List<Vector3>(), n = new List<Vector3>(); public List<Color> c = new List<Color>(); public List<int> t = new List<int>(); }

        static void AddRock(MeshBuf m, Vector3 at, float size, int seed, int level, Vector3 squash, Quaternion turn)
        {
            var (iv, it) = Ico(level); int b = m.v.Count;
            float rough = .32f;
            var pts = new Vector3[iv.Count];
            for (int i = 0; i < iv.Count; i++)
            {
                var d = iv[i];
                float r = 1 + Fbm(d * 1.3f + Vector3.one * seed, seed, 4) * rough * 2 + Fbm(d * 4.1f, seed + 7, 3) * rough * .6f;
                // a few flat facets: ice breaks along planes
                for (int k = 0; k < 4; k++) { var pn = new Vector3(H1(seed * 7 + k) - .5f, H1(seed * 7 + k + 40) - .5f, H1(seed * 7 + k + 80) - .5f).normalized; float cut = .72f + .2f * H1(seed + k * 3); float dd = Vector3.Dot(d * r, pn); if (dd > cut) r *= cut / dd; }
                pts[i] = turn * Vector3.Scale(d * r, squash) * size + at;
            }
            var nrm = new Vector3[iv.Count];
            for (int i = 0; i < it.Count; i += 3) { var f = Vector3.Cross(pts[it[i + 1]] - pts[it[i]], pts[it[i + 2]] - pts[it[i]]); nrm[it[i]] += f; nrm[it[i + 1]] += f; nrm[it[i + 2]] += f; }
            var col = new Color(H1(seed * 3 + 1), H1(seed * 3 + 2), H1(seed * 3 + 3), H1(seed * 5));
            for (int i = 0; i < iv.Count; i++) { m.v.Add(pts[i]); m.n.Add(nrm[i].normalized); m.c.Add(col); }
            for (int i = 0; i < it.Count; i += 3) { m.t.Add(b + it[i]); m.t.Add(b + it[i + 2]); m.t.Add(b + it[i + 1]); }
        }

        void Flush(MeshBuf m, Material mat, string name, bool shadows)
        {
            if (m.v.Count == 0) return;
            var mesh = new Mesh { name = MVGen.Name(name), indexFormat = IndexFormat.UInt32, hideFlags = HideFlags.DontSave };
            mesh.SetVertices(m.v); mesh.SetNormals(m.n); mesh.SetColors(m.c); mesh.SetTriangles(m.t, 0); mesh.RecalculateBounds();
            var r = Part(name, mesh, mat, transform.position);
            r.transform.localPosition = Vector3.zero; r.transform.localRotation = Quaternion.identity;
            r.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off; r.receiveShadows = true;
        }

        public int Tris { get; private set; }

        /// <summary>Ring ice: a disc of boulders around the near origin in the ring's plane, house-sized hero rocks where the marks say, sizes falling off as a power law.</summary>
        void BuildField()
        {
            var mat = RockMat(C("color", new Color(.86f, .87f, .9f)), C("color2", new Color(.66f, .64f, .62f)), F("ice", 1), F("smooth", .45f), F("detail", .5f), new Vector2(F("fadeFrom", 1400), F("fadeTo", 2000)));
            if (!mat) return;
            int seed = (int)F("seed", 3); float rad = F("radius", 2000), thick = F("thickness", 60);
            float smin = F("sizeMin", .4f), smax = F("sizeMax", 9);
            int count = (int)F("count", 6000);
            var bufs = new List<MeshBuf> { new MeshBuf() };
            int tris = 0;
            void Add(Vector3 p, float s, int sd, bool hero)
            {
                float dist = new Vector2(p.x, p.z).magnitude;
                int level = hero ? 3 : s > 4 && dist < 600 ? 2 : (dist < 250 ? 2 : (dist < 900 ? 1 : 0));
                if (bufs[bufs.Count - 1].v.Count > 60000) bufs.Add(new MeshBuf());
                var sq = new Vector3(.8f + .5f * H1(sd + 11), .6f + .4f * H1(sd + 12), .8f + .5f * H1(sd + 13));
                var turn = Quaternion.Euler(H1(sd + 14) * 360, H1(sd + 15) * 360, H1(sd + 16) * 360);
                AddRock(bufs[bufs.Count - 1], p, s, sd, level, sq, turn);
                tris += Ico(level).t.Count / 3;
            }
            if (_d["hero"] is JArray heroes)
                for (int i = 0; i < heroes.Count; i++) { var h = heroes[i] as JArray; Add(new Vector3((float)h[0], (float)h[1], (float)h[2]), (float)h[3], 9000 + i * 17, true); }
            var keep = new List<Vector4>();
            if (_d["clear"] is JArray cl) foreach (var c in cl) { var h = c as JArray; keep.Add(new Vector4((float)h[0], (float)h[1], (float)h[2], (float)h[3])); }
            for (int i = 0; i < count; i++)
            {
                float u = H1(seed * 100003 + i * 3), v = H1(seed * 100003 + i * 3 + 1), w = H1(seed * 100003 + i * 3 + 2);
                // denser toward the middle so the camera's surroundings are full and the far field thins into the far layer's ring
                float rr = rad * Mathf.Pow(u, .62f), ang = v * Mathf.PI * 2;
                var p = new Vector3(Mathf.Sin(ang) * rr, (w - .5f) * thick + Fbm(new Vector3(rr * .003f, ang, 0), seed, 3) * thick * .6f, Mathf.Cos(ang) * rr);
                float s = smin * Mathf.Pow(smax / smin, Mathf.Pow(H1(seed * 7 + i), 3.2f));
                bool blocked = false; foreach (var k in keep) if ((p - (Vector3)k).magnitude < k.w + s) { blocked = true; break; }
                if (blocked) continue;
                Add(p, s, seed * 31 + i, false);
            }
            for (int i = 0; i < bufs.Count; i++) Flush(bufs[i], mat, "ring ice " + i, true);
            Tris = tris;
        }

        /// <summary>A body's surface under the focus: a regolith patch with craters and rocks (kind rock), or a cloud deck (kind cloud).</summary>
        void BuildSurface()
        {
            string sk = S("look", "rock");
            float size = F("size", sk == "cloud" ? 40000 : 3000), planetR = F("planetRadius", 198000);
            int rings = (int)F("rings", 180), sectors = (int)F("sectors", 256);
            var m = new MeshBuf();
            float first = F("first", sk == "cloud" ? 1.5f : .5f);
            float k = Mathf.Log(size / first) / (rings - 1);
            m.v.Add(Vector3.zero); m.n.Add(Vector3.up); m.c.Add(Color.white);
            int seed = (int)F("seed", 5);
            Func<float, float, float> height = (x, z) => 0;
            if (sk != "cloud")
            {
                // craters of every size and a rough fractal floor, all curving away with the planet
                var craters = new List<Vector4>();
                for (int i = 0; i < (int)F("craters", 260); i++)
                {
                    float r = size * Mathf.Pow(H1(seed * 13 + i), .5f), a = H1(seed * 17 + i) * Mathf.PI * 2;
                    float cr = 2 + Mathf.Pow(H1(seed * 19 + i), 6) * F("craterMax", 220);
                    craters.Add(new Vector4(Mathf.Sin(a) * r, 0, Mathf.Cos(a) * r, cr));
                }
                if (_d["clear"] is JArray cl) foreach (var c in cl) { var h = c as JArray; craters.RemoveAll(q => new Vector2(q.x - (float)h[0], q.z - (float)h[2]).magnitude < q.w * 1.6f + (float)h[3]); }
                height = (x, z) =>
                {
                    float h = Fbm(new Vector3(x, 0, z) * .004f, seed, 6) * 18 + Fbm(new Vector3(x, 0, z) * .05f, seed + 3, 4) * 1.6f + Fbm(new Vector3(x, 0, z) * .6f, seed + 5, 3) * .12f;
                    foreach (var c in craters)
                    {
                        float dx = x - c.x, dz = z - c.z; float d2 = dx * dx + dz * dz; if (d2 > c.w * c.w * 4.8f) continue;
                        float d = Mathf.Sqrt(d2) / c.w;
                        h += (d < 1 ? -(1 - d * d) * .5f : 0) * c.w * .55f + .22f * c.w * Mathf.Exp(-Mathf.Pow((d - 1) / .18f, 2)) * .55f;
                    }
                    return h;
                };
            }
            for (int ri = 0; ri < rings; ri++)
            {
                float r = first * Mathf.Exp(k * ri);
                for (int si = 0; si < sectors; si++)
                {
                    float a = (si + (ri % 2) * .5f) / sectors * Mathf.PI * 2;
                    float x = Mathf.Sin(a) * r, z = Mathf.Cos(a) * r;
                    float y = height(x, z) - r * r / (2 * planetR);
                    m.v.Add(new Vector3(x, y, z)); m.n.Add(Vector3.up); m.c.Add(new Color(.5f, .5f, .5f, H1(ri * 977 + si)));
                }
            }
            for (int si = 0; si < sectors; si++) { m.t.Add(0); m.t.Add(1 + si); m.t.Add(1 + (si + 1) % sectors); }
            for (int ri = 0; ri < rings - 1; ri++)
                for (int si = 0; si < sectors; si++)
                {
                    int a = 1 + ri * sectors + si, b = 1 + ri * sectors + (si + 1) % sectors, c = a + sectors, d = b + sectors;
                    m.t.Add(a); m.t.Add(c); m.t.Add(b); m.t.Add(b); m.t.Add(c); m.t.Add(d);
                }
            // normals from the faces
            var nrm = new Vector3[m.v.Count];
            for (int i = 0; i < m.t.Count; i += 3) { var f = Vector3.Cross(m.v[m.t[i + 1]] - m.v[m.t[i]], m.v[m.t[i + 2]] - m.v[m.t[i]]); nrm[m.t[i]] += f; nrm[m.t[i + 1]] += f; nrm[m.t[i + 2]] += f; }
            for (int i = 0; i < nrm.Length; i++) m.n[i] = nrm[i].normalized;
            if (sk == "cloud")
            {
                var sh = Shader.Find("MV/SpaceCloud"); if (!sh) return;
                var mat = new Material(sh) { name = MVGen.Name("space cloud"), hideFlags = HideFlags.DontSave };
                mat.SetFloat("_Amp", F("amp", 260)); mat.SetFloat("_Scale", F("scale", 2600)); mat.SetFloat("_Boil", F("boil", .02f));
                Flush(m, mat, "cloud deck", true);
            }
            else
            {
                var mat = RockMat(C("color", new Color(.5f, .5f, .49f)), C("color2", new Color(.36f, .36f, .35f)), 0, F("smooth", .08f), F("detail", .8f), new Vector2(size * 2, size * 3));
                Flush(m, mat, "regolith", true);
                // rocks strewn on it
                var rocks = new MeshBuf();
                for (int i = 0; i < (int)F("rocks", 500); i++)
                {
                    float r = F("rockRadius", 400) * Mathf.Pow(H1(seed * 23 + i), .7f), a = H1(seed * 29 + i) * Mathf.PI * 2;
                    float x = Mathf.Sin(a) * r, z = Mathf.Cos(a) * r, s = .15f + Mathf.Pow(H1(seed * 31 + i), 5) * F("rockMax", 3);
                    AddRock(rocks, new Vector3(x, height(x, z) - r * r / (2 * planetR) + s * .25f, z), s, seed * 37 + i, r < 60 ? 2 : 1, new Vector3(1, .6f, 1), Quaternion.Euler(0, H1(i) * 360, 0));
                }
                Flush(rocks, RockMat(C("color", new Color(.5f, .5f, .49f)) * .85f, C("color2", new Color(.36f, .36f, .35f)), 0, .1f, 1.2f, new Vector2(size * 2, size * 3)), "rocks", true);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------ the cues
    public partial class MotionDriver
    {
        /// <summary>The space set's cues (MVSpace.cs), reached from PunchStep for any kind it doesn't know. False for a kind that isn't one.</summary>
        bool SpaceStep(ref Pose p, Op op, double tl, float raw, float k, int i, MVActor actor)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "focus":
                    {
                        var s = actor.GetComponent<MVSpace>(); if (!s) return true;
                        // the keys a focus reads (SpecOf), named here so lint knows them
                        bool any = a.Has("name") || a.Has("body") || a.Has("ring") || a.Has("lat") || a.Has("lon") || a.Has("alt") || a.Has("r") || a.Has("pos") || a.Has("rot") || a.Has("heading");
                        s.Fold(_t, op.index); s.FoldFocus(a, any ? k : k);
                        return true;
                    }
                case "planet_move":
                    {
                        var to = SpaceTarget(a, p.pos, actor);
                        var start = p.pos;
                        var arcDir = a.V("arcDir", Vector3.up).normalized;
                        p.pos = Vector3.LerpUnclamped(start, to, k) + arcDir * (a.F("arc") * 4 * k * (1 - k));
                        var s = actor.GetComponent<MVSpace>();
                        if (s && a.F("trail") > 0 && tl <= op.WDur + a.F("trail"))
                        {
                            // where this move had the speck `trail` seconds ago: the same path at the earlier ease
                            double tb = Math.Max(0, tl - a.F("trail"));
                            float eb = Ease.Apply(a.S("ease"), Mathf.Clamp01((float)(tb / op.WDur)));
                            s.Fold(_t, op.index);
                            s.FoldTrail(Vector3.LerpUnclamped(start, to, eb) + arcDir * (a.F("arc") * 4 * eb * (1 - eb)));
                        }
                        return true;
                    }
                case "planet_hold":
                    {
                        var s = actor.GetComponent<MVSpace>(); if (!s) return true;
                        s.Fold(_t, op.index); s.FoldHold(a.V("offset", Vector3.zero), a.F("weight", 1), k);
                        if (a.Vec.ContainsKey("face") || a.Has("face")) { var fv = a.V("face", Vector3.zero); s.FoldHoldFace(fv.x, fv.y); }
                        return true;
                    }
                case "planet_release":
                    {
                        var s = actor.GetComponent<MVSpace>(); if (!s) return true;
                        s.Fold(_t, op.index); s.FoldHold(a.V("offset", Vector3.zero), 0, k);
                        return true;
                    }
                case "planet_orbit":
                    {
                        // back to where the set put it, slowly, like setting down a full glass: smootherstep, with a small arc
                        var home = actor.basePos + a.V("offset", Vector3.zero);
                        float e = Mathf.Clamp01(raw); e = e * e * e * (e * (e * 6 - 15) + 10);
                        var arcDir = a.V("arcDir", Vector3.up).normalized;
                        p.pos = Vector3.LerpUnclamped(p.pos, home, e) + arcDir * (a.F("arc") * 4 * e * (1 - e));
                        p.euler = Vector3.LerpUnclamped(p.euler, actor.baseEuler, e);
                        return true;
                    }
                case "ring_hoop":
                    {
                        // The outer ring as a hoop: "lift" peels it off along its normal and starts it turning, "lasso" swings it round a
                        // pivot (his hand, far away), "throw" sends it to a body and settles it round it at a tilt. "spin" (deg/s) keeps turning it after.
                        string stage = a.S("stage", "lift");
                        float spin = a.F("spin", 0);
                        var start = p.pos; var q0 = p.q * Quaternion.Euler(p.euler);
                        if (stage == "lift")
                        {
                            var up = q0 * Vector3.up;
                            p.pos = start + up * (a.F("lift", 20000) * k) + a.V("drift", Vector3.zero) * k;
                            p.euler += new Vector3(a.F("tilt") * k, 0, 0);
                        }
                        else if (stage == "lasso")
                        {
                            var pivot = a.Vec.ContainsKey("pivot") ? a.V("pivot") : SpaceBody(a.S("pivot"), start);
                            var axis = a.V("axis", Vector3.up).normalized;
                            float ang = 360 * a.F("turns", 1) * k;
                            var rq = Quaternion.AngleAxis(ang, axis);
                            p.pos = pivot + rq * (start - pivot);
                            p.q = rq * p.q;
                        }
                        else if (stage == "throw")
                        {
                            var to = SpaceTarget(a, start, actor);
                            var arcDir = a.V("arcDir", Vector3.up).normalized;
                            p.pos = Vector3.LerpUnclamped(start, to, k) + arcDir * (a.F("arc") * 4 * k * (1 - k));
                            if (a.Has("rot")) { var qt = Quaternion.Euler(a.V("rot")); p.q = Quaternion.SlerpUnclamped(p.q, qt * Quaternion.Inverse(Quaternion.Euler(p.euler)), k); }
                        }
                        // the hoop turning on itself: the ring is round, so its turn is its texture's (the clumps), from this cue on
                        var sp = actor.GetComponent<MVSpace>();
                        if (sp && spin != 0) { sp.Fold(_t, op.index); sp.FoldSpin(spin * (float)tl); }
                        return true;
                    }
                case "crater":
                    {
                        var s = actor.GetComponent<MVSpace>(); if (!s) return true;
                        s.Fold(_t, op.index); s.FoldCrater(Mathf.Clamp01(raw));
                        return true;
                    }
            }
            return false;
        }

        // A far point: "to" as [x,y,z] km from the root, or a body's set position (plus "offset").
        Vector3 SpaceTarget(Args a, Vector3 fallback, MVActor actor)
        {
            if (a.Vec.ContainsKey("to")) return SpaceRootPos(actor) + a.V("to");
            return SpaceBody(a.S("to"), fallback) + a.V("offset", Vector3.zero);
        }
        static Vector3 SpaceRootPos(MVActor actor)
        {
            foreach (var s in MVSpace.All) if (s && s.kind == "root") return s.transform.position;
            return Vector3.zero;
        }
        static Vector3 SpaceBody(string name, Vector3 fallback)
        {
            if (string.IsNullOrEmpty(name)) return fallback;
            foreach (var s in MVSpace.All)
                if (s && (s.name == name || s.name.EndsWith("_" + name)))
                {
                    var ma = s.GetComponent<MVActor>();
                    return ma && ma.transform.parent ? ma.transform.parent.TransformPoint(ma.basePos) : (ma ? ma.basePos : s.transform.position);
                }
            return fallback;
        }
    }
}
