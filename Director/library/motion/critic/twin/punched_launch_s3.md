# Motion critic: punched_launch_s3

108 frames at 30 fps (3.57 s). **Total 7.2/10: passable, weak on snaps and anticipation (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.3 over 10 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.37 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 4 | 10 big moves: 6 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 9 | parts' speed profiles agree 0.4 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 4 centre-of-mass jerks, planted feet slide 40 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 3.57 s |
| 8 Stiffness | 5.4 | 20% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.8 | 7 key poses, readability 0.74 (best of front, side, three-quarter), 14% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.9 | 1.62 robust z from 174 mocap clips; furthest: spineToArm high (4.54), spineAccP95 high (2.18), headOmegaP95 high (1.74) |

## Worst moments

- **0:00.87** (0.87 s, f26) Neck: Neck jumps 82 deg in one frame (also snap, com-spike, no-prep)
- **0:00.07** (0.07 s, f2) Head: Head jumps 22 deg in one frame (also snap, com-spike, no-prep, abrupt-start)
- **0:03.57** (3.57 s, f107) RightHand: RightHand stops dead from 62% of its peak (also abrupt-stop)
- **0:03.10** (3.1 s, f93) LeftFoot: LeftFoot starts at 65% of its peak speed in one frame (also abrupt-start, linear)
