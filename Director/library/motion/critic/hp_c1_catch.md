# Motion critic: hp_c1_catch

157 frames at 30 fps (5.2 s), judged as zero-g. **Total 5.9/10: looks animated, not acted: snaps and arcs give it away (5.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 1.9 | median bend 0.05 over 25 moves, 40% straight lines |
| 2 Slow in and out | 5 | speed shape 0.41 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 0.9 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 7.3 | 23 big moves: 11 with anticipation, 5 with overshoot and settle |
| 5 Overlap and drag | 2 | parts' speed profiles agree 0.67 (1 = everything moves as one); typical lag between parts 0 frames; 29% of energy peaks have every part peaking together |
| 6 Weight | 8.4 | 0 centre-of-mass jerks, 2 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 46 body snaps or pops, 40 finger snaps in 5.2 s |
| 8 Stiffness | 8.5 | 11% of core joints frozen while the body moves; never moves: Chest |
| 9 Silhouette | 8.9 | 4 key poses, readability 0.68 (best of front, side, three-quarter), 75% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 93% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.77** (3.77 s, f113) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:04.13** (4.13 s, f124) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:00.37** (0.37 s, f11) LeftLowerArm: LeftLowerArm jumps 20 deg in one frame (also snap)
- **0:02.13** (2.13 s, f64) LeftUpperArm: LeftUpperArm jumps 12 deg in one frame (also snap)
- **0:00.93** (0.93 s, f28) Hips: Hips jumps 9 deg in one frame
