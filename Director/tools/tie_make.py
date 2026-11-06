# The tie bird's tie: knot, collar loop, tapered blade. One mesh, used everywhere. Writes Assets/MusicVideo/Props/tie.obj.
# Units: blade length 1. Origin at the knot, +Y up the neck, +Z out of the chest. The loop runs round -Z, behind the knot.
# Scale it uniformly per bird: about 0.16 x the bird's scale.
import math, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
V, F = [], []
def ring(pts):
    i = len(V); V.extend(pts); return i
def bridge(a, b, n, closed=True):
    for k in range(n if closed else n - 1):
        k2 = (k + 1) % n
        F.append((a + k, a + k2, b + k2, b + k))
def cap(a, n, flip=False):
    c = len(V); V.append(tuple(sum(V[a + k][j] for k in range(n)) / n for j in range(3)))
    for k in range(n):
        k2 = (k + 1) % n
        F.append((a + k, a + k2, c) if not flip else (a + k2, a + k, c))
def section(y, w, t, z):  # a flattened diamond with a raised middle crease, wide and thin: 6 points, clockwise from +X seen from above
    return [(w, y, z), (w * .5, y, z + t), (-w * .5, y, z + t), (-w, y, z), (-w * .5, y, z - t * .6), (w * .5, y, z - t * .6)]
# The blade: narrow under the knot, widest near the tip, bowing out so it lies on a round chest.
bow = lambda y: .30 * (y * y)
rows = [(-.06, .040), (-.2, .060), (-.4, .082), (-.6, .104), (-.8, .124), (-.9, .132)]
prev = None
for y, w in rows:
    r = ring(section(y, w, .012, bow(y)))
    if prev is None: cap(r, 6, True)
    else: bridge(prev, r, 6)
    prev = r
tip = ring(section(-1.0, .004, .006, bow(1.0)))
bridge(prev, tip, 6); cap(tip, 6)
# The knot: a fat tapered wedge.
a = ring(section(.05, .070, .030, .012)); b = ring(section(.0, .068, .040, .016)); c = ring(section(-.07, .038, .026, .012))
cap(a, 6, True); bridge(a, b, 6); bridge(b, c, 6); cap(c, 6)
# The loop, a flat band round the neck, tilted so it sits lower at the front.
R, H, T, N = .155, .022, .006, 20
rows = []
for h, rad in ((-H, R), (-H, R + T), (H, R + T), (H, R)):
    pts = []
    for k in range(N):
        ang = k / N * 2 * math.pi
        x, z = math.sin(ang) * rad, (math.cos(ang) - 1) * R + .010
        pts.append((x, h + .03 + .04 * (1 - math.cos(ang)), z))
    rows.append(ring(pts))
for i in range(4): bridge(rows[i], rows[(i + 1) % 4], N)
out = os.path.abspath(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Props', 'tie.obj'))
with open(out, 'w') as f:
    f.write('o tie\n')
    for v in V: f.write('v %.5f %.5f %.5f\n' % (-v[0], v[1], v[2]))  # OBJ is right-handed; Unity flips X on import
    for t in F: f.write('f ' + ' '.join(str(i + 1) for i in reversed(t)) + '\n')
print(out, len(V), 'verts', len(F), 'faces')
