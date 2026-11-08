# Motion critic: hp_a2_setdown

187 frames at 30 fps (6.2 s), judged as zero-g. **Total 4.8/10: wrong to an animator's eye: arcs and ease (4.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0 | median bend 0.02 over 14 moves, 57% straight lines |
| 2 Slow in and out | 0 | speed shape 0.96 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 6 holds (median 0.6 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 3 | 3 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0.6 | parts' speed profiles agree 0.79 (1 = everything moves as one); typical lag between parts 0 frames; 57% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 40 body snaps or pops in 6.2 s |
| 8 Stiffness | 10 | 12% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 6 key poses, readability 0.74 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 84% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.40** (0.4 s, f12) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap, speed-change)
- **0:00.77** (0.77 s, f23) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap, speed-change)
- **0:05.23** (5.23 s, f157) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:03.87** (3.87 s, f116) RightHand: RightHand jumps 28 deg in one frame
- **0:02.27** (2.27 s, f68) LeftHand: LeftHand moves at one speed for 0.47 s (flat 0.96): interpolation, not a move
