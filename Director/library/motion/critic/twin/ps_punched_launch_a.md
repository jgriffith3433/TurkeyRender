# Motion critic: ps_punched_launch_a

251 frames at 30 fps (8.33 s). **Total 6.1/10: looks animated, not acted: snaps and overlap give it away (6.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 6 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.35 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 6 | 1 holds (median 4.73 s), 0% of frames dead still, fast parts median 3.57 s |
| 4 Anticipation and follow-through | 6.5 | 6 big moves: 4 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 3 | parts' speed profiles agree 0.82 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 7 centre-of-mass jerks, planted feet slide 142 cm/s |
| 7 Snaps and pops | 0 | 99 body snaps or pops in 8.33 s |
| 8 Stiffness | 5.4 | 20% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.7 | 16 key poses, readability 0.75 (best of front, side, three-quarter), 19% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 4.8 | 2.24 robust z from 174 mocap clips; furthest: headOmegaP50 low (5), handSpeedP50 low (5), energyCV high (4.17) |

## Worst moments

- **0:00.90** (0.9 s, f27) Neck: Neck jumps 82 deg in one frame (also snap, com-spike, pop)
- **0:00.10** (0.1 s, f3) Head: Head jumps 22 deg in one frame (also snap, com-spike, pop)
- **0:03.63** (3.63 s, f109) body: the body's centre of mass jerks at 113 m/s^2 (also pop)
- **0:00.60** (0.6 s, f18) LeftHand: LeftHand moves 18 cm in one frame (also pop)
- **0:01.33** (1.33 s, f40) RightHand: RightHand moves 18 cm in one frame
