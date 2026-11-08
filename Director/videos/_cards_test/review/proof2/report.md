# _cards_test proof2: 30 fps review

Video: `videos/_cards_test/output/_cards_test-proof2.mp4`, 3:24.20, 320x180, 30 fps, 6126 frames. Written by `mv review` 2026-11-08T01:03. Times are video seconds; f is the frame. Shots are named from cards.map.json.

Severity: A breaks the viewer out, B noticeable, C minor. Only faults the reviewer called certain are in the tables; "likely" ones are listed at the end.

## Verdict

**Not ready: 2 A faults.** 5 B, 0 C. 0 spikes and 11 cuts read as strips; 12 of 12 shots reviewed, 10 carried unchanged from earlier reviews (same shot hash). Vision $0.02.

Biggest spike in the video: 0:00.47 in alone (frame difference x41.9 (41.86)).

## A faults

| Time | Frame | Shot | Fault | Fix |
|---|---|---|---|---|
| 0:22.73 | f682 | walk | From 22.70 to 22.83 the upper arm and forearm lie across the head and face, like a dab. The face is hidden and the silhouette is a muddle of arm and head. The hand held out the other side is stiff and doesn't move between frames. | Lift the elbow and open the arm away from the head, or replace the pose with a clear walk swing so the face and silhouette read. |
| 0:28.06 | f842 | lamp | At 28.03 the scene goes dark. At 28.06 the background jumps to a flat orange-purple gradient and the figure becomes a near-black silhouette. The wall, floor and pillar vanish. This is a one-frame hard swap with no transition, matching the x34 difference spike. | If it is not an intended lighting cut, fix the light or background swap so it fades or cuts cleanly. If intended, make it a real cut with a consistent setup. |

## B faults

| Time | Frame | Shot | Fault | Fix |
|---|---|---|---|---|
| 0:08.80 | f264 | over_him | The first frames of the shot are not yet the shot. At 8.76 both hands are raised by the chin. They sweep outward at 8.80 and 8.83, then drop to the hanging pose at 8.86. Both arms move a large distance per frame for about 4 frames before settling at 8.90. | Start the shot on the settled hanging pose, or trim the first ~5 frames so the arm travel is not on screen after the cut. |
| 0:14.26 | f428 | hero | The figure's head is cut off by the top of the frame in the opening tiles (14.26 to 14.36) and only just peeks in at the bottom of the frame in the later tiles. The hero's face is never readable, which defeats the power idea. | Tilt the camera up or lower the framing so the head and face sit fully inside the frame with some headroom. |
| 0:14.33 | f430 | hero | The figure stands in a stiff, near-symmetrical pose with both arms hanging straight and both fists clenched at the same height. There is no clear line of action and no power attitude, and the silhouette is dark against a dark wall. | Give her an asymmetrical power pose, such as a weight shift, one hand on the hip, or a chest-up stance. Add rim light so the silhouette separates from the wall. |
| 0:22.63 | f679 | walk | Between 22.56 and 22.66 the near arm goes from hanging at the side to raised and extended in about 4 frames, and the torso shifts at the same time. This is the start of the shot, so it looks like the cut tweening into the pose rather than a motion that starts already underway. | Start the shot with the arm already in or close to the raised pose, or trim the first 5 frames of the clip. |
| 0:25.36 | f761 | lamp | Right arm swings from raised near the face (25.29) to extended out (25.33) to hanging low with fist by hip (25.39) in about 3 frames. It reads as the cut tweening or a snap into pose, not a settled first frame. | Start the shot already in the hanging pose, or trim the first 6 frames of the mocap so the arm drop happens before the cut. |

## C faults

none

## Likely, not certain

| Time | Frame | Shot | Fault | Fix |
|---|---|---|---|---|
| 0:08.93 | f268 | over_him | The idea is 'she looks down at him', but from 8.76 to 9.00 the head stays level and faces the camera with no downward tilt or eye lead. The held pose has both arms hanging almost symmetrically, so it reads as neutral and blank rather than judging. | Tilt the head and chin down toward him, add an eye lead, and break the arm symmetry, for example with one hand lifted or one shoulder dropped. |
| 0:10.30 | f309 | over_her | From 10.16 to 10.40 the head, eyes and expression barely change. He holds a flat stare with a stiff torso and no visible look-up beat or anticipation, so the 'finally looks up' idea doesn't read yet. | Add a small head tilt and eye lead, or a blink, in the first few frames of the shot. This sets up the look-up. |
| 0:14.30 | f429 | hero | The coffee table cuts across her legs and the low camera angle hides her feet. Her contact with the floor can't be seen, and the table competes with her for attention. | Move the camera or the table so her feet and legs are visible, or raise the camera slightly. |
| 0:14.43 | f433 | hero | Across all 8 tiles the body barely changes. There is no breath, no hip shift and no settle after the cut, so she reads as a frozen model rather than a character taking the room. | Add a subtle weight shift or breathing, or a small hip-led move in the first half second. |
| 0:22.76 | f683 | walk | The idea is 'she leaves him behind', but the body is hunched with arms raised in a zombie or dab shape and the legs are crouched. It doesn't read as walking away, and the held pose is nearly frozen across 22.70 to 22.83. | Use a upright walking-away pose with a natural arm swing and hips leading, and keep any hold brief. |
| 0:25.43 | f763 | lamp | After the fast drop the arms stop almost dead by 25.46–25.53 with no overshoot or settle. The pose snaps and then freezes. | Add a small overshoot and ease into the hanging pose. |
| 0:28.09 | f843 | lamp | From 28.06 to 28.23 the silhouette is nearly static with arms hanging in a stiff, symmetrical pose and a blank, dead hold. No weight shift or breathing reads. | Add a subtle weight shift, breath or head move during the hold. |

## Coverage

- Metrics: all 6126 frames at 160x90: frame difference, a one-frame came-back test and 8x6 block-matching flow with the camera's median shift taken out.
- Strips: every cut (11) and 0 spikes, 8 consecutive frames each, cropped to him from the shot's lens and its motion. Faults between spikes and away from cuts can be missed: this reads about 1.44% of the frames at 30 fps.
- Not checked: audio, lip sync, playback at speed. J's eye at full speed stays the judge of feel.
