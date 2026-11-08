#!/usr/bin/env python
# The yard's small props, made by numbers: a house sparrow and an impact sprinkler, as OBJ with UVs into one painted atlas each.
# No pack on disk has a small bird. Same model paths as the stand-ins, so no score changes. 1 unit = 1 m, y up, the bird faces +z, feet at y 0.
# The sprinkler's axis is y through the origin, its nozzle points along +x. Run: py Director/tools/make_yard_props.py
import math, random, os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'Assets', 'Videos', 'touchgrass', 'Props')


class Mesh:
    def __init__(s): s.v, s.vt, s.vn, s.f = [], [], [], []

    def grid(s, rows, rect, wrap=True):
        """rows: list of rings of points. rect: the atlas box (u0, v0, u1, v1). Smooth normals from the grid."""
        R, C = len(rows), len(rows[0])
        base = len(s.v)
        def at(r, c): return rows[max(0, min(R - 1, r))][c % C if wrap else max(0, min(C - 1, c))]
        for r in range(R):
            for c in range(C):
                a, b, d, e = at(r, c + 1), at(r, c - 1), at(r + 1, c), at(r - 1, c)
                du = [a[i] - b[i] for i in range(3)]; dv = [d[i] - e[i] for i in range(3)]
                n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]
                l = math.sqrt(sum(x * x for x in n))
                if l < 1e-12:
                    # A pole: every neighbour on the ring is the same point, so point away from the next ring's middle.
                    m = rows[1 if r == 0 else R - 2]; cx = [sum(p[i] for p in m) / len(m) for i in range(3)]
                    n = [rows[r][c][i] - cx[i] for i in range(3)]; l = math.sqrt(sum(x * x for x in n)) or 1
                s.v.append(rows[r][c]); s.vn.append([x / l for x in n])
                s.vt.append((rect[0] + (rect[2] - rect[0]) * c / (C - 1), rect[1] + (rect[3] - rect[1]) * r / (R - 1)))
        for r in range(R - 1):
            for c in range(C - 1):
                a, b, d, e = base + r * C + c, base + r * C + c + 1, base + (r + 1) * C + c, base + (r + 1) * C + c + 1
                s.f.append((a, d, e)); s.f.append((a, e, b))

    def write(s, path, note):
        with open(path, 'w') as f:
            f.write('# ' + note + '\n')
            for p in s.v: f.write('v %.5f %.5f %.5f\n' % tuple(p))
            for p in s.vt: f.write('vt %.5f %.5f\n' % p)
            for p in s.vn: f.write('vn %.4f %.4f %.4f\n' % tuple(p))
            for t in s.f: f.write('f ' + ' '.join('%d/%d/%d' % (i + 1, i + 1, i + 1) for i in t) + '\n')


def lerp(a, b, t): return a + (b - a) * t
def catmull(p, t):
    n = len(p) - 1; x = t * n; i = min(n - 1, int(x)); f = x - i
    q = [p[max(0, i - 1)], p[i], p[i + 1], p[min(n, i + 2)]]
    return tuple(.5 * (2 * q[1][k] + (q[2][k] - q[0][k]) * f + (2 * q[0][k] - 5 * q[1][k] + 4 * q[2][k] - q[3][k]) * f * f + (3 * q[1][k] - q[0][k] - 3 * q[2][k] + q[3][k]) * f ** 3) for k in range(len(p[0])))


def loft(stations, rings=26, seg=20, side=(1, 0, 0), bias=None):
    """stations: (x, y, z, r_side, r_up). A tube along them, with a smooth radius. Ring coordinates: angle 0 is up the back."""
    rows = []
    for i in range(rings):
        t = i / (rings - 1)
        x, y, z, a, b = catmull(stations, t)
        tx, ty, tz = catmull(stations, min(1, t + .02))[:3]; tx -= x; ty -= y; tz -= z
        px, py, pz = catmull(stations, max(0, t - .02))[:3]; tx += x - px; ty += y - py; tz += z - pz
        l = math.sqrt(tx * tx + ty * ty + tz * tz) or 1; tx /= l; ty /= l; tz /= l
        # up = perpendicular to the spine in the yz plane, right = x
        ux, uy, uz = 0, tz, -ty
        ring = []
        for c in range(seg + 1):
            an = 2 * math.pi * c / seg
            s_, c_ = math.sin(an), math.cos(an)
            ring.append([x + side[0] * s_ * max(a, 0), y + uy * c_ * max(b, 0), z + uz * c_ * max(b, 0)])
        rows.append(ring)
    return rows


