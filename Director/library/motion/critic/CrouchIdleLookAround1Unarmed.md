# Motion critic: CrouchIdleLookAround1Unarmed

176 frames at 30 fps (5.83 s). **Total 7.9/10: passable, weak on ease and anticipation (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.66 over 4 moves, 0% straight lines |
| 2 Slow in and out | 2 | speed shape 0.86 (bell 0.6, constant 1.0), 56% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 1.03 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 5 | 3 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5 | parts' speed profiles agree 0.75 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.83 s |
| 8 Stiffness | 8.4 | 20% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 36 deg, spread 37 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:05.30** (5.3 s, f159) LeftHand: LeftHand starts at 71% of its peak speed in one frame (also abrupt-start)
- **0:05.60** (5.6 s, f168) LeftHand: LeftHand stops dead from 66% of its peak (also abrupt-stop)
- **0:03.23** (3.23 s, f97) Head: Head starts at 80% of its peak speed in one frame
- **0:03.53** (3.53 s, f106) Head: Head stops dead from 78% of its peak
- **0:00.17** (0.17 s, f5) LeftHand: LeftHand starts at 85% of its peak speed in one frame
