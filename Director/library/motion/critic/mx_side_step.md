# Motion critic: mx_side_step

45 frames at 30 fps (1.47 s). **Total 8.1/10: passable, weak on snaps and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.23 over 7 moves, 14% straight lines |
| 2 Slow in and out | 4.5 | speed shape 0.66 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 8.5 | 7 big moves: 2 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.06 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 8 body snaps or pops in 1.47 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.8 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 56% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.00** (1 s, f30) RightUpperLeg: RightUpperLeg jumps 31 deg in one frame (also snap)
- **0:01.33** (1.33 s, f40) RightUpperLeg: RightUpperLeg jumps 22 deg in one frame (also snap, abrupt-stop)
- **0:00.07** (0.07 s, f2) LeftFoot: LeftFoot jumps 11 deg in one frame (also straight, linear, abrupt-start)
- **0:00.67** (0.67 s, f20) RightLowerLeg: RightLowerLeg jumps 9 deg in one frame
- **0:00.37** (0.37 s, f11) RightFoot: RightFoot stops dead from 68% of its peak
