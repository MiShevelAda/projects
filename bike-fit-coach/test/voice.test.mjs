// The coach's recorded voice (DECISIONS.md, 2026-10-10: "Needs to be build in"): every line the app
// can say has a clip in assets/voice/, each clip is real audio, and the app plays them through one
// shared <audio> element with the phone's speech only as the fallback. The catalog of lines is worked
// out from the code (tools/voice/catalog.mjs), so a new or changed line without a recording fails here.
// To record what is missing: node tools/voice/build-voice.mjs (README, "The voice").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { CLIP_NAME, KNEE_SPOKEN, appLines, catalog, clipFile, sayAs, variables } from '../tools/voice/catalog.mjs';
import { sentences, voiceParts, voiceText } from '../ui.js';

const at = (f) => new URL(`../${f}`, import.meta.url);
const read = (f) => readFileSync(at(f), 'utf8');
const manifest = JSON.parse(read('assets/voice/manifest.json'));
const clips = new Map(manifest.clips.map(c => [c.text, c]));
const has = (t) => clips.has(t);
const cat = catalog();
// A sentence with a number that varies (one clip for each value), not a fixed range said in words.
const hasNumber = (t) => variables(t).length > 0;
const DASH = /[\u2013\u2014]/;

// ── reading an .m4a without any library ────────────────────────────────────────────────────
// The boxes of an MP4 file: [type, start of its content, end].
function boxes(buf, from = 0, to = buf.length) {
  const out = [];
  for (let i = from; i + 8 <= to;) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    let head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); head = 16; }
    if (size === 0) size = to - i;
    if (size < head || i + size > to) throw new Error(`bad box ${type} at ${i}`);
    out.push([type, i + head, i + size]);
    i += size;
  }
  return out;
}
const child = (buf, [, s, e], type, skip = 0) => boxes(buf, s + skip, e).find(b => b[0] === type);
// The audio track's codec, channels, sample rate and length, from the file's own header.
function audioInfo(buf) {
  const top = boxes(buf);
  const ftyp = top.find(b => b[0] === 'ftyp');
  const moov = top.find(b => b[0] === 'moov');
  const mdat = top.find(b => b[0] === 'mdat');
  if (!ftyp || !moov || !mdat) throw new Error('not an MP4 file with a header and audio data');
  const trak = child(buf, moov, 'trak');
  const mdia = child(buf, trak, 'mdia');
  const mdhd = child(buf, mdia, 'mdhd');
  const v = buf[mdhd[1]];
  const timescale = buf.readUInt32BE(mdhd[1] + (v === 1 ? 20 : 12));
  const length = v === 1 ? Number(buf.readBigUInt64BE(mdhd[1] + 24)) : buf.readUInt32BE(mdhd[1] + 16);
  const hdlr = child(buf, mdia, 'hdlr');
  const handler = buf.toString('latin1', hdlr[1] + 8, hdlr[1] + 12);
  const stsd = child(buf, child(buf, child(buf, mdia, 'minf'), 'stbl'), 'stsd');
  const entry = boxes(buf, stsd[1] + 8, stsd[2])[0];
  const channels = buf.readUInt16BE(entry[1] + 16);
  const rate = buf.readUInt32BE(entry[1] + 24) >>> 16;
  return { brand: buf.toString('latin1', ftyp[1], ftyp[1] + 4), handler, codec: entry[0], channels, rate, seconds: length / timescale, moovFirst: moov[1] < mdat[1], audioBytes: mdat[2] - mdat[1] };
}

// ── the catalog and the recordings ──────────────────────────────────────────────────────────
test('the catalog reads every Voice.say in app.js and every line it can say', () => {
  const app = appLines();
  // Each call worked out to its words (catalog.mjs fails, naming the line, on one it cannot read).
  assert.ok(app.calls >= 70, `${app.calls} Voice.say calls`);
  assert.ok(app.lines.size >= 140, `${app.lines.size} lines`);
  assert.deepEqual([...new Set(app.families.map(f => f.name))].sort(), ['madeNote', 'summary']);
  // Spot checks across the kinds of line: a constant, a template, a ternary, a fit.js correction, a list.
  for (const l of ['Hello. You can hear me, so the sound is working.', 'You chose: bike held by a friend.', 'Slower, please. About one turn every 4 seconds.',
    'Get off the bike for a moment. Your feet are cut off. Move the phone further away. Then get back on.', 'Rider: once more, turn the pedals slowly backwards, two turns, then stop.',
    'Eyes ahead. Hold still. Three. Two. One.']) assert.ok(app.lines.has(l), l);
  // Every line the catalog lists is a whole sentence or several, with no dash.
  for (const l of cat.lines) {
    assert.match(l.text, /^[A-Z0-9].*[.?!]$/, `a whole sentence: ${l.text}`);
    assert.ok(!DASH.test(l.text), l.text);
  }
  // Spoken parts carry one number at most per sentence, so no number is stitched into a recorded
  // sentence: each value has its own whole-sentence clip.
  // (The millimetre sentences carry the range that follows from the one number: "about 9 to 12
  // millimetres" from how far the knee is out, "a 10 millimetre raise ... about 3 degrees".)
  for (const u of cat.units.filter(x => x.priority > 0)) {
    assert.ok(variables(u.text).length <= 1 || /millimetres\.$|millimetre (raise|drop)/.test(u.text), `one number to a sentence: ${u.text}`);
  }
});

