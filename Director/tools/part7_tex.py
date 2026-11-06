"""Parts 7-8: draws every broadcast picture (no AI needed), writes PNG + .meta + a MV/Lit .mat into Assets/Shows.
   py Director/tools/part7_tex.py"""
import hashlib, math, os, random, re, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', 'Assets', 'Shows'); os.makedirs(OUT, exist_ok=True)
GEN = os.path.join(HERE, '..', '..', 'Assets', 'MusicVideo', 'Generated', 'Materials')
F = lambda n, s: ImageFont.truetype(f'C:/Windows/Fonts/{n}.ttf', s)
guid = lambda s: hashlib.md5(('tkshock/' + s).encode()).hexdigest()


def centered(d, xy, txt, font, fill, **k):
    b = d.textbbox((0, 0), txt, font=font, **{x: y for x, y in k.items() if x == 'stroke_width'})
    d.text((xy[0] - (b[0] + b[2]) / 2, xy[1] - (b[1] + b[3]) / 2), txt, font=font, fill=fill, **k)


TEX_META = """fileFormatVersion: 2
guid: {g}
TextureImporter:
  serializedVersion: 13
  mipmaps:
    enableMipMap: 1
    sRGBTexture: 1
  isReadable: 0
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: 2
    aniso: 4
    wrapU: 1
    wrapV: 1
  alphaUsage: 1
  alphaIsTransparency: {alpha}
  textureType: 0
  textureShape: 1
"""
TMPL = None
for f in sorted(os.listdir(GEN)):
    if f.startswith('m_') and f.endswith('.mat'):
        s = open(os.path.join(GEN, f), errors='ignore').read()
        if '_EMISSION' in s:
            TMPL = s
            break


def save(name, im, glow=1.0, cut=False, lit=False):
    p = os.path.join(OUT, name + '.png')
    im.save(p)
    meta = p + '.meta'
    if not os.path.exists(meta):
        open(meta, 'w').write(TEX_META.format(g=guid(name), alpha=1 if cut else 0))
    g = re.search(r'guid: (\w+)', open(meta).read()).group(1)
    t = re.sub(r'm_Name: .*', 'm_Name: ' + name, TMPL)
    tex = '{fileID: 2800000, guid: %s, type: 3}' % g
    t = re.sub(r'(- _BaseMap:\n\s+m_Texture: )\{[^}]*\}', r'\g<1>' + tex, t)
    t = re.sub(r'(- _MainTex:\n\s+m_Texture: )\{[^}]*\}', r'\g<1>' + tex, t)
    if not lit:
        t = re.sub(r'(- _EmissionMap:\n\s+m_Texture: )\{[^}]*\}', r'\g<1>' + tex, t)
    col = lambda v: '{r: %g, g: %g, b: %g, a: 1}' % (v, v, v)
    t = re.sub(r'- _BaseColor: \{[^}]*\}', '- _BaseColor: ' + col(1 if lit else 0.02), t)
    t = re.sub(r'- _Color: \{[^}]*\}', '- _Color: ' + col(1 if lit else 0.02), t)
    t = re.sub(r'- _EmissionColor: \{[^}]*\}', '- _EmissionColor: ' + col(0 if lit else glow), t)
    if lit:
        t = t.replace('  m_ValidKeywords:\n  - _EMISSION\n', '  m_ValidKeywords: []\n')
    if cut:
        t = t.replace('- _AlphaClip: 0', '- _AlphaClip: 1')
        t = t.replace('  m_ValidKeywords:\n', '  m_ValidKeywords:\n  - _ALPHATEST_ON\n')
        t = t.replace('stringTagMap: {}', 'stringTagMap:\n    RenderType: TransparentCutout').replace('m_CustomRenderQueue: -1', 'm_CustomRenderQueue: 2450')
    t = t.replace('- _Cull: 2', '- _Cull: 0')
    open(os.path.join(OUT, name + '.mat'), 'w').write(t)
    mm = os.path.join(OUT, name + '.mat.meta')
    if not os.path.exists(mm):
        open(mm, 'w').write('fileFormatVersion: 2\nguid: %s\nNativeFormatImporter:\n  mainObjectFileID: 2100000\n' % guid(name + '.mat'))


