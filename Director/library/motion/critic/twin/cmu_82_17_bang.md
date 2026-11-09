# Motion critic: cmu_82_17_bang

142 frames at 30 fps (4.7 s). **Total 7.6/10: passable, weak on anticipation and snaps (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 5.9 | median bend 0.1 over 7 moves, 14% straight lines |
| 2 Slow in and out | 5.9 | speed shape 0.6 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 0 | 4 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.26 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.8 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 0 | 6 body snaps or pops in 4.7 s |
| 8 Stiffness | 9.8 | 13% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.7 robust z from 174 mocap clips; furthest: handSpeedP50 low (1.37), legOmegaP95 low (1.17), headOmegaP95 high (0.97) |

## Worst moments

- **0:03.80** (3.8 s, f114) Head: Head jumps 12 deg in one frame (also snap)
- **0:02.97** (2.97 s, f89) RightToes: RightToes jumps 11 deg in one frame
- **0:00.43** (0.43 s, f13) RightHand: RightHand travels 94 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.73** (0.73 s, f22) Head: Head travels 35 cm with no anticipation and no overshoot or settle
- **0:01.17** (1.17 s, f35) LeftHand: LeftHand travels 31 cm with no anticipation and no overshoot or settle
