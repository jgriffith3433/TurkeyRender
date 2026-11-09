# Motion critic: punched_launch_up_s20

90 frames at 30 fps (2.97 s). **Total 6.9/10: looks animated, not acted: snaps and weight give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.89 over 7 moves, 14% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.37 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 9.7 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.37 s |
| 4 Anticipation and follow-through | 10 | 7 big moves: 7 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 4.1 | parts' speed profiles agree 0.72 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 2.8 | 8 centre-of-mass jerks, planted feet slide 27 cm/s |
| 7 Snaps and pops | 0 | 6 body snaps or pops in 2.97 s |
| 8 Stiffness | 5 | 22% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.67 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.1 | 1.78 robust z from 174 mocap clips; furthest: spineToArm high (3.53), energyCV high (3.16), headOmegaP95 high (2.64) |

## Worst moments

- **0:00.67** (0.67 s, f20) LeftUpperArm: LeftUpperArm jumps 25 deg in one frame (also snap, com-spike)
- **0:01.63** (1.63 s, f49) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame (also snap, com-spike, abrupt-stop)
- **0:01.37** (1.37 s, f41) LeftFoot: LeftFoot stops dead from 69% of its peak
