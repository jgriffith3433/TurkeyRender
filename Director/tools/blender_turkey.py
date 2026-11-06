"""TK Shock turkey upgrade. Background Blender script, staged:

  blender -b --factory-startup -P Director/tools/blender_turkey.py -- <stage> [args]

Stages (each reads what the one before wrote):
  textures   procedural feather / skin atlas: albedo per colour, shared normal and mask (no Cycles)
  build      import the source armature and takes, build hero and crowd meshes, save _work/turkey.blend
  bake       Cycles: bake the hero plumage into the body patch of the atlas (takes Director/gen/heavy.lock)
  export     write the six FBX files
  render     check renders. render <name> <hero|crowd> <white|brown|black> <take> <frame> <cam> <light>
  views      a tiled sheet of renders (takes heavy.lock)
  verify     compares every export with the source: axes, takes, bone positions through every take
  final      the whole check set into Director/gen/turkey/checks (takes heavy.lock per sheet)

Full rebuild order: textures, build, bake, export, verify, final. `textures` clears the baked patch, so bake must follow it.

Art bible rules kept here: matte feathers, alpha cutout only, no metal, no shading painted into albedo (occlusion lives
in the mask's G channel), 2048 px at most, MV/Lit map names.
"""
import math
import os
import sys

import numpy as np

ROOT = "C:/Projects/TKShock"
SRC = ROOT + "/Assets/GrigoriyArx/AnimalsGK/Sources/FarmBirdsModels/18TurkeyWhite.fbx"
OUT = ROOT + "/Director/gen/turkey"
WORK = OUT + "/_work"
TEX = OUT + "/textures"
BLEND = WORK + "/turkey.blend"
LOCK = ROOT + "/Director/gen/heavy.lock"
ATLAS = 2048
COLOURS = ("white", "brown", "black")

# Atlas rectangles in pixels from the bottom-left: x, y, w, h.
CELLS = {
    "body": (0, 1024, 1024, 1024),      # baked hero plumage, the shell's UV island lives here
    "rect0": (1032, 1032, 192, 1008), "rect1": (1232, 1032, 192, 1008), "rect2": (1432, 1032, 192, 1008),
    "prim0": (1632, 1032, 192, 1008), "prim1": (1832, 1032, 192, 1008),
    "cov0": (8, 520, 192, 496), "cov1": (208, 520, 192, 496), "cov2": (408, 520, 192, 496),
    "sec0": (608, 520, 196, 496), "sec1": (812, 520, 204, 496),
    "bd0": (8, 264, 240, 240), "bd1": (264, 264, 240, 240), "bd2": (520, 264, 240, 240), "bd3": (776, 264, 240, 240),
    "bd4": (8, 8, 240, 240), "bd5": (264, 8, 240, 240), "bd6": (520, 8, 240, 240), "bd7": (776, 8, 240, 240),
    "skin": (1032, 520, 496, 496),
    "leg": (1544, 520, 496, 496),
    "beak": (1032, 264, 240, 240),
    "eye": (1288, 264, 240, 240),
    "hack0": (1544, 264, 118, 240), "hack1": (1670, 264, 118, 240),
    "hair": (1796, 264, 244, 240),
    "wart": (1032, 8, 1008, 240),
}


def uv_rect(name):
    x, y, w, h = CELLS[name]
    return x / ATLAS, y / ATLAS, w / ATLAS, h / ATLAS


# ------------------------------------------------------------------------------------------------- texture helpers

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = np.asarray(t)
    return np.asarray(a) * (1 - t[..., None]) + np.asarray(b) * t[..., None]


def value_noise(h, w, cells_y, cells_x, rng):
    g = rng.random((int(cells_y) + 2, int(cells_x) + 2))
    y = np.linspace(0, cells_y, h, endpoint=False)
    x = np.linspace(0, cells_x, w, endpoint=False)
    yi, xi = y.astype(int), x.astype(int)
    fy, fx = y - yi, x - xi
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    c00 = g[np.ix_(yi, xi)]
    c01 = g[np.ix_(yi, xi + 1)]
    c10 = g[np.ix_(yi + 1, xi)]
    c11 = g[np.ix_(yi + 1, xi + 1)]
    return (c00 * (1 - fx) + c01 * fx) * (1 - fy)[:, None] + (c10 * (1 - fx) + c11 * fx) * fy[:, None]


def fbm(h, w, cells_y, cells_x, rng, octaves=4):
    out, amp, tot = np.zeros((h, w)), 1.0, 0.0
    for _ in range(octaves):
        out += amp * value_noise(h, w, cells_y, cells_x, rng)
        tot += amp
        amp *= 0.5
        cells_y, cells_x = cells_y * 2, cells_x * 2
    return out / tot


def worley(h, w, ny, nx, rng, jitter=0.9, stagger=False, wrap_x=True):
    """F1 and F2 distance in cell units, on a jittered (optionally brick) grid."""
    pts = rng.random((ny, nx, 2)) * jitter + (1 - jitter) / 2
    yy = (np.arange(h) + 0.5) / h * ny
    xx = (np.arange(w) + 0.5) / w * nx
    Y, X = np.meshgrid(yy, xx, indexing="ij")
    best1 = np.full((h, w), 9.0)
    best2 = np.full((h, w), 9.0)
    cy, cx = Y.astype(int), X.astype(int)
    for dy in (-1, 0, 1):
        for dx in (-2, -1, 0, 1, 2) if stagger else (-1, 0, 1):
            iy = cy + dy
            ix = cx + dx
            py = pts[np.mod(iy, ny), np.mod(ix, nx), 0] + iy
            shift = 0.5 * (np.mod(iy, 2)) if stagger else 0
            px = pts[np.mod(iy, ny), np.mod(ix, nx), 1] + ix + shift
            d = np.sqrt((X - px) ** 2 + (Y - py) ** 2)
            b2 = np.where(d < best1, best1, np.minimum(best2, d))
            best1 = np.minimum(best1, d)
            best2 = b2
    return best1, best2


# Linear albedo palettes. Matte: colour carries the bronze, never metal.
PAL = {
    "brown": dict(
        down=(0.11, 0.085, 0.07), main=[(0.135, 0.050, 0.020), (0.170, 0.082, 0.024), (0.075, 0.085, 0.040), (0.125, 0.036, 0.030)],
        band=(0.010, 0.009, 0.009), edge=(0.20, 0.095, 0.036), rachis=(0.10, 0.07, 0.05),
        tail_a=(0.125, 0.055, 0.024), tail_b=(0.016, 0.012, 0.010), tail_tip=(0.30, 0.145, 0.060),
        bar_a=(0.27, 0.215, 0.15), bar_b=(0.018, 0.015, 0.014)),
    "black": dict(
        down=(0.035, 0.035, 0.04), main=[(0.040, 0.050, 0.046), (0.055, 0.045, 0.030), (0.035, 0.050, 0.062), (0.05, 0.036, 0.05)],
        band=(0.012, 0.012, 0.014), edge=(0.085, 0.09, 0.085), rachis=(0.06, 0.06, 0.06),
        tail_a=(0.034, 0.038, 0.04), tail_b=(0.016, 0.016, 0.018), tail_tip=(0.10, 0.095, 0.085),
        bar_a=(0.06, 0.062, 0.065), bar_b=(0.018, 0.018, 0.02)),
    "white": dict(
        down=(0.52, 0.48, 0.44), main=[(0.76, 0.73, 0.67), (0.80, 0.77, 0.70), (0.72, 0.71, 0.68), (0.78, 0.74, 0.66)],
        band=(0.54, 0.50, 0.44), edge=(0.88, 0.86, 0.81), rachis=(0.80, 0.76, 0.66),
        tail_a=(0.80, 0.77, 0.70), tail_b=(0.60, 0.56, 0.49), tail_tip=(0.90, 0.88, 0.82),
        bar_a=(0.84, 0.81, 0.74), bar_b=(0.60, 0.56, 0.50)),
}

FEATHER = {
    #        wmax  shoulder taperbase bend  aspect(width/len) barbs  splits
    "rect": (0.90, 0.88, 0.42, 0.00, 0.21, 95, 3),
    "prim": (0.86, 0.68, 0.30, 0.06, 0.20, 90, 2),
    "cov": (0.92, 0.62, 0.40, 0.03, 0.36, 60, 1),
    "sec": (0.92, 0.74, 0.40, 0.03, 0.30, 70, 2),
    "bd": (0.94, 0.42, 0.34, 0.00, 0.90, 26, 0),
    "hack": (0.70, 0.40, 0.30, 0.02, 0.40, 40, 0),
}


def feather_shape(w, h, kind, rng):
    """Returns the fields every colour shares: mask alpha, height, ao, coords."""
    wmax, v0, base, bend, aspect, barbs, splits = FEATHER[kind]
    v = ((np.arange(h) + 0.5) / h)[:, None] * np.ones((h, w))
    u = ((np.arange(w) + 0.5) / w * 2 - 1)[None, :] * np.ones((h, w))
    v = v * 1.02 - 0.01
    u2 = u - bend * v * v
    side = np.where(u2 >= 0, 1.0, 0.0)
    profile = base + (1 - base) * smooth(0, 0.30, v)
    tip = np.sqrt(np.clip(1 - ((v - v0) / (1.0 - v0)) ** 2, 0, 1))
    half = wmax * profile * np.where(v > v0, tip, 1.0)
    half = half * (0.97 + 0.05 * fbm(h, w, 7, 2, rng))
    if kind == "prim":  # narrow leading edge
        half = half * np.where(u2 < 0, 0.60, 1.0)
    slope = aspect * 0.75
    s = v - slope * np.abs(u2)
    # A few clean splits in the vane, wedge shaped along a barb.
    cut = np.zeros((h, w))
    for _ in range(splits):
        sc, sd = rng.uniform(0.40, 0.92), rng.random() < 0.5
        depth = rng.uniform(0.25, 0.55)
        wedge = 1 - np.abs(s - sc) / (0.004 + 0.012 * (np.abs(u2) / np.maximum(half, 1e-3)))
        wedge = np.clip(wedge, 0, 1) * ((u2 >= 0) == sd)
        cut = np.maximum(cut, wedge * smooth(1 - depth, 1 - depth + 0.02, np.abs(u2) / np.maximum(half, 1e-3)))
    px = w / 2
    edge = (half - np.abs(u2)) * px
    alpha = np.clip(0.5 + edge / 1.3, 0, 1) * (1 - cut) * (v > 0.0) * (v < 1.0)
    # Downy base breaks into wisps.
    if kind in ("bd", "hack"):
        wisp = fbm(h, w, 4, 16, rng, 2)
        alpha *= np.clip(0.5 + (v - 0.15 + (wisp - 0.5) * 0.6) * 14, 0, 1)
    barb = 0.5 + 0.5 * np.sin(2 * np.pi * (s * barbs + (fbm(h, w, 5, 3, rng, 2) - 0.5) * 2.0) + side * 1.3)
    rw = (0.05 * (1 - v) + 0.012) * (1.0 if kind != "bd" else 1.4)
    rachis = smooth(rw, rw * 0.45, np.abs(u2))
    # Height: vane falls off from the shaft, barbs ride on it, shaft stands proud.
    vane = np.clip(1 - np.abs(u2) / np.maximum(half, 0.01), 0, 1) ** 0.6
    height = 0.45 * vane + 0.22 * barb * vane + 0.65 * rachis
    ao = 0.45 + 0.55 * smooth(0.0, 0.42 if kind == "bd" else 0.28, v)
    return dict(u=u2, v=v, s=s, alpha=alpha, height=height, ao=ao, barb=barb, rachis=rachis, half=half, w=w, h=h, kind=kind)


