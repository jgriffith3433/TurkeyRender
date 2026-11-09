#!/usr/bin/env python
"""A quick headless look at a motion: a critic dump (twin or Unity) drawn as a skeleton from the front and the side at 24 fps, to an mp4,
plus an optional strip of consecutive frames (for stepping a moment frame by frame). For screening candidates before a Unity preview;
not a substitute for the posecheck/preview render on his mesh.
   py -I Director/tools/critic/stick.py <dump.json> <out.mp4> [--fps 24] [--strip a-b --strip-out x.jpg] [--title "..."]
"""
import json, os, subprocess, sys
import numpy as np

BONES = [('Hips', 'Spine'), ('Spine', 'Chest'), ('Chest', 'Neck'), ('Neck', 'Head'), ('Chest', 'LeftShoulder'), ('LeftShoulder', 'LeftUpperArm'),
         ('LeftUpperArm', 'LeftLowerArm'), ('LeftLowerArm', 'LeftHand'), ('Chest', 'RightShoulder'), ('RightShoulder', 'RightUpperArm'),
         ('RightUpperArm', 'RightLowerArm'), ('RightLowerArm', 'RightHand'), ('Hips', 'LeftUpperLeg'), ('LeftUpperLeg', 'LeftLowerLeg'),
         ('LeftLowerLeg', 'LeftFoot'), ('LeftFoot', 'LeftToes'), ('Hips', 'RightUpperLeg'), ('RightUpperLeg', 'RightLowerLeg'),
         ('RightLowerLeg', 'RightFoot'), ('RightFoot', 'RightToes')]
W, H = 640, 400


def load(path, fps):
    d = json.load(open(path, encoding='utf8'))
    bi = {b: i for i, b in enumerate(d['bones'])}
    t = np.array([f['t'] for f in d['frames']]); P = np.array([[f['p'][bi[b]] if b in bi else [np.nan] * 3 for b in sorted({x for e in BONES for x in e})] for f in d['frames']])
    names = sorted({x for e in BONES for x in e})
    T = np.arange(t[0], t[-1] + 1e-6, 1.0 / fps)
    out = np.stack([np.stack([np.interp(T, t, P[:, j, k]) for k in range(3)], -1) for j in range(len(names))], 1)
    return d.get('clip', os.path.basename(path)), names, out


def line(img, a, b, col, w=3):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    xs = np.linspace(a[0], b[0], n); ys = np.linspace(a[1], b[1], n)
    for dx in range(-(w // 2), w // 2 + 1):
        for dy in range(-(w // 2), w // 2 + 1):
            X = np.clip((xs + dx).astype(int), 0, W - 1); Y = np.clip((ys + dy).astype(int), 0, H - 1); img[Y, X] = col


TRACK = '--track' in sys.argv


def draw(names, P, title, i, n):
    img = np.zeros((H, W, 3), np.uint8); img[:] = (24, 26, 30)
    idx = {b: k for k, b in enumerate(names)}
    c = np.nanmean(P[:, idx['Hips']], 0)
    if TRACK: P = P.copy(); P[i] = P[i] - P[i, idx['Hips']] + c   # follow the hips (a launch leaves any fixed frame)
    P = P.copy(); P[..., 1] += 0.95 - c[1] if (TRACK or abs(c[1] - 0.95) > 0.3) else 0   # a floating or seated clip: hips put at standing height so the body is in frame
    s = H / 2.3
    for view, ox in ((0, W * 0.27), (2, W * 0.73)):           # front (x) and side (z)
        line(img, (ox - 150, H - 30), (ox + 150, H - 30), (60, 60, 66), 1)
        X = lambda p: ox + (p[view] - c[view]) * s * (1 if view == 2 else -1)
        for a, b in BONES:
            pa, pb = P[i, idx[a]], P[i, idx[b]]
            col = (90, 170, 255) if (a.startswith('Left') or b.startswith('Left')) else (255, 140, 90) if (a.startswith('Right') or b.startswith('Right')) else (220, 220, 220)
            line(img, (X(pa), H - 30 - pa[1] * s), (X(pb), H - 30 - pb[1] * s), col, 4)
        hp = P[i, idx['Head']]; hx, hy = X(hp), H - 30 - hp[1] * s - 4
        ang = np.linspace(0, 2 * np.pi, 40); pts = list(zip(hx + 9 * np.cos(ang), hy + 10 * np.sin(ang)))
        for k in range(39): line(img, pts[k], pts[k + 1], (220, 220, 220), 2)
    return img


def main():
    a = sys.argv[1:]; src, out = a[0], a[1]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    fps = float(opt('--fps', 24))
    name, names, P = load(src, fps)
    title = opt('--title', name)
    n = len(P)
    font = r"fontfile='C\:/Windows/Fonts/consola.ttf'"
    vf = f"drawtext={font}:text='f%{{frame_num}}':x=8:y=8:fontsize=18:fontcolor=white,drawtext={font}:text='" + title.replace("'", "").replace(':', ' ') + f"  {fps:g} fps  front | side':x=8:y=30:fontsize=14:fontcolor=gray"
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-', '-vf', vf, '-pix_fmt', 'yuv420p', '-vcodec', 'libx264', '-crf', '20', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(draw(names, P, title, i, n).tobytes())
    p.stdin.close(); p.wait()
    if opt('--strip'):   # consecutive frames a..b at 24 fps, 4 across, from the mp4 (frame numbers burned in)
        if opt('--strip') == 'peak':   # 24 frames around the fastest moment of the hands and head
            idx = {b: k for k, b in enumerate(names)}; sp = sum(np.linalg.norm(np.diff(P[:, idx[b]], axis=0), axis=1) for b in ('LeftHand', 'RightHand', 'Head'))
            c = int(np.argmax(sp)) if len(sp) else 0; s0 = max(0, min(n - 24, c - 12)); s1 = min(n - 1, s0 + 23)
        else: s0, s1 = (int(x) for x in opt('--strip').split('-'))
        k = s1 - s0 + 1
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-vf', f"select='between(n,{s0},{s1})',scale=256:-1,tile=6x{(k + 5) // 6}", '-frames:v', '1', '-q:v', '3', opt('--strip-out', out.replace('.mp4', '_strip.jpg'))], check=True)
    print(json.dumps({'out': out, 'frames': n}))


if __name__ == '__main__':
    main()
