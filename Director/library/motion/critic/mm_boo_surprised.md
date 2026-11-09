# Motion critic: mm_boo_surprised

96 frames at 30 fps (3.17 s). **Total 8.2/10: passable, weak on anticipation and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 4 moves, 0% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.61 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 8.3 | 1 holds (median 1.77 s), 0% of frames dead still, fast parts median 0.63 s |
| 4 Anticipation and follow-through | 0 | 4 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 7.6 | parts' speed profiles agree 0.52 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.17 s |
| 8 Stiffness | 7.8 | 16% of core joints frozen while the body moves; never moves: RightUpperLeg |
| 9 Silhouette | 9.3 | 6 key poses, readability 0.73 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.2 | 1.36 robust z from 174 mocap clips; furthest: energyCV high (2.88), legOmegaP95 low (2.78), handSpeedP50 low (1.44) |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 59 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:02.57** (2.57 s, f77) RightHand: RightHand travels 57 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:03.17** (3.17 s, f95) RightHand: RightHand stops dead from 73% of its peak
- **0:00.47** (0.47 s, f14) Head: Head stops dead from 91% of its peak