# ---------- the turkey drug ad and the stinger. `py part7_tex.py ad [dir]` draws only these (dir: a preview folder) ----------
AD_SIDES = ("Turkey is not for everyone. Do not take Turkey if you are allergic to Turkey or to any of its feathers. Side effects may include turkeys, additional turkeys, "
            "feathers of the hands, arms and neck, gobbling, loss of sofa, a persistent feeling of being watched, being on television, a sudden wish to host, smiling, and basting. "
            "Tell your doctor if your television looks back. Do not operate a remote control until you know how Turkey affects you. Turkeys were observed in 100% of patients. "
            "In rare cases Turkey may cause channels. If you experience a segment lasting longer than four hours, stay tuned; you have no choice. Your doctor may be a turkey.")


def wrap(d, txt, font, width):
    out, cur = [], ''
    for w in txt.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) > width:
            out.append(cur)
            cur = w
        else:
            cur = t
    return out + [cur]


def ad_pictures(dest=None):
    def put(name, im, card=False):
        if dest:
            im.save(os.path.join(dest, name + '.png'))
        elif card:
            save(name, im.convert('RGB'), 1.0)
        else:
            p = os.path.join(OUT, name + '.png')
            im.save(p)
            if not os.path.exists(p + '.meta'):
                open(p + '.meta', 'w').write(TEX_META.format(g=guid(name), alpha=1))
    W, H = 1920, 1080
    navy = (22, 50, 92, 255)
    # "Ask your doctor": soft, airy, left on the sky.
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((110, 96), 'ASK YOUR DOCTOR', font=F('segoeuil', 92), fill=navy)
    d.text((110, 196), 'ABOUT TURKEY.', font=F('seguisb', 92), fill=navy)
    d.text((114, 312), 'TURKEY\u00ae (turkey), 20 lb tablets', font=F('segoeui', 32), fill=navy)
    put('ad_doctor', im)
    # The side effects: a full, fast, pale block, as dense as the real ones.
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = F('arial', 25)
    lines = wrap(d, AD_SIDES, f, W - 200)
    top = H - 62 - len(lines) * 31
    d.rectangle((0, top - 22, W, H), fill=(255, 255, 255, 214))
    for i, l in enumerate(lines):
        d.text((100, top + i * 31), l, font=f, fill=(30, 44, 66, 255))
    put('ad_sides', im)
    # The product's own name, alone on white. No company: it's just a turkey drug.
    im = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    f = F('georgia', 190)
    tw = d.textlength('Turkey', font=f)
    d.text((W / 2, H / 2 - 30), 'Turkey', font=f, fill=(22, 50, 92, 255), anchor='mm')
    d.text((W / 2 + tw / 2 + 8, H / 2 - 130), '\u00ae', font=F('georgia', 54), fill=(22, 50, 92, 255))
    d.text((W / 2, H / 2 + 110), 'Ask your doctor.', font=F('segoeuil', 56), fill=(70, 90, 120, 255), anchor='mm')
    put('ad_mark', im)
    put('ad_card', im, card=True)


