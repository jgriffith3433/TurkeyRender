using System.IO;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace TKShock.MV.EditorTools
{
    /// <summary>An inspection camera for Claude: look at the set from anywhere, with work lights if wanted, without touching the video.</summary>
    public static class Peek
    {
        [BridgeCommand("peek")]
        static object Run(JObject m)
        {
            int w = (int?)m["w"] ?? 960, h = (int?)m["h"] ?? 540;
            var go = new GameObject("__peek") { hideFlags = HideFlags.DontSave };
            var cam = go.AddComponent<Camera>();
            var data = go.AddComponent<UniversalAdditionalCameraData>();
            data.renderPostProcessing = (bool?)m["post"] ?? false;
            var p = (JArray)m["pos"];
            go.transform.position = new Vector3((float)p[0], (float)p[1], (float)p[2]);
            if (m["look"] is JArray l) go.transform.LookAt(new Vector3((float)l[0], (float)l[1], (float)l[2]));
            cam.fieldOfView = (float?)m["fov"] ?? 60; cam.nearClipPlane = .05f; cam.farClipPlane = 500;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(.25f, .05f, .3f);

            Shader.SetGlobalFloat("_MV_InsertMix", 0); Shader.SetGlobalFloat("_MV_Bars", 0);
            bool work = (bool?)m["work"] ?? true;
            var keepMode = RenderSettings.ambientMode; var keepAmb = RenderSettings.ambientLight; var keepFog = RenderSettings.fog;
            if (work) { RenderSettings.ambientMode = AmbientMode.Flat; RenderSettings.ambientLight = Color.white * ((float?)m["ambient"] ?? .3f); RenderSettings.fog = false; }
            var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rt; cam.Render(); cam.targetTexture = null;
            RenderSettings.ambientMode = keepMode; RenderSettings.ambientLight = keepAmb; RenderSettings.fog = keepFog;
            var a = RenderTexture.active; RenderTexture.active = rt;
            var tex = new Texture2D(w, h, TextureFormat.RGB24, false); tex.ReadPixels(new Rect(0, 0, w, h), 0, 0); tex.Apply();
            RenderTexture.active = a;
            var path = Path.Combine(Bridge.Root, "captures", (string)m["name"] ?? "peek.png");
            File.WriteAllBytes(path, tex.EncodeToPNG());
            Object.DestroyImmediate(go); Object.DestroyImmediate(tex); rt.Release(); Object.DestroyImmediate(rt);
            return path;
        }

        /// <summary>What the corner camera is sending to the screens right now.</summary>
        [BridgeCommand("feedrt")]
        static object FeedRt(JObject m)
        {
            var go = GameObject.Find("FeedCamera"); var cam = go.GetComponent<Camera>(); cam.Render();
            var rt = cam.targetTexture; var a = RenderTexture.active; RenderTexture.active = rt;
            var tex = new Texture2D(rt.width, rt.height, TextureFormat.RGB24, false); tex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0); tex.Apply();
            RenderTexture.active = a;
            var path = System.IO.Path.Combine(Bridge.Root, "captures", "feed.png"); System.IO.File.WriteAllBytes(path, tex.EncodeToPNG());
            var info = new System.Collections.Generic.List<string>();
            foreach (var tv in Object.FindObjectsByType<MVTv>(FindObjectsSortMode.None))
            {
                var pb = new MaterialPropertyBlock(); tv.screen.GetPropertyBlock(pb);
                info.Add(tv.name + " en=" + tv.screen.enabled + " mix=" + pb.GetFloat("_FeedMix") + " bright=" + pb.GetFloat("_Bright") + " feed=" + (tv.feed ? tv.feed.name : "null") + " tex=" + (pb.GetTexture("_Feed") ? pb.GetTexture("_Feed").name : "null"));
            }
            return new { path, pos = go.transform.position.ToString(), rot = go.transform.eulerAngles.ToString(), rt.width, rt.height, info };
        }

        [BridgeCommand("look")]
        static object Look(JObject m)
        {
            Capture.At((double)m["t"], 64, 36);
            var o = new JObject();
            foreach (var kv in PostDriver.Last) if (Mathf.Abs(kv.Value) > .0001f) o[kv.Key] = System.Math.Round(kv.Value, 3);
            return o;
        }

        /// <summary>How long a frame really takes at a size: timeline evaluation plus render.</summary>
        [BridgeCommand("bench")]
        static object Bench(JObject m)
        {
            int w = (int?)m["w"] ?? 1280, h = (int?)m["h"] ?? 720, n = (int?)m["n"] ?? 12;
            if ((bool?)m["final"] == true) Quality.Set(false);
            var res = new JObject();
            foreach (var t in m["t"])
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                for (int i = 0; i < n; i++) Capture.At((double)t + i / 30.0, w, h);
                res[((double)t).ToString("0")] = System.Math.Round(sw.ElapsedMilliseconds / (double)n, 1);
            }
            if ((bool?)m["final"] == true) Quality.Set(true);
            return res;
        }

        /// <summary>Where a person's body is at a moment, so shots can be framed without guessing.</summary>
        [BridgeCommand("bones")]
        static object Bones(JObject m)
        {
            Capture.At((double)m["t"], 64, 36);
            var o = new JObject();
            foreach (var an in Object.FindObjectsByType<Animator>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (!an.isHuman || an.transform.root.name != "_Generated") continue;
                foreach (var b in new[] { HumanBodyBones.Head, HumanBodyBones.Neck, HumanBodyBones.Chest, HumanBodyBones.Spine, HumanBodyBones.Hips, HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftHand, HumanBodyBones.RightHand, HumanBodyBones.LeftFoot })
                {
                    var t = an.GetBoneTransform(b); if (!t) continue;
                    var p = t.position;
                    o[an.transform.parent.name + "." + b] = $"{p.x:0.00} {p.y:0.00} {p.z:0.00}";
                }
            }
            foreach (var r in Object.FindObjectsByType<SkinnedMeshRenderer>(FindObjectsSortMode.None))
                if (r.transform.root.name == "_Generated" && r.sharedMesh && r.sharedMesh.vertexCount > 20000)
                    o["skin_" + r.name] = $"root {(r.rootBone ? r.rootBone.name : "none")} bounds {r.bounds.center} {r.bounds.size} update {r.updateWhenOffscreen} quality {r.quality}";
            return o;
        }

        [BridgeCommand("scene")]
        static object Scene(JObject m)
        {
            var c = Camera.main; var br = c ? c.GetComponent<Unity.Cinemachine.CinemachineBrain>() : null;
            return new
            {
                camera = c ? new[] { c.transform.position.x, c.transform.position.y, c.transform.position.z, c.transform.eulerAngles.x, c.transform.eulerAngles.y, c.fieldOfView } : null,
                live = br != null && br.ActiveVirtualCamera != null ? br.ActiveVirtualCamera.Name : null,
            };
        }
    }
}
