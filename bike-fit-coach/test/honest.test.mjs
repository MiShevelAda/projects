// Round 5, the fixes from the UX review of round 4 that need no decision from Alex (FOR-ALEX.md,
// section 3, items 1, 5 to 10, the small parts). Each screen says one true thing; the app keeps what it
// promises; the words agree with the code. How a 10 mm retest is judged is unchanged (decision 4 is his),
// and no fourth status word is added (decision 2 is his): only the words change.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fit from '../fit.js';
import * as ui from '../ui.js';
import { readFile } from 'node:fs/promises';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const between = (html, a, b) => { const i = html.indexOf(a); assert.ok(i >= 0, a); const j = html.indexOf(b, i); assert.ok(j > i, b); return html.slice(i, j); };

const pedal = (knee, more = {}) => ({ strokes: 12, strokesSeen: 12, kneeFlex: knee, torso: 45, elbow: 22, shoulder: 88, ...more });
const areasOf = (r, p) => Object.fromEntries(fit.areas(r, fit.measures(r, p)).map(a => [a.key, a]));

// ── item 1: three result screens that said two things at once ──────────────────────────────────
test('a 10 mm retest the camera cannot see says "cannot tell yet", never "did not do what it should have"', () => {
  // The recording's journey 2 (2-low-49): 53 before, 51 after a 10 mm raise, a move of 2 degrees,
  // under SAME_TOL. The verdict and the hold stay as they are (decision 4); the title line agrees.
  const p = pedal(51);
  const r = fit.advise(null, p, 'wall');
  const j = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 53, src: 'pedalling', setup: 'wall' }, { knee: r.knee, src: 'pedalling', setup: 'wall' });
  assert.equal(j.verdict, 'unseen');
  const w = fit.withRetest(r, j);
  assert.equal(w.held, true);
  assert.equal(w.change, null);
  const h = fit.headline(w);
  assert.equal(h.what, 'Film once more');
  assert.doesNotMatch(`${h.short} ${h.why}`, /did not do what it should/);
  assert.match(h.short, /cannot tell yet/);
  // Over every held retest: a title line that says the change failed never sits over a box that says
  // it cannot tell yet, and the other way round.
  for (const mm of [10, 12, 15, 20, 30]) for (let before = 40; before <= 56; before++) for (let now = 40; now <= 56; now++) {
    const rr = fit.advise(null, pedal(now), 'wall');
    const jj = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm }, knee: before, src: 'pedalling', setup: 'wall' }, { knee: rr.knee, src: 'pedalling', setup: 'wall' });
    const ww = fit.withRetest(rr, jj);
    // The held saddle title (close to the edge has its own title, which claims nothing about the change).
    if (!ww.held || ww.heldBars || !['change', 'ok'].includes(ww.verdict)) continue;
    const hh = fit.headline(ww);
    const cannot = /cannot tell yet/.test(jj.text);
    assert.equal(/did not do what it should/.test(hh.short), !cannot, `${mm} mm, ${before} to ${now}: ${hh.short} | ${jj.text}`);
    assert.equal(/cannot tell yet/.test(hh.short), cannot, `${mm} mm, ${before} to ${now}`);
  }
});

test('the Check tab never says "could not measure" over a reading it shows', () => {
  // 2-low-51: the morning after, the last check measured 51 (Needs attention) and held the change for
  // one more film. The line says what the card under it says.
  const held = { at: '2026-10-10T10:00:00.000Z', v: 2, setup: 'wall', knee: 51, src: 'pedalling', values: { kneePedal: 51, torso: 45, elbow: 22 },
    areas: { saddle: 'red', reach: 'after' }, held: true, warn: [] };
  assert.equal(ui.homeSummary(held), 'Your last check asked for one more film.');
  const [card] = ui.latestCards(held);
  assert.equal(card.value, 51);
  // Any stored session with a knee reading on its card: never "could not measure".
  for (const saddle of ['red', 'amber', 'green']) for (const isHeld of [true, false]) {
    const e = { ...held, areas: { saddle, reach: 'after' }, ...(isHeld ? {} : { held: undefined }) };
    if (Number.isFinite(ui.latestCards(e)[0].value)) assert.doesNotMatch(ui.homeSummary(e), /could not measure/, `${saddle} ${isHeld}`);
  }
  // With no reading at all it still says so.
  assert.equal(ui.homeSummary({ ...held, areas: { saddle: 'na', reach: 'na' }, values: {}, held: undefined }), 'Your last check could not measure your saddle height.');
});

