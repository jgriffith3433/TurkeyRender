# Motion critic: mx_point_bent

84 frames at 30 fps (2.77 s). **Total 7.3/10: passable, weak on anticipation and ease (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.9 | median bend 0.11 over 2 moves, 0% straight lines |
| 2 Slow in and out | 0.8 | speed shape 0.86 (bell 0.6, constant 1.0), 71% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.87 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops, 2 finger snaps in 2.77 s |
| 8 Stiffness | 6.9 | 20% of core joints frozen while the body moves; never moves: RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.77** (1.77 s, f53) RightHand: RightHand travels 54 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:00.23** (0.23 s, f7) RightHand: RightHand travels 52 cm with no anticipation and no overshoot or settle (also abrupt-start, abrupt-stop)
- **0:02.17** (2.17 s, f65) LeftHand: LeftHand stops dead from 71% of its peak (also abrupt-stop)
- **0:00.60** (0.6 s, f18) LeftHand: LeftHand starts at 77% of its peak speed in one frame
- **0:01.00** (1 s, f30) LeftHand: LeftHand stops dead from 77% of its peak
