# Motion critic: IdleSit13Explain

106 frames at 30 fps (3.5 s). **Total 7.4/10: passable, weak on stiffness and overlap (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 10 | speed shape 0.55 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.47 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.24 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 1 cm/s |
| 7 Snaps and pops | 6.4 | 1 body snaps or pops in 3.5 s |
| 8 Stiffness | 0 | 32% of core joints frozen while the body moves; never moves: Hips, Spine, LeftUpperLeg, RightUpperLeg |
| 9 Silhouette | 9.1 | 7 key poses, readability 0.7 (best of front, side, three-quarter), 57% twinned |
| 10 Hands and face | 10 | fingers curl 24 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.43** (1.43 s, f43) LeftHand: LeftHand jumps 10 deg in one frame
