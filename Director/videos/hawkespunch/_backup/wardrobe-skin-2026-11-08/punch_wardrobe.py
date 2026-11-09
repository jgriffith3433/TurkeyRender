#!/usr/bin/env python
"""Hawkes Punch's wardrobe: the same models, recoloured in copies of their textures (the method of greener_wardrobe.py). Nothing else on them changes.
   uv run --no-project --with numpy --with pillow python Director/tools/punch_wardrobe.py
Writes Assets/Videos/hawkespunch/Props/:
  Person2_doctor.png/.mat   the doctor: Person2 with her top a dusty scrub blue (her white lab coat is a garment over it: blender_coat.py), the jeans a dark slack grey.
  Person_sick.png/.mat      him, after Greener: the purple tee, the skin tinged green and a shade paler.
  Person_red.png/.mat       the other one: the same man in a red tee (the hair goes the other way on the rig, not here).
Cast them as {"model":"person2","material":"Assets/Videos/hawkespunch/Props/Person2_doctor.mat","material2":"Assets/MusicVideo/Person2/Head.mat"} and the same for him
with Person's Head.mat. The glasses, the stethoscope, the clipboard and the pad are props in library/sets/clinic.json (attach the glasses to doctor.head)."""
import hashlib, os, re, struct, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'Videos', 'hawkespunch', 'Props')
os.makedirs(OUT, exist_ok=True)
guid = lambda n: hashlib.md5(('hawkes-punch-wardrobe/' + n).encode()).hexdigest()


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


def masks(src, fbx, W, H):
    """Shirt (the grey in the atlas), jeans (the dark), skin (warm), shoes (by height on the mesh)."""
    im = np.asarray(Image.open(os.path.join(src, 'Person_Base.png')).convert('RGBA')).astype(np.float32)
    rgb = im[..., :3]; v = rgb.max(-1); s = (v - rgb.min(-1)) / np.maximum(v, 1)
    shirt = np.clip((.16 - s) / .06, 0, 1) * np.clip((v - 62) / 25, 0, 1)
    jeans = np.clip((.2 - s) / .08, 0, 1) * np.clip((62 - v) / 20, 0, 1) * (v > 8)
    warm = (rgb[..., 0] > rgb[..., 1] + 12) & (rgb[..., 1] > rgb[..., 2]) & (v > 90) & (s > .18)
    skin = np.clip(warm.astype(np.float32), 0, 1)
    try:
        vv, starts, ends, vi, uv = fbx_mesh(os.path.join(src, fbx))
        shoe = Image.new('L', (W, H))
        for s_, e_ in zip(starts, ends):
            z = vv[vi[s_:e_ + 1], 2].mean(); x = abs(vv[vi[s_:e_ + 1], 0]).mean()
            if z < .2 and x < .3: ImageDraw.Draw(shoe).polygon([(a * W, (1 - b) * H) for a, b in uv[s_:e_ + 1]], fill=255)
        shoe = np.asarray(shoe.filter(ImageFilter.MaxFilter(7))) > 0
    except Exception as e:
        print('no shoe mask', fbx, e); shoe = np.zeros((H, W), bool)
    return im, rgb, v, shirt, jeans, skin, shoe


def write(src, name, new, im, bump=1.0):
    Image.fromarray(np.dstack([np.clip(new, 0, 255), im[..., 3]]).astype('uint8'), 'RGBA').save(os.path.join(OUT, name + '.png'))
    meta = open(os.path.join(src, 'Person_Base.png.meta'), encoding='utf8').read()
    old = re.search(r'guid: (\w+)', meta).group(1)
    open(os.path.join(OUT, name + '.png.meta'), 'w', encoding='utf8', newline='\n').write(meta.replace(old, guid(name + '.png'), 1))
    mat = open(os.path.join(src, 'Person.mat'), encoding='utf8').read().replace(old, guid(name + '.png')).replace('m_Name: Person', 'm_Name: ' + name)
    if bump != 1: mat = mat.replace('_BumpScale: 1\n', f'_BumpScale: {bump}\n')
    open(os.path.join(OUT, name + '.mat'), 'w', encoding='utf8', newline='\n').write(mat)
    open(os.path.join(OUT, name + '.mat.meta'), 'w', encoding='utf8', newline='\n').write(f"fileFormatVersion: 2\nguid: {guid(name + '.mat')}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
    print('wrote', name)


def recolour(rgb, v, mask, colour, gamma=1.3):
    c = np.array(colour, dtype=float)
    fabric = (v / max(1, np.median(v[mask > .9]))) ** gamma
    return rgb * (1 - mask[..., None]) + np.clip(c[None, None] * fabric[..., None], 0, 255) * mask[..., None]


# the doctor: Person2, a blue top under her white lab coat (a real garment now: Coat.fbx), dark slacks
SRC2 = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Person2')
im, rgb, v, shirt, jeans, skin, shoe = masks(SRC2, 'Person2.fbx', 2048, 2048)
shirt[shoe] = 0; jeans[shoe] = 0
new = recolour(rgb, v, shirt, (128, 158, 190), 1.1)      # her top under the lab coat (blender_coat.py, worn with "wear"): a dusty scrub blue, so the coat's white lapels read against it
new = recolour(new, v, jeans, (58, 60, 66), 1.0)          # slacks
print('doctor: coat', round(float((shirt > .5).mean()) * 100, 1), '% of the atlas, slacks', round(float((jeans > .5).mean()) * 100, 1), '%')
write(SRC2, 'Person2_doctor', new, im, bump=.6)

# him: pale and green-tinged, the purple tee as Greener left it
SRC1 = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Person')
im, rgb, v, shirt, jeans, skin, shoe = masks(SRC1, 'Person.fbx', 2048, 2048)
shirt[shoe] = 0
tee = (60, 42, 78)
new = recolour(rgb, v, shirt, tee, 1.3)
sick = new * (1 - skin[..., None]) + (new * np.array([.86, 1.0, .84])[None, None] * .96 + 14) * skin[..., None]
print('him: tee', round(float((shirt > .5).mean()) * 100, 1), '%, skin', round(float(skin.mean()) * 100, 1), '%')
write(SRC1, 'Person_sick', sick, im, bump=1.7)

# the other one: a red tee, healthy skin
other = recolour(rgb, v, shirt, (200, 28, 36), 1.3)
write(SRC1, 'Person_red', other, im, bump=1.7)
