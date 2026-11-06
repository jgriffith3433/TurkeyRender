using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Feathers growing out of a skinned body. Every card sits on one point of the skin, skinned to the same bones as that
    /// point, and is opened in the shader. Only numbers change over time, so it scrubs. Built on first use, never saved.
    /// </summary>
    public class MVFeatherCoat
    {
        public const int Cards = 9000;
        const int Verts = 8;

        class Data
        {
            public int n; public Mesh mesh; public string from;
            public Vector3[] root, nor; public int[] dom; public float[] jitter;
            public Vector3[] bonePos; public int[] parent; public int[] human; public Transform[] bones;
            public int hero = -1;
        }
        static readonly Dictionary<int, Data> Built = new Dictionary<int, Data>();

        Data _d; SkinnedMeshRenderer _r; Material _m;
        static readonly int Amount = Shader.PropertyToID("_Amount"), Band = Shader.PropertyToID("_Band"), Strip = Shader.PropertyToID("_Strip"), StripTo = Shader.PropertyToID("_StripTo"),
            ColorA = Shader.PropertyToID("_ColorA"), ColorB = Shader.PropertyToID("_ColorB"), SizeMul = Shader.PropertyToID("_SizeMul"), Lay = Shader.PropertyToID("_Lay");

        static SkinnedMeshRenderer Biggest(MVActor a)
        {
            SkinnedMeshRenderer best = null; int most = 0;
            foreach (var s in a.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (s.sharedMesh && s.sharedMesh.vertexCount > most && s.name != "feather_coat" && s.name != "stretch_skin") { best = s; most = s.sharedMesh.vertexCount; }
            return best;
        }

        public static MVFeatherCoat For(MVActor actor)
        {
            var src = Biggest(actor); if (!src) return null;
            var c = new MVFeatherCoat();
            int id = src.sharedMesh.GetInstanceID();
            if (!Built.TryGetValue(id, out c._d) || !c._d.mesh) Built[id] = c._d = Build(src, actor);
            var old = src.transform.parent.Find("feather_coat");
            if (old) UnityEngine.Object.DestroyImmediate(old.gameObject);
            var go = new GameObject("feather_coat") { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(src.transform.parent, false);
            go.transform.SetLocalPositionAndRotation(src.transform.localPosition, src.transform.localRotation);
            go.transform.localScale = src.transform.localScale;
            go.layer = src.gameObject.layer;
            var r = go.AddComponent<SkinnedMeshRenderer>();
            r.bones = src.bones; r.rootBone = src.rootBone; r.sharedMesh = c._d.mesh;
            r.quality = SkinQuality.Bone4; r.updateWhenOffscreen = true; r.forceMatrixRecalculationPerRender = true; r.localBounds = new Bounds(Vector3.zero, Vector3.one * 8);   // same as his body (ScoreCompiler), or the feathers are skinned on the last frame's pose and float off a moving hand
            c._m = new Material(Shader.Find("MV/Feather")) { hideFlags = HideFlags.DontSave };
            c._m.SetTexture("_FeatherTex", MVFeatherMeshes.Tex());
            r.sharedMaterial = c._m; r.forceRenderingOff = true;
            c._r = r;
            actor.Rends = null;
            return c;
        }

        public bool Alive => _r != null;

        public void Apply(float amount, string from, float strip, Vector3 stripTo, Color a, Color b, float size, float lay)
        {
            bool on = amount > 0 && strip < 1.01f;
            _r.forceRenderingOff = !on;
            if (!on) return;
            if (from != _d.from) Rank(_d, from);
            _m.SetFloat(Amount, amount);
            _m.SetFloat(Band, Mathf.Clamp(amount * .5f, 1f / _d.n, .04f));
            _m.SetFloat(Strip, strip); _m.SetVector(StripTo, stripTo);
            _m.SetColor(ColorA, a); _m.SetColor(ColorB, b); _m.SetFloat(SizeMul, size); _m.SetFloat(Lay, lay);
        }

        static float SizeOf(int human)
        {
            switch ((HumanBodyBones)human)
            {
                case HumanBodyBones.LeftHand: case HumanBodyBones.RightHand: return .05f;
                case HumanBodyBones.LeftLowerArm: case HumanBodyBones.RightLowerArm: return .1f;
                case HumanBodyBones.LeftUpperArm: case HumanBodyBones.RightUpperArm: return .13f;
                case HumanBodyBones.Neck: return .07f;
                case HumanBodyBones.Head: return .06f;
                case HumanBodyBones.LeftFoot: case HumanBodyBones.RightFoot: case HumanBodyBones.LeftToes: case HumanBodyBones.RightToes: return .06f;
                case HumanBodyBones.LeftLowerLeg: case HumanBodyBones.RightLowerLeg: return .11f;
                default: return human >= (int)HumanBodyBones.LeftThumbProximal && human <= (int)HumanBodyBones.RightLittleDistal ? .022f : .14f;
            }
        }

        static Data Build(SkinnedMeshRenderer src, MVActor actor)
        {
            var mesh = src.sharedMesh;
            var verts = mesh.vertices; var normals = mesh.normals; var weights = mesh.boneWeights; var bind = mesh.bindposes; var bones = src.bones;
            var tris = mesh.triangles;

            // The skeleton, as it stands in the bind pose.
            int nb = bones.Length;
            var d = new Data { n = Cards, bones = bones, bonePos = new Vector3[nb], parent = new int[nb], human = new int[nb], root = new Vector3[Cards], nor = new Vector3[Cards], dom = new int[Cards], jitter = new float[Cards] };
            var index = new Dictionary<Transform, int>();
            for (int i = 0; i < nb; i++) { d.bonePos[i] = bind[i].inverse.GetColumn(3); if (bones[i]) index[bones[i]] = i; d.parent[i] = -1; d.human[i] = -1; }
            for (int i = 0; i < nb; i++)
                if (bones[i]) for (var p = bones[i].parent; p; p = p.parent) if (index.TryGetValue(p, out int pi)) { d.parent[i] = pi; break; }
            for (int h = 0; h < actor.human.Length; h++) if (actor.human[h] && index.TryGetValue(actor.human[h], out int bi)) d.human[bi] = h;
            var child = new int[nb]; for (int i = 0; i < nb; i++) child[i] = -1;
            for (int i = nb - 1; i >= 0; i--) if (d.parent[i] >= 0) child[d.parent[i]] = i;

            // Pick points on the skin by area.
            int nt = tris.Length / 3; var cum = new float[nt]; float total = 0;
            for (int i = 0; i < nt; i++)
            {
                total += Vector3.Cross(verts[tris[i * 3 + 1]] - verts[tris[i * 3]], verts[tris[i * 3 + 2]] - verts[tris[i * 3]]).magnitude;
                cum[i] = total;
            }
            float top = float.MinValue; foreach (var v in verts) top = Mathf.Max(top, v.y);
            int head = Array.IndexOf(d.human, (int)HumanBodyBones.Head);

            var rng = new System.Random(4217);
            float F() => (float)rng.NextDouble();
            int nv = Cards * Verts;
            var pos = new Vector3[nv]; var nor = new Vector3[nv]; var tan = new Vector4[nv]; var uv = new Vector2[nv]; var uv1 = new Vector4[nv]; var uv2 = new Vector2[nv]; var bw = new BoneWeight[nv];
            var tri = new int[Cards * 18];
            for (int c = 0; c < Cards; c++)
            {
                int t; Vector3 p, n; BoneWeight w; int domBone;
                for (int tries = 0; ; tries++)
                {
                    t = Array.BinarySearch(cum, F() * total); if (t < 0) t = ~t; t = Mathf.Min(t, nt - 1);
                    int i0 = tris[t * 3], i1 = tris[t * 3 + 1], i2 = tris[t * 3 + 2];
                    float a = F(), b = F(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
                    float e = 1 - a - b;
                    p = verts[i0] * e + verts[i1] * a + verts[i2] * b;
                    n = (normals[i0] * e + normals[i1] * a + normals[i2] * b).normalized;
                    w = weights[e >= a && e >= b ? i0 : a >= b ? i1 : i2];
                    domBone = w.boneIndex0;
                    if (domBone == head && n.z > .25f && p.y < top - .07f && tries < 20) continue;   // leave the face free
                    break;
                }
                // Feathers point away from the body's centre along each limb, down the torso, back over the head.
                int dom = domBone, kid = child[dom];
                int h = d.human[dom];
                Vector3 flow = kid >= 0 ? d.bonePos[kid] - d.bonePos[dom] : d.parent[dom] >= 0 ? d.bonePos[dom] - d.bonePos[d.parent[dom]] : Vector3.down;
                if (h == (int)HumanBodyBones.Hips || h == (int)HumanBodyBones.Spine || h == (int)HumanBodyBones.Chest || h == (int)HumanBodyBones.UpperChest) flow = Vector3.down;
                if (h == (int)HumanBodyBones.Neck || h == (int)HumanBodyBones.Head) flow = new Vector3(0, -.6f, -1);
                flow = (flow.normalized + new Vector3(F() - .5f, F() - .5f, F() - .5f) * .55f);
                flow = (flow - n * Vector3.Dot(flow, n)).normalized;
                if (flow.sqrMagnitude < .1f) flow = Vector3.Cross(n, Vector3.right).normalized;

                float size = SizeOf(h >= 0 ? h : 0) * (.7f + .6f * F());
                float seed = F(), rip = F();
                d.root[c] = p; d.nor[c] = n; d.dom[c] = dom; d.jitter[c] = F();
                for (int q = 0; q < Verts; q++)
                {
                    int vi = c * Verts + q;
                    pos[vi] = p; nor[vi] = n; tan[vi] = new Vector4(flow.x, flow.y, flow.z, 1); bw[vi] = w;
                    uv[vi] = new Vector2(q % 2 == 0 ? -1 : 1, (q / 2) / 3f);
                    uv1[vi] = new Vector4(1, seed, size, size * .42f);
                    uv2[vi] = new Vector2(rip, 0);
                }
                int b0 = c * Verts, k = c * 18;
                for (int s = 0; s < 3; s++)
                {
                    int x = b0 + s * 2;
                    tri[k++] = x; tri[k++] = x + 2; tri[k++] = x + 1; tri[k++] = x + 1; tri[k++] = x + 2; tri[k++] = x + 3;
                }
            }
            var m = MVFeatherMeshes.New("feather_coat");
            m.vertices = pos; m.normals = nor; m.tangents = tan; m.SetUVs(0, uv); m.SetUVs(1, uv1); m.SetUVs(2, uv2);
            m.triangles = tri; m.boneWeights = bw; m.bindposes = bind;
            m.bounds = new Bounds(Vector3.zero, Vector3.one * 8);
            d.mesh = m;
            return d;
        }

        /// <summary>Orders the cards by distance along the skeleton from the start bones. Rank is the threshold, so amount is a share of all feathers.</summary>
        static void Rank(Data d, string from)
        {
            d.from = from;
            int nb = d.bones.Length;
            var dist = new float[nb];
            for (int i = 0; i < nb; i++) dist[i] = float.MaxValue;
            var starts = new List<int>();
            foreach (var name in (from ?? "LeftHand").Split(','))
            {
                var al = MVActor.Alias(name.Trim());
                if (Enum.TryParse<HumanBodyBones>(al, true, out var hb))
                {
                    int i = Array.IndexOf(d.human, (int)hb);
                    if (i >= 0) starts.Add(i);
                }
                else for (int i = 0; i < nb; i++) if (d.bones[i] && d.bones[i].name.IndexOf(name.Trim(), StringComparison.OrdinalIgnoreCase) >= 0) { starts.Add(i); break; }
            }
            if (starts.Count == 0) starts.Add(0);
            foreach (var s in starts) dist[s] = 0;
            for (int pass = 0; pass < 64; pass++)          // relax over the tree: it is shallow
            {
                bool any = false;
                for (int i = 0; i < nb; i++)
                {
                    int p = d.parent[i]; if (p < 0) continue;
                    float len = (d.bonePos[i] - d.bonePos[p]).magnitude;
                    if (dist[p] + len < dist[i]) { dist[i] = dist[p] + len; any = true; }
                    if (dist[i] + len < dist[p]) { dist[p] = dist[i] + len; any = true; }
                }
                if (!any) break;
            }
            int n = d.n; var key = new float[n]; var order = new int[n];
            int hero = -1; float heroBest = float.MaxValue;
            for (int c = 0; c < n; c++)
            {
                int b = d.dom[c]; var p = d.root[c];
                float k = dist[b] + (p - d.bonePos[b]).magnitude;
                int par = d.parent[b];
                if (par >= 0) k = Mathf.Min(k, dist[par] + (p - d.bonePos[par]).magnitude);
                key[c] = k + d.jitter[c] * .05f; order[c] = c;
                // The very first feather: on the back of the first hand, facing up in the bind pose.
                if (starts.Contains(b) && d.nor[c].y > .6f)
                {
                    float q = (p - d.bonePos[b]).sqrMagnitude; if (q < heroBest) { heroBest = q; hero = c; }
                }
            }
            if (hero >= 0) key[hero] = -1;
            Array.Sort(key, order);
            var uv1 = new List<Vector4>(n * Verts); d.mesh.GetUVs(1, uv1);
            for (int r = 0; r < n; r++)
            {
                int c = order[r]; float th = r / (float)n * .96f;
                for (int q = 0; q < Verts; q++)
                {
                    var u = uv1[c * Verts + q]; u.x = th;
                    if (c == hero) { u.z = Mathf.Max(u.z, .085f); u.w = u.z * .42f; }
                    uv1[c * Verts + q] = u;
                }
            }
            d.mesh.SetUVs(1, uv1);
            d.hero = hero;
        }
    }
}
