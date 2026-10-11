// Round 4, builder A: the measuring rules of Phase 0 (pro-standard SPEC, sections 4.1 to 4.4 and the
// lines of 5.0 that belong to them). The knee graded on the closest published band, its straightest
// point for the report, Good only when the app is sure, the smallest saddle step it is sure of, a
// retest that knows what it cannot see, and words the app must never say.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as fit from '../fit.js';
import * as ui from '../ui.js';
import { catalog } from '../tools/voice/catalog.mjs';
import { synthPose, trueKneeFlexBDC, trueKneeMax, seeded } from './synth.js';

const W = 1280, H = 720;
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const pedal = (knee, more = {}) => ({ strokes: 12, strokesSeen: 12, kneeFlex: knee, torso: 45, elbow: 22, shoulder: 88, ...more });

// ── 4.1 the knee ─────────────────────────────────────────────────────────────────────────────
test('the pedalling knee is graded on 33 to 43, the closest published band (Millour 2019)', () => {
  assert.deepEqual(fit.TARGETS.kneeDynamic.slice(0, 2), [33, 43]);
  assert.deepEqual(fit.TARGETS.kneeMax.slice(0, 2), [30, 40]);
  assert.deepEqual(fit.TARGETS.kneeStatic.slice(0, 2), [25, 35]); // the held-still cross-check stays on Holmes
  // The SPEC's table: 40 and 42 at the bottom used to say "raise the saddle"; 27.5 used to be in range.
  assert.equal(fit.advise(null, pedal(40)).change, null);
  assert.equal(fit.advise(null, pedal(42)).change, null);
  assert.equal(fit.advise(null, pedal(27.5)).change?.raise, false);
});

test('the knee at its straightest in each stroke, a parabola through the three straightest frames', () => {
  const rand = seeded(11), samples = [];
  const fps = 15, rev = 1.1;
  for (let i = 0; i < 20 * fps; i++) {
    const t = i / fps, theta = -Math.PI / 2 + (2 * Math.PI * t) / rev;
    samples.push({ t, ...fit.frameAngles(synthPose(theta, { noise: 1.5, rand }), 'L', W, H) });
  }
  const s = fit.summarisePedal(samples);
  assert.ok(trueKneeMax() < trueKneeFlexBDC(), 'the straightest point is straighter than the bottom');
  near(s.kneeMax, trueKneeMax(), 2);
  assert.ok(s.kneeMax < s.kneeFlex, `${s.kneeMax} is straighter than ${s.kneeFlex}`);
  // Without noise it is closer still.
  const clean = [];
  for (let i = 0; i < 20 * fps; i++) { const t = i / fps; clean.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + (2 * Math.PI * t) / rev), 'L', W, H) }); }
  near(fit.summarisePedal(clean).kneeMax, trueKneeMax(), 0.5);
});

test('the two pedalling readings pointing opposite ways ask for one more film, like held still and pedalling', () => {
  // Bent too much at the bottom (raise), but too straight at its straightest (lower): film again.
  const d = fit.advise(null, pedal(47, { kneeMax: 25 }));
  assert.equal(d.verdict, 'disagree');
  assert.equal(d.change, null);
  assert.equal(d.overall, 'amber');
  assert.match(fit.spokenSummary(d), /point different ways/);
  assert.match(fit.saddleWhy(d), /straightest/);
  // The held-still row does not claim it was the one that disagreed.
  const still = fit.measures(d, pedal(47, { kneeMax: 25 })).find(x => x.key === 'kneeStill');
  assert.ok(!/this and the pedalling reading point different ways/.test(still.step), still.step);
  // The same way, or in range: the bottom-of-stroke reading decides, as before.
  assert.equal(fit.advise(null, pedal(47, { kneeMax: 44 })).verdict, 'change');
  assert.equal(fit.advise(null, pedal(47, { kneeMax: 35 })).verdict, 'change');
  assert.equal(fit.advise(null, pedal(38, { kneeMax: 25 })).verdict, 'ok');
});

