# Motion critic: hawkespunch 66.5-69.25 s

66 frames at 24 fps (2.71 s). **Total 6.8/10: looks animated, not acted: snaps and ease give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 8.8 | person: median bend 0.11 over 5 moves, 0% straight lines; doctor: median bend 0.35 over 6 moves, 0% straight lines |
| 2 Slow in and out | 2.5 | person: speed shape 0.96 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame; doctor: speed shape 0.43 (bell 0.6, constant 1.0), 82% of moves start or stop in one frame |
| 3 Timing | 10 | person: 0 holds (median 0 s), 0% of frames dead still, fast parts median null s; doctor: 1 holds (median 0.25 s), 0% of frames dead still, fast parts median 0.04 s |
| 4 Anticipation and follow-through | 3 | person: 5 big moves: 0 with anticipation, 0 with overshoot and settle; doctor: 5 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 3.8 | person: parts' speed profiles agree 0.55 (1 = everything moves as one); typical lag between parts 1.25 frames; doctor: parts' speed profiles agree 0.76 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.7 | person: 5 centre-of-mass jerks, planted feet slide 52 cm/s; doctor: 2 centre-of-mass jerks, planted feet slide 9 cm/s |
| 7 Snaps and pops | 0 | person: 226 body snaps or pops in 2.71 s; doctor: 11 body snaps or pops in 2.71 s |
| 8 Stiffness | 10 | person: 1% of core joints frozen while the body moves; doctor: 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | person: 5 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned; doctor: 5 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | person: fingers curl 67 deg, spread 37 deg, head level; doctor: fingers curl 73 deg, spread 5 deg, head level |
| 11 Contact | 10 | person: hands clear of the body, 0 reaches into air; doctor: hands clear of the body, 0 reaches into air |
| 12 Distance from human motion | 9.8 | person: 1.31 robust z from 174 mocap clips; furthest: handSpeedP50 high (3.2), handSpeedP95 high (3.06), headOmegaP50 high (0.95); doctor: 1.21 robust z from 174 mocap clips; furthest: energyCV high (4.66), legOmegaP95 low (1.49), headOmegaP50 low (0.95) |

## Worst moments

- **1:06.79** (66.79 s, f7) doctor.LeftUpperArm: LeftUpperArm jumps 74 deg in one frame (also snap, pop)
- **1:07.50** (67.5 s, f24) person.body: the body's centre of mass jerks at 229 m/s^2 (also com-spike, pop)
- **1:07.75** (67.75 s, f30) person.LeftHand: LeftHand moves 104 cm in one frame (also pop)
- **1:08.00** (68 s, f36) person.LeftHand: LeftHand moves 104 cm in one frame (also pop)
- **1:08.25** (68.25 s, f42) person.LeftHand: LeftHand moves 106 cm in one frame