test('no pedalling reading: the title says so, and "looks right" stays Good\'s word', () => {
  // 4f-cannot-measure-36: the pedals never turned, held still 37 (outside 25 to 35, within u: Fair),
  // under "Saddle Height Looks Right, Held Still".
  for (const k of [26, 30, 34, 37, 38]) {
    const r = fit.advise({ kneeFlex: k, torso: 45, elbow: 22, shoulder: 88 }, null, 'wall');
    assert.equal(r.verdict, 'stillOnly');
    const h = fit.headline(r);
    assert.doesNotMatch(`${h.what} ${h.short}`, /looks right/i, `${k}: ${h.what}`);
    assert.equal(h.what, 'I could not measure you pedalling');
    assert.equal(h.short, 'Film again and pedal backwards.');
  }
  const fast = fit.headline(fit.advise({ kneeFlex: 30 }, { strokes: 2, strokesSeen: 9, kneeFlex: NaN }, 'trainer'));
  assert.equal(fast.what, 'You pedalled too fast for me to measure');
  assert.equal(fast.short, 'Film again and pedal forwards more slowly.');
  // Out of range held still, the title already says what to do and is unchanged.
  assert.equal(fit.headline(fit.advise({ kneeFlex: 40 }, null, 'wall')).what, 'Film again before you move the saddle');
  // Across readings and verdicts: a headline that says "looks right" only over a Good saddle.
  for (let k = 20; k <= 56; k++) for (const still of [null, { kneeFlex: k }]) {
    const p = pedal(k);
    for (const r of [fit.advise(still, p, 'wall'), fit.advise({ kneeFlex: k, torso: 45, elbow: 22 }, null, 'wall')]) {
      const h = fit.headline(r);
      if (/looks right/i.test(`${h.what} ${h.short}`)) assert.equal(areasOf(r, r.verdict === 'stillOnly' ? null : p).saddle.grade, 'green', `${k}: ${h.what} | ${h.short}`);
    }
  }
});

// ── item 5, the small part: "worse twice" ends on a calm next step ─────────────────────────────
// Journey 2 ended after 34 taps on a red "Needs attention" with nothing to do (2-low-113). The revert
// screen now ends the check with the steps (flow.test.mjs); the Check tab after it says the same, not
// the last check's "ride it once more". No report leaves the phone (decision 6 is Alex's).
test('after a change is put back, the Check tab says the calm next step', () => {
  const madeE = { at: '2026-10-09T10:00:00.000Z', v: 2, setup: 'wall', knee: 53, src: 'pedalling', values: { kneePedal: 53 }, areas: { saddle: 'red', reach: 'after' },
    suggested: { kind: 'saddle', raise: true, mm: [10, 10], how: 'too' }, warn: [],
    made: { kind: 'saddle', dir: 1, mm: 10, at: '2026-10-09T10:05:00.000Z', feel: [{ said: 'worse', at: '2026-10-10T09:00:00.000Z' }, { said: 'worse', at: '2026-10-11T09:00:00.000Z' }], undone: '2026-10-11T09:00:00.000Z' } };
  // The check after the first "worse": ride it once more.
  const worse = { at: '2026-10-10T10:00:00.000Z', v: 2, setup: 'wall', knee: 51, src: 'pedalling', values: { kneePedal: 51 }, areas: { saddle: 'ride', reach: 'after' },
    wait: 'worse', would: { kind: 'saddle', raise: true, mm: [10, 10], how: 'too' }, warn: [] };
  const h = [worse, madeE];
  assert.equal(ui.homeSummary(worse), 'It felt worse. Ride it once more, then tell me how it felt.');
  const CALM = 'Saddle back at your tape mark. A fitter can look at why.';
  assert.equal(ui.homeSummary(worse, h), CALM);
  const [saddle] = ui.latestCards(worse, h);
  assert.equal(saddle.step, 'Leave it at your tape mark.');
  assert.doesNotMatch(saddle.label, /Ride it once more/);
  assert.equal(ui.latestCards(worse)[0].step, 'Ride it once more, then check again.');
  // A film after it, which the app answered with "leave it at your tape mark": the same calm words.
  const later = { ...worse, at: '2026-10-12T10:00:00.000Z', wait: 'undone', areas: { saddle: 'red', reach: 'after' } };
  assert.equal(ui.homeSummary(later, [later, ...h]), CALM);
  assert.equal(ui.homeSummary(later), CALM);
  // The handlebars, put back.
  const bars = { ...later, would: { kind: 'bars' }, areas: { saddle: 'green', reach: 'amber' } };
  assert.equal(ui.homeSummary(bars), 'Handlebars back as they were. A fitter can look at why.');
  for (const s of [CALM, ui.homeSummary(bars)]) assert.ok(s.split(' ').length <= 12, s);
});

