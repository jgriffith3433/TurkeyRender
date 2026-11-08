# Motion critic: mx_hh_arms

660 frames at 30 fps (21.97 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.6 over 40 moves, 0% straight lines |
| 2 Slow in and out | 9.6 | speed shape 0.5 (bell 0.6, constant 1.0), 19% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 29 big moves: 13 with anticipation, 17 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.14 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 39 cm/s |
| 7 Snaps and pops | 0 | 63 body snaps or pops in 21.97 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 21 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:21.03** (21.03 s, f631) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame (also snap)
- **0:02.20** (2.2 s, f66) LeftLowerArm: LeftLowerArm jumps 19 deg in one frame
- **0:16.83** (16.83 s, f505) LeftLowerArm: LeftLowerArm jumps 20 deg in one frame (also snap)
- **0:20.17** (20.17 s, f605) LeftLowerArm: LeftLowerArm jumps 17 deg in one frame
- **0:05.03** (5.03 s, f151) LeftLowerArm: LeftLowerArm jumps 17 deg in one frame
