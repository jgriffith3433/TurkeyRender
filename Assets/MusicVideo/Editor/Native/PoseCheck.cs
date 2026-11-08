using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Pose check: every key of a pose sheet on HIS rig, played the native way (his Animator, his Humanoid Avatar, the keyed clip, no Foot IK), drawn from
    /// the front, the side and three-quarter with his own materials, plus a black silhouette, one row per key, into one contact image; and the clip played
    /// at 24 fps into an mp4. Each key is also measured as a body (hip, knee, ankle, neck, shoulder, elbow, finger angles in degrees, against his own
    /// body: see `Angles`), and the playback is measured for snaps and toe motion. Agents judge poses from these, never from the numbers alone.
    /// `mv call posecheck '{"sheet":"zg_neutral"}'` (also `"variant":"a"`, `"derive":false` to use the clip as it is, `"play":false`, `"secs":6`,
    /// `"views":["three","side"]`, `"w":640,"h":720`, `"bg":[.05,.05,.07]`, `"label":"proof"`). Writes Director/library/poses/check/&lt;clip&gt;[_label].png,
    /// .mp4 and .json. One baked mesh per skinned part, re-baked each frame (well under the 64-frame mesh cap); the copy of him is DontSave and destroyed.
    /// </summary>
    public static class PoseCheck
    {
        const int Layer = 31;
        static readonly Vector3 Origin = new Vector3(-1200, 40, -1200);

        class Rig { public Camera cam; public GameObject sun, fill; public RenderTexture rt; public Texture2D tex; public Material black; }

        class Body
        {
            public GameObject go; public Animator an; public PlayableGraph g; public AnimationClipPlayable p;
            public List<(SkinnedMeshRenderer s, Mesh m)> skins = new List<(SkinnedMeshRenderer, Mesh)>();
            public List<Renderer> rigid = new List<Renderer>();
            public MVActor src;
            public Transform B(HumanBodyBones b) => an.GetBoneTransform(b);
            public Vector3 LocalFwd(HumanBodyBones b) => src.humanRest.Length > (int)b ? Quaternion.Inverse(src.humanRest[(int)b]) * Vector3.forward : Vector3.forward;
            public Vector3 LocalUp(HumanBodyBones b) => src.humanRest.Length > (int)b ? Quaternion.Inverse(src.humanRest[(int)b]) * Vector3.up : Vector3.up;
            public (Vector3 up, Vector3 fwd, Vector3 right) Frame(HumanBodyBones hb)
            {
                var t = B(hb); var up = (t.rotation * LocalUp(hb)).normalized; var f = t.rotation * LocalFwd(hb); f = (f - up * Vector3.Dot(f, up)).normalized;
                return (up, f, Vector3.Cross(up, f));
            }
            public void At(double t) { p.SetTime(t); g.Evaluate(0); }
        }

        static Body Make(MVActor person, AnimationClip clip)
        {
            var b = new Body { src = person };
            b.go = UnityEngine.Object.Instantiate(person.animRoot); b.go.hideFlags = HideFlags.DontSave; b.go.name = "__posecheck"; b.go.SetActive(true);
            b.go.transform.SetPositionAndRotation(Origin, Quaternion.identity); b.go.transform.localScale = person.animRoot.transform.lossyScale;
            foreach (var t in b.go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = Layer;
            foreach (var r in b.go.GetComponentsInChildren<Renderer>(true))
            {
                bool extra = r.gameObject.hideFlags != HideFlags.None || r.name.Contains("feather") || r.name.Contains("stretch");
                r.SetPropertyBlock(null); r.forceRenderingOff = true;
                if (extra) continue;
                if (r is SkinnedMeshRenderer sk && sk.sharedMesh)
                {
                    for (int i = 0; i < sk.sharedMesh.blendShapeCount; i++) sk.SetBlendShapeWeight(i, 0);
                    b.skins.Add((sk, new Mesh { hideFlags = HideFlags.HideAndDontSave, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }));
                }
                else if (r is MeshRenderer && r.TryGetComponent<MeshFilter>(out var mf) && mf.sharedMesh) b.rigid.Add(r);
            }
            b.an = b.go.GetComponentInChildren<Animator>(true); b.an.enabled = true; b.an.applyRootMotion = false; b.an.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            b.g = PlayableGraph.Create("posecheck"); b.g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
            b.p = AnimationClipPlayable.Create(b.g, clip); b.p.SetApplyFootIK(false);
            AnimationPlayableOutput.Create(b.g, "o", b.an).SetSourcePlayable(b.p);
            return b;
        }

        static void Free(Body b)
        {
            if (b == null) return;
            if (b.g.IsValid()) b.g.Destroy();
            foreach (var (_, m) in b.skins) UnityEngine.Object.DestroyImmediate(m);
            if (b.go) UnityEngine.Object.DestroyImmediate(b.go);
        }

        static Rig MakeRig(int w, int h)
        {
            var r = new Rig();
            var go = new GameObject("__posecheckCam") { hideFlags = HideFlags.HideAndDontSave }; r.cam = go.AddComponent<Camera>();
            r.cam.enabled = false; r.cam.clearFlags = CameraClearFlags.SolidColor; r.cam.nearClipPlane = .05f; r.cam.farClipPlane = 60; r.cam.fieldOfView = 24; r.cam.cullingMask = 1 << Layer;
            Light L(string n, Color c, float i, Vector3 dir, bool shadows)
            {
                var lg = new GameObject(n) { hideFlags = HideFlags.HideAndDontSave }; var l = lg.AddComponent<Light>();
                l.type = LightType.Directional; l.color = c; l.intensity = i; l.shadows = shadows ? LightShadows.Soft : LightShadows.None; l.cullingMask = 1 << Layer;
                lg.transform.rotation = Quaternion.LookRotation(dir); return l;
            }
            r.sun = L("__posecheckSun", new Color(1, .96f, .9f), 2.0f, new Vector3(.6f, -.55f, .55f), true).gameObject;
            r.fill = L("__posecheckRim", new Color(.55f, .65f, 1f), .7f, new Vector3(-.5f, .2f, -.8f), false).gameObject;
            r.rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32) { antiAliasing = 4 };
            r.tex = new Texture2D(w, h, TextureFormat.RGB24, false);
            var unlit = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Hidden/Internal-Colored");
            r.black = new Material(unlit) { hideFlags = HideFlags.HideAndDontSave }; r.black.SetColor("_BaseColor", Color.black); r.black.SetColor("_Color", Color.black); if (r.black.HasProperty("_Cull")) r.black.SetFloat("_Cull", 0);
            return r;
        }

        static void FreeRig(Rig r)
        {
            if (r == null) return;
            UnityEngine.Object.DestroyImmediate(r.cam.gameObject); UnityEngine.Object.DestroyImmediate(r.sun); UnityEngine.Object.DestroyImmediate(r.fill);
            r.rt.Release(); UnityEngine.Object.DestroyImmediate(r.rt); UnityEngine.Object.DestroyImmediate(r.tex); UnityEngine.Object.DestroyImmediate(r.black);
        }

        static Bounds Bake(Body b)
        {
            var bb = new Bounds(); bool any = false;
            foreach (var (s, m) in b.skins)
            {
                s.BakeMesh(m, true);
                var mx = Matrix4x4.TRS(s.transform.position, s.transform.rotation, Vector3.one); var lb = m.bounds;
                foreach (var c in new[] { -1, 1 }.SelectMany(x => new[] { -1, 1 }.SelectMany(y => new[] { -1, 1 }.Select(z => new Vector3(x, y, z)))))
                {
                    var wp = mx.MultiplyPoint3x4(lb.center + Vector3.Scale(lb.extents, c));
                    if (!any) { bb = new Bounds(wp, Vector3.zero); any = true; } else bb.Encapsulate(wp);
                }
            }
            return bb;
        }

        /// <summary>Draws the body as baked this tick into one viewport of the rig's texture.</summary>
        static void Draw(Rig r, Body b, Rect vp, Vector3 dir, Vector3 aim, float dist, bool silhouette, Color bg)
        {
            r.cam.rect = vp; r.cam.backgroundColor = silhouette ? Color.white : bg; r.cam.targetTexture = r.rt;
            r.cam.transform.position = aim + dir.normalized * dist; r.cam.transform.LookAt(aim, Vector3.up);
            foreach (var (s, m) in b.skins)
            {
                var mx = Matrix4x4.TRS(s.transform.position, s.transform.rotation, Vector3.one);
                for (int sub = 0; sub < m.subMeshCount; sub++) Graphics.DrawMesh(m, mx, silhouette ? r.black : s.sharedMaterials[Mathf.Min(sub, s.sharedMaterials.Length - 1)], Layer, r.cam, sub);
            }
            foreach (var rr in b.rigid)
            {
                var mf = rr.GetComponent<MeshFilter>();
                for (int sub = 0; sub < mf.sharedMesh.subMeshCount; sub++) Graphics.DrawMesh(mf.sharedMesh, rr.transform.localToWorldMatrix, silhouette ? r.black : rr.sharedMaterials[Mathf.Min(sub, rr.sharedMaterials.Length - 1)], Layer, r.cam, sub);
            }
            r.cam.Render();
        }

        static byte[] Grab(Rig r)
        {
            var prev = RenderTexture.active; RenderTexture.active = r.rt;
            r.tex.ReadPixels(new Rect(0, 0, r.rt.width, r.rt.height), 0, 0, false); r.tex.Apply(false);
            RenderTexture.active = prev; return r.tex.GetRawTextureData();
        }
        static void Clear(Rig r, Color c) { var prev = RenderTexture.active; RenderTexture.active = r.rt; GL.Clear(true, true, c); RenderTexture.active = prev; }

        static Vector3 ViewDir(string v, Vector3 fwd, Vector3 right)
        {
            switch (v)
            {
                case "front": return fwd;
                case "back": return -fwd;
                case "side": return right;            // from his right: he faces screen right... his left is away
                case "left": return -right;
                case "top": return Vector3.up + fwd * .02f;
                default: return (fwd + right * 1.0f).normalized;   // "three": front three-quarter from his right
            }
        }

        // ---------------- measuring a body ----------------

        static float R1(float x) => (float)Math.Round(x, 1);

        /// <summary>The angles the NASA neutral body posture tables use, read off the posed skeleton. The body frame is the pelvis: up from the hips to the neck,
        /// forward the hips' own forward. Hip and shoulder flexion are the thigh's or upper arm's swing forward in the body's side plane, from hanging straight
        /// down; abduction the swing out in the front plane; knee and elbow 180 minus the joint's inside angle; ankle plantar flexion the shin-to-foot angle
        /// past 90 (foot pointing down is positive); neck flexion the head's pitch down against the chest; waist flexion the chest's pitch forward against the
        /// hips; finger curl the clip catalog's measure (0 flat, about 90 a loose fist); toes the toe bone's angle against its rest in the foot.</summary>
        static JObject Angles(Body b)
        {
            Transform B(HumanBodyBones x) => b.B(x);
            var hips = B(HumanBodyBones.Hips); var neck = B(HumanBodyBones.Neck) ?? B(HumanBodyBones.Head); var head = B(HumanBodyBones.Head);
            var chest = B(HumanBodyBones.UpperChest) ?? B(HumanBodyBones.Chest) ?? B(HumanBodyBones.Spine);
            var up = (neck.position - hips.position).normalized;
            var hf = hips.rotation * b.LocalFwd(HumanBodyBones.Hips); var fwd = (hf - up * Vector3.Dot(hf, up)).normalized; var right = Vector3.Cross(up, fwd);
            var pel = b.Frame(HumanBodyBones.Hips);
            var chB = B(HumanBodyBones.UpperChest) ? HumanBodyBones.UpperChest : B(HumanBodyBones.Chest) ? HumanBodyBones.Chest : HumanBodyBones.Spine; var chf = b.Frame(chB);
            float Swing(Vector3 d, Vector3 axis, Vector3 down) => Mathf.Atan2(Vector3.Dot(d, axis), Vector3.Dot(d, down)) * Mathf.Rad2Deg;
            float Inside(Transform a, Transform m, Transform c) => 180 - Vector3.Angle(a.position - m.position, c.position - m.position);
            JObject Leg(string side, HumanBodyBones ul, HumanBodyBones ll, HumanBodyBones ft, HumanBodyBones toe, float outSign)
            {
                Transform u = B(ul), l = B(ll), f = B(ft), t = B(toe); var thigh = l.position - u.position;
                var o = new JObject { ["hipFlex"] = R1(Swing(thigh, pel.fwd, -pel.up)), ["hipAbd"] = R1(Swing(thigh, pel.right * outSign, -pel.up)), ["knee"] = R1(Inside(u, l, f)) };
                o["anklePF"] = R1(Vector3.Angle(l.position - f.position, f.rotation * b.LocalFwd(ft)) - 90);
                if (t && b.src.humanRest.Length > (int)toe) o["toes"] = R1(Quaternion.Angle(t.localRotation, Quaternion.Inverse(b.src.humanRest[(int)ft]) * b.src.humanRest[(int)toe]));
                return o;
            }
            JObject Arm(HumanBodyBones ua, HumanBodyBones la, HumanBodyBones hd, float outSign)
            {
                Transform u = B(ua), l = B(la), h = B(hd); var a = l.position - u.position;
                return new JObject { ["shFlex"] = R1(Swing(a, chf.fwd, -chf.up)), ["shAbd"] = R1(Swing(a, chf.right * outSign, -chf.up)), ["elbow"] = R1(Inside(u, l, h)) };
            }
            var chestF = chest.rotation * b.LocalFwd(chest == B(HumanBodyBones.UpperChest) ? HumanBodyBones.UpperChest : chest == B(HumanBodyBones.Chest) ? HumanBodyBones.Chest : HumanBodyBones.Spine);
            var headF = head.rotation * b.LocalFwd(HumanBodyBones.Head);
            float neckFlex = Vector3.SignedAngle(Vector3.ProjectOnPlane(chestF, right), Vector3.ProjectOnPlane(headF, right), right);
            var spineLow = (B(HumanBodyBones.Spine) ?? hips).position;
            float waist = Vector3.SignedAngle(Vector3.ProjectOnPlane(spineLow - hips.position, right), Vector3.ProjectOnPlane(neck.position - chest.position, right), right);
            float Curl(HumanBodyBones hand, int first)
            {
                var hb = B(hand); var c = new List<float>();
                for (int i = 1; i < 5; i++)
                {
                    var p = B((HumanBodyBones)(first + i * 3)); var m = B((HumanBodyBones)(first + i * 3 + 1)); var d = B((HumanBodyBones)(first + i * 3 + 2));
                    if (p && m && d) c.Add(Vector3.Angle(p.position - hb.position, d.position - m.position));
                }
                return c.Count > 0 ? R1(c.Average()) : 0;
            }
            var worldUp = Vector3.Angle(up, Vector3.up);
            var faceDir = headF; float headWorldPitch = Mathf.Asin(Mathf.Clamp(faceDir.normalized.y, -1, 1)) * Mathf.Rad2Deg;
            return new JObject
            {
                ["left"] = new JObject { ["leg"] = Leg("L", HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, -1), ["arm"] = Arm(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, -1), ["fingerCurl"] = Curl(HumanBodyBones.LeftHand, (int)HumanBodyBones.LeftThumbProximal) },
                ["right"] = new JObject { ["leg"] = Leg("R", HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, HumanBodyBones.RightToes, 1), ["arm"] = Arm(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, 1), ["fingerCurl"] = Curl(HumanBodyBones.RightHand, (int)HumanBodyBones.RightThumbProximal) },
                ["neckFlex"] = R1(neckFlex), ["waistFlex"] = R1(waist), ["torsoFromVertical"] = R1(worldUp), ["headPitchWorld"] = R1(headWorldPitch),
            };
        }

        // ---------------- the command ----------------

        [BridgeCommand("posecheck")]
        static object Run(JObject m)
        {
            var person = MVActor.Named((string)m?["on"] ?? "person"); if (!person || !person.animRoot) throw new Exception("no person in the open scene");
            AnimationClip clip; PoseDerive.Sheet sh = null; JObject derived = null;
            string sheetName = (string)m["sheet"];
            if (sheetName != null)
            {
                var j = PoseDerive.LoadJson(sheetName); sh = PoseDerive.Parse(j, (string)m["variant"]);
                if ((bool?)m["derive"] != false) { clip = PoseDerive.Write(sh, out derived); AssetDatabase.SaveAssets(); }
                else clip = PoseDerive.FindClip(sh.name);
            }
            else clip = PoseDerive.FindClip((string)m["clip"] ?? throw new Exception("posecheck needs a sheet or a clip"));
            if (!clip) throw new Exception("no clip to check (derive it first)");
            string label = (string)m["label"]; string baseName = clip.name + (label != null ? "_" + label : "");
            string outDir = Path.Combine(Bridge.Root, (string)m["out"] ?? "library/poses/check"); Directory.CreateDirectory(outDir);
            Color bg = m["bg"] is JArray bga && bga.Count >= 3 ? new Color((float)bga[0], (float)bga[1], (float)bga[2]) : new Color(.30f, .33f, .38f);
            var result = new JObject { ["clip"] = clip.name, ["length"] = Math.Round(clip.length, 3) };
            if (derived != null) result["derived"] = derived;
            var clock = System.Diagnostics.Stopwatch.StartNew();
            Body b = null; Rig rig = null;
            bool fog = RenderSettings.fog; var amb = RenderSettings.ambientLight; var ambMode = RenderSettings.ambientMode;
            try
            {
                RenderSettings.fog = false; RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(.42f, .45f, .52f);
                b = Make(person, clip);
                // the frame: his facing at time 0 and a box round every pose he takes, so every tile of every key is at one scale
                b.At(0);
                var hf = b.B(HumanBodyBones.Hips).rotation * b.LocalFwd(HumanBodyBones.Hips); hf.y = 0;
                var fwd = hf.sqrMagnitude > .01f ? hf.normalized : Vector3.forward; var right = Vector3.Cross(Vector3.up, fwd);
                var times = new List<(string name, double t, string note)>();
                if (sh != null) for (int i = 0; i < sh.keys.Count; i++) { var k = sh.keys[i]; times.Add((k.name, PoseDerive.ShowTime(sh, i), $"{k.interp}{(k.step > 0 ? " on " + k.step + "s" : "")}")); }
                else foreach (var t in (m["times"] as JArray ?? new JArray(0.0, clip.length * .5, clip.length)).Select(x => (double)x)) times.Add(("t", t, ""));
                if ((int?)m["maxKeys"] is int mk && times.Count > mk) times = times.Take(mk).ToList();
                double len = clip.length; int boundsN = 24; Bounds all = default; bool have = false;
                for (int i = 0; i <= boundsN; i++) { b.At(len * i / boundsN); var bb = Bake(b); if (!have) { all = bb; have = true; } else all.Encapsulate(bb); }
                foreach (var tk in times) { b.At(tk.t); all.Encapsulate(Bake(b)); }
                float radius = all.extents.magnitude; var aim = all.center;
                float Fit(float vfovDeg, float aspect, float pad)
                {
                    float hv = vfovDeg * Mathf.Deg2Rad * .5f, hh = Mathf.Atan(Mathf.Tan(hv) * aspect), side = Mathf.Max(all.extents.x, all.extents.z) * 1.1f;
                    return Mathf.Max(all.extents.y / Mathf.Tan(hv), side / Mathf.Tan(hh)) * pad + side;
                }

                // ---- the contact sheet: a row per key, front | side | three-quarter | silhouette ----
                int tw = (int?)m["tileW"] ?? 300, th = (int?)m["tileH"] ?? 380;
                var tileViews = new[] { "front", "side", "three" }; string silView = (string)m["silhouette"] ?? "side";
                rig = MakeRig(tw * 4, th);
                rig.cam.fieldOfView = 24;
                float aspect = tw / (float)th, vfov = rig.cam.fieldOfView * Mathf.Deg2Rad * .5f, hfov = Mathf.Atan(Mathf.Tan(vfov) * aspect);
                float dist = Fit(rig.cam.fieldOfView, aspect, 1.08f);
                var rows = new List<string>(); var keyRows = new JArray();
                for (int ki = 0; ki < times.Count; ki++)
                {
                    var tk = times[ki]; b.At(tk.t); Bake(b);
                    Clear(rig, Color.black);
                    for (int v = 0; v < 4; v++)
                    {
                        string view = v < 3 ? tileViews[v] : silView;
                        Draw(rig, b, new Rect(v * .25f + .002f, 0, .246f, 1), ViewDir(view, fwd, right), aim, dist, v == 3, bg);
                    }
                    var raw = Grab(rig); var png = new Texture2D(rig.rt.width, rig.rt.height, TextureFormat.RGB24, false); png.LoadRawTextureData(raw); png.Apply(false);
                    var rowFile = Path.Combine(outDir, $"_{baseName}_row{ki}.png"); File.WriteAllBytes(rowFile, ImageConversion.EncodeToPNG(png)); UnityEngine.Object.DestroyImmediate(png);
                    rows.Add(rowFile);
                    keyRows.Add(new JObject { ["key"] = tk.name, ["t"] = Math.Round(tk.t, 3), ["interp"] = tk.note, ["angles"] = Angles(b) });
                }
                rig.cam.targetTexture = null;
                string sheetPng = Path.Combine(outDir, baseName + ".png");
                Compose(rows, times.Select(x => $"{x.name}  t {x.t:0.00}s  {x.note}").ToList(), sheetPng, tw, th, silView);
                foreach (var r in rows) File.Delete(r);
                result["contact"] = sheetPng; result["keys"] = keyRows;
                if (sh != null && (bool?)m["table"] != false) result["muscles"] = PoseDerive.KeyTable(sh);
                FreeRig(rig); rig = null;

                // ---- playback at 24 fps ----
                if ((bool?)m["play"] != false)
                {
                    var views = (m["views"] as JArray)?.Select(x => (string)x).ToArray() ?? new[] { "front", "three", "side" };
                    int pw = (int?)m["w"] ?? 400, ph = (int?)m["h"] ?? 500; double fps = (double?)m["fps"] ?? 24;
                    double secs = (double?)m["secs"] ?? Math.Max(len, 1); int n = Mathf.Max(2, (int)Math.Round(secs * fps));
                    rig = MakeRig(pw * views.Length, ph); rig.cam.fieldOfView = (float?)m["fov"] ?? 24;
                    float pa = pw / (float)ph, pv = rig.cam.fieldOfView * Mathf.Deg2Rad * .5f, phf = Mathf.Atan(Mathf.Tan(pv) * pa);
                    float pd = Fit(rig.cam.fieldOfView, pa, (float?)m["frame"] ?? 1.08f);
                    string mp4 = Path.Combine(outDir, baseName + ".mp4");
                    string names = string.Join("   |   ", views);
                    var font = "C\\:/Windows/Fonts/arial.ttf";
                    var vf = $"vflip,drawtext=fontfile='{font}':text='{clip.name}  {fps} fps   {names}':x=6:y=h-24:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5," +
                             $"drawtext=fontfile='{font}':text='%{{eif\\:floor(t)\\:d}}.%{{eif\\:mod(t*100,100)\\:d\\:2}}  f%{{n}}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6";
                    var enc = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("ffmpeg",
                        $"-y -loglevel error -f rawvideo -pix_fmt rgb24 -s {rig.rt.width}x{rig.rt.height} -r {fps} -i - -vf \"{vf}\" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart \"{mp4}\"")
                    { UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true });
                    var stdin = enc.StandardInput.BaseStream;
                    var bones = Enumerable.Range(0, (int)HumanBodyBones.LastBone).Select(i => b.B((HumanBodyBones)i)).ToArray();
                    Quaternion[] prevQ = null; float worstStep = 0; string worstBone = null; double worstT = 0; float toeMax = 0, toeMin = 999;
                    float headMin = 999, headMax = -999;
                    try
                    {
                        for (int f = 0; f < n; f++)
                        {
                            double t = f / fps; double ct = clip.isLooping ? t % len : Math.Min(t, len);
                            b.At(ct); Bake(b);
                            var q = bones.Select(x => x ? x.localRotation : Quaternion.identity).ToArray();
                            if (prevQ != null) for (int i = 0; i < q.Length; i++) { if (!bones[i] || i >= (int)HumanBodyBones.LeftThumbProximal && i <= (int)HumanBodyBones.RightLittleDistal) continue; float a = Quaternion.Angle(q[i], prevQ[i]); if (a > worstStep) { worstStep = a; worstBone = ((HumanBodyBones)i).ToString(); worstT = t; } }
                            prevQ = q;
                            var ang = Angles(b);
                            foreach (var s in new[] { "left", "right" }) { var to = (float?)ang[s]["leg"]["toes"]; if (to != null) { toeMax = Mathf.Max(toeMax, to.Value); toeMin = Mathf.Min(toeMin, to.Value); } }
                            headMin = Mathf.Min(headMin, (float)ang["neckFlex"]); headMax = Mathf.Max(headMax, (float)ang["neckFlex"]);
                            Clear(rig, bg);
                            for (int v = 0; v < views.Length; v++) Draw(rig, b, new Rect(v / (float)views.Length + .001f, 0, 1f / views.Length - .002f, 1), ViewDir(views[v], fwd, right), aim, pd, false, bg);
                            var raw = Grab(rig); stdin.Write(raw, 0, raw.Length);
                        }
                    }
                    finally { stdin.Close(); enc.WaitForExit(); }
                    rig.cam.targetTexture = null;
                    result["playback"] = new JObject
                    {
                        ["mp4"] = mp4, ["fps"] = fps, ["frames"] = n, ["worstBoneStepDeg"] = R1(worstStep), ["worstBone"] = worstBone, ["worstAt"] = Math.Round(worstT, 3),
                        ["toeAngleRange"] = new JArray(R1(toeMin), R1(toeMax)), ["neckFlexRange"] = new JArray(R1(headMin), R1(headMax)),
                    };
                }
                File.WriteAllText(Path.Combine(outDir, baseName + ".json"), result.ToString());
                result["seconds"] = Math.Round(clock.Elapsed.TotalSeconds, 1);
                return result;
            }
            finally
            {
                RenderSettings.fog = fog; RenderSettings.ambientMode = ambMode; RenderSettings.ambientLight = amb;
                FreeRig(rig); Free(b);
                EditorUtility.UnloadUnusedAssetsImmediate();
            }
        }

        static void Compose(List<string> rows, List<string> labels, string outPng, int tw, int th, string silView)
        {
            var font = "C\\:/Windows/Fonts/arial.ttf";
            var args = new List<string> { "-y", "-loglevel", "error" };
            foreach (var r in rows) { args.Add("-i"); args.Add(r); }
            var fc = new List<string>();
            for (int i = 0; i < rows.Count; i++)
            {
                string lab = labels[i].Replace("'", "").Replace(":", "\\:").Replace("%", "pct");
                string views = $"front|side|three-quarter|silhouette ({silView})";
                fc.Add($"[{i}:v]drawtext=fontfile='{font}':text='{lab}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6," +
                       $"drawtext=fontfile='{font}':text='front':x=6:y=h-22:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5," +
                       $"drawtext=fontfile='{font}':text='side':x={tw}+6:y=h-22:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5," +
                       $"drawtext=fontfile='{font}':text='three-quarter':x={2 * tw}+6:y=h-22:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5," +
                       $"drawtext=fontfile='{font}':text='silhouette {silView}':x={3 * tw}+6:y=h-22:fontsize=14:fontcolor=black[r{i}]");
            }
            string stack = rows.Count == 1 ? "[r0]copy[out]" : string.Concat(Enumerable.Range(0, rows.Count).Select(i => $"[r{i}]")) + $"vstack=inputs={rows.Count}[out]";
            fc.Add(stack);
            args.Add("-filter_complex"); args.Add(string.Join(";", fc)); args.Add("-map"); args.Add("[out]"); args.Add(outPng);
            var psi = new System.Diagnostics.ProcessStartInfo("ffmpeg", string.Join(" ", args.Select(a => "\"" + a.Replace("\"", "\\\"") + "\""))) { UseShellExecute = false, RedirectStandardError = true, CreateNoWindow = true };
            var p = System.Diagnostics.Process.Start(psi); var err = p.StandardError.ReadToEnd(); p.WaitForExit();
            if (p.ExitCode != 0) throw new Exception("ffmpeg contact sheet: " + err);
        }
    }
}
