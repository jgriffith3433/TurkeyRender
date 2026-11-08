# Motion critic: mx_hh_step

235 frames at 30 fps (7.8 s). **Total 7.9/10: passable, weak on snaps and overlap (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 29 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.56 (bell 0.6, constant 1.0), 7% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 9 | 27 big moves: 9 with anticipation, 11 with overshoot and settle |
| 5 Overlap and drag | 1.3 | parts' speed profiles agree 0.73 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 141 body snaps or pops in 7.8 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 16 key poses, readability 0.73 (best of front, side, three-quarter), 31% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.37** (1.37 s, f41) LeftFoot: LeftFoot jumps 21 deg in one frame
- **0:03.87** (3.87 s, f116) LeftFoot: LeftFoot jumps 19 deg in one frame
- **0:06.40** (6.4 s, f192) LeftFoot: LeftFoot jumps 20 deg in one frame
- **0:00.07** (0.07 s, f2) LeftLowerArm: LeftLowerArm jumps 18 deg in one frame
- **0:00.73** (0.73 s, f22) LeftLowerArm: LeftLowerArm jumps 24 deg in one frame
