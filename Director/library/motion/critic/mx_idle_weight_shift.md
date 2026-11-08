# Motion critic: mx_idle_weight_shift

500 frames at 30 fps (16.63 s). **Total 7.3/10: passable, weak on ease and arcs (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 3.6 | median bend 0.07 over 6 moves, 50% straight lines |
| 2 Slow in and out | 1.5 | speed shape 0.82 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 12.07 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4 | 2 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6.9 | parts' speed profiles agree 0.46 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 16.63 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.67** (3.67 s, f110) LeftFoot: LeftFoot starts at 67% of its peak speed in one frame
- **0:10.43** (10.43 s, f313) LeftHand: LeftHand starts at 64% of its peak speed in one frame
- **0:10.87** (10.87 s, f326) LeftHand: LeftHand stops dead from 70% of its peak
- **0:06.07** (6.07 s, f182) RightHand: RightHand starts at 74% of its peak speed in one frame
- **0:06.43** (6.43 s, f193) RightHand: RightHand stops dead from 72% of its peak
