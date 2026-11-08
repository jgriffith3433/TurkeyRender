#!/usr/bin/env python
"""Greener's wardrobe: the same model, the tee recoloured in a copy of his texture. Nothing else on him changes.
   uv run --no-project --with numpy --with pillow python Director/tools/greener_wardrobe.py [--tee "#2b1a36"]
Writes Assets/Videos/greener/Props/Person_pop.png and Person_pop.mat. The shirt is the grey in the atlas: low saturation, mid value. Black jeans and skin don't match that.
The shoes are the model's own (blender_rig.py make_foot: dark canvas on a pale sole); their faces, found by height in Person.fbx (read directly,
no Blender), are kept out of the tee's recolour, since the pale sole is as grey as the tee."""
import hashlib, os, re, struct, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Person')
OUT = os.path.join(ROOT, 'Assets', 'Videos', 'greener', 'Props')
os.makedirs(OUT, exist_ok=True)
tee = sys.argv[sys.argv.index('--tee') + 1] if '--tee' in sys.argv else '#3c2a4e'
c = np.array([int(tee[i:i + 2], 16) for i in (1, 3, 5)], dtype=float)

im = np.asarray(Image.open(os.path.join(SRC, 'Person_Base.png')).convert('RGBA')).astype(np.float32)
rgb = im[..., :3]; v = rgb.max(-1); s = (v - rgb.min(-1)) / np.maximum(v, 1)
mask = np.clip((.16 - s) / .06, 0, 1) * np.clip((v - 62) / 25, 0, 1)
fabric = (v / np.median(v[mask > .9])) ** 1.3
new = rgb * (1 - mask[..., None]) + np.clip(c[None, None] * fabric[..., None], 0, 255) * mask[..., None]


def fbx_mesh(path):
    """Vertices (metres, z up), polygon starts and ends, polygon vertex indices and UVs of the only mesh in a binary FBX 7.4."""
    d = open(path, 'rb').read()
    def props(p, n):
        out = []
        for _ in range(n):
            t = chr(d[p]); p += 1
            if t in 'fdlib':
                ty = {'f': 'f4', 'd': 'f8', 'l': 'i8', 'i': 'i4', 'b': 'i1'}[t]; _, enc, cl = struct.unpack('<III', d[p:p + 12]); p += 12; raw = d[p:p + cl]; p += cl
                out.append(np.frombuffer(zlib.decompress(raw) if enc else raw, dtype='<' + ty))
            elif t in 'SR':
                l = struct.unpack('<I', d[p:p + 4])[0]; p += 4; out.append(d[p:p + l]); p += l
            else:
                z = {'Y': 2, 'C': 1, 'I': 4, 'F': 4, 'D': 8, 'L': 8}[t]; out.append(None); p += z
        return out, p
    def node(p):
        e, n, _ = struct.unpack('<III', d[p:p + 12]); nl = d[p + 12]; name = d[p + 13:p + 13 + nl].decode(); q = p + 13 + nl
        ps, q = props(q, n); kids = {}
        while q < e and d[q:q + 13] != bytes(1) * 13:
            c, q = node(q); kids.setdefault(c[0], c)
        return (name, ps, kids), e
    p = 27; top = {}
    while p < len(d) - 200:
        n, e = node(p)
        if e == 0: break
        top[n[0]] = n; p = e
    g = top['Objects'][2]['Geometry'][2]; u = g['LayerElementUV'][2]
    v = g['Vertices'][1][0].reshape(-1, 3); idx = g['PolygonVertexIndex'][1][0]; uv = u['UV'][1][0].reshape(-1, 2)[u['UVIndex'][1][0]]
    ends = np.where(idx < 0)[0]
    return v, np.r_[0, ends[:-1] + 1], ends, np.where(idx < 0, ~idx, idx), uv

H, W = im.shape[:2]
v, starts, ends, vi, uv = fbx_mesh(os.path.join(SRC, 'Person.fbx'))
HEM, SOLE = .2, .017   # metres: where the jeans end, top of the sole
shoe, sole, other = [Image.new('L', (W, H)) for _ in range(3)]
for s_, e_ in zip(starts, ends):
    z = v[vi[s_:e_ + 1], 2].mean(); x = abs(v[vi[s_:e_ + 1], 0]).mean()
    pts = [(a * W, (1 - b) * H) for a, b in uv[s_:e_ + 1]]
    foot = z < HEM and x < .3
    if foot or z < HEM + .04: ImageDraw.Draw(shoe if foot else other).polygon(pts, fill=255)
    if foot and z < SOLE: ImageDraw.Draw(sole).polygon(pts, fill=255)
shoe = np.asarray(shoe.filter(ImageFilter.MaxFilter(7))) > 0   # past the island's edge
new[shoe] = rgb[shoe]
print('shoes kept on', round(float(shoe.mean()) * 100, 2), '% of the atlas')

Image.fromarray(np.dstack([new, im[..., 3]]).astype('uint8'), 'RGBA').save(os.path.join(OUT, 'Person_pop.png'))
print('tee covers', round(float((mask > .5).mean()) * 100, 1), '% of the atlas')

guid = lambda n: hashlib.md5(('greener-wardrobe/' + n).encode()).hexdigest()
meta = open(os.path.join(SRC, 'Person_Base.png.meta'), encoding='utf8').read()
old = re.search(r'guid: (\w+)', meta).group(1)
open(os.path.join(OUT, 'Person_pop.png.meta'), 'w', encoding='utf8', newline='\n').write(meta.replace(old, guid('png'), 1))
mat = open(os.path.join(SRC, 'Person.mat'), encoding='utf8').read().replace(old, guid('png')).replace('m_Name: Person', 'm_Name: Person_pop').replace('_BumpScale: 1\n', '_BumpScale: 1.7\n')  # a stronger knit
open(os.path.join(OUT, 'Person_pop.mat'), 'w', encoding='utf8', newline='\n').write(mat)
open(os.path.join(OUT, 'Person_pop.mat.meta'), 'w', encoding='utf8', newline='\n').write(f"fileFormatVersion: 2\nguid: {guid('mat')}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
