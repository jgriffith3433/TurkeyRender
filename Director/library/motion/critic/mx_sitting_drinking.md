# Motion critic: mx_sitting_drinking

457 frames at 30 fps (15.2 s). **Total 8.2/10: passable, weak on snaps and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.18 over 17 moves, 6% straight lines |
| 2 Slow in and out | 6.7 | speed shape 0.69 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 0.53 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 9.8 | 14 big moves: 6 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 8.3 | parts' speed profiles agree 0.45 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 23 body snaps or pops, 5 finger snaps in 15.2 s |
| 8 Stiffness | 8.3 | 20% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 4 key poses, readability 0.69 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 37 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:05.73** (5.73 s, f172) RightHand: RightHand jumps 14 deg in one frame
- **0:06.20** (6.2 s, f186) RightHand: RightHand jumps 14 deg in one frame
- **0:02.50** (2.5 s, f75) RightLowerLeg: RightLowerLeg jumps 12 deg in one frame
- **0:01.53** (1.53 s, f46) RightFoot: RightFoot jumps 13 deg in one frame
- **0:13.00** (13 s, f390) RightHand: RightHand jumps 13 deg in one frame