test('the rider view stays one headline and one change; the definitions are named only in Copy Results', () => {
  const r = fit.advise(null, pedal(50, { kneeMax: 47 }));
  const h = fit.headline(r);
  for (const s of [h.what, h.short, h.why, fit.spokenSummary(r), fit.spokenSummary(r, { long: true })]) {
    assert.ok(!/Millour|published|straightest|rule of thumb/.test(s), s);
  }
  const row = fit.measures(r, pedal(50, { kneeMax: 47 })).find(x => x.key === 'kneePedal');
  assert.equal(row.target, 'Target 33 to 43');
  const report = fit.reportLines(r).join('\n');
  // In rider words ("with the pedal at its lowest point"), as everywhere (setups.test.mjs).
  assert.match(report, /Knee bend with the pedal at its lowest point, pedalling: 50°\. Target 33 to 43, the closest published band \(Millour 2019\); the app's offset from it is not yet measured\./);
  assert.match(report, /straightest.*47°.*Target 30 to 40/);
  assert.match(report, /Millimetres from a rule of thumb, not yet measured for you\./);
  // No saddle change, no millimetre note.
  assert.ok(!/rule of thumb/.test(fit.reportLines(fit.advise(null, pedal(38))).join('\n')));
});

test('no string the rider sees or hears says the pedalling knee target is 30 to 40', async () => {
  for (const k of [20, 28, 31, 38, 41, 45, 50]) {
    const r = fit.advise(null, pedal(k));
    const said = [fit.headline(r).why, fit.saddleWhy(r), fit.saddleWhy(r, ' degrees'), fit.spokenSummary(r, { long: true }), ...fit.measures(r, pedal(k)).filter(x => x.key === 'kneePedal').flatMap(x => [x.target, x.why])];
    for (const s of said) assert.ok(!/30 to 40/.test(s), s);
  }
});

// ── 4.3 Good, Fair, Needs attention ─────────────────────────────────────────────────────────
test('u: a named, provisional 3 degrees for the knee, and the back, elbow and shoulder their own', () => {
  assert.equal(fit.U_KNEE, 3);
  assert.equal(fit.U.kneeDynamic, fit.U_KNEE);
  for (const k of ['torso', 'elbow', 'shoulder']) assert.ok(Number.isFinite(fit.U[k]), k);
  assert.equal(fit.GREEN_TOL, undefined, 'the fixed 2.5 degree widening is gone');
});

test('zones at u = 2, 3 and 5 on the 33 to 43 knee band (the SPEC\'s table)', () => {
  const g = (v, u) => fit.grade('kneeDynamic', v, u);
  // u = 2: Good 35 to 41, Fair 31 to 35 and 41 to 45, Needs attention under 31 and over 45.
  assert.deepEqual([30.9, 31, 34, 35, 35.1, 38, 40.9, 41, 44, 45, 45.1].map(v => g(v, 2)),
    ['red', 'amber', 'amber', 'amber', 'green', 'green', 'green', 'amber', 'amber', 'amber', 'red']);
  // u = 3 (the default): Good 36 to 40, Fair 30 to 36 and 40 to 46.
  assert.deepEqual([29.9, 30, 36, 36.1, 39.9, 40, 46, 46.1].map(v => g(v, 3)), ['red', 'amber', 'amber', 'green', 'green', 'amber', 'amber', 'red']);
  assert.deepEqual([29.9, 30, 36.1, 40, 46.1].map(v => fit.grade('kneeDynamic', v)), ['red', 'amber', 'green', 'amber', 'red']);
  // u = 5: no Good at all, Fair 28 to 48.
  assert.deepEqual([27.9, 28, 33, 38, 43, 48, 48.1].map(v => g(v, 5)), ['red', 'amber', 'amber', 'amber', 'amber', 'amber', 'red']);
  // The side of the band, and whether a Fair reading is inside it or just outside.
  assert.deepEqual(fit.zone('kneeDynamic', 41), { grade: 'amber', side: 'in', fair: 'in' });
  assert.deepEqual(fit.zone('kneeDynamic', 44.5), { grade: 'amber', side: 'high', fair: 'out' });
  assert.deepEqual(fit.zone('kneeDynamic', 31), { grade: 'amber', side: 'low', fair: 'out' });
  assert.deepEqual(fit.zone('kneeDynamic', 38), { grade: 'green', side: 'in', fair: null });
  assert.deepEqual(fit.zone('kneeDynamic', 50), { grade: 'red', side: 'high', fair: null });
  assert.equal(fit.grade('kneeDynamic', NaN), 'na');
});

test('Good: "In range. Nothing to change."; Fair inside: in range, near the edge, nothing to change', () => {
  const good = fit.advise(null, pedal(38));
  assert.equal(good.verdict, 'ok');
  assert.equal(good.kneeGrade, 'green');
  assert.match(fit.spokenSummary(good), /^Nothing to change today\. Your saddle height looks right\./);
  const fair = fit.advise(null, pedal(41.5));
  assert.equal(fair.verdict, 'ok');
  assert.equal(fair.change, null);
  assert.equal(fair.kneeGrade, 'amber');
  assert.ok(fit.nothingToDo(fair));
  assert.equal(fit.headline(fair).what, 'Nothing to change today');
  assert.equal(fit.headline(fair).short, 'In range, near the edge.');
  assert.match(fit.spokenSummary(fair), /^Nothing to change today\. Your knee is in range, near the edge\./);
  const saddle = fit.areas(fair, fit.measures(fair, pedal(41.5)))[0];
  assert.equal(saddle.status, 'Fair');
  assert.equal(saddle.step, 'Leave the saddle height as it is.');
  // The camera view shows Fair, never "Again", over "Nothing to change today".
  const f = ui.resultField(fair, { grade: 'amber', nothing: true, what: fit.headline(fair).what });
  assert.equal(f.word, 'Fair');
  // The home screen: no "needs one more check" for a check with nothing to do.
  assert.equal(ui.homeSummary({ areas: { saddle: 'amber', reach: 'green' }, nothing: true }), 'Your saddle height and reach look right.');
});

test('Fair just outside: "Close to the edge. Let me film once more." The phone stays; the average of two films decides', () => {
  for (const k of [44.5, 31]) {
    const r = fit.advise(null, pedal(k), 'wall');
    assert.equal(r.verdict, 'edge', String(k));
    assert.equal(r.change, null);
    assert.equal(r.kneeGrade, 'amber');
    assert.equal(fit.nothingToDo(r), false);
    assert.equal(ui.checkDone(r), false, 'the phone stays where it is');
    assert.equal(fit.headline(r).what, 'Film once more');
    assert.match(fit.spokenSummary(r), /^Close to the edge\. Let me film once more\.$/);
    assert.equal(fit.areas(r, fit.measures(r, pedal(k)))[0].status, 'Fair');
  }
  // The film just before, when it was a Fair-outside one with the bike held the same way, minutes ago.
  const at = (min) => new Date(Date.UTC(2026, 9, 11, 10, min)).toISOString();
  const now = new Date(Date.UTC(2026, 9, 11, 10, 20));
  const was = { at: at(15), setup: 'wall', src: 'pedalling', knee: 45, edge: 44.6 };
  assert.equal(fit.edgeBefore([was], 'wall', now), 44.6);
  assert.equal(fit.edgeBefore([was], 'trainer', now), null, 'held another way');
  assert.equal(fit.edgeBefore([{ ...was, at: at(-60) }], 'wall', now), null, 'too long ago: the phone has moved since');
  assert.equal(fit.edgeBefore([{ ...was, edge: undefined }], 'wall', now), null);
  assert.equal(fit.edgeBefore([{ at: at(18), setup: 'wall' }, was], 'wall', now), null, 'only the film just before');
  // The average decides, with the same u (no benefit assumed): still within u, nothing to change.
  const avg = fit.advise(null, pedal(45), 'wall', { before: 44.6 });
  assert.equal(avg.verdict, 'ok');
  near(avg.knee, 44.8, 1e-9);
  assert.deepEqual(avg.averaged, [44.6, 45]);
  assert.equal(avg.kneeGrade, 'amber');
  assert.equal(fit.headline(avg).what, 'Nothing to change today');
  assert.ok(!/once more/i.test(fit.spokenSummary(avg)), 'never a third film for the same edge');
  // Beyond u on average: one change, sized from the average.
  const out = fit.advise(null, pedal(48), 'wall', { before: 46 });
  assert.equal(out.verdict, 'change');
  assert.equal(out.change.headline, 'Raise the saddle about 3 mm');
  // Back inside: Good or Fair inside, as usual.
  assert.equal(fit.advise(null, pedal(40), 'wall', { before: 44 }).verdict, 'ok');
  // The report says it was the average of two films.
  assert.match(fit.reportLines(avg).join('\n'), /average of two films: 45° and 45°/);
});

test('the back and elbow follow the same zones; the shoulder is For reference', () => {
  assert.equal(fit.grade('torso', 45), 'green');
  assert.equal(fit.grade('torso', 42), 'amber');
  assert.equal(fit.grade('torso', 36.9), 'red');
  assert.equal(fit.grade('elbow', 22), 'green');
  assert.equal(fit.grade('elbow', 11.9), 'red');
  for (const v of [69.3, 88, 110]) assert.equal(fit.grade('shoulder', v), 'info', String(v));
  const r = fit.advise(null, pedal(38, { shoulder: 69.3 }));
  assert.equal(r.shoulderGrade, 'info');
  const rows = fit.measures(r, pedal(38, { shoulder: 69.3 }));
  const sh = rows.find(x => x.key === 'shoulder');
  assert.equal(sh.status, 'For reference');
  assert.ok(!/Target 80 to 95/.test(sh.target), sh.target);
  // Bike Fast Fit grades 69.3 green and the app used to say Needs attention: the shoulder alone never
  // makes Reach anything but what the back and elbow say.
  const reach = fit.areas(r, rows).find(a => a.key === 'reach');
  assert.equal(reach.grade, 'green');
  assert.ok(!/shoulder/.test(reach.why), reach.why);
});

test('the shoulder stays a sign for raising the bars, only above 95 plus u', () => {
  assert.equal(fit.advise(null, pedal(38, { torso: 34, elbow: 22, shoulder: 98 })).change, null);
  const r = fit.advise(null, pedal(38, { torso: 34, elbow: 22, shoulder: 98.5 }));
  assert.equal(r.change?.kind, 'bars');
  assert.deepEqual(r.change.flags, ['torso', 'shoulder']);
  assert.ok(!/target 80 to 95/.test(r.change.why), r.change.why);
  // The back sign only in its Needs attention zone: 37 is Fair, not a sign.
  assert.equal(fit.advise(null, pedal(38, { torso: 37, elbow: 5, shoulder: 88 })).change, null);
  assert.equal(fit.advise(null, pedal(38, { torso: 36.9, elbow: 5, shoulder: 88 })).change?.kind, 'bars');
});

// ── 4.4 the millimetres ──────────────────────────────────────────────────────────────────────
test('the smallest change the app is sure of: 3, 5 or 10 mm at 2 mm per degree from the reading less u', () => {
  const mm = (k, opts) => fit.advise(null, pedal(k), null, opts).change;
  // The SPEC's examples at u = 3.
  assert.equal(mm(46.1).headline, 'Raise the saddle about 3 mm');
  assert.equal(mm(49.5).headline, 'Raise the saddle about 5 mm');
  assert.equal(mm(52).headline, 'Raise the saddle about 10 mm');
  assert.deepEqual(mm(46.1).mm, [3, 3]);
  // The edges of each step: under 4 mm, 4 to 8 mm, over 8 mm.
  assert.equal(mm(47.9).mm[0], 3);
  assert.equal(mm(48).mm[0], 5);
  assert.equal(mm(50).mm[0], 5);
  assert.equal(mm(50.1).mm[0], 10);
  // Never more than 10 mm, however far out.
  assert.equal(mm(70).mm[0], 10);
  // Too straight: the same steps down.
  assert.equal(mm(29.9).headline, 'Lower the saddle about 3 mm');
  assert.equal(mm(26.5).headline, 'Lower the saddle about 5 mm');
  assert.equal(mm(24).headline, 'Lower the saddle about 10 mm');
  // With any pain, at most 5 mm.
  assert.equal(mm(52, { pain: true }).headline, 'Raise the saddle about 5 mm');
  assert.equal(mm(46.1, { pain: true }).headline, 'Raise the saddle about 3 mm');
  assert.match(mm(52, { pain: true }).why, /5 mm is the most to change in one go/);
  // Always "about", on the screen and out loud; never "15 mm" or a range.
  for (let k = 10; k <= 80; k += 0.5) {
    const c = mm(k);
    if (!c) continue;
    assert.match(c.headline, /^(Raise|Lower) the saddle about (3|5|10) mm$/, String(k));
    assert.match(fit.spokenSummary(fit.advise(null, pedal(k))), /^(Raise|Lower) the saddle about (3|5|10) millimetres\./);
  }
  assert.equal(fit.stepSize(46.1, true), 3);
  assert.equal(fit.stepSize(52, true, { pain: true }), 5);
});

test('the kill criterion: direction-only wording is ready, and switched off', () => {
  assert.equal(fit.KILL_SWITCH, false);
  assert.match(fit.DIRECTION_ONLY.raise, /^Your saddle looks low\. Raise it in small steps, about 5 mm at a time, ride, and check again, or see a fitter\.$/);
  assert.match(fit.DIRECTION_ONLY.lower, /^Your saddle looks high\. Lower it in small steps/);
  // Off by default: the measured step. On (a test only): the direction, never measured millimetres.
  assert.equal(fit.advise(null, pedal(52)).change.headline, 'Raise the saddle about 10 mm');
  const on = fit.advise(null, pedal(52), null, { directionOnly: true }).change;
  assert.equal(on.directionOnly, true);
  assert.equal(on.spoken, fit.DIRECTION_ONLY.raise);
});

test('the retest knows what it cannot see: 3 and 5 mm steps are judged by the zone only', () => {
  for (const mm of [3, 5]) {
    const before = { made: { kind: 'saddle', dir: 1, mm }, knee: 47, src: 'pedalling', setup: 'wall' };
    // Still out: the next step, never held back for a change the camera cannot see.
    const out = fit.withRetest(fit.advise(null, pedal(47), 'wall'), fit.judgeChange(before, { knee: 47, src: 'pedalling', setup: 'wall' }));
    assert.equal(out.retest.verdict, 'too-small');
    assert.equal(out.retest.spoken, fit.TOO_SMALL_LINE);
    assert.equal(out.held, undefined);
    assert.equal(out.change.kind, 'saddle');
    assert.match(fit.spokenSummary(out), /^That change is too small for me to measure\. Your tape mark shows it moved\. I only check whether you are in range now\. Raise the saddle/);
    // In range now: nothing to change, and never "That worked" for a change it could not see.
    const ok = fit.withRetest(fit.advise(null, pedal(38), 'wall'), fit.judgeChange(before, { knee: 38, src: 'pedalling', setup: 'wall' }));
    assert.equal(ok.retest.verdict, 'too-small');
    assert.equal(ui.retestWin(ok), false);
    assert.ok(fit.nothingToDo(ok));
    assert.ok(!/worked|moved the right way/.test(fit.spokenSummary(ok)), fit.spokenSummary(ok));
  }
  assert.equal(fit.TOO_SMALL_LINE, 'That change is too small for me to measure. Your tape mark shows it moved. I only check whether you are in range now.');
  // A 10 mm step keeps judgeChange's verdicts.
  const ten = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 49, src: 'pedalling', setup: 'wall' }, { knee: 45.5, src: 'pedalling', setup: 'wall' });
  assert.equal(ten.verdict, 'consistent');
  // The step buttons match the steps the app gives.
  assert.deepEqual(fit.MADE_CHOICES, [3, 5, 10]);
});

