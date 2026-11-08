# Motion critic: mx_falling_idle

22 frames at 30 fps (0.7 s). **Total 8.4/10: passable, weak on ease and hands (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 0.8 | speed shape 0.85 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.12 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 9.7 | 0 centre-of-mass jerks, planted feet slide 6 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 0.7 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 1 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.03** (0.03 s, f1) Head: the head hangs 61 deg forward of the chest (also abrupt-start)
- **0:00.70** (0.7 s, f21) LeftHand: LeftHand stops dead from 89% of its peak (also abrupt-stop)
- **0:00.30** (0.3 s, f9) RightFoot: RightFoot starts at 88% of its peak speed in one frame
