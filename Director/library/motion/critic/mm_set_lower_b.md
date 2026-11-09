# Motion critic: mm_set_lower_b

301 frames at 30 fps (10 s). **Total 8.3/10: passable, weak on anticipation and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.32 over 10 moves, 10% straight lines |
| 2 Slow in and out | 5.2 | speed shape 0.66 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 0.53 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4.1 | 8 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6.5 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.8 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 10 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 4 key poses, readability 0.77 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 57% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.3 | 1.34 robust z from 174 mocap clips; furthest: armOmegaP95 low (1.9), legOmegaP95 low (1.87), spineToArm high (1.71) |

## Worst moments

- **0:02.17** (2.17 s, f65) Head: the head hangs 26 deg forward of the chest
- **0:09.83** (9.83 s, f295) RightFoot: RightFoot starts at 69% of its peak speed in one frame (also abrupt-stop)
- **0:03.03** (3.03 s, f91) RightHand: RightHand starts at 71% of its peak speed in one frame (also abrupt-stop)
- **0:08.17** (8.17 s, f245) RightHand: RightHand starts at 70% of its peak speed in one frame
- **0:08.60** (8.6 s, f258) RightHand: RightHand stops dead from 65% of its peak
