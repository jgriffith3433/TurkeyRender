# Motion critic: mx_salsa_f

136 frames at 30 fps (4.5 s). **Total 8.3/10: passable, weak on snaps and weight (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.17 over 12 moves, 0% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.58 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8 | 9 big moves: 2 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.17 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 61 cm/s |
| 7 Snaps and pops | 0 | 61 body snaps or pops in 4.5 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.85 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 5 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.90** (3.9 s, f117) LeftLowerArm: LeftLowerArm jumps 24 deg in one frame
- **0:00.10** (0.1 s, f3) RightLowerArm: RightLowerArm jumps 24 deg in one frame
- **0:00.47** (0.47 s, f14) LeftHand: LeftHand jumps 23 deg in one frame
- **0:01.53** (1.53 s, f46) LeftHand: LeftHand jumps 27 deg in one frame (also snap)
- **0:02.90** (2.9 s, f87) LeftHand: LeftHand jumps 19 deg in one frame
