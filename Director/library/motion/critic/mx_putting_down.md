# Motion critic: mx_putting_down

312 frames at 30 fps (10.37 s). **Total 7.8/10: passable, weak on ease and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 8.3 | median bend 0.12 over 10 moves, 20% straight lines |
| 2 Slow in and out | 3.5 | speed shape 0.76 (bell 0.6, constant 1.0), 59% of moves start or stop in one frame |
| 3 Timing | 10 | 6 holds (median 0.8 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4.6 | 9 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 4.5 | parts' speed profiles agree 0.68 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops, 5 finger snaps in 10.37 s |
| 8 Stiffness | 8.5 | 8% of core joints frozen while the body moves; never moves: LeftShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 8 deg, spread 21 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.63** (2.63 s, f79) Head: Head travels 72 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:06.07** (6.07 s, f182) Head: Head travels 80 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:04.17** (4.17 s, f125) RightFoot: RightFoot travels 24 cm in a straight line (bend 0.02)
- **0:01.53** (1.53 s, f46) LeftHand: LeftHand starts at 76% of its peak speed in one frame (also abrupt-stop)
- **0:03.07** (3.07 s, f92) LeftHand: LeftHand stops dead from 69% of its peak
