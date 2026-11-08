# Motion critic: mx_hh_robot

464 frames at 30 fps (15.43 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.2 over 42 moves, 2% straight lines |
| 2 Slow in and out | 7.9 | speed shape 0.58 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8.8 | 33 big moves: 14 with anticipation, 11 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.29 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 49 cm/s |
| 7 Snaps and pops | 0 | 73 body snaps or pops, 18 finger snaps in 15.43 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.7 | 16 key poses, readability 0.76 (best of front, side, three-quarter), 19% twinned |
| 10 Hands and face | 10 | fingers curl 5 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.77** (1.77 s, f53) LeftLowerLeg: LeftLowerLeg jumps 24 deg in one frame (also snap)
- **0:09.67** (9.67 s, f290) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:02.30** (2.3 s, f69) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame (also snap)
- **0:08.93** (8.93 s, f268) RightLowerLeg: RightLowerLeg jumps 21 deg in one frame
- **0:05.03** (5.03 s, f151) LeftLowerArm: LeftLowerArm jumps 18 deg in one frame
