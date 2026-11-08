// Dry run for the render farm (TKShock/Director/docs/render-farm.md): does a Unity editor started with -batchmode but
// WITHOUT -nographics render a camera into a RenderTexture, read the pixels back, and pipe raw frames into ffmpeg the way
// Transport.cs Capture does? Writes PROBE_OUT/frame-<n>.png, PROBE_OUT/probe.mp4 and PROBE_OUT/result.json.
using System;
using System.Diagnostics;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class HeadlessProbe
{
    public static void Run()
    {
        string outDir = Environment.GetEnvironmentVariable("PROBE_OUT") ?? Path.Combine(Application.dataPath, "..", "out");
        Directory.CreateDirectory(outDir);
        var sb = new System.Text.StringBuilder();
        void log(string s) { UnityEngine.Debug.Log("[probe] " + s); sb.Append(s).Append('\n'); }
        log("batchMode=" + Application.isBatchMode + " graphicsDeviceType=" + SystemInfo.graphicsDeviceType + " device=" + SystemInfo.graphicsDeviceName + " shaderLevel=" + SystemInfo.graphicsShaderLevel);

        // A scene like a shot: a lit cube, a floor, a camera. Built in code so the probe needs no scene file.
        var camGo = new GameObject("Main Camera"); var cam = camGo.AddComponent<Camera>(); camGo.tag = "MainCamera";
        cam.transform.position = new Vector3(0, 1.5f, -4); cam.transform.LookAt(new Vector3(0, 0.5f, 0));
        cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.1f, 0.2f, 0.4f);
        var light = new GameObject("Sun").AddComponent<Light>(); light.type = LightType.Directional; light.transform.rotation = Quaternion.Euler(50, -30, 0); light.shadows = LightShadows.Soft;
        var floor = GameObject.CreatePrimitive(PrimitiveType.Plane); floor.transform.localScale = Vector3.one * 2;
        var cube = GameObject.CreatePrimitive(PrimitiveType.Cube); cube.transform.position = new Vector3(0, 0.5f, 0);
        var mat = new Material(Shader.Find("Standard")); mat.color = new Color(0.9f, 0.3f, 0.2f); cube.GetComponent<Renderer>().sharedMaterial = mat;

        int w = 640, h = 360, frames = 30;
        var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32) { antiAliasing = 1 };
        var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
        byte[] Frame(int i)
        {
            cube.transform.rotation = Quaternion.Euler(0, i * 12f, 0); // the "timeline": a pose per frame
            var old = cam.targetTexture; cam.targetTexture = rt; cam.Render(); cam.targetTexture = old;
            var a = RenderTexture.active; RenderTexture.active = rt; tex.ReadPixels(new Rect(0, 0, w, h), 0, 0, false); tex.Apply(false); RenderTexture.active = a;
            return tex.GetRawTextureData();
        }

        // 1. Not black, and the same frame twice is byte-identical (determinism within one editor).
        var f0 = Frame(0); var f0b = Frame(0);
        long sum = 0; foreach (var b in f0) sum += b; double mean = (double)sum / f0.Length;
        bool same = f0.Length == f0b.Length; if (same) for (int i = 0; i < f0.Length; i++) if (f0[i] != f0b[i]) { same = false; break; }
        log($"frame0 mean={mean:0.0} (0 = black) repeatable={same}");
        File.WriteAllBytes(Path.Combine(outDir, "frame-0.png"), ImageConversion.EncodeArrayToPNG(f0, UnityEngine.Experimental.Rendering.GraphicsFormat.R8G8B8_UNorm, (uint)w, (uint)h));
        File.WriteAllBytes(Path.Combine(outDir, "frame-15.png"), ImageConversion.EncodeArrayToPNG(Frame(15), UnityEngine.Experimental.Rendering.GraphicsFormat.R8G8B8_UNorm, (uint)w, (uint)h));

        // 2. Transport.cs's exact path: raw rgb24 frames down ffmpeg's stdin.
        string mp4 = Path.Combine(outDir, "probe.mp4"); bool muxed = false; string ffErr = "";
        try
        {
            var enc = Process.Start(new ProcessStartInfo("ffmpeg", $"-y -loglevel error -f rawvideo -pix_fmt rgb24 -s {w}x{h} -r 30 -i - -vf vflip -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \"{mp4}\"")
            { UseShellExecute = false, RedirectStandardInput = true, RedirectStandardError = true, CreateNoWindow = true });
            var s = enc.StandardInput.BaseStream;
            for (int i = 0; i < frames; i++) { var raw = Frame(i); s.Write(raw, 0, raw.Length); }
            enc.StandardInput.Close(); ffErr = enc.StandardError.ReadToEnd(); enc.WaitForExit();
            muxed = enc.ExitCode == 0 && File.Exists(mp4);
        }
        catch (Exception e) { ffErr = e.Message; }
        log($"ffmpeg pipe ok={muxed} {ffErr.Trim()}");

        File.WriteAllText(Path.Combine(outDir, "result.json"),
            $"{{\"batchMode\":{Application.isBatchMode.ToString().ToLower()},\"graphics\":\"{SystemInfo.graphicsDeviceType}\",\"device\":\"{SystemInfo.graphicsDeviceName}\",\"mean\":{mean:0.0},\"repeatable\":{same.ToString().ToLower()},\"mp4\":{muxed.ToString().ToLower()},\"frames\":{frames}}}");
        File.WriteAllText(Path.Combine(outDir, "probe.log"), sb.ToString());
        if (!Application.isBatchMode) return; // run from a menu: stay open
        EditorApplication.Exit(mean > 1 && muxed ? 0 : 3);
    }
}
