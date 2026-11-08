# Motion critic: mx_jazz_around_world

69 frames at 30 fps (2.27 s). **Total 8.3/10: passable, weak on snaps and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.21 over 8 moves, 25% straight lines |
| 2 Slow in and out | 4.9 | speed shape 0.62 (bell 0.6, constant 1.0), 82% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.8 | 7 big moves: 3 with anticipation, 5 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.37 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 34 body snaps or pops in 2.27 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.80** (0.8 s, f24) LeftFoot: LeftFoot jumps 34 deg in one frame (also snap)
- **0:00.13** (0.13 s, f4) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame (also snap)
- **0:02.03** (2.03 s, f61) LeftHand: LeftHand jumps 19 deg in one frame (also snap)
- **0:00.43** (0.43 s, f13) LeftLowerLeg: LeftLowerLeg jumps 15 deg in one frame
- **0:01.57** (1.57 s, f47) RightLowerLeg: RightLowerLeg jumps 15 deg in one frame
