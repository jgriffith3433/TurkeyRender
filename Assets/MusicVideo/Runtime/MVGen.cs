using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Meshes and materials built from numbers and never saved. They survive a domain reload but the fields that held them don't, so anything that rebuilt
    /// on enable leaked its whole mesh on every script reload (grass: a fatal out of memory after about 100). Each carries this tag in its name, which is
    /// how the owner finds its own children after a reload, and how the sweep finds what no renderer uses any more.
    /// </summary>
    public static class MVGen
    {
        public const string Tag = "mvgen ";
        public static string Name(string name) => Tag + name;
        static bool Tagged(Object o) => o && o.name.StartsWith(Tag);

        /// <summary>Destroys this object's generated children, with their meshes and tagged materials. Hand-made children and shared assets stay.</summary>
        public static void DestroyParts(Transform t)
        {
            for (int i = t.childCount - 1; i >= 0; i--)
            {
                var c = t.GetChild(i);
                if ((c.gameObject.hideFlags & HideFlags.DontSave) == 0) continue;
                var f = c.GetComponent<MeshFilter>(); var mesh = f ? f.sharedMesh : null;
                if (!Tagged(mesh)) continue;
                var r = c.GetComponent<MeshRenderer>(); var mat = r ? r.sharedMaterial : null;
                Object.DestroyImmediate(c.gameObject);
                Object.DestroyImmediate(mesh);
                if (Tagged(mat)) Object.DestroyImmediate(mat);
            }
        }

        /// <summary>Destroys every tagged mesh and material no renderer uses, returning how many.</summary>
        public static int Sweep()
        {
            var meshes = new HashSet<Mesh>(); var mats = new HashSet<Material>();
            foreach (var f in Resources.FindObjectsOfTypeAll<MeshFilter>()) if (f.sharedMesh) meshes.Add(f.sharedMesh);
            foreach (var s in Resources.FindObjectsOfTypeAll<SkinnedMeshRenderer>()) if (s.sharedMesh) meshes.Add(s.sharedMesh);
            foreach (var r in Resources.FindObjectsOfTypeAll<Renderer>()) foreach (var m in r.sharedMaterials) if (m) mats.Add(m);
            int n = 0;
            foreach (var m in Resources.FindObjectsOfTypeAll<Mesh>()) if (Tagged(m) && !meshes.Contains(m)) { Object.DestroyImmediate(m); n++; }
            foreach (var m in Resources.FindObjectsOfTypeAll<Material>()) if (Tagged(m) && !mats.Contains(m)) { Object.DestroyImmediate(m); n++; }
            return n;
        }

        /// <summary>How many tagged meshes and materials exist, and their vertices.</summary>
        public static (int meshes, int mats, long verts) Count()
        {
            int a = 0, b = 0; long v = 0;
            foreach (var m in Resources.FindObjectsOfTypeAll<Mesh>()) if (Tagged(m)) { a++; v += m.vertexCount; }
            foreach (var m in Resources.FindObjectsOfTypeAll<Material>()) if (Tagged(m)) b++;
            return (a, b, v);
        }

#if UNITY_EDITOR
        // After a reload every enabled component has rebuilt, so what nothing uses is an orphan.
        [UnityEditor.InitializeOnLoadMethod]
        static void AfterReload() => UnityEditor.EditorApplication.delayCall += () => { int n = Sweep(); if (n > 0) Debug.Log("[MVGen] destroyed " + n + " orphaned meshes and materials"); };
#endif
    }
}
