# Motion critic: mx_wave_aj

45 frames at 30 fps (1.47 s). **Total 6.8/10: looks animated, not acted: anticipation and snaps give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.14 over 2 moves, 0% straight lines |
| 2 Slow in and out | 7.3 | speed shape 0.66 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 3.9 | parts' speed profiles agree 0.74 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 9.2 | 0 centre-of-mass jerks, planted feet slide 12 cm/s |
| 7 Snaps and pops | 0 | 2 body snaps or pops in 1.47 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 51% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.93** (0.93 s, f28) RightHand: RightHand jumps 20 deg in one frame (also snap, abrupt-start)
- **0:01.20** (1.2 s, f36) LeftFoot: LeftFoot stops dead from 86% of its peak
