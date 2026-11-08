# Motion critic: mx_swagger_walk

85 frames at 30 fps (2.8 s). **Total 8.2/10: passable, weak on snaps and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.11 over 2 moves, 0% straight lines |
| 2 Slow in and out | 3 | speed shape 0.73 (bell 0.6, constant 1.0), 80% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.11 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 19 body snaps or pops in 2.8 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 21 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.23** (1.23 s, f37) LeftToes: LeftToes jumps 18 deg in one frame (also snap)
- **0:02.67** (2.67 s, f80) LeftToes: LeftToes jumps 17 deg in one frame
- **0:00.53** (0.53 s, f16) RightToes: RightToes jumps 16 deg in one frame
- **0:01.60** (1.6 s, f48) LeftUpperLeg: LeftUpperLeg jumps 14 deg in one frame (also snap)
- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 11 deg in one frame
