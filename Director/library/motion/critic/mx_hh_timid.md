# Motion critic: mx_hh_timid

392 frames at 30 fps (13.03 s). **Total 8.1/10: passable, weak on anticipation and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 3 moves, 0% straight lines |
| 2 Slow in and out | 3.4 | speed shape 0.71 (bell 0.6, constant 1.0), 69% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.27 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.25 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.5 | 0 centre-of-mass jerks, planted feet slide 8 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 13.03 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 8.6 | 16 key poses, readability 0.69 (best of front, side, three-quarter), 94% twinned |
| 10 Hands and face | 10 | fingers curl 12 deg, spread 28 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.70** (3.7 s, f111) LeftHand: LeftHand starts at 66% of its peak speed in one frame (also abrupt-stop)
- **0:00.33** (0.33 s, f10) LeftHand: LeftHand starts at 79% of its peak speed in one frame (also abrupt-stop)
- **0:04.37** (4.37 s, f131) RightHand: RightHand starts at 63% of its peak speed in one frame (also abrupt-stop)
- **0:06.63** (6.63 s, f199) RightHand: RightHand stops dead from 63% of its peak
- **0:09.70** (9.7 s, f291) RightHand: RightHand stops dead from 72% of its peak
