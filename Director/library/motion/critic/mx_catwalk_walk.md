# Motion critic: mx_catwalk_walk

36 frames at 30 fps (1.17 s). **Total 8.3/10: passable, weak on snaps and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.46 over 2 moves, 0% straight lines |
| 2 Slow in and out | 4.8 | speed shape 0.63 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 8.2 | parts' speed profiles agree 0.35 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 21 body snaps or pops, 8 finger snaps in 1.17 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 15 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.83** (0.83 s, f25) RightLowerLeg: RightLowerLeg jumps 21 deg in one frame (also snap, no-prep)
- **0:00.37** (0.37 s, f11) LeftFoot: LeftFoot jumps 22 deg in one frame (also snap)
- **0:01.17** (1.17 s, f35) LeftFoot: LeftFoot stops dead from 95% of its peak (also abrupt-stop)
- **0:00.03** (0.03 s, f1) RightFoot: RightFoot starts at 70% of its peak speed in one frame (also abrupt-start)
