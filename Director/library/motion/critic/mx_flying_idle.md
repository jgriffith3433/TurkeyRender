# Motion critic: mx_flying_idle

80 frames at 30 fps (2.63 s). **Total 8.3/10: passable, weak on ease and hands (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 0.1 | speed shape 0.89 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 2.37 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.24 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.63 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 8.8 | 5 key poses, readability 0.54 (best of front, side, three-quarter), 80% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.03** (0.03 s, f1) Head: the head hangs 90 deg forward of the chest (also abrupt-start)
- **0:00.37** (0.37 s, f11) RightHand: RightHand stops dead from 88% of its peak
- **0:01.43** (1.43 s, f43) RightHand: RightHand starts at 77% of its peak speed in one frame (also abrupt-stop, abrupt-start)
- **0:01.77** (1.77 s, f53) RightHand: RightHand starts at 88% of its peak speed in one frame (also abrupt-stop)
