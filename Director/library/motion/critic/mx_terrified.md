# Motion critic: mx_terrified

601 frames at 30 fps (20 s). **Total 7.3/10: passable, weak on snaps and overlap (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 34 moves, 6% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.66 (bell 0.6, constant 1.0), 54% of moves start or stop in one frame |
| 3 Timing | 10 | 7 holds (median 0.33 s), 0% of frames dead still, fast parts median 0.2 s |
| 4 Anticipation and follow-through | 5.4 | 23 big moves: 9 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 3.2 | parts' speed profiles agree 0.8 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.1 | 0 centre-of-mass jerks, planted feet slide 13 cm/s |
| 7 Snaps and pops | 0 | 27 body snaps or pops, 49 finger snaps in 20 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 7 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 51 deg, spread 39 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.97** (0.97 s, f29) LeftFoot: LeftFoot jumps 20 deg in one frame (also snap)
- **0:09.67** (9.67 s, f290) Head: Head jumps 17 deg in one frame
- **0:04.00** (4 s, f120) Head: Head jumps 15 deg in one frame
- **0:18.80** (18.8 s, f564) Head: Head jumps 14 deg in one frame
- **0:10.07** (10.07 s, f302) Head: Head jumps 11 deg in one frame
