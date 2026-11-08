# Motion critic: mx_injured_stumble

154 frames at 30 fps (5.1 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 14 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.57 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.27 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 10 | 12 big moves: 7 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 7.8 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 72 cm/s |
| 7 Snaps and pops | 0 | 20 body snaps or pops, 32 finger snaps in 5.1 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 10 key poses, readability 0.82 (best of front, side, three-quarter), 10% twinned |
| 10 Hands and face | 10 | fingers curl 34 deg, spread 30 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.87** (0.87 s, f26) RightUpperLeg: RightUpperLeg jumps 19 deg in one frame (also snap)
- **0:01.53** (1.53 s, f46) RightFoot: RightFoot jumps 15 deg in one frame (also snap)
- **0:03.50** (3.5 s, f105) LeftUpperArm: LeftUpperArm jumps 9 deg in one frame
- **0:02.03** (2.03 s, f61) LeftFoot: LeftFoot jumps 9 deg in one frame (also snap)
- **0:01.13** (1.13 s, f34) LeftLowerArm: LeftLowerArm jumps 9 deg in one frame
