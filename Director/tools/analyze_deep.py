"""The deep pass over the song. Reads the demucs stems and writes:
  Director/song.json   every beat, section, envelope and hit the timeline can use
  Director/SONG.md     a plain-English map: section by section, bar by bar, where it builds, breaks and drops
  Director/song-map.png   the energy of each stem across the whole song
Run: uv run --python 3.12 --with librosa --with soundfile --with matplotlib Director/tools/analyze_deep.py
"""
import json, os, re
import numpy as np, librosa
from scipy.signal import find_peaks
from scipy.ndimage import uniform_filter1d, gaussian_filter1d
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "..")
STEMS = os.path.join(D, "stems", "htdemucs", "Audio")
SR, HOP, FPS = 22050, 256, 60

def load(n): return librosa.load(os.path.join(STEMS, n + ".wav"), sr=SR, mono=True)[0]
mix = librosa.load(os.path.join(D, "..", "Assets", "Song", "Audio.mp3"), sr=SR, mono=True)[0]
drums, bass, vocals, other = load("drums"), load("bass"), load("vocals"), load("other")
n = min(map(len, (mix, drums, bass, vocals, other)))
mix, drums, bass, vocals, other = mix[:n], drums[:n], bass[:n], vocals[:n], other[:n]
dur = n / SR
t_grid = np.arange(0, dur, 1 / FPS)

# ---- beats: the drums sit on one exact tempo (87 BPM, a 3-3-2 kick pattern), so fit one straight grid to them
oenv = librosa.onset.onset_strength(y=drums + .25 * bass, sr=SR, hop_length=HOP)
ft = librosa.frames_to_time(np.arange(len(oenv)), sr=SR, hop_length=HOP)
best = (-1e9, 87.0, 0.0)
for bpm in np.arange(86.7, 87.3, .005):
    ib = 60 / bpm
    for off in np.arange(0, ib, .005):
        v = float(np.interp(np.arange(off, dur, ib), ft, oenv).mean())
        if v > best[0]: best = (v, float(bpm), float(off))
tempo = best[1]
print(f"tempo {tempo:.3f}, first beat offset {best[2]:.3f}")
ib = 60 / tempo
# Start the grid before the first sound so bar numbers stay stable.
beats = np.arange(best[2], dur, ib)
frames = librosa.time_to_frames(beats, sr=SR, hop_length=HOP)
ibi = np.diff(beats)

# ---- bands from the stems
def stft(y): return np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP)) ** 2
freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
t_src = librosa.frames_to_time(np.arange(int(n / HOP) + 1), sr=SR, hop_length=HOP)
def band(S, lo, hi): return np.sqrt(S[(freqs >= lo) & (freqs < hi)].sum(axis=0))
def env(e, smooth=0):
    x = np.interp(t_grid, t_src[:len(e)], e)
    if smooth: x = gaussian_filter1d(x, smooth)
    p = np.percentile(x, 99.5) or 1
    return np.clip(x / p, 0, 1)
Sd, Sb, Sv, So, Sm = stft(drums), stft(bass), stft(vocals), stft(other), stft(mix)
kick_raw, snare_raw, hat_raw = band(Sd, 30, 140), band(Sd, 180, 3500), band(Sd, 6000, 11000)
envs = {
    "kick": env(kick_raw), "snare": env(snare_raw), "hat": env(hat_raw),
    "drums": env(librosa.feature.rms(y=drums, hop_length=HOP)[0], 2),
    "bass": env(librosa.feature.rms(y=bass, hop_length=HOP)[0], 2),
    "vocal": env(librosa.feature.rms(y=vocals, hop_length=HOP)[0], 2),
    "other": env(librosa.feature.rms(y=other, hop_length=HOP)[0], 2),
    "mid": env(band(Sm, 400, 4000)), "high": env(band(Sm, 4000, 11000)),
    "rms": env(librosa.feature.rms(y=mix, hop_length=HOP)[0], 2),
    "bright": env(librosa.feature.spectral_centroid(y=mix, sr=SR, hop_length=HOP)[0], 6),
}

def hits(raw, thr, gap):
    f = np.maximum(0, np.diff(raw, prepend=raw[0]))
    f = f / (np.percentile(f, 99.7) or 1)
    idx, prop = find_peaks(f, height=thr, distance=max(1, int(gap * SR / HOP)))
    return np.round(t_src[idx], 3).tolist()
