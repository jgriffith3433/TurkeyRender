# Motion critic: hawkespunch 64.5-69.25 s

114 frames at 24 fps (4.71 s). **Total 6.9/10: looks animated, not acted: overlap and anticipation give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | person: median bend 0.15 over 5 moves, 0% straight lines; doctor: median bend 0.37 over 9 moves, 0% straight lines |
| 2 Slow in and out | 2.2 | person: speed shape 0.92 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame; doctor: speed shape 0.66 (bell 0.6, constant 1.0), 94% of moves start or stop in one frame |
| 3 Timing | 10 | person: 1 holds (median 1.92 s), 0% of frames dead still, fast parts median 0.08 s; doctor: 2 holds (median 1.63 s), 0% of frames dead still, fast parts median 0.29 s |
| 4 Anticipation and follow-through | 1.3 | person: 5 big moves: 0 with anticipation, 0 with overshoot and settle; doctor: 6 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 1 | person: parts' speed profiles agree 0.68 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together; doctor: parts' speed profiles agree 1 (1 = everything moves as one); typical lag between parts 0 frames; 11% of energy peaks have every part peaking together |
| 6 Weight | 5 | person: 4 centre-of-mass jerks, planted feet slide 0 cm/s; doctor: 3 centre-of-mass jerks, planted feet slide 0 cm/s |
| 7 Snaps and pops | 7.4 | person: 0 body snaps or pops in 4.71 s; doctor: 2 body snaps or pops in 4.71 s |
| 8 Stiffness | 10 | person: 11% of core joints frozen while the body moves; doctor: 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | person: 9 key poses, readability 0.71 (best of front, side, three-quarter), 56% twinned; doctor: 9 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8.5 | person: fingers flat and splayed 42% of the time; doctor: fingers curl 72 deg, spread 5 deg, head level |
| 11 Contact | 10 | person: hands clear of the body, 0 reaches into air; doctor: hands clear of the body, 0 reaches into air |
| 12 Distance from human motion | 9.5 | person: 1.41 robust z from 174 mocap clips; furthest: spineToArm high (3.11), handSpeedP95 high (2.25), energyCV high (2.11); doctor: 1.21 robust z from 174 mocap clips; furthest: energyCV high (5), headOmegaP50 low (1.04), legOmegaP95 low (0.91) |

## Worst moments

- **1:06.83** (66.83 s, f56) doctor.body: 5 of 5 parts peak on the same frame (everything moves as one) (also com-spike)
- **1:06.42** (66.42 s, f46) doctor.RightUpperArm: RightUpperArm jumps 21 deg in one frame (also pop)
- **1:07.54** (67.54 s, f73) person.body: the body's centre of mass jerks at 56 m/s^2 (also com-spike, no-prep)
- **1:08.63** (68.63 s, f99) doctor.RightHand: RightHand travels 60 cm with no anticipation and no overshoot or settle
- **1:08.33** (68.33 s, f92) doctor.LeftHand: LeftHand travels 52 cm with no anticipation and no overshoot or settle
