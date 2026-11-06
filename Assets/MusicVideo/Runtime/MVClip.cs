using System;
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [Serializable]
    public class MVClip : PlayableAsset, ITimelineClipAsset
    {
        public string kind;
        [TextArea(2, 8)] public string args = "{}";
        public UnityEngine.Object[] refs;
        public ClipCaps clipCaps => ClipCaps.None;
        public override Playable CreatePlayable(PlayableGraph graph, GameObject owner) => Playable.Create(graph);
    }
}
