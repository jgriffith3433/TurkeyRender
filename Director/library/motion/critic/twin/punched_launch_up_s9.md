# Motion critic: punched_launch_up_s9

90 frames at 30 fps (2.97 s). **Total 6.7/10: looks animated, not acted: snaps and anticipation give it away (6.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.6 | median bend 0.14 over 6 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.62 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 1.5 | 6 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.2 | parts' speed profiles agree 0.47 (1 = everything moves as one); typical lag between parts 2 frames; 33% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.1 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.85 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.4 | 1.51 robust z from 174 mocap clips; furthest: energyCV high (2.8), headOmegaP95 high (2.61), handSpeedP95 high (2.23) |

## Worst moments

- **0:00.60** (0.6 s, f18) Neck: Neck jumps 113 deg in one frame (also snap, lockstep, com-spike, no-prep, abrupt-start)
- **0:02.97** (2.97 s, f89) RightHand: RightHand stops dead from 98% of its peak (also abrupt-stop)
