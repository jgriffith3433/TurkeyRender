# Motion critic: mx_taunt_flex

117 frames at 30 fps (3.87 s). **Total 7.8/10: passable, weak on snaps and ease (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 9 moves, 11% straight lines |
| 2 Slow in and out | 3.8 | speed shape 0.7 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.2 s |
| 4 Anticipation and follow-through | 9 | 6 big moves: 4 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 5.9 | parts' speed profiles agree 0.55 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops, 62 finger snaps in 3.87 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 8 key poses, readability 0.72 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 72 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.37** (1.37 s, f41) RightUpperArm: RightUpperArm jumps 19 deg in one frame (also snap)
- **0:00.07** (0.07 s, f2) Head: Head travels 36 cm with no anticipation and no overshoot or settle
- **0:02.17** (2.17 s, f65) Head: Head travels 35 cm with no anticipation and no overshoot or settle
- **0:03.53** (3.53 s, f106) LeftHand: LeftHand moves at one speed for 0.27 s (flat 0.91): interpolation, not a move
- **0:03.20** (3.2 s, f96) LeftHand: LeftHand starts at 77% of its peak speed in one frame
