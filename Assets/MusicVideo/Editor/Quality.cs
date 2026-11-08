using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Two speeds. Preview keeps playback in Unity smooth on this laptop's integrated graphics. Final is everything,
    /// used automatically for captures of record and the render. J never has to think about it.
    /// </summary>
    public static class Quality
    {
        public static bool Preview { get; private set; }

        public static void Set(bool preview, float scale = .55f)
        {
            Preview = preview;
            MVClock.Preview = preview;
            var asset = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (asset) { asset.renderScale = preview ? scale : 1; asset.shadowDistance = preview ? 25 : 50; }
            foreach (var cam in Object.FindObjectsByType<UniversalAdditionalCameraData>(FindObjectsSortMode.None))
                if (cam.name == "Main Camera") cam.antialiasing = preview ? AntialiasingMode.None : AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            foreach (var r in Resources.FindObjectsOfTypeAll<UniversalRendererData>())
                foreach (var f in r.rendererFeatures)
                    if (f != null && f.GetType().Name.Contains("AmbientOcclusion")) f.SetActive(!preview);
        }

        /// <summary>The final picture, every look key and the depth of field, at whatever size the render asks. Only the edge smoothing is left off.</summary>
        public static void Draft()
        {
            Set(false);
            foreach (var cam in Object.FindObjectsByType<UniversalAdditionalCameraData>(FindObjectsSortMode.None))
                if (cam.name == "Main Camera") cam.antialiasing = AntialiasingMode.None;
        }

        /// <summary>The fastest honest picture: no post, no AO, no shadows, no Stylize pass. For previs. Previs(false) puts it all back.</summary>
        public static void Previs(bool on)
        {
            Set(true, on ? 1f : .55f);
            if (GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset asset && on) asset.shadowDistance = 0;
            foreach (var cam in Object.FindObjectsByType<UniversalAdditionalCameraData>(FindObjectsSortMode.None))
                if (cam.name == "Main Camera") cam.renderPostProcessing = !on;
            foreach (var r in Resources.FindObjectsOfTypeAll<UniversalRendererData>())
                foreach (var f in r.rendererFeatures)
                    if (f is FullScreenPassRendererFeature) f.SetActive(!on);
        }

        [BridgeCommand("quality")]
        static object Cmd(JObject m) { Set((bool?)m["preview"] ?? true, (float?)m["scale"] ?? .55f); return Preview; }
    }
}