def feather_colour(f, pal, seed):
    rng = np.random.default_rng(seed)
    h, w, u, v, s, kind = f["h"], f["w"], f["u"], f["v"], f["s"], f["kind"]
    mott = fbm(h, w, 14, 6, rng)
    if kind in ("bd", "hack"):
        # Scale feather: down, a sweep of bronze hues, black bar, thin bright edge. This bar pattern is what reads as "turkey".
        hues = pal["main"]
        h0 = hues[seed % len(hues)]
        h1 = hues[(seed + 1) % len(hues)]
        col = mix(h0, h1, smooth(0.42, 0.72, v + 0.12 * u + (mott - 0.5) * 0.25))
        col = mix(pal["down"], col, smooth(0.20, 0.42, v))
        t = v + 0.06 * (np.abs(u) ** 2)
        col = mix(col, pal["band"], smooth(0.74, 0.77, t) * (1 - smooth(0.915, 0.94, t)))
        col = mix(col, pal["edge"], smooth(0.915, 0.94, t))
    elif kind == "rect":
        # Tail: mottled zig-zag bars, then a black band, then the rust tip of a wild bronze.
        wob = (fbm(h, w, 10, 4, rng, 3) - 0.5) * 1.6
        bars = 0.5 + 0.5 * np.sin(2 * np.pi * (v * 15 + wob * 0.7 + 1.6 * np.abs(u)))
        col = mix(pal["tail_a"], pal["tail_b"], smooth(0.42, 0.60, bars + (mott - 0.5) * 0.5))
        col = mix(col, pal["tail_b"], smooth(0.74, 0.77, v + 0.03 * np.abs(u)))
        col = mix(col, np.asarray(pal["tail_tip"]) * (0.72 + 0.56 * mott)[..., None], smooth(0.885, 0.90, v + 0.03 * np.abs(u)))
        col = mix(pal["down"], col, smooth(0.04, 0.16, v))
    elif kind in ("prim", "sec"):
        wob2 = fbm(h, w, 5, 3, rng, 3)
        bars = 0.5 + 0.5 * np.sin(2 * np.pi * (s * (9 if kind == "prim" else 7) + (seed * 0.37) + (wob2 - 0.5) * 2.6))
        light_bar = np.asarray(pal["bar_a"]) if kind == "prim" else np.asarray(pal["bar_a"]) * 0.45 + np.asarray(pal["main"][seed % 4]) * 0.55
        col = mix(pal["bar_b"], light_bar, smooth(0.40, 0.60, bars + (mott - 0.5) * 0.4))
        col = mix(pal["down"], col, smooth(0.03, 0.14, v))
    else:  # covert: bronze with the black bar and pale edge, big enough to carry the wing
        hues = pal["main"]
        col = mix(hues[seed % 4], hues[(seed + 2) % 4], smooth(0.2, 0.7, v + (mott - 0.5) * 0.4))
        t = v + 0.05 * np.abs(u) ** 2
        col = mix(col, pal["band"], smooth(0.76, 0.79, t) * (1 - smooth(0.915, 0.93, t)))
        col = mix(col, pal["edge"], smooth(0.915, 0.93, t))
        # Coverts are seen whole, not just their tips: a second and third bar keep them as rich as the body.
        ch = t + 0.05 * np.abs(u) + (mott - 0.5) * 0.08
        col = mix(col, pal["band"], 0.9 * smooth(0.50, 0.525, ch) * (1 - smooth(0.60, 0.625, ch)))
        col = mix(col, pal["band"], 0.75 * smooth(0.28, 0.30, ch) * (1 - smooth(0.355, 0.375, ch)))
        col = mix(pal["down"], col, smooth(0.06, 0.2, v))
    col = col * (0.88 + 0.24 * f["barb"][..., None])
    col = mix(col, pal["rachis"], f["rachis"] * 0.6)
    return col


def skin_cell(colour, seed=5):
    """Neck and head skin. v=0 neck base, v=1 crown. Caruncle bumps are a surface, not painted shadow."""
    x, y, w, h = CELLS["skin"]
    rng = np.random.default_rng(seed)
    f1, f2 = worley(h, w, 30, 26, rng)
    bump = np.clip(1 - f1 / 0.8, 0, 1) ** 1.2
    height = bump * (0.35 + 0.65 * fbm(h, w, 6, 6, rng, 2))
    v = ((np.arange(h) + 0.5) / h)[:, None] * np.ones((h, w))
    if colour == "white":
        red, blue, base = (0.44, 0.045, 0.05), (0.24, 0.30, 0.46), (0.42, 0.16, 0.15)
    elif colour == "black":
        red, blue, base = (0.30, 0.03, 0.04), (0.13, 0.18, 0.32), (0.20, 0.08, 0.09)
    else:
        red, blue, base = (0.34, 0.028, 0.032), (0.14, 0.20, 0.36), (0.23, 0.08, 0.075)
    t = smooth(0.74, 0.96, v + (fbm(h, w, 5, 5, rng) - 0.5) * 0.34) * 0.7
    col = mix(mix(base, red, smooth(0.05, 0.40, v)), blue, t)
    col = mix(col, np.asarray(red) * 1.15, bump * 0.45 * (1 - t))
    return col, height * 0.8, 0.85 + 0.15 * bump, np.full((h, w), 0.2)


def wart_cell(colour, seed=9):
    x, y, w, h = CELLS["wart"]
    rng = np.random.default_rng(seed)
    f1, f2 = worley(h, w, 12, 50, rng)
    bump = np.clip(1 - f1 / 0.66, 0, 1) ** 0.6
    red = {"white": (0.46, 0.04, 0.045), "black": (0.30, 0.025, 0.035), "brown": (0.38, 0.024, 0.03)}[colour]
    deep = {"white": (0.22, 0.012, 0.03), "black": (0.12, 0.01, 0.018), "brown": (0.16, 0.008, 0.02)}[colour]
    col = mix(deep, red, smooth(0.15, 0.7, bump + (fbm(h, w, 6, 24, rng) - 0.5) * 0.5))
    return col, bump, 0.75 + 0.25 * bump, np.full((h, w), 0.3)


def leg_cell(colour, seed=13):
    """u around the shank (0.5 = front), v along it. Big transverse scutes down the front, pebbled sides."""
    x, y, w, h = CELLS["leg"]
    rng = np.random.default_rng(seed)
    f1, f2 = worley(h, w, 26, 20, rng, 0.75, True)
    pebble = smooth(0.0, 0.14, f2 - f1)
    uu = ((np.arange(w) + 0.5) / w)[None, :] * np.ones((h, w))
    vv = ((np.arange(h) + 0.5) / h)[:, None] * np.ones((h, w))
    rows = 24
    plate = np.abs(((vv * rows + 0.5 * (uu > 0.5)) % 1) - 0.5) * 2  # 1 at seams
    plate = smooth(0.84, 0.97, plate)
    front = smooth(0.20, 0.17, np.abs(uu - 0.5))
    height = (1 - front) * pebble * 0.8 + front * (1 - plate) * (0.9 + 0.1 * vv)
    tint = {"white": ((0.62, 0.36, 0.33), (0.40, 0.20, 0.19)), "black": ((0.17, 0.11, 0.11), (0.08, 0.05, 0.05)),
            "brown": ((0.48, 0.25, 0.23), (0.27, 0.13, 0.12))}[colour]
    col = mix(tint[1], tint[0], smooth(0.0, 0.9, height))
    return col * (0.92 + 0.16 * fbm(h, w, 40, 40, rng, 2))[..., None], height, 0.72 + 0.28 * height, np.full((h, w), 0.24)


def beak_cell(colour):
    x, y, w, h = CELLS["beak"]
    rng = np.random.default_rng(3)
    v = ((np.arange(h) + 0.5) / h)[:, None] * np.ones((h, w))
    tip, base = (0.20, 0.16, 0.10), (0.11, 0.07, 0.055)
    claw = (0.035, 0.03, 0.03)
    col = mix(base, tip, smooth(0.15, 0.85, v))
    uu = ((np.arange(w) + 0.5) / w)[None, :] * np.ones((h, w))
    col = mix(col, claw, uu > 0.5)  # right half of the cell is dark claw horn
    streak = fbm(h, w, 4, 30, rng, 3)
    return col * (0.8 + 0.4 * streak)[..., None], streak * 0.3, np.ones((h, w)), np.full((h, w), 0.34)


def eye_cell():
    """Planar map on the eyeball: dark hazel iris, pupil, wet."""
    x, y, w, h = CELLS["eye"]
    rng = np.random.default_rng(4)
    yy = (np.arange(h) + 0.5) / h * 2 - 1
    xx = (np.arange(w) + 0.5) / w * 2 - 1
    Y, X = np.meshgrid(yy, xx, indexing="ij")
    r = np.sqrt(X * X + Y * Y)
    a = np.arctan2(Y, X)
    fib = 0.5 + 0.5 * np.sin(a * 60 + 4 * fbm(h, w, 8, 8, rng, 2))
    col = mix((0.23, 0.12, 0.035), (0.075, 0.03, 0.012), smooth(0.25, 0.8, r))
    col = col * (0.8 + 0.4 * fib)[..., None]
    col = mix(col, (0.006, 0.005, 0.005), smooth(0.40, 0.37, r))
    col = mix(col, (0.01, 0.008, 0.008), smooth(0.80, 0.86, r))
    return col, np.zeros((h, w)), np.ones((h, w)), np.full((h, w), 0.93)


