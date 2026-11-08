# Motion critic: hp_a1_atlas

121 frames at 30 fps (4 s), judged as zero-g. **Total 5.3/10: looks animated, not acted: anticipation and overlap give it away (5.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 4.2 | median bend 0.08 over 12 moves, 8% straight lines |
| 2 Slow in and out | 5 | speed shape 0.36 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 2.57 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 0 | 10 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.91 (1 = everything moves as one); typical lag between parts 0 frames; 9% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 67 body snaps or pops, 16 finger snaps in 4 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 8.5 | 8 key poses, readability 0.66 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 89% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.77** (0.77 s, f23) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, speed-change, pop, no-prep, abrupt-start)
- **0:00.43** (0.43 s, f13) LeftUpperLeg: LeftUpperLeg jumps 31 deg in one frame (also snap, speed-change, abrupt-start, abrupt-stop, no-prep)
- **0:01.10** (1.1 s, f33) body: in zero-g the body changes speed by 0.39 m/s with nothing to push on (also snap, abrupt-start)
