# Motion critic: hawkespunch 73.39-173.53 s

3004 frames at 30 fps (100.1 s), judged as zero-g. **Total 5.9/10: looks animated, not acted: snaps and overlap give it away (5.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.9 | person: median bend 0.07 over 54 moves, 44% straight lines; other: median bend 0.16 over 61 moves, 10% straight lines |
| 2 Slow in and out | 5.2 | person: speed shape 0.58 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame; other: speed shape 0.3 (bell 0.6, constant 1.0), 69% of moves start or stop in one frame |
| 3 Timing | 10 | person: 58 holds (median 0.87 s), 0% of frames dead still, fast parts median 0.03 s; other: 54 holds (median 1.33 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 5.4 | person: 49 big moves: 12 with anticipation, 5 with overshoot and settle; other: 54 big moves: 13 with anticipation, 18 with overshoot and settle |
| 5 Overlap and drag | 0.7 | person: parts' speed profiles agree 0.79 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together; other: parts' speed profiles agree 0.79 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 2.9 | person: 116 centre-of-mass jerks, 63 speed changes with no push (zero-g); other: 41 centre-of-mass jerks, 44 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | person: 1034 body snaps or pops, 428 finger snaps in 100.1 s; other: 618 body snaps or pops, 434 finger snaps in 100.1 s |
| 8 Stiffness | 8.8 | person: 19% of core joints frozen while the body moves; other: 17% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | person: 16 key poses, readability 0.75 (best of front, side, three-quarter), 6% twinned; other: 16 key poses, readability 0.71 (best of front, side, three-quarter), 44% twinned |
| 10 Hands and face | 10 | person: fingers curl 25 deg, spread 24 deg, head level; other: fingers curl 25 deg, spread 23 deg, head level |
| 11 Contact | 8.5 | person: hands clear of the body, 2 reaches into air; other: hands clear of the body, 1 reaches into air |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **1:16.96** (76.96 s, f107) person.Hips: Hips jumps 23 deg in one frame
- **1:43.26** (103.26 s, f896) person.Hips: Hips jumps 80 deg in one frame
- **1:46.26** (106.26 s, f986) person.Hips: Hips jumps 50 deg in one frame
- **1:47.16** (107.16 s, f1013) person.Hips: Hips jumps 29 deg in one frame
- **1:51.76** (111.76 s, f1151) person.Hips: Hips jumps 39 deg in one frame
