// Round 4, builder C: the demo clips (assets/demo/). Drawn placeholders first; since 2026-10-12 the
// moves are computer-made 3D clips of invented riders (look A, Alex's "A is fine") and only the
// placement loop is still drawn. The rule: a demo plays before a move, never during it (the design review, "Live screen"), on
// the rider's first check of a setup (day one) or when he asks to see it again in Learn, muted
// because the app's own voice speaks, and a tap skips it. These check the files, the page and the
// service worker; the sessions are run by test/flow-runner.mjs below.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const run = promisify(execFile);
const runner = new URL('./flow-runner.mjs', import.meta.url).pathname;
const cache = new Map();
const session = (q) => {
  if (!cache.has(q)) cache.set(q, run(process.execPath, [runner, q], { timeout: 120000, maxBuffer: 1 << 26 }).then(r => JSON.parse(r.stdout)));
  return cache.get(q);
};
// Which clip shows for which step, per setup: the phone placed (one loop for every setup), then
// getting on and holding still, then pedalling, the way this setup pedals.
const SETUPS = ['trainer', 'wall', 'friend'];
const FILES = ['place', ...SETUPS.flatMap(s => [`hold-${s}`, `pedal-${s}`])];
// Design choices: the clips are 6 to 8 s at 1280x720 and 384 to 650 KB each; 700 KB a clip and
// 4 MB for the folder keep a first check on a phone connection quick.
const CLIP_MAX = 700 * 1024, ALL_MAX = 4 * 1024 * 1024;
// The clips of invented people are labelled as such on screen (the shot list's rule). Drawn and
// rendered alike are made on a computer, so the one label is true of both.
const LABEL = 'Computer-made demo';
// An MP4's own length: the movie header ('mvhd') holds its time scale and duration.
function mp4Secs(buf) {
  const at = buf.indexOf(Buffer.from('mvhd')), o = at + 8;
  assert.ok(at > 0, 'no movie header');
  return buf[at + 4] === 1 ? Number(buf.readBigUInt64BE(o + 20)) / buf.readUInt32BE(o + 16) : buf.readUInt32BE(o + 12) / buf.readUInt32BE(o + 8);
}

test('the demo files: one muted clip and its poster for each step, only the ones the app uses, and small', async () => {
  const dir = new URL('../assets/demo/', import.meta.url);
  const names = (await readdir(dir)).sort();
  assert.deepEqual(names, FILES.flatMap(f => [`${f}.jpg`, `${f}.mp4`]).sort());
  let total = 0;
  for (const n of names) {
    const s = (await stat(new URL(n, dir))).size;
    total += s;
    assert.ok(s > 10 * 1024, `${n} is real (${s} bytes)`);
    if (n.endsWith('.mp4')) assert.ok(s < CLIP_MAX, `${n}: ${s} bytes`);
    if (n.endsWith('.jpg')) assert.ok(s < 100 * 1024, `${n}: ${s} bytes`);
  }
  assert.ok(total < ALL_MAX, `assets/demo/ is ${total} bytes`);
  // The muted versions: no sound track at all, so nothing can talk over the app's voice. An MP4
  // names each track's handler in its header: 'vide' for the picture, 'soun' for sound.
  for (const f of FILES) {
    const buf = await readFile(new URL(`${f}.mp4`, dir));
    assert.ok(buf.includes(Buffer.from('vide')), `${f}.mp4 has a picture`);
    assert.ok(!buf.includes(Buffer.from('soun')), `${f}.mp4 has a sound track`);
  }
  const app = await read('app.js');
  for (const f of FILES) assert.ok(app.includes(`'${f}'`), `app.js does not use ${f}`);
});

test('each clip\'s length in app.js is the file\'s own, so the guard never cuts a clip short', async () => {
  const app = await read('app.js');
  const secs = new Function(`return ${app.match(/const DEMO_SECS = (\{[^}]*\});/)[1]}`)();
  assert.deepEqual(Object.keys(secs).sort(), [...FILES].sort());
  for (const f of FILES) {
    const len = mp4Secs(await readFile(new URL(`../assets/demo/${f}.mp4`, import.meta.url)));
    assert.ok(Math.abs(len - secs[f]) < 0.05, `${f}: the file is ${len} s, DEMO_SECS says ${secs[f]}`);
  }
});

