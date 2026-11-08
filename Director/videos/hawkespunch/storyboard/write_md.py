"""Writes Director/videos/hawkespunch/STORYBOARD.md from storyboard/shots.json.   py .../storyboard/write_md.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'shots.json'), encoding='utf-8'))
FPS = 24
S = D['shots']
acts = {1: 'Act 1: the clinic and the punch', 2: 'Act 2: space', 3: 'Act 3: the commercial and the next day'}
sheets = {1: 'act1_clinic.jpg', 2: 'act2_space.jpg', 3: 'act3_ad_button.jpg'}
tot = sum(s['frames'] for s in S)

HEAD = f"""# HAWKES PUNCH: storyboard (draft 1, for J's approval)

Written 2026-11-08 from `SCRIPT.md` (clinic, punch, ad, button), `SPACE-EPIC.md` (the approved space story) and `COLD-VIEW-2.md`,
to the rules in `research/story-and-script-craft.md` and `research/epic-anime-action.md` (1, 2, 5). Nothing is animated until
the panels are approved. **{len(S)} shots, {tot} frames = {tot / FPS:.0f} s ({int(tot / FPS // 60)}:{int(tot / FPS % 60):02d}) at 24 fps**, down from about 100.
Space is {sum(1 for s in S if s['act'] == 2)} shots, down from 42.

**Read an act in one image:** [`storyboard/act1_clinic.jpg`](storyboard/act1_clinic.jpg), [`storyboard/act2_space.jpg`](storyboard/act2_space.jpg),
[`storyboard/act3_ad_button.jpg`](storyboard/act3_ad_button.jpg) (1600 px wide, 3 panels a row, captions under each; red badge = epic
register, grey = deadpan; red arrows = a camera move). One annotated card per shot is in `storyboard/cards/`, the raw panels in
`storyboard/panels/`. The panels are Hawkes Gen sketches (Z-Image Turbo, project tkshock, greyscale with red as the one accent): they
show staging, size and the register, not the final look; faces and shirts drift between panels, so read the labels for who is who
(grey tee = him, red tee = the double, white coat = the doctor).

## Synopsis (ten lines a stranger can follow)

1. A man who can't stop hearing music, and who is in love with a faceless ghost in space, waits in a clinic with a turkey nurse and a poster: HAWKES PUNCH. Ask your doctor.
2. He tells his doctor his three symptoms. She writes them down without blinking. On the wall behind her, we (not he) see her framed boxing gloves: GOLDEN GLOVES CHAMPION.
3. She prescribes Hawkes Punch, every day until the symptoms go away. He asks if he drinks it. She says no, stands, and takes off her glasses.
4. She punches him through the ceiling into space. The turkey looks up, then goes back to typing.
5. In space, at real planet scale, his scream cuts to silence ("Silence. ...Nope. More music."). He realises: she's up here. He takes out his crayon drawing of her.
6. He searches Saturn's rings for the ghost. We see her behind him; he never does. A tap on the shoulder: it's himself, in a red tee. "That's a sheet." "She has a vibe."
7. He chases his double for an answer. A startled punch craters a moon ("...That was there before." "Sure."). The double lassos Jupiter with Saturn's ring; he catches it and says "Okay."
8. The double winds up with the Earth. "People live there." The double very carefully puts it back. "Did anyone see?" "Everyone saw."
9. Out of breath above the sunrise: "Are you the space ghost?" "No, man. I'm you." "You do have a face." He lets the drawing go; the ghost catches it, pleased. They turn to camera: "Are you feeling like there's two of you?"
10. It was a commercial. Side effects are everything we just saw. The next day she punches him again, mid-sentence, and his double is waiting in space with two cans: "Same time tomorrow?" A red can rolls to a stop.

## Setup / payoff ledger

| Planted | Shot | Paid off | Shot |
|---|---|---|---|
| He hears music no one else can (drums his fingers, hums) | c02, c07 | "Silence." ... "Nope. More music." in true silence | s02 |
| Poster: HAWKES PUNCH. Ask your doctor. | c01, c03 | The commercial and the end card | a01-a06 |
| Her boxing gloves and plaque (we see, he doesn't) | c05, c15 | She glances at them; he follows her look; the punch | c19, c20, p01-p03 |
| "She doesn't have a face. But she has a vibe." and the crayon drawing of a sheet ghost | c12 | "That's a sheet." / "She has a vibe."; "You do have a face."; the ghost catches the drawing | s04, s15, s16 |
| "Every day until the symptoms go away." | c16 | THE NEXT DAY, punched again mid-sentence; "Same time tomorrow?" | b01, b02, b04 |
| The turkey nurse | c01, c04 | Looks up at the ceiling, back to the screen | p04 |
| The red can | c16, c17 | The ad's giant can, "Tastes like a fist!", two cans in space, the can rolls | a01, a04, b04, b05 |
| Silence cuts in at the ring plane | s01 | The silence gag is a choice, not a dropout | s02 |
| The double can't be told from him | s04 | "No, man. I'm you." | s15 |
| "A healthy amount of people" (her speech) | c21 | "I've prescribed it to a healthy amount of people." | a03 |
| The ghost behind him, unseen | s03 | She catches the drawing; she waves at us | s16, b04 |
| Rule of three: ring, moon, Jupiter (each bigger, each met with a shrug) | s05, s07, s11 | The fourth, the Earth, he stops: "People live there." | s12-s14 |

**Suspense, not surprise.** The gloves are shown twice before the punch (c05 wide, c15 insert held 2 s), and her glance at them (c19) gives
him and us the same clock. In space the ghost is behind him for a whole held shot (s03) before the tap.

**Two registers, never blended** (research 1.1). Every shot is marked **deadpan** (eye level, centred, 50-85 mm, locked off, near silence) or
**epic** (low or close wide lens, hard rim, shake, speed lines, impact frames). The joke is the cut between them: c21 to p01 to p04; s06/s07 to
s08; s10 to s11; s12 to s13. Deadpan holds are long and never cut away during the payoff.

**Cutting rules kept** (research 5): average shot {tot / FPS / len(S):.1f} s; no shot under 18 frames except the impact frame p02; every epic
burst lands on a hold of 2 s or more; the 180 line holds (him screen left, the double screen right, until they turn to lens together).

## What was cut from SPACE-EPIC.md (42 shots to {sum(1 for s in S if s['act'] == 2)})

- Every beat is kept; what went is coverage. The silence and the drawing are one shot (s02). The ghost gag and the tap are one held shot (s03).
  The reveal, "That's a sheet", and the boop are one two-shot (s04). The ring blast and his follow-through are one side-on wide (s05) with
  "Are you her?!" / "No!" shouted across it; the side-by-side flying dialogue (c7_side) is gone. BOO, the flinch and the impact frame are one
  shot (s06). Ring pull, lasso, throw and yank are one extreme wide (s09); brace, catch and slide are one low shot (s10); "Okay" and the shove
  are one MCU (s11). Hey/What play over the Atlas wide (s12), the long look and the set-back over one wide (s14), and the stop's three lines
  over one close two-shot (s15). The ghost's catch, "Hey. Focus." and the turn to lens are one wide (s16).
- The clinic and ad keep every line of SCRIPT.md; the pen insert, the gloves insert, the can insert and the poster insert stay because the cold
  viewer could not read them at the old lengths, so each is held 1.5-2 s.
- The button keeps the script's shots (b01-b05); the second punch is shown this time (b02), which the cold viewer missed.

## Shots

Frames are at 24 fps. Size and lens are the shot's; moves are only where marked. "Changes" is what the shot turns: if nothing turned, it was cut.
"""

def table(act):
    rows = [f"\n## {acts[act]}\n\n![{acts[act]}](storyboard/{sheets[act]})\n",
            "| panel | id | scene | size, lens | frames | action | line | register | what changes |",
            "|---|---|---|---|---|---|---|---|---|"]
    for s in S:
        if s['act'] != act: continue
        lens = f'{s["lens"]} mm' if s['lens'] else 'card'
        move = {'push': ' (slow push in)', 'push_late': ' (push in on the realisation)', 'tilt_up': ' (tilt up)', 'track_stop': ' (track, then lock off)', 'pull': ' (pull back / fold)'}.get(s.get('move'), '')
        rows.append(f"| ![{s['id']}](storyboard/panels/{s['id']}.png) | **{s['id']}** | {s['scene']} | {s['size']}, {lens}{move} | {s['frames']}f ({s['frames'] / FPS:.1f}s) | {s['action']} | {s['line'] or '-'} | **{s['reg']}** | {s['change']} |")
    n = sum(1 for s in S if s['act'] == act); f = sum(s['frames'] for s in S if s['act'] == act)
    rows.append(f"\n{n} shots, {f} frames = {f / FPS:.0f} s.")
    return '\n'.join(rows)

FOOT = """

## Production notes

- **Scale.** Space is real scale (`space_epic` set): contact shots are at human scale with the planet as terrain (s06, s10, s11); disc shots show him
  as a lit figure or a speck with a trail (s01, s07, s09, s12, b03). One size per shot.
- **Limited animation.** Deadpan shots are a held `zg_neutral` float with gaze only; epic shots are keyed pose to pose (anticipation hold, a 2-4 frame
  strike, impact frame, hitstop, release) on the sheets in SPACE-EPIC.md. Acting on 3s for him, 2s for the double, 1s only inside strikes.
- **Sound.** No music. The only true silence is s01's ring plane to s02's "She's up here". Every impact gets its drop-out, then near silence, then one
  small sound (the pebble tick, the pat, the keyboard).
- **New lines** since SCRIPT.md are the ones SPACE-EPIC.md lists; "Hey! Are you her?!" / "No!" moves into the ring blast (s05).
- **Not in this board:** anything not approved. Panels are sketches for staging; the final look is the renderer's.
"""

out = HEAD + ''.join(table(a) for a in (1, 2, 3)) + FOOT
open(os.path.join(HERE, '..', 'STORYBOARD.md'), 'w', encoding='utf-8').write(out)
print('wrote STORYBOARD.md', len(out))
