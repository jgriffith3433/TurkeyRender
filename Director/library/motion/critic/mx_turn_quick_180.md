# Motion critic: mx_turn_quick_180

40 frames at 30 fps (1.3 s). **Total 7.6/10: passable, weak on snaps and weight (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.74 over 4 moves, 0% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.55 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 4 big moves: 2 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 4.6 | parts' speed profiles agree 0.43 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 2.5 | 1 centre-of-mass jerks, planted feet slide 72 cm/s |
| 7 Snaps and pops | 0 | 29 body snaps or pops in 1.3 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.74 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 54 deg, spread 63 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.80** (0.8 s, f24) RightFoot: RightFoot jumps 22 deg in one frame (also snap)
- **0:00.40** (0.4 s, f12) Head: Head jumps 20 deg in one frame (also snap, no-prep)
- **0:01.30** (1.3 s, f39) body: the body's centre of mass jerks at 76 m/s^2 (also pop, abrupt-stop)
