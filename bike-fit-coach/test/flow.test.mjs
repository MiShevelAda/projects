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
  'setup=friend&unfixed', 'setup=friend&unfixed&back=30', 'setup=wall&unfixed&back=30', 'setup=trainer&pedal=stop', 'setup=trainer&low',
  'setup=friend&away=20', 'setup=friend&away=20&awayshift=80', 'setup=friend&away=20&awayshift=150', 'setup=wall&helper=visible&away=20&awayshift=150',
  'setup=wall&away=20&awayshift=150', 'pain&setup=wall&pedal=stop', 'pain&setup=trainer&pedal=stop', 'pain&setup=friend&pedal=stop',
  'setup=friend&arrive=frame', 'setup=friend&arrive=still', 'setup=friend&arrive=pedal', 'setup=wall&arrive=pedal',
  'setup=wall&arrive=pedal&ah=braced&miss=1.5', 'setup=trainer&arrive=still&ah=braced&miss=1.5',
  'pain&setup=wall&pedal=none', 'pain&setup=trainer&pedal=none', 'pain&setup=friend&pedal=none', 'pain&setup=wall&fps=2', 'pain&setup=friend&fps=2',
  'setup=wall&pedal=none',
  'setup=friend&helper=visible&away=40&restpose=braced', 'setup=friend&away=60&restpose=braced', 'setup=wall&helper=visible&away=40&restpose=braced',
  'setup=friend&helper=visible&away=40&restpose=braced&awayshift=150'];
for (const q of QUERIES) session(q); // all at once

const TURN = /^Rider: .*turn the pedals/;
const WHO = 'I cannot tell who is on the bike. Tap Stop on the screen, then start again.';
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