test('the revert screen: the steps as three short rows, and one button, I Put It Back', async () => {
  const sec = between(await read('index.html'), 'id="flowRevert"', 'id="flowReady"');
  assert.match(sec, /<button id="revertNext" class="fprimary" type="button">I Put It Back<\/button>/);
  for (const id of ['revertBack', 'revertRide', 'revertFitter']) assert.match(sec, new RegExp(`<span id="${id}">`), id);
  assert.equal((sec.match(/class="fprimary"/g) || []).length, 1);
  assert.doesNotMatch(sec, />\s*Done\s*</, 'never "done"');
});

// ── item 7, the small part: the pain note before the answer, at its shortest honest form ──────
// It was 88 words, said before the rider heard what to do (FULL-REPORT finding 9). Now the screen's own
// short line comes first, then the answer, then the one line that says when to get help now. Say It
// Again and the More box keep the full note. No new pain question (that waits on the regulatory
// opinion, decision 7).
test('pain: one short line before the answer, the answer next, and when to get help now after it', () => {
  const words = (s) => s.split(/\s+/).filter(Boolean).length;
  const change = fit.advise(null, pedal(47));
  const ok = fit.advise(null, pedal(38));
  const none = fit.advise(null, null);
  const re = fit.withRetest(change, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' }, { knee: 47, src: 'pedalling' }));
  assert.equal(fit.PAIN_NOW, 'Get medical help now if your knee is badly swollen, has changed shape, or cannot take your weight.');
  for (const [r, o] of [[change, {}], [ok, {}], [none, {}], [re, {}], [ok, { win: true }]]) {
    const plain = fit.spokenSummary(r, o), said = fit.spokenSummary(r, { ...o, pain: true });
    assert.equal(said, `${fit.PAIN_SHORT} ${plain} ${fit.PAIN_NOW}`);
    assert.ok(words(fit.PAIN_SHORT) <= 14);
    assert.ok(words(said) - words(plain) <= 32, said);
    // Say It Again: the same short line first, the full note after the answer.
    const long = fit.spokenSummary(r, { ...o, long: true, pain: true });
    assert.ok(long.startsWith(`${fit.PAIN_SHORT} `), long);
    assert.ok(long.endsWith(fit.painNote(r)), long);
    for (const w of [/few weeks/, /not medical advice/, /cannot see your feet/, /professional bike fitter/, /doctor or physio/]) assert.match(long, w);
  }
  // The note on the screen, under More, is the full one, and has the help-now line in it.
  assert.ok(fit.painNote(change).includes(fit.PAIN_NOW));
});

// ── item 9: the words against the code ─────────────────────────────────────────────────────────
test('Learn says the error the code uses, from the constant, and what Good and Fair mean', async () => {
  // index.html said "within 2.5 degrees of a target count as in range" while fit.U_KNEE is 3 and a
  // reading just outside its band is Fair, not "in range" (SPEC 4.3).
  const line = ui.exactLine();
  assert.equal(line, `Good means more than ${fit.U_KNEE} degrees inside the target. Fair means within ${fit.U_KNEE} degrees of an edge, or a reading I cannot act on alone.`);
  const html = await read('index.html'), app = await read('app.js');
  const exact = between(html, 'id="exact-h"', '</details>');
  assert.doesNotMatch(exact, /2\.5 degrees|count as in range/);
  assert.match(exact, /<span id="exactU">[^<]+<\/span>/);
  assert.match(app, /el\.exactU\.textContent = ui\.exactLine\(\);/);
});

// The round 5 fixer, QA1 blocking 2 (r5/qa1/probe/nopedal-lowwall-results.png): Learn said "Fair means
// within 3 degrees of an edge" over two Fair pills far outside their bands: held still 54 against 25 to
// 35, and an elbow at 49 against 15 to 30. Copy Results said the same. Both now say what the code does:
// Good is always more than u inside; Fair is within u of an edge, or a reading the app does not act on
// alone (held still only, or an angle at the front with no bars change), and then it gives no change
// for that area.
test('Good and Fair, in Learn and in Copy Results, hold for every Good and Fair pill the app gives', () => {
  const u = fit.U_KNEE;
  // One number in the line: every graded measure has the same error.
  for (const k of ['kneeDynamic', 'kneeStatic', 'torso', 'elbow']) assert.equal(fit.U[k], u, k);
  const learn = ui.exactLine();
  const report = (r) => fit.reportLines(r).find(l => l.startsWith('Good:'));
  // The two cases QA1 found.
  const r = fit.advise({ kneeFlex: 54, torso: 45, elbow: 49, shoulder: 88 }, null, 'wall');
  const a = areasOf(r, null);
  assert.equal(a.saddle.grade, 'amber', 'held still 54: Fair');
  assert.equal(a.reach.grade, 'amber', 'elbow 49: Fair');
  assert.ok(54 - fit.TARGETS.kneeStatic[1] > u && 49 - fit.TARGETS.elbow[1] > u, 'both far outside');
  for (const t of [learn, report(r)]) {
    assert.doesNotMatch(t, /Fair(:| means) within \d+(°| degrees) of an edge\.$/, t);
    assert.match(t, /Fair(:| means) within 3(°| degrees) of an edge, or a reading (I cannot|the app does not) act on alone\./, t);
  }
  assert.equal(report(r), `Good: inside the target by more than ${u}°, the app's provisional error for one check. Fair: within ${u}° of an edge, or a reading the app does not act on alone.`);
  // Over a grid of readings, pedalling and held still: Good is more than u inside every graded reading
  // of the area; a Fair reading more than u outside its band comes with no change for that area.
  const outBy = (key, v) => { const [lo, hi] = fit.TARGETS[fit.TARGET_OF[key]]; return v < lo ? lo - v : v > hi ? v - hi : -Math.min(v - lo, hi - v); };
  const KEYS = { saddle: ['kneePedal'], reach: ['torso', 'elbow'] };
  let farFair = 0;
  for (let k = 20; k <= 60; k += 2) for (const torso of [30, 38, 42, 45, 52, 60]) for (const elbow of [5, 13, 18, 22, 28, 34, 49]) {
    const p = pedal(k, { torso, elbow });
    for (const [rr, pp] of [[fit.advise(null, p, 'wall'), p], [fit.advise({ kneeFlex: k, torso, elbow, shoulder: 88 }, null, 'wall'), null]]) {
      const rows = fit.measures(rr, pp);
      const val = Object.fromEntries(rows.map(x => [x.key, x.value]));
      for (const area of fit.areas(rr, rows).filter(x => KEYS[x.key])) {
        const keys = (area.key === 'saddle' && rr.verdict === 'stillOnly' ? ['kneeStill'] : KEYS[area.key]).filter(x => Number.isFinite(val[x]));
        if (area.grade === 'green') for (const x of keys) assert.ok(outBy(x, val[x]) < -u, `${area.key} Good, ${x} ${val[x]}`);
        if (area.grade === 'amber' && keys.some(x => outBy(x, val[x]) > u)) {
          farFair++;
          assert.notEqual(rr.change?.kind, area.key === 'saddle' ? 'saddle' : 'bars', `${area.key} Fair far outside, and a change for it`);
        }
      }
    }
  }
  assert.ok(farFair > 0, 'the grid has Fair readings far outside their band');
});

test('Reach and Bars, Good or Fair with nothing to change, says it is from one hand position, once', () => {
  const STEP = 'No change needed for this hand position.';
  // Once on the screen: the step says it, the Details under it do not say it again (the round 5 fixer,
  // QA minor: "Checked with your hands in one place only." said it a second time).
  const once = (a) => assert.equal(`${a.step} ${a.why}`.match(/hand position|hands in one place/g)?.length, 1, `${a.step} | ${a.why}`);
  // Good: the back 45 and the elbow 22 well inside; 4f-cannot-measure-36 showed "Good, No change needed".
  for (const r of [fit.advise(null, pedal(38)), fit.advise({ kneeFlex: 37, torso: 45, elbow: 22, shoulder: 88 }, null, 'wall')]) {
    const a = areasOf(r, r.verdict === 'stillOnly' ? null : pedal(38));
    assert.equal(a.reach.grade, 'green');
    assert.equal(a.reach.step, STEP);
    once(a.reach);
  }
  // Fair inside, near an edge: the same.
  const near = areasOf(fit.advise(null, pedal(38, { torso: 42 })), pedal(38, { torso: 42 }));
  assert.equal(near.reach.grade, 'amber');
  assert.equal(near.reach.step, STEP);
  once(near.reach);
  // Said Again: the angles that look good, for this hand position (QA minor: "Your back angle and
  // elbow bend look good." had no caveat).
  const long = fit.spokenSummary(fit.advise(null, pedal(38)), { long: true });
  assert.match(long, /Your back angle and elbow bend look good for this hand position\./);
  assert.doesNotMatch(long, /looks? good\./);
  // The Check tab's Reach and Bars card, when it is Good, says the same step as the results.
  const e = { at: '2026-10-10T10:00:00.000Z', v: 2, setup: 'wall', knee: 38, src: 'pedalling', values: { kneePedal: 38, torso: 45, elbow: 22 },
    areas: { saddle: 'green', reach: 'green' }, nothing: true, warn: [] };
  const reach = ui.latestCards(e)[1];
  assert.equal(reach.step, STEP);
  assert.match(reach.label, /No change needed for this hand position\.$/);
});

// The round 5 fixer, QA minors: no promise the app does not keep, and the same pain words everywhere.
test('no "I will wait" anywhere the app speaks, and the put-back row with pain says what the results say', async () => {
  const app = await read('app.js');
  // In any line of code (the comments may still name the old line).
  const code = app.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');
  assert.doesNotMatch(code, /I will wait/);
  assert.match(app, /'Take your time\. Get back on when you are ready\.'/);
  assert.ok(fit.PAIN_SHORT.endsWith('see a doctor or physio, and a bike fitter.'));
  assert.match(app, /const REVERT_PAIN = 'With pain, see a doctor or physio, and a bike fitter\.';/);
  assert.match(app, /\$\('revertFitter'\)\.textContent = pain \? 'With pain, see a doctor or physio, and a bike fitter' :/);
});

// ── item 10: Larger Text, Reduce Motion, and an answer for life ────────────────────────────────
test('the Check tab: Start a Check comes before Keep Your Results, so Larger Text cannot push it off the first screen', async () => {
  // 4e-big-text-01: at 28 px the Keep Your Results card filled the first screen and Start a Check sat
  // under the tab bar. The browser check at 28 px is in the round 5 notes.
  const tab = between(await read('index.html'), 'id="tabCheck"', 'id="tabProgress"');
  const start = tab.indexOf('id="newCheck"'), keep = tab.indexOf('id="a2hs"');
  assert.ok(start > 0 && keep > 0);
  assert.ok(start < keep, 'Start a Check first');
  assert.ok(tab.indexOf('id="inApp"') < start, 'Open This in Safari stays first: there the camera may not work');
});

// The round 5 fixer, QA1 blocking 1 (r5/qa1/probe/fitterFlip-5-check-after-flip.png): after Learn's
// Change to No, the Check tab still said "A fitter set up your bike, so I only report." and "Ask your
// fitter before you change it.", from the stored check. The Check tab goes by the answer as it is now.
test('the Check tab goes by the bike fitter answer as it is now, not as it was at the check', () => {
  const FITTER = 'A fitter set up your bike, so I only report.';
  const ASK = 'Ask your fitter before you change it.';
  const AGAIN = 'Check again before you change it.';
  const flipped = '2026-10-11T08:00:00.000Z';
  const fitterE = { at: '2026-10-10T10:00:00.000Z', v: 2, setup: 'wall', knee: 54, src: 'pedalling', values: { kneePedal: 54 },
    areas: { saddle: 'red', reach: 'after' }, wait: 'fitter', would: { kind: 'saddle', raise: true, mm: [10, 10], how: 'too' }, warn: [] };
  // As stored, and with the answer still Yes: report only.
  for (const o of [undefined, { fitter: 'yes' }, { fitter: 'yes', fitterAt: flipped }]) {
    assert.equal(ui.homeSummary(fitterE, [fitterE], o), FITTER);
    assert.equal(ui.latestCards(fitterE, [fitterE], o)[0].step, ASK);
  }
  // Changed to No in Learn, after a reload too (the answer comes from the phone's storage): never "A
  // fitter set up your bike", never "Ask your fitter". What the check saw, and one true step.
  for (const no of [{ fitter: 'no', fitterAt: flipped }, { fitter: 'no' }]) {
    const s = ui.homeSummary(fitterE, [fitterE], no);
    assert.doesNotMatch(s, /fitter/i, s);
    assert.equal(s, 'Your saddle is probably too low.');
    const [saddle, reach] = ui.latestCards(fitterE, [fitterE], no);
    assert.equal(saddle.step, AGAIN);
    assert.doesNotMatch(`${saddle.label} ${reach.label}`, /fitter/i);
    // The handlebars, held for a fitter's bike.
    const bars = { ...fitterE, areas: { saddle: 'green', reach: 'red' }, would: { kind: 'bars' } };
    assert.equal(ui.homeSummary(bars, [bars], no), 'The front of your bike is probably long and low.');
    assert.equal(ui.latestCards(bars, [bars], no)[1].step, AGAIN);
    // Any wait 'fitter' with the answer No.
    for (const would of [{ kind: 'saddle', raise: false, mm: [5, 5], how: 'a little' }, { kind: 'saddle', raise: true, mm: [3, 3] }, { kind: 'bars' }]) {
      const e = { ...fitterE, would };
      for (const t of [ui.homeSummary(e, [e], no), ...ui.latestCards(e, [e], no).map(c => c.label)]) assert.doesNotMatch(t, /fitter/i, t);
    }
  }
  // No to Yes: a change suggested before the answer changed is not shown as one to make.
  const sugE = { at: '2026-10-10T10:00:00.000Z', v: 2, setup: 'wall', knee: 54, src: 'pedalling', values: { kneePedal: 54 },
    areas: { saddle: 'red', reach: 'after' }, suggested: { kind: 'saddle', raise: true, mm: [10, 10], how: 'too' }, warn: [] };
  const yes = { fitter: 'yes', fitterAt: flipped };
  assert.equal(ui.homeSummary(sugE, [sugE], yes), FITTER);
  assert.equal(ui.latestCards(sugE, [sugE], yes)[0].step, ASK);
  assert.equal(ui.fitterChanged(sugE, yes), 'yes');
  // A change given after he said Yes (with pain: at most 5 mm, "tell your bike fitter too") stays as
  // given, and so does one he has already made: checking it is reporting.
  const painE = { ...sugE, at: '2026-10-11T09:00:00.000Z', suggested: { kind: 'saddle', raise: true, mm: [5, 5], how: 'too' } };
  assert.equal(ui.homeSummary(painE, [painE], yes), 'Your saddle is probably too low.');
  assert.equal(ui.latestCards(painE, [painE], yes)[0].step, 'Raise the saddle about 5 mm.');
  assert.equal(ui.fitterChanged(painE, yes), null);
  const madeE = { ...sugE, made: { kind: 'saddle', dir: 1, mm: 10, at: '2026-10-10T11:00:00.000Z' } };
  assert.equal(ui.homeSummary(madeE, [madeE], yes), 'Your saddle is probably too low.');
  assert.equal(ui.fitterChanged(madeE, yes), null);
  // Without a time of change (the first answer, on the question screen), the stored words stand.
  assert.equal(ui.homeSummary(sugE, [sugE], { fitter: 'yes' }), 'Your saddle is probably too low.');
  assert.equal(ui.fitterChanged(fitterE, { fitter: 'no' }), 'no');
});

// The round 5 fixer, QA minor (r5/qa1/probe/big-trend.png): at 28 px a returning rider's Check It Now
// sat under the tab bar, below the card's 140 px picture. The picture gives way at the accessibility
// text sizes (from 26 px, between iOS's largest standard size, 23 px, and the first larger one, 28 px),
// so the card's button comes up by its height. The browser check at 28 px is in the fixer's notes.
test('the Check tab card\'s picture gives way at the largest text sizes, so its button stays on the first screen', async () => {
  const css = await read('index.html');
  const rule = css.match(/\.assess \.art \{([^}]*)\}/)?.[1] || '';
  const m = rule.match(/height: clamp\(0px, calc\(\((\d+)px - 1rem\) \* (\d+)\), 140px\)/);
  assert.ok(m, rule);
  const at = (rem) => Math.max(0, Math.min(140, (Number(m[1]) - rem) * Number(m[2])));
  for (const rem of [14, 16, 17, 19, 21, 23]) assert.equal(at(rem), 140, `${rem} px: the full picture`);
  for (const rem of [28, 33, 40, 53]) assert.equal(at(rem), 0, `${rem} px: no picture`);
  assert.match(css, /\.assess \.art > svg \{[^}]*\}/);
});

