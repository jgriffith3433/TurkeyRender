#!/usr/bin/env python
"""Painted surfaces for Hawkes Punch: the can label and the poster (the only red), clinic floor and ceiling tiles, pads and sheets, signs, every planet,
a star sphere that never twinkles, and the commercial's backdrop and floor. Nothing is rendered in real time: the shading is paint.
   uv run --no-project --with numpy --with pillow python Director/tools/punch_tex.py [name ...]
Writes Assets/MusicVideo/Props/Punch/tex/<name>.png (punch_make.py wrote their .meta and .mat). No logo, no corporate line: the product name only."""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'Punch', 'tex')
os.makedirs(OUT, exist_ok=True)
FONTS = 'C:/Windows/Fonts/'


def font(name, size):
    try: return ImageFont.truetype(FONTS + name, size)
    except OSError: return ImageFont.load_default()


def hex3(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float) / 255
def lerp(a, b, t): return a + (b - a) * t
def fbm(w, h, oct=6, base=4, seed=1, ax=1.0, wrap=False):
    r = np.random.default_rng(seed); out = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(oct):
        gw = max(2, int(base * ax * 2 ** o)); gh = max(2, int(base * 2 ** o))
        g = r.random((gh, gw), dtype=np.float32)
        if wrap: g = np.concatenate([g, g[:, :1]], 1)
        im = Image.fromarray(g, 'F').resize((w + (1 if wrap else 0), h), Image.BICUBIC)
        a = np.asarray(im)[:, :w]
        out += a * amp; tot += amp; amp *= .5
    return out / tot
def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
def save(name, a):
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).save(os.path.join(OUT, name + '.png')); print('tex', name, a.shape)
def savepil(name, im): im.save(os.path.join(OUT, name + '.png')); print('tex', name, im.size)
def grid(w, h, x0, x1, y0, y1): return np.meshgrid(np.linspace(x0, x1, w), np.linspace(y0, y1, h))
def text_center(d, xy, s, f, fill, spacing=0):
    w = d.textlength(s, font=f) + spacing * (len(s) - 1)
    x = xy[0] - w / 2
    for ch in s:
        d.text((x, xy[1]), ch, font=f, fill=fill, anchor='lm'); x += d.textlength(ch, font=f) + spacing
def paper_grain(w, h, seed, amt=.05): return 1 - fbm(w, h, 4, 8, seed) * amt


# ---------------------------------------------------------------------------------------------------- the product
RED, RED_DARK, CREAM = '#c8161e', '#8c0e14', '#fff4e6'


def fit(d, s, name, size, maxw, spacing=0):
    """The largest font at or under size whose line fits in maxw pixels."""
    while size > 10:
        f = font(name, size)
        if d.textlength(s, font=f) + spacing * (len(s) - 1) <= maxw: return f
        size -= 4
    return font(name, size)


def can_label():
    """Wrapped round the can body: u round, v up (image top = can top). Reads top to bottom as the product's name, the way a can is read:
    HAWKES (cream, on the red) over PUNCH (huge, red on a cream band), then ONE A DAY UNTIL IT STOPS. Set twice round the can, each block inside a
    quarter turn (512 px), so a camera on either side reads the whole name without the edge foreshortening a letter away (sets agent, 2026-11-08:
    it said PUNCH over HAWKES and the insert at c17 read a partial word)."""
    W, H = 2048, 1024
    im = Image.new('RGB', (W, H), RED); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        shade = 1 - .16 * max(0, t - .78) / .22 + .07 * math.exp(-((t - .12) / .07) ** 2)
        d.line([(0, y), (W, y)], fill=tuple(int(v * shade) for v in (200, 22, 30)))
    band0, band1 = H * .40, H * .70
    d.rectangle([0, band0, W, band1], fill=CREAM)
    d.rectangle([0, band0 - 12, W, band0], fill='#ffd9a8'); d.rectangle([0, band1, W, band1 + 12], fill='#ffd9a8')
    for cx in (W * .25, W * .75):
        f1 = fit(d, 'HAWKES', 'ariblk.ttf', 150, 500, 14); text_center(d, (cx, H * .29), 'HAWKES', f1, CREAM, spacing=14)
        f2 = fit(d, 'PUNCH', 'impact.ttf', 300, 520, 6); text_center(d, (cx, (band0 + band1) / 2 + 4), 'PUNCH', f2, RED, spacing=6)
        f3 = fit(d, 'ONE A DAY UNTIL IT STOPS', 'arialbd.ttf', 56, 520, 2); text_center(d, (cx, H * .79), 'ONE A DAY UNTIL IT STOPS', f3, CREAM, spacing=2)
        text_center(d, (cx, H * .90), 'citrus  •  330 ml', font('arialbd.ttf', 40), '#ffb9b9', spacing=1)
        # a thin cream rule under HAWKES, like a printed can
        d.rectangle([cx - 230, H * .355, cx + 230, H * .362], fill=CREAM)
    r = np.random.default_rng(3)
    for _ in range(220):
        x, y = r.random() * W, r.random() * H; rad = r.random() * 8 + 2
        if H * .2 < y < H * .95 and min(abs(x - W * .25), abs(x - W * .75)) < 300: continue
        if band0 - 14 < y < band1 + 14: continue
        d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=(255, 150, 150), width=2)
    a = np.asarray(im).astype(np.float32) / 255
    a *= (1 - fbm(W, H, 3, 6, 5) * .04)[..., None]
    save('can_label', a)


