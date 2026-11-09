# Motion critic: mm_flinch_a

64 frames at 30 fps (2.1 s). **Total 8/10: passable, weak on overlap and arcs (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 4.8 | median bend 0.08 over 14 moves, 14% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.61 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.27 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 10 | 9 big moves: 5 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.86 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 30 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.1 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.76 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.14 robust z from 174 mocap clips; furthest: spineToArm high (2.43), moveRate high (1.62), energyCV high (1.56) |

## Worst moments

- **0:00.97** (0.97 s, f29) LeftHand: LeftHand travels 39 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 72% of its peak speed in one frame (also abrupt-start)
- **0:01.37** (1.37 s, f41) RightHand: RightHand starts at 64% of its peak speed in one frame
- **0:01.70** (1.7 s, f51) RightHand: RightHand stops dead from 77% of its peak (also abrupt-start)
- **0:02.03** (2.03 s, f61) LeftHand: LeftHand stops dead from 100% of its peak
