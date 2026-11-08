# The Review Room and the note loop

**Review Room:** http://127.0.0.1:8795 (`room` in `.claude/launch.json`, `Director/room/server.mjs`). J watches renders, clicks a moment
and leaves a note; Unity marks (the desk: Space plays, M or F8 marks, type a note; `mv marks`) arrive in the same place. Notes are in
`Director/videos/<name>/notes.json`. The Room shows the timeline by shot (`cards.map.json`), the QA tab (notes with source `qa` or
`review`, never J's Open list), red lines on failed shots, each note's before and after clips, the Final render button and `final/report.md`.

**Working notes:** `node Director/room/next.mjs`: no argument shows the next open note as JSON with its frame, shot and J's words; `take`
also marks it in progress; `done <id> <clip> [--note "what changed"]` marks it fixed with a shot render or a whole new render (it makes the
before and after clips); `ask <id> "<question>"` puts it to J; `list` shows them all. Work the list in order of what a viewer would notice.

**The note loop** (`Director/room/auto.mjs`, started by the Room's server; nobody runs it). On a video made of cards, a note with words runs
by itself: Claude (Sonnet through Hawkes Gen `llm.json`, no GPU) turns J's words and the frame into the smallest tweak to that shot's card
(`videos/<v>/tweaks/zz-room.json`, never a card or an act), `cards compile`, a plain `build`, `mv shot` of that shot, the before and after
clips beside the note, QA on the shot (`tools/qa.mjs --strict`), then the review of the shot render (`tools/review.mjs` with `offset`,
report in `review/note-<id>/`). Every step shows on the note (`auto.step`); the QA score and the review's A/B/C count stay on the card. A
note that fails QA or has an A fault stays open as "needs J" with the reason, the change still in, and the Room's Undo takes it out; one
too vague to act on is left open with a question. `--dry` stops once the change is chosen. Proven on greener v9 (2026-11-07): a framing
note went note to QA verdict in 87 s (build 33 s, render 10 s) and was left open because QA scored the wider lens 5.9; a timing note went
note to fixed in 84 s (build 26 s, QA 7.4, review 0 A); "this looks bad" was left open asking what bothers J. Vision costs about $0.05 a note.
Nine full renders on Greener cost about 17 minutes each; a note costs a minute and a half.

**Planned** ([roadmap-system.md](roadmap-system.md)): the Room's pages published through Studio so J approves the board, animatic, 5 s
tests and previs from his phone; the farm so a one-shot fix renders in under a minute.
