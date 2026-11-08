# Motion critic: gm_zg_laugh

90 frames at 30 fps (2.97 s), judged as zero-g. **Total 6.8/10: looks animated, not acted: snaps and arcs give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 2.8 | median bend 0.06 over 3 moves, 0% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.5 (bell 0.6, constant 1.0), 62% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 10 | 1 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 4.4 | parts' speed profiles agree 0.45 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 5 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 2.97 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.58 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 5.9 | hands inside the body 21% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.20** (0.2 s, f6) body: in zero-g the body changes speed by 0.54 m/s with nothing to push on (also speed-change, snap, self-penetration)
- **0:00.53** (0.53 s, f16) Head: Head jumps 11 deg in one frame (also speed-change)
- **0:01.73** (1.73 s, f52) Head: Head jumps 10 deg in one frame (also speed-change)
- **0:02.03** (2.03 s, f61) RightHand: RightHand is inside the torso
- **0:02.37** (2.37 s, f71) RightHand: RightHand is inside the torso
