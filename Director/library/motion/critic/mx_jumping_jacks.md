# Motion critic: mx_jumping_jacks

33 frames at 30 fps (1.07 s). **Total 8.1/10: passable, weak on snaps and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 7 | speed shape 0.66 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.23 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 9 body snaps or pops, 4 finger snaps in 1.07 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 8.5 | 2 key poses, readability 0.73 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 9 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.60** (0.6 s, f18) RightFoot: RightFoot jumps 19 deg in one frame (also snap)
- **0:01.00** (1 s, f30) RightFoot: RightFoot jumps 11 deg in one frame (also snap)
- **0:00.07** (0.07 s, f2) RightFoot: RightFoot jumps 9 deg in one frame (also abrupt-start)
