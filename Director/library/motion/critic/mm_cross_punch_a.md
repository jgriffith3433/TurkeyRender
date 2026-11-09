# Motion critic: mm_cross_punch_a

56 frames at 30 fps (1.83 s). **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.3 over 9 moves, 0% straight lines |
| 2 Slow in and out | 6.1 | speed shape 0.6 (bell 0.6, constant 1.0), 58% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.8 | 7 big moves: 3 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 6.4 | parts' speed profiles agree 0.63 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 53 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.83 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 4 key poses, readability 0.75 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.61 robust z from 174 mocap clips; furthest: moveRate high (1.39), armAccP95 high (0.84), armOmegaP95 high (0.83) |

## Worst moments

- **0:00.03** (0.03 s, f1) LeftHand: LeftHand starts at 93% of its peak speed in one frame (also abrupt-start)
- **0:01.03** (1.03 s, f31) LeftHand: LeftHand starts at 76% of its peak speed in one frame (also abrupt-stop)
- **0:01.67** (1.67 s, f50) LeftFoot: LeftFoot starts at 61% of its peak speed in one frame (also abrupt-stop)
- **0:01.40** (1.4 s, f42) RightHand: RightHand starts at 100% of its peak speed in one frame
