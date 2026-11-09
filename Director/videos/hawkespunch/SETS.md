# Hawkes Punch: sets, props and what the camera sees (set agent, 2026-11-08)

A later session continues from this file alone. It covers the S and W rows of `CLINIC-AD-AUDIT.md` and the C/T rows about sets, props and
legibility. Proof video: `videos/_sets_test` (a copy of hawkespunch's score, style, sequences and cast; its cards stage each set from the
board's cameras). No hawkespunch card, override or board was edited. The Unity owner's staging requests are in `Director/gen/WORKLOG-epic.md`
("set agent -> Unity owner", items 1-10). Stills are staging only (`mv frame`); none of this judges motion.

**Before:** `sets_proof/before/sheet_before.png` (hawkespunch 1280x720 at 1.5 4.5 7.5 12.5 42.5 47.5 162.5 165 173 180 187.5 203.5 s).
**After:** `sets_proof/r1..r4/`, `t4/`, `t4_after/` (`_sets_test` frames; the newest round wins), `props_a/b/c.png` (Blender shape checks),
`cards_after.png`, `end_card_after.png`.

## How the kit is made (re-run any of these; all are safe to run again)

| Step | Command | Writes |
|---|---|---|
| Textures | `uv run --no-project --with numpy --with pillow python Director/tools/punch_tex.py [name ...]` | `Assets/MusicVideo/Props/Punch/tex/<name>.png` |
| Palette, atlases, materials | `py Director/tools/punch_make.py` (palette cells appended, older cells keep their place; guids kept) | `punch_palette*.png`, `tex/<name>_atlas.png`, `<name>.mat` |
| Props | `"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P Director/tools/blender_punch.py -- <piece ...>` | `Assets/MusicVideo/Props/Punch/<piece>.fbx` |
| Shape check | `... -P Director/tools/blender_propshot.py -- <out.png> <a.fbx> ...` (workbench, palette colours approximate) | a PNG strip |
| Full-frame cards | `py Director/tools/punch_cards.py` | `Assets/Videos/hawkespunch/Props/side_effects_1/2.png`, `end_card.png` |
| Proof | `node Director/mv.mjs --video _sets_test cards` then `... frame <t...> --w 1280 --h 720` | `videos/_sets_test/captures/` |

Backups of everything replaced: `Director/tools/_backup/sets-2026-11-08/` (tools, set json, lighting, `tex/`, `props/`, `cards/`) and
`videos/hawkespunch/_backup/00-cast-pre-sets-2026-11-08.json`.

## Priority 1: the product reads (DONE in assets; three need the owner's cards)

| Where | Now | Proof | Left |
|---|---|---|---|
| Can label (`punch_tex.py can_label`) | HAWKES over PUNCH (huge, red on cream), ONE A DAY UNTIL IT STOPS; each block inside a quarter turn so either side reads whole (it used to read PUNCH HAWKES) | r1/f_0021, r4/f_0031.500 | - |
| Poster (`punch_tex.py poster`; `poster.fbx` 0.6x0.8 in the exam room, NEW `poster_big.fbx` 0.9x1.2 in reception, `clinic_rec_poster`) | name over half the print, the can drawn with its label, "Ask your doctor.", the fine print | r2/crop_poster_wide.png (c01 at 720p: name and tagline read) | - |
| c01 wide (C3) | NEW marks `cam_reception_wide` + `_aim`: turkey on her counter left, the door, the poster and him in the chairs right, 24 mm | r2/f_0001 | owner: WORKLOG item 1 |
| c03 insert (C4, T3) | NEW marks `cam_rec_poster`, `poster_rec`; shot pos [701.3,1.42,-1.0] rot [0,90,0] fov 32 | r4/f_0005 | owner: item 2 |
| Ad two-shots a02/a04 (C10) | `commercial_can_big` moved centre-back [0,0,3.7] between the stools; HAWKES PUNCH whole on lens_a | r1/f_0021, t4/f_0037.958 | - (live on the next hawkespunch build) |
| End card a06 | regenerated in the poster's look with the can drawn | end_card_after.png, t4/f_0049.958 | - |
| b05 last image | top-down on the studio's dark floor, the can rolls 0.7 m in and stops with HAWKES over PUNCH upright | r4/f_0031.500 | owner: item 4 (exact cues there) |
| c17 can in his hand (W8) | NOT solved: the can floats off his open hand (r4/f_0033, f_0035) | - | owner: item 9 (a closing grip + attach rot [0,0,90]) |

## T4, the ending (DONE in engine, verify)

The page-to-page cut and the cards' ends were clean (t4/f_0043.000 -> f_0043.042, f_0047.958, f_0049.958). The FIRST frame of every
full-frame card (a05 at 38.0, a06 at 48.0, b01's THE NEXT DAY at 50.0 in `_sets_test`) showed the set: `Runtime/MVGfx.cs` image alpha was
`tl / in` = 0 on the cut frame. Fixed via `mv csharp apply Director/staging/sets` (2026-11-09 01:29, compiled OK): an `in` under 0.02 s is a
hard cut; `out` keeps its fade (the frame at op.end belongs to the next shot). Proof after: `sets_proof/t4_after/sheet.png` (38, 48, 50 s
must show the card, not the set). No card or generator change needed. T5 (safety card layout) done by `punch_cards.py` (cards_after.png).

## Built and placed, waiting only on a hawkespunch build to show

- **S1 waiting room** (`library/sets/clinic.json` actors): `rec_poster`, `rec_waiting_sign` (PLEASE TAKE A SEAT), `rec_magazines`
  (`magazine_rack.fbx`, three covers), `rec_cooler` (`water_cooler.fbx`), `rec_monitor` (`monitor.fbx`, lit schedule screen) and
  `rec_keyboard` (`keyboard.fbx`) on the counter (the slab is gone from `reception_desk.fbx`), `rec_pinboard` (`pinboard.fbx`, S4).
  Proof r2/f_0001, r2/f_0007.
- **W9** `nurse_cap.fbx` on `nurse.head` (`acts/00-cast.json` `nurse_cap`, withHost, scale 0.4). Proof r2/f_0007.
- **S3 exam room**: `diploma_a/b` (`diploma_frame.fbx`, M. HALLORAN) on the east wall, `sanitizer.fbx` by the sink; the gloves frame is
  now `gloves_case.fbx` (12 cm shadow box, two gloves, brass GOLDEN GLOVES CHAMPION plate) in the cast's `gloves_frame` line. c15 needs the
  owner's shot (item 3; r2/f_0013).
- **W6** `boxing_glove.fbx` replaces the prim in the cast's `glove` line; staging for b02 is item 7 (r2/f_0028).
- **W10** pad texture: her notes stopping mid-word ("in sp"), Dr. Halloran header. Not visible until c10's camera sees the pad (A1).
- **A1** `pen.fbx` is a real click pen (props_c.png).
- **S7/S8 studio** (`commercial.json`): backdrop and floor repainted (no noise stripes; floor a stop under faces), `can_table` is
  `tv_table.fbx`, drapes `drape_l/r/bl/bc/br` and `light_grid`. The owner must add them to a01's fold list (item 5). Proof r1/f_0023.

## Open: ready-to-run list for the next session

1. **S2 exam light**: `library/lighting/clinic_exam.json` exists (side key, window fill, ambient down; background 83 -> 62, face light/dark
   1.15 -> 1.24 on c07's camera, r2/f_0017 vs r4/f_0019). Modest. Next: raise the key/fill ratio to about 1.5 (key intensity 18, fill 5),
   test on `_sets_test` cards `exam_wide_lit` and `doc_mcu_lit` (c07's camera), then ask the owner to set `"light": "clinic_exam"` in
   `sequences/clinic.json` between punch test rounds (item 8).
2. **c17 can read**: a grip on his right hand (catalog `mv clips hold`), attach rot [0,0,90], camera so the band faces the lens. Test as
   `_sets_test` `can_hand_a/b`.
3. **S5/S6/C9 sky**: no exterior shot remains on the board (p03 goes through the ceiling). p05's sky ramp is still a flat gradient with
   low-poly hills: layered cloud cards passing the lens, the town shrinking, `speedlines parallel` (`board.yaml` p05, owner's card).
4. **Space prims**: the ghost (`space_ghost`, `ghost_*` capsules/spheres) and the drawing (a textured cube) in `acts/00-cast.json` are still
   prims. A real sheet-ghost mesh in `blender_punch.py` (a draped sheet over a head shape, a hem with folds) and a paper sheet with a slight bow.
5. **S9**: a03 already carries `mood: tv_hot`; nothing to build.
6. **Short renders through the queue** of each set (reception, exam room, studio) once the owner's cards land: `mv render --from --to`
   on hawkespunch c01-c05, a01-a04, b05.
7. Remove the scratch video `videos/_sets_test` only when the owner has applied items 1-10 (it is the proof).
