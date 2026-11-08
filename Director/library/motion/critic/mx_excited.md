# Motion critic: mx_excited

199 frames at 30 fps (6.6 s). **Total 8.4/10: passable, weak on snaps and anticipation (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.17 over 2 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.44 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 2 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 9.1 | parts' speed profiles agree 0.38 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 8.4 | 0 centre-of-mass jerks, planted feet slide 21 cm/s |
| 7 Snaps and pops | 0 | 25 body snaps or pops, 6 finger snaps in 6.6 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 13 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 67 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.73** (0.73 s, f22) LeftHand: LeftHand jumps 19 deg in one frame (also snap)
- **0:03.17** (3.17 s, f95) RightHand: RightHand jumps 24 deg in one frame
- **0:04.53** (4.53 s, f136) RightHand: RightHand jumps 16 deg in one frame
- **0:05.17** (5.17 s, f155) RightHand: RightHand jumps 16 deg in one frame
- **0:03.77** (3.77 s, f113) LeftHand: LeftHand jumps 15 deg in one frame
