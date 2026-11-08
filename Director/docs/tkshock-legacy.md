# TK Shock: what only applies to the first video

TK Shock (TurkeyRender, a music video, 11 full renders, about 4,000 hand-written cues, 40 agents) is the video this system was built on.
Its score is `Director/score.json` + `Director/acts/*.json`, its scene `Assets/Scenes/MusicVideo.unity`, generated assets
`Assets/MusicVideo/Generated/`, and it plays on the **legacy path** (ground, limits, overlap, inertial transitions, bakes;
[score-cues.md](score-cues.md)). Its documents moved to `Director/tkshock-docs/`: `TREATMENT.md` (J's vision), `STORYBOARD.md` (every bar
has an event), `SONG.md` (87 BPM, 73 bars, bar 1 beat 1 at 0.45 s, a 3-3-2 kick pattern; sections and energy), `POLISH.md` (the polish
bar: "would this sit beside a high-end animated music video on a major label's channel?"), `ART_BIBLE.md`, `COLOR_SCRIPT.md`,
`ROADMAP.md` (M1 models onward), `TEAM.md` (the part-owner split of acts `02-watching` to `05-inside` and `07-cuts-*`, `REQUESTS.md`
between roles), `REVIEW.md` (the v4 shot-by-shot review). Read them only when working on TK Shock itself.

**The old loop** (how J directed it): J plays in Unity (the Music Video desk window: Space plays, M or F8 marks, type a note) and writes
direction in chat; `mv marks` gives his marks (time, bar:beat, section, note, screenshot); edit `Director/acts/*.json`, `mv build`; look
with `mv frame 12:3`, `mv sheet 25:1 33:1 --every 3`; tell J what changed and where to look. The Review Room replaced the desk for later
videos ([room.md](room.md)).

**TK Shock-specific facts kept for re-renders:** the `rgb` look key does nothing (shader name mismatch; fixing it changes TK Shock);
`reverse_test` can fail on bars 58-68 on grain alone; the ground pass (added later) changes every human in every video, so an old video
looks different if re-rendered; a `person2` time-zero `face` cue holds her shape keys at 0; `Director/acts_ai` and `Director/ai_footage`
hold the rejected AI shots (never bring them back); the turkey clips, shows, TV channels, the eye, the mountain, feathers, the crown, the
stream and the stretch were built for its parts 1-8 ([score-cues.md](score-cues.md) keeps their cues). `render_parts.py`, `make_cuts.py`,
`p34_build.mjs`, `p4_fall.mjs`, `p5_feathers.py`, `p6_hang.mjs`, `p6_type.py`, `part7.mjs`, `part7_tex.py`, `part8_hair.py` in
`Director/tools/` are its per-part scripts; the pattern they stood for is now cards and templates.

**What TK Shock taught** is in `Director/PIPELINE.md` ("What went wrong") and `videos/greener/RETRO.md` (the second video).
