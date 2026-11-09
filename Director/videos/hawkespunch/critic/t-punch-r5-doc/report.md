# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 7.1/10: passable, weak on overlap and snaps (7.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.04 over 11 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.47 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.46 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 7.3 | 9 big moves: 5 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.89 (1 = everything moves as one); typical lag between parts 0 frames; 13% of energy peaks have every part peaking together |
| 6 Weight | 5 | 3 centre-of-mass jerks, planted feet slide 0 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.7 | 1.26 robust z from 174 mocap clips; furthest: energyCV high (5), spineAccP95 high (1.2), handSpeedP95 high (1.08) |

## Worst moments

- **1:06.83** (66.83 s, f62) doctor.body: 5 of 5 parts peak on the same frame (everything moves as one) (also com-spike)
- **1:08.88** (68.88 s, f111) doctor.RightUpperArm: RightUpperArm jumps 19 deg in one frame (also snap)
- **1:07.63** (67.63 s, f81) doctor.RightUpperArm: RightUpperArm jumps 16 deg in one frame (also snap)
- **1:07.38** (67.38 s, f75) doctor.LeftUpperArm: LeftUpperArm jumps 11 deg in one frame
- **1:04.83** (64.83 s, f14) doctor.LeftHand: LeftHand stops dead from 77% of its peak
