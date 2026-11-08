# Motion critic: mx_walk_start

89 frames at 30 fps (2.93 s). **Total 7.1/10: passable, weak on anticipation and snaps (7.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.9 over 4 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.5 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.3 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 1 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 5.4 | parts' speed profiles agree 0.6 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 13 body snaps or pops in 2.93 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 27 deg, spread 26 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.80** (2.8 s, f84) LeftToes: LeftToes jumps 13 deg in one frame (also snap)
- **0:01.17** (1.17 s, f35) RightFoot: RightFoot jumps 12 deg in one frame (also snap)
- **0:02.03** (2.03 s, f61) RightFoot: RightFoot jumps 11 deg in one frame (also snap)
- **0:00.70** (0.7 s, f21) RightLowerLeg: RightLowerLeg jumps 9 deg in one frame
- **0:02.33** (2.33 s, f70) RightLowerLeg: RightLowerLeg jumps 8 deg in one frame