test('the finishing words: in range now, ride it, check again after a few rides; never "done"', () => {
  assert.equal(fit.WIN_LINE, 'That worked. Your knee is in range now. Ride it, and check again after a few rides.');
  const win = fit.withRetest(fit.advise(null, pedal(38), 'wall'), fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 41.5, src: 'pedalling', setup: 'wall' }, { knee: 38, src: 'pedalling', setup: 'wall' }));
  assert.ok(ui.retestWin(win));
  assert.equal(fit.spokenSummary(win, { win: true }), fit.WIN_LINE);
});

// ── never said ───────────────────────────────────────────────────────────────────────────────
// SPEC 7.1 and the round 4 brief: never "done", "fixed", "perfect", "rated 9" or "as good as a fit",
// on a screen or out loud. This sweeps every line the voice can say, every screen text in
// index.html, the screen words fit.js and ui.js build over a grid of results, and the words app.js
// puts on the screen itself.
const NEVER = /\b(done|fixed|perfect)\b|rated 9|as good as a (professional )?fit/i;

function* results() {
  const setups = [...Object.keys(fit.SETUPS), null];
  for (const setup of setups) {
    for (let k = 10; k <= 70; k += 0.5) yield fit.advise(null, pedal(k, { kneeMax: k - 3 }), setup);
    for (const k of [45, 47, 52]) yield fit.advise(null, pedal(k), setup, { pain: true });
    yield fit.advise(null, pedal(47, { kneeMax: 25 }), setup);
    yield fit.advise(null, pedal(45), setup, { before: 44.6 });
    for (const s of [15, 30, 45]) for (const k of [20, 35, 50]) yield fit.advise({ kneeFlex: s }, pedal(k), setup);
    for (const s of [null, 20, 45]) for (const p of [null, { strokes: 0, strokesSeen: 0 }, { strokes: 2, strokesSeen: 8 }]) yield fit.advise(s == null ? null : { kneeFlex: s }, p, setup);
    for (const torso of [30, 38, 45, 52, 60]) for (const elbow of [5, 13, 22, 32]) for (const shoulder of [65, 88, 100]) yield fit.advise(null, pedal(38, { torso, elbow, shoulder }), setup);
    for (const mm of [3, 5, 10, 15]) for (const now of [38, 44, 47, 52]) for (const dir of [1, -1]) {
      const r = fit.advise(null, pedal(now), setup);
      yield fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir, mm }, knee: dir > 0 ? 50 : 25, src: 'pedalling', setup }, { knee: now, src: 'pedalling', setup }));
    }
  }
}

