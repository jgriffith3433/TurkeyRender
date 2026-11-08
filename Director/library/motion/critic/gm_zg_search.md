# Motion critic: gm_zg_search

121 frames at 30 fps (4 s), judged as zero-g. **Total 7.6/10: passable, weak on anticipation and snaps (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 10 moves, 0% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.74 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 3.3 | 9 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6.1 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 3 speed changes with no push (zero-g) |
| 7 Snaps and pops | 3.8 | 2 body snaps or pops in 4 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 8 key poses, readability 0.57 (best of front, side, three-quarter), 38% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 9.3 | hands inside the body 3% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.47** (1.47 s, f44) Head: Head jumps 9 deg in one frame (also speed-change)
- **0:03.10** (3.1 s, f93) LeftHand: LeftHand jumps 9 deg in one frame
- **0:01.80** (1.8 s, f54) body: in zero-g the body changes speed by 0.28 m/s with nothing to push on
- **0:00.87** (0.87 s, f26) RightHand: RightHand is inside the torso
- **0:02.20** (2.2 s, f66) LeftFoot: LeftFoot starts at 69% of its peak speed in one frame
