# Keyed poses: pose sheets, posederive, posecheck, limbscale

Hand-keyed, pose-to-pose acting in Unity's own muscle space, so the native path plays exactly what was keyed (2026-11-08; the craft:
`Director/research/epic-anime-action.md` 4 and 8, `zero-g-acting.md` 1). Use it for hero acting and the zero-g float. **Seed every pose
from a real frame** (`"from": {"clip": "mx_cross_punch", "t": 0.42}`) with small `add` offsets, and judge the clip through the critic and the
24 fps mp4: a sheet built from 95 raw muscle numbers is how we got "1/10" (J). An approved pose sheet is an approved pose, not approved
motion: the 5-second hero tests are where motion is approved ([../PIPELINE.md](../PIPELINE.md)).

- **`mv call posederive '{"sheet":"zg_neutral"}'`** (`Editor/Native/PoseDerive.cs`) reads `Director/library/poses/<name>.json` and writes
  `Assets/MusicVideo/Motion/Keyed/<name>.anim` (and `<name>_<variant>.anim` for each of `variants`; `"variant":"a"` one, `"variants":false`
  the base only). An ordinary humanoid clip: play it with `anim`/`layer` by name, on either path. Deterministic. `"table":true` returns each
  key's resolved muscles.
- **A sheet:** `seed` `{clip, t}` (default `mx_breathing_idle@0`), `poses`, `keys`, `loop`, `length`, `fps` (60), `step` + `stepFps` (the
  whole clip on 2s/3s), `mirror`, `add` (muscle offsets on every key), `fingers`, `root`, `cycles`, `cyclePhase`, `cycleScale`, `variants`
  (patches merged over the sheet), `inherit` (another sheet as the base). Comments allowed.
- **A pose:** `from` (another pose, or `{"clip":"mx_cross_punch","t":0.42}`: a frame of any clip, keyed, clean or source; `keepRoot`),
  `mirror`, `muscles` (absolute, any subset of the 95 `HumanTrait.MuscleName`s; a wrong name stops with the nearest three), `add`,
  `fingers` (`{"both":{"curl":0.4,"spread":0},"left.thumb":{"curl":0.2},"right.index":{"joints":[0.5,0.4,0.3]}}`; curl 0 flat .. 1 fist),
  `root` (`{"pos":[m],"rot":[deg]}`).
- **A key:** `t`, `pose`, `interp` (how the move ARRIVES: `ease` (default), `linear`, `in`, `out`, `step` = hold and snap at `t`,
  `overshoot` = past the mark by `overshoot` (.1) and back over `settle` (.3 s)), `hold` (seconds on this pose), `step` (2 or 3: this move,
  its hold and settle sampled on 2s/3s at `stepFps` 24 and held, written as constant-tangent keys), plus per-key `muscles`, `add`,
  `fingers`, `root`, `mirror`. Times are seconds or `"6f"`.
- **Cycles:** `{"period":4,"phase":0,"muscles":{"Chest Front-Back":0.03},"root":{"pos":[0,0.004,0],"rot":[1,2,0]}}` adds a sine (breath,
  float); on a loop each period must divide `length`. **Additive:** `"over":{"clip":"X","from":0,"speed":1}` makes the poses offsets on a
  playing clip. **Mirror** swaps Left/Right muscles, negates the midline and twist muscles, mirrors the body. Muscles clamp to -1..1.
- **`mv call posecheck '{"sheet":"zg_neutral"}'`** (`Editor/Native/PoseCheck.cs`, about 12 s for a 12 s clip) derives the clip, plays it
  on a DontSave copy of HIM with his Animator and Avatar (no Foot IK) and writes `Director/library/poses/check/<clip>.png` (a row per key
  at its settled time: front | side | three-quarter | black silhouette; `"silhouette":"front"`), `<clip>.mp4` (24 fps, front | three |
  side) and `<clip>.json` (each key's body angles and muscles, the worst bone step a frame, toe angle range, neck range). Options:
  `variant`, `derive:false`, `play:false`, `secs`, `views`, `w`/`h`, `tileW`/`tileH`, `bg`, `fov`, `frame`, `label`, `maxKeys`, `clip`
  (check any clip at `times`). **Judge from the mp4 at speed and the critic, never from the png or the numbers alone.**
- **The angles** (degrees, `keys[].angles`): `hipFlex`/`hipAbd`, `knee`/`elbow` (180 minus the inside angle), `anklePF` (pointed +),
  `toes`, `shFlex`/`shAbd`, `neckFlex` (down against the chest), `waistFlex`, `fingerCurl` (about 50 relaxed, 90 a loose fist),
  `headPitchWorld`. His standing idle reads hip -5, knee 5, ankle -4, shoulder abd 18, elbow 30, waist 8.
- **His muscle scale** (`call posemuscles`; PersonAvatar uses Unity's default limits, humanScale 1.04): Foot Up-Down 50° a unit, Upper
  Leg Front-Back -90..50, Lower Leg and Forearm Stretch ±80, Arm Down-Up -60..100, Arm Front-Back ±100, Upper Leg In-Out ±60,
  Spine/Chest/Neck/Head ±40. Upper Leg Twist + turns the knees out; Arm Twist + swings the forearms out and up. Finger Stretched +1 is
  about 23° curl, 0 about 75, -1 a tight fist (166).
- **`zg_neutral`** (`library/poses/zg_neutral.json`; clips `zg_neutral`, `_a`..`_d`): the NASA neutral-body-posture float, a 12 s loop.
  Measured: hip flex 36/32, abd 17/14, knee 49/46, ankle 23 pointed, toes 0, neck down 13, shoulder flex 46/42, abd 30/31, elbow 87/95,
  fingers about 62, waist 12; breath every 4 s, each limb drifting 3-4° on its own 6 s phase; worst bone step 0.3°/frame. Variants `a`
  (right arm higher, head turned, a knee deeper), `b` (forward-pitched chaser), `c` (elongated), `d` (legs scissored, spine twisted, head
  tilted), each on its own cycle phase so two copies never mirror. Proof `check/zg_neutral_proof.mp4`.
- **Hawkes Punch sheets** (J approved the 18 `hp_*` as poses from the check sheets, and `hp_doc_punch` + `hp_him_hit` for the punch):
  `hp_f1_superman hp_f2_ram hp_f3_lean hp_h1_hop hp_p1_peer hp_p2_sneak hp_p3_deadpan hp_b1_boop hp_s3_strike hp_r1_pull hp_r2_lasso
  hp_c1_catch hp_c4_shove hp_a1_atlas hp_a2_setdown hp_d2_letgo hp_doc_punch hp_doc_after hp_him_hit`. Missing from SPACE-EPIC's plan:
  S1 starfish brake, S2 scare lunge, C2 slide, C3 storm hold, D1 drawing up, R3 yank.
- **`limbscale`** (`Runtime/MVLimbScale.cs`): `{"do":"limbscale","on":"person","bone":"rightHand","scale":1.5,"for":"0.25s","in":0.04,
  "out":0.12}` scales a bone (and what hangs from it) after the Animator: up over `in`, held, back over `out`. `bones` a list or a map,
  `scale` may be `[x,y,z]`, cues multiply. For the strike frame toward the lens (1.2-1.6x); authored for one camera. Assumes rest scale 1.
- **Rough:** poses are muscles, so a hand can't be placed on a point (`reach` on top); interpolation is per muscle, so a 1 s strike can
  swing a limb through the body (add a breakdown key and look); one settle shape; keyed clips are not in the clip catalog
  (`clip-uncatalogued`); posecheck has no floor and no shot camera.
