# Motion critic: mx_hit_reaction

14 frames at 30 fps (0.43 s). **Total 7.4/10: passable, weak on snaps and overlap (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5.9 | speed shape 0.41 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 4.4 | parts' speed profiles agree 0.69 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.2 | 0 centre-of-mass jerks, planted feet slide 12 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops in 0.43 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 1 key poses, readability 0.74 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 43 deg, spread 43 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.10** (0.1 s, f3) LeftShoulder: LeftShoulder jumps 12 deg in one frame (also snap, abrupt-start)
