using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    /// <summary>Every effect is built once, then simulated to the exact time each frame, so it scrubs and renders identically.</summary>
    public class FxDriver : Driver
    {
        class Live { public GameObject go; public ParticleSystem[] roots; public Light flash; public AnimationCurve curve; public bool pull; }

        // "to": particles drift toward a point, by a velocity field, so it stays a function of the simulated time.
        void Pull(Live l, Op op, float scene)
        {
            var to = op.a.Vec.TryGetValue("to", out var v) ? v : (MVActor.Point(op.a.S("to"), MVClock.T)?.position ?? Vector3.zero);
            foreach (var p in l.go.GetComponentsInChildren<ParticleSystem>(true))
            {
                var d = (to - l.go.transform.position) * op.a.F("pull", .25f);
                var f = p.velocityOverLifetime; f.enabled = true; f.space = ParticleSystemSimulationSpace.World;
                f.x = new ParticleSystem.MinMaxCurve(d.x); f.y = new ParticleSystem.MinMaxCurve(d.y); f.z = new ParticleSystem.MinMaxCurve(d.z);
            }
        }
        readonly Dictionary<int, Live> _live = new Dictionary<int, Live>();
        readonly Dictionary<string, Transform> _actors = new Dictionary<string, Transform>();

        public override void Apply(double t, object binding)
        {
            var st = binding as MVStage; if (st == null) return;
            foreach (var op in Ops)
            {
                if (MVFeatherFx.Handles(op.kind)) { MVFeatherFx.Run(op, t, Song, st); continue; }
                double scene = Song.Warp(t) - op.ws;
                bool on = t >= op.start && scene <= op.Dur;
                _live.TryGetValue(op.index, out var l);
                if (!on) { if (l != null && l.go && l.go.activeSelf) l.go.SetActive(false); continue; }
                if (l == null || !l.go) { l = Make(op, st); _live[op.index] = l; }
                if (l.go == null) continue;
                if (!l.go.activeSelf) l.go.SetActive(true);
                Place(l, op);
                if (l.pull) Pull(l, op, (float)scene);
                float tl = Mathf.Max(0, (float)scene);
                foreach (var r in l.roots) if (r) r.Simulate(tl, true, true, false);
                if (l.flash) l.flash.intensity = l.curve.Evaluate(tl) * op.a.F("light", 1);
            }
        }

        Transform Actor(string name)
        {
            if (_actors.TryGetValue(name, out var tr) && tr) return tr;
            foreach (var a in Object.FindObjectsByType<MVActor>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (a.name == name) { _actors[name] = a.transform; return a.transform; }
            return null;
        }

        void Place(Live l, Op op)
        {
            var pos = op.a.V("pos");
            var on = op.a.S("on");
            if (on != null) { var a = MVActor.Point(on, MVClock.T); if (a) pos = a.position + op.a.V("offset"); }
            l.go.transform.position = pos;
            l.go.transform.rotation = Quaternion.Euler(op.a.V("rot"));
            l.go.transform.localScale = Vector3.one * op.a.F("scale", 1);
        }

        Live Make(Op op, MVStage st)
        {
            GameObject go;
            var prefab = op.refs != null && op.refs.Length > 0 ? op.refs[0] as GameObject : null;
            if (prefab) { go = Object.Instantiate(prefab); foreach (var b in go.GetComponentsInChildren<MonoBehaviour>(true)) b.enabled = false; }
            else go = FxLibrary.Build(op.kind, op.a);
            go.hideFlags = HideFlags.DontSave;
            foreach (var tr in go.GetComponentsInChildren<Transform>(true)) tr.gameObject.hideFlags = HideFlags.DontSave;
            go.transform.SetParent(st.fxRoot, false);

            var all = go.GetComponentsInChildren<ParticleSystem>(true);
            var roots = new List<ParticleSystem>();
            uint seed = (uint)(op.index * 7919 + 13);
            foreach (var p in all)
            {
                p.Stop(false, ParticleSystemStopBehavior.StopEmittingAndClear);
                p.useAutoRandomSeed = false; p.randomSeed = seed++;
                var m = p.main; m.playOnAwake = false; m.simulationSpace = m.simulationSpace == ParticleSystemSimulationSpace.Custom ? ParticleSystemSimulationSpace.World : m.simulationSpace;
                m.scalingMode = ParticleSystemScalingMode.Hierarchy;
                if (p.transform.parent == null || p.transform.parent.GetComponentInParent<ParticleSystem>() == null) roots.Add(p);
            }
            var flash = go.GetComponentInChildren<Light>(true);
            return new Live { go = go, roots = roots.ToArray(), flash = flash, curve = FxLibrary.FlashCurve, pull = op.a.Has("to") };
        }

        public override void Dispose()
        {
            MVFeatherFx.Clear();
            foreach (var l in _live.Values) if (l.go) Object.DestroyImmediate(l.go);
            _live.Clear();
        }
    }

    /// <summary>Procedural particle presets, no art needed. Pack prefabs can be used instead: "fx":"prefab:Assets/...".</summary>
    public static class FxLibrary
    {
        public static readonly AnimationCurve FlashCurve = new AnimationCurve(new Keyframe(0, 60), new Keyframe(.08f, 40), new Keyframe(.6f, 0));
        static readonly Dictionary<string, Texture2D> Tex = new Dictionary<string, Texture2D>();
        static readonly Dictionary<string, Material> Mats = new Dictionary<string, Material>();

        public static float DefaultLife(string name)
        {
            switch (name)
            {
                case "crown": return 60; case "stream": return 4;
                case "explosion": return 3.5f; case "feathers": return 5f; case "fireworks": return 3.5f; case "confetti": return 6f;
                case "shockwave": return 1f; case "sparks": return 1.6f; case "dust": return 3f; case "smoke": case "fire": case "rain": case "snow": case "embers": return 8f;
                default: return 3f;
            }
        }

        public static GameObject Build(string name, Args a)
        {
            var root = new GameObject("fx_" + name);
            var main = root.AddComponent<ParticleSystem>();
            var e0 = main.emission; e0.enabled = false; var mm = main.main; mm.loop = false; mm.duration = 1; main.GetComponent<ParticleSystemRenderer>().enabled = false;
            Color c = a.C("color", new Color(1, .55f, .15f)), c2 = a.C("color2", new Color(1, .85f, .4f));
            switch (name)
            {
                case "explosion": Explosion(root, c, a.F("big", 1)); break;
                case "shockwave": Ring(root, c2, a.F("size", 14), .8f); break;
                case "sparks": Sparks(root, c2, (int)a.F("count", 120), a.F("speed", 16)); break;
                case "feathers": Feathers(root, a.C("color", new Color(.86f, .84f, .8f)), a.C("color2", Color.white), (int)a.F("count", 80), a.F("speed", 8)); break;
                case "confetti": Confetti(root, (int)a.F("count", 300)); break;
                case "fireworks": Fireworks(root, c, c2, (int)a.F("count", 180)); break;
                case "smoke": Smoke(root, a.C("color", new Color(.15f, .15f, .17f, .5f)), a.F("rate", 14)); break;
                case "dust": Dust(root, a.C("color", new Color(.6f, .52f, .4f, .4f))); break;
                case "fire": Fire(root, c, c2, a.F("size", 1)); break;
                case "rain": Weather(root, "streak", new Color(.7f, .8f, 1, .35f), a.F("rate", 900), -26, 30, new Vector2(.03f, .9f)); break;
                case "snow": Weather(root, "soft", new Color(1, 1, 1, .85f), a.F("rate", 200), -2.2f, 30, new Vector2(.14f, .14f)); break;
                case "embers": Embers(root, c, a.F("rate", 40)); break;
                default: Debug.LogWarning("Unknown fx preset: " + name); break;
            }
            return root;
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
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = Mat(tex, add);
            return p;
        }
        static void Burst(ParticleSystem p, int n) { var e = p.emission; e.SetBursts(new[] { new ParticleSystem.Burst(0, (short)n) }); }
        static void Fade(ParticleSystem p, Color a, Color b, float inTo = 0)
        {
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(a, 0), new GradientColorKey(b, 1) },
                      inTo > 0 ? new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(1, inTo), new GradientAlphaKey(0, 1) } : new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, .4f), new GradientAlphaKey(0, 1) });
            var c = p.colorOverLifetime; c.enabled = true; c.color = g;
        }
        static void Grow(ParticleSystem p, float a, float b)
        {
            var s = p.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, AnimationCurve.EaseInOut(0, a, 1, b));
        }
        static void Sphere(ParticleSystem p, float radius)
        {
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Sphere; s.radius = radius;
        }
        static void Spin(ParticleSystem p, float deg)
        {
            var m = p.main; m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            var r = p.rotationOverLifetime; r.enabled = true; r.z = new ParticleSystem.MinMaxCurve(-deg * Mathf.Deg2Rad, deg * Mathf.Deg2Rad);
        }

        static void Explosion(GameObject root, Color c, float big)
        {
            var flash = Sys(root, "flash", "soft", true, .22f, new Vector2(12, 16) * big, Vector2.zero, new Color(1, .95f, .8f)); Burst(flash, 2); Grow(flash, .5f, 1.2f); Fade(flash, Color.white, c);
            var fb = Sys(root, "fireball", "puff", true, 1f, new Vector2(2.2f, 4.5f) * big, new Vector2(3, 11) * big, c); Burst(fb, 40); Sphere(fb, .8f * big); Grow(fb, .5f, 1.4f); Fade(fb, new Color(1, .85f, .45f), new Color(.8f, .15f, .02f)); Spin(fb, 90);
            var d = fb.limitVelocityOverLifetime; d.enabled = true; d.limit = 1.5f * big; d.dampen = .22f;
            var sm = Sys(root, "smoke", "puff", false, 3.2f, new Vector2(3, 6) * big, new Vector2(2, 7) * big, new Color(.12f, .11f, .11f, .75f)); Burst(sm, 26); Sphere(sm, 1f * big); Grow(sm, .5f, 1.7f); Fade(sm, new Color(.28f, .22f, .2f), new Color(.08f, .08f, .08f), .08f); Spin(sm, 40);
            var sd = sm.limitVelocityOverLifetime; sd.enabled = true; sd.limit = 1f * big; sd.dampen = .15f;
            var f = sm.main; f.gravityModifier = -.08f;
            Sparks(root, new Color(1, .75f, .3f), (int)(140 * big), 26 * big);
            Ring(root, new Color(1, .8f, .55f, .8f), 18 * big, .7f);
            var lg = new GameObject("flashLight"); lg.transform.SetParent(root.transform, false);
            var l = lg.AddComponent<Light>(); l.type = LightType.Point; l.color = c; l.range = 40 * big; l.intensity = 0;
        }

        static void Sparks(GameObject root, Color c, int n, float speed)
        {
            var p = Sys(root, "sparks", "streak", true, 1.3f, new Vector2(.05f, .16f), new Vector2(speed * .3f, speed), c * 3f); Burst(p, n); Sphere(p, .3f);
            var m = p.main; m.gravityModifier = .9f;
            var r = p.GetComponent<ParticleSystemRenderer>(); r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = .06f; r.lengthScale = 1.5f;
            Fade(p, Color.white, new Color(1, .35f, .05f));
        }

        static void Ring(GameObject root, Color c, float size, float life)
        {
            var p = Sys(root, "ring", "ring", true, life, new Vector2(1, 1), Vector2.zero, c, 4); Burst(p, 1);
            var m = p.main; m.startSize = size; m.startRotationX = Mathf.PI / 2; m.startRotation3D = true; m.startRotationX = Mathf.PI / 2;
            var r = p.GetComponent<ParticleSystemRenderer>(); r.alignment = ParticleSystemRenderSpace.World; r.renderMode = ParticleSystemRenderMode.Billboard;
            var s = p.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, new AnimationCurve(new Keyframe(0, .05f, 0, 4), new Keyframe(1, 1)));
            Fade(p, Color.white, c);
        }

        static void Feathers(GameObject root, Color a, Color b, int n, float speed)
        {
            var p = Sys(root, "feathers", "feather", false, 4.5f, new Vector2(.25f, .6f), new Vector2(speed * .3f, speed), Color.white, 1000); Burst(p, n); Sphere(p, .5f);
            var m = p.main; m.startColor = new ParticleSystem.MinMaxGradient(a, b); m.gravityModifier = .09f;
            Spin(p, 240);
            var d = p.limitVelocityOverLifetime; d.enabled = true; d.limit = 1.2f; d.dampen = .12f;
            var n2 = p.noise; n2.enabled = true; n2.strength = .9f; n2.frequency = .5f; n2.scrollSpeed = .3f;
            var c = p.colorOverLifetime; c.enabled = true;
            var g = new Gradient(); g.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, .8f), new GradientAlphaKey(0, 1) }); c.color = g;
        }

        static void Confetti(GameObject root, int n)
        {
            var p = Sys(root, "confetti", "square", false, 5f, new Vector2(.08f, .18f), new Vector2(6, 18), Color.white, 2000); Burst(p, n);
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Cone; s.angle = 35; s.rotation = new Vector3(-90, 0, 0);
            var m = p.main; m.gravityModifier = .35f;
            var g = new Gradient(); g.SetKeys(new[] { new GradientColorKey(new Color(1, .2f, .3f), 0), new GradientColorKey(new Color(1, .85f, .2f), .33f), new GradientColorKey(new Color(.2f, .8f, .5f), .66f), new GradientColorKey(new Color(.3f, .5f, 1), 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, 1) });
            m.startColor = new ParticleSystem.MinMaxGradient(g) { mode = ParticleSystemGradientMode.RandomColor };
            Spin(p, 500);
            var d = p.limitVelocityOverLifetime; d.enabled = true; d.limit = 4; d.dampen = .1f;
        }

        static void Fireworks(GameObject root, Color a, Color b, int n)
        {
            var p = Sys(root, "burst", "soft", true, 2f, new Vector2(.12f, .3f), new Vector2(6, 13), Color.white, 2000); Burst(p, n); Sphere(p, .1f);
            var m = p.main; m.startColor = new ParticleSystem.MinMaxGradient(a * 2, b * 2); m.gravityModifier = .25f;
            var d = p.limitVelocityOverLifetime; d.enabled = true; d.limit = 2; d.dampen = .08f;
            Fade(p, Color.white, Color.white);
            var t = p.trails; t.enabled = false;
            var fl = Sys(root, "flash", "soft", true, .25f, new Vector2(8, 10), Vector2.zero, Color.white); Burst(fl, 1); Fade(fl, Color.white, a);
        }

        static void Smoke(GameObject root, Color c, float rate)
        {
            var p = Sys(root, "smoke", "puff", false, 5f, new Vector2(1.5f, 3.5f), new Vector2(.6f, 2f), c, 600);
            var e = p.emission; e.rateOverTime = rate; var m = p.main; m.loop = true; m.duration = 10;
            Sphere(p, 1); Grow(p, .5f, 1.6f); Fade(p, Color.white, new Color(.6f, .6f, .6f), .15f); Spin(p, 30);
        }

        static void Dust(GameObject root, Color c)
        {
            var p = Sys(root, "dust", "puff", false, 2.2f, new Vector2(.8f, 2f), new Vector2(1, 5), c, 60); Burst(p, 26);
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Circle; s.radius = .8f; s.rotation = new Vector3(-90, 0, 0);
            Grow(p, .4f, 1.5f); Fade(p, Color.white, Color.white, .1f);
            var d = p.limitVelocityOverLifetime; d.enabled = true; d.limit = .6f; d.dampen = .2f;
        }

        static void Fire(GameObject root, Color a, Color b, float size)
        {
            var p = Sys(root, "fire", "puff", true, 1.1f, new Vector2(.7f, 1.6f) * size, new Vector2(2, 5) * size, a, 400);
            var e = p.emission; e.rateOverTime = 70; var m = p.main; m.loop = true; m.duration = 10;
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Cone; s.angle = 12; s.radius = .6f * size; s.rotation = new Vector3(-90, 0, 0);
            Grow(p, 1f, .15f); Fade(p, b, new Color(.7f, .1f, 0), .05f); Spin(p, 90);
            Embers(root, a, 14);
        }

        static void Embers(GameObject root, Color c, float rate)
        {
            var p = Sys(root, "embers", "soft", true, 3f, new Vector2(.04f, .12f), new Vector2(.5f, 3f), c * 2.5f, 500);
            var e = p.emission; e.rateOverTime = rate; var m = p.main; m.loop = true; m.duration = 10; m.gravityModifier = -.1f;
            Sphere(p, 3);
            var n = p.noise; n.enabled = true; n.strength = 1.2f; n.frequency = .6f;
            Fade(p, Color.white, new Color(1, .3f, .05f), .1f);
        }

        static void Weather(GameObject root, string tex, Color c, float rate, float vy, float area, Vector2 size)
        {
            var p = Sys(root, "weather", tex, false, 4f, new Vector2(size.x, size.x), Vector2.zero, c, 6000);
            var e = p.emission; e.rateOverTime = rate;
            var m = p.main; m.loop = true; m.duration = 10; m.startSize3D = true; m.startSizeX = size.x; m.startSizeY = size.y; m.startSizeZ = 1;
            var s = p.shape; s.enabled = true; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(area, .1f, area); s.position = new Vector3(0, 18, 0);
            var v = p.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
            v.x = new ParticleSystem.MinMaxCurve(-.6f, .6f); v.y = new ParticleSystem.MinMaxCurve(vy, vy); v.z = new ParticleSystem.MinMaxCurve(-.6f, .6f);
        }

        public static Material Mat(string tex, bool add)
        {
            string key = tex + (add ? "+" : "");
            if (Mats.TryGetValue(key, out var m) && m) return m;
            m = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")) { hideFlags = HideFlags.DontSave };
            m.SetTexture("_BaseMap", Texture(tex));
            m.SetFloat("_Surface", 1); m.SetFloat("_ZWrite", 0); m.SetFloat("_Cull", 0);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.SetOverrideTag("RenderType", "Transparent");
            if (add)
            {
                m.SetFloat("_Blend", 2);
                m.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.SrcAlpha); m.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.One);
                m.SetFloat("_SrcBlendAlpha", 1); m.SetFloat("_DstBlendAlpha", 1);
            }
            else
            {
                m.SetFloat("_Blend", 0);
                m.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.SrcAlpha); m.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetFloat("_SrcBlendAlpha", 1); m.SetFloat("_DstBlendAlpha", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            }
            m.renderQueue = 3000;
            return Mats[key] = m;
        }

        static Texture2D Texture(string name)
        {
            if (Tex.TryGetValue(name, out var t) && t) return t;
            const int S = 128;
            t = new Texture2D(S, S, TextureFormat.RGBA32, true) { hideFlags = HideFlags.DontSave, wrapMode = TextureWrapMode.Clamp };
            var px = new Color32[S * S];
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float u = (x + .5f) / S * 2 - 1, v = (y + .5f) / S * 2 - 1, r = Mathf.Sqrt(u * u + v * v), al;
                    switch (name)
                    {
                        case "ring": al = Mathf.Clamp01(1 - Mathf.Abs(r - .85f) / .13f); al *= al; break;
                        case "streak": al = Mathf.Clamp01(1 - Mathf.Abs(u) * 3) * Mathf.Clamp01(1 - Mathf.Abs(v)); break;
                        case "square": al = 1; break;
                        case "feather":
                            {
                                // A real feather: curved shaft, one wide and one narrow vane, a soft notched edge, down at the quill.
                                float fy = Mathf.Clamp01((v + 1) / 2), su = u - .16f * (fy - .5f) * (fy - .5f) * 4 + .08f;
                                float vane = su > 0 ? .2f : .13f, w = vane * Mathf.Pow(Mathf.Sin(Mathf.Clamp01((fy - .1f) / .9f) * Mathf.PI * .62f + .35f), .7f) * Mathf.Clamp01(fy * 5);
                                float rib = Mathf.Abs(su), notch = Mathf.PerlinNoise(fy * 9 + (su > 0 ? 3 : 11), .5f);
                                float edge = w * (notch < .3f ? .55f : 1) * (.9f + .1f * Mathf.PerlinNoise(fy * 60, su * 40));
                                float fine = .86f + .14f * Mathf.Sin((fy * 150 + rib * 90));
                                al = Mathf.Clamp01((edge - rib) * 40) * fine;
                                if (fy < .22f) al *= Mathf.Clamp01(Mathf.PerlinNoise(u * 34, v * 34) * 2.2f - .3f); // down
                                if (rib < .012f) al = 1;
                                break;
                            }
                        case "puff":
                            {
                                float n = Mathf.PerlinNoise(u * 2.3f + 7, v * 2.3f + 3) * .6f + Mathf.PerlinNoise(u * 5 + 2, v * 5 + 9) * .4f;
                                al = Mathf.Clamp01((1 - r) * 2.2f) * Mathf.Clamp01(n * 2.2f - .35f); break;
                            }
                        default: al = Mathf.Clamp01(1 - r); al *= al; break; // soft
                    }
                    px[y * S + x] = new Color(1, 1, 1, Mathf.Clamp01(al));
                }
            t.SetPixels32(px); t.Apply(true, false);
            return Tex[name] = t;
        }
    }
}
