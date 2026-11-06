using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>The FX cues on an actor: feather, stretch, drain, dent, glass, eyesee. Folded like every other cue, applied at the end.</summary>
    public partial class MotionDriver
    {
        MVFeatherCoat _coat; MVStretchSkin _stretch; MVGlass _glass;
        Op _fLook, _fTo, _fFrom, _sOp, _dentOp, _gOp, _eOp; double _gOpenAt;
        Op _gPush; readonly List<MVGlass.Push> _push = new List<MVGlass.Push>();

        static float StrF(Args a, string k, float d) => a.F(k, d);

        partial void BodyFx(MVActor actor, Op op, double tl, float raw, float k)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "feather":
                    if (a.Has("amount")) Tw("f.amount", a.F("amount"), k);
                    else if (a.Has("count")) Tw("f.amount", a.F("count") / MVFeatherCoat.Cards, k);
                    if (a.Has("strip")) { Tw("f.strip", a.F("strip"), k); }
                    if (a.Has("to")) _fTo = op;
                    if (a.Has("from")) _fFrom = op;
                    if (a.Has("color") || a.Has("size") || a.Has("lay") || a.Has("color2")) _fLook = op;
                    break;
                case "stretch":
                    Tw("s.amount", a.F("amount", 1), k); _sOp = op; break;
                case "drain":
                    Tw("drain", a.F("to", 1), k); break;
                case "dent":
                    Tw("dent", a.F("to", 1), k); _dentOp = op; break;
                case "glass":
                    if (a.Has("amount")) Tw("g.amount", a.F("amount"), k);
                    if (a.Has("open")) { if (!_amount.ContainsKey("g.open")) _gOpenAt = tl; Tw("g.open", a.F("open"), k); if (a.F("open") > 0) _gOpenAt = tl; }
                    if (a.Has("push")) _gPush = op;
                    _gOp = op; break;
                case "eyesee":
                    _eOp = op; break;
            }
        }

        partial void EndFx(MVActor actor)
        {
            _amount.TryGetValue("f.amount", out float fa); _amount.TryGetValue("f.strip", out float fs);
            if (_coat == null || !_coat.Alive) { if (fa > 0) _coat = MVFeatherCoat.For(actor); else _coat = null; }
            if (_coat != null)
            {
                var to = actor.transform.position + Vector3.up * 12;
                if (_fTo != null)
                {
                    if (_fTo.a.Vec.TryGetValue("to", out var v)) to = v;
                    else if (MVFeatherFx.Where(_fTo.a.S("to"), _t, out var w, out _, out _)) to = w;
                }
                var l = _fLook?.a;
                _coat.Apply(fa, _fFrom?.a.S("from") ?? "LeftHand,RightHand", fs, to,
                    l != null ? l.C("color", new Color(.95f, .93f, .88f)) : new Color(.95f, .93f, .88f), l != null ? l.C("color2", new Color(.72f, .62f, .5f)) : new Color(.72f, .62f, .5f),
                    l != null ? l.F("size", 1) : 1, l != null ? l.F("lay", .86f) : .86f);
            }

            _amount.TryGetValue("s.amount", out float sa);
            if (_stretch == null || !_stretch.Alive) { if (sa > 0) _stretch = MVStretchSkin.For(actor); else _stretch = null; }
            if (_stretch != null)
            {
                var a = _sOp?.a; var to = actor.transform.position + Vector3.forward * 5;
                if (a != null)
                {
                    if (a.Vec.TryGetValue("to", out var v)) to = v;
                    else if (MVFeatherFx.Where(a.S("to"), _t, out var w, out _, out _)) to = w;
                }
                _stretch.Apply(sa, a?.S("order") ?? MVStretchSkin.DefaultOrder, to, a != null ? a.F("span", .3f) : .3f, a != null ? a.F("thin", .03f) : .03f, a != null ? a.C("glow", new Color(1.4f, 2.2f, 3f)) : Color.white, a != null ? a.F("lines", 90) : 90);
            }

            var mt = actor.GetComponent<MVFeatherMountain>();
            if (mt)
            {
                _amount.TryGetValue("drain", out float dr); _amount.TryGetValue("dent", out float dn);
                var d = _dentOp?.a;
                mt.Apply(dr, dn, d != null ? d.F("x") : 0, d != null ? d.F("z") : 0, d != null ? d.F("radius", 3) : 3, d != null ? d.F("depth", 1.2f) : 1.2f, (float)(_t * .35));
            }

            _amount.TryGetValue("g.amount", out float ga); _amount.TryGetValue("g.open", out float go);
            if (_glass == null || !_glass.Alive) { if (ga > 0 || go > 0) _glass = MVGlass.For(actor); else _glass = null; }
            if (_glass != null)
            {
                _push.Clear();
                if (_gPush != null)
                {
                    float r = _gPush.a.F("radius", .14f);
                    if (_gPush.a.Vec.TryGetValue("push", out var pv)) _push.Add(new MVGlass.Push { p = pv, r = r });
                    else foreach (var s in (_gPush.a.S("push") ?? "").Split(','))
                        {
                            var spec = s.Trim(); float rad = r; int c = spec.IndexOf(':');
                            if (c > 0) { float.TryParse(spec.Substring(c + 1), out rad); spec = spec.Substring(0, c); }
                            var tr = MVActor.Point(spec, _t);
                            if (tr) _push.Add(new MVGlass.Push { p = tr.position, r = rad });
                        }
                }
                var g = _gOp?.a;
                _glass.Apply(ga, go, (float)_gOpenAt, _push, g != null ? g.F("openRadius", .32f) : .32f, g != null ? g.F("tear", 1) : 1);
            }

            var eye = actor.GetComponent<MVEyeRig>();
            if (eye) eye.Drive(_face, _eOp?.a, _t);

            _fLook = _fTo = _fFrom = _sOp = _dentOp = _gOp = _gPush = _eOp = null; _gOpenAt = 0;
        }
    }
}
