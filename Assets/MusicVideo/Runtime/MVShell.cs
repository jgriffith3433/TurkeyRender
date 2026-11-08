using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// An actor that is the outside of a room: its roof, ceiling, walls. "shell":true on an actor in a set; "shell":"room" also says
    /// this actor's bounds are a room (the ceiling is the obvious one). While a camera stands inside a room, shells stop casting shadows,
    /// so a directional key reaches the floor and everyone stands in their own shadow. Outside, the house shades the lawn as it should.
    /// Worked out per camera render from where the camera is now and undone straight after, so it holds no state and scrubbing stays exact.
    /// </summary>
    [ExecuteAlways]
    public class MVShell : MonoBehaviour
    {
        public bool room;
        const float Margin = 2; // the threshold counts as inside, so a track through the door doesn't pop on the sill
        static readonly List<MVShell> All = new List<MVShell>();
        static readonly List<Renderer> Off = new List<Renderer>();
        static readonly List<ShadowCastingMode> Was = new List<ShadowCastingMode>();
        Renderer[] _r;

        void OnEnable() { if (!All.Contains(this)) All.Add(this); _r = GetComponentsInChildren<Renderer>(true); }
        void OnDisable() { All.Remove(this); }

#if UNITY_EDITOR
        [UnityEditor.InitializeOnLoadMethod]
#endif
        [RuntimeInitializeOnLoadMethod]
        static void Hook()
        {
            RenderPipelineManager.beginCameraRendering -= Begin; RenderPipelineManager.beginCameraRendering += Begin;
            RenderPipelineManager.endCameraRendering -= End; RenderPipelineManager.endCameraRendering += End;
        }

        static bool Inside(Vector3 p)
        {
            foreach (var s in All)
            {
                if (!s || !s.room || s._r == null) continue;
                foreach (var r in s._r)
                {
                    if (!r) continue;
                    var b = r.bounds;
                    if (p.x > b.min.x - Margin && p.x < b.max.x + Margin && p.z > b.min.z - Margin && p.z < b.max.z + Margin) return true;
                }
            }
            return false;
        }

        static void Begin(ScriptableRenderContext context, Camera cam)
        {
            if (Off.Count > 0 || All.Count == 0 || !Inside(cam.transform.position)) return;
            foreach (var s in All)
            {
                if (!s || s._r == null) continue;
                foreach (var r in s._r)
                {
                    if (!r || r.shadowCastingMode == ShadowCastingMode.Off) continue;
                    Off.Add(r); Was.Add(r.shadowCastingMode);
                    r.shadowCastingMode = ShadowCastingMode.Off;
                }
            }
        }

        static void End(ScriptableRenderContext context, Camera cam)
        {
            for (int i = 0; i < Off.Count; i++) if (Off[i]) Off[i].shadowCastingMode = Was[i];
            Off.Clear(); Was.Clear();
        }
    }
}
