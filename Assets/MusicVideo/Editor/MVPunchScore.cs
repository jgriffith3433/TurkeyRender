using System;
using System.Linq;
using Newtonsoft.Json.Linq;
using Unity.Cinemachine;
using UnityEngine;
using TKShock.MV;

namespace TKShock.MV.EditorTools
{
    /// <summary>Hawkes Punch cues: fly, throwobj, catch, lasso, swing, shatter, fold, impact, and the chase camera. See AGENTS.md.</summary>
    public partial class ScoreCompiler
    {
        /// <summary>`do` cues this file turns into ops. True when handled.</summary>
        bool PunchCue(string name, MVActor actor, string kind, JObject c, JObject a, double t, double len)
        {
            switch (kind)
            {
                case "fly":
                    {
                        if (c["points"] is JArray pts && pts.Count > 0)
                        {
                            a["pts"] = string.Join(";", pts.Select(p => { var v = V(p, Vector3.zero); return $"{v.x:0.###},{v.y:0.###},{v.z:0.###}"; }));
                            a.Remove("points");
                            if (c["speed"] != null && c["for"] == null && c["until"] == null)
                            {
                                var list = pts.Select(p => V(p, Vector3.zero)).ToArray(); float L = 0;
                                for (int i = 1; i < list.Length; i++) L += Vector3.Distance(list[i - 1], list[i]);
                                len = Math.Max(L / Math.Max((float)c["speed"], .01f), .05);
                            }
                            a.Remove("speed");
                        }
                        else if (c["speed"] != null) { _warn.Add($"{name}: fly `speed` needs `points` (the path length); using `for`"); a.Remove("speed"); }
                        if (c["trail"] != null && c["trail"].Type != JTokenType.Boolean || c["trail"]?.Type == JTokenType.Boolean && (bool)c["trail"])
                        {
                            var tr = new JObject { ["on"] = name, ["flyStart"] = t, ["flyDur"] = len };
                            foreach (var k in new[] { "pts", "to", "arc", "up", "ease", "fromHere" }) if (a[k] != null) tr[k] = a[k];
                            if (c["trail"] is JObject to) foreach (var kv in to) tr[kv.Key] = kv.Value;
                            double fade = tr["fadeOut"] != null ? (double)tr["fadeOut"] : .4;
                            Op(_fx, "trail", t, len + fade, tr);
                            a.Remove("trail");
                        }
                        Op(Track(name), "fly", t, len, a);
                        return true;
                    }
                case "throwobj":
                    {
                        if (c["to"] == null) { _warn.Add($"{name}: throwobj needs `to` (a hand bone or a point)"); return true; }
                        Op(Track(name), "throwobj", t, len, a);
                        if (c["catch"] != null && (c["catch"].Type != JTokenType.Boolean || (bool)c["catch"]))
                        {
                            var cc = c["catch"] is JObject co ? (JObject)co.DeepClone() : new JObject();
                            cc["to"] = cc["to"] ?? c["to"]; if (c["toOffset"] != null && cc["pos"] == null && c["rel"] != null) cc["pos"] = c["toOffset"];
                            Catch(name, cc, t + len, .01);
                        }
                        return true;
                    }
                case "catch": Catch(name, c, t, len); return true;
                case "lasso":
                    {
                        if (c["to"] == null) { _warn.Add($"{name}: lasso needs `to` (what it ropes)"); return true; }
                        string hand = (string)c["hand"] ?? "right";
                        var r = new JObject { ["from"] = name + "." + (hand == "left" ? "leftHand" : "rightHand"), ["to"] = c["to"], ["fly"] = len };
                        foreach (var k in new[] { "tight", "thick", "color", "sag", "sagTight", "loop", "radius", "offset" }) if (c[k] != null) r[k] = c[k];
                        if (c["tight"] != null) r["tight"] = Dur(c["tight"], t, .25);
                        double hold = c["hold"] != null ? Dur(c["hold"], t, 30) : c["release"] != null ? T(c["release"], t) - t : 30;
                        Op(_fx, "rope", t, Math.Max(hold, len + .1), r);
                        return true;
                    }
                case "shatter":
                    {
                        // the sheet goes, and its shards fly on from where it stood
                        Op(Track(name), "hide", t, .01, new JObject());
                        var g = new JObject { ["on"] = name };
                        var sc = actor.baseScale; float size = Mathf.Max(sc.x, sc.y, sc.z);
                        if (actor.GetComponentInChildren<Renderer>()) { var b = actor.GetComponentInChildren<Renderer>().bounds; size = Mathf.Max(b.size.x, b.size.y, b.size.z); }
                        g["size"] = c["size"] ?? size;
                        foreach (var k in new[] { "dir", "count", "color", "speed", "gravity", "life", "push", "aspect" }) if (c[k] != null) g[k] = c[k];
                        Op(_fx, "glass", t, c["for"] != null ? len : (double)((float?)g["life"] ?? 2.5f) + .5, g);
                        if (c["sfx"] == null) { /* no default sound: the sound library has no glass break yet */ }
                        return true;
                    }
                case "fold":
                    {
                        // several `on`: each a stagger later. Hidden until its turn unless the actor has its own `from`.
                        double at = t;
                        if (c["on"] is JArray ons && c["stagger"] != null) { int i = ons.Select(x => (string)x).ToList().IndexOf(name); if (i > 0) at += i * Dur(c["stagger"], t, 0); }
                        a.Remove("stagger");
                        if ((float?)a["appear"] != 0 && at > 0 && Track(name) != null)
                        {
                            double h0 = 0; foreach (var o in Track(name).ops) if (o.kind == "show" && o.start < at) h0 = Math.Max(h0, o.start + .001); // after the actor's own `from`
                            Op(Track(name), "hide", h0, at - h0, new JObject()); Op(Track(name), "show", at, .01, new JObject());
                        }
                        a.Remove("appear");
                        Op(Track(name), "fold", at, len, a);
                        return true;
                    }
                case "hitstop": { double d = c["for"] != null ? Secs(c["for"], t, 3 / Fps()) : HoldSecs(c["frames"], t, 3); HoldFor(t, d, (float?)c["resume"] ?? 1); Victim(c, t, d); return true; }
            }
            return false;
        }

