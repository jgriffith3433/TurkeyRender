# Motion critic: hawkespunch 64.5-67.3 s

67 frames at 24 fps (2.75 s). **Total 6.2/10: looks animated, not acted: snaps and overlap give it away (6.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | person: median bend 0.17 over 5 moves, 0% straight lines; doctor: median bend 0.72 over 4 moves, 0% straight lines |
| 2 Slow in and out | 6.4 | person: speed shape 0.18 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame; doctor: speed shape 0.44 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 9.1 | person: 1 holds (median 1.92 s), 0% of frames dead still, fast parts median 0.58 s; doctor: 2 holds (median 1.46 s), 2% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 3.4 | person: 5 big moves: 1 with anticipation, 0 with overshoot and settle; doctor: 3 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 0.2 | person: parts' speed profiles agree 0.92 (1 = everything moves as one); typical lag between parts 0 frames; 25% of energy peaks have every part peaking together; doctor: parts' speed profiles agree 0.82 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.6 | person: 2 centre-of-mass jerks, planted feet slide 0 cm/s; doctor: 2 centre-of-mass jerks, planted feet slide 12 cm/s |
| 7 Snaps and pops | 0 | person: 28 body snaps or pops, 27 finger snaps in 2.75 s; doctor: 11 body snaps or pops in 2.75 s |
| 8 Stiffness | 9.4 | person: 18% of core joints frozen while the body moves; doctor: 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | person: 6 key poses, readability 0.69 (best of front, side, three-quarter), 67% twinned; doctor: 6 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | person: fingers curl 4 deg, spread 5 deg, head level; doctor: fingers curl 73 deg, spread 5 deg, head level |
| 11 Contact | 10 | person: hands clear of the body, 0 reaches into air; doctor: hands clear of the body, 0 reaches into air |
| 12 Distance from human motion | 5.9 | person: 2.22 robust z from 174 mocap clips; furthest: spineToArm high (5), energyCV high (5), handSpeedP50 low (3.83); doctor: 1.84 robust z from 174 mocap clips; furthest: energyCV high (5), headOmegaP50 low (3.54), spineToArm high (3.16) |

## Worst moments

- **1:07.13** (67.13 s, f63) person.body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, com-spike, pop, no-prep)
- **1:06.79** (66.79 s, f55) doctor.LeftUpperArm: LeftUpperArm jumps 69 deg in one frame (also snap, pop, com-spike, no-prep, abrupt-start)
- **1:06.42** (66.42 s, f46) doctor.Hips: Hips jumps 11 deg in one frame (also snap, abrupt-stop)
- **1:04.54** (64.54 s, f1) doctor.LeftHand: LeftHand travels 60 cm with no anticipation and no overshoot or settle (also abrupt-start)
