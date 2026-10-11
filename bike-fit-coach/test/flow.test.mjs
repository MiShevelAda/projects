// Whole sessions of the ?sim walk-through, run in Node by test/flow-runner.mjs on a virtual clock:
// the three ways the bike is held, a phone moved without tilting it, a picture check that moving
// the phone never fixes, and what is said on rollers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { availableParallelism } from 'node:os';

const run = promisify(execFile);
const runner = new URL('./flow-runner.mjs', import.meta.url).pathname;
const cache = new Map();
// One process per session (the runner replaces the page's globals). Started once, shared by tests,
// and no more at a time than the machine has cores: all at once made each one wait for the others.
let busy = 0;
const waiting = [];
const slot = () => (busy < Math.max(2, availableParallelism()) ? (busy++, Promise.resolve()) : new Promise(r => waiting.push(r)));
const free = () => { const next = waiting.shift(); if (next) next(); else busy--; };
function session(query, timeout = 120000) {
  if (!cache.has(query)) {
    cache.set(query, slot().then(() => run(process.execPath, [runner, query], { timeout, maxBuffer: 1 << 26 }))
      .finally(free).then(r => JSON.parse(r.stdout)));
  }
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
  'setup=friend&helper=visible&away=40&restpose=braced&awayshift=150', 'setup=wall&screen=towards',
  // Round 3, builder B: the screen towards the rider for every setup, and a phone rolled 2 degrees.
  'setup=trainer&screen=front', 'setup=friend&screen=front', 'setup=wall&screen=front&low', 'setup=friend&screen=front&helper=visible',
  'setup=wall&roll=2', 'setup=wall&roll=2&noderoll', 'setup=trainer&roll=2&land=right', 'setup=trainer&roll=2&land=right&noderoll', 'setup=trainer',
  'setup=wall&roll=-2&screen=front&land=right&conv=spec', 'setup=wall&roll=-2&screen=front&land=right&conv=spec&noderoll',
  'setup=friend&roll=2&screen=front', 'setup=friend&roll=2&screen=front&noderoll'];
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
    assert.ok(d.started.some(x => /^Stop\. Nice work, you can relax\.$/.test(x.text)), q);
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
    assert.ok(d.started.some(x => /^Stop\. Nice work, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
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
    assert.ok(d.started.some(x => /^Stop\. Nice work, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
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
    assert.ok(d.started.some(x => /^Stop\. Nice work, you can relax\.$/.test(x.text)), `${q}: a full pedalling reading`);
  }
  // Back further along, he sat down after both questions, so he was asked again and found by the pedals.
  const moved = await session('setup=friend&helper=visible&away=40&restpose=braced&awayshift=150');
  const back = moved.phases.findLast(p => p.phase === 'mount').t;
  assert.ok(moved.identified > back, 'identified by the pedals after the break');
});

test('the results sheet: the status of the area in focus, the headline in Title Case, How to Do It, and I Made This Change', async () => {
  // Round 3: a saddle that is too low. The status above the headline is the saddle area's own, the
  // headline is fit.headline's words in Title Case, How to Do It is there (open), and the change
  // card's millimetre stepper starts at the low end of the suggestion; nothing is saved yet.
  const d = await session('setup=trainer&low');
  ok(d);
  assert.equal(d.status, 'Needs attention');
  assert.match(d.what, /^Raise the Saddle About \d+( to \d+)? mm$/);
  assert.equal(d.howTo, 1);
  assert.ok(d.made);
  assert.match(d.what, new RegExp(`About ${d.mm}( |$)`), `${d.what} / ${d.mm}`);
  // Round 3, builder E: one short line under the headline, and the one primary button in the bar at
  // the bottom: Check It Now, with Check Again as a quiet text button.
  assert.match(d.why, /^Your knee bends (too much|a little too much) with the pedal at its lowest point\.$/);
  assert.deepEqual(d.bar, { shown: true, now: true, again: 'plain' });
  // Nothing to change: no How to Do It, no change card, and Good above the headline.
  const ok2 = await session('setup=wall');
  assert.equal(ok2.what, 'Nothing to Change Today');
  assert.equal(ok2.status, 'Good');
  assert.equal(ok2.howTo, 0);
  assert.ok(!ok2.made);
  // Nothing to change: Check Again steps back (tinted), or leads when the sheet asks to film once more.
  assert.equal(ok2.bar.now, false);
  assert.equal(ok2.bar.again, ok2.saved?.stillOut ? 'primary' : 'tinted');
});

test('which way the screen faces is stored with the session and its history entry: away by default', async () => {
  // DECISIONS.md, 2026-10-10: the back camera (Away from me) stays the default until the phone test.
  const away = await session('setup=wall');
  assert.equal(away.screen, 'away');
  assert.equal(away.savedScreen, 'away');
  const towards = await session('setup=wall&screen=towards');
  ok(towards);
  assert.equal(towards.screen, 'towards');
  assert.equal(towards.savedScreen, 'towards');
  // The choice changes nothing in the measuring: the same rider gets the same headline.
  assert.equal(towards.what, away.what);
});

test('the screen towards the rider, for each way of holding the bike: the front camera, eyes ahead, the result on the camera view first', async () => {
  for (const q of ['setup=trainer&screen=front', 'setup=wall&screen=towards', 'setup=friend&screen=front', 'setup=friend&screen=front&helper=visible']) {
    const d = await session(q);
    ok(d);
    assert.equal(d.camera, 'front', q);
    assert.equal(d.savedCamera, 'front', `${q}: stored with the session's history entry`);
    assert.equal(d.cameraInfo?.asked, 'user', `${q}: facingMode user`);
    assert.ok(d.seeWhat, `${q}: the result showed on the camera view, and See What to Do opened the results`);
    assert.ok(['Good', 'Again', 'Bars'].includes(d.runField) || /mm$/.test(d.runField), `${q}: ${d.runField}`);
    assert.ok(d.said.some(s => /, with the screen facing the bike\.$/.test(s)), `${q}: the placement line`);
    assert.ok(d.said.includes('Checking the picture. Stay on. I will tell you if the phone needs to move.'), q);
    assert.ok(d.said.some(s => /^Eyes ahead\. Hold still/.test(s)), `${q}: eyes ahead while holding still`);
    assert.ok(d.said.some(s => /Eyes ahead, I will count for you\.$/.test(s)), `${q}: eyes ahead while pedalling`);
    // Directions in bike words only ("Ten seconds left" and "looks right" are not directions).
    const side = /\b(to|on|towards) the (left|right)\b|\b(left|right)(wards| side| hand)\b|\b(move|turn|lean|step) (left|right)\b/i;
    assert.ok(!d.said.some(s => side.test(s)), `${q}: never left or right: ${d.said.filter(s => side.test(s)).join(' | ')}`);
  }
  // The screen away: the back camera, the lines as before, and the results straight away.
  for (const q of ['setup=trainer', 'setup=wall', 'setup=friend']) {
    const d = await session(q);
    ok(d);
    assert.equal(d.camera, 'rear', q);
    assert.equal(d.savedCamera, 'rear', q);
    assert.equal(d.cameraInfo?.asked, 'environment', q);
    assert.ok(!d.seeWhat, q);
    assert.ok(!d.said.some(s => /Eyes ahead|screen facing the bike|A tick means/.test(s)), q);
    assert.ok(d.said.some(s => /opposite the pedals and facing them\.$/.test(s)), `${q}: the placement line with its details`);
  }
  // A saddle too low: the millimetres on the camera view, the same advice as the results sheet.
  const low = await session('setup=wall&screen=front&low');
  ok(low);
  assert.match(low.runField, /^\d+( to \d+)? mm$/);
  assert.match(low.what, new RegExp(`About ${low.runField.replace(' mm', '')} mm$`));
});

test('a phone rolled 2 degrees reads the same back and knee angles as a level one, for both cameras and both sideways positions', async () => {
  // The made-up phone is rolled in the picture and in the motion sensor (synth.js rolledPhone), and
  // the app takes the roll out (fit.imageRoll, fit.derotate). &noderoll leaves it in, to show it would
  // cost about 2 degrees on the back angle: the check is not passing by accident.
  const pairs = [['setup=wall', 'setup=wall&roll=2'], ['setup=trainer', 'setup=trainer&roll=2&land=right'],
    ['setup=wall&screen=towards', 'setup=wall&roll=-2&screen=front&land=right&conv=spec'], ['setup=friend&screen=front', 'setup=friend&roll=2&screen=front']];
  for (const [flat, rolled] of pairs) {
    const a = await session(flat), b = await session(rolled), c = await session(`${rolled}&noderoll`);
    for (const d of [a, b, c]) ok(d);
    assert.ok(Math.abs(Math.abs(b.roll) - 2) < 0.01, `${rolled}: roll ${b.roll}`);
    assert.equal(c.roll, 0);
    assert.ok(Math.abs(b.values.torso - a.values.torso) <= 1, `${rolled}: back ${b.values.torso} against ${a.values.torso} level`);
    assert.ok(Math.abs(b.values.kneePedal - a.values.kneePedal) <= 1.5, `${rolled}: knee ${b.values.kneePedal} against ${a.values.kneePedal}`);
    assert.ok(Math.abs(c.values.torso - a.values.torso) >= 1.5, `${rolled}&noderoll: back ${c.values.torso} against ${a.values.torso}`);
    assert.equal(b.what, a.what, rolled);
  }
});

// ── Round 3, builder C: the customer research's flow changes (cx-research/REPORT.md) ───────────────
// Two sessions in one page view: the runner's then=now|again|home|later runs a second check after the
// first one's results (flow-runner.mjs). They take about twice as long, so they get more time.
const TWICE = ['setup=wall&low&then=now&nudge', 'setup=trainer&low&screen=front&then=now&nudge', 'setup=wall&low&then=now&moved',
  'setup=wall&low&then=now&nomotion&where=yes', 'setup=wall&low&then=now&nomotion&where=no', 'setup=wall&low&then=again',
  'setup=wall&low&then=home&replaced', 'setup=trainer&low&then=home&replaced', 'setup=friend&low&then=home&replaced',
  'setup=friend&low&screen=front&then=home&replaced', 'setup=wall&low&then=home',
  'setup=wall&low=30&mm=30&then=now', 'setup=friend&low=30&mm=30&screen=front&then=now', 'setup=wall&low=30&mm=25&then=now',
  'setup=wall&low&then=later&when=tonight', 'setup=wall&low&then=later&when=pick'];
for (const q of TWICE) session(q, 300000);
const twice = (q) => session(q, 300000);
const LEAVE = 'Leave the phone where it is.';
const NUDGE = 'Check it now. The phone is already in place.';
const TAPE = 'Tape the floor by the chair legs and the back wheel. Next time, line them up.';
const FRAME = 'Both wheels inside the frame, pedals in the middle.';
// Round 4 (SPEC 4.4, item 7): never "done"; the win line says when to check again itself.
const WIN = 'That worked. Your knee is in range now. Ride it, and check again after a few rides.';
const HOLD = /^(Eyes ahead\. )?Hold (it|still)/;
// The words spoken before the first "Hold it" of a session (the customer research, item 7).
const wordsBeforeHold = (d) => {
  const i = d.said.findIndex(l => HOLD.test(l));
  assert.ok(i > 0, `${d.query}: no hold line`);
  return { n: d.said.slice(0, i).join(' ').split(/\s+/).filter(Boolean).length, lines: d.said.slice(0, i) };
};
const sideWords = /\b(to|on|towards) the (left|right)\b|\b(left|right)(wards| side| hand)\b|\b(move|turn|lean|step) (left|right)\b/i;

test('item 1: check the change now with the phone where it is, when the motion sensor says it has not moved', async () => {
  for (const q of ['setup=wall&low&then=now&nudge', 'setup=trainer&low&screen=front&then=now&nudge']) {
    const d = await twice(q);
    ok(d);
    // Before the result is spoken: leave the phone where it is.
    const i = d.said.indexOf(LEAVE);
    assert.ok(i > 0 && /^Raise the saddle about/.test(d.said[i + 1]), `${q}: "${LEAVE}" just before the result: ${d.said.slice(-3).join(' | ')}`);
    // After the millimetres are set: the voice points at Check It Now, once.
    assert.deepEqual(d.nudged, [NUDGE], q);
    assert.ok(!d.whereShown, `${q}: the sensor knows, so no question`);
    // Check It Now starts again at getting on: no placement, no levelling, no "You chose".
    const n = d.next;
    ok(n);
    assert.equal(n.phases[0].phase, 'mount', `${q}: ${n.phases.map(p => p.phase)}`);
    assert.ok(!n.phases.some(p => p.phase === 'phone'), q);
    assert.ok(!n.said.some(l => /^Turn the phone sideways|^Set the phone up|^I will beep|^You chose|^Level\./.test(l)), `${q}: ${n.said.join(' | ')}`);
    // "The phone is already in place." once, not again right after the nudge said it.
    assert.equal(n.said.filter(l => /already in place/.test(l)).length, 1, q);
    assert.ok(wordsBeforeHold(n).n <= 35, `${q}: ${wordsBeforeHold(n).n} words`);
    assert.ok(!n.said.some(l => sideWords.test(l)), q);
  }
  // Check Again, the change not made ("No, film anyway"): the same short way back on the bike.
  const again = await twice('setup=wall&low&then=again');
  assert.ok(again.beforeAsked);
  ok(again.next);
  assert.equal(again.next.phases[0].phase, 'mount');
  assert.equal(again.next.said[0], 'The phone is already in place.');
  // A new check from the Check tab in the same page view, the phone not moved: Getting Ready's Start
  // skips the setup too.
  const home = await twice('setup=wall&low&then=home');
  ok(home.next);
  assert.equal(home.next.phases[0].phase, 'mount');
  // Nothing to change: the phone is not kept in place, and when to check again is said instead.
  // (The made-up held-still knee sits near the top of its range, so its random noise can tip it out:
  // then the sheet asks to film once more, and the phone stays for that film.)
  const fine = await session('setup=wall');
  if (fine.saved.stillOut) {
    assert.ok(fine.said.includes(LEAVE));
    assert.match(fine.said.at(-1), /Film once more to be sure\.$/);
  } else {
    assert.ok(!fine.said.includes(LEAVE));
    assert.match(fine.said.at(-1), /Check again whenever you change the saddle, stem, shoes or cleats\.$/);
  }
});

test('item 1: a phone that moved is set up again, and without motion data one question decides', async () => {
  // The motion sensor says it moved: the placement and the level step again, in the returning words.
  const moved = await twice('setup=wall&low&then=now&moved');
  ok(moved.next);
  assert.ok(!moved.whereShown);
  assert.equal(moved.next.phases[0].phase, 'phone');
  assert.ok(moved.next.said.includes('Set the phone up as last time, on your tape marks.'));
  // No motion reading since the level step: "Is the phone where it was?", said and shown.
  const yes = await twice('setup=wall&low&then=now&nomotion&where=yes');
  assert.ok(yes.whereShown);
  assert.deepEqual(yes.whereSaid, ['Is the phone where it was?']);
  ok(yes.next);
  assert.equal(yes.next.phases[0].phase, 'mount', 'Yes: straight to getting on');
  assert.ok(!yes.next.said.some(l => /already in place/.test(l)), 'he has just said so himself');
  const no = await twice('setup=wall&low&then=now&nomotion&where=no');
  assert.ok(no.whereShown);
  ok(no.next);
  assert.equal(no.next.phases[0].phase, 'phone', 'No: set it up again');
});

test('item 4: a returning rider hears under 60 words before "Hold it", with "You chose" and the safety lines kept', async () => {
  const safety = { wall: /front brake gently on/, trainer: /On rollers, hold on to the wall\./, friend: /^Friend: hold the bike, standing up straight\.$/ };
  // &replaced: the made-up phone is picked up after the first check and put back square on the tape
  // marks, as a rider coming back another day would.
  for (const q of ['setup=wall&low&then=home&replaced', 'setup=trainer&low&then=home&replaced', 'setup=friend&low&then=home&replaced', 'setup=friend&low&screen=front&then=home&replaced']) {
    const d = await twice(q), setup = q.match(/setup=(\w+)/)[1], front = /screen=front/.test(q);
    ok(d);
    ok(d.next);
    // Day one: the full placement, the frame (screen away) and the tape.
    const first = wordsBeforeHold(d);
    assert.ok(first.n > 200, `${q}: day one in full, ${first.n} words`);
    assert.ok(d.said.includes(TAPE), `${q}: the tape on day one`);
    assert.equal(d.said.includes(FRAME), !front, `${q}: the bike framed before anyone gets on, screen away`);
    assert.equal(d.saved?.tape, true, `${q}: remembered`);
    // The next check, from the Check tab: the short run.
    const next = wordsBeforeHold(d.next);
    assert.ok(next.n < 60, `${q}: ${next.n} words: ${next.lines.join(' | ')}`);
    assert.match(next.lines[0], /^You chose: bike /, q);
    assert.equal(next.lines[1], 'If that is wrong, tap Stop now.', q);
    assert.ok(next.lines.includes('Set the phone up as last time, on your tape marks.'), q);
    assert.ok(next.lines.some(l => safety[setup].test(l)), `${q}: the safety line: ${next.lines.join(' | ')}`);
    assert.ok(!d.next.said.includes(TAPE) && !d.next.said.includes(FRAME), `${q}: not again`);
    assert.ok(!d.next.said.some(l => sideWords.test(l)), q);
    assert.ok(!d.allowAgain, `${q}: the permission screen once a page view`);
  }
});

test('item 5: a retest whose saddle change worked is the headline, and the voice says so', async () => {
  // low=30&mm=30: the made-up saddle starts 30 mm low (a knee of about 47.6, past 43 + u, so a 3 mm
  // step), and he moves it 30 mm, back where it started (about 37, inside the band by more than u;
  // round 4: was low=20&mm=25, and 44 is now within u of the edge, which asks for one more film).
  for (const q of ['setup=wall&low=30&mm=30&then=now', 'setup=friend&low=30&mm=30&screen=front&then=now']) {
    const d = await twice(q);
    ok(d);
    assert.match(d.what, /^Raise the Saddle About/, q);
    const n = d.next;
    ok(n);
    assert.equal(n.what, 'Your Saddle Change Worked', q);
    assert.equal(n.status, 'Good', q);
    assert.equal(n.said.at(-1), WIN, `${q}: ${n.said.at(-1)}`);
    assert.ok(!n.said.includes(LEAVE), `${q}: done, so the phone is not kept in place`);
    assert.match(n.why, /moved the right way/, q);
  }
  // The pedalling knee in range but the held-still one not (made-up saddle still 5 mm low): the sheet
  // asks to film once more, so it is not said as a win, and the phone stays where it is.
  const once = await twice('setup=wall&low=30&mm=25&then=now');
  ok(once.next);
  assert.ok(once.next.saved.stillOut);
  assert.notEqual(once.next.what, 'Your Saddle Change Worked');
  assert.ok(!once.next.said.some(l => l.includes('That worked.') || l.includes('Check again whenever')), once.next.said.at(-1));
  assert.ok(once.next.said.includes(LEAVE));
  assert.match(once.next.said.at(-1), /Film once more to be sure\.$/);
});

test('item 6: "When will you move it?" after Later, and a calendar file made on the phone that opens the app', async () => {
  for (const q of ['setup=wall&low&then=later&when=tonight', 'setup=wall&low&then=later&when=pick']) {
    const d = await twice(q);
    ok(d);
    assert.ok(d.whenShown, q);
    assert.deepEqual(d.whenSaid, ['When will you move it?'], q);
    assert.ok(d.ics, `${q}: a file was made`);
    const ics = d.ics.replace(/\r\n /g, '');
    for (const l of ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'BEGIN:VALARM', 'END:VCALENDAR']) assert.ok(ics.includes(l), `${q}: ${l}`);
    assert.match(ics, /\r\nSUMMARY:Bike fit: raise the saddle about \d+( to \d+)? mm\r\n/, q);
    assert.match(ics, /\r\nURL;VALUE=URI:http:\/\/[^\r]+\r\n/, q);
    const start = ics.match(/\r\nDTSTART:(\d{8}T\d{6}Z)\r\n/)[1];
    const at = new Date(start.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/, '$1-$2-$3T$4:$5:$6Z'));
    assert.ok(at > Date.now() - 60000, `${q}: a time still to come, ${start}`);
    assert.match(d.whenDone, /^Calendar reminder made for /, q);
    assert.ok(d.madeAskShown, `${q}: then the change card as before`);
  }
  // Pick a Day starts at tomorrow 10 am, and the file says that time.
  const pick = await twice('setup=wall&low&then=later&when=pick');
  assert.match(pick.pickDefault, /^\d{4}-\d\d-\d\dT10:00$/);
  const [y, mo, da] = pick.pickDefault.slice(0, 10).split('-').map(Number);
  const want = new Date(y, mo - 1, da, 10, 0).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
  assert.ok(pick.ics.includes(`DTSTART:${want}`), want);
});

