#!/usr/bin/env node
// Claude's side of the Review Room loop. Run from chat; J never needs it.
//   node Director/room/next.mjs                    the next open note as JSON (null when there are none). Changes nothing.
//   node Director/room/next.mjs take               the same, and marks it in progress so J sees it being worked on
//   node Director/room/next.mjs done <id> <clip> [--note "what changed"]   marks it fixed, with the new render of the shot
//   node Director/room/next.mjs ask <id> "<question>"   marks it needs J
//   node Director/room/next.mjs list [status]      every note, one line each
// Add --video <name> for a video other than the current one.
// <clip> can be a shot render or a whole new render: a whole render is cut to the same moment as the note.
import fs from 'node:fs';
import path from 'node:path';
import {
  DIRECTOR, OPEN, addClips, byNextUp, currentVideo, info, loadSong, noteForClaude, probe, readNotes, setStatus, syncMarks, updateNotes, videoDir,
} from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf('--' + name);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const video = flag('video') ?? currentVideo();
const message = flag('note');
const [cmd, a, b] = args;
const fail = (m) => { console.error(m); process.exit(1); };

function find(id) {
  const n = readNotes(video).find((x) => x.id === id);
  if (!n) fail(`No note ${id} in ${video}.`);
  return n;
}

function nextOpen() {
  // A note the loop in auto.mjs has or is working on isn't for Claude in chat.
  return readNotes(video).filter((n) => OPEN.includes(n.status) && !n.removed && !['queued', 'working'].includes(n.auto?.state)).sort(byNextUp)[0] ?? null;
}

function done(id, clip) {
  if (!id || !clip) fail('Use: done <id> <clip>');
  const note = find(id);
  // A path, or just a file name from mv shot, which writes to the video's shots folder.
  const src = [path.resolve(clip), path.resolve(DIRECTOR, clip), path.resolve(info(video).shots, clip)].find((p) => fs.existsSync(p)) ?? path.resolve(clip);
  if (!fs.existsSync(src)) fail(`No clip at ${clip}`);
  // A whole render is cut to the note's stretch of time, a shot render is used as it is.
  const whole = Math.abs(probe(src).duration - loadSong(video).duration) < 2;
  const attempt = (note.history ?? []).filter((h) => h.status === 'fixed').length + 1;
  const clips = addClips(video, id, src, { attempt, start: whole ? 0 : null });
  const out = updateNotes(video, (notes) => {
    const n = notes.find((x) => x.id === id);
    n.clip = clips;
    setStatus(n, 'fixed', 'claude', message);
    return n;
  });
  console.log(JSON.stringify(noteForClaude(video, out), null, 1));
}

syncMarks(video);
switch (cmd) {
  case undefined: {
    const n = nextOpen();
    console.log(JSON.stringify(n && noteForClaude(video, n), null, 1));
    break;
  }
  case 'take': {
    const n = nextOpen();
    if (n && n.status === 'new') updateNotes(video, (notes) => setStatus(notes.find((x) => x.id === n.id), 'in progress', 'claude'));
    console.log(JSON.stringify(n && noteForClaude(video, readNotes(video).find((x) => x.id === n.id)), null, 1));
    break;
  }
  case 'done':
    done(a, b);
    break;
  case 'ask':
    if (!a || !b) fail('Use: ask <id> "<question>"');
    find(a);
    updateNotes(video, (notes) => {
      const n = notes.find((x) => x.id === a);
      n.question = b;
      setStatus(n, 'needs J', 'claude', b);
    });
    console.log(`${a} now needs J.`);
    break;
  case 'list':
    for (const n of readNotes(video).filter((x) => !x.removed && (!a || x.status === a)).sort((x, y) => x.t - y.t)) {
      console.log(`${n.id.padEnd(5)} ${n.status.padEnd(12)} ${String(n.at).padEnd(9)} ${(n.shot?.name ?? '').slice(0, 28).padEnd(28)} ${n.text.split('\n')[0].slice(0, 70)}`);
    }
    break;
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'));
}
