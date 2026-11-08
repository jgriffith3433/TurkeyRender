# TK Shock: director's review

Method: every beat of the render on labelled sheets (bar:beat), half-beat or third-beat strips around cuts, and a measured shot list
(length, mean luma, % blown, % crushed, frame difference). Bar 1 beat 1 is 0.45 s; one beat is 0.69 s.

## v4 shot by shot

| Bars | Shot(s) | Verdict |
|---|---|---|
| 1-3 | "the silhouette", one 8.3 s push | Good idea, wrong light. The room is pink and fully visible: ambient is the engine default, so this is not "a human in the dark". TV is a flat mint picture that never changes. Nothing grows. |
| 4 | red light, two beats of the same dome | Reads, but the ceiling is lit pink. Static feel. |
| 5 | corner view, grey | Grade lags the cut by one frame (colour flash at 5:1). Dim, dead, 4 beats. |
| 6 | behind the head | Nice composition, nothing happens, overstays into bar 7. |
| 7-8 | profile, 8 beats | Worst hold of the opening. The vocal enters on nothing. Not "only his edge lit": he's fully lit. |
| 9 | hand on remote | 4 beats on the ugliest close-up. |
| 10 | push into TV | Walls overlit, mint picture is not worth looking at. |
| 11-13 | shadow, floor, corner | One bar each: a slideshow. Every cut in bars 1-13 is on a bar line, while the kicks are on x.46. "Don't be dream" and "I'm alive" are unstaged. |
| 14-16 | the face, TV colours | Best idea in the film: the TV colour plays his face. Keep. |
| 17-21 | face/wide accelerating | Rhythm good. The same wide of the sofa four times; variety missing. Blur shots at 18:3, 19:3 read as out of focus, not as style. |
| 22-23 | the eye | 80% black for 2 bars, eye is small. TV in the pupil is the right idea. |
| 24 | R G B TVs | Great image, locked off for 4 beats while the song winds up. No growth into the drop. |
| 25 | engulfed | 1.4 s white and blow-out good, then legs fill the frame. He jumps past the lens. |
| 26-28 | chase | Dead middle: 1.9 s and 1.4 s holds on a face that is not doing anything. Feet shot is 42% black with sofa blocking the lens. Crosses the line: he runs left on the side shots, right in others. Face soft from DoF. Empty room at 27:4 with him cut off at the edge. |
| 29-32 | turkeys | First bird wall lands well (29:3). The flock then parks. Nobody is being "sucked in"; nothing rains in. Wide at 32:3 of the room in a red void is a good image, held too dark. |
| 33 | red light, feed | The feed never shows: TV stays mint, red text on red is illegible and clipped by the TV. The biggest lyric moment of the first half lands on nothing. |
| 34-40 | the fall | Blown white for 1.5 beats, then 5.5 s and 5.8 s holds in the loudest section. Duotone 36-37 turns turkeys to mush, the person disappears. Lyric text unreadable. Poster banding on the sky looks like a bug. Bars change style on the bar line, not on the kick. |
| 41 | frozen storm | Orbit goes through a bird, neck fills half the frame at 41:4. Person tiny. |
| 42-46 | slow part | "I go to the eyes" works. Then 7 beats, 4, 4, 4 of static frames: frozen feathers, frozen camera. Slow motion should float, not stop. |
| 47-48 | overwhelmed | Face hidden; 48:3-4 looks into the top of the head at the hole in the mesh. "Going to throw up" does not read. |
| 49-51 | lifted | Orbit works and is the right idea, but he's small, and the look is sparse. Straight-down at 51:3 is 82% black. |
| 52-54 | second build | Alternating cuts are right, half of them are 94% black with him clipped by the frame edge (world warp moves him away from the look target). |
| 55-56 | every eye | Red eyes are dust, barely visible. Text over a white TV. 56 loses him out of frame entirely, same warp bug. |
| 57 | into the glass | Swirl is strong. He stretches but reads as a small box. |
| 58 | white | 2.7 s of plain white at the top of the last drop (65% blown), then giant legs. Worst moment in the film. |
| 59-68 | inside | "The ring" orbits the wrong place (old sofa, 60 m away): 59:1-3 and 62:1-3 are an empty wall with tv1 blocking the lens. Person stands idle for 10 bars of the biggest music. Turkeys are dark blobs. Last drop is not bigger than the first. |
| 69 | match cut | Works from 69:2, junk frame at 69:1. |
| 70-73 | next person | Picture collapses to 10.5 s of static hold while the band is still at full power until bar 72. The ending is right but starts 3 bars early. |

## What's wrong overall

1. Holds: 18 shots over 2.7 s after bar 25 should not exist in the two big sections.
2. Cut grid: cuts on bar lines where the kicks are off them (x.46 in 7-12, x.75/x.5 in drops).
3. No light arc: the room is lit from frame one, so nothing can grow. The art bible asks for one hard source.
4. Warp moves him away from the camera's look target.
5. The TV picture is the star of the film and it is one mint gradient.
6. Stage business: he doesn't do anything for long stretches.
7. Last drop is smaller than the first.

## Plan

Engine: warp-corrected look; `steps` (animate on twos and threes, the camera stays smooth); `fovTo` crash zooms and dolly zooms;
`neon` and `hatch` screen looks; TV pictures (test card, rings, eye, flat) with `keep` for brightness-only changes; `lightreact`.

Light: ambient to black, TV as the only source, brightness climbing from almost nothing at bar 1.

## v5 notes (first pass, watched)

