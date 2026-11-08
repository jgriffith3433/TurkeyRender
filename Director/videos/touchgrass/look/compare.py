# Before and after of the Look pass: look/before/*.png next to look/after/*.png, labelled, plus one contact sheet. py compare.py
import os
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__))
SHOTS = [('0005.400', 'in_doorway'), ('0007.600', 'sun_blink'), ('0017.000', 'sparrow'), ('0026.000', 'cross_wide'), ('0056.000', 'smile'), ('0072.000', 'watching'),
         ('0003.600', 'door_opens'), ('0012.000', 'the_yard'), ('0030.500', 'sprinkler_on'), ('0049.000', 'hand')]
os.makedirs(os.path.join(H, 'compare'), exist_ok=True)
try: font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 26)
except OSError: font = ImageFont.load_default()
rows = []
for t, name in SHOTS:
    a, b = [os.path.join(H, d, 'f_%s.png' % t) for d in ('before', 'after')]
    if not (os.path.exists(a) and os.path.exists(b)): print('missing', name); continue
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB').resize((1280, 720))
    im = Image.new('RGB', (2570, 720), (16, 16, 16)); im.paste(A, (0, 0)); im.paste(B, (1290, 0))
    d = ImageDraw.Draw(im)
    for x, lab in ((14, 'BEFORE  ' + name), (1304, 'AFTER  ' + name)):
        d.rectangle([x - 6, 10, x + 10 + d.textlength(lab, font=font), 48], fill=(0, 0, 0)); d.text((x, 12), lab, font=font, fill=(255, 255, 255))
    im.save(os.path.join(H, 'compare', '%s.png' % name)); rows.append(im.resize((1285, 360)))
if rows:
    sheet = Image.new('RGB', (1285, 366 * len(rows)), (16, 16, 16))
    for i, r in enumerate(rows): sheet.paste(r, (0, i * 366))
    sheet.save(os.path.join(H, 'compare', 'sheet.jpg'), quality=90)
print(len(rows), 'pairs')
