# Motion critic: fbx_place_gently_t0

90 frames at 30 fps (2.97 s). **Total 8.4/10: passable, weak on anticipation and arcs (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 5.3 | median bend 0.09 over 6 moves, 17% straight lines |
| 2 Slow in and out | 7.1 | speed shape 0.67 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 5 | 6 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 9.1 | parts' speed profiles agree 0.38 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.97 s |
| 8 Stiffness | 7.8 | 16% of core joints frozen while the body moves; never moves: Chest |
| 9 Silhouette | 10 | 6 key poses, readability 0.64 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.3 | 1.33 robust z from 174 mocap clips; furthest: spineOmegaP50 low (5), spineToArm low (1.7), headOmegaP95 low (1.4) |

## Worst moments

- **0:02.43** (2.43 s, f73) RightHand: RightHand travels 52 cm with no anticipation and no overshoot or settle (also abrupt-stop)
- **0:00.07** (0.07 s, f2) LeftHand: LeftHand travels 50 cm with no anticipation and no overshoot or settle (also bowed-head)
- **0:02.13** (2.13 s, f64) RightHand: RightHand starts at 88% of its peak speed in one frame
