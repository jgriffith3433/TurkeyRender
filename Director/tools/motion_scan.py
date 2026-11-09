#!/usr/bin/env python
"""Scans the mocap indexes (canonical streams in gen/mocap/index/<source>/*.npz) for a beat's PHASES by joint positions, not by tags:
   py -I Director/tools/motion_scan.py rising_strike [--sources cmu,protofactor] [--top 30]
rising_strike (the doctor's uppercut, round 3): a hand rises fast (>=2.5 m/s upward, >=3 m/s) from below the chest to over the head while
the OTHER hand stays low (below the chest, no guard at the face) through the 1.2 s before and the strike; reports how long the fist then
stays overhead and how still-but-alive the 1.2 s before was (the coil).
uppercut: the same, ending at chin height instead of overhead.
overhead_hold: one hand over the head for >=0.6 s with the other hand low (a fist-pump / victory hold).
Prints JSON lines: source, clip, start/end seconds, measures."""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from motion import stream as S  # noqa: E402
INDEX = os.path.join(ROOT, 'gen', 'mocap', 'index')


def scan(st, mode):
    st = st.resample(30.0); P = st.pos.astype(float); fps = 30.0; n = st.frames; ix = st.index
    head, chest, hips = P[:, ix('Head')], P[:, ix('Chest')], P[:, ix('Hips')]
    out = []
    for h, o in (('RightHand', 'LeftHand'), ('LeftHand', 'RightHand')):
        H, O = P[:, ix(h)], P[:, ix(o)]
        v = np.zeros_like(H); v[1:] = (H[1:] - H[:-1]) * fps
        sp = np.linalg.norm(v, axis=1)
        low_o = O[:, 1] < chest[:, 1] - 0.12                      # off-hand below the chest
        guard_o = np.linalg.norm(O - head, axis=1) < 0.30          # off-hand at the face
        over = H[:, 1] > head[:, 1] + (0.05 if mode != 'uppercut' else -0.08)   # uppercut: the fist reaches the chin, overhead not required
        if mode in ('rising_strike', 'uppercut'):
            f = 36
            while f < n - 6:
                if v[f, 1] >= 2.5 and sp[f] >= 3.0:
                    a = f - 36; start_low = H[max(a, f - 12):f, 1].min() < chest[f, 1]
                    off_low = low_o[a:f + 6].mean(); off_guard = guard_o[a:f + 6].mean()
                    k = f; top = None
                    while k < min(n, f + 15):
                        if over[k]: top = k; break
                        k += 1
                    if start_low and top is not None and off_low >= 0.75 and off_guard < 0.1:
                        hold = 0
                        while top + hold < n and over[top + hold]: hold += 1
                        coil = np.degrees(np.linalg.norm(np.diff(H[a:f - 4], axis=0), axis=1).mean() * fps) if f - 4 > a + 1 else 0
                        coil_speed = float(np.linalg.norm(np.diff(H[a:f - 4], axis=0), axis=1).mean() * fps)
                        out.append({'hand': h, 'strike_s': round(f / fps, 2), 'start': round(max(0, a / fps), 2), 'end': round(min(n, top + hold + 15) / fps, 2),
                                    'peakUp': round(float(v[f:top + 1, 1].max()), 1), 'overheadHold_s': round(hold / fps, 2), 'offLow': round(float(off_low), 2),
                                    'coilHandSpeed': round(coil_speed, 2), 'hipsY': round(float(hips[f, 1]), 2)})
                        f = top + max(hold, 1)
                    else: f += 1
                else: f += 1
        else:
            run = 0
            for f in range(n):
                ok = over[f] and low_o[f] and not guard_o[f]
                run = run + 1 if ok else 0
                if run == 18:
                    k = f
                    while k + 1 < n and over[k + 1] and low_o[k + 1]: k += 1
                    out.append({'hand': h, 'start': round((f - 17) / fps, 2), 'end': round((k + 1) / fps, 2), 'hold_s': round((k - f + 18) / fps, 2)})
    return out


def main():
    a = sys.argv[1:]; mode = a[0]
    srcs = a[a.index('--sources') + 1].split(',') if '--sources' in a else ['cmu', 'protofactor']
    for src in srcs:
        d = os.path.join(INDEX, src); meta = {c['id']: c for c in json.load(open(os.path.join(INDEX, src + '.json'), encoding='utf8'))['clips']}
        for f in sorted(os.listdir(d)):
            if not f.endswith('.npz') or f.endswith('.raw.npz'): continue
            cid = f[:-4]
            try: ev = scan(S.Stream.load(os.path.join(d, f)), mode)
            except Exception as e: continue
            for e in ev: print(json.dumps({'source': src, 'clip': cid, 'desc': meta.get(cid, {}).get('description', '')[:60], **e}))


if __name__ == '__main__':
    main()
