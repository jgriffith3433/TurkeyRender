using UnityEngine;
using UnityEngine.Timeline;

namespace TKShock.MV
{
    /// <summary>
    /// Slow motion. Shows the speed changes on the Timeline; the compiler bakes them into SongMap.warp. The song keeps
    /// playing at full speed, while motion, animation and effects read "scene time" from the warp.
    /// </summary>
    [TrackColor(1f, 1f, 1f)]
    [TrackClipType(typeof(MVClip))]
    public class TimeTrack : MVTrack { protected override Driver MakeDriver() => new NoDriver(); }

    public class NoDriver : Driver { public override void Apply(double t, object binding) { } }
}
