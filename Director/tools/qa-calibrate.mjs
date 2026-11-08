#!/usr/bin/env node
// How well qa.mjs catches what people found. Compares a QA run with review/qa-truth.json (the review notes and J's own):
//   node Director/tools/qa-calibrate.mjs <run label> [--truth v9,v8] [--sev A,B] [--model claude-haiku-5-5]
// A note counts as caught when a QA fault of any grade overlaps it in time (0.5 s of slack) and a judge reading both says it is
// the same problem. `gated` counts those graded A or B, which can fail a shot. `timeOnly` is the softer figure without the judge. `unmatched` are QA faults that match no note: read them by
// hand before calling them false alarms, because the notes aren't complete.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './qa.mjs';
import { HawkesGen } from './mv/hawkesgen.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const label = args[0], base = label === 'current' ? path.join(ROOT, 'shots') : path.join(ROOT, 'captures/qa', label);
const videos = (flag('truth', label) ?? '').split(','), sevs = flag('sev', 'A,B').split(','), SLACK = 0.5;
const truth = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/qa-truth.json'), 'utf8')).filter((t) => videos.includes(t.video) && sevs.includes(t.sev));
const shift = +flag('shift', 0), faults = []; // --shift 30 moves every fault 30 s: what still matches is chance, the control for a loose judge
for (const d of fs.readdirSync(base)) {
  let q; try { q = JSON.parse(fs.readFileSync(path.join(base, d, 'qa.json'), 'utf8')); } catch { continue; }
  for (const f of q.faults ?? []) faults.push({ ...f, from: (f.from ?? 0) + shift, to: (f.to ?? 0) + shift, shot: q.id });
}
const gen = new HawkesGen({ project: 'tkshock' }), model = flag('model', 'claude-sonnet-5-5');
const overlap = (f, r) => f.from - SLACK <= r[1] && f.to + SLACK >= r[0];
const SCHEMA = { type: 'object', additionalProperties: false, required: ['same'], properties: { same: { type: 'array', items: { type: 'integer' } } } };
const out = [], queue = [...truth];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let t; (t = queue.shift()); ) {
    const cand = faults.filter((f) => f.source === 'vision' || f.sev !== 'C').filter((f) => t.ranges.some((r) => overlap(f, r)));
    let same = [];
    if (cand.length) {
      const prompt = `A human reviewer wrote this note about a 3D music video:\n"${t.note}"\n\nAutomatic QA findings from about the same time:\n${cand.map((f, i) => `${i}: ${f.what}`).join('\n')}\n\nWhich findings describe the same defect as the note? Be strict: they must be about the same thing going wrong in the same way, so that fixing one would fix the other. Both being about arms, a pose, a stiff body or a missing event is not enough. List their numbers; empty if none.`;
      const job = await gen.run('llm.json', { params: { prompt, model, effort: 'low', maxTokens: 600, schema: SCHEMA } });
      same = (job.result?.value?.same ?? []).filter((i) => cand[i]);
      for (const i of same) cand[i].matched = t.id;
    }
    out.push({ id: t.id, sev: t.sev, video: t.video, caught: same.length > 0, gated: same.some((i) => cand[i].sev !== 'C'), timeOnly: cand.length > 0, note: t.note.slice(0, 110), by: same.map((i) => cand[i].what.slice(0, 90)) });
  }
}));
out.sort((a, b) => a.id.localeCompare(b.id));
const rate = (l) => (l.length ? Math.round((100 * l.filter((x) => x.caught).length) / l.length) : 0);
const AB = faults.filter((f) => f.sev !== 'C'), unmatched = AB.filter((f) => !f.matched);
const summary = { run: label, notes: out.length, caught: out.filter((x) => x.caught).length, rate: rate(out), rateA: rate(out.filter((x) => x.sev === 'A')), gated: out.filter((x) => x.gated).length, timeOnly: out.filter((x) => x.timeOnly).length, faultsAB: AB.length, unmatched: unmatched.length };
console.log(JSON.stringify(summary));
if (!shift) fs.writeFileSync(path.join(base, 'calibration.json'), JSON.stringify({ summary, notes: out, unmatched: unmatched.map((f) => ({ shot: f.shot, sev: f.sev, from: f.from, to: f.to, source: f.source, seen: f.seen, what: f.what })) }, null, 1));
for (const x of out.filter((x) => !x.caught)) console.log(`missed ${x.id} (${x.timeOnly ? 'nearby faults' : 'nothing there'}): ${x.note}`);
