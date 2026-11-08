# Motion critic: mx_thriller_2

566 frames at 30 fps (18.83 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.49 over 72 moves, 0% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.58 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 59 big moves: 39 with anticipation, 31 with overshoot and settle |
| 5 Overlap and drag | 5.3 | parts' speed profiles agree 0.37 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.7 | 2 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 479 body snaps or pops, 308 finger snaps in 18.83 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 35 deg, spread 47 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:06.43** (6.43 s, f193) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:08.53** (8.53 s, f256) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:16.03** (16.03 s, f481) LeftLowerLeg: LeftLowerLeg jumps 19 deg in one frame
- **0:00.60** (0.6 s, f18) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame
- **0:01.50** (1.5 s, f45) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame
