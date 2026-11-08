# Motion critic: mx_house_2

786 frames at 30 fps (26.17 s). **Total 8.4/10: passable, weak on snaps and hands (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.45 over 68 moves, 0% straight lines |
| 2 Slow in and out | 8.1 | speed shape 0.56 (bell 0.6, constant 1.0), 36% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 61 big moves: 38 with anticipation, 31 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.12 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 320 body snaps or pops, 15 finger snaps in 26.17 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 56% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.40** (7.4 s, f222) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:13.40** (13.4 s, f402) LeftLowerLeg: LeftLowerLeg jumps 25 deg in one frame
- **0:14.50** (14.5 s, f435) LeftLowerLeg: LeftLowerLeg jumps 24 deg in one frame
- **0:22.20** (22.2 s, f666) LeftLowerLeg: LeftLowerLeg jumps 21 deg in one frame
- **0:05.90** (5.9 s, f177) RightLowerLeg: RightLowerLeg jumps 21 deg in one frame
