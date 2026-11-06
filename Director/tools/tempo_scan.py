"""Which tempo is real? Scores straight beat grids against the drum and bass stems, section by section."""
import os, numpy as np, librosa
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stems", "htdemucs", "Audio")
SR, HOP = 22050, 256
dr = librosa.load(os.path.join(D, "drums.wav"), sr=SR, mono=True)[0]
ba = librosa.load(os.path.join(D, "bass.wav"), sr=SR, mono=True)[0]
n = min(len(dr), len(ba)); dr, ba = dr[:n], ba[:n]
oe = librosa.onset.onset_strength(y=dr, sr=SR, hop_length=HOP)
oe = (oe - oe.mean()) / oe.std()
ft = librosa.frames_to_time(np.arange(len(oe)), sr=SR, hop_length=HOP)
dur = n / SR
def best(a, b, bpms):
    m = (ft >= a) & (ft < b); t, e = ft[m], oe[m]
    out = []
    for bpm in bpms:
        ibi = 60 / bpm; top = -9
        for off in np.arange(0, ibi, .012):
            g = np.arange(a + off, b, ibi)
            top = max(top, float(np.interp(g, t, e).mean()))
        out.append(top)
    return np.array(out)
bpms = np.arange(55, 200, .25)
print("whole song, top tempos:")
sc = best(0, dur, bpms)
for i in np.argsort(sc)[::-1][:1]: pass
pk = [i for i in range(1, len(sc) - 1) if sc[i] >= sc[i - 1] and sc[i] >= sc[i + 1]]
for i in sorted(pk, key=lambda i: -sc[i])[:10]: print(f"  {bpms[i]:.2f} bpm  score {sc[i]:.2f}")
print("by 20 second window (best tempo, score):")
for a in range(0, int(dur) - 19, 20):
    s = best(a, a + 20, bpms)
    idx = sorted([i for i in range(1, len(s) - 1) if s[i] >= s[i - 1] and s[i] >= s[i + 1]], key=lambda i: -s[i])[:3]
    print(f"  {a:3d}s  " + "  ".join(f"{bpms[i]:.1f}:{s[i]:.2f}" for i in idx), " energy", round(float(np.sqrt((dr[a * SR:(a + 20) * SR] ** 2).mean())), 3))
# Peak-to-peak gaps of strong kicks
kick = np.abs(librosa.stft(dr, n_fft=2048, hop_length=HOP))[:7].sum(axis=0)
f = np.maximum(0, np.diff(kick, prepend=kick[0])); f /= np.percentile(f, 99.7)
from scipy.signal import find_peaks
idx, _ = find_peaks(f, height=.4, distance=int(.14 * SR / HOP))
ts = ft[idx]; gaps = np.diff(ts)
h, e = np.histogram(gaps, bins=np.arange(.1, 1.6, .02))
print("kick gaps most common:", [(round(float(e[i]), 2), int(h[i])) for i in np.argsort(h)[::-1][:8]])
print(len(ts), "kicks, first at", ts[:6].round(2))
