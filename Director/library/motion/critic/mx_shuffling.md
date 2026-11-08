# Motion critic: mx_shuffling

227 frames at 30 fps (7.53 s). **Total 8.1/10: passable, weak on snaps and overlap (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.9 over 12 moves, 0% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.46 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.47 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 11 big moves: 8 with anticipation, 9 with overshoot and settle |
| 5 Overlap and drag | 4 | parts' speed profiles agree 0.49 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 26 cm/s |
| 7 Snaps and pops | 0 | 107 body snaps or pops, 8 finger snaps in 7.53 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 15 key poses, readability 0.77 (best of front, side, three-quarter), 40% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 16 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.53** (1.53 s, f46) RightUpperLeg: RightUpperLeg jumps 19 deg in one frame
- **0:01.87** (1.87 s, f56) RightUpperLeg: RightUpperLeg jumps 18 deg in one frame
- **0:00.87** (0.87 s, f26) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:05.67** (5.67 s, f170) RightLowerLeg: RightLowerLeg jumps 22 deg in one frame
- **0:01.27** (1.27 s, f38) LeftUpperArm: LeftUpperArm jumps 18 deg in one frame
