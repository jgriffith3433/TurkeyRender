using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Clip admission: the lab, run over a list of clips on one throwaway copy of an actor. Every clip plays through the whole body stack with its
    /// root motion and joint limits on, and comes back as numbers. Director/tools/clip_admit.mjs turns them into the catalogue.</summary>
    public static partial class MotionLab
    {
        // Capsules as in MotionCheck, for the person: name, from, to, radius.
        static readonly (string n, HumanBodyBones a, HumanBodyBones b, float r)[] Caps =
        {
            ("hips", HumanBodyBones.Hips, HumanBodyBones.Spine, .13f), ("belly", HumanBodyBones.Spine, HumanBodyBones.Chest, .12f), ("chest", HumanBodyBones.Chest, HumanBodyBones.Neck, .13f),
            ("head", HumanBodyBones.Neck, HumanBodyBones.Head, .09f),
            ("thighL", HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, .062f), ("thighR", HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, .062f),
            ("shinL", HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, .045f), ("shinR", HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, .045f),
            ("forearmL", HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, .032f), ("forearmR", HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, .032f),
            ("handL", HumanBodyBones.LeftHand, HumanBodyBones.LeftMiddleProximal, .03f), ("handR", HumanBodyBones.RightHand, HumanBodyBones.RightMiddleProximal, .03f),
        };
        static readonly (string, string)[] CapPairs =
        {
            ("forearmL", "chest"), ("forearmL", "belly"), ("forearmL", "hips"), ("forearmL", "thighL"), ("forearmL", "thighR"), ("forearmL", "head"),
            ("forearmR", "chest"), ("forearmR", "belly"), ("forearmR", "hips"), ("forearmR", "thighL"), ("forearmR", "thighR"), ("forearmR", "head"),
            ("handL", "chest"), ("handL", "belly"), ("handL", "thighL"), ("handL", "thighR"), ("handL", "head"), ("handR", "chest"), ("handR", "belly"), ("handR", "thighL"), ("handR", "thighR"), ("handR", "head"),
            ("forearmL", "forearmR"), ("shinL", "shinR"), ("thighL", "shinR"), ("thighR", "shinL"),
        };

        static float SegDist(Vector3 p1, Vector3 q1, Vector3 p2, Vector3 q2)
        {
            Vector3 d1 = q1 - p1, d2 = q2 - p2, r = p1 - p2; float a = Vector3.Dot(d1, d1), e = Vector3.Dot(d2, d2), f = Vector3.Dot(d2, r), s, t;
            if (a < 1e-8f && e < 1e-8f) return r.magnitude;
            float c = Vector3.Dot(d1, r);
            if (a < 1e-8f) { s = 0; t = Mathf.Clamp01(f / e); }
            else if (e < 1e-8f) { t = 0; s = Mathf.Clamp01(-c / a); }
            else
            {
                float b = Vector3.Dot(d1, d2), den = a * e - b * b;
                s = den > 1e-8f ? Mathf.Clamp01((b * f - c * e) / den) : 0;
                t = (b * s + f) / e;
                if (t < 0) { t = 0; s = Mathf.Clamp01(-c / a); } else if (t > 1) { t = 1; s = Mathf.Clamp01((b - c) / a); }
            }
            return ((p1 + d1 * s) - (p2 + d2 * t)).magnitude;
        }

        /// <summary>Plays one clip and measures it. Horizontal foot motion is judged in the stance phase only, against the clip's own treadmill speed when it walks in place.</summary>
        static JObject AdmitOne(Clone cl, SongMap song, JObject score, AnimationClip clip, Transform[] bones, double at)
        {
            var a = cl.a; float len = clip.length;
            cl.ops.Clear();
            var sc = ScoreCompiler.ForLab(song, new Dictionary<string, MVActor> { ["person"] = a }, cl.ops, score);
            sc.LabCue(new JObject { ["at"] = at, ["do"] = "anim", ["on"] = "person", ["clip"] = clip.name, ["once"] = 1, ["root"] = 1, ["blend"] = 0, ["for"] = len + .1f });
            if (cl.ops.Count == 0) return new JObject { ["error"] = string.Join("; ", sc.Warnings) };
            cl.ops[0].refs = new UnityEngine.Object[] { clip };
            Arm(cl, song); cl.d.MeasureLimits = true; cl.d.NoGround = true;
            int n = Mathf.Max(2, Mathf.CeilToInt(len * 30));
            float dt = len / n;
            Transform H(HumanBodyBones b) => a.human.Length > (int)b ? a.human[(int)b] : null;
            Transform lf = H(HumanBodyBones.LeftFoot), rf = H(HumanBodyBones.RightFoot), hips = H(HumanBodyBones.Hips);
            var caps = Caps.Where(c => H(c.a) && H(c.b)).ToDictionary(c => c.n, c => (H(c.a), H(c.b), c.r));
            var pts = new Vector3[n + 1][]; var L = new Vector3[n + 1]; var R = new Vector3[n + 1]; var HP = new Vector3[n + 1];
            var beatBones = MotionBeats.Points.Select(H).Where(x => x).ToArray();
            var speed = new float[n]; Vector3[] lastB = null;
            float selfDeep = 0, selfAt = 0; string selfWho = ""; int selfFrames = 0; float rootY0 = 0, rootYmin = 1e9f;
            Vector3 root0 = default, rootN = default; float yaw0 = 0, yawN = 0;
            for (int i = 0; i <= n; i++)
            {
                double t = at + (double)dt * i;
                cl.d.Eval(t);
                pts[i] = bones.Select(b => b.position).ToArray(); L[i] = lf.position; R[i] = rf.position; HP[i] = hips.position;
                var p = a.transform.position; if (i == 0) { root0 = p; rootY0 = p.y; yaw0 = a.transform.eulerAngles.y; } rootN = p; yawN = a.transform.eulerAngles.y; rootYmin = Mathf.Min(rootYmin, p.y);
                var now = beatBones.Select(b => a.transform.InverseTransformPoint(b.position)).ToArray();
                if (lastB != null) speed[i - 1] = MotionBeats.SpeedOf(lastB, now, dt); lastB = now;
                float worst = 0; string who = "";
                foreach (var (x, y) in CapPairs)
                {
                    if (!caps.TryGetValue(x, out var cx) || !caps.TryGetValue(y, out var cy)) continue;
                    float d = cx.Item3 + cy.Item3 - SegDist(cx.Item1.position, cx.Item2.position, cy.Item1.position, cy.Item2.position);
                    if (d > worst) { worst = d; who = x + "/" + y; }
                }
                if (worst > .03f) selfFrames++;
                if (worst > selfDeep) { selfDeep = worst; selfWho = who; selfAt = (float)(t - at); }
            }
            // Pops: a bone's path kinks harder than a hard move can. Reported as metres of kink in one 30 fps frame.
            float kink = 0, kinkAt = 0; string kinkWho = ""; var kinks = new List<float>();
            float s2 = 1 / Mathf.Max((dt * 30) * (dt * 30), .01f);
            for (int i = 1; i < n; i++)
            {
                float w = 0; int who = 0;
                for (int b = 0; b < bones.Length; b++) { float k = (pts[i + 1][b] - 2 * pts[i][b] + pts[i - 1][b]).magnitude * s2; if (k > w) { w = k; who = b; } }
                kinks.Add(w);
                if (w > kink) { kink = w; kinkWho = bones[who].name; kinkAt = dt * i; }
            }
            kinks.Sort(); float kinkMed = kinks.Count > 0 ? kinks[kinks.Count / 2] : 0;
            // Foot slide.
            float floor = Mathf.Min(L.Min(p => p.y), R.Min(p => p.y));
            var tread = new JObject();
            float Slide(Vector3[] f, out float total, out int stance, out Vector3 belt)
            {
                var steps = new List<Vector3>(); float worst = 0; total = 0; stance = 0;
                for (int i = 1; i <= n; i++)
                {
                    if (f[i].y > floor + .045f || f[i - 1].y > floor + .045f) continue;
                    var d = f[i] - f[i - 1]; d.y = 0; if (d.magnitude / dt > 3.5f) continue; // a swing passing low, not a stance
                    steps.Add(d);
                }
                stance = steps.Count; belt = Vector3.zero;
                if (steps.Count == 0) return 0;
                // Walking in place: the stance foot rides a belt. Only what differs from that belt is a slide.
                var sx = steps.Select(d => d.x).OrderBy(x => x).ToArray(); var sz = steps.Select(d => d.z).OrderBy(x => x).ToArray();
                belt = new Vector3(sx[sx.Length / 2], 0, sz[sz.Length / 2]);
                foreach (var d in steps) { float v = (d - belt).magnitude; if (v / dt > 1.5f) continue; total += v; worst = Mathf.Max(worst, v); } // over 1.5 m/s off the belt is a foot leaving or landing, not one sliding
                return worst;
            }
            float sl = Slide(L, out var tl, out var cl0, out var bl), sr = Slide(R, out var tr, out var cr0, out var br);
            float scale = 1 / (dt * 30);
            var d0 = rootN - root0; var beats = MotionBeats.Detect(speed, 1 / dt);
            // Loop: how far the body at the end is from the body at the start, with travel taken out.
            float gap = 0;
            for (int b = 0; b < bones.Length; b++)
            {
                var x = pts[n][b] - HP[n]; var y = pts[0][b] - HP[0];
                if (Mathf.Abs(Mathf.DeltaAngle(yaw0, yawN)) < 8) gap = Mathf.Max(gap, (x - y).magnitude);
                else gap = 9;
            }
            var limits = cl.d.LimitWorst.OrderByDescending(x => x.Value).Take(3).ToList();
            var o = new JObject
            {
                ["length"] = Math.Round(len, 3), ["frames"] = n + 1, ["loopFlag"] = clip.isLooping, ["loopGap"] = Math.Round(gap, 3),
                ["rootTravel"] = new JArray(Math.Round(d0.x, 3), Math.Round(d0.y, 3), Math.Round(d0.z, 3)), ["rootYaw"] = Math.Round(Mathf.DeltaAngle(yaw0, yawN), 1),
                ["hipsTravel"] = Math.Round(new Vector3(HP[n].x - HP[0].x, 0, HP[n].z - HP[0].z).magnitude, 3), ["hipsLow"] = Math.Round(HP.Min(p => p.y) - root0.y, 3), ["hipsTop"] = Math.Round(HP.Max(p => p.y) - root0.y, 3),
                ["feetLow"] = Math.Round(floor - root0.y, 3), ["limitsWorst"] = limits.Count > 0 ? Math.Round(limits[0].Value, 1) : 0, ["limitsBone"] = limits.Count > 0 ? limits[0].Key : "",
                ["popKink"] = Math.Round(kink, 3), ["popMedian"] = Math.Round(kinkMed, 3), ["popBone"] = kinkWho, ["popAt"] = Math.Round(kinkAt, 2),
                ["slideWorstCm"] = Math.Round(Mathf.Max(sl, sr) * 100 * scale, 2), ["slideTotalCm"] = Math.Round((tl + tr) * 100, 1), ["stanceFrames"] = cl0 + cr0,
                ["beltMs"] = Math.Round(Mathf.Max(bl.magnitude, br.magnitude) / dt, 3),
                ["selfCm"] = Math.Round(selfDeep * 100, 1), ["selfPair"] = selfWho, ["selfAt"] = Math.Round(selfAt, 2), ["selfFrames"] = selfFrames,
                ["energy"] = Math.Round(beats.energy, 2), ["beats"] = new JArray(beats.t.Select(x => (object)Math.Round(x, 3)).ToArray()), ["beatStrength"] = new JArray(beats.s.Select(x => (object)Math.Round(x, 2)).ToArray()),
            };
            return o;
        }

        /// <summary>call admit '{"clips":["IdleBreathe",...],"budget":120}': measures as many as fit in the budget, in order, and says what's left.</summary>
        [BridgeCommand("admit")]
        static object Admit(JObject m)
        {
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            var score = JObject.Parse(File.ReadAllText(ScoreCompiler.ScoreFile));
            var cl = Spawn("__lab_admit", (string)m["on"] ?? "person", new JObject());
            var clock = System.Diagnostics.Stopwatch.StartNew();
            float budget = (float?)m["budget"] ?? 120; var done = new JObject(); var left = new JArray();
            try
            {
                var bones = BonesOf(cl.a); double at = (double?)m["at"] ?? 2;
                foreach (var nameT in (JArray)m["clips"])
                {
                    var name = (string)nameT;
                    if (clock.Elapsed.TotalSeconds > budget) { left.Add(name); continue; }
                    try
                    {
                        var clip = cl.a.FindClip(name); if (clip == null || !clip.name.Equals(name, StringComparison.OrdinalIgnoreCase)) clip = FindAny(name);
                        if (!clip) { done[name] = new JObject { ["error"] = "no such clip in the project" }; continue; }
                        var card = AdmitOne(cl, song, score, clip, bones, at);
                        card["path"] = AssetDatabase.GetAssetPath(clip);
                        done[name] = card;
                    }
                    catch (Exception e) { done[name] = new JObject { ["error"] = e.GetType().Name + ": " + e.Message }; }
                }
            }
            finally { if (cl.a) UnityEngine.Object.DestroyImmediate(cl.a.gameObject); MotionDriver.History = 0; }
            return new JObject { ["done"] = done, ["left"] = left, ["seconds"] = Math.Round(clock.Elapsed.TotalSeconds, 1) };
        }
    }
}
