# Motion critic: sit_cough

130 frames at 30 fps (4.3 s). **Total 7/10: passable, weak on overlap and ease (7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.46 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 2.53 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 0 | parts' speed profiles agree 1 (1 = everything moves as one); typical lag between parts 0 frames; 75% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 28 cm/s |
| 7 Snaps and pops | 7.1 | 1 body snaps or pops in 4.3 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 8.5 | 9 key poses, readability 0.58 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 19 deg, spread 21 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.57** (1.57 s, f47) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap, abrupt-start)
