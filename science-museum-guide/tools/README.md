# Recording the narration

`build-audio.mjs` records every stop in `../stops.js` with Kokoro-82M and writes `../audio/`. It
needs Python 3, ffmpeg, and the model, set up once as below. Everything lands in `tools/.venv` and
`tools/.models`, which git ignores.

## Setting up the voice (once, about 2 minutes)

The model and the voices come from npm, because npm is reachable from the cloud sessions this was
built in while Hugging Face and GitHub downloads are not.

```bash
cd london-museum-guide/tools
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
mkdir -p .models .dl && cd .dl
npm pack kokoro-q8-shards@1.0.0 kokoro-js@1.2.1
tar -xzf kokoro-q8-shards-1.0.0.tgz && mv package shards && tar -xzf kokoro-js-1.2.1.tgz && mv package kokoro-js
cat shards/kokoro-q8.part{0,1,2,3,4,5}.bin > ../.models/model_quantized.onnx
sha256sum ../.models/model_quantized.onnx   # fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478
../.venv/bin/python -I -c "import numpy as np,pathlib; v=pathlib.Path('kokoro-js/voices'); np.savez('../.models/voices.npz', **{n: np.fromfile(v/f'{n}.bin', dtype=np.float32).reshape(-1,1,256) for n in ['bm_george','bm_fable','bf_emma']})"
cd .. && rm -rf .dl
```

- `kokoro-q8-shards` is `model_quantized.onnx` from onnx-community/Kokoro-82M-v1.0-ONNX, split in
  six. Its publisher is not the model's author, so before first use the joined file was checked: the
  hash above matches the one the package states, and the graph contains only standard ONNX
  operators and onnxruntime's built-in quantisation operators, no custom code and no external data.
- `kokoro-js` is published by Xenova (Hugging Face) and carries every Kokoro voice as a `.bin` file;
  the last line packs the British ones into the file kokoro-onnx reads.

## Recording

```bash
npm run audio            # records what changed (about a quarter of real time on 4 cores)
npm run audio:check      # exit 1 if a stop has no recording for its current words
node tools/build-audio.mjs --only hope,vault   # re-record these stops
```

The voice settings are in `voice.mjs`: `bm_george`, speed 0.82, 0.65 s after a sentence, 0.22 s
after a comma, 1.3 s between paragraphs. Changing any of them re-records everything. Each recording
is AAC in .m4a, 48 kb/s mono, loudness-normalised to -18 LUFS so no stop is louder than the next.

## Checking a pronunciation

The voice reads through espeak-ng's British English. To see what it will say for a word:

```bash
.venv/bin/python -I -c "from kokoro_onnx.tokenizer import Tokenizer; t=Tokenizer(); print(t.phonemize('Iguanodon', lang='en-gb'))"
```

If it is wrong, add a respelling to `say-as.mjs` and check the respelling the same way. The printed
guide always shows the real word.
