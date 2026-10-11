// Round 4, builder B: the flow of Phase 0 (pro-standard SPEC 4.4 items 3 and 8, and 5.0), the parts
// that live in fit.js and ui.js. "Better, the same, or worse?" after a change has been ridden, with
// the next step only after an answer; two "worse" answers put the change back; a bike a fitter set
// up is reported, not changed, unless the rider reports pain; a retest in other shoes or shorts is
// kept but not compared. The screens and the voice are in flow.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fit from '../fit.js';
import * as ui from '../ui.js';

const pedal = (knee, more = {}) => ({ strokes: 12, strokesSeen: 12, kneeFlex: knee, torso: 45, elbow: 22, shoulder: 88, ...more });
const ago = (mins, from = new Date('2026-10-11T12:00:00Z')) => new Date(from - mins * 60000).toISOString();
const NOW = new Date('2026-10-11T12:00:00Z');
// A check that suggested raising the saddle 5 mm, and the rider said he did it, mins ago.
const madeEntry = (mins, more = {}) => ({ at: ago(mins + 5), v: 2, setup: 'wall', knee: 47, src: 'pedalling', values: { kneePedal: 47 },
  suggested: { kind: 'saddle', raise: true, mm: [5, 5] }, made: { kind: 'saddle', dir: 1, mm: 5, at: ago(mins), ...more } });
const NEVER = /\b(done|fixed|perfect)\b|rated 9|as good as a (professional )?fit/i;

// ── "Better, the same, or worse?" ───────────────────────────────────────────────────────────────
test('the feel question is due once a change has had time to be ridden, and only until it is answered', () => {
  assert.deepEqual(fit.FEELS, ['better', 'same', 'worse']);
  // Nothing made: nothing to ask.
  assert.equal(fit.feelDue([], NOW), null);
  assert.equal(fit.feelDue([{ at: ago(60), knee: 47, src: 'pedalling' }], NOW), null);
  // Made a minute ago: not ridden yet (the results' Check It Now, or straight back from the sheet).
  assert.equal(fit.feelDue([madeEntry(1)], NOW), null);
  assert.equal(fit.feelDue([madeEntry(fit.RIDE_AFTER / 60 - 1)], NOW), null);
  // Made long enough ago: asked, even when a film has checked the position since.
  const h = [madeEntry(fit.RIDE_AFTER / 60 + 1)];
  assert.equal(fit.feelDue(h, NOW)?.at, h[0].at);
  const checked = [{ at: ago(30), v: 2, setup: 'wall', knee: 44, src: 'pedalling', values: { kneePedal: 44 }, wait: 'ride' }, madeEntry(2 * 24 * 60)];
  assert.equal(fit.feelDue(checked, NOW)?.at, checked[1].at);
  // Better or the same settles it; one "worse" asks again after another ride (fixer: not minutes later);
  // two put it back, and then nothing is asked.
  assert.equal(fit.feelDue([madeEntry(600, { feel: [{ said: 'better', at: ago(10) }] })], NOW), null);
  assert.equal(fit.feelDue([madeEntry(600, { feel: [{ said: 'same', at: ago(10) }] })], NOW), null);
  assert.ok(fit.feelDue([madeEntry(600, { feel: [{ said: 'worse', at: ago(fit.RIDE_AFTER / 60 + 10) }] })], NOW));
  assert.equal(fit.feelDue([madeEntry(600, { feel: [{ said: 'worse', at: ago(20) }, { said: 'worse', at: ago(10) }], undone: ago(10) })], NOW), null);
});

test('the answer is stored with the change; the second "worse" puts the change back, recorded as undone', () => {
  const h = [madeEntry(600)];
  const one = fit.recordFeel(h, h[0].at, 'worse', ago(0));
  assert.equal(one.revert, false);
  assert.deepEqual(one.history[0].made.feel, [{ said: 'worse', at: ago(0) }]);
  assert.equal(h[0].made.feel, undefined, 'the history passed in is not changed');
  const two = fit.recordFeel(one.history, h[0].at, 'worse', ago(-60));
  assert.equal(two.revert, true);
  assert.equal(two.history[0].made.undone, ago(-60));
  assert.equal(two.history[0].made.feel.length, 2);
  // Worse, then better: settled, never put back.
  const mixed = fit.recordFeel(fit.recordFeel(h, h[0].at, 'worse').history, h[0].at, 'better');
  assert.equal(mixed.revert, false);
  assert.equal(mixed.history[0].made.undone, undefined);
  // Only one of the three answers, and only for a change that was made.
  assert.equal(fit.recordFeel(h, h[0].at, 'fine'), null);
  assert.equal(fit.recordFeel([{ at: 'x' }], 'x', 'better'), null);
  // An undone change is no longer waiting to be checked.
  assert.equal(fit.pendingChange(two.history), null);
  assert.ok(fit.pendingChange(one.history));
});

