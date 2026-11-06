using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(0.3f, 0.8f, 0.9f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class MVBroadcastTrack : MVTrack { protected override Driver MakeDriver() => new GfxDriver(); }
}
