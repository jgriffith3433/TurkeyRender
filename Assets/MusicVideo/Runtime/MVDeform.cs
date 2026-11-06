using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Soft props: ripple, peel and bulge bend a finely tessellated copy of the actor's meshes on the CPU. The compiler adds
    /// this to any actor those cues touch. The shape is worked out from the rest mesh every frame, so it scrubs.
    /// </summary>
    public class MVDeform : MonoBehaviour
    {
        public MeshFilter[] filters = new MeshFilter[0];
        public Mesh[] rest = new Mesh[0];

        class Part { public MeshFilter f; public Mesh live, shared; public Vector3[] restLocal, work; public Matrix4x4 toActor, fromActor; }
        readonly List<Part> _parts = new List<Part>();
        Bounds _b; bool _ready, _dirty;

        public struct Item { public string kind; public Args a; public float raw, amount; public double tl; public Vector3 toward; }
        public readonly List<Item> Items = new List<Item>();

        void Ready()
        {
            if (_ready) return;
            _ready = true; _parts.Clear();
            bool first = true;
            for (int i = 0; i < filters.Length; i++)
            {
                var f = filters[i]; if (!f || !rest[i]) continue;
                var toActor = transform.worldToLocalMatrix * f.transform.localToWorldMatrix;
                var v = rest[i].vertices;
                var loc = new Vector3[v.Length];
                for (int k = 0; k < v.Length; k++)
                {
                    loc[k] = toActor.MultiplyPoint3x4(v[k]);
                    if (first) { _b = new Bounds(loc[k], Vector3.zero); first = false; } else _b.Encapsulate(loc[k]);
                }
                _parts.Add(new Part { f = f, shared = rest[i], restLocal = loc, work = new Vector3[v.Length], toActor = toActor, fromActor = toActor.inverse });
            }
        }

        /// <summary>Puts the rest meshes back. The compiler calls this before saving the scene, so no live mesh is ever saved.</summary>
        public void Restore()
        {
            for (int i = 0; i < filters.Length; i++) if (filters[i] && rest[i]) filters[i].sharedMesh = rest[i];
            _dirty = false;
        }

        // The sheet's axes: n is its thinnest direction, u and v lie in it.
        void Axes(Args a, out int n, out int u, out int v)
        {
            var s = _b.size;
            n = a.Has("axis") ? "xyz".IndexOf(a.S("axis", "z")) : (s.x <= s.y && s.x <= s.z ? 0 : s.y <= s.z ? 1 : 2);
            if (n < 0) n = 2;
            u = (n + 1) % 3; v = (n + 2) % 3;
            if (u > v) { int q = u; u = v; v = q; }
        }

        public void Apply()
        {
            if (Items.Count == 0) { if (_dirty) Restore(); return; }
            Ready();
            foreach (var p in _parts)
            {
                System.Array.Copy(p.restLocal, p.work, p.work.Length);
                foreach (var it in Items) Deform(p.work, it);
                if (p.live == null) { p.live = Instantiate(p.shared); p.live.hideFlags = HideFlags.HideAndDontSave; p.live.MarkDynamic(); }
                var w = p.work;
                for (int i = 0; i < w.Length; i++) w[i] = p.fromActor.MultiplyPoint3x4(w[i]);
                p.live.SetVertices(w); p.live.RecalculateNormals(); p.live.RecalculateBounds();
                p.f.sharedMesh = p.live;
            }
            _dirty = true;
        }

        void Deform(Vector3[] w, Item it)
        {
            var a = it.a;
            if (it.kind == "bulge")
            {
                var c = _b.center; var to = transform.InverseTransformPoint(it.toward);
                float rad = a.F("radius", Mathf.Max(_b.size.x, _b.size.y, _b.size.z) * .6f), amt = it.amount;
                var dir = (to - c).normalized;
                for (int i = 0; i < w.Length; i++)
                {
                    float q = (w[i] - c).magnitude / rad;
                    float flut = 1 + a.F("flutter", .15f) * Mathf.Sin(w[i].y * 5 + (float)it.tl * 2.3f + w[i].x * 3);
                    w[i] += dir * (amt * Mathf.Exp(-q * q) * flut);
                }
                return;
            }
            Axes(a, out int n, out int u, out int v);
            var mn = _b.min; var sz = _b.size;
            if (it.kind == "ripple")
            {
                float amp = it.amount, wl = a.F("wave", 1.2f), sp = a.F("speed", 4), ang = a.F("angle") * Mathf.Deg2Rad;
                float cs = Mathf.Cos(ang), sn = Mathf.Sin(ang); float T = (float)it.tl;
                float span = Mathf.Max(sz[u] * Mathf.Abs(cs) + sz[v] * Mathf.Abs(sn), .01f);
                bool hump = a.F("pulse") > 0;
                float front = -span * .5f + it.raw * span * 1.6f;
                for (int i = 0; i < w.Length; i++)
                {
                    var p = w[i];
                    float x = (p[u] - _b.center[u]) * cs + (p[v] - _b.center[v]) * sn, d;
                    if (hump) { float q = (x - front) / wl; d = Mathf.Exp(-q * q); }
                    else d = Mathf.Sin((x / wl - T * sp / wl) * 6.283f) * .5f + .5f;
                    p[n] += amp * d; w[i] = p;
                }
                return;
            }
            // peel: the sheet rolls off from a corner along a moving fold.
            {
                float sx = a.Vec.TryGetValue("corner", out var cn) ? cn.x : 1, sy = a.Vec.TryGetValue("corner", out cn) ? cn.y : 1;
                var d2 = new Vector2(-sx * sz[u], -sy * sz[v]).normalized;
                var corner = new Vector2(sx > 0 ? mn[u] + sz[u] : mn[u], sy > 0 ? mn[v] + sz[v] : mn[v]);
                float length = Mathf.Abs(d2.x) * sz[u] + Mathf.Abs(d2.y) * sz[v];
                float f = it.amount * (length + a.F("extra", .5f)), r = a.F("curl", .12f);
                float maxAng = a.F("angle", 150) * Mathf.Deg2Rad, side = a.F("side", 1);
                for (int i = 0; i < w.Length; i++)
                {
                    var p = w[i];
                    var q = new Vector2(p[u], p[v]) - corner;
                    float s = Vector2.Dot(q, d2), x = f - s;
                    if (x <= 0) continue;
                    float th = Mathf.Min(x / r, maxAng), tail = Mathf.Max(0, x - maxAng * r);
                    float along = f + r * Mathf.Sin(th) + tail * Mathf.Cos(th), up = r * (1 - Mathf.Cos(th)) + tail * Mathf.Sin(th);
                    var pl = corner + q + d2 * (along - s);
                    p[u] = pl.x; p[v] = pl.y; p[n] += up * side; w[i] = p;
                }
            }
        }
    }
}
