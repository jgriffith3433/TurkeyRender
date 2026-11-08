# Motion critic: mx_salsa_side

69 frames at 30 fps (2.27 s). **Total 7.9/10: passable, weak on snaps and anticipation (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.18 over 8 moves, 0% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.62 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4.9 | 8 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.02 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 33 cm/s |
| 7 Snaps and pops | 0 | 29 body snaps or pops, 16 finger snaps in 2.27 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 9 deg, spread 32 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftFoot: LeftFoot jumps 18 deg in one frame (also snap)
- **0:01.30** (1.3 s, f39) RightFoot: RightFoot jumps 20 deg in one frame (also snap)
- **0:01.80** (1.8 s, f54) RightLowerArm: RightLowerArm jumps 22 deg in one frame (also snap)
- **0:02.13** (2.13 s, f64) RightLowerArm: RightLowerArm jumps 18 deg in one frame
- **0:00.90** (0.9 s, f27) LeftLowerLeg: LeftLowerLeg jumps 12 deg in one frame