def hair_cell(colour):
    """Beard bristles: a few coarse strands."""
    x, y, w, h = CELLS["hair"]
    rng = np.random.default_rng(7)
    u = ((np.arange(w) + 0.5) / w)[None, :] * np.ones((h, w))
    v = ((np.arange(h) + 0.5) / h)[:, None] * np.ones((h, w))
    alpha = np.zeros((h, w))
    n = 9
    for i in range(n):
        c = (i + 0.5) / n + 0.012 * math.sin(i * 2.3)
        hw = 0.035 * (1 - v ** (3 + i % 3)) + 0.004
        wav = c + 0.012 * np.sin(v * (5 + i)) * v
        alpha = np.maximum(alpha, np.clip(0.5 + (hw - np.abs(u - wav)) * w / 1.3, 0, 1))
    base = {"white": (0.14, 0.12, 0.11), "brown": (0.018, 0.015, 0.014), "black": (0.012, 0.012, 0.013)}[colour]
    return np.ones((h, w, 3)) * np.asarray(base), alpha


def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def height_to_normal(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.dstack([-dx, -dy, np.ones_like(h)])
    return n / np.linalg.norm(n, axis=2, keepdims=True)


def save_png(path, rgba):
    import bpy
    h, w, _ = rgba.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.alpha_mode = "STRAIGHT"
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def stage_textures():
    os.makedirs(TEX, exist_ok=True)
    A = ATLAS
    height = np.zeros((A, A))
    strength = np.ones((A, A))
    ao = np.ones((A, A))
    smoothness = np.full((A, A), 0.12)
    alpha = np.zeros((A, A))
    albedo = {c: np.zeros((A, A, 3)) for c in COLOURS}
    for c in COLOURS:
        albedo[c][:] = PAL[c]["down"]

    def put(arr, name, val):
        x, y, w, h = CELLS[name]
        arr[y:y + h, x:x + w] = val

    groups = [("rect", 3, 2.0), ("prim", 2, 2.0), ("cov", 3, 2.2), ("sec", 2, 2.0), ("bd", 8, 2.2), ("hack", 2, 2.0)]
    for kind, n, st in groups:
        for i in range(n):
            name = "%s%d" % (kind, i)
            _, _, w, h = CELLS[name]
            f = feather_shape(w, h, kind, np.random.default_rng(100 + i * 7 + len(kind)))
            put(height, name, f["height"])
            put(strength, name, st)
            put(ao, name, f["ao"])
            put(alpha, name, f["alpha"])
            put(smoothness, name, 0.10 + 0.08 * f["rachis"])
            for c in COLOURS:
                put(albedo[c], name, feather_colour(f, PAL[c], 3 + i))

    for name, fn in (("skin", skin_cell), ("wart", wart_cell), ("leg", leg_cell), ("beak", lambda c: beak_cell(c))):
        for c in COLOURS:
            col, hh, oc, sm = fn(c)
            put(albedo[c], name, col)
        put(height, name, hh)
        put(strength, name, 3.0 if name != "skin" else 2.0)
        put(ao, name, oc)
        put(smoothness, name, sm)
        put(alpha, name, 1.0)
    col, hh, oc, sm = eye_cell()
    for c in COLOURS:
        put(albedo[c], "eye", col)
    put(ao, "eye", oc)
    put(smoothness, "eye", sm)
    put(alpha, "eye", 1.0)
    for c in COLOURS:
        col, al = hair_cell(c)
        put(albedo[c], "hair", col)
    put(alpha, "hair", al)
    put(height, "hair", al * 0.4)
    put(alpha, "body", 1.0)
    put(ao, "body", 1.0)

    normal = height_to_normal(height, strength)
    nrgba = np.dstack([normal * 0.5 + 0.5, np.ones((A, A))])
    save_png(TEX + "/turkey_normal.png", nrgba)
    # Mask: R metallic (always 0), G occlusion, B unused, A smoothness. One file serves _MetallicGlossMap and _OcclusionMap.
    save_png(TEX + "/turkey_mask.png", np.dstack([np.zeros((A, A)), ao, np.zeros((A, A)), smoothness]))
    for c in COLOURS:
        save_png(TEX + "/turkey_%s_albedo.png" % c, np.dstack([srgb(albedo[c]), alpha]))
    print("textures written")


STAGES = {"textures": stage_textures}


# ------------------------------------------------------------------------------------------------- geometry

LODS = {
    "hero": dict(shell_tris=5200, spacing=0.0142, plume_rows=3, plume_cols=2, plume_l=0.062, plume_w=0.058,
                 tail_rows=8, fan=19, cov_rows=5, cov_cols=2, cov_n=(17, 15, 13), prim=10, sec=14, wcov=(15, 13, 11),
                 ring=14, rings=44, blobs=58, blob_seg=(9, 6), hack=90, beard=9, leg_ring=8, leg_rows=10, toe_ring=6, toe_rows=7),
    "crowd": dict(shell_tris=1700, spacing=0.0265, plume_rows=2, plume_cols=2, plume_l=0.09, plume_w=0.084,
                  tail_rows=3, fan=15, cov_rows=2, cov_cols=1, cov_n=(13, 9, 0), prim=7, sec=9, wcov=(9, 7, 0),
                  ring=9, rings=20, blobs=0, blob_seg=(4, 3), hack=20, beard=3, leg_ring=5, leg_rows=3, toe_ring=4, toe_rows=3),
}


class Builder:
    """Accumulates one skinned mesh: verts, quads, per-loop uvs, per-vertex weights."""

    def __init__(self):
        self.v, self.f, self.uv, self.w = [], [], [], []

    def grid(self, pts, uvs, wts, facing=None):
        """pts[row][col] -> quads. wts: same shape, or one dict. facing: vector the first quad should face."""
        rows, cols = len(pts), len(pts[0])
        base = len(self.v)
        for r in range(rows):
            for c in range(cols):
                self.v.append(pts[r][c])
                self.w.append(wts[r][c] if isinstance(wts, list) else wts)
        flip = False
        if facing is not None:
            a, b, d = pts[0][0], pts[0][1], pts[1][0]
            flip = (b - a).cross(d - a).dot(facing) < 0
        for r in range(rows - 1):
            for c in range(cols - 1):
                q = (base + r * cols + c, base + r * cols + c + 1, base + (r + 1) * cols + c + 1, base + (r + 1) * cols + c)
                l = [uvs[r][c], uvs[r][c + 1], uvs[r + 1][c + 1], uvs[r + 1][c]]
                if flip:
                    q, l = q[::-1], l[::-1]
                self.f.append(q)
                self.uv.append(l)

    def fan_cap(self, ring_idx, centre, uv, w, facing):
        c = len(self.v)
        self.v.append(centre)
        self.w.append(w)
        for i in range(len(ring_idx) - 1):
            t = (ring_idx[i], ring_idx[i + 1], c)
            a, b = self.v[t[0]], self.v[t[1]]
            if (b - a).cross(centre - a).dot(facing) < 0:
                t = t[::-1]
            self.f.append(t)
            self.uv.append([uv, uv, uv])

    def tris(self):
        return sum(len(f) - 2 for f in self.f)


def cell_uv(name, u, v, u0=0.0, u1=1.0, v0=0.0, v1=1.0):
    x, y, w, h = uv_rect(name)
    return (x + (u0 + (u1 - u0) * u) * w, y + (v0 + (v1 - v0) * v) * h)


def catmull(pts, n):
    P = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    out = []
    segs = len(pts) - 1
    for i in range(n):
        t = i / (n - 1) * segs
        k = min(int(t), segs - 1)
        f = t - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        out.append(0.5 * ((2 * p1) + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f))
    return out


def fix_winding(b, first_face, centre_of):
    """Makes the faces from first_face on point away from centre_of(vert index), by testing the middle one."""
    k = first_face + (len(b.f) - first_face) // 2
    q = b.f[k]
    a, e, d = b.v[q[0]], b.v[q[1]], b.v[q[-1]]
    if (e - a).cross(d - a).dot(a - centre_of(q[0])) < 0:
        for i in range(first_face, len(b.f)):
            b.f[i] = b.f[i][::-1]
            b.uv[i] = b.uv[i][::-1]


def tube(b, path, radius, cell, wfn, seg, up, uvr=(0, 1, 0, 1), cap_start=False, cap_end=True):
    """Loft rings along path. radius(t, a) -> float or (rside, rup). Angle 0 points along `up` (u=0.5 of the cell)."""
    n = len(path)
    pts, uvs, wts = [], [], []
    nrm = None
    for i, c in enumerate(path):
        tang = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        if nrm is None:
            nrm = (up - tang * up.dot(tang)).normalized()
        else:
            nrm = (nrm - tang * nrm.dot(tang)).normalized()
        side = tang.cross(nrm).normalized()
        t = i / (n - 1)
        ring, ru, rw = [], [], []
        w = wfn(c, t)
        for j in range(seg + 1):
            a = -math.pi + 2 * math.pi * j / seg
            r = radius(t, a)
            rs, rn = r if isinstance(r, tuple) else (r, r)
            ring.append(c + nrm * (math.cos(a) * rn) + side * (math.sin(a) * rs))
            ru.append(cell_uv(cell, j / seg, t, uvr[0], uvr[1], uvr[2], uvr[3]))
            rw.append(w)
        pts.append(ring)
        uvs.append(ru)
        wts.append(rw)
    base = len(b.v)
    first = len(b.f)
    b.grid(pts, uvs, wts, None)
    cols = seg + 1

    def centre(idx):
        return path[(idx - base) // cols]

    fix_winding(b, first, centre)
    if cap_end:
        ridx = [base + (n - 1) * cols + j for j in range(cols)]
        b.fan_cap(ridx, path[-1] + (path[-1] - path[-2]) * 0.4, uvs[-1][0], wts[-1][0], path[-1] - path[-2])
    if cap_start:
        ridx = [base + j for j in range(cols)]
        b.fan_cap(ridx, path[0] - (path[1] - path[0]) * 0.4, uvs[0][0], wts[0][0], path[0] - path[1])


def blob(b, c, ax, ay, az, cell, u, v, du, dv, w, seg):
    """A squashed sphere. ax, ay, az are axis vectors with length."""
    segs, rings = seg
    pts, uvs = [], []
    for r in range(rings + 1):
        th = math.pi * r / rings
        row, ru = [], []
        for s in range(segs + 1):
            ph = 2 * math.pi * s / segs
            d = ax * (math.sin(th) * math.cos(ph)) + ay * (math.sin(th) * math.sin(ph)) + az * math.cos(th)
            row.append(c + d)
            ru.append(cell_uv(cell, u + du * (0.5 + 0.5 * math.sin(th) * math.cos(ph)), v + dv * (0.5 + 0.5 * math.sin(th) * math.sin(ph))))
        pts.append(row)
        uvs.append(ru)
    first = len(b.f)
    b.grid(pts, uvs, w, None)
    fix_winding(b, first, lambda i: c)


def flat_feather(b, base, dir_, nrm, L, W, cell, rows, cols, w, curl=0.0, sag=0.0, ridge=0.10, twist=0.0, two_sided=True, thick=0.0016):
    """A curved vane with a raised shaft so it catches a hard light. dir_ and nrm are unit vectors; cols quads across."""
    side = dir_.cross(nrm).normalized()
    pts, uvs = [], []
    for r in range(rows + 1):
        t = r / rows
        row, ru = [], []
        c = base + dir_ * (L * t) + nrm * (curl * L * t * t)
        tw = twist * t
        for k in range(cols + 1):
            u = k / cols * 2 - 1
            p = c + side * (u * W * 0.5) + nrm * (-ridge * W * abs(u) + tw * u * W * 0.5 - 0.5 * sag * W * u * u)
            row.append(p)
            ru.append(cell_uv(cell, 0.5 + 0.5 * u, t))
        pts.append(row)
        uvs.append(ru)
    b.grid(pts, uvs, w, nrm)
    if two_sided:
        pts2 = [[p - nrm * thick for p in row] for row in pts]
        b.grid(pts2, uvs, w, -nrm)


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.dot(ab), 1e-9)))
    return (a + ab * t - p).length


