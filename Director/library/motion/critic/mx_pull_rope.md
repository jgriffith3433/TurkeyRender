# Motion critic: mx_pull_rope

443 frames at 30 fps (14.73 s). **Total 8.2/10: passable, weak on anticipation and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 7.5 | median bend 0.11 over 27 moves, 7% straight lines |
| 2 Slow in and out | 5.9 | speed shape 0.71 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.5 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 2.3 | 18 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 9.7 | parts' speed profiles agree 0.33 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.2 | 0 centre-of-mass jerks, planted feet slide 11 cm/s |
| 7 Snaps and pops | 6.6 | 4 body snaps or pops, 39 finger snaps in 14.73 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 45 deg, spread 25 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:09.93** (9.93 s, f298) LeftHand: LeftHand jumps 10 deg in one frame
- **0:07.93** (7.93 s, f238) RightHand: RightHand jumps 9 deg in one frame
- **0:04.57** (4.57 s, f137) LeftHand: LeftHand jumps 9 deg in one frame
- **0:05.53** (5.53 s, f166) RightHand: RightHand jumps 8 deg in one frame
- **0:00.97** (0.97 s, f29) LeftHand: LeftHand travels 60 cm with no anticipation and no overshoot or settle
