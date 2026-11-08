# Performances

A performance is a tested, named action. A shot asks for it by name and gets good animation without touching `reach` or `pose`:

```json
{"at":"12:1","do":"perform","on":"person","name":"walk_tired","for":"2bars","dist":3}
```

`for` is optional: without it the performance runs for its own `length`. Every other key on the cue is a parameter.

**Use only what `gallery.md` lists as PASS.** Each one there was watched stepped at 30 fps.

## States

Every performance starts in one state and ends in one. Chain them so each one starts where the last ended:

- `stand`: the default stand: `IdleBreathe` under a `stance` (arms close, soft hands, weight on one leg, a small sway). The stance holds across cues, so every stand performance inherits it. A new performance that leaves the stand turns it off (`{"do":"stance","arms":0,"legs":0,"for":"0.6s"}`), and one that returns turns it on. Any stand action starts and ends here.
- `any`: face and eye performances (`micro_life`, `smile_relief`) that go over whatever the body does, as card `events`.
- `sit_chair`, `kneel`, `sit_ground`, `lie`: reached and left by the transitions listed in `gallery.md`.

`walk_*` ends mid-step and needs `step_stop` (or another walk) right after it.

## The file

```json
{
  "about": "one line",
  "entry": "stand", "exit": "stand",
  "length": "3s",            // used when the cue has no `for`
  "min": "2s",               // shorter than this warns at build
  "params": { "dist": 3 },   // defaults
  "cues": [ { "at": 0, "do": "anim", "clip": "$clip", "blend": "0.3s" } ],
  "test": { "first": ["kneel_down"], "then": ["rise_from_kneel"], "args": {} }
}
```

In `cues`:
- `at` and every length are seconds from the start of the performance, as numbers or `"0.4s"`.
- `"$x"` is a parameter, and `$for` is the cue's length in seconds. Inside a longer string it is replaced as text: `"$clip@0.4"`.
- `"=for-0.4"` is arithmetic on parameters and gives seconds. `+ - * /` and brackets.
- `"if":"$x"` drops the cue when x is 0 or false.
- `on` defaults to the performance's actor. Cues can be any cue, including `perform`.
- Gaze targets: `"toRel":[x,y,z]` is in his own frame, so `[0,6,3]` is up and ahead wherever he stands. `"head":0` moves only the eyes. `"lead"` is how much sooner the eyes arrive (2.6).

## Testing

`node Director/tools/perf_lab.mjs <name>` plays it in its flow (`test.first`, it, `test.then`) on a throwaway actor, then writes `sheets/<name>_side.png`, `sheets/<name>_front.png` (every frame at 30 fps), `renders/<name>_side.mp4`, `renders/<name>_front.mp4` and `tests/<name>.json`. `--clip A@2,B@3` plays bare clips in a row to compare candidates. `--close` frames the head.

## Baked takes

A finished dance take is played from a cleaned clip: `node Director/tools/bake.mjs <name>`, see Baked takes in AGENTS.md. `baked/` lists them. Edit the take here as usual, then bake it again; until then it plays from source and the build warns.
