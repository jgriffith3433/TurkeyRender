# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 6.3/10: looks animated, not acted: snaps and overlap give it away (6.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 10 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.44 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 9.6 | 4 holds (median 0.92 s), 1% of frames dead still, fast parts median 0.33 s |
| 4 Anticipation and follow-through | 2.5 | 6 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 0.1 | parts' speed profiles agree 0.84 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.5 | 2 centre-of-mass jerks, planted feet slide 8 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.8 | 1.84 robust z from 174 mocap clips; furthest: headOmegaP50 low (5), energyCV high (5), spineToArm high (2.42) |

## Worst moments

- **1:06.79** (66.79 s, f61) doctor.LeftUpperArm: LeftUpperArm jumps 69 deg in one frame (also snap, pop, com-spike, abrupt-start)
- **1:06.42** (66.42 s, f52) doctor.Hips: Hips jumps 11 deg in one frame (also snap)
- **1:04.63** (64.63 s, f9) doctor.LeftHand: LeftHand travels 52 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **1:07.96** (67.96 s, f89) doctor.LeftHand: LeftHand travels 36 cm with no anticipation and no overshoot or settle (also no-prep)
- **1:04.88** (64.88 s, f15) doctor.Head: Head stops dead from 100% of its peak
