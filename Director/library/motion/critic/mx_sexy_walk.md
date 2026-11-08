# Motion critic: mx_sexy_walk

42 frames at 30 fps (1.37 s). **Total 7.8/10: passable, weak on snaps and ease (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.6 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 7.2 | parts' speed profiles agree 0.43 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 8 body snaps or pops in 1.37 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 2 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.17** (1.17 s, f35) LeftToes: LeftToes jumps 22 deg in one frame (also snap, abrupt-stop)
- **0:00.47** (0.47 s, f14) RightLowerLeg: RightLowerLeg jumps 11 deg in one frame (also snap)
- **0:00.80** (0.8 s, f24) RightLowerLeg: RightLowerLeg jumps 11 deg in one frame
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand starts at 76% of its peak speed in one frame (also abrupt-start)
