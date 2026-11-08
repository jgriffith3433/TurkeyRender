# Motion critic: mx_salsa_up_back

74 frames at 30 fps (2.43 s). **Total 7.3/10: passable, weak on snaps and arcs (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 2.2 | median bend 0.05 over 7 moves, 29% straight lines |
| 2 Slow in and out | 5.9 | speed shape 0.57 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9 | 6 big moves: 2 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.1 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 51 cm/s |
| 7 Snaps and pops | 0 | 31 body snaps or pops in 2.43 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 50% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.13** (1.13 s, f34) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:02.40** (2.4 s, f72) RightLowerLeg: RightLowerLeg jumps 17 deg in one frame
- **0:00.83** (0.83 s, f25) RightLowerLeg: RightLowerLeg jumps 14 deg in one frame
- **0:01.97** (1.97 s, f59) LeftFoot: LeftFoot jumps 14 deg in one frame
- **0:00.47** (0.47 s, f14) LeftUpperArm: LeftUpperArm jumps 14 deg in one frame
