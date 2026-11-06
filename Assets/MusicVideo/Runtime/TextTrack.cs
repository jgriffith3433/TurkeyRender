using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(0.3f, 0.9f, 0.7f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class TextTrack : MVTrack { protected override Driver MakeDriver() => new TextDriver(); }
}
