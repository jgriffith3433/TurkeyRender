#!/usr/bin/env node
// The clip catalog: every humanoid clip in Assets/MusicVideo/Motion previewed on his rig through the NATIVE path, measured, watched and tagged by use,
// so a stager picks a proven clip instead of finding out at render time that it fans his fingers, folds him forward or flips a knee.
//   node Director/mv.mjs hold node Director/tools/clip_catalog.mjs previews [clip...] [--force --budget 600 --turn 900]
//       Unity (call clippreview, Editor/Native/MVClipPreview.cs): library/motion/previews/<clip>.mp4 (640x360, 30 fps, left: front three-quarter full
//       body, right: a medium on the upper body and hands; the clean clip where import.json says it is used, Foot IK as the native path sets it) and
//       <clip>.json (the per-clip measures). Skips clips that have both unless --force. Repeats calls of --budget seconds until --turn seconds are used.
//   node Director/tools/clip_catalog.mjs strips [clip...]   ffmpeg: previews/strips/<clip>.jpg, every 2nd frame (15 fps) of both cameras, six frames (0.4 s) a row,
//       time burned in, for stepping; previews/strips/<clip>_hands.jpg the medium camera at 30 fps through the busiest second.
//   node Director/tools/clip_catalog.mjs build              merges import.json, previews/*.json, motion/clips.json notes and motion/verdicts.json (the
//       hand-written verdicts) into catalog.md, catalog.html and the `catalog` section of library/clips.json.
//   node Director/tools/clip_catalog.mjs todo               clips with a preview and no verdict.
//   node Director/mv.mjs clips <tag> | clips                the best clips for a use (tools/mv/clipcat.mjs), or the tags.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE);
const LIB = path.join(ROOT, 'library', 'motion'), PREV = path.join(LIB, 'previews'), STRIPS = path.join(PREV, 'strips');
const CLIPS = path.join(ROOT, 'library', 'clips.json'), IMPORT = path.join(LIB, 'import.json'), NOTES = path.join(LIB, 'clips.json'), VERDICTS = path.join(LIB, 'verdicts.json');
const argv = process.argv.slice(2), flag = {}, names = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; else names.push(argv[i]); }
const cmd = names.shift();
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const run = (c, a, o = {}) => spawnSync(c, a, { encoding: 'utf8', maxBuffer: 1 << 26, ...o });
const imp = read(IMPORT, { clips: {} }).clips;
// Every clip in Motion/ (import.json), plus clips from elsewhere that a video uses and that were previewed by name (`previews <clip>`).
const extras = fs.existsSync(PREV) ? fs.readdirSync(PREV).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((c) => !imp[c]) : [];
const all = [...Object.keys(imp), ...extras].sort();

// The uses a clip can be tagged with, in the order catalog.md lists them, and what each means to a stager.
export const TAGS = {
  talk: 'talking to someone, standing or seated', listen: 'listening, small nods', react: 'a reaction to something said or seen', laugh: 'laughing',
  think: 'thinking, hand to chin', shrug: 'shrug, "who knows"', sigh: 'sigh, relief', gesture: 'a lyric or acting gesture (hands)', point: 'pointing',
  wave: 'a wave hello or goodbye', 'thumbs-up': 'thumbs up', clap: 'clapping', bow: 'bow', write: 'writing', drink: 'drinking',
  punch: 'a punch', kick: 'a kick', throw: 'a throw', catch: 'a catch', dodge: 'dodging a blow', 'hit-react': 'taking a hit', fall: 'falling, knocked flying',
  taunt: 'taunt, flex, showing off', scared: 'fear, cowering', lift: 'lifting something heavy', 'put-down': 'putting something down', pull: 'pulling, hauling a rope',
  'look-back': 'a look over the shoulder', fly: 'flying (superman, chase)', float: 'floating, drifting, treading water', sit: 'seated', kneel: 'kneeling',
  'stand-idle': 'standing idle, waiting', walk: 'walking', sneak: 'sneaking', run: 'running', turn: 'turning on the spot', stairs: 'stairs',
  crawl: 'crawling', injured: 'hurt, stumbling', dance: 'dancing', pose: 'a held pose or freeze', jump: 'jumping', transition: 'getting up, sitting down, kneeling down',
};

