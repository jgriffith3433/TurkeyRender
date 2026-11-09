# Motion critic: mm_ring_glide_b

97 frames at 30 fps (3.2 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.38 over 13 moves, 15% straight lines |
| 2 Slow in and out | 3.4 | speed shape 0.71 (bell 0.6, constant 1.0), 79% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.3 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6.5 | 6 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.49 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.9 | 0 centre-of-mass jerks, planted feet slide 25 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.2 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 6 key poses, readability 0.66 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.79 robust z from 174 mocap clips; furthest: armAccP95 low (1.04), armOmegaP95 low (1.04), legOmegaP95 low (1) |

## Worst moments

- **0:01.70** (1.7 s, f51) RightFoot: RightFoot moves at one speed for 0.37 s (flat 0.9): interpolation, not a move (also abrupt-stop, abrupt-start)
- **0:00.03** (0.03 s, f1) Head: the head hangs 66 deg forward of the chest (also abrupt-start)
- **0:01.07** (1.07 s, f32) LeftFoot: LeftFoot starts at 74% of its peak speed in one frame (also abrupt-stop)
- **0:00.77** (0.77 s, f23) LeftFoot: LeftFoot starts at 82% of its peak speed in one frame
- **0:02.07** (2.07 s, f62) RightFoot: RightFoot stops dead from 87% of its peak
