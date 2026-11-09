# Motion critic: DeathBackCombat

96 frames at 30 fps (3.17 s). **Total 9.2/10: reads as human (9.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.15 over 10 moves, 0% straight lines |
| 2 Slow in and out | 9.1 | speed shape 0.5 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 7 | 9 big moves: 1 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 7.1 | parts' speed profiles agree 0.56 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 71 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.17 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.76 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 25 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.59 robust z from 174 mocap clips; furthest: handSpeedP95 high (0.98), energyCV high (0.88), armAccP95 high (0.87) |

## Worst moments

- **0:00.03** (0.03 s, f1) LeftHand: LeftHand travels 231 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:01.07** (1.07 s, f32) LeftFoot: LeftFoot travels 118 cm with no anticipation and no overshoot or settle
- **0:01.70** (1.7 s, f51) LeftFoot: LeftFoot travels 97 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:02.10** (2.1 s, f63) RightHand: RightHand stops dead from 73% of its peak
