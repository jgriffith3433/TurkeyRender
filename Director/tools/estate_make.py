#!/usr/bin/env python
"""The shared pastel prop kit: one palette material for everything in Assets/MusicVideo/Props/Estate.
   py Director/tools/estate_make.py
Writes estate_palette.png (base colour), estate_palette_ms.png (R metal, A smoothness), estate.mat, butler_tie.mat, their .meta files, and the import
settings of the two butler FBX (Turkey/turkey_butler_*.fbx.meta: the crowd's settings plus the new takes). Palette names live here and in
Director/tools/estate_palette.json, which blender_estate.py reads, so a colour is one edit here, then this script, and no mesh changes.
Run it once before Unity sees the files; the guids are derived from the names, so it is safe to run again."""
import hashlib, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'Estate')
TURKEY = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Turkey')
os.makedirs(OUT, exist_ok=True)
CELL, GRID = 32, 8

# name: colour, metal, smoothness
P = {
    'pink': ('#f7c9d2', 0, .45), 'pink_deep': ('#ee9fb2', 0, .45), 'rose': ('#f2738f', 0, .55), 'mint': ('#c2ecd8', 0, .45),
    'mint_deep': ('#8ed6b6', 0, .4), 'blue': ('#c6e4f7', 0, .45), 'blue_deep': ('#8fc6ea', 0, .55), 'cream': ('#fff3df', 0, .4),
    'white': ('#fffaf3', 0, .5), 'lilac': ('#dccdf2', 0, .45), 'gold': ('#e2b64f', 1, .78), 'gold_dark': ('#a97c2a', 1, .6),
    'silver': ('#eef0f3', .35, .72), 'marble_a': ('#fdf6ee', 0, .85), 'marble_b': ('#f6d2da', 0, .85), 'glass': ('#bfe7f4', 0, .95),
    'hedge_a': ('#7fcca5', 0, .2), 'hedge_b': ('#8bd3ae', 0, .2), 'hedge_c': ('#74c29b', 0, .2), 'water': ('#a9dcf2', 0, .9),
    'ply': ('#b49b76', 0, .25), 'ply_dark': ('#8c775a', 0, .2), 'ply_edge': ('#cdb994', 0, .25), 'timber': ('#a2875f', 0, .2),
    'sand': ('#77725f', 0, .15), 'grey': ('#8a8a8c', 0, .2), 'grey_dark': ('#3c3c40', 0, .25), 'black': ('#141416', 0, .5),
    'alu': ('#c7c9cc', 1, .55), 'web_green': ('#6f9a6a', 0, .3), 'web_white': ('#dfe0d4', 0, .3), 'blade': ('#74b83a', 0, .5),
    'candle': ('#fff6e4', 0, .35), 'flame': ('#ffd78a', 0, .1), 'cloth': ('#fff8ee', 0, .3), 'ribbon': ('#f2738f', 0, .7),
    'blade_glow': ('#c6ff7a', 0, .5), 'wine': ('#c9f2e0', 0, .9), 'glow': ('#fff0c8', 0, .3), 'crystal': ('#f2fbff', 1, .95), 'terracotta': ('#c57a50', 0, .25),
}
GLOW = {'glow': (1, .82, .55), 'flame': (1, .72, .36)}   # these cells shine: estate_palette_em.png
base = Image.new('RGBA', (CELL * GRID, CELL * GRID)); ms = Image.new('RGBA', base.size); em = Image.new('RGB', base.size, (0, 0, 0)); cells = {}
for i, (k, (c, m, s)) in enumerate(P.items()):
    x, y = i % GRID, i // GRID
    rgb = tuple(int(c[j:j + 2], 16) for j in (1, 3, 5))
    base.paste(rgb + (255,), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    ms.paste((int(m * 255), 0, 0, int(s * 255)), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    if k in GLOW: em.paste(tuple(int(v * 255) for v in GLOW[k]), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    cells[k] = [(x + .5) / GRID, 1 - (y + .5) / GRID]
base.save(os.path.join(OUT, 'estate_palette.png')); ms.save(os.path.join(OUT, 'estate_palette_ms.png')); em.save(os.path.join(OUT, 'estate_palette_em.png'))
json.dump(cells, open(os.path.join(ROOT, 'Director', 'tools', 'estate_palette.json'), 'w'), indent=0)


def guid(name):
    return hashlib.md5(('greener-estate/' + name).encode()).hexdigest()


def tex_meta(name, srgb):
    t = open(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'frame_albedo.png.meta'), encoding='utf8').read()
    t = re.sub(r'guid: \w+', 'guid: ' + guid(name), t, 1)
    t = t.replace('enableMipMap: 1', 'enableMipMap: 0').replace('sRGBTexture: 1', f'sRGBTexture: {srgb}').replace('filterMode: 1', 'filterMode: 0')
    t = t.replace('textureCompression: 1', 'textureCompression: 0')
    t = re.sub(r'alphaIsTransparency: \d', 'alphaIsTransparency: 0', t)
    open(os.path.join(OUT, name + '.meta'), 'w', encoding='utf8', newline='\n').write(t)


tex_meta('estate_palette.png', 1); tex_meta('estate_palette_ms.png', 0); tex_meta('estate_palette_em.png', 1)

MAT = open(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'tie.mat'), encoding='utf8').read()


def mat(fname, name, color=None, tex=False, smooth=.5):
    t = MAT.replace('m_Name: tie', 'm_Name: ' + name)
    if tex:
        t = t.replace('m_ValidKeywords: []', 'm_ValidKeywords:\n  - _METALLICSPECGLOSSMAP')
        t = t.replace('- _BaseMap:\n        m_Texture: {fileID: 0}', f"- _BaseMap:\n        m_Texture: {{fileID: 2800000, guid: {guid('estate_palette.png')}, type: 3}}")
        t = t.replace('- _MainTex:\n        m_Texture: {fileID: 0}', f"- _MainTex:\n        m_Texture: {{fileID: 2800000, guid: {guid('estate_palette.png')}, type: 3}}")
        t = t.replace('- _MetallicGlossMap:\n        m_Texture: {fileID: 0}', f"- _MetallicGlossMap:\n        m_Texture: {{fileID: 2800000, guid: {guid('estate_palette_ms.png')}, type: 3}}")
        t = re.sub(r'- _BaseColor: \{[^}]*\}', '- _BaseColor: {r: 1, g: 1, b: 1, a: 1}', t)
        t = t.replace('- _GlossMapScale: 0', '- _GlossMapScale: 1').replace('- _Smoothness: 0.5', '- _Smoothness: 1')
        t = t.replace('  - _METALLICSPECGLOSSMAP', '  - _EMISSION\n  - _METALLICSPECGLOSSMAP')
        t = t.replace('- _EmissionMap:\n        m_Texture: {fileID: 0}', f"- _EmissionMap:\n        m_Texture: {{fileID: 2800000, guid: {guid('estate_palette_em.png')}, type: 3}}")
        t = t.replace('- _EmissionColor: {r: 0, g: 0, b: 0, a: 1}', '- _EmissionColor: {r: 3.2, g: 3.2, b: 3.2, a: 1}')
        t = t.replace('m_LightmapFlags: 4', 'm_LightmapFlags: 2')
    else:
        r, g, b = color
        t = re.sub(r'- _BaseColor: \{[^}]*\}', f'- _BaseColor: {{r: {r}, g: {g}, b: {b}, a: 1}}', t)
        t = t.replace('- _Smoothness: 0.5', f'- _Smoothness: {smooth}')
    t = t.replace('\r\n', '\n')
    assert (not tex) or '_METALLICSPECGLOSSMAP' in t and guid('estate_palette_ms.png') in t, 'material template changed'
    open(os.path.join(OUT, fname), 'w', encoding='utf8', newline='\n').write(t)
    open(os.path.join(OUT, fname + '.meta'), 'w', encoding='utf8', newline='\n').write(
        f"fileFormatVersion: 2\nguid: {guid(fname)}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")


mat('estate.mat', 'estate', tex=True)


def texmat(name, smooth=.3, glow=0, tint=1.0):
    """A material on one painted texture (tex/<name>.png, estate_tex.py), mips on, filtered, with its own meta so it is known before Unity sees it."""
    m = open(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'frame_albedo.png.meta'), encoding='utf8').read()
    png = 'tex/' + name + '.png'
    m = re.sub(r'guid: \w+', 'guid: ' + guid(png), m, 1)
    m = re.sub(r'aniso: -?\d+', 'aniso: 8', m); m = re.sub(r'maxTextureSize: \d+', 'maxTextureSize: 2048', m)
    open(os.path.join(OUT, png + '.meta'), 'w', encoding='utf8', newline='\n').write(m)
    t = MAT.replace('m_Name: tie', 'm_Name: ' + name)
    ref = f"{{fileID: 2800000, guid: {guid(png)}, type: 3}}"
    t = t.replace('- _BaseMap:\n        m_Texture: {fileID: 0}', '- _BaseMap:\n        m_Texture: ' + ref).replace('- _MainTex:\n        m_Texture: {fileID: 0}', '- _MainTex:\n        m_Texture: ' + ref)
    t = re.sub(r'- _BaseColor: \{[^}]*\}', f'- _BaseColor: {{r: {tint}, g: {tint}, b: {tint}, a: 1}}', t)
    t = t.replace('- _Smoothness: 0.5', f'- _Smoothness: {smooth}')
    if glow:
        t = t.replace('m_ValidKeywords: []', 'm_ValidKeywords:\n  - _EMISSION')
        t = t.replace('- _EmissionMap:\n        m_Texture: {fileID: 0}', '- _EmissionMap:\n        m_Texture: ' + ref)
        t = t.replace('- _EmissionColor: {r: 0, g: 0, b: 0, a: 1}', f'- _EmissionColor: {{r: {glow}, g: {glow}, b: {glow}, a: 1}}')
        t = t.replace('m_LightmapFlags: 4', 'm_LightmapFlags: 2')
    t = t.replace('\r\n', '\n')
    open(os.path.join(OUT, name + '.mat'), 'w', encoding='utf8', newline='\n').write(t)
    open(os.path.join(OUT, name + '.mat.meta'), 'w', encoding='utf8', newline='\n').write(
        f"fileFormatVersion: 2\nguid: {guid(name + '.mat')}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")


