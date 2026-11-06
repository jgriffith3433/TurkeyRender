using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    /// <summary>Anything in the scene the video moves: a model, a prim, a whole crowd, a camera rig.</summary>
    public class MVActor : MonoBehaviour
    {
        public Vector3 basePos, baseEuler, baseScale = Vector3.one;
        public Transform[] members = new Transform[0];
        public Vector3[] memberPos = new Vector3[0], memberEuler = new Vector3[0], memberScale = new Vector3[0];
        public AnimationClip[] clips = new AnimationClip[0];
        public GameObject animRoot;
        public Color baseTint = Color.white;
        public bool tinted;
        public bool smoothTime; // a camera: moves on smooth scene time even when the world animates on steps
        public Transform[] human = new Transform[0];  // indexed by HumanBodyBones
        public Quaternion[] humanRest = new Quaternion[0]; // each bone's rotation at rest, relative to the actor
        public Vector3[] curlAxis = new Vector3[0];  // finger bones: the axis they curl around, in bone space
        public float fov = 40;

        [NonSerialized] public MotionDriver Driver;

        [NonSerialized] public Renderer[] Rends;
        [NonSerialized] MaterialPropertyBlock _mpb;
        static readonly int BaseColor = Shader.PropertyToID("_BaseColor"), Emission = Shader.PropertyToID("_EmissionColor");

        public AnimationClip FindClip(string name)
        {
            foreach (var c in clips) if (c != null && c.name.Equals(name, StringComparison.OrdinalIgnoreCase)) return c;
            foreach (var c in clips) if (c != null && c.name.IndexOf(name, StringComparison.OrdinalIgnoreCase) >= 0) return c;
            return null;
        }

        static readonly Dictionary<string, MVActor> ByName = new Dictionary<string, MVActor>();
        static readonly HashSet<string> NotFound = new HashSet<string>();
        public static void ForgetNames() { ByName.Clear(); NotFound.Clear(); }
        public static MVActor Named(string name)
        {
            if (ByName.TryGetValue(name, out var a) && a) return a;
            if (NotFound.Contains(name)) return null; // a failed search rescans every actor, so it runs once per build
            ByName.Clear();
            foreach (var x in FindObjectsByType<MVActor>(FindObjectsInactive.Include, FindObjectsSortMode.None)) ByName[x.name] = x;
            if (ByName.TryGetValue(name, out a)) return a;
            NotFound.Add(name); return null;
        }

        /// <summary>"sofa", "person.head", "person.rightHand", "tv1.screen", "flock#3.head". Puts that actor at time t first.</summary>
        public static Transform Point(string spec, double t, bool pull = true) => Point(spec, t, pull, out _);
        public static Transform Point(string spec, double t, bool pull, out MVActor actor)
        {
            actor = null;
            if (string.IsNullOrEmpty(spec)) return null;
            var parts = spec.Split('.');
            var nm = parts[0]; int member = -1; int h = nm.IndexOf('#');
            if (h > 0) { int.TryParse(nm.Substring(h + 1), out member); nm = nm.Substring(0, h); }
            actor = Named(nm); if (!actor) return null;
            if (pull && actor.Driver != null) actor.Driver.Eval(t);
            var from = member >= 0 && member < actor.members.Length ? actor.members[member] : actor.transform;
            return parts.Length > 1 ? actor.Bone(parts[1], from) : from;
        }

        public static string Alias(string b)
        {
            switch (b.ToLowerInvariant())
            {
                case "hand": case "righthand": case "r": return "RightHand";
                case "lefthand": case "l": return "LeftHand";
                case "foot": case "rightfoot": return "RightFoot";
                case "leftfoot": return "LeftFoot";
                case "eyes": case "eye": case "lefteye": return "LeftEye";
                case "righteye": return "RightEye";
                default: return b;
            }
        }

        readonly Dictionary<string, Transform> _bones = new Dictionary<string, Transform>();
        public Transform Bone(string name, Transform from = null)
        {
            from = from ? from : transform;
            string key = from.GetInstanceID() + "/" + name;
            if (_bones.TryGetValue(key, out var r) && r) return r;
            var al = Alias(name);
            if (from == transform && human.Length > 0 && Enum.TryParse<HumanBodyBones>(al, true, out var hb) && (int)hb < human.Length && human[(int)hb]) r = human[(int)hb];
            if (!r)
            {
                Transform best = null;
                foreach (var t in from.GetComponentsInChildren<Transform>(true))
                {
                    if (t.name.Equals(name, StringComparison.OrdinalIgnoreCase)) { best = t; break; }
                    if (!best && t.name.IndexOf(name, StringComparison.OrdinalIgnoreCase) >= 0) best = t;
                }
                r = best;
            }
            if (r) _bones[key] = r;
            return r;
        }

        public void ApplyLook(bool visible, Color tint, bool hasTint, Color glow, bool hasGlow)
        {
            if (Rends == null) Rends = GetComponentsInChildren<Renderer>(true);
            if (_mpb == null) _mpb = new MaterialPropertyBlock();
            var tvc = GetComponent<MVTv>(); var tvScreen = tvc ? tvc.screen : null;
            foreach (var r in Rends)
            {
                if (r == null) continue;
                r.enabled = visible;
                if (r == tvScreen) continue; // the TV track owns this block
                if (!hasTint && !hasGlow) { r.SetPropertyBlock(null); continue; }
                r.GetPropertyBlock(_mpb);
                if (hasTint) _mpb.SetColor(BaseColor, tint);
                if (hasGlow) _mpb.SetColor(Emission, glow);
                r.SetPropertyBlock(_mpb);
            }
        }
    }

    public struct Pose
    {
        public Vector3 pos, euler, scale, addPos, addEuler; public float scaleMul, fov; public Quaternion q;
        public static Pose From(Vector3 p, Vector3 e, Vector3 s) =>
            new Pose { pos = p, euler = e, scale = s, scaleMul = 1, q = Quaternion.identity };
        public Vector3 FinalPos => pos + addPos;
        public Quaternion FinalRot => q * Quaternion.Euler(euler + addEuler);
        public Vector3 FinalScale => scale * scaleMul;
    }

    /// <summary>Moves one actor. Tweens hold after they end, oscillators only run inside their clip.</summary>
    public partial class MotionDriver : Driver
    {
        struct AnimState { public AnimationClip clip; public double time; public bool has; }

        public override void Apply(double t, object binding)
        {
            var actor = binding as MVActor ?? _actor;
            if (actor == null || _busy || t == _stamp) return;
            _actor = actor; _busy = true;
            try { if (!_plantsDone) { FindPlants(actor); Flush(t); } PrepareOverlap(t, actor); _stamp = t; Run(t, actor); } finally { _busy = false; }
        }

        void Run(double tSong, MVActor actor)
        {
            double t = tSong - EchoDelay(tSong);
            _t = t;
            double tw = actor.smoothTime ? Song.WarpRaw(t) : Song.Warp(t);
            _tw = tw;

            var root = Pose.From(actor.basePos, actor.baseEuler, actor.baseScale);
            bool visible = true, hasTint = false, hasGlow = false; Color tint = actor.baseTint, glow = Color.black;
            BeginBody();

            foreach (var op in Ops)
            {
                if (op.a.F("each") > 0) continue;
                double tl = tw - op.ws; if (t < op.start) break;
                if (op.kind == "limits" || op.kind == "stretch" || op.a.Num.ContainsKey("limits")) FoldLimits(op, tl);
                switch (op.kind)
                {
                    case "show": visible = true; break;
                    case "hide": visible = false; break;
                    case "tint": tint = Color.Lerp(hasTint ? tint : actor.baseTint, op.a.C("color", Color.white), Ease.Apply(op.a.S("ease"), (float)(tl / op.WDur))); hasTint = true; break;
                    case "glow": glow = Color.Lerp(glow, op.a.C("color", Color.white) * op.a.F("power", 3), Ease.Apply(op.a.S("ease"), (float)(tl / op.WDur))); hasGlow = true; break;
                    case "delay": break;
                    case "anim": AddLayer(actor, op, tl, 0); if (op.a.Has("root")) ApplyRootMotion(ref root, actor, op, tl); if (op.a.F("stay") > 0) ApplyStay(ref root, actor, op, tw); break;
                    case "keys": { var ks = KeysOf(actor, op); _keyOps.Add((op, tl, ks)); KeysRoot(ref root, ks, tl); break; }
                    case "overlap": FoldOverlap(op, tl); break;
                    case "layer": _layerOps.Add((op, tl)); break;
                    case "walk": { var before = root.pos; Step(ref root, op, tl, 0, 1, actor); AddWalkLayer(actor, op, tl, before, root.pos); break; }
                    case "pose": case "fingers": case "reach": case "gaze": case "plant": case "face": case "shape": case "blink": case "ripple": case "peel": case "bulge":
                    case "feather": case "stretch": case "drain": case "dent": case "glass": case "eyesee":
                        if (!_lite || op.kind == "pose" || op.kind == "gaze") Body(actor, op, tl);
                        break;
                    case "dolly":
                        {
                            var d = actor.GetComponent<Unity.Cinemachine.CinemachineSplineDolly>();
                            if (d) d.CameraPosition = Ease.Apply(op.a.S("ease"), (float)(tl / op.WDur));
                            break;
                        }
                    default: Step(ref root, op, tl, 0, 1, actor); break;
                }
            }

            var tr = actor.transform;
            tr.localPosition = root.FinalPos; tr.localRotation = root.FinalRot; tr.localScale = root.FinalScale;
            if (root.fov > 0) { actor.fov = root.fov; var cam = actor.GetComponent<Camera>(); if (cam) cam.fieldOfView = root.fov; }
            if (!_lite) actor.ApplyLook(visible, tint, hasTint, glow, hasGlow);
            EndBody(actor);
            if (_lite) return;

            int n = actor.members.Length;
            for (int i = 0; i < n; i++)
            {
                var m = actor.members[i]; if (m == null) continue;
                var p = Pose.From(actor.memberPos[i], actor.memberEuler[i], actor.memberScale[i]);
                AnimState ma = default;
                foreach (var op in Ops)
                {
                    if (op.a.F("each") <= 0) continue;
                    double tl = tw - op.ws - Delay(op, i, n); if (t < op.start) break; if (tl < 0) continue;
                    if (op.kind == "anim") ma = PickAnim(actor, op, tl, ma, i);
                    else Step(ref p, op, tl, i, n, actor);
                }
                m.localPosition = p.FinalPos; m.localRotation = p.FinalRot; m.localScale = p.FinalScale;
                if (ma.has) Sample(ma.clip, ma.time, m.gameObject);
            }
        }

        double Delay(Op op, int i, int n)
        {
            float s = op.a.F("stagger"); float j = op.a.F("jitter");
            return s * i + (j > 0 ? Hash(i * 7 + op.index) * j : 0);
        }

        AnimState PickAnim(MVActor actor, Op op, double tl, AnimState cur, int i)
        {
            if (op.a.F("once") > 0 && tl > op.WDur) return cur;
            var clip = op.refs != null && op.refs.Length > 0 ? op.refs[0] as AnimationClip : actor.FindClip(op.a.S("clip", ""));
            if (clip == null) return cur;
            float cycleBeats = op.a.F("beats"), speed = op.a.F("speed", 1);
            double local;
            if (cycleBeats > 0)
            {
                double b0 = Song.BeatAt(op.start), b = Song.BeatAt(op.start + tl);
                local = (b - b0) / cycleBeats * clip.length;
            }
            else local = tl * speed;
            local += Hash(i * 13) * op.a.F("offset") * clip.length;
            if (op.a.F("once") > 0) local = Math.Min(local, clip.length);
            else if (clip.length > 0) local %= clip.length;
            return new AnimState { clip = clip, time = local, has = true };
        }

        void Sample(AnimationClip clip, double time, GameObject go)
        {
            var keepP = go.transform.localPosition; var keepR = go.transform.localRotation; var keepS = go.transform.localScale;
            clip.SampleAnimation(go, (float)time);
            go.transform.localPosition = keepP; go.transform.localRotation = keepR; go.transform.localScale = keepS;
        }

        static float Hash(int i)
        {
            uint x = (uint)(i * 2654435761u + 1013904223u); x ^= x >> 15; x *= 2246822519u; x ^= x >> 13;
            return (x & 0xFFFFFF) / (float)0xFFFFFF;
        }
        static Vector3 HashDir(int i)
        {
            var v = new Vector3(Hash(i) - .5f, Hash(i + 97) - .5f, Hash(i + 211) - .5f);
            return v.sqrMagnitude < 1e-5f ? Vector3.up : v.normalized;
        }

        void Step(ref Pose p, Op op, double tl, int i, int n, MVActor actor)
        {
            var a = op.a;
            float raw = (float)(tl / op.WDur), k = Ease.Apply(a.S("ease"), raw);
            bool inside = tl <= op.WDur;
            float w = 1; float fade = a.F("fade");
            if (fade > 0) w = Mathf.Clamp01(Mathf.Min((float)tl, (float)(op.WDur - tl)) / fade);
            double beats = Song.BeatAt(op.start + tl) - Song.BeatAt(op.start);
            float every = a.F("every", 1), ph = (float)(beats / every);

            switch (op.kind)
            {
                // Tweens: they hold their end value after the clip.
                case "set":
                    p.scaleMul = 1;
                    if (a.Has("pos")) p.pos = a.V("pos"); if (a.Has("rot")) { p.euler = a.V("rot"); p.q = Quaternion.identity; }
                    if (a.Has("scale")) p.scale = a.Vec.ContainsKey("scale") ? a.V("scale") : Vector3.one * a.F("scale", 1);
                    break;
                case "move":
                    p.pos = Vector3.LerpUnclamped(p.pos, a.F("rel") > 0 ? p.pos + a.V("pos") : a.V("pos"), k); break;
                case "rotate":
                    p.euler = Vector3.LerpUnclamped(p.euler, a.F("rel") > 0 ? p.euler + a.V("rot") : a.V("rot"), k); break;
                case "scale":
                    { var s = a.Vec.ContainsKey("to") ? a.V("to") : Vector3.one * a.F("to", 1); p.scale = Vector3.LerpUnclamped(p.scale, s, k); break; }
                case "jump":
                    {
                        var to = a.F("rel") > 0 ? p.pos + a.V("pos") : a.V("pos");
                        float q = Mathf.Clamp01(raw);
                        p.pos = Vector3.Lerp(p.pos, to, q) + Vector3.up * (4 * q * (1 - q) * a.F("height", 2)); break;
                    }
                case "pop":
                    { p.scaleMul *= Mathf.Max(0, Ease.Apply(a.S("ease", "back"), raw)); break; }
                case "shrink":
                    { p.scaleMul *= Mathf.Max(0, 1 - Ease.Apply(a.S("ease", "in"), raw)); break; }
                case "spin":
                    p.euler += a.V("axis", Vector3.up) * (float)((Song.BeatAt(op.start + Math.Min(tl, op.WDur)) - Song.BeatAt(op.start)) * a.F("rate", 90));
                    break;
                case "orbit":
                    {
                        var c = a.V("center"); float r = a.F("radius", 5);
                        float ang = a.F("angle") + (float)(Song.BeatAt(op.start + Math.Min(tl, op.WDur)) - Song.BeatAt(op.start)) * a.F("rate", 15);
                        p.pos = c + new Vector3(Mathf.Sin(ang * Mathf.Deg2Rad) * r, a.F("y"), Mathf.Cos(ang * Mathf.Deg2Rad) * r);
                        break;
                    }
                case "topple": case "slide": case "drop": case "wobble": case "tremble": case "attach": case "detach": case "fov": case "walk":
                    Prop(ref p, op, tl, raw, k, inside, w, i, actor); break;
                case "suck": // dragged spiralling into a point, stretching, shrinking to nothing at the end
                    {
                        var to = a.V("to"); float e = Ease.Apply(a.S("ease", "in"), raw);
                        var d = p.pos - to; float ang = e * a.F("swirl", 300) * Mathf.Deg2Rad + Hash(i + 9) * a.F("spread", 0);
                        d = new Vector3(d.x * Mathf.Cos(ang) - d.y * Mathf.Sin(ang), d.x * Mathf.Sin(ang) + d.y * Mathf.Cos(ang), d.z);
                        p.pos = to + d * (1 - e);
                        p.euler += HashDir(i * 3 + 1) * (e * a.F("tumble", 720));
                        p.scaleMul *= Mathf.Clamp01(1 - e * e * e * a.F("shrink", 1));
                        break;
                    }
                case "fall": // dropped from height, lands and stays
                    {
                        float T = (float)tl, h = a.F("height", 25) * (.7f + .6f * Hash(i + 2)), g = a.F("gravity", 20);
                        p.pos.y += Mathf.Max(0, h - .5f * g * T * T);
                        break;
                    }
                case "scatter": // blown apart: ballistic and tumbling, keeps going after the clip until it lands
                    {
                        float T = (float)tl, g = a.F("gravity", 14);
                        var dir = HashDir(i * 31 + op.index); dir.y = Mathf.Abs(dir.y) + a.F("lift", .6f);
                        var vel = dir.normalized * (a.F("power", 12) * (.6f + .8f * Hash(i + 5)));
                        var from = p.pos;
                        var q = from + vel * T + .5f * g * T * T * Vector3.down;
                        float floor = a.F("floor", 0);
                        if (q.y < floor) q.y = floor;
                        p.pos = q;
                        p.euler += HashDir(i * 17) * (T * a.F("tumble", 540));
                        break;
                    }
                // Oscillators: only inside the clip.
                case "hop":
                    if (inside) { float s = Mathf.Abs(Mathf.Sin(ph * Mathf.PI)); p.addPos.y += s * a.F("height", 1) * w; }
                    break;
                case "bob":
                    if (inside) p.addPos += a.V("axis", Vector3.up) * (Mathf.Sin(ph * Mathf.PI * 2) * a.F("amount", .3f) * w);
                    break;
                case "sway":
                    if (inside) p.addEuler += a.V("axis", Vector3.forward) * (Mathf.Sin(ph * Mathf.PI) * a.F("amount", 12) * w);
                    break;
                case "shake":
                    if (inside)
                    {
                        float T = (float)tl * a.F("speed", 25), amp = a.F("amount", .2f) * w * (a.F("decay") > 0 ? 1 - raw : 1);
                        p.addPos += new Vector3(Mathf.PerlinNoise(T, i) - .5f, Mathf.PerlinNoise(i, T) - .5f, Mathf.PerlinNoise(T, T + i) - .5f) * (amp * 2);
                    }
                    break;
                case "pulse":
                    if (inside) { float d = 1 - (ph - Mathf.Floor(ph)); p.scaleMul *= 1 + d * d * a.F("amount", .25f) * w; }
                    break;
                case "squash":
                    if (inside) { float d = 1 - (ph - Mathf.Floor(ph)); d = d * d * a.F("amount", .3f) * w; p.scale = Vector3.Scale(p.scale, new Vector3(1 + d, 1 - d, 1 + d)); }
                    break;
                case "react":
                    if (inside)
                    {
                        float e = Song.Env(a.S("band", "kick"), op.start + tl) * w;
                        p.scaleMul *= 1 + e * a.F("scale");
                        p.addPos.y += e * a.F("y");
                        p.addEuler += a.V("axis", Vector3.up) * (e * a.F("turn"));
                    }
                    break;
            }
        }
    }
}
