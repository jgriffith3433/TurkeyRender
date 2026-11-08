# Motion critic: mx_shim_sham

742 frames at 30 fps (24.7 s). **Total 8.2/10: passable, weak on snaps and hands (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.57 over 65 moves, 0% straight lines |
| 2 Slow in and out | 8.4 | speed shape 0.57 (bell 0.6, constant 1.0), 32% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 56 big moves: 30 with anticipation, 32 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.29 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 63 cm/s |
| 7 Snaps and pops | 0 | 430 body snaps or pops in 24.7 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 16 key poses, readability 0.78 (best of front, side, three-quarter), 38% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 65% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.60** (1.6 s, f48) LeftLowerLeg: LeftLowerLeg jumps 24 deg in one frame
- **0:01.93** (1.93 s, f58) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:05.50** (5.5 s, f165) LeftLowerLeg: LeftLowerLeg jumps 23 deg in one frame
- **0:05.77** (5.77 s, f173) LeftLowerLeg: LeftLowerLeg jumps 28 deg in one frame
- **0:08.13** (8.13 s, f244) LeftLowerLeg: LeftLowerLeg jumps 21 deg in one frame
