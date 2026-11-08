using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// A plank fence. An actor with "fence": {"to":[x,z],"height":1.8}. It runs from the actor along its own local line to "to", planks on
    /// the side the actor's +z faces, rails and posts behind. One mesh, made from the numbers, never saved in the scene.
    /// </summary>
    [ExecuteAlways]
    public class MVFence : MonoBehaviour
    {
        public string cfg = "{}";
        public Material mat;
        GameObject _part;

        public void Setup(string json, Material m)
        {
            cfg = json; mat = m;
            var a = GetComponent<MVActor>();
            if (a && a.animRoot) { DestroyImmediate(a.animRoot); a.animRoot = null; }
            MVGen.DestroyParts(transform); _part = null;
            Ensure();
        }

        void OnEnable() => Ensure();
        void OnDestroy() => MVGen.DestroyParts(transform);

        readonly List<Vector3> _v = new List<Vector3>(); readonly List<Vector2> _uv = new List<Vector2>(); readonly List<int> _t = new List<int>();

        void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 ua, Vector2 ub, Vector2 uc, Vector2 ud)
        {
            int n = _v.Count;
            _v.Add(a); _v.Add(b); _v.Add(c); _v.Add(d); _uv.Add(ua); _uv.Add(ub); _uv.Add(uc); _uv.Add(ud);
            _t.AddRange(new[] { n, n + 1, n + 2, n, n + 2, n + 3 });
        }

        void Box(Vector3 min, Vector3 max, Vector2 uv0, float texW, float texH)
        {
            var p = new Vector3[8];
            for (int i = 0; i < 8; i++) p[i] = new Vector3((i & 1) == 0 ? min.x : max.x, (i & 2) == 0 ? min.y : max.y, (i & 4) == 0 ? min.z : max.z);
            void F(int a, int b, int c, int d) => Quad(p[a], p[b], p[c], p[d], uv0, uv0 + new Vector2(texW, 0), uv0 + new Vector2(texW, texH), uv0 + new Vector2(0, texH));
            F(0, 2, 3, 1); F(5, 7, 6, 4); F(4, 6, 2, 0); F(1, 3, 7, 5); F(2, 6, 7, 3); F(4, 0, 1, 5);
        }

        void Ensure()
        {
            if (_part || !mat) return;
            var j = JObject.Parse(string.IsNullOrEmpty(cfg) ? "{}" : cfg);
            float len = (float?)j["length"] ?? 8, height = (float?)j["height"] ?? 1.75f, w = (float?)j["plank"] ?? .14f, gap = (float?)j["gap"] ?? .012f, thick = .019f;
            var r = new System.Random((int?)j["seed"] ?? 3);
            _v.Clear(); _uv.Clear(); _t.Clear();
            int n = Mathf.FloorToInt(len / (w + gap));
            for (int i = 0; i < n; i++)
            {
                float x0 = i * (w + gap), x1 = x0 + w * (.96f + .04f * (float)r.NextDouble());
                float top = height + ((float)r.NextDouble() - .5f) * .014f, ear = .028f, z0 = .02f, z1 = z0 + thick;
                float u = (float)r.NextDouble() * 6, v = (float)r.NextDouble() * 6, ut = w * .8f, vt = height * .8f;
                float tilt = ((float)r.NextDouble() - .5f) * .012f;   // nobody builds a fence dead straight
                Vector3 P(float x, float y, float z) => new Vector3(x + tilt * y, y, z);
                // Dog-eared top: seven points around each face.
                var outline = new[] { (x0, 0f), (x1, 0f), (x1, top - ear), (x1 - ear, top), (x0 + ear, top), (x0, top - ear) };
                foreach (var (z, flip) in new[] { (z1, false), (z0, true) })
                {
                    int b = _v.Count;
                    foreach (var (x, y) in outline) { _v.Add(P(x, y, z)); _uv.Add(new Vector2(u + (x - x0) / w * ut, v + y / height * vt)); }
                    for (int k = 1; k < outline.Length - 1; k++)
                        if (flip) _t.AddRange(new[] { b, b + k, b + k + 1 }); else _t.AddRange(new[] { b, b + k + 1, b + k });
                }
                for (int k = 0; k < outline.Length; k++)
                {
                    var (xa, ya) = outline[k]; var (xb, yb) = outline[(k + 1) % outline.Length];
                    Quad(P(xa, ya, z0), P(xa, ya, z1), P(xb, yb, z1), P(xb, yb, z0), new Vector2(u, v), new Vector2(u + .02f, v), new Vector2(u + .02f, v + .1f), new Vector2(u, v + .1f));
                }
            }
            float end = n * (w + gap);
            foreach (var y in new[] { .32f, height - .38f }) Box(new Vector3(0, y, -.02f), new Vector3(end, y + .09f, .02f), new Vector2(.3f, .1f), 3, .1f);
            float postEvery = (float?)j["posts"] ?? 2.4f;
            for (float x = 0; x <= end + .01f; x += postEvery)
                Box(new Vector3(x - .045f, 0, -.11f), new Vector3(x + .045f, height - .04f, -.02f), new Vector2(x, .4f), .1f, 1.4f);

            MVGen.DestroyParts(transform);
            var m = new Mesh { name = MVGen.Name("fence"), indexFormat = UnityEngine.Rendering.IndexFormat.UInt32, hideFlags = HideFlags.DontSave };
            m.SetVertices(_v); m.SetUVs(0, _uv); m.SetTriangles(_t, 0); m.RecalculateNormals(); m.RecalculateTangents(); m.RecalculateBounds();
            _part = new GameObject("fence") { hideFlags = HideFlags.DontSave, layer = gameObject.layer };
            _part.transform.SetParent(transform, false);
            _part.AddComponent<MeshFilter>().sharedMesh = m;
            _part.AddComponent<MeshRenderer>().sharedMaterial = mat;
            var ac = GetComponent<MVActor>(); if (ac) ac.Rends = null;
        }
    }
}
