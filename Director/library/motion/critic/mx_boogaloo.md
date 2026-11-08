# Motion critic: mx_boogaloo

489 frames at 30 fps (16.27 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.37 over 65 moves, 0% straight lines |
| 2 Slow in and out | 7.5 | speed shape 0.58 (bell 0.6, constant 1.0), 42% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 47 big moves: 28 with anticipation, 23 with overshoot and settle |
| 5 Overlap and drag | 9.5 | parts' speed profiles agree 0.35 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 48 cm/s |
| 7 Snaps and pops | 0 | 259 body snaps or pops in 16.27 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.67** (3.67 s, f110) RightUpperLeg: RightUpperLeg jumps 18 deg in one frame
- **0:04.43** (4.43 s, f133) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:07.67** (7.67 s, f230) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:11.67** (11.67 s, f350) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:01.67** (1.67 s, f50) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame
