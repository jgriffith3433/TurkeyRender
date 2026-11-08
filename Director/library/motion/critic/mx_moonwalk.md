# Motion critic: mx_moonwalk

32 frames at 30 fps (1.03 s). **Total 8.2/10: passable, weak on snaps and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.6 (bell 0.6, constant 1.0), 83% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.03 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 1.03 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 7 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 177 deg in one frame (also snap, abrupt-start)
- **0:00.80** (0.8 s, f24) RightLowerLeg: RightLowerLeg jumps 11 deg in one frame (also snap)
- **0:00.40** (0.4 s, f12) LeftFoot: LeftFoot jumps 10 deg in one frame
