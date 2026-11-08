# Motion critic: mx_ns_spin

123 frames at 30 fps (4.07 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.15 over 17 moves, 6% straight lines |
| 2 Slow in and out | 7.6 | speed shape 0.67 (bell 0.6, constant 1.0), 31% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 15 big moves: 10 with anticipation, 9 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.25 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 62 cm/s |
| 7 Snaps and pops | 0 | 82 body snaps or pops in 4.07 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 8 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 5 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.70** (3.7 s, f111) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:01.20** (1.2 s, f36) RightHand: RightHand jumps 17 deg in one frame (also snap)
- **0:01.73** (1.73 s, f52) RightFoot: RightFoot jumps 15 deg in one frame
- **0:02.07** (2.07 s, f62) LeftLowerLeg: LeftLowerLeg jumps 13 deg in one frame (also snap)
- **0:03.97** (3.97 s, f119) RightLowerLeg: RightLowerLeg jumps 12 deg in one frame
