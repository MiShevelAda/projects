// Records every line the app can say in the coach's voice, Kokoro-82M's af_heart (DECISIONS.md:
// "First female American is great"), and lists them in assets/voice/manifest.json.
//
//   node tools/voice/build-voice.mjs            record what is missing, drop what is no longer said
//   node tools/voice/build-voice.mjs --check    only report: exit 1 if a line has no recording
//   options: --jobs <n> worker processes (2), --threads <n> per worker (2), --limit <n> record at
//   most n lines this run, --python <path>, KOKORO_MODELS=<folder with kokoro-v1.0.onnx>.
//
// Run it again after changing any spoken words: it records only lines it has not recorded before
// (the file name is a hash of the words the voice says), so a shortened line costs one clip. The
// catalog of lines comes from the code itself (catalog.mjs); test/voice.test.mjs fails while any
// line has no recording. Needs Python with kokoro-onnx (/home/user/tts/.venv on the build machine)
// and ffmpeg. Each clip: AAC in .m4a, 48 kb/s, mono, 24 kHz, made reproducibly (bitexact).

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLIP_NAME, VOICE, catalog, clipFile, sayAs } from './catalog.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'assets/voice');
const MANIFEST = join(OUT, 'manifest.json');
const ENCODING = 'AAC-LC in .m4a, 48 kb/s, mono, 24 kHz';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const CHECK = argv.includes('--check');
const JOBS = Number(opt('jobs', 2)), THREADS = Number(opt('threads', 2)), LIMIT = Number(opt('limit', Infinity));
const PYTHON = opt('python', process.env.KOKORO_PYTHON || '/home/user/tts/.venv/bin/python');

function loadManifest() {
  try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return { clips: [] }; }
}
function writeManifest(clips, units) {
  const pre = new Map(units.map(u => [u.text, u.priority <= 1]));
  const list = [...clips.values()].filter(c => pre.has(c.text)).sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
    .map(c => ({ text: c.text, file: c.file, duration: c.duration, ...(pre.get(c.text) ? { pre: true } : {}) }));
  const doc = { ...VOICE, encoding: ENCODING, note: 'Made by tools/voice/build-voice.mjs. pre: precached by the service worker for a first check offline.', clips: list };
  // One clip a line, so a change of words shows as a change of one line.
  const head = JSON.stringify({ ...doc, clips: [] }).replace(/"clips":\[\]\}$/, '"clips": [');
  writeFileSync(MANIFEST, `${head}\n${list.map(c => JSON.stringify(c)).join(',\n')}\n]}\n`);
  return list;
}
function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number(r.stdout.trim());
  if (r.status !== 0 || !(d > 0)) throw new Error(`ffprobe could not read ${file}: ${r.stderr}`);
  return Math.round(d * 1000) / 1000;
}
function encode(wav, m4a) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '24000',
    '-movflags', '+faststart', '-fflags', '+bitexact', '-flags:a', '+bitexact', m4a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${wav}: ${r.stderr}`);
}

async function main() {
  const t0 = Date.now();
  const cat = catalog();
  mkdirSync(OUT, { recursive: true });
  const have = new Map();
  for (const c of loadManifest().clips || []) if (existsSync(join(OUT, c.file))) have.set(c.text, c);
  const todo = [];
  for (const u of cat.units) {
    const say = sayAs(u.text), file = clipFile(say), got = have.get(u.text);
    if (got && got.file === file) continue;
    if (existsSync(join(OUT, file))) { have.set(u.text, { text: u.text, file, duration: probe(join(OUT, file)) }); continue; }
    todo.push({ text: u.text, say, file, priority: u.priority });
  }
  console.log(`${cat.calls} Voice.say calls, ${cat.lines.length} lines, ${cat.units.length} clips needed, ${cat.units.length - todo.length} recorded, ${todo.length} to record.`);
  if (CHECK) {
    for (const x of todo.slice(0, 40)) console.log(`  missing: ${x.text}`);
    if (todo.length > 40) console.log(`  ... and ${todo.length - 40} more`);
    process.exit(todo.length ? 1 : 0);
  }
  const batch = todo.slice(0, LIMIT);
  if (batch.length) {
    const work = mkdtempSync(join(tmpdir(), 'bfc-voice-'));
    const jobs = batch.map((x, i) => ({ say: x.say, wav: join(work, `${i}.wav`) }));
    writeFileSync(join(work, 'jobs.json'), JSON.stringify(jobs));
    let done = 0, audio = 0, failed = 0;
    const started = Date.now();
    await Promise.all(Array.from({ length: Math.min(JOBS, batch.length) }, (_, w) => new Promise((resolve, reject) => {
      const p = spawn(PYTHON, [fileURLToPath(new URL('./render.py', import.meta.url)), join(work, 'jobs.json'), String(w), String(JOBS), String(THREADS)], { stdio: ['ignore', 'pipe', 'pipe'] });
      let buf = '';
      p.stdout.on('data', (d) => {
        buf += d;
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          const [kind, idx, a, b] = line.split(' ');
          if (kind === 'err') { failed++; console.log(`  failed: ${batch[+idx].text} (${line.slice(line.indexOf(idx) + idx.length + 1)})`); continue; }
          if (kind !== 'ok') continue;
          const x = batch[+idx];
          encode(jobs[+idx].wav, join(OUT, x.file));
          unlinkSync(jobs[+idx].wav);
          have.set(x.text, { text: x.text, file: x.file, duration: probe(join(OUT, x.file)) });
          done++; audio += Number(a);
          if (done % 10 === 0 || done === batch.length) {
            writeManifest(have, cat.units); // progress survives a stopped run
            const rate = (Date.now() - started) / 1000 / done;
            console.log(`  ${done}/${batch.length} recorded, ${audio.toFixed(0)} s of audio, ${rate.toFixed(1)} s per clip, about ${Math.round((batch.length - done) * rate / 60)} min left`);
          }
        }
      });
      p.stderr.on('data', (d) => { const s = String(d); if (!/Warning|warn/i.test(s)) process.stderr.write(s); });
      p.on('error', reject);
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`render.py worker ${w} stopped with code ${code}`))));
    })));
    rmSync(work, { recursive: true, force: true });
    if (failed) console.log(`${failed} lines failed to record.`);
  }
  // Drop what is no longer said: manifest entries for lines not in the catalog, and our clip files
  // that no entry names.
  const list = writeManifest(have, cat.units);
  const keep = new Set(list.map(c => c.file));
  let removed = 0;
  for (const f of readdirSync(OUT)) if (CLIP_NAME.test(f) && !keep.has(f)) { unlinkSync(join(OUT, f)); removed++; }
  const bytes = list.reduce((s, c) => s + readFileSync(join(OUT, c.file)).length, 0);
  const preBytes = list.filter(c => c.pre).reduce((s, c) => s + readFileSync(join(OUT, c.file)).length, 0);
  const missing = cat.units.length - list.length;
  console.log(`${list.length} clips in the manifest (${(bytes / 1e6).toFixed(2)} MB, ${(bytes / list.length / 1e3).toFixed(1)} kB each on average; `
    + `${list.filter(c => c.pre).length} precached, ${(preBytes / 1e6).toFixed(2)} MB), ${removed} old clips removed, ${missing} still to record. ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
