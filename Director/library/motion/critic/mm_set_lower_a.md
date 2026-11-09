# Motion critic: mm_set_lower_a

142 frames at 30 fps (4.7 s). **Total 7.8/10: passable, weak on overlap and weight (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.3 | median bend 0.1 over 19 moves, 16% straight lines |
| 2 Slow in and out | 5.6 | speed shape 0.67 (bell 0.6, constant 1.0), 53% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.53 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 7.2 | 19 big moves: 9 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 2.3 | parts' speed profiles agree 0.64 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 2 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.7 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.75 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 54% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.7 robust z from 174 mocap clips; furthest: spineToArm high (1.44), armOmegaP95 low (1.17), armAccP95 low (0.97) |

## Worst moments

- **0:02.83** (2.83 s, f85) RightFoot: RightFoot travels 65 cm in a straight line (bend 0.01) (also com-spike, abrupt-start)
- **0:04.47** (4.47 s, f134) body: the body's centre of mass jerks at 48 m/s^2 (also no-prep, abrupt-stop, abrupt-start)
- **0:01.80** (1.8 s, f54) LeftHand: LeftHand travels 214 cm with no anticipation and no overshoot or settle (also no-prep, bowed-head)
