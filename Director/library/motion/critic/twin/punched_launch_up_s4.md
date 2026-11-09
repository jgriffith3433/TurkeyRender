# Motion critic: punched_launch_up_s4

90 frames at 30 fps (2.97 s). **Total 5.6/10: looks animated, not acted: arcs and anticipation give it away (5.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0 | median bend 0.02 over 5 moves, 80% straight lines |
| 2 Slow in and out | 0.2 | speed shape 0.89 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.7 | parts' speed profiles agree 0.84 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.1 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.1 | 1.58 robust z from 174 mocap clips; furthest: spineToArm high (4.65), handSpeedP50 high (2.57), handSpeedP95 high (2.3) |

## Worst moments

- **0:00.57** (0.57 s, f17) LeftHand: LeftHand travels 2892 cm in a straight line (bend 0.02) (also straight, com-spike, no-prep, linear)
- **0:02.97** (2.97 s, f89) LeftHand: LeftHand stops dead from 88% of its peak (also abrupt-stop)
