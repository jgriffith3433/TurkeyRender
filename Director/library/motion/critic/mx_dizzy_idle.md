# Motion critic: mx_dizzy_idle

129 frames at 30 fps (4.27 s). **Total 7.4/10: passable, weak on ease and arcs (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 3.6 | median bend 0.07 over 12 moves, 17% straight lines |
| 2 Slow in and out | 2.3 | speed shape 0.77 (bell 0.6, constant 1.0), 85% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 1.37 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6 | 5 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.09 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.27 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.75 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.47** (2.47 s, f74) Head: Head travels 20 cm in a straight line (bend 0.02) (also abrupt-start)
- **0:00.13** (0.13 s, f4) LeftHand: LeftHand starts at 64% of its peak speed in one frame (also abrupt-start)
- **0:01.33** (1.33 s, f40) RightHand: RightHand starts at 61% of its peak speed in one frame
- **0:03.33** (3.33 s, f100) LeftHand: LeftHand stops dead from 68% of its peak
- **0:00.97** (0.97 s, f29) RightHand: RightHand stops dead from 67% of its peak
