# Motion critic: mx_cross_punch

61 frames at 30 fps (2 s). **Total 8.4/10: passable, weak on snaps and overlap (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.78 over 3 moves, 0% straight lines |
| 2 Slow in and out | 9.8 | speed shape 0.42 (bell 0.6, constant 1.0), 17% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.27 s |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 5.9 | parts' speed profiles agree 0.68 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.6 | 0 centre-of-mass jerks, planted feet slide 18 cm/s |
| 7 Snaps and pops | 0 | 17 body snaps or pops in 2 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 77 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.90** (0.9 s, f27) LeftUpperArm: LeftUpperArm jumps 23 deg in one frame (also snap, pop, abrupt-stop)
- **0:01.23** (1.23 s, f37) RightUpperArm: RightUpperArm jumps 21 deg in one frame (also snap)
- **0:00.47** (0.47 s, f14) RightHand: RightHand moves at one speed for 0.2 s (flat 0.91): interpolation, not a move (also abrupt-start)
