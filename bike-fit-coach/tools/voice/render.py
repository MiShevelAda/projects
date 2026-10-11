# Renders lines with Kokoro-82M (kokoro-onnx), voice af_heart, American English, speed 1.0, to WAV.
# Started by build-voice.mjs, one process per worker:
#   python render.py <jobs.json> <worker index> <worker count> <threads>
# jobs.json is a list of {"say": text, "wav": path}; this worker takes every n-th job from its index,
# so the most important lines (first in the list) are done first by all workers together. It prints
# "ok <index> <seconds of audio> <seconds taken>" or "err <index> <message>" for each, one per line.
import json, os, sys, time

MODELS = os.environ.get("KOKORO_MODELS", "/home/user/tts/models")
jobs_path, worker, workers, threads = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])

import onnxruntime as rt
import soundfile as sf
from kokoro_onnx import Kokoro

opts = rt.SessionOptions()
opts.intra_op_num_threads = threads
opts.inter_op_num_threads = 1
sess = rt.InferenceSession(os.path.join(MODELS, "kokoro-v1.0.onnx"), sess_options=opts, providers=["CPUExecutionProvider"])
k = Kokoro.from_session(sess, os.path.join(MODELS, "voices-v1.0.bin"))
print("ready", flush=True)

jobs = json.load(open(jobs_path))
for i in range(worker, len(jobs), workers):
    job = jobs[i]
    t0 = time.time()
    try:
        audio, sr = k.create(job["say"], voice="af_heart", speed=1.0, lang="en-us")
        tmp = job["wav"] + ".part.wav"
        sf.write(tmp, audio, sr)
        os.replace(tmp, job["wav"])
        print("ok", i, round(len(audio) / sr, 3), round(time.time() - t0, 2), flush=True)
    except Exception as e:  # one bad line must not stop the rest
        print("err", i, str(e).replace("\n", " "), flush=True)
