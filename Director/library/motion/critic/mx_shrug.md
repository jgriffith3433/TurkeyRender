# Motion critic: mx_shrug

61 frames at 30 fps (2 s). **Total 7.2/10: passable, weak on anticipation and ease (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.24 over 3 moves, 0% straight lines |
| 2 Slow in and out | 3.2 | speed shape 0.78 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6.1 | parts' speed profiles agree 0.53 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 3.8 | 1 body snaps or pops in 2 s |
| 8 Stiffness | 9.7 | 13% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 4 key poses, readability 0.74 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.23** (0.23 s, f7) RightHand: RightHand jumps 10 deg in one frame (also no-prep, abrupt-start)
- **0:00.80** (0.8 s, f24) LeftHand: LeftHand travels 38 cm with no anticipation and no overshoot or settle (also abrupt-stop)
- **0:01.77** (1.77 s, f53) LeftHand: LeftHand starts at 75% of its peak speed in one frame (also abrupt-stop)
- **0:01.37** (1.37 s, f41) Head: Head starts at 83% of its peak speed in one frame (also abrupt-stop)
