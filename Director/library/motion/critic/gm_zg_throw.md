# Motion critic: gm_zg_throw

75 frames at 30 fps (2.47 s), judged as zero-g. **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 5.03 over 4 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.51 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6.2 | parts' speed profiles agree 0.65 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 14 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 6 body snaps or pops in 2.47 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.7 | 5 key poses, readability 0.68 (best of front, side, three-quarter), 20% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.73** (0.73 s, f22) RightUpperArm: RightUpperArm jumps 18 deg in one frame (also snap, speed-change)
- **0:00.17** (0.17 s, f5) LeftFoot: LeftFoot jumps 14 deg in one frame (also speed-change, snap)
- **0:01.50** (1.5 s, f45) body: in zero-g the body changes speed by 0.42 m/s with nothing to push on (also speed-change)
- **0:00.43** (0.43 s, f13) LeftUpperLeg: LeftUpperLeg jumps 11 deg in one frame
- **0:01.10** (1.1 s, f33) body: in zero-g the body changes speed by 0.31 m/s with nothing to push on
