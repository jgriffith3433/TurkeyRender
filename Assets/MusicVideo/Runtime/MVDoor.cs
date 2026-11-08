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
        /// <summary>A polished floor instead of a door: the camera is the main camera mirrored in the quad's plane, as a proper camera, so the image is flipped left to right (MV/FloorMirror undoes it). Costs a render only while the main camera is over the quad.</summary>
        public bool mirror;

        static readonly List<MVDoor> All = new List<MVDoor>();

        void OnEnable() { All.Add(this); RenderPipelineManager.beginCameraRendering += Before; }
        void OnDisable() { All.Remove(this); RenderPipelineManager.beginCameraRendering -= Before; }
        void Update() { if (cam) cam.enabled = Showing; if (mirror && view) view.forceRenderingOff = !Over; }

        bool Over
        {
            get
            {
                var m = Camera.main; if (!m || !view) return false;
                var b = view.bounds; var p = m.transform.position;
                return p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y > b.center.y;
            }
        }

        bool Showing => view && view.enabled && (!mirror || Over);

        void Before(ScriptableRenderContext ctx, Camera c) { if (c == cam) Sync(); }

        public void Sync()
        {
            var main = Camera.main; if (!main || !cam || !view) return;
            var door = view.transform;
            if (mirror)
            {
                float y = door.position.y;
                var mp = main.transform.position; mp.y = 2 * y - mp.y;
                var mf = main.transform.forward; mf.y = -mf.y; var mu = main.transform.up; mu.y = -mu.y;
                cam.transform.SetPositionAndRotation(mp, Quaternion.LookRotation(mf, mu));
                cam.fieldOfView = main.fieldOfView; cam.aspect = main.aspect;
                cam.ResetProjectionMatrix();
                var w = cam.worldToCameraMatrix;
                var pp = w.MultiplyPoint(door.position); var pn = w.MultiplyVector(Vector3.up).normalized;
                cam.projectionMatrix = cam.CalculateObliqueMatrix(new Vector4(pn.x, pn.y, pn.z, -Vector3.Dot(pp, pn)));
                return;
            }
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
            foreach (var d in All)
            {
                if (d.mirror && d.view) d.view.forceRenderingOff = !d.Over;
                if (d.Showing && d.cam) { d.Sync(); d.cam.Render(); }
            }
        }
    }
}