def poster():
    """The clinic poster, 3:4 (the 0.6 x 0.8 exam-room print and the 0.9 x 1.2 reception one share it). Read from across a waiting room: the name
    fills the top half in two lines, a can drawn with its own label, 'Ask your doctor.' as big as the can is wide, and the fine print last.
    No logo, no company line: the product's name and the script's tagline only (sets agent, 2026-11-08)."""
    W, H = 1536, 2048
    im = Image.new('RGB', (W, H), RED); d = ImageDraw.Draw(im)
    # a soft cream starburst behind the can
    cx, cy = W / 2, 1180
    for i in range(36):
        a0 = i / 36 * 2 * math.pi; a1 = (i + .5) / 36 * 2 * math.pi
        d.polygon([(cx, cy), (cx + math.cos(a0) * 900, cy + math.sin(a0) * 900), (cx + math.cos(a1) * 900, cy + math.sin(a1) * 900)], fill='#d42a30')
    d.rectangle([0, 0, W, 760], fill=RED)
    d.rectangle([36, 36, W - 36, H - 36], outline=CREAM, width=16)
    text_center(d, (W / 2, 250), 'HAWKES', fit(d, 'HAWKES', 'impact.ttf', 400, W - 220, 10), CREAM, spacing=10)
    text_center(d, (W / 2, 590), 'PUNCH', fit(d, 'PUNCH', 'impact.ttf', 420, W - 300, 10), CREAM, spacing=10)
    # the can, drawn like its label: cream band with PUNCH, HAWKES above it
    top, bot, rw = 880, 1500, 190
    d.rounded_rectangle([cx - rw, top, cx + rw, bot], radius=34, fill='#c8161e', outline=CREAM, width=8)
    d.rectangle([cx + rw - 62, top + 40, cx + rw - 34, bot - 40], fill='#e04048')   # a highlight down the can, under the band
    d.rectangle([cx - rw + 8, top + 250, cx + rw - 8, top + 430], fill=CREAM)
    text_center(d, (cx, top + 175), 'HAWKES', fit(d, 'HAWKES', 'ariblk.ttf', 80, rw * 2 - 50, 4), CREAM, spacing=4)
    text_center(d, (cx, top + 342), 'PUNCH', fit(d, 'PUNCH', 'impact.ttf', 170, rw * 2 - 40, 3), RED, spacing=3)
    d.ellipse([cx - rw, top - 30, cx + rw, top + 30], fill='#d8d8dc', outline='#9a9aa0', width=6)
    d.ellipse([cx - rw * .55, top - 16, cx + rw * .55, top + 16], fill='#bfbfc4')
    d.rectangle([cx - 30, top - 14, cx + 30, top + 2], fill='#eeeef2')
    text_center(d, (W / 2, 1690), 'Ask your doctor.', fit(d, 'Ask your doctor.', 'ariblk.ttf', 150, W - 200, 2), CREAM, spacing=2)
    text_center(d, (W / 2, 1880), 'Side effects may include side effects.', fit(d, 'Side effects may include side effects.', 'arialbd.ttf', 66, W - 220, 1), '#ffc4c4', spacing=1)
    a = np.asarray(im).astype(np.float32) / 255 * paper_grain(W, H, 7, .06)[..., None]
    save('poster', a)