function screenWords() {
  const out = [];
  for (const r of results()) {
    const rows = fit.measures(r, pedal(r.knee));
    const areas = fit.areas(r, rows);
    const h = fit.headline(r);
    const win = ui.retestWin(r);
    out.push(h.what, h.short, h.why, fit.saddleWhy(r), fit.saddleStep(r), fit.painNote(r), r.retest?.text, ...fit.reportLines(r),
      ...rows.flatMap(x => [x.name, x.target, x.status, x.why, x.step]), ...areas.flatMap(a => [a.name, a.status, a.why, a.step]),
      ...Object.values(ui.resultField(r, { win, grade: areas[0].grade, nothing: fit.nothingToDo(r), what: h.what, once: ui.onceMore(r) })), ui.winLine(r));
    for (const pain of [false, true]) for (const long of [false, true]) out.push(fit.spokenSummary(r, { pain, long, win }));
    if (r.change) {
      const sug = fit.suggestedChange(r.change);
      for (const where of ['results', 'home']) for (const mode of ['ask', 'later', 'before']) out.push(...Object.values(fit.madeQuestion(where, mode, sug, 'Oct 3')));
      out.push(fit.suggestionText(sug), ui.homeSummary({ areas: { saddle: areas[0].grade, reach: areas[1].grade }, suggested: sug }));
    }
  }
  for (const raise of [true, false]) { const h = fit.saddleHowTo(raise); out.push(h.title, ...h.steps, ...h.notes); }
  for (let mm = 1; mm <= fit.MADE_MAX; mm++) out.push(fit.madeNote({ kind: 'saddle', dir: 1, mm }), fit.retestPrompt({ kind: 'saddle', dir: 1, mm }, 'Oct 3', 'wall'));
  out.push(fit.madeNote(null), fit.retestPrompt({ kind: 'bars' }, 'Oct 3'), fit.PAIN_SHORT, fit.COME_BACK, ...Object.values(fit.STATUS));
  return out.filter(x => typeof x === 'string');
}

