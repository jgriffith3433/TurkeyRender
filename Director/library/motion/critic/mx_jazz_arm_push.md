# Motion critic: mx_jazz_arm_push

71 frames at 30 fps (2.33 s). **Total 8.2/10: passable, weak on snaps and anticipation (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.29 over 12 moves, 0% straight lines |
| 2 Slow in and out | 9.7 | speed shape 0.53 (bell 0.6, constant 1.0), 18% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 10 big moves: 5 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.13 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 46 cm/s |
| 7 Snaps and pops | 0 | 28 body snaps or pops in 2.33 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.80** (0.8 s, f24) LeftUpperArm: LeftUpperArm jumps 22 deg in one frame (also snap)
- **0:01.57** (1.57 s, f47) LeftUpperArm: LeftUpperArm jumps 30 deg in one frame (also snap)
- **0:02.00** (2 s, f60) RightLowerArm: RightLowerArm jumps 27 deg in one frame (also snap)
- **0:00.20** (0.2 s, f6) RightHand: RightHand jumps 14 deg in one frame
- **0:01.23** (1.23 s, f37) LeftFoot: LeftFoot jumps 11 deg in one frame
