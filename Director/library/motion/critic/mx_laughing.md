# Motion critic: mx_laughing

295 frames at 30 fps (9.8 s). **Total 7.9/10: passable, weak on snaps and ease (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.54 over 10 moves, 10% straight lines |
| 2 Slow in and out | 4.2 | speed shape 0.75 (bell 0.6, constant 1.0), 54% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.57 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 7.5 | 6 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 6.3 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.7 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 2.3 | 6 body snaps or pops, 1 finger snaps in 9.8 s |
| 8 Stiffness | 9.8 | 13% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 17 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:04.27** (4.27 s, f128) RightLowerArm: RightLowerArm jumps 11 deg in one frame (also snap)
- **0:04.90** (4.9 s, f147) LeftLowerArm: LeftLowerArm jumps 9 deg in one frame (also snap)
- **0:03.77** (3.77 s, f113) RightHand: RightHand jumps 9 deg in one frame
- **0:02.50** (2.5 s, f75) RightHand: RightHand jumps 8 deg in one frame
- **0:00.87** (0.87 s, f26) Head: Head travels 31 cm with no anticipation and no overshoot or settle