test('the demos are left to the network like every clip, and their posters are cached for offline', async () => {
  const sw = await read('sw.js');
  const core = sw.slice(sw.indexOf('const CORE = ['), sw.indexOf('];', sw.indexOf('const CORE = [')));
  const media = new RegExp(sw.match(/const MEDIA = \/(.+)\/;/)[1]);
  for (const f of FILES) {
    assert.ok(core.includes(`'./assets/demo/${f}.jpg'`), `${f}.jpg is not in CORE`);
    assert.ok(!core.includes(`${f}.mp4`), `${f}.mp4 is in CORE`);
    assert.ok(media.test(`/projects/bike-fit-coach/assets/demo/${f}.mp4`), `${f}.mp4 is not left to the network`);
  }
});

test('the page: the demo is muted, inline, without controls, and one tap anywhere on it skips it', async () => {
  const html = await read('index.html');
  const tag = (id) => html.match(new RegExp(`<[a-z]+ id="${id}"[^>]*>`))?.[0] || '';
  // The live screen's demo: a button over the camera view, labelled for VoiceOver.
  assert.match(tag('demo'), /^<button id="demo" class="demo" type="button" aria-label="Computer-made demo\. Tap to skip\."[^>]*hidden>$/);
  const run = html.slice(html.indexOf('<div id="run"'), html.indexOf('<!-- ── the results'));
  assert.ok(run.includes('id="demo"'), 'the demo is part of the camera view');
  assert.match(run, /<button id="demo"[^>]*>\s*<span class="vbox"><video id="demoVideo"/);
  // The placement loop, in the drawing's box on the placement screen.
  const kf = run.slice(run.indexOf('<div class="keyframe">'), run.indexOf('<div class="placeText">'));
  assert.ok(kf.includes('id="placeVideo"'), 'the placement loop sits in the drawing\'s box');
  // Learn: the setups' rows play their demo when tapped.
  const learn = html.slice(html.indexOf('id="tabLearn"'), html.indexOf('<div class="tabfade"'));
  for (const s of SETUPS) assert.match(learn, new RegExp(`<button id="learn${s[0].toUpperCase()}${s.slice(1)}" class="learnrow" type="button" data-demo="${s}"`), s);
  assert.match(tag('learnDemo'), /aria-label="Computer-made demo\. Tap to stop\."/);
  // And for the eyes: the label shows on the clip, in the live view and in Learn.
  for (const id of ['demo', 'learnDemo']) {
    const box = html.slice(html.indexOf(`<button id="${id}"`), html.indexOf('</button>', html.indexOf(`<button id="${id}"`)));
    assert.ok(box.includes(`<span class="demoTag" aria-hidden="true">${LABEL}</span>`), `${id} shows "${LABEL}"`);
  }
  assert.ok(!/Drawn demo/.test(html), 'no "Drawn demo" left on the page');
  for (const id of ['demoVideo', 'placeVideo', 'learnVideo']) {
    const v = tag(id);
    assert.ok(v.startsWith('<video'), id);
    for (const a of [' muted', ' playsinline', 'preload="none"']) assert.ok(v.includes(a), `${id}: ${a}`);
    assert.ok(!/ controls| autoplay|src=/.test(v), `${id}: no controls, no autoplay, no clip until the app picks one`);
  }
  assert.match(tag('placeVideo'), / loop/);
  // The app keeps them muted whatever the element says.
  const app = await read('app.js');
  assert.match(app, /v\.muted = true;/);
});

