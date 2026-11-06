using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(1f, 0.9f, 0.3f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class LightTrack : MVTrack { protected override Driver MakeDriver() => new LightDriver(); }
}
