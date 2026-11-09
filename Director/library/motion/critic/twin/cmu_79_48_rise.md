# Motion critic: cmu_79_48_rise

82 frames at 30 fps (2.7 s). **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.3 over 7 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.5 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 9.8 | 7 big moves: 3 with anticipation, 5 with overshoot and settle |
| 5 Overlap and drag | 5.9 | parts' speed profiles agree 0.55 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.7 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 68% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.65 robust z from 174 mocap clips; furthest: handSpeedP95 high (0.99), energyCV high (0.95), spineToArm high (0.92) |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame (also bowed-head)
- **0:01.30** (1.3 s, f39) RightFoot: RightFoot starts at 86% of its peak speed in one frame (also abrupt-stop)