test('item 7: one focus on the first result: the saddle card, and what waits for it as one closed line', async () => {
  const d = await twice('setup=wall&low=30&mm=30&then=now');
  // First result: the saddle in full; reach and bars, and the other numbers, one line each, closed.
  assert.deepEqual(d.areas.map(a => [a.tag, a.cls, a.open]),
    [['SECTION', 'card area saddle', false], ['DETAILS', 'card oneline area', false], ['DETAILS', 'card oneline area', false]]);
  // Once the saddle is done, reach and bars gets its own card.
  assert.deepEqual(d.next.areas.map(a => [a.tag, a.cls]),
    [['SECTION', 'card area saddle'], ['SECTION', 'card area reach'], ['DETAILS', 'card oneline area']]);
});

test('round 3 fix: after a correction the phone is moved and levelled, and the getting-on screen never shows that correction again', async () => {
  // The picture check says "Phone towards the front wheel", he gets off and moves the phone, which
  // tilts it, so the phone step has him level it again. The card stays during that step, where it
  // helps at the phone. Once it is level the correction has been carried out: the walk back to the
  // bike shows GET ON, never the old MOVE sign (QA round 3, br/front-wall.json at 38.1 s).
  for (const q of ['setup=wall&screen=towards', 'setup=wall', 'setup=trainer&screen=front', 'setup=friend&screen=front', 'setup=trainer']) {
    const d = await session(q);
    ok(d);
    const i = d.phases.findIndex((p, k) => k > 0 && p.phase === 'phone');
    assert.ok(i > 0, `${q}: a correction that tilted the phone: ${d.phases.map(p => p.phase)}`);
    const [from, to] = [d.phases[i].t, d.phases[i + 1].t];
    assert.equal(d.phases[i + 1].phase, 'mount', q);
    const phone = d.views.filter(v => v.t >= from && v.t < to && v.phase === 'phone' && v.layer !== 'place');
    assert.ok(phone.length && phone.every(v => /^Phone towards the (front|back) wheel$/.test(v.card || '')), `${q}: the card stays while he levels it: ${JSON.stringify(phone)}`);
    const end = d.phases[i + 2]?.t ?? Infinity;
    const mount = d.views.filter(v => v.t > to && v.t < end && v.phase === 'mount');
    const stale = mount.filter(v => v.word === 'Move' || /^Phone towards/.test(v.card || ''));
    assert.deepEqual(stale, [], `${q}: the old correction after the re-level`);
    assert.ok(mount.some(v => v.word === 'Get On'), `${q}: GET ON on the walk back: ${JSON.stringify(mount)}`);
  }
});

