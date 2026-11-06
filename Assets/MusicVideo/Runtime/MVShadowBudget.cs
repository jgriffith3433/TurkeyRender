using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// Keeps each camera to the four nearest shadow-casting spot and point lights. The show sets each have a shadowed key
    /// light, and up to 10 at once hung this laptop's integrated GPU. Worked out per camera render from where things are
    /// now and undone straight after, so it holds no state and scrubbing stays exact.
    /// </summary>
    public static class MVShadowBudget
    {
        const int Budget = 4;
        static readonly List<Light> Shadowed = new List<Light>();
        static readonly List<Light> Off = new List<Light>();
        static readonly List<LightShadows> Was = new List<LightShadows>();

#if UNITY_EDITOR
        [UnityEditor.InitializeOnLoadMethod]
#endif
        [RuntimeInitializeOnLoadMethod]
        static void Hook()
        {
            RenderPipelineManager.beginCameraRendering -= Begin; RenderPipelineManager.beginCameraRendering += Begin;
            RenderPipelineManager.endCameraRendering -= End; RenderPipelineManager.endCameraRendering += End;
        }

        static void Begin(ScriptableRenderContext context, Camera cam)
        {
            Restore();
            Shadowed.Clear();
            foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None))
                if (l.type != LightType.Directional && l.shadows != LightShadows.None && l.isActiveAndEnabled) Shadowed.Add(l);
            if (Shadowed.Count <= Budget) return;
            var at = cam.transform.position;
            Shadowed.Sort((a, b) =>
            {
                int near = (a.transform.position - at).sqrMagnitude.CompareTo((b.transform.position - at).sqrMagnitude);
                return near != 0 ? near : a.GetInstanceID().CompareTo(b.GetInstanceID());
            });
            for (int i = Budget; i < Shadowed.Count; i++)
            {
                Off.Add(Shadowed[i]); Was.Add(Shadowed[i].shadows);
                Shadowed[i].shadows = LightShadows.None;
            }
        }

        static void End(ScriptableRenderContext context, Camera cam) => Restore();

        static void Restore()
        {
            for (int i = 0; i < Off.Count; i++) if (Off[i]) Off[i].shadows = Was[i];
            Off.Clear(); Was.Clear();
        }
    }
}