def tv_sign():
    """The commercial's sign, glowing: the name over a star burst. 2:1."""
    W, H = 2048, 1024
    im = Image.new('RGB', (W, H), '#2a1030'); d = ImageDraw.Draw(im)
    for i in range(48):
        a0 = i / 48 * 2 * math.pi; a1 = (i + .5) / 48 * 2 * math.pi
        pts = [(W / 2, H / 2), (W / 2 + math.cos(a0) * 1400, H / 2 + math.sin(a0) * 1400), (W / 2 + math.cos(a1) * 1400, H / 2 + math.sin(a1) * 1400)]
        d.polygon(pts, fill='#ff9fd0' if i % 2 else '#ffd27a')
    d.rounded_rectangle([160, 250, W - 160, H - 250], radius=120, fill='#ff2a6a', outline='#fff1f6', width=18)
    text_center(d, (W / 2, 430), 'HAWKES PUNCH', font('impact.ttf', 230), '#fff6fa', spacing=6)
    text_center(d, (W / 2, 660), 'IS IT RIGHT FOR YOU?', font('ariblk.ttf', 96), '#ffe9a8', spacing=4)
    savepil('tv_sign', im)


# ---------------------------------------------------------------------------------------------------- clinic surfaces
def clinic_floor():
    """Vinyl tiles, 30 cm, pale green and off white, a speckle in each, a hairline joint. Tiled at 1 m: 3.33 tiles per repeat looks wrong, so the image is 3 tiles = 0.9 m and the set tiles it at 1/0.9."""
    W = H = 1024; X, Z = grid(W, H, 0, 3, 0, 3)
    ix = np.floor(X).astype(int); iz = np.floor(Z).astype(int)
    m = ((ix + iz) % 2 == 0)[..., None]
    img = hex3('#dbe9df') * m + hex3('#eceee8') * ~m
    img = img * (1 - fbm(W, H, 5, 24, 2)[..., None] * .07)
    fx = np.abs(X - np.round(X)); fz = np.abs(Z - np.round(Z))
    j = np.clip(1 - np.minimum(fx, fz) / .006, 0, 1)[..., None]
    img = img * (1 - j * .14)
    sp = (fbm(W, H, 2, 128, 9) > .62)[..., None]
    img = np.where(sp, img * .9, img)
    save('clinic_floor', img)


def ceiling_tile():
    """Acoustic tiles, 60 cm, a T-bar grid, pinholes. Image is 2 tiles = 1.2 m."""
    W = H = 1024; X, Z = grid(W, H, 0, 2, 0, 2)
    img = np.ones((H, W, 3)) * hex3('#f0efe9')
    img = img * (1 - fbm(W, H, 3, 64, 4)[..., None] * .08)
    holes = (fbm(W, H, 1, 160, 5) > .78)[..., None]
    img = np.where(holes, img * .78, img)
    fx = np.abs(X - np.round(X)); fz = np.abs(Z - np.round(Z))
    bar = (np.minimum(fx, fz) < .012)[..., None]
    img = np.where(bar, hex3('#d2d1cc'), img)
    shade = np.clip(1 - np.minimum(fx, fz) / .05, 0, 1)[..., None]
    img = img * (1 - shade * .08)
    save('ceiling_tile', img)


def paper_roll():
    """The exam bed's paper: a strip, crinkled, a faint fold every 40 cm. u along the bed."""
    W, H = 2048, 512
    img = np.ones((H, W, 3)) * hex3('#f8f6ef')
    img = img * (1 - fbm(W, H, 5, 12, 11, ax=4)[..., None] * .07)
    X, _ = grid(W, H, 0, 2, 0, 1)
    fold = np.exp(-((X / .4 - np.round(X / .4)) * 40) ** 2)[..., None]
    img = img * (1 - fold * .12)
    save('paper_roll', img)


def rx_pad():
    """The top sheet of her pad, 2:3: the clinic's header, then her notes on him in a hand, read in c10's insert (W10): the last line stops
    mid-word where the pen stops on 'In space.' Her name matches the coat's badge (HALLORAN)."""
    W, H = 1024, 1536
    im = Image.new('RGB', (W, H), '#fbfaf4'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 150], fill='#e3efe8')
    d.text((50, 45), 'CLINIC 4', font=font('arialbd.ttf', 64), fill='#2d5c47')
    d.text((50, 108), 'Dr. Halloran   Exam 2', font=font('arial.ttf', 34), fill='#2d5c47')
    d.text((W - 230, 30), 'Rx', font=font('impact.ttf', 110), fill='#2d5c47')
    for y in range(330, 1450, 120): d.line([(50, y), (W - 50, y)], fill='#c9d8cf', width=3)
    f = font('segoeprb.ttf', 74) if os.path.exists(FONTS + 'segoeprb.ttf') else font('ariblk.ttf', 60)
    ink = '#1c3a8a'
    for i, line in enumerate(('Hears music. Always.', 'shower, sleep', 'silence = more music', 'in love w/ a ghost', 'in sp')):
        d.text((70, 240 + i * 120), line, font=f, fill=ink)
    a = np.asarray(im).astype(np.float32) / 255 * paper_grain(W, H, 3, .04)[..., None]
    save('rx_pad', a)


