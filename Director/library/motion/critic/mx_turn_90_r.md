# Motion critic: mx_turn_90_r

29 frames at 30 fps (0.93 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.41 over 4 moves, 0% straight lines |
| 2 Slow in and out | 9.5 | speed shape 0.6 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8.2 | 4 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.04 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 41 cm/s |
| 7 Snaps and pops | 0 | 2 body snaps or pops in 0.93 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 9 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.50** (0.5 s, f15) LeftFoot: LeftFoot jumps 9 deg in one frame (also snap)
