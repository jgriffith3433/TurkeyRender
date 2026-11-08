# Motion critic: mx_walk_stop

91 frames at 30 fps (3 s). **Total 7.8/10: passable, weak on snaps and ease (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 3.6 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.53 (bell 0.6, constant 1.0), 75% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.37 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 5.8 | parts' speed profiles agree 0.68 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 7 body snaps or pops in 3 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 27 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.43** (0.43 s, f13) RightLowerLeg: RightLowerLeg jumps 11 deg in one frame (also snap)
- **0:00.77** (0.77 s, f23) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame
- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 9 deg in one frame (also abrupt-start)
- **0:01.50** (1.5 s, f45) LeftLowerLeg: LeftLowerLeg jumps 9 deg in one frame (also abrupt-start)
- **0:01.93** (1.93 s, f58) LeftHand: LeftHand stops dead from 66% of its peak
