// Part 4, bars 34-40: THE FALL. Called from p34_build.mjs (its last step), so this all lands in acts/03-the-pull.json.
// He falls down a real shaft: the living room, stacked on itself, floor after floor, the walls and everything bolted to them
// rushing up past him. He hits a beam, grabs a bird, it goes for his face, he throws it off and catches a ledge. The world stops.
// Every ledge is lined with birds and their eyes come on, line by line, word by word. One bites his fingers. He drops, lands on a
// giant bird, rides it, the couch comes down the shaft and takes him off it, and the couch goes through the last floor into the night.
// He stays at FALL; the shaft moves. It repeats every PERIOD metres, so it can loop without showing a seam.
// Body acting is pose to pose: key() sets a whole pose with a clear line of action, each hit has anticipation, the hit, a settle.
export function fall({ C, T, r3, shot, on, hit, song, actors, lights, FALL, GO }) {
  const P = (x, y, z) => [r3(FALL[0] + x), r3(FALL[1] + y), r3(FALL[2] + z)];
  const PARK = [5000, -100, 0]; // out of everyone's way before and after
  const STORY = 2.8, PERIOD = STORY * 5;
  const act = (at, verb, extra) => C({ at: r3(at), do: verb, on: 'person', ...extra });
  const SFX = (at, name, volume = 0.7) => C({ at: r3(at), sfx: `Assets/MusicVideo/Sfx/${name}.mp3`, volume });
  let seed = 12345; const rnd = (a = 0, b = 1) => { seed = (seed * 1664525 + 1013904223) >>> 0; return a + (seed / 4294967296) * (b - a); };

  // Moments. Kicks fall on x:1.75, x:2.5, x:3.75, x:4.5.
  const BEAM = T('34:3.75'), GRAB = T('35:2.5'), PECK1 = T('35:3.75'), SHOVE = T('36:3.75'), SLAM = 99.18, RELEASE = T('38:1.75'), LAND = T('38:2.5');
  const COUCH = T('39:1.75'), BONK = T('39:3.75'), FLOOR = T('40:1.75'), OUT = T('40:3.75'), END = T('41:1');

  // ------------------------------------------------------------- KEY POSES
  // Degrees on top of the clip, in his own frame: x tips the top of a bone to his front, z rolls it to his left.
  // A leg hangs down, so -x brings the knee up. Every pose names the whole body, so nothing is left over from the last one.
  const ALL = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'];
  const POSE = {
    // Thrown flat, back bowed, head back, limbs behind him: the C of a body blown off a floor.
    BOW: { spine: [-16, 0, 0], chest: [-20, 0, 0], neck: [-10, 0, 0], head: [-16, 0, 0], leftUpperLeg: [14, 0, 10], rightUpperLeg: [20, 0, -10], leftLowerLeg: [38, 0, 0], rightLowerLeg: [20, 0, 0] },
    // Curling up after it, chin in, one knee high: climbing the air.
    CLIMBL: { spine: [16, 8, 0], chest: [18, 12, -6], neck: [8, 0, 0], head: [12, 0, 0], leftUpperLeg: [-62, 0, 8], rightUpperLeg: [18, 0, -6], leftLowerLeg: [76, 0, 0], rightLowerLeg: [32, 0, 0] },
    CLIMBR: { spine: [14, -8, 0], chest: [18, -12, 6], neck: [8, 0, 0], head: [12, 0, 0], leftUpperLeg: [20, 0, 6], rightUpperLeg: [-66, 0, -8], leftLowerLeg: [30, 0, 0], rightLowerLeg: [80, 0, 0] },
    // He feels it coming: head down between the shoulders, knees in.
    BRACE: { spine: [22, 0, 0], chest: [20, 0, 0], neck: [10, 0, 0], head: [10, 0, 0], leftUpperLeg: [-70, 0, 10], rightUpperLeg: [-58, 0, -10], leftLowerLeg: [86, 0, 0], rightLowerLeg: [80, 0, 0] },
    // Broken backward over the beam: hips driven through, shoulders and feet thrown away from it.
    WHIP: { hips: [-14, 0, 0], spine: [-32, 0, 0], chest: [-32, 0, 0], neck: [-20, 0, 0], head: [-26, 0, 0], leftUpperLeg: [42, 0, 14], rightUpperLeg: [50, 0, -14], leftLowerLeg: [14, 0, 0], rightLowerLeg: [30, 0, 0], leftUpperArm: [30, 0, 30], rightUpperArm: [30, 0, -30] },
    // Slack, the rag-doll beat after it: everything lags.
    SLACK: { spine: [8, 6, 8], chest: [10, 0, 6], neck: [10, 0, 10], head: [14, 0, 14], leftUpperLeg: [-22, 0, 4], rightUpperLeg: [8, 0, -8], leftLowerLeg: [44, 0, 0], rightLowerLeg: [60, 0, 0] },
    // Sees the bird, whole body points at it, a long diagonal from the far foot to the fingers.
    LUNGE: { spine: [6, 14, -8], chest: [8, 22, -10], neck: [0, 10, -4], head: [0, 12, 0], leftUpperLeg: [52, 0, 12], rightUpperLeg: [-46, 0, -10], leftLowerLeg: [34, 0, 0], rightLowerLeg: [84, 0, 0] },
    // Got it. Pulled in, proud, weight swung against the bird.
    GOTIT: { spine: [-10, -10, 8], chest: [-14, -12, 8], neck: [0, 0, 0], head: [-6, 16, 0], leftUpperLeg: [-30, 0, 12], rightUpperLeg: [-48, 0, -6], leftLowerLeg: [64, 0, 0], rightLowerLeg: [40, 0, 0] },
    // Holding it off, arms locked, head turned away: leaning out of the frame from his own hands.
    FEND: { spine: [-16, 12, 6], chest: [-18, 16, 8], neck: [-8, 8, 0], head: [-10, 14, 6], leftUpperLeg: [-54, 0, 14], rightUpperLeg: [-20, 0, -12], leftLowerLeg: [70, 0, 0], rightLowerLeg: [30, 0, 0] },
    // Winds up for the shove: chest closes over the bird, knees come up between them.
    WIND: { spine: [24, -8, 0], chest: [26, -8, 0], neck: [12, 0, 0], head: [14, 0, 0], leftUpperLeg: [-82, 0, 8], rightUpperLeg: [-74, 0, -8], leftLowerLeg: [96, 0, 0], rightLowerLeg: [90, 0, 0] },
    // Both feet and arms out at once: a star thrown backward.
    STAR: { spine: [-22, 0, 0], chest: [-20, 0, 0], neck: [-6, 0, 0], head: [8, 0, 0], leftUpperLeg: [-24, 0, 26], rightUpperLeg: [-30, 0, -26], leftLowerLeg: [8, 0, 0], rightLowerLeg: [6, 0, 0] },
    // Hanging from both hands, facing the wall (mx_hanging_idle under this): legs loose, a slight hip drop.
    HANG: { hips: [0, 0, -3], leftUpperLeg: [-14, 0, 4], rightUpperLeg: [8, 0, -2], leftLowerLeg: [30, 0, 0], rightLowerLeg: [14, 0, 0] },
    PEDL: { hips: [0, 0, -3], leftUpperLeg: [-52, 0, 6], rightUpperLeg: [20, 0, -3], leftLowerLeg: [72, 0, 0], rightLowerLeg: [36, 0, 0] },
    PEDR: { hips: [0, 0, 3], leftUpperLeg: [20, 0, 6], rightUpperLeg: [-54, 0, -3], leftLowerLeg: [36, 0, 0], rightLowerLeg: [74, 0, 0] },
    // Scared still: chest pulled in to the wall, knees drawn.
    SHRINK: { spine: [5, 0, 0], chest: [4, 0, 0], leftUpperLeg: [-36, 0, 6], rightUpperLeg: [-26, 0, -2], leftLowerLeg: [56, 0, 0], rightLowerLeg: [46, 0, 0] },
    // Rider: crouched over the neck when the bird rises.
    RIDEIN: { spine: [24, 0, 0], chest: [22, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0], leftUpperLeg: [-14, -12, 0], rightUpperLeg: [-10, 16, 0], leftLowerLeg: [22, 0, 0], rightLowerLeg: [28, 0, 0] },
    // Rider: thrown back with the arm up when it drops. The rodeo C.
    RIDEOUT: { spine: [-22, 0, 8], chest: [-20, 8, 10], neck: [-8, 0, 0], head: [-10, 0, 6], leftUpperLeg: [-42, -12, 24], rightUpperLeg: [6, 16, -6], leftLowerLeg: [-8, 0, 0], rightLowerLeg: [52, 0, 0] },
    RIDEOUT2: { spine: [-20, 0, -8], chest: [-22, -8, -10], neck: [-8, 0, 0], head: [-12, 0, -6], leftUpperLeg: [4, -12, 8], rightUpperLeg: [-44, 16, -24], leftLowerLeg: [52, 0, 0], rightLowerLeg: [-6, 0, 0] },
    SEAT: { spine: [8, 0, 0], chest: [6, 0, 0], neck: [0, 0, 0], head: [-4, 0, 0], leftUpperLeg: [-22, -12, 0], rightUpperLeg: [-20, 16, 0], leftLowerLeg: [44, 0, 0], rightLowerLeg: [50, 0, 0], leftFoot: [24, 0, 0], rightFoot: [24, 0, 0] },
    // Looks up, shrinking under it.
    DUCK: { spine: [18, 0, 0], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0] },
    // Driven down into the seat: chin on chest, arms flung.
    CRUSH: { spine: [30, 0, 8], chest: [28, 0, 10], neck: [22, 0, 8], head: [24, 0, 16], leftUpperArm: [0, 0, 34], rightUpperArm: [0, 0, -34] },
    SPINL: { spine: [6, 10, 22], chest: [4, 12, 24], neck: [10, 0, 22], head: [12, 0, 26], leftUpperLeg: [-52, 0, 26], rightUpperLeg: [-20, 0, 8], leftLowerLeg: [10, 0, 0], rightLowerLeg: [54, 0, 0] },
    SPINR: { spine: [10, -10, -24], chest: [8, -12, -26], neck: [10, 0, -22], head: [8, 0, -24], leftUpperLeg: [-16, 0, -6], rightUpperLeg: [-58, 0, -26], leftLowerLeg: [60, 0, 0], rightLowerLeg: [6, 0, 0] },
    DAZED: { spine: [12, 0, -6], chest: [8, 0, -8], neck: [8, 0, -12], head: [10, 0, -18] },
    // The scream: head thrown back, chest open to the sky, knees up off the seat.
    SCREAM: { spine: [-12, 0, 0], chest: [-16, 0, 8], neck: [-6, 0, 10], head: [-10, 0, 16], leftUpperLeg: [18, 0, 4], rightUpperLeg: [18, 0, -4], leftLowerLeg: [24, 0, 0], rightLowerLeg: [24, 0, 0] },
    // Spread for the mountain: reaching for it.
    DROP: { spine: [-12, 0, 8], chest: [-16, 6, 6], neck: [-8, 0, 0], head: [-14, 0, 0], leftUpperLeg: [18, 0, 12], rightUpperLeg: [34, 0, -12], leftLowerLeg: [46, 0, 0], rightLowerLeg: [30, 0, 0] },
    ZERO: {},
  };
  // Whole-body turns and travel go through the key's `root`, so they ease with the pose. `cur` is where he is now, in world terms.
  const rad = Math.PI / 180;
  const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const qE = ([x, y, z]) => qMul(qMul([0, Math.sin(y * rad / 2), 0, Math.cos(y * rad / 2)], [Math.sin(x * rad / 2), 0, 0, Math.cos(x * rad / 2)]), [0, 0, Math.sin(z * rad / 2), Math.cos(z * rad / 2)]);
  const qV = (q, v) => { const u = q.slice(0, 3), c = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], t = c(u, v).map((x) => x * 2), d = c(u, t); return v.map((x, i) => x + q[3] * t[i] + d[i]); };
  const toLocal = (rot, d) => { const q = qE(rot); return qV([-q[0], -q[1], -q[2], q[3]], d); };
  const lerp3 = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  let cur = { pos: P(0, 0, 0), rot: [-75, 180, 15] };
  const place = (pos, rot) => { cur = { pos: [...pos], rot: [...rot] }; };
  const v3 = (v) => v.map(r3);
  // A key set. Each key: t (song seconds), p (a POSE name, fills every bone), bones on top, hips, rot/pos (world, turned into root), hold, ease, flat, weight.
  const seg = (at, keys, o = {}) => {
    const base = { pos: [...cur.pos], rot: [...cur.rot] };
    const list = keys.map((k) => {
      const out = { t: `${r3(k.t - at)}s` };
      if (k.p) { const bones = {}; for (const b of ALL) bones[b] = POSE[k.p][b] ?? [0, 0, 0]; out.bones = bones; }
      if (k.bones) out.bones = { ...(out.bones ?? {}), ...k.bones };
      for (const f of ['hips', 'ease', 'flat', 'anticipate', 'overshoot', 'settle', 'hold']) if (k[f] !== undefined) out[f] = k[f];
      if (k.rot || k.pos) {
        out.root = {};
        const rot = k.rot ?? cur.rot, pos = k.pos ?? cur.pos;
        out.root.rot = v3(rot.map((x, i) => x - base.rot[i]));
        out.root.pos = v3(toLocal(base.rot, pos.map((x, i) => x - base.pos[i])));
        cur = { pos: [...pos], rot: [...rot] };
      }
      return out;
    });
    C({ at: r3(at), do: 'keys', on: 'person', successive: 0.035, ...o, keys: list });
  };
  // Travel only, sampled from a function of time: pendulums and falls. Runs under a pose key set, adds nothing to the body.
  const path = (from, to, fn, step = 0.08) => {
    const n = Math.max(2, Math.ceil((to - from) / step)), keys = [];
    for (let i = 1; i <= n; i++) { const t = from + (to - from) * i / n, s = fn(t); keys.push({ t, pos: s.pos, rot: s.rot }); }
    seg(from, keys, { successive: 0, blend: 0 });
  };
  const hand = (side, to, at, f = 0.2, ease = 'out', extra = {}) => act(at, 'reach', { hand: side, to, for: `${r3(f)}s`, ease, ...extra });
  const free = (side, at, f = 0.12) => act(at, 'reach', { hand: side, weight: 0, to: [0, 0, 0], for: `${r3(f)}s` });
  const clip = (at, name, blend = 0.12, extra = {}) => C({ at: r3(at), do: 'anim', on: 'person', clip: name, blend: `${blend}s`, ...extra });
  const rag = (at, f, extra) => C({ at: r3(at), do: 'ragdoll', on: 'person', for: `${r3(f)}s`, floor: -220, ...extra });
  const grip = (side, to, at, extra = {}) => act(at, 'plant', { hand: side, to, blend: '0.1s', lockRot: 0, ...extra }); // the wrist follows the forearm, so it never kinks
  const letgo = (side, at, f = 0.08) => act(at, 'plant', { hand: side, weight: 0, for: `${r3(f)}s` });

  // ------------------------------------------------------------- THE SHAFT
  actors.p4_shaft = { model: 'none', pos: PARK };
  const kid = (name, def) => { actors[name] = { parent: 'p4_shaft', ...def }; };
  const WOOD = '#3a2618', BOARD = ['#6a4a30', '#54392a', '#7a5636', '#4a3224'];
  for (let k = 6; k >= -17; k--) {
    const y = r3(k * STORY), m = ((k % 5) + 5) % 5, id = `${k + 20}`;
    kid(`p4s${id}n1`, { model: 'wall', pos: [-3, y, 3], rot: [0, 180, 0] });
    kid(`p4s${id}n2`, { model: 'wall', pos: [0, y, 3], rot: [0, 180, 0] });
    kid(`p4s${id}s1`, { model: 'wall', pos: [0, y, -3] });
    kid(`p4s${id}s2`, { model: m === 2 ? 'wall_door' : 'wall', pos: [3, y, -3] });
    kid(`p4s${id}w1`, { model: m === 0 ? 'wall_window' : 'wall', pos: [-3, y, -3], rot: [0, 90, 0] });
    kid(`p4s${id}w2`, { model: 'wall', pos: [-3, y, 0], rot: [0, 90, 0] });
    kid(`p4s${id}e1`, { model: 'wall', pos: [3, y, 0], rot: [0, 270, 0] });
    kid(`p4s${id}e2`, { model: 'wall', pos: [3, y, 3], rot: [0, 270, 0] });
    // The edge of the floor above: a dark band every storey, the thing that makes the speed readable.
    const top = r3(y + STORY - 0.1);
    kid(`p4s${id}b1`, { model: 'prim:cube', pos: [0, top, 2.92], scale: [6, 0.2, 0.16], color: WOOD });
    kid(`p4s${id}b2`, { model: 'prim:cube', pos: [0, top, -2.92], scale: [6, 0.2, 0.16], color: WOOD });
    kid(`p4s${id}b3`, { model: 'prim:cube', pos: [2.92, top, 0], scale: [0.16, 0.2, 6], color: WOOD });
    kid(`p4s${id}b4`, { model: 'prim:cube', pos: [-2.92, top, 0], scale: [0.16, 0.2, 6], color: WOOD });
    // What's left of each floor: boards sticking out of the wall, and the room's own furniture still on them.
    const jut = (wall, tag) => {
      for (let i = 0; i < 6; i++) {
        const len = [1.5, 0.9, 1.25, 0.7, 1.4, 1.0][(i + m) % 6], off = -2.4 + i * 0.96, a = [3, -6, 2, 9, -4, 5][i];
        const pos = wall === 'n' ? [off, top, r3(3 - len / 2)] : wall === 's' ? [off, top, r3(-3 + len / 2)] : [r3(3 - len / 2), top, off];
        const scale = wall === 'e' ? [len, 0.05, 0.92] : [0.92, 0.05, len];
        const rot = wall === 'n' ? [a, 0, 0] : wall === 's' ? [-a, 0, 0] : [0, 0, -a];
        kid(`p4s${id}${tag}${i}`, { model: 'prim:cube', pos, rot, scale, color: BOARD[(i + m) % 4] });
      }
    };
    if (m === 0) { jut('n', 'j'); kid(`p4s${id}lamp`, { model: 'Assets/AtmosphericHouse/Prefabs/Props/Lamps/Lamp_standing.prefab', pos: [-1.2, top, 2.5], rot: [0, 40, 0] }); }
    if (m === 1) {
      kid(`p4s${id}tv`, { model: 'prim:cube', pos: [2.86, r3(y + 1.3), -1], scale: [0.1, 0.8, 1.3], color: '#0a0c10' });
      kid(`p4s${id}tvs`, { model: 'prim:cube', pos: [2.8, r3(y + 1.3), -1], scale: [0.02, 0.68, 1.16], color: '#c0d8ff', emission: '#b8d0ff' });
      kid(`p4s${id}pic`, { model: 'Assets/AtmosphericHouse/Prefabs/Props/Paintings/Painting_B.prefab', pos: [-2.88, r3(y + 1.2), 1.1], rot: [0, 90, 0] });
    }
    if (m === 2) { jut('s', 'j'); kid(`p4s${id}sofa`, { model: 'sofa', pos: [0.6, top, -2.4], rot: [0, 8, 0] }); }
    if (m === 3) {
      kid(`p4s${id}pic`, { model: 'Assets/AtmosphericHouse/Prefabs/Props/Paintings/Painting_F.prefab', pos: [-1, r3(y + 1.2), 2.9], rot: [0, 180, 0] });
      kid(`p4s${id}sc1`, { model: 'prim:cube', pos: [2.85, r3(y + 1.8), 1.6], scale: [0.1, 0.34, 0.2], color: '#ffd8a0', emission: '#ffb060' });
      kid(`p4s${id}sc2`, { model: 'prim:cube', pos: [-2.85, r3(y + 1.8), -1.6], scale: [0.1, 0.34, 0.2], color: '#ffd8a0', emission: '#ffb060' });
    }
    if (m === 4) { jut('e', 'j'); kid(`p4s${id}chair`, { model: 'Assets/AtmosphericHouse/Prefabs/Props/Furniture/Sofa_1seat.prefab', pos: [2.45, top, 1.0], rot: [0, 250, 0] }); }
  }
  // Up the shaft, shrinking: the red light is still on him.
  actors.p4_red = { model: 'prim:sphere', pos: P(0, 40, 0), scale: 1.6, color: '#401000', emission: '#ff1a08', from: GO, until: FLOOR };
  // The last floor. The couch goes through it.
  actors.p4_lastfloor = { model: 'prim:cube', pos: P(0, -40, 0), scale: [5.9, 0.3, 5.9], color: '#54392a', from: T('40:1'), until: FLOOR };

  // How fast the shaft goes by, metres a second, at each moment. The wrap is invisible, so it runs for ever.
  const run = (keys, y0) => {
    const end = keys[keys.length - 1][0], v = (t) => { let i = 0; while (i < keys.length - 2 && keys[i + 1][0] <= t) i++; const [a, va] = keys[i], [b, vb] = keys[i + 1]; return va + (vb - va) * Math.min(1, (t - a) / (b - a)); };
    let y = y0;
    C({ at: r3(keys[0][0]), do: 'set', on: 'p4_shaft', pos: [0, r3(-100 + y), 0] });
    for (let t = keys[0][0]; t < end - 0.001; t += 0.2) {
      const dt = Math.min(0.2, end - t); let y1 = y + (v(t) + v(t + dt)) / 2 * dt;
      if (y >= PERIOD) { y -= PERIOD; y1 -= PERIOD; C({ at: r3(t), do: 'set', on: 'p4_shaft', pos: [0, r3(-100 + y), 0] }); }
      C({ at: r3(t), do: 'move', on: 'p4_shaft', pos: [0, r3(-100 + y1), 0], for: `${r3(dt)}s`, ease: 'linear' });
      y = y1;
    }
  };
  run([[GO, 0], [GO + 0.5, 11], [BEAM, 19], [SHOVE, 22]], 0);
  // The stop. It lands with a jut-free stretch behind him (storey 3 of the pattern, level with his chest).
  const STOPY = 4.2;
  C({ at: SHOVE, do: 'set', on: 'p4_shaft', pos: [0, r3(-100 + STOPY - 5), 0] });
  C({ at: SHOVE, do: 'move', on: 'p4_shaft', pos: [0, r3(-100 + STOPY), 0], for: `${r3(SLAM - SHOVE)}s`, ease: 'out' });
  run([[RELEASE, 0], [RELEASE + 0.45, 18], [LAND, 14], [COUCH, 18], [BONK, 26], [FLOOR, 30]], STOPY);
  C({ at: FLOOR, do: 'set', on: 'p4_shaft', pos: PARK });

  // ------------------------------------------------------------- WHAT FALLS WITH HIM
  // The room he came out of, at real size, tumbling at his speed: close enough to pass the lens.
  const near = { p4f_table: ['coffee_table', [-1.5, 1.3, 0.7], 40], p4f_chair: ['Assets/AtmosphericHouse/Prefabs/Props/Furniture/Sofa_1seat.prefab', [-1.7, -1.2, 1.3], -28],
    p4f_lamp: ['Assets/AtmosphericHouse/Prefabs/Props/Lamps/Lamp_standing.prefab', [-1.0, -1.6, -1.3], 70], p4f_plant: ['Assets/AtmosphericHouse/Prefabs/Props/Interior_plants/Interior_plant_A.prefab', [2.0, 2.4, 1.9], -55],
    p4f_shelf: ['Assets/AtmosphericHouse/Prefabs/Props/Furniture/Bookcase_A.prefab', [-1.7, -0.3, -1.4], 22] };
  for (const [n, [model, at, rate]] of Object.entries(near)) {
    actors[n] = { model, pos: P(...at), rot: [r3(rnd(0, 360)), r3(rnd(0, 360)), r3(rnd(0, 360))], from: GO, until: r3(SLAM + 0.9) };
    C({ at: GO, do: 'spin', on: n, rate, axis: [r3(rnd(-1, 1)), r3(rnd(-1, 1)), r3(rnd(-1, 1))], for: `${r3(SLAM + 0.9 - GO)}s` });
    C({ at: GO, do: 'bob', on: n, amount: 0.25, every: `${r3(rnd(5, 9))}b`, for: `${r3(SHOVE - GO)}s` });
    // He stops; they don't.
    C({ at: SLAM, do: 'move', on: n, pos: P(at[0], -32, at[2]), for: '0.9s', ease: 'in' });
  }
  // Floorboards from the hole he went through.
  for (let i = 0; i < 18; i++) {
    const a = rnd(0, 6.28), r = rnd(0.9, 2.3), n = `p4p${i}`, at = [r3(Math.cos(a) * r), r3(rnd(-2.2, 2.6)), r3(Math.sin(a) * r)];
    actors[n] = { model: 'prim:cube', pos: P(...at), rot: [r3(rnd(0, 360)), r3(rnd(0, 360)), r3(rnd(0, 360))], scale: [0.14, 0.03, r3(rnd(0.7, 1.5))], color: BOARD[i % 4], from: GO, until: r3(BEAM + 2) };
    C({ at: GO, do: 'spin', on: n, rate: r3(rnd(120, 340)), axis: [r3(rnd(-1, 1)), r3(rnd(-1, 1)), r3(rnd(-1, 1))], for: `${r3(BEAM + 2 - GO)}s` });
    C({ at: GO, do: 'move', on: n, pos: P(at[0] * 1.3, at[1] + rnd(2, 5), at[2] * 1.3), for: `${r3(BEAM + 2 - GO)}s`, ease: 'linear' });
  }
  // Birds in free fall in the core of the shaft, and slower ones he drops past.
  actors.p4_near = { model: 'turkey_white', models: ['turkey_brown', 'turkey_black', 'turkey_white'], pos: P(0, 0, 0), from: GO, until: GRAB,
    crowd: { count: 10, shape: 'scatter', radius: 2.6, inner: 2, seed: 31, modelScale: 1.45, scaleVar: 0.2, yRange: [-3.5, 3.5] } };
  C({ at: GO, do: 'anim', on: 'p4_near', clip: 'roll', beats: 1.5, offset: 1 });
  C({ at: GO, do: 'spin', on: 'p4_near', rate: 40, axis: [0.7, 0.5, 0.2], for: `${r3(SHOVE - GO)}s` });
  C({ at: GO, do: 'bob', on: 'p4_near', amount: 0.6, every: '6b', for: `${r3(SHOVE - GO)}s`, stagger: 0.2 });
  actors.p4_hail = { model: 'turkey_brown', models: ['turkey_black', 'turkey_white', 'turkey_brown'], pos: P(0, -80, 0), from: RELEASE, until: FLOOR,
    crowd: { count: 26, shape: 'scatter', radius: 2.5, inner: 1.2, seed: 11, modelScale: 1.5, scaleVar: 0.3, yRange: [-40, 20] } };
  C({ at: RELEASE, do: 'anim', on: 'p4_hail', clip: 'roll', beats: 1.5, offset: 1 });
  C({ at: RELEASE, do: 'move', on: 'p4_hail', pos: [0, 70, 0], rel: 1, for: `${r3(FLOOR - RELEASE)}s`, ease: 'linear' });
  C({ at: RELEASE, do: 'spin', on: 'p4_hail', rate: 60, axis: [1, 0.3, 0.2], for: `${r3(FLOOR - RELEASE)}s` });

  // ------------------------------------------------------------- THE LIGHT
  // Red above him, cold TV blue below: Part 3's two lights, made a place. The fog is the depth: blue when we look down, red when we look up.
  const FOG_DOWN = { top: '#04060e', mid: '#0c1830', bottom: '#20407a', ambient: '#2a3040', fog: '#26508c', density: 0.03 };
  const FOG_UP = { top: '#400804', mid: '#280604', bottom: '#100202', ambient: '#402428', fog: '#4a0c06', density: 0.03 };
  const FOG_SIDE = { top: '#200604', mid: '#080a14', bottom: '#102040', ambient: '#2a2a38', fog: '#101830', density: 0.02 };
  lights.p4_under = { type: 'point', pos: P(0, -7, 0), color: '#a0c8ff', intensity: 0, range: 40 };
  lights.p4_over = { type: 'point', pos: P(0, 7, 0), color: '#ff2a14', intensity: 0, range: 34 };
  lights.p4_hang = { type: 'spot', pos: P(0.9, 1.7, 0.4), rot: [14, -28, 0], angle: 62, range: 5, color: '#9fb8ff', intensity: 0 };
  lights.p4_bite = { type: 'point', pos: P(-1.0, 3.0, 1.5), color: '#c8d4ff', intensity: 0, range: 4 };
  lights.p4_face = { type: 'point', pos: P(1.1, 1.5, -1.3), color: '#e8dcd0', intensity: 0, range: 7 };
  C({ at: GO, speed: 1, for: 0.05 });
  C({ at: GO, do: 'set', on: 'person', pos: P(0, 0, 0), rot: [-75, 180, 15] });
  C({ at: GO, do: 'anim', on: 'person', clip: 'FallingUnarmed', speed: 1.2 });
  C({ at: GO, do: 'overlap', on: 'person', amount: 1, for: '0.1s' });
  C({ at: GO, do: 'hide', on: ['room_floor', 'carpet1', 'wall_n1', 'wall_n2', 'cctv', 'cctv_base', 'cctv_lens', 'cctv_led'], for: '0.1b' });
  C({ at: GO, grade: { suck: 0, twist: 0, wave: 0, toon: 0.35, ink: 0.35, poster: 0, bloom: 0.6, threshold: 1, saturation: 14, contrast: 14, exposure: 0.15, vignette: 0.32, grain: 0.1, motionblur: 0.5 } });
  C({ at: GO, sky: FOG_DOWN });
  for (const [l, i] of [['red', 0.05], ['chase_fill', 0], ['void_key', 0], ['void_rim', 0], ['p4_under', 26], ['p4_over', 22], ['p4_face', 2.2]]) C({ at: GO, light: l, intensity: i });
  hit(GO, { flash: 0.7, exposure: 0.5 }, '0.75b', 2);
  C({ at: GO, onsets: 'kick', until: SHOVE, pulse: { zoom: -0.05, shake: 0.08 }, for: '0.5b' });

  // ------------------------------------------------------------- 34: THE FLOOR GOES, THE BEAM
  // On his back, looking up at where he was. He climbs the air, hand over hand on the kicks, getting nowhere. Under him, a joist.
  act(GO, 'face', { jawOpen: 0.85, eyesWide: 1, fear: 0.7, for: '0.3b' });
  // Hand over hand on nothing: a ladder climb on the arms, the kicks in the body keys below.
  C({ at: r3(GO + 0.05), do: 'layer', on: 'person', clip: 'ClimbUpLadder', mask: 'arms', weight: 1, beats: 2, for: `${r3(BEAM - GO - 0.1)}s`, blend: '0.15s' });
  act(GO, 'fingers', { hand: 'left', curl: 0.7, for: '0.1s' }); act(GO, 'fingers', { hand: 'right', curl: 0.7, for: '0.1s' });
  seg(GO + 0.01, [
    { t: GO + 0.16, p: 'BOW', ease: 'out', overshoot: 0.14, settle: '0.3s' },
    { t: 91.94, p: 'BOW' },
    { t: 92.28, p: 'CLIMBL', rot: [-62, 214, -24], anticipate: 0.22, overshoot: 0.12, settle: '0.26s' },
    { t: 92.82, p: 'CLIMBR', rot: [-84, 150, 26], anticipate: 0.2, overshoot: 0.12, settle: '0.26s' },
    { t: 93.12, p: 'CLIMBL', rot: [-68, 204, -18], anticipate: 0.15 },
    { t: BEAM - 0.02, p: 'BRACE', ease: 'out' },
  ]);
  // Eyes first: he feels it, looks down past his own chest, pulls in.
  act(BEAM - 0.42, 'face', { jawOpen: 0.3, eyesWide: 1, fear: 1, for: '0.1s' });
  actors.p4_beam = { model: 'prim:cube', pos: P(0, -30, 0.2), rot: [0, 28, 0], scale: [6.4, 0.3, 0.42], color: '#4a3020', from: T('34:2'), until: BEAM };
  on('move', 'p4_beam', { at: T('34:2'), pos: P(0, -0.3, 0.2), for: `${r3(BEAM - T('34:2'))}s`, ease: 'linear' });
  // It breaks across his back. The cut is on the hit; the halves go up past him.
  for (const [n, sx, dir] of [['p4_beamA', 1, 1], ['p4_beamB', -1, -1]]) {
    actors[n] = { model: 'prim:cube', pos: P(sx * 1.6 * Math.cos(0.49), -0.3, 0.2 - sx * 1.6 * Math.sin(0.49)), rot: [0, 28, 0], scale: [3.1, 0.3, 0.42], color: '#4a3020', from: BEAM, until: GRAB };
    on('move', n, { at: BEAM, pos: P(dir * 2.4, 11, 0.5), for: `${r3(GRAB - BEAM)}s`, ease: 'in' });
    on('rotate', n, { at: BEAM, rot: [30 * dir, 28, 150 * dir], for: `${r3(GRAB - BEAM)}s`, ease: 'out' });
  }
  hit(BEAM, { shake: 0.9, zoom: -0.12, exposure: 0.25 }, '0.75b', 3);
  C({ at: BEAM, fx: 'dust', pos: P(0, -0.2, 0), count: 40, scale: 0.8 });
  SFX(BEAM, 'couch_slam', 0.8);
  free('left', BEAM); free('right', BEAM);
  act(BEAM, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.05s' });
  act(BEAM, 'face', { jawOpen: 1, eyesWide: 0, fear: 1, for: '0.05s' });
  // Falling onto it at full speed: physics folds him over the joist. We fall with him, so no gravity here.
  rag(BEAM, 0.62, { impulse: [0, -7, 0], gravity: [0, 0, 0], collide: ['p4_beam'], drag: 0.8, drive: 0.25, seed: 3, blendIn: '0.03s', blendOut: '0.3s' });
  act(BEAM + 0.3, 'face', { jawOpen: 0.4, eyesWide: 0, fear: 0.3, for: '0.2s' });

  // ------------------------------------------------------------- 35: HE GRABS ONE. IT'S A MISTAKE.
  actors.p4_grab = { model: 'turkey_white_hero', pos: P(1.5, 1.5, 0.3), rot: [24, 250, 18], scale: 1.05, from: BEAM, until: r3(SHOVE + 1) };
  actors.p4_grabtie = { model: 'prim:cube', pos: PARK, scale: [0.1, 0.32, 0.03], color: '#d4141c', smooth: 0.5, from: BEAM, until: r3(SHOVE + 1) };
  C({ at: BEAM, do: 'attach', on: 'p4_grabtie', to: 'p4_grab.neck3', pos: [0, -0.01, 0.05], rot: [0, 0, 0] });
  C({ at: BEAM, do: 'anim', on: 'p4_grab', clip: 'jump', beats: 1 });
  { const q = qE([-26, 84, -52]), c = qV(q, [0, 1.25, 0]), o = qV(q, [0.4, -0.1, 0.32]); // where the grab will hold it: it comes to his hand
    on('move', 'p4_grab', { at: BEAM, pos: P(c[0] + o[0], c[1] + o[1], c[2] + o[2]), for: `${r3(GRAB - BEAM)}s`, ease: 'out' }); }
  const SEE = T('35:1');
  act(SEE - 0.2, 'blink', { for: '0.2s' });
  // Eyes, then head, then the arm, then the body goes after the arm.
  act(SEE, 'gaze', { to: 'p4_grab', offset: [0, 0.6, 0], limit: 50, for: '0.35s', ease: 'out' });
  act(SEE + 0.1, 'face', { jawOpen: 0.3, eyesWide: 0.8, fear: 0, for: '0.3s' });
  act(SEE + 0.35, 'reach', { hand: 'right', to: 'p4_grab.neck2', for: `${r3(GRAB - SEE - 0.35)}s`, ease: 'inout' });
  act(SEE + 0.35, 'fingers', { hand: 'right', curl: 0, for: '0.3s' });
  // Got it, by the neck: the neck sits in his fist. Its whole weight swings his arm down.
  const GRIPAT = [0.5, -0.1, 0.45], GRIPROT = [0, -130, 0];
  act(GRAB, 'fingers', { hand: 'right', curl: 1, for: '0.05s' });
  act(GRAB, 'face', { jawOpen: 0.2, smile: 1, eyesWide: 0.3, for: '0.2s' });
  on('attach', 'p4_grab', { at: GRAB, to: 'person.chest', pos: GRIPAT, rot: GRIPROT, blend: 0.12 });
  grip('right', 'p4_grab.neck2', GRAB, { offset: [0, 0, 0], blend: '0.14s', follow: 0 });
  act(GRAB + 0.1, 'reach', { hand: 'right', weight: 0, to: [0, 0, 0], for: '0.1s' });
  C({ at: GRAB, do: 'anim', on: 'p4_grab', clip: 'getHit1', beats: 1 });
  C({ at: GRAB, do: 'layer', on: 'person', clip: 'mx_falling_idle', mask: 'leftArm', weight: 1, for: `${r3(PECK1 - 0.1 - GRAB)}s`, blend: '0.15s' });
  SFX(GRAB, 'turkey_gobble_1', 0.8);
  // The neck comes round. He sees it a moment too late. First peck.
  act(PECK1 - 0.25, 'gaze', { to: 'p4_grab.head', for: '0.12s', ease: 'out' });
  act(PECK1 - 0.25, 'face', { smile: 0, eyesWide: 1, jawOpen: 0.1, for: '0.1s' });
  on('attach', 'p4_grab', { at: r3(PECK1 - 0.14), to: 'person.chest', pos: [0.1, 0.16, 0.86], rot: [-10, 180, 0], blend: 0.12 });
  C({ at: r3(PECK1 - 0.14), do: 'anim', on: 'p4_grab', clip: 'bite', beats: 0.75 });
  grip('left', 'p4_grab.neck1', PECK1 - 0.08, { offset: [0, 0, 0], follow: 0.4 });
  free('left', PECK1 - 0.08, 0.08); // the old reach would hold a stale target under the plant
  act(PECK1, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.1s' });
  const PECKS = [PECK1, T('35:4.5'), T('36:1.75'), T('36:2.5')], peckKeys = [];
  for (const [i, t] of PECKS.entries()) {
    const s = i % 2 ? 1 : -1;
    // Snap away from the beak, head first, ride it out, come back in for the next.
    peckKeys.push({ t: t + 0.07, p: 'FEND', bones: { head: [-10, 14 * s, 6 * s], neck: [-6, 8 * s, 0], chest: [-18, 12 * s, 0], spine: [-14, 0, 0] }, ease: 'out', overshoot: 0.15, settle: '0.2s' });
    peckKeys.push({ t: t + 0.36, p: 'FEND', bones: { head: [-10, 14 * s, 6 * s], neck: [-4, 6 * s, 0], chest: [-12, 12 * s, 8 * s], spine: [-14, 12 * s, 6 * s], leftUpperLeg: [-40 + 16 * s, 0, 14], rightUpperLeg: [-34 - 16 * s, 0, -12] }, ...(i === 2 ? { rot: [-48, 160, 24] } : {}) });
    act(t, 'face', { jawOpen: 1, smile: 0, fear: 1, eyesWide: 0, for: '0.06s' });
    act(t + 0.2, 'face', { jawOpen: 0.5, eyesWide: 0.7, for: '0.2s' });
    C({ at: r3(t), pulse: { shake: 0.45, zoom: -0.04 }, for: '0.4b', sharp: 3 });
    C({ at: r3(t), fx: 'feathers', pos: P(0.1, 1.4, 0.3), count: 3, speed: 3, for: '1s' });
    SFX(t, i % 2 ? 'turkey_gobble_2' : 'turkey_gobble_3', 0.6);
  }
  // From the ragdoll to the shove, one key set: eyes, head, arm, then the body goes after the arm.
  seg(BEAM + 0.02, [
    { t: BEAM + 0.5, rot: [24, 92, -44], ease: 'out', overshoot: 0.12, settle: '0.4s' },
    { t: SEE + 0.1, p: 'SLACK', rot: [20, 90, -46] },
    { t: SEE + 0.4, p: 'SLACK', rot: [12, 90, -48] },
    { t: GRAB - 0.04, p: 'LUNGE', rot: [-26, 84, -52], anticipate: 0.15, ease: 'inout' },
    { t: GRAB + 0.2, p: 'GOTIT', rot: [-34, 112, -34], overshoot: 0.22, settle: '0.35s' },
    { t: PECK1 - 0.1, p: 'GOTIT', bones: { head: [-6, 26, 0] }, rot: [-36, 118, -30] },
    ...peckKeys,
    { t: SHOVE - 0.05, p: 'WIND', ease: 'inout', hold: 0.05 },
  ]);
  // Pulls it in, gets his knees between them, and kicks it off. Anticipation is a whole beat of wind-up.
  act(SHOVE - 0.5, 'face', { jawOpen: 0.15, eyesWide: 0, fear: 1, for: '0.3s' });
  on('detach', 'p4_grab', { at: SHOVE });
  letgo('left', SHOVE - 0.07, 0.05); letgo('right', SHOVE - 0.07, 0.05);
  on('move', 'p4_grab', { at: SHOVE, pos: P(0.8, 1.3, -3.1), for: '0.5b', ease: 'in' });
  on('rotate', 'p4_grab', { at: SHOVE, rot: [120, 40, 200], for: '0.5b', ease: 'linear' });
  free('left', SHOVE, 0.05); free('right', SHOVE, 0.05);
  hit(SHOVE, { shake: 0.5, zoom: -0.06 }, '0.5b', 3);

  const NEARLY = ['p4f_table', 'p4f_chair', 'p4f_lamp', 'p4f_plant', 'p4f_shelf'];
  C({ at: r3(BEAM + 0.3), do: 'hide', on: NEARLY, for: '0.05s' });
  C({ at: SHOVE, do: 'show', on: NEARLY, for: '0.05s' });
  // ------------------------------------------------------------- 36:4 to 38: THE WORLD STOPS. EVERY LEDGE IS WATCHING.
  // He hits the wall and catches a ledge; the shaft stops dead. It's dark and the eyes come on with the words.
  // He faces the wall, hands on top of the sill. Its top is at LEDGE, its front edge at z 2.44: wrists at the edge, so the fingers lie on top.
  // His feet hang DROP below the line of his hands, tipped LEAN degrees so his weight is under them.
  const HANGX = 0.25, HANDZ = 2.47, DROP = 1.84, LEAN = 8, LEDGE = 2.0;
  const HOLD_L = P(HANGX - 0.27, LEDGE + 0.07, HANDZ - 0.06), HOLD_R = P(HANGX + 0.27, LEDGE + 0.07, HANDZ - 0.06);
  const hangAt = (a) => P(HANGX, LEDGE - DROP * Math.cos(a * rad), HANDZ - DROP * Math.sin(a * rad));
  const HANG = hangAt(LEAN);
  actors.p4_w = { model: 'none', pos: PARK };
  const ROWS = [-2.2, -0.8, 0.6, LEDGE, 3.4];
  const WALLS = { n: { pos: (y) => [0, y, 2.72], rot: 0 }, e: { pos: (y) => [2.72, y, 0], rot: 90 }, w: { pos: (y) => [-2.72, y, 0], rot: -90 } };
  // Word by word. Nearest him first, then out.
  const ON = { n3: 99.18, n2: 99.64, n4: 99.64, e2: 100.02, e3: 100.02, w2: 100.24, w3: 100.24, n1: 100.7, e1: 100.7, w1: 100.7, e4: 101.1, w4: 101.1, n0: 101.5, e0: 101.5, w0: 101.5 };
  const eye = { model: 'prim:sphere', color: '#200000', emission: '#c80400', parent: 'p4_w' };
  for (const [w, W] of Object.entries(WALLS)) ROWS.forEach((y, r) => {
    const rad = W.rot * Math.PI / 180, [x0, y0, z0] = W.pos(y), id = `p4_${w}${r}`, from = ON[w + r], until = r3(RELEASE + 1.3);
    actors[id + 'sill'] = { model: 'prim:cube', parent: 'p4_w', pos: [x0, r3(y0 - 0.05), z0], rot: [0, W.rot, 0], scale: [6, 0.1, 0.56], color: WOOD };
    const segs = w === 'n' && (y === LEDGE || y === ROWS[2]) ? [[-2, 3], [2, 3]] : [[0, 8]]; // a gap where he hangs, and under his legs
    segs.forEach(([cx, count], si) => {
      const px = x0 + cx * Math.cos(rad), pz = z0 - cx * Math.sin(rad);
      const crowd = { count, shape: 'line', spacing: 0.82, seed: 3, scaleVar: 0 };
      actors[`${id}b${si}`] = { model: 'turkey_black', parent: 'p4_w', pos: [r3(px), y0, r3(pz)], rot: [0, W.rot, 0], crowd: { ...crowd, face: 180, modelScale: 1.35 } };
      for (const [e, s] of [['L', -1], ['R', 1]]) {
        const ox = s * 0.1, oz = -0.17; // the eye, in the bird's frame
        actors[`${id}${e}${si}`] = { ...eye, pos: [r3(px + ox * Math.cos(rad) + oz * Math.sin(rad)), r3(y0 + 0.79), r3(pz - ox * Math.sin(rad) + oz * Math.cos(rad))], rot: [0, W.rot, 0], from, until, crowd: { ...crowd, face: 0, modelScale: 0.085 } };
      }
    });
  });
  C({ at: SHOVE, do: 'set', on: 'p4_w', pos: P(0, -5, 0) });
  C({ at: SHOVE, do: 'move', on: 'p4_w', pos: P(0, 0, 0), for: `${r3(SLAM - SHOVE)}s`, ease: 'out' });
  C({ at: RELEASE, do: 'move', on: 'p4_w', pos: P(0, 14, 0), for: '1.3s', ease: 'in' });
  C({ at: r3(RELEASE + 1.3), do: 'set', on: 'p4_w', pos: PARK });
  // The one beside his hand, and two close to the lens.
  actors.p4_bite = { model: 'turkey_white_hero', parent: 'p4_w', pos: [-0.56, LEDGE, 2.5], rot: [0, 155, 0], scale: 1.1 };
  actors.p4_bitetie = { model: 'prim:cube', pos: PARK, scale: [0.1, 0.32, 0.03], color: '#d4141c', smooth: 0.5 };
  C({ at: SHOVE, do: 'attach', on: 'p4_bitetie', to: 'p4_bite.neck3', pos: [0, -0.01, 0.05], rot: [0, 0, 0] });
  actors.p4_fg1 = { model: 'turkey_black_hero', parent: 'p4_w', pos: [-1.5, -0.95, -1.75], rot: [0, 22, 0], scale: 1.7 };
  actors.p4_fg2 = { model: 'turkey_black_hero', parent: 'p4_w', pos: [1.45, -1.1, -1.5], rot: [0, -30, 0], scale: 1.9 };
  for (const b of ['p4_fg1', 'p4_fg2', 'p4_bite']) C({ at: SHOVE, do: 'anim', on: b, clip: 'idle' });
  // Across the shaft, turning to the wall as he goes, both hands finding the ledge.
  clip(SHOVE, 'FallingUnarmed', 0.06);
  seg(SHOVE + 0.01, [
    { t: SHOVE + 0.1, p: 'STAR', ease: 'out', pos: lerp3(cur.pos, HANG, 0.12), rot: lerp3(cur.rot, [-4, 172, -5], 0.3) },
    { t: SLAM, p: 'STAR', pos: HANG, rot: [-4, 172, -5], ease: 'in' },
  ]);
  // He comes in back first and we cut on the hit: on the far side of the cut he has turned to the wall. (Root keys take Euler differences, so a half turn can't be keyed.)
  C({ at: SLAM, do: 'set', on: 'person', pos: HANG, rot: [LEAN, 0, 0] }); place(HANG, [LEAN, 0, 0]);
  // Real contact, so these are reaches: hand flat on the sill, fingers to the wall, elbows out and bent. They stay on until he lets go.
  const holdL = { to: HOLD_L, handRot: [0, 90, -14], lean: 0, hint: P(HANGX - 0.9, 1.0, 1.6) }, holdR = { to: HOLD_R, handRot: [0, -90, 14], lean: 0, hint: P(HANGX + 0.9, 1.0, 1.6) };
  act(SHOVE + 0.06, 'reach', { hand: 'left', ...holdL, for: `${r3(SLAM - SHOVE - 0.06)}s`, ease: 'in' });
  act(SHOVE + 0.06, 'reach', { hand: 'right', ...holdR, for: `${r3(SLAM - SHOVE - 0.06)}s`, ease: 'in' });
  for (const side of ['left', 'right']) { act(SHOVE, 'fingers', { hand: side, curl: 0.1, for: '0.05s' }); act(SLAM, 'fingers', { hand: side, curl: 0.72, for: '0.05s' }); }
  // He hits with all that speed: the legs carry on toward the wall and swing back, the hands hold.
  clip(SLAM - 0.012, 'mx_hanging_idle', 0.04);
  act(SLAM, 'face', { jawOpen: 1, eyesWide: 0, fear: 1, for: '0.05s' });
  hit(SLAM, { shake: 1, zoom: -0.1, exposure: 0.5 }, '0.75b', 3);
  SFX(SLAM, 'impact_big', 0.7);
  // A real pendulum about the ledge: the body swings to the wall and back under his hands, and the bite kicks it again.
  const BITE = r3(T('38:1') + 0.02);
  const swing = (t) => { const d = t - SLAM, b = t - BITE; return LEAN - 7 * Math.exp(-0.95 * d) * Math.cos(d * 2 * Math.PI / 1.5) + (b > 0 ? 2.2 * Math.exp(-2.2 * b) * Math.sin(b * 7) : 0); };
  path(SLAM + 0.01, RELEASE, (t) => { const a = swing(t), b = t - BITE, p = hangAt(a); p[1] = r3(p[1] - (b > 0 ? 0.02 * (1 - Math.exp(-9 * b)) : 0)); return { pos: p, rot: [a, 0, 0] }; });
  // His feet look for the wall that isn't there. Then he hears them and goes still. The bite shoots through him.
  seg(SLAM + 0.3, [
    { t: SLAM + 0.5, p: 'HANG' },
    { t: 99.84, p: 'PEDL', overshoot: 0.1, settle: '0.2s' }, { t: 100.14, p: 'PEDR', overshoot: 0.1, settle: '0.2s' }, { t: 100.42, p: 'PEDL', overshoot: 0.1, settle: '0.2s' },
    { t: 101.1, p: 'SHRINK', ease: 'inout', hold: BITE - 101.1 - 0.02 },
    { t: BITE + 0.09, p: 'SHRINK', bones: { chest: [-6, 4, 6], spine: [-4, 2, 4], head: [-14, 0, 8], leftUpperLeg: [-56, 0, 8], rightUpperLeg: [-48, 0, 0], leftLowerLeg: [78, 0, 0], rightLowerLeg: [74, 0, 0] }, ease: 'out', overshoot: 0.2, settle: '0.25s' },
    { t: RELEASE - 0.02, p: 'SHRINK', bones: { chest: [-3, 4, 4], head: [-10, 0, 6] } },
  ], { blend: 0 });
  // Everything goes out but the eyes.
  C({ at: SHOVE, grade: { toon: 0, ink: 0, bloom: 1.5, threshold: 0.8, saturation: 0, contrast: 18, exposure: 0, vignette: 0.45, grain: 0.15, motionblur: 0.2 } });
  C({ at: SHOVE, sky: { top: '#020208', mid: '#04060e', bottom: '#060a18', ambient: '#1c1e2e', fog: '#04060e', density: 0.03 } });
  C({ at: SHOVE, light: 'p4_over', intensity: 7, for: '0.3s', ease: 'out' });
  C({ at: SHOVE, light: 'p4_under', intensity: 14, for: '0.3s', ease: 'out' });
  C({ at: SHOVE, light: 'p4_face', intensity: 3, for: '0.3s', ease: 'out' });
  C({ at: SHOVE, light: 'p4_hang', intensity: 10, for: '0.2s', ease: 'out' });
  C({ at: RELEASE, light: 'p4_hang', intensity: 0 });
  C({ at: 101.72, light: 'p4_bite', intensity: 4 });
  C({ at: RELEASE, light: 'p4_bite', intensity: 0 });
  // Slowly: the row by his head. He stops breathing. Then along them, then out at us, drawing in.
  act(99.56, 'gaze', { to: P(1.6, 3.4, 1.6), limit: 42, for: '0.2s', ease: 'out' });
  act(100.0, 'gaze', { to: P(2.5, 1.6, 0.4), limit: 42, for: '0.18s', ease: 'out' });
  act(100.22, 'gaze', { to: P(-2.5, 1.5, 0.4), limit: 42, for: '0.4s', ease: 'inout' });
  act(99.56, 'face', { jawOpen: 0.15, eyesWide: 0.9, fear: 0.6, for: '0.2s' });
  act(100.7, 'gaze', { to: P(-1.1, 1.5, 0.75), limit: 42, for: '0.25s', ease: 'inout' });
  act(100.7, 'face', { jawOpen: 0.5, eyesWide: 1, fear: 1, for: '0.4s' });
  act(101.72, 'gaze', { to: 'p4_bite.head', limit: 42, for: '0.2s', ease: 'out' });
  // ME: the bird by his hand turns its head to him, leans, takes his fingers.
  on('rotate', 'p4_bite', { at: 101.72, rot: [10, 100, 0], for: '0.5b', ease: 'back' });
  C({ at: r3(BITE - 0.34), do: 'anim', on: 'p4_bite', clip: 'bite', beats: 0.75 });
  on('rotate', 'p4_bite', { at: r3(BITE - 0.5), rot: [-18, 96, 0], for: '0.3s', ease: 'out' }); // draws back
  on('rotate', 'p4_bite', { at: r3(BITE - 0.14), rot: [62, 96, 0], for: '0.14s', ease: 'in' }); // and dives
  on('rotate', 'p4_bite', { at: r3(BITE + 0.32), rot: [46, 96, 0], for: '0.2s', ease: 'inout' });
  act(BITE, 'fingers', { hand: 'left', curl: 0.35, for: '0.08s' }); // the left is the one by the bird
  act(BITE, 'face', { jawOpen: 1, eyesWide: 0, fear: 1, for: '0.06s' });
  hit(BITE, { shake: 0.5, zoom: -0.05 }, '0.5b', 3);
  SFX(BITE, 'turkey_gobble_2', 0.8);
  act(RELEASE - 0.2, 'fingers', { hand: 'left', curl: 0, for: '0.1s' }); act(RELEASE - 0.14, 'fingers', { hand: 'right', curl: 0, for: '0.1s' });
  // Text: the eyes are the event, so the words stay out of their way, low. Only the last line is big.
  const word = (t, w, f, size = 120, y = 0.17) => C({ at: t, text: w, style: 'slam', size, for: f, pos: [0.5, y, 0], color: '#ffffff', in: 0.05, out: 0.01 });
  word(99.18, 'I', 0.46); word(99.64, 'ALWAYS', 0.38); word(100.02, 'FEEL', 0.22); word(100.24, 'LIKE', 0.46);
  word(100.7, "SOMEBODY'S", 0.8, 150); word(101.5, 'WATCHING', 0.22, 150); C({ at: 101.72, text: 'ME', style: 'slam', size: 240, for: 0.8, pos: [0.22, 0.2, 0], color: '#ffffff', in: 0.05, out: 0.01 });

  // ------------------------------------------------------------- 38-39: HE DROPS. THE RIDE.
  clip(RELEASE, 'FallingUnarmed', 0.1, { speed: 1.6 });
  C({ at: r3(RELEASE), do: 'layer', on: 'person', clip: 'mx_falling_idle', mask: 'arms', weight: 0.8, for: `${r3(LAND - RELEASE)}s`, blend: '0.12s' });
  free('right', RELEASE, 0.08); free('left', RELEASE, 0.08);
  act(RELEASE, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.15s' });
  { const p0 = [...cur.pos], r0 = [...cur.rot], e = (t) => 1 - (1 - (t - RELEASE) / (LAND - RELEASE)) ** 2; path(RELEASE + 0.01, LAND, (t) => ({ pos: lerp3(p0, P(0.04, -1.09, 0), e(t)), rot: lerp3(r0, [-18, 90, 0], e(t)) })); }
  seg(RELEASE + 0.01, [{ t: RELEASE + 0.24, p: 'BOW', ease: 'out', overshoot: 0.12, settle: '0.3s' }, { t: LAND - 0.03, p: 'CLIMBR' }]);
  // The print look: the lights in the shaft come on yellow and everything's drawn. He's having a great time for one bar.
  C({ at: RELEASE, grade: { toon: 0.8, ink: 0.7, halftone: 0.3, saturation: 22, contrast: 20, exposure: 0.2, bloom: 0.4, threshold: 1.1, vignette: 0.2, grain: 0.05, motionblur: 0.5 } });
  C({ at: RELEASE, sky: { top: '#604000', mid: '#c89000', bottom: '#ffc80a', ambient: '#a09080', fog: '#d09808', density: 0.035 } });
  C({ at: RELEASE, light: 'p4_under', intensity: 34, color: '#ffc830' });
  C({ at: RELEASE, light: 'p4_over', intensity: 18, color: '#fff0c0' });
  C({ at: RELEASE, light: 'p4_face', intensity: 2.4 });
  C({ at: RELEASE, onsets: 'kick', until: BONK, pulse: { zoom: -0.05, shake: 0.08 }, for: '0.5b' });
  const RIDE = P(0, -1.45, 0), SCALE = 2.7;
  actors.p4_ride = { model: 'turkey_brown_hero', pos: P(0, -24, 0), rot: [-30, 90, 0], scale: SCALE, from: RELEASE, until: END };
  C({ at: RELEASE, do: 'anim', on: 'p4_ride', clip: 'runAngry', beats: 1 });
  on('move', 'p4_ride', { at: RELEASE, pos: RIDE, for: `${r3(LAND - RELEASE)}s`, ease: 'out' });
  on('rotate', 'p4_ride', { at: RELEASE, rot: [-18, 90, 0], for: `${r3(LAND - RELEASE)}s`, ease: 'out' });
  on('attach', 'person', { at: LAND, to: 'p4_ride', pos: [0, 0.36, 0.04], rot: [0, 0, 0], blend: 0.08 }); // forward, with the neck rising in front of him and in arm's reach
  clip(LAND, 'IdleSit14', 0.08);
  act(LAND, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.1s' });
  hit(LAND, { shake: 0.8, zoom: -0.1 }, '0.75b', 3);
  C({ at: LAND, fx: 'feathers', pos: P(0, 0, 0), count: 18, speed: 6, for: '1.5s' });
  SFX(LAND, 'turkey_gobble_1', 0.9);
  // The bird bucks on the kicks; he goes the other way, a beat late, whip through the spine.
  const BUCKS = [[T('38:3'), 14], [T('38:3.75'), -16], [T('38:4.5'), 18], [T('39:1'), -14], [COUCH, 10], [T('39:2.5'), -8]], rideKeys = [{ t: LAND + 0.12, p: 'RIDEIN', ease: 'out', overshoot: 0.2, settle: '0.25s', hips: [0, -0.1, 0.06] }];
  BUCKS.forEach(([at, b], i) => {
    C({ at: r3(at), do: 'rotate', on: 'p4_ride', rot: [b - 8, 90, b / 2], for: '0.5b', ease: 'back' });
    rideKeys.push({ t: at + 0.09, p: b > 0 ? 'RIDEIN' : i % 4 === 1 ? 'RIDEOUT' : 'RIDEOUT2', hips: b > 0 ? [0, -0.02, 0.08] : [0, 0.17, -0.1], overshoot: 0.16, settle: '0.2s' });
    rideKeys.push({ t: at + 0.28, p: 'SEAT', hips: [0, -0.07, 0], ease: 'out' });
  });
  rideKeys.push({ t: BONK - 0.02, p: 'DUCK', hips: [0, -0.05, 0], ease: 'inout' });
  seg(LAND + 0.01, rideKeys);
  // One hand in the feathers at the bird's shoulder: the near hand, palm down, fingertips driven in, the neck clear in front of him. Contact, so a reach; it rides with the bird.
  act(LAND - 0.04, 'reach', { hand: 'right', to: 'p4_ride', offset: [0.32, 0.7, 0.14], handRot: [0, -90, -40], lean: 0, for: '0.12s', ease: 'out' });
  act(LAND + 0.04, 'fingers', { hand: 'right', curl: 1, for: '0.08s' });
  for (const finger of ['index', 'thumb']) act(LAND + 0.04, 'fingers', { hand: 'right', finger, curl: 1, for: '0.08s' });
  // Locked to the bird where the reach put it: it goes with every buck, and he leans after it rather than letting go.
  grip('right', 'p4_ride', LAND + 0.1, { blend: '0.04s', follow: 0.4 });
  free('right', LAND + 0.1, 0.06);
  // The other arm thrown up and back, rodeo: mocap, on the left arm only. Cheer15 from 1 s, slowed, stays in its arm-high part (hand 2 m up, wide).
  C({ at: r3(LAND), do: 'layer', on: 'person', clip: 'Cheer15', mask: 'leftArm', start: 1.3, stop: 1.6, once: 1, speed: 0.15, weight: 1, for: `${r3(BONK - 0.3 - LAND)}s`, blend: '0.12s' });
  act(LAND + 0.1, 'pose', { bones: { leftUpperArm: [-28, 0, 18], leftLowerArm: [-10, 0, 30] }, for: '0.2s', ease: 'out' });
  act(LAND + 0.2, 'face', { jawOpen: 0.8, smile: 1, eyesWide: 0.4, fear: 0, for: '0.3b' });

  // ------------------------------------------------------------- 39: UP THE SHAFT, THE COUCH. BONK.
  C({ at: COUCH, sky: FOG_UP });
  C({ at: COUCH, grade: { halftone: 0, toon: 0.6, ink: 0.6, saturation: 10, contrast: 18, exposure: 0.15, motionblur: 0.4 } });
  C({ at: COUCH, light: 'p4_under', intensity: 16, color: '#a0c8ff' });
  C({ at: COUCH, light: 'p4_over', intensity: 34, color: '#ff3a20' });
  act(COUCH + 0.1, 'gaze', { to: 'sofa', limit: 50, for: '0.25s', ease: 'out' });
  act(COUCH + 0.3, 'face', { jawOpen: 0.7, smile: 0, eyesWide: 1, fear: 1, for: '0.3b' });
  // Lets go and covers up: mocap on both arms.
  letgo('right', BONK - 0.3, 0.1);
  act(BONK - 0.3, 'pose', { bones: { leftUpperArm: [0, 0, 0], leftLowerArm: [0, 0, 0] }, for: '0.15s' });
  C({ at: r3(BONK - 0.3), do: 'layer', on: 'person', clip: 'IdleBreatheHandsOnHead', mask: 'arms', weight: 1, for: '0.3s', blend: '0.15s' });
  C({ at: r3(COUCH - 0.7), do: 'set', on: 'sofa', pos: P(0, 14, 0), rot: [30, 40, 15] });
  const fallFor = `${r3(BONK - COUCH)}s`;
  C({ at: COUCH, do: 'move', on: 'sofa', pos: P(0, 1.3, 0), for: fallFor, ease: 'in' });
  C({ at: COUCH, do: 'rotate', on: 'sofa', rot: [8, 90, -6], for: fallFor, ease: 'linear' });
  hit(BONK, { shake: 1.1, zoom: -0.18, exposure: 0.3 }, '0.5b', 3);
  C({ at: BONK, do: 'detach', on: 'person' });
  C({ at: BONK, do: 'anim', on: 'person', clip: 'IdleSit14', blend: '0.05s' });
  free('left', BONK, 0.05); free('right', BONK, 0.05);
  act(BONK, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.05s' });
  act(BONK, 'face', { jawOpen: 1, eyesWide: 0, fear: 1, for: '0.05s' });
  C({ at: BONK, do: 'set', on: 'sofa', pos: P(0, 0.05, 0), rot: [0, 180, 0] });
  C({ at: BONK, do: 'jump', on: 'p4_ride', pos: P(2.0, -12, 0.4), height: 1, for: '2b', ease: 'in' });
  on('rotate', 'p4_ride', { at: BONK, rot: [150, 90, 120], for: '2b', ease: 'linear' });
  C({ at: r3(BONK + 0.02), do: 'attach', on: 'person', to: 'sofa', pos: [0, 0.1, 0.06], rot: [0, 0, 0] });
  rag(BONK + 0.1, 0.55, { hit: 'chest', impulse: [0, -3.5, 0], gravity: [0, 0, 0], drag: 3, drive: 0.55, pose: 'sit', collide: ['sofa'], seed: 7, blendIn: '0.03s', blendOut: '0.3s' });
  act(BONK + 0.35, 'face', { jawOpen: 0.3, eyesWide: 0, fear: 0.2, for: '0.3s' });
  C({ at: BONK, do: 'spin', on: 'sofa', rate: 90, axis: [-0.12, -1, -0.18], for: `${r3(FLOOR - BONK)}s` });
  C({ at: r3(FLOOR + 0.01), do: 'set', on: 'sofa', pos: P(0, 0.05, 0), rot: [-6, 180, 5] }); // the crash squares him up to us for the scream
  // Seeing stars: the head rolls round on the neck, the legs come up with the spin.
  // Seeing stars on a spinning couch: thrown out against the turn, legs flopping, clawing at the arms.
  seg(BONK + 0.62, [
    { t: BONK + 0.88, p: 'DAZED', ease: 'inout' },
    { t: BONK + 1.2, p: 'SPINL', overshoot: 0.1, settle: '0.25s' },
    { t: BONK + 1.55, p: 'SPINR', overshoot: 0.12, settle: '0.25s' },
    { t: FLOOR - 0.08, p: 'SPINL' },
  ]);
  grip('left', 'sofa', BONK + 0.7, { offset: [-0.75, 0.55, 0.12], blend: '0.22s', follow: 0.3 });
  grip('right', 'sofa', BONK + 0.82, { offset: [0.75, 0.55, 0.12], blend: '0.22s', follow: 0.3 });
  C({ at: BONK, fx: 'feathers', pos: P(0, 0.6, 0), count: 14, speed: 6, for: '2s' });
  SFX(BONK, 'impact_big', 1); SFX(BONK, 'couch_slam', 0.8);

  // ------------------------------------------------------------- 40: THROUGH THE LAST FLOOR. IN THE NIGHT.
  // It comes up at him for a beat, in shot, and the couch goes through it on the kick.
  on('move', 'p4_lastfloor', { at: T('40:1'), pos: P(0, -0.3, 0), for: `${r3(FLOOR - T('40:1'))}s`, ease: 'in' });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * 6.28 + rnd(0, 0.3), n = `p4x${i}`, far = rnd(2, 5);
    actors[n] = { model: 'prim:cube', pos: P(r3(Math.cos(a) * 1.1), rnd(-0.6, 0.2), r3(Math.sin(a) * 1.1)), rot: [r3(rnd(0, 90)), r3(rnd(0, 360)), 0], scale: [0.24, 0.05, r3(rnd(0.8, 1.6))], color: BOARD[i % 4], from: FLOOR, until: OUT };
    on('move', n, { at: FLOOR, pos: P(r3(Math.cos(a) * far), rnd(2, 9), r3(Math.sin(a) * far)), for: `${r3(OUT - FLOOR)}s`, ease: 'out' });
    C({ at: FLOOR, do: 'spin', on: n, rate: r3(rnd(150, 420)), axis: [r3(rnd(-1, 1)), r3(rnd(-1, 1)), r3(rnd(-1, 1))], for: `${r3(OUT - FLOOR)}s` });
  }
  hit(FLOOR, { shake: 1.2, zoom: -0.16, exposure: 0.3 }, '0.5b', 3);
  C({ at: FLOOR, fx: 'dust', pos: P(0, 0, 0), count: 50, scale: 1 });
  SFX(FLOOR, 'couch_slam', 1); SFX(FLOOR, 'wood_scrape', 0.7);
  // Out into black: red on black, torn, and the scream. Nothing else in the frame but him and what's left of the floor.
  C({ at: FLOOR, sky: { top: '#000000', mid: '#000000', bottom: '#000000', ambient: '#b03020', fog: '#000000', density: 0.004 } });
  C({ at: FLOOR, grade: { toon: 0.6, ink: 0.45, saturation: 40, tear: 0.04, rgb: 0.25, poster: 0, contrast: 18, exposure: 0.35, motionblur: 0 } });
  C({ at: FLOOR, light: 'p4_under', intensity: 0 });
  C({ at: FLOOR, light: 'p4_over', intensity: 0 });
  C({ at: FLOOR, light: 'void_key', intensity: 2.2, color: '#ff3a20' });
  C({ at: FLOOR, light: 'p4_face', intensity: 5, color: '#ff6a48' });
  C({ at: OUT, light: 'p4_face', intensity: 0 });
  act(FLOOR, 'face', { jawOpen: 1, eyesWide: 1, fear: 1, for: '0.1b' });
  letgo('left', FLOOR, 0.05); letgo('right', FLOOR, 0.05);
  // The floor hits up through the couch: chin driven down, then he opens up into the scream.
  seg(FLOOR + 0.01, [{ t: FLOOR + 0.1, p: 'CRUSH', bones: { neck: [12, 0, 4], head: [12, 0, 6], spine: [20, 0, 4], chest: [18, 0, 4], leftUpperArm: [0, 0, 0], rightUpperArm: [0, 0, 0] }, ease: 'out' }, { t: FLOOR + 0.44, p: 'SCREAM', ease: 'out', overshoot: 0.14, settle: '0.35s' }, { t: OUT - 0.04, p: 'SCREAM', bones: { head: [-14, 0, 16] } }], { blend: '0.04s' });
  // Arms flung out: mocap on the arms, so nothing crosses his face.
  C({ at: r3(FLOOR + 0.14), do: 'layer', on: 'person', clip: 'Idle1Yell', mask: 'spine,head', weight: 1, for: `${r3(OUT - FLOOR - 0.14)}s`, blend: '0.2s' });
  C({ at: r3(FLOOR + 0.14), do: 'layer', on: 'person', clip: 'mx_falling_idle', mask: 'arms', weight: 1, for: `${r3(OUT - FLOOR - 0.14)}s`, blend: '0.2s' });
  C({ at: 109.02, onsets: 'snare', until: OUT, pulse: { invert: 0.6 }, for: '0.12b', sharp: 1 });
  C({ at: 110.86, text: 'NIGHT', style: 'slam', size: 230, for: '0.1s', pos: [0.5, 0.52, 0], color: '#ffffff', in: 0.02, out: 0.01 });
  C({ at: r3(OUT - 0.04), do: 'detach', on: 'person' });

  // The white mountain of Part 5 is real and its summit is at y=0, so the last beat happens up above it, for real.
  actors.p4_last = { model: 'turkey_white', models: ['turkey_white', 'turkey_brown', 'turkey_black'], pos: [0, 0, -1], from: OUT, until: END,
    crowd: { count: 30, shape: 'scatter', radius: 7, inner: 1.5, seed: 51, modelScale: 1.8, scaleVar: 0.3, yRange: [6, 34] } };
  C({ at: OUT, do: 'set', on: 'person', pos: [0, 31, -1], rot: [-80, 0, 15] }); place([0, 31, -1], [-80, 0, 15]);
  clip(OUT, 'FallingUnarmed', 0.05, { speed: 1.3 });
  C({ at: OUT, do: 'layer', on: 'person', clip: 'mx_falling_idle', mask: 'arms', weight: 0.7, for: `${r3(END - OUT)}s`, blend: '0.1s' });
  free('left', OUT); free('right', OUT);
  seg(OUT + 0.01, [{ t: OUT + 0.2, p: 'DROP', ease: 'out', overshoot: 0.12, settle: '0.3s' }, { t: END - 0.08, p: 'DROP', bones: { head: [-22, 0, 0] } }, { t: END - 0.01, p: 'ZERO', ease: 'linear' }], { successive: 0, blend: 0 });
  C({ at: OUT, do: 'move', on: 'person', pos: [0, 0.9, -1], for: `${r3(END - OUT)}s`, ease: 'in' });
  C({ at: OUT, do: 'anim', on: 'p4_last', clip: 'roll', beats: 1, offset: 1 });
  C({ at: OUT, do: 'move', on: 'p4_last', pos: [0, -5, 0], rel: 1, for: '1.25b', ease: 'linear' });
  C({ at: OUT, grade: { tear: 0, poster: 0, rgb: 0.15, saturation: 0, contrast: 16, ink: 0, toon: 0, exposure: -0.45, grain: 0 } });
  C({ at: OUT, light: 'void_key', intensity: 2.4, color: '#fff4e0' });
  C({ at: OUT, do: 'hide', on: ['table', 'remote', 'shelf1', 'cabinet', 'p1_lamp', 'p1_glass', 'p1_frame', 'p1_pic', 'p1_curtains', 'p3_paper1', 'p3_paper2', 'p3_paper3'], for: '0.1b' });
  C({ at: OUT, sky: { top: '#000000', mid: '#100806', bottom: '#000000', ambient: '#a09890', fog: '#000000', density: 0.002 } });
  C({ at: OUT, do: 'jump', on: 'sofa', pos: P(3, 4, 2), height: 1, for: '1.25b', ease: 'in' });
  SFX(OUT, 'feather_whoosh', 0.8);
  // Pose, face and fingers all hold, so hand Part 5 a clean body.
  act(END - 0.04, 'face', { jawOpen: 0, eyesWide: 0, fear: 0, smile: 0, for: '0.04s' });
  act(END - 0.04, 'fingers', { hand: 'left', curl: 0, for: '0.04s' });
  act(END - 0.04, 'fingers', { hand: 'right', curl: 0, for: '0.04s' });
  C({ at: END, do: 'hide', on: 'sofa', for: '0.1b' });
  C({ at: END, do: 'set', on: 'tv1', pos: [0, 0.62, 2.55] });
  SFX(GO, 'impact_big', 0.8); SFX(GO, 'feather_whoosh', 0.7);

  // ------------------------------------------------------------- THE SHOTS: 13 in 7.2 bars, each with something happening in it
  shot(GO, 'straight down the shaft', { pos: P(0.3, 3.0, 1.05), move: P(0.15, 2.1, 1.2), rot: [84, 0, 5], fov: 66, ease: 'out', handheld: 0.35 });
  C({ at: BEAM, sky: FOG_SIDE });
  shot(BEAM, 'he sees a bird', { pos: P(0.1, 0.9, -2.3), move: P(0.35, 1.0, -2.0), look: 'person.chest', lookOffset: [0.3, 0.2, 0], fov: 52, ease: 'out', handheld: 0.45, focus: 'person.head' });
  C({ at: GRAB, sky: FOG_UP });
  // Bodies at these moments, for the two shots that have to be built on him.
  const upOf = (rot) => qV(qE(rot), [0, 1, 0]), rightOf = (rot) => qV(qE(rot), [1, 0, 0]);
  const chestAt = (rot) => P(0, 0, 0).map((x, i) => x + upOf(rot)[i] * 1.25);
  { const c = chestAt([-34, 112, -34]), at = (x, y, z) => [r3(c[0] + x), r3(c[1] + y), r3(c[2] + z)];
    shot(GRAB, 'up at him, with it', { pos: at(0.75, -1.35, -0.9), move: at(0.6, -1.15, -0.75), look: 'person.chest', lookOffset: [0, 0.1, 0], fov: 44, ease: 'linear', handheld: 0.5 }); }
  C({ at: T('36:1.75'), sky: FOG_SIDE });
  { // Side on: his face on one side of the frame, the bird on the other, the air between them. Tele and shallow, so the shaft goes to soft colour.
    const rot = [-48, 160, 24], c = chestAt(rot), rt = rightOf(rot), up = upOf(rot), at = (d, u) => c.map((x, i) => r3(x + rt[i] * d + up[i] * u));
    shot(T('36:1.75'), 'it goes for his face', { pos: at(2.3, 0.35), move: at(2.05, 0.4), look: 'person.head', lookOffset: [0, 0, 0], fov: 34, ease: 'linear', handheld: 0.5, focus: 'person.head', aperture: 2.8 });
    lights.p4_peck = { type: 'point', pos: at(1.2, 0.9), color: '#fff0dc', intensity: 0, range: 6 };
    C({ at: r3(T('36:1.75')), light: 'p4_peck', intensity: 9 });
    C({ at: SHOVE, light: 'p4_peck', intensity: 0 });
    C({ at: r3(T('36:1.75')), grade: { exposure: 0.35, saturation: 4 } }); }
  // We go with him across the shaft, and cut on the hit to close: him hanging, the rows of eyes all round him. They come on word by word.
  shot(SHOVE, 'the wall', { pos: P(0.25, 0.55, -1.25), move: P(0.1, 0.95, -0.15), look: 'person.chest', fov: 50, ease: 'out', handheld: 0.2 });
  shot(SLAM, 'hanging, with them', { pos: P(0.75, 0.95, 0.42), move: P(0.57, 1.02, 0.62), look: 'person.head', lookOffset: [0.05, 0.1, 0], fov: 46, ease: 'linear', handheld: 0.15, focus: 'person.head', aperture: 8 });
  shot(100.7, 'along the wall', { pos: P(-1.25, 1.2, 0.72), move: P(-1.08, 1.26, 0.86), look: 'person.head', lookOffset: [0.18, 0, 0], fov: 42, ease: 'linear', handheld: 0.2, focus: 'person.head', aperture: 8 });
  shot(101.72, 'the one by his hand', { pos: P(0.95, 2.28, 1.6), move: P(0.8, 2.28, 1.75), look: P(-0.05, 1.98, 2.45), fov: 40, ease: 'in', handheld: 0.15 });
  shot(RELEASE, 'something comes up', { pos: P(1.75, 1.5, -1.5), move: P(1.7, 1.3, -1.5), look: 'person.hips', lookOffset: [0, -0.5, 0], fov: 66, ease: 'linear', handheld: 0.5 });
  shot(T('38:3.75'), 'rides it', { pos: P(1.6, 1.3, -1.6), move: P(1.75, 0.9, -0.95), look: 'person.chest', lookOffset: [0.25, -0.2, 0], fov: 48, ease: 'inout', handheld: 0.6, focus: 'person.head' });
  shot(COUCH, 'up: the couch', { pos: P(0.95, -1.0, -1.6), look: P(0, 1.6, 0), fov: 72, handheld: 0.45 });
  C({ at: BONK, sky: FOG_SIDE });
  C({ at: T('40:1'), sky: FOG_DOWN });
  shot(T('40:1'), 'the last floor', { pos: P(0.35, 4.4, -0.3), move: P(0.3, 3.7, -0.25), rot: [83, 0, -6], fov: 68, ease: 'linear', handheld: 0.5 });
  shot(BONK, 'bonk', { pos: P(-2.1, 0.8, -1.5), move: P(1.0, 1.3, -2.0), look: 'person.chest', fov: 56, ease: 'out', handheld: 0.8 });
  shot(FLOOR, 'in the night', { pos: P(-0.45, 1.75, -1.5), move: P(-0.32, 1.6, -1.15), look: 'person.head', lookOffset: [0, 0.05, 0], fov: 36, ease: 'linear', handheld: 0.8, focus: 'person.head' });
  shot(OUT, 'it comes up', { pos: [0.5, 36, -1.45], move: [0.2, 4.2, -1.2], rot: [87, 0, 4], fov: 62, ease: 'in', handheld: 0.4 });
}
