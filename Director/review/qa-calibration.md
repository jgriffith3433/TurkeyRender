# QA calibration

`Director/tools/qa.mjs` measured against what people found on TK Shock. Ground truth is `qa-truth.json`: 86 A and B notes from `notes-*.md` (written from v9) and 9 of J's own notes on v8 and v10. Run on 2026-11-06, Sonnet at medium effort, no motion check (Unity's queue was full, and old renders have no matching build).

## Catch rate

A note counts as caught when a QA fault of any grade overlaps it within 0.5 s and a strict judge, reading both, says fixing one would fix the other.

| Set | Notes | Caught |
|---|---|---|
| v9 review notes, all | 86 | 57 (66%) |
| v9 review notes, A grade | 31 | 23 (74%) |
| J's notes on v8 and v10 | 9 | 9 |
| Everything | 95 | 66 (69%) |
| Everything, A grade | 39 | 31 (79%) |

32 of the 57 v9 catches were graded A or B by QA, so they can fail a shot. The rest are in the report as C.

**Control:** the same run with every fault moved 30 s, so anything that still matches is luck: 5 of 86 (6%). An earlier, looser judge scored 87% with a control of 44%, so ignore that figure.

**One note isn't a fair test:** J's "arms at 2:39 in v10". At 2:39.0 in v10 the screen shows the snow tunnel, with no one in it. The nearest arms are the anchor's crossed arms at 2:40.2, which QA flags B.

**The flip detector** is the strongest single result. It found the v9 fault notes-d calls the worst of its range (bodies jumping between poses from one frame to the next, at 171, 174, 193 and 195 s), which can't be seen on 4 fps sheets, and it drops to almost nothing in v10 and v11, where that bug is fixed: 7 flip faults on v9, 2 on v8, 1 on v10, 2 on v11.

## What it misses

- Cloth and small mesh faults: skin through the shirt, sleeve cuffs, the waist gap, teeth. Too small in a 520 px tile.
- Long-running prop faults noted once for a whole section, like the tie (`b-B5`, `c-B9`).
- Contact in dark or wide frames: `b-A6` legs through the sofa, `d-A7` crawling in mid-air, `c-A1` the hand with nothing to hold.
- Story beats with no card: without an `idea`, it can only grade them C.

Motion check should cover some of the contact faults. It wasn't part of this calibration.

## Crying wolf

- Of 173 A and B faults on v9, 43 matched a note and 130 didn't. Those 130 are not all false: the notes aren't complete. A random 8 of them read as specific and plausible. The two checked against frames (76 s, a kneeling and plank body pop with a huge foot, and 193 s, the remote) are real. Nobody has adjudicated the rest, so treat precision as unmeasured.
- 28 of 107 shots fail on v9, so a failing shot usually has something wrong. That is strict for a final, and low for a video J called bad animation.
- Known false friends, already handled: lamp flicker and shake look like flips, so the reviewer must confirm them (`flipsReal`). Fast pans don't count as flips. Lower thirds over a TV show and channel-flip snow are told not to be faults.
- Storyboard lines cover whole bars, not shots, and made most of the first run's false alarms ("the event is missing"). Without a real card they can't fail a shot.
- v11 was rendered at 854x480, so its sheets are soft and it scores below v10. Compare scores only between renders of the same size.
- v11 uses the score's shots, and some of those jump the camera inside the shot, which the reviewer can call a hard cut.

## Cost

| Run | Shots | Vision cost | Per shot |
|---|---|---|---|
| v8 | 100 | $2.43 | $0.024 |
| v9 | 107 | $2.59 | $0.024 |
| v10 | 114 | $2.60 | $0.023 |
| v11 | 128 | $3.17 | $0.025 |

List prices. A full video takes about 6 minutes and about $3. Rerunning unchanged shots costs nothing. Measuring takes 15 s a video, with no API use. Haiku at low effort cost $0.0016 a shot, and on the first tuned prompt it caught about the same as Sonnet by the old judge, but with more framing noise. It hasn't been run on the final prompt.

## Rerun

    node Director/tools/qa.mjs all --render Director/output/TKShock-v9.mp4 --label v9 --no-motion
    node Director/tools/qa-calibrate.mjs v9 --truth v9
    node Director/tools/qa-calibrate.mjs v9 --truth v9 --shift 30
