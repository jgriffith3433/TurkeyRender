#!/usr/bin/env python
"""Hawkes Punch's prop kit: one palette material for every mesh in Assets/MusicVideo/Props/Punch, plus a material per painted texture.
   py Director/tools/punch_make.py
Writes punch_palette.png (base colour), punch_palette_ms.png (R metal, A smoothness), punch_palette_em.png (glow), punch.mat, one <name>.mat per
texture in tex/ (punch_tex.py paints them), and their .meta files. Palette names live here and in Director/tools/punch_palette.json, which
blender_punch.py reads, so a colour is one edit here, then this script, and no mesh changes. Guids are derived from the names: safe to run again.
Same method as estate_make.py (Greener's kit)."""
import hashlib, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'Punch')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)
CELL, GRID = 32, 8

# name: colour, metal, smoothness
P = {
    # clinic: pale green and white, steel, paper. The only red is the can and the poster.
    'white': ('#f8f8f4', 0, .45), 'off_white': ('#ecebe4', 0, .35), 'pale_green': ('#d9ece0', 0, .3), 'mint_wall': ('#c9e4d4', 0, .3),
    'green_trim': ('#8fc4a8', 0, .35), 'steel': ('#b9bcc0', 1, .62), 'chrome': ('#dfe2e6', 1, .85), 'paper': ('#f6f3ea', 0, .12),
    'vinyl': ('#d6dad4', 0, .5), 'laminate': ('#d8c7a4', 0, .4), 'laminate_edge': ('#a98f66', 0, .3), 'pad_blue': ('#9cb6c6', 0, .35),
    'black': ('#141416', 0, .5), 'dark_grey': ('#3c3d40', 0, .3), 'grey': ('#8a8b8d', 0, .3), 'glass': ('#cfe6f2', 0, .95),
    'glow_white': ('#ffffff', 0, .2), 'red': ('#c8161e', 0, .55), 'red_dark': ('#8c0e14', 0, .5), 'rubber': ('#2a2a2c', 0, .25),
    'lens': ('#dfeaf2', 0, .98), 'frame_dark': ('#2a2420', 0, .6), 'sign_green': ('#4f9a74', 0, .3), 'scrub': ('#7fb8a4', 0, .3),
    # space
    'rock': ('#6c675f', 0, .12), 'rock_dark': ('#4a463f', 0, .1), 'rock_light': ('#8d877c', 0, .12), 'ice': ('#e3f0ff', 0, .6),
    'comet_glow': ('#bfe4ff', 0, .3), 'comet_core': ('#f4fbff', 0, .4), 'sat_foil': ('#d9b24c', 1, .7), 'sat_panel': ('#1d2d5c', .2, .75),
    'sat_white': ('#e6e7ea', .1, .5), 'rope': ('#c99a5a', 0, .18), 'rope_dark': ('#9a7140', 0, .15), 'sun_glow': ('#fff2c4', 0, .2),
    # commercial: pastel, chrome, glossy
    'pastel_pink': ('#ffc6d6', 0, .5), 'pastel_blue': ('#c2def7', 0, .5), 'pastel_yellow': ('#fff0b8', 0, .5), 'pastel_mint': ('#c8f0dc', 0, .5),
    'lilac': ('#dfd0f4', 0, .5), 'cream': ('#fff6e8', 0, .5), 'seat_pink': ('#ff7fa3', 0, .6), 'studio_black': ('#1c1c20', .2, .4),
    'lamp_glow': ('#fff0d0', 0, .2), 'barn_door': ('#2a2a2e', .4, .4), 'logo_red': ('#e0182a', 0, .6),
}
GLOW = {'glow_white': (1, 1, 1), 'comet_glow': (.55, .75, 1), 'comet_core': (1, 1, 1), 'sun_glow': (1, .9, .7), 'lamp_glow': (1, .92, .8)}
base = Image.new('RGBA', (CELL * GRID, CELL * GRID)); ms = Image.new('RGBA', base.size); em = Image.new('RGB', base.size, (0, 0, 0)); cells = {}
assert len(P) <= GRID * GRID
for i, (k, (c, m, s)) in enumerate(P.items()):
    x, y = i % GRID, i // GRID
    rgb = tuple(int(c[j:j + 2], 16) for j in (1, 3, 5))
    base.paste(rgb + (255,), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    ms.paste((int(m * 255), 0, 0, int(s * 255)), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    if k in GLOW: em.paste(tuple(int(v * 255) for v in GLOW[k]), (x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    cells[k] = [(x + .5) / GRID, 1 - (y + .5) / GRID]
base.save(os.path.join(OUT, 'punch_palette.png')); ms.save(os.path.join(OUT, 'punch_palette_ms.png')); em.save(os.path.join(OUT, 'punch_palette_em.png'))
json.dump(cells, open(os.path.join(ROOT, 'Director', 'tools', 'punch_palette.json'), 'w'), indent=0)


def guid(name):
    return hashlib.md5(('hawkes-punch/' + name).encode()).hexdigest()


TEXMETA = open(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'frame_albedo.png.meta'), encoding='utf8').read()


def tex_meta(name, srgb):
    t = re.sub(r'guid: \w+', 'guid: ' + guid(name), TEXMETA, 1)
    t = t.replace('enableMipMap: 1', 'enableMipMap: 0').replace('sRGBTexture: 1', f'sRGBTexture: {srgb}').replace('filterMode: 1', 'filterMode: 0')
    t = t.replace('textureCompression: 1', 'textureCompression: 0')
    t = re.sub(r'alphaIsTransparency: \d', 'alphaIsTransparency: 0', t)
    open(os.path.join(OUT, name + '.meta'), 'w', encoding='utf8', newline='\n').write(t)


tex_meta('punch_palette.png', 1); tex_meta('punch_palette_ms.png', 0); tex_meta('punch_palette_em.png', 1)

MAT = open(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'tie.mat'), encoding='utf8').read()


def write_mat(fname, t):
    t = t.replace('\r\n', '\n')
    open(os.path.join(OUT, fname), 'w', encoding='utf8', newline='\n').write(t)
    open(os.path.join(OUT, fname + '.meta'), 'w', encoding='utf8', newline='\n').write(
        f"fileFormatVersion: 2\nguid: {guid(fname)}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")


def palette_mat():
    t = MAT.replace('m_Name: tie', 'm_Name: punch')
    t = t.replace('m_ValidKeywords: []', 'm_ValidKeywords:\n  - _EMISSION\n  - _METALLICSPECGLOSSMAP')
    ref = lambda n: f"{{fileID: 2800000, guid: {guid(n)}, type: 3}}"
    t = t.replace('- _BaseMap:\n        m_Texture: {fileID: 0}', '- _BaseMap:\n        m_Texture: ' + ref('punch_palette.png'))
    t = t.replace('- _MainTex:\n        m_Texture: {fileID: 0}', '- _MainTex:\n        m_Texture: ' + ref('punch_palette.png'))
    t = t.replace('- _MetallicGlossMap:\n        m_Texture: {fileID: 0}', '- _MetallicGlossMap:\n        m_Texture: ' + ref('punch_palette_ms.png'))
    t = t.replace('- _EmissionMap:\n        m_Texture: {fileID: 0}', '- _EmissionMap:\n        m_Texture: ' + ref('punch_palette_em.png'))
    t = re.sub(r'- _BaseColor: \{[^}]*\}', '- _BaseColor: {r: 1, g: 1, b: 1, a: 1}', t)
    t = t.replace('- _GlossMapScale: 0', '- _GlossMapScale: 1').replace('- _Smoothness: 0.5', '- _Smoothness: 1')
    t = t.replace('- _EmissionColor: {r: 0, g: 0, b: 0, a: 1}', '- _EmissionColor: {r: 3.2, g: 3.2, b: 3.2, a: 1}')
    t = t.replace('m_LightmapFlags: 4', 'm_LightmapFlags: 2')
    assert '_METALLICSPECGLOSSMAP' in t and guid('punch_palette_ms.png') in t, 'material template changed'
    write_mat('punch.mat', t)


palette_mat()


ATLAS = {'can_label', 'paper_roll', 'exam_sign', 'poster', 'eye_chart', 'rx_pad', 'clipboard_sheet', 'reception_sign', 'backdrop', 'tv_sign'}   # textures worn by pieces that also have palette faces


def atlas(name):
    """tex/<name>_atlas.png: the picture in the top 7/8, the palette grid in the bottom 1/8 (blender_punch.py save() remaps the UVs to match). Made only when the picture is newer."""
    src = os.path.join(OUT, 'tex', name + '.png'); dst = os.path.join(OUT, 'tex', name + '_atlas.png')
    if not os.path.exists(src): return False
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(src) and os.path.getmtime(dst) > os.path.getmtime(os.path.join(OUT, 'punch_palette.png')): return True
    im = Image.open(src).convert('RGB'); W, H = im.size; H8 = max(64, H // 7)   # keep the picture at full size: the strip is added below
    out = Image.new('RGB', (W, H + H8)); out.paste(im, (0, 0))
    pal = Image.open(os.path.join(OUT, 'punch_palette.png')).convert('RGB').resize((W, H8), Image.NEAREST); out.paste(pal, (0, H))
    out.save(dst); print('atlas', name, out.size)
    return True


def texmat(name, smooth=.3, glow=0, tint=1.0, mips=True, color=None):
    """A material on one painted texture (tex/<name>.png), with its own meta so it is known before Unity sees it. glow: emission strength (the texture is the emission map).
    A texture in ATLAS gets tex/<name>_atlas.png (picture over palette) and the material wears that."""
    if name in ATLAS and atlas(name): png = 'tex/' + name + '_atlas.png'
    else: png = 'tex/' + name + '.png'
    mp = os.path.join(OUT, png + '.meta')
    # Unity throws away a meta whose png isn't there yet and makes its own guid, so a meta already on disk is the truth: keep its guid and point the material at it.
    g = re.search(r'guid: (\w+)', open(mp, encoding='utf8').read()).group(1) if os.path.exists(mp) else guid(png)
    if not os.path.exists(mp):
        m = re.sub(r'guid: \w+', 'guid: ' + g, TEXMETA, count=1)
        m = re.sub(r'aniso: -?\d+', 'aniso: 8', m); m = re.sub(r'maxTextureSize: \d+', 'maxTextureSize: 4096', m)
        if not mips: m = m.replace('enableMipMap: 1', 'enableMipMap: 0')
        open(mp, 'w', encoding='utf8', newline='\n').write(m)
    t = MAT.replace('m_Name: tie', 'm_Name: ' + name)
    ref = f"{{fileID: 2800000, guid: {g}, type: 3}}"
    t = t.replace('- _BaseMap:\n        m_Texture: {fileID: 0}', '- _BaseMap:\n        m_Texture: ' + ref).replace('- _MainTex:\n        m_Texture: {fileID: 0}', '- _MainTex:\n        m_Texture: ' + ref)
    r, g, b = color if color else (tint, tint, tint)
    t = re.sub(r'- _BaseColor: \{[^}]*\}', f'- _BaseColor: {{r: {r}, g: {g}, b: {b}, a: 1}}', t)
    t = t.replace('- _Smoothness: 0.5', f'- _Smoothness: {smooth}')
    if glow:
        t = t.replace('m_ValidKeywords: []', 'm_ValidKeywords:\n  - _EMISSION')
        t = t.replace('- _EmissionMap:\n        m_Texture: {fileID: 0}', '- _EmissionMap:\n        m_Texture: ' + ref)
        t = t.replace('- _EmissionColor: {r: 0, g: 0, b: 0, a: 1}', f'- _EmissionColor: {{r: {glow}, g: {glow}, b: {glow}, a: 1}}')
        t = t.replace('m_LightmapFlags: 4', 'm_LightmapFlags: 2')
    write_mat(name + '.mat', t)


# name, smoothness, glow, tint
for n, sm, gl, ti in (
        ('can_label', .62, 0, 1), ('poster', .25, 0, 1), ('rx_pad', .1, 0, 1), ('clipboard_sheet', .1, 0, 1), ('paper_roll', .08, 0, 1),
        ('reception_sign', .3, 0, 1), ('exam_sign', .3, 0, 1), ('clinic_floor', .55, 0, 1), ('ceiling_tile', .1, 0, 1),
        ('stars', .0, 1.0, 1), ('moon', .06, 0, 1), ('saturn_ring', .3, 0, 1), ('earth', .3, 0, 1), ('mars', .12, 0, 1), ('jupiter', .2, 0, 1), ('saturn', .2, 0, 1),
        ('backdrop', .35, 0, 1), ('tv_floor', .9, 0, 1), ('tv_sign', .3, 1.6, 1), ('eye_chart', .15, 0, 1)):
    texmat(n, sm, gl, ti)
print('palette', len(P), 'cells, materials written to', OUT)