test('round 3 fix: Skip after a correction also ends its sign: no MOVE on the walk back, GET ON instead', async () => {
  // QA round 3 (qaR/skip-front-relevel.out): after two tilt lines the phone step says "If you cannot
  // get it level, tap Skip on the screen." Tapped there, the level check is skipped, but the phone has
  // been moved and tilted, so the correction was carried out; the getting-on screen showed the old
  // MOVE sign while the voice said "Get back on, same as before." The same with Skip tapped off the
  // bike after a correction (the mount step) or in the picture check: that check is skipped, so its
  // sign goes. Both cameras.
  const Q = ['setup=wall&screen=towards&skiprelevel', 'setup=wall&skiprelevel', 'setup=trainer&screen=front&skiprelevel', 'setup=friend&skiprelevel',
    'setup=wall&screen=towards&skipoff', 'setup=wall&skipoff', 'setup=friend&skipoff', 'setup=wall&screen=towards&skipframe', 'setup=wall&skipframe'];
  const said = { skiprelevel: 'Skipping the level check.', skipoff: 'Skipped. Get back on the bike.', skipframe: 'Skipped. Get back on the bike.' };
  const tapped = { skiprelevel: 'phone', skipoff: 'mount', skipframe: 'frame' };
  const all = await Promise.all(Q.map(q => session(q)));
  for (const d of all) {
    const q = d.query;
    const how = q.match(/skip\w+/)[0];
    ok(d);
    // The tap happened where the query asks, after a correction that was on the screen then.
    assert.ok(d.skip, `${q}: Skip was never tapped: ${d.phases.map(p => `${p.t} ${p.phase}`).join(', ')}`);
    assert.equal(d.skip.phase, tapped[how], q);
    const before = d.views.filter(v => v.t <= d.skip.t).at(-1);
    assert.match(before.card || '', /^Phone towards the (front|back) wheel$/, `${q}: the correction showed when Skip was tapped: ${JSON.stringify(before)}`);
    assert.ok(d.said.includes(said[how]), `${q}: ${d.said.join(' | ')}`);
    // From a few frames after the tap (the screen redraws on the next frame; 0.2 s is a margin chosen
    // for the test) until the rider is held still: the view then showing, and every one after it.
    const at = d.skip.t + 0.2;
    const still = d.phases.find(p => p.t > d.skip.t && p.phase === 'still')?.t ?? Infinity;
    const shown = [d.views.filter(v => v.t <= at).at(-1), ...d.views.filter(v => v.t > at && v.t < still)];
    const stale = shown.filter(v => v.word === 'Move' || /^Phone towards/.test(v.card || ''));
    assert.deepEqual(stale, [], `${q}: the skipped correction still on the screen after Skip at ${d.skip.t} s`);
    assert.ok(shown.some(v => (v.phase === 'mount' || v.phase === 'frame') && v.word === 'Get On'), `${q}: GET ON after Skip: ${JSON.stringify(shown)}`);
  }
});

