# Motion critic: ps_punched_launch_a

108 frames at 30 fps (3.57 s). **Total 7.3/10: passable, weak on snaps and overlap (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.29 over 18 moves, 28% straight lines |
| 2 Slow in and out | 6.5 | speed shape 0.56 (bell 0.6, constant 1.0), 53% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 10 | 18 big moves: 15 with anticipation, 11 with overshoot and settle |
| 5 Overlap and drag | 3.7 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 0 frames; 33% of energy peaks have every part peaking together |
| 6 Weight | 5 | 18 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 3.57 s |
| 8 Stiffness | 7 | 11% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.8 | 7 key poses, readability 0.75 (best of front, side, three-quarter), 14% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.5 | 1.5 robust z from 174 mocap clips; furthest: spineToArm high (3.48), spineAccP95 high (2.1), handSpeedP95 high (1.88) |

## Worst moments

- **0:01.77** (1.77 s, f53) body: 5 of 5 parts peak on the same frame (everything moves as one) (also com-spike, pop)
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand travels 88 cm in a straight line (bend 0.03) (also straight, com-spike, snap, pop)
- **0:00.37** (0.37 s, f11) LeftHand: LeftHand travels 62 cm in a straight line (bend 0.03) (also straight, com-spike)
- **0:01.07** (1.07 s, f32) body: the body's centre of mass jerks at 91 m/s^2 (also com-spike)
- **0:02.63** (2.63 s, f79) body: the body's centre of mass jerks at 55 m/s^2
