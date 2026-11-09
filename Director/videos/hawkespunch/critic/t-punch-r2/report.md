# Motion critic: hawkespunch 64.25-69.25 s

120 frames at 24 fps (4.96 s). **Total 6.5/10: looks animated, not acted: ease and anticipation give it away (6.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 8.4 | median bend 0.12 over 5 moves, 0% straight lines |
| 2 Slow in and out | 0 | speed shape 0.96 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.83 s), 0% of frames dead still, fast parts median 0.21 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 1.7 | parts' speed profiles agree 0.69 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 5 centre-of-mass jerks, planted feet slide 0 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.96 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 10 key poses, readability 0.73 (best of front, side, three-quarter), 40% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 40% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.3 | 1.54 robust z from 174 mocap clips; furthest: spineToArm high (3.17), handSpeedP95 high (3.07), energyCV high (2.17) |

## Worst moments

- **1:07.50** (67.5 s, f78) person.body: the body's centre of mass jerks at 231 m/s^2 (also com-spike, no-prep, abrupt-start, linear)
- **1:09.21** (69.21 s, f119) person.LeftHand: LeftHand stops dead from 100% of its peak (also abrupt-stop)
