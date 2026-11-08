#!/usr/bin/env node
// The 30 fps reviewer as a tool (RETRO "Review in motion, by rule"; ROADMAP-SYSTEM M9). Node and ffmpeg, no Unity.
//   node Director/mv.mjs review <video> [render.mp4] [--label v9] [--model claude-sonnet-5-5] [--no-vision] [--force] [--jobs 4] [--max-spikes 60] [--plan]
//   node Director/tools/review.mjs adopt <video> <label> [render.mp4]   keep an earlier review's verdicts by shot hash (a final's render)
//   node Director/tools/review.mjs test                                 the carry logic's self test
// Incremental: on a render mv final made, a shot whose final shot hash (and the one before it, for the cut strip) is unchanged keeps its
// earlier verdict (tools/mv/verdicts.mjs, videos/<v>/review/verdicts.json): no strips, no Claude, $0. --force asks every shot again.
// --plan says which shots would be asked and which carried, and spends nothing.
// 1. Every frame of the render at 160x90 grey: frame difference, a one-frame pop test, block-matching flow with the camera's motion taken out.
// 2. For every cut and every spike, a strip of 8 consecutive 30 fps frames, cropped on him (the shot's camera subject and lens from the compiled
//    score, the moving thing's centre from the frames; a centre crop when there is nothing to go on), at readable size, times burned in.
// 3. Claude vision through Hawkes Gen (`llm.json`, project tkshock, Sonnet) on each shot's strips with review/STANDARD.md: A/B/C faults with
//    time, shot and fix. The answer is kept against a hash of the strips and prompt, so an unchanged shot costs nothing on the next run.
// Output: videos/<v>/review/<label>/report.md and report.json, strips in shots/<id>/. `mv final` runs it at the end and prints the A faults.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIRECTOR as ROOT, pickVideo, loadScore, loadClock } from './mv/score.mjs';
import { carryPlan, loadStore, saveStore, segmentsOf, standardHash, selftest as verdictTest } from './mv/verdicts.mjs';

const W = 160, H = 90, FONT = 'C\\:/Windows/Fonts/arial.ttf';
const PRICES = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5], 'claude-fable-5-1': [10, 50] };
const json = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const mkdir = (d) => (fs.mkdirSync(d, { recursive: true }), d);
const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const say = (m) => console.error(m);
const fail = (m) => { throw new Error(m); };

// ---------- 1. the measuring pass ----------

/** Per frame: luma, mean abs difference (d1), the worst 8x6 cell (cell), went-away-and-came-back share (exc), flow residual after the camera (flow),
 *  the camera's own shift (cam), and the 8x6 motion map (mot, as a string of base-36 digits) for finding him. Cached beside the video's review folder. */
