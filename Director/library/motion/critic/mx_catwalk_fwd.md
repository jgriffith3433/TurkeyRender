# Motion critic: mx_catwalk_fwd

37 frames at 30 fps (1.2 s). **Total 8.4/10: passable, weak on snaps and ease (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.28 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.59 (bell 0.6, constant 1.0), 86% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.01 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 1.2 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 13 deg in one frame (also abrupt-start)
- **0:00.80** (0.8 s, f24) RightUpperLeg: RightUpperLeg jumps 13 deg in one frame (also snap)
- **0:01.10** (1.1 s, f33) LeftFoot: LeftFoot jumps 12 deg in one frame (also snap, abrupt-stop)
- **0:00.43** (0.43 s, f13) RightFoot: RightFoot jumps 11 deg in one frame (also snap)