test('round 3 fix: the results\' primary button saves only the millimetres it names, and its name follows the stepper', async () => {
  // QA round 3: "Check It Now" was the only primary button on a first result, and one tap stored the
  // stepper's value as a change made, though the rider had not touched it ("I haven't even got the
  // spanner out yet"). Now the button says what it saves, and the tap stores exactly that.
  const mmOf = (s) => Number((s || '').match(/(\d+) mm\b/)?.[1]);
  for (const q of ['setup=wall&low&then=now', 'setup=wall&low=30&mm=30&then=now', 'setup=trainer&low&screen=front&then=now&mm=7']) {
    const d = await twice(q);
    ok(d);
    assert.match(d.nowLabel, /^I Moved It \d+ mm, Check Now$/, `${q}: the label names what it saves: ${d.nowLabel}`);
    assert.match(d.nowAria || '', /^I moved the saddle \d+ millimetres\. Save that and check now\.$/, `${q}: VoiceOver: ${d.nowAria}`);
    assert.equal(mmOf(d.nowAria.replace(' millimetres', ' mm')), mmOf(d.nowLabel), q);
    assert.ok(d.madeByNow, `${q}: the tap stored the change`);
    assert.equal(d.madeByNow.mm, mmOf(d.nowLabel), `${q}: stored ${d.madeByNow.mm} mm under a button that said ${d.nowLabel}`);
    const typed = q.match(/mm=(\d+)/)?.[1];
    if (typed) assert.equal(d.madeByNow.mm, Number(typed), `${q}: the label follows what was typed`);
    else assert.equal(String(d.madeByNow.mm), d.mm, `${q}: untouched, the stepper's own value`);
  }
});

