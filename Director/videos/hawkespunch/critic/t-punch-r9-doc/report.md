# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 7/10: passable, weak on overlap and snaps (7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.14 over 13 moves, 8% straight lines |
| 2 Slow in and out | 3.9 | speed shape 0.68 (bell 0.6, constant 1.0), 71% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 1.58 s), 0% of frames dead still, fast parts median 0.21 s |
| 4 Anticipation and follow-through | 5.2 | 8 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.89 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.9 | 0 centre-of-mass jerks, planted feet slide 25 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 31 deg, spread 23 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.8 | 1.24 robust z from 174 mocap clips; furthest: energyCV high (4.64), headOmegaP50 low (1.16), armOmegaP50 low (1.12) |

## Worst moments

- **1:07.04** (67.04 s, f67) doctor.LeftUpperLeg: LeftUpperLeg jumps 22 deg in one frame (also snap)
- **1:04.63** (64.63 s, f9) doctor.LeftFoot: LeftFoot jumps 13 deg in one frame (also abrupt-start, no-prep, abrupt-stop)
- **1:06.42** (66.42 s, f52) doctor.RightUpperArm: RightUpperArm jumps 13 deg in one frame
- **1:06.79** (66.79 s, f61) doctor.RightHand: RightHand travels 32 cm with no anticipation and no overshoot or settle
- **1:08.46** (68.46 s, f101) doctor.RightFoot: RightFoot starts at 71% of its peak speed in one frame
