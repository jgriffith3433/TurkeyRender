# Motion critic: punched_launch_s1

108 frames at 30 fps (3.57 s). **Total 7.2/10: passable, weak on snaps and weight (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.3 over 9 moves, 11% straight lines |
| 2 Slow in and out | 6.3 | speed shape 0.37 (bell 0.6, constant 1.0), 56% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 10 | 9 big moves: 7 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 5.1 | parts' speed profiles agree 0.63 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 5 centre-of-mass jerks, planted feet slide 40 cm/s |
| 7 Snaps and pops | 0 | 14 body snaps or pops in 3.57 s |
| 8 Stiffness | 5.4 | 20% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.6 | 7 key poses, readability 0.65 (best of front, side, three-quarter), 29% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.6 | 1.68 robust z from 174 mocap clips; furthest: spineToArm high (3.64), spineAccP95 high (2.7), headOmegaP95 high (2) |

## Worst moments

- **0:00.87** (0.87 s, f26) Neck: Neck jumps 83 deg in one frame (also snap, com-spike)
- **0:00.07** (0.07 s, f2) Head: Head jumps 22 deg in one frame (also snap, com-spike, abrupt-start)
- **0:01.20** (1.2 s, f36) RightUpperArm: RightUpperArm jumps 20 deg in one frame
- **0:01.67** (1.67 s, f50) Head: Head jumps 17 deg in one frame (also straight, com-spike, snap, abrupt-start, abrupt-stop)