def clipboard_sheet():
    """The intake form on the clipboard, 3:4: boxes, lines, a few ticks, 'PATIENT LOOKS GREEN' in the notes."""
    W, H = 1536, 2048
    im = Image.new('RGB', (W, H), '#fcfbf6'); d = ImageDraw.Draw(im)
    d.text((80, 70), 'PATIENT INTAKE', font=font('arialbd.ttf', 80), fill='#1e3b2f')
    d.text((80, 170), 'Clinic 4  \u2022  Exam 2', font=font('arial.ttf', 44), fill='#5a6f64')
    y = 300
    for lab in ('Name', 'Symptoms', 'Colour', 'Still owned by the lawn?', 'Previous television', 'Allergies', 'Insurance'):
        d.text((80, y), lab, font=font('arial.ttf', 46), fill='#1e3b2f'); d.line([(80, y + 80), (W - 80, y + 80)], fill='#b9c8bf', width=3); y += 150
    for i, s in enumerate(('yes', 'yes', 'green', 'partly', 'one', 'grass', 'no')):
        d.text((560, 300 + i * 150 - 6), s, font=font('segoeprb.ttf', 60) if os.path.exists(FONTS + 'segoeprb.ttf') else font('arial.ttf', 56), fill='#1c3a8a')
    for i in range(4):
        d.rectangle([80 + i * 200, 1420, 140 + i * 200, 1480], outline='#1e3b2f', width=4)
        if i < 3: d.line([(88 + i * 200, 1450), (108 + i * 200, 1474), (136 + i * 200, 1426)], fill='#1c3a8a', width=7)
    d.text((80, 1540), 'PLAN:', font=font('arialbd.ttf', 60), fill='#1e3b2f')
    d.text((260, 1530), 'Hawkes Punch. Daily. Then the other thing.', font=font('segoeprb.ttf', 64) if os.path.exists(FONTS + 'segoeprb.ttf') else font('arial.ttf', 56), fill='#1c3a8a')
    a = np.asarray(im).astype(np.float32) / 255 * paper_grain(W, H, 4, .04)[..., None]
    save('clipboard_sheet', a)


def reception_sign():
    W, H = 2048, 512
    im = Image.new('RGB', (W, H), '#4f9a74'); d = ImageDraw.Draw(im)
    text_center(d, (W / 2, H / 2), 'RECEPTION', font('arialbd.ttf', 300), '#f8fbf6', spacing=20)
    savepil('reception_sign', im)


def exam_sign():
    W, H = 1024, 512
    im = Image.new('RGB', (W, H), '#4f9a74'); d = ImageDraw.Draw(im)
    text_center(d, (W / 2, H * .36), 'EXAM 2', font('arialbd.ttf', 230), '#f8fbf6', spacing=10)
    text_center(d, (W / 2, H * .76), 'please wait to be hit', font('arial.ttf', 70), '#d8efe3', spacing=2)
    savepil('exam_sign', im)


def eye_chart():
    W, H = 1024, 1536
    im = Image.new('RGB', (W, H), '#fbfaf4'); d = ImageDraw.Draw(im)
    rows = ('P', 'UN', 'CHH', 'AWKE', 'SPUNC', 'HHAWKES', 'PUNCHHAWK')
    y = 120
    for i, r in enumerate(rows):
        s = int(300 / (1 + i * .55)); text_center(d, (W / 2, y + s / 2), r, font('arialbd.ttf', s), '#111', spacing=s * .12); y += s + 40
    d.rectangle([10, 10, W - 10, H - 10], outline='#222', width=6)
    savepil('eye_chart', im)


