# Motion critic: hp_d2_letgo

181 frames at 30 fps (6 s), judged as zero-g. **Total 5.4/10: looks animated, not acted: anticipation and snaps give it away (5.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.26 over 1 moves, 0% straight lines |
| 2 Slow in and out | n/a | too few moves to judge ease |
| 3 Timing | 10 | 4 holds (median 1 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 0 | 1 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 3.3 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 8 body snaps or pops, 15 finger snaps in 6 s |
| 8 Stiffness | 0 | 18% of core joints frozen while the body moves; never moves: Hips, Spine, Chest, LeftShoulder, RightShoulder, LeftUpperLeg, RightUpperLeg |
| 9 Silhouette | 10 | 4 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 53% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.03** (1.03 s, f31) RightLowerArm: RightLowerArm jumps 47 deg in one frame (also snap, pop, no-prep)
- **0:04.77** (4.77 s, f143) RightLowerArm: RightLowerArm jumps 10 deg in one frame (also snap)
