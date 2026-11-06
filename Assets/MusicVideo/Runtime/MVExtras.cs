using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    public partial class MotionDriver
    {
        readonly Dictionary<string, MVDeform.Item> _def = new Dictionary<string, MVDeform.Item>();
        readonly Dictionary<string, float> _amount = new Dictionary<string, float>();

        void BeginExtras() { _def.Clear(); _amount.Clear(); }

        float Tw(string key, float to, float k)
        {
            _amount.TryGetValue(key, out var cur);
            return _amount[key] = Mathf.LerpUnclamped(cur, to, k);
        }

        void BodyExtra(MVActor actor, Op op, double tl, float raw, float k)
        {
            var a = op.a;
            switch (op.kind)
            {
                case "ripple":
                    {
                        if (tl > op.WDur) break;
                        float fade = a.F("fade"), w = fade > 0 ? Mathf.Clamp01(Mathf.Min((float)tl, (float)(op.WDur - tl)) / fade) : 1;
                        _def["ripple" + op.index] = new MVDeform.Item { kind = "ripple", a = a, raw = Mathf.Clamp01(raw), tl = tl, amount = a.F("amount", .08f) * w };
                        break;
                    }
                case "peel":
                    { float v = Tw("peel" + a.S("name", ""), a.F("to", 1), k); _def["peel" + a.S("name", "")] = new MVDeform.Item { kind = "peel", a = a, amount = v, tl = tl }; break; }
                case "bulge":
                    {
                        float v = Tw("bulge", a.F("amount", .1f), k);
                        var to = a.Vec.TryGetValue("toward", out var w) ? w : (MVActor.Point(a.S("toward"), _t)?.position ?? actor.transform.position + actor.transform.forward);
                        _def["bulge"] = new MVDeform.Item { kind = "bulge", a = a, amount = v, tl = tl, toward = to }; break;
                    }
                default: BodyFx(actor, op, tl, raw, k); break;
            }
        }

        partial void BodyFx(MVActor actor, Op op, double tl, float raw, float k);
        partial void EndFx(MVActor actor);

        void EndExtras(MVActor actor)
        {
            var d = actor.GetComponent<MVDeform>();
            if (d)
            {
                d.Items.Clear();
                foreach (var kv in _def) d.Items.Add(kv.Value);
                d.Apply();
            }
            EndFx(actor);
        }
    }

    /// <summary>The close-up eye. Filled in by the eye build.</summary>
    public partial class MVEyeRig : MonoBehaviour
    {
        public void Set(string key, float value) => SetValue(key, value);
        partial void SetValue(string key, float value);
    }
}
