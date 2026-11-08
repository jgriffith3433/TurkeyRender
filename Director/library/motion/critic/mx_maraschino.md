# Motion critic: mx_maraschino

99 frames at 30 fps (3.27 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.91 over 9 moves, 11% straight lines |
| 2 Slow in and out | 9.5 | speed shape 0.49 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 9 big moves: 4 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.15 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 55 cm/s |
| 7 Snaps and pops | 0 | 73 body snaps or pops, 48 finger snaps in 3.27 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 7 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 49 deg, spread 35 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.53** (0.53 s, f16) RightFoot: RightFoot jumps 18 deg in one frame
- **0:02.83** (2.83 s, f85) RightFoot: RightFoot jumps 18 deg in one frame (also snap)
- **0:01.20** (1.2 s, f36) LeftLowerArm: LeftLowerArm jumps 26 deg in one frame (also snap)
- **0:01.57** (1.57 s, f47) LeftLowerArm: LeftLowerArm jumps 20 deg in one frame (also snap)
- **0:03.10** (3.1 s, f93) RightLowerArm: RightLowerArm jumps 23 deg in one frame
