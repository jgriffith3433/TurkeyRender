# Motion critic: mx_sitting_talking

1350 frames at 30 fps (44.97 s). **Total 7.7/10: passable, weak on stiffness and snaps (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.15 over 13 moves, 8% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.59 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 19 holds (median 1.37 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6.7 | 8 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.27 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 1 cm/s |
| 7 Snaps and pops | 5.3 | 17 body snaps or pops in 44.97 s |
| 8 Stiffness | 5.2 | 35% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 16 key poses, readability 0.69 (best of front, side, three-quarter), 31% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 35% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:24.47** (24.47 s, f734) RightHand: RightHand jumps 18 deg in one frame (also snap)
- **0:34.00** (34 s, f1020) LeftHand: LeftHand jumps 14 deg in one frame
- **0:32.97** (32.97 s, f989) LeftLowerArm: LeftLowerArm jumps 10 deg in one frame
- **0:31.30** (31.3 s, f939) LeftHand: LeftHand jumps 10 deg in one frame
- **0:17.50** (17.5 s, f525) RightHand: RightHand jumps 9 deg in one frame