def next_card(dest=None):
    """NEXT ON WTKS: her face and the tie bird beside her, from real frames (Director/gen/stinger_her.png, _bird.png)."""
    src = os.path.join(HERE, '..', 'gen')
    if not os.path.exists(os.path.join(src, 'stinger_her.png')):
        print('no stinger frames yet')
        return
    W, H = 1920, 1080
    im = Image.new('RGB', (W, H), (10, 16, 40))
    d = ImageDraw.Draw(im)
    for y in range(H):
        k = y / H
        d.line((0, y, W, y), fill=(int(14 + 26 * k), int(22 + 14 * k), int(66 - 26 * k)))
    for x in range(-200, W, 90):
        d.line((x, 0, x + 320, H), fill=(22, 34, 84), width=3)
    d.rectangle((0, 70, W, 250), fill=(192, 16, 32))
    d.text((90, 160), 'NEXT ON', font=F('impact', 132), fill=(255, 255, 255), anchor='lm')
    d.text((510, 160), 'WTKS', font=F('impact', 132), fill=(255, 208, 0), anchor='lm')
    d.text((W - 90, 160), 'CH 4', font=F('arialbd', 62), fill=(255, 255, 255), anchor='rm')
    for name, x in (('stinger_her', 150), ('stinger_bird', 990)):
        p = Image.open(os.path.join(src, name + '.png')).convert('RGB')
        s = max(780 / p.width, 560 / p.height)
        p = p.resize((int(p.width * s), int(p.height * s)), Image.LANCZOS)
        l, t = (p.width - 780) // 2, (p.height - 560) // 2
        p = p.crop((l, t, l + 780, t + 560))
        d.rectangle((x - 10, 290, x + 790, 860), fill=(255, 255, 255))
        im.paste(p, (x, 300))
    d.rectangle((0, 900, W, 1010), fill=(8, 8, 14))
    d.text((W / 2, 955), 'LOCAL WOMAN STILL WATCHING', font=F('arialbd', 64), fill=(255, 255, 255), anchor='mm')
    im = im.convert('RGBA')
    if dest:
        im.save(os.path.join(dest, 'next_wtks.png'))
    else:
        p = os.path.join(OUT, 'next_wtks.png')
        im.save(p)
        if not os.path.exists(p + '.meta'):
            open(p + '.meta', 'w').write(TEX_META.format(g=guid('next_wtks'), alpha=0))


if len(sys.argv) > 1 and sys.argv[1] == 'ad':
    ad_pictures(sys.argv[2] if len(sys.argv) > 2 else None)
    next_card(sys.argv[2] if len(sys.argv) > 2 else None)
    sys.exit()


def turkey(d, x, y, s, fill):
    """A tiny turkey icon."""
    d.ellipse((x - s, y - s * .7, x + s, y + s * .7), fill=fill)
    for a in range(-70, 71, 28):
        c0, s0 = math.cos(math.radians(180 + a)), math.sin(math.radians(180 + a))
        c1, s1 = math.cos(math.radians(198 + a)), math.sin(math.radians(198 + a))
        d.polygon([(x - s * .5, y), (x - s * .5 + c0 * s * 1.5, y + s0 * s * 1.5), (x - s * .5 + c1 * s * 1.5, y + s1 * s * 1.5)], fill=fill)
    d.line((x + s * .7, y - s * .2, x + s * 1.1, y - s * 1.0), fill=fill, width=max(2, int(s * .28)))
    d.ellipse((x + s * .9, y - s * 1.3, x + s * 1.4, y - s * .85), fill=fill)
    d.polygon([(x + s * 1.35, y - s * 1.15), (x + s * 1.65, y - s * 1.05), (x + s * 1.35, y - s * .98)], fill=(255, 190, 40))
    d.line((x - s * .2, y + s * .6, x - s * .2, y + s * 1.1), fill=fill, width=max(1, int(s * .14)))
    d.line((x + s * .3, y + s * .6, x + s * .3, y + s * 1.1), fill=fill, width=max(1, int(s * .14)))


# ---------- news ----------
W, H = 2048, 820
im = Image.new('RGB', (W, H))
px = im.load()
for y in range(H):
    for x in range(W):
        u = abs(x - W / 2) / (W / 2)
        v = y / H
        px[x, y] = (int(8 + 16 * (1 - u)), int(32 + 80 * (1 - u) * (1 - v * .5)), int(92 + 150 * (1 - u)))
