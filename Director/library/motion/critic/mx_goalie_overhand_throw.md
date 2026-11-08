# Motion critic: mx_goalie_overhand_throw

86 frames at 30 fps (2.83 s). **Total 8.1/10: passable, weak on snaps and weight (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.79 over 5 moves, 20% straight lines |
| 2 Slow in and out | 10 | speed shape 0.36 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 5 big moves: 5 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 5.9 | parts' speed profiles agree 0.67 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 5 | 5 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 63 body snaps or pops, 28 finger snaps in 2.83 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 6 key poses, readability 0.77 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 10 | fingers curl 12 deg, spread 23 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.73** (0.73 s, f22) RightFoot: RightFoot jumps 19 deg in one frame (also snap)
- **0:01.07** (1.07 s, f32) RightFoot: RightFoot jumps 18 deg in one frame (also snap)
- **0:01.60** (1.6 s, f48) RightUpperArm: RightUpperArm jumps 29 deg in one frame (also snap)
- **0:01.93** (1.93 s, f58) RightHand: RightHand jumps 17 deg in one frame (also snap)
- **0:01.33** (1.33 s, f40) RightUpperLeg: RightUpperLeg jumps 12 deg in one frame