export async function analyse(video, cacheDir) {
  const st = fs.statSync(video), key = crypto.createHash('sha1').update(`${path.resolve(video)}|${st.size}|${st.mtimeMs}|r4`).digest('hex').slice(0, 12);
  const cacheFile = path.join(mkdir(cacheDir), key + '.json'), cached = json(cacheFile);
  if (cached) return cached;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate,width,height', '-of', 'json', video], { encoding: 'utf8' });
  const s0 = JSON.parse(probe.stdout).streams[0], [fn, fd] = s0.r_frame_rate.split('/').map(Number), fps = fn / (fd || 1);
  const size = W * H, CX = 8, CY = 6, cw = W / CX, ch = H / CY, nCells = CX * CY, cellOf = new Uint8Array(size);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cellOf[y * W + x] = Math.min(CY - 1, y / ch | 0) * CX + Math.min(CX - 1, x / cw | 0);
  const R = { luma: [], d1: [], cell: [], exc: [], flick: [], flow: [], flowN: [], cam: [], mot: [] }, ring = [];
  const cells = (a, b) => { const out = new Float32Array(nCells); for (let i = 0; i < size; i++) out[cellOf[i]] += Math.abs(a[i] - b[i]); for (let i = 0; i < nCells; i++) out[i] /= cw * ch; return out; };
  // Block matching: a 12x12 block in each cell against the previous frame, shifts of up to 4 px. The median shift is the camera; what is left is him.
  const S = 4, B = 12, bx0 = (cw - B) / 2 | 0, by0 = (ch - B) / 2 | 0;
  const flow = (cur, prev) => {
    const dx = new Int8Array(nCells), dy = new Int8Array(nCells), ok = new Uint8Array(nCells);
    for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) {
      const x0 = cx * cw + bx0, y0 = cy * ch + by0, c = cy * CX + cx;
      if (x0 - S < 0 || y0 - S < 0 || x0 + B + S > W || y0 + B + S > H) { ok[c] = 0; continue; }
      let base = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) base += Math.abs(cur[(y0 + y) * W + x0 + x] - cur[(y0 + y) * W + x0 + x + 1]);
      if (base < B * B * 2) { ok[c] = 0; continue; } // flat: no texture to match
      let best = Infinity, bdx = 0, bdy = 0;
      for (let sy = -S; sy <= S; sy++) for (let sx = -S; sx <= S; sx++) {
        let sad = 0;
        for (let y = 0; y < B && sad < best; y++) { const r0 = (y0 + y) * W + x0, r1 = (y0 + y + sy) * W + x0 + sx; for (let x = 0; x < B; x++) sad += Math.abs(cur[r0 + x] - prev[r1 + x]); }
        if (sad < best) { best = sad; bdx = sx; bdy = sy; }
      }
      dx[c] = bdx; dy[c] = bdy; ok[c] = 1;
    }
    const xs = [], ys = []; for (let c = 0; c < nCells; c++) if (ok[c]) { xs.push(dx[c]); ys.push(dy[c]); }
    const gx = median(xs), gy = median(ys);
    let sum = 0, n = 0; for (let c = 0; c < nCells; c++) if (ok[c]) { const r = Math.hypot(dx[c] - gx, dy[c] - gy); sum += r; if (r >= 2) n++; }
    return { res: xs.length ? sum / xs.length : 0, n, cam: Math.hypot(gx, gy) };
  };
  const frame = (raw) => {
    let sum = 0; for (let i = 0; i < size; i++) sum += raw[i];
    R.luma.push(+(sum / size).toFixed(1));
    const f = new Uint8Array(raw), prev = ring[ring.length - 1];
    if (prev) {
      const c = cells(f, prev); let d = 0, mx = 0;
      for (const v of c) { d += v; if (v > mx) mx = v; }
      R.d1.push(+(d / nCells).toFixed(2)); R.cell.push(+mx.toFixed(1));
      R.mot.push([...c].map((v) => Math.min(35, Math.round(v / 2)).toString(36)).join(''));
      const fl = flow(f, prev); R.flow.push(+fl.res.toFixed(2)); R.flowN.push(fl.n); R.cam.push(+fl.cam.toFixed(1));
    } else { R.d1.push(0); R.cell.push(0); R.mot.push('0'.repeat(nCells)); R.flow.push(0); R.flowN.push(0); R.cam.push(0); }
    let exc = 0, flick = 0;
    for (let k = 2; k <= 4 && k <= ring.length; k++) {
      const a = ring[ring.length - k], b = cells(f, a), mid = ring[ring.length - k + 1], ca = cells(mid, a), cb = cells(mid, f);
      let hit = 0, moved = 0;
      for (let i = 0; i < nCells; i++) {
        if (ca[i] > 9 && cb[i] > 9) { moved++; if (b[i] < 0.35 * Math.min(ca[i], cb[i])) hit++; }
        if (k === 2 && ca[i] > 4 && cb[i] > 4 && b[i] < 0.3 * Math.min(ca[i], cb[i])) flick++; // a patch that changed and changed straight back: flicker
      }
      const share = moved >= 2 ? hit / moved : 0; if (share > exc) exc = share;
    }
    R.exc.push(+exc.toFixed(2)); R.flick.push(flick);
    ring.push(f); if (ring.length > 4) ring.shift();
  };
  await new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
    let left = Buffer.alloc(0);
    p.stdout.on('data', (b) => { left = left.length ? Buffer.concat([left, b]) : b; let o = 0; while (left.length - o >= size) { frame(left.subarray(o, o + size)); o += size; } left = left.subarray(o); });
    p.on('close', (c) => (c ? rej(new Error('ffmpeg failed on ' + video)) : res()));
  });
  const cuts = [];
  for (let i = 2; i < R.d1.length - 2; i++) {
    const around = median(R.d1.slice(Math.max(0, i - 6), i).concat(R.d1.slice(i + 1, i + 7)));
    if (R.d1[i] > 9 && R.d1[i] > 4 * Math.max(around, 1) && R.cell[i] > 18 && !cuts.includes(i - 1)) cuts.push(i);
  }
  const out = { video: path.resolve(video), w: s0.width, h: s0.height, fps, frames: R.d1.length, cuts, ...R };
  fs.writeFileSync(cacheFile, JSON.stringify(out));
  return out;
}

// ---------- 2. shots, events, strips ----------

/** The shots of this render: the cards when the render is the whole cut (its length matches), else the detected cuts. */
function shotsOf(V, a, offset) {
  const cards = json(path.join(V.dir, 'cards.map.json'), []), fps = a.fps, total = a.frames;
  let compiled = new Map();
  try { for (const c of json(path.join(V.acts, '50-cards.json'), { cues: [] }).cues) if (c.shot?.name) compiled.set(c.shot.name, c.shot); } catch {}
  let clockOf = null; try { const { score } = loadScore(V); clockOf = loadClock(V, score); } catch {}
  const wholeCut = offset === undefined && cards.length && clockOf && Math.abs(total / fps - clockOf.duration) < 1.5;
  const near = (f) => a.cuts.find((c) => Math.abs(c - f) <= 2); // the picture usually cuts a frame after the card time
  const list = [];
  if (offset !== undefined) {
    // A shot render: `offset` is the video second its first frame is at. Every card it overlaps, clipped to the file, so faults land on the right card at video times.
    for (const c of [...cards].sort((x, y) => x.t - y.t)) {
      const f0 = Math.max(0, Math.round((c.t - offset) * fps)), f1 = Math.min(total, Math.round((c.tEnd - offset) * fps));
      if (f1 - f0 < 2) continue;
      const sh = compiled.get(c.id) ?? {};
      list.push({ id: c.id, idea: c.idea, feel: c.feel, f0, f1, card: true, fov: sh.fov ?? null, subject: typeof sh.look === 'string' ? sh.look : typeof sh.focus === 'string' ? sh.focus : null, screen: sh.screen ?? null });
    }
  } else if (wholeCut) {
    const ordered = [...cards].sort((x, y) => x.t - y.t);
    ordered.forEach((c, i) => {
      const f0 = i === 0 ? 0 : (near(Math.round(c.t * fps)) ?? Math.round(c.t * fps) + 1), nextT = ordered[i + 1]?.t;
      const f1 = nextT === undefined ? total : (near(Math.round(nextT * fps)) ?? Math.round(nextT * fps) + 1);
      if (f1 <= f0) return;
      const sh = compiled.get(c.id) ?? {};
      list.push({ id: c.id, idea: c.idea, feel: c.feel, f0, f1, card: true, fov: sh.fov ?? null, subject: typeof sh.look === 'string' ? sh.look : typeof sh.focus === 'string' ? sh.focus : null, screen: sh.screen ?? null });
    });
  } else {
    const edges = [0, ...a.cuts, total];
    for (let i = 0; i + 1 < edges.length; i++) list.push({ id: `cut-${clock(edges[i] / fps).replace(/[:.]/g, '-')}`, f0: edges[i], f1: edges[i + 1], card: false, fov: null, subject: null, screen: null });
  }
  return { list, wholeCut, clockOf };
}

