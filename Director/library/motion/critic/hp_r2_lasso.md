# Motion critic: hp_r2_lasso

176 frames at 30 fps (5.83 s), judged as zero-g. **Total 6.2/10: looks animated, not acted: overlap and snaps give it away (6.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.5 | median bend 0.13 over 13 moves, 8% straight lines |
| 2 Slow in and out | 5 | speed shape 0.45 (bell 0.6, constant 1.0), 80% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 1.1 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 4.6 | 13 big moves: 0 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.88 (1 = everything moves as one); typical lag between parts 0 frames; 10% of energy peaks have every part peaking together |
| 6 Weight | 3.2 | 2 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 51 body snaps or pops, 93 finger snaps in 5.83 s |
| 8 Stiffness | 9.3 | 15% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:04.27** (4.27 s, f128) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap, pop, no-prep, com-spike, abrupt-stop)
- **0:02.90** (2.9 s, f87) LeftUpperArm: LeftUpperArm jumps 21 deg in one frame (also snap, pop, speed-change, no-prep, abrupt-start)
- **0:00.30** (0.3 s, f9) RightUpperArm: RightUpperArm jumps 34 deg in one frame (also snap, pop)
- **0:02.40** (2.4 s, f72) RightLowerArm: RightLowerArm jumps 14 deg in one frame (also snap, abrupt-stop)
