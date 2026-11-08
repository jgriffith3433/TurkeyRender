"""Composes the Hawkes Punch storyboard: an annotated card per shot and one scrolling sheet per act
(3 panels per row, 1600 px wide, captions under each), plus STORYBOARD.md.
    py Director/videos/hawkespunch/storyboard/compose.py
Panels come from make_panels.mjs (storyboard/panels/<id>.png); a missing panel gets a drawn placeholder.
"""
import json, os, textwrap, math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, 'shots.json'), encoding='utf-8'))
PANELS = os.path.join(HERE, 'panels')
FPS = 24
RED = (214, 40, 40)
INK = (30, 30, 30)
GREY = (110, 110, 110)
PAPER = (247, 246, 243)
RULE = (205, 203, 198)

def font(size, bold=False):
    name = 'arialbd.ttf' if bold else 'arial.ttf'
    return ImageFont.truetype(os.path.join('C:/Windows/Fonts', name), size)

def wrap(draw, text, f, width):
    lines = []
    for para in text.split('\n'):
        words, cur = para.split(), ''
        for w in words:
            t = (cur + ' ' + w).strip()
            if draw.textlength(t, font=f) <= width:
                cur = t
            else:
                lines.append(cur); cur = w
        lines.append(cur)
    return lines

def arrow(d, a, b, col, w):
    d.line([a, b], fill=col, width=w)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    L = 5 * w
    for s in (0.5, -0.5):
        d.line([b, (b[0] - L * math.cos(ang + s), b[1] - L * math.sin(ang + s))], fill=col, width=w)