test('round 3 fix: a new check asks one question a screen, and the pain question waits for an answer', async () => {
  // From the Check tab: the bike and the screen are remembered, so Next twice; then Next on the pain
  // question before an answer stays there, shows and says why, and No lets the check go on.
  const home = await twice('setup=wall&low&then=home&painwait');
  ok(home);
  assert.ok(home.painWaited, 'Next did not move on without an answer');
  ok(home.next);
  // Said on the question screen, before Getting Ready's Start (round 4: the runner keeps the lines
  // said on the question screens apart, as homeFlow).
  assert.equal(home.homeFlow.said.filter(l => l === 'First, tap No or Yes.').length, 1, home.homeFlow.said.slice(0, 3).join(' | '));
  assert.equal(home.next.phases[0].phase, 'mount', 'and then the check as before');
});

test('round 3 fix: the friend is told one place to stand, the one Getting Ready names, and is thanked rather than told again', async () => {
  for (const q of ['setup=friend&screen=front&helper=visible', 'setup=friend&helper=visible&away=40&restpose=braced']) {
    const d = await session(q);
    ok(d);
    const friend = d.said.filter(l => /^Friend\b/.test(l));
    assert.ok(!friend.some(l => /behind the rider|out of the camera's view/.test(l)), `${q}: ${friend.join(' | ')}`);
    // Every place named is the far side, by the saddle (Getting Ready: "Your friend stands up straight
    // on the far side, by the saddle").
    for (const l of friend.filter(x => /\bside\b/.test(x))) assert.match(l, /far side.*next to the saddle/, l);
    assert.equal(d.said.filter(l => l === 'Friend: stay on the far side, next to the saddle, standing up straight.').length, 1, `${q}: ${friend.join(' | ')}`);
    assert.ok(d.said.includes('Friend, thanks, stay there.'), `${q}: seen again after the re-level, thanked: ${friend.join(' | ')}`);
  }
});

test('round 3 fix: on the 3 m result, nothing to change but one more film asked for is AGAIN, as the voice says, not GOOD', async () => {
  const d = await session('setup=wall&low=10&screen=towards');
  ok(d);
  assert.equal(d.what, 'Nothing to Change Today');
  // The made-up held-still knee at low=10 sits outside its range (the QA run's case); if its random
  // noise ever puts it inside, the result is Fair (round 4: a knee of about 41 is inside 33 to 43 but
  // within u of its edge) and the voice says when to check again.
  if (d.saved.stillOut) {
    assert.equal(d.runField, 'Again', 'the big word');
    assert.match(d.said.at(-1), /Film once more to be sure\.$/);
  } else {
    assert.equal(d.runField, 'Fair');
    assert.ok(!d.said.some(l => /Film once more/.test(l)));
  }
});

// ── Round 4, builder B: the flow of Phase 0 (pro-standard SPEC 4.4 items 3 and 8, and 5.0) ──────────
// flow: the first check goes through the question screens from the Check tab; seed=: a made-up
// history (app.js seedHistory). fitter=, feel=, kit=: the answers tapped (flow-runner.mjs).
const B = ['setup=trainer&flow&then=home', 'setup=wall&flow&then=home', 'setup=friend&flow&then=home',
  'setup=wall&low&flow&seed=rode', 'setup=wall&low&flow&seed=rode&feel=worse', 'setup=wall&low&flow&seed=rode&feel=later', 'setup=wall&low&flow&seed=rode&feel=same',
  'setup=wall&low&flow&seed=worse&feel=worse', 'pain&setup=wall&low&flow&seed=worse&feel=worse', 'setup=wall&low&flow&seed=worse&feel=better',
  'setup=wall&low&flow&fitter=yes&then=home', 'pain&setup=wall&low&flow&fitter=yes', 'setup=wall&low&flow&seed=trend&kit=no', 'setup=wall&low&flow&seed=trend',
  'setup=trainer&low&then=now', 'setup=wall&low=30&mm=30&then=now'];
for (const q of B) session(q, 300000);
const b = (q) => session(q, 300000);
const WARM = { trainer: 'Before I film, ride easily for five minutes. I will wait.', wall: 'If you can, go for a ten-minute ride first.', friend: 'If you can, go for a ten-minute ride first.' };
const KIT = 'Are your cycling shoes and padded shorts on? They change how high you sit.';
const EFFORT = 'Now pedal at the effort of a long ride, where you could still talk.';
const FITTER_Q = 'Has a bike fitter set this bike up for you?';
const FEEL_Q = 'You rode it. Better, the same, or worse?';
const RIDE = 'One change per ride. Ride it first. Next time, tell me how it felt.';
const WORSE = 'It felt worse. Ride it once more, then tell me how it felt. If it is still worse, I will tell you to put it back.';

test('round 4: the warm-up and the kit on Getting Ready, said before filming for each setup; the effort line on a trainer only', async () => {
  for (const setup of ['trainer', 'wall', 'friend']) {
    const d = await b(`setup=${setup}&flow&then=home`);
    ok(d);
    // The first visit: the fitter question once, then the pain question and Getting Ready.
    assert.deepEqual(d.flow.screens, ['setup', 'screen', 'fitter', 'pain', 'ready'], setup);
    assert.ok(d.flow.said.includes(FITTER_Q), `${setup}: ${d.flow.said.join(' | ')}`);
    // Getting Ready says the warm-up for this setup and, the first time, the kit; its rows show both.
    assert.deepEqual(d.flow.said.slice(-2), [WARM[setup], KIT], setup);
    assert.equal(d.flow.warmRow, setup === 'trainer' ? 'Ride easily for 5 minutes first' : 'A 10-minute ride first, if you can', setup);
    assert.equal(d.flow.kitRow, 'Your road bike, cycling shoes and padded shorts', setup);
    assert.equal(d.flow.kitDiff, false, `${setup}: no kit question on a first check`);
    // While filming: the effort of a long ride on a trainer; backwards without load needs none.
    assert.equal(d.said.includes(EFFORT), setup === 'trainer', `${setup}: ${d.said.filter(l => /pedal/i.test(l)).join(' | ')}`);
    if (setup === 'trainer') assert.ok(!d.said.some(l => /easy, normal speed/.test(l)), 'no longer an easy speed');
    // The next visit: the fitter question is remembered, the warm-up said again, the kit not.
    assert.equal(d.homeFlow.fitterStored, 'no', setup);
    assert.deepEqual(d.homeFlow.screens, ['setup', 'screen', 'pain', 'ready'], setup);
    assert.deepEqual(d.homeFlow.said, [WARM[setup]], setup);
    ok(d.next);
    assert.match(d.next.said[0], /^(You chose: bike |The phone is already in place\.)/, `${setup}: the check's own lines start at Start`);
  }
});

test('round 4: "Better, the same, or worse?" when he comes back after riding a change; the next step only after an answer', async () => {
  // seed=rode: he raised the saddle 5 mm three days ago and filmed it straight after; not asked yet.
  const d = await b('setup=wall&low&flow&seed=rode');
  ok(d);
  assert.deepEqual(d.flow.screens, ['setup', 'screen', 'fitter', 'pain', 'feel', 'ready']);
  assert.equal(d.flow.feelSub, 'Since you raised the saddle 5 mm.');
  assert.ok(d.flow.said.includes(FEEL_Q), d.flow.said.join(' | '));
  const made = (h) => h.find(s => s.made)?.made;
  assert.deepEqual(made(d.flow.history).feel.map(f => f.said), ['better'], 'stored with the change');
  // Better: the next step, as usual.
  assert.match(d.what, /^Raise the Saddle About \d+ mm$/);
  assert.ok(d.made, 'the change card');
  for (const q of ['setup=wall&low&flow&seed=rode&feel=same']) assert.match((await b(q)).what, /^Raise the Saddle About/, q);
  // Worse once, or not ridden yet: no next step today. The fixer: not ridden yet says where the knee
  // is, then "ride it first"; worse once says to ride it once more (its own words, not "next time").
  for (const q of ['setup=wall&low&flow&seed=rode&feel=worse', 'setup=wall&low&flow&seed=rode&feel=later']) {
    const w = await b(q);
    ok(w);
    assert.equal(w.made, false, `${q}: no change card`);
    assert.equal(w.status, 'After a ride', `${q}: nothing to change today, so not Needs attention`);
    if (/worse/.test(q)) {
      assert.equal(w.what, 'It Felt Worse. Ride It Once More', q);
      assert.equal(w.said.at(-1), WORSE, q);
      assert.equal(w.saved.wait, 'worse', q);
    } else {
      assert.match(w.what, /^Still (a Little )?(Low|High)\. Ride It First$/, q);
      assert.match(w.said.at(-1), /^Your saddle still looks (a little )?(low|high)\. One change per ride\. Ride it first\. Next time, tell me how it felt\.$/, q);
      assert.equal(w.saved.wait, 'ride', q);
    }
  }
  assert.deepEqual(made((await b('setup=wall&low&flow&seed=rode&feel=worse')).history).feel.map(f => f.said), ['worse']);
  assert.equal(made((await b('setup=wall&low&flow&seed=rode&feel=later')).history).feel, undefined, 'Not Ridden Yet stores nothing');
  // The film straight after a change (I Moved It, Check Now) checks the position, and no next step
  // follows until he has ridden it; it is never asked how it felt (not ridden yet).
  const now = await b('setup=trainer&low&then=now');
  ok(now.next);
  // The fixer (QA2 blocking 5): one title with where the knee is and the rule, a neutral status, and
  // the too-small note in the voice and one tap away, not on the sheet.
  assert.match(now.next.what, /^Still (a Little )?Low\. Ride It First$/);
  assert.equal(now.next.status, 'After a ride');
  assert.equal(now.next.compare, null, 'the too-small note is one tap away');
  assert.match(now.next.said.at(-1), /^That change is too small for me to measure\. .* Your saddle still looks (a little )?low\. One change per ride\. Ride it first\. Next time, tell me how it felt\.$/, 'what the film showed, where the knee is, then ride it first');
  assert.ok(!now.next.said.includes(LEAVE), 'nothing to film again, so the phone need not stay');
  assert.ok(!now.next.said.includes(FEEL_Q));
  // In range after the change: the win, as before.
  assert.equal((await b('setup=wall&low=30&mm=30&then=now')).next.what, 'Your Saddle Change Worked');
});

test('round 4: two "worse" answers on the same change put it back, recorded as undone; with pain, see a bike fitter', async () => {
  // seed=worse: the same change, already "worse" once.
  const d = await b('setup=wall&low&flow&seed=worse&feel=worse');
  ok(d);
  assert.deepEqual(d.flow.screens, ['setup', 'screen', 'fitter', 'pain', 'feel', 'revert', 'ready']);
  assert.equal(d.flow.revertH, 'Put the Saddle Back');
  assert.equal(d.flow.revertSub, 'To your tape mark. It felt worse twice.');
  assert.ok(d.flow.said.includes('It felt worse twice. Put the saddle back to your tape mark.'), d.flow.said.join(' | '));
  assert.ok(!d.flow.said.includes('With pain, see a bike fitter.'));
  const made = d.flow.history.find(s => s.made).made;
  assert.ok(made.undone, 'recorded as undone');
  assert.deepEqual(made.feel.map(f => f.said), ['worse', 'worse']);
  // The same change is not suggested again.
  assert.equal(d.what, 'Leave the Saddle at Your Tape Mark');
  assert.equal(d.made, false);
  const p = await b('pain&setup=wall&low&flow&seed=worse&feel=worse');
  assert.equal(p.flow.revertSub, 'To your tape mark, then see a bike fitter.');
  assert.ok(p.flow.said.includes('With pain, see a bike fitter.'), p.flow.said.join(' | '));
  // Worse, then better: settled, nothing put back, and the next step comes.
  const ok2 = await b('setup=wall&low&flow&seed=worse&feel=better');
  assert.ok(!ok2.flow.screens.includes('revert'));
  assert.match(ok2.what, /^Raise the Saddle About/);
});

test('round 4: a bike a fitter set up is reported, not changed; with pain at most 5 mm and "tell your bike fitter"', async () => {
  const d = await b('setup=wall&low&flow&fitter=yes&then=home');
  ok(d);
  assert.equal(d.flow.fitterStored, 'yes', 'remembered on the phone');
  assert.equal(d.what, 'Your Saddle Looks Low');
  assert.equal(d.made, false, 'no millimetres to save');
  assert.match(d.said.at(-1), /^A bike fitter set up this bike, so I only report\. Your saddle looks low\. If it bothers you, ask your fitter\./);
  assert.ok(!/millimetre/.test(d.said.at(-1)), d.said.at(-1));
  assert.ok(!d.homeFlow.screens.includes('fitter'), 'asked once');
  const p = await b('pain&setup=wall&low&flow&fitter=yes');
  ok(p);
  assert.equal(p.what, 'Raise the Saddle About 5 mm');
  assert.ok(p.said.at(-1).includes('Tell your bike fitter too.'), p.said.at(-1));
});

test('round 4: "Same shoes and shorts as last time?" on a retest; a no keeps the film but does not compare it', async () => {
  // seed=trend: a 10 mm raise saved six days ago, not checked yet.
  const d = await b('setup=wall&low&flow&seed=trend&kit=no');
  ok(d);
  assert.equal(d.flow.kitRow, 'Same shoes and shorts as last time');
  assert.ok(d.flow.kitDiff, 'Different Shoes or Shorts under Start');
  assert.ok(d.flow.said.includes('Same shoes and shorts as last time?'), d.flow.said.join(' | '));
  assert.ok(!d.flow.said.includes(KIT));
  assert.match(d.compare || '', /^Not compared with the film before raising the saddle: other shoes or shorts this time\./);
  assert.equal(d.saved.kit, 'diff', 'kept, marked');
  assert.ok(d.retestCard, 'the change still waits for a film in the same kit');
  // The same kit (Start): compared as before.
  const same = await b('setup=wall&low&flow&seed=trend');
  ok(same);
  assert.ok(!/other shoes or shorts/.test(same.compare || ''), same.compare);
  assert.match(same.compare || '', /^Knee bend \d+° before, \d+° now\./);
  assert.equal(same.saved.kit, undefined);
});

// ── Round 4, the fixer: QA's blocking findings, whole sessions ────────────────────────────────
// repeat=, homes= and made=yes: more checks after the first (flow-runner.mjs).
const FIX = ['setup=wall&low=20&flow&repeat=2', 'setup=trainer&low=20&flow&repeat=2', 'setup=friend&low=20&flow&repeat=2'];
for (const q of FIX) session(q, 400000);

test('fixer, QA1 blocking 1: just outside the range with the held-still reading out, Check Again twice: two films decide, no endless "film once more"', async () => {
  for (const q of FIX) {
    const d = await session(q, 400000);
    ok(d);
    // The first film is close to the edge: one more, the phone where it is.
    assert.equal(d.what, 'Film Once More', q);
    assert.equal(d.said.at(-1), 'Close to the edge. Let me film once more.', q);
    assert.equal(d.more.length, 2, q);
    for (const [i, m] of d.more.entries()) {
      ok(m);
      assert.ok(!/once more/i.test(m.said.at(-1)), `${q}, film ${i + 2}: ${m.said.at(-1)}`);
      assert.equal(m.what, 'Nothing to Change Today', `${q}, film ${i + 2}`);
      assert.equal(m.bar.again, 'tinted', `${q}, film ${i + 2}: the check is done, Check Again is not the primary button`);
      assert.ok(!m.said.includes(LEAVE), `${q}, film ${i + 2}: the phone need not stay`);
    }
    assert.ok(d.more[0].saved.edge != null, `${q}: the second film leaves its reading for the third`);
  }
});

// QA1 blocking 2 and QA2 blocking 6: one "worse", then a new check minutes later from the Check tab.
const FEEL_FIX = ['setup=wall&low&flow&seed=rode&feel=worse&homes=1', 'setup=wall&low&flow&seed=unsaid&made=yes', 'setup=wall&low&flow&seed=unsaid&made=yes&feel=later'];
for (const q of FEEL_FIX) session(q, 400000);
test('fixer, QA1 blocking 2 and QA2 blocking 6: after one "worse", ride it once more; not asked again minutes later, never put back after one ride', async () => {
  const d = await session(FEEL_FIX[0], 400000);
  ok(d);
  assert.ok(d.flow.screens.includes('feel'));
  assert.equal(d.what, 'It Felt Worse. Ride It Once More');
  assert.equal(d.why, 'If it is still worse, I will tell you to put it back.');
  assert.equal(d.said.at(-1), WORSE);
  // Minutes later, from the Check tab: the question is not asked again, and nothing is put back.
  const m = d.more[0];
  ok(m);
  assert.deepEqual(m.homeFlow.screens, ['setup', 'screen', 'pain', 'ready'], 'one answer per ride');
  assert.equal(m.what, 'It Felt Worse. Ride It Once More');
  assert.ok(![...m.homeFlow.said, ...m.said].some(l => /worse twice|Put the saddle back/i.test(l)), [...m.homeFlow.said, ...m.said].join(' | '));
  const made = m.history.find(s => s.made).made;
  assert.equal(made.undone, undefined, 'not put back');
  assert.deepEqual(made.feel.map(f => f.said), ['worse']);
});

// QA2 blocking 4: he made the change after closing the results, rode it, and says so on the Check tab
// ("Before you start: did you ...?", Save and Start). That is the usual path, and it must reach the
// feel question, not "Ride It First" with the question never asked.
test('fixer, QA2 blocking 4: a change saved on the Check tab after riding gets "Better, the same, or worse?", then the next step', async () => {
  const d = await session(FEEL_FIX[1], 400000);
  ok(d);
  assert.match(String(d.flow.madeAsked), /^Before you start: did you raise the saddle about 5 mm\?$/);
  assert.deepEqual(d.flow.screens, ['setup', 'screen', 'fitter', 'pain', 'feel', 'ready']);
  assert.ok(d.flow.said.includes(FEEL_Q), d.flow.said.join(' | '));
  const made = d.history.find(s => s.made).made;
  assert.equal(made.mm, 5);
  assert.deepEqual(made.feel.map(f => f.said), ['better']);
  assert.ok(!/Ride It First|Ride It Once More/.test(d.what), d.what);
  assert.notEqual(d.saved.wait, 'ride');
  // Not ridden yet after all: then ride it first is right.
  const later = await session(FEEL_FIX[2], 400000);
  ok(later);
  assert.ok(later.flow.screens.includes('feel'));
  assert.match(later.what, /Ride It First$/);
});

// QA2 minor: the Put the Saddle Back picture pointed down even when the change put back was lowering it.
for (const q of ['setup=wall&low=-25&flow&seed=worselow&feel=worse']) session(q, 400000);
test('fixer, QA2 minor: putting back a lowered saddle shows an up arrow; a raised one, down', async () => {
  const up = await session('setup=wall&low=-25&flow&seed=worselow&feel=worse', 400000);
  ok(up);
  assert.equal(up.flow.revertH, 'Put the Saddle Back');
  assert.equal(up.flow.revertArrow, 'M244 118V84M232 96l12-13 12 13');
  const down = await b('setup=wall&low&flow&seed=worse&feel=worse');
  assert.equal(down.flow.revertArrow, 'M244 84v34M232 106l12 13 12-13');
});
