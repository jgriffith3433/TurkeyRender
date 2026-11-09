# Motion critic: mm_boo_smash

41 frames at 30 fps (1.33 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.53 over 6 moves, 0% straight lines |
| 2 Slow in and out | 6.3 | speed shape 0.48 (bell 0.6, constant 1.0), 56% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 10 | 6 big moves: 4 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 5.3 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 64 cm/s |
| 7 Snaps and pops | 0.6 | 1 body snaps or pops in 1.33 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.96 robust z from 174 mocap clips; furthest: handSpeedP95 high (1.68), moveRate high (1.26), armAccP95 high (1.26) |

## Worst moments

- **0:00.60** (0.6 s, f18) RightLowerArm: RightLowerArm jumps 12 deg in one frame (also abrupt-start, linear)
- **0:01.13** (1.13 s, f34) RightHand: RightHand stops dead from 67% of its peak (also abrupt-stop, abrupt-start)
