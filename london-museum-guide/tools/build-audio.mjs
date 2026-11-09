// Records the narration for every stop in stops.js and lists it in audio/manifest.json.
//
//   node tools/build-audio.mjs            record the stops whose words changed, drop unused files
//   node tools/build-audio.mjs --check    only report: exit 1 if a stop has no recording
//   node tools/build-audio.mjs --only hope,vault   record just these stops (ids from stops.js)
//   options: --python <path> (default $NHM_PYTHON or tools/.venv/bin/python),
//            --models <folder> (default $NHM_MODELS or tools/.models); tools/README.md sets both up.
//
// A recording's file name is a hash of the voice settings and the exact words spoken, so changing
// one sentence re-records one stop, and a phone can never play an old recording from its cache.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STOPS } from '../stops.js';
import { sayAs } from './say-as.mjs';
import { KINDS, VOICE, clipFile, spoken } from './voice.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'audio');
const MANIFEST = join(OUT, 'manifest.json');
const ENCODING = 'AAC-LC in .m4a, 48 kb/s, mono, 24 kHz, loudness -18 LUFS';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const CHECK = argv.includes('--check');
const ONLY = opt('only', '') ? new Set(opt('only').split(',')) : null;
const PYTHON = opt('python', process.env.NHM_PYTHON || join(ROOT, 'tools/.venv/bin/python'));
const MODELS = opt('models', process.env.NHM_MODELS || join(ROOT, 'tools/.models'));

const loadManifest = () => { try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return { stops: {} }; } };

function encode(wav, m4a) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-map_metadata', '-1', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=9',
    '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '24000', '-movflags', '+faststart',
    '-fflags', '+bitexact', '-flags:a', '+bitexact', m4a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${wav}: ${r.stderr}`);
}

function render(jobs) {
  return new Promise((resolve, reject) => {
    const work = mkdtempSync(join(tmpdir(), 'nhm-audio-'));
    const cfg = join(work, 'jobs.json');
    writeFileSync(cfg, JSON.stringify({ ...VOICE, models: MODELS, jobs: jobs.map((j) => ({ ...j, wav: join(work, `${j.id}.wav`) })) }));
    const p = spawn(PYTHON, ['-I', join(ROOT, 'tools/render.py'), cfg], { stdio: ['ignore', 'pipe', 'inherit'] });
    const done = new Map();
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg.ready) { console.log('voice ready'); continue; }
        if (!msg.ok) { console.error(`  ${msg.id}: FAILED ${msg.error}`); continue; }
        const job = jobs.find((j) => j.id === msg.id);
        encode(join(work, `${msg.id}.wav`), join(OUT, job.file));
        unlinkSync(join(work, `${msg.id}.wav`));
        done.set(msg.id, { file: job.file, seconds: msg.seconds, starts: msg.starts });
        console.log(`  ${msg.id}: ${msg.seconds}s of narration in ${msg.took}s`);
      }
    });
    p.on('close', (code) => { rmSync(work, { recursive: true, force: true }); code === 0 ? resolve(done) : reject(new Error(`render.py exited ${code}`)); });
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const old = loadManifest().stops || {};
  const keep = {}, todo = []; // keep and render results are keyed "<stop id>.<kind>"
  for (const s of STOPS) for (const kind of KINDS) {
    const id = `${s.id}.${kind}`, file = clipFile(s, kind), was = old[s.id]?.[kind];
    if (was?.file === file && existsSync(join(OUT, file)) && !(ONLY && ONLY.has(s.id))) { keep[id] = was; continue; }
    todo.push({ id, stop: s.id, file, paragraphs: spoken(s, kind).map(sayAs) });
  }
  const need = STOPS.length * KINDS.length;
  console.log(`${STOPS.length} stops, ${need} recordings, ${need - todo.length} recorded, ${todo.length} to record.`);
  if (CHECK) { for (const t of todo) console.log(`  missing: ${t.id}`); process.exit(todo.length ? 1 : 0); }
  const batch = ONLY ? todo.filter((t) => ONLY.has(t.stop)) : todo;
  if (batch.length) {
    if (!existsSync(PYTHON)) throw new Error(`No Python with kokoro-onnx at ${PYTHON}. See tools/README.md.`);
    for (const [id, x] of await render(batch)) keep[id] = { ...x, bytes: statSync(join(OUT, x.file)).size };
  }
  // Stops in the order of the walk; files no stop uses any more are deleted.
  const stops = {};
  for (const s of STOPS) for (const kind of KINDS) {
    const x = keep[`${s.id}.${kind}`];
    if (x) (stops[s.id] ||= {})[kind] = kind === 'way' ? { file: x.file, seconds: x.seconds, bytes: x.bytes } : x;
  }
  const used = new Set(Object.values(stops).flatMap((x) => Object.values(x).map((c) => c.file)));
  for (const f of readdirSync(OUT)) if (/^[0-9a-f]{16}\.m4a$/.test(f) && !used.has(f)) unlinkSync(join(OUT, f));
  const voice = { model: VOICE.model, voice: VOICE.voice, lang: VOICE.lang, speed: VOICE.speed };
  writeFileSync(MANIFEST, `${JSON.stringify({ voice, encoding: ENCODING, note: 'Made by tools/build-audio.mjs.', stops }, null, 1)}\n`);
  const missing = STOPS.flatMap((s) => KINDS.filter((k) => !stops[s.id]?.[k]).map((k) => `${s.id}.${k}`));
  const all = Object.values(stops).flatMap((x) => Object.values(x));
  const total = all.reduce((a, x) => a + x.seconds, 0), mb = all.reduce((a, x) => a + x.bytes, 0) / 1e6;
  console.log(`manifest: ${all.length} recordings, ${Math.round(total / 60)} min, ${mb.toFixed(1)} MB${missing.length ? `, MISSING: ${missing.join(', ')}` : ''}`);
  if (missing.length) process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
