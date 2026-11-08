# Motion critic: mx_stomach_hit

37 frames at 30 fps (1.2 s). **Total 7.8/10: passable, weak on snaps and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.77 over 2 moves, 0% straight lines |
| 2 Slow in and out | 9.8 | speed shape 0.41 (bell 0.6, constant 1.0), 17% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 6 | 2 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 3.6 | parts' speed profiles agree 0.76 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.9 | 0 centre-of-mass jerks, planted feet slide 15 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops in 1.2 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.69 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 54 deg, spread 16 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.20** (0.2 s, f6) LeftHand: LeftHand jumps 19 deg in one frame (also snap)
- **0:00.97** (0.97 s, f29) Head: Head starts at 79% of its peak speed in one frame (also abrupt-stop)