test('the bike fitter answer has one place to change it: a row in Learn', async () => {
  const html = await read('index.html'), app = await read('app.js');
  const learn = between(html, 'id="tabLearn"', '<div class="tabfade"');
  assert.match(learn, /<section id="fitterSet" class="card flat"[^>]*hidden>/);
  // A label with the answer under it, never a claim: "A Bike Fitter Set Up This Bike" over "No: ..."
  // read as a contradiction (the round 5 fixer, QA minor).
  assert.match(learn, /<button id="fitterChange" class="learnrow fitrow" type="button"[^>]*>[\s\S]*<b>Set Up by a Bike Fitter<\/b><span id="fitterSetSub">[^<]*<\/span>[\s\S]*Change<\/span>(<\/div>)?<\/button>/);
  assert.doesNotMatch(learn, /A Bike Fitter Set Up This Bike/);
  // After Change, the Check tab is drawn again from the answer as it is now.
  assert.match(app, /el\.fitterChange\.addEventListener\('click', \(\) => \{[\s\S]*?renderHistory\(\);[\s\S]*?\}\);/);
  assert.match(app, /ui\.homeSummary\(latest, h, answer\)/);
  assert.match(app, /ui\.latestCards\(latest, h, answer\)/);
  assert.match(app, /el\.fitterChange\.addEventListener\('click'/);
});
