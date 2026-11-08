using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.UI;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// The style and format libraries. One line picks each ("style" and "format" in score.json, or "inherit" and "format" in a video's
    /// style.json) and they lay down under everything the video says, so swapping one never touches a shot. A style adds cues at the
    /// start of the score: grade, sky, steps, whatever is in "cues". A format sets the frame: aspect, and how far to open every lens for it.
    /// </summary>
    public partial class ScoreCompiler
    {
        JObject _style, _format; float _fovScale = 1;

        static JObject Lib(string kind, string name)
        {
            var dir = Path.Combine(Bridge.Root, "library", kind);
            var f = Path.Combine(dir, name + ".json");
            if (File.Exists(f)) return JObject.Parse(File.ReadAllText(f));
            var have = Directory.Exists(dir) ? string.Join(", ", Directory.GetFiles(dir, "*.json").Select(Path.GetFileNameWithoutExtension)) : "";
            throw new System.Exception($"no {kind} called {name}. Have: {have}");
        }

        void ApplyLibrary()
        {
            var ownFile = Path.Combine(Video.Dir, "style.json");
            var own = File.Exists(ownFile) ? JObject.Parse(File.ReadAllText(ownFile)) : null;
            string styleName = (string)_score["style"] ?? (string)own?["inherit"], formatName = (string)_score["format"] ?? (string)own?["format"];
            if (styleName == null && formatName == null && own == null) return;

            _style = styleName != null ? Lib("styles", styleName) : new JObject();
            if (own != null) foreach (var key in new[] { "grade", "sky", "type", "lens" }) // the video's own file is stronger, key by key
                if (own[key] is JObject o) { if (!(_style[key] is JObject d)) _style[key] = d = new JObject(); foreach (var kv in o) d[kv.Key] = kv.Value; }
            if (own?["steps"] != null) _style["steps"] = own["steps"];

            var head = new JArray();
            if (_style["grade"] is JObject g) head.Add(new JObject { ["at"] = 0, ["grade"] = g.DeepClone() });
            if (_style["sky"] is JObject s) head.Add(new JObject { ["at"] = 0, ["sky"] = s.DeepClone() });
            if (_style["steps"] != null && (float)_style["steps"] > 0) head.Add(new JObject { ["at"] = 0, ["steps"] = _style["steps"], ["for"] = (double)_song.duration });
            if (_style["cues"] is JArray more) foreach (var c in more) head.Add(c.DeepClone());
            if (!(_score["cues"] is JArray all)) _score["cues"] = all = new JArray();
            for (int i = head.Count - 1; i >= 0; i--) all.Insert(0, head[i]);

            if (formatName != null) _format = Lib("formats", formatName);
            var aspect = own?["aspect"] ?? _format?["aspect"];
            float a = aspect is JArray r ? (float)r[0] / (float)r[1] : 16f / 9;
            _fovScale = (float?)own?["fovScale"] ?? (float?)_format?["fovScale"] ?? (a < 1 ? 1.3f : 1);
        }

        /// <summary>A format that isn't 16:9 keeps its type the same size against the short side of the frame.</summary>
        void ApplyCanvas()
        {
            var aspect = (_format?["aspect"] as JArray);
            if (aspect == null) return;
            float a = (float)aspect[0] / (float)aspect[1];
            var sc = _stage.GetComponentInChildren<CanvasScaler>(true); if (!sc) return;
            sc.referenceResolution = a < 1 ? new Vector2(1080, 1920) : new Vector2(1920, 1080);
            sc.matchWidthOrHeight = a < 1 ? 0 : .5f;
        }

        /// <summary>Under every shot: the format's lens scale, the style's aperture and handheld.</summary>
        void StyleShot(JObject s)
        {
            if (_fovScale != 1)
            {
                s["fov"] = Mathf.Clamp(((float?)s["fov"] ?? 40) * _fovScale, 2, 150);
                if (s["fovTo"] != null) s["fovTo"] = Mathf.Clamp((float)s["fovTo"] * _fovScale, 2, 150);
            }
            if (_style?["lens"] is JObject l)
            {
                if (l["aperture"] != null) s["aperture"] = l["aperture"];
                else if (l["apertureScale"] != null && s["aperture"] != null) s["aperture"] = Mathf.Max(.8f, (float)s["aperture"] * (float)l["apertureScale"]);
                if (s["handheld"] == null && l["handheld"] != null) s["handheld"] = l["handheld"];
            }
        }

        /// <summary>The style's type treatment, under what the cue says. "caps":1 sets it in capitals.</summary>
        JObject TypeCue(JObject c)
        {
            if (!(_style?["type"] is JObject t)) return c;
            var o = (JObject)c.DeepClone();
            foreach (var kv in t) if (kv.Key != "caps" && o[kv.Key] == null) o[kv.Key] = kv.Value;
            if ((bool?)t["caps"] == true) o["text"] = ((string)o["text"]).ToUpperInvariant();
            return o;
        }
    }
}
