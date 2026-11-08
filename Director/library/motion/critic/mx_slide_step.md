# Motion critic: mx_slide_step

135 frames at 30 fps (4.47 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.21 over 17 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.57 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 10 | 13 big moves: 8 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.26 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 151 cm/s |
| 7 Snaps and pops | 0 | 140 body snaps or pops in 4.47 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 10 deg, head level |
| 11 Contact | 9.9 | hands inside the body 1% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.30** (0.3 s, f9) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:02.03** (2.03 s, f61) LeftLowerLeg: LeftLowerLeg jumps 179 deg in one frame (also snap)
- **0:02.30** (2.3 s, f69) LeftLowerLeg: LeftLowerLeg jumps 20 deg in one frame (also snap)
- **0:04.30** (4.3 s, f129) LeftLowerLeg: LeftLowerLeg jumps 180 deg in one frame (also snap)
- **0:01.20** (1.2 s, f36) RightLowerLeg: RightLowerLeg jumps 19 deg in one frame
