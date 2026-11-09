# Motion critic: hawkespunch 103.25-106.25 s

72 frames at 24 fps (2.96 s), judged as zero-g. **Total 5.2/10: looks animated, not acted: arcs and ease give it away (5.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0 | median bend 0.01 over 5 moves, 100% straight lines |
| 2 Slow in and out | 0 | speed shape 0.95 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 8.6 | 2 holds (median 1.5 s), 0% of frames dead still, fast parts median 0.58 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 1.25 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 2.5 | 3 centre-of-mass jerks, 2 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 2.96 s |
| 8 Stiffness | 9.3 | 15% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 17% twinned |
| 10 Hands and face | 10 | fingers curl 31 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.1 | 1.99 robust z from 174 mocap clips; furthest: energyCV high (5), handSpeedP50 high (3.29), legOmegaP95 low (3.26) |

## Worst moments

- **1:44.50** (104.5 s, f30) person.LeftHand: LeftHand travels 4971 cm in a straight line (bend 0.01) (also straight, com-spike, speed-change, no-prep, abrupt-start, linear)
- **1:43.33** (103.33 s, f2) person.body: the body's centre of mass jerks at 50656 m/s^2 (also pop)
- **1:46.21** (106.21 s, f71) person.LeftHand: LeftHand stops dead from 88% of its peak (also abrupt-stop)
