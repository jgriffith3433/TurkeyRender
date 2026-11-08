# Motion critic: mx_thumbs_up

127 frames at 30 fps (4.2 s). **Total 7.8/10: passable, weak on snaps and anticipation (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.23 over 8 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.47 (bell 0.6, constant 1.0), 9% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.33 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 3.4 | 7 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9 | 0 centre-of-mass jerks, planted feet slide 13 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops, 13 finger snaps in 4.2 s |
| 8 Stiffness | 8.5 | 8% of core joints frozen while the body moves; never moves: LeftShoulder |
| 9 Silhouette | 9.6 | 8 key poses, readability 0.81 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 25 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.10** (1.1 s, f33) RightLowerArm: RightLowerArm jumps 30 deg in one frame (also snap)
- **0:01.60** (1.6 s, f48) RightLowerArm: RightLowerArm jumps 29 deg in one frame
- **0:02.03** (2.03 s, f61) RightLowerArm: RightLowerArm jumps 24 deg in one frame
- **0:02.80** (2.8 s, f84) RightFoot: RightFoot jumps 15 deg in one frame
- **0:00.53** (0.53 s, f16) RightLowerLeg: RightLowerLeg jumps 12 deg in one frame
