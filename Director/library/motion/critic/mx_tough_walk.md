# Motion critic: mx_tough_walk

39 frames at 30 fps (1.27 s). **Total 8/10: passable, weak on snaps and ease (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.56 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 9 | parts' speed profiles agree 0.39 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 14 body snaps or pops in 1.27 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 2 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.37** (0.37 s, f11) RightFoot: RightFoot jumps 19 deg in one frame (also snap)
- **0:00.10** (0.1 s, f3) LeftLowerLeg: LeftLowerLeg jumps 15 deg in one frame (also abrupt-start)
- **0:01.03** (1.03 s, f31) LeftFoot: LeftFoot jumps 13 deg in one frame (also snap, abrupt-stop)
- **0:00.73** (0.73 s, f22) RightLowerLeg: RightLowerLeg jumps 12 deg in one frame