def sphere(cx, cy, cz, rx, ry, rz, rings=14, seg=18):
    rows = []
    for r in range(rings + 1):
        la = math.pi * r / rings
        rows.append([[cx + rx * math.sin(la) * math.sin(2 * math.pi * c / seg), cy + ry * math.cos(la), cz + rz * math.sin(la) * math.cos(2 * math.pi * c / seg)] for c in range(seg + 1)])
    return rows


def tube(a, b, r0, r1, seg=8, caps=True):
    ax = [b[i] - a[i] for i in range(3)]; l = math.sqrt(sum(x * x for x in ax)) or 1; ax = [x / l for x in ax]
    h = (0, 1, 0) if abs(ax[1]) < .9 else (1, 0, 0)
    u = [ax[1] * h[2] - ax[2] * h[1], ax[2] * h[0] - ax[0] * h[2], ax[0] * h[1] - ax[1] * h[0]]; ul = math.sqrt(sum(x * x for x in u)); u = [x / ul for x in u]
    w = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]
    def ring(p, r): return [[p[i] + r * (math.cos(2 * math.pi * c / seg) * u[i] + math.sin(2 * math.pi * c / seg) * w[i]) for i in range(3)] for c in range(seg + 1)]
    rows = [ring(a, r0), ring(b, r1)]
    if caps: rows = [ring(a, 0)] + rows + [ring(b, 0)]
    return rows


# ---- the bird: a house sparrow, 13 cm