        void Catch(string name, JObject c, double t, double len)
        {
            var at = new JObject { ["to"] = c["to"], ["pos"] = c["pos"] ?? new JArray(0, 0, 0), ["rot"] = c["rot"] ?? new JArray(0, 0, 0), ["blend"] = c["blend"] != null ? Dur(c["blend"], t, 0) : 0, ["scaled"] = c["scaled"] ?? 0 };
            Op(Track(name), "attach", t, Math.Max(len, .01), at);
            float sq = (float?)c["squash"] ?? .25f;
            if (sq > 0) { double sfor = c["squashFor"] != null ? Dur(c["squashFor"], t, .3) : _song.TimeOf(_song.BeatAt(t) + .5) - t; Op(Track(name), "squash", t, sfor, new JObject { ["amount"] = sq, ["every"] = Math.Max(_song.BeatAt(t + sfor) - _song.BeatAt(t), .01) }); }
        }

        /// <summary>Scene time stands still for `frames` frames (at the score's `fps`, 30 when it has none), then runs again at `resume`. Baked into the warp like any speed cue.
        /// Native bodies hold too: NativeTracks cuts their clips at every hold (MVEpicScore.cs HoldNative).</summary>
        void Hitstop(double t, float frames, float resume) => HoldFor(t, frames / Fps(), resume);
        void HoldFor(double t, double d, float resume)
        {
            double tick = 1.0 / SongMap.WarpHz;
            _holds.Add((t, d));   // the picture holds, the clock doesn't move: BakeWarp
            if (Math.Abs(resume - 1) > 1e-4) _speeds.Add((t + d, tick * .5, resume, "linear"));
            Op(_time, "x0", t, d, new JObject());
        }

        /// <summary>Extras on an `fx` cue. `impact`: a frame-held flash, a camera shake for `shakeFor` (0.2 s), a `hitstop`. Returns false: the fx itself still goes on the Fx track.</summary>
        bool PunchFx(string name, JObject c, JObject a, double t)
        {
            if (name != "impact") return false;
            float shake = (float?)c["shake"] ?? .35f, flash = (float?)c["flash"] ?? .5f;
            double hitstop = c["hitstop"] != null ? HoldSecs(c["hitstop"], t, 0) : 0;   // frames at the score's fps, or a length ("0.2s", "5f")
            double shakeFor = c["shakeFor"] != null ? Dur(c["shakeFor"], t, .2) : .2, flashFor = c["flashFor"] != null ? Dur(c["flashFor"], t, .07) : .07;
            a["flashFor"] = flashFor;
            if (shake > 0) Op(_post, "pulse", t, shakeFor, new JObject { ["shake"] = shake, ["sharp"] = 1.5 });
            if (flash > 0) Op(_post, "pulse", t, flashFor, new JObject { ["flash"] = flash, ["sharp"] = .02 });   // held, then gone
            if (hitstop > 0) { HoldFor(t, hitstop, (float?)c["resume"] ?? 1); Victim(c, t, hitstop); }
            foreach (var k in new[] { "shake", "flash", "hitstop", "shakeFor", "resume", "victim", "victimShake", "victimHz", "attacker", "creep", "creepDir" }) a.Remove(k);
            return false;
        }

        /// <summary>A chase camera: `follow` with `lag` and/or `lead`. The camera rides the subject's path `lag` seconds back and aims `lead` seconds ahead.</summary>
        bool PunchShot(string name, ShotInfo sh, double end)
        {
            var s = sh.s;
            if (s["follow"] == null || s["lag"] == null && s["lead"] == null) return false;
            double len = end - sh.t;
            string target = (string)s["follow"];
            var ch = new JObject { ["target"] = target, ["lag"] = s["lag"] != null ? Dur(s["lag"], sh.t, 0) : 0, ["offset"] = s["offset"] ?? new JArray(0, 2, -6), ["space"] = s["space"] ?? "world" };
            Op(Track(name), "chase", sh.t, len, ch);
            if (s["lead"] != null)
            {
                var vc = _actors[name].GetComponent<CinemachineCamera>();
                string lookAt = (string)s["look"] ?? target;
                var go = new GameObject(name + "_lead"); go.transform.SetParent(_root, false); _shotObjects.Add(go);
                var la = go.AddComponent<MVActor>(); la.smoothTime = true; _actors[go.name] = la;
                Op(Track(go.name), "leadpoint", sh.t, len, new JObject { ["target"] = lookAt, ["lead"] = Dur(s["lead"], sh.t, 0), ["offset"] = s["lookOffset"] ?? new JArray(0, 0, 0) });
                if (vc)
                {
                    vc.LookAt = go.transform;
                    if (!vc.GetComponent<CinemachineRotationComposer>()) { var rc = vc.gameObject.AddComponent<CinemachineRotationComposer>(); rc.Damping = Vector2.zero; var comp = rc.Composition; comp.DeadZone.Enabled = false; comp.ScreenPosition = V2(s["screen"], Vector2.zero); rc.Composition = comp; }
                }
            }
            return true;
        }
    }
}
