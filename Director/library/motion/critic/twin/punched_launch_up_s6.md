# Motion critic: punched_launch_up_s6

90 frames at 30 fps (2.97 s). **Total 4.9/10: wrong to an animator's eye: arcs and anticipation (4.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0 | median bend 0.02 over 5 moves, 100% straight lines |
| 2 Slow in and out | 1.3 | speed shape 0.83 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.7 | parts' speed profiles agree 0.85 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 1.6 | 2 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.1 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.8 | 1.63 robust z from 174 mocap clips; furthest: spineToArm high (4.88), handSpeedP50 high (2.68), handSpeedP95 high (2.52) |

## Worst moments

- **0:00.57** (0.57 s, f17) LeftHand: LeftHand travels 3352 cm in a straight line (bend 0.02) (also straight, com-spike, snap, no-prep, linear)
- **0:02.97** (2.97 s, f89) LeftHand: LeftHand stops dead from 78% of its peak (also abrupt-stop)
