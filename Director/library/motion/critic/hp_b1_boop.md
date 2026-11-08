# Motion critic: hp_b1_boop

61 frames at 30 fps (2 s), judged as zero-g. **Total 5.2/10: looks animated, not acted: anticipation and snaps give it away (5.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 1.3 | median bend 0.04 over 10 moves, 40% straight lines |
| 2 Slow in and out | 5 | speed shape 0.35 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.9 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 0 | 8 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.3 | parts' speed profiles agree 0.64 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 11 body snaps or pops, 60 finger snaps in 2 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9.6 | 4 key poses, readability 0.78 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 25 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.37** (0.37 s, f11) RightUpperArm: RightUpperArm jumps 27 deg in one frame (also snap, abrupt-stop)
- **0:00.87** (0.87 s, f26) RightLowerArm: RightLowerArm jumps 15 deg in one frame (also snap, abrupt-start)