/** Where he is in a shot: the centre of its motion, from the 8x6 maps, as fractions of the frame. */
function motionCentre(a, s) {
  const acc = new Float32Array(48);
  for (let f = s.f0 + 2; f < s.f1; f++) { const m = a.mot[f]; if (!m) continue; for (let c = 0; c < 48; c++) acc[c] += parseInt(m[c], 36) || 0; }
  let sum = 0, sx = 0, sy = 0; const top = [...acc].map((v, i) => [v, i]).sort((p, q) => q[0] - p[0]).slice(0, 8);
  for (const [v, i] of top) { if (v <= 0) continue; sum += v; sx += v * ((i % 8) + 0.5) / 8; sy += v * (Math.floor(i / 8) + 0.5) / 6; }
  return sum > 0 ? { x: sx / sum, y: sy / sum } : null;
}

/** The crop that shows him at a readable size: full frame on a long lens, tighter as the lens opens, centred on the motion. */
function cropFor(a, s) {
  const fov = s.fov ?? 40;
  const share = fov <= 24 ? 1 : fov <= 35 ? 0.7 : fov <= 46 ? 0.55 : 0.45;
  if (share >= 1) return { x: 0, y: 0, w: a.w, h: a.h, how: 'full frame' };
  const c = motionCentre(a, s) ?? { x: 0.5 + (s.screen?.[0] ?? 0), y: 0.5 };
  const w = Math.round(a.w * share / 2) * 2, h = Math.min(a.h, Math.round(w * 9 / 16 * 1.3 / 2) * 2);
  const x = Math.max(0, Math.min(a.w - w, Math.round(c.x * a.w - w / 2))), y = Math.max(0, Math.min(a.h - h, Math.round(c.y * a.h - h * 0.45)));
  return { x, y, w, h, how: `${Math.round(share * 100)}% crop on the motion${s.subject ? ` (${s.subject})` : ''}` };
}

/** Spikes inside a shot: frames whose difference, worst cell, flow residual or came-back share stands far above the shot's own and its neighbours',
 *  the first frames after the cut aside. A shot whose patches flicker on many frames gets one strip at its worst flicker. */
function spikesOf(a, s, maxPerShot) {
  const inside = [], f0 = s.f0 + 2, f1 = s.f1 - 1;
  for (let f = f0; f < f1; f++) inside.push(f);
  if (inside.length < 6) return [];
  const md1 = Math.max(1, median(inside.map((f) => a.d1[f]))), mfl = Math.max(0.3, median(inside.map((f) => a.flow[f]))), mce = Math.max(4, median(inside.map((f) => a.cell[f])));
  const near = (arr, f) => median([...arr.slice(Math.max(f0, f - 6), f), ...arr.slice(f + 1, Math.min(f1, f + 7))]);
  const score = (f) => {
    const d = a.d1[f] / Math.max(md1, near(a.d1, f), 1), fl = a.flow[f] / Math.max(mfl, near(a.flow, f), 0.3), ex = a.exc[f], ce = a.cell[f] / Math.max(mce, near(a.cell, f), 4);
    const sd = d >= 2.2 && a.d1[f] >= 4 ? d : 0, sf = fl >= 2 && a.flow[f] >= 1 ? fl : 0, se = ex >= 0.4 ? 2.5 + ex * 2 : 0, sc = ce >= 2.5 && a.cell[f] >= 40 ? ce : 0;
    const big = (a.cell[f] >= 90 && ce >= 1.5) || (a.cell[f] >= 60 && ce >= 1.8) ? 2 + a.cell[f] / 40 : 0; // a whole-cell jump is a pop whatever the shot does around it
    const s = Math.max(sd, sf, se, sc, big);
    return { f, d, fl, ex, ce, s, why: s === 0 ? '' : se === s ? `pose jumps and comes back (${ex})` : sf === s ? `flow spike x${round(fl, 1)}` : sc === s || big === s ? `one patch jumps (cell ${a.cell[f]}, x${round(ce, 1)})` : `frame difference x${round(d, 1)} (${a.d1[f]})` };
  };
  const all = inside.map(score).filter((x) => x.s > 0).sort((p, q) => q.s - p.s), out = [];
  for (const x of all) { if (out.some((o) => Math.abs(o.f - x.f) < 8)) continue; out.push(x); if (out.length >= maxPerShot) break; }
  const flicky = inside.filter((f) => a.flick[f] >= 2);
  if (flicky.length >= Math.max(6, inside.length * 0.2) && !out.some((o) => o.why.startsWith('flicker'))) {
    const worst = flicky.sort((p, q) => a.flick[q] - a.flick[p])[0];
    out.push({ f: worst, s: 3, why: `flicker: patches change and change straight back on ${Math.round(flicky.length / inside.length * 100)}% of the shot's frames (${a.flick[worst]} cells here)` });
  }
  return out.sort((p, q) => p.f - q.f).map((x) => ({ f: x.f, t: round(x.f / a.fps, 3), why: x.why, d1: a.d1[x.f], flow: a.flow[x.f], exc: a.exc[x.f], flick: a.flick[x.f] }));
}

