// The hands of a baked take: on top of what the `fingers` cues set, a relaxed curl that grows toward the little finger, a slow life of its own, and a little drag when the hand moves fast.
// A point or a fist keeps its shape: the extra curl goes away as the other fingers close.
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const JOINTS = ['Proximal', 'Intermediate', 'Distal'];
const FAN = [.45, .9, 1, 1.12, 1.28];
const ANG = [[12, 20, 22], [46, 72, 40], [46, 72, 40], [46, 72, 40], [46, 72, 40]];

export function hands({ d, out, world, K, H, smooth, q, v }) {
  const { nf, fps, head } = d;
  ['Left', 'Right'].forEach((S, side) => {
    const hand = H[S + 'Hand'];
    const speed = new Array(nf).fill(0);
    for (let f = 1; f < nf; f++) speed[f] = v.len(v.sub(world[f].P[hand], world[f - 1].P[hand])) * fps;
    const drag = smooth(speed.map((x) => Math.min(1, x / 3)), 9 * K);
    // How shut the three outer fingers already are: 1 is a fist or a point.
    const shut = smooth(world.map((_, f) => {
      let c = 0, n = 0;
      for (const F of ['Middle', 'Ring', 'Little']) { const b = H[S + F + 'Proximal']; if (b == null) continue; c += 2 * Math.acos(Math.min(1, Math.abs(out[b][f][3]))); n++; }
      return Math.min(1, Math.max(0, (c / (n || 1) * 180 / Math.PI - 24) / 26));
    }), 2 * K);
    FINGERS.forEach((F, i) => {
      const ph = side * 1.7 + i * 1.13, rate = 2 * Math.PI * (.23 + i * .031);
      JOINTS.forEach((J, j) => {
        const name = S + F + J, b = H[name]; if (b == null) return;
        const ax = v.norm(head.curl[name]);
        out[b] = out[b].map((a, f) => {
          const t = f / fps, life = .035 * Math.sin(rate * t + ph) + .02 * Math.sin(rate * 2.3 * t + ph * 2);
          const e = (.13 * FAN[i] + life + .07 * drag[f] * FAN[i]) * (1 - shut[f]);
          return q.mul(a, q.axis(ax, ANG[i][j] * e * Math.PI / 180));
        });
      });
    });
  });
}
