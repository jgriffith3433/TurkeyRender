using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(0.4f, 0.8f, 1f)]
    [TrackBindingType(typeof(MVActor))]
    [TrackClipType(typeof(MVClip))]
    public class TvTrack : MVTrack { protected override Driver MakeDriver() => new TvDriver(); }
}
