# Motion critic: mx_hh_running_man

143 frames at 30 fps (4.73 s). **Total 8/10: passable, weak on snaps and overlap (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 10 | speed shape 0.5 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 4.9 | parts' speed profiles agree 0.4 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 29 cm/s |
| 7 Snaps and pops | 0 | 147 body snaps or pops in 4.73 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.7 | 10 key poses, readability 0.79 (best of front, side, three-quarter), 20% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.50** (0.5 s, f15) LeftLowerLeg: LeftLowerLeg jumps 24 deg in one frame (also snap)
- **0:01.63** (1.63 s, f49) LeftLowerLeg: LeftLowerLeg jumps 24 deg in one frame
- **0:01.90** (1.9 s, f57) LeftLowerLeg: LeftLowerLeg jumps 23 deg in one frame
- **0:02.83** (2.83 s, f85) LeftLowerLeg: LeftLowerLeg jumps 21 deg in one frame (also snap)
- **0:04.03** (4.03 s, f121) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