test('one change per ride: after a change, no next step until he has ridden it and said how it felt', () => {
  const unfelt = [madeEntry(2)];
  // The film straight after the change (the results' Check It Now): still low, a 5 mm step would follow.
  const judged = fit.judgeChange(fit.pendingChange(unfelt), { knee: 47, src: 'pedalling', setup: 'wall' });
  const r = fit.withFeel(fit.withRetest(fit.advise(null, pedal(47), 'wall'), judged), unfelt);
  assert.equal(r.change, null, 'no next step yet');
  assert.equal(r.wait, 'ride');
  assert.equal(r.would.kind, 'saddle');
  assert.equal(r.retest.verdict, 'too-small', 'what the film showed is still said');
  const h = fit.headline(r);
  assert.equal(h.what, 'Still a little low. Ride it first'); // fixer: where the knee is, then the rule
  assert.ok(h.short.split(/\s+/).length <= 14, h.short);
  assert.match(fit.spokenSummary(r), /^That change is too small for me to measure\..*One change per ride\. Ride it first\. Next time, tell me how it felt\.$/);
  assert.equal(fit.saddleStep(r), 'Ride it first, then check again.');
  assert.ok(ui.checkDone(r), 'nothing to film again today: the phone need not stay in place');
  assert.equal(ui.resultField(r, { what: h.what }).word, 'Ride');
  // A 10 mm step that fits: "That fits", but never "the next step is below" over a held step.
  const ten = [{ ...madeEntry(2), made: { kind: 'saddle', dir: 1, mm: 10, at: ago(2) }, knee: 52 }];
  const fits = fit.withFeel(fit.withRetest(fit.advise(null, pedal(49), 'wall'), fit.judgeChange(fit.pendingChange(ten), { knee: 49, src: 'pedalling', setup: 'wall' })), ten);
  assert.equal(fits.retest.verdict, 'consistent');
  assert.equal(fits.wait, 'ride');
  assert.ok(!/next step/i.test(fits.retest.text + fits.retest.spoken), fits.retest.text);
  assert.match(fits.retest.text, /That fits\.$/);
  // After "better" or "the same", the next step comes as usual.
  for (const said of ['better', 'same']) {
    const felt = fit.recordFeel(unfelt, unfelt[0].at, said).history;
    const next = fit.withFeel(fit.advise(null, pedal(47), 'wall'), felt);
    assert.equal(next.wait, undefined, said);
    assert.equal(next.change.headline, 'Raise the saddle about 3 mm', said);
  }
  // After one "worse": no change on top of one that felt worse; ride it once more (its own wait, fixer).
  const worse = fit.recordFeel(unfelt, unfelt[0].at, 'worse').history;
  assert.equal(fit.withFeel(fit.advise(null, pedal(47), 'wall'), worse).wait, 'worse');
  // In range after the change: nothing to hold, the win stays the win.
  const win = fit.withFeel(fit.withRetest(fit.advise(null, pedal(38), 'wall'), fit.judgeChange(fit.pendingChange(ten), { knee: 38, src: 'pedalling', setup: 'wall' })), ten);
  assert.ok(ui.retestWin(win));
  assert.equal(win.wait, undefined);
  // The first check ever: nothing to wait for.
  assert.equal(fit.withFeel(fit.advise(null, pedal(47), 'wall'), []).change.kind, 'saddle');
  // A handlebar change waits for the ride too.
  const bars = fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), unfelt);
  assert.equal(bars.wait, 'ride');
  assert.equal(ui.focusArea(bars, fit.areas(bars, fit.measures(bars, pedal(38))))?.key, 'reach');
});

