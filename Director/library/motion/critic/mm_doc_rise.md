# Motion critic: mm_doc_rise

176 frames at 30 fps (5.83 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.52 over 14 moves, 0% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.54 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 4.7 | 7 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 4.9 | parts' speed profiles agree 0.4 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 55 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.83 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 12 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.52 robust z from 174 mocap clips; furthest: moveRate high (0.93), armAccP95 high (0.84), spineToArm low (0.73) |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 59 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:05.83** (5.83 s, f175) RightHand: RightHand stops dead from 87% of its peak (also abrupt-stop)
- **0:05.33** (5.33 s, f160) RightHand: RightHand travels 37 cm with no anticipation and no overshoot or settle
- **0:02.53** (2.53 s, f76) LeftHand: LeftHand starts at 63% of its peak speed in one frame (also abrupt-stop)
- **0:03.17** (3.17 s, f95) LeftHand: LeftHand stops dead from 65% of its peak