def sparrow():
    m = Mesh()
    # Atlas boxes. PIL's y runs down, OBJ's v up: paint() below flips.
    BODY, HEAD, WING, TAIL = (0, .5, 1, 1), (0, 0, .5, .5), (.5, .25, 1, .5), (.5, 0, .75, .25)
    BEAK, EYE, LEG = (.76, .13, .87, .24), (.76, .01, .87, .12), (.88, .01, .99, .24)
    # Sat upright at about 35 degrees, breast forward.
    m.grid(loft([(0, .058, -.066, .0, .0), (0, .060, -.052, .012, .008), (0, .063, -.03, .021, .019), (0, .068, -.008, .0255, .027), (0, .079, .012, .0245, .027),
                 (0, .092, .021, .0185, .0195), (0, .103, .026, .011, .011), (0, .108, .029, 0, 0)], 30, 22), BODY)
    m.grid(sphere(0, .111, .032, .0178, .0172, .0195), HEAD)
    for sx in (1, -1):
        # A folded wing, lying along the side, primaries crossing over the rump.
        wing = [(.0, .092, .018, .0, .0), (0, .087, .012, .0065, .012), (0, .077, -.012, .0052, .0145), (0, .068, -.04, .0036, .0095), (0, .062, -.066, .0017, .0045), (0, .06, -.08, 0, 0)]
        rows = loft(wing, 20, 14)
        for r, ring in enumerate(rows):
            t = r / 19
            for p in ring: p[0] = p[0] * 1.0 + sx * (.0232 - .012 * t * t)
        m.grid(rows, WING)
        m.grid(sphere(sx * .0156, .1135, .0415, .0033, .0033, .0033, 8, 10), EYE)
        # Legs: a tarsus and three toes forward, one back.
        hip = (sx * .009, .046, .004); ankle = (sx * .0105, .032, .012); foot = (sx * .011, .0185, .009)
        for a, b, r0, r1 in [(hip, ankle, .0021, .0014), (ankle, foot, .0014, .0013)]: m.grid(tube(a, b, r0, r1, 6), LEG)
        for dx, dz in [(-.008, .015), (0, .019), (.008, .015), (0, -.012)]:
            m.grid(tube(foot, (foot[0] + dx, .0172, foot[2] + dz), .0012, .0006, 5), LEG)
    tail = loft([(0, .066, -.052, .0, 0), (0, .058, -.066, .0115, .0028), (0, .048, -.098, .0155, .0022), (0, .044, -.114, .0165, .0014), (0, .043, -.118, 0, 0)], 14, 12)
    m.grid(tail, TAIL)
    # A stout finch's beak, with a parting line in the paint.
    m.grid(loft([(0, .1085, .043, .0, 0), (0, .1085, .0465, .0072, .0072), (0, .1072, .053, .0052, .0058), (0, .1055, .0595, .0026, .003), (0, .1048, .0635, 0, 0)], 10, 12), BEAK)
    m.v = [[p[0], p[1] - .016, p[2]] for p in m.v]   # a crouched perch: the legs are short, so the toes sit on y 0
    m.write(os.path.join(OUT, 'sparrow.obj'), 'a house sparrow, made by Director/tools/make_yard_props.py')

    random.seed(5)
    S = 1024
    im = Image.new('RGB', (S, S), (110, 80, 50)); d = ImageDraw.Draw(im); px = im.load()
    def box(b): return int(b[0] * S), int((1 - b[3]) * S), int(b[2] * S), int((1 - b[1]) * S)
    def fill(b, fn):
        x0, y0, x1, y1 = box(b)
        for y in range(y0, y1):
            v = 1 - (y - y0) / max(1, y1 - y0 - 1)
            for x in range(x0, x1): px[x, y] = fn((x - x0) / max(1, x1 - x0 - 1), v)
    def mix(a, b, t): t = max(0, min(1, t)); return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
    def ss(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
    def ip(c): return tuple(int(max(0, min(255, q))) for q in c)
    streak = [[random.random() for _ in range(64)] for _ in range(64)]
    def noise(u, v, a, b): return streak[int(v * a) % 64][int(u * b) % 64]
    def body(u, v):
        belly = 1 - abs(u - .5) * 2           # 1 on the spine, 0 under the belly: u .5 is under, 0 and 1 the back. See the ring in loft.
        under = abs(u - .5) * -2 + 1
        back = 1 - under
        c = mix((222, 208, 184), (188, 172, 152), v)                                      # pale breast and belly
        n = noise(u, v, 26, 40)
        brown = mix((118, 76, 44), (66, 42, 26), ss(.62, .78, n))                         # back: chestnut with black streaks
        c = mix(brown, c, ss(.62, .36, back))
        c = mix(c, (150, 146, 138), ss(.62, .82, v) * ss(.4, .6, back) * ss(.0, .3, 1 - back))   # grey flank at the shoulder
        c = mix(c, (28, 24, 22), ss(.70, .82, v) * ss(.36, .2, back))                     # the black bib
        return ip(mix(c, (c[0] * .9, c[1] * .9, c[2] * .9), noise(u, v, 60, 90) * .5))
    fill(BODY, body)
    def head(u, v):
        # u around from +z (the face) through +x; v is 0 at the bottom, 1 on the crown.
        a = abs(((u + .5) % 1) - .5) * 2     # 0 at the bill, 1 at the nape
        c = mix((206, 200, 188), (214, 208, 196), v)                                      # pale cheek
        c = mix(c, (126, 124, 122), ss(.72, .82, v))                                      # grey crown
        strip = ss(.55, .65, v) * ss(.8, .7, v) + ss(.3, .55, a) * ss(.45, .6, v)
        c = mix(c, (112, 62, 36), min(1, strip))                                          # chestnut stripe from the eye round the nape
        c = mix(c, (32, 28, 26), ss(.62, .58, v + a * .25) * ss(.25, .05, a))             # black at the lores and chin
        c = mix(c, (30, 26, 24), ss(.38, .3, v) * ss(.5, .2, a))
        return ip(c)
    fill(HEAD, head)
    def wing(u, v):
        side = abs(u - .5) * 2
        rows = (v * 17 + (.5 if int(u * 5) % 2 else 0)) % 1
        c = mix((92, 58, 34), (44, 30, 22), ss(.45, .85, rows))                           # feather rows, dark at the base
        c = mix(c, (178, 142, 96), ss(.82, .98, rows) * .8)                               # buff edges
        if .3 < v < .36: c = mix(c, (226, 218, 204), .85)                                 # the white wing bar
        if v > .78: c = mix(c, (118, 72, 42), .75)                                        # chestnut shoulder
        return ip(mix(c, (40, 28, 22), ss(.25, .6, 1 - side) * .25))
    fill(WING, wing)
    fill(TAIL, lambda u, v: ip(mix((62, 44, 32), (92, 66, 44), ((u * 7) % 1))))
    fill(BEAK, lambda u, v: ip(mix((40, 34, 30), (72, 62, 54), ss(.5, 1, 1 - abs(u - .5) * 2))))
    fill(EYE, lambda u, v: (10, 8, 8))
    fill(LEG, lambda u, v: (150, 112, 92))
    # A catchlight, so the eye reads as wet, placed on the ring that faces up and forward.
    x0, y0, x1, y1 = box(EYE); w = x1 - x0
    d.ellipse([x0 + w * .02, y0 + w * .24, x0 + w * .16, y0 + w * .36], fill=(236, 236, 232))
    d.ellipse([x0 + w * .84, y0 + w * .24, x0 + w * .98, y0 + w * .36], fill=(236, 236, 232))
    im.filter(ImageFilter.GaussianBlur(.8)).save(os.path.join(OUT, 'sparrow.png'))


# ---- the sprinkler: a brass impact head on a stake

def sprinkler():
    m = Mesh()
    BRASS, DARK, STEEL = (0, 0, .33, 1), (.34, 0, .66, 1), (.67, 0, 1, 1)
    def t(a, b, r0, r1, box=BRASS, seg=12): m.grid(tube(a, b, r0, r1, seg), box)
    t((0, -.08, 0), (0, .24, 0), .013, .012, DARK)                    # the stake and riser, with the bottom in the lawn
    t((0, .05, 0), (0, .058, 0), .05, .05, DARK, 16)                  # the foot plate, under the blades
    t((0, .24, 0), (0, .265, 0), .022, .02)                           # bearing
    t((0, .265, 0), (0, .30, 0), .017, .019)                          # body
    t((0, .275, 0), (.052, .303, 0), .0095, .0065)                    # the nozzle barrel, up at 28 degrees
    t((.05, .302, 0), (.058, .306, 0), .0085, .0085)                  # its collar
    t((0, .30, 0), (0, .322, 0), .0065, .0065, STEEL)                 # the spring post
    t((0, .322, 0), (0, .33, 0), .0115, .0085)                        # cap
    # The hammer arm across the top, a spoon at the front and a counterweight behind.
    arm = [(-.062, .33, .004), (-.02, .336, .002), (.03, .336, .0), (.072, .322, -.004)]
    for i in range(3): t(arm[i], arm[i + 1], .0032, .0032, STEEL, 8)
    t((.072, .322, -.004), (.083, .307, -.006), .0058, .0028, BRASS, 8)
    t((-.062, .33, .004), (-.085, .327, .005), .0115, .0115, DARK, 10)
    m.write(os.path.join(OUT, 'sprinkler.obj'), 'an impact sprinkler, made by Director/tools/make_yard_props.py')
    random.seed(9)
    im = Image.new('RGB', (256, 64), (0, 0, 0)); px = im.load()
    for y in range(64):
        for x in range(256):
            n = random.random() * 18
            if x < 86: c = (186 + n, 140 + n * .8, 62 + n * .4)
            elif x < 170: c = (42 + n * .4, 44 + n * .4, 46 + n * .4)
            else: c = (156 + n, 158 + n, 160 + n)
            px[x, y] = tuple(int(q) for q in c)
    im.save(os.path.join(OUT, 'sprinkler.png'))


sparrow(); sprinkler()
print('sparrow and sprinkler written to', os.path.normpath(OUT))
