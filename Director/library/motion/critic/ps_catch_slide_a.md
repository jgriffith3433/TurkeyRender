# Motion critic: ps_catch_slide_a

105 frames at 30 fps (3.47 s). **Total 7.5/10: passable, weak on anticipation and stiffness (7.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.4 | median bend 0.1 over 12 moves, 33% straight lines |
| 2 Slow in and out | 8.6 | speed shape 0.7 (bell 0.6, constant 1.0), 15% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.57 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 0.9 | 10 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.47 s |
| 8 Stiffness | 1.4 | 24% of core joints frozen while the body moves; never moves: Spine, Chest, LeftShoulder, RightShoulder |
| 9 Silhouette | 9.8 | 7 key poses, readability 0.81 (best of front, side, three-quarter), 14% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.96 robust z from 174 mocap clips; furthest: spineToArm high (1.88), armOmegaP50 low (1.44), legOmegaP95 low (1.26) |

## Worst moments

- **0:02.23** (2.23 s, f67) LeftHand: LeftHand travels 48 cm in a straight line (bend 0.03) (also straight, no-prep)
- **0:00.80** (0.8 s, f24) LeftHand: LeftHand travels 85 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-stop)
- **0:00.07** (0.07 s, f2) LeftFoot: LeftFoot travels 82 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.43** (0.43 s, f13) LeftHand: LeftHand starts at 67% of its peak speed in one frame
