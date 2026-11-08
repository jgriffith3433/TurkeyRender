# Motion critic: mx_falling_air

136 frames at 30 fps (4.5 s). **Total 7.3/10: passable, weak on anticipation and ease (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.68 over 4 moves, 0% straight lines |
| 2 Slow in and out | 2.2 | speed shape 0.78 (bell 0.6, constant 1.0), 75% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.1 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 69 cm/s |
| 7 Snaps and pops | 4.4 | 2 body snaps or pops in 4.5 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 9 key poses, readability 0.79 (best of front, side, three-quarter), 11% twinned |
| 10 Hands and face | 5 | fingers flat and splayed 100% of the time; head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.43** (0.43 s, f13) LeftFoot: LeftFoot jumps 12 deg in one frame (also snap)
- **0:04.50** (4.5 s, f135) LeftHand: LeftHand stops dead from 67% of its peak (also abrupt-stop)
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot starts at 90% of its peak speed in one frame (also bowed-head)
- **0:02.23** (2.23 s, f67) Head: Head stops dead from 63% of its peak
- **0:02.87** (2.87 s, f86) Head: Head stops dead from 66% of its peak
