# Motion critic: mx_point_aj

56 frames at 30 fps (1.83 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.24 over 10 moves, 0% straight lines |
| 2 Slow in and out | 9.3 | speed shape 0.66 (bell 0.6, constant 1.0), 10% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8 | 6 big moves: 2 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6.4 | parts' speed profiles agree 0.63 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.1 | 0 centre-of-mass jerks, planted feet slide 12 cm/s |
| 7 Snaps and pops | 0 | 8 body snaps or pops, 18 finger snaps in 1.83 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 4 key poses, readability 0.74 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 17 deg, spread 30 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerArm: LeftLowerArm jumps 20 deg in one frame (also snap, no-prep)
- **0:00.40** (0.4 s, f12) LeftUpperArm: LeftUpperArm jumps 11 deg in one frame (also snap)
- **0:00.97** (0.97 s, f29) RightLowerArm: RightLowerArm jumps 11 deg in one frame (also snap, no-prep)
- **0:01.27** (1.27 s, f38) LeftFoot: LeftFoot stops dead from 60% of its peak
