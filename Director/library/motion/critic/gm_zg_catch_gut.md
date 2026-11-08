# Motion critic: gm_zg_catch_gut

75 frames at 30 fps (2.47 s), judged as zero-g. **Total 6.8/10: looks animated, not acted: snaps and anticipation give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.46 over 8 moves, 0% straight lines |
| 2 Slow in and out | 4.4 | speed shape 0.71 (bell 0.6, constant 1.0), 58% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.3 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 4 | 6 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5.1 | parts' speed profiles agree 0.75 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 8 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 16 body snaps or pops in 2.47 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.58 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 61% of the time |
| 11 Contact | 7.2 | hands inside the body 14% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.53** (0.53 s, f16) RightLowerLeg: RightLowerLeg jumps 30 deg in one frame (also snap, speed-change)
- **0:01.20** (1.2 s, f36) LeftFoot: LeftFoot jumps 37 deg in one frame
- **0:01.83** (1.83 s, f55) LeftFoot: LeftFoot jumps 47 deg in one frame (also snap)
- **0:00.10** (0.1 s, f3) body: in zero-g the body changes speed by 0.69 m/s with nothing to push on
- **0:00.80** (0.8 s, f24) body: in zero-g the body changes speed by 0.64 m/s with nothing to push on
