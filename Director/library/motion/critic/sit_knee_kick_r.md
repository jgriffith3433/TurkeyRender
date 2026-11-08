# Motion critic: sit_knee_kick_r

106 frames at 30 fps (3.5 s). **Total 6.2/10: looks animated, not acted: snaps and overlap give it away (6.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 3.9 | speed shape 0.68 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 3.07 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 2.2 | parts' speed profiles agree 0.65 (1 = everything moves as one); typical lag between parts 0 frames; 67% of energy peaks have every part peaking together |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 8 cm/s |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 3.5 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 8.5 | 7 key poses, readability 0.63 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 24 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap, abrupt-start, abrupt-stop)