d = ImageDraw.Draw(im)
for i in range(1, 16):
    d.line((i * W / 16, 0, i * W / 16, H), fill=(90, 150, 255), width=1)
for i in range(1, 7):
    d.line((0, i * H / 7, W, i * H / 7), fill=(90, 150, 255), width=1)
random.seed(4)
for _ in range(120):
    x, y, r = random.randrange(W), random.randrange(H), random.randrange(18, 60)
    d.ellipse((x - r * 2, y - r, x + r * 2, y + r), fill=(32, 96, 200))
d.rectangle((0, 300, W, 560), fill=(170, 16, 28))
d.rectangle((0, 300, W, 308), fill=(255, 255, 255))
d.rectangle((0, 552, W, 560), fill=(255, 255, 255))
centered(d, (W / 2 - 110, 428), 'WTKS NEWS', F('impact', 220), (255, 255, 255))
d.rectangle((1420, 322, 1630, 538), fill=(255, 255, 255))
centered(d, (1525, 426), '4', F('impact', 220), (170, 16, 28))
for i in range(6):
    d.line((0, i * 137, W, i * 137), fill=(4, 8, 20), width=6)
for i in range(11):
    d.line((i * 204.8, 0, i * 204.8, H), fill=(4, 8, 20), width=6)
save('news_wall', im, 0.72)
im = Image.new('RGB', (512, 180), (170, 16, 28))
d = ImageDraw.Draw(im)
centered(d, (256, 90), 'NEWS 4', F('impact', 120), (255, 255, 255))
save('news_badge', im, 1.0)