test('after two "worse" answers the same change is never suggested again; another change still can be', () => {
  const back = fit.recordFeel(fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse').history, madeEntry(600).at, 'worse').history;
  const again = fit.withFeel(fit.advise(null, pedal(47), 'wall'), back);
  assert.equal(again.change, null);
  assert.equal(again.wait, 'undone');
  const h = fit.headline(again);
  assert.equal(h.what, 'Leave the saddle at your tape mark');
  assert.match(fit.spokenSummary(again), /It felt worse twice when you made this change, so I will not suggest it again\. A bike fitter can look at why\.$/);
  // Lowering it is another change: it can be suggested.
  assert.equal(fit.withFeel(fit.advise(null, pedal(28), 'wall'), back).change?.raise, false);
});

// ── a bike a fitter set up ──────────────────────────────────────────────────────────────────────
test('a bike a fitter set up: the app reports and gives no millimetres, unless there is pain: then at most 5 mm and tell your fitter', () => {
  const low = fit.withFeel(fit.advise(null, pedal(52), 'wall'), [], { fitter: true });
  assert.equal(low.change, null);
  assert.equal(low.wait, 'fitter');
  const h = fit.headline(low);
  assert.equal(h.what, 'Your saddle looks low');
  assert.equal(h.short, 'A fitter set up this bike, so I only report.');
  assert.ok(!/\d+ ?(mm|millimetres)/.test(h.what + h.short + h.why + fit.spokenSummary(low) + fit.spokenSummary(low, { long: true })), 'no millimetres');
  assert.match(fit.spokenSummary(low), /^A bike fitter set up this bike, so I only report\. Your saddle looks low\. If it bothers you, ask your fitter\.$/);
  assert.equal(fit.headline(fit.withFeel(fit.advise(null, pedal(27), 'wall'), [], { fitter: true })).what, 'Your saddle looks high');
  assert.equal(ui.resultField(low, { what: h.what }).word, 'Fitter');
  // In range: the same result as for anyone.
  assert.equal(fit.withFeel(fit.advise(null, pedal(38), 'wall'), [], { fitter: true }).wait, undefined);
  // With pain: the step, capped at 5 mm, and "tell your bike fitter".
  const pain = fit.withFeel(fit.advise(null, pedal(52), 'wall', { pain: true }), [], { fitter: true, pain: true });
  assert.equal(pain.change.mm[0], 5);
  assert.equal(pain.change.tellFitter, true);
  assert.match(fit.spokenSummary(pain, { pain: true }), /Raise the saddle about 5 millimetres\. Change only that\. When you have moved it, tell me how far\. Tell your bike fitter too\./);
  assert.match(fit.headline(pain).short, /fitter/);
  // A handlebar change on a fitter's bike is reported too.
  const bars = fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), [], { fitter: true });
  assert.equal(bars.wait, 'fitter');
  assert.equal(fit.headline(bars).what, 'The front of your bike looks long and low');
  const areas = fit.areas(bars, fit.measures(bars, pedal(38)));
  assert.equal(areas.find(a => a.key === 'reach').grade, 'red');
  assert.equal(areas.find(a => a.key === 'reach').step, 'Ask your fitter before you change it.');
});

// ── own shoes and shorts ────────────────────────────────────────────────────────────────────────
test('a retest in other shoes or shorts is kept but not compared, and the change keeps waiting', () => {
  const made = { made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 49, src: 'pedalling', setup: 'wall' };
  const j = fit.judgeChange(made, { knee: 40, src: 'pedalling', setup: 'wall', kit: 'diff' });
  assert.equal(j.verdict, 'other-kit');
  assert.equal(j.text, 'Not compared with the film before raising the saddle: other shoes or shorts this time. To see what the change did, film again in the same ones.');
  assert.ok(!/\d/.test(j.spoken));
  const r = fit.withRetest(fit.advise(null, pedal(40), 'wall'), j);
  assert.equal(r.held, undefined, 'never held back for it');
  assert.ok(!ui.retestWin(r), 'not a win: nothing was compared');
  // Kept in the history, and the change still waits for a film in the same kit.
  const h = [{ at: ago(1), v: 2, setup: 'wall', knee: 40, src: 'pedalling', kit: 'diff' }, { ...madeEntry(600) }];
  assert.equal(fit.pendingChange(h)?.at, h[1].at);
  assert.equal(fit.pendingChange([{ ...h[0], kit: undefined }, h[1]]), null);
});

