using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;

namespace TKShock.MV.EditorTools
{
    /// <summary>The broadcast half of the compiler: on-screen graphics, shows, doors.</summary>
    public partial class ScoreCompiler
    {
        /// <summary>A lower third, ticker, bug, phone banner and channel number, all off until a gfx cue shows them.</summary>
        MVGfx MakeGfx(Transform canvas)
        {
            var root = new GameObject("Gfx", typeof(RectTransform)); root.transform.SetParent(canvas, false);
            var rr = (RectTransform)root.transform; rr.anchorMin = Vector2.zero; rr.anchorMax = Vector2.one; rr.offsetMin = rr.offsetMax = Vector2.zero;
            var g = root.AddComponent<MVGfx>();
            RectTransform Box(string n, Transform p, Vector2 amin, Vector2 amax, Vector2 pivot, Vector2 pos, Vector2 size)
            {
                var go = new GameObject(n, typeof(RectTransform)); go.transform.SetParent(p, false);
                var r = (RectTransform)go.transform; r.anchorMin = amin; r.anchorMax = amax; r.pivot = pivot; r.anchoredPosition = pos; r.sizeDelta = size; return r;
            }
            Image Fill(RectTransform r, Color c) { var i = r.gameObject.AddComponent<Image>(); i.color = c; i.raycastTarget = false; return i; }
            TextMeshProUGUI Txt(RectTransform r, float size, TextAlignmentOptions al, FontStyles st)
            {
                var t = r.gameObject.AddComponent<TextMeshProUGUI>(); t.fontSize = size; t.alignment = al; t.fontStyle = st; t.textWrappingMode = TextWrappingModes.NoWrap; t.overflowMode = TextOverflowModes.Overflow; t.raycastTarget = false; return t;
            }
            var v0 = Vector2.zero;
            g.lower = Box("Lower", root.transform, v0, v0, v0, new Vector2(90, 150), new Vector2(980, 130));
            g.lowerBar = Fill(Box("Bar", g.lower, v0, Vector2.one, v0, v0, v0), Color.black);
            g.lowerAccent = Fill(Box("Accent", g.lower, v0, new Vector2(0, 1), v0, v0, new Vector2(16, 0)), Color.red);
            g.lowerTitle = Txt(Box("Title", g.lower, new Vector2(0, .42f), Vector2.one, new Vector2(0, .5f), new Vector2(40, 0), new Vector2(-50, 0)), 52, TextAlignmentOptions.Left, FontStyles.Bold);
            g.lowerSub = Txt(Box("Sub", g.lower, v0, new Vector2(1, .42f), new Vector2(0, .5f), new Vector2(40, 0), new Vector2(-50, 0)), 30, TextAlignmentOptions.Left, FontStyles.Normal);
            g.ticker = Box("Ticker", root.transform, v0, new Vector2(1, 0), v0, v0, new Vector2(0, 62));
            g.tickerBar = Fill(Box("Bar", g.ticker, v0, Vector2.one, v0, v0, v0), Color.red);
            var clip = Box("Clip", g.ticker, v0, Vector2.one, v0, v0, v0); clip.gameObject.AddComponent<RectMask2D>();
            g.tickerText = Txt(Box("Text", clip, new Vector2(0, .5f), new Vector2(0, .5f), new Vector2(0, .5f), v0, new Vector2(100, 60)), 36, TextAlignmentOptions.Left, FontStyles.Bold);
            g.tickerLabelBar = Fill(Box("LabelBar", g.ticker, v0, new Vector2(0, 1), v0, v0, new Vector2(260, 0)), Color.black);
            g.tickerLabel = Txt(Box("Label", g.tickerLabelBar.rectTransform, v0, Vector2.one, new Vector2(.5f, .5f), v0, v0), 34, TextAlignmentOptions.Center, FontStyles.Bold);
            g.phone = Box("Phone", root.transform, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 120), new Vector2(1240, 150));
            g.phoneBar = Fill(Box("Bar", g.phone, v0, Vector2.one, v0, v0, v0), Color.yellow);
            g.phoneText = Txt(Box("Text", g.phone, v0, Vector2.one, new Vector2(.5f, .5f), v0, v0), 96, TextAlignmentOptions.Center, FontStyles.Bold);
            g.phoneText.color = Color.black;
            var bugAt = new Vector2(-70, 96); var corner = new Vector2(1, 0);
            g.bugBox = Fill(Box("BugBox", root.transform, corner, corner, corner, bugAt + new Vector2(16, -10), new Vector2(240, 84)), Color.clear);
            g.bug = Txt(Box("Bug", root.transform, corner, corner, corner, bugAt, new Vector2(420, 64)), 54, TextAlignmentOptions.Right, FontStyles.Bold);
            g.channel = Txt(Box("Channel", root.transform, Vector2.one, Vector2.one, Vector2.one, new Vector2(-80, -70), new Vector2(520, 130)), 110, TextAlignmentOptions.Right, FontStyles.Bold);
            var imgs = new List<RawImage>();
            var mid = new Vector2(.5f, .5f);
            for (int i = 0; i < 4; i++) { var ri = Box("Image" + i, root.transform, mid, mid, mid, v0, new Vector2(400, 225)).gameObject.AddComponent<RawImage>(); ri.raycastTarget = false; imgs.Add(ri); }
            g.images = imgs.ToArray();
            g.Clear();
            return g;
        }

