// mv freeze / mv thaw: a hash of the engine (Assets/MusicVideo C# and shaders; on a native video also Editor/Native: NativeCompile, MVClipClean,
// MVClipImport) and the person model, kept per video in videos/<v>/freeze.json. Clips, clean clips and import settings are per shot (shotdeps).
// While frozen, `mv final --plan` warns in red when either changed (every shot would re-render) and `mv cards` warns on any C# change.
// The rule: engine and model changes before the slice; frozen after. See PIPELINE.md ("Freeze the engine").
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT, loadScore } from './score.mjs';
import { engineHash, nativeActors } from './shotdeps.mjs';

const file = (V) => path.join(V.dir, 'freeze.json');
const sha = (h) => h.digest('hex').slice(0, 16);

function walk(dir, test, hash) {
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)); } catch { return; }
  for (const e of names) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, hash);
    else if (test(e.name)) hash.update(e.name).update(fs.readFileSync(p));
  }
}

/** Every C# file under Assets/MusicVideo, tools included: a wider net than the engine hash, for the warning on `mv cards`. */
export function codeHash() { const h = crypto.createHash('sha256'); walk(path.join(PROJECT, 'Assets', 'MusicVideo'), (n) => /\.cs$/.test(n), h); return sha(h); }
/** His model: Assets/MusicVideo/Person (FBX, materials, textures), by content. */
export function modelHash() { const h = crypto.createHash('sha256'); walk(path.join(PROJECT, 'Assets', 'MusicVideo', 'Person'), (n) => !/\.meta$/.test(n), h); return sha(h); }

/** True when any human in the video plays on the native path, so its compile files are part of the engine. */
export function isNative(V) { try { return nativeActors(V.name, loadScore(V).score).size > 0; } catch { return false; } }
export const current = (V) => { const native = V ? isNative(V) : false; return { engine: engineHash({ native }), native, code: codeHash(), model: modelHash() }; };
export const frozen = (V) => { try { return JSON.parse(fs.readFileSync(file(V), 'utf8')); } catch { return null; } };

export function freeze(V, note) {
  const f = { ...current(V), at: new Date().toISOString(), note: note ?? null };
  fs.writeFileSync(file(V), JSON.stringify(f, null, 1));
  return f;
}
export function thaw(V) { const was = frozen(V); try { fs.unlinkSync(file(V)); } catch {} return was; }

/** What moved since the freeze: { frozen, engine, model, code } booleans, or null when not frozen. */
export function drift(V) {
  const f = frozen(V);
  if (!f) return null;
  const now = current(V);
  return { frozen: f, engine: now.engine !== f.engine, model: now.model !== f.model, code: now.code !== f.code };
}

const RED = '\x1b[31m', OFF = '\x1b[0m';
/** The warning for `mv final --plan`, red, or null. */
export function finalWarning(V, shots) {
  const d = drift(V);
  if (!d || (!d.engine && !d.model)) return null;
  const what = [d.engine && `the engine (Assets/MusicVideo Runtime C# or shaders${d.frozen.native ? ', or the native compile: Editor/Native' : ''})`, d.model && 'his model (Assets/MusicVideo/Person)'].filter(Boolean).join(' and ');
  return `${RED}FROZEN since ${d.frozen.at.slice(0, 16)}${d.frozen.note ? ` (${d.frozen.note})` : ''}, and ${what} changed since. Every shot would re-render${shots ? ` (all ${shots})` : ''}. Put the change back, or mv thaw and accept a full render.${OFF}`;
}
/** The warning for `mv cards` / `mv build`, or null. */
export function buildWarning(V) {
  const d = drift(V);
  if (!d || !d.code) return null;
  return `${RED}note: ${V.name} is frozen (${d.frozen.at.slice(0, 16)}) and C# under Assets/MusicVideo changed since.${d.engine ? ' The engine hash moved: a final would re-render every shot.' : ' The engine hash is the same, so finals still reuse shots.'}${OFF}`;
}
export function statusText(V) {
  const d = drift(V);
  if (!d) return `${V.name}: not frozen. mv freeze [--note "..."] locks the engine and model hashes; from then on a change to either is a warning on mv final --plan.`;
  return `${V.name}: frozen ${d.frozen.at}${d.frozen.note ? ` (${d.frozen.note})` : ''}. engine ${d.engine ? 'CHANGED' : 'same'}, model ${d.model ? 'CHANGED' : 'same'}, C# ${d.code ? 'changed' : 'same'}.`;
}
