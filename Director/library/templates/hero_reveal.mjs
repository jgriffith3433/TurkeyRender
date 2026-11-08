// The camera rises slowly up the subject and a soft bloom lands on the hit.
export default {
  about: 'slow rise to the subject with a bloom on the hit',
  params: { rise: 'metres up, default 0.5, never below the floor', hit: 'when the bloom lands, default end-1b', amount: 'bloom, default 0.5' },
  make(p, x) {
    const pos = x.shot.pos, rise = p.rise ?? 0.5;
    return {
      shot: { pos: [pos[0], Math.max(0.12, pos[1] - rise), pos[2]], move: [pos[0], pos[1], pos[2]], ease: 'inout' },
      cues: [{ at: p.hit ?? 'end-1b', pulse: { bloom: p.amount ?? 0.5 }, sharp: 2 }],
    };
  },
  test: {},
};
