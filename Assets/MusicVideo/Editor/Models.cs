using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace TKShock.MV.EditorTools
{
    /// <summary>Installs finished models from Director/gen into Assets with the import settings each one's README asks for.</summary>
    public static class Models
    {
        const string Turkey = "Assets/MusicVideo/Turkey", Props = "Assets/MusicVideo/Props";
        static string Gen => Path.Combine(Bridge.Root, "gen");

        static void Folder(string path) { if (!AssetDatabase.IsValidFolder(path)) AssetDatabase.CreateFolder(Path.GetDirectoryName(path).Replace('\\', '/'), Path.GetFileName(path)); }

        static bool Copy(string from, string to)
        {
            if (!File.Exists(from)) return false;
            if (!File.Exists(to) || File.GetLastWriteTimeUtc(from) > File.GetLastWriteTimeUtc(to)) File.Copy(from, to, true);
            return true;
        }

        static void Tex(string path, bool srgb, bool normal = false, bool cutout = false)
        {
            var ti = AssetImporter.GetAtPath(path) as TextureImporter; if (!ti) return;
            ti.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            ti.sRGBTexture = srgb && !normal; ti.maxTextureSize = 2048;
            if (cutout) { ti.alphaIsTransparency = true; ti.mipMapsPreserveCoverage = true; ti.alphaTestReferenceValue = .5f; }
            ti.SaveAndReimport();
        }

        [BridgeCommand("importturkeys")]
        static object Turkeys(JObject m)
        {
            Folder(Turkey);
            var src = Path.Combine(Gen, "turkey");
            var files = new List<string>();
            foreach (var c in new[] { "white", "brown", "black" })
                foreach (var lod in new[] { "hero", "crowd" })
                { var f = $"turkey_{c}_{lod}.fbx"; Copy(Path.Combine(src, f), Path.Combine(Turkey, f)); files.Add(Turkey + "/" + f); }
            foreach (var t in new[] { "turkey_white_albedo.png", "turkey_brown_albedo.png", "turkey_black_albedo.png", "turkey_normal.png", "turkey_mask.png" })
                Copy(Path.Combine(src, "textures", t), Path.Combine(Turkey, t));
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            foreach (var c in new[] { "white", "brown", "black" }) Tex($"{Turkey}/turkey_{c}_albedo.png", true, false, true);
            Tex(Turkey + "/turkey_normal.png", false, true); Tex(Turkey + "/turkey_mask.png", false);
            Texture2D normal = AssetDatabase.LoadAssetAtPath<Texture2D>(Turkey + "/turkey_normal.png"), mask = AssetDatabase.LoadAssetAtPath<Texture2D>(Turkey + "/turkey_mask.png");
            var mats = new Dictionary<string, Material>();
            foreach (var c in new[] { "white", "brown", "black" })
            {
                var path = $"{Turkey}/turkey_{c}.mat";
                var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (!mat) { mat = new Material(Shader.Find("MV/Lit")); AssetDatabase.CreateAsset(mat, path); }
                mat.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>($"{Turkey}/turkey_{c}_albedo.png")); mat.SetColor("_BaseColor", Color.white);
                mat.SetFloat("_AlphaClip", 1); mat.EnableKeyword("_ALPHATEST_ON"); mat.SetFloat("_Cutoff", .5f); mat.renderQueue = 2450;
                mat.SetTexture("_BumpMap", normal); mat.EnableKeyword("_NORMALMAP");
                mat.SetTexture("_MetallicGlossMap", mask); mat.EnableKeyword("_METALLICSPECGLOSSMAP"); mat.SetFloat("_Metallic", 1); mat.SetFloat("_Smoothness", 1); mat.SetFloat("_SmoothnessTextureChannel", 0);
                mat.SetTexture("_OcclusionMap", mask); mat.EnableKeyword("_OCCLUSIONMAP"); mat.SetFloat("_Cull", 2);
                EditorUtility.SetDirty(mat); mats[c] = mat;
            }
            var done = new List<object>();
            foreach (var f in files)
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(f); if (imp == null) continue;
                imp.animationType = ModelImporterAnimationType.Generic; imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                imp.importBlendShapes = false; imp.importNormals = ModelImporterNormals.Import; imp.importTangents = ModelImporterTangents.CalculateMikk;
                imp.maxBonesPerVertex = 4; imp.materialImportMode = ModelImporterMaterialImportMode.None;
                imp.importAnimation = true;
                var clips = imp.defaultClipAnimations.Select(c =>
                {
                    int bar = c.name.LastIndexOf('|'); if (bar >= 0) c.name = c.name.Substring(bar + 1);
                    c.loopTime = !c.name.EndsWith("death"); c.loopPose = false; return c;
                }).ToArray();
                imp.clipAnimations = clips;
                imp.SaveAndReimport();
                done.Add(new { f, clips = clips.Length, first = clips.FirstOrDefault()?.name });
            }
            AssetDatabase.SaveAssets();
            return done;
        }

        static Material Mat(string name)
        {
            var mp = $"{Props}/{name}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(mp);
            if (!mat) { mat = new Material(Shader.Find("MV/Lit")); AssetDatabase.CreateAsset(mat, mp); }
            return mat;
        }
        static Texture2D T(string f) => AssetDatabase.LoadAssetAtPath<Texture2D>($"{Props}/{f}.png");

        static Material ByObject(string obj)
        {
            if (obj == "screen") return null;
            if (obj == "led" || obj == "tv_led" || obj == "vcr_clock")
            {
                var e = Mat("prop_led"); e.SetColor("_BaseColor", new Color(.15f, 0, 0)); e.EnableKeyword("_EMISSION"); e.SetColor("_EmissionColor", new Color(1, .04f, .02f) * 5);
                e.globalIlluminationFlags = MaterialGlobalIlluminationFlags.EmissiveIsBlack; EditorUtility.SetDirty(e); return e;
            }
            if (obj == "lens")
            {
                var l = Mat("prop_lens"); var c = T("lens_coating"); l.SetTexture("_BaseMap", c); l.SetTexture("_EmissionMap", c); l.EnableKeyword("_EMISSION"); l.SetColor("_EmissionColor", Color.white * .12f);
                l.SetFloat("_Metallic", 1); l.SetFloat("_Smoothness", .95f); l.globalIlluminationFlags = MaterialGlobalIlluminationFlags.EmissiveIsBlack; EditorUtility.SetDirty(l); return l;
            }
            string b = obj == "tv_light_body" ? "tv_light" : obj;
            if (!T(b + "_albedo")) return null;
            var m = Mat("prop_" + b);
            m.SetTexture("_BaseMap", T(b + "_albedo")); m.SetColor("_BaseColor", Color.white);
            if (T(b + "_normal")) { m.SetTexture("_BumpMap", T(b + "_normal")); m.EnableKeyword("_NORMALMAP"); }
            if (T(b + "_metalsmooth")) { m.SetTexture("_MetallicGlossMap", T(b + "_metalsmooth")); m.EnableKeyword("_METALLICSPECGLOSSMAP"); m.SetFloat("_Metallic", 1); m.SetFloat("_Smoothness", 1); m.SetFloat("_SmoothnessTextureChannel", 0); }
            if (T(b + "_occlusion")) { m.SetTexture("_OcclusionMap", T(b + "_occlusion")); m.EnableKeyword("_OCCLUSIONMAP"); }
            EditorUtility.SetDirty(m);
            return m;
        }

        [BridgeCommand("importprops")]
        static object PropsCmd(JObject m)
        {
            Folder(Props);
            var src = Path.Combine(Gen, "props");
            var got = new List<string>();
            foreach (var f in Directory.GetFiles(src, "*.fbx")) { var to = Path.Combine(Props, Path.GetFileName(f)); File.Copy(f, to, true); got.Add(Path.GetFileName(f)); }
            foreach (var f in Directory.GetFiles(Path.Combine(src, "textures"), "*.png"))
            {
                var n = Path.GetFileName(f);
                if (n.Contains("_mask_raw")) continue;
                Copy(f, Path.Combine(Props, n));
            }
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            foreach (var p in AssetDatabase.FindAssets("t:Texture2D", new[] { Props }).Select(AssetDatabase.GUIDToAssetPath))
                Tex(p, p.EndsWith("_albedo.png") || p.EndsWith("_coating.png"), p.EndsWith("_normal.png"));
            var made = new List<string>();
            foreach (var fbx in got)
            {
                var path = Props + "/" + fbx;
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                imp.animationType = ModelImporterAnimationType.None; imp.importAnimation = false; imp.importTangents = ModelImporterTangents.CalculateMikk; imp.importNormals = ModelImporterNormals.Import;
                imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard; imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
                imp.SaveAndReimport();
                // The FBX embeds no textures: each object gets its own MV/Lit material by name, on every slot it has.
                var a = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                foreach (var r in a.GetComponentsInChildren<Renderer>(true))
                {
                    var mat = ByObject(r.name); if (!mat) continue;
                    foreach (var sl in r.sharedMaterials) if (sl) imp.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material), sl.name), mat);
                    made.Add(fbx + ":" + r.name);
                }
                imp.SaveAndReimport();
            }
            AssetDatabase.SaveAssets();
            return made;
        }
    }
}