if (cmd === 'previews') {
  const budget = +(flag.budget || 600), turn = +(flag.turn || 900), t0 = Date.now();
  let left = names.length ? names : null;
  for (;;) {
    const args = { budget, ...(left ? { clips: left } : {}), ...(flag.force ? { force: true } : {}) };
    const r = run('node', [path.join(ROOT, 'mv.mjs'), '--video', flag.video || 'hawkespunch', 'call', 'clippreview', JSON.stringify(args)]);
    let res = null; try { res = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); } catch { }
    if (!res) { console.log(`clippreview failed: ${(r.stderr || r.stdout).slice(-600)}`); process.exitCode = 1; break; }
    for (const row of res.rows) console.log(row);
    console.log(`-- ${res.made} made in ${res.seconds} s, ${res.remaining.length} left`);
    if (!res.remaining.length) break;
    left = res.remaining;
    if ((Date.now() - t0) / 1000 + budget > turn) { console.log(`turn used; ${left.length} left: run previews again`); break; }
  }
} else if (cmd === 'strips') {
  fs.mkdirSync(STRIPS, { recursive: true });
  for (const clip of names.length ? names : all) {
    const mp4 = path.join(PREV, `${clip}.mp4`), js = read(path.join(PREV, `${clip}.json`), null);
    if (!fs.existsSync(mp4)) { console.log(`${clip}: no preview`); continue; }
    const frames = Math.round((js?.previewSeconds ?? 4) * 30), rows = Math.ceil(frames / 30);
    const stamp = `drawtext=text='%{eif\\:t\\:d}.%{eif\\:(t-trunc(t))*100\\:d\\:2}':fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:x=2:y=2`;
    // every 2nd frame, 15 a row (one second), 256x144 a cell
    const a = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', `${stamp},select='not(mod(n\\,2))',scale=256:144,tile=6x${Math.ceil(frames / 12)}:padding=2:color=0x202020`, '-frames:v', '1', '-q:v', '4', path.join(STRIPS, `${clip}.jpg`)]);
    if (a.status) console.log(`${clip}: strip failed ${a.stderr.slice(-300)}`);
    // the busiest second (peak hand speed), medium camera only, every frame
    const tp = Math.max(0, Math.min((js?.previewSeconds ?? 1) - 1, ((js?.peakHand?.t ?? 0.5) % (js?.length || 1e9)) - 0.5));
    const b = run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(tp), '-i', mp4, '-vf', `crop=iw/2:ih:iw/2:0,${stamp},scale=213:240,tile=10x3:padding=2:color=0x202020`, '-frames:v', '1', '-q:v', '4', path.join(STRIPS, `${clip}_hands.jpg`)]);
    if (b.status) console.log(`${clip}: hands strip failed ${b.stderr.slice(-300)}`);
    console.log(`${clip}: ${frames} frames, ${rows} s`);
  }
} else if (cmd === 'todo') {
  const v = read(VERDICTS, { clips: {} }).clips;
  console.log(all.filter((c) => fs.existsSync(path.join(PREV, `${c}.json`)) && !v[c]).join(' '));
} else if (cmd === 'build') {
  build();
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15).join('\n'));
}

function handNote(m) {
  const L = m?.handLeft, R = m?.handRight; if (!L || !R) return null;
  const worst = L.curlMean < R.curlMean ? ['left', L] : ['right', R];
  return `${worst[0]} hand curl ${worst[1].curlMean} deg mean, ${worst[1].curlMin} at its most open, straight and spread ${Math.round(worst[1].fannedFrac * 100)}% of frames; about 15 is flat, 70 relaxed, 160 a fist`;
}

