# Motion critic: mm_set_pat

131 frames at 30 fps (4.33 s). **Total 7.7/10: passable, weak on anticipation and ease (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 5.4 | median bend 0.09 over 7 moves, 0% straight lines |
| 2 Slow in and out | 2.5 | speed shape 0.76 (bell 0.6, constant 1.0), 75% of moves start or stop in one frame |
| 3 Timing | 8.5 | 4 holds (median 0.47 s), 0% of frames dead still, fast parts median 0.6 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 7 | parts' speed profiles agree 0.57 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.33 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.19 robust z from 174 mocap clips; furthest: legOmegaP95 low (2.94), energyCV high (2.28), spineOmegaP95 low (1.14) |

## Worst moments

- **0:02.43** (2.43 s, f73) LeftHand: LeftHand travels 67 cm with no anticipation and no overshoot or settle (also no-prep, linear, abrupt-start)
- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 71 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:03.23** (3.23 s, f97) LeftHand: LeftHand moves at one speed for 0.27 s (flat 0.92): interpolation, not a move (also abrupt-start, abrupt-stop)
- **0:03.50** (3.5 s, f105) RightHand: RightHand stops dead from 83% of its peak (also abrupt-stop)
