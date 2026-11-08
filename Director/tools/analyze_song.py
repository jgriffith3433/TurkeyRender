"""Song analysis for the music video: beats, bars, sections, band envelopes -> Director/song.json.
Run: uv run --python 3.12 --with librosa --with soundfile Director/tools/analyze_song.py Assets/Song/Audio.mp3 Director/song.json [--bpm 90 --offset 0]
--bpm states the tempo: the grid is straight at that tempo from --offset (default: the best fit), bar 1 on the first beat. For a click, a placeholder, anything whose tempo is known.
"""
import json, sys
import numpy as np, librosa
from scipy.ndimage import uniform_filter1d

args = sys.argv[1:]
def opt(name):
    if name not in args: return None
    i = args.index(name); v = float(args[i + 1]); del args[i:i + 2]; return v
known_bpm, known_offset = opt('--bpm'), opt('--offset')
src, out = args[0], args[1]
y, sr = librosa.load(src, sr=22050, mono=True)
dur = len(y) / sr
hop = 256
y_h, y_p = librosa.effects.hpss(y)
oenv = librosa.onset.onset_strength(y=y_p, sr=sr, hop_length=hop)
tempo, beat_frames = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, tightness=120, units='frames')
tempo = float(np.atleast_1d(tempo)[0])
beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)

# Songs from a DAW or generator keep one tempo; the tracker wobbles. Fit one straight grid and use it if it scores as well.
frame_t = librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop)
def comb(ts): return float(np.interp(ts, frame_t, oenv).mean())
tracked = comb(beats)
best = (0, tempo, 0.0)
for bpm in np.arange(max(40, tempo - 6), tempo + 6, 0.01):
    ibi = 60 / bpm
    for off in np.arange(0, ibi, 0.01):
        ts = np.arange(off, dur, ibi)
        v = comb(ts)
        if v > best[0]: best = (v, float(bpm), float(off))
print(f"tracked comb {tracked:.3f} straight comb {best[0]:.3f} at {best[1]:.2f} bpm offset {best[2]:.3f}")
if known_bpm:
    ibi = 60 / known_bpm
    off = known_offset if known_offset is not None else max(np.arange(0, ibi, 0.005), key=lambda o: comb(np.arange(o, dur, ibi)))
    tempo = float(known_bpm)
    beats = np.arange(off, dur, ibi)
    beat_frames = librosa.time_to_frames(beats, sr=sr, hop_length=hop)
    print(f"tempo stated: {tempo} bpm from {off:.3f}")
elif best[0] >= tracked * 0.92:
    tempo = best[1]
    beats = np.arange(best[2], dur, 60 / tempo)
    beat_frames = librosa.time_to_frames(beats, sr=sr, hop_length=hop)

S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)) ** 2
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
def band(lo, hi):
    e = np.sqrt(S[(freqs >= lo) & (freqs < hi)].sum(axis=0))
    return e
fps = 60
t_grid = np.arange(0, dur, 1 / fps)
t_src = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
def env(e):
    e = np.interp(t_grid, t_src, e)
    p = np.percentile(e, 99.5) or 1
    return np.clip(e / p, 0, 1)
kick_raw, bass_raw, mid_raw, high_raw = band(30, 120), band(120, 400), band(400, 4000), band(4000, 11000)
kick, bass, mid, high = map(env, (kick_raw, bass_raw, mid_raw, high_raw))
rms = env(librosa.feature.rms(y=y, hop_length=hop, frame_length=2048)[0])

# Downbeat: the beat phase (0-3) with the strongest kick accents.
kick_at = np.interp(beats, t_grid, kick)
phase = 0 if known_bpm else int(np.argmax([kick_at[i::4].mean() for i in range(4)]))

# Onsets: separate kick / snare-ish hits for FX timing.
def peaks(e, delta):
    o = librosa.onset.onset_detect(onset_envelope=e, sr=sr, hop_length=hop, units='time', delta=delta, backtrack=False)
    return [round(float(x), 3) for x in o]
onset_all = peaks(oenv, 0.2)
def flux(e):
    f = np.maximum(0, np.diff(e, prepend=e[0])); return f / (np.percentile(f, 99.5) or 1)
def band_peaks(e, thr):
    from scipy.signal import find_peaks
    f = flux(e); idx, _ = find_peaks(f, height=thr, distance=int(0.12 * sr / hop))
    return [round(float(t_src[i]), 3) for i in idx]
onset_kick = band_peaks(kick_raw, 0.35)
onset_snare = band_peaks(band(1500, 6000), 0.35)
onset_hat = band_peaks(band(7000, 11000), 0.35)

# Sections: novelty on beat-synced MFCC + chroma, snapped to bars.
mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=hop)
feat = librosa.util.sync(np.vstack([librosa.util.normalize(mfcc, axis=1), chroma]), beat_frames, aggregate=np.median)
n = feat.shape[1]
barBeats = np.arange(phase, n, 4)
k = max(4, min(14, int(dur / 18)))
bounds = librosa.segment.agglomerative(feat, k)
bounds = sorted(set(int(barBeats[np.argmin(np.abs(barBeats - b))]) for b in bounds if b > 0))
energy_beats = np.interp(beats, t_grid, rms)
secs, starts = [], [0] + bounds
for i, s in enumerate(starts):
    e = starts[i + 1] if i + 1 < len(starts) else len(beats) - 1
    if e <= s: continue
    secs.append({"beat": int(s), "t": round(float(beats[min(s, len(beats) - 1)]), 3),
                 "energy": round(float(energy_beats[s:e].mean()), 3)})
hi, lo = np.percentile([s["energy"] for s in secs], 70), np.percentile([s["energy"] for s in secs], 30)
for i, s in enumerate(secs):
    s["name"] = f"s{i+1}"
    s["feel"] = "high" if s["energy"] >= hi else ("low" if s["energy"] <= lo else "mid")

data = {
    "duration": round(dur, 3), "tempo": round(tempo, 2), "meter": 4, "downbeatPhase": phase,
    "beats": [round(float(b), 3) for b in beats],
    "sections": secs,
    "onsets": {"all": onset_all, "kick": onset_kick, "snare": onset_snare, "hat": onset_hat},
    "envelopes": {"fps": fps, **{k: [round(float(v), 3) for v in a] for k, a in
                  dict(kick=kick, bass=bass, mid=mid, high=high, rms=rms).items()}},
}
json.dump(data, open(out, "w"), separators=(",", ":"))
ib = np.diff(beats)
print(f"dur {dur:.2f}s tempo {tempo:.2f} beats {len(beats)} first {beats[0]:.3f} ibi {ib.mean():.4f}+-{ib.std():.4f} phase {phase}")
print(f"onsets all {len(onset_all)} kick {len(onset_kick)} snare {len(onset_snare)} hat {len(onset_hat)}")
for s in secs: print(s)
