# Motion critic: mx_kneel_up

84 frames at 30 fps (2.77 s). **Total 8.3/10: passable, weak on anticipation and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 7 moves, 0% straight lines |
| 2 Slow in and out | 7.3 | speed shape 0.56 (bell 0.6, constant 1.0), 44% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.63 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 6 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 7.4 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 74 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.77 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 58% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.33** (0.33 s, f10) Head: Head travels 61 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand travels 41 cm with no anticipation and no overshoot or settle (also abrupt-start, bowed-head)
- **0:01.90** (1.9 s, f57) RightHand: RightHand starts at 86% of its peak speed in one frame (also abrupt-stop)
