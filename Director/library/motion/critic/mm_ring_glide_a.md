# Motion critic: mm_ring_glide_a

49 frames at 30 fps (1.6 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 10 moves, 0% straight lines |
| 2 Slow in and out | 4.4 | speed shape 0.66 (bell 0.6, constant 1.0), 90% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4.6 | 9 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6.5 | parts' speed profiles agree 0.62 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 68 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.6 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.73 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.53 robust z from 174 mocap clips; furthest: moveRate high (0.99), energyCV high (0.84), headOmegaP50 high (0.83) |

## Worst moments

- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot travels 49 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:01.60** (1.6 s, f48) RightHand: RightHand stops dead from 71% of its peak (also abrupt-stop)
- **0:01.20** (1.2 s, f36) LeftFoot: LeftFoot starts at 61% of its peak speed in one frame
