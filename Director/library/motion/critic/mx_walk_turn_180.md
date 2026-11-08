# Motion critic: mx_walk_turn_180

31 frames at 30 fps (1 s). **Total 7.2/10: passable, weak on snaps and weight (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.2 over 4 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.33 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 8.2 | 4 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 4.8 | parts' speed profiles agree 0.41 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 2.5 | 1 centre-of-mass jerks, planted feet slide 39 cm/s |
| 7 Snaps and pops | 0 | 10 body snaps or pops, 8 finger snaps in 1 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 46 deg, spread 35 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.00** (1 s, f30) body: the body's centre of mass jerks at 120 m/s^2 (also snap, pop, abrupt-stop)
- **0:00.23** (0.23 s, f7) LeftHand: LeftHand jumps 9 deg in one frame (also snap, abrupt-start, no-prep)