def monitor_screen():
    """The reception monitor's screen, 16:10: a plain front-desk schedule, the walk-in highlighted. Lit (the material glows)."""
    W, H = 1024, 640
    im = Image.new('RGB', (W, H), '#eaf2f6'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 70], fill='#2d5c47'); d.text((24, 16), 'CLINIC 4  Front desk', font=font('arialbd.ttf', 34), fill='#f4fbf6')
    d.text((W - 190, 18), '10:28', font=font('arialbd.ttf', 34), fill='#f4fbf6')
    rows = (('09:00', 'Exam 1', 'Follow-up'), ('09:30', 'Exam 2', 'Bloods'), ('10:00', 'Exam 1', 'Check-up'), ('10:30', 'Exam 2', 'Walk-in'), ('11:00', 'Exam 1', 'Check-up'), ('11:30', 'Exam 2', 'Follow-up'))
    for i, (t, r, w) in enumerate(rows):
        y = 100 + i * 84
        if w == 'Walk-in': d.rectangle([12, y - 8, W - 12, y + 66], fill='#ffe3a6')
        d.text((30, y), t, font=font('arialbd.ttf', 40), fill='#1e3b2f'); d.text((210, y), r, font=font('arial.ttf', 40), fill='#1e3b2f'); d.text((470, y), w, font=font('arial.ttf', 40), fill='#1e3b2f')
        d.line([(12, y + 72), (W - 12, y + 72)], fill='#c3d3cb', width=2)
    savepil('monitor_screen', im)


def waiting_sign():
    W, H = 2048, 512
    im = Image.new('RGB', (W, H), '#4f9a74'); d = ImageDraw.Draw(im)
    text_center(d, (W / 2, H * .38), 'PLEASE TAKE A SEAT', fit(d, 'PLEASE TAKE A SEAT', 'arialbd.ttf', 230, W - 160, 10), '#f8fbf6', spacing=10)
    text_center(d, (W / 2, H * .78), 'You will be called', font('arial.ttf', 90), '#d8efe3', spacing=3)
    savepil('waiting_sign', im)


def magazines():
    """Three magazine covers side by side (u thirds), 3:4 each, for the reception rack and the side table."""
    W, H = 1536, 680
    im = Image.new('RGB', (W, H), '#ffffff'); d = ImageDraw.Draw(im)
    covers = (('HEALTH', '#2f7db8', '#ffffff', 'Sleep better', 'in 10 steps'), ('GARDEN', '#5f9a3e', '#fff6d8', 'Spring lawns', 'the easy way'), ('BOXING', '#1d1d22', '#e8c24a', 'Champions', 'who went quiet'))
    for i, (t, bg, fg, a1, a2) in enumerate(covers):
        x0 = i * 512; d.rectangle([x0, 0, x0 + 511, H], fill=bg)
        text_center(d, (x0 + 256, 80), t, fit(d, t, 'impact.ttf', 140, 470, 4), fg, spacing=4)
        d.ellipse([x0 + 120, 210, x0 + 400, 490], fill=fg if i != 2 else '#c0141c')
        d.text((x0 + 30, 540), a1, font=font('arialbd.ttf', 44), fill=fg); d.text((x0 + 30, 600), a2, font=font('arial.ttf', 40), fill=fg)
    savepil('magazines', im)


def plaque():
    """The brass plate under her gloves (c15's insert), 3:1: engraved dark text on brass."""
    W, H = 1536, 512
    X, Y = grid(W, H, 0, 1, 0, 1)
    img = lerp(hex3('#d9b45a'), hex3('#a8822e'), Y[..., None]) * (1 - fbm(W, H, 4, 3, 91, ax=6)[..., None] * .12)
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    d.rectangle([14, 14, W - 14, H - 14], outline='#6e5418', width=8)
    text_center(d, (W / 2, H * .30), 'GOLDEN GLOVES', fit(d, 'GOLDEN GLOVES', 'georgiab.ttf', 170, W - 140, 6), '#2a1f08', spacing=6)
    text_center(d, (W / 2, H * .58), 'CHAMPION', fit(d, 'CHAMPION', 'georgiab.ttf', 150, W - 300, 8), '#2a1f08', spacing=8)
    text_center(d, (W / 2, H * .82), 'Heavyweight', font('georgiai.ttf', 80), '#3a2c0c', spacing=2)
    savepil('plaque', im)


def diploma():
    """A framed degree for the exam-room wall, beside the gloves (S3): so the gloves read as 'and also'. 4:3, cream paper, a seal."""
    W, H = 1600, 1200
    im = Image.new('RGB', (W, H), '#f6f0de'); d = ImageDraw.Draw(im)
    d.rectangle([40, 40, W - 40, H - 40], outline='#9a7d3c', width=10); d.rectangle([64, 64, W - 64, H - 64], outline='#9a7d3c', width=3)
    text_center(d, (W / 2, 220), 'School of Medicine', font('georgiab.ttf', 96), '#2a2418', spacing=2)
    text_center(d, (W / 2, 400), 'Doctor of Medicine', font('georgiai.ttf', 110), '#2a2418', spacing=2)
    text_center(d, (W / 2, 560), 'M. HALLORAN', font('georgiab.ttf', 120), '#2a2418', spacing=8)
    for y in (720, 780): d.line([(260, y), (W - 260, y)], fill='#b9ad92', width=3)
    d.ellipse([W / 2 - 110, 860, W / 2 + 110, 1080], fill='#b0262c'); d.ellipse([W / 2 - 80, 890, W / 2 + 80, 1050], outline='#e7c070', width=6)
    a = np.asarray(im).astype(np.float32) / 255 * paper_grain(W, H, 12, .05)[..., None]
    save('diploma', a)


