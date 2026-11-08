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
    /// Engine fidelity (Director/review/engine-fidelity.md): a clip played the plain Unity way (an Animator with the Humanoid Avatar in a PlayableGraph)
    /// against the same clip through our stack, stage by stage. `mv call fidelity '{"clips":["mx_hh_step"],"model":"person","secs":4}'`.
    /// Nothing here is on the render path: it spawns throwaway copies and destroys them.
    /// </summary>
    public static partial class MotionLab
    {
        const float FidHz = 60;

        class Rec { public Quaternion[][] q; public Vector3[][] p; public string[] names; public int[] ids; }

        static int[] HumanIds(Animator an) => Enumerable.Range(0, (int)HumanBodyBones.LastBone).Where(i => an.GetBoneTransform((HumanBodyBones)i)).ToArray();

        static void Grab(Rec r, int f, Transform root, Func<int, Transform> bone)
        {
            r.q[f] = new Quaternion[r.ids.Length]; r.p[f] = new Vector3[r.ids.Length];
            for (int i = 0; i < r.ids.Length; i++)
            {
                var b = bone(r.ids[i]);
                r.q[f][i] = r.ids[i] == (int)HumanBodyBones.Hips ? Quaternion.Inverse(root.rotation) * b.rotation : b.localRotation;
                r.p[f][i] = root.InverseTransformPoint(b.position);
            }
        }

        static Rec NewRec(int n, int[] ids) => new Rec { q = new Quaternion[n][], p = new Vector3[n][], ids = ids, names = ids.Select(i => ((HumanBodyBones)i).ToString()).ToArray() };

        static AvatarMask FidMask(string mask)
        {
            var m = new AvatarMask();
            for (int i = 0; i < (int)AvatarMaskBodyPart.LastBodyPart; i++) m.SetHumanoidBodyPartActive((AvatarMaskBodyPart)i, false);
            foreach (var p in NativeParts(mask)) m.SetHumanoidBodyPartActive(p, true);
            return m;
        }

        /// <summary>The body parts of one of our mask names, for Unity's AvatarMask.</summary>
        public static AvatarMaskBodyPart[] NativeParts(string mask)
        {
            var o = new List<AvatarMaskBodyPart>();
            foreach (var part in (mask ?? "all").ToLowerInvariant().Split(','))
                switch (part.Trim())
                {
                    case "upper": o.AddRange(new[] { AvatarMaskBodyPart.Body, AvatarMaskBodyPart.Head, AvatarMaskBodyPart.LeftArm, AvatarMaskBodyPart.RightArm, AvatarMaskBodyPart.LeftFingers, AvatarMaskBodyPart.RightFingers, AvatarMaskBodyPart.LeftHandIK, AvatarMaskBodyPart.RightHandIK }); break;
                    case "lower": o.AddRange(new[] { AvatarMaskBodyPart.Root, AvatarMaskBodyPart.LeftLeg, AvatarMaskBodyPart.RightLeg, AvatarMaskBodyPart.LeftFootIK, AvatarMaskBodyPart.RightFootIK }); break;
                    case "arms": o.AddRange(new[] { AvatarMaskBodyPart.LeftArm, AvatarMaskBodyPart.RightArm, AvatarMaskBodyPart.LeftFingers, AvatarMaskBodyPart.RightFingers, AvatarMaskBodyPart.LeftHandIK, AvatarMaskBodyPart.RightHandIK }); break;
                    case "leftarm": o.AddRange(new[] { AvatarMaskBodyPart.LeftArm, AvatarMaskBodyPart.LeftFingers, AvatarMaskBodyPart.LeftHandIK }); break;
                    case "rightarm": o.AddRange(new[] { AvatarMaskBodyPart.RightArm, AvatarMaskBodyPart.RightFingers, AvatarMaskBodyPart.RightHandIK }); break;
                    case "head": o.Add(AvatarMaskBodyPart.Head); break;
                    case "spine": o.Add(AvatarMaskBodyPart.Body); break;
                    default: for (int i = 0; i < (int)AvatarMaskBodyPart.LastBodyPart; i++) o.Add((AvatarMaskBodyPart)i); break;
                }
            return o.Distinct().ToArray();
        }

        /// <summary>Unity's way: a copy of the model with its Animator, a PlayableGraph built by `make`, evaluated at each time.</summary>
        static Rec UnityRec(GameObject src, double[] times, Func<PlayableGraph, Playable> make, Action<Playable, double> at)
        {
            var go = UnityEngine.Object.Instantiate(src); go.hideFlags = HideFlags.DontSave;
            go.transform.SetPositionAndRotation(new Vector3(800, 0, 800), Quaternion.identity);
            var an = go.GetComponentInChildren<Animator>(true); an.enabled = true; an.applyRootMotion = false; an.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var g = PlayableGraph.Create("fidelity"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
            try
            {
                var top = make(g);
                AnimationPlayableOutput.Create(g, "out", an).SetSourcePlayable(top);
                var r = NewRec(times.Length, HumanIds(an));
                for (int f = 0; f < times.Length; f++) { at(top, times[f]); g.Evaluate(0); Grab(r, f, go.transform, i => an.GetBoneTransform((HumanBodyBones)i)); }
                return r;
            }
            finally { g.Destroy(); UnityEngine.Object.DestroyImmediate(go); }
        }

        static Playable NoIK(PlayableGraph g, AnimationClip c) { var p = AnimationClipPlayable.Create(g, c); p.SetApplyFootIK(false); return p; }

        static Rec SampleRec(GameObject src, AnimationClip clip, double[] times)
        {
            var go = UnityEngine.Object.Instantiate(src); go.hideFlags = HideFlags.DontSave;
            var an = go.GetComponentInChildren<Animator>(true);
            try
            {
                var r = NewRec(times.Length, HumanIds(an));
                for (int f = 0; f < times.Length; f++)
                {
                    go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity;
                    clip.SampleAnimation(go, (float)times[f]);
                    go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity;
                    Grab(r, f, go.transform, i => an.GetBoneTransform((HumanBodyBones)i));
                }
                return r;
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }
        }

        /// <summary>Our way: the lab's copy of the actor with these cues and these parts of the stack switched off.</summary>
        static Rec OursRec(string model, JArray cues, double[] times, string off, SongMap song)
        {
            var c = Spawn("__fid", model, new JObject { ["pos"] = new JArray(600, 0, 600) });
            try
            {
                var sc = ScoreCompiler.ForLab(song, new Dictionary<string, MVActor> { ["x"] = c.a }, c.ops, ScoreCompiler.ReadScore());
                foreach (JObject cue in cues) { var q = (JObject)cue.DeepClone(); q["on"] = "x"; sc.LabCue(q); }
                Arm(c, song);
                var d = c.d; off = off ?? "";
                d.NoGround = off.Contains("ground"); d.NoLimits = off.Contains("limits"); d.NoFingers = off.Contains("fingers"); d.NoInertia = off.Contains("inertia"); d.NoOverlap = off.Contains("overlap");
                var an = c.a.animRoot.GetComponentInChildren<Animator>(true);
                var r = NewRec(times.Length, HumanIds(an));
                for (int f = 0; f < times.Length; f++) { d.Eval(times[f]); Grab(r, f, c.a.animRoot.transform, i => c.a.human[i]); }
                return r;
            }
            finally { if (c.a) UnityEngine.Object.DestroyImmediate(c.a.gameObject); MotionDriver.History = 0; }
        }

        static float Pct(List<float> v, float p) { if (v.Count == 0) return 0; v.Sort(); return v[Mathf.Clamp((int)(p * (v.Count - 1)), 0, v.Count - 1)]; }

        static readonly int[][] Hinges =
        {
            new[] { (int)HumanBodyBones.LeftUpperArm, (int)HumanBodyBones.LeftLowerArm, (int)HumanBodyBones.LeftHand },
            new[] { (int)HumanBodyBones.RightUpperArm, (int)HumanBodyBones.RightLowerArm, (int)HumanBodyBones.RightHand },
            new[] { (int)HumanBodyBones.LeftUpperLeg, (int)HumanBodyBones.LeftLowerLeg, (int)HumanBodyBones.LeftFoot },
            new[] { (int)HumanBodyBones.RightUpperLeg, (int)HumanBodyBones.RightLowerLeg, (int)HumanBodyBones.RightFoot },
        };

        /// <summary>Error against the reference, and the test's own jitter, snaps and hinge planes. Fingers are reported apart: a hand's 30 small bones would drown the body.</summary>
        static JObject Measure(Rec truth, Rec test, string label)
        {
            int n = Math.Min(truth.q.Length, test.q.Length);
            var common = test.ids.Where(i => truth.ids.Contains(i)).ToArray();
            int Ti(int id) => Array.IndexOf(truth.ids, id); int Xi(int id) => Array.IndexOf(test.ids, id);
            bool Finger(int id) => id >= (int)HumanBodyBones.LeftThumbProximal && id <= (int)HumanBodyBones.RightLittleDistal;
            var errBody = new List<float>(); var errFing = new List<float>(); var worst = new Dictionary<int, float>();
            var jitT = new List<float>(); var jitX = new List<float>(); int snapT = 0, snapX = 0;
            var hinge = new List<float>(); float posErr = 0;
            foreach (var id in common)
            {
                int a = Ti(id), b = Xi(id);
                for (int f = 0; f < n; f++)
                {
                    float e = Quaternion.Angle(truth.q[f][a], test.q[f][b]);
                    (Finger(id) ? errFing : errBody).Add(e);
                    worst.TryGetValue(id, out var w); if (e > w) worst[id] = e;
                    if (f > 0)
                    {
                        if (Quaternion.Angle(test.q[f][b], test.q[f - 1][b]) > 8) snapX++;
                        if (Quaternion.Angle(truth.q[f][a], truth.q[f - 1][a]) > 8) snapT++;
                    }
                    if (f > 0 && f < n - 1 && !Finger(id))
                    {
                        jitX.Add(Quaternion.Angle(test.q[f + 1][b] * Quaternion.Inverse(test.q[f][b]), test.q[f][b] * Quaternion.Inverse(test.q[f - 1][b])));
                        jitT.Add(Quaternion.Angle(truth.q[f + 1][a] * Quaternion.Inverse(truth.q[f][a]), truth.q[f][a] * Quaternion.Inverse(truth.q[f - 1][a])));
                    }
                }
            }
            foreach (var id in new[] { HumanBodyBones.LeftHand, HumanBodyBones.RightHand, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.Head })
            {
                int a = Ti((int)id), b = Xi((int)id); if (a < 0 || b < 0) continue;
                for (int f = 0; f < n; f++) posErr = Mathf.Max(posErr, (truth.p[f][a] - test.p[f][b]).magnitude);
            }
            foreach (var h in Hinges)
            {
                int[] a = h.Select(Ti).ToArray(), b = h.Select(Xi).ToArray(); if (a.Contains(-1) || b.Contains(-1)) continue;
                for (int f = 0; f < n; f++)
                {
                    Vector3 u0 = truth.p[f][a[1]] - truth.p[f][a[0]], l0 = truth.p[f][a[2]] - truth.p[f][a[1]], u1 = test.p[f][b[1]] - test.p[f][b[0]], l1 = test.p[f][b[2]] - test.p[f][b[1]];
                    if (Vector3.Angle(u0, l0) < 15 || Vector3.Angle(u1, l1) < 15) continue;   // nearly straight: no plane to leave
                    hinge.Add(Vector3.Angle(Vector3.Cross(u0, l0), Vector3.Cross(u1, l1)));
                }
            }
            float slideX = 0, slideT = 0;
            foreach (var fb in new[] { (int)HumanBodyBones.LeftFoot, (int)HumanBodyBones.RightFoot })
            {
                int a = Ti(fb), b = Xi(fb); if (a < 0 || b < 0) continue;
                float lowT = float.MaxValue, lowX = float.MaxValue;
                for (int f = 0; f < n; f++) { lowT = Mathf.Min(lowT, truth.p[f][a].y); lowX = Mathf.Min(lowX, test.p[f][b].y); }
                for (int f = 1; f < n; f++)
                {
                    if (truth.p[f][a].y < lowT + .03f && truth.p[f - 1][a].y < lowT + .03f) { var d = truth.p[f][a] - truth.p[f - 1][a]; d.y = 0; slideT += d.magnitude; }
                    if (test.p[f][b].y < lowX + .03f && test.p[f - 1][b].y < lowX + .03f) { var d = test.p[f][b] - test.p[f - 1][b]; d.y = 0; slideX += d.magnitude; }
                }
            }
            float secs = n / FidHz;
            string W(int k) => string.Join(", ", worst.OrderByDescending(x => x.Value).Where(x => !Finger(x.Key)).Take(k).Select(x => ((HumanBodyBones)x.Key) + " " + x.Value.ToString("0.0")));
            return new JObject
            {
                ["stage"] = label,
                ["errMaxDeg"] = Math.Round(errBody.Count > 0 ? errBody.Max() : 0, 2), ["errMeanDeg"] = Math.Round(errBody.Count > 0 ? errBody.Average() : 0, 3), ["errP99Deg"] = Math.Round(Pct(errBody, .99f), 2),
                ["fingerErrMaxDeg"] = Math.Round(errFing.Count > 0 ? errFing.Max() : 0, 2), ["fingerErrMeanDeg"] = Math.Round(errFing.Count > 0 ? errFing.Average() : 0, 2),
                ["worstBones"] = W(4), ["endPosErrMaxCm"] = Math.Round(posErr * 100, 2),
                ["jitterP99"] = Math.Round(Pct(jitX, .99f), 3), ["jitterMax"] = Math.Round(jitX.Count > 0 ? jitX.Max() : 0, 2), ["clipJitterP99"] = Math.Round(Pct(jitT, .99f), 3), ["clipJitterMax"] = Math.Round(jitT.Count > 0 ? jitT.Max() : 0, 2),
                ["snaps"] = snapX, ["clipSnaps"] = snapT, ["footSlideCmPerS"] = Math.Round(slideX * 100 / secs, 1), ["clipFootSlideCmPerS"] = Math.Round(slideT * 100 / secs, 1),
                ["hingeOffP95Deg"] = Math.Round(Pct(hinge, .95f), 2), ["hingeOffMaxDeg"] = Math.Round(hinge.Count > 0 ? hinge.Max() : 0, 2),
            };
        }


        class OrderProbe : PlayableBehaviour { public Transform hips; public Vector3 seen; public override void ProcessFrame(Playable p, FrameData info, object data) { seen = hips.position; } }

        /// <summary>Does a script track's ProcessFrame see this evaluation's Animator pose, or the last one? `call evalorder '{"clip":"mx_hh_step"}'`.</summary>
        [BridgeCommand("evalorder")]
        static object EvalOrder(JObject m)
        {
            var src = MVActor.Named((string)m["model"] ?? "person"); var clip = src.FindClip((string)m["clip"] ?? "mx_hh_step") ?? FindAny((string)m["clip"] ?? "mx_hh_step");
            var go = UnityEngine.Object.Instantiate(src.animRoot); go.hideFlags = HideFlags.DontSave;
            var an = go.GetComponentInChildren<Animator>(true); an.enabled = true; an.applyRootMotion = false;
            var hips = an.GetBoneTransform(HumanBodyBones.Hips);
            var o = new JObject();
            foreach (bool scriptFirst in new[] { true, false })
            {
                var g = PlayableGraph.Create("order"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false);
                var sp = ScriptPlayable<OrderProbe>.Create(g); sp.GetBehaviour().hips = hips;
                if (scriptFirst) { ScriptPlayableOutput.Create(g, "s").SetSourcePlayable(sp); AnimationPlayableOutput.Create(g, "a", an).SetSourcePlayable(cp); }
                else { AnimationPlayableOutput.Create(g, "a", an).SetSourcePlayable(cp); ScriptPlayableOutput.Create(g, "s").SetSourcePlayable(sp); }
                cp.SetTime(1.0); g.Evaluate(0); var at1 = hips.position;
                cp.SetTime(2.0); g.Evaluate(0); var at2 = hips.position; var seen = sp.GetBehaviour().seen;
                o[scriptFirst ? "scriptOutputFirst" : "animationOutputFirst"] = (seen - at2).magnitude < 1e-4f ? "script sees THIS evaluation's pose (animation written first)" : (seen - at1).magnitude < 1e-4f ? "script sees the LAST evaluation's pose (script runs first)" : "neither: " + seen;
                g.Destroy();
            }
            UnityEngine.Object.DestroyImmediate(go);
            return o;
        }


        /// <summary>Every human bone of an actor of the built scene, walked through the timeline at `fps`: local rotations (hips in the actor's frame) and
        /// positions in the actor's frame, plus world feet. `call shotbones '{"from":53.6,"to":55.3,"on":"person","fps":30,"out":"captures/x.json"}'`. Puts time back.</summary>
        [BridgeCommand("shotbones")]
        static object ShotBones(JObject m)
        {
            var dir = UnityEngine.Object.FindAnyObjectByType<UnityEngine.Playables.PlayableDirector>(); if (!dir) throw new Exception("no director: build first");
            var who = MVActor.Named((string)m["on"] ?? "person"); if (!who || who.human.Length == 0) throw new Exception("no human " + m["on"]);
            double from = (double)m["from"], to = (double)m["to"], fps = (double?)m["fps"] ?? 30, keep = dir.time;
            var ids = Enumerable.Range(0, who.human.Length).Where(i => who.human[i]).ToArray();
            var frames = new JArray();
            try
            {
                for (double t = from; t <= to + 1e-6; t += 1 / fps)
                {
                    dir.time = t; dir.Evaluate();
                    var root = who.transform; var q = new JArray(); var p = new JArray();
                    foreach (var i in ids)
                    {
                        var b = who.human[i]; var r = i == (int)HumanBodyBones.Hips ? Quaternion.Inverse(root.rotation) * b.rotation : b.localRotation;
                        q.Add(new JArray(Math.Round(r.x, 5), Math.Round(r.y, 5), Math.Round(r.z, 5), Math.Round(r.w, 5)));
                        var lp = root.InverseTransformPoint(b.position); p.Add(new JArray(Math.Round(lp.x, 4), Math.Round(lp.y, 4), Math.Round(lp.z, 4)));
                    }
                    Vector3 lf = who.human[(int)HumanBodyBones.LeftFoot].position, rf = who.human[(int)HumanBodyBones.RightFoot].position;
                    var rp = root.position; var rq = root.rotation;   // the actor in the world, so a critic can tell root travel from body motion (Director/tools/critic.mjs)
                    frames.Add(new JObject { ["t"] = Math.Round(t, 4), ["q"] = q, ["p"] = p, ["feet"] = new JArray(lf.x, lf.y, lf.z, rf.x, rf.y, rf.z), ["native"] = who.native,
                        ["root"] = new JArray(Math.Round(rp.x, 4), Math.Round(rp.y, 4), Math.Round(rp.z, 4), Math.Round(rq.x, 5), Math.Round(rq.y, 5), Math.Round(rq.z, 5), Math.Round(rq.w, 5)) });
                }
            }
            finally { dir.time = keep; dir.Evaluate(); }
            var o = new JObject { ["on"] = who.name, ["native"] = who.native, ["fps"] = fps, ["from"] = from, ["to"] = to, ["bones"] = new JArray(ids.Select(i => ((HumanBodyBones)i).ToString())), ["frames"] = frames };
            RestAndCurl(who, ids, o);
            var file = Path.Combine(Bridge.Root, (string)m["out"] ?? "captures/shotbones.json");
            Directory.CreateDirectory(Path.GetDirectoryName(file)); File.WriteAllText(file, o.ToString(Newtonsoft.Json.Formatting.None));
            return new JObject { ["file"] = file, ["frames"] = frames.Count, ["native"] = who.native };
        }

        /// <summary>Each bone's rest rotation (relative to the actor) and, for fingers, the axis it curls around, by bone name: what a finger-curl or head-pitch measure needs.</summary>
        static void RestAndCurl(MVActor a, int[] ids, JObject o)
        {
            var rest = new JObject(); var curl = new JObject();
            foreach (var i in ids)
            {
                var nm = ((HumanBodyBones)i).ToString();
                if (i < a.humanRest.Length) { var q = a.humanRest[i]; rest[nm] = new JArray(Math.Round(q.x, 5), Math.Round(q.y, 5), Math.Round(q.z, 5), Math.Round(q.w, 5)); }
                if (i < a.curlAxis.Length && a.curlAxis[i] != Vector3.zero) { var v = a.curlAxis[i]; curl[nm] = new JArray(Math.Round(v.x, 4), Math.Round(v.y, 4), Math.Round(v.z, 4)); }
            }
            o["rest"] = rest; o["curl"] = curl;
        }

        /// <summary>A clip by name, played the plain Unity way (an Animator with the Humanoid Avatar in a PlayableGraph, Foot IK off unless `footIK`), every human bone at
        /// each frame in the same shape as `shotbones`: the motion critic's input for a clip or a keyed pose sheet's derived clip (Director/tools/critic.mjs).
        /// `call clipbones '{"clip":"mx_hh_step","model":"person","fps":30,"out":"gen/critic/clips/mx_hh_step.json","clean":false,"footIK":false,"secs":0}'`.
        /// `clean` plays `<clip>__clean` where there is one. Nothing on the render path: a throwaway copy, destroyed after.</summary>
        [BridgeCommand("clipbones")]
        static object ClipBones(JObject m)
        {
            string model = (string)m["model"] ?? "person", cn = (string)m["clip"] ?? throw new Exception("clipbones: no clip");
            var src = MVActor.Named(model); MVActor made = null;
            if (!src || !src.animRoot) { made = ScoreCompiler.LabActor(ScoreCompiler.ReadScore(), "__critsrc", model, new JObject { ["pos"] = new JArray(700, 0, 700) }); src = made; }
            if (!src || !src.animRoot) throw new Exception("no actor or model " + model);
            try
            {
                var clip = ((bool?)m["clean"] ?? false ? (src.FindClip(cn + "__clean") ?? FindAny(cn + "__clean")) : null) ?? src.FindClip(cn) ?? FindAny(cn);
                if (!clip) throw new Exception("no clip " + cn);
                double fps = (double?)m["fps"] ?? 30, secs = (double?)m["secs"] ?? 0; if (secs <= 0) secs = clip.length;
                int n = Math.Max(2, (int)Math.Round(secs * fps) + 1);
                var times = Enumerable.Range(0, n).Select(i => Math.Min(clip.length, i / fps)).ToArray();
                bool ik = (bool?)m["footIK"] ?? false;
                var r = UnityRec(src.animRoot, times, g => AnimationClipPlayable.Create(g, clip), (p, t) => { ((AnimationClipPlayable)p).SetApplyFootIK(ik); p.SetTime(t); });
                var frames = new JArray();
                int li = Array.IndexOf(r.ids, (int)HumanBodyBones.LeftFoot), ri = Array.IndexOf(r.ids, (int)HumanBodyBones.RightFoot);
                for (int f = 0; f < n; f++)
                {
                    var q = new JArray(); var p = new JArray();
                    for (int i = 0; i < r.ids.Length; i++) { var rq = r.q[f][i]; var rp = r.p[f][i]; q.Add(new JArray(Math.Round(rq.x, 5), Math.Round(rq.y, 5), Math.Round(rq.z, 5), Math.Round(rq.w, 5))); p.Add(new JArray(Math.Round(rp.x, 4), Math.Round(rp.y, 4), Math.Round(rp.z, 4))); }
                    Vector3 lf = li >= 0 ? r.p[f][li] : Vector3.zero, rf = ri >= 0 ? r.p[f][ri] : Vector3.zero;
                    frames.Add(new JObject { ["t"] = Math.Round(times[f], 4), ["q"] = q, ["p"] = p, ["feet"] = new JArray(lf.x, lf.y, lf.z, rf.x, rf.y, rf.z), ["root"] = new JArray(0, 0, 0, 0, 0, 0, 1) });
                }
                var o = new JObject { ["clip"] = clip.name, ["asked"] = cn, ["length"] = Math.Round(clip.length, 4), ["loop"] = clip.isLooping, ["human"] = clip.humanMotion, ["model"] = model, ["fps"] = fps, ["footIK"] = ik, ["native"] = true,
                    ["bones"] = new JArray(r.names), ["frames"] = frames };
                RestAndCurl(src, r.ids, o);
                var file = Path.Combine(Bridge.Root, (string)m["out"] ?? ("gen/critic/clips/" + cn + ".json"));
                Directory.CreateDirectory(Path.GetDirectoryName(file)); File.WriteAllText(file, o.ToString(Newtonsoft.Json.Formatting.None));
                return new JObject { ["file"] = file, ["frames"] = frames.Count, ["clip"] = clip.name, ["length"] = Math.Round(clip.length, 3) };
            }
            finally { if (made) UnityEngine.Object.DestroyImmediate(made.gameObject); }
        }

        [BridgeCommand("fidelity")]
        static object Fidelity(JObject m)
        {
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            if (!song) throw new Exception("no song map: build the video once");
            string model = (string)m["model"] ?? "person";
            var src = MVActor.Named(model); MVActor made = null;
            if (!src || !src.animRoot) { made = ScoreCompiler.LabActor(ScoreCompiler.ReadScore(), "__fidsrc", model, new JObject { ["pos"] = new JArray(700, 0, 700) }); src = made; }
            if (!src || !src.animRoot) throw new Exception("no actor or model " + model);
            try { return FidelityOn(m, model, src, song); } finally { if (made) UnityEngine.Object.DestroyImmediate(made.gameObject); }
        }

        static object FidelityOn(JObject m, string model, MVActor src, SongMap song)
        {
            var root = src.animRoot;
            double secs = (double?)m["secs"] ?? 4, t0 = (double?)m["from"] ?? 0.5;   // from 0.5 s: the lab's first frames build the transitions' memo
            int n = (int)(secs * FidHz);
            var times = Enumerable.Range(0, n).Select(i => t0 + i / (double)FidHz).ToArray();
            var outp = new JArray();
            string stages = (string)m["stages"] ?? "sample,footik,raw,limits,fingers,ground,inertia,default";
            foreach (var cn in ((JArray)m["clips"]).Select(x => (string)x))
            {
                var clip = src.FindClip(cn) ?? FindAny(cn); if (!clip) { outp.Add(cn + ": no clip"); continue; }
                double Lt(double t) => clip.isLooping || true ? t % clip.length : t;   // our engine loops any clip without `once`
                var truth = UnityRec(root, times, g => AnimationClipPlayable.Create(g, clip), (p, t) => { ((AnimationClipPlayable)p).SetApplyFootIK(false); p.SetTime(Lt(t)); });
                var rows = new JArray();
                if (stages.Contains("sample")) rows.Add(Measure(truth, SampleRec(root, clip, times.Select(Lt).ToArray()), "SampleAnimation (what our Sample calls)"));
                if (stages.Contains("footik")) rows.Add(Measure(truth, UnityRec(root, times, g => AnimationClipPlayable.Create(g, clip), (p, t) => { ((AnimationClipPlayable)p).SetApplyFootIK(true); p.SetTime(Lt(t)); }), "Unity with Foot IK on"));
                var cue = new JArray(new JObject { ["at"] = 0, ["do"] = "anim", ["clip"] = clip.name, ["blend"] = 0 });
                const string all = "ground,limits,fingers,inertia,overlap";
                if (stages.Contains("raw")) rows.Add(Measure(truth, OursRec(model, cue, times, all, song), "ours: anim only, all stages off"));
                if (stages.Contains("limits")) rows.Add(Measure(truth, OursRec(model, cue, times, "ground,fingers,inertia,overlap", song), "ours: + limits (default on)"));
                if (stages.Contains("fingers")) rows.Add(Measure(truth, OursRec(model, cue, times, "ground,limits,inertia,overlap", song), "ours: + fingers (default rest curl)"));
                if (stages.Contains("ground")) rows.Add(Measure(truth, OursRec(model, cue, times, "limits,fingers,inertia,overlap", song), "ours: + ground (default on)"));
                if (stages.Contains("default")) rows.Add(Measure(truth, OursRec(model, cue, times, "", song), "ours: defaults (a plain anim cue as a card plays it)"));
                outp.Add(new JObject { ["clip"] = clip.name, ["len"] = Math.Round(clip.length, 2), ["human"] = clip.humanMotion, ["loop"] = clip.isLooping, ["model"] = model, ["rows"] = rows });
            }
            // Two clips at once: a layer over the upper body, and a change of clip, against Unity's mixers on the same Avatar.
            if (m["pair"] is JArray pair && pair.Count == 2)
            {
                var A = src.FindClip((string)pair[0]) ?? FindAny((string)pair[0]); var B = src.FindClip((string)pair[1]) ?? FindAny((string)pair[1]);
                var rows = new JArray(); const string all = "ground,limits,fingers,inertia,overlap";
                foreach (var w in new[] { .5f, 1f })
                {
                    var mask = FidMask("upper");
                    var truth = UnityRec(root, times, g =>
                    {
                        var mix = AnimationLayerMixerPlayable.Create(g, 2);
                        g.Connect(NoIK(g, A), 0, mix, 0); g.Connect(NoIK(g, B), 0, mix, 1);
                        mix.SetInputWeight(0, 1); mix.SetInputWeight(1, w); mix.SetLayerMaskFromAvatarMask(1, mask);
                        return mix;
                    }, (p, t) => { p.GetInput(0).SetTime(t % A.length); p.GetInput(1).SetTime(t % B.length); });
                    var cues = new JArray(new JObject { ["at"] = 0, ["do"] = "anim", ["clip"] = A.name, ["blend"] = 0 }, new JObject { ["at"] = 0, ["do"] = "layer", ["clip"] = B.name, ["mask"] = "upper", ["weight"] = w, ["blend"] = 0 });
                    rows.Add(Measure(truth, OursRec(model, cues, times, all, song), $"layer upper w={w}: ours vs Unity layer mixer + AvatarMask"));
                    if (w >= 1)
                    {
                        var add = new JArray(cues[0], new JObject { ["at"] = 0, ["do"] = "layer", ["clip"] = B.name, ["mask"] = "upper", ["weight"] = 1, ["additive"] = 1, ["blend"] = 0 });
                        var truthAdd = UnityRec(root, times, g =>
                        {
                            var mix = AnimationLayerMixerPlayable.Create(g, 2);
                            g.Connect(NoIK(g, A), 0, mix, 0); g.Connect(NoIK(g, B), 0, mix, 1);
                            mix.SetInputWeight(0, 1); mix.SetInputWeight(1, 1); mix.SetLayerMaskFromAvatarMask(1, mask); mix.SetLayerAdditive(1, true);
                            return mix;
                        }, (p, t) => { p.GetInput(0).SetTime(t % A.length); p.GetInput(1).SetTime(t % B.length); });
                        rows.Add(Measure(truthAdd, OursRec(model, add, times, all, song), "layer upper additive: ours (ref frame 0) vs Unity additive layer (clip's first frame)"));
                    }
                }
                foreach (var blend in new[] { .2, .5 })
                {
                    double tc = t0 + secs * .4;
                    var truth = UnityRec(root, times, g =>
                    {
                        var mix = AnimationMixerPlayable.Create(g, 2);
                        g.Connect(NoIK(g, A), 0, mix, 0); g.Connect(NoIK(g, B), 0, mix, 1);
                        return mix;
                    }, (p, t) =>
                    {
                        float k = t < tc ? 0 : Ease.Apply("inout", (float)((t - tc) / blend));
                        p.SetInputWeight(0, 1 - k); p.SetInputWeight(1, k);
                        p.GetInput(0).SetTime(t % A.length); p.GetInput(1).SetTime(Math.Max(0, t - tc) % B.length);
                    });
                    JArray Cues(bool cross) => new JArray(new JObject { ["at"] = 0, ["do"] = "anim", ["clip"] = A.name, ["blend"] = 0 }, new JObject { ["at"] = tc, ["do"] = "anim", ["clip"] = B.name, ["blend"] = blend, ["crossfade"] = cross ? 1 : 0 });
                    rows.Add(Measure(truth, OursRec(model, Cues(false), times, "ground,limits,fingers,overlap", song), $"change of clip, blend {blend}s: ours inertial vs Unity mixer crossfade"));
                    rows.Add(Measure(truth, OursRec(model, Cues(true), times, all, song), $"change of clip, blend {blend}s: ours crossfade:1 (local slerp) vs Unity mixer crossfade"));
                }
                outp.Add(new JObject { ["pair"] = A.name + " + " + B.name, ["model"] = model, ["rows"] = rows });
            }
            return outp;
        }
    }
}
