# Lyric type for Part 6: heavy condensed caps cut into scan lines, chroma split, the bottoms dragged down toward the TV.
# Writes full-frame 1920x1080 transparent PNGs to Assets/P6Type/. Pull is 0 (held) to 1 (being sucked down).
from PIL import Image, ImageDraw, ImageFont, ImageChops
import numpy as np, os, random
OUT = 'C:/Projects/TKShock/Assets/P6Type/'
W, H = 1920, 1080
BEBAS = 'C:/Windows/Fonts/BebasNeue-Regular.ttf'

def word(text, size, track):
    f = ImageFont.truetype(BEBAS, size)
    w = int(sum(f.getlength(c) + track for c in text)) + 20
    im = Image.new('L', (w, int(size * 1.25)), 0); d = ImageDraw.Draw(im); x = 8
    for c in text:
        d.text((x, 0), c, font=f, fill=255); x += f.getlength(c) + track
    return im.crop(im.getbbox())

def make(name, text, size, xy, color, track=0, pull=0.0, line=9, anchor='l', seed=1):
    rnd = random.Random(seed)
    g = word(text, size, track)
    a = np.zeros((H, W), np.float32)
    gw, gh = g.size
    x = xy[0] if anchor == 'l' else xy[0] - gw // 2 if anchor == 'c' else xy[0] - gw
    y = xy[1]
    a[y:y + gh, x:x + gw] = np.asarray(g, np.float32) / 255
    # dragged toward the TV: every column runs on below the letter, broken in streaks
    if pull > 0:
        for cx in range(x, min(W, x + gw)):
            col = a[:, cx]
            nz = np.nonzero(col > .5)[0]
            if not len(nz): continue
            b = nz[-1]
            n = int(pull * size * (.25 + 1.1 * rnd.random() ** 2.2))
            e = min(H, b + n)
            if e > b: a[b:e, cx] = np.linspace(1, 0, e - b) ** 1.3
    # scan lines through the letters, heavier toward the bottom edge
    for yy in range(0, H, line):
        depth = (yy - y) / max(gh, 1)
        cut = np.clip(.22 + .9 * pull * depth, .2, .9)
        a[yy: yy + max(1, int(line * cut)), :] *= .12
    # a few bands knocked sideways
    out = a.copy()
    for _ in range(4):
        by = y + rnd.randrange(0, max(1, gh)); bh = rnd.randrange(6, 26); dx = rnd.randrange(-34, 34)
        out[by:by + bh, :] = np.roll(a[by:by + bh, :], dx, axis=1)
    a = out
    c = np.array(color, np.float32) / 255
    rgb = np.zeros((H, W, 3), np.float32); alpha = a.copy()
    rgb[..., :] = c
    # chroma split: cold TV ghost one side, red the other
    gh1 = np.roll(a, -7, axis=1); gh2 = np.roll(a, 7, axis=1)
    only1 = np.clip(gh1 - a, 0, 1) * .75; only2 = np.clip(gh2 - a, 0, 1) * .75
    rgb[only1 > 0.01] = (.55, .85, 1); rgb[(only2 > only1) & (only2 > 0.01)] = (1, .12, .06)
    alpha = np.clip(np.maximum.reduce([a, only1, only2]), 0, 1)
    rgba = np.dstack([rgb, alpha])
    # keep colour under transparent pixels so bilinear filtering doesn't fringe
    Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA').save(OUT + name + '.png')

WHITE = (244, 246, 250); RED = (255, 24, 10)

def clean(name, text, size, xy, color, track=4, anchor='l'):
    # Readable first: solid letters on a soft dark shadow, no scan lines, no split. The look is in the pull under the last words only.
    g = word(text, size, track)
    gw, gh = g.size
    x = xy[0] if anchor == 'l' else xy[0] - gw // 2 if anchor == 'c' else xy[0] - gw
    y = xy[1]
    a = Image.new('L', (W, H), 0); a.paste(g, (x, y))
    from PIL import ImageFilter
    sh = a.filter(ImageFilter.GaussianBlur(size * .035)).point(lambda v: min(255, int(v * 2.2)))
    A = np.asarray(a, np.float32) / 255; S = np.asarray(sh, np.float32) / 255 * .8
    alpha = np.maximum(A, S)
    k = np.where(alpha > 0, A / np.maximum(alpha, 1e-3), 0)
    c = np.array(color, np.float32) / 255
    rgb = np.dstack([c[i] * k for i in range(3)])
    Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8), 'RGBA').save(OUT + name + '.png')

# first pass (bar 55): low left, in the dark of the wall
clean('a1', 'I ALWAYS FEEL LIKE', 120, (70, 900), WHITE)
clean('a2', "SOMEBODY'S WATCHING", 120, (70, 900), WHITE)
clean('a3', 'ME', 300, (1820, 720), RED, anchor='r')
# second pass (bars 56:4-58): along the bottom, so the climax above it stays clear
clean('b1', 'I ALWAYS FEEL LIKE', 170, (960, 850), WHITE, anchor='c')
clean('b2', "SOMEBODY'S", 230, (960, 40), RED, anchor='c')
clean('b3', 'WATCHING', 230, (960, 40), RED, anchor='c')
clean('b4', 'ME', 420, (960, 30), RED, anchor='c')
print('ok')