/** 8 consecutive frames from `first`, cropped, labelled with the video time, 4 by 2. */
function strip(video, a, first, crop, out) {
  const n = 8, seek = Math.max(0, first - 2) / a.fps, skip = first - Math.max(0, first - 2);
  const sel = Array.from({ length: n }, (_, i) => `eq(n\\,${skip + i})`).join('+');
  const tw = 360, label = `drawtext=fontfile='${FONT}':text='%{eif\\:floor(t+${round(seek, 3)})\\:d}.%{eif\\:mod((t+${round(seek, 3)})*100,100)\\:d\\:2}':x=4:y=4:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=2`;
  const vf = `select='${sel}',crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${tw}:-2,${label},tile=4x2:padding=3`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(round(seek, 4)), '-i', video, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-frames:v', '1', '-q:v', '3', out], { encoding: 'utf8' });
  if (r.status) throw new Error(r.stderr.slice(-300));
  return out;
}

// ---------- 3. the review ----------

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'faults'],
  properties: {
    summary: { type: 'string' },
    faults: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'sev', 'rule', 'seen', 'what', 'fix'], properties: {
      t: { type: 'number' }, sev: { type: 'string', enum: ['A', 'B', 'C'] },
      rule: { type: 'string', enum: ['pop', 'contact', 'pose', 'weight', 'hold', 'face', 'staging', 'frame', 'render', 'story'] },
      seen: { type: 'string', enum: ['certain', 'likely'] }, what: { type: 'string' }, fix: { type: 'string' } } } },
  },
};

function promptFor(s, strips, hints) {
  const standard = fs.readFileSync(path.join(ROOT, 'review', 'STANDARD.md'), 'utf8');
  const what = strips.map((x, i) => `Image ${i + 1}: ${x.kind === 'cut' ? `the cut into this shot: 8 consecutive frames, the last 2 of the shot before and the first 6 of this one` : `a spike the measurements found at ${x.t} s (${x.why}): 8 consecutive frames around it`}. Times ${x.from} to ${x.to} s, read left to right, top row then bottom. ${x.crop}.`).join('\n');
  return `You are the strict motion reviewer on a stylized real-time 3D music video, reading consecutive 30 fps frames. Nobody has watched this version at speed yet. Faults found here save a render the owner would otherwise reject.

THE STANDARD
${standard}

THE SHOT
${JSON.stringify({ id: s.id, time: `${clock(s.f0 / hints.fps)}-${clock(s.f1 / hints.fps)}`, idea: s.idea, feel: s.feel, lens: s.fov ? `${s.fov} degrees` : undefined, subject: s.subject ?? undefined }, null, 1)}

THE IMAGES
${what}

MEASUREMENTS (hints: confirm them in the frames)
${JSON.stringify(hints.measured, null, 1)}

HOW TO JUDGE
- These are consecutive frames, one 30th of a second apart. Compare each tile with its neighbours. A body part, a prop, a camera or the whole picture that is somewhere else for one or two tiles and then back, or jumps to a new place with nothing in between, is a pop: rule "pop", sev A if a viewer at speed would see it break (a limb or the torso snapping, a prop teleporting, the camera lurching), B if small.
- The cut strip: the first frame of the new shot should already be the shot. A camera, head or body that moves sharply over frames 3 to 5 is the cut tweening: "pop".
- Flicker: a large patch (ceiling, floor, sky, a wall) that swaps colour or texture between neighbouring tiles is a render fault: rule "render", sev A when it is a big part of the frame.
- Large flat squares or shapes with no shading crossing in front of him are a render fault (unlit confetti): sev A if they hide him.
- Then the standard's rules on what you can see: contact (a hand holding a thing wraps it; nothing passes through anything), pose, weight, hold, face, staging, frame. A fist over an eye, a blade lying across the face, a point aimed at the floor, hands that never open when the idea says they do: those are "pose" or "story".
- Report only what you can point to in a tile, with its burned-in time. "certain" means plainly visible, "likely" small or dark. sev A breaks the viewer out, B a viewer would notice, C minor.
- NOT faults: darkness, grain, strobes and colour effects meant as a look, letterbox, low detail from the crop, a snow frame at a cut, motion blur, the previous shot's two frames at the start of a cut strip, and a cut itself.
- A clean strip gets an empty list. One plain sentence in summary.`;
}

