using TMPro;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace TKShock.MV
{
    [System.Serializable] public class ShowInfo { public string name, cam, label; public int channel; }

    /// <summary>Everything the look tracks drive: post volume, lights, sky, overlay. Built by the compiler.</summary>
    public class MVStage : MonoBehaviour
    {
        public Volume volume;
        public Light[] lights = new Light[0];
        public string[] lightNames = new string[0];
        public Color[] lightColors = new Color[0];
        public float[] lightIntensities = new float[0];
        public Material sky;
        public Image flash, barTop, barBottom;
        public RawImage insert;
        public TextMeshProUGUI[] labels = new TextMeshProUGUI[0];
        public Transform fxRoot;
        public Vector3 suckPoint;
        public MVGfx[] gfx = new MVGfx[0];       // 0 the screen, 1 the TV feed
        public ShowInfo[] shows = new ShowInfo[0];
    }
}