def overlay_move(img, move):
    """Camera-move arrows on the panel, so the move reads without reading."""
    if move in (None, 'none'):
        return img
    img = img.convert('RGBA')
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    W, H = img.size
    col = RED + (235,)
    w = max(3, W // 170)
    m = W // 14
    label = ''
    if move in ('push', 'push_late'):
        for sx in (1, -1):
            for sy in (1, -1):
                x0 = W // 2 + sx * (W // 2 - m); y0 = H // 2 + sy * (H // 2 - m)
                arrow(d, (x0, y0), (x0 - sx * m * 1.6, y0 - sy * m * 1.6), col, w)
        label = 'PUSH IN (late)' if move == 'push_late' else 'SLOW PUSH IN'
    elif move == 'pull':
        for sx in (1, -1):
            for sy in (1, -1):
                x0 = W // 2 + sx * (W // 2 - m * 2.8); y0 = H // 2 + sy * (H // 2 - m * 2.8)
                arrow(d, (x0, y0), (x0 + sx * m * 1.6, y0 + sy * m * 1.6), col, w)
        label = 'PULL BACK / FOLD OUT'
    elif move == 'tilt_up':
        arrow(d, (W - m, H - m), (W - m, m), col, w)
        label = 'TILT UP WITH HIM'
    elif move == 'track_stop':
        arrow(d, (m, H - m), (W // 2, H - m), col, w)
        d.line([(W // 2 + m // 2, H - m - m // 2), (W // 2 + m // 2, H - m + m // 2)], fill=col, width=w)
        label = 'TRACK WITH HIM, THEN LOCK OFF'
    if label:
        f = font(max(18, W // 40), True)
        tw = d.textlength(label, font=f)
        d.rectangle([(m // 2, m // 2), (m // 2 + tw + 16, m // 2 + f.size + 12)], fill=(255, 255, 255, 220))
        d.text((m // 2 + 8, m // 2 + 5), label, font=f, fill=RED)
    return Image.alpha_composite(img, ov).convert('RGB')

def panel_image(shot, w, h):
    p = os.path.join(PANELS, shot['id'] + '.png')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB')
        im = im.resize((w, h), Image.LANCZOS)
    else:
        im = Image.new('RGB', (w, h), (225, 225, 225))
        d = ImageDraw.Draw(im)
        d.text((16, 16), f'{shot["id"]}: panel missing', font=font(24, True), fill=INK)
    return overlay_move(im, shot.get('move'))

def card(shot, width, fs):
    """One annotated storyboard card: header, panel, captions. Returns an image."""
    f_h = font(fs + 1, True); f_a = font(fs); f_l = font(fs, True); f_c = font(fs - 2)
    ph = round(width * 9 / 16)
    tmp = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    pad = 10
    tw = width - 2 * pad
    secs = shot['frames'] / FPS
    lens = f'{shot["lens"]} mm' if shot['lens'] else 'card'
    head = f'{shot["id"].upper()}   {shot["size"]}   {lens}   {shot["frames"]}f = {secs:.1f}s'
    head_lines = wrap(tmp, head, f_h, tw - 110)
    act_lines = wrap(tmp, shot['action'], f_a, tw)
    line_lines = wrap(tmp, shot['line'], f_l, tw) if shot['line'] else []
    chg_lines = wrap(tmp, 'Changes: ' + shot['change'], f_c, tw)
    lh = fs + 5
    H = (len(head_lines) * lh + 10) + ph + 8 + (len(act_lines) + len(line_lines)) * lh + len(chg_lines) * (lh - 2) + 16
    im = Image.new('RGB', (width, H), PAPER)
    d = ImageDraw.Draw(im)
    y = 5
    for l in head_lines:
        d.text((pad, y), l, font=f_h, fill=INK); y += lh
    # register badge
    reg = shot['reg'].upper()
    bw = d.textlength(reg, font=f_h) + 16
    bcol = RED if shot['reg'] == 'epic' else (90, 90, 90)
    d.rectangle([(width - pad - bw, 5), (width - pad, 5 + lh)], fill=bcol)
    d.text((width - pad - bw + 8, 7), reg, font=f_h, fill=(255, 255, 255))
    y += 5
    im.paste(panel_image(shot, width - 2 * pad, ph), (pad, y))
    d.rectangle([(pad, y), (width - pad - 1, y + ph - 1)], outline=INK, width=2)
    y += ph + 8
    for l in act_lines:
        d.text((pad, y), l, font=f_a, fill=INK); y += lh
    for l in line_lines:
        d.text((pad, y), l, font=f_l, fill=(140, 20, 20)); y += lh
    for l in chg_lines:
        d.text((pad, y), l, font=f_c, fill=GREY); y += lh - 2
    return im

ACTS = {
    1: ('act1_clinic', 'ACT 1: THE CLINIC AND THE PUNCH', 'He asks his doctor for help. She prescribes Hawkes Punch. She means it.'),
    2: ('act2_space', 'ACT 2: SPACE', 'He looks for the ghost, finds himself, and two ordinary guys do impossible things and act unimpressed.'),
    3: ('act3_ad_button', 'ACT 3: THE COMMERCIAL AND THE NEXT DAY', 'It was an ad all along. Then the daily dose.'),
}

def sheet(act):
    name, title, sub = ACTS[act]
    shots = [s for s in DATA['shots'] if s['act'] == act]
    W = 1600; margin = 16; gutter = 12; cols = 3
    cw = (W - 2 * margin - gutter * (cols - 1)) // cols
    fs = 16
    rows = []  # each row: list of card images, or a scene label string
    cur, scene = [], None
    for s in shots:
        if s['scene'] != scene:
            if cur: rows.append(cur); cur = []
            rows.append(s['scene']); scene = s['scene']
        cur.append(card(s, cw, fs))
        if len(cur) == cols: rows.append(cur); cur = []
    if cur: rows.append(cur)
    f_t = font(30, True); f_s = font(18); f_sc = font(20, True)
    total_f = sum(s['frames'] for s in shots)
    head_h = 96
    H = margin + head_h
    for r in rows:
        H += 36 if isinstance(r, str) else max(c.height for c in r) + gutter
    H += margin
    im = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.text((margin, margin), title, font=f_t, fill=INK)
    d.text((margin, margin + 40), f'{sub}  |  {len(shots)} shots, {total_f} frames = {total_f / FPS:.0f} s at 24 fps  |  red badge = EPIC register, grey = DEADPAN  |  red arrows = camera move', font=f_s, fill=GREY)
    d.line([(margin, margin + 72), (W - margin, margin + 72)], fill=RULE, width=2)
    y = margin + head_h
    for r in rows:
        if isinstance(r, str):
            d.rectangle([(margin, y + 4), (W - margin, y + 30)], fill=(232, 231, 227))
            d.text((margin + 10, y + 6), 'SCENE ' + r.upper(), font=f_sc, fill=INK); y += 36
            continue
        rh = max(c.height for c in r)
        for i, c in enumerate(r):
            x = margin + i * (cw + gutter)
            im.paste(c, (x, y))
            d.rectangle([(x, y), (x + cw - 1, y + c.height - 1)], outline=RULE, width=1)
        y += rh + gutter
    out = os.path.join(HERE, name + '.jpg')
    im.save(out, quality=86, optimize=True)
    print(out, im.size, f'{os.path.getsize(out) / 1e6:.1f} MB')

def cards_dir():
    outd = os.path.join(HERE, 'cards'); os.makedirs(outd, exist_ok=True)
    for s in DATA['shots']:
        card(s, 1024, 22).save(os.path.join(outd, s['id'] + '.jpg'), quality=88)

if __name__ == '__main__':
    for a in (1, 2, 3): sheet(a)
    cards_dir()
