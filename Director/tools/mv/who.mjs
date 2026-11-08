// Who is running this tool: the agent's name for leases, the compile lock and the WORKLOG. Set MV_WHO=<role> in the agent's shell
// (`MV_WHO=sound node Director/mv.mjs ...`), or pass --who. Without either it is the OS user and the pid, which says little in a log.
import os from 'node:os';

export function who(flag) {
  const w = flag || process.env.MV_WHO;
  if (w) return String(w).trim().replace(/\s+/g, '-').slice(0, 40);
  let u = 'someone'; try { u = os.userInfo().username; } catch {}
  return `${u}#${process.pid}`;
}

export const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
