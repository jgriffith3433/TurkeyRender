# Motion critic: Cheer2

151 frames at 30 fps (5 s). **Total 8.4/10: passable, weak on snaps and ease (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.1 | median bend 0.13 over 11 moves, 36% straight lines |
| 2 Slow in and out | 3.6 | speed shape 0.77 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9 | 8 big moves: 3 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.2 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.8 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 2.5 | 3 body snaps or pops in 5 s |
| 8 Stiffness | 9.6 | 14% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 10 key poses, readability 0.73 (best of front, side, three-quarter), 40% twinned |
| 10 Hands and face | 10 | fingers curl 15 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.93** (2.93 s, f88) LeftLowerArm: LeftLowerArm jumps 15 deg in one frame
- **0:03.43** (3.43 s, f103) RightLowerArm: RightLowerArm jumps 9 deg in one frame
- **0:03.93** (3.93 s, f118) RightHand: RightHand jumps 8 deg in one frame
- **0:01.23** (1.23 s, f37) Head: Head travels 28 cm in a straight line (bend 0.03)
- **0:02.43** (2.43 s, f73) LeftHand: LeftHand travels 42 cm with no anticipation and no overshoot or settle
