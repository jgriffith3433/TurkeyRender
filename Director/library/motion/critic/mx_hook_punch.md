# Motion critic: mx_hook_punch

66 frames at 30 fps (2.17 s). **Total 8.3/10: passable, weak on snaps and overlap (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.37 over 5 moves, 0% straight lines |
| 2 Slow in and out | 8.8 | speed shape 0.4 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 9 | 3 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6.4 | parts' speed profiles agree 0.63 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9 | 0 centre-of-mass jerks, planted feet slide 14 cm/s |
| 7 Snaps and pops | 0 | 13 body snaps or pops in 2.17 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 78 deg, spread 11 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.00** (1 s, f30) RightUpperArm: RightUpperArm jumps 26 deg in one frame (also snap, pop)
- **0:01.40** (1.4 s, f42) LeftHand: LeftHand moves at one speed for 0.17 s (flat 0.93): interpolation, not a move (also abrupt-start, abrupt-stop)
