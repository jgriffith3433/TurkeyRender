# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 7.4/10: passable, weak on overlap and anticipation (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.23 over 9 moves, 0% straight lines |
| 2 Slow in and out | 4.5 | speed shape 0.65 (bell 0.6, constant 1.0), 94% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 1.63 s), 0% of frames dead still, fast parts median 0.25 s |
| 4 Anticipation and follow-through | 1.5 | 6 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0.9 | parts' speed profiles agree 0.77 (1 = everything moves as one); typical lag between parts 0 frames; 13% of energy peaks have every part peaking together |
| 6 Weight | 9.5 | 0 centre-of-mass jerks, planted feet slide 8 cm/s |
| 7 Snaps and pops | 5 | 2 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.2 robust z from 174 mocap clips; furthest: energyCV high (3.67), legOmegaP95 low (1.61), headOmegaP50 low (1.12) |

## Worst moments

- **1:04.67** (64.67 s, f10) doctor.body: 5 of 5 parts peak on the same frame (everything moves as one) (also abrupt-start)
- **1:06.42** (66.42 s, f52) doctor.RightUpperArm: RightUpperArm jumps 21 deg in one frame (also pop, abrupt-stop)
- **1:08.50** (68.5 s, f102) doctor.RightHand: RightHand travels 61 cm with no anticipation and no overshoot or settle (also no-prep)
- **1:06.79** (66.79 s, f61) doctor.RightHand: RightHand starts at 79% of its peak speed in one frame (also no-prep)
- **1:09.21** (69.21 s, f119) doctor.RightHand: RightHand stops dead from 68% of its peak
