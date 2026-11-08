# Motion critic: mx_strut

44 frames at 30 fps (1.43 s). **Total 7.2/10: passable, weak on snaps and overlap (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.58 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 3.2 | parts' speed profiles agree 0.55 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 6 body snaps or pops in 1.43 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 11 deg in one frame (also abrupt-start)
- **0:00.83** (0.83 s, f25) RightLowerLeg: RightLowerLeg jumps 11 deg in one frame
- **0:01.23** (1.23 s, f37) LeftToes: LeftToes jumps 9 deg in one frame (also abrupt-stop)
- **0:00.50** (0.5 s, f15) RightToes: RightToes jumps 9 deg in one frame (also snap)
