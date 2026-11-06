// Measures real playback speed of the Timeline: scene seconds per wall-clock second, at several points of the video.
import { execFileSync as x } from 'node:child_process';
const mv = (...a) => x('node', ['Director/mv.mjs', ...a], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const now = () => JSON.parse(mv('status')).time;
for (const start of process.argv.slice(2).map(Number)) {
  mv('play', `${start}s`);
  const a = now(), t0 = Date.now();
  await new Promise((r) => setTimeout(r, 3000));
  const b = now(), t1 = Date.now();
  console.log(`from ${start}s: ${((b - a) / ((t1 - t0) / 1000)).toFixed(2)}x real time`);
  mv('pause');
}
mv('seek', '0');
