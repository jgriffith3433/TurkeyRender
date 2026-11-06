using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// The TV's glass as skin. A fine copy of the screen, draped over whatever pushes against it, worked out from the pushers'
    /// positions each frame, so it scrubs. The TV track keeps driving the picture: its block is copied across at render time.
    /// </summary>
    public class MVGlass
    {
        const int W = 140, H = 90;
        MVTv _tv; MeshRenderer _r; Mesh _m; Material _mat; Vector3[] _v; Vector3[] _n; Vector2[] _uv2; MaterialPropertyBlock _b;
        static readonly List<MVGlass> Live = new List<MVGlass>();
        static bool _hooked;

        public bool Alive => _r != null && _tv != null;

        public static MVGlass For(MVActor actor)
        {
            var tv = actor.GetComponent<MVTv>(); if (!tv || !tv.screen) return null;
            var g = new MVGlass { _tv = tv, _b = new MaterialPropertyBlock() };
            var old = tv.screen.transform.Find("glass"); if (old) Object.DestroyImmediate(old.gameObject);
            var go = new GameObject("glass") { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(tv.screen.transform, false); go.layer = tv.screen.gameObject.layer;
            g._m = MVFeatherMeshes.New("glass"); g._m.MarkDynamic();
            int n = (W + 1) * (H + 1);
            g._v = new Vector3[n]; g._n = new Vector3[n]; g._uv2 = new Vector2[n]; var uv = new Vector2[n]; var t = new int[W * H * 6];
            for (int y = 0; y <= H; y++)
                for (int x = 0; x <= W; x++)
                {
                    int i = y * (W + 1) + x;
                    uv[i] = new Vector2(x / (float)W, y / (float)H); g._v[i] = new Vector3(uv[i].x - .5f, uv[i].y - .5f, 0); g._n[i] = Vector3.back;
                }
            int k = 0;
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    int a = y * (W + 1) + x, b = a + 1, c = a + W + 1, d = c + 1;
                    t[k++] = a; t[k++] = c; t[k++] = b; t[k++] = b; t[k++] = c; t[k++] = d;   // faces -z, like the quad
                }
            g._m.vertices = g._v; g._m.uv = uv; g._m.normals = g._n; g._m.SetUVs(1, g._uv2); g._m.triangles = t;
            g._m.bounds = new Bounds(Vector3.zero, Vector3.one * 6);
            go.AddComponent<MeshFilter>().sharedMesh = g._m;
            g._r = go.AddComponent<MeshRenderer>();
            g._mat = new Material(Shader.Find("MV/Glass")) { hideFlags = HideFlags.DontSave };
            var src = tv.screen.sharedMaterial; if (src) g._mat.SetTexture("_Feed", src.GetTexture("_Feed"));
            g._r.sharedMaterial = g._mat; g._r.shadowCastingMode = ShadowCastingMode.Off;
            actor.Rends = null;
            Live.Add(g);
            if (!_hooked) { _hooked = true; RenderPipelineManager.beginCameraRendering += Copy; }
            return g;
        }

        static void Copy(ScriptableRenderContext c, Camera cam)
        {
            for (int i = Live.Count - 1; i >= 0; i--)
            {
                var g = Live[i];
                if (!g.Alive) { Live.RemoveAt(i); continue; }
                if (g._r.forceRenderingOff) continue;
                g._tv.screen.GetPropertyBlock(g._b); g._r.SetPropertyBlock(g._b);
            }
        }

        public struct Push { public Vector3 p; public float r; }

        /// <param name="amount">0 the glass ignores everything, 1 it takes the shape of the pushers.</param>
        /// <param name="open">0 whole, 1 torn open around the first pusher. The tear stays open while it holds.</param>
        public void Apply(float amount, float open, float openAge, List<Push> pushes, float openRadius, float tear)
        {
            bool on = amount > 0 || open > 0;
            _r.forceRenderingOff = !on;
            _tv.screen.forceRenderingOff = on;
            if (!on) return;
            var tr = _tv.screen.transform; var sc = tr.lossyScale;
            float sx = Mathf.Abs(sc.x), sy = Mathf.Abs(sc.y), sz = Mathf.Max(Mathf.Abs(sc.z), .0001f);
            int np = pushes.Count;
            var cx = new float[np]; var cy = new float[np]; var cz = new float[np]; var rr = new float[np];
            for (int i = 0; i < np; i++)
            {
                var l = tr.InverseTransformPoint(pushes[i].p);
                cx[i] = l.x * sx; cy[i] = l.y * sy; cz[i] = -l.z * sz; rr[i] = pushes[i].r;   // cz: metres out of the screen, into the room
            }
            float hx = sx * .5f, hy = sy * .5f;
            float holeR = open * openRadius;
            float rip = Mathf.Exp(-openAge * 3.5f) * Mathf.Clamp01(open * 4);
            for (int y = 0; y <= H; y++)
                for (int x = 0; x <= W; x++)
                {
                    int i = y * (W + 1) + x;
                    float X = (x / (float)W - .5f) * sx, Y = (y / (float)H - .5f) * sy, h = 0;
                    for (int p = 0; p < np; p++)
                    {
                        float dx = X - cx[p], dy = Y - cy[p], d = Mathf.Sqrt(dx * dx + dy * dy), r = rr[p], top = cz[p] + r;
                        if (top <= 0) continue;
                        // A stretched sheet: tight over the ball, then a tent falling away to the frame.
                        float tent = top * Mathf.Exp(-Mathf.Max(d - r * .55f, 0) / (r * .55f + top * .4f));
                        float cap = d < r ? cz[p] + Mathf.Sqrt(r * r - d * d) : 0;
                        h = Mathf.Max(h, Mathf.Max(tent, cap));
                    }
                    h *= amount;
                    float hole = 1;
                    if (np > 0 && open > 0)
                    {
                        float dx = X - cx[0], dy = Y - cy[0], d = Mathf.Sqrt(dx * dx + dy * dy);
                        // Torn, it springs back toward flat, ringing, and the edge curls away from the hole.
                        float jag = 1 + .25f * Mathf.Sin(Mathf.Atan2(dy, dx) * 7 + 1.3f) * tear + .12f * Mathf.Sin(Mathf.Atan2(dy, dx) * 17) * tear;
                        hole = d / Mathf.Max(holeR * jag, .001f) - 1;
                        float back = Mathf.Clamp01(open * 1.5f);
                        h = h * (1 - back) + back * (.09f * Mathf.Exp(-Mathf.Max(hole, 0) * 1.4f) + rip * .06f * Mathf.Sin(d * 26 - openAge * 24) * Mathf.Exp(-d * 2.5f));
                    }
                    float edge = Mathf.Clamp01((hx - Mathf.Abs(X)) / .05f) * Mathf.Clamp01((hy - Mathf.Abs(Y)) / .05f);
                    h *= edge * (2 - edge);
                    _v[i].z = -h / sz;
                    _uv2[i] = new Vector2(hole, h);
                }
            _m.SetVertices(_v); _m.SetUVs(1, _uv2);
            _m.RecalculateNormals();
        }
    }
}
