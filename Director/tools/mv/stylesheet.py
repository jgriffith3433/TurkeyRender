#!/usr/bin/env python3
"""Lays out style sheets. one <out> <style> <style.json> <frames...> | compare <out> <sheets dir> <styles...>"""
import glob, os, re, sys
from PIL import Image, ImageDraw, ImageFont


def font(size):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", size)
    except OSError:
        return ImageFont.load_default()


def about(path):
    m = re.search(r'"about"\s*:\s*"([^"]*)"', open(path, encoding="utf8").read())
    return m.group(1) if m else ""


def one(out, name, js, frames):
    ims = [Image.open(f).convert("RGB") for f in frames]
    w, h = ims[0].size
    cols = 2 if len(ims) <= 4 else 3
    rows = (len(ims) + cols - 1) // cols
    pad, head = 12, 96
    sheet = Image.new("RGB", (cols * w + (cols + 1) * pad, rows * h + (rows + 1) * pad + head), (18, 18, 20))
    d = ImageDraw.Draw(sheet)
    d.text((pad + 8, 14), name, font=font(40), fill=(240, 238, 232))
    d.text((pad + 8, 62), about(js), font=font(20), fill=(170, 168, 160))
    for i, im in enumerate(ims):
        sheet.paste(im, (pad + (i % cols) * (w + pad), head + pad + (i // cols) * (h + pad)))
    sheet.save(out)


def compare(out, folder, styles):
    pick = sorted(glob.glob(os.path.join(folder, "_" + styles[0] + "_*.png")))
    ids = [os.path.basename(p)[len(styles[0]) + 2:-4] for p in pick]
    w, h = 400, 225
    pad, left, top = 6, 170, 30
    sheet = Image.new("RGB", (left + len(ids) * (w + pad) + pad, top + len(styles) * (h + pad) + pad), (18, 18, 20))
    d = ImageDraw.Draw(sheet)
    for c, i in enumerate(ids):
        d.text((left + pad + c * (w + pad), 6), i, font=font(18), fill=(190, 188, 180))
    for r, s in enumerate(styles):
        d.text((8, top + r * (h + pad) + 90), s, font=font(17), fill=(240, 238, 232))
        for c, i in enumerate(ids):
            f = os.path.join(folder, f"_{s}_{i}.png")
            if os.path.exists(f):
                sheet.paste(Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS), (left + pad + c * (w + pad), top + pad + r * (h + pad)))
    sheet.save(out)


if __name__ == "__main__":
    if sys.argv[1] == "one":
        one(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:])
    else:
        compare(sys.argv[2], sys.argv[3], sys.argv[4:])
