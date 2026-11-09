# Motion critic: punched_launch_up_s22

90 frames at 30 fps (2.97 s). **Total 7.2/10: passable, weak on snaps and weight (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.17 over 5 moves, 0% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.47 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.2 s |
| 4 Anticipation and follow-through | 6 | 5 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 5.4 | parts' speed profiles agree 0.6 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 4.9 | 4 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 2.97 s |
| 8 Stiffness | 5.1 | 21% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.6 | 1.29 robust z from 174 mocap clips; furthest: headOmegaP95 high (2.19), handSpeedP95 high (1.98), handSpeedP50 high (1.9) |

## Worst moments

- **0:00.60** (0.6 s, f18) Neck: Neck jumps 85 deg in one frame (also snap, com-spike, no-prep)
- **0:02.97** (2.97 s, f89) LeftFoot: LeftFoot stops dead from 67% of its peak (also abrupt-stop)
