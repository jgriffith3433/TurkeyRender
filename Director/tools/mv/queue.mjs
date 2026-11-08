// One Unity, one queue. Every mv call that touches Unity takes a ticket in Director/gen/queue/ and waits its turn, first come first
// served. A ticket belongs to a running process: it goes when the process goes, however it dies, so a lock can't be left behind.
// Nested calls (mv hold ..., tools that run mv) share the ticket through MV_TICKET.
// Director/gen/unity.lock is kept for old habits: the queue writes it while it holds, and waits for a hand-made one.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const STALE_MS = 120000, BEAT_MS = 2000, HAND_LOCK_WAIT_MS = 90000, HAND_LOCK_OLD_MS = 600000;

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function tickets(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const p = path.join(dir, f);
    try {
      const t = JSON.parse(fs.readFileSync(p, 'utf8'));
      const age = Date.now() - fs.statSync(p).mtimeMs;
      if (!alive(t.pid) || age > STALE_MS) { try { fs.unlinkSync(p); } catch {} continue; } // gone, or hung: its turn is over
      out.push({ ...t, file: p, age });
    } catch {} // half written: next look
  }
  return out;
}

export class Queue {
  constructor(genDir) { this.dir = path.join(genDir, 'queue'); this.lock = path.join(genDir, 'unity.lock'); this.mine = null; this.timer = null; this.nested = false; }

  /** Waits for its turn. Returns how long that took. */
  async enter(label, onWait) {
    const inherited = process.env.MV_TICKET;
    if (inherited && fs.existsSync(inherited)) { this.nested = true; return 0; }
    const t0 = Date.now();
    fs.mkdirSync(this.dir, { recursive: true });
    const name = `${String(Date.now()).padStart(15, '0')}-${process.pid}-${randomUUID().slice(0, 6)}.json`;
    this.mine = path.join(this.dir, name);
    fs.writeFileSync(this.mine, JSON.stringify({ pid: process.pid, label, since: new Date().toISOString() }));
    this.timer = setInterval(() => { try { const n = new Date(); fs.utimesSync(this.mine, n, n); } catch {} }, BEAT_MS);
    const bye = () => this.leave();
    process.once('exit', bye);
    for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(s, () => { this.leave(); process.exit(130); });
    let said = 0, handSince = 0;
    for (;;) {
      const q = tickets(this.dir);
      if (q[0]?.file === this.mine) {
        const hand = this.handLock();
        if (!hand) break;
        handSince ||= Date.now();
        if (Date.now() - handSince > HAND_LOCK_WAIT_MS) {
          this.leave();
          throw new Error(`Director/gen/unity.lock was made by hand ("${hand}") and hasn't gone in ${HAND_LOCK_WAIT_MS / 1000} s. mv queues by itself now: if that lock is yours, delete it and run this again. Hold several calls together with mv hold.`);
        }
      }
      if (Date.now() - said > 20000) { said = Date.now(); onWait?.(q.findIndex((x) => x.file === this.mine), q[0]?.label); }
      await sleep(q[0]?.file === this.mine ? 1000 : 150);
    }
    fs.writeFileSync(this.lock, `queue ${label} ${process.pid}`);
    process.env.MV_TICKET = this.mine;
    return Date.now() - t0;
  }

  /** The text of a unity.lock this queue didn't write, or null. Old ones go, as TEAM.md said they could. */
  handLock() {
    let s; try { s = fs.readFileSync(this.lock, 'utf8').trim(); } catch { return null; }
    if (s.startsWith('queue ')) return null;
    if (Date.now() - fs.statSync(this.lock).mtimeMs > HAND_LOCK_OLD_MS) { try { fs.unlinkSync(this.lock); } catch {} return null; }
    return s || 'no name';
  }

  leave() {
    if (this.nested || !this.mine) return;
    clearInterval(this.timer);
    try { if (fs.readFileSync(this.lock, 'utf8').startsWith('queue ')) fs.unlinkSync(this.lock); } catch {}
    try { fs.unlinkSync(this.mine); } catch {}
    this.mine = null; delete process.env.MV_TICKET;
  }
}
