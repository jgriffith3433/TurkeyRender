using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace TKShock.MV
{
    /// <summary>A set of broadcast graphics on one canvas: the screen, or the TV feed. Built by the compiler.</summary>
    public class MVGfx : MonoBehaviour
    {
        public RectTransform lower, ticker, phone;
        public Image lowerBar, lowerAccent, tickerBar, tickerLabelBar, phoneBar, bugBox;
        public TextMeshProUGUI lowerTitle, lowerSub, tickerText, tickerLabel, phoneText, bug, channel;
        public RawImage[] images = new RawImage[0];
        public void Clear()
        {
            lower.gameObject.SetActive(false); ticker.gameObject.SetActive(false); phone.gameObject.SetActive(false);
            bug.gameObject.SetActive(false); bugBox.gameObject.SetActive(false); channel.gameObject.SetActive(false);
            foreach (var i in images) i.gameObject.SetActive(false);
        }

        /// <summary>
        /// Puts each graphics canvas far enough from its camera for TMP text to draw. The canvas is Screen Space Camera, a plane in front of the lens; at
        /// 0.12 m the canvas is so small in the world that TMP's text stops rendering once plane distance times tan(fov/2) drops under about 0.05 (measured,
        /// `call gfxvariants`: tv_doc at 65 mm lost every line while its bars drew; a 115 mm lens needed 0.5 m, 230 mm 1 m). So the plane follows the lens:
        /// 0.08 / tan(fov/2), never under 0.12. Anything nearer the lens than that covers the graphics, as it would a real camera's lens: under 0.5 m below 80 mm.
        /// Called before every render (Capture) and on every gfx evaluation, so it is a pure function of the camera.
        /// </summary>
        public static void FitCanvases(MVStage st)
        {
            if (st == null || st.gfx == null) return;
            foreach (var g in st.gfx)
            {
                if (!g) continue;
                var c = g.GetComponentInParent<Canvas>(); if (!c || c.renderMode != RenderMode.ScreenSpaceCamera || !c.worldCamera) continue;
                float d = Mathf.Max(.12f, .08f / Mathf.Tan(Mathf.Clamp(c.worldCamera.fieldOfView, 1, 170) * .5f * Mathf.Deg2Rad));
                if (Mathf.Abs(c.planeDistance - d) > 1e-4f) c.planeDistance = d;
            }
        }
        public static MVStage Stage;   // the stage the last gfx evaluation drew on
    }

    /// <summary>Everything is read from the op's start and end, so graphics scrub backward like the rest.</summary>
    public class GfxDriver : Driver
    {
        static float Slide(float tl, float left, float len)
        {
            float a = Ease.Apply("out", tl / len), b = Ease.Apply("in", 1 - left / len);
            return a * (1 - b);
        }

        public override void Apply(double t, object binding)
        {
            var st = binding as MVStage; if (st == null) return;
            MVGfx.Stage = st; MVGfx.FitCanvases(st);
            foreach (var g in st.gfx) if (g) g.Clear();
            int img0 = 0, img1 = 0;
            foreach (var op in Ops)
            {
                if (t < op.start) break;
                if (t > op.end) continue;
                var a = op.a;
                bool onFeed = st.gfx.Length > 1 && a.S("on") == "feed";
                var g = onFeed ? st.gfx[1] : st.gfx[0]; if (!g) continue;
                float tl = (float)(t - op.start), left = (float)(op.end - t), s = Slide(tl, left, a.F("slide", .22f));
                var col = a.C("color", new Color(.78f, .06f, .12f));
                float width = ((RectTransform)g.transform).rect.width; if (width < 10) width = 1920;
                switch (op.kind)
                {
                    case "lower":
                        g.lower.gameObject.SetActive(true);
                        g.lower.anchoredPosition = new Vector2(Mathf.Lerp(-1100, 90, s), a.F("y", 150));
                        g.lowerBar.color = a.C("bar", new Color(.04f, .05f, .1f, .92f)); g.lowerAccent.color = col;
                        g.lowerTitle.text = a.S("title", ""); g.lowerSub.text = a.S("sub", "");
                        { var c = a.C("textColor", Color.white); g.lowerTitle.color = c; c.a = .85f; g.lowerSub.color = c; }
                        break;
                    case "ticker":
                        {
                            g.ticker.gameObject.SetActive(true);
                            g.ticker.anchoredPosition = new Vector2(0, Mathf.Lerp(-70, 0, s));
                            g.tickerBar.color = col;
                            var label = a.S("label", ""); bool hasLabel = label.Length > 0;
                            g.tickerLabelBar.gameObject.SetActive(hasLabel); g.tickerLabel.text = label;
                            if (hasLabel) g.tickerLabelBar.color = a.C("labelColor", new Color(.04f, .05f, .1f));
                            var one = a.S("text", "") + "     +++     ";
                            float w = Mathf.Max(g.tickerText.GetPreferredValues(one).x, 200);
                            var sb = new System.Text.StringBuilder();
                            for (int i = 0, n = Mathf.CeilToInt(width / w) + 2; i < n; i++) sb.Append(one);
                            g.tickerText.text = sb.ToString();
                            // Starts off the right edge, then loops on one copy of the text.
                            float x = width - a.F("speed", 260) * tl;
                            if (x < 0) x = -(-x % w);
                            g.tickerText.rectTransform.anchoredPosition = new Vector2(x, 0);
                            break;
                        }
                    case "bug":
                        g.bug.gameObject.SetActive(true); g.bug.text = a.S("text", "");
                        {
                            float fade = Mathf.Clamp01(tl / .2f) * Mathf.Clamp01(left / .2f) * a.F("alpha", .85f);
                            var c = a.C("textColor", Color.white); c.a = fade; g.bug.color = c;
                            g.bugBox.gameObject.SetActive(a.Col.ContainsKey("box"));
                            var b = a.C("box", Color.clear); b.a *= fade; g.bugBox.color = b;
                        }
                        break;
                    case "phone":
                        g.phone.gameObject.SetActive(true);
                        g.phone.anchoredPosition = new Vector2(0, Mathf.Lerp(-260, a.F("y", 120), s));
                        g.phoneBar.color = col; g.phoneText.text = a.S("text", ""); g.phoneText.color = a.C("textColor", Color.black);
                        g.phone.localScale = Vector3.one * (1 + .06f * Mathf.Abs(Mathf.Sin((float)Song.BeatAt(t) * Mathf.PI)) * a.F("throb", 1));
                        break;
                    case "channel":
                        g.channel.gameObject.SetActive(true); g.channel.text = a.S("text", "");
                        { var c = a.C("textColor", new Color(.3f, 1, .35f)); c.a = Mathf.Clamp01(left / .08f); g.channel.color = c; }
                        break;
                    case "image":
                        {
                            int i = onFeed ? img1++ : img0++;
                            if (i < g.images.Length && op.refs != null && op.refs.Length > 0)
                            {
                                var ri = g.images[i]; ri.gameObject.SetActive(true); ri.texture = op.refs[0] as Texture;
                                var r = ri.rectTransform; var p = a.V("pos", new Vector3(.5f, .5f)); r.anchorMin = r.anchorMax = new Vector2(p.x, p.y);
                                r.anchoredPosition = Vector2.zero; var sz = a.V("size", new Vector3(400, 225)); r.sizeDelta = new Vector2(sz.x, sz.y);
                                var c = a.C("color", Color.white); c.a *= Mathf.Clamp01(tl / a.F("in", .15f)) * Mathf.Clamp01(left / a.F("out", .15f)); ri.color = c;
                            }
                            break;
                        }
                }
            }
        }
    }
}
