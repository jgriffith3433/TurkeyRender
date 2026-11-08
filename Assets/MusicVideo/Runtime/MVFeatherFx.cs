using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>Crown and streams, on the Fx track. Each frame only sets numbers: the positions are a function of age in the shader.</summary>
    public static class MVFeatherFx
    {
        class Live { public GameObject go; public Material m; public MeshRenderer r; }
        static readonly Dictionary<Op, Live> All = new Dictionary<Op, Live>();

        public static bool Handles(string kind) => kind == "crown" || kind == "stream";
        public static float Life(string kind) => kind == "crown" ? 60 : 4;

        /// <summary>"person.mouth", "person.head", "tv1.screen", an actor. Also gives the way that point faces.</summary>
        public static bool Where(string spec, double t, out Vector3 pos, out Vector3 forward, out float scale)
        {
            pos = default; forward = Vector3.forward; scale = 1;
            if (string.IsNullOrEmpty(spec)) return false;
            bool mouth = spec.EndsWith(".mouth", System.StringComparison.OrdinalIgnoreCase);
            var tr = MVActor.Point(mouth ? spec.Substring(0, spec.Length - 6) + ".head" : spec, t, true, out var actor);
            if (!tr) return false;
            pos = tr.position; forward = tr.forward; scale = actor ? actor.transform.lossyScale.y : 1;
            if (actor && actor.human.Length > 0 && tr == actor.human[(int)HumanBodyBones.Head])
            {
                var q = tr.rotation * Quaternion.Inverse(actor.humanRest[(int)HumanBodyBones.Head]);
                forward = q * Vector3.forward;
                if (mouth) pos += (forward * .105f + q * Vector3.down * .055f) * scale;
            }
            return true;
        }

        public static void Run(Op op, double t, SongMap song, MVStage st)
        {
            double age = song.Warp(t) - op.ws;
            bool on = t >= op.start && age <= op.WDur + 30;   // streams keep flying a while after they stop
            if (op.kind == "crown") on = t >= op.start && age <= op.Dur;
            All.TryGetValue(op, out var l);
            if (!on) { if (l != null && l.go && l.go.activeSelf) l.go.SetActive(false); return; }
            if (l == null || !l.go) { l = Make(op, st); All[op] = l; }
            if (!l.go.activeSelf) l.go.SetActive(true);
            var a = op.a; var m = l.m;
            m.SetFloat("_Age", Mathf.Max(0, (float)age));
            if (op.kind == "crown")
            {
                var p = a.V("pos");
                if (a.S("on") != null && Where(a.S("on"), t, out var w, out _, out _)) p = w + a.V("offset");
                m.SetVector("_P0", p);
                return;
            }
            Vector3 src = a.V("pos"), fwd = Vector3.up; float sc = 1;
            if (a.S("on") != null && Where(a.S("on"), t, out var s, out var f, out sc)) { src = s; fwd = f; }
            src += a.V("offset");
            Vector3 to = src + fwd * a.F("reach", 3) + Vector3.down * a.F("drop", 1.5f);
            if (a.Vec.TryGetValue("to", out var tv)) to = tv;
            else if (a.S("to") != null && Where(a.S("to"), t, out var tw, out _, out _)) to = tw;
            var dir = a.Vec.TryGetValue("dir", out var d) ? d.normalized : fwd;
            var ctrl = src + dir * Mathf.Max(.2f, a.F("push", (to - src).magnitude * .45f));
            m.SetVector("_P0", src); m.SetVector("_P1", ctrl); m.SetVector("_P2", to);
            m.SetFloat("_Dur", (float)op.WDur);
        }

        static Live Make(Op op, MVStage st)
        {
            var a = op.a; bool crown = op.kind == "crown";
            float life = a.F("life", 1.6f);
            int n = crown ? Mathf.Clamp((int)a.F("count", 3500), 1, 20000) : Mathf.Clamp((int)(a.F("rate", 400) * life), 8, 12000);
            var go = new GameObject("fx_" + op.kind) { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(st.fxRoot, false);
            go.AddComponent<MeshFilter>().sharedMesh = MVFeatherMeshes.Loose(n, 31 + op.index * 7);
            var r = go.AddComponent<MeshRenderer>();
            var m = new Material(Shader.Find("MV/FeatherFx")) { hideFlags = HideFlags.DontSave };
            m.SetTexture("_FeatherTex", MVFeatherMeshes.Tex());
            m.SetFloat("_Mode", crown ? 0 : 1);
            m.SetFloat("_Height", a.F("height", 11)); m.SetFloat("_Radius", a.F("radius", 7)); m.SetFloat("_Spread", a.F("spread", .18f));
            m.SetFloat("_Size", a.F("size", crown ? .42f : .22f)); m.SetFloat("_Life", life); m.SetFloat("_Floor", a.F("floor", -100000));
            m.SetFloat("_Drag", a.F("drag", 1.6f)); m.SetFloat("_Swirl", a.F("swirl", 4)); m.SetFloat("_Water", a.F("water"));
            m.SetColor("_ColorA", a.C("color", new Color(.96f, .96f, .98f))); m.SetColor("_ColorB", a.C("color2", new Color(.8f, .82f, .88f)));
            r.sharedMaterial = m; r.shadowCastingMode = a.F("shadows", 1) > 0 ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
            return new Live { go = go, m = m, r = r };
        }

        public static void Clear()
        {
            foreach (var l in All.Values) { if (l.go) Object.DestroyImmediate(l.go); if (l.m) Object.DestroyImmediate(l.m); }
            All.Clear();
        }
    }
}
