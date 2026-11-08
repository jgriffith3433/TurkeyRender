# Shot cards: cut, cards, layers, camera, sets, lighting, templates

New videos are written as cards, not cues. A card is one shot in a few lines; `Director/tools/cards.mjs` (Node, no Unity) compiles
them to a normal act, `acts/50-cards.json`, which is generated: never edit it. Same input, same output. Cue-level detail is for special
moments, in `raw`. `mv cards sheet` is the staging pass (three labelled frames per card, about 30 s, no render; staging only, never a
motion judgement). `mv cards` compiles and builds (`--fast` as for `build`); `mv cards check` validates and prints the cut; `mv cards
compile` writes the act; `mv cards note <card> <key> <value>` adds to J's notes; `mv why <card> <key>` says which layer set a value.
`node Director/tools/cards.mjs test` is the self test. `videos/_cards_test` is the working example.

**The board is the source of truth on a new video** (2026-11-08): `tools/board2cards.mjs` reads `storyboard/shots.json` and writes
`cut.json` (the board's exact frames), `cards/board.yaml`, the `lines.json` starts and `storyboard/CHECKLIST.md`; hand staging goes in
`storyboard/overrides.yaml` (merged on every run; outside `cards/` so the compiler never reads it as a card). Edit the board or the
overrides, never the generated card.

```
videos/<v>/cut.json        order and length, and nothing else holds them
           cards/*.yaml    the cards (or JSON)
           style.json      the whole video ("inherit": a file in library/styles/)
           sequences/*.json overrides for a part; a cut entry names one with "seq"
           tweaks/*.json   agents' fixes, keyed by card id (the note loop writes tweaks/zz-room.json)
           notes/*.json    J's notes, keyed by card id. Strongest layer. No tool regenerates them
           cards.map.json  each shot's id, idea, feel, times and take, for the Review Room
```

## The cut

`{"beats":{"drop":"25:1"},"shots":[{"id":"alone","seq":"room","len":"4b"},{"id":"out","at":"drop","len":"2bars","take":"a"}]}`.
Reorder, trim or drop a line and what follows moves. A shot without `at` follows the one before; `at` pins it to `12`, `12:3`, `41.2s`,
a section or a name in `beats`, so it stays put; `after` names the shot it follows. Running past a pin trims with a warning. `len` or `at`
anywhere else is an error. A pin may carry an offset: `"at":"punch-1b"`, `"at":"ask_done+0.4s"` with `"beats":{"ask_done":"22.84s"}`,
so a cut on a joke sits a fixed beat after a line however the line moves. `len` takes seconds as well as beats and bars (`"0.98s"`);
`mv cards insert/remove` keep it in its unit ([toolchain.md](toolchain.md) "The clock"). Lengths on a 24 fps video should be whole frames
(the clinic's hundredths of a second are a known trap).

## A card

Under 10 lines. `idea` and `feel` are required: what the shot is for and what we feel.
```yaml
- id: his_face
  idea: nothing on it reaches him
  feel: numb
  set: living_room               # usually from the sequence
  cast: {person: sofa sit_idle, her: door>by_tv clip:WalkForwardScared}
  camera: close-up person
  lens: 85                       # mm; the preset picks one
  mood: cold
  light: tv_glow                 # the set's own by default
  look: epic                     # or plain: the two registers, switched on the cut (epic-fx.md)
  tags: [ecu]                    # shot-check exceptions: ecu insert pov dark offmark (qa-review.md)
  events: [{on: kick, pulse: {zoom: 0.01}}, {on: 2b, who: person, do: blink}]
  use: {reaction_cut: {at: 0.5b}}
  raw: [{at: 1b, do: drop, on: living_room_table, floor: 0}]
  takes: {b: {camera: high-lonely person}}
  note: anything
```

- **Cast** drives everything about an actor, so a card never writes `hide`, `show` or `set`. In the cast: shown, placed on its mark. Not in
  the cast: hidden. The same performance on the same mark runs on across the cut instead of restarting. An entry is `mark performance`, or
  `clip:Name` for a stand-in or plain clip, `a>b clip:Name` walks between marks (`a>b walk_tired` passes `to` and `dist` to the
  performance), turning to the mark's heading on the cut after; `look:her` gazes. No mark means stay where you are. As a map: `at to
  perform clip look face then args`. Actors must exist in the video's `acts/` or `score.json`; `face` takes degrees or a mark. `face` only
  turns him when his mark changes (on the same mark it is ignored while the camera still reads it: add a mark on the same spot). `args`
  count only on the card that starts the performance. A card that names the same mark after a `fly` or `fold` in an earlier card has
  finished puts the actor back on it (2026-11-08); a card with no mark leaves him where he is; a fly still running over the cut is left alone.
- **Camera:** `camera: <preset> <subject> [second subject] [left|right]`, or a map with `preset on side angle dist height frame lens
  screen push shake dutch behind aperture`. Presets: `close-up medium wide two-shot over-shoulder low-hero high-lonely tracking
  extreme-close-up` (`ecu`: lens 100, frame 0.22), and `spot` (`{preset: spot, from: corner_cam, on: her}`, a camera mark). Pure math
  from marks and headings: it stands off along his heading so the frame holds a set height at that lens, the subject on a third with the
  eyes high, looking into the frame. Inside a set's `bounds` it swaps sides, then comes closer and opens the lens; a walk too big to ride
  beside becomes a pan from the middle. No shake, no dutch, no move unless asked (`push: 0.2`, `shake: 0.2`). A subject can be a bone
  (`person.chest`) or a mark. Over-shoulder names the shoulder first. Anything else: `shot: {fov: 22}` on a card or a tweak overrides the
  compiled shot key by key; `null` removes one. Aim at hips height on zero-g marks (the body's centre is 0.5-0.9 m over its mark).
- **Layers**, per key, later wins: `style`, `sequence`, `card`, `take`, `tweak`, `note`. Maps merge, lists replace, `null` removes. A
  tweak or note is any card field: `{"lamp":{"mood":"cold","shot":{"fov":30},"cast":{"her":{"look":"person"}}}}`. Recompiling never
  touches them. A tweak for a card that doesn't exist is an error.
- **Takes** stay on disk in `takes`. `mv cards --take both=b` builds take b for one run; `"take":"b"` in the cut keeps it. An A/B is one
  flag and two short renders.
- **Events:** `on` is the trigger: `kick snare hat all` (hits inside the shot), `beat`, `bar`, `start`, or a time in the shot like `2b`,
  `end`, `end-1b`. `who` is the actor. The rest is a cue ([score-cues.md](score-cues.md)). `raw` is a list of plain cues for one-offs,
  with `at` measured in the shot; set pieces are `<set>_<piece>`.
- **Templates:** `Director/library/templates/<name>.mjs`, a function of parameters that returns `{shot, cues}`, with `about`, `params`
  and a `test`. `use` applies them, parameters are checked. Have: `crash_zoom rack_focus hero_reveal reaction_cut`.
- **Perform:** a word after the mark is a `perform` cue with that name; it must be a file in `Director/library/performances`, or `check`
  stops. `args` on a cast entry are its parameters. Use `clip:` until one exists.
- **Moods and lighting on a cut** are set with `for: 0` by the compiler, so they are already there on the first frame; a raw `grade`,
  `sky` or `light` cue on a cut needs `for: 0` too.
- `cards.mjs`'s tiny YAML doesn't unescape `''` inside a single-quoted scalar.

A wrong name in any of this stops `check` and says what you might have meant.

## Sets

`Director/library/sets/<name>.json`: `origin` (keep sets apart: clinic x 700, commercial x 900, space_epic z 9000), `bounds
[xmin,zmin,xmax,zmax]`, `ceiling`, `light`, `solids` (`{"table":[xmin,zmin,xmax,zmax,height]}`; `check` warns when one blocks the view
of the subject), `marks` and `actors`, `center` (where a lighting preset is anchored), `sky` (over the lighting preset's sky). A mark is
`{pos, face, kind: stand|seat|door|camera|prop, head}` or `[x,y,z,face]`. Pieces exist only while a card stands on the set. `check` warns
when a walk rounds to whole strides and would snap on a cut in view: space the marks as it says. Under a `parent`, a piece's `pos` is an
offset from the parent (which must come first).

- **Interiors and shadows:** a directional key has no position, so a ceiling blocks it. `"shell":true` on an actor (roof, walls, the house
  around a room) and `"shell":"room"` on the one whose bounds are the room: while a camera stands inside, all shells stop casting
  (`Runtime/MVShell.cs`). Rigged bodies receive shadows by default (`"shadows":false` turns it off). Painted floors take their brightness
  down in the material or a key blows them out.
- **Outdoors:** `backyard.json` (lawn, fence, the back of the house, porch, back door); grass and fence actors are in
  [score-cues.md](score-cues.md).
- Have: `living_room`, `backyard`, `clinic` (marks `doctor_punch` [0.85,0.03,3.0] face -45, `bed` [0.6,0.40,3.72], `desk_doc`, `stool`,
  `rx_pad`, `pen`), `commercial`, `space_epic` ([space.md](space.md)), `space` (old playground), `fx_void`.

## Lighting, moods

- **Lighting rigs** `Director/library/lighting/<name>.json`: `sky` and `lights`, on for the run of cards that use it and off after. Have:
  `portrait_window golden_hour golden_morning overcast studio_3_point moonlight neon_rig tv_glow evening_lamp street_dusk space_epic`. A
  light is keyed to the set: `"at":"window"` a mark plus `"offset"`, or `"pos"` from the set's `center`; `"aim":"subject"` (the `subject`
  mark, else `center`, at chest height), another mark, or a point computes `rot`. Keys `key fill rim practical` by habit, `sun` for the
  directional outdoors. Marks a rig looks for: `window key fill rim tv practical`.
- **Moods** `Director/library/moods.json`, each a whole grade, so a cut never inherits the last one. A mood's change from `base` is added
  to the style's grade (moods move a style, they don't replace it). Hawkes Punch's space moods are `hp_space_*` (sunRim 1.3, faceFill
  0.45).
- The stage `key` light in Hawkes Punch's score is on all the time: every space card turns it to 0 at 0 and back after
  ([space.md](space.md)).
