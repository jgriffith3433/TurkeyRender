# Motion critic: gm_zg_startle

90 frames at 30 fps (2.97 s), judged as zero-g. **Total 7.9/10: passable, weak on snaps and anticipation (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.23 over 6 moves, 0% straight lines |
| 2 Slow in and out | 9.1 | speed shape 0.51 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.47 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 6.5 | 6 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6.6 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 14 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 38 body snaps or pops in 2.97 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 6 key poses, readability 0.63 (best of front, side, three-quarter), 17% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 14 deg, head level |
| 11 Contact | 8.6 | hands inside the body 7% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.67** (0.67 s, f20) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame (also snap, speed-change)
- **0:01.37** (1.37 s, f41) LeftLowerLeg: LeftLowerLeg jumps 32 deg in one frame (also snap, speed-change)
- **0:01.73** (1.73 s, f52) LeftLowerLeg: LeftLowerLeg jumps 36 deg in one frame (also snap, speed-change)
- **0:01.10** (1.1 s, f33) LeftFoot: LeftFoot jumps 38 deg in one frame (also snap)
- **0:02.10** (2.1 s, f63) body: in zero-g the body changes speed by 0.41 m/s with nothing to push on
