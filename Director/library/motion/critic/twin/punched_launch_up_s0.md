# Motion critic: punched_launch_up_s0

90 frames at 30 fps (2.97 s). **Total 6.9/10: looks animated, not acted: snaps and anticipation give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.14 over 8 moves, 13% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.62 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 3.3 | 8 big moves: 3 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.5 | parts' speed profiles agree 0.44 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.2 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.86 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.8 | 1.83 robust z from 174 mocap clips; furthest: spineToArm high (4.18), handSpeedP95 high (2.68), handSpeedP50 high (2.48) |

## Worst moments

- **0:00.63** (0.63 s, f19) Head: Head jumps 86 deg in one frame (also snap, straight, com-spike, no-prep, abrupt-start)
- **0:02.97** (2.97 s, f89) LeftHand: LeftHand stops dead from 81% of its peak (also abrupt-stop)
