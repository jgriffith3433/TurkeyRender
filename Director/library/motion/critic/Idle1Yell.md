# Motion critic: Idle1Yell

101 frames at 30 fps (3.33 s). **Total 8/10: passable, weak on snaps and anticipation (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 7 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.55 (bell 0.6, constant 1.0), 14% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.27 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 3.4 | 7 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.6 | parts' speed profiles agree 0.52 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 3.33 s |
| 8 Stiffness | 9.3 | 15% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 7 key poses, readability 0.79 (best of front, side, three-quarter), 29% twinned |
| 10 Hands and face | 10 | fingers curl 24 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.27** (0.27 s, f8) LeftLowerArm: LeftLowerArm jumps 16 deg in one frame (also snap, no-prep)
- **0:00.77** (0.77 s, f23) LeftLowerArm: LeftLowerArm jumps 10 deg in one frame (also snap)
- **0:01.43** (1.43 s, f43) RightLowerArm: RightLowerArm jumps 8 deg in one frame (also no-prep)
