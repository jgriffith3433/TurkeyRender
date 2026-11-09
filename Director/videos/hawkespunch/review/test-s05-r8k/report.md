# hawkespunch test-s05-r8k: 30 fps review

Video: `videos/hawkespunch/tests/s05_ring/r8/s05-r8k-720-mix.mp4`, 0:05.00, 1280x720, 24 fps, 120 frames. Written by `mv review` 2026-11-09T00:25. Times are video seconds; f is the frame. Shots are cut by detected cuts (the render is not the whole cut).

Severity: A breaks the viewer out, B noticeable, C minor. Only faults the reviewer called certain are in the tables; "likely" ones are listed at the end.

## Verdict

**No A faults.** 3 B, 0 C. 2 spikes and 3 cuts read as strips; 4 of 4 shots reviewed. Vision $0.04.

Biggest spike in the video: 0:03.17 in cut-0-03-00 (one patch jumps (cell 134.4, x1.6)).

## A faults

none

## B faults

| Time | Frame | Shot | Fault | Fix |
|---|---|---|---|---|
| 0:03.04 | f73 | cut-0-03-00 | The shot opens with about three frames (3.04 to 3.08, and nearly 3.12) of almost pure black. The floor disappears and then the rock pops in. A viewer sees an empty frame and a sudden entrance, not a clear first frame. | Trim the dead black frames, or fade the lighting up so the floor stays visible as the rock enters. |
| 0:04.54 | f109 | cut-0-04-50 | Two frames (4.54, 4.58) show a harsh black/white inverted threshold look of the scene before the real shot appears at 4.62. The flash reads as a glitch and not as a designed transition, and the white frame at 4.50 makes it a three-frame stutter. | Cut straight to the 4.62 frame, or make the flash a single clean white frame that fades into the shot. |
| 0:04.87 | f117 | cut-0-04-58 | A bright white elliptical streak and a vertical grey band appear for one frame across the rock and the character's arm. They pop in with no build-up, and by 4.91 they have shrunk to a thin line. The effect reads as an unmotivated flash that crosses in front of the pointing hand. | Add 2-3 frames of build-up or fade for the ring. Keep it off the character's hand, or place it deliberately behind him. |

## C faults

none

## Likely, not certain

| Time | Frame | Shot | Fault | Fix |
|---|---|---|---|---|
| 0:04.70 | f113 | cut-0-04-58 | The character is frozen in the same pointing pose from 4.62 to 4.95, with no breathing, no head movement and no arm settle. He looks like a static cutout, and the second figure in the water is also still. | Add a small arm and head drift, or an overshoot and settle on the point. |

## Coverage

- Metrics: all 120 frames at 160x90: frame difference, a one-frame came-back test and 8x6 block-matching flow with the camera's median shift taken out.
- Strips: every cut (3) and 2 spikes, 8 consecutive frames each, cropped to him from the shot's lens and its motion. Faults between spikes and away from cuts can be missed: this reads about 33.33% of the frames at 30 fps.
- Not checked: audio, lip sync, playback at speed. J's eye at full speed stays the judge of feel.
