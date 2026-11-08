# Motion critic: hp_h1_hop

69 frames at 30 fps (2.27 s), judged as zero-g. **Total 6.5/10: looks animated, not acted: snaps and overlap give it away (6.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.2 over 10 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.37 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.8 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 6.9 | 10 big moves: 1 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 3.2 | parts' speed profiles agree 0.56 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 6 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 48 body snaps or pops in 2.27 s |
| 8 Stiffness | 3.3 | 16% of core joints frozen while the body moves; never moves: Chest, Head, LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 5 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.30** (0.3 s, f9) LeftUpperLeg: LeftUpperLeg jumps 28 deg in one frame (also snap, speed-change, pop)
- **0:01.80** (1.8 s, f54) LeftUpperLeg: LeftUpperLeg jumps 27 deg in one frame (also snap, speed-change, pop, no-prep, abrupt-stop)
- **0:00.57** (0.57 s, f17) LeftUpperArm: LeftUpperArm jumps 17 deg in one frame (also snap, pop)
- **0:00.03** (0.03 s, f1) Head: the head hangs 38 deg forward of the chest