test('never said: done, fixed, perfect or rated 9, in any voice line', () => {
  const bad = new Set();
  for (const l of catalog().lines) if (NEVER.test(l.text)) bad.add(l.text);
  assert.deepEqual([...bad], []);
});

test('never shown: done, fixed, perfect or rated 9, in any screen text', async () => {
  const bad = new Set(screenWords().filter(s => NEVER.test(s)));
  // index.html: every text a rider can see, folded details too, without styles, scripts and comments.
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const text = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ');
  for (const block of text.split(/<[^>]+>/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) if (NEVER.test(block)) bad.add(block);
  for (const m of text.matchAll(/(?:aria-label|title|alt|placeholder)="([^"]*)"/g)) if (NEVER.test(m[1])) bad.add(m[1]);
  // app.js: the words it puts on the screen itself (big words, labels, captions), its string
  // literals that read as words: more than one word, or a capital first (a class or id is neither).
  const app = (await readFile(new URL('../app.js', import.meta.url), 'utf8')).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  for (const m of app.matchAll(/'([^'\n]*)'|`([^`\n]*)`/g)) {
    const s = m[1] ?? m[2];
    if ((/\s/.test(s.trim()) || /^[A-Z]/.test(s)) && NEVER.test(s)) bad.add(s);
  }
  assert.deepEqual([...bad], []);
});

