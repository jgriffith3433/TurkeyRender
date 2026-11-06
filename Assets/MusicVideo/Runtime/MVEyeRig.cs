using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace TKShock.MV
{
    /// <summary>
    /// The macro eye: an actor with "eye": {...}. A set of its own, eyeball radius 1 at scale 1, facing +Z: eyeball, lids and skin as
    /// one sheet draped over it, lashes, the wet corner. A small camera at his real head sees what he sees, and that picture is what
    /// lies curved in the tear film. Face keys: blink wide squint pupil lookX lookY. All shapes come from those numbers alone.
    /// </summary>
    [ExecuteAlways]
    public partial class MVEyeRig : MonoBehaviour
    {
        public string cfg = "{}";
        public static readonly List<MVEyeRig> Rigs = new List<MVEyeRig>();

        const float Xi = 1.02f, Xo = -1.12f, Yi = -.10f, Yo = .06f, Top = 4.6f, Bot = -4.2f, Span = 6.5f;
        const int Cols = 200, RowsU = 30, RowsL = 24, Rows = RowsU + RowsL;

        Transform _ballT; Mesh _skinM, _lashM; Vector3[] _v; Material _ball, _skin, _hair, _wet; Camera _cam; RenderTexture _rt; Light _tvLight;
        float _blink, _wide, _squint, _lx, _ly, _pupil; string _from = "person.head", _to = "tv1.screen"; bool _seesWhat; float _fov = 72, _gain = 1, _lightPow = 3;
        Vector3 _skinCol = new Vector3(.70f, .47f, .38f);
        readonly List<Vector3> _lv = new List<Vector3>(); readonly List<Vector3> _ln = new List<Vector3>(); readonly List<int> _lt = new List<int>();
        string _shapeKey;

        public void Setup(string json)
        {
            cfg = json;
            var a = GetComponent<MVActor>();
            if (a && a.animRoot) { DestroyImmediate(a.animRoot); a.animRoot = null; }
            _ballT = null;
            Ensure();
        }

        void OnEnable() { if (!Rigs.Contains(this)) Rigs.Add(this); Ensure(); }
        void OnDisable()
        {
            Rigs.Remove(this);
            if (_cam) DestroyImmediate(_cam.gameObject);
            if (_rt) { _rt.Release(); DestroyImmediate(_rt); }
            _ballT = null;
        }

        static float Hash(int i) { uint x = (uint)(i * 2654435761u + 1013904223u); x ^= x >> 15; x *= 2246822519u; x ^= x >> 13; return (x & 0xFFFFFF) / (float)0xFFFFFF; }

        GameObject Child(string name, Mesh m, Material mat, UnityEngine.Rendering.ShadowCastingMode sh)
        {
            var old = transform.Find(name); if (old) DestroyImmediate(old.gameObject);
            var go = new GameObject(name) { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = m;
            var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat; r.shadowCastingMode = sh;
            return go;
        }

        static Mesh _ballMesh;
        static Mesh BallMesh()
        {
            if (_ballMesh) return _ballMesh;
            const int NA = 220, NB = 160;
            var v = new Vector3[(NA + 1) * (NB + 1)]; var n = new Vector3[v.Length]; var t = new int[NA * NB * 6];
            // Poles on Z. The cornea is a bulge of smaller radius over the front.
            float Rad(float th) { float q = Mathf.Clamp01(th / .86f); return 1 + .115f * Mathf.Pow(1 - q * q, 1.6f) ; }
            for (int j = 0; j <= NB; j++)
            {
                float th = Mathf.PI * Mathf.Pow(j / (float)NB, 1.5f);
                for (int i = 0; i <= NA; i++)
                {
                    float a = i * Mathf.PI * 2 / NA;
                    var d = new Vector3(Mathf.Sin(th) * Mathf.Cos(a), Mathf.Sin(th) * Mathf.Sin(a), Mathf.Cos(th));
                    v[j * (NA + 1) + i] = d * Rad(th);
                }
            }
            for (int j = 0; j <= NB; j++)
                for (int i = 0; i <= NA; i++)
                {
                    int a = j * (NA + 1) + i;
                    int up = Mathf.Max(j - 1, 0) * (NA + 1) + i, dn = Mathf.Min(j + 1, NB) * (NA + 1) + i, lf = j * (NA + 1) + (i + NA - 1) % NA, rg = j * (NA + 1) + (i + 1) % NA;
                    var nn = Vector3.Cross(v[dn] - v[up], v[rg] - v[lf]);
                    n[a] = nn.sqrMagnitude < 1e-10f ? Vector3.forward : nn.normalized;
                    if (Vector3.Dot(n[a], v[a]) < 0) n[a] = -n[a];
                }
            int k = 0;
            for (int j = 0; j < NB; j++)
                for (int i = 0; i < NA; i++)
                {
                    int a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
                    t[k++] = a; t[k++] = b; t[k++] = c; t[k++] = b; t[k++] = d; t[k++] = c;
                }
            var m = MVFeatherMeshes.New("eye_ball"); m.vertices = v; m.normals = n; m.triangles = t; m.bounds = new Bounds(Vector3.zero, Vector3.one * 3);
            return _ballMesh = m;
        }

        void Ensure()
        {
            if (_ballT) return;
            var ss = Shader.Find("MV/EyeSkin"); var se = Shader.Find("MV/Eye"); if (!ss || !se) return;
            var j = JObject.Parse(string.IsNullOrEmpty(cfg) ? "{}" : cfg);
            _from = (string)j["from"] ?? _from; _to = (string)j["to"] ?? _to; _fov = (float?)j["fov"] ?? 72; _gain = (float?)j["reflect"] ?? 1; _lightPow = (float?)j["tvLight"] ?? 3;
            _ball = new Material(se) { hideFlags = HideFlags.DontSave };
            if (j["iris"] != null && ColorUtility.TryParseHtmlString((string)j["iris"], out var iris)) _ball.SetColor("_Iris", iris);
            if (j["iris2"] != null && ColorUtility.TryParseHtmlString((string)j["iris2"], out var iris2)) _ball.SetColor("_Iris2", iris2);
            _skin = new Material(ss) { hideFlags = HideFlags.DontSave };
            if (j["skin"] != null && ColorUtility.TryParseHtmlString((string)j["skin"], out var sk)) _skin.SetColor("_Skin", sk);
            _hair = new Material(ss) { hideFlags = HideFlags.DontSave }; _hair.SetFloat("_Hair", 1);
            _wet = new Material(ss) { hideFlags = HideFlags.DontSave }; _wet.SetFloat("_Wet", 1); _wet.SetColor("_Margin", new Color(.62f, .28f, .26f));

            _ballT = Child("eye_ball", BallMesh(), _ball, UnityEngine.Rendering.ShadowCastingMode.Off).transform;

            _skinM = MVFeatherMeshes.New("eye_skin"); _skinM.MarkDynamic();
            int n = Cols * Rows; _v = new Vector3[n];
            var uv = new Vector2[n]; var uv2 = new Vector2[n];
            Layout(0, 0, 0, 0, _v, uv2);
            for (int i = 0; i < n; i++) uv[i] = new Vector2(_v[i].x, _v[i].y);
            _skinM.vertices = _v; _skinM.uv = uv; _skinM.uv2 = uv2; _skinM.triangles = Tris();
            _skinM.bounds = new Bounds(Vector3.zero, Vector3.one * 20);
            Child("eye_skin", _skinM, _skin, UnityEngine.Rendering.ShadowCastingMode.TwoSided);

            _lashM = MVFeatherMeshes.New("eye_lash"); _lashM.MarkDynamic(); _lashM.bounds = new Bounds(Vector3.zero, Vector3.one * 20);
            Child("eye_lash", _lashM, _hair, UnityEngine.Rendering.ShadowCastingMode.On);

            // The wet pink fold in the inner corner.
            var prim = GameObject.CreatePrimitive(PrimitiveType.Sphere); var cm = prim.GetComponent<MeshFilter>().sharedMesh; DestroyImmediate(prim);
            var co = Child("eye_corner", cm, _wet, UnityEngine.Rendering.ShadowCastingMode.Off);
            co.transform.localPosition = new Vector3(Xi - .13f, Yi + .03f, .52f); co.transform.localScale = new Vector3(.34f, .22f, .34f);

            var lg = new GameObject("eye_light") { hideFlags = HideFlags.DontSave }; lg.transform.SetParent(transform, false); lg.transform.localPosition = new Vector3(.4f, .5f, 6f);
            _tvLight = lg.AddComponent<Light>(); _tvLight.type = LightType.Point; _tvLight.range = 16; _tvLight.shadows = LightShadows.None;

            if (_cam) DestroyImmediate(_cam.gameObject);
            if (_rt) { _rt.Release(); DestroyImmediate(_rt); }
            var cg = new GameObject("eye_view") { hideFlags = HideFlags.DontSave };
            _cam = cg.AddComponent<Camera>(); var ud = cg.AddComponent<UniversalAdditionalCameraData>();
            ud.renderPostProcessing = false; ud.antialiasing = AntialiasingMode.None; ud.renderShadows = false; ud.requiresColorOption = CameraOverrideOption.Off; ud.requiresDepthOption = CameraOverrideOption.Off;
            _rt = new RenderTexture(512, 512, 24, RenderTextureFormat.ARGBHalf) { hideFlags = HideFlags.DontSave, wrapMode = TextureWrapMode.Clamp };
            _cam.targetTexture = _rt; _cam.fieldOfView = _fov; _cam.nearClipPlane = .28f; _cam.farClipPlane = 800; _cam.depth = -11; _cam.enabled = false;
            _cam.clearFlags = CameraClearFlags.SolidColor; _cam.backgroundColor = Color.black;
            _ball.SetTexture("_Refl", _rt); _ball.SetFloat("_ReflK", 1 / Mathf.Tan(_fov * .5f * Mathf.Deg2Rad));

            var a = GetComponent<MVActor>(); if (a) a.Rends = null;
            _shapeKey = null;
            Shape();
        }

        static float U(float x) => Mathf.Clamp01((x - Xo) / (Xi - Xo));
        static float Mid(float x) => Mathf.Lerp(Yo, Yi, U(x));
        static float Up(float u) => Mathf.Pow(Mathf.Clamp01(Mathf.Sin(Mathf.PI * Mathf.Pow(u, .9f))), .75f);
        static float Lo(float u) => Mathf.Pow(Mathf.Clamp01(Mathf.Sin(Mathf.PI * Mathf.Pow(u, 1.12f))), .9f);

        static float SMax(float a, float b, float k) { float h = Mathf.Clamp01(.5f + .5f * (a - b) / k); return Mathf.Lerp(b, a, h) + k * h * (1 - h); }
        static float SStep(float a, float b, float x) { float t = Mathf.Clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }

        static float BallZ(float x, float y)
        {
            float r2 = x * x + y * y;
            return Mathf.Sqrt(Mathf.Max(1.06f * 1.06f - r2, 0)) + .12f * Mathf.Exp(-r2 / .36f);
        }
        static float Face(float x, float y)
        {
            float z = .46f + .34f * SStep(1.0f, 2.6f, y) + .55f * SStep(1.5f, 3.6f, x) + .12f * SStep(-1.0f, -2.4f, y) - .22f * SStep(-1.7f, -4.5f, x);
            return z + .12f * SStep(-1.7f, -3.2f, y) * (1 - SStep(.5f, 3f, Mathf.Abs(x)));
        }
        static float Surf(float x, float y) => SMax(BallZ(x, y), Face(x, y), .3f);

        void Layout(float blink, float wide, float squint, float ly, Vector3[] v, Vector2[] wet)
        {
            float hU = Mathf.Lerp(.5f, .86f, wide) * (1 - squint * .32f) + ly * .16f, hL = .44f * (1 - squint * .4f) - ly * .1f;
            for (int c = 0; c < Cols; c++)
            {
                float s = c / (Cols - 1f) * 2 - 1, x = Span * (.3f * s + .7f * s * s * s), u = U(x), mid = Mid(x);
                float inside = SStep(0, .1f, u) * SStep(1, .92f, u);
                float up = Up(u), lo = Lo(u);
                float y0 = Mathf.Lerp(mid + hU * up, mid - hL * lo * .82f, blink);
                float y1 = mid - hL * lo * (1 - blink * .18f);
                float yc = Mathf.Max(mid + (1.02f * Mathf.Pow(up, .7f) + .16f) * (1 - squint * .25f), y0 + .14f);
                float yl = Mathf.Min(mid - (.86f * Mathf.Pow(lo, .7f) + .22f), y1 - .14f);
                int k = 0;
                // Upper: wet edge on the ball, the lid's thickness, the plate up to the crease, then the brow.
                void Put(int row, float px, float py, float pz, float w, float plate) { v[c * Rows + row] = new Vector3(px, py, pz); if (wet != null) wet[c * Rows + row] = new Vector2(w, plate); }
                float edge = .07f * inside;
                Put(RowsL + 0, x, y0, Mathf.Lerp(Surf(x, y0), BallZ(x, y0), inside) + .006f, inside, 1);
                Put(RowsL + 1, x, y0 + edge, Surf(x, y0 + edge) + .05f * inside, inside * .9f, 1);
                for (k = 2; k < RowsU; k++)
                {
                    float f = (k - 2) / (RowsU - 3f), y; bool lid = k < 16; float g;
                    if (lid) { g = (k - 2) / 14f; y = Mathf.Lerp(y0 + edge, yc, g); }
                    else { g = (k - 16) / (RowsU - 17f); y = Mathf.Lerp(yc, Top, g * g * .6f + g * .4f); }
                    float groove = .085f * inside * Mathf.Exp(-Mathf.Pow((y - yc) / .07f, 2)) * (1 - blink * .75f);
                    float roll = lid ? .03f * inside * Mathf.Sin(Mathf.Clamp01(g * 1.3f) * Mathf.PI) : 0;
                    Put(RowsL + k, x, y, Surf(x, y) + .02f * inside + roll - groove, 0, lid ? 1 : 0);
                }
                // Lower: the same downward.
                Put(RowsL - 1, x, y1, Mathf.Lerp(Surf(x, y1), BallZ(x, y1), inside) + .006f, inside, 1);
                Put(RowsL - 2, x, y1 - edge * .8f, Surf(x, y1 - edge * .8f) + .04f * inside, inside * .9f, 1);
                for (k = 2; k < RowsL; k++)
                {
                    float g = (k - 2) / (RowsL - 3f), y;
                    if (k < 11) y = Mathf.Lerp(y1 - edge * .8f, yl, (k - 2) / 9f);
                    else { float q = (k - 11) / (RowsL - 12f); y = Mathf.Lerp(yl, Bot, q * q * .6f + q * .4f); }
                    float groove = .04f * inside * Mathf.Exp(-Mathf.Pow((y - yl) / .09f, 2));
                    Put(RowsL - 1 - k, x, y, Surf(x, y) + .015f * inside - groove, 0, k < 11 ? .6f : 0);
                }
            }
        }

        int[] Tris()
        {
            var t = new List<int>((Cols - 1) * (Rows - 1) * 6);
            for (int c = 0; c < Cols - 1; c++)
                for (int r = 0; r < Rows - 1; r++)
                {
                    int a = c * Rows + r, b = a + 1, d = a + Rows, e = d + 1;
                    if (r == RowsL - 1)          // the opening, except past the corners where the lids meet
                    {
                        float s = c / (Cols - 1f) * 2 - 1, x = Span * (.3f * s + .7f * s * s * s);
                        if (x > Xo && x < Xi) continue;
                    }
                    t.Add(a); t.Add(d); t.Add(b); t.Add(b); t.Add(d); t.Add(e);
                }
            return t.ToArray();
        }

        void Hair(Vector3 root, Vector3 a, Vector3 b, float w)
        {
            // A tapered three-sided tube along a curve.
            const int Seg = 5; int b0 = _lv.Count;
            for (int i = 0; i <= Seg; i++)
            {
                float q = i / (float)Seg;
                var p = root * (1 - q) * (1 - q) + a * 2 * q * (1 - q) + b * q * q;
                var dir = (a - root) * (1 - q) + (b - a) * q; dir.Normalize();
                var e1 = Vector3.Cross(dir, Vector3.forward).normalized; var e2 = Vector3.Cross(dir, e1);
                float r = w * (1 - q * q * .98f);
                for (int s = 0; s < 3; s++)
                {
                    float an = s * 2.094f; var o = e1 * Mathf.Cos(an) + e2 * Mathf.Sin(an);
                    _lv.Add(p + o * r); _ln.Add(o);
                }
            }
            for (int i = 0; i < Seg; i++)
                for (int s = 0; s < 3; s++)
                {
                    int s2 = (s + 1) % 3, p = b0 + i * 3;
                    _lt.Add(p + s); _lt.Add(p + 3 + s); _lt.Add(p + s2); _lt.Add(p + s2); _lt.Add(p + 3 + s); _lt.Add(p + 3 + s2);
                }
        }

        void Shape()
        {
            string key = $"{_blink:0.###}/{_wide:0.###}/{_squint:0.###}/{_ly:0.###}";
            if (key == _shapeKey || !_skinM) return;
            _shapeKey = key;
            Layout(_blink, _wide, _squint, _ly, _v, null);
            _skinM.SetVertices(_v); _skinM.RecalculateNormals();

            float hU = Mathf.Lerp(.5f, .86f, _wide) * (1 - _squint * .32f) + _ly * .16f, hL = .44f * (1 - _squint * .4f) - _ly * .1f;
            _ball.SetFloat("_LidU", hU); _ball.SetFloat("_LidL", hL); _ball.SetFloat("_LidClose", _blink);

            _lv.Clear(); _ln.Clear(); _lt.Clear();
            for (int i = 0; i < 170; i++)
            {
                float u = Mathf.Lerp(.05f, .985f, Hash(i)), x = Mathf.Lerp(Xo, Xi, u), mid = Mid(x);
                float y0 = Mathf.Lerp(mid + hU * Up(u), mid - hL * Lo(u) * .82f, _blink) + .035f;
                var root = new Vector3(x, y0, Surf(x, y0) + .02f);
                float L = (.5f + .42f * Hash(i + 900)) * Mathf.Pow(Mathf.Sin(Mathf.PI * Mathf.Clamp(u, .03f, .97f)), .35f), fan = (u - .55f) * 1.3f + (Hash(i + 300) - .5f) * .35f;
                float down = _blink;
                var a = root + new Vector3(fan * .22f, (.1f - down * .34f) * L, .62f * L);
                var b = root + new Vector3(fan * .6f, (.82f - down * 1.25f) * L, .86f * L);
                Hair(root, a, b, .012f + .007f * Hash(i + 77));
            }
            for (int i = 0; i < 110; i++)
            {
                float u = Mathf.Lerp(.1f, .96f, Hash(i + 5000)), x = Mathf.Lerp(Xo, Xi, u), mid = Mid(x);
                float y1 = mid - hL * Lo(u) * (1 - _blink * .18f) - .03f;
                var root = new Vector3(x, y1, Surf(x, y1) + .015f);
                float L = (.24f + .2f * Hash(i + 5900)) * Mathf.Pow(Mathf.Sin(Mathf.PI * u), .4f), fan = (u - .55f) * 1.2f + (Hash(i + 5300) - .5f) * .4f;
                var a = root + new Vector3(fan * .2f, -.1f * L, .6f * L);
                var b = root + new Vector3(fan * .5f, -.62f * L, .78f * L);
                Hair(root, a, b, .008f + .005f * Hash(i + 5077));
            }
            // A few brow hairs, for when the frame opens up.
            for (int i = 0; i < 520; i++)
            {
                float u = Hash(i + 8000), x = Mathf.Lerp(3.2f, -3.3f, u), y = 2.9f + .5f * Mathf.Sin(u * 2.8f) - .28f * u + (Hash(i + 8100) - .5f) * .5f * Mathf.Sin(Mathf.PI * Mathf.Clamp(u * .9f + .1f, 0, 1));
                var root = new Vector3(x, y, Surf(x, y) + .01f);
                float L = .32f + .24f * Hash(i + 8200), lean = Mathf.Lerp(.35f, -1.1f, u) + (Hash(i + 8300) - .5f) * .6f;
                var a = root + new Vector3(lean * .5f, .7f, .2f) * L * .5f;
                var b = root + new Vector3(lean, .6f, .1f) * L;
                Hair(root, a, b, .014f);
            }
            _lashM.Clear(); _lashM.SetVertices(_lv); _lashM.SetNormals(_ln); _lashM.SetTriangles(_lt, 0, false);
            _lashM.bounds = new Bounds(Vector3.zero, Vector3.one * 20);
        }

        /// <summary>Called by the motion track each frame with the face values at this moment.</summary>
        public void Drive(Dictionary<string, float> face, Args see, double t)
        {
            Ensure(); if (!_ballT) return;
            float V(string k, float d = 0) => face.TryGetValue(k, out var x) ? x : d;
            _blink = Mathf.Clamp01(V("blink")); _wide = Mathf.Clamp01(V("wide")); _squint = Mathf.Clamp01(V("squint"));
            _lx = V("lookX"); _ly = V("lookY");
            float tt = (float)t;
            float dart = (Mathf.PerlinNoise(tt * 1.3f, 3.7f) - .5f) * .05f, dart2 = (Mathf.PerlinNoise(8.1f, tt * 1.1f) - .5f) * .05f;  // an eye is never still
            _ballT.localRotation = Quaternion.Euler(-(_ly + dart2) * 22, (_lx + dart) * 26, 0);
            _ball.SetFloat("_Pupil", face.ContainsKey("pupil") ? V("pupil") : .3f);
            _ball.SetFloat("_ReflGain", _gain * (face.ContainsKey("reflect") ? V("reflect") : 1));
            _ball.SetMatrix("_RigW2L", transform.worldToLocalMatrix);
            if (see != null) { _from = see.S("from", _from); _to = see.S("to", _to); }
            Shape();
            _tvLight.color = new Color(MVClock.TvColor.r, MVClock.TvColor.g, MVClock.TvColor.b);
            _tvLight.intensity = MVClock.TvLevel * _lightPow * (1 + V("tvLight"));
            _tvLight.range = 16 * transform.lossyScale.x;

            if (MVFeatherFx.Where(_from, t, out var from, out var fwd, out _))
            {
                var to = from + fwd * 3;
                if (see != null && see.Vec.TryGetValue("to", out var tv)) to = tv;
                else if (MVFeatherFx.Where(_to, t, out var tw, out _, out _)) to = tw;
                _cam.transform.position = from; _cam.transform.rotation = Quaternion.LookRotation(to - from + Vector3.forward * 1e-4f, Vector3.up);
            }
            var main = Camera.main;
            var rend = transform.Find("eye_ball")?.GetComponent<Renderer>();
            bool close = main && rend && rend.enabled && Vector3.Distance(main.transform.position, transform.position) < 40 * transform.lossyScale.x;
            _cam.enabled = close;
        }

        /// <summary>Capture only renders the cameras it is told to: it calls this first.</summary>
        public static void RenderAll()
        {
            foreach (var r in Rigs) if (r._cam && r._cam.enabled) r._cam.Render();
        }
    }
}
