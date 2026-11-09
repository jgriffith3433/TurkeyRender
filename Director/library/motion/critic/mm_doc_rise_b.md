# Motion critic: mm_doc_rise_b

73 frames at 30 fps (2.4 s). **Total 8.9/10: reads as human (8.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.56 over 10 moves, 0% straight lines |
| 2 Slow in and out | 5.1 | speed shape 0.54 (bell 0.6, constant 1.0), 69% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 7.5 | 6 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 8.5 | parts' speed profiles agree 0.31 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 55 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.4 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 64% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.58 robust z from 174 mocap clips; furthest: spineToArm high (1.08), moveRate high (0.99), handSpeedP95 high (0.89) |

## Worst moments

- **0:02.03** (2.03 s, f61) RightHand: RightHand travels 70 cm with no anticipation and no overshoot or settle (also abrupt-start, abrupt-stop)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame (also abrupt-start, no-prep, bowed-head)
- **0:02.40** (2.4 s, f72) RightHand: RightHand stops dead from 100% of its peak (also abrupt-stop)
- **0:00.57** (0.57 s, f17) RightHand: RightHand moves at one speed for 0.23 s (flat 0.96): interpolation, not a move (also abrupt-start, abrupt-stop)
