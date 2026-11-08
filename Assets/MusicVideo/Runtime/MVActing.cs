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

        /// <summary>A native actor: Unity's Animator plays its clips from Timeline, so nothing here writes its bones.</summary>
        bool Native => _actor != null && _actor.native;
        static bool BoneCue(string k) => k == "pose" || k == "stance" || k == "plant";   // what a native actor ignores; reach, gaze, eyes and fingers run after the Animator

        struct Layer { public AnimationClip clip; public double time; public float w, tl; public Tree tree; }
        class Tween { public Op from, to; public float k, w, w2; }
        readonly List<Layer> _layers = new List<Layer>();
        readonly Dictionary<Transform, Vector3> _pose = new Dictionary<Transform, Vector3>();
        readonly Dictionary<Transform, Vector3> _poseLocal = new Dictionary<Transform, Vector3>();
        readonly List<Transform> _order = new List<Transform>();
        readonly Dictionary<string, Tween> _reach = new Dictionary<string, Tween>();
        readonly Dictionary<string, Tween> _plant = new Dictionary<string, Tween>();
        Tween _gaze;
        readonly float[] _curl = new float[10]; bool _anyCurl;
        readonly float[] _handSet = new float[10], _handW = new float[10];   // fingers "set": an absolute hand, measured from the rig's rest pose, so no clip can keep it shut
        readonly Dictionary<string, float> _face = new Dictionary<string, float>();

        void BeginBody()
        {
            _layers.Clear(); _pose.Clear(); _poseLocal.Clear(); _reach.Clear(); _plant.Clear(); _gaze = null; _face.Clear(); _anyCurl = false;
            Array.Clear(_curl, 0, 10); Array.Clear(_handSet, 0, 10); Array.Clear(_handW, 0, 10);
            _stArms = _stLegs = 0; _stShift = _stDrop = _stTilt = _stSway = _stNarrow = 0; _eyeYaw = _eyePitch = 0; _stPeriod = 5; _stBones.Clear();
            BeginExtras();
            BeginPerform();
        }

        static float Clamp01(double v) => v < 0 ? 0 : v > 1 ? 1 : (float)v;

        // ---- clips ----

        void AddLayer(MVActor actor, Op op, double tl, int i)
        {
            if (op.a.Obj.ContainsKey("T")) { AddTree(actor, op, tl); return; }
            var clip = ClipOf(actor, op); if (clip == null) return;
            double len = clip.length, local = ClipClock(clip, op, tl);
            bool once = op.a.F("once") > 0;
            if (!once && len > 0) local %= len;
            if (local < 0) local += len;
            float blend = op.a.F("blend", .2f), ret = op.a.F("return"), w;
            if (Inert(op))
            {
                if (ret > 0 && Past(tl, op.WDur)) return;
                w = 1;
            }
            else
            {
                w = blend > 0 ? Ease.Apply("inout", (float)(tl / blend)) : 1;
                if (ret > 0 && tl > op.WDur) w *= 1 - Ease.Apply("inout", (float)((tl - op.WDur) / ret));
            }
            if (w <= 0) return;
            _layers.Add(new Layer { clip = clip, time = local, w = w });
        }

        void AddWalkLayer(MVActor actor, Op op, double tl, Vector3 from, Vector3 now)
        {
            var clip = ClipOf(actor, op); if (clip == null) return;
            float stride = op.a.F("stride", clip.averageSpeed.magnitude > .05f ? clip.averageSpeed.magnitude * clip.length : 1.4f);
            double local = (now - from).magnitude / Math.Max(stride, .01f) * clip.length;
            local = (local + op.a.F("offset") * clip.length) % Math.Max(clip.length, .001f);
            float blend = op.a.F("blend", .2f), w = blend > 0 && !Inert(op) ? Ease.Apply("inout", (float)(tl / blend)) : 1;
            if (w > 0) _layers.Add(new Layer { clip = clip, time = local, w = w });
        }

        /// <summary>Walking pace: speeds up over the first share of the time, steady, slows over the last.</summary>
        static float SoftRange(float x, float i, float o)
        {
            i = Mathf.Clamp(i, .001f, .9f); o = Mathf.Clamp(o, .001f, .95f - i); x = Mathf.Clamp01(x);
            float v = 1 / (1 - i / 2 - o / 2);
            if (x < i) return v * x * x / (2 * i);
            if (x <= 1 - o) return v * (i / 2 + x - i);
            return 1 - v * (1 - x) * (1 - x) / (2 * o);
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
            float w = Mathf.LerpUnclamped(cur?.w ?? 0, target, k);
            return new Tween { from = cur?.to, to = target > 0 || cur == null ? op : cur.to, k = target > 0 ? k : 1, w = w, w2 = w };
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
                            if (a.Has("release")) _handW[hand + i] = Mathf.Lerp(_handW[hand + i], 0, k);
                            else if (a.Has("set"))
                            {
                                _handSet[hand + i] = _handW[hand + i] > 0 ? Mathf.Lerp(_handSet[hand + i], a.F("set"), k) : a.F("set");
                                _handW[hand + i] = Mathf.Lerp(_handW[hand + i], 1, k);
                            }
                            else _curl[hand + i] = Mathf.Lerp(_curl[hand + i], curl, k);
                        }
                        _anyCurl = true; break;
                    }
                case "reach":
                    {
                        bool foot = a.Has("foot");
                        string key = (foot ? "foot" : "hand") + Side(a.S("hand") ?? a.S("foot"));
                        _reach.TryGetValue(key, out var cur); _reach[key] = Merge(cur, op, k);
                        // The forearm trails the upper arm by a frame, so a hand move starts at the shoulder.
                        if (!foot) _reach[key].w2 = Mathf.LerpUnclamped(cur?.w2 ?? 0, a.F("weight", 1), Ease.Apply(a.S("ease"), (float)((tl - .036) / op.WDur)));
                        break;
                    }
                case "stance":
                    {
                        if (a.Has("arms")) _stArms = Mathf.Lerp(_stArms, a.F("arms"), k);
                        if (a.Has("legs")) _stLegs = Mathf.Lerp(_stLegs, a.F("legs"), k);
                        if (a.Has("shift")) _stShift = Mathf.Lerp(_stShift, a.F("shift"), _stLegs > 0 ? k : 1);
                        if (a.Has("drop")) _stDrop = Mathf.Lerp(_stDrop, a.F("drop"), _stLegs > 0 ? k : 1);
                        if (a.Has("tilt")) _stTilt = Mathf.Lerp(_stTilt, a.F("tilt"), _stLegs > 0 ? k : 1);
                        if (a.Has("sway")) _stSway = Mathf.Lerp(_stSway, a.F("sway"), _stLegs > 0 ? k : 1);
                        if (a.Has("narrow")) _stNarrow = Mathf.Lerp(_stNarrow, a.F("narrow"), _stLegs > 0 ? k : 1);
                        if (a.Has("period")) _stPeriod = a.F("period");
                        if (a.Obj.TryGetValue("bones", out var sb))
                            foreach (var kv in sb)
                                if (kv.Value is Newtonsoft.Json.Linq.JArray r && r.Count == 3)
                                {
                                    var b = actor.Bone(kv.Key); if (!b) continue;
                                    var v = new Vector3((float)r[0], (float)r[1], (float)r[2]);
                                    _stBones[b] = _stBones.TryGetValue(b, out var c) ? Vector3.LerpUnclamped(c, v, k) : v;
                                }
                        break;
                    }
                case "eyes": _eyeYaw = Mathf.Lerp(_eyeYaw, a.F("yaw"), k); _eyePitch = Mathf.Lerp(_eyePitch, a.F("pitch"), k); break;
                case "gaze": _gaze = Merge(_gaze, op, k); _gazeBk = a.F("bk") > 0; break;
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
            if (Native) { if (!_raw && !_lite) { if (actor.human.Length > 0) { if (MVLate.Deferring && !MVLate.Flushing) MVLate.Native(this, actor, _appliedT); else if (!MVLate.Flushing) NativeActing(actor); } ApplyFace(actor); EndExtras(actor); } return; }   // Unity's Animator wrote the bones; only reach, gaze, eyes and grips go on top (MVNativeActing.cs)
            SampleLayers(go);
            if (_layerOps.Count > 0) ApplyLayers(actor, go);
            foreach (var (op, tl, ks) in _keyOps) ApplyKeys(actor, op, tl, ks);
            if (_raw) return;
            GateBaked();
            if (!NoInertia) ApplyInertia();
            if (_stArms > .001f || _stLegs > .001f) ApplyStance(actor, go);
            if (_pose.Count + _poseLocal.Count > 0) ApplyPose(go);
            if (actor.human.Length > 0 && _gaze != null && _gaze.w > .001f) ApplyGaze(actor);
            if (actor.human.Length > 0 && (_eyeYaw != 0 || _eyePitch != 0)) ApplyEyes(actor);
            if (_lite) { RecordTips(); if (actor.human.Length > 0) RecordFeet(actor); return; }
            ApplyOverlap(actor);
            if (actor.human.Length > 0)
            {
                ApplyGround(actor);
                if (_plant.Count > 0) ContactBody(actor);
                if (_reach.Count > 0) ReachLean(actor);
                foreach (var kv in _reach) if (kv.Value.w > .001f) ApplyReach(actor, kv.Key, kv.Value);
                foreach (var kv in _plant) if (kv.Value.w > .001f) ApplyPlant(actor, kv.Key, kv.Value);
                if (!NoFingers) ApplyFingers(actor);
                ApplyLimits(actor); ReseatGround();
            }
            ApplyLimbScale(actor);   // impact-frame bone scale, only on drivers with a limbscale cue (MVLimbScale.cs)
            ApplyFace(actor);
            EndExtras(actor);
        }

        // ---- stance: how he carries himself, whatever clip plays ----
        // A cue that holds, like pose, but under every pose and performance, so a shot's own acting never replaces it.
        // arms 0-1 scales "bones" (degrees in his own frame, as pose). legs 0-1 scales the weight shift: the hips move "shift" metres
        // to the side (+x of the actor), sink by "drop", roll by "tilt" degrees with the spine taking it back, and sway by "sway" metres
        // over "period" seconds on the scene's own clock. The feet stay where the clip put them. A pure function of time.
        float _stArms, _stLegs, _stShift, _stDrop, _stTilt, _stSway, _stNarrow, _stPeriod = 5;
        readonly Dictionary<Transform, Vector3> _stBones = new Dictionary<Transform, Vector3>();

        void ApplyStance(MVActor actor, GameObject go)
        {
            if (actor.human.Length == 0) return;
            var root = go.transform.rotation;
            if (_stLegs > .001f)
            {
                Transform hips = actor.human[(int)HumanBodyBones.Hips], spine = actor.human[(int)HumanBodyBones.Spine], chest = actor.human[(int)HumanBodyBones.Chest];
                Transform lu = actor.human[(int)HumanBodyBones.LeftUpperLeg], ll = actor.human[(int)HumanBodyBones.LeftLowerLeg], lf = actor.human[(int)HumanBodyBones.LeftFoot];
                Transform ru = actor.human[(int)HumanBodyBones.RightUpperLeg], rl = actor.human[(int)HumanBodyBones.RightLowerLeg], rf = actor.human[(int)HumanBodyBones.RightFoot];
                if (hips && lu && ll && lf && ru && rl && rf)
                {
                    Vector3 lp = lf.position, rp = rf.position; Quaternion lr = lf.rotation, rr = rf.rotation;
                    double ph = _t * 2 * Math.PI / Mathf.Max(.5f, _stPeriod);
                    float wave = (float)(Math.Sin(ph) + .35 * Math.Sin(ph * 2.3 + 1)), sx = _stSway * wave, sz = _stSway * .5f * (float)Math.Sin(ph * .7 + 2);
                    hips.position += root * new Vector3((_stShift + sx) * _stLegs, -_stDrop * _stLegs, sz * _stLegs);
                    float roll = _stTilt * (1 + .25f * wave) * _stLegs;
                    hips.rotation = root * Quaternion.Euler(0, 0, roll) * Quaternion.Inverse(root) * hips.rotation;
                    if (spine) spine.rotation = root * Quaternion.Euler(0, 0, -roll * .6f) * Quaternion.Inverse(root) * spine.rotation;
                    if (chest) chest.rotation = root * Quaternion.Euler(0, 0, -roll * .6f) * Quaternion.Inverse(root) * chest.rotation;
                    var inward = root * Vector3.right * (_stNarrow * _stLegs); lp += inward; rp -= inward;   // "narrow": each foot this much nearer the middle than the clip has it
                    TwoBone(lu, ll, lf, lp, null, Bias(actor, "footleft")); lf.rotation = lr;
                    TwoBone(ru, rl, rf, rp, null, Bias(actor, "footright")); rf.rotation = rr;
                }
            }
            if (_stArms > .001f && _stBones.Count > 0)
            {
                _order.Clear(); _order.AddRange(_stBones.Keys);
                _order.Sort((x, y) => Depth(x).CompareTo(Depth(y)));
                foreach (var b in _order) b.rotation = root * Quaternion.Euler(_stBones[b] * _stArms) * Quaternion.Inverse(root) * b.rotation;
            }
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
            if (a.Vec.TryGetValue("toRel", out var rel)) return self.transform.TransformPoint(rel);   // in his frame: [0,6,3] is up and ahead, wherever he stands
            var spec = a.S("to"); if (spec == null) return fallback;
            var tr = MVActor.Point(spec, _t, !spec.StartsWith(self.name + "."));
            return tr ? tr.position + tr.rotation * a.V("offset") : fallback;
        }

        static Vector3 Forward(MVActor actor, HumanBodyBones b) => actor.human[(int)b].rotation * Quaternion.Inverse(actor.humanRest[(int)b]) * Vector3.forward;

        // Chest, neck and head share the turn; the eyes get there first. "head":0 moves the eyes alone, "lead" is how much faster they are.
        void ApplyGaze(MVActor actor)
        {
            var head = actor.human[(int)HumanBodyBones.Head]; if (!head) return;
            var fb = head.position + Forward(actor, HumanBodyBones.Head);
            Vector3 p0 = TargetPos(_gaze.from, actor, fb), p1 = TargetPos(_gaze.to, actor, fb);
            var tgt = Vector3.Lerp(p0, p1, _gaze.k);
            float max = _gaze.to.a.F("limit", 80), lead = _gaze.to.a.F("lead", 2.6f);
            float body = Mathf.Lerp(_gaze.from != null ? _gaze.from.a.F("head", 1) : _gaze.to.a.F("head", 1), _gaze.to.a.F("head", 1), _gaze.k);   // eyes-only after a head turn eases the head back
            // Over a baked take no joint limits follow, and the shares below add up to 1.6 of the turn. So a gentle nudge there: the shares add to 1, the eyes do the rest, and a target behind him fades out rather than flip sides.
            float gazeW = _gaze.w;
            if (_bk > 0)
            {
                max = Mathf.Lerp(max, 32, _bk);
                gazeW *= 1 - _bk * Rise(75, 125, Vector3.Angle(Forward(actor, HumanBodyBones.Head), tgt - head.position));
            }
            for (int i = 0; i < 3 && body > 0; i++)
            {
                var bone = i == 0 ? HumanBodyBones.Chest : i == 1 ? HumanBodyBones.Neck : HumanBodyBones.Head;
                float share = Mathf.Lerp(i == 0 ? .2f : i == 1 ? .4f : 1f, i == 0 ? .12f : i == 1 ? .25f : .63f, _bk);
                var b = actor.human[(int)bone]; if (!b) continue;
                var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, HumanBodyBones.Head), (tgt - head.position).normalized), max);
                b.rotation = Quaternion.Slerp(Quaternion.identity, rot, share * gazeW * body) * b.rotation;
            }
            var eyes = Vector3.Lerp(p0, p1, Mathf.Clamp01(_gaze.k * lead));
            float we = Mathf.Clamp01(_gaze.w * lead);
            foreach (var eb in new[] { HumanBodyBones.LeftEye, HumanBodyBones.RightEye })
            {
                var e = actor.human[(int)eb]; if (!e) continue;
                var rot = Quaternion.RotateTowards(Quaternion.identity, Quaternion.FromToRotation(Forward(actor, eb), (eyes - e.position).normalized), 28);
                e.rotation = Quaternion.Slerp(Quaternion.identity, rot, we) * e.rotation;
            }
        }

        // "eyes": degrees on top of wherever the gaze left them, in the head's frame, so a dart needs no target and never moves the head. yaw + to his right, pitch + up.
        float _eyeYaw, _eyePitch;
        void ApplyEyes(MVActor actor)
        {
            var head = actor.human[(int)HumanBodyBones.Head]; if (!head) return;
            var frame = head.rotation * Quaternion.Inverse(actor.humanRest[(int)HumanBodyBones.Head]);
            var turn = frame * Quaternion.Euler(-_eyePitch, _eyeYaw, 0) * Quaternion.Inverse(frame);
            foreach (var eb in new[] { HumanBodyBones.LeftEye, HumanBodyBones.RightEye })
            {
                var e = actor.human[(int)eb]; if (e) e.rotation = turn * e.rotation;
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

        /// <summary>Weight moves the joints, not the hand: solve at full reach, then blend each joint from the clip's rotation. Blending the hand's position instead dragged it in a straight line through the body and flipped the elbow on the way.</summary>
        void BlendTwoBone(Transform u, Transform l, Transform h, Vector3 goal, Vector3? hint, Vector3 bias, float w, float w2 = -1)
        {
            if (w2 < 0) w2 = w;
            var q0 = u.localRotation; var q1 = l.localRotation;
            TwoBone(u, l, h, goal, hint, bias);
            if (w == 1 && w2 == 1) return;
            u.localRotation = Quaternion.SlerpUnclamped(q0, u.localRotation, w);
            l.localRotation = Quaternion.SlerpUnclamped(q1, l.localRotation, w2);
        }

        void ApplyReach(MVActor actor, string key, Tween tw)
        {
            Limb(key, out var up, out var mid, out var end);
            Transform u = actor.human[(int)up], l = actor.human[(int)mid], h = actor.human[(int)end]; if (!u || !l || !h) return;
            var keep = h.rotation;
            // From one target to the next the hand swings round the shoulder, keeping the arm's length, instead of a straight line through the air.
            Vector3 g0 = TargetPos(tw.from, actor, h.position), g1 = TargetPos(tw.to, actor, h.position), sp = u.position;
            var goal = sp + Vector3.SlerpUnclamped(g0 - sp, g1 - sp, tw.k);
            Vector3? hint = tw.to.a.Vec.TryGetValue("hint", out var hv) ? hv : (Vector3?)null;
            BlendTwoBone(u, l, h, goal, hint, Bias(actor, key), tw.w, tw.w2);
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
            BlendTwoBone(u, l, h, goal, hint, Bias(actor, side), tw.w);
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
                EnsureTrans(actor, Song.WarpRaw(op.start), InertBack);
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
        static readonly float[] SetFan = { .8f, .8f, 1f, 1.15f, 1.3f };   // fingers "set": one number curls the little finger more than the index, as a real hand does

        void ApplyFingers(MVActor actor)
        {
            if (actor.curlAxis.Length == 0) return;
            for (int f = 0; f < 10; f++)
            {
                float rest = RestCurl[f % 5], curl = _curl[f] < 0 ? rest * (1 + _curl[f]) : Mathf.Max(_curl[f], rest); // a hand is never flat: relaxed fingers curl more toward the little finger. Negative curl opens past rest: -1 is straight, below that bent back.
                float setW = _handW[f], setCurl = _handSet[f] * SetFan[f % 5];
                bool thumb = f % 5 == 0;
                if (_bk >= .999f && setW <= 0 && _curl[f] == 0) continue;   // a baked take has its own hands
                int first = (int)HumanBodyBones.LeftThumbProximal + (f < 5 ? 0 : 15) + (f % 5) * 3;
                for (int j = 0; j < 3; j++)
                {
                    var b = actor.human[first + j]; if (!b) continue;
                    float ang = (thumb ? (j == 0 ? 15f : j == 1 ? 35f : 40f) : (j == 0 ? 60f : j == 1 ? 95f : 60f)) * curl;
                    var q = b.localRotation * Quaternion.AngleAxis(ang, actor.curlAxis[first + j]);
                    if (setW > 0)
                    {
                        float set = (thumb ? (j == 0 ? 15f : j == 1 ? 35f : 40f) : (j == 0 ? 60f : j == 1 ? 95f : 60f)) * setCurl;
                        var abs = RestLocal(actor, first + j, j == 0, f < 5) * Quaternion.AngleAxis(set, actor.curlAxis[first + j]);
                        if (thumb && j == 0 && b.childCount > 0)   // the rig's rest thumb stands out from the palm: bring it in alongside the index
                        {
                            var palm = Vector3.Cross(actor.curlAxis[first], actor.human[first + 1] ? actor.human[first + 1].localPosition.normalized : Vector3.up);
                            abs *= Quaternion.AngleAxis((f < 5 ? 1 : -1) * 38f, palm.normalized);
                        }
                        q = Quaternion.Slerp(q, abs, setW);
                    }
                    b.localRotation = _bk > 0 && setW <= 0 && _curl[f] == 0 ? Quaternion.Slerp(q, b.localRotation, _bk) : q;
                }
            }
        }

        // A finger bone's rotation against its parent at rest, from the rest pose FillHuman stored.
        static Quaternion RestLocal(MVActor actor, int i, bool knuckle, bool left)
        {
            int parent = knuckle ? (int)(left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand) : i - 1;
            return Quaternion.Inverse(actor.humanRest[parent]) * actor.humanRest[i];
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
                case "walk": case "rootwalk":
                    {
                        var to = a.Vec.TryGetValue("to", out var v) ? v : p.pos;
                        if (a.F("rel") > 1) to = Quaternion.Euler(0, p.euler.y, 0) * to;   // rel 2: in his own frame, [0,0,3] is 3 m ahead
                        if (a.F("rel") > 0) to += p.pos;
                        var from = p.pos; p.pos = Vector3.Lerp(from, to, a.Has("soft") ? SoftRange(raw, (float)(a.F("soft") / Math.Max(op.WDur, .001)), (float)(a.F("softOut", a.F("soft")) / Math.Max(op.WDur, .001))) : Ease.Apply(a.S("ease", "inout"), raw));
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
