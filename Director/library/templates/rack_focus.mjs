// Focus moves from the shot's subject to another name. Works by distance, so the shot gives up its focus target.
export default {
  about: 'pull focus from the subject to another actor or mark',
  params: { to: 'who gets the focus: an actor, bone or mark', at: 'when, from the shot start, default 1b', for: 'how long, default 1b', aperture: 'default 2.8', from: 'who has focus first, default the subject' },
  make(p, x) {
    const first = p.from ?? x.subject, aperture = p.aperture ?? 2.8;
    return {
      shot: { focus: null, aperture: null },
      cues: [
        { at: 0, grade: { focus: x.distance(first), aperture }, for: 0 }, // for 0: already there on the first frame
        { at: p.at ?? '1b', grade: { focus: x.distance(p.to) }, for: p.for ?? '1b', ease: 'inout' },
      ],
    };
  },
  test: { to: 'her.head' },
};