# ---------------------------------------------------------------------------------------------------- space
def stars():
    """A star sphere: equirect, 4096x2048. Points of varied size, brightness and colour, a faint milky band, no animation anywhere, so nothing twinkles."""
    W, H = 4096, 2048
    img = np.zeros((H, W, 3), np.float32)
    # the band: a tilted belt of faint light and dust
    X, Y = grid(W, H, -math.pi, math.pi, -math.pi / 2, math.pi / 2)
    tilt = .9
    band = np.sin(Y) * math.cos(tilt) - np.cos(Y) * np.sin(X) * math.sin(tilt)
    belt = np.exp(-(band / .22) ** 2) * (.5 + .5 * fbm(W, H, 5, 6, 21, ax=2, wrap=True))
    dust = fbm(W, H, 6, 10, 31, ax=2, wrap=True)
    img += (belt * .11)[..., None] * np.array([.75, .8, 1.0])
    img *= (1 - np.clip(dust - .55, 0, 1) * 2.2)[..., None]
    img += (fbm(W, H, 4, 3, 41, ax=2, wrap=True) * .012)[..., None] * np.array([.5, .6, 1.0])
    r = np.random.default_rng(7)
    n = 9000
    xs = r.random(n) * W; ys = np.arccos(1 - 2 * r.random(n)) / math.pi * H   # even on the sphere
    mag = r.random(n) ** 4
    col = np.array([[1, .85, .7], [1, 1, 1], [.8, .9, 1], [1, .95, .85]])[r.integers(0, 4, n)]
    pil = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(pil)
    for x, y, m, c in zip(xs, ys, mag, col):
        rad = .4 + m * 3.2; b = .35 + m * .65
        cc = tuple(int(255 * min(1, b * v)) for v in c)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=cc)
        if m > .7:
            for dx, dy in ((rad * 3, 0), (0, rad * 3)):
                d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=tuple(int(v * .45) for v in cc), width=1)
    a = np.asarray(pil).astype(np.float32) / 255
    # the brightest hundred get a soft halo
    halo = np.zeros((H, W), np.float32)
    for x, y, m in zip(xs, ys, mag):
        if m > .85:
            x0, y0 = int(x), int(y); rr = 14
            yy, xx = np.mgrid[max(0, y0 - rr):min(H, y0 + rr), max(0, x0 - rr):min(W, x0 + rr)]
            halo[max(0, y0 - rr):min(H, y0 + rr), max(0, x0 - rr):min(W, x0 + rr)] += np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / 30) * .5
    a += halo[..., None] * np.array([.9, .95, 1])
    save('stars', a)


def sphere_shade(W, H, seed, oct=7, base=4):
    return fbm(W, H, oct, base, seed, ax=2, wrap=True)


def earth():
    """2048x1024 equirect: continents from noise with coasts, polar ice, cloud swirls painted in (one sphere, no alpha), a hint of city-less land colour."""
    W, H = 2048, 1024
    X, Y = grid(W, H, 0, 1, 0, 1); lat = np.abs(Y - .5) * 2
    n = sphere_shade(W, H, 11, 7, 3)
    land = n - .5 + lat * .12   # a little more land toward the poles
    sea_deep, sea_shallow = hex3('#0b2d6b'), hex3('#1f6fb0')
    sea = lerp(sea_deep, sea_shallow, np.clip(1 + land / .06, 0, 1)[..., None])
    img = np.where((land < 0)[..., None], sea, 0)
    g = sphere_shade(W, H, 12, 5, 8)
    green, sand, dark = hex3('#3f8a3a'), hex3('#c9b06a'), hex3('#2f5f2a')
    landcol = lerp(green, sand, np.clip((g - .5) * 3 + (1 - lat) * .5, 0, 1)[..., None]); landcol = lerp(landcol, dark, np.clip(land * 3, 0, 1)[..., None])
    img = np.where((land >= 0)[..., None], landcol, img)
    coast = np.exp(-(land / .01) ** 2)[..., None]
    img = lerp(img, hex3('#5fb6d8'), coast * .6 * (land < 0)[..., None])
    ice = np.clip((lat - .82 + n * .08) / .06, 0, 1)[..., None]
    img = lerp(img, hex3('#f2f7fb'), ice)
    c = sphere_shade(W, H, 13, 6, 5); c2 = sphere_shade(W, H, 14, 4, 2)
    swirl = np.clip((c - .56 + (c2 - .5) * .5) * 4, 0, 1)
    img = lerp(img, np.ones(3) * .98, (swirl * .95)[..., None])
    save('earth', img)


