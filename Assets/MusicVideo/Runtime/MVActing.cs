using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Character acting. The fold collects what is on at time t, then the body is built from nothing each frame: clips
    /// (crossfaded by sampling both and blending bones), pose overrides, gaze, reaches, foot plants, fingers, face.
    /// Nothing is read from the previous frame.
    /// </summary>
    public partial class MotionDriver
    {
        MVActor _actor; bool _busy, _noPlant, _plantsDone; double _stamp = double.NaN, _t, _tw;
        public void Bind(MVActor a) { _actor = a; a.Driver = this; _stamp = double.NaN; }
        /// <summary>Puts this actor at song time t, whatever order the tracks run in.</summary>
        public void Eval(double t) { if (_actor == null) return; if (History > 0) Dirty.Add(this); Apply(t, _actor); }

        struct Layer { public AnimationClip clip; public double time; public float w, tl; public Tree tree; }
        class Tween { public Op from, to; public float k, w; }
        readonly List<Layer> _layers = new List<Layer>();
        readonly Dictionary<Transform, Vector3> _pose = new Dictionary<Transform, Vector3>();
        readonly Dictionary<Transform, Vector3> _poseLocal = new Dictionary<Transform, Vector3>();
        readonly List<Transform> _order = new List<Transform>();
        readonly Dictionary<string, Tween> _reach = new Dictionary<string, Tween>();
        readonly Dictionary<string, Tween> _plant = new Dictionary<string, Tween>();
        Tween _gaze;
        readonly float[] _curl = new float[10]; bool _anyCurl;
        readonly Dictionary<string, float> _face = new Dictionary<string, float>();

        void BeginBody()
        {
            _layers.Clear(); _pose.Clear(); _poseLocal.Clear(); _reach.Clear(); _plant.Clear(); _gaze = null; _face.Clear(); _anyCurl = false;
            Array.Clear(_curl, 0, 10);
            BeginExtras();
            BeginPerform();
        }

        static float Clamp01(double v) => v < 0 ? 0 : v > 1 ? 1 : (float)v;

        // ---- clips ----

        void AddLayer(MVActor actor, Op op, double tl, int i)
        {
            if (op.a.Obj.ContainsKey("T")) { AddTree(actor, op, tl); return; }
            var clip = ClipOf(actor, op); if (clip == null) return;
            double len = clip.length, local;
            float cycle = op.a.F("beats"), speed = op.a.F("speed", 1);
            bool once = op.a.F("once") > 0;
            if (cycle > 0) local = (Song.BeatAt(op.start + tl) - Song.BeatAt(op.start)) / cycle * len;
            else local = tl * speed;
            local += op.a.F("offset") * len + op.a.F("start");
            if (once) local = Math.Min(local, op.a.Has("stop") ? op.a.F("stop") : len);
            else if (len > 0) local %= len;
            if (local < 0) local += len;
            float blend = op.a.F("blend", .2f), w = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1;
            float ret = op.a.F("return");
            if (ret > 0 && tl > op.WDur) w *= 1 - Ease.Apply("inout", (float)((tl - op.WDur) / ret));
            if (w <= 0) return;
            _layers.Add(new Layer { clip = clip, time = local, w = w });
        }

        void AddWalkLayer(MVActor actor, Op op, double tl, Vector3 from, Vector3 now)
        {
            var clip = ClipOf(actor, op); if (clip == null) return;
            float stride = op.a.F("stride", clip.averageSpeed.magnitude > .05f ? clip.averageSpeed.magnitude * clip.length : 1.4f);
            double local = (now - from).magnitude / Math.Max(stride, .01f) * clip.length;
            local = (local + op.a.F("offset") * clip.length) % Math.Max(clip.length, .001f);
            float blend = op.a.F("blend", .2f), w = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1;
            if (w > 0) _layers.Add(new Layer { clip = clip, time = local, w = w });
        }

        static AnimationClip ClipOf(MVActor actor, Op op) => op.refs != null && op.refs.Length > 0 ? op.refs[0] as AnimationClip : actor.FindClip(op.a.S("clip", ""));

        Transform[] _rig; Vector3[] _p; Quaternion[] _r;

        void SampleLayers(GameObject go)
        {
            int n = _layers.Count; if (n == 0) return;
            int first = 0;
            for (int i = n - 1; i >= 0; i--) if (_layers[i].w >= 1) { first = i; break; }
            SampleOne(_layers[first], go);
            if (first == n - 1) return;
            if (_rig == null)
            {
                BuildRig(go);
            }
            for (int i = first + 1; i < n; i++)
            {
                for (int b = 0; b < _rig.Length; b++) _rig[b].GetLocalPositionAndRotation(out _p[b], out _r[b]);
                SampleOne(_layers[i], go);
                float w = _layers[i].w;
                for (int b = 0; b < _rig.Length; b++)
                {
                    _rig[b].GetLocalPositionAndRotation(out var cp, out var cr);
                    _rig[b].SetLocalPositionAndRotation(Vector3.LerpUnclamped(_p[b], cp, w), Quaternion.Slerp(_r[b], cr, w));
                }
            }
        }

        // ---- what the score says about the body at this moment ----

        Tween Merge(Tween cur, Op op, float k)
        {
            float target = op.a.F("weight", 1);
            return new Tween { from = cur?.to, to = target > 0 || cur == null ? op : cur.to, k = target > 0 ? k : 1, w = Mathf.Lerp(cur?.w ?? 0, target, k) };
        }

        void PoseOne(MVActor actor, string name, Vector3 rot, float k, bool local)
        {
            var b = actor.Bone(name); if (!b) return;
            var set = local ? _poseLocal : _pose;
            set.TryGetValue(b, out var cur);
            set[b] = Vector3.LerpUnclamped(cur, rot, k);
        }

        static string Side(string s) { s = (s ?? "right").ToLowerInvariant(); return s.StartsWith("l") ? "left" : "right"; }
        static readonly string[] Reserved = { "ease", "each", "fade", "stagger", "jitter", "every", "blend" };
        static readonly string[][] FingerNames = { new[] { "thumb" }, new[] { "index" }, new[] { "middle" }, new[] { "ring" }, new[] { "pinky", "little" } };

        void Body(MVActor actor, Op op, double tl)
        {
            var a = op.a; float raw = (float)(tl / op.WDur), k = Ease.Apply(a.S("ease"), raw);
            switch (op.kind)
            {
                case "pose":
                    {
                        bool local = a.S("space") == "local", weighted = Weighted(a);
                        float KOf(string bone) => weighted ? PoseK(op, tl, StepOf(actor, actor.Bone(bone))) : k;
                        if (a.Has("bone")) PoseOne(actor, a.S("bone"), a.V("rot"), KOf(a.S("bone")), local);
                        if (a.Obj.TryGetValue("bones", out var bs))
                            foreach (var kv in bs)
                                if (kv.Value is Newtonsoft.Json.Linq.JArray r && r.Count == 3) PoseOne(actor, kv.Key, new Vector3((float)r[0], (float)r[1], (float)r[2]), KOf(kv.Key), local);
                        break;
                    }
                case "fingers":
                    {
                        int hand = Side(a.S("hand")) == "left" ? 0 : 5; float curl = a.F("curl", 1);
                        string f = a.S("finger");
                        for (int i = 0; i < 5; i++)
                        {
                            if (f != null && Array.IndexOf(FingerNames[i], f.ToLowerInvariant()) < 0) continue;
                            _curl[hand + i] = Mathf.Lerp(_curl[hand + i], curl, k);
                        }
                        _anyCurl = true; break;
                    }
                case "reach":
                    {
                        bool foot = a.Has("foot");
                        string key = (foot ? "foot" : "hand") + Side(a.S("hand") ?? a.S("foot"));
                        _reach.TryGetValue(key, out var cur); _reach[key] = Merge(cur, op, k); break;
                    }
                case "gaze": _gaze = Merge(_gaze, op, k); break;
                case "plant":
                    {
                        if (_noPlant) break;
                        bool hand = a.Has("hand");
                        var f = (hand ? a.S("hand") : a.S("foot", "both")).ToLowerInvariant();
                        foreach (var s in new[] { "left", "right" })
                            if (f == "both" || f[0] == s[0])
                            {
                                string key = (hand ? "hand" : "foot") + s;
                                _plant.TryGetValue(key, out var cur);
                                float blend = a.F("blend", .15f), w = a.F("weight", 1), kk = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1, rel = a.F("release");
                                float next = Mathf.Lerp(cur?.w ?? 0, w, kk);
                                if (rel > 0 && tl > op.WDur) next *= 1 - Ease.Apply("inout", (float)((tl - op.WDur) / rel));
                                _plant[key] = new Tween { to = w > 0 || cur == null ? op : cur.to, w = next };
                            }
                        break;
                    }
                case "face":
                    foreach (var kv in a.Num)
                    {
                        if (Array.IndexOf(Reserved, kv.Key) >= 0) continue;
                        _face.TryGetValue(kv.Key, out var cur); _face[kv.Key] = Mathf.LerpUnclamped(cur, kv.Value, k);
                    }
                    break;
                case "shape":
                    { var key = a.S("key", ""); _face.TryGetValue(key, out var cur); _face[key] = Mathf.LerpUnclamped(cur, a.F("to", 1), k); break; }
                case "blink":
                    if (tl <= op.WDur) { float b = Mathf.Sin(Mathf.Clamp01(raw) * Mathf.PI); _face.TryGetValue("blink", out var cur); _face["blink"] = Mathf.Max(cur, Mathf.Clamp01(b * 1.6f) * a.F("amount", 1)); }
                    break;
                default: BodyExtra(actor, op, tl, raw, k); break;
            }
        }

        void EndBody(MVActor actor)
        {
            var go = actor.animRoot != null ? actor.animRoot : actor.gameObject;
            SampleLayers(go);
            if (_layerOps.Count > 0) ApplyLayers(actor, go);
            foreach (var (op, tl, ks) in _keyOps) ApplyKeys(actor, op, tl, ks);
            if (_pose.Count + _poseLocal.Count > 0) ApplyPose(go);
            if (actor.human.Length > 0 && _gaze != null && _gaze.w > .001f) ApplyGaze(actor);
            if (_lite) { RecordTips(); return; }
            ApplyOverlap(actor);
            if (actor.human.Length > 0)
            {
                if (_plant.Count > 0) ContactBody(actor);
                if (_reach.Count > 0) ReachLean(actor);
                foreach (var kv in _reach) if (kv.Value.w > .001f) ApplyReach(actor, kv.Key, kv.Value);
                foreach (var kv in _plant) if (kv.Value.w > .001f) ApplyPlant(actor, kv.Key, kv.Value);
                ApplyFingers(actor);
                ApplyLimits(actor);
            }
            ApplyFace(actor);
            EndExtras(actor);
        }

        void ApplyPose(GameObject go)
        {
            _order.Clear(); _order.AddRange(_pose.Keys);
            foreach (var b in _poseLocal.Keys) if (!_order.Contains(b)) _order.Add(b);
            _order.Sort((x, y) => Depth(x).CompareTo(Depth(y)));
            var root = go.transform.rotation;
            foreach (var b in _order)
            {
                if (_pose.TryGetValue(b, out var e)) b.rotation = root * Quaternion.Euler(e) * Quaternion.Inverse(root) * b.rotation;
                if (_poseLocal.TryGetValue(b, out var l)) b.localRotation *= Quaternion.Euler(l);
            }
        }

        readonly Dictionary<Transform, int> _depth = new Dictionary<Transform, int>();
        int Depth(Transform t)
        {
            if (_depth.TryGetValue(t, out var d)) return d;
            for (var p = t; p != null; p = p.parent) d++;
            return _depth[t] = d;
        }

        Vector3 TargetPos(Op op, MVActor self, Vector3 fallback)
        {
            if (op == null) return fallback;
            var a = op.a;
            if (a.Vec.TryGetValue("to", out var v)) return v;
            var spec = a.S("to"); if (spec == null) return fallback;
            var tr = MVActor.Point(spec, _t, !spec.StartsWith(self.name + "."));
            return tr ? tr.position + tr.rotation * a.V("offset") : fallback;
        }

        static Vector3 Forward(MVActor actor, HumanBodyBones b) => actor.human[(int)b].rotation * Quaternion.Inverse(actor.humanRest[(int)b]) * Vector3.forward;

        // Chest, neck and head share the turn; eye bones lead if the model has them.
        void ApplyGaze(MVActor actor)
        {
            var head = actor.human[(int)HumanBodyBones.Head]; if (!head) return;
            var fb = head.position + Forward(actor, HumanBodyBones.Head);
            var tgt = Vector3.Lerp(TargetPos(_gaze.from, actor, fb), TargetPos(_gaze.to, actor, fb), _gaze.k);
            float max = _gaze.to.a.F("limit", 80);
            for (int i = 0; i < 3; i++)
            {
                var bone = i == 0 ? HumanBodyBones.Chest : i == 1 ? HumanBodyBones.Neck : HumanBodyBones.Head;
                float share = i == 0 ? .2f : i == 1 ? .4f : 1f;
                var b = actor.human[(int)bone]; if (!b) continue;
                var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, HumanBodyBones.Head), (tgt - head.position).normalized), max);
                b.rotation = Quaternion.Slerp(Quaternion.identity, rot, share * _gaze.w) * b.rotation;
            }
            foreach (var eb in new[] { HumanBodyBones.LeftEye, HumanBodyBones.RightEye })
            {
                var e = actor.human[(int)eb]; if (!e) continue;
                var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, eb), (tgt - e.position).normalized), 28);
                e.rotation = Quaternion.Slerp(Quaternion.identity, rot, _gaze.w) * e.rotation;
            }
        }

        static void Limb(string key, out HumanBodyBones up, out HumanBodyBones mid, out HumanBodyBones end)
        {
            bool left = key.EndsWith("left");
            if (key.StartsWith("foot")) { up = left ? HumanBodyBones.LeftUpperLeg : HumanBodyBones.RightUpperLeg; mid = left ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg; end = left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot; }
            else { up = left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm; mid = left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm; end = left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand; }
        }

        /// <summary>Two-bone IK. The elbow or knee stays on the side of its current bend unless a hint is given.</summary>
        static void TwoBone(Transform u, Transform l, Transform h, Vector3 target, Vector3? hint, Vector3 bias = default)
        {
            Vector3 U = u.position, L = l.position, H = h.position;
            float a = (L - U).magnitude, b = (H - L).magnitude, c = Mathf.Clamp((target - U).magnitude, Mathf.Abs(a - b) + .001f, a + b - .001f);
            var d = (target - U).normalized;
            float x = (a * a - b * b + c * c) / (2 * c), y = Mathf.Sqrt(Mathf.Max(0, a * a - x * x));
            var pole = (hint ?? L + (L - (U + H) * .5f) * .5f + bias) - U;
            var perp = pole - d * Vector3.Dot(pole, d);
            if (perp.sqrMagnitude < 1e-6f) perp = Vector3.Cross(d, Vector3.right);
            perp.Normalize();
            var E = U + d * x + perp * y;
            u.rotation = Quaternion.FromToRotation(L - U, E - U) * u.rotation;
            var goal = U + d * c;
            l.rotation = Quaternion.FromToRotation(h.position - l.position, goal - l.position) * l.rotation;
        }

        void ApplyReach(MVActor actor, string key, Tween tw)
        {
            Limb(key, out var up, out var mid, out var end);
            Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) return;
            var keep = h.rotation;
            var goal = Vector3.Lerp(TargetPos(tw.from, actor, h.position), TargetPos(tw.to, actor, h.position), tw.k);
            Vector3? hint = tw.to.a.Vec.TryGetValue("hint", out var hv) ? hv : (Vector3?)null;
            TwoBone(u, l, h, Vector3.Lerp(h.position, goal, tw.w), hint, Bias(actor, key));
            if (tw.to.a.Vec.TryGetValue("handRot", out var hr)) h.rotation = Quaternion.Slerp(keep, (tw.to.a.F("worldRot") > 0 ? Quaternion.identity : actor.transform.rotation) * Quaternion.Euler(hr) * actor.humanRest[(int)end], tw.w);
            else if (tw.to.a.F("freeWrist", 1) <= 0) h.rotation = keep;   // freeWrist: the hand follows the forearm
        }

        void ApplyPlant(MVActor actor, string side, Tween tw)
        {
            Limb(side, out var up, out var mid, out var end);
            Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) return;
            var keep = h.rotation;
            if (!ContactGoal(actor, side, tw.to, h, out var goal, out var rot, out var hasRot)) return;
            Vector3? hint = tw.to.a.Vec.TryGetValue("hint", out var hv) ? hv : (Vector3?)null;
            TwoBone(u, l, h, Vector3.Lerp(h.position, goal, tw.w), hint, Bias(actor, side));
            if (hasRot) h.rotation = Quaternion.Slerp(keep, rot, tw.w); else if (tw.to.a.F("freeWrist", 1) <= 0) h.rotation = keep;   // freeWrist: the hand follows the forearm
        }

        /// <summary>Where each foot was when each plant began. Found once by posing the body at that moment, so it never depends on play order.</summary>
        void FindPlants(MVActor actor)
        {
            _plantsDone = true;
            if (actor.human.Length == 0) return;
            foreach (var op in Ops)
            {
                if (op.kind != "plant" || op.a.Has("pos") || op.a.Vec.ContainsKey("to")) continue;
                _noPlant = true; _stamp = op.start; History++;
                try
                {
                    Run(op.start, actor);
                    foreach (var key in new[] { "footleft", "footright", "handleft", "handright" }) RecordContact(actor, op, key);
                }
                finally { _noPlant = false; History--; }
            }
        }

        static readonly float[] RestCurl = { .3f, .2f, .26f, .32f, .38f };

        void ApplyFingers(MVActor actor)
        {
            if (actor.curlAxis.Length == 0) return;
            for (int f = 0; f < 10; f++)
            {
                float rest = RestCurl[f % 5], curl = _curl[f] < 0 ? rest * (1 + _curl[f]) : Mathf.Max(_curl[f], rest); // a hand is never flat: relaxed fingers curl more toward the little finger. Negative curl opens past rest: -1 is straight, below that bent back.
                bool thumb = f % 5 == 0;
                int first = (int)HumanBodyBones.LeftThumbProximal + (f < 5 ? 0 : 15) + (f % 5) * 3;
                for (int j = 0; j < 3; j++)
                {
                    var b = actor.human[first + j]; if (!b) continue;
                    float ang = (thumb ? (j == 0 ? 15f : j == 1 ? 35f : 40f) : (j == 0 ? 60f : j == 1 ? 95f : 60f)) * curl;
                    b.localRotation *= Quaternion.AngleAxis(ang, actor.curlAxis[first + j]);
                }
            }
        }

        // ---- face ----

        SkinnedMeshRenderer[] _skins;
        readonly Dictionary<string, List<(SkinnedMeshRenderer r, int i)>> _keys = new Dictionary<string, List<(SkinnedMeshRenderer, int)>>();
        readonly HashSet<string> _touched = new HashSet<string>(); readonly List<string> _scratch = new List<string>();

        List<(SkinnedMeshRenderer r, int i)> Keys(MVActor actor, string name)
        {
            if (_keys.TryGetValue(name, out var l)) return l;
            l = new List<(SkinnedMeshRenderer, int)>();
            if (_skins == null) _skins = actor.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            foreach (var s in _skins)
            {
                var m = s.sharedMesh; if (!m) continue;
                for (int i = 0; i < m.blendShapeCount; i++)
                    if (m.GetBlendShapeName(i).EndsWith(name, StringComparison.OrdinalIgnoreCase)) l.Add((s, i));
            }
            return _keys[name] = l;
        }

        void ApplyFace(MVActor actor)
        {
            if (_face.Count == 0 && _touched.Count == 0) return;
            var eye = actor.GetComponent<MVEyeRig>();
            _scratch.Clear(); _scratch.AddRange(_touched);
            foreach (var k in _scratch)
                if (!_face.ContainsKey(k)) foreach (var (r, i) in Keys(actor, k)) if (r) r.SetBlendShapeWeight(i, 0);
            _touched.Clear();
            foreach (var kv in _face)
            {
                _touched.Add(kv.Key);
                foreach (var (r, i) in Keys(actor, kv.Key)) if (r) r.SetBlendShapeWeight(i, kv.Value * 100);
                if (eye) eye.Set(kv.Key, kv.Value);
            }
        }

        double EchoDelay(double t)
        {
            float d = 0; bool any = false;
            foreach (var op in Ops)
            {
                if (t < op.start) break;
                if (op.kind != "delay") continue;
                any = true;
                d = Mathf.LerpUnclamped(d, op.a.F("delay"), Ease.Apply(op.a.S("ease"), (float)((t - op.start) / op.Dur)));
            }
            return any ? d : 0;
        }

        // ---- props and attachment ----

        /// <summary>0 to 1 under gravity, hitting at `hit`, then bouncing on the way to rest.</summary>
        static float Fall(float x, float hit, float rest)
        {
            if (x <= 0) return 0;
            if (x <= hit) { float q = x / hit; return q * q; }
            float u = x - hit, h = rest * rest;
            for (int i = 0; i < 7 && h > .0004f; i++)
            {
                float d = 2 * hit * Mathf.Sqrt(h);
                if (u < d) { float q = u / d; return 1 - h * 4 * q * (1 - q); }
                u -= d; h *= rest * rest;
            }
            return 1;
        }

        readonly Dictionary<int, int> _hitCount = new Dictionary<int, int>();
        readonly Dictionary<int, (Vector3 p, Quaternion q)> _detached = new Dictionary<int, (Vector3, Quaternion)>();

        void Prop(ref Pose p, Op op, double tl, float raw, float k, bool inside, float w, int i, MVActor actor)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "fov": p.fov = Mathf.LerpUnclamped(p.fov > 0 ? p.fov : actor.fov, a.F("to", 40), k); break;
                case "walk":
                    {
                        var to = a.Vec.TryGetValue("to", out var v) ? v : p.pos;
                        if (a.F("rel") > 0) to += p.pos;
                        var from = p.pos; p.pos = Vector3.Lerp(from, to, Ease.Apply(a.S("ease", "inout"), raw));
                        var d = to - from; d.y = 0;
                        if (a.F("face", 1) > 0 && d.sqrMagnitude > 1e-4f)
                            p.euler.y = Mathf.LerpAngle(p.euler.y, Mathf.Atan2(d.x, d.z) * Mathf.Rad2Deg, Clamp01(tl / Math.Max(a.F("turn", .25f), .001f)));
                        break;
                    }
                case "topple":
                    {
                        float e = a.Has("ease") ? k : Fall(raw, a.F("land", .6f), a.F("bounce", .3f));
                        var q = Quaternion.AngleAxis(a.F("angle", 90) * e, a.V("axis", Vector3.right));
                        var piv = a.F("world") > 0 ? a.V("pivot") : p.pos + a.V("pivot");
                        p.pos = piv + q * (p.pos - piv);
                        p.q = q * p.q; break;
                    }
                case "drop":
                    {
                        float g = a.F("gravity", 9.8f), floor = a.F("floor"), height = a.Has("height") ? a.F("height") : p.pos.y - floor;
                        float hit = Mathf.Sqrt(2 * Mathf.Max(height, .001f) / g);
                        p.pos.y = floor + height * (1 - Fall((float)tl, hit, a.F("bounce", .3f)));
                        if (a.Has("tumble")) p.euler += a.V("tumble") * Mathf.Min((float)tl / hit, 1);
                        break;
                    }
                case "slide":
                    {
                        var hits = Song.Hits(a.S("hits", "kick")); double now = _t;
                        if (!_hitCount.TryGetValue(op.index, out int total))
                        {
                            total = 0; if (hits != null) foreach (var h in hits) if (h >= op.start && h < op.end) total++;
                            _hitCount[op.index] = total;
                        }
                        Vector3 by = a.Vec.TryGetValue("to", out var to) ? (a.F("rel") > 0 ? to : to - p.pos) : a.V("dir", Vector3.forward) * (a.F("step", .08f) * Mathf.Max(total, 1));
                        float jerk = a.F("jerk", .13f), done = 0, yaw = 0, sum = 0; int n = 0;
                        if (total == 0) done = k;
                        else
                        {
                            for (int j = 0; j < total; j++) sum += .7f + .6f * Hash(j * 3 + op.index);
                            foreach (var h in hits)
                            {
                                if (h < op.start) continue; if (h >= op.end || h > now) break;
                                float e = Ease.Apply("back", (float)((now - h) / jerk));
                                done += (.7f + .6f * Hash(n * 3 + op.index)) / sum * e; yaw += (Hash(n * 7 + op.index) - .5f) * a.F("yaw") * e; n++;
                            }
                        }
                        p.pos += by * done; p.euler.y += yaw; break;
                    }
                case "tremble":
                    if (inside)
                    {
                        float env = (a.Has("band") ? Song.Env(a.S("band"), _t) : 1) * w, T = (float)tl * a.F("speed", 38), amp = a.F("amount", .01f) * env;
                        p.addPos += new Vector3(Mathf.PerlinNoise(T, i + 1.3f) - .5f, Mathf.PerlinNoise(i + 2.7f, T) - .5f, Mathf.PerlinNoise(T + 5, T * .7f + i) - .5f) * (amp * 2);
                        p.addEuler += new Vector3(Mathf.PerlinNoise(T * 1.1f, i + 7) - .5f, Mathf.PerlinNoise(i + 9, T * .9f) - .5f, Mathf.PerlinNoise(T * .8f + 3, i) - .5f) * (amp * a.F("turn", 60) * 2);
                    }
                    break;
                case "wobble":
                    {
                        float d = Mathf.Exp(-(float)tl * a.F("decay", 3.5f));
                        if (d > .002f) p.addEuler += a.V("axis", Vector3.forward) * (Mathf.Sin((float)tl * a.F("speed", 12)) * a.F("amount", 6) * d);
                        break;
                    }
                case "attach":
                    {
                        if (!AttachPose(actor, _t, a, out var wp, out var wq, out float s)) break;
                        float b = a.F("blend"), e = b > 0 ? Ease.Apply("inout", (float)(tl / b)) : 1;
                        p.pos = Vector3.Lerp(p.pos, wp, e); p.q = Quaternion.Slerp(p.q * Quaternion.Euler(p.euler), wq, e); p.euler = Vector3.zero;
                        if (a.F("scaled") > 0) p.scaleMul *= s;
                        break;
                    }
                case "detach":
                    {
                        if (!_detached.TryGetValue(op.index, out var pose))
                        {
                            Op last = null;
                            foreach (var o in Ops) { if (o.start >= op.start) break; if (o.kind == "attach") last = o; else if (o.kind == "detach") last = null; }
                            if (last == null) break;
                            if (AttachPose(actor, op.start, last.a, out var wp, out var wq, out _)) pose = (wp, wq);
                            MVActor.Point(last.a.S("to"), _t); // and back to now
                            _detached[op.index] = pose;
                        }
                        p.pos = pose.p; p.q = pose.q; p.euler = Vector3.zero; break;
                    }
            }
        }

        bool AttachPose(MVActor actor, double t, Args a, out Vector3 pos, out Quaternion rot, out float scale)
        {
            pos = default; rot = Quaternion.identity; scale = 1;
            var tr = MVActor.Point(a.S("to"), t, true, out var host); if (!tr) return false;
            scale = host ? host.transform.lossyScale.x : 1;
            pos = tr.position + tr.rotation * (a.V("pos") * scale); rot = tr.rotation * Quaternion.Euler(a.V("rot"));
            var par = actor.transform.parent;
            if (par) { pos = par.InverseTransformPoint(pos); rot = Quaternion.Inverse(par.rotation) * rot; }
            return true;
        }
    }
}
