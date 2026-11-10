# Records the narration with Kokoro-82M (kokoro-onnx), one WAV per stop. Started by build-audio.mjs:
#   python render.py <jobs.json>
# jobs.json: {"voice", "lang", "speed", "sentence_pause", "clause_pause", "paragraph_gap", "models",
#             "jobs": [{"id", "wav", "paragraphs": [text the voice says, ...]}]}
# Each paragraph is recorded on its own, then joined with paragraph_gap seconds of silence, so the
# narrator breathes between thoughts and the app knows where each paragraph starts (for the
# read-along). Prints one JSON line per stop: {"id", "ok": true, "starts": [s, ...], "seconds"} or
# {"id", "ok": false, "error"}.
import json, os, sys, time

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

cfg = json.load(open(sys.argv[1]))
k = Kokoro(os.path.join(cfg["models"], "model_quantized.onnx"), os.path.join(cfg["models"], "voices.npz"))
print(json.dumps({"ready": True}), flush=True)

for job in cfg["jobs"]:
    t0 = time.time()
    try:
        parts, starts, pos, sr = [], [], 0, 24000
        for i, text in enumerate(job["paragraphs"]):
            audio, sr = k.create(text, voice=cfg["voice"], speed=cfg["speed"], lang=cfg["lang"],
                                 sentence_pause=cfg["sentence_pause"], clause_pause=cfg["clause_pause"])
            if i:
                gap = np.zeros(int(sr * cfg["paragraph_gap"]), dtype=np.float32)
                parts.append(gap)
                pos += len(gap)
            starts.append(round(pos / sr, 2))
            parts.append(audio.astype(np.float32))
            pos += len(audio)
        # Half a second of air at the start and the end, so the first word is not clipped by a
        # phone waking its audio output, and the last one is not cut off.
        pad = np.zeros(int(sr * 0.5), dtype=np.float32)
        audio = np.concatenate([pad, *parts, pad])
        tmp = job["wav"] + ".part.wav"
        sf.write(tmp, audio, sr)
        os.replace(tmp, job["wav"])
        print(json.dumps({"id": job["id"], "ok": True, "starts": [round(s + 0.5, 2) for s in starts],
                          "seconds": round(len(audio) / sr, 2), "took": round(time.time() - t0, 1)}), flush=True)
    except Exception as e:  # one bad stop must not stop the rest
        print(json.dumps({"id": job["id"], "ok": False, "error": str(e)}), flush=True)
