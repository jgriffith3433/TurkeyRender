# Motion critic: hp_doc_after

61 frames at 30 fps (2 s). **Total 5/10: looks animated, not acted: overlap and snaps give it away (5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 3.1 | median bend 0.06 over 5 moves, 20% straight lines |
| 2 Slow in and out | 5 | speed shape 0.35 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.5 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 1.8 | 5 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.96 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.4 | 0 centre-of-mass jerks, planted feet slide 10 cm/s |
| 7 Snaps and pops | 0 | 35 body snaps or pops, 102 finger snaps in 2 s |
| 8 Stiffness | 3.1 | 45% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 16 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.30** (0.3 s, f9) LeftUpperLeg: LeftUpperLeg jumps 18 deg in one frame (also snap, pop, abrupt-stop, abrupt-start, no-prep)
- **0:00.77** (0.77 s, f23) RightHand: RightHand jumps 36 deg in one frame (also snap)
- **0:01.27** (1.27 s, f38) RightUpperArm: RightUpperArm jumps 14 deg in one frame (also snap)
