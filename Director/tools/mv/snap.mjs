// mv snap <image...>: copies each image to a new, timestamped file and prints the path. Read THAT path. A file rewritten under the same name
// (mv frame, mv sheet, a shot's sheet.jpg) can come back from a reader's cache as the OLD picture; a fresh name can't. Reviewers use this for every
// render they judge. Files go to the agent's scratchpad when CLAUDE_SCRATCHPAD or MV_SNAP_DIR is set, else Director/gen/snap/ (cleaned by mv doctor --fix after a day).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DIRECTOR } from './score.mjs';

export function snapDir() { return process.env.MV_SNAP_DIR || process.env.CLAUDE_SCRATCHPAD || path.join(DIRECTOR, 'gen', 'snap'); }

export function snap(files) {
  const dir = snapDir(); fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) throw new Error(`mv snap: no file ${f}`);
    const buf = fs.readFileSync(f), st = fs.statSync(f);
    const name = `${path.basename(f, path.extname(f))}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 6)}${path.extname(f)}`;
    const to = path.join(dir, name);
    fs.writeFileSync(to, buf);
    out.push({ from: f, to, bytes: buf.length, written: st.mtime.toISOString() });
  }
  return out;
}

export function run(pos) {
  if (!pos.length) throw new Error('mv snap <image...>   copies to a fresh timestamped file; read that path');
  for (const s of snap(pos)) console.log(`${s.to}   (${(s.bytes / 1024).toFixed(0)} KB, source written ${s.written})`);
}

/** Snaps older than a day. */
export function sweep(maxAgeMs = 86400e3) {
  const dir = path.join(DIRECTOR, 'gen', 'snap'), out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (Date.now() - fs.statSync(p).mtimeMs > maxAgeMs) { fs.unlinkSync(p); out.push(f); } }
  return out;
}
