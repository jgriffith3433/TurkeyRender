#!/usr/bin/env python
"""Renders the whole video in short chunks, so a Unity crash loses one chunk and not the whole render.
   py Director/tools/render_parts.py v7 [--w 1280 --h 720 --fps 30] [--chunk 24]
Finished chunks in Director/output/chunks/<name>/ are kept, so running it again carries on where it stopped.
Each chunk takes its turn in the mv queue. Waits for Unity to come back after a crash and retries that chunk."""
import argparse, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DURATION = 204.196

ap = argparse.ArgumentParser()
ap.add_argument('name'); ap.add_argument('--w', type=int, default=1280); ap.add_argument('--h', type=int, default=720)
ap.add_argument('--fps', type=int, default=30); ap.add_argument('--chunk', type=int, default=24)
a = ap.parse_args()
OUT = os.path.join(ROOT, 'output', 'chunks', a.name); os.makedirs(OUT, exist_ok=True)
FINAL = os.path.join(ROOT, 'output', f'TKShock-{a.name}.mp4')


def mv(*args, timeout=3000):
    return subprocess.run(['node', os.path.join(ROOT, 'mv.mjs'), *map(str, args)], capture_output=True, text=True, timeout=timeout)


def duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return 0.0


def wait_unity():
    for _ in range(120):
        try:
            if mv('ping', timeout=60).returncode == 0: return True
        except subprocess.TimeoutExpired: pass
        time.sleep(10)
    return False


parts, t, i = [], 0.0, 0
while t < DURATION - 0.01:
    to = min(t + a.chunk, DURATION); path = os.path.join(OUT, f'c{i:03d}.mp4'); want = to - t
    for attempt in range(4):
        if abs(duration(path) - want) < 0.2: break
        if os.path.exists(path): os.remove(path)
        print(f'chunk {i}: {t:.1f}-{to:.1f} s, try {attempt + 1}', flush=True)
        try:
            r = mv('render', '--from', t, '--to', to, '--w', a.w, '--h', a.h, '--fps', a.fps, '--out', path, '--wait')
            if r.returncode: print(r.stdout[-300:], r.stderr[-300:], flush=True)
        except subprocess.TimeoutExpired:
            print('render call timed out', flush=True)
        if abs(duration(path) - want) >= 0.2:
            print('chunk failed, waiting for Unity', flush=True)
            if not wait_unity(): sys.exit('Unity did not come back')
    if abs(duration(path) - want) >= 0.2: sys.exit(f'chunk {i} failed 4 times')
    parts.append(path); t = to; i += 1

# Picture joins without re-encoding. Sound is decoded and joined, because AAC chunks carry padding that would click.
lst = os.path.join(OUT, 'list.txt')
open(lst, 'w').write(''.join("file '%s'\n" % p.replace('\\', '/') for p in parts))
inputs = sum((['-i', p] for p in parts), [])
trims = ''.join(f'[{n}:a]atrim=0:{min(a.chunk, DURATION - n * a.chunk):.4f},asetpts=PTS-STARTPTS[a{n}];' for n in range(len(parts)))
join = ''.join(f'[a{n}]' for n in range(len(parts)))
wav = os.path.join(OUT, 'sound.wav')
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', f'{trims}{join}concat=n={len(parts)}:v=0:a=1[a]', '-map', '[a]', wav])
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', FINAL])
print('done', FINAL, duration(FINAL))
