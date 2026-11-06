"""Cuts on the real kicks. Writes Director/acts/07-cuts.json: shots picked from a pool per story beat, landing on detected kicks.
# RETIRED: shots now live in Director/acts/07-cuts-*.json, owned by each part. Do not run this; it would recreate 07-cuts.json.

A group is (from bar, to bar, smallest gap in beats, shots). A cut happens on the first kick at least `gap` after the last one.
In the drops kicks fall on x.75 and x.5, so a gap of 0.7 cuts every kick, 1.2 every other one, 2 every bar's half.
The line through the chase: TV north (+z), he runs south. Side shots are from the west only, so he always runs screen right.
"""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
song = json.load(open(os.path.join(D, "song.json")))
ph, beats = song["downbeatPhase"], song["beats"]
kicks = song["onsets"]["kick"]
T = lambda bar, beat=1: beats[ph + (bar - 1) * 4 + int(beat - 1)]
ib = beats[1] - beats[0]
H = {"look": "person.head", "lookOffset": [0, .07, 0]}
Ch = {"look": "person.chest"}
TV = {"look": "tv1.screen"}
SHARP = {"aperture": 16, "focus": "person.head"}

def shot(name, pos, **k):
    return dict(name=name, pos=pos, **k)

def orbit(name, cx, cz, r, y, rate, angle, **k):
    return dict(name=name, orbit=dict(center=[cx, 0, cz], radius=r, y=y, rate=rate, angle=angle), **k)

# Bars 67-68: a different world on every kick. Each one sets all of these, so none leaks into the next.
def W(**k):
    w = dict(neon=0, duo=0, poster=0, hatch=0, halftone=0, pixel=0, ink=.6, toon=.6, invert=0, tear=0, saturation=22)
    w.update(k)
    return w
LOOKS = [
 W(duo=1, duoA="#ff0a30", duoB="#fff4a0", poster=3),
 W(neon=1, neonA="#000000", neonB="#ffffff", toon=1, ink=0),
 W(hatch=1, ink=1, toon=1, saturation=-100),
 W(pixel=9, saturation=60),
 W(invert=1, ink=.3),
 W(duo=1, duoA="#001040", duoB="#30ffe0", poster=4),
 W(halftone=.7, saturation=60),
]