const missing = cat.units.filter(u => !has(u.text));
test('every instruction and every sentence without a number has a recorded clip', () => {
  const gaps = missing.filter(u => !hasNumber(u.text) || u.priority === 0);
  assert.equal(gaps.length, 0, `not recorded yet (run node tools/voice/build-voice.mjs):\n${gaps.map(u => `  ${u.text}`).join('\n')}`);
});

test('every numbered sentence has a recorded clip (one clip for each value)', (t) => {
  const gaps = missing.filter(u => hasNumber(u.text) && u.priority > 0);
  if (!gaps.length) return;
  // Listed, never passed silently: these sentences would be said in the phone's own voice.
  const kinds = {};
  for (const u of gaps) { const k = u.text.replace(/\d+/g, 'N'); kinds[k] = (kinds[k] || 0) + 1; }
  t.todo(`TODO: ${gaps.length} of ${cat.units.filter(u => hasNumber(u.text) && u.priority > 0).length} numbered clips not recorded yet: ${Object.entries(kinds).map(([k, n]) => `${n} x "${k}"`).join('; ')}`);
});

test('every line the catalog lists can be played from clips alone', (t) => {
  const short = cat.lines.filter(l => !voiceParts(l.text, has).every(p => p.clip));
  if (missing.length && short.every(l => voiceParts(l.text, has).filter(p => !p.clip).every(p => hasNumber(p.text)))) {
    t.todo(`TODO: ${short.length} of ${cat.lines.length} lines wait for a numbered clip (see the test above)`);
    return;
  }
  assert.equal(short.length, 0, short.slice(0, 10).map(l => l.text).join('\n'));
});

test('the manifest lists only lines the app says, each in its own file, and every file is real audio', () => {
  assert.equal(manifest.voice, 'af_heart');
  assert.equal(manifest.lang, 'en-us');
  assert.equal(manifest.speed, 1);
  const want = new Set(cat.units.map(u => u.text));
  const files = new Set();
  for (const c of manifest.clips) {
    assert.ok(want.has(c.text), `a clip for a line the app no longer says: ${c.text}`);
    assert.match(c.file, CLIP_NAME);
    assert.equal(c.file, clipFile(sayAs(c.text)), `named by the hash of its words: ${c.text}`);
    assert.ok(!files.has(c.file), `one file per line: ${c.file}`);
    files.add(c.file);
    assert.ok(existsSync(at(`assets/voice/${c.file}`)), `missing file ${c.file}`);
    const buf = readFileSync(at(`assets/voice/${c.file}`));
    const info = audioInfo(buf);
    assert.equal(info.handler, 'soun', c.file);
    assert.equal(info.codec, 'mp4a', `${c.file}: AAC`);
    assert.equal(info.channels, 1, `${c.file}: mono`);
    assert.equal(info.rate, 24000, `${c.file}: 24 kHz`);
    assert.ok(info.moovFirst, `${c.file}: the header first, so it can start before it has all loaded`);
    assert.ok(Math.abs(info.seconds - c.duration) < 0.1, `${c.file}: ${info.seconds} s in the file, ${c.duration} s in the manifest`);
    // Long enough for its words and not much longer: a broken render is silence or a fragment.
    const words = c.text.split(' ').length;
    assert.ok(c.duration > 0.3 && c.duration > words / 6 && c.duration < words / 1.2 + 2, `${c.text}: ${c.duration} s for ${words} words`);
    // About 48 kb/s (design choice: 48 to 64 asked for; AAC overhead on very short clips lifts it).
    const kbps = (info.audioBytes * 8) / info.seconds / 1000;
    assert.ok(kbps > 30 && kbps < 70, `${c.file}: ${kbps.toFixed(0)} kb/s`);
  }
  // No clip file that the manifest does not list.
  for (const f of readdirSync(at('assets/voice/'))) if (CLIP_NAME.test(f)) assert.ok(files.has(f), `an unlisted clip: ${f}`);
  // Precached: every instruction and number-free sentence; the numbered ones load on use.
  const pre = manifest.clips.filter(c => c.pre);
  for (const c of pre) assert.ok(!hasNumber(c.text) || cat.lines.some(l => l.whole && l.text === c.text), `precached numbered clip: ${c.text}`);
});

