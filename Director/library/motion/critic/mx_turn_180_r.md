# Motion critic: mx_turn_180_r

50 frames at 30 fps (1.63 s). **Total 8.3/10: passable, weak on snaps and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.59 over 5 moves, 0% straight lines |
| 2 Slow in and out | 5.2 | speed shape 0.63 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.6 | 5 big moves: 2 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.05 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 39 cm/s |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 1.63 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.77 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.23** (0.23 s, f7) LeftFoot: LeftFoot jumps 9 deg in one frame (also no-prep, abrupt-start)
- **0:00.70** (0.7 s, f21) RightUpperLeg: RightUpperLeg jumps 9 deg in one frame (also snap)
- **0:01.63** (1.63 s, f49) RightHand: RightHand stops dead from 67% of its peak