async function askVision(gen, model, prompt, images, label) {
  let job;
  for (let tries = 0; ; tries++) {
    try { job = await gen.run('llm.json', { params: { prompt, model, effort: 'medium', maxTokens: 3000, schema: SCHEMA }, inputs: { images }, labels: { review: label } }); break; }
    catch (e) { if (tries >= 3) throw e; await new Promise((r) => setTimeout(r, 4000 * (tries + 1))); }
  }
  const r = job.result ?? {}, u = r.usage ?? {}, [pi, po] = PRICES[r.model ?? model] ?? PRICES['claude-sonnet-5-5'];
  const tokensIn = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1;
  return { ...r.value, model: r.model ?? model, tokens: { in: Math.round(tokensIn), out: u.output_tokens ?? 0 }, cost: round((tokensIn * pi + (u.output_tokens ?? 0) * po) / 1e6, 4) };
}

// ---------- the report ----------

function writeReport(dir, V, a, label, shots, results, meta) {
  const faults = [];
  for (const q of results) for (const f of q.faults ?? []) faults.push({ ...f, shot: q.id });
  faults.sort((x, y) => x.t - y.t);
  const by = (sev) => faults.filter((f) => f.sev === sev && f.seen === 'certain');
  const likely = faults.filter((f) => f.seen !== 'certain');
  const row = (f) => `| ${clock(f.t)} | f${Math.round(f.t * a.fps)} | ${f.shot} | ${f.what.replace(/\|/g, '/')} | ${f.fix.replace(/\|/g, '/')} |`;
  const table = (list) => ['| Time | Frame | Shot | Fault | Fix |', '|---|---|---|---|---|', ...list.map(row)];
  const A = by('A'), B = by('B'), C = by('C');
  const md = [`# ${V.name} ${label}: 30 fps review`, '', `Video: \`${path.relative(ROOT, a.video).replace(/\\/g, '/')}\`, ${clock(a.frames / a.fps)}, ${a.w}x${a.h}, ${a.fps} fps, ${a.frames} frames. Written by \`mv review\` ${new Date().toISOString().slice(0, 16)}. Times are video seconds; f is the frame. Shots are ${meta.wholeCut ? 'named from cards.map.json' : meta.offset !== undefined ? `the cards this shot render overlaps (its first frame is ${clock(meta.offset)} in the video; times here are the file's own)` : 'cut by detected cuts (the render is not the whole cut)'}.`, '', 'Severity: A breaks the viewer out, B noticeable, C minor. Only faults the reviewer called certain are in the tables; "likely" ones are listed at the end.', '',
    '## Verdict', '', `${A.length ? `**Not ready: ${A.length} A fault${A.length > 1 ? 's' : ''}.**` : '**No A faults.**'} ${B.length} B, ${C.length} C. ${meta.spikes} spikes and ${meta.cuts} cuts read as strips; ${meta.shotsReviewed} of ${shots.length} shots reviewed${meta.reused ? `, ${meta.reused} from the cache` : ''}${meta.carried ? `, ${meta.carried} carried unchanged from earlier reviews (same shot hash)` : ''}. Vision $${meta.cost.toFixed(2)}.`, ''];
  if (meta.worst) md.push(`Biggest spike in the video: ${clock(meta.worst.t)} in ${meta.worst.shot} (${meta.worst.why}).`, '');
  md.push('## A faults', '', ...(A.length ? table(A) : ['none']), '', '## B faults', '', ...(B.length ? table(B) : ['none']), '', '## C faults', '', ...(C.length ? table(C) : ['none']), '');
  if (likely.length) md.push('## Likely, not certain', '', ...table(likely), '');
  md.push('## Coverage', '', `- Metrics: all ${a.frames} frames at 160x90: frame difference, a one-frame came-back test and 8x6 block-matching flow with the camera's median shift taken out.`, `- Strips: every cut (${meta.cuts}) and ${meta.spikes} spikes, 8 consecutive frames each, cropped to him from the shot's lens and its motion. Faults between spikes and away from cuts can be missed: this reads about ${round((meta.cuts + meta.spikes) * 8 / a.frames * 100)}% of the frames at 30 fps.`, `- Not checked: audio, lip sync, playback at speed. J's eye at full speed stays the judge of feel.`, '');
  fs.writeFileSync(path.join(dir, 'report.md'), md.join('\n'));
  const rep = { video: V.name, label, render: a.video, when: new Date().toISOString(), frames: a.frames, fps: a.fps, a: A, b: B, c: C, likely, cost: round(meta.cost, 3), carried: meta.carried ?? 0, spikes: meta.spikes, cuts: meta.cuts, shots: results.map((q) => ({ id: q.id, from: q.f0 / a.fps, to: q.f1 / a.fps, strips: q.strips, summary: q.summary, faults: q.faults, reused: !!q.reused, carried: q.carried ?? null, cost: q.cost ?? 0 })) };
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(rep, null, 1));
  return rep;
}