        /// <summary>
        /// The score's "shows": each a named picture for {"tv":"tv1","show":"news"}. "cam" is an actor to look through, or
        /// "pos"/"rot"/"fov" make one, relative to the actor in "set". "lights" belong to the set (named news.key) and move with it.
        /// </summary>
        void MakeShows()
        {
            var list = new List<ShowInfo>();
            foreach (var kv in (_score["shows"] as JObject) ?? new JObject())
            {
                var d = (JObject)kv.Value;
                _actors.TryGetValue((string)d["set"] ?? "", out var set);
                if (d["set"] != null && !set) _warn.Add($"show {kv.Key}: no actor '{d["set"]}'");
                var at = set ? set.transform : _root;
                var info = new ShowInfo { name = kv.Key, cam = (string)d["cam"], label = (string)d["label"], channel = (int?)d["channel"] ?? 0 };
                if (info.cam == null && d["pos"] != null)
                {
                    info.cam = "showcam_" + kv.Key;
                    var go = new GameObject(info.cam); go.transform.SetParent(at, false);
                    go.transform.localPosition = V(d["pos"], Vector3.zero); go.transform.localEulerAngles = V(d["rot"], Vector3.zero);
                    var a = go.AddComponent<MVActor>(); a.basePos = go.transform.localPosition; a.baseEuler = go.transform.localEulerAngles; a.fov = (float?)d["fov"] ?? 40;
                    _actors[info.cam] = a;
                }
                list.Add(info);
                foreach (var lk in (d["lights"] as JObject) ?? new JObject())
                {
                    var o = (JObject)lk.Value;
                    var go = new GameObject("light_" + kv.Key + "." + lk.Key); go.transform.SetParent(at, false);
                    go.transform.localPosition = V(o["pos"], Vector3.up * 5); go.transform.localEulerAngles = V(o["rot"], new Vector3(50, 0, 0));
                    var l = go.AddComponent<Light>();
                    l.type = (string)o["type"] == "spot" ? LightType.Spot : (string)o["type"] == "directional" ? LightType.Directional : LightType.Point;
                    l.range = (float?)o["range"] ?? 14; l.spotAngle = (float?)o["angle"] ?? 60;
                    if ((bool?)o["shadows"] == true) l.shadows = LightShadows.Soft;
                    var c = Col(o["color"], Color.white); float i = (float?)o["intensity"] ?? 1;
                    l.color = c; l.intensity = i;
                    _stage.lights = Append(_stage.lights, l); _stage.lightNames = Append(_stage.lightNames, kv.Key + "." + lk.Key);
                    _stage.lightColors = Append(_stage.lightColors, c); _stage.lightIntensities = Append(_stage.lightIntensities, i);
                }
            }
            _stage.shows = list.ToArray();
            foreach (var kv in (_score["actors"] as JObject) ?? new JObject())
                if (((JObject)kv.Value)["portal"] is JObject p) MakeDoor(kv.Key, _actors[kv.Key], p);
        }

        static T[] Append<T>(T[] a, T x) { var r = new T[a.Length + 1]; a.CopyTo(r, 0); r[a.Length] = x; return r; }

        const int DoorLayer = 29;

        void CueSound(JObject c, double t)
        {
            var name = c["sfx"] is JArray arr ? (string)arr[Mathf.Abs((int)(t * 1000)) % arr.Count] : (string)c["sfx"]; // a list: a variant picked by time
            Sfx(name, c["sfxAt"] != null ? Add(t, (string)c["sfxAt"]) : t, (float?)c["sfxVolume"] ?? (float?)c["volume"] ?? 1);
        }