function build() {
  const v = read(VERDICTS, { clips: {} }).clips, notes = read(NOTES, { clips: {} }).clips, cat = read(CLIPS, { clips: {} });
  const out = {};
  for (const clip of all) {
    const i = imp[clip] ?? { length: null, loop: null, travelling: false }, m = read(path.join(PREV, `${clip}.json`), null), n = notes[clip], vd = v[clip] ?? {};
    const used = i.clean?.use ? i.clean.clean : i.clean?.source;
    const stance = i.travelling ? 'travelling' : m?.stance === 'lying' ? 'lying' : m?.stance === 'low' ? 'low (seated or kneeling)' : m?.airborneFrac > 0.5 ? 'feet off the floor' : 'standing';
    out[clip] = {
      clip, grade: vd.grade ?? '?', uses: vd.uses ?? [], weak: vd.weak ?? [], needs: vd.needs ?? [], line: vd.line ?? '', watched: vd.watched ?? null,
      preview: fs.existsSync(path.join(PREV, `${clip}.mp4`)) ? `library/motion/previews/${clip}.mp4` : null,
      length: i.length ?? m?.length ?? null, loop: i.loop ?? m?.loop ?? null, stance, footIK: m?.footIK ?? i.choice?.footIK, clean: !!i.clean?.use, cleanWhy: i.clean?.why ?? null,
      jitterP99: used?.jitterP99 ?? null, snaps: used?.snaps ?? null, slideCmPerS: used?.footSlideCmPerS ?? null, kneeFlipWithFootIK: i.footIKTest?.kneeFlip ?? null,
      hands: m ? { left: m.handLeft, right: m.handRight } : null, handNote: handNote(m),
      handToFaceMinM: m?.handToFaceMinM ?? null, handToFaceFrames: m?.handToFaceFrames ?? null, handInBodyFrames: m?.handInBodyFrames ?? null,
      headYawDeg: m?.headYawDeg ?? null, headPitchDeg: m?.headPitchDeg ?? null, leanFwdMaxDeg: m?.leanFwdMaxDeg ?? null,
      kneeBackwardMaxDeg: m?.kneeBackwardMaxDeg ?? null, rootDriftM: m?.rootDriftM ?? i.travelM, rootFarthestM: m?.rootFarthestM ?? i.farthestM,
      hitT: vd.hit ?? ((vd.uses ?? []).some((u) => ['punch', 'kick', 'throw', 'catch', 'hit-react', 'clap', 'dodge'].includes(u)) ? (((vd.uses ?? []).includes('kick') ? m?.peakFoot?.t : m?.peakHand?.t) ?? null) : null),
      peakHand: m?.peakHand ?? null, peakFoot: m?.peakFoot ?? null,
      library: n ? { verdict: n.verdict, style: n.style, segments: n.segments } : null,
    };
  }
  // best first per tag: grade, then fewer weak spots, then steadier
  const rank = { A: 0, B: 1, C: 3, '?': 4, ban: 9 };
  const tags = {};
  for (const e of Object.values(out)) for (const u of e.uses) if (e.grade !== 'ban' && e.grade !== 'C') (tags[u] ??= []).push(e.clip);
  for (const t of Object.keys(tags)) tags[t].sort((a, b) => rank[out[a].grade] - rank[out[b].grade] || (out[a].weak.length - out[b].weak.length) || (out[a].jitterP99 ?? 9) - (out[b].jitterP99 ?? 9));
  cat.catalog = {
    about: 'The clip catalog (library/motion/catalog.md), written by tools/clip_catalog.mjs build from library/motion/verdicts.json (watched by hand) and the native previews\' measures. grade: A build on it, B usable with care, C avoid, ban never. uses: what it is good for; weak: uses it fails at; needs: what a card must add (relaxed grip: a fingers set). tags: the best clips per use, best first. scope: the clips the catalog covers (Assets/MusicVideo/Motion).',
    built: new Date().toISOString(), tags, scope: all, clips: out,
  };
  fs.writeFileSync(CLIPS + '.tmp', JSON.stringify(cat, null, 1)); fs.renameSync(CLIPS + '.tmp', CLIPS);
  writeMd(out, tags); writeHtml(out, tags);
  const graded = Object.values(out).filter((e) => e.grade !== '?').length;
  console.log(`catalog: ${all.length} clips, ${Object.values(out).filter((e) => e.preview).length} previews, ${graded} graded, ${Object.keys(tags).length} tags`);
}