test('after a break while holding still, he is found again wherever he gets back on', async () => {
  // The still step invites a break ("Take your time. Get back on when you are ready."). With a friend,
  // or anyone else seen, he was only looked for near where he had been, so back on the bike about
  // 20 cm along (a friend's new grip, the bike rolling) he was never found, and the step said "I still
  // cannot see you" for ever while he sat in plain view.
  for (const q of ['setup=friend&away=20&awayshift=80', 'setup=friend&away=20&awayshift=150', 'setup=wall&helper=visible&away=20&awayshift=150']) {
    const d = await session(q);
    ok(d);
    const seq = d.phases.map(p => p.phase);
    const still = seq.indexOf('still');
    const back = seq.indexOf('mount', still);
    assert.ok(back > still && seq.indexOf('frame', back) > back && seq.indexOf('still', back) > back, `${q}: back to getting on, then the picture and holding still again: ${seq}`);
    assert.ok(!seq.includes('phone', still), `${q}: the phone did not move, so no level step: ${seq}`);
    // He was asked to turn the pedals again, heard it, and was found by it.
    const heard = d.started.filter(x => TURN.test(x.text) && x.t > d.phases[back].t);
    assert.ok(heard.length >= 1, q);
    assert.ok(d.identified > d.phases[back].t, q);
    assert.ok(!d.said.some(s => /cannot tell who is on the bike|I still cannot see you/.test(s)), `${q}: ${d.said.join(' | ')}`);
    assert.ok(d.started.some(x => /^Stop\. Well done, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
    // The one not taken while he was away from his old spot was him: nothing measured was lost to
    // anyone else, so the results do not say someone else in the picture made it less exact.
    assert.ok(!/someone else/.test(d.warn), `${q}: ${d.warn}`);
  }
  // Back where he was: found there, holding still goes on, and nothing is asked again.
  const same = await session('setup=friend&away=20');
  ok(same);
  assert.deepEqual(same.phases.map(p => p.phase).slice(-3), ['still', 'pedal', null]);
  assert.ok(same.said.includes('Take your time. Get back on when you are ready. I will wait.'));
  // Alone in the picture, found anywhere, as before.
  const alone = await session('setup=wall&away=20&awayshift=150');
  ok(alone);
  assert.deepEqual(alone.phases.map(p => p.phase).slice(-3), ['still', 'pedal', null]);
});

test('after a pain warning, stopping the pedals is never met with "keep pedalling"', async () => {
  // Told "If your knee hurts, stop pedalling. I will use what I have.", a rider who stopped used to
  // hear "Keep pedalling" twice first. Now the next line is the pain line, and the step ends 5 s later.
  for (const q of ['pain&setup=wall&pedal=stop', 'pain&setup=trainer&pedal=stop', 'pain&setup=friend&pedal=stop']) {
    const d = await session(q);
    ok(d);
    const i = d.started.findIndex(x => /If your knee hurts, stop pedalling\./.test(x.text));
    assert.ok(i > 0, `${q}: the pain instruction`);
    const after = d.started.slice(i + 1);
    const urge = after.filter(x => /Keep pedalling|Keep going|Pedal again|Slower/.test(x.text));
    assert.deepEqual(urge, [], q);
    assert.equal(after[0].text, 'If it hurts, stop. I will use what I have.', `${q}: ${after.map(x => x.text).join(' | ')}`);
    assert.match(after[1].text, /^Stop\./, q);
    assert.ok(after[1].t - after[0].t <= 6.5, `${q}: ended ${after[1].t - after[0].t} s after the pain line`);
  }
});

test('a helper who comes to the rider\'s hip on a frame the pose model misses him is never measured', async () => {
  // QA round 3. A friend leaning in at the hip with the camera-side hand on the hoods comes within
  // 0.28 of a torso length of the rider, and was taken on the frame the model missed him, then
  // followed for the rest of the session: the held-still reading, or the pedalling, was the friend's.
  // And with a wall or a trainer, nobody else seen yet, a model that missed the rider for over a
  // second while a braced helper came to his hip handed them the track. Now neither is measured, and
  // the results are the rider's.
  const plain = {};
  for (const q of ['setup=friend', 'setup=wall', 'setup=trainer']) plain[q] = (await session(q)).what;
  for (const q of ['setup=friend&arrive=frame', 'setup=friend&arrive=still', 'setup=friend&arrive=pedal', 'setup=wall&arrive=pedal',
    'setup=wall&arrive=pedal&ah=braced&miss=1.5', 'setup=trainer&arrive=still&ah=braced&miss=1.5']) {
    const d = await session(q);
    ok(d);
    assert.equal(d.what, plain[q.split('&')[0]], q);
    assert.ok(d.started.some(x => /^Stop\. Well done, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
    assert.ok(!d.said.some(s => /cannot see the pedals turning/.test(s)), `${q}: ${d.said.join(' | ')}`);
  }
});

test('after a pain warning, pedals never seen turning are never met with "keep pedalling" either', async () => {
  // QA round 3: before the timing starts (he never started because it hurts, or the phone saw too few
  // frames a second to see the turning), the step said "I cannot see the pedals turning. Keep
  // pedalling backwards", twice, then "Pedal again when you are ready". Now: the pain line, then the
  // end 5 s later, saying honestly what it could measure.
  for (const q of ['pain&setup=wall&pedal=none', 'pain&setup=trainer&pedal=none', 'pain&setup=friend&pedal=none', 'pain&setup=wall&fps=2', 'pain&setup=friend&fps=2']) {
    const d = await session(q);
    ok(d);
    const i = d.started.findIndex(x => /If your knee hurts, stop pedalling\./.test(x.text));
    assert.ok(i > 0, `${q}: the pain instruction`);
    const after = d.started.slice(i + 1);
    assert.deepEqual(after.filter(x => /Keep pedalling|Keep going|Pedal again|Slower/.test(x.text)), [], q);
    assert.equal(after[0].text, 'If it hurts, stop. I will use what I have.', `${q}: ${after.map(x => x.text).join(' | ')}`);
    assert.equal(after[1].text, 'Stop. You can relax.', q);
    assert.ok(after[1].t - after[0].t <= 6.5, `${q}: ended ${after[1].t - after[0].t} s after the pain line`);
    assert.match(after[2].text, /^I could not see the pedals turning, so (I can only give you the held-still reading|there is not enough to measure this time)\.$/, q);
  }
  // Without the pain answer, as before: the pedals not seen turning get the reminder.
  const plain = await session('setup=wall&pedal=none');
  ok(plain);
  assert.ok(plain.said.includes('I cannot see the pedals turning. Keep pedalling backwards, slowly and steadily.'));
});

test('a friend who crouches at the bike only while the rider takes his break: he is found again, and nobody is told to stop', async () => {
  // QA round 3. The crouching friend counted as someone new sitting like a rider, so the flow went
  // back to getting on, where he was no longer looked for near where he had been, and both questions
  // were spent while he was off the bike: "I cannot tell who is on the bike. Tap Stop..." while he
  // rested, then no results, or the friend measured. Now he is found back where he was, and questions
  // nobody sat down after lead to no way-out line.
  const plain = { friend: (await session('setup=friend')).what, wall: (await session('setup=wall')).what };
  for (const q of ['setup=friend&helper=visible&away=40&restpose=braced', 'setup=friend&away=60&restpose=braced', 'setup=wall&helper=visible&away=40&restpose=braced',
    'setup=friend&helper=visible&away=40&restpose=braced&awayshift=150']) {
    const d = await session(q);
    ok(d);
    assert.ok(!d.said.includes(WHO), `${q}: ${d.said.join(' | ')}`);
    assert.equal(d.what, plain[q.split('&')[0].slice(6)], q);
    assert.ok(d.started.some(x => /^Stop\. Well done, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
  }
  // Back further along, he sat down after both questions, so he was asked again and found by the pedals.
  const moved = await session('setup=friend&helper=visible&away=40&restpose=braced&awayshift=150');
  const back = moved.phases.findLast(p => p.phase === 'mount').t;
  assert.ok(moved.identified > back, 'identified by the pedals after the break');
});