// ── Round 4, the fixer: QA's blocking findings on the measuring rules ─────────────────────────
// QA1, blocking 1: a knee just outside its range with the held-still reading out of its own range
// looped on "film once more" for ever (edge, then the average with "Film once more to be sure", then
// edge again). The average of two films is final, and a film near the edge leaves its own reading
// for the next one, so a third film near the edge pairs with it instead of asking again.
test('two films near the edge decide, with the held-still reading out too: never a third "film once more"', () => {
  const at = (min) => new Date(Date.UTC(2026, 9, 11, 10, min)).toISOString();
  const now = new Date(Date.UTC(2026, 9, 11, 10, 20));
  const still = { kneeFlex: 18 }; // under the held-still range by more than u
  const first = fit.withStillHistory(fit.advise(still, pedal(44.5), 'wall'), []);
  assert.equal(first.verdict, 'edge');
  assert.equal(fit.edgeReading(first), 44.5);
  // The second film, averaged with the first: final, even with the held-still reading out.
  const h1 = [{ at: at(15), setup: 'wall', src: 'pedalling', knee: 45, edge: fit.edgeReading(first) }];
  const second = fit.withStillHistory(fit.advise(still, pedal(44.4), 'wall', { before: fit.edgeBefore(h1, 'wall', now) }), h1);
  assert.deepEqual(second.averaged, [44.5, 44.4]);
  assert.equal(second.verdict, 'ok');
  assert.equal(second.stillOut, true, 'still said in Copy Results and the details');
  assert.equal(second.stillOutAgain, true, 'an average of two films is final');
  assert.ok(!/once more/i.test(fit.spokenSummary(second)), fit.spokenSummary(second));
  assert.ok(!/once more/i.test(fit.spokenSummary(second, { long: true })), fit.spokenSummary(second, { long: true }));
  assert.equal(ui.onceMore(second), false);
  assert.equal(ui.checkDone(second), true, 'the phone need not stay: the screen may sleep');
  // It leaves its own reading (not the average), so a third film near the edge pairs with it.
  assert.equal(fit.edgeReading(second), 44.4);
  const h2 = [{ at: at(18), setup: 'wall', src: 'pedalling', knee: 44, edge: fit.edgeReading(second) }, ...h1];
  assert.equal(fit.edgeBefore(h2, 'wall', now), 44.4);
  const third = fit.withStillHistory(fit.advise(still, pedal(44.6), 'wall', { before: fit.edgeBefore(h2, 'wall', now) }), h2);
  assert.equal(third.verdict, 'ok');
  assert.ok(!/once more/i.test(fit.spokenSummary(third)), fit.spokenSummary(third));
  // Only a reading just outside the band is left: in range, or out by more than u, starts afresh.
  assert.equal(fit.edgeReading(fit.advise(null, pedal(40), 'wall', { before: 44.5 })), null);
  assert.equal(fit.edgeReading(fit.advise(null, pedal(41), 'wall')), null);
  assert.equal(fit.edgeReading(fit.advise(null, pedal(52), 'wall')), null);
  assert.equal(fit.edgeReading(fit.advise({ kneeFlex: 30 }, null, 'wall')), null, 'held still only');
  assert.equal(fit.edgeReading(fit.advise(null, pedal(31), 'wall')), 31, 'too straight, just outside');
  // A single film with the held-still reading out still asks once, as in round 3.
  const once = fit.withStillHistory(fit.advise(still, pedal(38), 'wall'), []);
  assert.equal(ui.onceMore(once), true);
});

