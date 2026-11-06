using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(1f, 0.35f, 0.2f)]
    [TrackBindingType(typeof(MVStage))]
    [TrackClipType(typeof(MVClip))]
    public class FxTrack : MVTrack { protected override Driver MakeDriver() => new FxDriver(); }
}
