using UnityEngine;

namespace TKShock.MV
{
    /// <summary>A television: a glowing screen and the light it throws into the room.</summary>
    public class MVTv : MonoBehaviour
    {
        public Renderer screen;
        public Light[] lights = new Light[0];
        public float[] lightScale = new float[0];
        public RenderTexture feed;
        public bool lead; // the TV that lights footage cut into the video
        public Camera feedCamera; // the TV that owns the feed drives this camera
        public MVStage stage;
    }

    public class TvDriver : Driver
    {
        static readonly int Bright = Shader.PropertyToID("_Bright"), Static = Shader.PropertyToID("_Static"), Change = Shader.PropertyToID("_Change"),
            Motion = Shader.PropertyToID("_Motion"), Mask = Shader.PropertyToID("_Mask"), Tint = Shader.PropertyToID("_Tint"), FeedMix = Shader.PropertyToID("_FeedMix");
        MaterialPropertyBlock _mpb;

        // The one feed camera looks through whichever show is on: the show's own camera actor, or the corner camera.
        static void DriveFeed(MVTv tv, string show, double t)
        {
            MVActor src = null;
            if (show != null && tv.stage != null)
                foreach (var s in tv.stage.shows) if (s.name == show) { src = MVActor.Named(s.cam); break; }
            if (!src) src = MVActor.Named("feedcam");
            if (!src) return;
            src.Driver?.Eval(t);
            tv.feedCamera.transform.SetPositionAndRotation(src.transform.position, src.transform.rotation);
            tv.feedCamera.fieldOfView = src.fov;
        }

        static float H(float x) { float s = Mathf.Sin(x * 12.9898f) * 43758.5453f; return s - Mathf.Floor(s); }
        static Color Hue(float h) => Color.HSVToRGB(h - Mathf.Floor(h), .55f, 1);

        public override void Apply(double t, object binding)
        {
            var tv = (binding as MVActor)?.GetComponent<MVTv>(); if (tv == null) return;
            if (_mpb == null) _mpb = new MaterialPropertyBlock();
            float bright = 1, stat = 0, mult = 1, seed = 0, feed = 0;
            string show = null; double showAt = 0; float flip = .12f;
            Color tint = Color.white, mask = Color.white;
            Texture clipTex = null;
            foreach (var op in Ops)
            {
                double tl = t - op.start; if (tl < 0) break;
                var a = op.a;
                if (op.kind == "tv")
                {
                    float k = Ease.Apply(a.S("ease"), (float)(tl / op.Dur));
                    if (a.Has("bright")) bright = Mathf.LerpUnclamped(bright, a.F("bright"), k);
                    if (a.Has("static")) stat = Mathf.Lerp(stat, a.F("static"), k);
                    if (a.Has("feed")) feed = Mathf.Lerp(feed, a.F("feed"), k);
                    if (a.Has("tint")) tint = Color.Lerp(tint, a.C("tint", tint), k);
                    if (a.Has("mask")) mask = Color.Lerp(mask, a.C("mask", mask), k);
                    if (a.Has("show"))
                    {
                        show = a.S("show"); showAt = op.start; flip = a.F("flip", .12f);
                        if (string.IsNullOrEmpty(show)) { show = null; feed = 0; stat = Mathf.Max(stat, a.F("snow", 1)); }
                        else feed = 1;
                    }
                }
                else if (op.kind == "tvclip")
                {
                    // Footage on the screen, chosen by scene time.
                    var name = a.S("clip"); int n = InsertCache.Count(name);
                    if (n > 0)
                    {
                        int period = Mathf.Max(1, 2 * n - 2), i = (int)(tl * a.F("fps", 16)) % period;
                        clipTex = InsertCache.Get(name, i >= n ? period - i : i); feed = 1;
                    }
                }
                else if (tl <= op.Dur)
                {
                    float every = a.F("every", 1);
                    double b = (Song.BeatAt(t) - Song.BeatAt(op.start)) / every;
                    float frac = (float)(b - System.Math.Floor(b));
                    if (op.kind == "tvflash")
                    {
                        float amt = a.F("amount", 3) * Mathf.Pow(1 - frac, a.F("sharp", 3));
                        mult *= Mathf.Max(0, a.F("low", 1) + amt);
                    }
                    else if (op.kind == "tvchange") // the picture cuts: new image, new colour on the walls
                    {
                        float sd = (float)System.Math.Floor(b) + op.index * 17;
                        if (a.F("keep") <= 0) seed = sd; // keep: only the level moves, no new picture
                        if (mask == Color.white && a.F("keep") <= 0) tint = Hue(H(sd)); // a masked TV stays its own colour
                        mult *= Mathf.Lerp(a.F("min", .5f), a.F("max", 2f), H(sd + 3));
                    }
                    else if (op.kind == "tvreact")
                        mult *= a.F("floor", 1) + Song.Env(a.S("band", "kick"), t) * a.F("gain", 3);
                }
            }
            float final = bright * mult;
            if (show != null && flip > 0) stat = Mathf.Max(stat, 1 - (float)(t - showAt) / flip);
            if (tv.feedCamera) DriveFeed(tv, show, t);
            if (tv.screen)
            {
                tv.screen.GetPropertyBlock(_mpb);
                _mpb.SetFloat(Bright, Mathf.Sqrt(Mathf.Max(0, final)) * 1.5f); _mpb.SetFloat(Static, stat); _mpb.SetFloat(Change, seed); _mpb.SetFloat(FeedMix, feed);
                _mpb.SetFloat(Motion, (float)Song.Warp(t)); _mpb.SetColor(Mask, mask); _mpb.SetColor(Tint, tint);
                if (clipTex) _mpb.SetTexture("_Feed", clipTex); else if (tv.feed) _mpb.SetTexture("_Feed", tv.feed);
                tv.screen.SetPropertyBlock(_mpb);
            }
            var col = tint * mask; col.a = 1;
            if (tv.lead) { MVClock.TvColor = col; MVClock.TvLevel = final; }
            for (int i = 0; i < tv.lights.Length; i++)
                if (tv.lights[i]) { tv.lights[i].color = col; tv.lights[i].intensity = final * tv.lightScale[i]; }
        }
    }
}
