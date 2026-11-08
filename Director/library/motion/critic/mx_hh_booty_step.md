# Motion critic: mx_hh_booty_step

148 frames at 30 fps (4.9 s). **Total 8.1/10: passable, weak on snaps and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 14 moves, 14% straight lines |
| 2 Slow in and out | 4.5 | speed shape 0.66 (bell 0.6, constant 1.0), 68% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8 | 9 big moves: 2 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.17 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 29 body snaps or pops, 23 finger snaps in 4.9 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 10 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 5 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.87** (2.87 s, f86) LeftLowerLeg: LeftLowerLeg jumps 19 deg in one frame (also snap)
- **0:03.13** (3.13 s, f94) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:03.77** (3.77 s, f113) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame
- **0:01.67** (1.67 s, f50) RightHand: RightHand jumps 19 deg in one frame (also snap)
- **0:03.43** (3.43 s, f103) RightFoot: RightFoot jumps 17 deg in one frame
