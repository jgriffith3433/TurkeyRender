using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace TKShock.MV
{
    /// <summary>
    /// A doorway that looks somewhere else. The quad draws what a second camera sees, sampled in screen space, so it moves
    /// with parallax like a real opening. The camera is the main camera carried through the door (offset, then turn), and
    /// nothing between it and the far doorway is drawn. It keeps no state: the pose comes from the main camera on each render.
    /// </summary>
    [ExecuteAlways]
    public class MVDoor : MonoBehaviour
    {
        public Camera cam;
        public Renderer view;
        public Vector3 offset;
        public float turn, clipPad = .05f;

        static readonly List<MVDoor> All = new List<MVDoor>();

        void OnEnable() { All.Add(this); RenderPipelineManager.beginCameraRendering += Before; }
        void OnDisable() { All.Remove(this); RenderPipelineManager.beginCameraRendering -= Before; }
        void Update() { if (cam) cam.enabled = Showing; }

        bool Showing => view && view.enabled;

        void Before(ScriptableRenderContext ctx, Camera c) { if (c == cam) Sync(); }

        public void Sync()
        {
            var main = Camera.main; if (!main || !cam || !view) return;
            var door = view.transform;
            var q = Quaternion.AngleAxis(turn, Vector3.up);
            var far = door.position + offset;
            cam.transform.SetPositionAndRotation(far + q * (main.transform.position - door.position), q * main.transform.rotation);
            cam.fieldOfView = main.fieldOfView; cam.aspect = main.aspect;
            cam.ResetProjectionMatrix();
            var n = q * door.forward; // the way you look through it
            if (Vector3.Dot(n, far - cam.transform.position) <= 0) return; // the camera is past the door: no clip plane to set
            var m = cam.worldToCameraMatrix;
            var p = m.MultiplyPoint(far + n * clipPad); var cn = m.MultiplyVector(n).normalized;
            cam.projectionMatrix = cam.CalculateObliqueMatrix(new Vector4(cn.x, cn.y, cn.z, -Vector3.Dot(p, cn)));
        }

        /// <summary>Captures draw offscreen, so they ask for the doors first.</summary>
        public static void RenderAll()
        {
            foreach (var d in All) if (d.Showing && d.cam) { d.Sync(); d.cam.Render(); }
        }
    }
}
