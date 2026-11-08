# Motion critic: mx_standing_arguing

626 frames at 30 fps (20.83 s). **Total 7.7/10: passable, weak on snaps and overlap (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.23 over 25 moves, 0% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.64 (bell 0.6, constant 1.0), 37% of moves start or stop in one frame |
| 3 Timing | 10 | 10 holds (median 0.4 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 9.7 | 21 big moves: 10 with anticipation, 8 with overshoot and settle |
| 5 Overlap and drag | 3.2 | parts' speed profiles agree 0.55 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.7 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 68 body snaps or pops, 23 finger snaps in 20.83 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 10 key poses, readability 0.83 (best of front, side, three-quarter), 10% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 46% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:13.40** (13.4 s, f402) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame (also snap)
- **0:12.37** (12.37 s, f371) LeftLowerArm: LeftLowerArm jumps 26 deg in one frame
- **0:14.57** (14.57 s, f437) LeftLowerArm: LeftLowerArm jumps 19 deg in one frame
- **0:07.80** (7.8 s, f234) RightLowerArm: RightLowerArm jumps 19 deg in one frame
- **0:08.07** (8.07 s, f242) RightLowerArm: RightLowerArm jumps 25 deg in one frame
