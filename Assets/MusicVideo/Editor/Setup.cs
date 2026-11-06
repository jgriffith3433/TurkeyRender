using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace TKShock.MV.EditorTools
{
    /// <summary>One-time project setup and material conversion, so nothing needs a menu or a click.</summary>
    [InitializeOnLoad]
    public static class Setup
    {
        const string OpenedKey = "TKShock.MV.Opened";

        static Setup()
        {
            // Opening Unity should land on the video, ready to play.
            EditorApplication.delayCall += () =>
            {
                if (EditorApplication.isPlayingOrWillChangePlaymode || SessionState.GetBool(OpenedKey, false)) return;
                SessionState.SetBool(OpenedKey, true);
                if (!File.Exists(ScoreCompiler.ScenePath)) return;
                if (SceneManager.GetActiveScene().path != ScoreCompiler.ScenePath && !SceneManager.GetActiveScene().isDirty)
                    EditorSceneManager.OpenScene(ScoreCompiler.ScenePath, OpenSceneMode.Single);
                Quality.Set(true);
                Transport.ShowAll();
            };
        }

        [BridgeCommand("setup")]
        static object Run(JObject m)
        {
            var done = new List<string>();
            PlayerSettings.runInBackground = true;
            EditorSettings.enterPlayModeOptionsEnabled = true;
            EditorSettings.enterPlayModeOptions = EnterPlayModeOptions.DisableDomainReload | EnterPlayModeOptions.DisableSceneReload;
            if (!File.Exists("Assets/TextMesh Pro/Resources/TMP Settings.asset"))
            {
                var pkg = Directory.GetFiles("Library/PackageCache", "TMP Essential Resources.unitypackage", SearchOption.AllDirectories).First();
                AssetDatabase.ImportPackage(pkg, false);
                done.Add("TextMesh Pro essentials");
            }
            done.Add(AddStylizePass());
            return done;
        }

        /// <summary>Adds the Stylize full-screen pass to every URP renderer in the project.</summary>
        static string AddStylizePass()
        {
            if (!AssetDatabase.IsValidFolder(ScoreCompiler.Gen)) AssetDatabase.CreateFolder("Assets/MusicVideo", "Generated");
            var matPath = ScoreCompiler.Gen + "/Stylize.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (!mat) { mat = new Material(Shader.Find("MV/Stylize")); AssetDatabase.CreateAsset(mat, matPath); }
            int added = 0;
            foreach (var g in AssetDatabase.FindAssets("t:UniversalRendererData"))
            {
                var path = AssetDatabase.GUIDToAssetPath(g);
                if (!path.StartsWith("Assets/")) continue;
                var data = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(path);
                if (data.rendererFeatures.OfType<FullScreenPassRendererFeature>().Any()) continue;
                var f = ScriptableObject.CreateInstance<FullScreenPassRendererFeature>();
                f.name = "MV Stylize"; f.passMaterial = mat; f.injectionPoint = FullScreenPassRendererFeature.InjectionPoint.AfterRenderingPostProcessing;
                f.requirements = ScriptableRenderPassInput.Color | ScriptableRenderPassInput.Depth; f.fetchColorBuffer = true;
                AssetDatabase.AddObjectToAsset(f, data);
                var so = new SerializedObject(data);
                var list = so.FindProperty("m_RendererFeatures"); var map = so.FindProperty("m_RendererFeatureMap");
                list.arraySize++; list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = f;
                AssetDatabase.TryGetGUIDAndLocalFileIdentifier(f, out string _, out long local);
                map.arraySize++; map.GetArrayElementAtIndex(map.arraySize - 1).longValue = local;
                so.ApplyModifiedProperties();
                EditorUtility.SetDirty(data); added++;
            }
            AssetDatabase.SaveAssets();
            return "stylize pass on " + added + " renderers";
        }

        /// <summary>Asset Store packs are mostly built for the old pipeline: point their materials at URP, keeping textures and colours.</summary>
        [BridgeCommand("fixmats")]
        static object FixMats(JObject m)
        {
            var roots = m["roots"].Select(x => (string)x).Where(AssetDatabase.IsValidFolder).ToArray();
            if (roots.Length == 0) return "no folders";
            Shader lit = Shader.Find("MV/Lit"), part = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            int n = 0, skip = 0;
            foreach (var g in AssetDatabase.FindAssets("t:Material", roots))
            {
                var path = AssetDatabase.GUIDToAssetPath(g);
                var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (!mat || !mat.shader) continue;
                var s = mat.shader.name;
                Clean(mat, path);
                if (s == "MV/Lit" || s.StartsWith("Shader Graphs") || s.StartsWith("Universal Render Pipeline/Particles")) { skip++; continue; }
                if (s == "Universal Render Pipeline/Lit" || s == "Universal Render Pipeline/Complex Lit" || s == "Universal Render Pipeline/Simple Lit") { mat.shader = lit; EditorUtility.SetDirty(mat); n++; continue; }
                bool isParticle = s.IndexOf("Particle") >= 0;

                Texture Tex(string p) => mat.HasProperty(p) ? mat.GetTexture(p) : null;
                Color Colr(string p, Color d) => mat.HasProperty(p) ? mat.GetColor(p) : d;
                float Fl(string p, float d) => mat.HasProperty(p) ? mat.GetFloat(p) : d;
                var main = Tex("_MainTex") ?? Tex("_BaseMap") ?? Tex("_Albedo") ?? Tex("_Diffuse") ?? mat.GetTexturePropertyNames().Select(mat.GetTexture).FirstOrDefault(x => x != null); var col = mat.HasProperty("_TintColor") ? Colr("_TintColor", Color.white) * 2 : Colr("_Color", Color.white);
                var normal = Tex("_BumpMap"); var metal = Tex("_MetallicGlossMap"); var occ = Tex("_OcclusionMap"); var em = Tex("_EmissionMap");
                var emc = Colr("_EmissionColor", Color.black);
                float metallic = Fl("_Metallic", 0), smooth = Fl("_Glossiness", .5f), mode = Fl("_Mode", 0), cut = Fl("_Cutoff", .5f);
                bool additive = s.IndexOf("Additive", System.StringComparison.OrdinalIgnoreCase) >= 0;

                mat.shader = isParticle ? part : lit;
                mat.SetTexture("_BaseMap", main); mat.SetColor("_BaseColor", col);
                if (isParticle)
                {
                    mat.SetFloat("_Surface", 1); mat.SetFloat("_Blend", additive ? 2 : 0); mat.SetFloat("_ZWrite", 0);
                    mat.SetFloat("_SrcBlend", 5); mat.SetFloat("_DstBlend", additive ? 1 : 10);
                    mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); mat.renderQueue = 3000; mat.SetOverrideTag("RenderType", "Transparent");
                }
                else
                {
                    mat.SetFloat("_Metallic", metallic); mat.SetFloat("_Smoothness", smooth);
                    if (normal) { mat.SetTexture("_BumpMap", normal); mat.EnableKeyword("_NORMALMAP"); }
                    if (metal) { mat.SetTexture("_MetallicGlossMap", metal); mat.EnableKeyword("_METALLICSPECGLOSSMAP"); }
                    if (occ) { mat.SetTexture("_OcclusionMap", occ); mat.EnableKeyword("_OCCLUSIONMAP"); }
                    if (em || emc.maxColorComponent > 0) { mat.SetTexture("_EmissionMap", em); mat.SetColor("_EmissionColor", emc); mat.EnableKeyword("_EMISSION"); }
                    if (mode == 1) { mat.SetFloat("_AlphaClip", 1); mat.SetFloat("_Cutoff", cut); mat.EnableKeyword("_ALPHATEST_ON"); mat.renderQueue = 2450; }
                    else if (mode >= 2)
                    {
                        mat.SetFloat("_Surface", 1); mat.SetFloat("_Blend", 0); mat.SetFloat("_ZWrite", 0); mat.SetFloat("_SrcBlend", 5); mat.SetFloat("_DstBlend", 10);
                        mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); mat.renderQueue = 3000; mat.SetOverrideTag("RenderType", "Transparent");
                    }
                }
                EditorUtility.SetDirty(mat); n++;
            }
            AssetDatabase.SaveAssets();
            return new { converted = n, left = skip };
        }

        /// <summary>
        /// Materials written for HDRP keep emission on with a white colour and rely on a separate _EmissiveColor. On URP that
        /// makes the whole surface glow, so emission is taken from the value the artist really set. A zero base colour is reset too.
        /// </summary>
        static void Clean(Material mat, string path)
        {
            if (!mat.HasProperty("_EmissionColor") || !File.Exists(path)) return;
            var text = File.ReadAllText(path);
            var hd = System.Text.RegularExpressions.Regex.Match(text, @"_EmissiveColor: \{r: ([0-9.eE-]+), g: ([0-9.eE-]+), b: ([0-9.eE-]+)");
            if (hd.Success)
            {
                float r = float.Parse(hd.Groups[1].Value), g = float.Parse(hd.Groups[2].Value), b = float.Parse(hd.Groups[3].Value);
                if (r + g + b <= 0)
                {
                    mat.SetColor("_EmissionColor", Color.black); mat.SetTexture("_EmissionMap", null); mat.DisableKeyword("_EMISSION");
                }
                else mat.SetColor("_EmissionColor", new Color(r, g, b));
                EditorUtility.SetDirty(mat);
            }
            if (mat.HasProperty("_BaseColor") && mat.GetColor("_BaseColor").maxColorComponent <= 0) { mat.SetColor("_BaseColor", Color.white); EditorUtility.SetDirty(mat); }
        }

        /// <summary>What an asset is: size, pivot, parts, rig, clips. Lets Claude place things without opening Unity.</summary>
        [BridgeCommand("inspect")]
        static object Inspect(JObject m)
        {
            var path = (string)m["path"];
            var a = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (!a) return "not a model";
            var g = (GameObject)PrefabUtility.InstantiatePrefab(a);
            try
            {
                var rs = g.GetComponentsInChildren<Renderer>(true);
                var b = rs.Length > 0 ? rs[0].bounds : new Bounds();
                foreach (var r in rs) b.Encapsulate(r.bounds);
                var an = g.GetComponentInChildren<Animator>(true);
                return new
                {
                    center = new[] { b.center.x, b.center.y, b.center.z }, size = new[] { b.size.x, b.size.y, b.size.z },
                    parts = rs.Take(12).Select(r => new { r.name, mats = r.sharedMaterials.Select(x => x ? x.name + " [" + x.shader.name + "]" : "none").ToArray(), sz = new[] { r.bounds.size.x, r.bounds.size.y, r.bounds.size.z }, at = new[] { r.bounds.center.x, r.bounds.center.y, r.bounds.center.z } }).ToArray(),
                    animator = an ? new { human = an.isHuman, avatar = an.avatar ? an.avatar.name : null, controller = an.runtimeAnimatorController ? an.runtimeAnimatorController.name : null } : null,
                    lights = g.GetComponentsInChildren<Light>(true).Length,
                };
            }
            finally { Object.DestroyImmediate(g); }
        }

        /// <summary>Sets a rigged FBX up as a Humanoid with its own MV/Lit material.</summary>
        [BridgeCommand("humanoid")]
        static object Humanoid(JObject m)
        {
            string fbx = (string)m["fbx"], basePath = (string)m["base"], normal = (string)m["normal"], matPath = (string)m["mat"];
            var imp = (ModelImporter)AssetImporter.GetAtPath(fbx);
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importAnimation = false; imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.isReadable = true;
            imp.importNormals = ModelImporterNormals.Import; imp.importTangents = ModelImporterTangents.CalculateMikk; imp.importBlendShapes = true; imp.importBlendShapeNormals = ModelImporterNormals.Calculate;
            imp.SaveAndReimport();
            var ti = (TextureImporter)AssetImporter.GetAtPath(normal);
            ti.textureType = TextureImporterType.NormalMap; ti.SaveAndReimport();
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (!mat) { mat = new Material(Shader.Find("MV/Lit")); AssetDatabase.CreateAsset(mat, matPath); }
            mat.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(basePath));
            string pdir = Path.GetDirectoryName(fbx).Replace('\\', '/');
            Maps(mat, normal, pdir + "/Person_Gloss.png", pdir + "/Person_Occlusion.png", (float?)m["smooth"] ?? .32f);
            EditorUtility.SetDirty(mat); AssetDatabase.SaveAssets();
            if (m["head"] != null)
            {
                var hp = (string)m["headmat"];
                var hm = AssetDatabase.LoadAssetAtPath<Material>(hp);
                if (!hm) { hm = new Material(Shader.Find("MV/Lit")); AssetDatabase.CreateAsset(hm, hp); }
                hm.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>((string)m["head"]));
                Maps(hm, pdir + "/Person_Head_Normal.png", pdir + "/Person_Head_Gloss.png", pdir + "/Person_Head_Occlusion.png", .42f);
                EditorUtility.SetDirty(hm); AssetDatabase.SaveAssets();
            }
            var go = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
            var av = AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<Avatar>().FirstOrDefault();
            var keys = new List<string>();
            foreach (var mesh in AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<Mesh>())
                for (int i = 0; i < mesh.blendShapeCount; i++) keys.Add(mesh.GetBlendShapeName(i));
            var inst = (GameObject)PrefabUtility.InstantiatePrefab(go); var an = inst.GetComponentInChildren<Animator>(true);
            var fingers = an ? Enumerable.Range((int)HumanBodyBones.LeftThumbProximal, 30).Count(i => an.GetBoneTransform((HumanBodyBones)i)) : 0;
            Object.DestroyImmediate(inst);
            return new { human = av && av.isHuman, valid = av && av.isValid, keys = keys.Distinct().ToArray(), fingers };
        }

        static void Maps(Material mat, string normal, string gloss, string occ, float smooth)
        {
            void Tx(string path, bool nrm)
            {
                var ti = AssetImporter.GetAtPath(path) as TextureImporter; if (!ti) return;
                ti.textureType = nrm ? TextureImporterType.NormalMap : TextureImporterType.Default; ti.sRGBTexture = false; ti.SaveAndReimport();
            }
            Tx(normal, true); Tx(gloss, false); Tx(occ, false);
            var n = AssetDatabase.LoadAssetAtPath<Texture2D>(normal); var g = AssetDatabase.LoadAssetAtPath<Texture2D>(gloss); var o = AssetDatabase.LoadAssetAtPath<Texture2D>(occ);
            if (n) { mat.SetTexture("_BumpMap", n); mat.EnableKeyword("_NORMALMAP"); }
            if (g) { mat.SetTexture("_MetallicGlossMap", g); mat.EnableKeyword("_METALLICSPECGLOSSMAP"); mat.SetFloat("_Smoothness", 1); mat.SetFloat("_Metallic", 1); mat.SetFloat("_SmoothnessTextureChannel", 0); }
            else mat.SetFloat("_Smoothness", smooth);
            if (o) { mat.SetTexture("_OcclusionMap", o); mat.EnableKeyword("_OCCLUSIONMAP"); }
            mat.SetFloat("_Cull", 0);
        }

        [BridgeCommand("clips")]
        static object Clips(JObject m)
        {
            var path = (string)m["path"];
            return AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview"))
                .Select(c => new { c.name, c.length, human = c.isHumanMotion, loop = c.isLooping }).ToArray();
        }
    }
}
