# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 6.9/10: looks animated, not acted: snaps and overlap give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.32 over 10 moves, 10% straight lines |
| 2 Slow in and out | 5 | speed shape 0.56 (bell 0.6, constant 1.0), 82% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.54 s), 0% of frames dead still, fast parts median 0.08 s |
| 4 Anticipation and follow-through | 3.8 | 8 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 0.9 | parts' speed profiles agree 0.77 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.6 | 2 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 12 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.21 robust z from 174 mocap clips; furthest: energyCV high (4.76), legOmegaP95 low (1.01), headOmegaP50 low (0.98) |

## Worst moments

- **1:06.79** (66.79 s, f61) doctor.LeftUpperArm: LeftUpperArm jumps 74 deg in one frame (also snap, pop, com-spike, no-prep, abrupt-start, abrupt-stop)
- **1:04.79** (64.79 s, f13) doctor.LeftLowerArm: LeftLowerArm jumps 27 deg in one frame (also no-prep, abrupt-start, abrupt-stop)
- **1:07.83** (67.83 s, f86) doctor.LeftHand: LeftHand travels 50 cm with no anticipation and no overshoot or settle
- **1:05.04** (65.04 s, f19) doctor.LeftHand: LeftHand starts at 100% of its peak speed in one frame (also abrupt-stop)
- **1:08.63** (68.63 s, f105) doctor.LeftFoot: LeftFoot starts at 61% of its peak speed in one frame
