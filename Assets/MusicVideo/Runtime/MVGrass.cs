using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// A lawn. An actor with "grass": {...}. Real blades, thick where the camera goes close (hero circles) and thin out to the
    /// fence. The meshes are made from the numbers, never saved in the scene, so the same seed is always the same lawn. The wind
    /// lives in the vertex shader on scene time. "push" names bones or actors that part the blades, read fresh for every camera.
    /// </summary>
    [ExecuteAlways]
    public class MVGrass : MonoBehaviour
    {
        public string cfg = "{}";
        Material _mat; readonly List<GameObject> _parts = new List<GameObject>();
        (string who, float r)[] _push = new (string, float)[0];
        static readonly int PushId = Shader.PropertyToID("_MV_GrassPush"), PushN = Shader.PropertyToID("_MV_GrassPushN");
        readonly Vector4[] _pv = new Vector4[8];
        public int Tris { get; private set; }
        /// <summary>Things that push by name lookup need a timeline; a lab hands over its own bones here.</summary>
        public Transform[] PushBones; public float[] PushRadii;

        public void Setup(string json)
        {
            cfg = json;
            var a = GetComponent<MVActor>();
            if (a && a.animRoot) { DestroyImmediate(a.animRoot); a.animRoot = null; }
            Clear(); Ensure();
        }

        void OnEnable() { Ensure(); RenderPipelineManager.beginContextRendering += Before; }
        void OnDisable() { RenderPipelineManager.beginContextRendering -= Before; Shader.SetGlobalFloat(PushN, 0); }
        void OnDestroy() => Clear();

        void Clear()
        {
            MVGen.DestroyParts(transform);   // by what is there, not by _parts: a script reload empties the list and leaves the meshes
            _parts.Clear();
            if (_mat) DestroyImmediate(_mat);
        }

        // Runs after the timeline has moved every bone, for every frame in any order.
        void Before(ScriptableRenderContext ctx, List<Camera> cams)
        {
            int n = 0;
            foreach (var (who, r) in _push)
            {
                if (n >= 8) break;
                var tr = MVActor.Point(who, MVClock.T, false);
                if (tr) _pv[n++] = new Vector4(tr.position.x, tr.position.y, tr.position.z, r);
            }
            if (PushBones != null) for (int i = 0; i < PushBones.Length && n < 8; i++) if (PushBones[i]) { var p = PushBones[i].position; _pv[n++] = new Vector4(p.x, p.y, p.z, PushRadii[i]); }
            Shader.SetGlobalVectorArray(PushId, _pv); Shader.SetGlobalFloat(PushN, n);
        }

        static Color Hex(JToken t, Color d) => t != null && ColorUtility.TryParseHtmlString((string)t, out var c) ? c : d;

        class Chunk { public List<Vector3> root = new List<Vector3>(); public List<Vector4> shape = new List<Vector4>(), uv = new List<Vector4>(); public List<int> tri = new List<int>(); }

        static void Blade(Chunk c, Vector3 p, System.Random r, float h, float w, int rows, bool fold)
        {
            double a = r.NextDouble() * System.Math.PI * 2;
            var s = new Vector4((float)System.Math.Cos(a), (float)System.Math.Sin(a), h, w);
            float r1 = (float)r.NextDouble(), r2 = (float)r.NextDouble();
            int b = c.root.Count, across = fold ? 3 : 2;
            for (int i = 0; i < rows; i++)
            {
                float v = i / (rows - 1f);
                for (int k = 0; k < across; k++)
                {
                    c.root.Add(p); c.shape.Add(s);
                    c.uv.Add(new Vector4(k * 2f / (across - 1) - 1, v, r1, r2));
                }
                if (i == rows - 1) break;
                for (int k = 0; k < across - 1; k++)
                {
                    int q = b + i * across + k;
                    c.tri.Add(q); c.tri.Add(q + across); c.tri.Add(q + 1);
                    c.tri.Add(q + 1); c.tri.Add(q + across); c.tri.Add(q + across + 1);
                }
            }
        }

        static float Noise(float x, float z) => Mathf.PerlinNoise(x + 37.3f, z + 11.1f);

        void Ensure()
        {
            if (_parts.Count > 0) return;
            MVGen.DestroyParts(transform);
            var sh = Shader.Find("MV/Grass"); if (!sh) return;
            var j = JObject.Parse(string.IsNullOrEmpty(cfg) ? "{}" : cfg);
            var size = j["size"] as JArray;
            float sx = size != null ? (float)size[0] : 12, sz = size != null ? (float)size[1] : 10;
            float height = (float?)j["height"] ?? .085f, width = (float?)j["width"] ?? .0042f, q = (float?)j["quality"] ?? 1;
            int seed = (int?)j["seed"] ?? 7;
            var hero = new List<Vector3>();
            if (j["hero"] is JArray ha) foreach (var o in ha) hero.Add(new Vector3((float)o[0], (float)o[1], (float)o[2]));
            var holes = new List<Vector4>();
            if (j["exclude"] is JArray ea) foreach (var o in ea) holes.Add(new Vector4((float)o[0], (float)o[1], (float)o[2], (float)o[3]));
            var push = new List<(string, float)>();
            foreach (var s in ((string)j["push"] ?? "").Split(','))
            {
                if (s.Length == 0) continue;
                var p = s.Split(':');
                push.Add((p[0], p.Length > 1 ? float.Parse(p[1], System.Globalization.CultureInfo.InvariantCulture) : .1f));
            }
            _push = push.ToArray();

            _mat = new Material(sh) { name = MVGen.Name("grass"), hideFlags = HideFlags.DontSave };
            _mat.SetFloat("_Wind", (float?)j["wind"] ?? .45f); _mat.SetFloat("_WindAngle", ((float?)j["windAngle"] ?? 35) * Mathf.Deg2Rad);
            _mat.SetFloat("_WindScale", (float?)j["windScale"] ?? .9f); _mat.SetFloat("_Lean", (float?)j["lean"] ?? .8f);
            foreach (var kv in new[] { ("dark", "_Dark"), ("mid", "_Mid"), ("tip", "_Tip"), ("dry", "_Dry"), ("soil", "_Soil"), ("flowerA", "_FlowerA"), ("flowerB", "_FlowerB") })
                if (j[kv.Item1] != null) _mat.SetColor(kv.Item2, Hex(j[kv.Item1], Color.green));

            const float cell = 3;
            var chunks = new Dictionary<long, Chunk>();
            Chunk At(float x, float z)
            {
                long k = ((long)Mathf.FloorToInt(x / cell) << 32) ^ (uint)Mathf.FloorToInt(z / cell);
                if (!chunks.TryGetValue(k, out var c)) chunks[k] = c = new Chunk();
                return c;
            }
            bool Hole(float x, float z) { foreach (var h in holes) if (x > h.x && x < h.z && z > h.y && z < h.w) return true; return false; }
            float Band(float x, float z) // metres from the nearest hero circle, 0 inside it
            {
                float best = 1e6f;
                foreach (var h in hero) best = Mathf.Min(best, Mathf.Max(0, Mathf.Sqrt((x - h.x) * (x - h.x) + (z - h.y) * (z - h.y)) - h.z));
                return hero.Count == 0 ? 3 : best;
            }
            float HeightAt(float x, float z) => height * (.72f + .55f * Noise(x * .8f, z * .8f) + .25f * Noise(x * 4.1f, z * 4.1f));

            void Sow(int tierSeed, float density, float x0, float z0, float x1, float z1, System.Func<float, float> keep, float hMul, float wMul, int rows, bool fold)
            {
                var r = new System.Random(seed * 31 + tierSeed);
                float step = 1 / Mathf.Sqrt(density * q);
                for (float z = z0; z < z1; z += step)
                    for (float x = x0; x < x1; x += step)
                    {
                        float px = x + ((float)r.NextDouble() - .5f) * step * 1.7f, pz = z + ((float)r.NextDouble() - .5f) * step * 1.7f;
                        double roll = r.NextDouble();
                        float hr = (float)r.NextDouble(), wr = (float)r.NextDouble();
                        if (px < -sx / 2 || px > sx / 2 || pz < -sz / 2 || pz > sz / 2 || Hole(px, pz)) continue;
                        if (roll > keep(Band(px, pz))) continue;
                        Blade(At(px, pz), new Vector3(px, 0, pz), r, HeightAt(px, pz) * hMul * (.72f + .56f * hr), width * wMul * (.75f + .5f * wr), rows, fold);
                    }
            }

            float heroD = (float?)j["heroDensity"] ?? 14000, midD = (float?)j["midDensity"] ?? 2600, farD = (float?)j["farDensity"] ?? 620;
            float midR = (float?)j["midRadius"] ?? 3.5f;
            int tier = 10;
            foreach (var h in hero)
                Sow(tier++, heroD, h.x - h.z - .5f, h.y - h.z - .5f, h.x + h.z + .5f, h.y + h.z + .5f, b => 1 - Mathf.Clamp01(b / .5f), 1, 1, 7, true);
            Sow(2, midD, -sx / 2, -sz / 2, sx / 2, sz / 2, b => Mathf.Clamp01(b / .5f) * (1 - Mathf.Clamp01((b - midR) / 1.5f)) + (b < .5f ? .25f : 0), 1.05f, 2.1f, 4, false);
            Sow(3, farD, -sx / 2, -sz / 2, sx / 2, sz / 2, b => Mathf.Clamp01((b - midR) / 1.5f), 1.25f, 4.5f, 3, false);

            // Small flowers in drifts: "flowers" per square metre where the noise lets them. A stem, and a five-petal head that rides its tip.
            float fl = (float?)j["flowers"] ?? 0;
            if (fl > 0)
            {
                var r = new System.Random(seed * 41 + 5);
                float step = 1 / Mathf.Sqrt(fl * q);
                for (float z = -sz / 2; z < sz / 2; z += step)
                    for (float x = -sx / 2; x < sx / 2; x += step)
                    {
                        float px = x + ((float)r.NextDouble() - .5f) * step * 1.8f, pz = z + ((float)r.NextDouble() - .5f) * step * 1.8f, hr = (float)r.NextDouble(), rr = (float)r.NextDouble();
                        if (Hole(px, pz) || Mathf.Abs(px) > sx / 2 || Mathf.Abs(pz) > sz / 2 || Noise(px * .75f + 3, pz * .75f + 8) < .52f) continue;
                        var ch = At(px, pz);
                        Blade(ch, new Vector3(px, 0, pz), r, height * (1.05f + .55f * hr), .0022f, 4, false);
                        var s = ch.shape[ch.shape.Count - 1]; var u = ch.uv[ch.uv.Count - 1];
                        s.w = .012f + .008f * rr;
                        int b = ch.root.Count;
                        ch.root.Add(new Vector3(px, 0, pz)); ch.shape.Add(s); ch.uv.Add(new Vector4(0, 2, u.z, u.w));
                        for (int k = 0; k < 10; k++)
                        {
                            float a = k * Mathf.PI / 5, rad = k % 2 == 0 ? 1 : .42f;
                            ch.root.Add(new Vector3(px, 0, pz)); ch.shape.Add(s); ch.uv.Add(new Vector4(Mathf.Cos(a) * rad, 2 + Mathf.Sin(a) * rad, u.z, u.w));
                            ch.tri.Add(b); ch.tri.Add(b + 1 + k); ch.tri.Add(b + 1 + (k + 1) % 10);
                        }
                    }
            }

            Tris = 0;
            foreach (var c in chunks.Values) { if (c.root.Count == 0) continue; Tris += c.tri.Count / 3; Part("grass", c); }

            // The ground under it, in the same shader so it always matches the blades.
            var g = new Chunk();
            for (int z = 0; z <= 1; z++) for (int x = 0; x <= 1; x++)
                { g.root.Add(new Vector3(-sx / 2 + sx * x, 0, -sz / 2 + sz * z)); g.shape.Add(Vector4.zero); g.uv.Add(new Vector4(0, -1, 0, 0)); }
            g.tri.AddRange(new[] { 0, 2, 1, 1, 2, 3 });
            Part("ground", g);
            var ac = GetComponent<MVActor>(); if (ac) ac.Rends = null;
        }

        void Part(string name, Chunk c)
        {
            var m = new Mesh { name = MVGen.Name(name), indexFormat = IndexFormat.UInt32, hideFlags = HideFlags.DontSave };
            m.SetVertices(c.root); m.SetTangents(c.shape); m.SetUVs(0, c.uv); m.SetTriangles(c.tri, 0, false);
            var b = new Bounds(c.root[0], Vector3.zero); foreach (var p in c.root) b.Encapsulate(p);
            b.Expand(new Vector3(.8f, .8f, .8f)); m.bounds = b;
            var go = new GameObject(name) { hideFlags = HideFlags.DontSave, layer = gameObject.layer };
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = m;
            var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = _mat;
            r.shadowCastingMode = name == "ground" ? ShadowCastingMode.Off : ShadowCastingMode.On; r.receiveShadows = true;
            m.UploadMeshData(true);
            _parts.Add(go);
        }
    }
}
