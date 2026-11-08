// Who references what. `mv refs <name>` lists every file:line in the video's folder and in Director/tools that names a card, actor, mark, clip,
// bed or sound file, so a card can be removed knowing what will break (the p_glass case: a bed named a shot that was no longer in the cut).
// Also the data-side reference checks lint runs: refProblems(v) below.
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT, DIRECTOR } from './score.mjs';

const TEXT = /\.(json|jsonc|yaml|yml|mjs|js|py|md|txt)$/i;
const SKIP_DIR = /^(_backup|captures|shots|final|review|review-strips|stems|output|storyboard|notes|previs.*|node_modules)$/i;

function* walk(d, depth = 0) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.test(e.name) && depth < 3) yield* walk(p, depth + 1); continue; }
    if (TEXT.test(e.name) && fs.statSync(p).size < 4e6) yield p;
  }
}

/** [{file, line, text}] for a whole-word mention of `name`. */
export function refs(V, name) {
  const re = new RegExp(`(^|[^\\w.])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`), out = [];
  const roots = [V.dir, path.join(DIRECTOR, 'tools'), path.join(DIRECTOR, 'library')];
  for (const r of roots) for (const f of walk(r)) {
    let lines; try { lines = fs.readFileSync(f, 'utf8').split('\n'); } catch { continue; }
    lines.forEach((l, i) => { if (re.test(l)) out.push({ file: path.relative(PROJECT, f).replace(/\\/g, '/'), line: i + 1, text: l.trim().slice(0, 140) }); });
  }
  return out;
}

export function printRefs(V, name) {
  const r = refs(V, name);
  if (!r.length) { console.log(`nothing names '${name}' in ${path.relative(PROJECT, V.dir)}, Director/tools or Director/library`); return r; }
  const byFile = new Map(); for (const x of r) byFile.set(x.file, [...(byFile.get(x.file) ?? []), x]);
  for (const [f, xs] of byFile) { console.log(`${f} (${xs.length})`); for (const x of xs.slice(0, 8)) console.log(`  ${String(x.line).padStart(5)}  ${x.text}`); if (xs.length > 8) console.log(`  ... ${xs.length - 8} more`); }
  console.log(`${r.length} references in ${byFile.size} files`);
  return r;
}

/**
 * Reference problems lint can't see from the compiled score alone: a `shot`/`card` anchor in any data file of the video naming a card not in the cut,
 * and a cut entry's `after` naming a shot that isn't there. [{sev, code, file, line, msg, fix}].
 */
export function refProblems(V) {
  const out = [];
  let ids = null; try { ids = new Set(JSON.parse(fs.readFileSync(path.join(V.dir, 'cards.map.json'), 'utf8')).map((m) => m.id)); } catch {}
  let cut = null; try { cut = JSON.parse(fs.readFileSync(path.join(V.dir, 'cut.json'), 'utf8').replace(/^\s*\/\/.*$/gm, '')); } catch {}
  if (cut?.shots) {
    const inCut = new Set(cut.shots.map((s) => s.id));
    cut.shots.forEach((s, i) => { if (s.after && !inCut.has(s.after)) out.push({ sev: 'error', code: 'unknown-shot', file: rel(V, 'cut.json'), line: 0, msg: `shot '${s.id}' (entry ${i + 1}) comes "after" '${s.after}', which is not in the cut`, fix: `Name a shot in cut.json, or drop "after". mv refs ${s.after} shows who else names it.` }); });
    ids ??= inCut;
  }
  if (!ids) return out;
  for (const f of walk(V.dir)) {
    if (!/\.(json|jsonc)$/i.test(f) || /cards\.map\.json|generated\.json|song\.json|marks\.json|lint-baseline|bake-report|cut\.json$/i.test(f)) continue;
    let lines; try { lines = fs.readFileSync(f, 'utf8').split('\n'); } catch { continue; }
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/"(shot|card)"\s*:\s*"([^"]+)"/g)) if (!ids.has(m[2])) out.push({ sev: 'error', code: 'unknown-shot', file: path.relative(PROJECT, f).replace(/\\/g, '/'), line: i + 1, msg: `${m[1]} '${m[2]}' is not in the cut`, fix: `It was removed or renamed. mv refs ${m[2]} lists everything that still names it; fix each, then run the tool that owns this file.` });
    });
  }
  return out;
}
const rel = (V, f) => path.relative(PROJECT, path.join(V.dir, f)).replace(/\\/g, '/');
