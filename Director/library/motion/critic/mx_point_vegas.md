# Motion critic: mx_point_vegas

60 frames at 30 fps (1.97 s). **Total 8.3/10: passable, weak on snaps and anticipation (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 11 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.59 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 5.4 | 10 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 9.4 | parts' speed profiles agree 0.36 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.8 | 0 centre-of-mass jerks, planted feet slide 27 cm/s |
| 7 Snaps and pops | 0 | 18 body snaps or pops, 25 finger snaps in 1.97 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 30 deg, spread 39 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.50** (0.5 s, f15) LeftLowerArm: LeftLowerArm jumps 25 deg in one frame (also snap)
- **0:00.20** (0.2 s, f6) RightLowerLeg: RightLowerLeg jumps 15 deg in one frame (also snap, no-prep)
- **0:01.20** (1.2 s, f36) LeftLowerArm: LeftLowerArm jumps 13 deg in one frame (also snap, no-prep)