Fixed from v4: the light arc, kick cuts, chase line, void looks, slow part, last drop, ending. New problems found by watching:
- `"+1b"` in a macro is from the macro's start, so bars 17-21 collapsed to one wide. Offsets fixed.
- The TV never showed anything: `ApplyLook` wiped the screen's property block on any TV with a motion track. That is why it was mint in every version. Fixed: the feed works, and bars 10-11 and 33 now show him on his own TV.
- 13:1 framed his lap on "I'm alive". Now rises over the sofa from behind.
- Text sat at 1 m, so feathers and birds cut through words. Now at the near plane.
- Neon outlined the words; red type went dim in duo. Lyrics moved to red-on-black, white type.
- 28:4 radial ghosts: `_MV_Center` ran away when the TV was off screen. Clamped.
- Feet shot still blocked by the sofa. Replaced with a low side shot.
- 68:3.75 fly-in missed the screen; now lands on a screen in the wall. Numbers assume the old crowd TV, see below.

## v6 notes (second pass, watched)

Opening reads as a dark room growing. Bars 10-11 reveal lands. 17-21 cut properly now. Bars 13:1-2 went black (camera behind the sofa back); raised. "ME" at 55 dim; white. TV at 54-56 showed flicker; now the corner feed of his back.

## v7 review (2026-11-05, 18:05): not good yet

Judged from the whole render on a sheet, about 100 sampled full frames and measurements, against POLISH.md. Motion was judged from stepped frames, not at speed, and the sound was not heard.

Overall: a strong concept and a real story, at the level of a promising animatic. It would not sit beside a high-end video.

| Part | Verdict | Why |
|---|---|---|
| 1 Bars 1-13 | Weak | Brightness 25/255 for 36 s, one 30 s shot, 0.15 cuts a bar, 23% still. No hook. |
| 2 Bars 14-24 | Best section | Colour on his face, turkey silhouette and eye work. No face acting in v7. |
| 3 Bars 25-33 | Good, patchy | Sofa topple is the best moment. Hits work, but he is lost in the dark at 69-74 s. |
| 4 Bars 34-40 | Failing | Colour cards replace events. Tiny stiff figures float on flat colour. 3.29 cuts a bar against 1-2. |
| 5 Bars 41-51 | Mixed | Gasp and gold mountain are strong. Feathers look like shards, his limbs are stiff, long dark runs. |
| 6 Bars 52-58 | Failing | The story's key moment. J asked for a gradual pull into the TV. It reads as black frames, a white rectangle and placeholder text. |
| 7 Bars 59-68 | Best idea, not finished | Funny and clear, but flat lighting, simple sets, stiff poses. Last drop does not beat the first. |
| 8 Bars 69-73 | Failing | Same silhouette as him, so she doesn't read as someone new. Eight seconds of near black at the end. |

Across the video: he is a mannequin. Effects and colour stand in for animation. Type is a default font. No frame has anything happening behind the subject.

Priorities: (1) Part 6 pull-in, (2) Part 4 events, (3) performance, (4) Part 7 scale and finish, (5) opening hook and ending.

Correction to the v7 review: the "30 s shot" in Part 1 was the cut detector failing in the dark. The score has five real cuts, with shots of 5 to 15.5 beats. The brightness problem stands. Lifted exposure and ambient for bars 1-24 (not yet seen).

## v8 review (2026-11-05, 21:20): a clear step up, not yet good enough

Judged from about 100 full frames plus ten stepped sequences. Not heard, not watched at speed.

| Part | v7 | v8 | Why |
|---|---|---|---|
| 1-2 Bars 1-24 | Weak / best | Good | Brighter, with a real read on his face. Copy gag unproven. |
| 3 Bars 25-33 | Good, patchy | Good | Topple is strong. Crawl close-up is the best acting so far. Dark at 67.5-69 s. Door and run read. |
| 4 Bars 34-40 | Failing | Mixed | A real place with events now. Eye wall at 99-103 s is dark, he's tiny and it's hard to read. Peck and ride are good. |
| 5 Bars 41-51 | Mixed | Good | "What do you mean?" works. Feathers read as feathers. Arms still stiff in the panic. Retch fails: mouth hidden. Long dark run at 134-137 s. |
| 6 Bars 52-58 | Failing | Mixed | Singing close-up works. The wide on the wall is flat, lyric type is unreadable, 156-158 s is empty black. |
| 7 Bars 59-68 | Unfinished | Good | Funny, escalates, reads. Lighting is better. He's still small in wides; stiff stands remain. |
| 8 Bars 69-73 | Failing | Failing | Room is pink-red, not Part 1. Her shot is a dark lump. Dot is orange, and the end is about 6 s of dot on black. |

Overall: from an animatic to a rough but real animated video. The weakest area is still the body: upper arms and spine move too little, hands are generic.

## v9 review (2026-11-05, 23:45): best so far, nearly a real video

From about 100 frames plus scans. Not heard, not watched at speed.

Better: arms and hands natural in most shots, the model holds up, the climax is big, the ending is cold and ends on a red dot, the opening reads.
Still weak: the fingers slipping shot; Part 7 is 5.4 cuts a bar against 1-4, so it may be too fast to enjoy; her face is his head under long hair; the kaiju; some shots remain dark.

## v10 review (2026-11-06): the first version that plays as a whole

From about 100 frames and measurements. Not heard, not watched at speed.

Better: shows run at true speed, arms, hands and the first feather read, her model, the hang, the stinger, the ad.
Weak: the feather coat swallows him at 128-135 s and from 185 s, so his face and the wave are lost. Parts 7 and 8 are cut fast (5.1 and 2.4 a bar). Chorus beaks don't open. Hang wide is thin. TV wall is dark.
