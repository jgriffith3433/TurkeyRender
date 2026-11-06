# Polish pass brief

J: find every clip, like the remote in the hand, and everything animated wrong, like before he starts getting feathered, and do a real polish pass compared with how good stylized 3D work handles it.

Read Director/review/STANDARD.md, AGENTS.md (Acting, Performance, Arms), and your notes file. Your notes were written from v9.

**Two v9 faults are already fixed, so recheck rather than fix what they caused:**
1. A ticker's scroll `speed` was being read as a scene speed, so from 160 s on scene time ran about 300 times too fast, and bodies flipped between poses every frame. All of Part 7's action timing is now different. Smiles and blink faults in v9 also came from a face error that's now fixed.
2. Hand and wrist engine defaults improved after some of the notes.

**Rules for this pass:**
- Fix A faults, then B, then C if there's time.
- Fewer clips, more holding. Don't run clips at speed 2.5 to 5 to cancel slow motion; pick one clip and hold it, or use `keys`. Strong pose, quick move, short hold.
- Don't use whole-body `move` or `rotate` for a person.
- Keep overlap at 0.5 or less wherever slow motion is on, and off when the head should stay still.
- `reach` and `plant` are for real contact, and contact must be visible.
- Check each fix in motion: `mv render --from --to --w 640 --h 360`, then step it. Check 30 fps, not just 4 fps.
- `mv motioncheck <from> <to> --on person --every 0.2` on your range at the end. Report before and after.

Unity: take Director/gen/unity.lock only while building or capturing, your name, under 3 minutes, remove only your own. `mv build --fast`. No C# unless essential, under Director/gen/compile.lock. Use an actor for shot `look`. Copy frames to your own folder at once. Never delete Director/inbox files. Never print secrets. Don't commit. No AI video.