onsets = {"kick": hits(kick_raw, .3, .12), "snare": hits(snare_raw, .35, .12), "hat": hits(hat_raw, .3, .07)}
onsets["all"] = np.round(librosa.frames_to_time(librosa.onset.onset_detect(onset_envelope=librosa.onset.onset_strength(y=mix, sr=SR, hop_length=HOP), sr=SR, hop_length=HOP), sr=SR, hop_length=HOP), 3).tolist()

# Vocal phrases: where the singer sings.
v = gaussian_filter1d(envs["vocal"], 12) > .08
edges = np.flatnonzero(np.diff(v.astype(int)))
ph, on = [], v[0]
start = 0.0
for e in edges:
    t = e / FPS
    if on and t - start > .3: ph.append([round(start, 2), round(t, 2)])
    on = not on; start = t
if on: ph.append([round(start, 2), round(dur, 2)])
merged = []
for p in ph:
    if merged and p[0] - merged[-1][1] < .35: merged[-1][1] = p[1]
    else: merged.append(p)

# ---- downbeat: the big changes in the song land on bar lines. Score each of the 4 phases on that, and on the kick.
kick_at = np.interp(beats, t_grid, envs["kick"])
stack = np.stack([gaussian_filter1d(envs[k], 8) for k in ("rms", "drums", "bass", "vocal", "other")])
per = int(ib * FPS)
nov_t = np.abs(np.roll(stack, -per * 2, axis=1) - stack).sum(axis=0)
nov_beat = np.interp(beats, t_grid, nov_t)
score = []
for i in range(4):
    score.append(kick_at[i::4].mean() / (kick_at.mean() + 1e-6) + nov_beat[i::4].mean() / (nov_beat.mean() + 1e-6) + 1.5 * nov_beat[i::16].mean() / (nov_beat.mean() + 1e-6))
phase = int(np.argmax(score))
print("downbeat phase scores", np.round(score, 3), "->", phase)

# ---- bar table
meter = 4
bar_rows = []
starts = list(range(phase, len(beats) - meter, meter))
for bi, s in enumerate(starts):
    t0, t1 = beats[s], beats[s + meter]
    a, b = int(t0 * FPS), int(t1 * FPS)
    row = {"bar": bi + 1, "t": round(float(t0), 2)}
    for k in ("rms", "drums", "bass", "vocal", "other", "high", "bright"):
        row[k] = round(float(envs[k][a:b].mean()), 3)
    row["kicks"] = sum(t0 <= x < t1 for x in onsets["kick"])
    row["snares"] = sum(t0 <= x < t1 for x in onsets["snare"])
    row["hats"] = sum(t0 <= x < t1 for x in onsets["hat"])
    bar_rows.append(row)

# ---- sections: changes in what is playing, on 4 or 8 bar lines
fm = np.array([[r["rms"], r["drums"], r["bass"], r["vocal"], r["other"], r["high"], min(1, r["kicks"] / 6), min(1, r["hats"] / 16)] for r in bar_rows])
nov = np.zeros(len(fm))
w = 2
for i in range(w, len(fm) - w):
    nov[i] = np.linalg.norm(fm[i:i + w].mean(0) - fm[i - w:i].mean(0))
pk, _ = find_peaks(nov, height=max(.1, nov.mean() + .25 * nov.std()), distance=3)
bounds = [0] + [int(p) for p in pk] + [len(bar_rows)]

def describe(rows):
    r = {k: np.mean([x[k] for x in rows]) for k in ("rms", "drums", "bass", "vocal", "other", "high")}
    level = "huge" if r["rms"] > .62 else "full" if r["rms"] > .42 else "medium" if r["rms"] > .25 else "sparse"
    parts = [p for p, k, th in (("drums", "drums", .2), ("bass", "bass", .2), ("vocals", "vocal", .12), ("synths", "other", .2)) if r[k] > th]
    first, last = rows[0]["rms"], rows[-1]["rms"]
    trend = "building" if last - first > .12 else "falling" if first - last > .12 else "steady"
    return level, parts, trend, r

