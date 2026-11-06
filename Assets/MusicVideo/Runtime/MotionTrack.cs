using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    [TrackColor(0.95f, 0.65f, 0.2f)]
    [TrackBindingType(typeof(MVActor))]
    [TrackClipType(typeof(MVClip))]
    public class MotionTrack : MVTrack { protected override Driver MakeDriver() => new MotionDriver(); }
}
