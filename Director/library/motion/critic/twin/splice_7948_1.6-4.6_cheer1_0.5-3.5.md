# Motion critic: splice_7948_1.6-4.6_cheer1_0.5-3.5

174 frames at 30 fps (5.77 s). **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.34 over 14 moves, 7% straight lines |
| 2 Slow in and out | 7.4 | speed shape 0.58 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 7.2 | 10 big moves: 3 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.28 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.9 | 0 centre-of-mass jerks, planted feet slide 14 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.77 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 12 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.53 robust z from 174 mocap clips; furthest: moveRate high (0.84), energyCV high (0.68), armAccP95 high (0.67) |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 98 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:00.77** (0.77 s, f23) RightHand: RightHand travels 100 cm with no anticipation and no overshoot or settle
- **0:02.80** (2.8 s, f84) RightFoot: RightFoot travels 16 cm in a straight line (bend 0.03)
- **0:05.37** (5.37 s, f161) LeftHand: LeftHand starts at 67% of its peak speed in one frame
- **0:04.50** (4.5 s, f135) LeftHand: LeftHand starts at 67% of its peak speed in one frame
