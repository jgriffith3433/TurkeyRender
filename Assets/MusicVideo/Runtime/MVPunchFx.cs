using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Hawkes Punch effects. `impact` and `glass` are particle presets (built once, simulated to the exact time by FxDriver).
    /// `rope` and `trail` are meshes rebuilt each frame from where things are at that moment, so they scrub and reverse.
    /// </summary>
    public static class MVPunchFx
    {
        // ---------- particle presets, built into FxLibrary's root ----------

        public static bool Build(string name, GameObject root, Args a)
        {
            switch (name)
            {
                case "impact": Impact(root, a); return true;
                case "glass": Glass(root, a); return true;
                default: return false;
            }
        }

        static ParticleSystem Sys(GameObject root, string name, string tex, bool add, float life, Vector2 size, Vector2 speed, Color col, int max = 2000)
        {
            var go = new GameObject(name); go.transform.SetParent(root.transform, false);
            var p = go.AddComponent<ParticleSystem>();
            p.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var m = p.main;
            m.loop = false; m.duration = 1; m.playOnAwake = false; m.maxParticles = max;
            m.startLifetime = new ParticleSystem.MinMaxCurve(life * .6f, life);
            m.startSize = new ParticleSystem.MinMaxCurve(size.x, size.y);
            m.startSpeed = new ParticleSystem.MinMaxCurve(speed.x, speed.y);
            m.startColor = col; m.simulationSpace = ParticleSystemSimulationSpace.World;
            var e = p.emission; e.rateOverTime = 0;
            go.GetComponent<ParticleSystemRenderer>().sharedMaterial = FxLibrary.Mat(tex, add);
            return p;
        }
        static void Burst(ParticleSystem p, int n) { var e = p.emission; e.SetBursts(new[] { new ParticleSystem.Burst(0, (short)Mathf.Clamp(n, 1, 30000)) }); }
        static void Fade(ParticleSystem p, Color a, Color b, float hold = .3f)
        {
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(a, 0), new GradientColorKey(b, 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, hold), new GradientAlphaKey(0, 1) });
            var c = p.colorOverLifetime; c.enabled = true; c.color = g;
        }
        static void Spin(ParticleSystem p, float deg)
        {
            var m = p.main; m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            var r = p.rotationOverLifetime; r.enabled = true; r.z = new ParticleSystem.MinMaxCurve(-deg * Mathf.Deg2Rad, deg * Mathf.Deg2Rad);
        }
        static void Cone(ParticleSystem p, Vector3 dir, float angle, float radius)
        {
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Cone; s.angle = angle; s.radius = radius;
            s.rotation = dir.sqrMagnitude > 1e-6f ? Quaternion.LookRotation(dir.normalized).eulerAngles : Vector3.zero;
        }

        /// <summary>A hit at a point: a frame-held flash, a shockwave ring, debris chunks, sparks and dust, all scaled by `size` (metres).</summary>
        static void Impact(GameObject root, Args a)
        {
            float size = a.F("size", 6); Color c = a.C("color", new Color(1, .8f, .45f)), c2 = a.C("color2", new Color(1, .95f, .85f));
            var flash = Sys(root, "flash", "soft", true, a.F("flashFor", .12f), new Vector2(2.2f, 2.6f) * size, Vector2.zero, c2); Burst(flash, 2);
            { var g = new Gradient(); g.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(c2, 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, .7f), new GradientAlphaKey(0, 1) }); var col = flash.colorOverLifetime; col.enabled = true; col.color = g; }
            var ring = Sys(root, "ring", "ring", true, .55f, new Vector2(1, 1), Vector2.zero, c, 4); Burst(ring, 1);
            { var m = ring.main; m.startSize = size * 2.4f; m.startRotation3D = true; var up = a.V("normal", Vector3.zero); var r = ring.GetComponent<ParticleSystemRenderer>(); r.alignment = ParticleSystemRenderSpace.World; r.renderMode = ParticleSystemRenderMode.Billboard;
              if (up != Vector3.zero) { var e = Quaternion.LookRotation(up.normalized).eulerAngles * Mathf.Deg2Rad; m.startRotationX = e.x; m.startRotationY = e.y; m.startRotationZ = e.z; }
              var s = ring.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, new AnimationCurve(new Keyframe(0, .08f, 0, 5), new Keyframe(1, 1))); Fade(ring, Color.white, c, .15f); }
            var ring2 = Sys(root, "ring2", "ring", true, .9f, new Vector2(1, 1), Vector2.zero, c * .6f, 4); Burst(ring2, 1);
            { var m = ring2.main; m.startSize = size * 4f; m.startDelay = .06f; var r = ring2.GetComponent<ParticleSystemRenderer>(); r.alignment = ParticleSystemRenderSpace.World; var s = ring2.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, new AnimationCurve(new Keyframe(0, .1f, 0, 4), new Keyframe(1, 1))); Fade(ring2, Color.white, c, .1f); }
            int n = (int)a.F("count", 90); float g0 = a.F("gravity", 0);
            var deb = Sys(root, "debris", "square", false, a.F("life", 2.2f), new Vector2(.04f, .14f) * size, new Vector2(.9f, 2.6f) * size, a.C("debris", new Color(.35f, .3f, .28f)), 4000); Burst(deb, n);
            { var m = deb.main; m.gravityModifier = g0; var s = deb.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Sphere; s.radius = size * .1f; Spin(deb, 420); Fade(deb, Color.white, Color.white, .7f);
              var d = deb.limitVelocityOverLifetime; d.enabled = true; d.dampen = .08f; d.limit = 40 * size; }
            var sp = Sys(root, "sparks", "streak", true, 1.1f, new Vector2(.02f, .05f) * size, new Vector2(2, 5) * size, c2 * 2.5f, 3000); Burst(sp, (int)(n * 1.6f));
            { var m = sp.main; m.gravityModifier = g0 * .5f; var s = sp.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Sphere; s.radius = size * .05f; var r = sp.GetComponent<ParticleSystemRenderer>(); r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = .05f; r.lengthScale = 2; Fade(sp, Color.white, c, .2f); }
            var dust = Sys(root, "dust", "puff", false, 1.8f, new Vector2(.5f, 1.2f) * size, new Vector2(.4f, 1.2f) * size, a.C("dust", new Color(.5f, .45f, .4f, .45f)), 200); Burst(dust, 24);
            { var s = dust.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Sphere; s.radius = size * .15f; var so = dust.sizeOverLifetime; so.enabled = true; so.size = new ParticleSystem.MinMaxCurve(1, AnimationCurve.EaseInOut(0, .4f, 1, 1.6f)); Fade(dust, Color.white, Color.white, .1f); Spin(dust, 30); var d = dust.limitVelocityOverLifetime; d.enabled = true; d.dampen = .2f; d.limit = size * .3f; }
            if (a.F("light", 1) > 0) { var lg = new GameObject("flashLight"); lg.transform.SetParent(root.transform, false); var l = lg.AddComponent<Light>(); l.type = LightType.Point; l.color = c2; l.range = size * 8; l.intensity = 0; }
        }

        /// <summary>Glass: a sheet bursts into shards along `dir`, with a glint. `size` is the sheet's size in metres.</summary>
        static void Glass(GameObject root, Args a)
        {
            float size = a.F("size", 2); var dir = a.V("dir", Vector3.forward); int n = (int)a.F("count", 160);
            Color c = a.C("color", new Color(.75f, .92f, 1f, .75f));
            var sh = Sys(root, "shards", "square", false, a.F("life", 2.5f), new Vector2(.03f, .11f) * size, new Vector2(1.5f, 6f) * a.F("speed", 1), c, 3000); Burst(sh, n);
            { var m = sh.main; m.gravityModifier = a.F("gravity", 1); m.startSize3D = true; m.startSizeX = new ParticleSystem.MinMaxCurve(.03f * size, .14f * size); m.startSizeY = new ParticleSystem.MinMaxCurve(.03f * size, .22f * size); m.startSizeZ = 1;
              var s = sh.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(size * a.F("aspect", 1), size, .02f);
              if (dir.sqrMagnitude > 1e-6f) s.rotation = Quaternion.LookRotation(dir.normalized).eulerAngles;
              var v = sh.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World; var d = dir.normalized * a.F("push", 4) * a.F("speed", 1); v.x = new ParticleSystem.MinMaxCurve(d.x * .6f, d.x * 1.4f); v.y = new ParticleSystem.MinMaxCurve(d.y * .6f, d.y * 1.4f); v.z = new ParticleSystem.MinMaxCurve(d.z * .6f, d.z * 1.4f);
              Spin(sh, 720); Fade(sh, Color.white, new Color(.85f, .95f, 1f), .75f); }
            var gl = Sys(root, "glint", "streak", true, .5f, new Vector2(.05f, .2f) * size, new Vector2(2, 7f), Color.white * 2, 400); Burst(gl, n / 2);
            { var s = gl.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(size, size, .02f); if (dir.sqrMagnitude > 1e-6f) s.rotation = Quaternion.LookRotation(dir.normalized).eulerAngles; var r = gl.GetComponent<ParticleSystemRenderer>(); r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = .04f; r.lengthScale = 1.5f; Fade(gl, Color.white, c, .2f); }
            var fl = Sys(root, "flash", "soft", true, .1f, new Vector2(1.6f, 2f) * size, Vector2.zero, new Color(.9f, .97f, 1)); Burst(fl, 1); Fade(fl, Color.white, c, .4f);
        }

        // ---------- meshes: rope and trail ----------

        class Live { public GameObject go; public Mesh mesh; public MeshRenderer r; public Material m; }
        static readonly Dictionary<Op, Live> All = new Dictionary<Op, Live>();
        static readonly Dictionary<string, float> Radii = new Dictionary<string, float>();

        public static bool Handles(string kind) => kind == "rope" || kind == "trail";

        public static void Run(Op op, double t, SongMap song, MVStage st)
        {
            double age = song.Warp(t) - op.ws;
            bool on = t >= op.start && age <= op.Dur;
            All.TryGetValue(op, out var l);
            if (!on) { if (l != null && l.go && l.go.activeSelf) l.go.SetActive(false); return; }
            if (l == null || !l.go) { l = Make(op, st); All[op] = l; }
            if (!l.go.activeSelf) l.go.SetActive(true);
            if (op.kind == "rope") Rope(op, t, (float)age, l); else Trail(op, t, (float)age, l);
        }

        static Live Make(Op op, MVStage st)
        {
            var go = new GameObject("fx_" + op.kind) { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(st.fxRoot, false);
            var mesh = new Mesh { hideFlags = HideFlags.DontSave }; mesh.MarkDynamic();
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>();
            Material m;
            if (op.kind == "rope")
            {
                m = new Material(Shader.Find("MV/Lit") ?? Shader.Find("Universal Render Pipeline/Lit")) { hideFlags = HideFlags.DontSave };
                m.SetColor("_BaseColor", op.a.C("color", new Color(.62f, .45f, .25f))); m.SetFloat("_Smoothness", .25f);
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            }
            else { m = FxLibrary.Mat("soft", true); r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; }
            r.sharedMaterial = m; r.receiveShadows = false;
            return new Live { go = go, mesh = mesh, r = r, m = m };
        }

        /// <summary>How big a thing is: half its renderer bounds, read once.</summary>
        static float RadiusOf(MVActor actor, Transform tr)
        {
            if (actor == null) return .5f;
            if (Radii.TryGetValue(actor.name, out var r)) return r;
            var b = new Bounds(tr.position, Vector3.zero); bool any = false;
            foreach (var rd in actor.GetComponentsInChildren<Renderer>(true)) { if (rd is ParticleSystemRenderer || rd.GetComponentInParent<MVActor>() != actor) continue; if (!any) { b = rd.bounds; any = true; } else b.Encapsulate(rd.bounds); } // its own body, not the rings parented to it
            r = any ? Mathf.Max(b.extents.x, b.extents.y, b.extents.z) : .5f;
            return Radii[actor.name] = r;
        }

        static readonly List<Vector3> V = new List<Vector3>(); static readonly List<Color> C = new List<Color>(); static readonly List<int> I = new List<int>(); static readonly List<Vector2> U = new List<Vector2>();

        /// <summary>A rope from a hand to a target: flies out as a spinning open loop over `fly`, tightens over `tight`, then hangs with a sag that follows the distance.</summary>
        static void Rope(Op op, double t, float age, Live l)
        {
            var a = op.a;
            var hand = MVActor.Point(a.S("from"), t); if (!hand) return;
            var target = MVActor.Point(a.S("to"), t, true, out var actor); if (!target) return;
            Vector3 h = hand.position + hand.rotation * a.V("offset"), c = target.position;
            float R = a.Has("radius") ? a.F("radius") : RadiusOf(actor, target) * 1.02f;
            float fly = a.F("fly"), tight = a.F("tight", .25f), thick = a.F("thick", .035f);
            var toC = c - h; float dist = toC.magnitude; var dir = dist > 1e-4f ? toC / dist : Vector3.forward;
            float e = fly > 0 ? Ease.Apply("out", Mathf.Clamp01(age / fly)) : 1;              // the loop's flight
            float tg = fly > 0 ? Mathf.Clamp01((age - fly) / Mathf.Max(tight, .01f)) : 1;      // tightening
            // the loop: in flight it is open, spinning, ahead of the rope's end; tight, it is a great circle round the target facing the hand
            float loopR = Mathf.Lerp(Mathf.Max(a.F("loop", R * 1.6f), thick * 8), R, Ease.Apply("inout", tg));
            Vector3 anchor = c - dir * R;                                                   // the surface point nearest the hand
            Vector3 tip = Vector3.Lerp(h, Vector3.Lerp(h, c - dir * loopR, 1), e);          // the rope's end in flight
            if (tg >= 1) tip = anchor;
            else tip = Vector3.Lerp(Vector3.Lerp(h, c - dir * loopR * 1.1f, e), anchor, tg);
            Vector3 loopC = tg >= 1 ? c : Vector3.Lerp(tip + dir * loopR, c, tg);
            // the rope: a parabola sagging under gravity, slack while it flies, nearly straight when tight; it whips a little as it flies
            float slack = Mathf.Lerp(a.F("sag", .1f), a.F("sagTight", .025f), tg) * (e < 1 ? 1 + 1.5f * (1 - e) : 1);
            int segs = 40, sides = 6;
            V.Clear(); C.Clear(); I.Clear(); U.Clear();
            var up = Vector3.up; float L = Vector3.Distance(h, tip);
            float whip = e < 1 ? Mathf.Sin(age * 28f) * .08f * (1 - e) * L : 0;
            var side = Vector3.Cross(dir, up).sqrMagnitude > 1e-4f ? Vector3.Cross(dir, up).normalized : Vector3.right;
            Vector3 P(float s) { var q = Vector3.Lerp(h, tip, s); return q - up * (slack * L * 4 * s * (1 - s)) + side * (whip * Mathf.Sin(s * Mathf.PI * 2)); }
            Tube(s => P(s), segs, sides, thick, Color.white);
            // the loop: a ring, open (big and tilted, spinning) or tight (a great circle, plane along the rope so it reads as caught)
            float spin = age * 540 * (1 - tg);
            var ringN = tg >= 1 ? dir : Vector3.Slerp(dir, up, .5f * (1 - tg));
            var ringQ = Quaternion.AngleAxis(spin, ringN) * Quaternion.LookRotation(ringN);
            Vector3 Ring(float s) { float ang = s * Mathf.PI * 2; return loopC + ringQ * new Vector3(Mathf.Cos(ang), Mathf.Sin(ang), 0) * loopR; }
            Tube(Ring, 36, sides, thick, Color.white, true);
            Commit(l);
        }

        static void Tube(System.Func<float, Vector3> P, int segs, int sides, float r, Color col, bool closed = false)
        {
            int baseV = V.Count;
            Vector3 prevN = Vector3.up, prevB = Vector3.right;
            for (int s = 0; s <= segs; s++)
            {
                float u = (float)s / segs;
                var p = P(u); var d = P(Mathf.Min(u + 1f / segs, 1)) - P(Mathf.Max(u - 1f / segs, 0));
                if (d.sqrMagnitude < 1e-10f) d = Vector3.forward; d.Normalize();
                var n = Vector3.Cross(d, prevB).sqrMagnitude > 1e-6f ? Vector3.Cross(d, Vector3.Cross(prevN, d)).normalized : prevN;
                if (n.sqrMagnitude < 1e-6f || float.IsNaN(n.x)) n = Vector3.Cross(d, Vector3.right).normalized;
                var b = Vector3.Cross(d, n).normalized; prevN = n; prevB = b;
                for (int k = 0; k < sides; k++) { float ang = k * Mathf.PI * 2 / sides; V.Add(p + (n * Mathf.Cos(ang) + b * Mathf.Sin(ang)) * r); C.Add(col); U.Add(new Vector2((float)k / sides, u * 8)); }
            }
            for (int s = 0; s < segs; s++)
                for (int k = 0; k < sides; k++)
                {
                    int k2 = (k + 1) % sides, i0 = baseV + s * sides + k, i1 = baseV + s * sides + k2, i2 = baseV + (s + 1) * sides + k, i3 = baseV + (s + 1) * sides + k2;
                    I.Add(i0); I.Add(i2); I.Add(i1); I.Add(i1); I.Add(i2); I.Add(i3);
                }
        }

        static void Commit(Live l)
        {
            var m = l.mesh; m.Clear();
            if (V.Count == 0) return;
            m.SetVertices(V); m.SetColors(C); if (U.Count == V.Count) m.SetUVs(0, U); m.SetTriangles(I, 0); m.RecalculateNormals(); m.RecalculateBounds();
        }

        /// <summary>Speed lines and a streak behind a flyer, drawn from the same path the `fly` cue uses, at the same moment.</summary>
        static void Trail(Op op, double t, float age, Live l)
        {
            var a = op.a;
            double flyStart = a.F("flyStart"), flyDur = Mathf.Max(a.F("flyDur", 1), .01f);
            // the flight's own clock: its progress at this moment, by the same ease
            double ftl = MVClock.Song ? MVClock.Song.Warp(t) - MVClock.Song.WarpRaw(flyStart) : t - flyStart;
            float s = Ease.Apply(a.S("ease"), Mathf.Clamp01((float)(ftl / flyDur)));
            // where the flight began: a fixed-time sample of the flyer at the fly cue's start, taken once
            if (!Starts.TryGetValue(op, out var here))
            {
                var tr = MVActor.Point(a.S("on"), flyStart); here = tr ? tr.position : Vector3.zero; if (tr) MVActor.Point(a.S("on"), t);
                Starts[op] = here;
            }
            var pts = Flight.Points(a, here);
            Flight.Sample(pts, s, out var pos, out var dir, out float len);
            if (len < 1e-3f) { Commit(l); return; }
            float back = a.F("length", .22f);                      // share of the path the streak covers
            float fadeIn = Mathf.Clamp01((float)(ftl / .15)), fadeOut = 1 - Mathf.Clamp01((float)((ftl - flyDur) / Mathf.Max(a.F("fadeOut", .4f), .01f)));
            float alpha = a.F("alpha", .8f) * fadeIn * fadeOut;
            if (alpha <= .001f) { Commit(l); return; }
            var cam = Camera.main ? Camera.main.transform.position : pos - dir * 10;
            Color col = a.C("color", new Color(.9f, .95f, 1f));
            V.Clear(); C.Clear(); I.Clear(); U.Clear();
            int n = 18; float w0 = a.F("width", .35f);
            // the streak: a ribbon widening behind him then thinning to nothing
            Ribbon(pts, s, back, n, w0, col * alpha, cam, Vector3.zero, 0);
            // speed lines: thin streaks offset round the path, each at its own place along it, racing past (positions move with the flyer, pure of time)
            int lines = (int)a.F("lines", 14); float spread = a.F("spread", 1.1f);
            for (int i = 0; i < lines; i++)
            {
                float h1 = Hash(i * 3 + op.index), h2 = Hash(i * 7 + 1), h3 = Hash(i * 11 + 5);
                float off = h1 * back * .9f + .02f;                                            // how far behind the flyer the line's head is
                float lenL = .04f + h2 * .08f;
                float ang = h3 * Mathf.PI * 2; float rad = spread * (.6f + .4f * Hash(i * 13 + 2));
                Ribbon(pts, Mathf.Max(0, s - off), lenL, 4, w0 * .22f, col * (alpha * .9f), cam, new Vector3(Mathf.Cos(ang), Mathf.Sin(ang), 0) * rad, i);
            }
            Commit(l);
        }
        static readonly Dictionary<Op, Vector3> Starts = new Dictionary<Op, Vector3>();

        static void Ribbon(Vector3[] pts, float head, float back, int n, float w, Color col, Vector3 cam, Vector3 radial, int seed)
        {
            int baseV = V.Count;
            for (int j = 0; j <= n; j++)
            {
                float u = (float)j / n, s = Mathf.Max(0, head - u * back);
                Flight.Sample(pts, s, out var p, out var d, out _);
                var toCam = (cam - p); var side = Vector3.Cross(d, toCam); side = side.sqrMagnitude > 1e-6f ? side.normalized : Vector3.up;
                var up = Vector3.Cross(side, d).normalized;
                p += side * radial.x + up * radial.y;
                float shape = Mathf.Sin(Mathf.Clamp01(u) * Mathf.PI) * (1 - u * .4f);          // thin at the body, widest a third back, gone at the tail
                float ww = w * shape; var c = col; c.a = col.a * (1 - u) * (1 - u);
                V.Add(p + side * ww); C.Add(c); U.Add(new Vector2(0, .5f)); V.Add(p - side * ww); C.Add(c); U.Add(new Vector2(1, .5f)); // the soft texture across the strip: feathered edges
            }
            for (int j = 0; j < n; j++) { int i0 = baseV + j * 2; I.Add(i0); I.Add(i0 + 2); I.Add(i0 + 1); I.Add(i0 + 1); I.Add(i0 + 2); I.Add(i0 + 3); I.Add(i0); I.Add(i0 + 1); I.Add(i0 + 2); I.Add(i0 + 1); I.Add(i0 + 3); I.Add(i0 + 2); }
        }

        static float Hash(int i) { uint x = (uint)(i * 2654435761u + 1013904223u); x ^= x >> 15; x *= 2246822519u; x ^= x >> 13; return (x & 0xFFFFFF) / (float)0xFFFFFF; }

        public static void Clear()
        {
            foreach (var l in All.Values) if (l.go) Object.DestroyImmediate(l.go);
            All.Clear(); Starts.Clear(); Radii.Clear();
        }
    }
}
