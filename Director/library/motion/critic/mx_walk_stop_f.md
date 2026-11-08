# Motion critic: mx_walk_stop_f

47 frames at 30 fps (1.53 s). **Total 8.3/10: passable, weak on snaps and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.44 over 1 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.47 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 9.2 | parts' speed profiles agree 0.37 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 14 body snaps or pops in 1.53 s |
| 8 Stiffness | 9.9 | 12% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.33** (0.33 s, f10) LeftFoot: LeftFoot jumps 19 deg in one frame (also snap)
- **0:00.67** (0.67 s, f20) LeftLowerLeg: LeftLowerLeg jumps 15 deg in one frame
- **0:00.93** (0.93 s, f28) LeftFoot: LeftFoot jumps 15 deg in one frame (also snap)
- **0:00.07** (0.07 s, f2) RightToes: RightToes jumps 10 deg in one frame
- **0:01.30** (1.3 s, f39) RightLowerLeg: RightLowerLeg jumps 9 deg in one frame
