# Motion critic: mx_catwalk_seq03

373 frames at 30 fps (12.4 s). **Total 8.4/10: passable, weak on snaps and ease (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.59 over 18 moves, 0% straight lines |
| 2 Slow in and out | 5.1 | speed shape 0.65 (bell 0.6, constant 1.0), 63% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 15 big moves: 7 with anticipation, 9 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 69 body snaps or pops in 12.4 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:08.73** (8.73 s, f262) LeftFoot: LeftFoot jumps 20 deg in one frame
- **0:11.00** (11 s, f330) LeftFoot: LeftFoot jumps 20 deg in one frame (also snap)
- **0:10.33** (10.33 s, f310) LeftToes: LeftToes jumps 20 deg in one frame
- **0:09.07** (9.07 s, f272) LeftLowerLeg: LeftLowerLeg jumps 16 deg in one frame
- **0:01.27** (1.27 s, f38) LeftLowerLeg: LeftLowerLeg jumps 16 deg in one frame
