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
            public bool active, onCam; public Transform rootT;
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
        }

        class Prop
        {
            public Renderer r; public Mesh mesh; public MVActor owner; public string label; public bool skinned;
            public GameObject go; public Collider col; public bool failed;
        }

        class Span { public MVActor item; public string host, bone; public double from, to; }

        /// <summary>One problem over a time range, in one shot.</summary>
        public class R
        {
            public string check, actor, a, b, shot, how; public double from, to, peak; public float val, size, dist, sev; public int n;
            public string Key() => check + "|" + actor + "|" + a + "|" + b + "|" + shot;
        }

        static readonly FieldInfo OpsF = typeof(Driver).GetField("Ops", BindingFlags.NonPublic | BindingFlags.Instance);
        static List<Op> OpsOf(MVActor a) => a != null && a.Driver != null ? OpsF.GetValue(a.Driver) as List<Op> : null;

        static readonly Dictionary<string, float> Limit = new Dictionary<string, float>
        { ["prop"] = .02f, ["self"] = .02f, ["bodies"] = .02f, ["floor"] = .02f, ["float"] = .02f, ["footslide"] = .02f, ["pop-rot"] = 40, ["pop-move"] = .4f, ["bodyslide"] = .3f, ["hand"] = .03f, ["joint"] = 10, ["overreach"] = .03f };
        static readonly Dictionary<string, float> Weight = new Dictionary<string, float>
        { ["prop"] = 1, ["self"] = 1, ["bodies"] = .9f, ["floor"] = .9f, ["float"] = .8f, ["footslide"] = .8f, ["pop-rot"] = 1.2f, ["pop-move"] = 1.2f, ["bodyslide"] = 1, ["hand"] = .7f, ["joint"] = 1.4f, ["overreach"] = 1.4f };
        static readonly Dictionary<string, string> Unit = new Dictionary<string, string>
        { ["prop"] = "cm deep", ["self"] = "cm deep", ["bodies"] = "cm deep", ["floor"] = "cm under", ["float"] = "cm above", ["footslide"] = "cm/frame", ["pop-rot"] = "deg/frame", ["pop-move"] = "m/frame", ["bodyslide"] = "m/s", ["hand"] = "cm off", ["joint"] = "deg", ["overreach"] = "cm over" };
        static float Show(string check, float v) => check == "joint" || check == "pop-rot" || check == "pop-move" || check == "bodyslide" ? v : v * 100;

        // ---- run state ----
        static List<Body> _bodies; static List<Prop> _props; static readonly List<Prop> _near = new List<Prop>(); static List<Span> _spans;
        static List<(double start, string name)> _shots; static Dictionary<Mesh, int> _skippedMesh;
        static GameObject _holder; static CapsuleCollider _cap; static Camera _cam; static CinemachineBrain _brain; static SongMap _song;
        static readonly Dictionary<string, R> _open = new Dictionary<string, R>(); static List<R> _done; static double _gap;
        static readonly Stopwatch _clock = Stopwatch.StartNew(); static long _msEval, _msNear, _msCheck; static bool _jointsOnly;
        static float _tan; static string _shotName; static int _shot; static double _t;

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
                    b.Add("foot" + n, () => { var tp = toeAt(); return (ft.position + Vector3.down * Mathf.Max(0, fh - .04f * s), tp + (tp - ft.position).normalized * .04f * s); }, .035f * s);
                    feet.Add(new Foot { name = "foot" + n, heel = () => ft.position, toe = toeAt, heelH = fh, toeH = .03f * s });
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
                            open = new Span { item = a, host = (dot > 0 ? to.Substring(0, dot) : to).Split('#')[0], bone = dot > 0 ? to.Substring(dot + 1) : null, from = o.start, to = double.MaxValue };
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
            d.time = t; d.Evaluate();
            if (_brain)
            {
                var keep = _brain.UpdateMethod;
                _brain.UpdateMethod = CinemachineBrain.UpdateMethods.ManualUpdate;
                _brain.ManualUpdate(); _brain.ManualUpdate();
                _brain.UpdateMethod = keep;
            }
        }

        static int ShotAt(double t)
        {
            int lo = 0, hi = _shots.Count - 1, best = 0;
            while (lo <= hi) { int m = (lo + hi) / 2; if (_shots[m].start <= t + 1e-6) { best = m; lo = m + 1; } else hi = m - 1; }
            return best;
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

        static void Report(string check, Body b, string a, string x, float val, Vector3 p0, Vector3 p1, float span, string how = null, float lim = -1)
        {
            if (!Vis(p0, p1, span, out var size, out var dist)) return;
            string key = check + "|" + b.name + "|" + a + "|" + x + "|" + _shot;
            float sev = Mathf.Clamp(lim >= 0 ? 1 + (val - lim) / Limit[check] : val / Limit[check], 1, 8);
            if (_open.TryGetValue(key, out var r) && _t - r.to <= _gap)
            {
                r.to = _t; r.n++;
                if (sev * size > r.sev * r.size) { r.peak = _t; r.dist = dist; }
                r.val = Mathf.Max(r.val, val); r.size = Mathf.Max(r.size, size); r.sev = Mathf.Max(r.sev, sev);
                return;
            }
            r = new R { check = check, actor = b.name, a = a, b = x, shot = _shotName, how = how, from = _t, to = _t, peak = _t, val = val, size = size, dist = dist, sev = sev, n = 1 };
            _open[key] = r; _done.Add(r);
        }

        // ---- checks ----

        static readonly HashSet<MVActor> _ignore = new HashSet<MVActor>(), _bodyActors = new HashSet<MVActor>();

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
            if (sample || seed) Eval(_t);
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
                if (b.onCam)
                {
                    bool att = Attached(b), design = Stretching(b);
                    if (!design) Joints(b);
                    if (_jointsOnly) { Remember(b); continue; }
                    Ignored(b);
                    Ground(b, att, sample && !design);
                    if (sample && !design) { Props(b); Self(b); Bodies(b); Hands(b); }
                    if (b.lastOk && b.lastShot == _shot && !steps && !design) Kinematics(b, att);
                }
                Remember(b);
            }
            _msCheck += _clock.ElapsedMilliseconds - t0;
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
            var clock = Stopwatch.StartNew(); _msEval = _msNear = _msCheck = 0; _jointsOnly = (string)m["checks"] == "joint";
            _open.Clear(); _done = new List<R>(); _near.Clear(); _gap = Math.Max(.2, every * 2.5);
            _brain = Camera.main ? Camera.main.GetComponent<CinemachineBrain>() : null;
            d.time = from; d.Evaluate();
            Build((string)m["on"]);
            MakeHolder();
            int stride = Math.Max(1, (int)Math.Round(every * Fps)), n0 = (int)Math.Ceiling(from * Fps - 1e-6), n1 = (int)Math.Floor(to * Fps + 1e-6), frame = n0, count = 0;
            double next = -1;
            try
            {
                if (n0 > 0) Step(n0 - 1, false, true);
                for (; frame <= n1; frame++)
                {
                    Step(frame, frame == n0 || frame % stride == 0 || ShotAt(frame * Dt) != ShotAt((frame - 1) * Dt), false); count++;
                    if (clock.Elapsed.TotalSeconds > budget && frame < n1) { next = (frame + 1) * Dt; break; }
                }
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(_holder); _holder = null;
                foreach (var p in _props) { p.go = null; p.col = null; }
                Transport.Seek(keep);
            }
            bool changed = SceneManager.GetActiveScene().isDirty != dirty;
            var info = new JObject
            {
                ["from"] = from, ["to"] = next >= 0 ? next : to, ["every"] = every, ["frames"] = count, ["seconds"] = Math.Round(clock.Elapsed.TotalSeconds, 1),
                ["bodies"] = new JArray(_bodies.Select(b => (object)(b.name + " s=" + b.s.ToString("0.00") + (b.feet.Length > 0 ? " sole " + b.feet[0].heelH.ToString("0.000") : "")))),
                ["skippedMeshes"] = new JArray(_skippedMesh.Keys.Select(x => (object)x.name)),
                ["sceneDirtied"] = changed, ["ms"] = $"evaluate {_msEval} near {_msNear} checks {_msCheck}",
            };
            var dir = Path.Combine(Bridge.Root, "captures");
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

        static bool Enough(R r) => !(r.check == "footslide" || r.check == "bodyslide" || r.check == "float") || r.n >= 2;

        class Problem { public string check, actor, shot, what, how; public double from, to, peak; public float val, size, dist, score, seconds; public HashSet<string> parts = new HashSet<string>(); }

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
                string thing = r.check == "prop" || r.check == "hand" || r.check == "bodies" ? r.b : r.check == "joint" || r.check == "overreach" ? r.a + " " + r.b : r.check == "self" ? "own body" : "";
                string key = r.shot + "|" + r.actor + "|" + r.check + "|" + thing;
                if (!groups.TryGetValue(key, out var g)) groups[key] = g = new Problem { check = r.check, actor = r.actor, shot = r.shot, what = thing, from = r.from, to = r.to, how = r.how };
                g.from = Math.Min(g.from, r.from); g.to = Math.Max(g.to, r.to); g.parts.Add(r.check == "self" ? r.a + "/" + r.b : r.a);
                float sc = Score(r);
                if (sc > g.score) { g.score = sc; g.peak = r.peak; g.dist = r.dist; }
                g.val = Mathf.Max(g.val, r.val); g.size = Mathf.Max(g.size, r.size); g.seconds += (float)(r.to - r.from) + (float)Dt;
            }
            var ranked = groups.Values.OrderByDescending(g => g.score).ToList();

            var dir = Path.Combine(Bridge.Root, "captures");
            var json = new JObject
            {
                ["method"] = "Bodies: capsules between bones (radii scaled to the rig). Props: temporary non-convex MeshCollider on each mesh, Physics.ComputePenetration against the surface, plus 6-axis rays for a part wholly inside a closed mesh. Skinned meshes that are not checked bodies: box at 70% of bounds (how=bounds). Visibility: frustum only, no occlusion.",
                ["runs"] = new JArray(infos),
                ["counts"] = JObject.FromObject(joined.GroupBy(x => x.check).ToDictionary(g => g.Key, g => g.Count())),
                ["problems"] = JArray.FromObject(ranked.Select(g => new { g.check, g.actor, g.shot, g.what, parts = g.parts.ToArray(), g.how, from = Math.Round(g.from, 3), to = Math.Round(g.to, 3), peak = Math.Round(g.peak, 3), label = _song.Label(g.peak), value = Math.Round(Show(g.check, g.val), 2), unit = Unit[g.check], size = Math.Round(g.size, 3), dist = Math.Round(g.dist, 2), score = Math.Round(g.score, 2) })),
                ["ranges"] = JArray.FromObject(joined),
            };
            File.WriteAllText(Path.Combine(dir, "motioncheck.json"), json.ToString());

            var md = new StringBuilder();
            md.AppendLine("# Motion check").AppendLine();
            md.AppendLine($"Written by `mv motioncheck`, {DateTime.Now:yyyy-MM-dd HH:mm}. {infos.Sum(i => (int)i["frames"])} frames at 30 fps, {infos.Min(i => (double)i["from"]):0.0} to {infos.Max(i => (double)i["to"]):0.0} s. Only what the shot's camera frustum holds counts; closer and larger rank first.").AppendLine();
            md.AppendLine("Totals, as time ranges: " + string.Join(", ", joined.GroupBy(x => x.check).OrderByDescending(g => g.Count()).Select(g => $"{g.Key} {g.Count()}")) + ".").AppendLine();
            md.AppendLine($"Method: {json["method"]}").AppendLine();
            md.AppendLine("| # | time | bar | shot | who | check | parts | against | worst | on screen | cam m | score |");
            md.AppendLine("|---|---|---|---|---|---|---|---|---|---|---|---|");
            int rank = 0;
            foreach (var g in ranked.Take(60))
            {
                rank++;
                var parts = string.Join(", ", g.parts.Take(4)) + (g.parts.Count > 4 ? $" +{g.parts.Count - 4}" : "");
                md.AppendLine($"| {rank} | {Clock(g.from)}-{Clock(g.to)} | {_song.Label(g.peak)} | {g.shot} | {g.actor} | {g.check}{(g.how != null && g.how != "surface" ? " (" + g.how + ")" : "")} | {parts} | {g.what} | {Show(g.check, g.val):0.#} {Unit[g.check]} | {g.size * 100:0}% | {g.dist:0.0} | {g.score:0.0} |");
            }
            File.WriteAllText(Path.Combine(dir, "motioncheck-report.md"), md.ToString());
            return new JObject { ["json"] = Path.Combine(dir, "motioncheck.json"), ["report"] = Path.Combine(dir, "motioncheck-report.md"), ["ranges"] = joined.Count, ["problems"] = ranked.Count, ["counts"] = json["counts"] };
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
