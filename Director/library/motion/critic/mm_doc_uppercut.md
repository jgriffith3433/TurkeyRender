# Motion critic: mm_doc_uppercut

27 frames at 30 fps (0.87 s). **Total 7.9/10: passable, weak on snaps and overlap (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 2.25 over 1 moves, 0% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.45 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 1 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 4.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 134 cm/s |
| 7 Snaps and pops | 0 | 1 body snaps or pops in 0.87 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.8 robust z from 174 mocap clips; furthest: handSpeedP95 high (1.16), headOmegaP50 high (1.14), armAccP95 high (1.1) |

## Worst moments

- **0:00.73** (0.73 s, f22) LeftLowerLeg: LeftLowerLeg jumps 9 deg in one frame
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand starts at 71% of its peak speed in one frame (also abrupt-start)
