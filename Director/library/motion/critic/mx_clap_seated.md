# Motion critic: mx_clap_seated

36 frames at 30 fps (1.17 s). **Total 8/10: passable, weak on snaps and ease (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 6.8 | speed shape 0.55 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.18 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 1.17 s |
| 8 Stiffness | 8.3 | 20% of core joints frozen while the body moves |
| 9 Silhouette | 8.5 | 2 key poses, readability 0.59 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.63** (0.63 s, f19) LeftHand: LeftHand jumps 14 deg in one frame (also snap)
- **0:00.33** (0.33 s, f10) LeftHand: LeftHand jumps 11 deg in one frame (also snap)
- **0:01.13** (1.13 s, f34) RightHand: RightHand jumps 9 deg in one frame (also abrupt-stop)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 72% of its peak speed in one frame