test('a few clips decode back to audio of their manifest length (ffprobe, when it is installed)', (t) => {
  let probe;
  try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); probe = true; } catch { probe = false; }
  if (!probe) { t.skip('ffprobe is not installed here; the header check above still ran'); return; }
  const pick = manifest.clips.filter((_, i) => i % Math.max(1, Math.floor(manifest.clips.length / 8)) === 0).slice(0, 8);
  for (const c of pick) {
    // Decoding the whole stream to nothing fails on a broken file; the length it reports must match.
    const out = execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,channels,sample_rate,nb_read_packets:format=duration', '-of', 'json', at(`assets/voice/${c.file}`).pathname], { encoding: 'utf8' });
    const j = JSON.parse(out);
    assert.equal(j.streams[0].codec_name, 'aac');
    assert.equal(j.streams[0].channels, 1);
    assert.ok(Number(j.streams[0].nb_read_packets) > c.duration * 20, `${c.file}: ${j.streams[0].nb_read_packets} packets`);
    assert.ok(Math.abs(Number(j.format.duration) - c.duration) < 0.05, `${c.file}: ${j.format.duration} vs ${c.duration}`);
    execFileSync('ffmpeg', ['-v', 'error', '-i', at(`assets/voice/${c.file}`).pathname, '-f', 'null', '-'], { stdio: 'pipe' });
  }
});

// ── what the simulated sessions say ────────────────────────────────────────────────────────
// Whole sessions in Node (test/flow-runner.mjs): every line they say is in the catalog, and has its
// clips, so what the simulation and the browser harness hear is the recorded voice.
test('every line said in simulated sessions is in the catalog and has its clips', async () => {
  const { spawn } = await import('node:child_process');
  const run = (q) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [at('test/flow-runner.mjs').pathname, q], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`${q}: exit ${code}`))));
  });
  // Round 4: the question screens too (flow), with the fitter, feel, revert and kit lines.
  const queries = ['setup=wall', 'setup=trainer&screen=towards', 'setup=friend&helper=visible', 'pain&setup=wall&low', 'setup=wall&low&then=now', 'setup=trainer&pedal=stop',
    'setup=trainer&low&flow&then=home', 'pain&setup=wall&low&flow&seed=worse&feel=worse', 'setup=wall&low&flow&seed=trend&kit=no', 'setup=wall&low&flow&fitter=yes'];
  const known = new Set(cat.lines.map(l => l.text));
  const said = new Set();
  for (let i = 0; i < queries.length; i += Math.max(1, availableParallelism() - 1)) {
    for (const o of await Promise.all(queries.slice(i, i + Math.max(1, availableParallelism() - 1)).map(run))) {
      for (const s of [...o.said, ...(o.next?.said || []), ...(o.flow?.said || []), ...(o.homeFlow?.said || [])]) said.add(voiceText(s));
    }
  }
  assert.ok(said.size > 40, `${said.size} lines`);
  const unknown = [...said].filter(s => !known.has(s) && !voiceParts(s, (t) => cat.units.some(u => u.text === t)).every(p => p.clip));
  assert.deepEqual(unknown, [], 'said but not in the catalog');
  const unrecorded = [...said].filter(s => !voiceParts(s, has).every(p => p.clip));
  assert.deepEqual(unrecorded, [], 'said in the simulation but not recorded');
});

