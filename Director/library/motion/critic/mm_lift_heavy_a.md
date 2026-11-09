# Motion critic: mm_lift_heavy_a

73 frames at 30 fps (2.4 s). **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.1 over 8 moves, 0% straight lines |
| 2 Slow in and out | 7.5 | speed shape 0.64 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 5 big moves: 3 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.17 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 33 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.4 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.73 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.37 robust z from 174 mocap clips; furthest: headOmegaP95 low (0.87), armAccP95 low (0.49), armOmegaP95 low (0.46) |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand moves at one speed for 0.23 s (flat 0.9): interpolation, not a move (also no-prep, abrupt-start, abrupt-stop)
- **0:01.83** (1.83 s, f55) RightFoot: RightFoot starts at 69% of its peak speed in one frame
- **0:02.40** (2.4 s, f72) RightFoot: RightFoot stops dead from 100% of its peak
