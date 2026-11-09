#!/usr/bin/env python
"""Hawkes Punch's full-frame cards (sets agent, 2026-11-08, CLINIC-AD-AUDIT T5 and the product read): the Important Safety Information pages
and the end card, written as 1920x1080 PNGs to Assets/Videos/hawkespunch/Props/ (same names the board's a05/a06 cards show).
   py Director/tools/punch_cards.py
Pharma style: a header bar, body left-aligned at about 4.5% of the frame's height, the last line (the button) set apart in bold on its own.
The words are the announcer's (lines.json, a05) and must stay in step with the read. The end card is the poster's: the product's name, a can
drawn with its label, and the tagline. No logo, no company line."""
import os, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'Videos', 'hawkespunch', 'Props')
F = 'C:/Windows/Fonts/'
W, H = 1920, 1080
BG, BAR, INK, DIM = '#141218', '#ff2a6a', '#f2eef4', '#b9b2c0'
RED, CREAM = '#c8161e', '#fff4e6'


def font(n, s): return ImageFont.truetype(F + n, s)


def wrap(d, text, f, maxw):
    out, line = [], ''
    for w in text.split():
        t = (line + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: line = t
        else: out.append(line); line = w
    if line: out.append(line)
    return out


def safety(name, body, button=None, page=''):
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    x0, maxw = 150, W - 300
    d.rectangle([0, 96, W, 196], fill=BAR)
    d.text((x0, 146), 'IMPORTANT SAFETY INFORMATION', font=font('arialbd.ttf', 58), fill='#ffffff', anchor='lm')
    if page: d.text((W - x0, 146), page, font=font('arial.ttf', 40), fill='#ffe3ec', anchor='rm')
    f = font('arial.ttf', 50); y = 280
    for ln in wrap(d, body, f, maxw):
        d.text((x0, y), ln, font=f, fill=INK); y += 70
    if button:
        y += 40; d.rectangle([x0 - 30, y - 6, x0 - 22, y + 70 * len(wrap(d, button, font('arialbd.ttf', 54), maxw)) - 14], fill=BAR)
        for ln in wrap(d, button, font('arialbd.ttf', 54), maxw):
            d.text((x0, y), ln, font=font('arialbd.ttf', 54), fill='#ffffff'); y += 70
    d.text((x0, H - 90), 'HAWKES PUNCH', font=font('arialbd.ttf', 34), fill=DIM)
    im.save(os.path.join(OUT, name + '.png')); print('card', name)


def end_card():
    im = Image.new('RGB', (W, H), RED); d = ImageDraw.Draw(im)
    cx, cy = 1340, 560
    for i in range(40):
        a0 = i / 40 * 2 * math.pi; a1 = (i + .5) / 40 * 2 * math.pi
        d.polygon([(cx, cy), (cx + math.cos(a0) * 1500, cy + math.sin(a0) * 1500), (cx + math.cos(a1) * 1500, cy + math.sin(a1) * 1500)], fill='#d42a30')
    d.rectangle([0, 0, 900, H], fill=RED)
    d.text((140, 330), 'HAWKES', font=font('impact.ttf', 230), fill=CREAM, anchor='ls')
    d.text((140, 590), 'PUNCH', font=font('impact.ttf', 300), fill=CREAM, anchor='ls')
    d.text((146, 740), 'Ask your doctor.', font=font('ariblk.ttf', 92), fill=CREAM, anchor='ls')
    # the can, drawn as its label: HAWKES over PUNCH on the cream band
    top, bot, rw = 260, 900, 200
    d.rounded_rectangle([cx - rw, top, cx + rw, bot], radius=36, fill=RED, outline=CREAM, width=8)
    d.rectangle([cx + rw - 64, top + 40, cx + rw - 36, bot - 40], fill='#e04048')
    d.rectangle([cx - rw + 8, top + 260, cx + rw - 8, top + 450], fill=CREAM)
    d.text((cx - 14, top + 185), 'HAWKES', font=font('ariblk.ttf', 64), fill=CREAM, anchor='mm')
    d.text((cx, top + 357), 'PUNCH', font=font('impact.ttf', 132), fill=RED, anchor='mm')
    d.text((cx, top + 520), 'ONE A DAY UNTIL IT STOPS', font=font('arialbd.ttf', 28), fill=CREAM, anchor='mm')
    d.ellipse([cx - rw, top - 30, cx + rw, top + 30], fill='#d8d8dc', outline='#9a9aa0', width=6)
    d.ellipse([cx - rw * .55, top - 16, cx + rw * .55, top + 16], fill='#bfbfc4')
    im.save(os.path.join(OUT, 'end_card.png')); print('card end_card')


safety('side_effects_1', 'Side effects may include: sudden flight, meeting yourself, throwing planets, briefly holding the Earth, '
       'forehead contact, music in total silence,', page='1 of 2')
safety('side_effects_2', 'and falling in love with a space ghost. Not for everyone. For everyone like you.',
       button='If you are allergic to punches, your doctor will punch you.', page='2 of 2')
end_card()
