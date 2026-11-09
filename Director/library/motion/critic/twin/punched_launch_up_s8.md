# Motion critic: punched_launch_up_s8

90 frames at 30 fps (2.97 s). **Total 5.6/10: looks animated, not acted: anticipation and arcs give it away (5.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0.8 | median bend 0.04 over 5 moves, 60% straight lines |
| 2 Slow in and out | 2.2 | speed shape 0.78 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 4 | parts' speed profiles agree 0.73 (1 = everything moves as one); typical lag between parts 1 frames; 33% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 5.8 | 1 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.2 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.1 | 1.58 robust z from 174 mocap clips; furthest: spineToArm high (4.79), handSpeedP50 high (2.43), handSpeedP95 high (2.27) |

## Worst moments

- **0:00.63** (0.63 s, f19) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, straight, com-spike, no-prep, abrupt-start)
- **0:02.97** (2.97 s, f89) LeftHand: LeftHand stops dead from 77% of its peak (also abrupt-stop)
