# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 7.5/10: passable, weak on snaps and overlap (7.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.4 over 15 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.48 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.46 s), 0% of frames dead still, fast parts median 0.08 s |
| 4 Anticipation and follow-through | 10 | 9 big moves: 7 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 0.5 | parts' speed profiles agree 0.81 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4 | 2 centre-of-mass jerks, planted feet slide 14 cm/s |
| 7 Snaps and pops | 0 | 8 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.94 robust z from 174 mocap clips; furthest: energyCV high (2.76), handSpeedP95 high (1.08), armAccP95 high (1.02) |

## Worst moments

- **1:06.79** (66.79 s, f61) doctor.LeftUpperArm: LeftUpperArm jumps 74 deg in one frame (also snap, pop, com-spike, abrupt-start)
- **1:07.38** (67.38 s, f75) doctor.Head: Head travels 34 cm with no anticipation and no overshoot or settle
- **1:04.63** (64.63 s, f9) doctor.RightHand: RightHand starts at 95% of its peak speed in one frame (also abrupt-stop, abrupt-start)
