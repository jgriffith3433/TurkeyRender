using System;
using UnityEngine;

namespace TKShock.MV
{
    /// <summary>The song: beat grid, sections and loudness envelopes baked from Director/song.json.</summary>
    public class SongMap : ScriptableObject
    {
        public float duration, tempo, envFps = 60;
        public int meter = 4, phase;
        public float[] beats = new float[0];
        [Serializable] public class Series { public string name; public float[] v; }
        public Series[] envelopes = new Series[0], hits = new Series[0];
        public string[] secNames; public float[] secTimes;
        public const float WarpHz = 120;
        public float[] warp = new float[0]; // scene time at each step of song time
        public float[] stepHz = new float[0]; // 0, or animate on steps: scene time snaps to this rate here (the camera doesn't)

        /// <summary>Scene time at song time t: where motion, animation and effects are, while the song plays on.</summary>
        public double Warp(double t)
        {
            double w = WarpRaw(t);
            if (stepHz == null || stepHz.Length == 0) return w;
            int i = (int)System.Math.Floor(t * WarpHz);
            if (i < 0 || i >= stepHz.Length || stepHz[i] <= 0) return w;
            return System.Math.Floor(w * stepHz[i]) / stepHz[i];
        }

        /// <summary>Scene time without stepping, for the camera and for clip starts.</summary>
        public double WarpRaw(double t)
        {
            if (warp == null || warp.Length < 2) return t;
            double f = t * WarpHz; int i = (int)System.Math.Floor(f);
            if (i < 0) return t;
            if (i >= warp.Length - 1) return warp[warp.Length - 1] + (t - (warp.Length - 1) / WarpHz);
            return warp[i] + (warp[i + 1] - warp[i]) * (f - i);
        }

        /// <summary>The first song time at scene time s.</summary>
        public double Unwarp(double s)
        {
            if (warp == null || warp.Length < 2) return s;
            if (s <= warp[0]) return s - warp[0];
            int n = warp.Length - 1;
            if (s >= warp[n]) return n / WarpHz + (s - warp[n]);
            int lo = 0, hi = n;
            while (hi - lo > 1) { int m = (lo + hi) / 2; if (warp[m] < s) lo = m; else hi = m; }
            double d = warp[hi] - warp[lo];
            return (lo + (d > 0 ? (s - warp[lo]) / d : 0)) / WarpHz;
        }

        float Ibi => beats.Length > 1 ? (beats[beats.Length - 1] - beats[0]) / (beats.Length - 1) : 0.5f;

        /// <summary>Continuous beat index at time t (2.5 = halfway between beats 2 and 3).</summary>
        public double BeatAt(double t)
        {
            int n = beats.Length;
            if (n < 2) return t / 0.5;
            if (t <= beats[0]) return (t - beats[0]) / Ibi;
            if (t >= beats[n - 1]) return n - 1 + (t - beats[n - 1]) / Ibi;
            int lo = 0, hi = n - 1;
            while (hi - lo > 1) { int m = (lo + hi) / 2; if (beats[m] <= t) lo = m; else hi = m; }
            return lo + (t - beats[lo]) / (beats[hi] - beats[lo]);
        }

        public double TimeOf(double beat)
        {
            int n = beats.Length;
            if (n < 2) return beat * 0.5;
            if (beat <= 0) return beats[0] + beat * Ibi;
            if (beat >= n - 1) return beats[n - 1] + (beat - (n - 1)) * Ibi;
            int i = (int)beat; double f = beat - i;
            return beats[i] + (beats[i + 1] - beats[i]) * f;
        }

        /// <summary>Beat index of bar:beat. Bar 1 beat 1 is the first strong downbeat.</summary>
        public double BeatOfBar(double bar, double beat) => phase + (bar - 1) * meter + (beat - 1);

        public void BarBeat(double t, out int bar, out double beat)
        {
            double b = BeatAt(t) - phase;
            bar = (int)Math.Floor(b / meter) + 1;
            beat = b - (bar - 1) * meter + 1;
        }

        public string Label(double t) { BarBeat(t, out var b, out var q); return $"{b}:{q:0.##}"; }

        public string SectionAt(double t)
        {
            string s = "";
            if (secTimes != null) for (int i = 0; i < secTimes.Length; i++) if (secTimes[i] <= t + 0.01f) s = secNames[i];
            return s;
        }

        float[] Find(Series[] set, string name)
        {
            foreach (var e in set) if (e.name == name) return e.v;
            return null;
        }

        public float[] Hits(string name) => Find(hits, name);

        public float Env(string band, double t)
        {
            var a = Find(envelopes, band) ?? Find(envelopes, "rms");
            if (a == null || a.Length == 0) return 0;
            double f = t * envFps; int i = (int)f;
            if (i < 0) return a[0];
            if (i >= a.Length - 1) return a[a.Length - 1];
            return Mathf.Lerp(a[i], a[i + 1], (float)(f - i));
        }
    }
}