for n, sm, gl, ti in (('hall_floor', .86, 0, 1), ('din_floor', .86, 0, 1), ('hall_walls', .35, 0, 1), ('din_walls', .35, 0, 1), ('ceiling', .15, .35, 1), ('sky_panel', .1, 1.05, .3), ('ground', .05, 0, 1), ('ply', .15, 0, 1)):
    texmat(n, sm, gl, ti)
mat('butler_tie.mat', 'butler_tie', color=(.012, .012, .016), smooth=.62)
print('palette', len(P), 'cells, materials written')

# Butlers import exactly as the crowd turkey does, with the four new takes after the old ones.
src = open(os.path.join(TURKEY, 'turkey_white_crowd.fbx.meta'), encoding='utf8').read().replace('\r\n', '\n')
m = re.search(r'    - serializedVersion: 16\n      name: 18TurkeyM_idle\n.*?(?=    - serializedVersion: 16)', src, re.S)
take = m.group(0)
last = src.rindex('    - serializedVersion: 16')
end = src.index('additiveReferencePoseFrame: 0\n', last) + len('additiveReferencePoseFrame: 0\n')
extra = ''
for i, (n, frames) in enumerate((('butler_idle', 59), ('butler_bow', 29), ('butler_hop', 29), ('butler_tray', 59))):
    t = take.replace('name: 18TurkeyM_idle', 'name: ' + n).replace('takeName: Armature|18TurkeyM_idle', 'takeName: Armature|' + n)
    t = re.sub(r'internalID: -?\d+', f'internalID: {4100000000000000 + i}', t)
    t = re.sub(r'firstFrame: [\d.]+', 'firstFrame: 0', t); t = re.sub(r'lastFrame: [\d.]+', f'lastFrame: {frames}', t)
    extra += t
out = src[:end] + extra + src[end:]
for lod in ('crowd', 'hero'):
    open(os.path.join(TURKEY, f'turkey_butler_{lod}.fbx.meta'), 'w', encoding='utf8', newline='\n').write(re.sub(r'guid: \w+', 'guid: ' + guid('butler_' + lod), out, 1))
print('butler metas written')
