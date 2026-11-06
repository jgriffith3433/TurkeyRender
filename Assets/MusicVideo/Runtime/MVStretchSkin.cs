using System;
using System.Collections.Generic;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>
    /// Spaghettification, only on him. A second skin sharing his bones, with a per-vertex order, takes over from his normal one
    /// while the amount is above zero. His own materials are never touched. Built on first use, never saved.
    /// </summary>
    public class MVStretchSkin
    {
        // The order groups a score can name, in default order. "hand" is the last hand, which stays until the very end.
        static readonly Dictionary<string, HumanBodyBones[]> Groups = new Dictionary<string, HumanBodyBones[]>
        {
            { "feet", new[] { HumanBodyBones.LeftToes, HumanBodyBones.RightToes, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot } },
            { "legs", new[] { HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg } },
            { "hips", new[] { HumanBodyBones.Hips } },
            { "chest", new[] { HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest } },
            { "arms", new[] { HumanBodyBones.LeftHand, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightUpperArm, HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder } },
            { "head", new[] { HumanBodyBones.Neck, HumanBodyBones.Head } },
            { "hand", new[] { HumanBodyBones.RightHand } },
        };
        public const string DefaultOrder = "feet,legs,hips,chest,arms,head,hand";

        SkinnedMeshRenderer _src, _r; Mesh _m; Material[] _mats; string _order; MVActor _actor;
        Vector2[] _o; BoneWeight[] _w; Transform[] _bones;
        static readonly int Amount = Shader.PropertyToID("_Amount"), To = Shader.PropertyToID("_To"), Anchor = Shader.PropertyToID("_Anchor"), Span = Shader.PropertyToID("_Span"), Thin = Shader.PropertyToID("_Thin"), Glow = Shader.PropertyToID("_Glow"), LinesId = Shader.PropertyToID("_Lines");

        public bool Alive => _r != null && _src != null;

        public static MVStretchSkin For(MVActor actor)
        {
            SkinnedMeshRenderer src = null; int most = 0;
            foreach (var s in actor.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (s.sharedMesh && s.sharedMesh.vertexCount > most && s.name != "feather_coat" && s.name != "stretch_skin") { src = s; most = s.sharedMesh.vertexCount; }
            if (!src) return null;
            var c = new MVStretchSkin { _src = src, _actor = actor };
            var old = src.transform.parent.Find("stretch_skin");
            if (old) UnityEngine.Object.DestroyImmediate(old.gameObject);
            var go = new GameObject("stretch_skin") { hideFlags = HideFlags.DontSave };
            go.transform.SetParent(src.transform.parent, false);
            go.transform.SetLocalPositionAndRotation(src.transform.localPosition, src.transform.localRotation);
            go.transform.localScale = src.transform.localScale;
            go.layer = src.gameObject.layer;
            c._m = UnityEngine.Object.Instantiate(src.sharedMesh); c._m.hideFlags = HideFlags.HideAndDontSave; c._m.name = "stretch_skin";
            c._w = src.sharedMesh.boneWeights; c._bones = src.bones; c._o = new Vector2[c._w.Length];
            var r = go.AddComponent<SkinnedMeshRenderer>();
            r.bones = src.bones; r.rootBone = src.rootBone; r.sharedMesh = c._m;
            r.quality = SkinQuality.Bone4; r.updateWhenOffscreen = true; r.forceMatrixRecalculationPerRender = true; r.localBounds = new Bounds(Vector3.zero, Vector3.one * 400);
            var sh = Shader.Find("MV/Stretch");
            var srcm = src.sharedMaterials; c._mats = new Material[srcm.Length];
            for (int i = 0; i < srcm.Length; i++)
            {
                var m = new Material(sh) { hideFlags = HideFlags.DontSave };
                if (srcm[i] && srcm[i].HasProperty("_BaseMap")) { m.SetTexture("_BaseMap", srcm[i].GetTexture("_BaseMap")); m.SetColor("_BaseColor", srcm[i].GetColor("_BaseColor")); }
                c._mats[i] = m;
            }
            r.sharedMaterials = c._mats; r.forceRenderingOff = true;
            c._r = r;
            actor.Rends = null;
            return c;
        }

        void Order(string order)
        {
            _order = order;
            var val = new Dictionary<Transform, float>();
            var list = (order ?? DefaultOrder).Split(',');
            int n = list.Length;
            for (int g = 0; g < n; g++)
            {
                if (!Groups.TryGetValue(list[g].Trim().ToLowerInvariant(), out var bones)) continue;
                for (int b = 0; b < bones.Length; b++)
                {
                    var t = _actor.human.Length > (int)bones[b] ? _actor.human[(int)bones[b]] : null; if (!t) continue;
                    val[t] = (g + b / (float)bones.Length * .8f) / n;
                }
            }
            // A bone not named takes its nearest named ancestor: fingers go with their hand.
            var byBone = new float[_bones.Length];
            for (int i = 0; i < _bones.Length; i++)
            {
                float v = .5f;
                for (var t = _bones[i]; t; t = t.parent) if (val.TryGetValue(t, out var q)) { v = q; break; }
                byBone[i] = v;
            }
            for (int i = 0; i < _w.Length; i++)
            {
                var w = _w[i];
                float o = byBone[w.boneIndex0] * w.weight0 + byBone[w.boneIndex1] * w.weight1 + byBone[w.boneIndex2] * w.weight2 + byBone[w.boneIndex3] * w.weight3;
                _o[i] = new Vector2(o, (i * 2654435761u % 1000) / 1000f);
            }
            _m.SetUVs(3, _o);
        }

        public void Apply(float amount, string order, Vector3 to, float span, float thin, Color glow, float lines)
        {
            bool on = amount > 0;
            _r.forceRenderingOff = !on;
            _src.forceRenderingOff = on;
            if (!on) return;
            if (order != _order) Order(order);
            var hips = _actor.human.Length > 0 ? _actor.human[(int)HumanBodyBones.Hips] : _actor.transform;
            foreach (var m in _mats)
            {
                m.SetFloat(Amount, amount); m.SetVector(To, to); m.SetVector(Anchor, hips.position); m.SetFloat(Span, span); m.SetFloat(Thin, thin); m.SetColor(Glow, glow); m.SetFloat(LinesId, lines);
            }
        }
    }
}
