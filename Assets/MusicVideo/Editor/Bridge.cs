using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>
    /// File mailbox between Claude and the open editor. Claude drops Director/inbox/*.json, the editor runs it
    /// (even when Unity is not focused) and writes Director/outbox/id.json. Any static method marked
    /// [BridgeCommand("name")] taking a JObject and returning an object is a command.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    public class BridgeCommandAttribute : Attribute
    {
        public string Name;
        public BridgeCommandAttribute(string name) { Name = name; }
    }

    [InitializeOnLoad]
    public static class Bridge
    {
        public static readonly string Root = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Director"));
        static readonly string Inbox = Path.Combine(Root, "inbox"), Outbox = Path.Combine(Root, "outbox");
        static readonly Dictionary<string, MethodInfo> Commands = new Dictionary<string, MethodInfo>();
        static readonly List<string> Log = new List<string>();
        static double _next, _lastBeat;
        static bool _running;

        static Bridge()
        {
            Directory.CreateDirectory(Inbox); Directory.CreateDirectory(Outbox);
            foreach (var t in TypeCache.GetMethodsWithAttribute<BridgeCommandAttribute>())
                Commands[t.GetCustomAttribute<BridgeCommandAttribute>().Name] = t;
            EditorApplication.update += Tick;
            Application.logMessageReceivedThreaded += (m, s, type) =>
            {
                if (type == LogType.Log) return;
                lock (Log) { Log.Add($"[{type}] {m}"); if (Log.Count > 200) Log.RemoveAt(0); }
            };
            CompilationPipeline.assemblyCompilationFinished += (asm, msgs) =>
            {
                var errs = msgs.Where(x => x.type == CompilerMessageType.Error)
                               .Select(x => $"{x.file}:{x.line} {x.message}").ToArray();
                if (errs.Length > 0) File.AppendAllLines(Path.Combine(Root, "compile-errors.txt"), errs);
            };
            CompilationPipeline.compilationStarted += _ =>
            {
                try { File.Delete(Path.Combine(Root, "compile-errors.txt")); } catch { }
            };
            WriteHeartbeat();
        }

        static void WriteHeartbeat()
        {
            try
            {
                File.WriteAllText(Path.Combine(Root, "heartbeat.json"), new JObject
                {
                    ["utc"] = DateTime.UtcNow.ToString("o"),
                    ["compiling"] = EditorApplication.isCompiling,
                    ["updating"] = EditorApplication.isUpdating,
                    ["playing"] = EditorApplication.isPlaying,
                }.ToString());
            }
            catch { }
        }

        static void Tick()
        {
            double now = EditorApplication.timeSinceStartup;
            if (now - _lastBeat > 1) { _lastBeat = now; WriteHeartbeat(); }
            if (now < _next || _running) return;
            _next = now + 0.15;
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) return;
            string[] files;
            try { files = Directory.GetFiles(Inbox, "*.json"); } catch { return; }
            foreach (var f in files.OrderBy(x => x)) { Run(f); break; }
        }

        static void Run(string file)
        {
            string id = Path.GetFileNameWithoutExtension(file);
            var reply = new JObject { ["id"] = id };
            string text;
            try { text = File.ReadAllText(file); File.Delete(file); }
            catch { return; } // still being written; next tick
            _running = true;
            try
            {
                var msg = JObject.Parse(text);
                string cmd = (string)msg["cmd"];
                if (!Commands.TryGetValue(cmd, out var m)) throw new Exception("no such command: " + cmd);
                var result = m.Invoke(null, new object[] { msg });
                reply["ok"] = true;
                reply["result"] = result == null ? null : JToken.FromObject(result);
            }
            catch (Exception e)
            {
                var inner = e is TargetInvocationException t && t.InnerException != null ? t.InnerException : e;
                reply["ok"] = false; reply["error"] = inner.Message + "\n" + inner.StackTrace;
            }
            _running = false;
            lock (Log) { reply["log"] = new JArray(Log.ToArray()); Log.Clear(); }
            var tmp = Path.Combine(Outbox, id + ".tmp");
            File.WriteAllText(tmp, reply.ToString());
            File.Delete(Path.Combine(Outbox, id + ".json"));
            File.Move(tmp, Path.Combine(Outbox, id + ".json"));
        }

        [BridgeCommand("ping")]
        static object Ping(JObject m) => new { unity = Application.unityVersion, project = Application.dataPath, commands = Commands.Keys.OrderBy(x => x).ToArray() };

        [BridgeCommand("refresh")]
        static object Refresh(JObject m) { AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport); return "refreshed"; }

        [BridgeCommand("packages")]
        static object Packages(JObject m) { UnityEditor.PackageManager.Client.Resolve(); return "resolving"; }
    }
}
