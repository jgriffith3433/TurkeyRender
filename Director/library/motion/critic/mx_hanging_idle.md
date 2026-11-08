# Motion critic: mx_hanging_idle

143 frames at 30 fps (4.73 s). **Total 8.1/10: passable, weak on ease and hands (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 0 | speed shape 0.93 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 4.73 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.19 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.73 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 8.5 | 10 key poses, readability 0.7 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 57% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.53** (2.53 s, f76) LeftFoot: LeftFoot starts at 84% of its peak speed in one frame (also abrupt-stop)
- **0:01.37** (1.37 s, f41) LeftFoot: LeftFoot starts at 79% of its peak speed in one frame (also abrupt-stop, abrupt-start)
- **0:01.97** (1.97 s, f59) LeftFoot: LeftFoot starts at 94% of its peak speed in one frame (also abrupt-stop)
