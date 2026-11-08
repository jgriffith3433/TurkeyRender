# Motion critic: mx_turn_f

33 frames at 30 fps (1.07 s). **Total 6.2/10: looks animated, not acted: snaps and anticipation give it away (6.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.3 | median bend 0.13 over 4 moves, 25% straight lines |
| 2 Slow in and out | 5 | speed shape 0.5 (bell 0.6, constant 1.0), 89% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 2.2 | 4 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 4 | parts' speed profiles agree 0.48 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 2.5 | 1 centre-of-mass jerks, planted feet slide 42 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops in 1.07 s |
| 8 Stiffness | 8.6 | 19% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 23 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand travels 31 cm in a straight line (bend 0.03) (also no-prep, abrupt-start)
- **0:01.07** (1.07 s, f32) LeftHand: LeftHand moves 46 cm in one frame (also pop, com-spike, abrupt-stop)
- **0:00.40** (0.4 s, f12) Head: Head starts at 84% of its peak speed in one frame (also abrupt-stop)
