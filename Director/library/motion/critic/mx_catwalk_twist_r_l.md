# Motion critic: mx_catwalk_twist_r_l

66 frames at 30 fps (2.17 s). **Total 7.4/10: passable, weak on snaps and ease (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.18 over 3 moves, 0% straight lines |
| 2 Slow in and out | 3 | speed shape 0.77 (bell 0.6, constant 1.0), 63% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.6 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6 | 2 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.7 | 0 centre-of-mass jerks, planted feet slide 17 cm/s |
| 7 Snaps and pops | 0 | 2 body snaps or pops in 2.17 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.76 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 58% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.90** (0.9 s, f27) RightLowerLeg: RightLowerLeg jumps 178 deg in one frame (also snap, abrupt-start, abrupt-stop)
- **0:00.50** (0.5 s, f15) RightHand: RightHand starts at 76% of its peak speed in one frame (also abrupt-start)
- **0:01.23** (1.23 s, f37) RightHand: RightHand starts at 62% of its peak speed in one frame (also abrupt-stop, abrupt-start)