secs = []
for i in range(len(bounds) - 1):
    rows = bar_rows[bounds[i]:bounds[i + 1]]
    if not rows: continue
    level, parts, trend, r = describe(rows)
    prev = secs[-1] if secs else None
    kind = "intro" if i == 0 else None
    if prev is not None:
        jump = r["rms"] - prev["energy"]
        kind = "DROP" if jump > .15 else "BREAK" if jump < -.15 else "BUILD" if trend == "building" else "section"
    secs.append({"name": f"s{len(secs)+1}", "kind": kind, "bar": rows[0]["bar"], "bars": len(rows), "t": rows[0]["t"], "beat": starts[rows[0]["bar"] - 1],
                 "energy": round(float(r["rms"]), 3), "level": level, "parts": parts, "trend": trend})

ly = {}
p = os.path.join(D, "lyrics.json")
lines = json.load(open(p))["lines"] if os.path.exists(p) else []

data = {"duration": round(dur, 3), "tempo": round(tempo, 2), "meter": meter, "downbeatPhase": phase,
        "beats": [round(float(b), 3) for b in beats], "sections": secs, "onsets": onsets, "phrases": merged, "bars": bar_rows,
        "envelopes": {"fps": FPS, **{k: [round(float(x), 3) for x in a] for k, a in envs.items()}}}
tmp = os.path.join(D, "song.json.tmp"); json.dump(data, open(tmp, "w"), separators=(",", ":"), default=float); os.replace(tmp, os.path.join(D, "song.json"))

# ---- written map
def bar_of(t):
    i = int(np.searchsorted(beats, t, side="right")) - 1 - phase
    return f"{i // meter + 1}:{i % meter + 1}"
out = [f"# The song, read for directing\n\n{dur:.1f}s, about {tempo:.0f} BPM, {len(bar_rows)} bars. Bar 1 beat 1 is at {beats[phase]:.2f}s.\n", "## Sections\n",
       "| Section | Bars | Starts | What happens | Sound | Energy |", "|---|---|---|---|---|---|"]
for s in secs:
    e = s["bar"] + s["bars"] - 1
    words = " ".join(l["text"] for l in lines if s["t"] <= l["t"] < s["t"] + s["bars"] * meter * float(ibi.mean()))[:70]
    out.append(f"| {s['name']} | {s['bar']}-{e} | {s['t']:.1f}s | {s['kind']}, {s['level']}, {s['trend']} | {' + '.join(s['parts']) or 'almost nothing'} | {'#' * int(s['energy'] * 20)} {s['energy']:.2f} |" + (f" \"{words}\"" if words else ""))
out += ["\n## Bar by bar\n", "`bar time | energy | drums bass vocal synth | kicks snares hats`\n", "```"]
for r in bar_rows:
    g = lambda k: " .:-=+*#%@"[min(9, int(r[k] * 10))]
    out.append(f"{r['bar']:3d} {r['t']:6.1f}s {'#' * int(r['rms'] * 30):30s} d{g('drums')} b{g('bass')} v{g('vocal')} s{g('other')}  {r['kicks']:2d} {r['snares']:2d} {r['hats']:2d}")
out += ["```", "\n## Vocal phrases\n"] + [f"- {bar_of(a)} to {bar_of(b)} ({a:.1f}s to {b:.1f}s)" for a, b in merged]
open(os.path.join(D, "SONG.md"), "w", encoding="utf8").write("\n".join(out))

# ---- picture
fig, ax = plt.subplots(6, 1, figsize=(18, 9), sharex=True)
for a, k, c in zip(ax, ("rms", "drums", "bass", "vocal", "other", "bright"), ("#e8a33d", "#e05040", "#8050d0", "#40b0d0", "#50c080", "#c0c0c0")):
    a.fill_between(t_grid, gaussian_filter1d(envs[k], 25), color=c); a.set_ylabel(k); a.set_ylim(0, 1); a.margins(x=0)
    for s in secs: a.axvline(s["t"], color="k", lw=.8)
for s in secs: ax[0].text(s["t"] + .3, .85, f"{s['name']} b{s['bar']}\n{s['kind']}", fontsize=8)
ax[-1].set_xticks(range(0, int(dur), 10))
plt.tight_layout(); plt.savefig(os.path.join(D, "song-map.png"), dpi=70)
print("done:", len(secs), "sections,", len(merged), "vocal phrases")
for s in secs: print(s["name"], "bar", s["bar"], "x", s["bars"], f"{s['t']:.1f}s", s["kind"], s["level"], s["trend"], s["parts"], s["energy"])
