# Motion critic: gm_zg_hold_ball

113 frames at 30 fps (3.73 s), judged as zero-g. **Total 7.4/10: passable, weak on overlap and ease (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.29 over 2 moves, 0% straight lines |
| 2 Slow in and out | 2.9 | speed shape 0.74 (bell 0.6, constant 1.0), 77% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 0.83 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 0.5 | parts' speed profiles agree 0.8 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.73 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9.6 | 4 key poses, readability 0.54 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 6.9 | hands inside the body 15% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.33** (2.33 s, f70) LeftHand: LeftHand is inside the torso
- **0:02.67** (2.67 s, f80) LeftHand: LeftHand is inside the torso
- **0:03.00** (3 s, f90) LeftHand: LeftHand is inside the torso
- **0:03.33** (3.33 s, f100) LeftHand: LeftHand is inside the torso
- **0:03.72** (3.72 s, f112) Head: Head stops dead from 65% of its peak