def smooth_s(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def build_lod(lod, shell_hi, rest, S):
    """Everything that isn't the source shell. rest[name] = (head, tail) in armature space."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    L = LODS[lod]
    rng = np.random.default_rng(42)
    b = Builder()

    def chain_w(p, names, power=5.0, keep=3):
        ws = {}
        for n in names:
            d = seg_dist(p, rest[n][0], rest[n][1])
            ws[n] = 1.0 / (d + 0.008) ** power
        top = sorted(ws.items(), key=lambda kv: -kv[1])[:keep]
        tot = sum(v for _, v in top)
        return {k: v / tot for k, v in top if v / tot > 0.04}

    # ---- plumage on the torso, snapped to the shell so it follows the body
    me = shell_hi.data
    verts = [v.co.copy() for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    tree = BVHTree.FromPolygons(verts, polys, all_triangles=False)
    vg_names = {g.index: g.name for g in shell_hi.vertex_groups}
    vw = [{vg_names[g.group]: g.weight for g in v.groups if g.weight > 0.001} for v in me.vertices]
    wing_names = {"shoulder_L", "arm_L", "forearm_L", "hand_L", "shoulder_R", "arm_R", "forearm_R", "hand_R"}

    def surf_w(q, idx):
        ids = polys[idx]
        ds = [1.0 / ((verts[i] - q).length + 0.002) ** 2 for i in ids]
        tot = sum(ds)
        out = {}
        for i, d in zip(ids, ds):
            for k, val in vw[i].items():
                out[k] = out.get(k, 0) + val * d / tot
        top = sorted(out.items(), key=lambda kv: -kv[1])[:4]
        s = sum(v for _, v in top)
        return {k: v / s for k, v in top}

    neck_c = Vector((0, -0.150, 0.46))
    areas = np.array([p.area for p in me.polygons])
    picks = rng.choice(len(polys), 16000 if lod == "hero" else 5000, p=areas / areas.sum())
    placed = []
    gridc = {}
    cs = 0.06

    for idx in picks:
        ids = polys[int(idx)]
        r = rng.random(len(ids))
        r = r / r.sum()
        p = Vector((0, 0, 0))
        for i, rr in zip(ids, r):
            p += verts[i] * float(rr)
        loc, n, fi, _ = tree.find_nearest(p)
        w0 = surf_w(loc, fi)
        if p.z < 0.135:
            continue  # bare shank
        sp = L["spacing"] * (0.66 + 0.6 * min(1.0, (loc - neck_c).length / 0.34))
        key = (int(loc.x // cs), int(loc.y // cs), int(loc.z // cs))
        ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for q in gridc.get((key[0] + dx, key[1] + dy, key[2] + dz), ()):
                        if (q - loc).length < sp:
                            ok = False
        if not ok:
            continue
        gridc.setdefault(key, []).append(loc)
        placed.append((loc.copy(), n.copy(), fi))
    print(lod, "plumage feathers", len(placed))

    for loc, n, fi in placed:
        leg_part = sum(v for k, v in surf_w(loc, fi).items() if k.startswith(("hip", "shin")))
        flow = (loc - neck_c).normalized() + Vector((0, 0.25, -0.10))
        if leg_part > 0.35:
            flow = Vector((0, 0.25, -1))
        w_here = surf_w(loc, fi)
        wing_bone = max(wing_names, key=lambda k: w_here.get(k, 0))
        on_wing = w_here.get(wing_bone, 0) > 0.4
        if on_wing:  # the wing shoulder: feathers flow back along the folded wing, set in the idle pose
            flow = S[wing_bone].to_3x3().inverted() @ Vector((0, 0.95, -0.35))
        d = (flow - n * flow.dot(n)).normalized()
        side = d.cross(n).normalized()
        d = (d + side * float(rng.normal(0, 0.14))).normalized()
        side = d.cross(n).normalized()
        dist = (loc - neck_c).length
        size = (0.60 + 0.62 * min(1.0, dist / 0.36)) * float(rng.uniform(0.94, 1.08))
        if leg_part > 0.35:
            size *= 0.72
        if on_wing:
            size *= 1.25
        Lf, Wf = L["plume_l"] * size, L["plume_w"] * size
        rows, cols = L["plume_rows"], L["plume_cols"]
        lift_tip = (0.012 + float(rng.uniform(0, 0.010))) * (1.0 if lod == "hero" else 1.3)
        pts, uvs, wts = [], [], []
        cell = "bd%d" % int(rng.integers(0, 8))
        for r in range(rows + 1):
            t = r / rows
            row, ru, rw = [], [], []
            for c in range(cols + 1):
                u = c / cols * 2 - 1
                q = loc + d * (Lf * t) + side * (u * Wf * 0.5 * (0.8 + 0.2 * t))
                s, ns, fj, _ = tree.find_nearest(q)
                lift = (0.0015 + lift_tip * t * t) * (1 - 0.22 * abs(u) * t)  # edges curve back to the body: each feather has form
                row.append(s + ns * lift)
                ru.append(cell_uv(cell, 0.5 + 0.5 * u, t))
                rw.append(surf_w(s, fj))
            pts.append(row)
            uvs.append(ru)
            wts.append(rw)
        b.grid(pts, uvs, wts, n)

    # ---- tail fan: rectrices plus layers of coverts, stacked toward the bird
    P = Vector((0, 0.118, 0.305))
    tilt = math.radians(17)
    up = Vector((0, math.sin(tilt), math.cos(tilt)))
    X = Vector((1, 0, 0))
    front = up.cross(X).normalized()
    if front.y > 0:
        front = -front

    def fan_layer(n, length, width, span, offset, cells, rows, cols, base_r):
        for i in range(n):
            f = (i + 0.5) / n * 2 - 1
            a = f * span + float(rng.normal(0, 0.008))
            dv = up * math.cos(a) + X * math.sin(a)
            # Outer feathers sit behind inner ones, so the fan shingles from the middle out.
            stack = offset + (1 - abs(f)) * 0.018 + (0.002 if i % 2 else 0)
            dl = length * (0.90 + 0.10 * math.cos(a * 0.8)) * float(rng.uniform(0.985, 1.015))
            base = P + dv * base_r + front * stack
            d2 = (dv - front * 0.05).normalized()
            n2 = (front - d2 * front.dot(d2)).normalized()
            cell = cells[int(rng.integers(0, len(cells)))]
            # Bound mostly to body like the source fan: the tail bone swings 60 degrees in some takes.
            flat_feather(b, base, d2, n2, dl, width * (1.0 if lod == "hero" else 1.26), cell, rows, cols, {"body": 0.72, "tail": 0.28}, curl=-0.05, sag=0.10, ridge=0.07, twist=0.06 * f)

    span = math.radians(112)
    fan_layer(L["fan"], 0.315, 0.066, span, 0.0, ["rect0", "rect1", "rect2"], L["tail_rows"], 2, 0.05)
    cov_cells = ["cov0", "cov1", "cov2"]
    for k, (n, ln, wd, off, r0) in enumerate(((L["cov_n"][0], 0.205, 0.066, 0.022, 0.04), (L["cov_n"][1], 0.15, 0.062, 0.036, 0.03),
                                              (L["cov_n"][2], 0.11, 0.058, 0.050, 0.02))):
        if n:
            fan_layer(n, ln, wd, span * (1.0 - 0.05 * k), off, cov_cells, L["cov_rows"], L["cov_cols"], r0)

    # undertail coverts close the rump seen from behind
    for i in range(L["cov_n"][0] + 4):
        f = (i + 0.5) / (L["cov_n"][0] + 4) * 2 - 1
        a = f * math.radians(100)
        dv = up * math.cos(a) * 0.9 + X * math.sin(a)
        d2 = (dv.normalized() + front * 0.28).normalized()
        n2 = (-front - d2 * (-front).dot(d2)).normalized()
        flat_feather(b, P + dv * 0.01 - front * 0.016, d2, n2, 0.15, 0.075, "cov%d" % (i % 3), L["cov_rows"], L["cov_cols"], {"body": 0.72, "tail": 0.28},
                     curl=0.08, sag=0.08, ridge=0.07, two_sided=False)

    # ---- wings: designed folded in the idle pose (a tom's dropped wing), then mapped back to rest through each bone
    for sx, sfx in ((1, "_L"), (-1, "_R")):
        names = ["arm" + sfx, "forearm" + sfx, "hand" + sfx]
        posed = [S[n] @ rest[n][0] for n in names] + [S[names[2]] @ rest[names[2]][1]]  # elbow, wrist, hand, tip
        Ao, Wr, Hd, Tp = posed
        outn = Vector((sx * 0.96, -0.03, 0.28)).normalized()
        lift_crowd = 0.012 if lod == "crowd" else 0.0

        def surface_x(p):
            hit = tree.ray_cast(Vector((sx * 0.7, p.y, p.z)), Vector((-sx, 0, 0)), 1.0)
            return abs(hit[0].x) if hit[0] is not None else 0.10

        def feather_posed(bone, base, tip, gap, wd, cell, rows, cols, curl, two=True, tuck=False):
            """Builds in idle-pose space, then moves the new verts to rest space through `bone`."""
            # The bones sit inside the plumage and the flank bulges, so the chord has to clear the body all the way along.
            xs = [surface_x(base.lerp(tip, k / 6)) for k in range(7)]
            x0 = max(xs[:4] + [abs(base.x)]) + gap + lift_crowd
            x1 = max(xs[3:]) + gap + lift_crowd
            if tuck:  # the root slides under the plumage, the tip rides over the feather row below
                x0 = xs[0] + tuck
                x1 = max(max(xs[2:]) + gap * 0.8 + lift_crowd, x0)
            base = Vector((sx * x0, base.y, base.z))
            tip = Vector((sx * max(x1, x0 - 0.02), tip.y, tip.z))
            d = (tip - base).normalized()
            nrm = (outn - d * outn.dot(d)).normalized()
            start = len(b.v)
            flat_feather(b, base, d, nrm, (tip - base).length, wd, cell, rows, cols, {bone: 1.0}, curl=curl, sag=0.05, ridge=0.075, two_sided=two)
            inv = S[bone].inverted()
            for i in range(start, len(b.v)):
                b.v[i] = inv @ b.v[i]

        def front_edge(t):  # wrist down the hand to its tip
            return Wr.lerp(Hd, t / 0.55) if t < 0.55 else Hd.lerp(Tp, (t - 0.55) / 0.45)

        # A folded wing is a teardrop: roots tuck under the body plumage, tips converge on a point behind the thigh.
        rear = Vector((0, 0.205, 0.135))

        def tip_towards(base, reach, spread):
            q = Vector((base.x, rear.y, rear.z + spread))
            d = (q - base)
            return base + d * reach

        n = L["prim"]
        for i in range(n):
            f = (i + 0.5) / n
            t = 0.25 + 0.75 * f
            base = front_edge(t) + Vector((0, 0.012, 0.022))
            tip = tip_towards(base, (0.98 - 0.10 * f) * float(rng.uniform(0.93, 1.03)), 0.016 - 0.052 * f + float(rng.uniform(-0.012, 0.012)))
            feather_posed(names[2] if t > 0.55 else names[1], base, tip, 0.016 + 0.0016 * (n - i), 0.054, "prim%d" % (i % 2), L["tail_rows"], 2, -0.04, tuck=0.0015)
        n = L["sec"]
        for i in range(n):
            f = (i + 0.5) / n
            base = Wr.lerp(Ao, f) + Vector((0, 0.006, 0.024 + 0.004 * math.sin(i * 2.4)))
            tip = tip_towards(base, (1.0 - 0.05 * f) * float(rng.uniform(0.94, 1.03)), 0.070 - 0.040 * (1 - f) + float(rng.uniform(-0.012, 0.012)))
            feather_posed(names[1] if f < 0.45 else names[0], base, tip, 0.024 + 0.0018 * i, 0.070, "sec%d" % (i % 2), max(L["tail_rows"] - 2, 2), 2, -0.05, tuck=0.003)
        rows = [(L["wcov"][0], 0.60, 0.070, 0.040, 0.050, 0.006), (L["wcov"][1], 0.48, 0.062, 0.046, 0.022, 0.018), (L["wcov"][2], 0.38, 0.056, 0.050, -0.006, 0.030)]
        for k, (n, reach, wd, gap, shift, up) in enumerate(rows):
            if not n:
                continue
            for i in range(n):
                f = (i + 0.5) / n + 0.5 / n * (k % 2) * 0.5
                jit = float(rng.uniform(-0.007, 0.007))
                base = Wr.lerp(Ao, min(f, 1.0)) + Vector((0, shift + jit, up + 0.022 + float(rng.uniform(-0.006, 0.006))))
                tip = tip_towards(base, reach * float(rng.uniform(0.92, 1.05)), 0.08 - 0.02 * k)
                feather_posed(names[1] if f < 0.45 else names[0], base, tip, gap, wd, "cov%d" % int(rng.integers(0, 3)), L["cov_rows"], L["cov_cols"], -0.09, two=False, tuck=0.009 + 0.003 * k)
            if k == 1:  # primary coverts run down the front edge, over the primaries' roots only
                for i in range(n):
                    t = (i + 0.5) / n * 0.92
                    base = front_edge(t) + Vector((0, 0.008 + float(rng.uniform(-0.005, 0.005)), 0.024))
                    tip = tip_towards(base, 0.42 * float(rng.uniform(0.92, 1.05)), 0.0)
                    feather_posed(names[2] if t > 0.55 else names[1], base, tip, 0.032, 0.056, "cov%d" % int(rng.integers(0, 3)), L["cov_rows"], L["cov_cols"], -0.07, two=False, tuck=0.008)

    # ---- neck and head: a slender bare neck and a small skull, the thing the source got most wrong
    Pn = [Vector((0, -0.055, 0.285)), rest["neck1"][0], rest["neck2"][0], rest["neck3"][0], rest["neck4"][0], rest["head"][0],
          Vector((0, -0.150, 0.584)), Vector((0, -0.171, 0.5985)), Vector((0, -0.198, 0.5935)), Vector((0, -0.222, 0.578))]
    path = catmull(Pn, L["rings"])
    neckch = ["neck1", "neck2", "neck3", "neck4", "head"]

    def neck_w(c, t):
        return {"head": 1.0} if t > 0.60 else chain_w(c, neckch)

    def neck_r(t, a):
        # t: 0 base .. 1 beak root. a=0 is the front of the neck, then the underside of the skull.
        if t < 0.60:
            r = 0.044 + (0.0205 - 0.044) * smooth_s(0.0, 0.8, t / 0.60)
            return (r * 0.96, r * 1.06)
        k = (t - 0.60) / 0.40
        s = math.sin(min(1.0, k * 1.25) * math.pi)
        return (0.0205 + 0.0085 * s - 0.012 * k * k, 0.0215 + 0.0105 * s - 0.0115 * k * k)

    tube(b, path, neck_r, "skin", neck_w, L["ring"], Vector((0, -1, 0)), cap_start=True, cap_end=True)

    def on_neck(t, a):
        i = min(int(t * (len(path) - 1)), len(path) - 2)
        c = path[i]
        tang = (path[i + 1] - path[i]).normalized()
        nv = (Vector((0, -1, 0)) - tang * Vector((0, -1, 0)).dot(tang)).normalized()
        sv = tang.cross(nv).normalized()
        r = neck_r(t, a)
        o = nv * math.cos(a) * r[1] + sv * math.sin(a) * r[0]
        return c + o, o.normalized(), tang

    # caruncles: real bumps on the upper neck, thick at the throat
    for i in range(L["blobs"]):
        t = float(rng.uniform(0.36, 0.60))
        a = float(rng.normal(0, 1.15))
        p, o, tang = on_neck(t, a)
        r = float(rng.uniform(0.0024, 0.0056)) * (1.2 if abs(a) < 0.7 else 0.9)
        c = p - o * (r * 0.35)
        sv = o.cross(tang).normalized()
        blob(b, c, sv * r * 1.1, tang * r * 1.25, o * r * 0.8, "wart", float(rng.uniform(0, 0.9)), 0.1, 0.08, 0.8, chain_w(c, neckch), L["blob_seg"])

    # upper and lower beak
    ups = catmull([Vector((0, -0.208, 0.5825)), Vector((0, -0.226, 0.5805)), Vector((0, -0.243, 0.5745)), Vector((0, -0.2565, 0.5625)), Vector((0, -0.2595, 0.5535))],
                  10 if lod == "hero" else 5)
    tube(b, ups, lambda t, a: (0.0135 * (1 - t) ** 0.75 + 0.0012, 0.0125 * (1 - t) ** 0.65 + 0.0012), "beak", lambda c, t: {"head": 1.0}, L["ring"],
         Vector((0, 0, 1)), uvr=(0, 0.48, 0, 1))
    lows = catmull([Vector((0, -0.205, 0.5695)), Vector((0, -0.224, 0.5650)), Vector((0, -0.241, 0.5615)), Vector((0, -0.2495, 0.5600))], 7 if lod == "hero" else 4)
    tube(b, lows, lambda t, a: (0.0115 * (1 - t) ** 0.8 + 0.001, 0.0058 * (1 - t) ** 0.7 + 0.001), "beak", lambda c, t: {"jaw": 1.0}, max(L["ring"] - 4, 6),
         Vector((0, 0, -1)), uvr=(0, 0.48, 0, 0.6))

    # eye, with a raised lid ring so it reads at a distance
    for sx in (1, -1):
        c = Vector((sx * 0.0186, -0.1835, 0.6050))
        ax = Vector((sx, -0.25, 0.10)).normalized()
        e1 = ax.cross(Vector((0, 0, 1))).normalized()
        e2 = ax.cross(e1).normalized()
        r = 0.0072
        seg = (14, 8) if lod == "hero" else (8, 4)
        pts, uvs = [], []
        for ri in range(seg[1] + 1):
            th = math.pi * ri / seg[1]
            row, ru = [], []
            for s in range(seg[0] + 1):
                ph = 2 * math.pi * s / seg[0]
                d = ax * math.cos(th) + e1 * (math.sin(th) * math.cos(ph)) + e2 * (math.sin(th) * math.sin(ph))
                row.append(c + d * r)
                ru.append(cell_uv("eye", 0.5 + 0.47 * math.sin(th) * math.cos(ph), 0.5 + 0.47 * math.sin(th) * math.sin(ph)))
            pts.append(row)
            uvs.append(ru)
        first = len(b.f)
        b.grid(pts, uvs, {"head": 1.0}, None)
        fix_winding(b, first, lambda i: c)
        ls = 14 if lod == "hero" else 8
        lid = [c + (e1 * math.cos(2 * math.pi * s / ls) + e2 * math.sin(2 * math.pi * s / ls) * 0.92) * (r * 0.98) + ax * (r * 0.20) for s in range(ls + 1)]
        tube(b, lid, lambda t, a: 0.0012 if lod == "hero" else 0.0018, "skin", lambda p, t: {"head": 1.0}, 5 if lod == "hero" else 4, ax, uvr=(0.2, 0.3, 0.92, 0.98), cap_end=False)

    # snood: hangs from above the beak on the Nose bones
    sn = [rest["Nose1"][0] + Vector((0.0, 0.006, 0.010)), rest["Nose1"][0] + Vector((0.003, -0.012, 0.012)), rest["Nose1"][1] + Vector((0.009, -0.016, 0.012)),
          rest["Nose2"][0] + Vector((0.011, -0.007, 0.004))]
    tube(b, catmull(sn, 16 if lod == "hero" else 6), lambda t, a: 0.0066 - 0.0026 * t + 0.0008 * math.sin(t * 19), "wart",
         lambda c, t: chain_w(c, ["Nose1", "Nose2"]), 9 if lod == "hero" else 6, Vector((0, -1, 0)), uvr=(0.1, 0.25, 0, 1))

    # wattle: a loose bumpy flap from the chin down the throat
    wp = catmull([Vector((0, -0.205, 0.574)), Vector((0, -0.192, 0.546)), Vector((0, -0.178, 0.522)), Vector((0, -0.172, 0.496)), Vector((0, -0.170, 0.478))],
                 18 if lod == "hero" else 6)
    wch = ["neck3", "neck4", "head"]
    tube(b, wp, lambda t, a: (0.0042 + 0.0012 * math.sin(t * 9), 0.0105 * (1 - t) ** 0.5 * (1 + 0.16 * math.sin(t * 15)) + 0.002), "wart",
         lambda c, t: chain_w(c, wch), 8 if lod == "hero" else 5, Vector((0, -1, 0)), uvr=(0.3, 0.5, 0, 1))
    if L["blobs"]:
        for i in range(16):
            t = float(rng.uniform(0.1, 0.95))
            c = wp[int(t * (len(wp) - 1))] + Vector((float(rng.choice([-1, 1])) * 0.0045, float(rng.normal(0, 0.006)), 0))
            r = float(rng.uniform(0.0024, 0.0042))
            blob(b, c, Vector((r, 0, 0)), Vector((0, r, 0)), Vector((0, 0, r)), "wart", float(rng.uniform(0, 0.9)), 0.1, 0.08, 0.8, chain_w(c, wch), L["blob_seg"])

    # beard: the tom's black tuft on the breast
    hit = tree.ray_cast(Vector((0, -0.6, 0.375)), Vector((0, 1, 0)))
    bc = hit[0] if hit[0] is not None else Vector((0, -0.2, 0.375))
    for i in range(L["beard"]):
        a = i / max(L["beard"], 1) * math.pi
        d = Vector((0.10 * math.cos(a), -0.14, -1)).normalized()
        nrm = Vector((math.sin(a), math.cos(a) * 0.3, 0)).normalized()
        nrm = (nrm - d * nrm.dot(d)).normalized()
        flat_feather(b, bc + Vector((0, 0.006, 0.012)), d, nrm, 0.145, 0.024, "hair", 3, 1, {"body": 0.9, "neck1": 0.1}, curl=0.04, ridge=0.0, thick=0.0006)

    # ---- legs: scaled shank, toes with knuckles, claws, a spur
    for sfx in ("_L", "_R"):
        s_h, s_t = rest["shin" + sfx]
        t_h, t_t = rest["tarsus" + sfx]
        shank = catmull([s_h.lerp(s_t, 0.45), t_h, t_h.lerp(t_t, 0.5), t_t + Vector((0, 0, 0.006))], L["leg_rows"] * 2)
        lw = ["shin" + sfx, "tarsus" + sfx]

        def lr(t, a):
            knob = 0.0038 * math.exp(-((t - 0.28) / 0.08) ** 2) + 0.003 * math.exp(-((t - 0.97) / 0.06) ** 2)
            r = 0.0148 - 0.0035 * t + knob
            return (r * 0.92, r * 1.12)

        tube(b, shank, lr, "leg", lambda c, t: chain_w(c, lw, power=7), L["leg_ring"], Vector((0, -1, 0)), cap_start=True)
        anklet = t_t + Vector((0, 0, 0.008))

        def toe(chain, pts, r0, claw_len, down=0.009):
            p = catmull(pts, L["toe_rows"])

            def tr(t, a):
                kn = 1 + 0.16 * math.sin(t * math.pi * 3.5) ** 2
                return (r0 * (1 - 0.42 * t) * kn, r0 * 0.82 * (1 - 0.42 * t) * kn)

            tube(b, p, tr, "leg", lambda c, t: chain_w(c, chain, power=8, keep=2), L["toe_ring"], Vector((0, 0, 1)), uvr=(0.3, 0.7, 0, 0.5), cap_start=True, cap_end=False)
            d = (p[-1] - p[-2]).normalized()
            q = catmull([p[-1] - d * 0.002, p[-1] + d * claw_len * 0.55 + Vector((0, 0, 0.0005)), p[-1] + d * claw_len - Vector((0, 0, down))], 6 if lod == "hero" else 3)
            tube(b, q, lambda t, a: r0 * 0.60 * (1 - t) + 0.0004, "beak", lambda c, t: {chain[-1]: 1.0}, 5 if lod == "hero" else 3, Vector((0, 0, 1)), uvr=(0.55, 0.95, 0, 1))

        m1, m2 = rest["FinMid1" + sfx], rest["FinMid2" + sfx]
        o1, o2 = rest["FinOut1" + sfx], rest["FinOut2" + sfx]
        i1, i2 = rest["FinInner1" + sfx], rest["FinInner2" + sfx]
        lift = Vector((0, 0, 0.002))
        toe(["FinMid1" + sfx, "FinMid2" + sfx], [anklet, m1[1] + lift, m2[1] + lift * 0.5], 0.0088, 0.022)
        toe(["FinOut1" + sfx, "FinOut2" + sfx], [anklet, o1[1] + lift, o2[1] + lift * 0.5], 0.0078, 0.019)
        toe(["FinInner1" + sfx, "FinInner2" + sfx], [anklet, i1[1] + lift, i2[1] + lift * 0.5], 0.0078, 0.019)
        hb = rest["FinHeel" + sfx][0]
        toe(["FinHeel" + sfx], [t_t + Vector((0, 0.002, 0.012)), hb + Vector((0, 0.020, 0.0)), hb + Vector((0, 0.040, -0.001))], 0.0066, 0.014, 0.006)
        sp0 = t_h.lerp(t_t, 0.70) + Vector((0, 0.009, 0))
        spp = catmull([sp0, sp0 + Vector((0, 0.013, -0.001)), sp0 + Vector((0, 0.021, 0.006))], 5 if lod == "hero" else 3)
        tube(b, spp, lambda t, a: 0.0042 * (1 - t) + 0.0004, "beak", lambda c, t: {"tarsus" + sfx: 1.0}, 5 if lod == "hero" else 3, Vector((0, 0, 1)), uvr=(0.55, 0.95, 0, 1))

    print(lod, "parts tris", b.tris(), "verts", len(b.v))
    return b


def builder_to_object(b, name, group_names):
    import bpy
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in b.v], [], b.f)
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    lu = [c for poly_uv in b.uv for p in poly_uv for c in p]
    uv.data.foreach_set("uv", np.array(lu, dtype=np.float32))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    groups = {n: ob.vertex_groups.new(name=n) for n in group_names}
    for i, w in enumerate(b.w):
        for k, val in w.items():
            groups[k].add([i], float(val), "REPLACE")
    me.shade_smooth()
    return ob


def add_collar(ob, rest):
    """A feathered cone from inside the body up the neck: closes the hole, and plumage flows off it like a real ruff."""
    import bmesh
    from mathutils import Vector
    me = ob.data
    idx = {g.name: g.index for g in ob.vertex_groups}
    bones = ["body", "neck1", "neck2", "neck3"]
    bm = bmesh.new()
    bm.from_mesh(me)
    deform = bm.verts.layers.deform.verify()
    prof = [(0.300, -0.085, 0.105, 0.115), (0.350, -0.112, 0.092, 0.108), (0.395, -0.136, 0.082, 0.090), (0.432, -0.149, 0.056, 0.060), (0.462, -0.152, 0.034, 0.037), (0.490, -0.152, 0.0215, 0.0235)]
    seg = 20
    rows = catmull([Vector((0, y, z)) for z, y, rx, ry in prof], 13)
    radii = catmull([Vector((rx, ry, 0)) for z, y, rx, ry in prof], 13)
    rings = []
    for c, r in zip(rows, radii):
        ws = {}
        for n in bones:
            d = seg_dist(c, rest[n][0], rest[n][1])
            ws[n] = 1.0 / (d + 0.02) ** 4
        tot = sum(ws.values())
        ring = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            v = bm.verts.new(c + Vector((math.cos(a) * r.x, math.sin(a) * r.y, 0)))
            for n, w in ws.items():
                v[deform][idx[n]] = w / tot
            ring.append(v)
        rings.append(ring)
    new = []
    for i in range(len(rings) - 1):
        for j in range(seg):
            k = (j + 1) % seg
            new.append(bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])))
    bmesh.ops.recalc_face_normals(bm, faces=new)
    bm.to_mesh(me)
    bm.free()


def fuse_shell(ob):
    """Voxel union of torso, thighs and collar: one closed skin, then the source weights transferred back onto it."""
    import bmesh
    import bpy
    from mathutils.bvhtree import BVHTree
    pre = ob.data.copy()
    verts = [v.co.copy() for v in pre.vertices]
    polys = [tuple(p.vertices) for p in pre.polygons]
    weights = [{g.group: g.weight for g in v.groups} for v in pre.vertices]
    tree = BVHTree.FromPolygons(verts, polys, all_triangles=False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    rm = ob.modifiers.new("fuse", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = 0.0058
    bpy.ops.object.modifier_apply(modifier=rm.name)
    sm = ob.modifiers.new("relax", "SMOOTH")
    sm.factor = 0.6
    sm.iterations = 4
    bpy.ops.object.modifier_apply(modifier=sm.name)
    me = ob.data
    for v in me.vertices:
        _, _, fi, _ = tree.find_nearest(v.co)
        ids = polys[fi]
        ds = [1.0 / ((verts[i] - v.co).length + 0.002) ** 2 for i in ids]
        tot = sum(ds)
        out = {}
        for i, d in zip(ids, ds):
            for k, val in weights[i].items():
                out[k] = out.get(k, 0) + val * d / tot
        for k, val in out.items():
            ob.vertex_groups[k].add([v.index], val, "REPLACE")
    ob.select_set(False)
    bpy.data.meshes.remove(pre)


def stage_build():
    import bpy
    import bmesh
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=SRC, automatic_bone_orientation=False, ignore_leaf_bones=False)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    src = next(o for o in bpy.data.objects if o.type == "MESH")
    for o in list(bpy.data.objects):
        if o.type == "EMPTY":
            bpy.data.objects.remove(o)
    # Clean take names; keep the 15 real takes, drop the stray empty one.
    for a in list(bpy.data.actions):
        if "EmptyAction" in a.name:
            bpy.data.actions.remove(a)
            continue
        a.name = a.name.split("|")[-1]
        a.use_fake_user = True
    arm.name = "Armature"
    rest = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.data.bones}
    group_names = [g.name for g in src.vertex_groups]
    # Skin matrices of the idle pose, for parts designed in that pose.
    arm.animation_data_create()
    act = bpy.data.actions["18TurkeyM_idle"]
    arm.animation_data.action = act
    arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    S = {p.name: p.matrix @ arm.data.bones[p.name].matrix_local.inverted() for p in arm.pose.bones}
    arm.animation_data.action = None
    for p in arm.pose.bones:
        p.matrix_basis.identity()

    # The torso shell: the source mesh, weights intact, minus everything rebuilt as real geometry.
    src.shape_key_clear()
    src.name = "shell_hi"
    me = src.data
    gname = {g.index: g.name for g in src.vertex_groups}
    rebuilt = {"neck2", "neck3", "neck4", "head", "jaw", "Nose1", "Nose2", "tarsus_L", "tarsus_R"} | {g for g in group_names if g.startswith("Fin")}
    kill = set()
    for v in me.vertices:
        tot = sum(g.weight for g in v.groups)
        bad = sum(g.weight for g in v.groups if gname[g.group] in rebuilt)
        if bad > 0.45 * max(tot, 1e-6):
            kill.add(v.index)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    # Islands: the two tail shells and the wing finger strips go; feathers replace them.
    seen = set()
    for v in bm.verts:
        if v.index in seen:
            continue
        st, comp = [v], []
        seen.add(v.index)
        while st:
            c = st.pop()
            comp.append(c)
            for e in c.link_edges:
                o = e.other_vert(c)
                if o.index not in seen:
                    seen.add(o.index)
                    st.append(o)
        if len(comp) <= 6 or len(comp) in (156, 110, 111):
            kill.update(c.index for c in comp)
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in kill], context="VERTS")
    bmesh.ops.holes_fill(bm, edges=bm.edges, sides=0)
    bm.to_mesh(me)
    bm.free()
    bpy.context.view_layer.objects.active = src
    src.select_set(True)
    for m in list(src.modifiers):
        src.modifiers.remove(m)
    sub = src.modifiers.new("sub", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    add_collar(src, rest)
    fuse_shell(src)
    me.shade_smooth()
    # UVs: smart project, packed into the body patch.
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.012, area_weight=1.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    x, y, w, h = uv_rect("body")
    uvd = me.uv_layers.active.data
    arr = np.zeros(len(uvd) * 2, dtype=np.float32)
    uvd.foreach_get("uv", arr)
    arr = arr.reshape(-1, 2)
    arr[:, 0] = x + (arr[:, 0] * 0.98 + 0.01) * w
    arr[:, 1] = y + (arr[:, 1] * 0.98 + 0.01) * h
    uvd.foreach_set("uv", arr.ravel())
    src.select_set(False)

    for lod in ("hero", "crowd"):
        L = LODS[lod]
        s = src.copy()
        s.data = src.data.copy()
        s.name = "shell_" + lod
        bpy.context.scene.collection.objects.link(s)
        tri = sum(len(p.vertices) - 2 for p in s.data.polygons)
        dec = s.modifiers.new("dec", "DECIMATE")
        dec.ratio = min(1.0, L["shell_tris"] / tri)
        bpy.context.view_layer.objects.active = s
        s.select_set(True)
        bpy.ops.object.modifier_apply(modifier=dec.name)
        s.select_set(False)
        b = build_lod(lod, src, rest, S)
        p = builder_to_object(b, "parts_" + lod, group_names)
        print(lod, "shell tris", sum(len(q.vertices) - 2 for q in s.data.polygons))
        for o in (s, p):
            mod = o.modifiers.new("Armature", "ARMATURE")
            mod.object = arm
            o.parent = arm
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    print("saved", BLEND)


STAGES["build"] = stage_build


# ------------------------------------------------------------------------------------------------- materials and renders

def take_lock(role="turkey"):
    import time
    while os.path.exists(LOCK) and time.time() - os.path.getmtime(LOCK) < 900:
        print("waiting for heavy.lock")
        time.sleep(15)
    with open(LOCK, "w") as f:
        f.write(role)


def drop_lock():
    try:
        with open(LOCK) as f:
            mine = f.read().strip() == "turkey"
        if mine:
            os.remove(LOCK)
    except OSError:
        pass


def make_material(colour):
    """Same maps as MV/Lit: albedo + alpha cutout at 0.5, normal, smoothness from the mask's alpha, no metal."""
    import bpy
    name = "turkey_" + colour
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    out = t.nodes.new("ShaderNodeOutputMaterial")
    p = t.nodes.new("ShaderNodeBsdfPrincipled")
    t.links.new(p.outputs[0], out.inputs[0])

    def tex(path, cs):
        n = t.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        n.image.colorspace_settings.name = cs
        n.image.alpha_mode = "STRAIGHT"
        return n

    al = tex(TEX + "/turkey_%s_albedo.png" % colour, "sRGB")
    nm = tex(TEX + "/turkey_normal.png", "Non-Color")
    mk = tex(TEX + "/turkey_mask.png", "Non-Color")
    t.links.new(al.outputs["Color"], p.inputs["Base Color"])
    cut = t.nodes.new("ShaderNodeMath")
    cut.operation = "GREATER_THAN"
    cut.inputs[1].default_value = 0.5
    t.links.new(al.outputs["Alpha"], cut.inputs[0])
    t.links.new(cut.outputs[0], p.inputs["Alpha"])
    nn = t.nodes.new("ShaderNodeNormalMap")
    t.links.new(nm.outputs["Color"], nn.inputs["Color"])
    t.links.new(nn.outputs[0], p.inputs["Normal"])
    inv = t.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    t.links.new(mk.outputs["Alpha"], inv.inputs[1])
    t.links.new(inv.outputs[0], p.inputs["Roughness"])
    p.inputs["Metallic"].default_value = 0.0
    m.surface_render_method = "DITHERED"
    m.use_transparent_shadow = True
    return m


CAMS = {
    # name: (camera, target, lens). Blender space: the bird faces -Y.
    "full": ((1.55, -1.25, 0.62), (0, 0.0, 0.31), 62),
    "front": ((0.28, -2.0, 0.42), (0, -0.04, 0.32), 62),
    "back": ((-0.95, 1.55, 0.72), (0, 0.05, 0.33), 62),
    "head": ((0.42, -0.72, 0.68), (0, -0.19, 0.555), 70),
    "breast": ((0.62, -0.72, 0.42), (0.05, -0.08, 0.33), 60),
    "tail": ((0.55, -0.55, 0.62), (0, 0.17, 0.42), 55),
    "wing": ((0.80, 0.05, 0.42), (0.13, 0.07, 0.30), 62),
    "foot": ((0.34, -0.42, 0.11), (0.05, -0.03, 0.06), 60),
}


def stage_render(name, lod, colour, take, frame, cam, light, res="900"):
    import bpy
    from mathutils import Vector
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    scn = bpy.context.scene
    mat = make_material(colour)
    for o in list(bpy.data.objects):
        if o.type == "MESH":
            if o.name in ("shell_" + lod, "parts_" + lod):
                o.data.materials.clear()
                o.data.materials.append(mat)
            else:
                bpy.data.objects.remove(o)
    arm = bpy.data.objects["Armature"]
    if take != "rest":
        arm.animation_data_create()
        a = bpy.data.actions[take if take.startswith("18") else "18TurkeyM_" + take]
        arm.animation_data.action = a
        arm.animation_data.action_slot = a.slots[0]
    scn.frame_set(int(frame))
    c, t, lens = CAMS[cam]
    # Follow the body so a jump or roll stays framed.
    follow = Vector((0, 0, 0))
    if take != "rest":
        pb = arm.pose.bones["body"]
        follow = (arm.matrix_world @ pb.head) - (arm.matrix_world @ arm.data.bones["body"].head_local)
    cd = bpy.data.cameras.new("c")
    cd.lens = lens
    co = bpy.data.objects.new("c", cd)
    scn.collection.objects.link(co)
    scn.camera = co
    c, t = Vector(c) + follow, Vector(t) + follow
    co.location = c
    co.rotation_euler = (t - c).to_track_quat("-Z", "Y").to_euler()
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    scn.world = w

    def lamp(pos, col, power, size=0.05):
        l = bpy.data.lights.new("l", "AREA")
        l.size = size
        l.color = col
        l.energy = power
        o = bpy.data.objects.new("l", l)
        scn.collection.objects.link(o)
        o.location = pos
        o.rotation_euler = (Vector((0, 0, 0.3)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()

    if light == "orange":  # warm hard key, a whisper of fill
        bg.inputs[0].default_value = (0.05, 0.03, 0.025, 1)
        lamp((1.5, -1.8, 1.5), (1.0, 0.56, 0.22), 95)
        lamp((-1.5, 0.5, 0.9), (0.4, 0.5, 1.0), 7)
    elif light == "tv":  # the bible's one hard source, cold, low and in front
        bg.inputs[0].default_value = (0.006, 0.007, 0.01, 1)
        lamp((0.5, -2.2, 0.55), (0.70, 0.92, 1.0), 110)
    elif light == "back":
        bg.inputs[0].default_value = (0.03, 0.02, 0.018, 1)
        lamp((-1.3, 2.0, 1.4), (1.0, 0.56, 0.22), 95)
    else:  # dark rim: two hard kicks from behind
        bg.inputs[0].default_value = (0.004, 0.004, 0.007, 1)
        lamp((2.0, 0.4, 1.2), (1.0, 0.45, 0.25), 170)
        lamp((-2.0, -0.5, 0.6), (0.25, 0.42, 1.0), 150)
    scn.render.engine = "BLENDER_EEVEE"
    scn.eevee.taa_render_samples = 32
    scn.render.resolution_x = scn.render.resolution_y = int(res)
    scn.view_settings.view_transform = "AgX"
    scn.view_settings.look = "AgX - Medium High Contrast"
    scn.render.film_transparent = False
    scn.render.filepath = WORK + "/" + name + ".png"
    bpy.ops.render.render(write_still=True)


STAGES["render"] = stage_render


def stage_views(prefix, lod, colour, spec, res="640", cols="3"):
    """spec: take:frame:cam:light,... renders each, tiles them into <prefix>.png with ffmpeg. Takes heavy.lock."""
    import subprocess
    take_lock()
    try:
        names = []
        for i, item in enumerate(spec.split(",")):
            take, frame, cam, light = item.split(":")
            nm = "%s_%02d" % (prefix, i)
            stage_render(nm, lod, colour, take, frame, cam, light, res)
            names.append(nm)
    finally:
        drop_lock()
    n = len(names)
    c = int(cols)
    r = (n + c - 1) // c
    args = ["C:/ffmpeg/bin/ffmpeg", "-y", "-loglevel", "error"]
    for nm in names:
        args += ["-i", WORK + "/" + nm + ".png"]
    fl = "".join("[%d]" % i for i in range(n)) + ("xstack=inputs=%d:layout=" % n if n > 1 else "null")
    if n > 1:
        pos = ["%d_%d" % ((i % c) * int(res), (i // c) * int(res)) for i in range(n)]
        fl += "|".join(pos) + ":fill=black"
    args += ["-filter_complex", fl, "-frames:v", "1", WORK + "/" + prefix + ".png"]
    subprocess.run(args, check=True)
    for nm in names:
        os.remove(WORK + "/" + nm + ".png")


STAGES["views"] = stage_views

def read_png(path):
    import bpy
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = "Non-Color"
    img.alpha_mode = "STRAIGHT"
    w, h = img.size
    a = np.zeros(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)


def stage_bake(samples="2"):
    """Cycles selected-to-active: hero feathers onto the torso shell's patch, so the crowd body and any gaps show real plumage."""
    import bpy
    take_lock()
    try:
        bpy.ops.wm.open_mainfile(filepath=BLEND)
        scn = bpy.context.scene
        scn.render.engine = "CYCLES"
        scn.cycles.device = "CPU"
        scn.cycles.samples = int(samples)
        scn.render.threads_mode = "FIXED"
        scn.render.threads = 4
        target = bpy.data.objects["shell_hi"]
        source = bpy.data.objects["parts_hero"]
        for o in list(bpy.data.objects):
            if o.type == "MESH" and o not in (target, source):
                bpy.data.objects.remove(o)
        for m in list(target.modifiers) + list(source.modifiers):
            m.show_viewport = False
            m.show_render = False
        target.data.materials.clear()
        source.data.materials.clear()
        tm = bpy.data.materials.new("target")
        tm.use_nodes = True
        tn = tm.node_tree.nodes.new("ShaderNodeTexImage")
        tm.node_tree.nodes.active = tn
        target.data.materials.append(tm)
        bake = scn.render.bake
        bake.use_selected_to_active = True
        bake.cage_extrusion = 0.04
        bake.max_ray_distance = 0.06
        bake.margin = 6
        bake.use_clear = True
        bpy.ops.object.select_all(action="DESELECT")
        source.select_set(True)
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        x, y, w, h = CELLS["body"]

        def run(kind, material, name, srgb_img):
            source.data.materials.clear()
            source.data.materials.append(material)
            img = bpy.data.images.new(name, ATLAS, ATLAS, alpha=False)
            img.colorspace_settings.name = "sRGB" if srgb_img else "Non-Color"
            tn.image = img
            bpy.ops.object.bake(type=kind, pass_filter={"COLOR"} if kind == "DIFFUSE" else set())
            a = np.zeros(ATLAS * ATLAS * 4, dtype=np.float32)
            img.pixels.foreach_get(a)
            bpy.data.images.remove(img)
            return a.reshape(ATLAS, ATLAS, 4)

        def flat(colour):
            m = make_material(colour)
            t = m.node_tree
            al = next(n for n in t.nodes if n.type == "TEX_IMAGE" and "albedo" in n.image.name)
            for n in list(t.nodes):
                if n.type == "BSDF_PRINCIPLED":
                    t.nodes.remove(n)
            e = t.nodes.new("ShaderNodeEmission")
            t.links.new(al.outputs["Color"], e.inputs[0])
            t.links.new(e.outputs[0], next(n for n in t.nodes if n.type == "OUTPUT_MATERIAL").inputs[0])
            return m

        m = make_material("brown")
        t = m.node_tree
        al = next(k for k in t.nodes if k.type == "TEX_IMAGE" and "albedo" in k.image.name)
        for k in list(t.nodes):
            if k.type == "BSDF_PRINCIPLED":
                t.nodes.remove(k)
        e = t.nodes.new("ShaderNodeEmission")
        t.links.new(al.outputs["Alpha"], e.inputs[0])
        t.links.new(e.outputs[0], next(k for k in t.nodes if k.type == "OUTPUT_MATERIAL").inputs[0])
        cover = run("EMIT", m, "b_alpha", False)[y:y + h, x:x + w, 0:1] > 0.5
        for c in COLOURS:
            r = run("EMIT", flat(c), "b_" + c, True)
            p = TEX + "/turkey_%s_albedo.png" % c
            atlas = read_png(p)
            under = srgb(np.asarray(PAL[c]["down"]) * 0.45)
            atlas[y:y + h, x:x + w, :3] = np.where(cover, r[y:y + h, x:x + w, :3], under)
            save_png(p, atlas)
            print("baked", c, flush=True)
        n = run("NORMAL", make_material("brown"), "b_n", False)
        p = TEX + "/turkey_normal.png"
        atlas = read_png(p)
        atlas[y:y + h, x:x + w, :3] = np.where(cover, n[y:y + h, x:x + w, :3], np.array((0.5, 0.5, 1.0)))
        save_png(p, atlas)
        print("baked normal", flush=True)
    finally:
        drop_lock()


STAGES["bake"] = stage_bake


def stage_export():
    import bpy
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    arm = bpy.data.objects["Armature"]
    if arm.animation_data:
        arm.animation_data.action = None
    for p in arm.pose.bones:
        p.matrix_basis.identity()
    report = []
    for lod in ("hero", "crowd"):
        for c in COLOURS:
            bpy.ops.object.select_all(action="DESELECT")
            a = bpy.data.objects["shell_" + lod].copy()
            a.data = a.data.copy()
            bpy.context.scene.collection.objects.link(a)
            b = bpy.data.objects["parts_" + lod].copy()
            b.data = b.data.copy()
            bpy.context.scene.collection.objects.link(b)
            a.select_set(True)
            b.select_set(True)
            bpy.context.view_layer.objects.active = a
            bpy.ops.object.join()
            me = bpy.context.view_layer.objects.active
            me.name = "turkey_%s_%s" % (c, lod)
            me.data.name = me.name
            me.data.materials.clear()
            me.data.materials.append(make_material(c))
            bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
            bpy.ops.object.vertex_group_normalize_all(lock_active=False)
            tris = sum(len(p.vertices) - 2 for p in me.data.polygons)
            arm.select_set(True)
            path = "%s/turkey_%s_%s.fbx" % (OUT, c, lod)
            # Same settings the source pack used (Blender FBX, metres, UnitScaleFactor 100), so bone locals and clips line up.
            bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={"ARMATURE", "MESH"}, apply_unit_scale=True,
                                     apply_scale_options="FBX_SCALE_UNITS", global_scale=1.0, axis_forward="-Z", axis_up="Y",
                                     bake_space_transform=False, use_mesh_modifiers=True, mesh_smooth_type="FACE", use_tspace=True,
                                     add_leaf_bones=False, primary_bone_axis="Y", secondary_bone_axis="X", armature_nodetype="NULL",
                                     use_armature_deform_only=False, bake_anim=True, bake_anim_use_all_bones=True,
                                     bake_anim_use_nla_strips=False, bake_anim_use_all_actions=True, bake_anim_force_startend_keying=True,
                                     bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode="STRIP", embed_textures=False)
            report.append((me.name, tris, len(me.data.vertices), os.path.getsize(path) // 1024))
            bpy.data.objects.remove(me)
    for r in report:
        print("EXPORTED %s tris=%d verts=%d kb=%d" % r)


STAGES["export"] = stage_export


def stage_verify():
    """Compares each export with the source: axis settings, bone locals, take names, and bone world positions through every take."""
    import addon_utils
    import bpy
    addon_utils.enable("io_scene_fbx")
    from io_scene_fbx import parse_fbx

    def child(n, i):
        return next((c for c in n.elems if c.id == i), None)

    def summary(path):
        root, _ = parse_fbx.parse(path)
        gs = {p.props[0]: p.props[-1] for p in child(child(root, b"GlobalSettings"), b"Properties70").elems}
        out = {k.decode(): gs[k] for k in (b"UpAxis", b"FrontAxis", b"FrontAxisSign", b"UnitScaleFactor")}
        bones = {}
        for m in child(root, b"Objects").elems:
            if m.id == b"Model":
                nm = m.props[1].split(b"\x00")[0].decode()
                d = {}
                for p in child(m, b"Properties70").elems:
                    if p.props[0] in (b"Lcl Translation", b"Lcl Rotation", b"Lcl Scaling"):
                        d[p.props[0].decode()] = tuple(round(float(x), 3) for x in p.props[4:])
                bones[nm] = (m.props[2].decode(), d)
        takes = sorted(c.props[0].decode() for c in child(root, b"Takes").elems if c.id == b"Take")
        return out, bones, takes

    so, sb, st = summary(SRC)
    print("SOURCE", so, len(sb), "models", len(st), "takes")

    def world_tracks(path):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=False)
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        arm.animation_data_create()
        out = {}
        for a in bpy.data.actions:
            nm = a.name.split("|")[-1]
            if "Empty" in nm:
                continue
            arm.animation_data.action = a
            arm.animation_data.action_slot = a.slots[0]
            fr = range(int(a.frame_range[0]), int(a.frame_range[1]) + 1, 4)
            pts = []
            for f in fr:
                bpy.context.scene.frame_set(f)
                pts.extend(tuple(arm.pose.bones[b].head) for b in ("body", "head", "hand_L", "tarsus_R", "tail", "Nose2"))
            out[nm] = np.array(pts)
        return out

    ref = world_tracks(SRC)
    for lod in ("hero", "crowd"):
        for c in COLOURS:
            p = "%s/turkey_%s_%s.fbx" % (OUT, c, lod)
            eo, eb, et = summary(p)
            diffs = []
            for k, v in sb.items():
                if v[0] == "LimbNode" or k == "Armature":
                    if k not in eb:
                        diffs.append(k + " missing")
                    elif eb[k][1] != v[1]:
                        for key in v[1]:
                            if key in eb[k][1] and max(abs(x - y) for x, y in zip(v[1][key], eb[k][1][key])) > 0.02:
                                diffs.append("%s %s %s vs %s" % (k, key, v[1][key], eb[k][1][key]))
            tr = world_tracks(p)
            worst = max(float(np.abs(ref[k] - tr[k]).max()) for k in ref)
            print("VERIFY", os.path.basename(p), eo == so, "takes", len(et), "take names ok", set(st) - set(et) <= {"Armature|EmptyAction.001"}, "bone diffs", diffs[:4],
                  "worst bone position error m %.5f" % worst, flush=True)


STAGES["verify"] = stage_verify

def stage_final():
    """The whole check set into Director/gen/turkey/checks."""
    import shutil
    import subprocess
    chk = OUT + "/checks"
    os.makedirs(chk, exist_ok=True)
    hero = "idle:20:full:orange,idle:20:head:orange,idle:20:wing:orange,idle:20:breast:rim,runAngry:8:full:orange,runAngry:8:head:rim,prancing:30:full:rim,prancing:30:tail:orange,jump:15:full:orange,jump:15:back:back,roll:20:full:tv,idle:20:foot:orange"
    for c in COLOURS:
        stage_views("final_hero_" + c, "hero", c, hero, "640", "4")
        shutil.move(WORK + "/final_hero_%s.png" % c, chk + "/hero_%s.png" % c)
    crowd = "idle:20:full:orange,runAngry:8:full:rim,jump:15:full:tv,idle:20:wing:orange"
    for c in COLOURS:
        stage_views("final_crowd_" + c, "crowd", c, crowd, "640", "4")
        shutil.move(WORK + "/final_crowd_%s.png" % c, chk + "/crowd_%s.png" % c)
    ff = "C:/ffmpeg/bin/ffmpeg"
    src = chk + "/hero_brown.png"
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", src, "-vf", "lutyuv=y='floor(val/64)*64+32':u=128:v=128", chk + "/look_posterize.png"], check=True)
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", src, "-vf", "format=gray,lut='if(gt(val,70),255,0)'", chk + "/look_ink.png"], check=True)


STAGES["final"] = stage_final


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        print(__doc__)
        return
    STAGES[argv[0]](*argv[1:])


if __name__ == "__main__":
    main()
