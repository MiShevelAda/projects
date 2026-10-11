// Round 4, builder C: the drawn demo clips (assets/demo/), placeholders until realistic clips replace
// them. The rule: a demo plays before a move, never during it (the design review, "Live screen"), on
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
// Design choices: the drawn clips are 6 to 8 s at 1280x720 and 214 to 556 KB each; 700 KB a clip
// and 4 MB for the folder keep a first check on a phone connection quick.
const CLIP_MAX = 700 * 1024, ALL_MAX = 4 * 1024 * 1024;

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
  assert.match(tag('demo'), /^<button id="demo" class="demo" type="button" aria-label="Drawn demo\. Tap to skip\."[^>]*hidden>$/);
  const run = html.slice(html.indexOf('<div id="run"'), html.indexOf('<!-- ── the results'));
  assert.ok(run.includes('id="demo"'), 'the demo is part of the camera view');
  assert.match(run, /<button id="demo"[^>]*>\s*<video id="demoVideo"/);
  // The placement loop, in the drawing's box on the placement screen.
  const kf = run.slice(run.indexOf('<div class="keyframe">'), run.indexOf('<div class="placeText">'));
  assert.ok(kf.includes('id="placeVideo"'), 'the placement loop sits in the drawing\'s box');
  // Learn: the setups' rows play their demo when tapped.
  const learn = html.slice(html.indexOf('id="tabLearn"'), html.indexOf('<div class="tabfade"'));
  for (const s of SETUPS) assert.match(learn, new RegExp(`<button id="learn${s[0].toUpperCase()}${s.slice(1)}" class="learnrow" type="button" data-demo="${s}"`), s);
  assert.match(tag('learnDemo'), /aria-label="Drawn demo\. Tap to stop\."/);
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
  for (const s of SETUPS) {
    const r = await session(`setup=${s}`);
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
  const home = await session('setup=wall&then=home');
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
  const r = await session('setup=wall&skipdemo');
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

test('README calls the demos drawn placeholders', async () => {
  const readme = await read('README.md');
  assert.match(readme, /assets\/demo\//);
  assert.match(readme, /drawn placeholders?/i);
});
