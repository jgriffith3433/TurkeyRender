# Motion critic: mx_roundhouse_kick

76 frames at 30 fps (2.5 s). **Total 8.3/10: passable, weak on snaps and overlap (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.36 over 7 moves, 14% straight lines |
| 2 Slow in and out | 8 | speed shape 0.58 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 9.6 | 5 big moves: 2 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 7.2 | parts' speed profiles agree 0.56 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 35 cm/s |
| 7 Snaps and pops | 0 | 46 body snaps or pops, 26 finger snaps in 2.5 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 77 deg, spread 17 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.77** (0.77 s, f23) RightUpperLeg: RightUpperLeg jumps 24 deg in one frame (also snap)
- **0:01.13** (1.13 s, f34) RightLowerLeg: RightLowerLeg jumps 20 deg in one frame (also snap)
- **0:00.47** (0.47 s, f14) LeftLowerArm: LeftLowerArm jumps 21 deg in one frame
- **0:01.97** (1.97 s, f59) RightFoot: RightFoot jumps 14 deg in one frame
- **0:01.40** (1.4 s, f42) Hips: Hips jumps 13 deg in one frame