// ---------- the run ----------

function parseArgs(argv) {
  const f = { _: [] };
  for (let i = 0; i < argv.length; i++) { const x = argv[i]; if (['--force', '--no-vision', '--plan'].includes(x)) f[x.slice(2)] = true; else if (x.startsWith('--')) f[x.slice(2)] = argv[++i]; else f._.push(x); }
  return f;
}

export async function reviewRender(V, render, { label, model = 'claude-sonnet-5-5', vision = true, force = false, jobs = 4, maxSpikes = 80, perShot = 3, quiet = false, offset, segments, plan = false } = {}) {
  label ??= path.basename(render, '.mp4').replace(/^.*-/, '');
  const base = mkdir(path.join(V.dir, 'review', label)), a = await analyse(render, path.join(V.dir, 'review', 'cache'));
  const { list: shots, wholeCut } = shotsOf(V, a, offset);
  if (!quiet) say(`${a.frames} frames, ${a.cuts.length} cuts seen, ${shots.length} shots${wholeCut ? '' : ' (by detected cuts)'}`);
  // Events: the cut into every shot, the shot's own worst spikes, and the video's biggest spikes on top up to the cap.
  let worst = null;
  for (const s of shots) {
    s.spikes = spikesOf(a, s, perShot);
    for (const x of s.spikes) if (!worst || a.d1[x.f] > a.d1[worst.f]) worst = { ...x, shot: s.id };
  }
  // Carry: a shot whose picture hasn't changed since an earlier review keeps that verdict (tools/mv/verdicts.mjs). Whole renders only.
  const segs = offset === undefined ? (segments ?? segmentsOf(V, render)) : null, store = loadStore(V), keyOpts = { model, standard: standardHash() };
  const carry = new Map();
  if (segs && !force) for (const x of carryPlan(shots, segs, store, keyOpts)) { if (x.carry) carry.set(x.id, x.carry); }
  const keyFor = new Map(segs ? carryPlan(shots, segs, store, keyOpts).map((x) => [x.id, x.key]) : []);
  if (plan) {
    const ask = shots.filter((s) => !carry.has(s.id));
    if (!quiet) for (const s of shots) say(`${carry.has(s.id) ? 'carry ' : 'ASK   '} ${s.id.padEnd(18)} ${carry.has(s.id) ? `from ${carry.get(s.id).label}` : segs ? (keyFor.get(s.id) ? 'picture changed since any review' : 'frames not in the final') : 'not a final render: no shot hashes'}`);
    return { plan: true, shots: shots.length, ask: ask.map((s) => s.id), carried: shots.length - ask.length, segments: !!segs };
  }
  for (const s of shots) if (carry.has(s.id)) s.spikes = [];
  const all = shots.flatMap((s) => s.spikes.map((x) => ({ ...x, s }))).sort((p, q) => (q.d1 + q.flow * 3 + q.exc * 10 + (q.flick ?? 0) * 3) - (p.d1 + p.flow * 3 + p.exc * 10 + (p.flick ?? 0) * 3));
  const keep = new Set(all.slice(0, maxSpikes).map((x) => `${x.s.id}|${x.f}`));
  for (const s of shots) s.spikes = s.spikes.filter((x) => keep.has(`${s.id}|${x.f}`));
  let gen = null;
  if (vision) { const { HawkesGen } = await import('./mv/hawkesgen.mjs'); gen = new HawkesGen({ project: 'tkshock' }); }
  const results = [], errors = [], queue = [...shots];
  let reused = 0, cost = 0, nStrips = 0, carried = 0;
  const one = async (s) => {
    if (carry.has(s.id)) {
      const c = carry.get(s.id), q = { id: s.id, f0: s.f0, f1: s.f1, faults: c.faults ?? [], summary: c.summary, model: c.model, carried: c.label, strips: [] };
      const dir = mkdir(path.join(base, 'shots', s.id));
      fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify(q, null, 1));
      results.push(q); carried++;
      if (!quiet) say(`carry  ${s.id.padEnd(16)} from ${c.label}  ${q.faults.filter((f) => f.sev === 'A').length} A ${q.faults.filter((f) => f.sev === 'B').length} B`);
      return;
    }
    const dir = mkdir(path.join(base, 'shots', s.id)), crop = cropFor(a, s), strips = [];
    for (const f of fs.readdirSync(dir)) if (/\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f));
    if (s.f0 > 0) strips.push({ kind: 'cut', f: s.f0, t: round(s.f0 / a.fps, 3), from: round(Math.max(0, s.f0 - 2) / a.fps, 2), to: round((Math.max(0, s.f0 - 2) + 7) / a.fps, 2), crop: crop.how, file: strip(a.video, a, s.f0, crop, path.join(dir, 'cut.jpg')) });
    for (const x of s.spikes) {
      const first = Math.max(0, Math.min(a.frames - 8, x.f - 4)); // the jump is between tiles 4 and 5, so the frame before it is always in the strip
      strips.push({ kind: 'spike', f: x.f, t: x.t, why: x.why, from: round(first / a.fps, 2), to: round((first + 7) / a.fps, 2), crop: crop.how, file: strip(a.video, a, first + 2, crop, path.join(dir, `spike-${String(x.f).padStart(5, '0')}.jpg`)) });
    }
    nStrips += strips.length;
    const inside = []; for (let f = s.f0 + 2; f < s.f1 - 1; f++) inside.push(f);
    const measured = { fps: a.fps, medianDifference: round(median(inside.map((f) => a.d1[f]))), medianFlowResidual: round(median(inside.map((f) => a.flow[f]))), spikes: s.spikes.map((x) => ({ t: x.t, why: x.why })), cameraMoving: median(inside.map((f) => a.cam[f])) >= 1 };
    const q = { id: s.id, f0: s.f0, f1: s.f1, crop: crop.how, strips: strips.map((x) => ({ kind: x.kind, t: x.t, why: x.why, file: path.basename(x.file) })) };
    if (!strips.length) { q.faults = []; q.summary = 'too short to read'; results.push(q); return; }
    const prompt = promptFor(s, strips, { fps: a.fps, measured });
    const hash = crypto.createHash('sha1').update(prompt + model); for (const x of strips) hash.update(fs.readFileSync(x.file));
    q.hash = hash.digest('hex').slice(0, 16);
    const old = json(path.join(dir, 'review.json'));
    if (old?.hash === q.hash && old.faults && old.model && !force) { Object.assign(q, { faults: old.faults, summary: old.summary, model: old.model, reused: true }); reused++; }
    else if (gen) { const v = await askVision(gen, model, prompt, strips.map((x) => x.file), `${V.name}/${label}/${s.id}`); Object.assign(q, v); cost += v.cost ?? 0; }
    else { q.faults = []; q.summary = 'measurements only'; }
    for (const f of q.faults ?? []) if (typeof f.t !== 'number' || f.t < s.f0 / a.fps - 0.2 || f.t > s.f1 / a.fps + 0.2) f.t = Math.min(Math.max(f.t ?? s.f0 / a.fps, s.f0 / a.fps), s.f1 / a.fps);
    fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify(q, null, 1));
    results.push(q);
    if (!quiet) say(`${q.reused ? 'cache ' : 'review'} ${s.id.padEnd(16)} ${strips.length} strips  ${(q.faults ?? []).filter((f) => f.sev === 'A').length} A ${(q.faults ?? []).filter((f) => f.sev === 'B').length} B`);
  };
  await Promise.all(Array.from({ length: jobs }, async () => { for (let s; (s = queue.shift()); ) { try { await one(s); } catch (e) { errors.push(`${s.id}: ${e.message}`); say(`ERROR ${s.id}: ${e.message}`); } } }));
  results.sort((x, y) => x.f0 - y.f0);
  // Keep every real verdict by its key, so the next render's unchanged shots carry it.
  if (segs) {
    let kept = 0;
    for (const q of results) { const k = keyFor.get(q.id); if (k && !q.carried && q.model && Array.isArray(q.faults)) { store.entries[k] = { id: q.id, f0: q.f0, f1: q.f1, faults: q.faults, summary: q.summary, model: q.model, label, when: new Date().toISOString() }; kept++; } }
    if (kept) saveStore(V, store);
  }
  const rep = writeReport(base, V, a, label, shots, results, { wholeCut, offset, spikes: shots.reduce((n, s) => n + s.spikes.length, 0), cuts: shots.filter((s) => s.f0 > 0).length, shotsReviewed: results.filter((q) => q.faults).length, reused, carried, cost, worst });
  rep.carried = carried;
  if (offset) for (const l of [rep.a, rep.b, rep.c, rep.likely ?? []]) for (const f of l) f.t = round(f.t + offset, 3); // video seconds, as the Room counts them
  rep.errors = errors; rep.dir = base; rep.offset = offset ?? 0;
  return rep;
}

