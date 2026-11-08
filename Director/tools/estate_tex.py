#!/usr/bin/env python
"""Painted surfaces for the pastel estate: floors with their reflections and pools of light painted in, wallpaper with its shading, ceilings, sky, the garden from the air, plywood.
   py Director/tools/estate_tex.py [name ...]
Writes Assets/MusicVideo/Props/Estate/tex/<name>.png. Nothing here is rendered in real time: the 'shading' is paint, so a room costs one draw call and looks lit."""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'Estate', 'tex')
os.makedirs(OUT, exist_ok=True)


def hex3(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
def lerp(a, b, t): return a + (b - a) * t
def fbm(w, h, oct=6, base=4, seed=1, ax=1.0):
    r = np.random.default_rng(seed); out = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(oct):
        gw = max(2, int(base * ax * 2 ** o)); gh = max(2, int(base * 2 ** o))
        g = Image.fromarray(r.random((gh, gw), dtype=np.float32), 'F').resize((w, h), Image.BICUBIC)
        out += np.asarray(g) * amp; tot += amp; amp *= .5
    return out / tot
def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
def gauss(X, Y, x, y, sx, sy): return np.exp(-((X - x) / sx) ** 2 - ((Y - y) / sy) ** 2)
def save(name, a):
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).save(os.path.join(OUT, name + '.png')); print('tex', name, a.shape)
def grid(w, h, x0, x1, y0, y1):
    return np.meshgrid(np.linspace(x0, x1, w), np.linspace(y0, y1, h))


def veins(w, h, seed):
    n = fbm(w, h, 6, 6, seed); v = np.abs(n - .5) * 2
    return np.clip(1 - v / .035, 0, 1) ** 2 * fbm(w, h, 3, 3, seed + 1)


def checker(w, h, X, Z, s, a, b, seed):
    """Marble tiles of size s: colours a/b, veins, a hairline joint."""
    ix = np.floor(X / s).astype(int); iz = np.floor(Z / s).astype(int)
    m = ((ix + iz) % 2 == 0)[..., None]
    img = a * m + b * ~m
    tone = (((ix * 13 + iz * 7) % 5) / 5 - .5)[..., None] * .02
    img = img * (1 + tone)
    v = veins(w, h, seed + 2)[..., None]
    img = img * (1 - v * .22 * np.array([.7, 1, 1]))
    img = img * (.96 + fbm(w, h, 5, 5, seed + 8)[..., None] * .08)
    fx = np.abs(X / s - np.round(X / s)) * s; fz = np.abs(Z / s - np.round(Z / s)) * s
    j = np.clip(1 - np.minimum(fx, fz) / .012, 0, 1)[..., None]
    return img * (1 - j * .2)


def hall_floor():
    W, H = 2048, 1812   # 26 by 23 m: x -13..13, z 0..23 from the hall's own origin. Image top is z 23
    X, Z = grid(W, H, -13, 13, 23, 0)
    img = checker(W, H, X, Z, 1.625, hex3('#fff4e8'), hex3('#f8cdd6'), 1)
    # gold border lines and a compass in the middle of the room
    d1 = np.maximum(np.abs(X) - 11.6, np.abs(Z - 11.5) - 10.1); d2 = np.maximum(np.abs(X) - 11.3, np.abs(Z - 11.5) - 9.8)
    line = ((np.abs(d1) < .05) | (np.abs(d2) < .02))[..., None]
    img = np.where(line, hex3('#d9a944'), img)
    r = np.hypot(X, Z - 7.5); th = np.arctan2(Z - 7.5, X)
    star = 3.3 * (.46 + .54 * np.abs(np.cos(th * 4)) ** 9 + .22 * np.abs(np.sin(th * 4)) ** 9)
    wedge = (np.floor((th + math.pi) / (math.pi / 8)) % 2 == 0)[..., None]
    col = np.where(wedge, hex3('#8ed6b6'), hex3('#f2839c')) * .95
    img = np.where((r < star)[..., None], col, img)
    img = np.where((np.abs(r - 3.55) < .06)[..., None], hex3('#e2b64f'), img)
    img = np.where((np.abs(r - 3.8) < .025)[..., None], hex3('#e2b64f'), img)
    img = np.where((r < .9)[..., None], hex3('#e8bd5a'), img)
    # no painted polish or pools of light: the key, the shadows and the floor mirror are real now, and painted light blows out under them
    ao = np.clip(np.minimum(13 - np.abs(X), np.minimum(Z, 23 - Z)) / 2.2, 0, 1) ** .6
    img = img * (.9 + .1 * ao)[..., None]
    save('hall_floor', img)


