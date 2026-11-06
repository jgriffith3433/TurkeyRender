#!/usr/bin/env python
"""Makes him sing: reads the vocal stem and writes jaw cues for the phrases where his face is on screen.
   py Director/tools/lipsync.py
Writes Director/acts/08-lipsync.json. Edit PHRASES to add a phrase, then run it again and build."""
import json, math, os, struct, subprocess

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
