# Motion critic: mx_snake

460 frames at 30 fps (15.3 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.33 over 47 moves, 0% straight lines |
| 2 Slow in and out | 6.6 | speed shape 0.63 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 9.7 | 38 big moves: 16 with anticipation, 19 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.1 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 52 cm/s |
| 7 Snaps and pops | 0 | 98 body snaps or pops in 15.3 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 16 key poses, readability 0.77 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.90** (2.9 s, f87) RightUpperArm: RightUpperArm jumps 18 deg in one frame (also snap)
- **0:05.80** (5.8 s, f174) RightUpperArm: RightUpperArm jumps 18 deg in one frame (also snap)
- **0:11.80** (11.8 s, f354) RightUpperArm: RightUpperArm jumps 25 deg in one frame (also snap)
- **0:14.57** (14.57 s, f437) LeftLowerArm: LeftLowerArm jumps 22 deg in one frame
- **0:08.27** (8.27 s, f248) RightLowerLeg: RightLowerLeg jumps 15 deg in one frame
