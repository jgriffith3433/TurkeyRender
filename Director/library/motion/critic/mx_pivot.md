# Motion critic: mx_pivot

136 frames at 30 fps (4.5 s). **Total 7.9/10: passable, weak on snaps and anticipation (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 11 moves, 0% straight lines |
| 2 Slow in and out | 8.1 | speed shape 0.59 (bell 0.6, constant 1.0), 36% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.3 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 6.3 | 10 big moves: 2 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 7 | parts' speed profiles agree 0.58 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 63 cm/s |
| 7 Snaps and pops | 0 | 26 body snaps or pops in 4.5 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.77 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 76 deg, spread 6 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.37** (3.37 s, f101) LeftUpperLeg: LeftUpperLeg jumps 22 deg in one frame (also snap)
- **0:00.60** (0.6 s, f18) RightFoot: RightFoot jumps 21 deg in one frame (also snap)
- **0:03.10** (3.1 s, f93) RightLowerLeg: RightLowerLeg jumps 15 deg in one frame
- **0:01.10** (1.1 s, f33) RightLowerLeg: RightLowerLeg jumps 13 deg in one frame
- **0:02.83** (2.83 s, f85) RightFoot: RightFoot jumps 13 deg in one frame