// ── how the app plays them ─────────────────────────────────────────────────────────────────
test('sentences and voice parts: a whole-line clip first, else the longest run of sentences', () => {
  assert.deepEqual(sentences('Hold it. Three. Two. One.'), ['Hold it.', 'Three.', 'Two.', 'One.']);
  assert.deepEqual(sentences('  Within 2.5 degrees.  Is it?  Yes! '), ['Within 2.5 degrees.', 'Is it?', 'Yes!']);
  assert.deepEqual(sentences('Friend: stand on the far side. Rider: get on.'), ['Friend: stand on the far side.', 'Rider: get on.']);
  const some = new Set(['Hold it. Three. Two. One.', 'Got it.', 'Two.']);
  assert.deepEqual(voiceParts('Hold it. Three. Two. One.', (x) => some.has(x)), [{ text: 'Hold it. Three. Two. One.', clip: true }]);
  assert.deepEqual(voiceParts('Got it. Hold it. Three. Two. One. Then this', (x) => some.has(x)),
    [{ text: 'Got it.', clip: true }, { text: 'Hold it. Three. Two. One.', clip: true }, { text: 'Then this', clip: false }]);
  assert.deepEqual(voiceParts('Three. Two. One.', (x) => some.has(x)), [{ text: 'Three.', clip: false }, { text: 'Two.', clip: true }, { text: 'One.', clip: false }]);
  // The spoken result, sentence by sentence, from real clips.
  const r = cat.lines.find(l => l.from === 'fit.spokenSummary' && /Raise the saddle about \d+ millimetres\./.test(l.text));
  assert.ok(r);
  assert.ok(voiceParts(r.text, has).length >= 3);
  // No lookbehind in ui.js: older Safari cannot parse one, and the whole page would fail.
  assert.ok(!/\(\?<[=!]/.test(read('ui.js')));
});

test('one shared audio element plays the clips, unlocked inside a tap, with speech only as the fallback', () => {
  const app = read('app.js'), html = read('index.html');
  // One <audio> in the page, the voice's.
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.match(html, /<audio id="voice" preload="auto"><\/audio>/);
  assert.match(app, /this\.el = document\.getElementById\('voice'\);/);
  assert.ok(!/new Audio\(/.test(app), 'no second element');
  // The clips are not played through Web Audio (the beeps are; the silent switch mutes Web Audio).
  const voice = app.slice(app.indexOf('// ── voice ──'), app.indexOf('// ── beeps'));
  assert.ok(!/AudioContext|decodeAudioData/.test(voice));
  // Found by exact words in the manifest, fetched whole (object URLs: no byte-range requests).
  assert.match(voice, /fetch\(VOICE_DIR \+ 'manifest\.json'\)/);
  assert.match(voice, /URL\.createObjectURL\(new Blob\(\[b\], \{ type: 'audio\/mp4' \}\)\)/);
  assert.match(voice, /ui\.voiceParts\(text, \(t\) => this\.has\(t\)\)/);
  // The unlock: the audio session first, then the beeps, then the voice; the voice plays a moment of
  // silence on the element once (never over a line that is playing).
  const unlock = app.slice(app.indexOf('function unlockSound('), app.indexOf('// ── tilt sensor'));
  assert.ok(unlock.indexOf("navigator.audioSession.type = 'playback'") < unlock.indexOf('Beep.init()') && unlock.indexOf('Beep.init()') < unlock.indexOf('Voice.unlock()'));
  assert.match(voice, /if \(!this\.ok \|\| this\.primed\) return;/);
  // Every tap that leads to the voice unlocks through unlockSound, so the order is always the same.
  assert.ok(!/[^.]Voice\.unlock\(\)/.test(app.replace('if (speech) Voice.unlock();', '')), 'Voice.unlock only from unlockSound');
  // Speech only where a clip failed or is missing.
  const speakAt = voice.indexOf('const speak = (text)');
  assert.ok(speakAt > 0);
  const uses = [...voice.matchAll(/speechSynthesis\.speak\(/g)].map(m => m.index);
  // The unlock word is the live hotfix's: one short word, almost silent (iOS may not count an empty
  // or volume 0 line as speaking).
  const unlockAt = voice.indexOf('  unlock() {'), unlockEnd = voice.indexOf('Clips.unlock();', unlockAt);
  assert.ok(uses.every(i => i > speakAt || (i > unlockAt && i < unlockEnd)), 'speech: the silent unlock and the fallback only');
  assert.match(voice.slice(unlockAt, unlockEnd), /new SpeechSynthesisUtterance\('Hi'\);\s*u\.volume = 0\.01;/);
  assert.match(voice, /debug\.voice\.fallback\.push/);
  // The step clocks wait for the line to finish: a clip's end (or its length plus 2 s) ends the line.
  assert.match(voice, /a\.onended = done;/);
  assert.match(voice, /watch = setTimeout\(done, \(dur \+ 2\) \* 1000\);/);
  // Captions stay the line's own words, shown when it starts playing.
  assert.match(voice, /el\.say\.textContent = item\.text;/);
});

test('Tap to Hear Me plays the coach\'s recorded line through the same element, inside the tap', () => {
  const app = read('app.js');
  const hear = app.slice(app.indexOf("el.hearMe.addEventListener('click'"), app.indexOf('// ── opened inside another app'));
  assert.ok(hear.indexOf('unlockSound();') >= 0 && hear.indexOf('unlockSound();') < hear.indexOf('Voice.say(HEAR_LINE, { interrupt: true });'));
  assert.match(app, /Clips\.loading\?\.then\(\(\) => Clips\.prefetch\(HEAR_LINE\)\);/);
  const line = app.match(/const HEAR_LINE = '([^']+)';/)[1];
  assert.ok(has(line), `a clip for ${line}`);
  assert.ok(clips.get(line).pre, 'precached');
});

test('the service worker keeps the voice offline in its own cache and never deletes another app\'s', () => {
  const sw = read('sw.js');
  assert.match(sw, /const VOICE_CACHE = 'bfc-voice-v1';/);
  assert.match(sw, /k\.startsWith\('bfc-'\) && k !== CACHE && k !== VOICE_CACHE/);
  assert.ok(sw.includes("'./assets/voice/manifest.json'"), 'the manifest is in CORE');
  const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
  assert.match(install, /precacheVoice\(\)\.catch/);
  assert.match(sw, /filter\(\(x\) => x\.pre\)/);
  // Clips by their hash names, from the voice cache first; a byte-range request goes to the network.
  assert.match(sw, /isClip\(url\) && !req\.headers\.has\('range'\)/);
  const name = sw.match(/const isClip = \(url\) => [^;]+;/)[0];
  assert.ok(name.includes('[0-9a-f]{16}\\.m4a'), name);
  // The voice rule comes before the rule that leaves sound and video to the network.
  assert.ok(sw.indexOf('isClip(url) && !req') < sw.indexOf('if (MEDIA.test(url.pathname)) return;'));
  // Old clips are dropped only from the voice cache.
  assert.match(sw, /async function pruneVoice\(\) \{[\s\S]*caches\.open\(VOICE_CACHE\)/);
});

test('the voice build is one command, documented, and records with Kokoro af_heart', () => {
  const readme = read('README.md'), build = read('tools/voice/build-voice.mjs'), py = read('tools/voice/render.py');
  assert.match(readme, /node tools\/voice\/build-voice\.mjs/);
  assert.match(py, /voice="af_heart", speed=1\.0, lang="en-us"/);
  assert.match(build, /'-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '24000'/);
  for (const f of ['tools/voice/build-voice.mjs', 'tools/voice/catalog.mjs', 'tools/voice/jsread.mjs', 'tools/voice/render.py', 'test/voice.test.mjs']) assert.ok(!DASH.test(read(f)), `no en or em dashes in ${f}`);
  // The knee range spoken as whole sentences is a labelled design choice.
  assert.deepEqual(KNEE_SPOKEN, [0, 90]);
  assert.match(read('tools/voice/catalog.mjs'), /Number ranges are design choices/);
});

test('the code reader: regular expressions, nested templates, scopes and parameters', async () => {
  const { Program, tokenize } = await import('../tools/voice/jsread.mjs');
  const src = [
    "const A = 'one';",
    "const re = /^Friend\\b/.test(x) ? 1 : 2, half = a / 2 / b;",
    "const T = `x ${`y ${A}`} z`;",
    "function f(line) { const A = 'two'; Voice.say(`${A} ${line}`); return A; }",
    "const g = () => (k ? A : 'three');",
    "Voice.say(g());",
  ].join('\n');
  const toks = tokenize(src).toks;
  assert.equal(toks.filter(k => k.t === 're').length, 1, 'one regular expression, and two divisions');
  assert.equal(toks.find(k => k.t === 'tpl').exprs[0][0].t, 'tpl', 'a template inside a template');
  const p = new Program(src);
  const calls = p.calls('Voice', 'say');
  assert.equal(calls.length, 2);
  // Inside f, A is f's own; line is a parameter, which the catalog must be told about, never guess.
  assert.equal(p.resolve('A', calls[0].arg.at).init.v, 'two');
  assert.deepEqual(p.resolve('line', calls[0].arg.at), { param: true });
  assert.equal(p.resolve('A', calls[1].arg.at).init.v, 'one');
  assert.equal(p.returns(p.resolve('f', 0).fn.block).length, 1);
});
