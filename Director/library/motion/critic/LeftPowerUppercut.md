# Motion critic: LeftPowerUppercut

39 frames at 30 fps (1.27 s). **Total 7.8/10: passable, weak on snaps and ease (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.32 over 7 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.47 (bell 0.6, constant 1.0), 75% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6.6 | 5 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5.3 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8 | 0 centre-of-mass jerks, planted feet slide 25 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops in 1.27 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 73 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.8 robust z from 174 mocap clips; furthest: handSpeedP95 high (1.28), armAccP95 high (1.21), headOmegaP95 high (1) |

## Worst moments

- **0:00.43** (0.43 s, f13) LeftHand: LeftHand moves 23 cm in one frame (also pop)
- **0:01.27** (1.27 s, f38) RightHand: RightHand stops dead from 100% of its peak (also abrupt-stop)
- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 42 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:00.87** (0.87 s, f26) Head: Head travels 35 cm with no anticipation and no overshoot or settle