test('day one: the placement loop while the phone is placed, then the moves before getting on, for each setup', async () => {
  // Round 5 (the UX review, item 8): the moves play only when the rider can see them. With the screen
  // away he walks off to the bike as the get-on line starts, so they played to nobody; then only the
  // placement loop plays, while he is at the phone. Learn plays the moves on a tap.
  for (const s of SETUPS) {
    const away = await session(`setup=${s}`);
    assert.ok(away.results, `${s}: reached the results`);
    assert.deepEqual(away.demos.map(x => x.files.join('+')), ['place'], `${s}, screen away`);
    assert.equal(away.demos[0].end.phase, 'phone');
  }
  for (const s of SETUPS) {
    const r = await session(`setup=${s}&screen=towards`);
    assert.ok(r.results, `${s}: reached the results`);
    const d = r.demos;
    assert.deepEqual(d.map(x => x.files.join('+')), ['place', `hold-${s}+pedal-${s}`], s);
    assert.equal(d[0].phase, 'phone');
    assert.equal(d[1].phase, 'mount');
    // Never during a move: each one is over before the step after it begins, and the moves start
    // while the get-on line is being said, the rider still at the phone.
    assert.equal(d[0].end.phase, 'phone', `${s}: the loop stops with the placement screen`);
    assert.equal(d[1].end.phase, 'mount', `${s}: the moves are over before the picture check`);
    assert.ok(['ended', 'left'].includes(d[1].end.why), `${s}: ${d[1].end.why}`);
    assert.match(d[1].line, /get on|Friend: stand/, `${s}: started with ${d[1].line}`);
    const still = r.phases.find(p => p.phase === 'still');
    assert.ok(still && d[1].end.t <= still.t, `${s}: over at ${d[1].end.t}, hold at ${still?.t}`);
    // It adds no time: the step waits for the instruction to be heard anyway.
    assert.ok(d[1].end.t - d[1].t <= 16, `${s}: ${d[1].end.t - d[1].t} s`);
  }
});

test('a returning run shows no demo: the next check from the Check tab, and Check Now from the results', async () => {
  const home = await session('setup=wall&screen=towards&then=home');
  assert.equal(home.demos.length, 2, 'day one has its demos');
  assert.deepEqual(home.next.demos, [], 'never on a returning run');
  const now = await session('setup=trainer&low&then=now');
  assert.deepEqual(now.next.demos, []);
  // A rider who has checked this setup before (the history on this phone) hears the short run and
  // sees no demo either.
  const back = await session('setup=wall&seed=good');
  assert.deepEqual(back.demos, []);
});

test('a tap skips a demo at once, and the check goes on as before', async () => {
  const r = await session('setup=wall&screen=towards&skipdemo');
  assert.ok(r.results);
  assert.ok(r.demoTap, 'the moves demo was tapped');
  const d = r.demos.find(x => x.phase === 'mount');
  assert.ok(d?.end, 'the moves demo was shown and ended');
  assert.equal(d.end.why, 'skipped');
  assert.ok(d.end.t - r.demoTap.t < 0.1, 'gone at the tap');
  assert.equal(r.demoShownAfterTap, false);
  const p = await session('setup=trainer&skipplace');
  assert.ok(p.results);
  assert.equal(p.demos[0].end.why, 'skipped');
  assert.equal(p.placeTap.phase, 'phone');
});

test('asked to see it again: a setup\'s row in Learn plays its moves, muted, and a tap stops it', async () => {
  const r = await session('setup=wall&learn=friend');
  assert.deepEqual(r.learnDemo.files, ['hold-friend', 'pedal-friend']);
  assert.equal(r.learnDemo.shown, true);
  assert.equal(r.learnDemo.muted, true);
  assert.equal(r.learnDemo.afterTap, false, 'a tap stops it');
  assert.equal(r.learnDemo.why, 'skipped');
});

test('README says the moves are computer-made 3D clips of invented riders and the placement loop is drawn', async () => {
  const readme = await read('README.md');
  assert.match(readme, /assets\/demo\//);
  assert.match(readme, /computer-made 3D/i);
  assert.match(readme, /invented/i);
  assert.match(readme, /placement loop[^.]*still drawn/i);
  assert.ok(!/drawn placeholders/i.test(readme), 'README still calls every demo a drawn placeholder');
});