def damask(tile=256, a='#f7c4d0', b='#fbd9e0', line='#efb0bf'):
    """One repeat of ogee wallpaper: a lattice and a palmette, drawn twice as big and reduced."""
    S = tile * 2; im = Image.new('RGB', (S, S), a); d = ImageDraw.Draw(im)
    bc = tuple(int(b[i:i + 2], 16) for i in (1, 3, 5)); lc = tuple(int(line[i:i + 2], 16) for i in (1, 3, 5))
    def palmette(cx, cy, s):
        for ang, ln in ((0, 1), (22, .86), (-22, .86), (44, .7), (-44, .7), (68, .52), (-68, .52)):
            a0 = math.radians(ang - 90); pts = []; back = []
            for t in np.linspace(0, 1, 18):
                r = s * ln * t; wd = s * .13 * math.sin(t * math.pi) * (1.1 - t * .5)
                pts.append((cx + math.cos(a0) * r - math.sin(a0) * wd, cy + math.sin(a0) * r + math.cos(a0) * wd))
                back.append((cx + math.cos(a0) * r + math.sin(a0) * wd, cy + math.sin(a0) * r - math.cos(a0) * wd))
            d.polygon(pts + back[::-1], fill=bc)
        d.ellipse((cx - s * .16, cy - s * .16, cx + s * .16, cy + s * .16), fill=bc)
        d.polygon([(cx - s * .3, cy + s * .55), (cx, cy + s * .12), (cx + s * .3, cy + s * .55), (cx, cy + s * .34)], fill=bc)
    for ox in (0, S / 2, S):
        for sgn in (1, -1):
            d.line([(ox + sgn * S / 4 * (1 - math.cos(t * 2 * math.pi)) / 2, S * t) for t in np.linspace(0, 1, 60)], fill=lc, width=6)
    palmette(S / 2, S * .52, S * .34)
    for x in (0, S):
        for y in (.02, 1.02): palmette(x, S * y, S * .34)
    return np.asarray(im.resize((tile, tile), Image.LANCZOS)).astype(np.float32) / 255


