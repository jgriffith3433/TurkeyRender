# Motion critic: mx_walk_start_f

57 frames at 30 fps (1.87 s). **Total 7.2/10: passable, weak on snaps and overlap (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.82 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.47 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 1.2 | parts' speed profiles agree 0.74 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 1.87 s |
| 8 Stiffness | 10 | 12% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.63** (1.63 s, f49) RightFoot: RightFoot jumps 24 deg in one frame (also snap, abrupt-stop)
- **0:01.07** (1.07 s, f32) LeftFoot: LeftFoot jumps 14 deg in one frame (also snap)
- **0:00.73** (0.73 s, f22) RightLowerLeg: RightLowerLeg jumps 8 deg in one frame