function fmtHands(e) {
  const h = e.hands; if (!h?.left) return 'n/a';
  return `L ${h.left.curlMean}/${h.left.curlMin} R ${h.right.curlMean}/${h.right.curlMin} (fanned ${Math.round(Math.max(h.left.fannedFrac, h.right.fannedFrac) * 100)}%)`;
}

function writeMd(out, tags) {
  const L = ['# Clip catalog', '',
    'Every humanoid clip in `Assets/MusicVideo/Motion`, played on his rig the way a native actor plays it (Unity\'s Animator, the clean clip where it is used, the clip\'s Foot IK verdict), previewed and judged by use. Pick from here before staging; `mv clips <use>` prints the best for a use and `mv lint` warns when a card uses a clip the catalog calls weak for what the card is about, a banned clip, a clip with no preview or verdict, or a finger-fanning clip with no grip. Open `catalog.html` for the previews in a grid with filters.', '',
    'Previews: `previews/<clip>.mp4`, 640x360 30 fps, left a front three-quarter full body, right a medium on the upper body and hands, up to 6 s (loops repeat to 3 s, one-shots hold 0.5 s). Strips for stepping: `previews/strips/<clip>.jpg` (15 fps, 0.4 s a row) and `<clip>_hands.jpg` (30 fps through the busiest second). Measures over the whole clip at 30 fps, in `previews/<clip>.json`: hand curl in degrees (0 a flat fanned hand, 90 a loose fist; mean/most open), hands near the face (palm within 10 cm of the face) and inside the body (palm within 8 cm of the spine line), head yaw against the chest, forward lean of hips to neck, knee bent the wrong way (advisory only: the graders found it fires on folded, kneeling and locked-straight legs and matched a real fault only on `mx_sit_to_stand` and `mx_stairs_down`), hips drift. Jitter (deg/frame² p99, 60 Hz), snaps (steps over 8°) and slide (cm/s) are the played clip\'s from `import.json`.', '',
    'Grades: **A** build on it, **B** usable with care (see weak and needs), **C** avoid, **ban** never (lint warns on every use). Verdicts are hand-written in `verdicts.json` (per group in `verdicts/`, brief in `verdicts/BRIEF.md`), graded 2026-11-07 by watching each preview strip at 15 fps and stepping 30 fps bursts at the moments that matter. Previews of clips over 8 s show only their busiest 8 s, so parts of long dance clips were not seen (their lines say so). Walks play in place in the previews, so their feet skate: judge them with `walk` or `root:1`.', '', '## Best per use', ''];
  for (const t of Object.keys(TAGS)) if (tags[t]) L.push(`- **${t}** (${TAGS[t]}): ${tags[t].slice(0, 6).map((c) => `\`${c}\` ${out[c].grade}`).join(', ')}`);
  const banned = Object.values(out).filter((e) => e.grade === 'ban' || e.grade === 'C');
  L.push('', '## Banned and avoid', '', ...banned.map((e) => `- \`${e.clip}\` (${e.grade}): ${e.line}`), '', '## Every clip', '',
    '| clip | grade | uses | verdict | len s | loop | stance | foot IK | clean | jitter / snaps / slide | hands curl mean/min | face / body frames | head yaw | lean max | knee back | drift m | hit s |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const e of Object.values(out)) L.push(`| [\`${e.clip}\`](previews/${e.clip}.mp4) | ${e.grade} | ${e.uses.join(' ')} | ${e.line.replace(/\|/g, '/')} | ${e.length} | ${e.loop ? 'y' : ''} | ${e.stance} | ${e.footIK ? 'on' : ''} | ${e.clean ? 'clean' : 'raw'} | ${e.jitterP99} / ${e.snaps} / ${e.slideCmPerS} | ${fmtHands(e)} | ${e.handToFaceFrames ?? ''} / ${e.handInBodyFrames ?? ''} | ${e.headYawDeg ? e.headYawDeg.join('..') : ''} | ${e.leanFwdMaxDeg ?? ''} | ${e.kneeBackwardMaxDeg || ''} | ${e.rootDriftM ?? ''} | ${e.hitT ?? ''} |`);
  fs.writeFileSync(path.join(LIB, 'catalog.md'), L.join('\n') + '\n');
}

