// What the shot check (MotionCheck.cs, `mv shotcheck`, `--checks shot`) needs to know about each shot that only the cards say:
// whose shot it is (the camera's `on:` actor and bone, else the first human in the cast), whether it is deliberately inside a face
// (`extreme-close-up`/`ecu` preset, or a tag), each cast actor's mark (world position, kind) and whether it moves, and the hips height each clip the
// video plays expects (library/clips.json `hips`, measured on his rig), so a body standing where its clip sits shows. Node only, no Unity.
//
// Card tags the check reads (`tags: [ecu]` on a card, a take, a tweak or a note):
//   ecu      deliberately inside the face: no frame faults (also the `extreme-close-up` preset)
//   insert   the subject is not a face (a hand, a prop): only "subject out of frame" is checked
//   pov      the camera is meant to be in a head: no camin
//   dark     a silhouette on purpose: no readable
//   offmark  actors are meant to leave their marks: no mark
import fs from 'node:fs';
import path from 'node:path';
import { DIRECTOR } from './score.mjs';

const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const ECU_PRESETS = new Set(['extreme-close-up']);
const TAGS = new Set(['ecu', 'insert', 'pov', 'dark', 'offmark']);

/** The clips table: name -> { hips: [low, top], sit }. A clip is seated when its hips top is under 0.72 m or it carries the sit tag. */
export function clipTable() {
  const c = read(path.join(DIRECTOR, 'library', 'clips.json'), {}), all = c.clips ?? c, out = {};
  for (const [n, x] of Object.entries(all)) {
    if (!x || !Array.isArray(x.hips)) continue;
    out[n] = { hips: x.hips.map((v) => +(+v).toFixed(3)), sit: (x.tags ?? []).includes('sit') || x.hips[1] < 0.72 };
  }
  return out;
}

/**
 * The spec for a video made of cards, or null for one without cut.json. Compiles the cards in memory (writes nothing).
 * Each shot: { id, t, tEnd, subject, bone, hero, preset, ecu, tags, cast: { name: { mark, pos, kind, moving, clip } } }.
 */
export async function shotSpec(V) {
  if (!fs.existsSync(path.join(V.dir, 'cut.json'))) return null;
  const { loadVideo, compile } = await import('../cards.mjs');
  const v = loadVideo(V.dir), r = await compile(v);
  const humans = new Set(Object.entries(v.declared.actors).filter(([, a]) => /person/i.test(String(a?.model ?? ''))).map(([n]) => n));
  const clips = clipTable(), shots = [], running = {};
  r.entries.forEach((e, i) => {
    const c = e.card, m = r.map[i], cam = c.camera ?? {};
    const tags = [].concat(c.tags ?? []).map(String).filter((t) => TAGS.has(t));
    const on = [].concat(cam.on ?? [])[0] ?? Object.keys(c.cast ?? {})[0] ?? null;
    let subject = null, bone = null;
    if (on) { const [who, b] = String(on).split('.'); if (c.cast?.[who]) { subject = who; bone = b ?? null; } }
    const hero = subject && humans.has(subject) ? subject : Object.keys(c.cast ?? {}).find((n) => humans.has(n)) ?? null;
    const cast = {};
    for (const [name, ce] of Object.entries(c.cast ?? {})) {
      const mark = r.where?.[e.id]?.[name] ?? ce?.at, mk = mark ? e.set.marks[mark] : null;
      const play = ce?.clip ?? ce?.perform ?? null;
      if (play) running[name] = { mark, play }; else if (running[name]?.mark !== mark) running[name] = { mark, play: null };
      cast[name] = { mark: mark ?? null, pos: mk?.world ?? null, kind: mk?.kind ?? null, moving: !!ce?.to, clip: running[name]?.play ?? null, human: humans.has(name) };
    }
    shots.push({ id: e.id, t: m.t, tEnd: m.tEnd, subject, bone, hero, preset: cam.preset ?? null, ecu: ECU_PRESETS.has(cam.preset) || tags.includes('ecu'), tags, cast });
  });
  return { video: V.name, made: new Date().toISOString(), shots, clips };
}

/** Writes the spec into the video's captures and returns its path, or null. */
export async function writeShotSpec(V) {
  const s = await shotSpec(V);
  if (!s) return null;
  fs.mkdirSync(V.captures, { recursive: true });
  const f = path.join(V.captures, 'shotspec.json');
  fs.writeFileSync(f, JSON.stringify(s));
  return f;
}
