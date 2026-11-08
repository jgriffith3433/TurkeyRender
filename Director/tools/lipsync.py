#!/usr/bin/env python
"""Makes him sing: reads the vocal stem and writes jaw cues for the phrases where his face is on screen.
   py Director/tools/lipsync.py                      TK Shock: writes Director/acts/08-lipsync.json from PHRASES below
   py Director/tools/lipsync.py --video greener [--actor person]     (greener itself now uses tools/face_act.mjs, acts/60-face.json; running this overwrites nothing there but doubles the jaw)
       Any video: reads videos/<v>/stems/htdemucs/audio/vocals.wav and videos/<v>/lyrics.json, writes videos/<v>/acts/08-lipsync.json, one line at a time.
       The stem says how open, the words say when and what shape: open vowels wide, ee and i narrow with a touch of smile, m b p closed. A line with no timed words, and an ad-lib the
       stem has between lines, go on the stem alone. Then `mv cards` or `mv build`.
Edit PHRASES to add a phrase, then run it again and build."""
import json, math, os, re, struct, subprocess, sys

if '--video' in sys.argv:
    V = sys.argv[sys.argv.index('--video') + 1]
    ACTOR = sys.argv[sys.argv.index('--actor') + 1] if '--actor' in sys.argv else 'person'
    D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DIR = os.path.join(D, 'videos', V)
    HZ, RATE, MAX_JAW = 15, 8000, 0.46
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', os.path.join(DIR, 'stems', 'htdemucs', 'audio', 'vocals.wav'), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'])
    pcm = struct.unpack(f'<{len(raw) // 2}h', raw)
    dur = len(pcm) / RATE

    def rms(t, width=0.05):
        s = pcm[max(int((t - width) * RATE), 0):int((t + width) * RATE)]
        return math.sqrt(sum(x * x for x in s) / max(1, len(s)))

    env = [rms(i / HZ) for i in range(int(dur * HZ))]
    top = sorted(env)[int(len(env) * 0.95)] or 1
    OPEN = {'a': 1, 'o': .9, 'u': .6, 'e': .55, 'i': .42, 'y': .42}
    words = [w for l in json.load(open(os.path.join(DIR, 'lyrics.json'), encoding='utf8'))['lines'] for w in l['words'] if w.get('t') is not None]

    def shape(w, u):
        """jaw scale and smile for u (0..1) through a word: its letters, spaced evenly."""
        s = re.sub(r"[^a-z]", '', w['w'].lower()) or 'a'
        c = s[min(int(u * len(s)), len(s) - 1)]
        if c in 'mbp': return .08, 0
        if c in 'fv': return .18, 0
        if c in OPEN: return OPEN[c], (.14 if c in 'iey' else 0)
        return .35, 0

    jaw = [0.0] * len(env); smile = [0.0] * len(env); worded = [False] * len(env)
    for w in words:
        a, b = w['t'], w.get('end') or w['t'] + .25
        for i in range(int(a * HZ), min(int(b * HZ) + 1, len(env))):
            s, m = shape(w, min(1, max(0, (i / HZ - a) / max(.05, b - a))))
            jaw[i] = max(jaw[i], min(1, env[i] / top) ** .7 * MAX_JAW * s); smile[i] = max(smile[i], m); worded[i] = True
    for i, v in enumerate(env):   # untimed lines and ad-libs: the stem alone, an easy half-open vowel
        if not worded[i] and v > top * .3:
            jaw[i] = min(1, v / top) ** .7 * MAX_JAW * .6
    cues, last = [], 0.0; lasts = 0.0
    for i, j in enumerate(jaw):
        j = round(last * .3 + j * .7, 3); s = round(smile[i], 2)
        if j < .025: j = 0
        if j == last and s == lasts: continue
        cues.append({'at': f'{i / HZ:.3f}s', 'do': 'face', 'on': ACTOR, 'jawOpen': j, **({'smile': s} if s != lasts else {}), 'for': f'{1 / HZ:.3f}s'})
        last, lasts = j, s
    json.dump({'cues': cues}, open(os.path.join(DIR, 'acts', '08-lipsync.json'), 'w'), indent=0)
    print(len(cues), 'cues for', V, ', sung', round(sum(1 for j in jaw if j > .03) / HZ, 1), 's')
    sys.exit(0)

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WAV = os.path.join(D, 'stems', 'htdemucs', 'Audio', 'vocals.wav')
HZ, RATE, MAX_JAW = 15, 8000, 0.5
PHRASES = [
    (114.26, 115.58, 'person', 'What do you mean?'),
    (116.12, 116.88, 'person', 'In the cold'),
    (148.40, 152.48, 'person', 'I always feel like somebody is watching me'),
    (153.92, 158.08, 'person', 'I always feel like somebody is watching me'),
]

raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', WAV, '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'])
pcm = struct.unpack(f'<{len(raw) // 2}h', raw)


def rms(t, width=0.05):
    a, b = int((t - width) * RATE), int((t + width) * RATE)
    s = pcm[max(a, 0):b]
    return math.sqrt(sum(x * x for x in s) / max(1, len(s)))


cues = []
for start, end, actor, text in PHRASES:
    n = int((end - start) * HZ)
    levels = [rms(start + i / HZ) for i in range(n + 1)]
    top = sorted(levels)[int(len(levels) * 0.92)] or 1
    last = 0.0
    for i, v in enumerate(levels):
        jaw = min(1, v / top) ** 0.75 * MAX_JAW
        if jaw < 0.05: jaw = 0
        jaw = round(last * 0.3 + jaw * 0.7, 3)  # lips can't snap shut between frames
        last = jaw
        cues.append({'at': f'{start + i / HZ:.3f}s', 'do': 'face', 'on': actor, 'jawOpen': jaw, 'for': f'{1 / HZ:.3f}s'})
    cues.append({'at': f'{end + 0.02:.3f}s', 'do': 'face', 'on': actor, 'jawOpen': 0, 'for': '0.12s', 'ease': 'out'})

json.dump({'cues': cues}, open(os.path.join(D, 'acts', '08-lipsync.json'), 'w'), indent=0)
print(len(cues), 'cues')