// QA1, blocking 3: with pain the step is capped at 5 mm, but how far out the knee is stays in the
// words: a knee at 52 to 62 is "too" bent, not "a little".
test('with pain, a knee far out is still "too" bent; only the step is capped', () => {
  for (const k of [52, 57, 62]) {
    const r = fit.advise(null, pedal(k), 'wall', { pain: true });
    assert.equal(r.change.mm[0], 5, String(k));
    assert.equal(r.change.how, 'too', String(k));
    assert.match(r.change.why, /so the saddle is too low\. With pain, 5 mm is the most to change in one go\.$/, String(k));
    assert.equal(fit.headline(r).short, 'Your knee bends too much with the pedal at its lowest point.');
    assert.match(fit.spokenSummary(r, { long: true }), /so the saddle is too low\. With pain, 5 millimetres is the most to change in one go\./);
  }
  // A step that pain does not cap keeps its words: 49 is 5 mm and "a little" with or without pain.
  assert.equal(fit.advise(null, pedal(49), 'wall', { pain: true }).change.how, 'a little');
  // Too straight, far out, with pain.
  assert.match(fit.advise(null, pedal(20), 'wall', { pain: true }).change.why, /so the saddle is too high\./);
  // The Check tab says the same as the results: the change stores how far out it was.
  const r = fit.advise(null, pedal(57), 'wall', { pain: true });
  assert.equal(ui.homeSummary({ areas: { saddle: 'red', reach: 'after' }, suggested: fit.suggestedChange(r.change) }), 'Your saddle is probably too low.');
  assert.equal(ui.homeSummary({ areas: { saddle: 'red', reach: 'after' }, suggested: fit.suggestedChange(fit.advise(null, pedal(49), 'wall').change) }), 'Your saddle is probably a little low.');
});

