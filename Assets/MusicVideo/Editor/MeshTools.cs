using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Meshes made at build time. Each is saved once under Generated/Meshes and reused.</summary>
    public static class MeshTools
    {
        public static string Dir => ScoreCompiler.Gen + "/Meshes";

        public static void Folder()
        {
            if (!AssetDatabase.IsValidFolder(Dir)) AssetDatabase.CreateFolder(ScoreCompiler.Gen, "Meshes");
        }

        public static Mesh Save(Mesh m, string file)
        {
            Folder();
            var path = Dir + "/" + file + ".asset";
            var old = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (old) AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        public static Mesh Load(string file) => AssetDatabase.LoadAssetAtPath<Mesh>(Dir + "/" + file + ".asset");

        /// <summary>Makes a mesh readable, reimporting its model if it has to.</summary>
        public static void Readable(Mesh m)
        {
            if (m.isReadable) return;
            var path = AssetDatabase.GetAssetPath(m);
            if (AssetImporter.GetAtPath(path) is ModelImporter imp) { imp.isReadable = true; imp.SaveAndReimport(); }
        }

        /// <summary>Splits every edge longer than `edge` until none is left, with no cracks between triangles.</summary>
        public static Mesh Tessellate(Mesh src, float edge)
        {
            Readable(src);
            string key = "t_" + Clean(src.name) + "_" + src.vertexCount + "_" + Mathf.RoundToInt(edge * 1000);
            var have = Load(key); if (have) return have;
            var v = new List<Vector3>(src.vertices); var n = new List<Vector3>(src.normals); var uv = new List<Vector2>(src.uv);
            if (n.Count != v.Count) { n.Clear(); foreach (var _ in v) n.Add(Vector3.up); }
            if (uv.Count != v.Count) { uv.Clear(); foreach (var _ in v) uv.Add(Vector2.zero); }
            var mid = new Dictionary<long, int>();
            float e2 = edge * edge;
            int Mid(int a, int b)
            {
                long k = a < b ? ((long)a << 32) | (uint)b : ((long)b << 32) | (uint)a;
                if (mid.TryGetValue(k, out var i)) return i;
                v.Add((v[a] + v[b]) * .5f); n.Add((n[a] + n[b]).normalized); uv.Add((uv[a] + uv[b]) * .5f);
                return mid[k] = v.Count - 1;
            }
            bool Long(int a, int b) => (v[a] - v[b]).sqrMagnitude > e2;
            var subs = new List<int>[src.subMeshCount];
            for (int s = 0; s < subs.Length; s++)
            {
                var tris = new List<int>(src.GetTriangles(s));
                for (int pass = 0; pass < 10; pass++)
                {
                    var next = new List<int>(tris.Count * 2); bool any = false;
                    for (int i = 0; i < tris.Count; i += 3)
                    {
                        int a = tris[i], b = tris[i + 1], c = tris[i + 2];
                        bool ab = Long(a, b), bc = Long(b, c), ca = Long(c, a);
                        int cnt = (ab ? 1 : 0) + (bc ? 1 : 0) + (ca ? 1 : 0);
                        if (cnt == 0) { next.Add(a); next.Add(b); next.Add(c); continue; }
                        any = true;
                        // Turn the triangle so the split edges come first.
                        if (cnt == 1) { if (bc) { (a, b, c) = (b, c, a); } else if (ca) { (a, b, c) = (c, a, b); } }
                        if (cnt == 2) { if (!ab) { (a, b, c) = (b, c, a); } else if (!bc) { (a, b, c) = (c, a, b); } }
                        if (cnt == 1) { int m = Mid(a, b); next.AddRange(new[] { a, m, c, m, b, c }); }
                        else if (cnt == 2) { int m = Mid(a, b), q = Mid(b, c); next.AddRange(new[] { m, b, q, a, m, q, a, q, c }); }
                        else { int m = Mid(a, b), q = Mid(b, c), r = Mid(c, a); next.AddRange(new[] { a, m, r, m, b, q, r, q, c, m, q, r }); }
                    }
                    tris = next; if (!any) break;
                }
                subs[s] = tris;
            }
            var o = new Mesh { name = key, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
            o.SetVertices(v); o.SetNormals(n); o.SetUVs(0, uv); o.subMeshCount = subs.Length;
            for (int s = 0; s < subs.Length; s++) o.SetTriangles(subs[s], s);
            o.RecalculateBounds(); o.RecalculateTangents();
            return Save(o, key);
        }

        public static string Clean(string s) { foreach (var c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); return s.Replace(' ', '_'); }
    }
}
