using Newtonsoft.Json.Linq;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// The feather mountain. An actor with "mountain": {...}. Summit at the actor's position, the rest below it. A skin mesh and
    /// a few hundred thousand cards share one height function in the shader; drain, dent and flow are just numbers on them.
    /// </summary>
    [ExecuteAlways]
    public class MVFeatherMountain : MonoBehaviour
    {
        public string cfg = "{}";
        Material _skin, _cards; MeshRenderer _rs, _rc; float _r = 45, _h = 22;

        public void Setup(string json)
        {
            cfg = json;
            var a = GetComponent<MVActor>();
            if (a && a.animRoot) { DestroyImmediate(a.animRoot); a.animRoot = null; }
            _rs = _rc = null;
            Ensure();
        }

        void OnEnable() => Ensure();

        static MeshRenderer Child(Transform t, string name, Mesh m, Material mat, bool shadows)
        {
            var old = t.Find(name); if (old) DestroyImmediate(old.gameObject);
            var go = new GameObject(name) { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(t, false);
            go.AddComponent<MeshFilter>().sharedMesh = m;
            var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat;
            r.shadowCastingMode = shadows ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
            return r;
        }

        void Ensure()
        {
            if (_rs && _rc) return;
            var j = JObject.Parse(string.IsNullOrEmpty(cfg) ? "{}" : cfg);
            _r = (float?)j["radius"] ?? 45; _h = (float?)j["height"] ?? 22;
            int cards = (int?)j["cards"] ?? 80000, seed = (int?)j["seed"] ?? 5;
            var sh = Shader.Find("MV/FeatherMound"); if (!sh) return;
            _skin = new Material(sh) { name = MVGen.Name("mound"), hideFlags = HideFlags.DontSave }; _cards = new Material(sh) { name = MVGen.Name("mound"), hideFlags = HideFlags.DontSave };
            foreach (var m in new[] { _skin, _cards })
            {
                m.SetTexture("_FeatherTex", MVFeatherMeshes.Tex());
                m.SetFloat("_R", _r); m.SetFloat("_H", _h); m.SetFloat("_Seed", seed);
                m.SetFloat("_HoleW", (float?)j["holeW"] ?? _r * .12f); m.SetFloat("_HoleH", (float?)j["holeH"] ?? _r * .09f);
                m.SetFloat("_Slope", (float?)j["slope"] ?? .8f);
                m.SetFloat("_Pattern", (float?)j["pattern"] ?? .55f);
                if (j["color"] != null && ColorUtility.TryParseHtmlString((string)j["color"], out var ca)) m.SetColor("_ColorA", ca);
                if (j["color2"] != null && ColorUtility.TryParseHtmlString((string)j["color2"], out var cb)) m.SetColor("_ColorB", cb);
            }
            _cards.SetFloat("_Card", 1);
            _rs = Child(transform, "mound_skin", MVFeatherMeshes.Skin(_r), _skin, true);
            _rc = Child(transform, "mound_cards", MVFeatherMeshes.Cards(_r, cards, seed, .3f), _cards, false);
            var a = GetComponent<MVActor>(); if (a) a.Rends = null;
            Apply(0, 0, 0, 0, 3, 1.2f, 0);
        }

        public void Apply(float drain, float dent, float dx, float dz, float dr, float dd, float flowT)
        {
            Ensure(); if (!_rs) return;
            var v = new Vector4(dx, dz, dr, dd * dent);
            foreach (var m in new[] { _skin, _cards })
            {
                m.SetFloat("_Drain", drain); m.SetFloat("_FlowT", flowT); m.SetVector("_Dent", v);
            }
            // Preview keeps playback smooth: a third of the cards. Captures and renders draw them all.
            int want = MVClock.Preview ? 1 : 2;
            if (_rc.sharedMaterials.Length != want) _rc.sharedMaterials = want == 1 ? new[] { _cards } : new[] { _cards, _cards };
        }
    }
}
