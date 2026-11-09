# Motion critic: splice_7948_2.0-4.6_cheer1_0.5-4.5

192 frames at 30 fps (6.37 s). **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.4 over 17 moves, 6% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.59 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 7.9 | 11 big moves: 3 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.29 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.9 | 0 centre-of-mass jerks, planted feet slide 14 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 6.37 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 13 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.55 robust z from 174 mocap clips; furthest: moveRate high (1), armAccP95 high (0.79), spineToArm low (0.69) |

## Worst moments

- **0:00.37** (0.37 s, f11) RightHand: RightHand travels 100 cm with no anticipation and no overshoot or settle
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame
- **0:06.37** (6.37 s, f191) RightHand: RightHand stops dead from 90% of its peak
- **0:02.40** (2.4 s, f72) RightFoot: RightFoot travels 16 cm in a straight line (bend 0.03)
- **0:05.43** (5.43 s, f163) LeftHand: LeftHand starts at 68% of its peak speed in one frame