def moon():
    """1024 wide grey, craters with a bright rim and a dark floor, rays from the big ones. The mesh is also dented, so the paint sits in the dents (seeded the same)."""
    W, H = 2048, 1024
    img = np.ones((H, W, 3)) * hex3('#8e8b84')
    img = img * (.85 + sphere_shade(W, H, 21, 6, 4)[..., None] * .3)
    maria = np.clip((sphere_shade(W, H, 22, 3, 2) - .55) * 6, 0, 1)[..., None]
    img = lerp(img, hex3('#5e5c58'), maria * .7)
    X, Y = grid(W, H, 0, 2 * math.pi, 0, math.pi)
    r = np.random.default_rng(5)
    for i in range(140):
        lon, lat = r.random() * 2 * math.pi, math.acos(1 - 2 * r.random()); rad = (r.random() ** 2.2) * .28 + .02
        d = np.arccos(np.clip(np.sin(Y) * math.sin(lat) * np.cos(X - lon) + np.cos(Y) * math.cos(lat), -1, 1))
        t = d / rad
        floor = np.clip(1 - t / .75, 0, 1); rim = np.exp(-((t - .95) / .12) ** 2); outer = np.exp(-((t - 1.1) / .1) ** 2)
        img = img * (1 - floor * .22)[..., None] * (1 + rim * .16)[..., None] * (1 - outer * .06)[..., None]
        if rad > .2:
            ang = np.arctan2(np.sin(Y) * np.sin(X - lon), np.cos(Y) * math.sin(lat) - np.sin(Y) * math.cos(lat) * np.cos(X - lon))
            rays = np.clip(np.cos(ang * 9 + i) ** 24 - .3, 0, 1) * np.clip(1 - (t - 1) / 3, 0, 1) * (t > 1)
            img = img * (1 + rays * .18)[..., None]
    save('moon', img)


def mars():
    W, H = 2048, 1024
    X, Y = grid(W, H, 0, 1, 0, 1); lat = np.abs(Y - .5) * 2
    n = sphere_shade(W, H, 31, 7, 4); n2 = sphere_shade(W, H, 32, 4, 2)
    img = lerp(hex3('#b8562c'), hex3('#e0905a'), np.clip((n - .35) * 2.2, 0, 1)[..., None])
    img = lerp(img, hex3('#6f3420'), np.clip((n2 - .58) * 5, 0, 1)[..., None])
    img = lerp(img, hex3('#f7f3ee'), np.clip((lat - .9 + n * .04) / .04, 0, 1)[..., None])
    # a canyon and a big volcano
    canyon = np.exp(-((Y - .52 + np.sin(X * 12) * .01) / .012) ** 2) * (np.abs(X - .4) < .18)
    img = img * (1 - canyon * .45)[..., None]
    vol = np.hypot((X - .72) * 2, Y - .4); img = img * (1 + np.exp(-(vol / .06) ** 2) * .2 - np.exp(-(vol / .012) ** 2) * .5)[..., None]
    save('mars', img)


def jupiter():
    W, H = 2048, 1024
    X, Y = grid(W, H, 0, 1, 0, 1)
    turb = sphere_shade(W, H, 41, 6, 3) - .5
    y = Y + turb * .035
    bands = np.sin(y * math.pi * 11 + np.sin(y * 41) * .5) * .5 + .5
    cream, tan, brown, white = hex3('#e8d9b8'), hex3('#c9a06a'), hex3('#9a6440'), hex3('#f5efe2')
    img = lerp(cream, tan, bands[..., None]); img = lerp(img, brown, np.clip((np.sin(y * math.pi * 5.5 + 1) - .6) * 3, 0, 1)[..., None])
    img = lerp(img, white, np.clip((np.sin(y * math.pi * 17 + 2) - .85) * 7, 0, 1)[..., None])
    swirl = sphere_shade(W, H, 42, 5, 12) - .5
    img = img * (1 + swirl * .22)[..., None]
    spot = np.hypot((X - .68) * 1.8, (Y - .62) * 3.2) < .09
    rim = np.hypot((X - .68) * 1.8, (Y - .62) * 3.2)
    img = lerp(img, hex3('#c7553a'), (np.clip(1 - rim / .09, 0, 1) ** .5)[..., None])
    img = img * (1 - np.exp(-((rim - .1) / .012) ** 2) * .25)[..., None]
    save('jupiter', img)