# Room, he's at about [0.1, -1.6] heading for [0.1, -0.5], feet sliding back.
GROUPS = [
 # He runs, the room goes.
 (26, 29.5, 1.2, [
  shot("at us, TV behind him", [.1, 1.0, -2.92], look="person.head", lookOffset=[0, -.2, 0], fov=46, fovTo=30, handheld=.5, **SHARP),
  shot("side on", [-2.7, .95, -1.3], **Ch, fov=36, handheld=.6, **SHARP),
  shot("his face", [.14, 1.32, -2.9], **H, fov=17, handheld=.6, **SHARP),
  shot("side, low", [-2.6, .25, -1.5], look="person.hips", lookOffset=[0, .15, 0], fov=34, handheld=.6, dutch=-6, **SHARP),
  shot("from the TV", [.1, 1.25, 1.75], **Ch, fov=64, handheld=.4, **SHARP),
  shot("high, the room bends", [-2.75, 2.75, -2.75], **Ch, fov=70, handheld=.4, **SHARP),
  shot("side, tighter", [-1.9, 1.15, -1.1], **H, fov=26, handheld=.8, **SHARP),
  shot("at us, low", [.3, .35, -2.9], **Ch, fov=48, fovTo=34, handheld=.6, dutch=7, **SHARP),
  shot("his face, closer", [-.05, 1.28, -2.9], **H, fov=13, handheld=.9, **SHARP),
 ]),
 # The turkeys.
 (29.5, 33, 0.7, [
  shot("the first birds", [-2.3, .32, .4], rot=[-2, 86, 0], fov=38, handheld=.7, dutch=-6, **SHARP),
  shot("he looks back", [.2, 1.25, -2.9], **H, fov=22, handheld=.7, **SHARP),
  shot("the wave", [.5, .28, -2.85], rot=[-7, -4, 0], fov=46, handheld=.8, **SHARP),
  shot("side, birds at his back", [-2.8, .7, -1.6], rot=[-3, 78, 0], fov=48, handheld=.7, **SHARP),
  shot("from above", [.3, 2.8, -2.4], rot=[42, 0, 8], fov=78, handheld=.4, **SHARP),
  shot("bird level", [-2.5, .5, -2.7], rot=[-4, 42, 0], fov=36, handheld=.9, dutch=9, **SHARP),
  shot("his face again", [.14, 1.25, -2.9], **H, fov=18, handheld=.9, **SHARP),
  shot("they rain in", [-2.4, .25, -2.8], rot=[-32, 38, 0], fov=78, handheld=.5, **SHARP),
  shot("side, swallowed", [-2.2, 1.0, -1.1], **Ch, fov=34, handheld=1, **SHARP),
  shot("into the screen", [.3, 1.5, -2.9], **TV, fov=30, fovTo=44, handheld=.7, **SHARP),
  shot("the room goes", [-5.5, 3.6, -6], **TV, fov=52, handheld=.5, **SHARP),
 ]),
 # The fall, turkeys all around him. He stays big in frame: the birds are the texture, he's the shape.
 (34, 36.75, 0.7, [
  orbit("falling", 0, -1, 2.7, 4.5, 45, 200, **Ch, fov=44, **SHARP),
  shot("under him", [.4, 1.3, -1], rot=[-80, 0, 8], fov=66, handheld=.4, **SHARP),
  shot("his face", [.75, 4.5, -2.5], **H, fov=24, handheld=.6, **SHARP),
  shot("beside him", [2.2, 4.3, -2.6], **Ch, fov=34, handheld=.6, **SHARP),
  shot("above him", [.3, 8, -1.4], **Ch, fov=40, handheld=.5, dutch=12, **SHARP),
  orbit("circling", 0, -1, 2.0, 4.1, 80, 60, **H, fov=44, **SHARP),
 ]),
 (36.75, 38.75, 0.7, [
  shot("the line of him", [1.9, 3.8, -3.2], **Ch, fov=36, handheld=.4, **SHARP),
  orbit("line, circling", 0, -1, 2.6, 4.8, 60, 140, **Ch, fov=44, **SHARP),
  shot("line, under", [.4, 1.7, -1], rot=[-80, 0, -6], fov=46, **SHARP),
  shot("line, face", [-.8, 4.5, -2.4], **H, fov=26, handheld=.5, **SHARP),
 ]),
 (38.75, 41, 0.7, [
  shot("print, from below", [-1.2, 1.9, -2.3], **Ch, fov=42, handheld=.5, dutch=8, **SHARP),
  orbit("print, round", 0, -1, 2.4, 4, 90, 20, **Ch, fov=48, **SHARP),
  shot("print, face", [.7, 4.6, -2.4], **H, fov=22, handheld=.7, **SHARP),
  shot("print, above", [.3, 6.4, -1.3], **Ch, fov=36, dutch=-14, handheld=.6, **SHARP),
 ]),
 # Inside. He is the picture. Bigger than the first drop: every kick, a new place.
 (58, 59, 1.2, [
  shot("the picture forms", [0, 1.4, 54.5], move=[0, 1.3, 56.5], **Ch, fov=48, ease="out", **SHARP),
  shot("him, here", [.6, 1.5, 58.4], **H, fov=24, handheld=.6, **SHARP),
  shot("what's round him", [-2.4, .4, 57.4], look="person.hips", lookOffset=[0, .8, 0], fov=64, handheld=.6, **SHARP),
 ]),
 (59, 61, 0.7, [
  orbit("the ring", 0, 60, 3.4, 1.0, 50, 0, **Ch, fov=52, dutch=8, **SHARP),
  shot("through the birds", [4.8, .55, 57.5], **Ch, fov=30, handheld=1, dutch=10, **SHARP),
  shot("high on him", [-2.2, 3.2, 62.2], **Ch, fov=50, handheld=1, dutch=-8, **SHARP),
  shot("the feet of the birds", [3.4, .2, 56.8], rot=[-6, -32, 0], fov=46, handheld=.8, **SHARP),
  shot("his face, inside", [.5, 1.55, 58.6], **H, fov=22, handheld=.7, **SHARP),
  orbit("the ring, low", 0, 60, 2.6, .4, -70, 120, **Ch, fov=64, dutch=-10, **SHARP),
 ]),
 (61, 63, 0.7, [
  shot("giant, from the floor", [1.5, .2, 56.5], **H, fov=70, handheld=.8, dutch=8, **SHARP),
  shot("ankle height, birds", [-4.6, .4, 58.5], look="person.hips", fov=46, handheld=1, **SHARP),
  shot("his face, huge", [2.4, 5.8, 55.5], **H, fov=30, handheld=.7, **SHARP),
  shot("the wall behind him", [0, 1.2, 50], look="person.hips", lookOffset=[0, 4, 0], fov=62, handheld=.6, **SHARP),
 ]),
 (63, 65, 0.7, [
  orbit("in the air", 0, 60, 3.2, 3.2, 90, 40, **Ch, fov=50, **SHARP),
  shot("under him, wall above", [.4, .3, 59.5], rot=[-74, 0, 10], fov=82, handheld=.4, **SHARP),
  shot("face, falling", [.8, 3.4, 58.2], **H, fov=24, handheld=.7, **SHARP),
  shot("birds rain past", [-3.5, 1.2, 56.4], look="person.chest", fov=56, handheld=.8, dutch=9, **SHARP),
 ]),
 (65, 67, 0.7, [
  shot("all of him", [0, 1.4, 53], look="person.hips", lookOffset=[0, .6, 0], fov=56, handheld=.7, dutch=7, **SHARP),
  orbit("them running round", 0, 60, 2.2, 1.1, 120, 200, **H, fov=58, **SHARP),
  shot("low, they pass", [-3, .3, 60], look="person.chest", fov=42, handheld=1, **SHARP),
  shot("his eyes", [.15, 1.55, 58.7], **H, fov=15, handheld=.8, **SHARP),
 ]),
 (67, 68.72, 0.45, [
  shot("all a", [-3, 3, 59], rot=[-10, 18, 0], fov=64, handheld=.8, dutch=8, **SHARP),
  shot("all b", [.15, 1.55, 58.7], **H, fov=15, handheld=1, **SHARP),
  shot("all c", [4, .4, 60], rot=[-14, -18, 0], fov=60, handheld=.8, dutch=-8, **SHARP),
  orbit("all d", 0, 60, 2.2, 1.4, 150, 90, **Ch, fov=60, **SHARP),
  shot("all e", [0, 1.4, 53], look="person.hips", lookOffset=[0, .6, 0], fov=50, handheld=1, **SHARP),
 ], LOOKS),
 # The next one. The opening again, at twice the speed, with the band still at full power.
 (69.5, 73, 1.2, [
  shot("over her shoulder", [40.05, 1.26, -1.75], move=[40.05, 1.26, -1.5], look="tv2.screen", fov=30, handheld=.1),
  shot("the silhouette again", [40, 1.3, -2.85], move=[40, 1.27, -2.5], look="tv2.screen", fov=40, handheld=.1),
  shot("the red light again", [41.7, 2.1, 1.7], look="cctv_2", fov=20, fovTo=13, aperture=16),
  shot("the edge again", [39, 1.26, -1.5], look="person2.head", fov=24, aperture=16),
  shot("the corner again", [42.2, 2.5, 2.2], look="person2.chest", fov=56),
  shot("the floor again", [37.8, .1, -.6], look="tv2.screen", fov=38, handheld=.1),
  shot("behind the head again", [40.05, 1.24, -1.75], move=[40.05, 1.24, -1.3], look="tv2.screen", fov=30),
  shot("her eye", [-60, .04, 3.3], move=[-60, .02, 2.6], rot=[0, 180, 0], fov=30, focus="eyeball", aperture=32, ease="in"),
 ]),
]
cues = []
for g in GROUPS:
    a, b, gap, pool = g[:4]
    looks = g[4] if len(g) > 4 else None
    A, B = int(a), int(b)
    t0 = T(A) + (a - A) * 4 * ib
    t1 = T(B) + (b - B) * 4 * ib if B < 73 else T(73)
    last, i = t0 - 99, 0
    pts = [t0] + [k for k in kicks if t0 + ib * .3 < k < t1 - ib * .3]
    for t in pts:
        if t - last < gap * ib:
            continue
        s = dict(pool[i % len(pool)])
        cues.append({"at": round(t, 3), "shot": s})
        if looks:
            cues.append({"at": round(t, 3), "grade": looks[i % len(looks)]})
            cues.append({"at": round(t, 3), "pulse": {"flash": .5}, "for": "0.35b", "flashColor": "#ffffff"})
        last = t
        i += 1
    print(a, b, i, "cuts")
json.dump({"cues": cues}, open(os.path.join(D, "acts", "07-cuts.json"), "w"), indent=0)
