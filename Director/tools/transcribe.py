"""Lyrics with word timing, on this PC's CPU (free). Output: Director/lyrics.json"""
import json, sys
import subprocess
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
pcm = subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
segs, info = m.transcribe(audio, word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
out = []
for s in segs:
    out.append({"t": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                "words": [{"t": round(w.start, 2), "end": round(w.end, 2), "w": w.word.strip()} for w in (s.words or [])]})
    print(f"{s.start:7.2f} {s.text.strip()}", flush=True)
json.dump({"language": info.language, "lines": out}, open(sys.argv[2], "w"), indent=0)
