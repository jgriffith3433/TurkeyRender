using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using Newtonsoft.Json.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Timeline;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// Automatic animation QA: walks the timeline without rendering and reports clipping, floors, foot slide, pops,
    /// mannequin slides and missed hand targets for the people and hero turkeys, counting only what the shot's camera sees.
    /// Changes nothing in the scene: colliders live on a hidden DontSave object, time is put back. See AGENTS.md (motioncheck).
    /// Bodies are capsules between bones. Props are temporary non-convex MeshColliders on the real meshes, tested with
    /// Physics.ComputePenetration (capsule against the surface) plus rays for a part wholly inside a closed mesh; skinned
    /// meshes that are not checked bodies (crowds) are a box at 70% of their bounds.
    /// </summary>
    public static class MotionCheck
    {
        const double Fps = 30, Dt = 1.0 / 30;
        const float Tol = .02f;

        class Seg { public string name; public Func<(Vector3, Vector3)> ends; public float r; public Vector3 p, q; public bool prop = true; public Vector3 Mid => (p + q) * .5f; public float Len => (q - p).magnitude; }

        class Foot { public string name; public Func<Vector3> heel, toe; public float heelH, toeH; public Vector3 lastHeel, lastToe; public float gap; public bool has; public string on; public Vector3 Heel, Toe; public float Sole => Mathf.Min(Heel.y - heelH, Toe.y - toeH); }

        class Body
        {
            public MVActor actor; public string name; public bool human; public float s = 1;
            public Renderer main; public Transform hips, handL, handR;
            public readonly List<Seg> segs = new List<Seg>(); public readonly Dictionary<string, Seg> by = new Dictionary<string, Seg>();
            public readonly List<(string name, Transform t)> track = new List<(string, Transform)>();
            public Vector3[] lastP; public Quaternion[] lastR; public Vector3 lastHips; public bool lastOk; public int lastShot;
            public Foot[] feet = new Foot[0]; public List<Op> ops = new List<Op>();
            public bool active, onCam, hidden; public Transform rootT;
            readonly Dictionary<(HumanBodyBones, HumanBodyBones), float> _len = new Dictionary<(HumanBodyBones, HumanBodyBones), float>();
            /// <summary>A bone's length the first time it is measured: rig lengths don't change unless something stretches it.</summary>
            public float Len(HumanBodyBones a, HumanBodyBones c, float now) { if (_len.TryGetValue((a, c), out var v)) return v; _len[(a, c)] = now; return now; }
            public Op Reaching(bool left, double t)
            {
                Op last = null; string k = left ? "l" : "r";
                foreach (var o in ops)
                {
                    if (o.start > t) break;
                    if (o.kind == "reach" && (o.a.S("hand") ?? "").StartsWith(k, StringComparison.OrdinalIgnoreCase)) last = o.a.F("weight", 1) > .5f ? o : null;
                }
                return last != null && t >= last.end ? last : null;
            }
            public Seg Add(string n, Func<(Vector3, Vector3)> e, float r, bool prop = true) { var x = new Seg { name = n, ends = e, r = r, prop = prop }; segs.Add(x); by[n] = x; return x; }
            public Limb[] limbs; public Vector3 gHips;   // the gesture check's memory: hands and feet at the last sample
        }

        class Limb { public string name; public Transform t; public Vector3 last; public double lastT = -1; public int lastShot = -1; public float v1 = -1, v2 = -1, out1, hip1; public bool body1; public Vector3 p1; }
        class Parented { public MVActor item; public Body host; public Renderer r; public Transform bone; public string boneName; public Vector3 local; public bool init, none; }
        class Spec { public string id, subject, bone, hero, preset; public double t, tEnd; public bool ecu; public HashSet<string> tags = new HashSet<string>(); public Dictionary<string, CastSpec> cast = new Dictionary<string, CastSpec>(); }
        class CastSpec { public string mark, kind, clip; public Vector3? pos; public bool moving, human; }

        class Prop
        {
            public Renderer r; public Mesh mesh; public MVActor owner; public string label; public bool skinned;
            public GameObject go; public Collider col; public bool failed;
        }

        class Span { public MVActor item; public string host, bone; public double from, to; public Op op; }

        /// <summary>One problem over a time range, in one shot.</summary>
        public class R
        {
            public string check, actor, a, b, shot, how; public double from, to, peak, len; public float val, size, dist, sev; public int n;
            public string Key() => check + "|" + actor + "|" + a + "|" + b + "|" + shot;
        }

        static readonly FieldInfo OpsF = typeof(Driver).GetField("Ops", BindingFlags.NonPublic | BindingFlags.Instance);
        static List<Op> OpsOf(MVActor a) => a != null && a.Driver != null ? OpsF.GetValue(a.Driver) as List<Op> : null;

        static readonly Dictionary<string, float> Limit = new Dictionary<string, float>
        { ["prop"] = .02f, ["self"] = .02f, ["bodies"] = .02f, ["floor"] = .02f, ["float"] = .02f, ["footslide"] = .02f, ["pop-rot"] = 40, ["pop-move"] = .4f, ["bodyslide"] = .3f, ["hand"] = .03f, ["joint"] = 10, ["overreach"] = .03f,
          ["frame"] = .3f, ["gesture"] = 1.2f, ["mark"] = .3f, ["readable"] = .07f, ["camin"] = .01f, ["propat"] = .03f };
        static readonly Dictionary<string, float> Weight = new Dictionary<string, float>
        { ["prop"] = 1, ["self"] = 1, ["bodies"] = .9f, ["floor"] = .9f, ["float"] = .8f, ["footslide"] = .8f, ["pop-rot"] = 1.2f, ["pop-move"] = 1.2f, ["bodyslide"] = 1, ["hand"] = .7f, ["joint"] = 1.4f, ["overreach"] = 1.4f,
          ["frame"] = 1.3f, ["gesture"] = .8f, ["mark"] = 1.2f, ["readable"] = 1, ["camin"] = 1.5f, ["propat"] = .9f };
        static readonly Dictionary<string, string> Unit = new Dictionary<string, string>
        { ["prop"] = "cm deep", ["self"] = "cm deep", ["bodies"] = "cm deep", ["floor"] = "cm under", ["float"] = "cm above", ["footslide"] = "cm/frame", ["pop-rot"] = "deg/frame", ["pop-move"] = "m/frame", ["bodyslide"] = "m/s", ["hand"] = "cm off", ["joint"] = "deg", ["overreach"] = "cm over",
          ["frame"] = "% out", ["gesture"] = "m/s", ["mark"] = "cm off", ["readable"] = "% contrast", ["camin"] = "cm inside", ["propat"] = "cm off" };
        static float Show(string check, float v) => check == "joint" || check == "pop-rot" || check == "pop-move" || check == "bodyslide" || check == "gesture" ? v : v * 100;
        /// <summary>The camera and staging checks (`--checks shot`): they read the cards (videos/&lt;v&gt;/captures/shotspec.json) and judge each shot as a frame.</summary>
        static readonly HashSet<string> ShotChecks = new HashSet<string> { "frame", "gesture", "mark", "readable", "camin", "propat" };

        // ---- run state ----
        static List<Body> _bodies; static List<Prop> _props; static readonly List<Prop> _near = new List<Prop>(); static List<Span> _spans;
        static List<(double start, string name)> _shots; static Dictionary<Mesh, int> _skippedMesh;
        static GameObject _holder; static CapsuleCollider _cap; static Camera _cam; static CinemachineBrain _brain; static SongMap _song;
        static readonly Dictionary<string, R> _open = new Dictionary<string, R>(); static List<R> _done; static double _gap;
        static readonly Stopwatch _clock = Stopwatch.StartNew(); static long _msEval, _msNear, _msCheck; static bool _jointsOnly;
        static float _tan; static string _shotName; static int _shot; static double _t; static int _hiddenSamples;
        static bool _doJoints = true, _doShot = true, _shotOnly; static int _stride = 3;

        // ---- setup ----

        static Dictionary<string, Transform> Names(GameObject root)
        {
            var d = new Dictionary<string, Transform>(StringComparer.OrdinalIgnoreCase);
            foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (!d.ContainsKey(t.name)) d[t.name] = t;
            return d;
        }

        static Body Human(MVActor a, Animator an)
        {
            var b = new Body { actor = a, name = a.name, human = true, rootT = (a.animRoot ? a.animRoot : a.gameObject).transform };
            Transform H(HumanBodyBones x) => an.GetBoneTransform(x);
            float s = b.s = Mathf.Max(.01f, an.humanScale * a.transform.lossyScale.x);
            b.hips = H(HumanBodyBones.Hips); if (!b.hips) return null;
            b.handL = H(HumanBodyBones.LeftHand); b.handR = H(HumanBodyBones.RightHand);
            Transform head = H(HumanBodyBones.Head), neck = H(HumanBodyBones.Neck), chest = H(HumanBodyBones.UpperChest) ?? H(HumanBodyBones.Chest), spine = H(HumanBodyBones.Spine) ?? b.hips;
            if (head && neck) b.Add("head", () => { var dir = (head.position - neck.position).normalized; return (head.position, head.position + dir * .11f * s); }, .085f * s);
            Transform ua0 = H(HumanBodyBones.LeftUpperArm), ua1 = H(HumanBodyBones.RightUpperArm), ul0 = H(HumanBodyBones.LeftUpperLeg), ul1 = H(HumanBodyBones.RightUpperLeg);
            if (chest && ua0 && ua1) b.Add("chest", () => (Vector3.Lerp(ua0.position, chest.position, .4f), Vector3.Lerp(ua1.position, chest.position, .4f)), .095f * s);
            if (chest) b.Add("belly", () => (spine.position, chest.position), .10f * s, false);
            if (ul0 && ul1) b.Add("hips", () => (ul0.position, ul1.position), .095f * s);
            var feet = new List<Foot>();
            float fh = an.leftFeetBottomHeight > .02f ? an.leftFeetBottomHeight : .085f * s;
            foreach (var side in new[] { 0, 1 })
            {
                string n = side == 0 ? ".L" : ".R";
                Transform ul = side == 0 ? ul0 : ul1, ll = H(side == 0 ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg), ft = H(side == 0 ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot), toe = H(side == 0 ? HumanBodyBones.LeftToes : HumanBodyBones.RightToes);
                Transform la = H(side == 0 ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm), hd = side == 0 ? b.handL : b.handR;
                Transform tip = H(side == 0 ? HumanBodyBones.LeftMiddleDistal : HumanBodyBones.RightMiddleDistal) ?? H(side == 0 ? HumanBodyBones.LeftMiddleIntermediate : HumanBodyBones.RightMiddleIntermediate) ?? H(side == 0 ? HumanBodyBones.LeftMiddleProximal : HumanBodyBones.RightMiddleProximal);
                if (ul && ll) b.Add("thigh" + n, () => (ul.position, ll.position), .062f * s);
                if (ll && ft) b.Add("shin" + n, () => (ll.position, ft.position), .045f * s);
                if (ft)
                {
                    Func<Vector3> toeAt = toe ? (Func<Vector3>)(() => toe.position) : () => ft.position + ft.rotation * Vector3.forward * .12f * s;
                    float footLen = toe ? (toe.position - ft.position).magnitude : .2f * s, ankleH = b.actor != null && toe ? MotionDriver.AnkleRatio(b.actor, side == 0) * footLen : fh;   // the same sole the ground pass stands on
                    int footI = (int)(side == 0 ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot);
                    b.Add("foot" + n, () =>   // heel to toe along the sole, the capsule's radius above it, however the foot is turned
                    {
                        var tp = toeAt(); float rad = .035f * s; var up = a.humanRest.Length > footI ? ft.rotation * Quaternion.Inverse(a.humanRest[footI]) * Vector3.up : Vector3.up;
                        return (ft.position - up * Mathf.Max(0, ankleH - rad), tp + up * Mathf.Max(0, rad - .04f * footLen));
                    }, .035f * s);
                    feet.Add(new Foot { name = "foot" + n, heel = () => ft.position, toe = toeAt, heelH = ankleH, toeH = toe ? .04f * footLen : .03f * s });
                }
                if (la && hd) b.Add("forearm" + n, () => (la.position, hd.position), .032f * s);
                if (hd) b.Add("hand" + n, () => (hd.position, tip ? tip.position : hd.position + (hd.position - la.position).normalized * .15f * s), .026f * s);
            }
            b.feet = feet.ToArray();
            foreach (var x in new[] { HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.Neck, HumanBodyBones.Head, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand, HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot })
            {
                var t = H(x); if (t) b.track.Add((x.ToString(), t));
            }
            return b;
        }

        static Body Turkey(MVActor a)
        {
            var map = Names(a.animRoot ? a.animRoot : a.gameObject);
            if (!map.TryGetValue("body", out var body) || !map.TryGetValue("head", out var head)) return null;
            var b = new Body { actor = a, name = a.name, hips = body };
            float s = b.s = Mathf.Max(.01f, (a.animRoot ? a.animRoot.transform : a.transform).lossyScale.x);
            Transform T(string n) => map.TryGetValue(n, out var t) ? t : null;
            var neck = T("neck1") ?? head; var nose = T("Nose2") ?? T("Nose1") ?? head;
            b.Add("body", () => (body.position, Vector3.Lerp(body.position, neck.position, .7f)), .11f * s);
            b.Add("neck", () => (neck.position, head.position), .03f * s);
            b.Add("head", () => (head.position, nose.position), .03f * s);
            var feet = new List<Foot>();
            foreach (var n in new[] { "_L", "_R" })
            {
                Transform hip = T("hip" + n), shin = T("shin" + n), tar = T("tarsus" + n), heel = T("FinHeel" + n), mid = T("FinMid2" + n) ?? T("FinMid1" + n), fore = T("forearm" + n), hand = T("hand" + n);
                if (hip && shin) b.Add("thigh" + n, () => (hip.position, shin.position), .045f * s);
                if (shin && tar) b.Add("shin" + n, () => (shin.position, tar.position), .016f * s);
                if (tar && mid) b.Add("foot" + n, () => (tar.position, mid.position), .014f * s);
                if (fore && hand) b.Add("wing" + n, () => (fore.position, hand.position), .025f * s);
                if (tar && mid) feet.Add(new Foot { name = "foot" + n, heel = () => (heel ? heel : tar).position, toe = () => mid.position, heelH = .01f * s, toeH = .01f * s });
            }
            b.feet = feet.ToArray();
            foreach (var n in new[] { "body", "neck1", "neck3", "head", "hip_L", "hip_R", "shin_L", "shin_R", "tarsus_L", "tarsus_R", "hand_L", "hand_R" }) { var t = T(n); if (t) b.track.Add((n, t)); }
            return b;
        }

        static void Build(string only)
        {
            var filter = string.IsNullOrEmpty(only) ? null : new HashSet<string>(only.Split(','));
            _bodies = new List<Body>(); _spans = new List<Span>();
            var actors = UnityEngine.Object.FindObjectsByType<MVActor>(FindObjectsInactive.Include, FindObjectsSortMode.None).Where(x => x.transform.root.name == "_Generated").ToArray();
            foreach (var a in actors)
            {
                var ops = OpsOf(a);
                if (ops != null)
                {
                    Span open = null;
                    foreach (var o in ops)
                    {
                        if (o.kind != "attach" && o.kind != "detach") continue;
                        if (open != null) { open.to = o.start; open = null; }
                        if (o.kind == "attach" && o.a.S("to") != null)
                        {
                            var to = o.a.S("to"); int dot = to.IndexOf('.');
                            open = new Span { item = a, host = (dot > 0 ? to.Substring(0, dot) : to).Split('#')[0], bone = dot > 0 ? to.Substring(dot + 1) : null, from = o.start, to = double.MaxValue, op = o };
                            _spans.Add(open);
                        }
                    }
                }
                if (a.members.Length > 0) continue;
                if (filter != null && !filter.Contains(a.name)) continue;
                Body b = null;
                var root = a.animRoot ? a.animRoot : a.gameObject;
                var an = root.GetComponentInChildren<Animator>(true);
                if (an && an.isHuman && an.avatar) b = Human(a, an);
                else
                {
                    bool hero = false;
                    foreach (var s in root.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                        if (s.sharedMesh && AssetDatabase.GetAssetPath(s.sharedMesh).IndexOf("_hero", StringComparison.OrdinalIgnoreCase) >= 0) hero = true;
                    if (hero) b = Turkey(a);
                }
                if (b == null) continue;
                b.ops = ops ?? new List<Op>();
                b.main = root.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(x => x.GetComponentInParent<MVActor>(true) == a).OrderByDescending(x => x.sharedMesh ? x.sharedMesh.vertexCount : 0).FirstOrDefault();
                if (!b.main) continue; // a set holding other actors, not a body
                b.lastP = new Vector3[b.track.Count]; b.lastR = new Quaternion[b.track.Count];
                _bodies.Add(b);
            }

            _bodyActors.Clear(); foreach (var b in _bodies) _bodyActors.Add(b.actor);
            _byName.Clear(); foreach (var b in _bodies) _byName[b.name] = b;
            _parented = new List<Parented>();
            foreach (var a in actors)   // a prop that is a child of a body's root ("parent": "doctor"): it rides the root, whatever the head does
            {
                var host = a.transform.parent ? a.transform.parent.GetComponentInParent<MVActor>(true) : null;
                if (!host || !_byName.TryGetValue(host.name, out var hb) || !hb.human || _bodyActors.Contains(a)) continue;
                var rs = a.GetComponentsInChildren<Renderer>(true); if (rs.Length == 0) continue;
                _parented.Add(new Parented { item = a, host = hb, r = rs.OrderByDescending(x => x.bounds.size.sqrMagnitude).First() });
            }
            _props = new List<Prop>(); _skippedMesh = new Dictionary<Mesh, int>();
            foreach (var r in UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (r.transform.root.name != "_Generated") continue;
                if (r.GetComponentInParent<MVDoor>(true)) continue; // doorways are holes, not things
                var sk = r as SkinnedMeshRenderer; Mesh mesh = null;
                if (sk) mesh = sk.sharedMesh;
                else if (r is MeshRenderer) { var mf = r.GetComponent<MeshFilter>(); if (mf) mesh = mf.sharedMesh; }
                if (!mesh) continue;
                if (!sk && mesh.vertexCount > 250000) { _skippedMesh[mesh] = 1; continue; }
                var own = r.GetComponentInParent<MVActor>(true);
                _props.Add(new Prop { r = r, mesh = mesh, owner = own, skinned = sk, label = (own ? own.name : "?") + (own && r.gameObject != own.gameObject ? "/" + r.name : "") });
            }

            _shots = new List<(double, string)>();
            var tl = Transport.Director.playableAsset as TimelineAsset;
            foreach (var track in tl.GetOutputTracks())
                if (track is CinemachineTrack)
                    foreach (var c in track.GetClips()) _shots.Add((c.start, c.displayName));
            _shots.Sort((x, y) => x.start.CompareTo(y.start));
        }

        static void Eval(double t)
        {
            var d = Transport.Director;
            d.time = t; d.Evaluate(); MVLate.Flush(); _lastEval = t;
            if (_brain)
            {
                var keep = _brain.UpdateMethod;
                _brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
                _brain.ManualUpdate(); _brain.ManualUpdate();
                _brain.UpdateMethod = keep;
            }
        }

        static bool NativeAttachAt(double t)
        {
            foreach (var s in _spans) if (t >= s.from && t < s.to) { var h = MVActor.Named(s.host); if (h && h.native) return true; }
            return false;
        }

        static int ShotAt(double t)
        {
            int lo = 0, hi = _shots.Count - 1, best = 0;
            while (lo <= hi) { int m = (lo + hi) / 2; if (_shots[m].start <= t + 1e-6) { best = m; lo = m + 1; } else hi = m - 1; }
            return best;
        }

        static double ShotLen(int i)
        {
            if (_shots == null || _shots.Count == 0) return 0;
            i = Math.Min(i, _shots.Count - 1);
            double end = i + 1 < _shots.Count ? _shots[i + 1].start : Transport.Director.duration;
            if (i + 1 == _shots.Count && _spec != null && _spec.Count > 0) { double cut = _spec.Max(x => x.tEnd); if (cut > _shots[i].start) end = Math.Min(end, cut); }   // the last camera runs to the song's end; the cut may stop sooner
            return end - _shots[i].start;
        }

        // ---- temporary colliders ----

        static void MakeHolder()
        {
            _holder = new GameObject("__motioncheck") { hideFlags = HideFlags.HideAndDontSave };
            var c = new GameObject("cap") { hideFlags = HideFlags.HideAndDontSave };
            c.transform.SetParent(_holder.transform, false);
            _cap = c.AddComponent<CapsuleCollider>(); _cap.direction = 1;
        }

        static bool Ready(Prop p)
        {
            if (p.failed) return false;
            if (p.go) return true;
            try
            {
                p.go = new GameObject("prop") { hideFlags = HideFlags.HideAndDontSave };
                p.go.transform.SetParent(_holder.transform, false);
                if (p.skinned) p.col = p.go.AddComponent<BoxCollider>();
                else { var mc = p.go.AddComponent<MeshCollider>(); mc.sharedMesh = p.mesh; p.col = mc; }
                return true;
            }
            catch { p.failed = true; return false; }
        }

        static void Place(Prop p)
        {
            var tr = p.go.transform;
            if (p.skinned) { var b = p.r.bounds; tr.SetPositionAndRotation(b.center, Quaternion.identity); ((BoxCollider)p.col).size = b.size * .7f; }
            else { var rt = p.r.transform; tr.SetPositionAndRotation(rt.position, rt.rotation); tr.localScale = rt.lossyScale; }
        }

        static void BuildNear()
        {
            _near.Clear();
            bool any = false; Bounds all = default;
            foreach (var b in _bodies)
            {
                if (!b.active) continue;
                var x = new Bounds(b.hips.position, Vector3.zero);
                foreach (var s in b.segs) { x.Encapsulate(s.p); x.Encapsulate(s.q); }
                if (any) all.Encapsulate(x); else { all = x; any = true; }
            }
            if (!any) return;
            all.Expand(new Vector3(1.6f, 3.2f, 1.6f));
            foreach (var p in _props)
            {
                if (!p.r || !p.r.enabled || !p.r.gameObject.activeInHierarchy) continue;
                if (p.r.bounds.Intersects(all) && Ready(p)) _near.Add(p);
            }
        }

        // ---- geometry ----

        static float SegSeg(Vector3 p1, Vector3 q1, Vector3 p2, Vector3 q2)
        {
            Vector3 d1 = q1 - p1, d2 = q2 - p2, r = p1 - p2;
            float a = Vector3.Dot(d1, d1), e = Vector3.Dot(d2, d2), f = Vector3.Dot(d2, r), s, t;
            if (a <= 1e-8f && e <= 1e-8f) return r.magnitude;
            if (a <= 1e-8f) { s = 0; t = Mathf.Clamp01(f / e); }
            else
            {
                float c = Vector3.Dot(d1, r);
                if (e <= 1e-8f) { t = 0; s = Mathf.Clamp01(-c / a); }
                else
                {
                    float b = Vector3.Dot(d1, d2), den = a * e - b * b;
                    s = den > 1e-8f ? Mathf.Clamp01((b * f - c * e) / den) : 0;
                    t = (b * s + f) / e;
                    if (t < 0) { t = 0; s = Mathf.Clamp01(-c / a); }
                    else if (t > 1) { t = 1; s = Mathf.Clamp01((b - c) / a); }
                }
            }
            return (p1 + d1 * s - (p2 + d2 * t)).magnitude;
        }

        static float Penetration(Seg s, Prop p)
        {
            float len = s.Len;
            _cap.radius = s.r; _cap.height = len + 2 * s.r;
            var rot = len > 1e-4f ? Quaternion.FromToRotation(Vector3.up, (s.q - s.p) / len) : Quaternion.identity;
            var t = p.go.transform;
            return Physics.ComputePenetration(_cap, s.Mid, rot, p.col, t.position, t.rotation, out _, out float dist) ? dist : 0;
        }

        static readonly Vector3[] Dirs = { Vector3.up, Vector3.down, Vector3.left, Vector3.right, Vector3.forward, Vector3.back };

        /// <summary>A part with no surface touching it can still be wholly inside a closed mesh: a front face is hit from outside in every direction, and none from inside.</summary>
        static bool Inside(Vector3 p, Prop pr, out float depth)
        {
            depth = 0; if (pr.skinned) return false;
            var b = pr.r.bounds; if (!b.Contains(p)) return false;
            float L = b.size.magnitude + .5f, min = float.MaxValue;
            foreach (var d in Dirs)
            {
                if (pr.col.Raycast(new Ray(p, d), out _, L)) return false;
                if (!pr.col.Raycast(new Ray(p + d * L, -d), out var h, L)) return false;
                min = Mathf.Min(min, L - h.distance);
            }
            depth = min; return true;
        }

        // ---- what the camera sees ----

        static bool Vis(Vector3 a, Vector3 b, float span, out float size, out float dist)
        {
            size = 0; dist = 0; bool any = false; float near = float.MaxValue;
            foreach (var p in new[] { a, (a + b) * .5f, b })
            {
                var v = _cam.WorldToViewportPoint(p);
                if (v.z < _cam.nearClipPlane) continue;
                if (v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1) continue;
                any = true; near = Mathf.Min(near, v.z);
            }
            if (!any) return false;
            dist = near; size = Mathf.Min(1.5f, span / (2 * near * _tan));
            return true;
        }

        /// <summary>
        /// True when something solid stands between the camera and every part of this body the frustum holds. Rays from the camera to the
        /// middle of each part, against the real meshes. A mesh seen from behind doesn't block, which is right: back faces aren't drawn.
        /// Skinned meshes never block (they are bounding boxes here), nor do transparent ones, nor anything on the body.
        /// </summary>
        static bool Hidden(Body b)
        {
            var eye = _cam.transform.position; var rays = new List<(Ray ray, float len)>();
            foreach (var s in b.segs)
            {
                var v = _cam.WorldToViewportPoint(s.Mid);
                if (v.z < _cam.nearClipPlane || v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1) continue;
                var d = s.Mid - eye; float len = d.magnitude; if (len < .01f) return false;
                rays.Add((new Ray(eye, d / len), len - s.r - .02f));
            }
            if (rays.Count == 0) return false;
            var hits = new List<Prop>();
            foreach (var p in _props)
            {
                if (p.skinned || !p.r || !p.r.enabled || !p.r.gameObject.activeInHierarchy || Clear(p.r) || Mine(b, p)) continue;
                var box = p.r.bounds; bool near = false;
                foreach (var (ray, len) in rays) if (box.IntersectRay(ray, out float d) && d < len) { near = true; break; }
                if (near && Ready(p)) { Place(p); hits.Add(p); }
            }
            if (hits.Count == 0) return false;
            Physics.SyncTransforms();
            foreach (var (ray, len) in rays)
            {
                bool blocked = false;
                foreach (var p in hits) if (p.col.Raycast(ray, out _, len)) { blocked = true; break; }
                if (!blocked) return false;
            }
            _hiddenSamples++;
            return true;
        }

        static bool Clear(Renderer r)
        {
            var m = r.sharedMaterial;
            return m && m.renderQueue >= 3000;
        }

        static void Report(string check, Body b, string a, string x, float val, Vector3 p0, Vector3 p1, float span, string how = null, float lim = -1) => Report(check, b.name, a, x, val, p0, p1, span, how, lim);

        static void Report(string check, string who, string a, string x, float val, Vector3 p0, Vector3 p1, float span, string how = null, float lim = -1)
        {
            if (!Vis(p0, p1, span, out var size, out var dist)) return;
            Add(check, who, a, x, val, size, dist, Mathf.Clamp(lim >= 0 ? 1 + (val - lim) / Limit[check] : val / Limit[check], 1, 8), how);
        }

        /// <summary>One sample of a problem, joined to the open range of the same kind; the shot checks call it directly when the camera can't see the points (a camera inside a head).</summary>
        static void Add(string check, string who, string a, string x, float val, float size, float dist, float sev, string how = null)
        {
            string key = check + "|" + who + "|" + a + "|" + x + "|" + _shot;
            if (_open.TryGetValue(key, out var r) && _t - r.to <= _gap)
            {
                r.to = _t; r.n++;
                if (sev * size > r.sev * r.size) { r.peak = _t; r.dist = dist; }
                r.val = Mathf.Max(r.val, val); r.size = Mathf.Max(r.size, size); r.sev = Mathf.Max(r.sev, sev);
                return;
            }
            r = new R { check = check, actor = who, a = a, b = x, shot = _shotName, how = how, from = _t, to = _t, peak = _t, len = ShotLen(_shot), val = val, size = size, dist = dist, sev = sev, n = 1 };
            _open[key] = r; _done.Add(r);
        }

        // ---- checks ----

        static readonly HashSet<MVActor> _ignore = new HashSet<MVActor>(), _bodyActors = new HashSet<MVActor>();
        static readonly Dictionary<string, Body> _byName = new Dictionary<string, Body>();
        static List<Parented> _parented = new List<Parented>(); static List<Spec> _spec; static Dictionary<string, (float lo, float hi, bool sit)> _clipHips = new Dictionary<string, (float, float, bool)>();
        static readonly HashSet<int> _probed = new HashSet<int>(); static RenderTexture _probeRT; static Texture2D _probeTex; static bool _saveProbes, _nativeFull = true; static int _probes; static double _lastEval = -1; static float _aspect = 16f / 9; static bool? _quality; static readonly List<string> _peaks = new List<string>(); static long _msShot; static readonly Dictionary<int, float> _lastContrast = new Dictionary<int, float>();

        static bool Attached(Body b)
        {
            foreach (var s in _spans) if (s.item == b.actor && _t >= s.from && _t < s.to) return true;
            return false;
        }

        static void Ignored(Body b)
        {
            _ignore.Clear(); _ignore.Add(b.actor);
            for (int pass = 0; pass < 3; pass++)
                foreach (var s in _spans)
                {
                    if (_t < s.from || _t >= s.to) continue;
                    var host = MVActor.Named(s.host);
                    if (_ignore.Contains(s.item) && host) _ignore.Add(host);
                    if (host && _ignore.Contains(host)) _ignore.Add(s.item);
                }
        }

        static bool Mine(Body b, Prop p)
        {
            if (p.owner && _ignore.Contains(p.owner)) return true;
            foreach (var a in _ignore) if (a && p.r.transform.IsChildOf(a.transform)) return true;
            return false;
        }

        static void Props(Body b)
        {
            foreach (var p in _near)
            {
                if (Mine(b, p) || (p.skinned && p.owner && _bodyActors.Contains(p.owner))) continue; // bodies meet in Bodies()
                var box = p.r.bounds; var grown = box; grown.Expand(.3f * b.s + .3f);
                // A set, or a big dome around everything, holds the whole body: not clipping.
                bool whole = box.Contains(b.hips.position) && b.segs.All(s => box.Contains(s.Mid));
                foreach (var s in b.segs)
                {
                    if (!s.prop || !grown.Contains(s.Mid)) continue;
                    float d = Penetration(s, p);
                    string how = p.skinned ? "bounds" : "surface";
                    if (d <= Tol && !whole && Inside(s.Mid, p, out float deep)) { d = deep + s.r; how = "inside"; }
                    if (d > Tol) Report("prop", b, s.name, p.label, d, s.p, s.q, s.Len + 2 * s.r, how);
                }
            }
        }

        static readonly string[] ArmParts = { "forearm.L", "forearm.R", "hand.L", "hand.R" };
        static readonly string[] Torso = { "chest", "belly", "hips", "thigh.L", "thigh.R" };
        static readonly (string, string)[] Legs = { ("shin.L", "shin.R"), ("thigh.L", "shin.R"), ("thigh.R", "shin.L"), ("foot.L", "shin.R"), ("foot.R", "shin.L"), ("foot.L", "foot.R"), ("foot.L", "thigh.R"), ("foot.R", "thigh.L") };
        static readonly (string, string)[] BirdLegs = { ("shin_L", "shin_R"), ("foot_L", "foot_R"), ("foot_L", "shin_R"), ("foot_R", "shin_L") };

        static void Pair(Body b, Seg x, Seg y)
        {
            if (x == null || y == null) return;
            float d = x.r + y.r - SegSeg(x.p, x.q, y.p, y.q);
            if (d > Tol) Report("self", b, x.name, y.name, d, x.p, x.q, x.Len + 2 * x.r);
        }

        static void Self(Body b)
        {
            Seg G(string n) => b.by.TryGetValue(n, out var s) ? s : null;
            if (b.human)
            {
                foreach (var arm in ArmParts) foreach (var t in Torso) Pair(b, G(arm), G(t));
                foreach (var (x, y) in Legs) Pair(b, G(x), G(y));
            }
            else foreach (var (x, y) in BirdLegs) Pair(b, G(x), G(y));
        }

        static void Bodies(Body b)
        {
            foreach (var o in _bodies)
            {
                if (o == b || !o.active || string.CompareOrdinal(o.name, b.name) < 0 || _ignore.Contains(o.actor)) continue;
                if ((o.hips.position - b.hips.position).sqrMagnitude > 9 * (b.s + o.s) * (b.s + o.s)) continue;
                foreach (var x in b.segs) foreach (var y in o.segs)
                    {
                        float d = x.r + y.r - SegSeg(x.p, x.q, y.p, y.q);
                        if (d > Tol) Report("bodies", b, x.name, o.name + "." + y.name, d, x.p, x.q, x.Len + 2 * x.r);
                    }
            }
        }

        /// <summary>The surface under a point: its height and what it is, or false when there is nothing close below.</summary>
        static bool Support(Body b, Vector3 at, float reach, out float y, out string name)
        {
            y = float.MinValue; name = null;
            float over = float.MaxValue; string overName = null;
            const float Up = .6f;
            var ray = new Ray(at + Vector3.up * Up, Vector3.down);
            foreach (var p in _near)
            {
                if (p.skinned) continue;
                var box = p.r.bounds;
                if (at.x < box.min.x - .02f || at.x > box.max.x + .02f || at.z < box.min.z - .02f || at.z > box.max.z + .02f) continue;
                if (Mine(b, p)) continue;
                if (!p.col.Raycast(ray, out var h, Up + reach) || h.normal.y < .6f) continue;
                float yy = h.point.y;
                if (yy <= at.y + .15f) { if (yy > y) { y = yy; name = p.label; } }
                else if (box.size.x > 1.5f && box.size.z > 1.5f && yy < over) { over = yy; overName = p.label; } // floor-like and above him: he is under it
            }
            if (name != null) return true;
            if (overName != null) { y = over; name = overName; return true; }
            return false;
        }

        static void Ground(Body b, bool attached, bool sample)
        {
            foreach (var f in b.feet)
            {
                f.has = Support(b, new Vector3((f.Heel.x + f.Toe.x) * .5f, f.Sole, (f.Heel.z + f.Toe.z) * .5f), 1.2f * Mathf.Max(1, b.s), out float y, out f.on);
                f.gap = f.has ? f.Sole - y : float.MaxValue;
            }
            if (!sample) return;
            foreach (var f in b.feet)
                if (f.has && f.gap < -Limit["floor"]) Report("floor", b, f.name, f.on, -f.gap, f.Heel, f.Toe, .3f * b.s);
            var h = b.hips.position;
            bool hipsOn = Support(b, h, 1.5f, out float hy, out var hn);
            if (hipsOn && hy - h.y > Limit["floor"]) Report("floor", b, "hips", hn, hy - h.y, h, h, .4f * b.s);
            if (attached || b.feet.Length == 0) return;
            float low = float.MaxValue; foreach (var f in b.feet) low = Mathf.Min(low, f.gap);
            if (low < .02f * b.s || low > .25f * b.s) return;
            if (hipsOn && h.y - hy < .22f * b.s) return; // sitting or lying on something
            float dy = 0; foreach (var f in b.feet) dy = Mathf.Max(dy, Mathf.Abs(f.Heel.y - f.lastHeel.y));
            if (dy > .004f) return;
            Report("float", b, "feet", b.feet[0].on, low, b.feet[0].Heel, b.feet[b.feet.Length - 1].Heel, .3f * b.s);
        }

        static void Hands(Body b)
        {
            if (!b.human) return;
            foreach (var side in new[] { "left", "right" })
            {
                Op last = null, plant = null;
                foreach (var o in b.ops)
                {
                    if (o.start > _t) break;
                    if (o.kind == "reach" && (o.a.S("hand") ?? "").StartsWith(side.Substring(0, 1), StringComparison.OrdinalIgnoreCase)) last = o.a.F("weight", 1) > .5f ? o : null;
                    if (o.kind == "plant" && (o.a.S("hand") ?? "").StartsWith(side.Substring(0, 1), StringComparison.OrdinalIgnoreCase)) plant = o.a.F("weight", 1) > .5f ? o : null;
                }
                var hand = side == "left" ? b.handL : b.handR; if (!hand) continue;
                if (last != null && _t >= last.end && plant == null)
                {
                    Vector3 target = default; string name = null;
                    if (last.a.Vec.TryGetValue("to", out var v)) { target = v; name = "point"; }
                    else
                    {
                        var spec = last.a.S("to"); var tr = spec != null ? MVActor.Point(spec, _t, false) : null;
                        if (tr) { target = tr.position + tr.rotation * last.a.V("offset"); name = spec; }
                    }
                    if (name != null)
                    {
                        float d = (hand.position - target).magnitude;
                        if (d > Limit["hand"]) Report("hand", b, side + " hand", name, d, hand.position, target, .2f * b.s, "reach");
                    }
                }
                foreach (var s in _spans)
                {
                    if (s.host != b.name || s.bone == null || _t < s.from || _t >= s.to) continue;
                    if (s.bone.IndexOf("hand", StringComparison.OrdinalIgnoreCase) < 0) continue;
                    bool left = s.bone.IndexOf("left", StringComparison.OrdinalIgnoreCase) >= 0;
                    if (left != (side == "left")) continue;
                    bool any = false; Bounds box = default;
                    foreach (var r in s.item.GetComponentsInChildren<Renderer>())
                        if (r.enabled) { if (any) box.Encapsulate(r.bounds); else { box = r.bounds; any = true; } }
                    if (!any) continue;
                    float d = (box.ClosestPoint(hand.position) - hand.position).magnitude;
                    if (d > Limit["hand"]) Report("hand", b, side + " hand", s.item.name, d, hand.position, box.center, .2f * b.s, "attach");
                }
            }
        }

        // ---- joint limits: what makes a body look contorted ----
        // D(b) turns a bone's rest direction, in the rig's own frame (+z his front, T pose), into where it points now.
        // E(parent, child) is the child's turn relative to its parent, read in the parent's rest frame, so the parent's own
        // rotation (a twisted upper arm, a leaning chest) never counts against the child.

        static Quaternion D(Body b, HumanBodyBones x) => Quaternion.Inverse(b.rootT.rotation) * b.actor.human[(int)x].rotation * Quaternion.Inverse(b.actor.humanRest[(int)x]);
        static Quaternion E(Body b, HumanBodyBones p, HumanBodyBones c) => Quaternion.Inverse(D(b, p)) * D(b, c);
        static bool Has(Body b, HumanBodyBones x) => (int)x < b.actor.human.Length && b.actor.human[(int)x];
        static Vector3 RestDir(Body b, HumanBodyBones x, HumanBodyBones child) => (b.actor.humanRest[(int)x] * b.actor.human[(int)child].localPosition).normalized;
        static float Twist(Quaternion q, Vector3 n) { float p = Vector3.Dot(new Vector3(q.x, q.y, q.z), n); return 2 * Mathf.Atan2(Mathf.Abs(p), Mathf.Abs(q.w)) * Mathf.Rad2Deg; }
        static float Swing(Quaternion q, Vector3 n) => Vector3.Angle(n, q * n);

        static void Flag(Body b, HumanBodyBones bone, HumanBodyBones tip, string kind, float angle, float limit, float span = .35f)
        {
            if (angle > limit) Report("joint", b, bone.ToString(), kind, angle, b.actor.human[(int)bone].position, b.actor.human[(int)tip].position, span * b.s, null, limit);
        }

        static void Hinge(Body b, HumanBodyBones up, HumanBodyBones low, HumanBodyBones end, Vector3 natural, string name, float limit)
        {
            if (!Has(b, up) || !Has(b, low) || !Has(b, end)) return;
            Vector3 a0 = RestDir(b, up, low), f0 = RestDir(b, low, end), d = E(b, up, low) * f0;
            float flex = Vector3.Angle(a0, d);
            var nat = (natural - a0 * Vector3.Dot(natural, a0)).normalized;
            float signed = Mathf.Atan2(Vector3.Dot(d, nat), Vector3.Dot(d, a0)) * Mathf.Rad2Deg;
            Flag(b, low, end, name + " bent", flex, limit);
            if (flex < 150) Flag(b, low, end, name + " backward", -signed, 20); // near full fold the sign means nothing
        }

        static void Joints(Body b)
        {
            var A = b.actor;
            if (!b.human || A.humanRest.Length == 0) return;
            const HumanBodyBones Hips = HumanBodyBones.Hips, Spine = HumanBodyBones.Spine, Chest = HumanBodyBones.Chest, Upper = HumanBodyBones.UpperChest, Neck = HumanBodyBones.Neck, Head = HumanBodyBones.Head;
            var top = Has(b, Upper) ? Upper : Has(b, Chest) ? Chest : Spine;

            // Spine and neck, each joint.
            HumanBodyBones last = Hips;
            foreach (var x in new[] { Spine, Chest, Upper, Neck, Head })
            {
                if (!Has(b, x)) continue;
                var q = E(b, last, x);
                Flag(b, x, x, "twist", Twist(q, Vector3.up), 45); Flag(b, x, x, "bend", Swing(q, Vector3.up), 45);
                last = x;
            }
            // The head against the chest.
            if (Has(b, Head))
            {
                var f = E(b, top, Head) * Vector3.forward;
                Flag(b, Head, Head, "turn", Mathf.Abs(Mathf.Atan2(f.x, f.z) * Mathf.Rad2Deg), 80, .25f);
                Flag(b, Head, Head, "nod", Mathf.Abs(Mathf.Asin(Mathf.Clamp(f.y, -1, 1)) * Mathf.Rad2Deg), 75, .25f);
            }

            foreach (var left in new[] { true, false })
            {
                HumanBodyBones sh = left ? HumanBodyBones.LeftShoulder : HumanBodyBones.RightShoulder, ua = left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm, la = left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm, hd = left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand, mid = left ? HumanBodyBones.LeftMiddleProximal : HumanBodyBones.RightMiddleProximal;
                HumanBodyBones ul = left ? HumanBodyBones.LeftUpperLeg : HumanBodyBones.RightUpperLeg, ll = left ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg, ft = left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot, toe = left ? HumanBodyBones.LeftToes : HumanBodyBones.RightToes;

                Hinge(b, ua, la, hd, Vector3.forward, "elbow", 150);
                Hinge(b, ul, ll, ft, Vector3.back, "knee", 150);
                if (Has(b, sh)) Flag(b, sh, sh, "collarbone", Quaternion.Angle(Quaternion.identity, E(b, top, sh)), 45);

                // Shoulder: where the upper arm points in the chest frame.
                if (Has(b, ua) && Has(b, la))
                {
                    Vector3 a0 = RestDir(b, ua, la); float side = Mathf.Sign(a0.x);
                    var q = E(b, top, ua); var u = q * a0;
                    Flag(b, ua, la, "shoulder behind back", Mathf.Asin(Mathf.Clamp(-u.z, -1, 1)) * Mathf.Rad2Deg, 60);
                    Flag(b, ua, la, "shoulder across chest", Mathf.Asin(Mathf.Clamp(-side * u.x, -1, 1)) * Mathf.Rad2Deg, 50);
                    Flag(b, ua, la, "shoulder twist", Twist(q, a0), 120);
                }
                // Wrist.
                if (Has(b, la) && Has(b, hd))
                {
                    var n = Has(b, mid) ? RestDir(b, hd, mid) : RestDir(b, la, hd);
                    Flag(b, hd, hd, "wrist", Swing(E(b, la, hd), n), 70, .2f);
                }
                // Hip: where the thigh points in the hips frame, hanging is 0.
                if (Has(b, ul) && Has(b, ll))
                {
                    Vector3 t0 = RestDir(b, ul, ll);
                    float side = Mathf.Sign(Vector3.Dot(Quaternion.Inverse(b.rootT.rotation) * (A.human[(int)ul].position - A.human[(int)Hips].position), Vector3.right));
                    var q = E(b, Hips, ul); var t = q * t0;
                    float flex = Mathf.Atan2(t.z, -t.y) * Mathf.Rad2Deg, abd = Mathf.Asin(Mathf.Clamp(side * t.x, -1, 1)) * Mathf.Rad2Deg;
                    Flag(b, ul, ll, "hip forward", flex, 135); Flag(b, ul, ll, "hip back", -flex, 35);
                    Flag(b, ul, ll, "hip out", abd, 60); Flag(b, ul, ll, "hip across", -abd, 30);
                    Flag(b, ul, ll, "hip twist", Twist(q, t0), 70);
                }
                // Ankle.
                if (Has(b, ll) && Has(b, ft) && Has(b, toe)) Flag(b, ft, toe, "ankle", Swing(E(b, ll, ft), RestDir(b, ft, toe)), 65, .2f);

                // Limbs longer than their bones: stretched, or an unreachable target.
                foreach (var (p, c, e, name) in new[] { (ua, la, hd, "arm"), (ul, ll, ft, "leg") })
                {
                    if (!Has(b, p) || !Has(b, c) || !Has(b, e)) continue;
                    float scale = A.human[(int)p].lossyScale.x;
                    float l0 = A.human[(int)c].localPosition.magnitude * scale, l1 = A.human[(int)e].localPosition.magnitude * A.human[(int)c].lossyScale.x;
                    float now0 = (A.human[(int)c].position - A.human[(int)p].position).magnitude, now1 = (A.human[(int)e].position - A.human[(int)c].position).magnitude;
                    float over = Mathf.Max(now0 - b.Len(p, c, l0), now1 - b.Len(c, e, l1));
                    if (over > Limit["overreach"]) Report("overreach", b, (left ? "left " : "right ") + name, "bone stretched", over, A.human[(int)p].position, A.human[(int)e].position, .6f * b.s);
                    if (name != "arm") continue;
                    var op = b.Reaching(left, _t);
                    if (op == null) continue;
                    Vector3 target; string tn;
                    if (op.a.Vec.TryGetValue("to", out var v)) { target = v; tn = "point"; }
                    else
                    {
                        var spec = op.a.S("to"); var tr = spec != null ? MVActor.Point(spec, _t, false) : null; if (!tr) continue;
                        target = tr.position + tr.rotation * op.a.V("offset"); tn = spec;
                    }
                    float gap = (target - A.human[(int)p].position).magnitude - b.Len(p, c, l0) - b.Len(c, e, l1);
                    if (gap > Limit["overreach"]) Report("overreach", b, (left ? "left " : "right ") + name, tn, gap, A.human[(int)p].position, A.human[(int)e].position, .6f * b.s, "target out of reach");
                }
            }
        }

        static bool Stretching(Body b)
        {
            bool on = false;
            foreach (var o in b.ops) { if (o.start > _t) break; if (o.kind == "stretch") on = o.a.F("amount", 1) > 0; if (o.kind == "suck") on = true; }
            return on;
        }

        static void Kinematics(Body b, bool attached)
        {
            var rootQ = Quaternion.Inverse(b.actor.transform.rotation);
            float scale = Mathf.Max(1, b.s);
            for (int i = 0; i < b.track.Count; i++)
            {
                var t = b.track[i].t; bool isHips = t == b.hips;
                var q = isHips ? t.rotation : rootQ * t.rotation;
                var p = isHips ? t.position : t.position - b.hips.position;
                float ang = Quaternion.Angle(b.lastR[i], q), mv = (p - b.lastP[i]).magnitude / scale;
                if (ang > 40) Report("pop-rot", b, b.track[i].name, "", ang, t.position, t.position, .3f * b.s);
                if (mv > .4f) Report("pop-move", b, b.track[i].name, "", mv, t.position, t.position, .3f * b.s);
            }
            if (attached) return;
            float slideMax = 0; Foot worst = null; bool allLow = b.feet.Length > 0, locked = b.feet.Length > 0;
            var hv = b.hips.position - b.lastHips; var dHips = new Vector3(hv.x, 0, hv.z);
            foreach (var f in b.feet)
            {
                bool low = f.has && f.gap < .05f * b.s;
                Vector3 dh = f.Heel - f.lastHeel, dt = f.Toe - f.lastToe; dh.y = 0; dt.y = 0;
                float dy = Mathf.Abs(f.Heel.y - f.lastHeel.y);
                float move = Mathf.Min(dh.magnitude, dt.magnitude);
                if (low && dy < .006f && move > slideMax) { slideMax = move; worst = f; }
                if (!(f.has && f.gap < .1f * b.s)) allLow = false;
                var rel = (f.Heel - b.hips.position) - (f.lastHeel - b.lastHips);
                if (rel.magnitude > .005f) locked = false;
            }
            bool slide = allLow && locked;
            if (worst != null && slideMax > .02f && !slide) Report("footslide", b, worst.name, worst.on, slideMax, worst.Heel, worst.Toe, .3f * b.s);
            float speed = dHips.magnitude * (float)Fps;
            if (slide && speed > .3f) Report("bodyslide", b, "hips", b.feet[0].on, speed, b.hips.position, b.feet[0].Heel, .9f * b.s);
        }

        static void Remember(Body b)
        {
            var rootQ = Quaternion.Inverse(b.actor.transform.rotation);
            for (int i = 0; i < b.track.Count; i++)
            {
                var t = b.track[i].t; bool isHips = t == b.hips;
                b.lastR[i] = isHips ? t.rotation : rootQ * t.rotation;
                b.lastP[i] = isHips ? t.position : t.position - b.hips.position;
            }
            b.lastHips = b.hips.position; b.lastOk = true; b.lastShot = _shot;
            foreach (var f in b.feet) { f.lastHeel = f.Heel; f.lastToe = f.Toe; }
        }

        static void Step(int frame, bool sample, bool seed)
        {
            _t = frame * Dt;
            long t0 = _clock.ElapsedMilliseconds;
            // Whole timeline on samples; between them only the bodies the camera had, which is what the 1/30 s checks need.
            if (sample || seed)
            {
                Eval(_t);   // Eval flushes MVLate, so a prop on a native body sits on this evaluation's pose, as in a render
            }
            else if (_nativeFull && _bodies.Any(b => b.active && b.onCam && b.actor.native)) Eval(_t);   // a native body's bones come from Unity's Animator, which only the director moves: Driver.Eval alone left them a sample old, and re-applied gaze on top
            else foreach (var b in _bodies) if (b.active && b.onCam) b.actor.Driver?.Eval(_t);
            _msEval += _clock.ElapsedMilliseconds - t0; t0 = _clock.ElapsedMilliseconds;
            _shot = ShotAt(_t); _shotName = _shots.Count > 0 ? (_shot + 1).ToString("000") + " " + _shots[_shot].name : "?";
            _cam = Camera.main; _tan = _cam ? Mathf.Tan(_cam.fieldOfView * .5f * Mathf.Deg2Rad) : 1;
            bool covered = Shader.GetGlobalFloat("_MV_InsertMix") > .95f;
            foreach (var b in _bodies)
            {
                b.active = b.main && b.main.enabled && b.main.gameObject.activeInHierarchy && (sample || seed || b.onCam);
                if (!b.active) { b.lastOk = false; b.onCam = false; continue; }
                foreach (var s in b.segs) (s.p, s.q) = s.ends();
                foreach (var f in b.feet) { f.Heel = f.heel(); f.Toe = f.toe(); }
            }
            if ((sample || seed) && !_jointsOnly) BuildNear();
            if (!seed && !_jointsOnly)
            {
                foreach (var p in _near) if (p.r) Place(p);
                Physics.SyncTransforms();
            }
            _msNear += _clock.ElapsedMilliseconds - t0; t0 = _clock.ElapsedMilliseconds;
            var planes = _cam ? GeometryUtility.CalculateFrustumPlanes(_cam) : null;
            int i = (int)Math.Floor(_t * SongMap.WarpHz);
            bool steps = _song.stepHz != null && i >= 0 && i < _song.stepHz.Length && _song.stepHz[i] > 0;
            foreach (var b in _bodies)
            {
                if (!b.active) continue;
                if (seed || !_cam || covered) { Remember(b); continue; }
                b.onCam = GeometryUtility.TestPlanesAABB(planes, b.main.bounds);
                if (b.onCam && sample && (!_jointsOnly || _doShot)) { Ignored(b); b.hidden = Hidden(b); }
                if (b.onCam && !b.hidden)
                {
                    bool att = Attached(b), design = Stretching(b);
                    if (!design && _doJoints) Joints(b);
                    if (_jointsOnly) { Remember(b); continue; }
                    Ignored(b);
                    Ground(b, att, sample && !design);
                    if (sample && !design) { Props(b); Self(b); Bodies(b); Hands(b); }
                    if (b.lastOk && b.lastShot == _shot && !steps && !design && !(b.actor.Driver != null && b.actor.Driver.SteppedAt(_t))) Kinematics(b, att);
                }
                Remember(b);
            }
            _msCheck += _clock.ElapsedMilliseconds - t0; t0 = _clock.ElapsedMilliseconds;
            if (sample && _doShot && !seed && _cam && !covered) ShotStep();
            _msShot += _clock.ElapsedMilliseconds - t0;
        }

        // ---- shot checks: camera and staging, judged per shot (`--checks shot`) ----
        // They run on samples only. The cards say whose shot it is, where each actor stands and what each clip expects (Director/tools/mv/shotspec.mjs);
        // a video without cards checks `person` as the subject and skips mark.

        static void LoadSpec(string path)
        {
            _spec = null; _clipHips.Clear();
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return;
            var o = JObject.Parse(File.ReadAllText(path)); _spec = new List<Spec>();
            foreach (JObject x in (JArray)o["shots"] ?? new JArray())
            {
                var sp = new Spec { id = (string)x["id"], subject = (string)x["subject"], bone = (string)x["bone"], hero = (string)x["hero"], preset = (string)x["preset"], t = (double?)x["t"] ?? 0, tEnd = (double?)x["tEnd"] ?? 0, ecu = (bool?)x["ecu"] ?? false };
                foreach (var tg in (JArray)x["tags"] ?? new JArray()) sp.tags.Add((string)tg);
                foreach (var kv in (JObject)x["cast"] ?? new JObject())
                {
                    var c = (JObject)kv.Value; var p = c["pos"] as JArray;
                    sp.cast[kv.Key] = new CastSpec { mark = (string)c["mark"], kind = (string)c["kind"], clip = (string)c["clip"], moving = (bool?)c["moving"] ?? false, human = (bool?)c["human"] ?? false, pos = p != null && p.Count == 3 ? new Vector3((float)p[0], (float)p[1], (float)p[2]) : (Vector3?)null };
                }
                _spec.Add(sp);
            }
            foreach (var kv in (JObject)o["clips"] ?? new JObject()) { var h = (JArray)kv.Value["hips"]; _clipHips[kv.Key] = ((float)h[0], (float)h[1], (bool?)kv.Value["sit"] ?? false); }
        }

        /// <summary>The card of the camera shot now: the one holding the shot's middle, so a cut a frame off doesn't pick the neighbour.</summary>
        static Spec SpecNow()
        {
            if (_spec == null || _shots.Count == 0) return null;
            double mid = _shots[_shot].start + ShotLen(_shot) * .5;
            foreach (var s in _spec) if (mid >= s.t && mid < s.tEnd) return s;
            return null;
        }

        static Transform HB(Body b, HumanBodyBones x) => Has(b, x) ? b.actor.human[(int)x] : null;
        static Vector3 Fwd(Body b, HumanBodyBones x) => b.actor.human[(int)x].rotation * Quaternion.Inverse(b.actor.humanRest[(int)x]) * Vector3.forward;
        static bool InView(Vector3 v) => v.z >= _cam.nearClipPlane && v.x >= 0 && v.x <= 1 && v.y >= 0 && v.y <= 1;
        static Vector3 VP(Vector3 p) => _cam.WorldToViewportPoint(p);

        static void ShotStep()
        {
            // Frame the checks as the render frames them: the render's aspect (the Game view's is whatever its window is), put back after.
            _cam.aspect = _aspect;
            try { ShotChecksNow(); } finally { _cam.ResetAspect(); }
        }

        static void ShotChecksNow()
        {
            var sp = SpecNow();
            Body subj = null; string bone = null; bool named = false;
            if (sp == null) _byName.TryGetValue("person", out subj);
            else if (sp.subject != null) { named = true; bone = sp.bone; _byName.TryGetValue(sp.subject, out subj); }   // a prop or another non-body subject: nothing to frame
            else if (sp.hero != null) _byName.TryGetValue(sp.hero, out subj);
            if (subj != null && subj.human && subj.active && subj.actor.humanRest.Length > 0) Frame(sp, subj, bone, named, true);
            foreach (var b in _bodies) if (b != subj && b.human && b.active && b.onCam && !b.hidden && b.actor.humanRest.Length > 0) Frame(sp, b, null, false, false);
            foreach (var b in _bodies) if (b.human && b.active && b.onCam && !b.hidden) Gesture(b);
            Mark(sp);
            CamIn(sp);
            PropAt();
            if (subj != null && subj.active && subj.onCam && !subj.hidden && !(sp?.tags.Contains("dark") ?? false) && !_probed.Contains(_shot) && _t >= _shots[_shot].start + ShotLen(_shot) * .5 - 1e-6)
            {
                _probed.Add(_shot);
                try { Readable(subj); } catch (Exception e) { UnityEngine.Debug.LogWarning("motioncheck readable probe: " + e.Message); }
            }
        }

        /// <summary>
        /// Eyes and head in frame, with headroom, the face not cut by an edge, and the subject's body not half out at a side. Off for a deliberately tight
        /// shot: `extreme-close-up` or the `ecu` tag, or a frame under 30 cm tall at the head (nothing but a face fits). A bone subject (`on: person.hips`) or
        /// the `insert` tag only asks that the bone is in frame. Other actors facing the camera are checked for a half face or body at a side edge, as B.
        /// </summary>
        static void Frame(Spec sp, Body b, string bone, bool named, bool subject)
        {
            var head = HB(b, HumanBodyBones.Head); var neck = HB(b, HumanBodyBones.Neck); if (!head || !neck) return;
            string tail = subject ? "" : " (not the subject)";
            if (subject && (sp?.ecu ?? false)) return;
            bool faceBone = bone == null || bone.Equals("head", StringComparison.OrdinalIgnoreCase) || bone.Equals("neck", StringComparison.OrdinalIgnoreCase) || bone.StartsWith("eye", StringComparison.OrdinalIgnoreCase) || bone.Equals("mouth", StringComparison.OrdinalIgnoreCase);
            if (subject && (!faceBone || (sp?.tags.Contains("insert") ?? false)))
            {
                var bt = bone != null ? b.actor.Bone(bone) : head;
                if (bt && !InView(VP(bt.position)) && b.segs.All(s => !InView(VP(s.Mid)))) Add("frame", b.name, bone ?? "head", "subject out of frame", 1, .3f, 0, 3);
                return;
            }
            float k = b.s; var up = (head.position - neck.position).normalized; var fw = Fwd(b, HumanBodyBones.Head);
            var right = _cam.transform.right;
            Vector3 crown = head.position + up * .2f * k, chin = head.position - up * .04f * k + fw * .07f * k, mid = head.position + up * .09f * k;
            var le = HB(b, HumanBodyBones.LeftEye); var re = HB(b, HumanBodyBones.RightEye);
            Vector3 eL = le ? le.position : mid + fw * .08f * k - right * .032f * k, eR = re ? re.position : mid + fw * .08f * k + right * .032f * k;
            Vector3 vC = VP(crown), vN = VP(chin), vL = VP(eL), vR = VP(eR), vM = VP(mid);
            bool facing = Vector3.Dot(fw, (_cam.transform.position - head.position).normalized) > .25f;
            if (!subject && !facing) return;   // the back of a head at the edge of an over-shoulder is framing, not a fault
            bool headIn = InView(vC) || InView(vN) || InView(vL) || InView(vR) || InView(vM), bodyIn = b.segs.Any(x => InView(VP(x.Mid)));
            float tall = vM.z > .01f ? 2 * vM.z * _tan : 99;   // metres of world the frame holds at the head
            float headSize = Mathf.Clamp(Mathf.Abs(vC.y - vN.y), .02f, 1.5f);
            if (!headIn && !bodyIn) { if (named && subject) Add("frame", b.name, "head", "subject out of frame", 1, .3f, vM.z, 3); return; }
            if (subject && tall < .3f) return;   // deliberately inside the face
            bool eyesIn = InView(vL) && InView(vR);
            if (!eyesIn)
            {
                if (subject) Add("frame", b.name, "eyes", "eyes out of frame" + Edge(InView(vL) ? vR : vL), InView(vL) || InView(vR) ? .5f : 1, headSize, vM.z, 4);
                return;
            }
            // the face against each edge: how much of it is past the edge
            if (vC.y > 1 && vC.y > vN.y)
            {
                float f = (vC.y - 1) / (vC.y - vN.y);
                if (f >= .3f) Add("frame", b.name, "head", "face cut at top" + tail, f, headSize, vM.z, Mathf.Clamp(f / .3f, 1, 8));
            }
            Vector3 fl = VP(mid - right * .09f * k), fr = VP(mid + right * .09f * k); float fwid = Mathf.Max(1e-4f, fr.x - fl.x);
            if (fl.x < 0) { float f = -fl.x / fwid; if (f >= .3f) Add("frame", b.name, "head", "face cut at left edge" + tail, Mathf.Min(1, f), headSize, vM.z, Mathf.Clamp(f / .3f, 1, 8)); }
            if (fr.x > 1) { float f = (fr.x - 1) / fwid; if (f >= .3f) Add("frame", b.name, "head", "face cut at right edge" + tail, Mathf.Min(1, f), headSize, vM.z, Mathf.Clamp(f / .3f, 1, 8)); }
            if (subject && Mathf.Max(vL.y, vR.y) > .93f) Add("frame", b.name, "eyes", "no headroom: eyes at the top edge", Mathf.Max(vL.y, vR.y), headSize, vM.z, 1.5f);
            // the body half out at a side: only when the frame is wide enough to hold a body (a close-up crops it by design)
            if (tall >= 1f)
            {
                float lo = float.MaxValue, hi = float.MinValue; int n = 0;
                foreach (var x in b.segs) foreach (var p in new[] { x.p, x.q }) { var v = VP(p); if (v.z < _cam.nearClipPlane) continue; lo = Mathf.Min(lo, v.x); hi = Mathf.Max(hi, v.x); n++; }
                float w = hi - lo;
                if (n > 4 && w > .02f && (subject || w > .12f))
                {
                    if (lo < 0 && hi > 0) { float f = -lo / w; if (f >= .35f) Add("frame", b.name, "body", "body cut at left edge" + tail, Mathf.Min(1, f), Mathf.Min(1.5f, w), vM.z, Mathf.Clamp(f / .35f, 1, 8)); }
                    if (hi > 1 && lo < 1) { float f = (hi - 1) / w; if (f >= .35f) Add("frame", b.name, "body", "body cut at right edge" + tail, Mathf.Min(1, f), Mathf.Min(1.5f, w), vM.z, Mathf.Clamp(f / .35f, 1, 8)); }
                }
            }
        }

        static string Edge(Vector3 v) => v.z < _cam.nearClipPlane ? " (behind the camera)" : v.y > 1 ? " (top)" : v.y < 0 ? " (bottom)" : v.x < 0 ? " (left)" : " (right)";

        /// <summary>How far past the frame's edge a point is, in frame widths/heights: 0 inside, -1 behind the camera.</summary>
        static float OutBy(Vector3 p)
        {
            var v = VP(p); if (v.z < _cam.nearClipPlane) return -1;
            return Mathf.Max(0, Mathf.Max(Mathf.Max(-v.x, v.x - 1), Mathf.Max(-v.y, v.y - 1)));
        }

        /// <summary>
        /// A hand or foot whose speed, over the body's own travel, peaks mid-shot (an acting beat: over 1.2 m/s while the hips move under 0.6 m/s, at least
        /// 0.15 s from either cut) while it is just outside the frame (up to one frame height or width past an edge) and the body's head or chest is in it.
        /// Speeds come from consecutive samples (every 1/15 s with `--checks shot`).
        /// </summary>
        static void Gesture(Body b)
        {
            if (b.limbs == null)
            {
                var l = new List<Limb>();
                foreach (var (x, n) in new[] { (HumanBodyBones.LeftHand, "left hand"), (HumanBodyBones.RightHand, "right hand"), (HumanBodyBones.LeftFoot, "left foot"), (HumanBodyBones.RightFoot, "right foot") })
                    if (Has(b, x)) l.Add(new Limb { name = n, t = b.actor.human[(int)x] });
                b.limbs = l.ToArray();
            }
            double start = _shots[_shot].start, end = start + ShotLen(_shot);
            var head = HB(b, HumanBodyBones.Head); var chest = HB(b, HumanBodyBones.UpperChest) ?? HB(b, HumanBodyBones.Chest);
            bool body = (head && InView(VP(head.position))) || (chest && InView(VP(chest.position)));
            foreach (var L in b.limbs)
            {
                var p = L.t.position; double dt = _t - L.lastT;
                bool ok = L.lastT >= 0 && L.lastShot == _shot && dt > 1e-4 && dt <= (_stride + 1.5) * Dt;
                if (ok)
                {
                    float hip = (b.hips.position - b.gHips).magnitude / (float)dt, rel = (p - L.last).magnitude / (float)dt - hip;
                    if (L.v1 >= 0 && L.v2 >= 0 && L.v1 > L.v2 && L.v1 >= rel && L.v1 > 1.2f && _peaks.Count < 80) _peaks.Add($"{_t - dt:0.00} {b.name} {L.name} {L.v1:0.0} m/s hips {L.hip1:0.0} out {L.out1:0.00} body {(L.body1 ? 1 : 0)}");
                    if (L.v1 >= 0 && L.v2 >= 0 && L.v1 > L.v2 && L.v1 >= rel && L.v1 > 1.2f && L.hip1 < .6f && L.body1 && L.out1 > 0 && L.out1 <= 1f && _t - dt - start >= .15 && end - (_t - dt) >= .15)
                    {
                        double keep = _t; _t -= dt;   // the peak was the last sample
                        Add("gesture", b.name, L.name, L.name + " out of frame at its beat", L.v1, .3f, VP(L.p1).z, Mathf.Clamp(L.v1 / 1.2f, 1, 8));
                        _t = keep;
                    }
                    L.v2 = L.v1; L.v1 = rel; L.hip1 = hip;
                }
                else { L.v1 = L.v2 = -1; }
                L.out1 = OutBy(p); L.body1 = body; L.p1 = p;
                L.last = p; L.lastT = _t; L.lastShot = _shot;
            }
            b.gHips = b.hips.position;
        }

        static readonly HashSet<string> Travel = new HashSet<string> { "walk", "fly", "jump", "ragdoll", "throwobj", "swing", "orbit", "move", "fall", "topple", "slide", "drop", "suck", "scatter", "stretch", "rootwalk", "hop", "keys", "fold", "catch" };

        /// <summary>Something in the score moves the actor off its mark on purpose during this shot.</summary>
        static bool Travels(Body b)
        {
            double start = _shots[_shot].start;
            foreach (var o in b.ops)
            {
                if (o.start > _t + 1e-6) break;
                if (o.end < start - 1e-6 && o.kind != "ragdoll") continue;
                if (Travel.Contains(o.kind) || ((o.kind == "anim" || o.kind == "rootanim") && o.a.Has("root"))) return true;
            }
            return false;
        }

        static string ClipNow(Body b)
        {
            string c = null;
            foreach (var o in b.ops) { if (o.start > _t + 1e-6) break; if (o.kind == "anim") c = o.a.S("clip"); }
            if (c != null && c.EndsWith("__clean")) c = c.Substring(0, c.Length - 7);
            return c;
        }

        /// <summary>
        /// Each cast human on its card mark: the root (or the hips, beyond 45 cm of a seat's lean) more than 30 cm from it, and a body standing where it
        /// should sit: hips more than 15 cm over the top of the measured hips height (library/clips.json `hips`) of the card's clip or the clip playing now,
        /// whichever sits, or 0.65 m on a seat mark with no measured clip. Only actors the camera sees; not while the score moves them (walk, fly, root motion...), not while attached, not with `offmark`.
        /// </summary>
        static void Mark(Spec sp)
        {
            if (sp == null || sp.tags.Contains("offmark") || _t < sp.t - 1e-3) return;
            foreach (var kv in sp.cast)
            {
                var c = kv.Value; if (!c.human || c.pos == null || c.moving) continue;
                if (!_byName.TryGetValue(kv.Key, out var b) || !b.active || !b.onCam || b.hidden || Attached(b) || Travels(b)) continue;
                var head = HB(b, HumanBodyBones.Head); var hp = b.hips.position; var top = head ? head.position : hp + Vector3.up * .6f;
                Vector3 root = b.actor.transform.position, mk = c.pos.Value;
                float dRoot = new Vector2(root.x - mk.x, root.z - mk.z).magnitude, dHips = new Vector2(hp.x - mk.x, hp.z - mk.z).magnitude, off = Mathf.Max(dRoot, dHips - .45f);
                if (off > .3f) Report("mark", b, "root", "off " + c.mark, off, hp, top, .9f * b.s);
                // seated when the card's clip sits, or the clip playing now sits, or (no clip measured) the mark is a seat
                string clip = null; (float lo, float hi, bool sit) h = default;
                foreach (var cn in new[] { c.clip, ClipNow(b) }) if (cn != null && _clipHips.TryGetValue(cn, out var ch) && ch.sit) { clip = cn; h = ch; break; }
                bool measured = (c.clip != null && _clipHips.ContainsKey(c.clip)) || (ClipNow(b) is string cnow && _clipHips.ContainsKey(cnow));
                if (clip == null && (measured || c.kind != "seat")) continue;
                float want = clip != null ? h.hi : .65f, now = hp.y - root.y;
                if (now > want + .15f) Report("mark", b, "hips", "standing, " + (clip != null ? clip + " sits" : "seat mark " + c.mark), now - want, hp, top, .9f * b.s);
            }
        }

        /// <summary>
        /// The camera's near plane inside a body: its centre or a corner within a capsule (head 2.5 cm wider than its capsule, the rest 1 cm). Not a POV
        /// (camera within 8 cm of the eyes, looking within 35 degrees of the way the head looks) and not with the `pov` tag.
        /// </summary>
        static void CamIn(Spec sp)
        {
            if (sp?.tags.Contains("pov") ?? false) return;
            float n = _cam.nearClipPlane; var cp = _cam.transform.position;
            var pts = new[] { new Vector3(.5f, .5f, n), new Vector3(0, 0, n), new Vector3(1, 0, n), new Vector3(0, 1, n), new Vector3(1, 1, n) };
            for (int i = 0; i < pts.Length; i++) pts[i] = _cam.ViewportToWorldPoint(pts[i]);
            foreach (var b in _bodies)
            {
                if (!b.active) continue;
                foreach (var s in b.segs)
                {
                    float margin = (s.name == "head" ? .025f : .01f) * b.s, deep = 0;
                    foreach (var p in pts) deep = Mathf.Max(deep, s.r + margin - DistSeg(p, s.p, s.q));
                    if (deep <= 0) continue;
                    if (b.human && s.name == "head" && Has(b, HumanBodyBones.Head))
                    {
                        var le = HB(b, HumanBodyBones.LeftEye); var re = HB(b, HumanBodyBones.RightEye);
                        var eyes = le && re ? (le.position + re.position) * .5f : s.p + (s.q - s.p) * .5f;
                        if ((eyes - cp).magnitude < .08f * b.s && Vector3.Angle(_cam.transform.forward, Fwd(b, HumanBodyBones.Head)) < 35) continue;
                    }
                    Add("camin", b.name, s.name, "near plane inside " + s.name, deep, 1.5f, 0, 8);
                }
            }
        }

        static float DistSeg(Vector3 p, Vector3 a, Vector3 b)
        {
            var d = b - a; float l = d.sqrMagnitude; float t = l > 1e-8f ? Mathf.Clamp01(Vector3.Dot(p - a, d) / l) : 0;
            return (p - (a + d * t)).magnitude;
        }

        /// <summary>
        /// Props at their bones. An `attach` to any bone but a hand (the `hand` check owns hands): the prop's pivot against the bone's pose plus the
        /// attach's `pos`, over 3 cm. A prop parented to a body's root ("parent": "doctor") that sits within 30 cm of the head, neck, chest or a hand
        /// when first seen: should follow that bone, so its offset in that bone's frame is held from then on, and drifting over 3 cm is reported.
        /// </summary>
        static void PropAt()
        {
            foreach (var s in _spans)
            {
                if (s.bone == null || s.op == null || s.bone.IndexOf("hand", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (_t < s.from + s.op.a.F("blend") + Dt || _t >= s.to) continue;
                if (!s.item.gameObject.activeInHierarchy) continue;
                var tr = MVActor.Point(s.op.a.S("to"), _t, false, out var host); if (!tr) continue;
                float sc = host ? host.transform.lossyScale.x : 1;
                var want = tr.position + tr.rotation * (s.op.a.V("pos") * sc); var now = s.item.transform.position;
                float d = (want - now).magnitude;
                if (d > Limit["propat"]) Report("propat", s.item.name, "pivot", "off " + s.host + "." + s.bone, d, now, want, .2f);
            }
            foreach (var pp in _parented)
            {
                if (pp.none || !pp.r || !pp.r.enabled || !pp.r.gameObject.activeInHierarchy || !pp.host.active) continue;
                var c = pp.r.bounds.center;
                if (!pp.init)
                {
                    float best = .3f * pp.host.s;
                    foreach (var (x, n) in new[] { (HumanBodyBones.Head, "head"), (HumanBodyBones.Neck, "neck"), (HumanBodyBones.UpperChest, "chest"), (HumanBodyBones.Chest, "chest"), (HumanBodyBones.LeftHand, "left hand"), (HumanBodyBones.RightHand, "right hand") })
                    {
                        var t = HB(pp.host, x); if (!t) continue;
                        float d = (t.position - c).magnitude; if (d < best) { best = d; pp.bone = t; pp.boneName = n; }
                    }
                    pp.init = true; pp.none = !pp.bone;
                    if (pp.bone) pp.local = Quaternion.Inverse(pp.bone.rotation) * (c - pp.bone.position);
                    continue;
                }
                var want = pp.bone.position + pp.bone.rotation * pp.local; float dd = (want - c).magnitude;
                if (dd > Limit["propat"]) Report("propat", pp.item.name, "rides the root", "not on " + pp.host.name + "'s " + pp.boneName, dd, c, want, Mathf.Max(.1f, pp.r.bounds.size.magnitude));
            }
        }

        /// <summary>
        /// Can the subject be read against what is around it: one 160x90 render of the shot's camera at its middle (the shot's own look and grade), the
        /// subject's pixels from its capsules projected into the frame, a ring around them, and the difference of their mean colour and luminance
        /// (display values, 0-1): each subject pixel against the ring's mean, averaged, the larger of the luminance difference and 0.6 of the colour distance. Under 0.07 is B, under 0.035 A. `dark` on a card skips it.
        /// `"probes": true` keeps every probe in captures/shotcheck-probes/; a flagged one is always kept.
        /// </summary>
        static void Readable(Body b)
        {
            int W = _aspect >= 1 ? 160 : Mathf.RoundToInt(160 * _aspect), H = _aspect >= 1 ? Mathf.RoundToInt(160 / _aspect) : 160;
            if (_probeRT && (_probeRT.width != W || _probeRT.height != H)) { _probeRT.Release(); UnityEngine.Object.DestroyImmediate(_probeRT); UnityEngine.Object.DestroyImmediate(_probeTex); _probeRT = null; }
            if (_quality == null) { _quality = Quality.Preview; Quality.Draft(); }   // preview's render scale crops a render into a texture: the final picture, as mv frame takes it
            if (!_probeRT) { _probeRT = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32) { hideFlags = HideFlags.HideAndDontSave }; _probeTex = new Texture2D(W, H, TextureFormat.RGB24, false) { hideFlags = HideFlags.HideAndDontSave }; }
            var old = _cam.targetTexture; _cam.targetTexture = _probeRT;
            float tan = Mathf.Tan(_cam.fieldOfView * .5f * Mathf.Deg2Rad);
            var segs = new List<(Vector2 p, Vector2 q, float r)>();
            foreach (var s in b.segs)
            {
                Vector3 a = VP(s.p), c = VP(s.q); if (a.z < _cam.nearClipPlane || c.z < _cam.nearClipPlane) continue;
                float rp = s.r * H / (2 * Mathf.Min(a.z, c.z) * tan);
                segs.Add((new Vector2(a.x * W, a.y * H), new Vector2(c.x * W, c.y * H), Mathf.Max(1, rp)));
            }
            try { _cam.Render(); } finally { _cam.targetTexture = old; }
            _probes++;
            var keep = RenderTexture.active; RenderTexture.active = _probeRT;
            _probeTex.ReadPixels(new Rect(0, 0, W, H), 0, 0, false); _probeTex.Apply(false);
            RenderTexture.active = keep;
            if (segs.Count == 0) return;
            var px = _probeTex.GetPixels32();
            var dist = new float[W * H]; int x0 = W, x1 = -1, y0 = H, y1 = -1, nIn = 0;
            for (int y = 0; y < H; y++) for (int x = 0; x < W; x++)
                {
                    var pt = new Vector2(x + .5f, y + .5f); float best = float.MaxValue;
                    foreach (var (p, q, r) in segs) { var d = q - p; float l = d.sqrMagnitude, t = l > 1e-6f ? Mathf.Clamp01(Vector2.Dot(pt - p, d) / l) : 0; best = Mathf.Min(best, (pt - (p + d * t)).magnitude - r); }
                    dist[y * W + x] = best;
                    if (best <= 0) { nIn++; x0 = Mathf.Min(x0, x); x1 = Mathf.Max(x1, x); y0 = Mathf.Min(y0, y); y1 = Mathf.Max(y1, y); }
                }
            if (nIn < 30) return;   // too small in frame to judge
            int grow = Mathf.Max(6, (int)(.4f * Mathf.Max(x1 - x0, y1 - y0)));
            Vector3 sin = Vector3.zero, sout = Vector3.zero; int nOut = 0;
            int ya = Mathf.Max(0, y0 - grow), yb = Mathf.Min(H - 1, y1 + grow), xa = Mathf.Max(0, x0 - grow), xb = Mathf.Min(W - 1, x1 + grow);
            for (int y = ya; y <= yb; y++) for (int x = xa; x <= xb; x++)
                {
                    var c = px[y * W + x]; var v = new Vector3(c.r, c.g, c.b) / 255f; float d = dist[y * W + x];
                    if (d <= 0) sin += v; else if (d > 2) { sout += v; nOut++; }
                }
            if (nOut < 30) return;
            Vector3 mi = sin / nIn, mo = sout / nOut;
            float Y(Vector3 q3) => .2126f * q3.x + .7152f * q3.y + .0722f * q3.z;
            // each subject pixel against the surroundings' mean, averaged: a dark shirt and a pale face on a mid-grey wall both read, a black body on black doesn't
            float dy = 0, dc = 0; float yo = Y(mo);
            for (int y = y0; y <= y1; y++) for (int x = x0; x <= x1; x++)
                {
                    if (dist[y * W + x] > 0) continue;
                    var c = px[y * W + x]; var v = new Vector3(c.r, c.g, c.b) / 255f;
                    dy += Mathf.Abs(Y(v) - yo); dc += (v - mo).magnitude;
                }
            float contrast = Mathf.Max(dy / nIn, .6f * dc / nIn / Mathf.Sqrt(3));
            float size = Mathf.Min(1.5f, (y1 - y0 + 1) / (float)H);
            _lastContrast[_shot] = contrast;
            bool flag = contrast < Limit["readable"];
            if (flag) Add("readable", b.name, "body", $"subject {Y(mi):0.00} on {Y(mo):0.00}", contrast, size, VP(b.hips.position).z, Mathf.Clamp(Limit["readable"] / Mathf.Max(contrast, .005f), 1, 8));
            if (flag || _saveProbes)
            {
                var dir = Path.Combine(Video.Captures, "shotcheck-probes"); Directory.CreateDirectory(dir);
                File.WriteAllBytes(Path.Combine(dir, $"{_shot + 1:000}-{(_shots[_shot].name ?? "").Replace(' ', '_').Replace('/', '_')}.png"), _probeTex.EncodeToPNG());
            }
        }

        // ---- commands ----

        [BridgeCommand("motioncheck")]
        static object Run(JObject m)
        {
            if (m["merge"] != null) return Merge(m);
            var d = Transport.Director;
            if (d.playableGraph.IsValid() && d.playableGraph.IsPlaying()) throw new Exception("the timeline is playing; try when J stops");
            if (Capture.Progress != null) throw new Exception("a render is running");
            double from = (double?)m["from"] ?? 0, to = (double?)m["to"] ?? d.duration, every = (double?)m["every"] ?? .1, budget = (double?)m["budget"] ?? 150;
            double keep = d.time; bool dirty = SceneManager.GetActiveScene().isDirty;
            _song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            if (!d.playableGraph.IsValid()) d.RebuildGraph();
            var clock = Stopwatch.StartNew(); _msEval = _msNear = _msCheck = _msShot = 0; _hiddenSamples = 0; _probes = 0;
            // checks: none = everything; "joint" = joints and overreach only (as before); "shot" = the camera and staging checks only; "contact" = the rest; a list mixes them.
            var checks = ((string)m["checks"] ?? "").Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            bool full = checks.Length == 0, contact = full || checks.Contains("contact");
            _doJoints = full || checks.Contains("joint"); _doShot = full || checks.Contains("shot"); _jointsOnly = !contact; _shotOnly = !contact && !_doJoints;
            _aspect = (float?)m["aspect"] ?? 16f / 9; _quality = null;
            _saveProbes = (bool?)m["probes"] ?? false; _nativeFull = (bool?)m["nativeFull"] ?? true; _probed.Clear(); _lastContrast.Clear(); _peaks.Clear();
            LoadSpec((string)m["spec"]);
            _open.Clear(); _done = new List<R>(); _near.Clear(); _gap = Math.Max(.2, every * 2.5);
            _brain = Camera.main ? Camera.main.GetComponent<CinemachineBrain>() : null;
            d.time = from; d.Evaluate();
            Build((string)m["on"]);
            MakeHolder();
            int stride = _stride = Math.Max(1, (int)Math.Round(every * Fps)), n0 = (int)Math.Ceiling(from * Fps - 1e-6), n1 = (int)Math.Floor(to * Fps + 1e-6), frame = n0, count = 0;
            double next = -1;
            try
            {
                if (n0 > 0) Step(n0 - 1, false, true);
                for (; frame <= n1; frame++)
                {
                    bool isSample = frame == n0 || frame % stride == 0 || ShotAt(frame * Dt) != ShotAt((frame - 1) * Dt);
                    if (isSample || !_shotOnly) Step(frame, isSample, false);   // the shot checks only look at samples, so alone they skip the frames between
                    count++;
                    if (clock.Elapsed.TotalSeconds > budget && frame < n1) { next = (frame + 1) * Dt; break; }
                }
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(_holder); _holder = null;
                foreach (var p in _props) { p.go = null; p.col = null; }
                if (_quality != null) { if (_quality.Value) Quality.Set(true); else Quality.Set(false); _quality = null; }
                Transport.Seek(keep);
            }
            bool changed = SceneManager.GetActiveScene().isDirty != dirty;
            var info = new JObject
            {
                ["from"] = from, ["to"] = next >= 0 ? next : to, ["every"] = every, ["frames"] = count, ["seconds"] = Math.Round(clock.Elapsed.TotalSeconds, 1),
                ["bodies"] = new JArray(_bodies.Select(b => (object)(b.name + " s=" + b.s.ToString("0.00") + (b.feet.Length > 0 ? " sole " + b.feet[0].heelH.ToString("0.000") : "")))),
                ["skippedMeshes"] = new JArray(_skippedMesh.Keys.Select(x => (object)x.name)),
                ["sceneDirtied"] = changed, ["hiddenSamples"] = _hiddenSamples, ["ms"] = $"evaluate {_msEval} near {_msNear} checks {_msCheck} shot {_msShot}", ["probes"] = _probes,
                ["checks"] = _shotOnly ? "shot" : _jointsOnly ? (_doShot ? "joint,shot" : "joint") : "all", ["spec"] = _spec != null ? _spec.Count : 0,
                ["peaks"] = new JArray(_peaks.ToArray()), ["contrast"] = JObject.FromObject(_lastContrast.ToDictionary(kv => (kv.Key + 1).ToString("000") + " " + _shots[kv.Key].name, kv => Math.Round(kv.Value, 3))),
            };
            var dir = Video.Captures;
            if (m["part"] != null)
            {
                var path = Path.Combine(dir, "motioncheck.part-" + (string)m["part"] + ".json");
                File.WriteAllText(path, new JObject { ["info"] = info, ["ranges"] = JArray.FromObject(_done) }.ToString(Newtonsoft.Json.Formatting.None));
                return new JObject { ["next"] = next, ["frames"] = count, ["ms"] = info["ms"], ["seconds"] = info["seconds"], ["ranges"] = _done.Count, ["sceneDirtied"] = changed, ["path"] = path };
            }
            var res = Finish(_done, new List<JObject> { info });
            res["next"] = next; res["sceneDirtied"] = changed;
            return res;
        }

        static object Merge(JObject m)
        {
            _song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            var all = new List<R>(); var infos = new List<JObject>();
            foreach (var f in m["merge"])
            {
                var o = JObject.Parse(File.ReadAllText((string)f));
                infos.Add((JObject)o["info"]); all.AddRange(o["ranges"].ToObject<List<R>>());
            }
            return Finish(all, infos);
        }

        // ---- grouping and the report ----

        static float Score(R r)
        {
            float dur = Mathf.Clamp((float)(r.to - r.from) + (float)Dt, .03f, 3);
            return 100 * r.size * Mathf.Sqrt(r.sev) * (.5f + Mathf.Sqrt(dur)) * Weight[r.check] * (r.how == "bounds" ? .5f : 1);
        }

        static bool Enough(R r) => !(r.check == "footslide" || r.check == "bodyslide" || r.check == "float" || r.check == "frame" || r.check == "mark") || r.n >= 2;

        class Problem { public string check, actor, shot, what, how, level; public double from, to, peak, len; public float val, size, dist, score, seconds; public HashSet<string> parts = new HashSet<string>(); }

        /// <summary>
        /// A or B for the shot checks (the render gate stops on A; the others have no level). A fault that lasts is at least 0.3 s or 35% of its shot.
        /// camin is always A. frame: eyes out, or the subject out, lasting; the face cut 40% at an edge, lasting; the subject's body half out at a side, lasting.
        /// mark: standing where the clip sits, lasting; off the mark by 60 cm, lasting. readable: contrast under 3.5%. propat: 8 cm, lasting. gesture: B.
        /// </summary>
        static string Level(Problem g)
        {
            if (!ShotChecks.Contains(g.check)) return null;
            bool lasting = g.seconds >= .3f || (g.len > 0 && g.seconds >= .35 * g.len), other = g.what != null && g.what.EndsWith("(not the subject)");
            switch (g.check)
            {
                case "camin": return "A";
                case "frame":
                    if (other) return "B";
                    if (g.what.StartsWith("eyes") || g.what.StartsWith("subject")) return lasting ? "A" : "B";
                    if (g.what.StartsWith("face cut")) return g.val >= .4f && lasting ? "A" : "B";
                    if (g.what.StartsWith("body cut")) return g.val >= .5f && lasting ? "A" : "B";
                    return "B";
                case "mark": return g.what.StartsWith("standing") ? (lasting ? "A" : "B") : g.val >= .6f && lasting ? "A" : "B";
                case "readable": return g.val < .035f ? "A" : "B";
                case "propat": return g.val >= .08f && lasting ? "A" : "B";
                default: return "B";
            }
        }

        static string Clock(double t) => $"{(int)(t / 60)}:{t % 60:00.00}";

        static JObject Finish(List<R> raw, List<JObject> infos)
        {
            double gap = infos.Max(i => Math.Max(.2, (double)i["every"] * 2.5));
            var joined = new List<R>(); var open = new Dictionary<string, R>();
            foreach (var r in raw.OrderBy(x => x.from))
            {
                if (open.TryGetValue(r.Key(), out var o) && r.from - o.to <= gap)
                {
                    o.to = Math.Max(o.to, r.to); o.n += r.n; o.val = Mathf.Max(o.val, r.val);
                    if (r.sev * r.size > o.sev * o.size) { o.peak = r.peak; o.dist = r.dist; }
                    o.size = Mathf.Max(o.size, r.size); o.sev = Mathf.Max(o.sev, r.sev);
                }
                else { joined.Add(r); open[r.Key()] = r; }
            }
            joined = joined.Where(Enough).ToList();

            var groups = new Dictionary<string, Problem>();
            foreach (var r in joined)
            {
                string thing = r.check == "prop" || r.check == "hand" || r.check == "bodies" || ShotChecks.Contains(r.check) ? r.b : r.check == "joint" || r.check == "overreach" ? r.a + " " + r.b : r.check == "self" ? "own body" : "";
                string key = r.shot + "|" + r.actor + "|" + r.check + "|" + thing;
                if (!groups.TryGetValue(key, out var g)) groups[key] = g = new Problem { check = r.check, actor = r.actor, shot = r.shot, what = thing, from = r.from, to = r.to, how = r.how, len = r.len };
                g.from = Math.Min(g.from, r.from); g.to = Math.Max(g.to, r.to); g.parts.Add(r.check == "self" ? r.a + "/" + r.b : r.a);
                float sc = Score(r);
                if (sc > g.score) { g.score = sc; g.peak = r.peak; g.dist = r.dist; }
                g.val = Mathf.Max(g.val, r.val); g.size = Mathf.Max(g.size, r.size); g.seconds += (float)(r.to - r.from) + (float)Dt;
            }
            foreach (var g in groups.Values) g.level = Level(g);
            var ranked = groups.Values.OrderByDescending(g => g.score).ToList();

            var dir = Video.Captures;
            var json = new JObject
            {
                ["method"] = "Bodies: capsules between bones (radii scaled to the rig). Props: temporary non-convex MeshCollider on each mesh, Physics.ComputePenetration against the surface, plus 6-axis rays for a part wholly inside a closed mesh. Skinned meshes that are not checked bodies: box at 70% of bounds (how=bounds). Visibility: the camera's frustum, then rays from the camera to each body part against the real meshes; a body wholly behind something at a sample is not reported until the next sample. Shot checks (frame, gesture, mark, readable, camin, propat) run on samples, read the cards through captures/shotspec.json, and carry a level: A stops a render.",
                ["hiddenSamples"] = infos.Sum(i => (int?)i["hiddenSamples"] ?? 0),
                ["runs"] = new JArray(infos),
                ["counts"] = JObject.FromObject(joined.GroupBy(x => x.check).ToDictionary(g => g.Key, g => g.Count())),
                ["problems"] = JArray.FromObject(ranked.Select(g => new { g.check, g.actor, g.shot, g.what, parts = g.parts.ToArray(), g.how, from = Math.Round(g.from, 3), to = Math.Round(g.to, 3), peak = Math.Round(g.peak, 3), label = _song.Label(g.peak), value = Math.Round(Show(g.check, g.val), 2), unit = Unit[g.check], size = Math.Round(g.size, 3), dist = Math.Round(g.dist, 2), score = Math.Round(g.score, 2), g.level, seconds = Math.Round(g.seconds, 2), shotLen = Math.Round(g.len, 2) })),
                ["ranges"] = JArray.FromObject(joined),
            };
            File.WriteAllText(Path.Combine(dir, "motioncheck.json"), json.ToString());

            var md = new StringBuilder();
            md.AppendLine("# Motion check").AppendLine();
            md.AppendLine($"Written by `mv motioncheck`, {DateTime.Now:yyyy-MM-dd HH:mm}. {infos.Sum(i => (int)i["frames"])} frames at 30 fps, {infos.Min(i => (double)i["from"]):0.0} to {infos.Max(i => (double)i["to"]):0.0} s. Only what the shot's camera can see counts: in the frustum, and not wholly behind something ({infos.Sum(i => (int?)i["hiddenSamples"] ?? 0)} body samples were hidden). Closer and larger rank first.").AppendLine();
            md.AppendLine("Totals, as time ranges: " + string.Join(", ", joined.GroupBy(x => x.check).OrderByDescending(g => g.Count()).Select(g => $"{g.Key} {g.Count()}")) + ".").AppendLine();
            md.AppendLine($"Method: {json["method"]}").AppendLine();
            md.AppendLine("| # | time | bar | shot | who | check | parts | against | worst | on screen | cam m | score |");
            md.AppendLine("|---|---|---|---|---|---|---|---|---|---|---|---|");
            int rank = 0;
            foreach (var g in ranked.Take(60))
            {
                rank++;
                var parts = string.Join(", ", g.parts.Take(4)) + (g.parts.Count > 4 ? $" +{g.parts.Count - 4}" : "");
                md.AppendLine($"| {rank} | {Clock(g.from)}-{Clock(g.to)} | {_song.Label(g.peak)} | {g.shot} | {g.actor} | {g.check}{(g.level != null ? " [" + g.level + "]" : "")}{(g.how != null && g.how != "surface" ? " (" + g.how + ")" : "")} | {parts} | {g.what} | {Show(g.check, g.val):0.#} {Unit[g.check]} | {g.size * 100:0}% | {g.dist:0.0} | {g.score:0.0} |");
            }
            File.WriteAllText(Path.Combine(dir, "motioncheck-report.md"), md.ToString());
            return new JObject { ["json"] = Path.Combine(dir, "motioncheck.json"), ["report"] = Path.Combine(dir, "motioncheck-report.md"), ["ranges"] = joined.Count, ["problems"] = ranked.Count, ["counts"] = json["counts"] };
        }

        /// <summary>An actor's ops of some kinds between two times (start, end, args), and its root and hips at t: `call opsprobe '{"actor":"other","from":140,"to":146,"t":143.3}'`.</summary>
        [BridgeCommand("opsprobe")]
        static object OpsProbe(JObject m)
        {
            var a = MVActor.Named((string)m["actor"]); if (!a) throw new Exception("no actor");
            double from = (double?)m["from"] ?? 0, to = (double?)m["to"] ?? 1e9, t = (double?)m["t"] ?? from;
            var ops = (OpsOf(a) ?? new List<Op>()).Where(o => o.end >= from && o.start <= to && o.kind != "face" && o.kind != "blink" && o.kind != "eyes").Select(o => $"{o.kind} {o.start:0.000}-{o.end:0.000} ws {o.ws:0.000} {(o.a.Vec.TryGetValue("pos", out var pv) ? pv.ToString() : "")}").ToArray();
            var d = Transport.Director; double keep = d.time;
            var trace = new List<string>();
            MotionDriver.ApplyHook = (drv, act, tt, skip) => { if (act == a) trace.Add($"{tt:0.000}{(skip ? " skip" : "")} late {MVLate.Flushing} defer {MVLate.Deferring} by {(MotionDriver.Current != null && MotionDriver.Current != drv ? MotionDriver.CurrentActor?.name : "-")} root {string.Join(",", A3(act.transform.position))}"); };
            d.time = t; d.Evaluate(); trace.Add("-- flush"); MVLate.Flush();
            MotionDriver.ApplyHook = null;
            var root = a.transform.position; var hips = a.human.Length > 0 && a.human[0] ? a.human[0].position : Vector3.zero;
            var an = (a.animRoot ? a.animRoot : a.gameObject).GetComponentInChildren<Animator>(true);
            string anInfo = an ? $"{an.gameObject.name} onActor {an.gameObject == a.gameObject} rootMotion {an.applyRootMotion} animRoot {(a.animRoot ? a.animRoot.name : "-")} animRootLocal {A3(a.animRoot ? a.animRoot.transform.localPosition : Vector3.zero)[0]},{A3(a.animRoot ? a.animRoot.transform.localPosition : Vector3.zero)[2]}" : "none";
            var md = a.Driver as MotionDriver; var BF = BindingFlags.NonPublic | BindingFlags.Instance;
            object echo = null, body = null, songName = null;
            try { echo = typeof(MotionDriver).GetMethod("EchoDelay", BF).Invoke(md, new object[] { t }); } catch (Exception e) { echo = e.Message; }
            try { var args = new object[] { t, a, null }; body = typeof(MotionDriver).GetMethod("BodyTime", BF).Invoke(md, args); } catch (Exception e) { body = e.Message; }
            try { var sf = typeof(Driver).GetField("Song", BF); var sm = sf.GetValue(md) as SongMap; songName = sm ? sm.name + " " + AssetDatabase.GetAssetPath(sm) : "null"; } catch (Exception e) { songName = e.Message; }
            var tracks = new List<string>();
            foreach (var tr0 in ((UnityEngine.Timeline.TimelineAsset)Transport.Director.playableAsset).GetOutputTracks()) if (Transport.Director.GetGenericBinding(tr0) as MVActor == a) tracks.Add(tr0.GetType().Name + " " + tr0.name);
            (a.Driver as MotionDriver)?.Reapply(a, t); var rootAgain = a.transform.position;
            d.Evaluate(); var rootEval2 = a.transform.position; MVLate.Flush(); var rootEval2Flush = a.transform.position;
            var song = AssetDatabase.LoadAssetAtPath<SongMap>(ScoreCompiler.SongPath);
            Transport.Seek(keep);
            return new { ops, root = A3(root), hips = A3(hips), warpT = song ? song.Warp(t) : -1, native = a.native, anInfo, rootAfterReapply = A3(rootAgain), rootEval2 = A3(rootEval2), rootEval2Flush = A3(rootEval2Flush), driverType = a.Driver?.GetType().Name, trace, echo, body, song = songName, tracks, parent = a.transform.parent ? a.transform.parent.name + " " + string.Join(",", A3(a.transform.parent.position)) : null, local = A3(a.transform.localPosition), basePos = A3(a.basePos) };
        }

        static float[] A3(Vector3 v) => new[] { (float)Math.Round(v.x, 4), (float)Math.Round(v.y, 4), (float)Math.Round(v.z, 4) };

        /// <summary>
        /// Where an attached item is against where its attach says it should be, at t, after a jump from `from` (as the walk jumps between samples),
        /// then after a second evaluation of the same t: `call attachprobe '{"item":"can","t":56.2}'`. Also how far the item's bounds are from the
        /// host's Animator bone, which is what the `hand` check measures.
        /// </summary>
        [BridgeCommand("attachprobe")]
        static object AttachProbe(JObject m)
        {
            var d = Transport.Director; if (!d.playableGraph.IsValid()) d.RebuildGraph();
            double t = (double)m["t"], keep = d.time; var a = MVActor.Named((string)m["item"]); if (!a) throw new Exception("no actor " + m["item"]);
            Op att = null; foreach (var o in OpsOf(a) ?? new List<Op>()) { if (o.start > t) break; if (o.kind == "attach") att = o; else if (o.kind == "detach") att = null; }
            if (att == null) throw new Exception("not attached at " + t);
            object Read(string tag)
            {
                var tr = MVActor.Point(att.a.S("to"), t, false, out var host); float sc = host ? host.transform.lossyScale.x : 1;
                var want = tr.position + tr.rotation * (att.a.V("pos") * sc);
                var an = host ? (host.animRoot ? host.animRoot : host.gameObject).GetComponentInChildren<Animator>(true) : null;
                string bn = att.a.S("to").Contains(".") ? att.a.S("to").Split('.')[1] : null;
                Transform ab = an && an.isHuman && bn != null && Enum.TryParse<HumanBodyBones>(MVActor.Alias(bn), true, out var hb) ? an.GetBoneTransform(hb) : null;
                bool any = false; Bounds box = default;
                foreach (var r in a.GetComponentsInChildren<Renderer>()) if (r.enabled) { if (any) box.Encapsulate(r.bounds); else { box = r.bounds; any = true; } }
                return new
                {
                    tag, item = A3(a.transform.position), want = A3(want), errCm = Math.Round((want - a.transform.position).magnitude * 100, 2),
                    bone = A3(tr.position), animatorBone = ab ? A3(ab.position) : null, sameBone = ab == tr,
                    hostHead = host && host.human.Length > (int)HumanBodyBones.Head && host.human[(int)HumanBodyBones.Head] ? A3(host.human[(int)HumanBodyBones.Head].eulerAngles) : null,
                    boundsCenter = any ? A3(box.center) : null, boundsSize = any ? A3(box.size) : null,
                    boundsToBoneCm = any && ab ? Math.Round((box.ClosestPoint(ab.position) - ab.position).magnitude * 100, 2) : -1,
                    renderers = a.GetComponentsInChildren<Renderer>().Select(r => r.name + (r.enabled ? "" : " (off)") + " " + string.Join(",", A3(r.bounds.center))).ToArray(),
                };
            }
            d.time = (double?)m["from"] ?? Math.Max(0, t - .1); d.Evaluate(); MVLate.Flush();
            d.time = t; d.Evaluate(); MVLate.Flush(); var r1 = Read("after a jump");
            d.Evaluate(); MVLate.Flush(); var r2 = Read("evaluated again");
            Transport.Seek(keep);
            return new { attach = att.a.S("to"), at = att.start, r1, r2 };
        }

        /// <summary>
        /// The camera at t as the motion check's walk leaves it (walking from `from` at the walk's stride) against a fresh seek to t as `mv frame` does it:
        /// position, rotation, fov, aspect, the live shot and its LookAt. `call camprobe '{"t":1.47,"from":0.2}'`. Puts time back.
        /// </summary>
        [BridgeCommand("camprobe")]
        static object CamProbe(JObject m)
        {
            var d = Transport.Director; if (!d.playableGraph.IsValid()) d.RebuildGraph();
            double t = (double)m["t"], from = (double?)m["from"] ?? Math.Max(0, t - 1), keep = d.time; int stride = (int?)m["stride"] ?? 2;
            _brain = Camera.main ? Camera.main.GetComponent<CinemachineBrain>() : null;
            object Read(string tag)
            {
                var c = Camera.main; var vc = _brain ? _brain.ActiveVirtualCamera as CinemachineVirtualCameraBase : null;
                var la = vc ? vc.LookAt : null;
                return new { tag, pos = A3(c.transform.position), rot = A3(c.transform.eulerAngles), fov = Math.Round(c.fieldOfView, 3), aspect = Math.Round(c.aspect, 4), target = c.targetTexture ? c.targetTexture.name : null, shot = vc ? vc.Name : null, lookAt = la ? la.name : null, lookAtPos = la ? A3(la.position) : null, clock = Math.Round(MVClock.T, 4) };
            }
            for (int f = (int)Math.Ceiling(from * Fps); f * Dt < t - 1e-6; f += stride) Eval(f * Dt);
            Eval(t); var walk = Read("walk");
            Eval(t); var again = Read("walk, evaluated again");
            d.time = t; d.Evaluate(); MVLate.Flush();
            if (_brain)
            {
                var k = _brain.UpdateMethod; _brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
                var was = _brain.ActiveVirtualCamera; _brain.ManualUpdate(); _brain.ManualUpdate();
                if (_brain.ActiveVirtualCamera != was) { d.Evaluate(); _brain.ManualUpdate(); }
                _brain.UpdateMethod = k;
            }
            var seek = Read("as mv frame");
            Transport.Seek(keep);
            return new { walk, again, seek };
        }

        /// <summary>Proves the collider path works here: a capsule across a unit cube's face, one wholly inside, one clear.</summary>
        [BridgeCommand("motioncheck-selftest")]
        static object SelfTest(JObject m)
        {
            MakeHolder();
            try
            {
                var cube = Resources.GetBuiltinResource<Mesh>("Cube.fbx");
                var go = new GameObject("t") { hideFlags = HideFlags.HideAndDontSave }; go.transform.SetParent(_holder.transform, false);
                var mc = go.AddComponent<MeshCollider>(); mc.sharedMesh = cube;
                go.transform.position = new Vector3(0, 100, 0);
                Physics.SyncTransforms();
                var pr = new Prop { go = go, col = mc, mesh = cube };
                float across = Penetration(new Seg { r = .1f, p = new Vector3(.55f, 99.8f, 0), q = new Vector3(.55f, 100.2f, 0) }, pr);
                float inner = Penetration(new Seg { r = .05f, p = new Vector3(0, 99.95f, 0), q = new Vector3(0, 100.05f, 0) }, pr);
                float none = Penetration(new Seg { r = .1f, p = new Vector3(.75f, 99.8f, 0), q = new Vector3(.75f, 100.2f, 0) }, pr);
                bool ray = mc.Raycast(new Ray(new Vector3(0, 102, 0), Vector3.down), out var h, 5);
                bool fromInside = mc.Raycast(new Ray(new Vector3(0, 100, 0), Vector3.up), out _, 5);
                return new { across, wantAcross = .05f, inner, none, ray, rayHitY = h.point.y, fromInside };
            }
            finally { UnityEngine.Object.DestroyImmediate(_holder); _holder = null; }
        }
    }
}
