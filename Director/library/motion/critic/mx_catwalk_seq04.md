# Motion critic: mx_catwalk_seq04

365 frames at 30 fps (12.13 s). **Total 8.4/10: passable, weak on snaps and ease (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.48 over 11 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.56 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 10 | 8 big moves: 5 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 8.2 | parts' speed profiles agree 0.46 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 64 body snaps or pops, 1 finger snaps in 12.13 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 16 key poses, readability 0.77 (best of front, side, three-quarter), 38% twinned |
| 10 Hands and face | 10 | fingers curl 23 deg, spread 60 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:08.83** (8.83 s, f265) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:08.50** (8.5 s, f255) LeftFoot: LeftFoot jumps 17 deg in one frame
- **0:02.47** (2.47 s, f74) LeftLowerLeg: LeftLowerLeg jumps 17 deg in one frame
- **0:03.60** (3.6 s, f108) LeftLowerLeg: LeftLowerLeg jumps 17 deg in one frame
- **0:09.97** (9.97 s, f299) LeftLowerLeg: LeftLowerLeg jumps 17 deg in one frame
