#!/usr/bin/env python
"""Installs her lab coat (blender_coat.py's gen/rigged/Coat.fbx) into Unity with its own materials and maps, and the .metas written here
(fixed GUIDs, so a rerun changes nothing it doesn't have to):
   uv run --no-project --with numpy --with pillow python Director/tools/coat_assets.py
Writes Assets/MusicVideo/Person2/Coat/: Coat.fbx (+ meta: Person2's import settings, no rig of its own), Coat_Cloth_N.png (a fine twill
weave, tiling, as a normal map), Coat_Badge.png (the name badge the right way up: Hawkes Punch's name_badge.png is drawn turned 180
degrees, which a prim cube's face needed), and five MV/Lit materials, one per material of the coat:
   Coat_Cloth Coat_Badge Coat_Dark Coat_Metal Coat_Pen
Wear it with  "wear":[{"model":"Assets/MusicVideo/Person2/Coat/Coat.fbx","materials":{"Coat_Cloth":"<path>.mat",...}}] (the FBX's own material names)."""
import hashlib, os, re, shutil
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P2 = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Person2')
OUT = os.path.join(P2, 'Coat'); os.makedirs(OUT, exist_ok=True)
RIG = os.path.join(ROOT, 'Director', 'gen', 'rigged')
guid = lambda n: hashlib.md5(('person2-coat/' + n).encode()).hexdigest()
w = lambda p, s: open(p, 'w', encoding='utf8', newline='\n').write(s)

# ---- the model
shutil.copyfile(os.path.join(RIG, 'Coat.fbx'), os.path.join(OUT, 'Coat.fbx'))
meta = open(os.path.join(P2, 'Person2.fbx.meta'), encoding='utf8').read()
old = re.search(r'guid: (\w+)', meta).group(1)
meta = meta.replace(old, guid('Coat.fbx'), 1)
meta = re.sub(r'materialImportMode: \d+', 'materialImportMode: 1', meta)   # its own materials come in by name, so wear can map them
meta = re.sub(r'animationType: \d+', 'animationType: 2', meta); meta = re.sub(r'avatarSetup: \d+', 'avatarSetup: 0', meta)   # Generic, no avatar: None would import the coat unskinned
w(os.path.join(OUT, 'Coat.fbx.meta'), meta)

# ---- maps
R = 512
yy, xx = np.mgrid[0:R, 0:R] / R
# a 2/1 twill: diagonal ribs, 64 across the tile (a tile is 25 cm of cloth), plus a little slub
rib = np.sin((xx * 64 + yy * 64 * .5) * 2 * np.pi)
rng = np.random.default_rng(3); slub = rng.normal(0, 1, (R // 8, R // 8)); slub = np.kron(slub, np.ones((8, 8)))
slub = (slub + np.roll(slub, 4, 0) + np.roll(slub, 4, 1)) / 3
h = rib * .6 + slub * .25
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5
n = np.dstack([-gx * .35, gy * .35, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Image.fromarray(((n * .5 + .5) * 255).astype('uint8'), 'RGB').save(os.path.join(OUT, 'Coat_Cloth_N.png'))
badge = Image.open(os.path.join(ROOT, 'Assets', 'Videos', 'hawkespunch', 'Props', 'name_badge.png')).rotate(180)
badge.save(os.path.join(OUT, 'Coat_Badge.png')); badge.save(os.path.join(RIG, 'Coat_Badge.png'))
for name, src in (('Coat_Cloth_N.png', 'Person_Normal.png.meta'), ('Coat_Badge.png', 'Person_Base.png.meta')):
    m = open(os.path.join(P2, src), encoding='utf8').read()
    m = m.replace(re.search(r'guid: (\w+)', m).group(1), guid(name), 1)
    if name == 'Coat_Badge.png': m = re.sub(r'wrapU: -?\d+', 'wrapU: 1', re.sub(r'wrapV: -?\d+', 'wrapV: 1', m))
    w(os.path.join(OUT, name + '.meta'), m)

# ---- materials (MV/Lit, two-sided like the bodies)
tmpl = open(os.path.join(ROOT, 'Assets', 'Videos', 'hawkespunch', 'Props', 'Person2_doctor.mat'), encoding='utf8').read()


def tex(m, slot, g):
    return re.sub(r'(- ' + slot + r':\n        m_Texture: )\{[^}]*\}', r'\1' + ('{fileID: 2800000, guid: %s, type: 3}' % g if g else '{fileID: 0}'), m)


def mat(name, color, smooth, metal=0., base=None, bump=None, bump_scale=1., tile=1.):
    m = tmpl.replace('m_Name: Person2_doctor', 'm_Name: ' + name)
    m = tex(m, '_BaseMap', base); m = tex(m, '_BumpMap', bump); m = tex(m, '_MetallicGlossMap', None); m = tex(m, '_OcclusionMap', None)
    kw = ['_NORMALMAP'] if bump else []
    m = re.sub(r'  m_ValidKeywords:\n(  - \w+\n)*', '  m_ValidKeywords:' + ('\n' + ''.join(f'  - {k}\n' for k in kw) if kw else ' []\n'), m)
    m = re.sub(r'(- _BaseMap:\n        m_Texture: [^\n]*\n        m_Scale: )\{[^}]*\}', r'\1{x: %g, y: %g}' % (tile, tile), m)
    m = re.sub(r'(- _BumpMap:\n        m_Texture: [^\n]*\n        m_Scale: )\{[^}]*\}', r'\1{x: %g, y: %g}' % (tile, tile), m)
    for k, v in (('_Smoothness', smooth), ('_Metallic', metal), ('_BumpScale', bump_scale), ('_GlossMapScale', 0)):
        m = re.sub(r'- %s: [-\d.e]+' % k, '- %s: %g' % (k, v), m)
    c = '{r: %g, g: %g, b: %g, a: 1}' % color
    m = re.sub(r'- _BaseColor: \{[^}]*\}', '- _BaseColor: ' + c, m); m = re.sub(r'- _Color: \{[^}]*\}', '- _Color: ' + c, m)
    w(os.path.join(OUT, name + '.mat'), m)
    w(os.path.join(OUT, name + '.mat.meta'), f"fileFormatVersion: 2\nguid: {guid(name + '.mat')}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
    return f'Assets/MusicVideo/Person2/Coat/{name}.mat'


paths = [
    mat('Coat_Cloth', (.86, .875, .89), .18, bump=guid('Coat_Cloth_N.png'), bump_scale=.5, tile=1),
    mat('Coat_Badge', (1, 1, 1), .55, base=guid('Coat_Badge.png')),
    mat('Coat_Dark', (.025, .025, .03), .55),
    mat('Coat_Metal', (.80, .81, .83), .82, metal=1),
    mat('Coat_Pen', (.05, .10, .40), .7),
]
import json
print('wear:', json.dumps({'model': 'Assets/MusicVideo/Person2/Coat/Coat.fbx', 'materials': {os.path.basename(p_)[:-4]: p_ for p_ in paths}}))
