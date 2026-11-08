# Motion critic: mx_shake_off

176 frames at 30 fps (5.83 s). **Total 7.8/10: passable, weak on snaps and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.16 over 15 moves, 0% straight lines |
| 2 Slow in and out | 9.1 | speed shape 0.6 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.3 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 7.5 | 12 big moves: 2 with anticipation, 5 with overshoot and settle |
| 5 Overlap and drag | 5.3 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.2 | 0 centre-of-mass jerks, planted feet slide 12 cm/s |
| 7 Snaps and pops | 0 | 6 body snaps or pops, 7 finger snaps in 5.83 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 12 key poses, readability 0.76 (best of front, side, three-quarter), 17% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 42% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:04.63** (4.63 s, f139) Head: Head jumps 16 deg in one frame (also snap)
- **0:03.03** (3.03 s, f91) Head: Head jumps 10 deg in one frame
- **0:03.43** (3.43 s, f103) Head: Head starts at 61% of its peak speed in one frame
- **0:05.17** (5.17 s, f155) Head: Head starts at 73% of its peak speed in one frame
- **0:05.50** (5.5 s, f165) Head: Head stops dead from 77% of its peak
