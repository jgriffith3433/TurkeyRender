# Motion critic: mx_hh_side_to_side

410 frames at 30 fps (13.63 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.05 over 42 moves, 0% straight lines |
| 2 Slow in and out | 8.1 | speed shape 0.59 (bell 0.6, constant 1.0), 36% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 31 big moves: 14 with anticipation, 20 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.16 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 76 cm/s |
| 7 Snaps and pops | 0 | 178 body snaps or pops, 19 finger snaps in 13.63 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 50% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.80** (2.8 s, f84) LeftUpperArm: LeftUpperArm jumps 20 deg in one frame
- **0:04.53** (4.53 s, f136) LeftUpperArm: LeftUpperArm jumps 20 deg in one frame
- **0:00.53** (0.53 s, f16) RightUpperArm: RightUpperArm jumps 21 deg in one frame
- **0:00.97** (0.97 s, f29) RightUpperArm: RightUpperArm jumps 20 deg in one frame
- **0:03.40** (3.4 s, f102) RightUpperArm: RightUpperArm jumps 19 deg in one frame
