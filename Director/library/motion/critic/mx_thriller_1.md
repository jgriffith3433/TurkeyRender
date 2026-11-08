# Motion critic: mx_thriller_1

896 frames at 30 fps (29.83 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.44 over 95 moves, 1% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.56 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 10 | 60 big moves: 32 with anticipation, 36 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.28 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.3 | 4 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 405 body snaps or pops, 370 finger snaps in 29.83 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:28.97** (28.97 s, f869) LeftUpperLeg: LeftUpperLeg jumps 20 deg in one frame
- **0:12.23** (12.23 s, f367) RightUpperLeg: RightUpperLeg jumps 19 deg in one frame
- **0:08.87** (8.87 s, f266) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:11.13** (11.13 s, f334) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:12.97** (12.97 s, f389) LeftLowerLeg: LeftLowerLeg jumps 19 deg in one frame