def wall(w, h, mw, mh, pat, repeat=1.6, seed=2):
    """A wall mw by mh metres, wallpapered at a repeat in metres. Returns the paper and its metre coordinates."""
    tile = int(repeat * w / mw); t = np.asarray(Image.fromarray((pat * 255).astype(np.uint8)).resize((tile, tile), Image.LANCZOS)).astype(np.float32) / 255
    img = np.tile(t, (h // tile + 1, w // tile + 1, 1))[:h, :w]
    U, V = grid(w, h, 0, mw, mh, 0)
    return img * (.97 + .05 * fbm(w, h, 3, 30, seed))[..., None], U, V


def hall_walls():
    W = 2048; pat = damask()
    h1 = 980; img, U, V = wall(W, h1, 23, 11, pat)   # side wall, 23 by 11: top of the atlas
    tall = .78 + .34 * np.exp(-((V - 5.2) / 4) ** 2)
    pools = .12 * gauss(U, V, 6.4, 7, 5, 3) + .12 * gauss(U, V, 14, 7, 5, 3)
    img = img * (tall + pools)[..., None]
    for i in range(6):
        z = 1.9 + i * 3.8
        img = img * (1 - .16 * np.exp(-((U - z - .5) / .5) ** 2) - .1 * np.exp(-((U - z + .5) / .35) ** 2))[..., None]
    for i in range(5):   # the mirrors, painted: soft silver with a diagonal sheen
        zm = 1.9 + i * 3.8 + 1.9
        m = (np.abs(U - zm) < 1.1) & (np.abs(V - 3.2) < 2.25)
        g = lerp(hex3('#f7e6ef'), hex3('#bfe0f4'), ((V - .95) / 4.5)[..., None])
        g = g + (.16 * np.exp(-(((U - zm) + (V - 3.2) * .5 + .3) / .22) ** 2) + .1 * np.exp(-(((U - zm) + (V - 3.2) * .5 - .4) / .1) ** 2))[..., None]
        img = np.where(m[..., None], g, img)
        m2 = (np.abs(U - zm) < 1.1) & (np.abs(V - 7.8) < .8)
        img = np.where(m2[..., None], np.clip(lerp(hex3('#fff1dc'), hex3('#ffe4ee'), ((V - 7) / 1.6)[..., None]), 0, 1), img)
    h2 = 866; b, U, V = wall(W, h2, 26, 11, pat)     # end walls, 26 by 11: below it
    b = b * ((.78 + .34 * np.exp(-((V - 5.2) / 4) ** 2)) * (.86 + .2 * np.exp(-((U - 13) / 9) ** 2)))[..., None]
    a = np.zeros((2048, W, 3), np.float32); a[:h1] = img; a[1000:1000 + h2] = b; a[h1:1000] = img[-1]
    save('hall_walls', a)


def sky_tex(w, h, seed=5):
    X, Y = grid(w, h, 0, 1, 0, 1)
    img = lerp(hex3('#6db6ec'), hex3('#d5f0fb'), (Y ** 1.2)[..., None])
    img = lerp(img, hex3('#ffe0e6'), ((np.clip(Y - .62, 0, 1) / .38) ** 2 * .9)[..., None])
    n = fbm(w, h, 6, 3, seed, ax=w / h * .8); m = fbm(w, h, 2, 2, seed + 1, ax=w / h)
    c = np.clip((n + m * .35 - .62) / .1, 0, 1); c2 = np.clip((n + m * .35 - .67) / .12, 0, 1)
    img = lerp(img, hex3('#ffc9d8'), (c * .9)[..., None]); return lerp(img, hex3('#fffaf0'), (c2 * .96)[..., None])


def sky_panel():
    save('sky_panel', sky_tex(1024, 1024))


def ceiling():
    """A painted ceiling: sky through a gold oval, panels round it. Used by both rooms."""
    W, H = 2048, 1024
    X, Y = grid(W, H, -1, 1, -.5, .5)
    img = np.tile(hex3('#fff1dc'), (H, W, 1)) * (.92 + .08 * fbm(W, H, 4, 8, 3))[..., None]
    r = np.hypot(X / .9, Y / .42)
    img = np.where((r < 1)[..., None], sky_tex(W, H, 8), img)
    gold = hex3('#e2b64f')
    bead = (.82 + .18 * np.sin(np.arctan2(Y / .42, X / .9) * 90))[..., None]
    img = np.where(((r > .98) & (r < 1.05))[..., None], gold * bead, img)
    img = np.where(((r > 1.08) & (r < 1.095))[..., None], gold, img)
    for sx in (-1, 1):
        for sy in (-1, 1):
            rc = np.hypot((X - sx) / .3, (Y - sy * .5) / .3)
            img = np.where(((rc < 1) & (r > 1.1))[..., None], hex3('#f7c9d2'), img)
            img = np.where(((rc > .98) & (rc < 1.02) & (r > 1.1))[..., None], gold, img)
    img = np.where((np.abs(np.maximum(np.abs(X) - .96, np.abs(Y) - .46)) < .008)[..., None], gold, img)
    save('ceiling', img * (.8 + .3 * np.exp(-(r / 1.1) ** 2))[..., None])


def din_floor():
    W, H = 1024, 2048
    X, Z = grid(W, H, -5.5, 5.5, 32, 0)
    img = checker(W, H, X, Z, 1.375, hex3('#fbf2dd'), hex3('#bfe9d4'), 2)
    a = np.abs(X)   # the rug down the middle
    rug = (a < 2.1) & (np.abs(Z - 16) < 15.4)
    r = np.where((a < 1.95)[..., None], hex3('#f7c9d2'), hex3('#e2b64f'))
    r = np.where((a < 1.85)[..., None], hex3('#ee8aa2'), r)
    r = np.where((a < 1.7)[..., None], hex3('#f9d4dc'), r)
    pat = np.abs(((Z / 1.2) % 1) - .5) + np.abs(a / 1.2 % 1 - .5) < .24
    r = np.where(((a < 1.6) & pat)[..., None], hex3('#f4b5c4'), r)
    r = r * (.97 + .05 * fbm(W, H, 2, 60, 2))[..., None]
    img = np.where(rug[..., None], r, img)
    ao = np.clip(np.minimum(5.5 - a, np.minimum(Z, 32 - Z)) / 1.3, 0, 1) ** .6
    save('din_floor', img * (.9 + .1 * ao)[..., None])


def din_walls():
    W = 2048
    h1 = 446; img, U, V = wall(W, h1, 32, 7, damask(a='#bcdff4', b='#d6edfa', line='#a9d2ec'), repeat=1.3)
    img = img * (.82 + .3 * np.exp(-((V - 3.2) / 2.6) ** 2))[..., None]
    h2 = 1303; b, U, V = wall(W, h2, 11, 7, damask(), repeat=1.3)
    b = b * (.82 + .3 * np.exp(-((V - 3.2) / 2.6) ** 2))[..., None]
    a = np.zeros((2048, W, 3), np.float32); a[:h1] = img; a[h1:470] = img[-1]; a[470:470 + h2] = b
    def px(x, y): return int((x + 5.5) / 11 * W), 470 + int((7 - y) / 7 * h2)
    x0, y0 = px(-4.3, 6.1); x1, y1 = px(1.1, 1.1)   # the far wall's mirror, left of the door
    Xm, Ym = grid(x1 - x0, y1 - y0, 0, 1, 0, 1)
    mir = lerp(hex3('#ccebf9'), hex3('#f9e5ee'), Ym[..., None])
    mir = mir + (.16 * np.exp(-((Xm + Ym * .5 - .6) / .05) ** 2) + .1 * np.exp(-((Xm + Ym * .5 - .74) / .02) ** 2))[..., None]
    a[y0:y1, x0:x1] = mir
    save('din_walls', a)


def ground():
    """The garden from the air, 300 by 300 m around the house. Fades to the far ground colour at the edge, so no rectangle shows."""
    W = H = 2048
    X, Z = grid(W, H, -150, 150, 165, -135)   # top of image is the far side, +z
    far = hex3('#a9e3c6')
    img = lerp(hex3('#a4e2c2'), hex3('#b9eed3'), (np.floor((X + 300) / 5) % 2 == 0)[..., None].astype(float))
    img = img * (.97 + .06 * fbm(W, H, 5, 14, 3))[..., None]
    gravel = hex3('#fff0dc'); hedge = hex3('#6fbf98'); rose = hex3('#f7a9bc'); lil = hex3('#d3c2ee')
    walk = (np.maximum(np.abs(X) - 30, np.abs(Z - 12.5) - 21) < 0) & ~(np.maximum(np.abs(X) - 26.5, np.abs(Z - 12.5) - 17.5) < 0)
    img = np.where(walk[..., None], gravel, img)
    for s in (-1, 1):   # parterres: knots of hedge and flowers
        for cx in (34, 62):
            for cz in (-26, 8, 42):
                if cx == 34 and cz == 8: continue
                ax = X - s * cx; az = Z - cz; r = np.hypot(ax, az); sq = np.maximum(np.abs(ax), np.abs(az))
                img = np.where((sq < 11.5)[..., None], gravel, img)
                img = np.where((sq < 10.5)[..., None], hedge, img)
                img = np.where((sq < 9.9)[..., None], hex3('#c2ecd8'), img)
                th = np.arctan2(az, ax) + math.pi
                for k, col in ((0, rose), (1, lil), (2, rose), (3, hex3('#fff6d8'))):
                    seg = (np.floor(th / (math.pi / 2)) % 4 == k) & (r > 2.4) & (r < 8.6) & (np.abs(np.abs(ax) - np.abs(az)) > .6) & (np.abs(ax) > .5) & (np.abs(az) > .5)
                    img = np.where(seg[..., None], col, img)
                img = np.where((r < 2.4)[..., None], hedge, img); img = np.where((r < 1.2)[..., None], hex3('#a9dcf2'), img)
    wat = lerp(hex3('#7fc9ee'), hex3('#c6ecfa'), fbm(W, H, 4, 18, 2)[..., None])   # a long basin behind the house, a rond point
    img = np.where((np.maximum(np.abs(X) - 8, np.abs(Z - 68) - 26) < 0)[..., None], gravel, img)
    img = np.where(((np.abs(X) < 6) & (Z > 44) & (Z < 92))[..., None], wat, img)
    r = np.hypot(X, Z - 110)
    for rr, c in ((16, gravel), (14, rose), (12, hedge)): img = np.where((r < rr)[..., None], c, img)
    img = np.where((r < 5)[..., None], wat, img)
    r = np.hypot(X, Z + 58)   # the drive: a circle outside the gate, a road out to the edge
    img = np.where((r < 13)[..., None], gravel, img); img = np.where((r < 6.6)[..., None], hex3('#b9eed3'), img); img = np.where((r < 2.2)[..., None], hedge, img)
    img = np.where(((np.abs(X) < 3.4) & (Z < -58))[..., None], gravel, img)
    img = np.where(((np.abs(X) < 3.1) & (Z > -46) & (Z < -40))[..., None], gravel, img)
    tr = Image.new('L', (W, H), 0); sh = Image.new('L', (W, H), 0); dt = ImageDraw.Draw(tr); ds = ImageDraw.Draw(sh)
    def tree(x, z, r):
        px = (x + 150) / 300 * W; pz = (165 - z) / 300 * H; pr = r / 300 * W
        ds.ellipse((px - pr + pr * .9, pz - pr + pr * .5, px + pr + pr * .9, pz + pr + pr * .5), fill=255); dt.ellipse((px - pr, pz - pr, px + pr, pz + pr), fill=255)
    for z in np.arange(-128, -48, 10):
        for s in (-1, 1): tree(s * 9, z, 3.4)
    r0 = np.random.default_rng(3)
    for a in np.arange(0, 2 * math.pi, .1):
        tree(math.cos(a) * 128 * (1 + .03 * r0.random()), 15 + math.sin(a) * 138 * (1 + .03 * r0.random()), 5 + 2 * r0.random())
    sh = blur(np.asarray(sh, float) / 255, 6); tr = blur(np.asarray(tr, float) / 255, 1.2)
    img = img * (1 - .34 * sh)[..., None]
    leaf = lerp(hex3('#58ad86'), hex3('#a6e6c4'), np.clip(fbm(W, H, 4, 60, 8) * 2 - .5, 0, 1)[..., None])
    img = lerp(img, leaf, tr[..., None])
    img = img * (1 - .3 * blur(((np.abs(X - 3) < 23) & (Z > -8) & (Z < 24)).astype(float), 8))[..., None]   # the house's shadow
    e = np.clip((np.maximum(np.abs(X), np.abs(Z - 15)) - 134) / 15, 0, 1)[..., None] ** 1.5
    save('ground', lerp(img, far, e))


def path_tex():
    """The front path, 5.2 by 40 m: cream flags in a running bond and the shade of the hedges down both sides."""
    W, H = 512, 2048
    X, Z = grid(W, H, -2.6, 2.6, 40, 0)
    row = np.floor(Z / .9).astype(int); off = (row % 2) * .65
    fx = (X + off) / 1.3; fz = Z / .9
    j = np.minimum(np.abs(fx - np.round(fx)) * 1.3, np.abs(fz - np.round(fz)) * .9)
    img = np.tile(hex3('#fff0dc'), (H, W, 1)) * (.95 + .08 * fbm(W, H, 5, 26, 4))[..., None]
    img = img * (1 - .16 * np.clip(1 - j / .018, 0, 1))[..., None]
    img = img * (.975 + .04 * (((np.floor(fx).astype(int) * 7 + row * 3) % 4) / 4)[..., None])
    save('path', img * (.82 + .2 * np.clip((2.6 - np.abs(X)) / 1.6, 0, 1) ** .6)[..., None])


def ply():
    """A row of plywood sheets from behind, 24.4 by 8 m: grain, knots, stencils, water stain."""
    W, H = 2048, 672
    X, Y = grid(W, H, 0, 24.4, 8, 0)
    g = fbm(W, H, 5, 3, 3, ax=.2)
    bands = np.sin(Y * 40 + X * 3 + g * 60) * .5 + .5
    img = lerp(hex3('#a58a64'), hex3('#c6ae86'), (bands * .6 + fbm(W, H, 4, 10, 8) * .6)[..., None])
    ix = np.floor(X / 2.44); iy = np.floor(Y / (8 / 3))
    img = img * (.88 + .14 * (((ix * 5 + iy * 3) % 7) / 7)[..., None])
    fx = np.abs(X / 2.44 - np.round(X / 2.44)) * 2.44; fy = np.abs(Y / (8 / 3) - np.round(Y / (8 / 3))) * (8 / 3)
    img = img * (1 - .5 * np.clip(1 - np.minimum(fx, fy) / .012, 0, 1))[..., None]
    img = img * (1 - .45 * np.clip((fbm(W, H, 6, 14, 11) - .68) / .05, 0, 1))[..., None]
    stain = np.clip((fbm(W, H, 5, 5, 6) - .5) * 4, 0, 1) * np.clip(1.6 - Y / 2, 0, 1)
    img = lerp(img, hex3('#5e5140'), (stain * .55)[..., None])
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im); sc = W / 24.4
    for i in range(11):
        for j in range(21):
            for y in (0, 8 / 3, 16 / 3):
                px = i * 2.44 * sc + 8; py = (j * .133 + y) * sc
                d.ellipse((px - 1.2, py - 1.2, px + 1.2, py + 1.2), fill=(70, 60, 48))
    for x, y in ((1.2, 2.6), (6.1, 1.8), (11.3, 2.9), (16.4, 2), (21.4, 2.6)):   # stencilled this-way-up arrows
        px, py = x * sc, H - y * sc
        for k, t in enumerate((.42, .18)):
            d.rectangle((px, py + k * 16, px + 60 * t * 2.4, py + k * 16 + 8), fill=(58, 52, 50))
        for a, b in (((76, -6), (100, 8)), ((76, 22), (100, 8)), ((62, 8), (100, 8))):
            d.line((px + a[0], py + a[1], px + b[0], py + b[1]), fill=(58, 52, 50), width=4)
    save('ply', np.asarray(im).astype(np.float32) / 255)


def charts():
    """A chart of a lawn, and a bigger one: bars of grass going up, a line that only rises. No words."""
    for name, n, grow in (('chart_a', 6, 1.0), ('chart_b', 11, 1.5)):
        W, H = 1024, 768
        im = Image.new('RGB', (W, H), (255, 248, 236)); d = ImageDraw.Draw(im)
        for y in range(90, H - 70, 84): d.line((80, y, W - 40, y), fill=(242, 214, 222), width=3)
        d.line((80, 50, 80, H - 70), fill=(198, 150, 60), width=8); d.line((80, H - 70, W - 40, H - 70), fill=(198, 150, 60), width=8)
        r = np.random.default_rng(n); bw = (W - 170) / n; hs = []
        for i in range(n):
            ht = (.15 + .8 * ((i + 1) / n) ** (1.9 / grow)) * (H - 180)
            x0 = 110 + i * bw; x1 = x0 + bw * .74; hs.append(((x0 + x1) / 2, H - 74 - ht))
            d.rectangle((x0, H - 74 - ht, x1, H - 74), fill=(142, 214, 182))
            for b in range(int(bw * 1.6)):
                bx = x0 + r.random() * (x1 - x0); by = H - 74 - ht * r.random(); bh = 12 + 16 * r.random()
                d.line((bx, by, bx + 3 * (r.random() - .5), by - bh), fill=(int(r.integers(84, 130)), int(r.integers(170, 214)), int(r.integers(120, 160))), width=2)
            for b in range(int(bw * .8)):
                bx = x0 + r.random() * (x1 - x0); d.line((bx, H - 74 - ht, bx + 5 * (r.random() - .5), H - 74 - ht - 10 - 14 * r.random()), fill=(96, 184, 136), width=3)
        for a, b in zip(hs, hs[1:]): d.line((a[0], a[1] - 32, b[0], b[1] - 32), fill=(240, 96, 130), width=8)
        x, y = hs[-1]; y -= 32
        d.polygon([(x + 26, y - 26), (x - 18, y - 18), (x + 12, y + 18)], fill=(240, 96, 130))
        im.save(os.path.join(OUT, name + '.png')); print('tex', name)


def lawn_square():
    """Grass in close-up for the gold frame and the pot."""
    W = H = 512
    n = fbm(W, H, 5, 30, 2)
    img = lerp(hex3('#3e8c4a'), hex3('#a6e07a'), np.clip(n * 1.6 - .25, 0, 1)[..., None])
    im = Image.fromarray((img * 255).astype(np.uint8)); d = ImageDraw.Draw(im); r = np.random.default_rng(4)
    for i in range(6000):
        x, y = r.random(2) * 512; a = r.random() * .9 - .45; ln = 16 + 28 * r.random(); t = r.random()
        d.line((x, y, x + math.sin(a) * ln, y - math.cos(a) * ln), fill=(int(70 + 110 * t), int(150 + 80 * t), int(70 + 50 * t)), width=2)
    im.save(os.path.join(OUT, 'lawn_square.png')); print('tex lawn_square')


def vase():
    """The painted vase: a flat picture of a vase. It was never a vase."""
    W, H = 512, 896
    im = Image.new('RGB', (W, H), (247, 196, 208)); d = ImageDraw.Draw(im)
    pts = []
    for t in np.linspace(0, 1, 40):
        w = 110 - t * 330 if t < .14 else 62 + 136 * math.sin(min(t * 1.25, 1) * math.pi) ** .9 * (1 if t < .8 else 1 - (t - .8) * 1.4)
        pts.append((256 + w, 90 + t * 700))
    d.polygon(pts + [(512 - x, y) for x, y in pts[::-1]], fill=(143, 198, 234))
    d.rectangle((124, 790, 388, 820), fill=(226, 182, 79)); d.rectangle((166, 78, 346, 98), fill=(226, 182, 79))
    d.line((150, 330, 360, 330), fill=(226, 182, 79), width=10); d.line((130, 470, 382, 470), fill=(226, 182, 79), width=10)
    for x, y, c in ((256, 50, (242, 115, 143)), (180, 76, (255, 243, 223)), (332, 72, (220, 205, 242))):
        d.ellipse((x - 48, y - 40, x + 48, y + 40), fill=c)
    im.filter(ImageFilter.GaussianBlur(.7)).save(os.path.join(OUT, 'vase.png')); print('tex vase')


ALL = dict(hall_floor=hall_floor, hall_walls=hall_walls, sky_panel=sky_panel, ceiling=ceiling, din_floor=din_floor, din_walls=din_walls, ground=ground, path=path_tex, ply=ply, charts=charts, lawn_square=lawn_square, vase=vase)
for n in (sys.argv[1:] or ALL):
    ALL[n]()
