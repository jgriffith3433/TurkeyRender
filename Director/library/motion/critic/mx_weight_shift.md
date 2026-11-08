# Motion critic: mx_weight_shift

284 frames at 30 fps (9.43 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 6 moves, 0% straight lines |
| 2 Slow in and out | 1 | speed shape 0.84 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 3.63 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 10 | 2 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.7 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 9.43 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.78 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 10 | fingers curl 9 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.30** (7.3 s, f219) LeftHand: LeftHand starts at 70% of its peak speed in one frame
- **0:08.07** (8.07 s, f242) LeftHand: LeftHand stops dead from 65% of its peak
- **0:04.00** (4 s, f120) RightHand: RightHand starts at 70% of its peak speed in one frame
- **0:04.77** (4.77 s, f143) RightHand: RightHand stops dead from 72% of its peak
- **0:07.70** (7.7 s, f231) RightHand: RightHand starts at 63% of its peak speed in one frame
