// Whole sessions of the ?sim walk-through, run in Node by test/flow-runner.mjs on a virtual clock:
// the three ways the bike is held, a phone moved without tilting it, a picture check that moving
// the phone never fixes, and what is said on rollers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const runner = new URL('./flow-runner.mjs', import.meta.url).pathname;
const cache = new Map();
// One process per session (the runner replaces the page's globals). Started once, shared by tests.
function session(query) {
  if (!cache.has(query)) cache.set(query, run(process.execPath, [runner, query], { timeout: 120000, maxBuffer: 1 << 26 }).then(r => JSON.parse(r.stdout)));
  return cache.get(query);
}
const QUERIES = ['setup=trainer', 'setup=wall', 'setup=friend', 'setup=friend&slide=70', 'setup=friend&slide=150', 'setup=wall&helper=visible&slide=100',
  'setup=friend&unfixed', 'setup=friend&unfixed&back=30', 'setup=wall&unfixed&back=30', 'setup=trainer&pedal=stop', 'setup=trainer&low'];
for (const q of QUERIES) session(q); // all at once

const TURN = /^Rider: .*turn the pedals/;
const ok = (d) => {
  assert.ok(d.results, `${d.query}: no results, stuck in ${d.phase} after ${d.secs} s. Last lines: ${d.said.slice(-4).join(' | ')}`);
  assert.equal(d.wrongPicks, 0, d.query);
  assert.deepEqual(d.errors, [], d.query);
};

test('each way of holding the bike reaches the results', async () => {
  for (const q of ['setup=trainer', 'setup=wall', 'setup=friend']) {
    const d = await session(q);
    ok(d);
    assert.ok(d.started.some(x => /^Stop\. Well done, you can relax\.$/.test(x.text)), q);
  }
});

test('after a correction, a phone turned or slid without tilting it: the rider is found again', async () => {
  // The rider gets off, moves the phone without tilting it (so the level check never fires) and
  // gets back on further along in the picture. Before the fix, with a friend (or anyone else seen)
  // he was only looked for near where he had been, and the session never got past the picture check.
  for (const q of ['setup=friend&slide=70', 'setup=friend&slide=150', 'setup=wall&helper=visible&slide=100']) {
    const d = await session(q);
    ok(d);
    const seq = d.phases.map(p => p.phase);
    assert.ok(!seq.includes('phone', 1), `${q}: the phone was never tilted, so no level step again: ${seq}`);
    const back = seq.indexOf('mount', seq.indexOf('frame'));
    assert.ok(back > 0 && seq.indexOf('frame', back) > back, `${q}: back to getting on, then the picture again: ${seq}`);
    // He was asked to turn the pedals again, heard it, and was found by it.
    assert.ok(d.started.filter(x => TURN.test(x.text)).length >= 2, q);
    assert.ok(d.identified > d.phases[back].t, q);
    assert.ok(!d.said.some(s => /cannot tell who is on the bike|I have lost you|I still cannot see you/.test(s)), `${q}: ${d.said.join(' | ')}`);
  }
});

test('the turn-the-pedals question is said every time he gets back on, however often', async () => {
  // A picture check that moving the phone does not fix: 3 corrections, 4 times on the bike. The
  // question used to be capped at twice a session, so the 4th time it was never said while the app
  // waited for an answer. Now every question asked was said, and heard.
  const d = await session('setup=friend&unfixed');
  ok(d);
  assert.equal(d.said.filter(s => /^Get off the bike for a moment/.test(s)).length, 3);
  const heard = d.started.filter(x => TURN.test(x.text));
  assert.equal(heard.length, d.asks);
  assert.ok(d.asks >= 4, `asks ${d.asks}`);
  assert.equal(d.said.filter(s => TURN.test(s)).length, d.asks);
  assert.ok(!d.said.some(s => /cannot tell who is on the bike/.test(s)));
  // Each time the picture check starts, the rider had just been asked and found.
  const frames = d.phases.filter(p => p.phase === 'frame').map(p => p.t);
  for (const t of frames) assert.ok(heard.some(x => x.t < t && t - x.t < 15), `no question heard before the picture check at ${t} s`);
});

test('the lines while nobody is on the bike start again each time he gets back on', async () => {
  // He takes 30 s to get back on every time. The lines used to be capped per session, so from the
  // third time on the get-on step said nothing at all.
  for (const q of ['setup=friend&unfixed&back=30', 'setup=wall&unfixed&back=30']) {
    const d = await session(q);
    ok(d);
    const ph = d.phases;
    const waits = ph.map((p, i) => ({ ...p, end: ph[i + 1]?.t ?? Infinity })).filter(p => p.phase === 'mount' && p.end - p.t > 25);
    assert.ok(waits.length >= 3, `${q}: ${waits.length} long waits`);
    for (const w of waits) {
      assert.ok(d.started.some(x => x.t > w.t && x.t < w.end && /^I cannot see you on the bike yet/.test(x.text)), `${q}: silent while waiting from ${w.t} s to ${w.end} s`);
    }
  }
});

test('on rollers: the hand stays on the wall until rolling, and goes back on it before the pedals stop', async () => {
  // Rollers cannot be balanced standing still: start with a hand on the wall, let go once rolling,
  // hand back on the wall to stop (British Cycling, "How to ride rollers"; Train Right).
  for (const q of ['setup=trainer', 'setup=trainer&low']) {
    const d = await session(q);
    ok(d);
    for (const s of d.said.filter(x => /let go/.test(x))) {
      assert.ok(/I will tell you when to let go\./.test(s) || /start pedalling with your hand on the wall, and let go once you are rolling steadily/.test(s), s);
      assert.ok(!/let go[^.]*first/.test(s), s);
    }
    assert.ok(d.said.some(s => /On rollers, start pedalling with your hand on the wall/.test(s)), q);
    const i = d.started.findIndex(x => x.text === 'On rollers, put your hand back on the wall, then stop pedalling.');
    assert.ok(i > 0, q);
    assert.match(d.started[i + 1].text, /^Stop\./, 'said before "Stop", and played in that order');
  }
  // Already stopped: no line about stopping.
  const stopped = await session('setup=trainer&pedal=stop');
  ok(stopped);
  assert.ok(!stopped.said.some(s => /hand back on the wall/.test(s)));
  // Not on rollers: never.
  for (const q of ['setup=wall', 'setup=friend']) assert.ok(!(await session(q)).said.some(s => /rollers/i.test(s)), q);
});
