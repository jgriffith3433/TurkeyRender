# Motion critic: mx_breathing_idle

299 frames at 30 fps (9.93 s). **Total 7.6/10: passable, weak on ease and arcs (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 2.7 | median bend 0.06 over 7 moves, 29% straight lines |
| 2 Slow in and out | 0.2 | speed shape 0.89 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 5.47 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6 | 4 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.28 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 9.93 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 19 deg, spread 31 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:08.57** (8.57 s, f257) LeftHand: LeftHand moves at one speed for 0.8 s (flat 0.89): interpolation, not a move
- **0:03.03** (3.03 s, f91) LeftHand: LeftHand starts at 72% of its peak speed in one frame (also abrupt-stop)
- **0:03.83** (3.83 s, f115) LeftHand: LeftHand starts at 65% of its peak speed in one frame
- **0:05.20** (5.2 s, f156) LeftHand: LeftHand stops dead from 63% of its peak
- **0:07.37** (7.37 s, f221) LeftHand: LeftHand starts at 70% of its peak speed in one frame
