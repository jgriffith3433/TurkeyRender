# Motion critic: vm_lift_cleanjerk

126 frames at 30 fps (4.17 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 7.9 | median bend 0.12 over 16 moves, 6% straight lines |
| 2 Slow in and out | 9.8 | speed shape 0.43 (bell 0.6, constant 1.0), 18% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.3 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 2.7 | 12 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6.2 | parts' speed profiles agree 0.65 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.4 | 0 centre-of-mass jerks, planted feet slide 20 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.17 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 8 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.67 robust z from 174 mocap clips; furthest: energyCV high (2.18), moveRate high (0.6), spineOmegaP50 low (0.48) |

## Worst moments

- **0:02.00** (2 s, f60) LeftHand: LeftHand travels 62 cm with no anticipation and no overshoot or settle
- **0:03.17** (3.17 s, f95) LeftHand: LeftHand travels 77 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.67** (0.67 s, f20) Head: Head travels 56 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame (also abrupt-start)
