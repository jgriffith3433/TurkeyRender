# Motion critic: mx_walk_f

36 frames at 30 fps (1.17 s). **Total 8.1/10: passable, weak on snaps and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.41 over 4 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.57 (bell 0.6, constant 1.0), 86% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6 | 2 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.27 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 13 body snaps or pops in 1.17 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 2 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.33** (0.33 s, f10) RightFoot: RightFoot jumps 20 deg in one frame (also snap)
- **0:00.93** (0.93 s, f28) LeftFoot: LeftFoot jumps 15 deg in one frame (also snap, abrupt-stop)
- **0:00.63** (0.63 s, f19) RightLowerLeg: RightLowerLeg jumps 12 deg in one frame (also snap)
- **0:00.03** (0.03 s, f1) RightFoot: RightFoot starts at 100% of its peak speed in one frame (also abrupt-start)
