using System;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// What the broadcast graphics' text holds at t: each active TMP text's string, colour, size, characters and vertices generated, the mesh on its
    /// canvas renderer, and a frame as `mv frame` takes it; then the same after ForceMeshUpdate on every text. `call gfxprobe '{"t":170}'`.
    /// </summary>
    static class GfxProbe
    {
        static object Texts()
        {
            return UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .Where(x => x.transform.root.name == "_Generated" && x.isActiveAndEnabled && !string.IsNullOrEmpty(x.text))
                .Select(x => new
                {
                    path = x.transform.parent.name + "/" + x.name, x.text, color = "#" + ColorUtility.ToHtmlStringRGBA(x.color), x.fontSize,
                    font = x.font ? x.font.name : null, material = x.fontSharedMaterial ? x.fontSharedMaterial.name + " " + x.fontSharedMaterial.shader.name : null,
                    chars = x.textInfo?.characterCount ?? -1, verts = x.mesh ? x.mesh.vertexCount : -1, crVerts = x.canvasRenderer ? x.canvasRenderer.GetMesh()?.vertexCount ?? -1 : -1,
                    cull = x.canvasRenderer && x.canvasRenderer.cull, alpha = x.canvasRenderer ? x.canvasRenderer.GetAlpha() : -1, rect = x.rectTransform.rect.size.ToString(),
                    layer = x.gameObject.layer, sub = x.GetComponentsInChildren<TMP_SubMeshUI>(true).Length,
                    keywords = x.fontSharedMaterial ? string.Join(" ", x.fontSharedMaterial.shaderKeywords) : null,
                    clip = x.fontSharedMaterial && x.fontSharedMaterial.HasProperty("_ClipRect") ? x.fontSharedMaterial.GetVector("_ClipRect").ToString() : null,
                    rendering = x.materialForRendering ? x.materialForRendering.name + " " + x.materialForRendering.GetInstanceID() + " kw " + string.Join(" ", x.materialForRendering.shaderKeywords) + " clip " + (x.materialForRendering.HasProperty("_ClipRect") ? x.materialForRendering.GetVector("_ClipRect").ToString() : "-") : null,
                    crMat = x.canvasRenderer && x.canvasRenderer.materialCount > 0 && x.canvasRenderer.GetMaterial() ? x.canvasRenderer.GetMaterial().name + " " + x.canvasRenderer.GetMaterial().GetInstanceID() : "none",
                    mprops = x.materialForRendering ? string.Join(" ", new[] { "_ColorMask", "_Stencil", "_StencilComp", "_StencilOp", "_StencilReadMask", "_StencilWriteMask", "_CullMode", "_ZTest", "_ClipRect" }.Where(x.materialForRendering.HasProperty).Select(k => k + "=" + (k == "_ClipRect" ? x.materialForRendering.GetVector(k).ToString() : x.materialForRendering.GetFloat(k).ToString()))) : null,
                    cullTransparent = x.canvasRenderer && x.canvasRenderer.cullTransparentMesh, popCount = x.canvasRenderer ? x.canvasRenderer.popMaterialCount : -1, absDepth = x.canvasRenderer ? x.canvasRenderer.absoluteDepth : -1, worldZ = x.transform.position.ToString("F3"), lossy = x.transform.lossyScale.ToString("F5"),
                    rectClip = x.canvasRenderer && x.canvasRenderer.hasRectClipping, stencil = x.fontSharedMaterial && x.fontSharedMaterial.HasProperty("_Stencil") ? x.fontSharedMaterial.GetFloat("_Stencil") : -1,
                }).ToArray();
        }

        /// <summary>Bright pixels inside the lower third's bar (where only text can be bright), in a 640x360 frame as it stands.</summary>
        static int W = 640, H = 360;
        static int Bright()
        {
            var raw = Capture.Current(W, H); int n = 0;
            for (int y = H * 50 / 360; y < H * 100 / 360; y++) for (int x = W * 40 / 640; x < W * 340 / 640; x++) { int i = (y * W + x) * 3; if (raw[i] > 200 && raw[i + 1] > 200 && raw[i + 2] > 200) n++; }
            return n;
        }

        /// <summary>One change at a time at t, counting the lower third's bright pixels: `call gfxvariants '{"t":170}'`.</summary>
        [BridgeCommand("gfxvariants")]
        static object Variants(JObject m)
        {
            double t = (double)m["t"], keep = Transport.Director.time; W = (int?)m["w"] ?? 640; H = (int?)m["h"] ?? 360;
            Quality.Set(false); Capture.At(t, W, H);
            var o = new JObject { ["asIs"] = Bright() };
            var cv = UnityEngine.Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None).First(c => c.name == "Overlay");
            var texts = UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None).Where(x => x.transform.root.name == "_Generated").ToArray();
            foreach (var x in texts) x.canvasRenderer.cullTransparentMesh = false; o["cullTransparentOff"] = Bright(); foreach (var x in texts) x.canvasRenderer.cullTransparentMesh = true;
            float pd = cv.planeDistance;
            foreach (var d in new[] { .13f, .15f, .2f, .3f, .5f, 1f }) foreach (float fov in new[] { 0f, 12f, 6f }) { var cm = cv.worldCamera; float f0 = cm.fieldOfView; if (fov > 0) cm.fieldOfView = fov; cv.planeDistance = d; Canvas.ForceUpdateCanvases(); foreach (var x in texts) x.ForceMeshUpdate(false, true); o["plane" + d + (fov > 0 ? " fov" + fov : "")] = Bright(); cm.fieldOfView = f0; }
            cv.planeDistance = pd; Canvas.ForceUpdateCanvases(); foreach (var x in texts) x.ForceMeshUpdate(false, true);
            o["planeBack"] = Bright();
            var camm = cv.worldCamera; float nr = camm.nearClipPlane; camm.nearClipPlane = .02f; o["near0.02plane0.12"] = Bright(); camm.nearClipPlane = nr;
            var mode = cv.renderMode; cv.renderMode = RenderMode.WorldSpace; o["worldSpace"] = Bright(); cv.renderMode = mode;
            foreach (var x in texts) { var mat = new Material(Shader.Find("TextMeshPro/Distance Field")); mat.CopyPropertiesFromMaterial(x.fontSharedMaterial); x.fontMaterial = mat; }
            o["fullShader"] = Bright();
            Quality.Set(true); Transport.Seek(keep);
            return o;
        }

        [BridgeCommand("gfxprobe")]
        static object Run(JObject m)
        {
            double t = (double)m["t"], keep = Transport.Director.time;
            Quality.Set(false);
            var p1 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_a.png"); File.WriteAllBytes(p1, Capture.Png(Capture.At(t, 640, 360), 640, 360));
            var a = Texts();
            foreach (var x in UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)) if (x.transform.root.name == "_Generated") x.ForceMeshUpdate(false, true);
            var b = Texts();
            var p2 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_b.png"); File.WriteAllBytes(p2, Capture.Png(Capture.Current(640, 360), 640, 360));
            // a third frame with every TMP material's clip rect opened and the clip keyword off, to test a shared material carrying a clip
            foreach (var x in UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
                if (x.transform.root.name == "_Generated" && x.fontSharedMaterial) { var mm = x.fontSharedMaterial; if (mm.HasProperty("_ClipRect")) mm.SetVector("_ClipRect", new Vector4(-32767, -32767, 32767, 32767)); mm.DisableKeyword("UNITY_UI_CLIP_RECT"); }
            var p3 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_c.png"); File.WriteAllBytes(p3, Capture.Png(Capture.Current(640, 360), 640, 360));
            // a fourth with depth of field off in every volume: the overlay canvas is drawn before post, so DoF can blur thin text away while a bar survives
            var dofs = new System.Collections.Generic.List<(UnityEngine.Rendering.Universal.DepthOfField d, bool on)>();
            foreach (var v in UnityEngine.Object.FindObjectsByType<UnityEngine.Rendering.Volume>(FindObjectsSortMode.None))
                if (v.profile && v.profile.TryGet<UnityEngine.Rendering.Universal.DepthOfField>(out var d)) { dofs.Add((d, d.active)); d.active = false; }
            var p4 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_d.png"); File.WriteAllBytes(p4, Capture.Png(Capture.Current(640, 360), 640, 360));
            foreach (var (d, on) in dofs) d.active = on;
            // a fifth with the previs picture (no post, no Stylize pass), a sixth with each text on its own material copy
            Quality.Previs(true);
            var p5 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_e.png"); File.WriteAllBytes(p5, Capture.Png(Capture.Current(640, 360), 640, 360));
            Quality.Previs(false); Quality.Set(false);
            var texts = UnityEngine.Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None).Where(x => x.transform.root.name == "_Generated").ToArray();
            var shared = texts.Select(x => x.fontSharedMaterial).ToArray();
            foreach (var x in texts) x.fontMaterial = new Material(x.fontSharedMaterial);
            var p6 = Path.Combine(Video.Captures, $"gfx_{t:0000.000}_f.png"); File.WriteAllBytes(p6, Capture.Png(Capture.Current(640, 360), 640, 360));
            for (int i = 0; i < texts.Length; i++) texts[i].fontSharedMaterial = shared[i];
            var mat = shared.FirstOrDefault(x => x);
            string props = mat ? string.Join(" ", new[] { "_FaceColor", "_FaceDilate", "_OutlineWidth", "_WeightNormal", "_ScaleRatioA", "_GradientScale", "_ScaleX", "_ScaleY", "_Sharpness", "_PerspectiveFilter", "_VertexOffsetX", "_MaskSoftnessX" }.Where(mat.HasProperty).Select(k => k + "=" + (k == "_FaceColor" ? mat.GetColor(k).ToString() : mat.GetFloat(k).ToString("0.###")))) + " queue " + mat.renderQueue + " tex " + (mat.mainTexture ? mat.mainTexture.name : "none") : null;
            var cv = UnityEngine.Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None).Where(c => c.name == "Overlay").Select(c => $"{c.renderMode} plane {c.planeDistance} cam {(c.worldCamera ? c.worldCamera.name + " near " + c.worldCamera.nearClipPlane : "none")} layer {c.gameObject.layer} channels {c.additionalShaderChannels}").ToArray();
            Quality.Set(true); Transport.Seek(keep);
            return new { asSeen = a, afterForce = b, canvases = cv, props, frames = new[] { p1, p2, p3, p4, p5, p6 } };
        }
    }
}
