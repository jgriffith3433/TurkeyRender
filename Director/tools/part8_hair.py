"""Part 8: her hair, as a real mesh: a cap on the skull and long wavy locks that fall past the shoulders and break the silhouette.
   Local space: origin at the centre of the head, front +Z, up +Y, metres.
   py Director/tools/part8_hair.py  writes Assets/Shows/her_hair.obj"""
import math, os, random
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'Assets', 'Shows', 'her_hair.obj')
random.seed(11)
A, B, C = .112, .124, .128     # the skull the hair sits on, a little bigger than the head
vs, fs = [], []

def scalp(ph, th, lift=0.0):
    """ph 0 is the back of the head, +90 her left; th 0 is the crown."""
    p, t = math.radians(ph), math.radians(th)
    return ((A + lift) * math.sin(t) * math.sin(p), (B + lift) * math.cos(t), -(C + lift) * math.sin(t) * math.cos(p))

def norm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1
    return tuple(c / l for c in v)

def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])

def tube(path, widths, sides=9):
    """A tapered lock along a path; flat-ish, as hair lies."""
    base = len(vs)
    for i, p in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        T = norm((b[0] - a[0], b[1] - a[1], b[2] - a[2]))
        out = norm((p[0], 0, p[2]))                 # away from the head axis
        S = norm(cross(T, out))
        N = norm(cross(S, T))
        w, d = widths[i]
        for k in range(sides):
            q = 2 * math.pi * k / sides
            c, s = math.cos(q) * w, math.sin(q) * d
            vs.append((p[0] + S[0] * c + N[0] * s, p[1] + S[1] * c + N[1] * s, p[2] + S[2] * c + N[2] * s))
    for i in range(len(path) - 1):
        for k in range(sides):
            a = base + i * sides + k
            b = base + i * sides + (k + 1) % sides
            c = base + (i + 1) * sides + (k + 1) % sides
            d = base + (i + 1) * sides + k
            fs.append((a, c, b)); fs.append((a, d, c))
    # Close the tip.
    tip = len(vs); vs.append(path[-1])
    for k in range(sides):
        fs.append((base + (len(path) - 2 + 1) * sides + k, tip, base + (len(path) - 1) * sides + (k + 1) % sides))

# The cap: a dome over the skull, down to a hairline that frames the face.
NU, NV = 72, 28
cap = len(vs)
for j in range(NV + 1):
    th = 112 * j / NV
    for i in range(NU):
        ph = 360 * i / NU
        vs.append(scalp(ph, th, .004 + .002 * math.sin(math.radians(ph) * 13)))
for j in range(NV):
    for i in range(NU):
        a, b, c, d = cap + j * NU + i, cap + j * NU + (i + 1) % NU, cap + (j + 1) * NU + (i + 1) % NU, cap + (j + 1) * NU + i
        # The face: no cap below the hairline in front.
        mid = 360 * (i + .5) / NU
        front = 180 - abs(mid - 180)
        hair = 112 * (j + .5) / NV
        if front > 130 and hair > 62: continue
        if front > 112 and hair > 84: continue
        fs.append((a, c, b)); fs.append((a, d, c))

def lock(ph, length, width, depth, puff, wave, phase, start=62):
    """From the parting, over the skull, and down: it falls with gravity, flares over the shoulder, and waves."""
    steps = 34
    path, widths = [], []
    for i in range(steps + 1):
        u = i / steps
        if u < .22:
            th = 18 + (start + 22 - 18) * (u / .22)
            p = list(scalp(ph, th, .012))
            y0 = p[1]
            last = p
        else:
            s = (u - .22) / .78
            # Down from the ear; the fall is straight, the flare comes from the shoulders and the wave.
            x, y, z = last
            r = math.hypot(x, z) or 1
            flare = puff * math.sin(min(1, s * 2.2) * math.pi / 2) ** 1.5
            k = (r + flare + .018 * s) / r
            wv = wave * (.3 + s) * math.sin(s * 9 + phase)
            sx, sz = x / r, z / r
            p = [x * k + -sz * wv, y - length * s, z * k + sx * wv]
            # Hair at the sides lies on the shoulders, so it moves forward over them, not through them.
            if abs(ph) > 40 and s > .25:
                p[2] += (.05 * (s - .25)) * (1 if abs(ph) > 90 else .2)
        path.append(tuple(p))
        taper = min(1, (1 - u) / .25) ** .7
        grow = .55 + .45 * min(1, u / .3)
        widths.append((width * grow * taper + .0015, depth * grow * taper + .0012))
    tube(path, widths)

# Long hair: three layers. Back and sides, then the short ones that frame her face.
for ring, (n, l0, w, d, puff, top) in enumerate([(34, .50, .024, .014, .045, 64), (28, .42, .022, .015, .032, 54), (20, .34, .020, .013, .022, 44)]):
    for i in range(n):
        ph = -128 + 256 * (i + .5 * (ring % 2)) / (n - 1 + (ring % 2))
        if ph > 128: continue
        lock(ph + random.uniform(-3, 3), l0 * random.uniform(.78, 1.05), w * random.uniform(.8, 1.25), d, puff * random.uniform(.75, 1.2), random.uniform(.016, .03), random.uniform(0, 6.3), top)
# Two front pieces, either side of the face, curving away from the cheek.
for side in (-1, 1):
    for k in range(3):
        lock(side * (132 - k * 6), .30 - k * .03, .017, .011, .024 + k * .006, .012, 1.2 + k + side, 58)

with open(OUT, 'w') as f:
    f.write('o her_hair\n')
    for v in vs:
        f.write('v %.4f %.4f %.4f\n' % v)
    for a, b, c in fs:
        f.write('f %d %d %d\n' % (a + 1, b + 1, c + 1))
print('hair', len(vs), 'verts', len(fs), 'tris')
