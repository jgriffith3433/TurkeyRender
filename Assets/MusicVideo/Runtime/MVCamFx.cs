using UnityEngine;

namespace TKShock.MV
{
    /// <summary>Handheld, shake, roll and punch-zoom. Fed by the Post track, and a pure function of time.</summary>
    [ExecuteAlways]
    public class MVCamFx : Unity.Cinemachine.CinemachineExtension
    {
        public float handheld, aperture;
        public float fovFrom, fovTo; public double fovStart, fovEnd; public string fovEase; // a crash zoom or dolly zoom, by timeline position
        public Transform focus;
        /// <summary>Where this shot aims over time, baked at build with a dead zone, so the camera doesn't twitch with every move the subject makes. A pure function of time.</summary>
        [HideInInspector] public Vector3[] aimPath; public double aimStart; public float aimStep = .2f;

        Vector3 Aim(double t)
        {
            float x = Mathf.Clamp((float)((t - aimStart) / aimStep), 0, aimPath.Length - 1.001f);
            // Through the points, not eased between them: easing stopped the camera dead every 0.2 s on a subject that kept moving.
            int i = (int)x, n = aimPath.Length; float k = x - i;
            Vector3 a = aimPath[Mathf.Max(i - 1, 0)], b = aimPath[i], c = aimPath[i + 1], d = aimPath[Mathf.Min(i + 2, n - 1)];
            return .5f * (2 * b + (c - a) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (3 * b - a - 3 * c + d) * k * k * k);
        }

        protected override void PostPipelineStageCallback(Unity.Cinemachine.CinemachineVirtualCameraBase vcam,
            Unity.Cinemachine.CinemachineCore.Stage stage, ref Unity.Cinemachine.CameraState state, float deltaTime)
        {
            if (stage == Unity.Cinemachine.CinemachineCore.Stage.Body && aimPath != null && aimPath.Length > 1)
            {
                state.ReferenceLookAt = Aim(MVClock.T); return;
            }
            if (stage != Unity.Cinemachine.CinemachineCore.Stage.Finalize) return;
            float t = (float)(MVClock.Song ? MVClock.Song.WarpRaw(MVClock.T) : MVClock.T);
            if (vcam.LookAt)
            {
                // The world bends in the vertex shader, so aim where the body is drawn, not where its transform is.
                var tp = vcam.LookAt.position; var cp = state.RawPosition;
                var wp = MVClock.WarpPoint(tp);
                if ((wp - tp).sqrMagnitude > 1e-6f && (tp - cp).sqrMagnitude > 1e-3f && (wp - cp).sqrMagnitude > 1e-3f)
                {
                    var q = Quaternion.FromToRotation(tp - cp, wp - cp);
                    state.OrientationCorrection = Quaternion.Inverse(state.RawOrientation) * q * state.RawOrientation * state.OrientationCorrection;
                }
            }
            float amp = MVClock.Shake * .6f, hh = (handheld + MVClock.Handheld) * .45f; // J: the camera shook too much
            var pos = new Vector3(N(t * MVClock.ShakeSpeed, 1), N(t * MVClock.ShakeSpeed, 2), N(t * MVClock.ShakeSpeed, 3)) * amp
                    + new Vector3(N(t * .9f, 4), N(t * 1.1f, 5), N(t * .7f, 6)) * (hh * .12f);
            var rot = new Vector3(N(t * MVClock.ShakeSpeed, 7), N(t * MVClock.ShakeSpeed, 8), 0) * (amp * 3f)
                    + new Vector3(N(t * .8f, 9), N(t, 10), 0) * (hh * 1.2f);
            var lens = state.Lens;
            float roll = 0;
            if (MVEpic.Trauma > 0 || MVEpic.Heavy > 0)
            {
                // Trauma shake (Eiserloh): trauma squared times the maximum, smooth noise at 16 Hz on song time (it runs on through a hitstop, as the camera
                // does), mostly rotation: roll 2.5 degrees, pitch and yaw worth 1.5% of the frame. Heavy: the slow 3.5 Hz sway of a planet's weight.
                float tt = (float)MVClock.T, s = MVEpic.Trauma * MVEpic.Trauma, hv = MVEpic.Heavy * MVEpic.Heavy, fov = lens.FieldOfView;
                rot += new Vector3(N(tt * 16, 11) * fov * .015f * s + N(tt * 3.5f, 14) * fov * .035f * hv, N(tt * 16, 12) * fov * .015f * s + N(tt * 3.1f, 16) * fov * .035f * hv, 0);
                roll = N(tt * 16, 13) * 2.5f * s + N(tt * 2.7f, 15) * 1.6f * hv;
            }
            state.PositionCorrection += (state.RawOrientation * state.OrientationCorrection) * pos;
            state.OrientationCorrection *= Quaternion.Euler(rot.x, rot.y, MVClock.Dutch + roll);
            if (fovTo > 0)
            {
                float k = Ease.Apply(string.IsNullOrEmpty(fovEase) ? "linear" : fovEase, (float)((MVClock.T - fovStart) / System.Math.Max(fovEnd - fovStart, 1e-4)));
                lens.FieldOfView = Mathf.LerpUnclamped(fovFrom, fovTo, k);
            }
            lens.FieldOfView = Mathf.Clamp(lens.FieldOfView * (1 + MVClock.Zoom), 2, 170);
            if (MVEpic.Punch > 0) lens.FieldOfView = Mathf.Clamp(lens.FieldOfView * (1 - MVEpic.Punch), 2, 170);   // FOV punch: in, then back
            state.Lens = lens;
            if (vcam.IsLive)
            {
                // Where the TV sits on screen, from this frame's camera, so swirls and zooms never depend on the previous frame.
                var p = Quaternion.Inverse(state.RawOrientation * state.OrientationCorrection) * (MVClock.SuckPoint - (state.RawPosition + state.PositionCorrection));
                float h = Mathf.Tan(lens.FieldOfView * .5f * Mathf.Deg2Rad), asp = lens.Aspect > 0 ? lens.Aspect : 16f / 9;
                var c = p.z > .01f ? new Vector4(Mathf.Clamp(.5f + p.x / (2 * p.z * h * asp), -.3f, 1.3f), Mathf.Clamp(.5f + p.y / (2 * p.z * h), -.3f, 1.3f), 0, 0) : new Vector4(.5f, .5f, 0, 0);
                Shader.SetGlobalVector("_MV_Center", c);
            }
            if (focus && MVClock.Dof && vcam.IsLive)
            {
                MVClock.Dof.focusDistance.value = Mathf.Max(.1f, Vector3.Distance(state.RawPosition + state.PositionCorrection, focus.position));
                if (aperture > 0) MVClock.Dof.aperture.value = aperture;
            }
        }

        static float N(float t, float s) => (Mathf.PerlinNoise(t, s * 7.31f) - .5f) * 2;
    }
}
