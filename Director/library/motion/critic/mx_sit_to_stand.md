# Motion critic: mx_sit_to_stand

183 frames at 30 fps (6.07 s). **Total 8.3/10: passable, weak on snaps and anticipation (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 10 moves, 0% straight lines |
| 2 Slow in and out | 7.6 | speed shape 0.58 (bell 0.6, constant 1.0), 42% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.97 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 6.7 | 8 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 15 cm/s |
| 7 Snaps and pops | 0 | 9 body snaps or pops, 2 finger snaps in 6.07 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 12 key poses, readability 0.71 (best of front, side, three-quarter), 8% twinned |
| 10 Hands and face | 10 | fingers curl 8 deg, spread 18 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.90** (1.9 s, f57) LeftUpperLeg: LeftUpperLeg jumps 15 deg in one frame (also snap, no-prep, abrupt-start, abrupt-stop)
- **0:02.50** (2.5 s, f75) LeftLowerArm: LeftLowerArm jumps 13 deg in one frame (also snap)
- **0:03.07** (3.07 s, f92) RightFoot: RightFoot jumps 11 deg in one frame
- **0:00.50** (0.5 s, f15) LeftHand: LeftHand travels 75 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:04.77** (4.77 s, f143) RightFoot: RightFoot stops dead from 61% of its peak
