# Motion critic: mm_doc_fisthold

161 frames at 30 fps (5.33 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.3 over 10 moves, 10% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.54 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 3.6 | 5 big moves: 2 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.22 (1 = everything moves as one); typical lag between parts 0 frames; 43% of energy peaks have every part peaking together |
| 6 Weight | 9.2 | 0 centre-of-mass jerks, planted feet slide 11 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.33 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 11 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.58 robust z from 174 mocap clips; furthest: spineToArm low (0.94), armAccP95 high (0.92), headOmegaP95 low (0.81) |

## Worst moments

- **0:01.77** (1.77 s, f53) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:02.27** (2.27 s, f68) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:02.93** (2.93 s, f88) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 87 cm with no anticipation and no overshoot or settle
- **0:05.20** (5.2 s, f156) RightHand: RightHand moves at one speed for 0.13 s (flat 0.93): interpolation, not a move