        bool GfxCue(JObject c, double t, double len)
        {
            var a = ArgsOf(c); string kind = (string)c["gfx"];
            if (c["on"] != null) a["on"] = c["on"];
            if (c["text"] != null) a["text"] = c["text"]; // ArgsOf leaves it out: it names the text cue
            var refs = new UnityEngine.Object[0];
            if (kind == "image")
            {
                var tex = AssetDatabase.LoadAssetAtPath<Texture>((string)c["path"]);
                if (!tex) { _warn.Add("no image at " + c["path"]); return false; }
                refs = new UnityEngine.Object[] { tex };
            }
            Op(_gfx, kind, t, len, a, refs);
            return true;
        }

        /// <summary>A channel change: a burst of snow, then the number. On the screen, or with "on":"tv1" only on that TV.</summary>
        void FlipCue(JObject c, double t, double len)
        {
            var label = c["flip"].Type == JTokenType.String ? (string)c["flip"] : "CH " + c["flip"];
            var a = new JObject { ["text"] = label };
            double hold = c["hold"] != null ? Dur(c["hold"], t, 1) : len * 4;
            var on = (string)c["on"];
            if (on != null && _actors.TryGetValue(on, out var tv) && tv.GetComponent<MVTv>())
            {
                var tr = TvLane(on);
                Op(tr, "tv", t, .01, new JObject { ["static"] = 1 });
                Op(tr, "tv", t + len, .01, new JObject { ["static"] = 0 });
                a["on"] = "feed";
            }
            else Op(_post, "pulse", t, len, new JObject { ["snow"] = (float?)c["snow"] ?? 1, ["sharp"] = (float?)c["sharp"] ?? .35f });
            Op(_gfx, "channel", t, hold, a);
        }

        /// <summary>"portal":{"offset":[x,y,z],"turn":deg,"res":[w,h]} on a quad: the quad becomes a doorway to the place offset from it.</summary>
        void MakeDoor(string name, MVActor a, JObject p)
        {
            var view = a.GetComponentInChildren<Renderer>(true);
            if (!view) { _warn.Add("portal " + name + " has nothing to draw on"); return; }
            var res = V2(p["res"], new Vector2(960, 540));
            string rtPath = Gen + "/Door_" + name + ".renderTexture", matPath = Gen + "/Door_" + name + ".mat";
            var rt = AssetDatabase.LoadAssetAtPath<RenderTexture>(rtPath);
            if (rt && (rt.width != (int)res.x || rt.height != (int)res.y)) { AssetDatabase.DeleteAsset(rtPath); rt = null; }
            if (!rt) { rt = new RenderTexture((int)res.x, (int)res.y, 24, RenderTextureFormat.ARGB32); AssetDatabase.CreateAsset(rt, rtPath); }
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            bool mirror = (bool?)p["mirror"] == true;
            if (!mat) { mat = new Material(Shader.Find(mirror ? "MV/FloorMirror" : "MV/DoorPortal")); AssetDatabase.CreateAsset(mat, matPath); }
            mat.SetTexture("_Portal", rt); mat.SetFloat("_Gain", (float?)p["gain"] ?? 1); if (mirror) { mat.SetFloat("_Min", (float?)p["min"] ?? .12f); mat.SetFloat("_Max", (float?)p["max"] ?? .62f); mat.SetFloat("_Soft", (float?)p["soft"] ?? .0022f); }
            EditorUtility.SetDirty(mat);
            view.sharedMaterial = mat; view.shadowCastingMode = ShadowCastingMode.Off;
            view.gameObject.layer = DoorLayer; // a door never sees itself, so a door into its own room can't feed back
            var cg = new GameObject("DoorCamera_" + name); cg.transform.SetParent(_root, false);
            var c = cg.AddComponent<Camera>(); c.targetTexture = rt; c.nearClipPlane = .05f; c.farClipPlane = 900; c.depth = -11; c.enabled = false; c.cullingMask = ~(1 << DoorLayer);
            var ud = cg.AddComponent<UniversalAdditionalCameraData>(); ud.renderPostProcessing = false; ud.antialiasing = AntialiasingMode.None; ud.renderShadows = (bool?)p["shadows"] ?? false;
            var d = a.gameObject.AddComponent<MVDoor>(); d.cam = c; d.view = view; d.offset = V(p["offset"], Vector3.zero); d.turn = (float?)p["turn"] ?? 0; d.mirror = mirror;
        }
    }
}
