using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(0.8f, 0.3f, 0.9f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class PostTrack : MVTrack { protected override Driver MakeDriver() => new PostDriver(); }
}