// QA2, blocking 7: a 10 mm step whose retest fits but lands just outside the band ("Film once more")
// never says "the next step is below" with no next step.
test('a retest that fits but gives no next step never points to one', () => {
  const ten = { made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 50, src: 'pedalling', setup: 'wall' };
  const r = fit.withRetest(fit.advise(null, pedal(45), 'wall'), fit.judgeChange(ten, { knee: 45, src: 'pedalling', setup: 'wall' }));
  assert.equal(r.verdict, 'edge');
  assert.equal(r.retest.verdict, 'consistent');
  assert.equal(r.change, null);
  assert.ok(!/next step/i.test(r.retest.text + r.retest.spoken), r.retest.text);
  assert.match(r.retest.text, /That fits\.$/);
  assert.match(fit.spokenSummary(r), /That fits\. Close to the edge\. Let me film once more\.$/);
  // The second film after a held one, with no step either.
  const re = fit.withRetest(fit.advise(null, pedal(44.5), 'wall'), fit.judgeChange({ ...ten, recheck: true }, { knee: 44.5, src: 'pedalling', setup: 'wall' }));
  assert.ok(!/next step/i.test(re.retest.text + re.retest.spoken), re.retest.text);
  // With a next step, the pointer stays.
  const step = fit.withRetest(fit.advise(null, pedal(47), 'wall'), fit.judgeChange({ ...ten, knee: 52 }, { knee: 47, src: 'pedalling', setup: 'wall' }));
  assert.equal(step.retest.verdict, 'consistent');
  assert.ok(step.change);
  assert.match(step.retest.text, /The next step is below\.$/);
});
