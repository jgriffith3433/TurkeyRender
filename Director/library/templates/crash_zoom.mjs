// A fast zoom into the subject from the shot's lens. Use it once in a while, for a hit.
export default {
  about: 'fast zoom in over the start of the shot',
  params: { to: 'fov at the end, default 45% of the shot lens', for: 'how long, default 0.5b', ease: 'default out' },
  make(p, x) {
    return { shot: { fovTo: p.to ?? Math.round(x.shot.fov * 0.45 * 100) / 100, fovFor: p.for ?? '0.5b', fovEase: p.ease ?? 'out' } };
  },
  test: { to: 18 },
};
