// Generates one storyboard panel per shot through Hawkes Gen (image.generate, Z-Image Turbo), all in one
// submitMany so Gen batches them, reuse on, then downloads each to storyboard/panels/<id>.png.
//   node Director/videos/hawkespunch/storyboard/make_panels.mjs [--only c01,c02] [--new]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HawkesGen } from '../../../tools/mv/hawkesgen.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, 'shots.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const fresh = args.includes('--new');
const outDir = path.join(here, 'panels');
fs.mkdirSync(outDir, { recursive: true });

const gen = new HawkesGen({ project: 'tkshock' });
const shots = data.shots.filter((s) => !only || only.includes(s.id)).filter((s) => fresh || !fs.existsSync(path.join(outDir, `${s.id}.png`)));
if (!shots.length) { console.log('nothing to make'); process.exit(0); }

const specs = shots.map((s) => ({
  tool: 'image.generate',
  params: { prompt: `${s.style ?? data.style} ${s.prompt}`, width: 1024, height: 576, count: 1, seed: 1000 + data.shots.indexOf(s) },
  labels: { storyboard: 'hawkespunch', shot: s.id },
  key: `hp-storyboard-v1-${s.id}${fresh ? '-' + Date.now() : ''}`,
  reuse: !fresh,
}));
console.log(`submitting ${specs.length} panels`);
const jobs = await gen.submitMany(specs);
let spent = 0;
await Promise.all(jobs.map(async (j, i) => {
  const s = shots[i];
  try {
    const done = await gen.wait(j.id, { timeoutMs: 40 * 60 * 1000 });
    const asset = done.outputs?.[0]?.asset;
    if (!asset) throw new Error('no output');
    await gen.download(asset, path.join(outDir, `${s.id}.png`));
    spent += done.cost?.total ?? done.cost ?? 0;
    console.log(`${s.id} ok ${done.reused ? '(reused)' : ''} ${j.id}`);
  } catch (e) {
    console.log(`${s.id} FAILED ${e.message}`);
  }
}));
console.log(`done; reported cost ${spent}`);
