using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>Procedural meshes and the feather texture. Everything is seeded, built once and kept, and never saved with the scene.</summary>
    public static class MVFeatherMeshes
    {
        static Texture2D _tex;

        /// <summary>One feather, root at the bottom: r shade across the barbs, a coverage.</summary>
        public static Texture2D Tex()
        {
            if (_tex) return _tex;
            const int W = 128, H = 256;
            var t = new Texture2D(W, H, TextureFormat.RGBA32, true, true) { hideFlags = HideFlags.HideAndDontSave, wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Trilinear, anisoLevel = 4 };
            var px = new Color32[W * H];
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float u = (x + .5f) / W * 2 - 1, v = (y + .5f) / H, au = Mathf.Abs(u);
                    // The vane is wider on one side, tapers to a rounded tip, and has a bare quill below it.
                    float side = u > 0 ? 1 : .78f;
                    float vane = v < .13f ? 0 : Mathf.Pow(Mathf.Sin(Mathf.Clamp01((v - .13f) / .87f) * Mathf.PI * .96f + .05f), .55f) * side * .92f;
                    float barb = v - au * .42f;                                    // barbs run out and up from the shaft
                    float s = Mathf.PerlinNoise(barb * 9, u > 0 ? 1.3f : 7.7f);
                    float split = Mathf.Sin(barb * 19 + (u > 0 ? 1.1f : 2.3f) + s * 5);
                    bool gap = split > .93f && au > .25f;                          // a few splits in the vane
                    float edge = vane * (.93f + .1f * Mathf.PerlinNoise(barb * 60, u > 0 ? 3 : 11));
                    float a = au < edge && !gap ? 1 : 0;
                    float shaft = 1 - Mathf.Clamp01((au - .012f - .03f * (1 - v)) / .02f);
                    if (shaft > .5f && v < .97f) a = 1;
                    float lines = .84f + .16f * Mathf.Sin(barb * 210);
                    float shade = Mathf.Lerp(.72f, 1, Mathf.Clamp01(au / Mathf.Max(edge, .01f) * .7f + .3f)) * lines * (.9f + .2f * s);
                    if (v < .32f) shade = Mathf.Lerp(shade, 1.05f, (.32f - v) / .19f * .7f);      // downy near the root
                    if (shaft > .5f) shade = .62f;
                    px[y * W + x] = new Color32((byte)(Mathf.Clamp01(shade) * 255), (byte)(shaft * 255), 0, (byte)(a * 255));
                }
            t.SetPixels32(px); t.Apply(true, false);
            return _tex = t;
        }

        public static Mesh New(string name)
        {
            return new Mesh { name = name, hideFlags = HideFlags.HideAndDontSave, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        }

        static readonly Dictionary<string, Mesh> Cache = new Dictionary<string, Mesh>();

        /// <summary>The hill's skin: a polar grid, tight at the summit where he lands. The shape itself is all in the vertex shader.</summary>
        public static Mesh Skin(float R)
        {
            string key = "skin" + R;
            if (Cache.TryGetValue(key, out var m) && m) return m;
            const int NR = 260, NS = 420;
            var v = new Vector3[NR * NS]; var idx = new int[(NR - 1) * NS * 6];
            for (int i = 0; i < NR; i++)
            {
                float r = R * 1.02f * Mathf.Pow(i / (NR - 1f), 1.8f);
                for (int j = 0; j < NS; j++) { float a = j * Mathf.PI * 2 / NS; v[i * NS + j] = new Vector3(Mathf.Cos(a) * r, 0, Mathf.Sin(a) * r); }
            }
            int k = 0;
            for (int i = 0; i < NR - 1; i++)
                for (int j = 0; j < NS; j++)
                {
                    int a = i * NS + j, b = i * NS + (j + 1) % NS, c = a + NS, d = b + NS;
                    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
                }
            m = New("mound_skin"); m.vertices = v; m.triangles = idx;
            m.bounds = new Bounds(Vector3.zero, Vector3.one * R * 8);
            return Cache[key] = m;
        }

        /// <summary>Cards over the hill, thick where he is and bigger out to the rim. The first part alone draws in preview.</summary>
        public static Mesh Cards(float R, int n, int seed, float previewShare)
        {
            string key = $"cards{R}_{n}_{seed}";
            if (Cache.TryGetValue(key, out var m) && m) return m;
            var rng = new System.Random(seed);
            float F() => (float)rng.NextDouble();
            var pos = new Vector3[n * 4]; var uv = new Vector2[n * 4]; var d = new Vector4[n * 4];
            const float P = .72f, NearR = 6;
            for (int i = 0; i < n; i++)
            {
                float u = F(), r = R * Mathf.Pow(u, P) + .02f, a = F() * Mathf.PI * 2;
                bool near = i % 4 == 0;                                                              // a quarter of the cards are small ones around the summit, where he is
                if (near) { r = NearR * Mathf.Sqrt(u) + .02f; }
                float density = n / (2 * Mathf.PI * r) * (1 / (P * R)) * Mathf.Pow(u, 1 - P);       // cards per square metre here
                float size = Mathf.Clamp(Mathf.Sqrt(3.2f / (density * .3f)), .12f, 2.2f) * (.75f + .5f * F());
                size = near ? .17f * (.7f + .6f * F()) : size * Mathf.Lerp(.45f, 1, Mathf.SmoothStep(0, 1, Mathf.InverseLerp(2, 9, r)));
                var c = new Vector3(Mathf.Cos(a) * r, 0, Mathf.Sin(a) * r);
                var s = new Vector4(F(), size, F() * Mathf.PI * 2, .08f + F() * F() * .55f);
                for (int q = 0; q < 4; q++)
                {
                    int w = i * 4 + q;
                    pos[w] = c; d[w] = s;
                    uv[w] = new Vector2(q == 0 || q == 2 ? -1 : 1, q < 2 ? 0 : 1);
                }
            }
            int a0 = Mathf.Clamp((int)(n * previewShare), 1, n);
            m = New("mound_cards");
            m.SetVertices(pos); m.SetUVs(0, uv); m.SetUVs(1, d);
            m.subMeshCount = 2;
            m.SetTriangles(Quads(0, a0), 0, false);
            m.SetTriangles(Quads(a0, n), 1, false);
            m.bounds = new Bounds(Vector3.zero, Vector3.one * R * 8);
            return Cache[key] = m;
        }

        static int[] Quads(int from, int to)
        {
            var t = new int[(to - from) * 6]; int k = 0;
            for (int i = from; i < to; i++)
            {
                int b = i * 4;
                t[k++] = b; t[k++] = b + 2; t[k++] = b + 1; t[k++] = b + 1; t[k++] = b + 2; t[k++] = b + 3;
            }
            return t;
        }

        /// <summary>Loose cards for the crown and streams: all data, positions come from the shader.</summary>
        public static Mesh Loose(int n, int seed)
        {
            string key = $"loose{n}_{seed}";
            if (Cache.TryGetValue(key, out var m) && m) return m;
            var rng = new System.Random(seed);
            float F() => (float)rng.NextDouble();
            var pos = new Vector3[n * 4]; var uv = new Vector2[n * 4]; var d = new Vector4[n * 4];
            for (int i = 0; i < n; i++)
            {
                var s = new Vector4(F(), F(), F(), F());
                for (int q = 0; q < 4; q++)
                {
                    int w = i * 4 + q;
                    d[w] = s; uv[w] = new Vector2(q == 0 || q == 2 ? -1 : 1, q < 2 ? 0 : 1);
                }
            }
            m = New("loose_feathers");
            m.SetVertices(pos); m.SetUVs(0, uv); m.SetUVs(1, d);
            m.SetTriangles(Quads(0, n), 0, false);
            m.bounds = new Bounds(Vector3.zero, Vector3.one * 100000);
            return Cache[key] = m;
        }
    }
}