def saturn():
    W, H = 2048, 1024
    X, Y = grid(W, H, 0, 1, 0, 1)
    y = Y + (sphere_shade(W, H, 51, 5, 3) - .5) * .02
    bands = np.sin(y * math.pi * 13) * .5 + .5
    img = lerp(hex3('#e9d9a9'), hex3('#c9b17a'), bands[..., None]); img = lerp(img, hex3('#f3e9c9'), np.clip((np.sin(y * math.pi * 7 + .4) - .8) * 5, 0, 1)[..., None])
    img = img * (1 + (sphere_shade(W, H, 52, 5, 10) - .5) * .12)[..., None]
    save('saturn', img)


def saturn_ring():
    """u is the radius from the inner edge (0) to the outer (1), v is round. Bands, gaps, grain."""
    W, H = 2048, 64
    U, _ = grid(W, H, 0, 1, 0, 1)
    n = fbm(W, H, 6, 24, 61, ax=16)
    bands = .55 + .45 * np.sin(U * 70) * np.sin(U * 13 + 1) + (n - .5) * .5
    img = lerp(hex3('#b9a37a'), hex3('#efe4c8'), np.clip(bands, 0, 1)[..., None])
    gap = np.exp(-((U - .64) / .018) ** 2) + np.exp(-((U - .3) / .006) ** 2) * .7 + np.exp(-((U - .86) / .01) ** 2) * .5
    img = img * (1 - gap * .85)[..., None]
    img = img * (1 - np.clip((U - .9) / .1, 0, 1) * .6)[..., None] * (1 - np.clip((.06 - U) / .06, 0, 1) * .5)[..., None]
    save('saturn_ring', img)


# ---------------------------------------------------------------------------------------------------- commercial
def backdrop():
    """The daytime-TV backdrop (S7): a clean pink-to-lilac sweep with big soft discs of pastel light and thin white arcs, the 2000s talk-show look.
    No noise and no stripes (the old bands read as a smear at 1080). u across the curved panel."""
    W, H = 2048, 1024
    X, Y = grid(W, H, 0, 2, 0, 1)
    img = lerp(hex3('#f7b9cf'), hex3('#c9b4ee'), np.clip(X / 2, 0, 1)[..., None])
    img = img * (1 - (Y - .45) ** 2 * .35)[..., None]
    r = np.random.default_rng(81)
    for _ in range(14):
        cx, cy, rad = r.random() * 2, r.random(), .08 + r.random() * .16
        c = hex3(['#fff0b8', '#c2def7', '#c8f0dc', '#ffd9ec', '#ffffff'][int(r.random() * 5)])
        m = np.exp(-((np.hypot(X - cx, (Y - cy) * .5) / rad) ** 4))[..., None]
        img = lerp(img, c, m * .55)
    for k in range(3):
        rr = .55 + k * .12; arc = np.exp(-((np.hypot(X - 1, (Y - 1.25) * .5) - rr) / .004) ** 2)[..., None]
        img = lerp(img, hex3('#ffffff'), arc * .8)
    save('backdrop', img)


def tv_floor():
    """The studio floor, glossy and a stop under the faces (S7: the old pale floor blew out under the key): a deep lilac-grey with a soft pool of
    light under the stools and the thin pink ring. Tiled once over the whole stage."""
    W = H = 1024; X, Y = grid(W, H, -1, 1, -1, 1)
    r = np.hypot(X, Y)
    img = lerp(hex3('#8f7f97'), hex3('#4d4257'), np.clip(r, 0, 1)[..., None])
    img = img * (1 + np.exp(-(r / .4) ** 2) * .18)[..., None]
    ring = np.exp(-((r - .78) / .012) ** 2)[..., None]
    img = lerp(img, hex3('#ff8fb4'), ring * .9)
    save('tv_floor', img)


ALL = [can_label, poster, monitor_screen, waiting_sign, magazines, plaque, diploma, tv_sign, clinic_floor, ceiling_tile, paper_roll, rx_pad, clipboard_sheet, reception_sign, exam_sign, eye_chart, stars, earth, moon, mars, jupiter, saturn, saturn_ring, backdrop, tv_floor]
only = sys.argv[1:]
for f in ALL:
    if not only or f.__name__ in only: f()
