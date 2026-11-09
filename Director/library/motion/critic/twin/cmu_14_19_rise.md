# Motion critic: cmu_14_19_rise

88 frames at 30 fps (2.9 s). **Total 9.7/10: reads as human (9.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.45 over 9 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.53 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8.1 | 7 big moves: 3 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.22 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.9 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 17% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.36 robust z from 174 mocap clips; furthest: handSpeedP95 high (0.92), armOmegaP95 high (0.54), legOmegaP95 low (0.53) |

## Worst moments

- **0:01.03** (1.03 s, f31) RightHand: RightHand travels 82 cm with no anticipation and no overshoot or settle
- **0:02.30** (2.3 s, f69) RightHand: RightHand travels 102 cm with no anticipation and no overshoot or settle
- **0:02.90** (2.9 s, f87) RightHand: RightHand stops dead from 66% of its peak (also abrupt-stop)
- **0:02.03** (2.03 s, f61) LeftFoot: LeftFoot travels 40 cm with no anticipation and no overshoot or settle
- **0:00.47** (0.47 s, f14) LeftFoot: LeftFoot stops dead from 91% of its peak
