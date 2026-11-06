using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace TKShock.MV.EditorTools
{
    /// <summary>One `ragdoll` cue waiting to be baked.</summary>
    public class RagJob { public string name; public double t, len; public JObject cue; public AnimationClip clip, target; public float targetTime; public string file; }

    /// <summary>
    /// Baked ragdoll. From his pose at the cue, a physics rig in its own preview scene falls with fixed steps, then everything is written
    /// to an AnimationClip, so playback is a plain clip: a pure function of time that scrubs backward exactly. Same cue, pose and seed, same clip.
    /// </summary>
    public static class RagdollBaker
    {
        const float Dt = 1 / 120f; const int Every = 2;
        public static string LockFile => Path.Combine(Bridge.Root, "gen", "ragdoll.lock.json");

        class Def { public HumanBodyBones b, parent, tip; public float r, mass, twist, swing, len; public int bend; public Rigidbody rb; public ConfigurableJoint j; public Transform bone; public Quaternion joint, restLocal, aim; }

        static Def D(HumanBodyBones b, HumanBodyBones parent, HumanBodyBones tip, float r, float mass, float twist, float swing, float len = 0, int bend = 0) => new Def { b = b, parent = parent, tip = tip, r = r, mass = mass, twist = twist, swing = swing, len = len, bend = bend };

        static List<Def> Plan()
        {
            const HumanBodyBones Hips = HumanBodyBones.Hips, None = HumanBodyBones.LastBone;
            var l = new List<Def>
            {
                D(Hips, None, HumanBodyBones.Spine, .14f, 12, 0, 0),
                D(HumanBodyBones.Spine, Hips, HumanBodyBones.Chest, .13f, 9, 14, 16),
                D(HumanBodyBones.Chest, HumanBodyBones.Spine, HumanBodyBones.Neck, .15f, 12, 12, 14),
                D(HumanBodyBones.Head, HumanBodyBones.Chest, None, .1f, 5, 40, 40, .2f),
            };
            foreach (var s in new[] { 0, 1 })
            {
                HumanBodyBones P(HumanBodyBones left, HumanBodyBones right) => s == 0 ? left : right;
                var UA = P(HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm); var LA = P(HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm); var HA = P(HumanBodyBones.LeftHand, HumanBodyBones.RightHand);
                var UL = P(HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg); var LL = P(HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg); var FT = P(HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot);
                l.Add(D(UA, HumanBodyBones.Chest, LA, .05f, 2.5f, 60, 100));
                l.Add(D(LA, UA, HA, .045f, 1.6f, 0, 0, 0, 1));
                l.Add(D(HA, LA, P(HumanBodyBones.LeftMiddleProximal, HumanBodyBones.RightMiddleProximal), .04f, .5f, 30, 55));
                l.Add(D(UL, Hips, LL, .075f, 8, 25, 62));
                l.Add(D(LL, UL, FT, .055f, 4, 0, 0, 0, -1));
                l.Add(D(FT, LL, None, .045f, 1, 10, 40, .18f));
            }
            return l;
        }

        static Vector3 V(JToken j, Vector3 d = default) => j is JArray a && a.Count == 3 ? new Vector3((float)a[0], (float)a[1], (float)a[2]) : d;

        static PhysicsMaterial _mat;
        static PhysicsMaterial Mat => _mat ? _mat : _mat = new PhysicsMaterial("rag") { dynamicFriction = .7f, staticFriction = .8f, bounciness = .05f, frictionCombine = PhysicsMaterialCombine.Average };

        static void Solid(Scene sc, Vector3 pos, Quaternion rot, Vector3 size, Vector3 center)
        {
            var go = new GameObject("solid"); SceneManager.MoveGameObjectToScene(go, sc);
            go.transform.SetPositionAndRotation(pos, rot); go.transform.localScale = size;
            var c = go.AddComponent<BoxCollider>(); c.center = center; c.size = Vector3.one; c.sharedMaterial = Mat;
        }

        /// <summary>What the bake depends on, so an unchanged cue is not simulated again on every build.</summary>
        static string Stamp(MVActor actor, RagJob job)
        {
            var h = new System.Text.StringBuilder(job.cue.ToString(Newtonsoft.Json.Formatting.None));
            foreach (var b in actor.human) if (b) h.Append(b.position.ToString("0.000")).Append(b.rotation.eulerAngles.ToString("0.0"));
            using (var md5 = System.Security.Cryptography.MD5.Create()) return BitConverter.ToString(md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(h.ToString()))).Replace("-", "") + "v5";
        }

        public static void BakeAll(IEnumerable<RagJob> jobs, Func<string, MVActor> find, Action<MVActor, double> seek, List<string> warn)
        {
            var map = File.Exists(LockFile) ? JObject.Parse(File.ReadAllText(LockFile)) : new JObject();
            bool changed = false;
            foreach (var job in jobs.OrderBy(j => j.t))
            {
                var actor = find(job.name);
                if (!actor || actor.human.Length == 0) { warn.Add($"{job.name}: ragdoll needs a humanoid"); continue; }
                seek(actor, job.t - 1 / 60.0);
                var prev = actor.human.Select(b => b ? (b.position, b.rotation) : default).ToArray();
                Quaternion[] aim = null;
                if (job.target)
                {
                    // The pose he fights toward: that frame of a clip, read off the rig and put back.
                    var tr = actor.animRoot.transform; var kp = tr.localPosition; var kr = tr.localRotation;
                    job.target.SampleAnimation(actor.animRoot, job.targetTime);
                    aim = actor.human.Select(b => b ? b.rotation : Quaternion.identity).ToArray();
                    tr.localPosition = kp; tr.localRotation = kr;
                }
                seek(actor, job.t + 1e-6);
                seek(actor, job.t);
                string stamp = Stamp(actor, job);
                if (job.file != null && (string)map[job.file] == stamp && job.clip.length > 0) continue;
                Bake(actor, job, prev, aim, warn);
                if (job.file != null) { map[job.file] = stamp; changed = true; EditorUtility.SetDirty(job.clip); }
            }
            if (changed) { File.WriteAllText(LockFile, map.ToString()); AssetDatabase.SaveAssets(); }
        }

        static void Bake(MVActor actor, RagJob job, (Vector3 position, Quaternion rotation)[] prev, Quaternion[] aim, List<string> warn)
        {
            var c = job.cue; var go = actor.animRoot;
            var rand = new System.Random((int?)c["seed"] ?? 1);
            float R() => (float)rand.NextDouble() - .5f;
            var scene = EditorSceneManager.NewPreviewScene();
            var ps = scene.GetPhysicsScene();
            try
            {
                // Everything the bones should do, read before physics touches anything.
                var rig = go.GetComponentsInChildren<Transform>(true).Where(t => t != go.transform && t.GetComponent<Renderer>() == null).ToArray();
                var startP = rig.Select(t => t.localPosition).ToArray(); var startR = rig.Select(t => t.localRotation).ToArray();
                var plan = Plan().Where(d => actor.human[(int)d.b]).ToList();
                foreach (var d in plan) d.bone = actor.human[(int)d.b];
                Transform Bn(HumanBodyBones b) => b < HumanBodyBones.LastBone ? actor.human[(int)b] : null;

                // The floor is under him wherever the set is: sets sit far apart. The ankle is about 8 cm above the sole.
                var hipsNow = actor.human[(int)HumanBodyBones.Hips].position;
                float feet = Mathf.Min(actor.human[(int)HumanBodyBones.LeftFoot].position.y, actor.human[(int)HumanBodyBones.RightFoot].position.y) - .08f;
                float floor = (float?)c["floor"] ?? feet;
                Solid(scene, new Vector3(hipsNow.x, floor - .5f, hipsNow.z), Quaternion.identity, new Vector3(400, 1, 400), Vector3.zero);
                var names = c["collide"] is JArray ca ? ca.Select(x => (string)x).ToArray() : c["collide"] != null ? new[] { (string)c["collide"] } : new string[0];
                foreach (var n in names)
                {
                    var tr = MVActor.Point(n, job.t); if (!tr) { warn.Add($"ragdoll: no actor '{n}' to collide with"); continue; }
                    foreach (var r in tr.GetComponentsInChildren<Renderer>(true))
                    {
                        if (r is ParticleSystemRenderer) continue;
                        var b = r.localBounds; if ((bool?)c["debug"] == true) warn.Add($"solid {r.name} at {r.transform.TransformPoint(b.center)} size {Vector3.Scale(b.size, r.transform.lossyScale)}");
                        Solid(scene, r.transform.TransformPoint(b.center), r.transform.rotation, Vector3.Scale(b.size, r.transform.lossyScale), Vector3.zero);
                    }
                }

                var holder = new GameObject("rag"); SceneManager.MoveGameObjectToScene(holder, scene);
                var byBone = new Dictionary<HumanBodyBones, Def>();
                // Bodies in the rest pose first: a joint's limits are measured from the relative rotation it is made in, and rest is where limits mean something.
                foreach (var d in plan)
                {
                    var o = new GameObject(d.b.ToString()); o.transform.SetParent(holder.transform, false);
                    o.transform.rotation = actor.humanRest[(int)d.b];
                    var tip = Bn(d.tip);
                    var local = tip ? Quaternion.Inverse(d.bone.rotation) * (tip.position - d.bone.position) : Quaternion.Inverse(d.bone.rotation) * (d.b == HumanBodyBones.Head ? go.transform.up : go.transform.forward) * d.len;
                    float L = Mathf.Max(local.magnitude, .04f);
                    var col = new GameObject("c"); col.transform.SetParent(o.transform, false); col.transform.localRotation = Quaternion.LookRotation(local.normalized);
                    if (d.b == HumanBodyBones.Head) { var s = col.AddComponent<SphereCollider>(); s.radius = d.r; s.center = new Vector3(0, 0, L * .5f); s.sharedMaterial = Mat; }
                    else { var cap = col.AddComponent<CapsuleCollider>(); cap.direction = 2; cap.radius = d.r; cap.height = L + d.r * 2; cap.center = new Vector3(0, 0, L * .5f); cap.sharedMaterial = Mat; }
                    d.rb = o.AddComponent<Rigidbody>(); d.rb.mass = d.mass; d.rb.linearDamping = (float?)c["drag"] ?? .05f; d.rb.angularDamping = (float?)c["stiff"] ?? 1.6f; d.rb.maxAngularVelocity = 25; d.rb.solverIterations = 24; d.rb.solverVelocityIterations = 8;
                    d.rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
                    byBone[d.b] = d;
                    d.len = L; d.joint = Quaternion.LookRotation(local.normalized); // twist axis along the bone, for the local frame below
                }
                foreach (var d in plan)
                {
                    if (!byBone.TryGetValue(d.parent, out var par)) continue;
                    var j = d.rb.gameObject.AddComponent<ConfigurableJoint>(); d.j = j;
                    j.autoConfigureConnectedAnchor = false; j.anchor = Vector3.zero;
                    j.connectedBody = par.rb;
                    j.connectedAnchor = Quaternion.Inverse(par.bone.rotation) * (d.bone.position - par.bone.position);
                    j.xMotion = j.yMotion = j.zMotion = ConfigurableJointMotion.Locked;
                    var localDir = (d.joint * Vector3.forward);
                    Vector3 axis, sec;
                    if (d.bend != 0)
                    {
                        // A knee or elbow: one axis, across the bend, computed in the rest pose. Elbows fold forward, knees back.
                        var restDir = actor.humanRest[(int)d.b] * localDir;
                        var hinge = Vector3.Cross(restDir, Vector3.forward * d.bend).normalized;
                        axis = Quaternion.Inverse(actor.humanRest[(int)d.b]) * hinge;
                        sec = localDir;
                        j.angularXMotion = ConfigurableJointMotion.Limited; j.angularYMotion = j.angularZMotion = ConfigurableJointMotion.Locked;
                        j.lowAngularXLimit = new SoftJointLimit { limit = -145 }; j.highAngularXLimit = new SoftJointLimit { limit = 3 };
                    }
                    else
                    {
                        axis = localDir; sec = Vector3.Cross(localDir, Mathf.Abs(localDir.y) < .9f ? Vector3.up : Vector3.right).normalized;
                        j.angularXMotion = j.angularYMotion = j.angularZMotion = ConfigurableJointMotion.Limited;
                        j.lowAngularXLimit = new SoftJointLimit { limit = -d.twist }; j.highAngularXLimit = new SoftJointLimit { limit = d.twist };
                        j.angularYLimit = new SoftJointLimit { limit = d.swing }; j.angularZLimit = new SoftJointLimit { limit = d.swing };
                    }
                    j.axis = axis; j.secondaryAxis = sec;
                    j.projectionMode = JointProjectionMode.PositionAndRotation; j.projectionDistance = .02f; j.projectionAngle = 5;
                    j.enablePreprocessing = false;
                    var right = axis.normalized; var up = (sec - right * Vector3.Dot(sec, right)).normalized;
                    d.joint = Quaternion.LookRotation(Vector3.Cross(right, up), up);
                    d.restLocal = Quaternion.Inverse(par.rb.transform.rotation) * d.rb.transform.rotation;
                }

                var cols = plan.SelectMany(d => d.rb.GetComponentsInChildren<Collider>()).ToArray();
                foreach (var a in cols) foreach (var b in cols) if (a != b) Physics.IgnoreCollision(a, b, true);
                foreach (var d in plan) d.rb.maxDepenetrationVelocity = 3;

                // Now his pose at that moment, with the speed he had.
                foreach (var d in plan)
                {
                    d.rb.transform.SetPositionAndRotation(d.bone.position, d.bone.rotation);
                    var (pp, pq) = prev[(int)d.b];
                    d.rb.linearVelocity = (d.bone.position - pp) * 60;
                    (d.bone.rotation * Quaternion.Inverse(pq)).ToAngleAxis(out var ang, out var ax);
                    if (ang > 180) ang -= 360;
                    if (!float.IsInfinity(ax.x)) d.rb.angularVelocity = ax * (ang * Mathf.Deg2Rad * 60);
                }
                Physics.SyncTransforms();

                // Holding toward a pose: he struggles instead of going limp.
                float drive = (float?)c["drive"] ?? 0;
                if (drive > 0)
                {
                    var target = plan.ToDictionary(d => d.b, d => aim != null ? aim[(int)d.b] : d.bone.rotation);
                    foreach (var d in plan)
                    {
                        if (d.j == null) continue;
                        var par = byBone[d.parent];
                        d.j.rotationDriveMode = RotationDriveMode.Slerp;
                        d.j.slerpDrive = new JointDrive { positionSpring = 2600 * drive * drive, positionDamper = 30 + 120 * drive, maximumForce = float.MaxValue, useAcceleration = true };
                        var tgt = Quaternion.Inverse(target[d.parent]) * target[d.b];
                        d.j.targetRotation = d.aim = Quaternion.Inverse(d.joint) * (Quaternion.Inverse(tgt) * d.restLocal) * d.joint;
                    }
                }

                var hit = V(c["impulse"]);
                var spin = V(c["spin"]);
                if (c["hit"] != null)
                {
                    var bone = actor.Bone((string)c["hit"]);
                    var d = plan.FirstOrDefault(x => x.bone == bone) ?? plan[0];
                    d.rb.linearVelocity += hit * (Mathf.Max(1, 40f / d.mass) * .25f);
                }
                else foreach (var d in plan) d.rb.linearVelocity += hit + new Vector3(R(), R(), R()) * (hit.magnitude * .04f);
                foreach (var d in plan) d.rb.angularVelocity += spin * Mathf.Deg2Rad;

                var gravity = V(c["gravity"], Physics.gravity);
                float thrash = (float?)c["thrash"] ?? 0, thrashRate = (float?)c["thrashRate"] ?? 3.5f; int seed = (int?)c["seed"] ?? 1;
                int frames = Mathf.Max(2, Mathf.CeilToInt((float)job.len / (Dt * Every))) + 1;
                var tracks = plan.Select(_ => new Quaternion[frames]).ToArray();
                var hips = new Vector3[frames];
                var keepGravity = Physics.gravity; Physics.gravity = gravity;
                try
                {
                    for (int f = 0; f < frames; f++)
                    {
                        for (int i = 0; i < plan.Count; i++) tracks[i][f] = plan[i].rb.transform.rotation;
                        hips[f] = plan[0].rb.transform.position;
                        if (f + 1 < frames) for (int s = 0; s < Every; s++)
                            {
                                // Thrashing: the pose he fights for wanders on a seeded curve, baked like everything else.
                                if (thrash > 0 && drive > 0)
                                {
                                    float now = (f + s / (float)Every) * Dt * Every * thrashRate;
                                    for (int i = 0; i < plan.Count; i++)
                                    {
                                        if (plan[i].j == null) continue;
                                        float N(float o) => (Mathf.PerlinNoise(now + o, seed * .37f + i * 3.1f) - .5f) * 2 * thrash;
                                        plan[i].j.targetRotation = plan[i].aim * Quaternion.Euler(N(0), N(11), N(23));
                                    }
                                }
                                ps.Simulate(Dt);
                            }
                    }
                }
                finally { Physics.gravity = keepGravity; }

                // Local rotations, parents first. Bones without a body keep the pose he had.
                float dt = Dt * Every;
                var index = new Dictionary<Transform, int>(); for (int i = 0; i < rig.Length; i++) index[rig[i]] = i;
                var bodyOf = new Dictionary<Transform, int>(); for (int i = 0; i < plan.Count; i++) bodyOf[plan[i].bone] = i;
                var rot = new Quaternion[rig.Length][]; for (int i = 0; i < rig.Length; i++) rot[i] = new Quaternion[frames];
                var world = new Quaternion[rig.Length];
                var hipsBone = actor.human[(int)HumanBodyBones.Hips]; var hipsLocal = new Vector3[frames];
                for (int f = 0; f < frames; f++)
                    for (int i = 0; i < rig.Length; i++)
                    {
                        var p = rig[i].parent; bool inRig = index.TryGetValue(p, out var pi);
                        var pw = inRig ? world[pi] : p.rotation;
                        if (bodyOf.TryGetValue(rig[i], out var body)) { world[i] = tracks[body][f]; rot[i][f] = Quaternion.Inverse(pw) * world[i]; }
                        else { world[i] = pw * startR[i]; rot[i][f] = startR[i]; }
                        if (rig[i] == hipsBone) hipsLocal[f] = p.InverseTransformPoint(hips[f]);
                    }
                Write(job.clip, go, rig, rot, hipsBone, hipsLocal, dt, startP);
            }
            finally { EditorSceneManager.ClosePreviewScene(scene); }
        }

        static AnimationCurve Curve(float[] v, float dt)
        {
            bool flat = true; for (int i = 1; i < v.Length && flat; i++) flat = Mathf.Abs(v[i] - v[0]) < 1e-5f;
            if (flat) return AnimationCurve.Constant(0, dt * (v.Length - 1), v[0]);
            var k = new Keyframe[v.Length];
            for (int i = 0; i < v.Length; i++)
            {
                float m = i == 0 ? (v[1] - v[0]) / dt : i == v.Length - 1 ? (v[i] - v[i - 1]) / dt : (v[i + 1] - v[i - 1]) / (2 * dt);
                k[i] = new Keyframe(i * dt, v[i], m, m);
            }
            return new AnimationCurve(k);
        }

        static void Write(AnimationClip clip, GameObject go, Transform[] rig, Quaternion[][] rot, Transform hips, Vector3[] hipsLocal, float dt, Vector3[] startP)
        {
            clip.ClearCurves(); clip.legacy = true;
            int n = hipsLocal.Length;
            for (int i = 0; i < rig.Length; i++)
            {
                var path = AnimationUtility.CalculateTransformPath(rig[i], go.transform);
                var q = rot[i];
                for (int f = 1; f < n; f++) if (Quaternion.Dot(q[f - 1], q[f]) < 0) q[f] = new Quaternion(-q[f].x, -q[f].y, -q[f].z, -q[f].w);
                var x = new float[n]; var y = new float[n]; var z = new float[n]; var w = new float[n];
                for (int f = 0; f < n; f++) { x[f] = q[f].x; y[f] = q[f].y; z[f] = q[f].z; w[f] = q[f].w; }
                clip.SetCurve(path, typeof(Transform), "localRotation.x", Curve(x, dt));
                clip.SetCurve(path, typeof(Transform), "localRotation.y", Curve(y, dt));
                clip.SetCurve(path, typeof(Transform), "localRotation.z", Curve(z, dt));
                clip.SetCurve(path, typeof(Transform), "localRotation.w", Curve(w, dt));
                var px = new float[n]; var py = new float[n]; var pz = new float[n];
                for (int f = 0; f < n; f++) { var p = rig[i] == hips ? hipsLocal[f] : startP[i]; px[f] = p.x; py[f] = p.y; pz[f] = p.z; }
                clip.SetCurve(path, typeof(Transform), "localPosition.x", Curve(px, dt));
                clip.SetCurve(path, typeof(Transform), "localPosition.y", Curve(py, dt));
                clip.SetCurve(path, typeof(Transform), "localPosition.z", Curve(pz, dt));
            }
            clip.EnsureQuaternionContinuity();
        }
    }
}