/** The A faults, one line each, for the end of `mv final`. */
export function printA(rep) {
  if (!rep.a.length) { console.log(`review: no A faults. ${rep.b.length} B, ${rep.c.length} C. ${path.join(rep.dir ?? '', 'report.md')}`); return; }
  console.log(`review: ${rep.a.length} A fault${rep.a.length > 1 ? 's' : ''} (${rep.b.length} B, ${rep.c.length} C):`);
  for (const f of rep.a) console.log(`  A ${clock(f.t)} ${f.shot}: ${f.what} Fix: ${f.fix}`);
  console.log(`  ${path.join(rep.dir ?? '', 'report.md')}`);
}

/** A report's certain A faults (B and C too with `sevs`) become Review Room notes with source "review", once each: the Room's QA tab, never J's Open list, never the note loop. Ones the report no longer has close. */
export async function sendNotes(V, label, { sevs = ['A'] } = {}) {
  const rep = json(path.join(V.dir, 'review', label, 'report.json'));
  if (!rep) throw new Error(`no review report ${label}`);
  const { moment, nextId, setStatus, updateNotes } = await import('../room/lib.mjs');
  const faults = sevs.flatMap((sev) => (rep[sev.toLowerCase()] ?? []).map((f) => ({ ...f, sev })));
  const keyOf = (f) => `${f.shot}|${f.sev}|${Math.round(f.t * 10)}`;
  const keys = new Set(faults.map(keyOf));
  return updateNotes(V.name, (notes) => {
    let added = 0, closed = 0;
    for (const n of notes) if (n.source === 'review' && n.reviewLabel === label && ['new', 'in progress'].includes(n.status) && !keys.has(n.reviewKey)) { setStatus(n, 'fixed', 'review', `The ${label} review no longer sees this`); closed++; }
    for (const f of faults) {
      const key = keyOf(f);
      if (notes.some((n) => n.source === 'review' && n.reviewKey === key && n.reviewLabel === label)) continue;
      const n = { id: nextId(notes), status: 'new', source: 'review', reviewLabel: label, reviewKey: key, text: `Review ${f.sev} (${label}): ${f.what}${f.fix ? ` Fix: ${f.fix}` : ''}`, ...moment(V.name, f.t), render: rep.render ? path.basename(rep.render) : null, version: null, frame: Math.round(f.t * (rep.fps || 30)), frameImage: null, images: [], created: new Date().toISOString(), history: [] };
      setStatus(n, 'new', 'review'); notes.push(n); added++;
    }
    return { added, closed, total: faults.length };
  });
}

