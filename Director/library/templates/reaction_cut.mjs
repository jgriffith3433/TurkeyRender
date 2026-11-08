// A held look that changes: blink, eyes widen, settle. For the cutaway after something lands.
export default {
  about: 'a blink, then the eyes widen and settle',
  params: { who: 'the actor, default the subject', at: 'when, default 1b', wide: 'eyesWide, default 0.6', hold: 'how long it holds in beats, default 2' },
  make(p, x) {
    const who = p.who ?? String(x.subject).split('.')[0], at = parseFloat(p.at ?? 1), hold = parseFloat(p.hold ?? 2);
    return {
      cues: [
        { who, at: `${at}b`, do: 'blink', for: '0.2s' },
        { who, at: `${at + 0.25}b`, do: 'face', eyesWide: p.wide ?? 0.6, for: '0.3b', ease: 'out' },
        { who, at: `${at + 0.25 + hold}b`, do: 'face', eyesWide: 0, for: '0.5b', ease: 'inout' },
      ],
    };
  },
  test: { who: 'person' },
};
