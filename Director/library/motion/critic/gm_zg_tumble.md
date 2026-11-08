# Motion critic: gm_zg_tumble

121 frames at 30 fps (4 s), judged as zero-g. **Total 6.8/10: looks animated, not acted: snaps and weight give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.2 over 18 moves, 11% straight lines |
| 2 Slow in and out | 4 | speed shape 0.67 (bell 0.6, constant 1.0), 71% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.97 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 9.7 | 17 big moves: 7 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 3.6 | parts' speed profiles agree 0.77 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 2.5 | 3 centre-of-mass jerks, 20 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 64 body snaps or pops in 4 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 8 key poses, readability 0.55 (best of front, side, three-quarter), 38% twinned |
| 10 Hands and face | 8 | head bowed 66% of the time |
| 11 Contact | 8.9 | hands inside the body 5% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.70** (0.7 s, f21) LeftLowerLeg: LeftLowerLeg jumps 19 deg in one frame (also snap)
- **0:00.27** (0.27 s, f8) LeftFoot: LeftFoot jumps 49 deg in one frame
- **0:00.97** (0.97 s, f29) LeftFoot: LeftFoot jumps 85 deg in one frame
- **0:01.67** (1.67 s, f50) LeftFoot: LeftFoot jumps 19 deg in one frame
- **0:02.07** (2.07 s, f62) LeftFoot: LeftFoot jumps 71 deg in one frame
