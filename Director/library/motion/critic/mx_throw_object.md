# Motion critic: mx_throw_object

147 frames at 30 fps (4.87 s). **Total 7.9/10: passable, weak on snaps and hands (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 7.5 | median bend 0.11 over 13 moves, 0% straight lines |
| 2 Slow in and out | 8.1 | speed shape 0.63 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 9.8 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.33 s |
| 4 Anticipation and follow-through | 10 | 13 big moves: 7 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 8.5 | parts' speed profiles agree 0.44 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 37 cm/s |
| 7 Snaps and pops | 0 | 37 body snaps or pops, 22 finger snaps in 4.87 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 9.7 | 10 key poses, readability 0.78 (best of front, side, three-quarter), 20% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 50% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.13** (2.13 s, f64) LeftLowerArm: LeftLowerArm jumps 24 deg in one frame (also snap)
- **0:02.43** (2.43 s, f73) RightLowerArm: RightLowerArm jumps 48 deg in one frame (also snap)
- **0:01.10** (1.1 s, f33) RightHand: RightHand jumps 15 deg in one frame
- **0:02.97** (2.97 s, f89) LeftLowerArm: LeftLowerArm jumps 14 deg in one frame
- **0:03.63** (3.63 s, f109) LeftLowerLeg: LeftLowerLeg jumps 12 deg in one frame
