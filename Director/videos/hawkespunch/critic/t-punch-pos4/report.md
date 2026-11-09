# Motion critic: hawkespunch 64.5-69.25 s

114 frames at 24 fps (4.71 s). **Total 6.8/10: looks animated, not acted: snaps and overlap give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | person: median bend 0.16 over 5 moves, 0% straight lines; doctor: median bend 0.15 over 14 moves, 7% straight lines |
| 2 Slow in and out | 8.5 | person: speed shape 0.41 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame; doctor: speed shape 0.59 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 8 | person: 1 holds (median 1.92 s), 0% of frames dead still, fast parts median 1.58 s; doctor: 2 holds (median 1.58 s), 0% of frames dead still, fast parts median 0.29 s |
| 4 Anticipation and follow-through | 3.5 | person: 5 big moves: 0 with anticipation, 0 with overshoot and settle; doctor: 9 big moves: 2 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 0.2 | person: parts' speed profiles agree 0.82 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together; doctor: parts' speed profiles agree 0.88 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 6.3 | person: 19 centre-of-mass jerks, planted feet slide 0 cm/s; doctor: 0 centre-of-mass jerks, planted feet slide 38 cm/s |
| 7 Snaps and pops | 0 | person: 7 body snaps or pops in 4.71 s; doctor: 5 body snaps or pops in 4.71 s |
| 8 Stiffness | 10 | person: 7% of core joints frozen while the body moves; doctor: 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | person: 9 key poses, readability 0.73 (best of front, side, three-quarter), 56% twinned; doctor: 9 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8.5 | person: fingers flat and splayed 42% of the time; doctor: fingers curl 31 deg, spread 23 deg, head level |
| 11 Contact | 10 | person: hands clear of the body, 0 reaches into air; doctor: hands clear of the body, 0 reaches into air |
| 12 Distance from human motion | 9.3 | person: 1.48 robust z from 174 mocap clips; furthest: spineToArm high (2.9), handSpeedP95 high (2.58), energyCV high (2.43); doctor: 1.22 robust z from 174 mocap clips; furthest: energyCV high (4.39), headOmegaP50 low (1.1), armOmegaP50 low (1.06) |

## Worst moments

- **1:07.04** (67.04 s, f61) doctor.LeftUpperLeg: LeftUpperLeg jumps 22 deg in one frame (also snap)
- **1:04.63** (64.63 s, f3) doctor.LeftFoot: LeftFoot jumps 13 deg in one frame
- **1:06.42** (66.42 s, f46) doctor.RightUpperArm: RightUpperArm jumps 13 deg in one frame
- **1:07.50** (67.5 s, f72) person.body: the body's centre of mass jerks at 194 m/s^2 (also com-spike)
- **1:07.92** (67.92 s, f82) person.body: the body's centre of mass jerks at 126 m/s^2
