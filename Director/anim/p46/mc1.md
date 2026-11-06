# Motion check

Written by `mv motioncheck`, 2026-11-05 20:47. 601 frames at 30 fps, 91.0 to 111.0 s. Only what the shot's camera frustum holds counts; closer and larger rank first.

Totals, as time ranges: joint 99, overreach 15.

Method: Bodies: capsules between bones (radii scaled to the rig). Props: temporary non-convex MeshCollider on each mesh, Physics.ComputePenetration against the surface, plus 6-axis rays for a part wholly inside a closed mesh. Skinned meshes that are not checked bodies: box at 70% of bounds (how=bounds). Visibility: frustum only, no occlusion.

| # | time | bar | shot | who | check | parts | against | worst | on screen | cam m | score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1:37.53-1:38.87 | 36:1.96 | 040 it goes for his face | person | overreach (target out of reach) | left arm | left arm point | 189.8 cm over | 150% | 0.7 | 991.4 |
| 2 | 1:49.37-1:49.90 | 40:2.98 | 049 in the night | person | overreach (target out of reach) | right arm | right arm person.head | 25.2 cm over | 121% | 1.4 | 599.3 |
| 3 | 1:49.30-1:49.90 | 40:2.83 | 049 in the night | person | overreach (target out of reach) | left arm | left arm person.head | 24.5 cm over | 84% | 1.2 | 431.1 |
| 4 | 1:35.50-1:37.50 | 35:2.92 | 039 up at him, with it | person | overreach (target out of reach) | left arm | left arm point | 36.8 cm over | 34% | 2.3 | 260.6 |
| 5 | 1:40.70-1:41.17 | 37:2.8 | 042 along the wall | person | overreach (target out of reach) | left arm | left arm person.chest | 37.6 cm over | 48% | 2.0 | 230.3 |
| 6 | 1:37.53-1:38.87 | 36:1.82 | 040 it goes for his face | person | joint | RightHand | RightHand wrist | 96.3 deg | 44% | 1.2 | 194.2 |
| 7 | 1:42.60-1:42.93 | 38:1.31 | 043 the one by his hand | person | overreach (target out of reach) | left arm | left arm point | 13.3 cm over | 58% | 1.6 | 187.4 |
| 8 | 1:49.30-1:49.90 | 40:3.46 | 049 in the night | person | joint | LeftUpperArm | LeftUpperArm shoulder twist | 166.1 deg | 43% | 1.4 | 185.1 |
| 9 | 1:37.53-1:38.37 | 36:1.96 | 040 it goes for his face | person | joint | Head | Head bend | 54.1 deg | 64% | 1.0 | 177.5 |
| 10 | 1:49.07-1:49.50 | 40:3.03 | 049 in the night | person | joint | RightUpperArm | RightUpperArm shoulder twist | 172.9 deg | 41% | 1.4 | 170.5 |
| 11 | 1:39.63-1:40.67 | 37:2.31 | 041 the wall | person | overreach (target out of reach) | left arm | left arm person.chest | 37.6 cm over | 27% | 2.2 | 163.3 |
| 12 | 1:35.30-1:35.33 | 35:2.53 | 039 up at him, with it | person | overreach (target out of reach) | right arm | right arm p4_grab.neck2 | 70.6 cm over | 43% | 1.9 | 130.1 |
| 13 | 1:49.30-1:49.83 | 40:2.88 | 049 in the night | person | joint | RightUpperLeg | RightUpperLeg hip twist | 82.2 deg | 49% | 1.3 | 128.6 |
| 14 | 1:41.90-1:43.00 | 38:1.41 | 043 the one by his hand | person | joint | RightHand | RightHand wrist | 132.7 deg | 22% | 1.3 | 127.1 |
| 15 | 1:48.77-1:48.97 | 40:2.06 | 049 in the night | person | joint | LeftUpperLeg | LeftUpperLeg hip back | 42.6 deg | 68% | 0.9 | 124.6 |
| 16 | 1:31.27-1:31.97 | 34:1.55 | 037 straight down the shaft | person | overreach (target out of reach) | right arm | right arm point | 125.5 cm over | 23% | 2.1 | 123.9 |
| 17 | 1:49.27-1:49.90 | 40:2.83 | 049 in the night | person | joint | RightUpperLeg | RightUpperLeg hip forward | 143.1 deg | 49% | 1.3 | 122.2 |
| 18 | 1:49.03-1:49.53 | 40:2.64 | 049 in the night | person | joint | RightHand | RightHand wrist | 127.9 deg | 26% | 1.5 | 118.5 |
| 19 | 1:41.93-1:43.00 | 38:1.41 | 043 the one by his hand | person | joint | LeftHand | LeftHand wrist | 126.4 deg | 21% | 1.3 | 117.9 |
| 20 | 1:49.13-1:49.20 | 40:2.64 | 049 in the night | person | joint | RightUpperLeg | RightUpperLeg hip across | 55.2 deg | 54% | 1.2 | 115.7 |
| 21 | 1:37.53-1:38.87 | 36:1.87 | 040 it goes for his face | person | joint | RightUpperArm | RightUpperArm shoulder twist | 152.9 deg | 49% | 1.3 | 114.1 |
| 22 | 1:31.27-1:31.93 | 34:1.51 | 037 straight down the shaft | person | overreach (target out of reach) | left arm | left arm point | 193.7 cm over | 21% | 2.3 | 109.1 |
| 23 | 1:37.87-1:38.70 | 36:3.41 | 040 it goes for his face | person | joint | LeftUpperArm | LeftUpperArm shoulder twist | 165.1 deg | 22% | 2.8 | 103.0 |
| 24 | 1:48.97-1:49.17 | 40:2.59 | 049 in the night | person | joint | Head | Head bend | 59.9 deg | 45% | 1.3 | 97.6 |
| 25 | 1:36.13-1:37.33 | 35:4.8 | 039 up at him, with it | person | joint | LeftUpperArm | LeftUpperArm shoulder twist | 166.6 deg | 18% | 2.7 | 97.3 |
| 26 | 1:44.43-1:45.77 | 38:4.65 | 045 rides it | person | joint | RightHand | RightHand wrist | 140 deg | 14% | 1.7 | 95.8 |
| 27 | 1:44.70-1:45.77 | 38:4.55 | 045 rides it | person | overreach (target out of reach) | right arm | right arm person.chest | 9.7 cm over | 36% | 1.9 | 95.3 |
| 28 | 1:48.60-1:49.50 | 40:2.88 | 049 in the night | person | joint | LeftHand | LeftHand wrist | 96.8 deg | 31% | 1.3 | 94.4 |
| 29 | 1:49.13-1:49.17 | 40:2.59 | 049 in the night | person | joint | LeftUpperArm | LeftUpperArm shoulder across chest | 71.8 deg | 46% | 1.3 | 87.1 |
| 30 | 1:45.80-1:47.17 | 39:2.92 | 046 up: the couch | person | overreach (target out of reach) | right arm | right arm person.chest | 9.7 cm over | 24% | 1.8 | 77.8 |
| 31 | 1:35.37-1:37.50 | 35:2.63 | 039 up at him, with it | person | joint | RightHand | RightHand wrist | 104.9 deg | 13% | 2.1 | 76.8 |
| 32 | 1:33.60-1:34.13 | 34:4.31 | 038 he sees a bird | person | joint | RightUpperLeg | RightUpperLeg hip back | 63.5 deg | 22% | 2.1 | 75.2 |
| 33 | 1:40.70-1:41.47 | 37:2.65 | 042 along the wall | person | joint | LeftHand | LeftHand wrist | 113.8 deg | 16% | 2.0 | 74.3 |
| 34 | 1:49.13-1:49.17 | 40:2.59 | 049 in the night | person | joint | Neck | Neck bend | 55.5 deg | 44% | 1.4 | 66.0 |
| 35 | 1:44.43-1:45.77 | 38:3.78 | 045 rides it | person | joint | LeftHand | LeftHand wrist | 114.3 deg | 11% | 2.5 | 61.9 |
| 36 | 1:39.20-1:40.20 | 36:4.19 | 041 the wall | person | joint | RightUpperLeg | RightUpperLeg hip across | 60.7 deg | 14% | 4.6 | 61.7 |
| 37 | 1:40.70-1:41.70 | 37:2.41 | 042 along the wall | person | joint | RightHand | RightHand wrist | 89.4 deg | 17% | 2.1 | 60.7 |
| 38 | 1:36.10-1:37.50 | 35:4.27 | 039 up at him, with it | person | joint | RightUpperArm | RightUpperArm shoulder twist | 141 deg | 21% | 2.3 | 60.5 |
| 39 | 1:36.27-1:37.50 | 35:4.08 | 039 up at him, with it | person | joint | Head | Head bend | 53.5 deg | 19% | 2.5 | 59.7 |
| 40 | 1:45.97-1:46.40 | 39:2.63 | 046 up: the couch | person | joint | RightUpperArm | RightUpperArm shoulder twist | 176.5 deg | 14% | 2.5 | 59.1 |
| 41 | 1:42.73-1:42.83 | 38:1.36 | 043 the one by his hand | person | joint | LeftUpperArm | LeftUpperArm shoulder twist | 132.3 deg | 31% | 1.7 | 56.1 |
| 42 | 1:39.37-1:40.67 | 37:1.15 | 041 the wall | person | joint | LeftHand | LeftHand wrist | 129.6 deg | 9% | 3.6 | 54.8 |
| 43 | 1:35.30-1:36.07 | 35:3.02 | 039 up at him, with it | person | joint | LeftHand | LeftHand wrist | 113.5 deg | 12% | 2.3 | 53.9 |
| 44 | 1:33.40-1:34.23 | 34:4.55 | 038 he sees a bird | person | joint | Neck | Neck bend | 57.4 deg | 18% | 2.3 | 53.7 |
| 45 | 1:39.20-1:40.67 | 36:4.19 | 041 the wall | person | joint | RightHand | RightHand wrist | 133.7 deg | 8% | 4.9 | 52.3 |
| 46 | 1:45.80-1:47.17 | 39:1.81 | 046 up: the couch | person | joint | RightHand | RightHand wrist | 133.8 deg | 8% | 2.1 | 52.1 |
| 47 | 1:45.80-1:47.17 | 39:2 | 046 up: the couch | person | joint | LeftHand | LeftHand wrist | 115.5 deg | 9% | 1.7 | 49.9 |
| 48 | 1:49.10-1:49.10 | 40:2.54 | 049 in the night | person | joint | RightUpperArm | RightUpperArm shoulder behind back | 66.3 deg | 40% | 1.4 | 48.4 |
| 49 | 1:35.00-1:35.27 | 35:2.44 | 038 he sees a bird | person | joint | RightHand | RightHand wrist | 93.6 deg | 18% | 1.2 | 47.9 |
| 50 | 1:46.33-1:46.33 | 39:2.53 | 046 up: the couch | person | overreach (target out of reach) | right arm | right arm person.head | 21.8 cm over | 18% | 2.4 | 45.2 |
| 51 | 1:46.20-1:47.13 | 39:2.97 | 046 up: the couch | person | joint | Head | Head bend | 55.3 deg | 13% | 2.0 | 37.2 |
| 52 | 1:49.43-1:49.47 | 40:3.03 | 049 in the night | person | joint | LeftLowerArm | LeftLowerArm elbow backward | 23.2 deg | 29% | 1.9 | 35.3 |
| 53 | 1:48.97-1:49.03 | 40:2.4 | 049 in the night | person | joint | Head | Head turn | 84.6 deg | 25% | 1.6 | 34.7 |
| 54 | 1:31.27-1:31.97 | 34:1.6 | 037 straight down the shaft | person | joint | LeftHand | LeftHand wrist | 125.1 deg | 7% | 2.4 | 33.3 |
| 55 | 1:36.27-1:36.50 | 35:4.27 | 039 up at him, with it | person | joint | RightUpperArm | RightUpperArm shoulder across chest | 52.2 deg | 21% | 2.3 | 33.3 |
| 56 | 1:34.10-1:34.17 | 34:4.84 | 038 he sees a bird | person | joint | LeftUpperArm | LeftUpperArm shoulder behind back | 70.7 deg | 20% | 2.1 | 32.7 |
| 57 | 1:46.20-1:46.87 | 39:2.43 | 046 up: the couch | person | joint | Spine | Spine bend | 49.3 deg | 14% | 2.0 | 32.3 |
| 58 | 1:39.37-1:39.80 | 37:1.06 | 041 the wall | person | joint | LeftUpperArm | LeftUpperArm shoulder twist | 150 deg | 10% | 3.6 | 31.9 |
| 59 | 1:31.17-1:31.97 | 33:4.59 | 037 straight down the shaft | person | joint | RightHand | RightHand wrist | 99.4 deg | 8% | 2.1 | 30.7 |
| 60 | 1:38.10-1:38.17 | 36:2.59 | 040 it goes for his face | person | joint | Neck | Neck bend | 49.3 deg | 22% | 2.7 | 30.3 |
