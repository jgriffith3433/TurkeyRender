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
    /// The clip catalog (Director/library/motion/catalog.md): every humanoid clip in Motion/ played the native way (his Animator with the Humanoid
    /// Avatar, the clean clip where `clean.use`, Foot IK as the native path sets it) on a throwaway copy of him, measured, and rendered as one small
    /// 30 fps mp4 with two fixed cameras side by side: a front three-quarter full body on the left, a medium on the upper body and hands on the right.
    /// `mv --video hawkespunch call clippreview '{"clips":["mx_hook_punch"],"budget":600}'` writes Director/library/motion/previews/&lt;clip&gt;.mp4 and
    /// &lt;clip&gt;.json. No clip, import setting or scene object is changed; the copy is DontSave and destroyed. No meshes are kept between frames.
    /// </summary>
    public static class MVClipPreview
    {
        const float Fps = 30;
        const int Layer = 31;
        static readonly HumanBodyBones[] LeftFingers = { HumanBodyBones.LeftIndexProximal, HumanBodyBones.LeftMiddleProximal, HumanBodyBones.LeftRingProximal, HumanBodyBones.LeftLittleProximal };
        static readonly HumanBodyBones[] RightFingers = { HumanBodyBones.RightIndexProximal, HumanBodyBones.RightMiddleProximal, HumanBodyBones.RightRingProximal, HumanBodyBones.RightLittleProximal };

        class Rig { public Camera a, b; public GameObject ground, sun; public Material grass; public RenderTexture rt; public Texture2D tex; }

        [BridgeCommand("clippreview")]
        static object Run(JObject m)
        {
            var person = MVActor.Named((string)m?["on"] ?? "person"); if (!person || !person.animRoot) throw new Exception("no person in the open scene");
            string outDir = Path.Combine(Bridge.Root, (string)m?["out"] ?? "library/motion/previews"); Directory.CreateDirectory(outDir);
            int w = (int?)m?["w"] ?? 640, h = (int?)m?["h"] ?? 360;
            float maxSecs = (float?)m?["maxSecs"] ?? 8, minSecs = (float?)m?["minSecs"] ?? 3;
            double budget = (double?)m?["budget"] ?? 600;
            bool force = (bool?)m?["force"] == true, render = (bool?)m?["render"] != false;
            MVClipImport.Forget();
            var choices = MVClipImport.Choices["clips"] as JObject ?? new JObject();
            var names = (m?["clips"] as JArray)?.Select(x => (string)x).ToList() ?? choices.Properties().Select(p => p.Name).ToList();
            var clock = System.Diagnostics.Stopwatch.StartNew();
            var rows = new JArray(); var remaining = new JArray(); int made = 0;
            Rig rig = render ? MakeRig(w, h) : null;
            bool fog = RenderSettings.fog; var amb = RenderSettings.ambientLight; var ambMode = RenderSettings.ambientMode;
            try
            {
                RenderSettings.fog = false; RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(.62f, .66f, .72f);
                foreach (var name in names)
                {
                    string mp4 = Path.Combine(outDir, name + ".mp4"), js = Path.Combine(outDir, name + ".json");
                    if (!force && File.Exists(js) && (!render || File.Exists(mp4))) continue;
                    if (clock.Elapsed.TotalSeconds > budget) { remaining.Add(name); continue; }
                    var t0 = clock.Elapsed.TotalSeconds;
                    try
                    {
                        var o = One(person, name, choices[name] as JObject, mp4, rig, maxSecs, minSecs);
                        o["secondsToMake"] = Math.Round(clock.Elapsed.TotalSeconds - t0, 1);
                        File.WriteAllText(js, o.ToString());
                        rows.Add($"{name}: {o["previewSeconds"]} s preview, {Math.Round(clock.Elapsed.TotalSeconds - t0, 1)} s");
                        made++;
                    }
                    catch (Exception e) { rows.Add($"{name}: FAILED {e.Message}"); }
                }
            }
            finally
            {
                RenderSettings.fog = fog; RenderSettings.ambientMode = ambMode; RenderSettings.ambientLight = amb;
                if (rig != null) FreeRig(rig);
                EditorUtility.UnloadUnusedAssetsImmediate();
            }
            return new JObject { ["made"] = made, ["rows"] = rows, ["remaining"] = remaining, ["seconds"] = Math.Round(clock.Elapsed.TotalSeconds, 1) };
        }

        static Rig MakeRig(int w, int h)
        {
            var r = new Rig();
            Camera Cam(string n, Rect rect, float fov)
            {
                var go = new GameObject(n) { hideFlags = HideFlags.HideAndDontSave }; var c = go.AddComponent<Camera>();
                c.enabled = false; c.clearFlags = CameraClearFlags.SolidColor; c.backgroundColor = new Color(.62f, .78f, .93f);
                c.nearClipPlane = .05f; c.farClipPlane = 100; c.fieldOfView = fov; c.cullingMask = 1 << Layer; c.rect = rect;
                return c;
            }
            r.a = Cam("__previewA", new Rect(0, 0, .4975f, 1), 30); r.b = Cam("__previewB", new Rect(.5025f, 0, .4975f, 1), 30);
            r.ground = GameObject.CreatePrimitive(PrimitiveType.Quad); r.ground.hideFlags = HideFlags.HideAndDontSave; r.ground.layer = Layer;
            UnityEngine.Object.DestroyImmediate(r.ground.GetComponent<Collider>());
            r.ground.transform.SetPositionAndRotation(Origin, Quaternion.Euler(90, 0, 0)); r.ground.transform.localScale = Vector3.one * 60;
            r.grass = new Material(Shader.Find("MV/Lit")) { hideFlags = HideFlags.HideAndDontSave }; r.grass.SetColor("_BaseColor", new Color(.25f, .42f, .16f)); r.grass.SetFloat("_Smoothness", .05f);
            r.ground.GetComponent<Renderer>().sharedMaterial = r.grass;
            r.sun = new GameObject("__previewSun") { hideFlags = HideFlags.HideAndDontSave }; var sun = r.sun.AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1, .95f, .85f); sun.intensity = 2.2f; sun.shadows = LightShadows.Soft; sun.cullingMask = 1 << Layer;
            r.sun.transform.rotation = Quaternion.LookRotation(new Vector3(.5f, -1, -.5f));
            r.rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32) { antiAliasing = 4 };
            r.tex = new Texture2D(w, h, TextureFormat.RGB24, false);
            return r;
        }

        static void FreeRig(Rig r)
        {
            UnityEngine.Object.DestroyImmediate(r.a.gameObject); UnityEngine.Object.DestroyImmediate(r.b.gameObject);
            UnityEngine.Object.DestroyImmediate(r.ground); UnityEngine.Object.DestroyImmediate(r.grass); UnityEngine.Object.DestroyImmediate(r.sun);
            r.rt.Release(); UnityEngine.Object.DestroyImmediate(r.rt); UnityEngine.Object.DestroyImmediate(r.tex);
        }

        static readonly Vector3 Origin = new Vector3(-900, 0, -900);

        static AnimationClip Source(string name, JObject rec)
        {
            var path = (string)rec?["path"];
            if (path != null) { var c = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(x => x.name == name); if (c) return c; }
            return MotionLab.FindAny(name);
        }

        static float R1(float x) => (float)Math.Round(x, 1);
        static float R2(float x) => (float)Math.Round(x, 2);
        static float R3(float x) => (float)Math.Round(x, 3);

        /// <summary>Distance from p to the segment a-b.</summary>
        static float SegDist(Vector3 p, Vector3 a, Vector3 b) { var ab = b - a; float t = Mathf.Clamp01(Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-6f)); return (a + ab * t - p).magnitude; }

        class Hand { public float curl, spread; public bool ok; }

        /// <summary>How closed a hand is: per finger (index to little) the angle between hand-to-knuckle and the middle-to-tip bone, averaged; 0 is a flat
        /// straight hand, about 90 a loose fist. Spread is the angle between the index and little fingers' first bones: a fanned hand is straight and spread.</summary>
        static Hand HandOf(Animator an, HumanBodyBones hand, HumanBodyBones[] prox)
        {
            var hb = an.GetBoneTransform(hand); var o = new Hand();
            if (!hb) return o;
            var curls = new List<float>(); Vector3 idx = Vector3.zero, lit = Vector3.zero;
            for (int i = 0; i < prox.Length; i++)
            {
                var p = an.GetBoneTransform(prox[i]); var mid = an.GetBoneTransform(prox[i] + 1); var dist = an.GetBoneTransform(prox[i] + 2);
                if (!p || !mid || !dist) continue;
                curls.Add(Vector3.Angle(p.position - hb.position, dist.position - mid.position));
                if (i == 0) idx = mid.position - p.position; if (i == 3) lit = mid.position - p.position;
            }
            if (curls.Count == 0) return o;
            o.ok = true; o.curl = curls.Average(); o.spread = idx != Vector3.zero && lit != Vector3.zero ? Vector3.Angle(idx, lit) : 0;
            return o;
        }

        static JObject One(MVActor person, string name, JObject rec, string mp4, Rig rig, float maxSecs, float minSecs)
        {
            var src = Source(name, rec); if (!src) throw new Exception("no clip");
            var clean = MVClipClean.CleanOf(name);
            var clip = clean ? clean : src;
            bool ik = clean ? MVClipClean.CleanFootIK(name) : MVClipImport.FootIKFor(name);
            bool loop = (bool?)rec?["loop"] ?? src.isLooping;
            float len = Mathf.Max(clip.length, 1 / Fps);
            double Ct(double t) => loop ? t % len : Math.Min(t, len - 1 / 60.0);

            var go = UnityEngine.Object.Instantiate(person.animRoot); go.hideFlags = HideFlags.DontSave; go.name = "__preview_" + name; go.SetActive(true);
            go.transform.SetPositionAndRotation(Origin, Quaternion.identity); go.transform.localScale = person.animRoot.transform.lossyScale;
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = Layer;
            var rends = new List<Renderer>(); var skins = new List<(SkinnedMeshRenderer s, Mesh m)>();
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                bool extra = r.gameObject.hideFlags != HideFlags.None || r.name.Contains("feather") || r.name.Contains("stretch");
                r.SetPropertyBlock(null); r.enabled = !extra; r.forceRenderingOff = extra;
                if (extra) continue;
                if (r is SkinnedMeshRenderer sk && sk.sharedMesh)
                {
                    for (int i = 0; i < sk.sharedMesh.blendShapeCount; i++) sk.SetBlendShapeWeight(i, 0);
                    sk.forceRenderingOff = true;   // drawn as a baked mesh each frame, so the pose of this tick is the one on screen
                    skins.Add((sk, new Mesh { hideFlags = HideFlags.HideAndDontSave, indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }));
                }
            }
            var an = go.GetComponentInChildren<Animator>(true); an.enabled = true; an.applyRootMotion = false; an.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var g = PlayableGraph.Create("clippreview"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
            System.Diagnostics.Process enc = null;
            try
            {
                var p = AnimationClipPlayable.Create(g, clip); p.SetApplyFootIK(ik);
                AnimationPlayableOutput.Create(g, "o", an).SetSourcePlayable(p);
                Transform B(HumanBodyBones b) => an.GetBoneTransform(b);
                Vector3 LocalFwd(HumanBodyBones b) => person.humanRest.Length > (int)b ? Quaternion.Inverse(person.humanRest[(int)b]) * Vector3.forward : Vector3.forward;
                Vector3 hipsF = LocalFwd(HumanBodyBones.Hips), chestF = LocalFwd(HumanBodyBones.Chest), headF = LocalFwd(HumanBodyBones.Head), lFootF = LocalFwd(HumanBodyBones.LeftFoot), rFootF = LocalFwd(HumanBodyBones.RightFoot);
                Transform hips = B(HumanBodyBones.Hips), chest = B(HumanBodyBones.Chest) ?? B(HumanBodyBones.Spine), neck = B(HumanBodyBones.Neck) ?? B(HumanBodyBones.Head), head = B(HumanBodyBones.Head);
                Transform lh = B(HumanBodyBones.LeftHand), rh = B(HumanBodyBones.RightHand), lua = B(HumanBodyBones.LeftUpperArm), rua = B(HumanBodyBones.RightUpperArm);
                Transform lul = B(HumanBodyBones.LeftUpperLeg), rul = B(HumanBodyBones.RightUpperLeg), lll = B(HumanBodyBones.LeftLowerLeg), rll = B(HumanBodyBones.RightLowerLeg), lf = B(HumanBodyBones.LeftFoot), rf = B(HumanBodyBones.RightFoot);
                Transform lmid = B(HumanBodyBones.LeftMiddleProximal), rmid = B(HumanBodyBones.RightMiddleProximal);
                Vector3 Palm(Transform hand, Transform mid) => mid ? (hand.position + mid.position) * .5f : hand.position;
                Vector3 Flat(Vector3 v) { v.y = 0; return v; }

                // ---- measure the whole clip at 30 fps ----
                int n = Mathf.Clamp(Mathf.CeilToInt(len * Fps) + 1, 2, 1800);
                var hipsP = new Vector3[n]; var lRel = new Vector3[n]; var rRel = new Vector3[n]; var lfRel = new Vector3[n]; var rfRel = new Vector3[n];
                var lReach = new float[n]; var rReach = new float[n];
                var curlL = new List<float>(); var curlR = new List<float>(); var sprL = new List<float>(); var sprR = new List<float>();
                float faceL = 9, faceR = 9, bodyL = 9, bodyR = 9; int faceFrames = 0, bodyFrames = 0;
                float yawMin = 999, yawMax = -999, pitchMin = 999, pitchMax = -999, leanMax = -999, leanSum = 0, lowFoot = 9, kneeBack = 0; int kneeBackFrames = 0, airFrames = 0;
                var hipsY = new float[n]; var feetLow = new float[n];
                for (int f = 0; f < n; f++)
                {
                    double t = Math.Min(f / (double)Fps, len - 1 / 60.0);
                    p.SetTime(t); g.Evaluate(0);
                    hipsP[f] = hips.position - Origin; hipsY[f] = hipsP[f].y;
                    lRel[f] = lh.position - hips.position; rRel[f] = rh.position - hips.position;
                    lfRel[f] = lf.position - hips.position; rfRel[f] = rf.position - hips.position;
                    lReach[f] = lua ? (lh.position - lua.position).magnitude : 0; rReach[f] = rua ? (rh.position - rua.position).magnitude : 0;
                    var hl = HandOf(an, HumanBodyBones.LeftHand, LeftFingers); var hr = HandOf(an, HumanBodyBones.RightHand, RightFingers);
                    if (hl.ok) { curlL.Add(hl.curl); sprL.Add(hl.spread); }
                    if (hr.ok) { curlR.Add(hr.curl); sprR.Add(hr.spread); }
                    var hf = head.rotation * headF; var cf = chest.rotation * chestF; var hipf = hips.rotation * hipsF;
                    var face = head.position + hf * .09f + Vector3.up * .06f;
                    float dl = (Palm(lh, lmid) - face).magnitude, dr = (Palm(rh, rmid) - face).magnitude;
                    faceL = Mathf.Min(faceL, dl); faceR = Mathf.Min(faceR, dr); if (Mathf.Min(dl, dr) < .1f) faceFrames++;
                    float bl = SegDist(Palm(lh, lmid), hips.position, neck.position), br = SegDist(Palm(rh, rmid), hips.position, neck.position);
                    bodyL = Mathf.Min(bodyL, bl); bodyR = Mathf.Min(bodyR, br); if (Mathf.Min(bl, br) < .08f) bodyFrames++;
                    var cfh = Flat(cf); var hfh = Flat(hf);
                    if (cfh.sqrMagnitude > .04f && hfh.sqrMagnitude > .04f) { float yaw = Vector3.SignedAngle(cfh, hfh, Vector3.up); yawMin = Mathf.Min(yawMin, yaw); yawMax = Mathf.Max(yawMax, yaw); }
                    float pitch = Mathf.Asin(Mathf.Clamp(hf.normalized.y, -1, 1)) * Mathf.Rad2Deg; pitchMin = Mathf.Min(pitchMin, pitch); pitchMax = Mathf.Max(pitchMax, pitch);
                    var spine = neck.position - hips.position; float lean = Vector3.Angle(spine, Vector3.up) * Mathf.Sign(Vector3.Dot(Flat(spine), Flat(hipf)) + 1e-4f);
                    leanMax = Mathf.Max(leanMax, lean); leanSum += lean;
                    float footLow = Mathf.Min(lf.position.y, rf.position.y) - Origin.y; feetLow[f] = footLow; lowFoot = Mathf.Min(lowFoot, footLow);
                    // A knee bent the wrong way: the knee sits off the hip-ankle line on the heel side of the foot.
                    foreach (var (ul, ll, ft, ff) in new[] { (lul, lll, lf, lFootF), (rul, rll, rf, rFootF) })
                    {
                        if (!ul || !ll || !ft) continue;
                        var axis = (ft.position - ul.position).normalized; var k = ll.position - ul.position; var off = k - axis * Vector3.Dot(k, axis);
                        var fwd = ft.rotation * ff; fwd -= axis * Vector3.Dot(fwd, axis);
                        if (off.magnitude > .03f && fwd.sqrMagnitude > .01f && Vector3.Dot(off.normalized, fwd.normalized) < -.3f)
                        { float bend = 180 - Vector3.Angle(ul.position - ll.position, ft.position - ll.position); if (bend > 8) { kneeBack = Mathf.Max(kneeBack, bend); kneeBackFrames++; } }
                    }
                }
                for (int f = 0; f < n; f++) if (feetLow[f] > lowFoot + .15f) airFrames++;
                // fastest hand and foot against the hips: the hit or release of an action clip, and the farthest reach just after it
                (string side, int f, float v) Peak(Vector3[] a, Vector3[] b)
                {
                    var best = ("", 0, 0f);
                    for (int f = 1; f < n; f++) { float va = (a[f] - a[f - 1]).magnitude * Fps, vb = (b[f] - b[f - 1]).magnitude * Fps; if (va > best.Item3) best = ("left", f, va); if (vb > best.Item3) best = ("right", f, vb); }
                    return best;
                }
                var ph = Peak(lRel, rRel); var pf = Peak(lfRel, rfRel);
                var reach = ph.side == "left" ? lReach : rReach; int far = ph.f;
                for (int f = Mathf.Max(0, ph.f - 3); f < Mathf.Min(n, ph.f + 11); f++) if (reach[f] > reach[far]) far = f;
                float Pct(List<float> v, float q) { if (v.Count == 0) return 0; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp((int)(q * (s.Count - 1)), 0, s.Count - 1)]; }
                JObject HandStats(List<float> curl, List<float> spr) => curl.Count == 0 ? null : new JObject
                {
                    ["curlMean"] = R1(curl.Average()), ["curlMin"] = R1(curl.Min()), ["curlP10"] = R1(Pct(curl, .1f)), ["spreadMean"] = R1(spr.Average()), ["spreadMax"] = R1(spr.Max()),
                    ["openFrac"] = R2(curl.Count(x => x < 25) / (float)curl.Count), ["fannedFrac"] = R2(curl.Zip(spr, (c, s) => c < 25 && s > 30).Count(x => x) / (float)curl.Count),
                };
                var drift = Flat(hipsP[n - 1] - hipsP[0]); float farthest = 0; for (int f = 0; f < n; f++) farthest = Mathf.Max(farthest, Flat(hipsP[f] - hipsP[0]).magnitude);
                float hipsMean = hipsY.Average();
                string stance = hipsMean < .35f ? "lying" : hipsMean < .72f ? "low" : "standing";
                var o = new JObject
                {
                    ["clip"] = name, ["played"] = clean ? clean.name : src.name, ["clean"] = (bool)clean, ["footIK"] = ik, ["loop"] = loop, ["length"] = R3(len), ["humanMotion"] = clip.humanMotion,
                    ["hipsY"] = new JObject { ["mean"] = R3(hipsMean), ["min"] = R3(hipsY.Min()), ["max"] = R3(hipsY.Max()) }, ["stance"] = stance,
                    ["airborneFrac"] = R2(airFrames / (float)n), ["feetLowestM"] = R3(lowFoot),
                    ["rootDriftM"] = R3(drift.magnitude), ["rootFarthestM"] = R3(farthest),
                    ["handLeft"] = HandStats(curlL, sprL), ["handRight"] = HandStats(curlR, sprR),
                    ["handToFaceMinM"] = new JObject { ["left"] = R3(faceL), ["right"] = R3(faceR) }, ["handToFaceFrames"] = faceFrames,
                    ["handToTorsoAxisMinM"] = new JObject { ["left"] = R3(bodyL), ["right"] = R3(bodyR) }, ["handInBodyFrames"] = bodyFrames,
                    ["headYawDeg"] = yawMin > yawMax ? null : new JArray(R1(yawMin), R1(yawMax)), ["headPitchDeg"] = new JArray(R1(pitchMin), R1(pitchMax)),
                    ["leanFwdMaxDeg"] = R1(leanMax), ["leanMeanDeg"] = R1(leanSum / n),
                    ["kneeBackwardMaxDeg"] = R1(kneeBack), ["kneeBackwardFrames"] = kneeBackFrames,
                    ["peakHand"] = new JObject { ["side"] = ph.side, ["t"] = R2(ph.f / Fps), ["mps"] = R2(ph.v), ["farthestReachT"] = R2(far / Fps), ["reachM"] = R3(reach[far]) },
                    ["peakFoot"] = new JObject { ["side"] = pf.side, ["t"] = R2(pf.f / Fps), ["mps"] = R2(pf.v) },
                    ["frames"] = n,
                };

                // ---- the preview: two fixed cameras, one file ----
                double plen = len > maxSecs ? maxSecs : loop ? Math.Min(maxSecs, Math.Max(len, Math.Ceiling(minSecs / len) * len)) : Math.Min(maxSecs, len + .5);
                int nr = Mathf.Max(2, (int)Math.Round(plen * Fps));
                // a clip longer than the preview shows its busiest stretch: the window with the most hand and foot movement against the hips
                double from = 0;
                if (len > maxSecs && n > nr)
                {
                    var sp = new float[n]; for (int f = 1; f < n; f++) sp[f] = (lRel[f] - lRel[f - 1]).magnitude + (rRel[f] - rRel[f - 1]).magnitude + (lfRel[f] - lfRel[f - 1]).magnitude + (rfRel[f] - rfRel[f - 1]).magnitude;
                    float sum = 0, best = -1; int bi = 0; for (int f = 0; f < n; f++) { sum += sp[f]; if (f >= nr) sum -= sp[f - nr]; if (f >= nr - 1 && sum > best) { best = sum; bi = f - nr + 1; } }
                    from = bi / (double)Fps;
                }
                o["previewSeconds"] = R2(nr / Fps); o["previewFrom"] = R2((float)from);
                if (rig == null) return o;
                var hp = new Vector3[nr]; var np = new Vector3[nr];
                for (int f = 0; f < nr; f++) { p.SetTime(Ct(from + f / (double)Fps)); g.Evaluate(0); hp[f] = hips.position; np[f] = neck.position; }
                p.SetTime(Ct(from)); g.Evaluate(0);
                var face0 = Flat(hips.rotation * hipsF); var fw = face0.sqrMagnitude > .25f ? face0.normalized : Vector3.forward; var right = Vector3.Cross(Vector3.up, fw);
                Vector3 Smooth(Vector3[] a, int f, int k) { var s = Vector3.zero; int c = 0; for (int i = Mathf.Max(0, f - k); i <= Mathf.Min(a.Length - 1, f + k); i++) { s += a[i]; c++; } return s / c; }
                float aimY = Mathf.Clamp(hp.Average(x => x.y) - Origin.y + .1f, .45f, .95f);
                var dirA = (fw + right).normalized; var dirB = (fw + right * .4f).normalized;
                int W = rig.rt.width, H = rig.rt.height;
                enc = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("ffmpeg",
                    $"-y -loglevel error -f rawvideo -pix_fmt rgb24 -s {W}x{H} -r {Fps} -i - -vf vflip -c:v libx264 -preset fast -crf 21 -pix_fmt yuv420p -movflags +faststart \"{mp4}\"")
                { UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true });
                var stdin = enc.StandardInput.BaseStream;
                for (int f = 0; f < nr; f++)
                {
                    p.SetTime(Ct(from + f / (double)Fps)); g.Evaluate(0);
                    var ha = Smooth(hp, f, 15); var aimA = new Vector3(ha.x, Origin.y + aimY, ha.z);
                    rig.a.transform.position = aimA + dirA * 3.8f + Vector3.up * .1f; rig.a.transform.LookAt(aimA);
                    var nb = Smooth(np, f, 8); var aimB = nb + Vector3.down * .22f;
                    rig.b.transform.position = aimB + dirB * 2.0f + Vector3.up * .05f; rig.b.transform.LookAt(aimB);
                    foreach (var (s, mesh) in skins) s.BakeMesh(mesh, true);
                    var prev = RenderTexture.active; RenderTexture.active = rig.rt; GL.Clear(true, true, new Color(.12f, .12f, .12f)); RenderTexture.active = prev;
                    foreach (var cam in new[] { rig.a, rig.b })
                    {
                        cam.targetTexture = rig.rt;
                        foreach (var (s, mesh) in skins)
                        {
                            var mx = Matrix4x4.TRS(s.transform.position, s.transform.rotation, Vector3.one);
                            for (int sub = 0; sub < mesh.subMeshCount; sub++) Graphics.DrawMesh(mesh, mx, s.sharedMaterials[Mathf.Min(sub, s.sharedMaterials.Length - 1)], Layer, cam, sub);
                        }
                        cam.Render();
                    }
                    RenderTexture.active = rig.rt; rig.tex.ReadPixels(new Rect(0, 0, W, H), 0, 0, false); rig.tex.Apply(false); RenderTexture.active = prev;
                    var raw = rig.tex.GetRawTextureData(); stdin.Write(raw, 0, raw.Length);
                }
                stdin.Close(); enc.WaitForExit(); enc = null;
                rig.a.targetTexture = null; rig.b.targetTexture = null;
                return o;
            }
            finally
            {
                if (enc != null) { try { enc.Kill(); } catch { } }
                g.Destroy();
                foreach (var (_, mesh) in skins) UnityEngine.Object.DestroyImmediate(mesh);
                UnityEngine.Object.DestroyImmediate(go);
            }
        }
    }
}
