# Motion critic: mx_hh_arm_wave

158 frames at 30 fps (5.23 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.48 over 13 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.47 (bell 0.6, constant 1.0), 6% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 5 big moves: 4 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.26 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 31 cm/s |
| 7 Snaps and pops | 0 | 52 body snaps or pops, 4 finger snaps in 5.23 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 11 key poses, readability 0.87 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 2 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.20** (1.2 s, f36) LeftUpperArm: LeftUpperArm jumps 18 deg in one frame
- **0:00.13** (0.13 s, f4) RightUpperArm: RightUpperArm jumps 20 deg in one frame (also snap)
- **0:01.83** (1.83 s, f55) RightUpperArm: RightUpperArm jumps 19 deg in one frame
- **0:03.63** (3.63 s, f109) RightLowerArm: RightLowerArm jumps 20 deg in one frame
- **0:00.93** (0.93 s, f28) LeftHand: LeftHand jumps 27 deg in one frame