# ---------- weather ----------
W, H = 2048, 1024
im = Image.new('RGB', (W, H), (18, 86, 170))
d = ImageDraw.Draw(im)
for y in range(H):
    d.line((0, y, W, y), fill=(14 + y // 40, 70 + y // 16, 150 + y // 10))
for r in range(100, 1100, 160):
    d.arc((260 - r, 420 - r * .7, 260 + r, 420 + r * .7), 0, 360, fill=(120, 180, 240), width=2)
random.seed(9)
blob = Image.new('L', (W, H), 0)
b = ImageDraw.Draw(blob)
for cx, cy, rx, ry in [(560, 620, 420, 260), (950, 560, 380, 320), (1330, 640, 400, 270), (1680, 520, 300, 300), (1100, 300, 300, 120), (300, 300, 200, 110)]:
    b.polygon([(cx + math.cos(a / 40 * 6.283) * rx * (.75 + .4 * random.random()), cy + math.sin(a / 40 * 6.283) * ry * (.75 + .4 * random.random())) for a in range(40)], fill=255)
blob = blob.filter(ImageFilter.GaussianBlur(16)).point(lambda v: 255 if v > 128 else 0)
land = Image.new('RGB', (W, H), (54, 168, 72))
l = ImageDraw.Draw(land)
for _ in range(180):
    x, y, r = random.randrange(W), random.randrange(H), random.randrange(30, 140)
    l.ellipse((x - r, y - r * .7, x + r, y + r * .7), fill=random.choice([(74, 188, 80), (98, 200, 84), (40, 148, 66), (168, 196, 90)]))
im.paste(land, (0, 0), blob)
im.paste((255, 255, 255), (0, 0), blob.filter(ImageFilter.FIND_EDGES))
d = ImageDraw.Draw(im)
for _ in range(90):
    turkey(d, random.randrange(420, 1640), random.randrange(240, 800), random.randrange(14, 26), random.choice([(120, 72, 36), (250, 248, 240), (40, 34, 40)]))
for x, y, tx in [(420, 560, '41°'), (820, 500, '38°'), (1210, 620, '12°'), (1620, 480, '-3°'), (1050, 300, 'GOBBLE')]:
    d.rounded_rectangle((x - 110, y - 44, x + 110, y + 44), 14, fill=(8, 22, 60))
    centered(d, (x, y), tx, F('impact', 62), (255, 224, 40))
d.rectangle((0, 0, W, 120), fill=(8, 22, 60))
d.rectangle((0, 116, W, 124), fill=(255, 204, 0))
centered(d, (560, 60), 'STORM CENTER 5', F('impact', 86), (255, 255, 255))
centered(d, (1540, 60), 'TURKEY ADVISORY', F('impact', 86), (255, 204, 0))
d.rectangle((0, 900, W, H), fill=(8, 22, 60))
for i, dy in enumerate(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']):
    x = 150 + i * 292
    centered(d, (x - 40, 960), dy, F('impact', 58), (255, 255, 255))
    turkey(d, x + 60, 962, 24, (255, 204, 0))
save('wx_map', im, 1.15)

# ---------- cooking ----------
im = Image.new('RGB', (1500, 280), (190, 36, 24))
d = ImageDraw.Draw(im)
centered(d, (750, 136), 'BASTE OF THE BEST', F('georgiab', 150), (255, 246, 220), stroke_width=3, stroke_fill=(120, 16, 10))
save('ck_sign', im, 0.9)
base = Image.new('RGBA', (1024, 512), (250, 246, 236, 255))
over = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
k = ImageDraw.Draw(over)
for x in range(0, 1024, 80):
    k.rectangle((x, 0, x + 39, 512), fill=(204, 30, 26, 150))
for y in range(0, 512, 80):
    k.rectangle((0, y, 1024, y + 39), fill=(204, 30, 26, 150))
save('ck_gingham', Image.alpha_composite(base, over).convert('RGB'), lit=True)

# ---------- game show ----------
S = 2048
im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
c = S / 2
labels = ['500', 'LOSE A TURN', '1000', 'BANKRUPT', '250', 'YOUR SOFA', '750', 'BANKRUPT', '100', 'A TURKEY', '900', 'BANKRUPT', '300', 'ETERNITY', '650', 'BANKRUPT']
cols = [(232, 28, 36), (255, 200, 40), (28, 140, 240), (16, 16, 20), (40, 192, 64), (240, 106, 16), (212, 24, 160), (16, 16, 20), (255, 255, 255), (232, 28, 36), (255, 200, 40), (16, 16, 20), (28, 140, 240), (40, 192, 64), (240, 106, 16), (16, 16, 20)]
R = 1000
for i, cl in enumerate(cols):
    d.pieslice((c - R, c - R, c + R, c + R), i * 22.5 - 101.25, (i + 1) * 22.5 - 101.25, fill=cl + (255,), outline=(255, 230, 150, 255), width=8)
for i, (lab, cl) in enumerate(zip(labels, cols)):
    tl = Image.new('RGBA', (800, 130), (0, 0, 0, 0))
    td = ImageDraw.Draw(tl)
    ink = (255, 255, 255, 255) if cl in [(16, 16, 20), (232, 28, 36), (28, 140, 240), (212, 24, 160)] else (20, 14, 30, 255)
    centered(td, (400, 65), lab, F('impact', 104 if len(lab) < 7 else 84), ink)
    a = i * 22.5
    r = tl.rotate(90 - a, expand=True, resample=Image.BICUBIC)
    rad = math.radians(a)
    im.alpha_composite(r, (int(c + math.sin(rad) * 600 - r.width / 2), int(c - math.cos(rad) * 600 - r.height / 2)))
save('gs_wheel', im, 1.2, cut=True)
im = Image.new('RGB', (1500, 340), (30, 8, 56))
d = ImageDraw.Draw(im)
centered(d, (750, 170), 'SPIN TO LOSE', F('impact', 250), (255, 200, 40), stroke_width=6, stroke_fill=(200, 16, 120))
save('gs_sign', im, 1.3)
im = Image.new('RGB', (900, 500), (8, 8, 16))
d = ImageDraw.Draw(im)
for i, v in enumerate(['$0', '$0', '-$1']):
    d.rectangle((30 + i * 290, 40, 290 + i * 290, 460), fill=(30, 10, 60))
    centered(d, (160 + i * 290, 250), v, F('impact', 170), (255, 210, 60))
save('gs_score', im, 1.3)

# ---------- workout ----------
im = Image.new('RGBA', (1600, 520), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
centered(d, (800, 150), 'TURKEY TONE', F('ariblk', 170), (24, 232, 255, 255), stroke_width=8, stroke_fill=(255, 26, 140, 255))
centered(d, (800, 380), '3000', F('ariblk', 240), (255, 240, 60, 255), stroke_width=10, stroke_fill=(255, 26, 140, 255))
save('wk_sign', im, 1.3, cut=True)

# ---------- sitcom ----------
im = Image.new('RGB', (640, 200), (60, 4, 2))
d = ImageDraw.Draw(im)
centered(d, (320, 100), 'APPLAUSE', F('impact', 150), (255, 240, 220))
save('sc_sign', im, 2.0)

# ---------- late night ----------
im = Image.new('RGBA', (1600, 460), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
centered(d, (800, 130), 'LATE LATE', F('georgiab', 190), (255, 90, 200, 255))
centered(d, (800, 320), 'GOBBLES', F('georgiab', 200), (90, 200, 255, 255))
save('ln_sign', im, 1.6, cut=True)

open(os.path.join(OUT, 'quad.obj'), 'w').write('o quad\nv -0.5 -0.5 0\nv 0.5 -0.5 0\nv 0.5 0.5 0\nv -0.5 0.5 0\nvt 1 0\nvt 0 0\nvt 0 1\nvt 1 1\nvn 0 0 -1\nf 1/1/1 4/4/1 3/3/1 2/2/1\n')
print(sorted(f for f in os.listdir(OUT) if f.endswith('.mat')))


# ---------- lower thirds as pictures: big type on a slab, nothing that a close object can hide ----------
def lower(name, title, sub, col, ink=(255, 255, 255), tcol=(10, 10, 16)):
    W, H = 1240, 210
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 0), (W - 60, 0), (W, 112), (0, 112)], fill=col + (255,))
    d.polygon([(0, 112), (W - 190, 112), (W - 240, 196), (0, 196)], fill=(10, 10, 16, 240))
    d.rectangle((0, 0, 22, 196), fill=ink + (255,))
    d.text((48, 2), title, font=F('impact', 96), fill=tcol + (255,))
    d.text((50, 122), sub, font=F('arialbd', 52), fill=(255, 255, 255, 255))
    p = os.path.join(OUT, name + '.png')
    im.save(p)
    m = p + '.meta'
    if not os.path.exists(m):
        open(m, 'w').write(TEX_META.format(g=guid(name), alpha=1))


lower('lt_him', 'HIM', 'LOCAL MAN STILL BEING WATCHED', (214, 20, 28), tcol=(255, 255, 255))
lower('lt_wx', 'TURKEY ADVISORY', '100% CHANCE OF TURKEY', (255, 204, 0))
lower('lt_chef', "CHEF'S TIP", 'BASTE EVERY 20 MINUTES', (232, 112, 20))
lower('lt_game', "TONIGHT'S CONTESTANT", 'PLAYING FOR: HIS SOFA', (255, 200, 40))
lower('lt_laugh', "HE'S BACK!", 'FILMED BEFORE A LIVE TURKEY AUDIENCE', (255, 232, 128))
lower('lt_nature', 'THE COMMON VIEWER', 'HABITAT: ALL OF THEM', (226, 200, 120))
lower('lt_late', "TONIGHT'S GUEST", "HE CAN'T LEAVE", (255, 168, 80))
lower('lt_host', 'YOUR HOST', 'STAY TUNED. YOU HAVE NO CHOICE.', (255, 168, 80))
ad_pictures()
next_card()
