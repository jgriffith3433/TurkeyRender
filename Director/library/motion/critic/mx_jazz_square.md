# Motion critic: mx_jazz_square

62 frames at 30 fps (2.03 s). **Total 8/10: passable, weak on snaps and ease (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.9 | median bend 0.14 over 7 moves, 29% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.59 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 7 big moves: 0 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.04 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 73 cm/s |
| 7 Snaps and pops | 0 | 22 body snaps or pops in 2.03 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.87 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 2 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.70** (1.7 s, f51) RightLowerArm: RightLowerArm jumps 18 deg in one frame (also snap)
- **0:01.40** (1.4 s, f42) RightHand: RightHand jumps 27 deg in one frame (also snap)
- **0:01.03** (1.03 s, f31) LeftUpperArm: LeftUpperArm jumps 16 deg in one frame (also snap)
- **0:00.40** (0.4 s, f12) RightLowerArm: RightLowerArm jumps 16 deg in one frame (also snap)
- **0:00.77** (0.77 s, f23) RightFoot: RightFoot jumps 10 deg in one frame
