# Motion critic: cmu_126_10_glide

80 frames at 30 fps (2.63 s), judged as zero-g. **Total 8.2/10: passable, weak on snaps and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.33 over 8 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.52 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 8.5 | 7 big moves: 2 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 7.6 | parts' speed profiles agree 0.39 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 2.63 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 5 key poses, readability 0.66 (best of front, side, three-quarter), 40% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.63 robust z from 174 mocap clips; furthest: spineToArm high (1.73), energyCV high (0.87), armOmegaP50 low (0.75) |

## Worst moments

- **0:00.50** (0.5 s, f15) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame (also snap)
- **0:01.77** (1.77 s, f53) LeftToes: LeftToes jumps 9 deg in one frame
- **0:02.63** (2.63 s, f79) LeftHand: LeftHand stops dead from 100% of its peak (also abrupt-stop)
- **0:00.20** (0.2 s, f6) RightHand: RightHand travels 44 cm with no anticipation and no overshoot or settle (also no-prep, bowed-head)
- **0:01.40** (1.4 s, f42) LeftHand: LeftHand stops dead from 75% of its peak