// ── the Check tab and the history ───────────────────────────────────────────────────────────────
test('the Check tab says what waits: ride it, a fitter\'s bike, or a change put back', () => {
  assert.equal(ui.homeSummary({ areas: { saddle: 'red', reach: 'after' }, wait: 'ride' }), 'Ride your last change, then check again.');
  assert.equal(ui.homeSummary({ areas: { saddle: 'red', reach: 'after' }, wait: 'fitter' }), 'A fitter set up your bike, so I only report.');
  assert.equal(ui.homeSummary({ areas: { saddle: 'red', reach: 'after' }, wait: 'undone' }), 'Your last change felt worse twice. A fitter can look at why.');
  const card = ui.latestCards({ areas: { saddle: 'red', reach: 'after' }, values: { kneePedal: 47 }, wait: 'ride', would: { kind: 'saddle', raise: true, mm: [5, 5] } })[0];
  assert.equal(card.step, 'Ride it first, then check again.');
  assert.deepEqual(fit.historyWords({ wait: 'ride', values: { kneePedal: 47 } }), ['ride it first', 'knee 47°']);
  assert.deepEqual(fit.historyWords({ wait: 'fitter' }), ['report only']);
  // Changes You Made says when one was put back.
  const back = fit.recordFeel(fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse').history, madeEntry(600).at, 'worse').history;
  assert.equal(ui.changesList(back)[0].then, 'Felt worse twice. Put back.');
  assert.equal(ui.changesList(fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'better').history)[0].felt, 'Felt better');
});

test('Copy Results says how the last change felt, for a fitter', () => {
  assert.equal(fit.feelReport([]), '');
  assert.equal(fit.feelReport([madeEntry(600)]), '');
  assert.equal(fit.feelReport([madeEntry(600, { feel: [{ said: 'worse', at: ago(20) }, { said: 'better', at: ago(10) }] })]),
    'How the last change felt (raised the saddle 5 mm): worse, then better.');
  const back = fit.recordFeel(fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse').history, madeEntry(600).at, 'worse').history;
  assert.equal(fit.feelReport(back), 'How the last change felt (raised the saddle 5 mm): worse, then worse. Put back to the tape mark.');
});

test('no new words say done, fixed, perfect or rated 9, and the screen lines stay short', () => {
  const unfelt = [madeEntry(2)];
  const back = fit.recordFeel(fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse').history, madeEntry(600).at, 'worse').history;
  const rs = [];
  for (const k of [27, 47, 52]) {
    rs.push(fit.withFeel(fit.advise(null, pedal(k), 'wall'), unfelt), fit.withFeel(fit.advise(null, pedal(k), 'wall'), back),
      fit.withFeel(fit.advise(null, pedal(k), 'wall'), [], { fitter: true }), fit.withFeel(fit.advise(null, pedal(k), 'wall', { pain: true }), [], { fitter: true, pain: true }));
  }
  rs.push(fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), [], { fitter: true }));
  for (const r of rs) {
    const h = fit.headline(r), areas = fit.areas(r, fit.measures(r, pedal(r.knee)));
    const words = [h.what, h.short, h.why, fit.saddleStep(r), ...areas.flatMap(a => [a.why, a.step]), ...[false, true].map(long => fit.spokenSummary(r, { long }))];
    for (const w of words) assert.ok(!NEVER.test(w), w);
    assert.ok(h.short.split(/\s+/).length <= 14, h.short);
    for (const s of fit.spokenSummary(r).split(/(?<=[.?])\s+/)) assert.ok(s.split(/\s+/).length <= 22, s);
  }
});

// ── Round 4, the fixer: QA's blocking findings on the feel question ─────────────────────────────
// QA1, blocking 2: a second "worse" could be given minutes after the first (a new check, or Stop and
// start again), which put the saddle back after one ride and said "it felt worse twice".
test('after an answer, the feel question waits for another ride before it is asked again', () => {
  // Answered "worse" ten minutes ago: not asked again yet, however long ago the change was made.
  assert.equal(fit.feelDue([madeEntry(600, { feel: [{ said: 'worse', at: ago(10) }] })], NOW), null);
  assert.equal(fit.feelDue([madeEntry(600, { feel: [{ said: 'worse', at: ago(fit.RIDE_AFTER / 60 - 1) }] })], NOW), null);
  // Long enough after the answer: asked again.
  assert.ok(fit.feelDue([madeEntry(600, { feel: [{ said: 'worse', at: ago(fit.RIDE_AFTER / 60 + 1) }] })], NOW));
  // The newest answer counts.
  assert.equal(fit.feelDue([madeEntry(6000, { feel: [{ said: 'worse', at: ago(3000) }, { said: 'worse', at: ago(5) }] })], NOW), null);
});

