# Motion critic: ps_punched_launch_b

108 frames at 30 fps (3.57 s). **Total 7.3/10: passable, weak on snaps and overlap (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.55 over 16 moves, 31% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.59 (bell 0.6, constant 1.0), 62% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 10 | 15 big moves: 11 with anticipation, 12 with overshoot and settle |
| 5 Overlap and drag | 4.7 | parts' speed profiles agree 0.66 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 19 centre-of-mass jerks, planted feet slide 118 cm/s |
| 7 Snaps and pops | 0 | 18 body snaps or pops in 3.57 s |
| 8 Stiffness | 7 | 11% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.4 | 7 key poses, readability 0.61 (best of front, side, three-quarter), 43% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.8 | 1.65 robust z from 174 mocap clips; furthest: spineToArm high (3.59), spineAccP95 high (2.69), headOmegaP95 high (2) |

## Worst moments

- **0:00.87** (0.87 s, f26) Neck: Neck jumps 83 deg in one frame (also snap)
- **0:00.07** (0.07 s, f2) Head: Head jumps 22 deg in one frame (also snap)
- **0:01.20** (1.2 s, f36) RightUpperArm: RightUpperArm jumps 21 deg in one frame
- **0:01.67** (1.67 s, f50) Head: Head jumps 17 deg in one frame
- **0:00.37** (0.37 s, f11) LeftHand: LeftHand travels 62 cm in a straight line (bend 0.03)
