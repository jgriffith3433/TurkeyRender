# Motion critic: mx_treading_water

91 frames at 30 fps (3 s). **Total 7.1/10: passable, weak on stiffness and anticipation (7.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.16 over 4 moves, 50% straight lines |
| 2 Slow in and out | 3.3 | speed shape 0.72 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 3 | 3 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.03 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 64 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3 s |
| 8 Stiffness | 0.1 | 31% of core joints frozen while the body moves; never moves: Spine, Neck, LeftShoulder, RightShoulder |
| 9 Silhouette | 9.8 | 6 key poses, readability 0.82 (best of front, side, three-quarter), 17% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.03** (1.03 s, f31) LeftHand: LeftHand travels 18 cm in a straight line (bend 0.02)
- **0:00.03** (0.03 s, f1) Head: the head hangs 32 deg forward of the chest (also abrupt-start)
- **0:03.00** (3 s, f90) RightHand: RightHand stops dead from 98% of its peak (also abrupt-stop)
- **0:02.73** (2.73 s, f82) LeftHand: LeftHand starts at 80% of its peak speed in one frame
