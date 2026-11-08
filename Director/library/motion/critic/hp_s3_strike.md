# Motion critic: hp_s3_strike

79 frames at 30 fps (2.6 s), judged as zero-g. **Total 5.9/10: looks animated, not acted: overlap and snaps give it away (5.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.2 | median bend 0.13 over 11 moves, 36% straight lines |
| 2 Slow in and out | 5 | speed shape 0.34 (bell 0.6, constant 1.0), 75% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.47 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 2.4 | 10 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.9 (1 = everything moves as one); typical lag between parts 0 frames; 13% of energy peaks have every part peaking together |
| 6 Weight | 2.5 | 2 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 40 body snaps or pops, 96 finger snaps in 2.6 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 9 | 3 key poses, readability 0.69 (best of front, side, three-quarter), 67% twinned |
| 10 Hands and face | 10 | fingers curl 58 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.50** (0.5 s, f15) LeftLowerLeg: LeftLowerLeg jumps 32 deg in one frame (also snap, lockstep, speed-change, pop, straight, no-prep, com-spike)
- **0:00.80** (0.8 s, f24) RightLowerLeg: RightLowerLeg jumps 20 deg in one frame (also snap, speed-change, pop, no-prep)
- **0:01.97** (1.97 s, f59) LeftFoot: LeftFoot starts at 100% of its peak speed in one frame (also abrupt-start)
