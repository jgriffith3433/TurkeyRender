# Motion critic: splice_7948_2.3-4.5_cheer1_0.6-4.5

177 frames at 30 fps (5.87 s). **Total 8.9/10: reads as human (8.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.45 over 12 moves, 0% straight lines |
| 2 Slow in and out | 7.3 | speed shape 0.57 (bell 0.6, constant 1.0), 44% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 5.6 | 7 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.3 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.8 | 0 centre-of-mass jerks, planted feet slide 16 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.87 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 12 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.55 robust z from 174 mocap clips; furthest: armAccP95 high (0.86), moveRate high (0.81), spineToArm low (0.72) |

## Worst moments

- **0:00.07** (0.07 s, f2) RightHand: RightHand travels 100 cm with no anticipation and no overshoot or settle
- **0:05.87** (5.87 s, f176) RightHand: RightHand stops dead from 90% of its peak
- **0:04.93** (4.93 s, f148) LeftHand: LeftHand starts at 68% of its peak speed in one frame (also abrupt-stop)
- **0:03.60** (3.6 s, f108) LeftHand: LeftHand starts at 66% of its peak speed in one frame
- **0:01.60** (1.6 s, f48) RightFoot: RightFoot starts at 86% of its peak speed in one frame
