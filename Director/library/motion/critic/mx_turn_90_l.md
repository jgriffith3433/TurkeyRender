# Motion critic: mx_turn_90_l

29 frames at 30 fps (0.93 s). **Total 8.3/10: passable, weak on snaps and anticipation (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.37 over 4 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.61 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 4 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.17 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 45 cm/s |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 0.93 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.47** (0.47 s, f14) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame (also snap, no-prep, abrupt-stop)
- **0:00.20** (0.2 s, f6) LeftLowerLeg: LeftLowerLeg jumps 8 deg in one frame (also abrupt-start)
