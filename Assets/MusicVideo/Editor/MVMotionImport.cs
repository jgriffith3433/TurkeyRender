using System.IO;
using UnityEditor;

namespace TKShock.MV.EditorTools
{
    /// <summary>Mixamo clips dropped in Assets/MusicVideo/Motion: Humanoid, root kept in the clip so `root:1` plays it, and the clip named after the file (Mixamo calls every clip mixamo.com).</summary>
    public class MVMotionImport : AssetPostprocessor
    {
        static bool Mine(string p) => p.Replace((char)92, (char)47).StartsWith(ScoreCompiler.MotionFolder + (char)47);

        void OnPreprocessModel()
        {
            if (!Mine(assetPath)) return;
            var m = (ModelImporter)assetImporter;
            m.animationType = ModelImporterAnimationType.Human;
            m.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            m.importAnimation = true; m.materialImportMode = ModelImporterMaterialImportMode.None; m.importBlendShapes = false;
        }

        void OnPreprocessAnimation()
        {
            if (!Mine(assetPath)) return;
            var m = (ModelImporter)assetImporter;
            var name = Path.GetFileNameWithoutExtension(assetPath); int at = name.IndexOf('@'); if (at >= 0) name = name.Substring(at + 1);
            var clips = m.defaultClipAnimations;
            for (int i = 0; i < clips.Length; i++)
            {
                clips[i].name = clips.Length == 1 ? name : name + i;
                clips[i].lockRootRotation = false; clips[i].lockRootHeightY = false; clips[i].lockRootPositionXZ = false;
                clips[i].keepOriginalOrientation = true; clips[i].keepOriginalPositionY = true; clips[i].keepOriginalPositionXZ = true;
            }
            m.clipAnimations = clips;
        }
    }
}
