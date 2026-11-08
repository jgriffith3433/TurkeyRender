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
    /// Imports every humanoid clip the way Unity means it to be (Director/research/unity-animation-done-right.md): Loop Time on clips whose last
    /// frame meets their first, Root Transform Rotation baked into the pose (Original), Position Y baked Based Upon Feet, Position XZ baked for
    /// clips that stay in place and kept as root motion for clips that travel. Each clip is measured on the person's own rig first.
    /// `mv call clipimport '{"apply":false}'` writes the choices to Director/library/motion/import.json and changes nothing;
    /// `"apply":true` also sets them and reimports. `"only":["mx_hh_step"]` for some. MVMotionImport reads import.json on every reimport.
    /// </summary>
    public static class MVClipImport
    {
        public static string ChoicesFile => Path.Combine(Bridge.Root, "library", "motion", "import.json");
        static JObject _choices;
        public static void Forget() => _choices = null;
        public static JObject Choices { get { if (_choices == null) { try { _choices = File.Exists(ChoicesFile) ? JObject.Parse(File.ReadAllText(ChoicesFile)) : new JObject(); } catch { _choices = new JObject(); } } return _choices; } }

        /// <summary>Puts the recorded choice on one clip's import settings. False when there is none.</summary>
        /// <summary>Whether Unity's Foot IK helps this clip on our rig (measured by clipimport). Off when unmeasured.</summary>
        public static bool FootIKFor(string clip) => (bool?)Choices["clips"]?[clip]?["choice"]?["footIK"] == true;

        public static bool ApplyTo(ModelImporterClipAnimation c)
        {
            if (!(Choices["clips"]?[c.name]?["choice"] is JObject ch)) return false;
            c.loopTime = (bool)ch["loopTime"]; c.loopPose = false;
            c.lockRootRotation = (bool)ch["bakeRotation"]; c.keepOriginalOrientation = true;
            c.lockRootHeightY = (bool)ch["bakeY"]; c.heightFromFeet = (bool)ch["yFromFeet"]; c.keepOriginalPositionY = !(bool)ch["yFromFeet"];
            c.lockRootPositionXZ = (bool)ch["bakeXZ"]; c.keepOriginalPositionXZ = true;
            return true;
        }

        static IEnumerable<string> Files()
        {
            foreach (var f in Directory.GetFiles(ScoreCompiler.MotionFolder, "*.fbx")) yield return f.Replace('\\', '/');
            if (Directory.Exists("Assets/PROTOFACTOR"))
                foreach (var f in Directory.GetFiles("Assets/PROTOFACTOR", "*.fbx", SearchOption.AllDirectories)) yield return f.Replace('\\', '/');
        }

        static readonly int[] Major = { (int)HumanBodyBones.Spine, (int)HumanBodyBones.Chest, (int)HumanBodyBones.Neck, (int)HumanBodyBones.Head, (int)HumanBodyBones.LeftUpperArm, (int)HumanBodyBones.RightUpperArm, (int)HumanBodyBones.LeftLowerArm, (int)HumanBodyBones.RightLowerArm, (int)HumanBodyBones.LeftUpperLeg, (int)HumanBodyBones.RightUpperLeg, (int)HumanBodyBones.LeftLowerLeg, (int)HumanBodyBones.RightLowerLeg, (int)HumanBodyBones.LeftFoot, (int)HumanBodyBones.RightFoot };

        /// <summary>Where the body is (root plus hips, flat) and how each major joint sits, at clip time t.</summary>
        static (Vector3 at, float hipsY, Quaternion[] q) Pose(GameObject go, Animator an, AnimationClip clip, float t)
        {
            go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity;
            clip.SampleAnimation(go, t);
            var hips = an.GetBoneTransform(HumanBodyBones.Hips);
            var p = hips.position; var q = Major.Select(b => an.GetBoneTransform((HumanBodyBones)b)?.localRotation ?? Quaternion.identity).ToArray();
            go.transform.localPosition = Vector3.zero; go.transform.localRotation = Quaternion.identity;
            return (new Vector3(p.x, 0, p.z), p.y, q);
        }

        /// <summary>Unity's Foot IK on this clip against off, on the person's rig at 30 Hz: how far it moves the legs, whether a knee flips, and the foot slide each way.
        /// On only when it cuts the slide by a third or more without moving a knee past 25 degrees.</summary>
        static JObject FootIK(GameObject src, Animator an0, AnimationClip clip)
        {
            int n = Mathf.Clamp(Mathf.CeilToInt(clip.length * 30), 2, 900);
            var legs = new[] { HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot };
            var go = UnityEngine.Object.Instantiate(src); go.hideFlags = HideFlags.DontSave; go.transform.position = new Vector3(900, 0, 900);
            var an = go.GetComponentInChildren<Animator>(true); an.enabled = true; an.applyRootMotion = false; an.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // off camera a culled Animator never moves
            var rec = new Quaternion[2][][]; var feet = new Vector3[2][][];
            try
            {
                for (int k = 0; k < 2; k++)
                {
                    var g = PlayableGraph.Create("footik"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                    var p = AnimationClipPlayable.Create(g, clip); p.SetApplyFootIK(k == 1);
                    AnimationPlayableOutput.Create(g, "o", an).SetSourcePlayable(p);
                    rec[k] = new Quaternion[n][]; feet[k] = new Vector3[n][];
                    for (int f = 0; f < n; f++)
                    {
                        p.SetTime((clip.length - 1 / 60f) * f / (n - 1)); g.Evaluate(0);
                        rec[k][f] = legs.Select(b => an.GetBoneTransform(b).localRotation).ToArray();
                        feet[k][f] = new[] { go.transform.InverseTransformPoint(an.GetBoneTransform(HumanBodyBones.LeftFoot).position), go.transform.InverseTransformPoint(an.GetBoneTransform(HumanBodyBones.RightFoot).position) };
                    }
                    g.Destroy();
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }
            float change = 0, knee = 0;
            for (int f = 0; f < n; f++) for (int i = 0; i < legs.Length; i++) { float e = Quaternion.Angle(rec[0][f][i], rec[1][f][i]); change = Mathf.Max(change, e); if (i == 1 || i == 4) knee = Mathf.Max(knee, e); }
            float Slide(Vector3[][] fs)
            {
                float s = 0;
                for (int side = 0; side < 2; side++)
                {
                    float low = fs.Min(x => x[side].y);
                    for (int f = 1; f < fs.Length; f++) if (fs[f][side].y < low + .03f && fs[f - 1][side].y < low + .03f) { var d = fs[f][side] - fs[f - 1][side]; d.y = 0; s += d.magnitude; }
                }
                return s * 100 / Mathf.Max(clip.length, .01f);
            }
            float off = Slide(feet[0]), on = Slide(feet[1]);
            bool flip = knee > 90;
            return new JObject { ["legChangeMaxDeg"] = Math.Round(change, 1), ["kneeChangeMaxDeg"] = Math.Round(knee, 1), ["kneeFlip"] = flip, ["slideOffCmPerS"] = Math.Round(off, 1), ["slideOnCmPerS"] = Math.Round(on, 1), ["verdict"] = !flip && knee <= 25 && off > .5f && on <= off * .67f };
        }

        [BridgeCommand("clipimport")]
        static object Run(JObject m)
        {
            bool apply = (bool?)m?["apply"] == true;
            string prefix = (string)m?["prefix"];
            var only = (m?["only"] as JArray)?.Select(x => ((string)x).ToLowerInvariant()).ToHashSet();
            var person = MVActor.Named((string)m?["on"] ?? "person");
            if (!person || !person.animRoot) throw new Exception("no person in the open scene to measure clips on");
            var go = UnityEngine.Object.Instantiate(person.animRoot); go.hideFlags = HideFlags.DontSave;
            var an = go.GetComponentInChildren<Animator>(true);
            var doc = File.Exists(ChoicesFile) ? JObject.Parse(File.ReadAllText(ChoicesFile)) : new JObject();
            doc["about"] = "Import choices for every humanoid clip, measured on the person's rig by `call clipimport` (Editor/Native/MVClipImport.cs). loop: last frame meets the first (major joints within 20 deg, mean 8, hips 5 cm). travelling: the body ends 0.5 m or more from where it began, or averages 0.35 m/s. choice: Loop Time and Bake Into Pose (rotation, Y, and XZ unless travelling) only on loops; Root Transform Position Y Based Upon Feet on every clip; footIK from footIKTest (Unity Foot IK on against off: on only if it cuts foot slide by a third with no knee moved past 25 deg). before: the settings it had.";
            if (!(doc["clips"] is JObject clips)) doc["clips"] = clips = new JObject();   // assigning a token that already has a parent clones it, so only a new one
            int seen = 0, changed = 0, files = 0; var touched = new List<string>();
            try
            {
                foreach (var path in Files())
                {
                    if (!(AssetImporter.GetAtPath(path) is ModelImporter imp) || imp.animationType != ModelImporterAnimationType.Human) continue;
                    var defs = imp.clipAnimations.Length > 0 ? imp.clipAnimations : imp.defaultClipAnimations;
                    var assets = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview")).ToArray();
                    bool any = false;
                    foreach (var d in defs)
                    {
                        if (only != null && !only.Contains(d.name.ToLowerInvariant())) continue;
                        if (prefix != null && !d.name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;
                        var clip = assets.FirstOrDefault(c => c.name == d.name); if (!clip) continue;
                        seen++;
                        float len = clip.length; int n = Mathf.Clamp(Mathf.CeilToInt(len * 10), 2, 200);
                        var p0 = Pose(go, an, clip, 0); var p1 = Pose(go, an, clip, Mathf.Max(0, len - 1 / 60f));   // at exactly its length a clip can read as its first frame
                        float far = 0; for (int i = 1; i <= n; i++) far = Mathf.Max(far, (Pose(go, an, clip, len * i / n).at - p0.at).magnitude);
                        float travel = (p1.at - p0.at).magnitude, speed = travel / Mathf.Max(len, .01f);
                        var errs = p0.q.Zip(p1.q, (a, b) => Quaternion.Angle(a, b)).ToArray();
                        bool loop = errs.Max() < 20 && errs.Average() < 8 && Mathf.Abs(p1.hipsY - p0.hipsY) < .05f && len > .3f;
                        bool travelling = travel >= .5f || speed >= .35f;
                        var ik = FootIK(go, an, clip);
                        var choice = new JObject { ["loopTime"] = loop, ["bakeRotation"] = loop, ["bakeY"] = loop, ["yFromFeet"] = true, ["bakeXZ"] = loop && !travelling, ["footIK"] = (bool)ik["verdict"] };
                        var before = new JObject { ["loopTime"] = d.loopTime, ["bakeRotation"] = d.lockRootRotation, ["bakeY"] = d.lockRootHeightY, ["yFromFeet"] = d.heightFromFeet, ["yOriginal"] = d.keepOriginalPositionY, ["bakeXZ"] = d.lockRootPositionXZ };
                        var prevBefore = clips[d.name]?["before"];
                        clips[d.name] = new JObject
                        {
                            ["path"] = path, ["length"] = Math.Round(len, 3), ["loop"] = loop, ["loopErrMaxDeg"] = Math.Round(errs.Max(), 1), ["loopErrMeanDeg"] = Math.Round(errs.Average(), 1),
                            ["travelling"] = travelling, ["travelM"] = Math.Round(travel, 3), ["farthestM"] = Math.Round(far, 3), ["choice"] = choice, ["footIKTest"] = ik, ["before"] = prevBefore ?? before,
                        };
                        if (apply && !JToken.DeepEquals(choice, new JObject { ["loopTime"] = d.loopTime, ["bakeRotation"] = d.lockRootRotation, ["bakeY"] = d.lockRootHeightY, ["yFromFeet"] = d.heightFromFeet, ["bakeXZ"] = d.lockRootPositionXZ, ["footIK"] = (bool)choice["footIK"] })) any = true;
                    }
                    if (apply && any)
                    {
                        File.WriteAllText(ChoicesFile, doc.ToString()); _choices = null;   // MVMotionImport reads it during the reimport
                        foreach (var d in defs) if (ApplyTo(d)) changed++;
                        imp.clipAnimations = defs;
                        imp.SaveAndReimport(); files++; touched.Add(path);
                    }
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(go); }
            File.WriteAllText(ChoicesFile, doc.ToString()); _choices = null;
            var vals = clips.Properties().Select(p => p.Value).Where(v => only == null || only.Contains(((JProperty)v.Parent).Name.ToLowerInvariant())).ToList();
            return new JObject
            {
                ["clipsMeasured"] = seen, ["loops"] = vals.Count(v => (bool)v["loop"]), ["travelling"] = vals.Count(v => (bool)v["travelling"]),
                ["applied"] = apply, ["clipsChanged"] = changed, ["filesReimported"] = files, ["file"] = ChoicesFile, ["sample"] = new JArray(touched.Take(5)),
            };
        }
    }
}
