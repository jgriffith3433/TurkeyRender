# Hawkes Punch: cold view of the animatic (2026-11-08)

**File:** `videos/hawkespunch/animatic.mp4`, made by `node Director/tools/animatic.mjs hawkespunch` (140 s to build, no Unity). It is 1280x720 at 24 fps, 4,902 frames (204.25 s, exactly the board), 53 panels from `storyboard/panels/`, each with a slow 4% push-in. The sound is the board-clock mix through `tools/mv/sound.mjs`: 162 sounds and 4 drop-outs, integrated loudness -16.6 LUFS, and no stretch under -60 dB longer than 0.5 s. Its only gaps under -70 dB are the four drop-outs: 66.34-66.50, 107.61-107.75, 124.71-124.95 and 193.15-193.25. It has 56 burned-in captions.

**How it was viewed.** `mv coldview` failed: in `tools/mv/make.mjs:478` the drawtext `text='%{pts\:hms}'` does not parse, so ffmpeg breaks at `,tile`. The viewer was a fresh subagent that never read the script. It was given seven 1 fps contact sheets (30 frames each, time-stamped) and nothing else, so **it judged picture and captions only, not sound.**

## What the viewer understood

It got the whole spine:
- the waiting room and the turkey nurse;
- the overshare;
- the prescription, "No.", her line, then the punch through the ceiling;
- Saturn, "Silence. / Nope. More music.", the space ghost;
- the double, the crater, Jupiter and the Earth;
- "I'm you", the ad, the next day and the second punch;
- "Same time tomorrow?", the can.

Jokes that landed: the literal punch after "swallow the damn Hawkes Punch", "That's a sheet.", "...That was there before." / "Sure.", "Tastes like a fist!" / "A good fist.", the fine-print parody and "Silence. / Nope. More music."

## Main confusions, by time

| t (s) | confusion | what it is / who owns the fix |
|---|---|---|
| 55-57 | Why is he drooling red after "No."? Who says "Oh no" and "Don't worry"? | The c20 panel reads as drool (the can). "Don't worry." pre-laps c21 by 0.2 s while he is still on screen. Board/panel (c20). The sound is right. |
| 58-61 | Could not parse "a healthy amount of people in the world". | This is the line as written (SCRIPT). A creative call for J, not a timing fault. |
| 95 | The red-shirt man arrives with no introduction; we learn he is "you" only at 149. | Board (s04 panel: he should read as HIM in a red tee, same face). |
| 103-111 | Who attacks whom, and what blew up? | s05/s06 panels: the chase and the BOO! are too small to read. Board/panels. |
| 123-143 | Lost the thread through Jupiter and the Earth: who moved the Earth, and what did "everyone" see? | s09-s14 panels. The biggest story gap in the picture. Board. |
| 80-87, 127-131 | He has no face in these panels, so the viewer could not tell it was the same man. | Panel generation (s02, s11). |
| 191-195 | Whose hand pokes his cheek, and what is the red beam? | b02 (her fist off screen) and b03 panels. |
| 176-185 | The fine print sits for 10 "silent" seconds. | The announcer reads it in the sound. It has no caption, so a sound-off viewer gets nothing. Option: caption the last clause. |
| 22-24, 30-32, 51 | His lines sit on her shots. | c08 and c10 are o.s. by design (board "HIM (o.s.)"). "So I just... drink it?" spills 0.29 s into c19. |

The viewer also flagged:
- **Inconsistent designs:** the doctor's face, hair and age change between panels, and the gloves move. These are panel faults only.
- **The turkey and the closing can never pay off for it.**
- **Long holds** at 75-79 (Saturn) and 117-122.

## For the sound

Nothing in the cold view points at the sound placement, and the view could not hear it. Still to check by ear:
- the ring-plane silence gag (78.25);
- the hum in c02 (a Gen take, not yet heard);
- the booms against the lines either side.

The monologue still overruns the board by 2.0 s: "In space." lands 1.05 s into c10. The proposed fit (c07 +12f, c08 +36f) is in the WORKLOG for the board owner and J.
