# Motion critic: mx_turn_180_l

50 frames at 30 fps (1.63 s). **Total 8.9/10: reads as human (8.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.39 over 6 moves, 0% straight lines |
| 2 Slow in and out | 5.7 | speed shape 0.61 (bell 0.6, constant 1.0), 63% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 5 | 6 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.01 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 39 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.63 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 9 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 79 cm with no anticipation and no overshoot or settle (also no-prep, linear, abrupt-start)
- **0:01.63** (1.63 s, f49) LeftHand: LeftHand stops dead from 62% of its peak (also abrupt-start, abrupt-stop)
