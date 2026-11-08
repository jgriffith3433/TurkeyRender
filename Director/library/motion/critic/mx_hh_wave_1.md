# Motion critic: mx_hh_wave_1

507 frames at 30 fps (16.87 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.4 over 43 moves, 9% straight lines |
| 2 Slow in and out | 6.5 | speed shape 0.64 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 36 big moves: 17 with anticipation, 16 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.22 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 45 cm/s |
| 7 Snaps and pops | 0 | 124 body snaps or pops, 16 finger snaps in 16.87 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 8 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:05.53** (5.53 s, f166) LeftLowerArm: LeftLowerArm jumps 27 deg in one frame
- **0:01.70** (1.7 s, f51) RightLowerArm: RightLowerArm jumps 21 deg in one frame
- **0:02.63** (2.63 s, f79) RightLowerArm: RightLowerArm jumps 20 deg in one frame
- **0:06.97** (6.97 s, f209) RightLowerArm: RightLowerArm jumps 19 deg in one frame
- **0:00.63** (0.63 s, f19) LeftHand: LeftHand jumps 30 deg in one frame
