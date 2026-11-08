# Motion critic: mx_samba_pagode

656 frames at 30 fps (21.83 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.86 over 43 moves, 0% straight lines |
| 2 Slow in and out | 9.4 | speed shape 0.5 (bell 0.6, constant 1.0), 22% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 36 big moves: 25 with anticipation, 28 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.21 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 76 cm/s |
| 7 Snaps and pops | 0 | 343 body snaps or pops, 51 finger snaps in 21.83 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.83 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 17 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:11.07** (11.07 s, f332) LeftLowerArm: LeftLowerArm jumps 24 deg in one frame (also snap)
- **0:00.43** (0.43 s, f13) RightLowerArm: RightLowerArm jumps 25 deg in one frame
- **0:10.33** (10.33 s, f310) RightLowerArm: RightLowerArm jumps 19 deg in one frame
- **0:11.67** (11.67 s, f350) RightLowerArm: RightLowerArm jumps 19 deg in one frame
- **0:12.33** (12.33 s, f370) RightLowerArm: RightLowerArm jumps 19 deg in one frame