function writeHtml(out, tags) {
  const data = Object.values(out).map((e) => ({ c: e.clip, g: e.grade, u: e.uses, w: e.weak, n: e.needs, l: e.line, p: e.preview ? `previews/${e.clip}.mp4` : null, s: e.stance, h: fmtHands(e), len: e.length, cl: e.clean }));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clip catalog</title>
<style>
:root{--bg:#16181c;--card:#22252b;--fg:#e8e6e1;--dim:#9a9890;--a:#5fbf7a;--b:#d9b64a;--c:#d9734a;--ban:#c94a4a}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);padding:10px 16px;border-bottom:1px solid #333;z-index:2}
h1{font-size:18px;margin:0 0 8px}.tags{display:flex;flex-wrap:wrap;gap:6px}
button{background:var(--card);color:var(--fg);border:1px solid #444;border-radius:14px;padding:3px 10px;cursor:pointer;font:inherit;font-size:13px}
button.on{background:#3d6fd9;border-color:#3d6fd9}input{background:var(--card);color:var(--fg);border:1px solid #444;border-radius:6px;padding:4px 8px;margin-right:8px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;padding:16px}
.card{background:var(--card);border-radius:8px;overflow:hidden}.card video{width:100%;display:block;aspect-ratio:16/9;background:#000}
.meta{padding:8px 10px}.name{font-weight:600}.g{float:right;font-weight:700}.gA{color:var(--a)}.gB{color:var(--b)}.gC{color:var(--c)}.gban{color:var(--ban)}.g\\?{color:var(--dim)}
.line{color:var(--fg);margin:4px 0}.small{color:var(--dim);font-size:12px}
</style></head><body><header><h1>Clip catalog</h1><input id="q" placeholder="search"><label class="small"><input type="checkbox" id="ok" checked> hide C and banned</label><div class="tags" id="tags"></div></header><main id="grid"></main>
<script>
const D=${JSON.stringify(data)};const T=${JSON.stringify(Object.keys(TAGS).filter((t) => tags[t]))};let tag=null;
const tg=document.getElementById('tags');for(const t of ['all',...T]){const b=document.createElement('button');b.textContent=t;b.onclick=()=>{tag=t==='all'?null:t;draw()};tg.appendChild(b)}
const io=new IntersectionObserver(es=>{for(const e of es){const v=e.target;if(e.isIntersecting){if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{})}else v.pause()}},{rootMargin:'200px'});
function draw(){const q=document.getElementById('q').value.toLowerCase(),ok=document.getElementById('ok').checked;for(const b of tg.children)b.className=(b.textContent===(tag||'all'))?'on':'';
const g=document.getElementById('grid');g.innerHTML='';const rank={A:0,B:1,'?':2,C:3,ban:4};
for(const e of D.filter(e=>(!tag||e.u.includes(tag))&&(!ok||(e.g!=='C'&&e.g!=='ban'))&&(e.c+e.l+e.u.join(' ')).toLowerCase().includes(q)).sort((a,b)=>tag?(D.indexOf(a)-D.indexOf(b)):rank[a.g]-rank[b.g]||a.c.localeCompare(b.c))){
const d=document.createElement('div');d.className='card';d.innerHTML=(e.p?'<video muted loop playsinline preload="none" data-src="'+e.p+'"></video>':'<div style="aspect-ratio:16/9;display:grid;place-items:center" class="small">no preview</div>')+'<div class="meta"><span class="g g'+e.g+'">'+e.g+'</span><span class="name">'+e.c+'</span><div class="line">'+(e.l||'not graded')+'</div><div class="small">'+e.u.join(', ')+(e.w.length?' &middot; weak: '+e.w.join(', '):'')+(e.n.length?' &middot; needs: '+e.n.join(', '):'')+'</div><div class="small">'+e.len+' s &middot; '+e.s+' &middot; '+(e.cl?'clean':'raw')+' &middot; hands '+e.h+'</div></div>';
g.appendChild(d);const v=d.querySelector('video');if(v)io.observe(v)}}
document.getElementById('q').oninput=draw;document.getElementById('ok').onchange=draw;draw();
</script></body></html>`;
  fs.writeFileSync(path.join(LIB, 'catalog.html'), html);
}