/** An earlier review of a final's render, kept by shot hash: every shot of it with a real verdict goes into the store. No vision, no strips. */
export async function adopt(V, label, render) {
  const dir = path.join(V.dir, 'review', label), rep = json(path.join(dir, 'report.json'));
  if (!rep) throw new Error(`no review report ${label}`);
  render ??= rep.render;
  const segs = segmentsOf(V, render);
  if (!segs) throw new Error(`no shot hashes for ${path.basename(render)}: only a render mv final made (final/renders/ or its report.json) can be adopted`);
  const a = await analyse(render, path.join(V.dir, 'review', 'cache'));
  const { list } = shotsOf(V, a, undefined), byId = new Map(list.map((s) => [s.id, s]));
  const store = loadStore(V), opts = { model: null, standard: standardHash() };
  let kept = 0, skipped = 0;
  for (const x of rep.shots ?? []) {
    const q = json(path.join(dir, 'shots', x.id, 'review.json')), s = byId.get(x.id);
    if (!q?.model || !Array.isArray(q.faults) || !s || s.f0 !== q.f0 || s.f1 !== q.f1) { skipped++; continue; }
    const k = (await import('./mv/verdicts.mjs')).keyOf(segs, s, { ...opts, model: q.model });
    if (!k) { skipped++; continue; }
    store.entries[k] = { id: q.id, f0: q.f0, f1: q.f1, faults: q.faults, summary: q.summary, model: q.model, label, when: rep.when ?? new Date().toISOString() };
    kept++;
  }
  saveStore(V, store);
  return { kept, skipped, store: path.relative(ROOT, (await import('./mv/verdicts.mjs')).storeFile(V)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'test') {
  let bad = 0, n = 0; verdictTest((name, pass) => { n++; if (!pass) bad++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}`); });
  console.log(`${n - bad} of ${n} passed`); process.exitCode = bad ? 1 : 0;
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'adopt') {
  const flags = parseArgs(process.argv.slice(3)), V = pickVideo(flags._[0] ?? null);
  let render = flags._[2]; if (render && !fs.existsSync(render)) render = path.join(V.output, render);
  adopt(V, flags._[1] ?? fail('adopt <video> <label> [render]'), render).then((r) => console.log(JSON.stringify(r))).catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'notes') {
  // node Director/tools/review.mjs notes <video> <label> [--sevs A,B]
  const flags = parseArgs(process.argv.slice(3)), V = pickVideo(flags._[0] ?? null);
  sendNotes(V, flags._[1] ?? 'v9', { sevs: (flags.sevs ?? 'A').split(',') }).then((r) => console.log(JSON.stringify(r))).catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = parseArgs(process.argv.slice(2));
  const V = pickVideo(flags._[0] ?? flags.video ?? null);
  let render = flags._[1] ?? null;
  if (render && !fs.existsSync(render)) { const alt = path.join(V.output, render); if (fs.existsSync(alt)) render = alt; else { console.error('no such render: ' + render); process.exit(1); } }
  if (!render) {
    let f = []; try { f = fs.readdirSync(V.output); } catch {}
    render = f.filter((x) => /-v\d+\.mp4$/.test(x)).map((x) => path.join(V.output, x)).sort((p, q) => fs.statSync(q).mtimeMs - fs.statSync(p).mtimeMs)[0];
    if (!render) { console.error('nothing rendered yet'); process.exit(1); }
  }
  reviewRender(V, path.resolve(render), { label: flags.label, model: flags.model, vision: !flags['no-vision'], force: !!flags.force, jobs: +(flags.jobs ?? 4), maxSpikes: +(flags['max-spikes'] ?? 80), plan: !!flags.plan })
    .then((rep) => {
      if (rep.plan) { console.log(JSON.stringify({ shots: rep.shots, ask: rep.ask.length, carried: rep.carried, finalHashes: rep.segments })); process.exit(0); } printA(rep); console.log(JSON.stringify({ a: rep.a.length, b: rep.b.length, c: rep.c.length, spikes: rep.spikes, cuts: rep.cuts, cost: rep.cost, errors: rep.errors.length, report: path.join(rep.dir, 'report.md') })); process.exit(rep.a.length ? 2 : 0); })
    .catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