// QA1 blocking 2 and QA2 blocking 6: after one "worse" the result said "Ride it first. Next time, tell
// me how it felt", although he had just told it. It says what the answer means instead.
test('after one "worse": ride it once more, and if it is still worse it goes back; never "next time, tell me how it felt"', () => {
  const worse = fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse', ago(1)).history;
  const r = fit.withFeel(fit.advise(null, pedal(47), 'wall'), worse);
  assert.equal(r.change, null);
  assert.equal(r.wait, 'worse');
  assert.equal(r.would.kind, 'saddle');
  const h = fit.headline(r);
  assert.equal(h.what, 'It felt worse. Ride it once more');
  assert.equal(h.short, 'If it is still worse, I will tell you to put it back.');
  assert.equal(ui.titleCase(h.what), 'It Felt Worse. Ride It Once More');
  const said = fit.spokenSummary(r);
  assert.equal(said, 'It felt worse. Ride it once more, then tell me how it felt. If it is still worse, I will tell you to put it back.');
  for (const w of [said, fit.spokenSummary(r, { long: true }), h.what, h.short, h.why]) {
    assert.ok(!/next time, tell me how it felt|ride it first|worse twice/i.test(w), w);
  }
  assert.equal(fit.saddleStep(r), 'Ride it once more, then check again.');
  assert.ok(ui.checkDone(r));
  assert.equal(ui.resultField(r, { what: h.what }).word, 'Ride');
  assert.equal(ui.homeSummary({ areas: { saddle: 'ride', reach: 'after' }, wait: 'worse' }), 'It felt worse. Ride it once more, then tell me how it felt.');
  assert.deepEqual(fit.historyWords({ wait: 'worse', values: { kneePedal: 47 } }), ['ride it once more', 'knee 47°']);
  // Not Ridden Yet stores nothing: then it is "ride it first", as before.
  assert.equal(fit.withFeel(fit.advise(null, pedal(47), 'wall'), [madeEntry(600)]).wait, 'ride');
  // A handlebar change after one "worse" on the saddle waits the same way.
  assert.equal(fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), worse).wait, 'worse');
});

// QA2, blocking 5: the film straight after a change (I Moved It, Check Now) ended in "Ride It First"
// under a red Needs attention, with a 22-word note, and never said in words whether he is in range.
test('ride it first states where the knee is in the title, under a neutral status, and the voice says it too', () => {
  const unfelt = [madeEntry(2)];
  const at = (k, h = unfelt) => fit.withFeel(fit.withRetest(fit.advise(null, pedal(k), 'wall'), fit.judgeChange(fit.pendingChange(h), { knee: k, src: 'pedalling', setup: 'wall' })), h);
  const low = at(47);
  assert.equal(fit.headline(low).what, 'Still a little low. Ride it first');
  assert.equal(ui.titleCase(fit.headline(low).what), 'Still a Little Low. Ride It First');
  assert.equal(fit.headline(low).short, 'One change per ride. Next time, tell me how it felt.');
  assert.match(fit.spokenSummary(low), /^That change is too small for me to measure\. .* Your saddle still looks a little low\. One change per ride\. Ride it first\. Next time, tell me how it felt\.$/);
  // Far out: "Still low"; the other way from the change (it went past): no "still".
  assert.equal(fit.headline(at(55)).what, 'Still low. Ride it first');
  assert.equal(fit.headline(at(28)).what, 'A little high. Ride it first');
  assert.match(fit.spokenSummary(at(28)), /Your saddle looks a little high\. One change per ride\./);
  // The status is neutral, After a ride, never Needs attention over "don't change anything".
  const areas = fit.areas(low, fit.measures(low, pedal(47)));
  assert.equal(areas[0].grade, 'ride');
  assert.equal(areas[0].status, 'After a ride');
  assert.equal(fit.STATUS.ride, 'After a ride');
  assert.equal(ui.focusArea(low, areas).status, 'After a ride');
  // After one "worse" too.
  const worse = fit.recordFeel([madeEntry(600)], madeEntry(600).at, 'worse', ago(1)).history;
  assert.equal(fit.areas(fit.withFeel(fit.advise(null, pedal(47), 'wall'), worse), fit.measures(fit.advise(null, pedal(47), 'wall'), pedal(47)))[0].status, 'After a ride');
  // A handlebar change that waits for the ride: its area is After a ride too, and the title stays short.
  const bars = fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), unfelt);
  assert.equal(fit.headline(bars).what, 'Ride it first');
  assert.equal(fit.areas(bars, fit.measures(bars, pedal(38))).find(a => a.key === 'reach').status, 'After a ride');
  // A fitter's bike still reads Needs attention for the reach (report only), as before.
  const fb = fit.withFeel(fit.advise(null, pedal(38, { torso: 30, elbow: 5, shoulder: 110 }), 'wall'), [], { fitter: true });
  assert.equal(fit.areas(fb, fit.measures(fb, pedal(38))).find(a => a.key === 'reach').grade, 'red');
});
