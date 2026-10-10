// node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fit from '../fit.js';
import { synthPose, trueKneeFlexBDC, seeded } from './synth.js';

const W = 1280, H = 720;
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('angle helpers', () => {
  near(fit.interior([0, 0], [1, 0], [1, 1]), 90, 1e-9);
  near(fit.interior([0, 0], [1, 0], [2, 0]), 180, 1e-9);
  near(fit.fromHorizontal([0, 0], [1, 1]), 45, 1e-9);
  assert.equal(fit.median([3, 1, 2]), 2);
  assert.equal(fit.median([4, 1, 2, 3]), 2.5);
});

test('grading follows the tool: 2.5 deg tolerance, then the amber pad', () => {
  assert.equal(fit.grade('kneeDynamic', 42.5), 'green');
  assert.equal(fit.grade('kneeDynamic', 43), 'amber');
  assert.equal(fit.grade('kneeDynamic', 45), 'amber');
  assert.equal(fit.grade('kneeDynamic', 45.1), 'red');
  assert.equal(fit.grade('kneeDynamic', 27.5), 'green');
  assert.equal(fit.grade('kneeStatic', 37.5), 'green');
  assert.equal(fit.grade('hipBottom', 70), 'info');
  assert.equal(fit.grade('torso', NaN), 'na');
});

test('near side, facing and per-frame angles on the synthetic rider', () => {
  const lm = synthPose(-Math.PI / 2);
  assert.equal(fit.nearSide([lm]), 'L');
  assert.equal(fit.facing(lm), 1);
  const a = fit.frameAngles(lm, 'L', W, H);
  near(a.kneeFlex, trueKneeFlexBDC(), 0.01);
  near(a.torso, 45, 0.01);
  assert.ok(fit.isRiding(a));
});

test('pedalling: finds each stroke bottom and recovers the knee angle through noise', () => {
  const rand = seeded(7), samples = [];
  const fps = 15, rev = 1.1;
  for (let i = 0; i < 20 * fps; i++) {
    const t = i / fps, theta = -Math.PI / 2 + (2 * Math.PI * t) / rev; // backwards = counterclockwise
    const lm = synthPose(theta, { noise: 1.5, rand });
    samples.push({ t, ...fit.frameAngles(lm, 'L', W, H) });
  }
  const s = fit.summarisePedal(samples);
  assert.ok(s.strokes >= 16 && s.strokes <= 19, `strokes ${s.strokes}`);
  near(s.kneeFlex, trueKneeFlexBDC(), 1.5);
  near(s.torso, 45, 1);
  assert.ok(fit.isPedalling(samples.slice(-30), samples[0].thigh * 2));
});

test('a rider sitting still is not pedalling', () => {
  const samples = Array.from({ length: 30 }, (_, i) => ({ t: i / 15, ...fit.frameAngles(synthPose(-Math.PI / 2, { noise: 1, rand: seeded(i) }), 'L', W, H) }));
  assert.equal(fit.isPedalling(samples, samples[0].thigh * 2), false);
});

test('a lower saddle reads as more knee bend and asks to raise it', () => {
  const low = trueKneeFlexBDC([-220, 700]);
  assert.ok(low > trueKneeFlexBDC() + 5);
  const r = fit.advise({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.change.headline, 'Raise the saddle about 15 mm'); // 7 deg over: 21 to 28 mm, capped at 15
  assert.match(r.change.why, /most to change in one go/);
  assert.equal(r.kneeSource, 'pedalling');
});

test('advice: small overshoot gives a range, in-range knee leaves the saddle alone', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 43, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.change.headline, 'Raise the saddle about 9 to 12 mm');
  assert.equal(r.overall, 'amber');
  const ok = fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(ok.change, null);
  assert.equal(ok.overall, 'green');
  assert.equal(ok.disagree, false);
  assert.match(fit.spokenSummary(ok), /^Your saddle height is right\./);
});

test('advice: falls back to the still reading when pedalling failed, and flags disagreement', () => {
  const r = fit.advise({ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 2, kneeFlex: NaN });
  assert.equal(r.kneeSource, 'still');
  assert.equal(r.verdict, 'stillOnly');
  assert.equal(r.change, null); // no millimetres from the held-still reading alone
  assert.equal(r.overall, 'amber');
  const d = fit.advise({ kneeFlex: 20, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 46, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(d.verdict, 'disagree');
  assert.equal(d.disagree, true);
  assert.equal(d.change, null);
  assert.equal(d.overall, 'amber');
  assert.match(fit.spokenSummary(d), /point different ways/);
});

test('advice: one reading Good and the other Borderline is not a disagreement', () => {
  const r = fit.advise({ kneeFlex: 34, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 43.5, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.verdict, 'change');
  assert.equal(r.disagree, false);
  assert.equal(r.change.headline, 'Raise the saddle about 11 to 14 mm');
  assert.deepEqual(r.change.mm, [11, 14]);
});

test('advice: nothing measured is never Good', () => {
  assert.equal(fit.advise(null, null).overall, 'na');
  assert.equal(fit.advise(null, null).verdict, 'none');
  const nan = { kneeFlex: NaN, torso: NaN, elbow: NaN, shoulder: NaN };
  const r = fit.advise(nan, { ...nan, strokes: 0 });
  assert.equal(r.overall, 'na');
  assert.equal(fit.STATUS[r.overall], 'No reading');
});

test('advice: pedalling in range wins over a held-still reading out of range', () => {
  const r = fit.advise({ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.stillOut, true);
  assert.equal(r.change, null);
});

test('advice: a long low front end, once the saddle is right', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 });
  assert.equal(r.change.kind, 'bars');
  assert.match(r.change.why, /back is low/);
  assert.match(r.change.why, /reach far forward/);
  assert.match(r.change.why, /locked straight/);
  assert.match(r.change.why, /^Your back is low \(34°, target 40 to 50\), your arms reach far forward \(shoulder 100°, target 80 to 95\) and your elbows are locked straight \(5°, target 15 to 30\), so the front of the bike is long and low\./);
  assert.deepEqual(r.change.flags, ['torso', 'shoulder', 'elbow']);
});

test('advice: a cramped rider is not told he is stretched long and low', () => {
  // Closed shoulder and bent elbows mean the bars are close, not far (deviation from AI Bike Fit rule 4).
  assert.equal(fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 45, elbow: 38, shoulder: 72 }).change, null);
  assert.equal(fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 35, shoulder: 76 }).change, null); // one flag only
  const r = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 30, elbow: 40, shoulder: 66 });
  assert.equal(r.change, null);
  assert.equal(r.overall, 'amber');
  // Front-end advice only when the saddle is right: a saddle change comes first.
  assert.equal(fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 34, elbow: 5, shoulder: 100 }).change.kind, 'saddle');
});

test('framing checks', () => {
  assert.equal(fit.checkFraming(synthPose(-Math.PI / 2), 'L', W, H), null);
  assert.equal(fit.checkFraming(synthPose(-Math.PI / 2, { cy: 690 }), 'L', W, H).key, 'feet');
  assert.equal(fit.checkFraming(synthPose(-Math.PI / 2, { scale: 0.15, cy: 400 }), 'L', W, H).key, 'small');
  const off = fit.checkFraming(synthPose(-Math.PI / 2, { cx: 1000 }), 'L', W, H);
  assert.ok(off && ['centre', 'edge'].includes(off.key), JSON.stringify(off));
  const left = fit.checkFraming(synthPose(-Math.PI / 2, { cx: 260, scale: 0.25 }), 'L', W, H);
  assert.equal(left.key, 'centre');
  assert.match(left.say, /back wheel/); // rider sits image-left, facing right: move towards the rear
});

test('side-on check and its direction', () => {
  assert.equal(fit.checkSideOn(synthPose(-Math.PI / 2), 'L', W, H), null);
  const behind = fit.checkSideOn(synthPose(-Math.PI / 2, { farGap: -60 }), 'L', W, H);
  assert.match(behind.say, /front wheel/);
  const ahead = fit.checkSideOn(synthPose(-Math.PI / 2, { farGap: 60 }), 'L', W, H);
  assert.match(ahead.say, /back wheel/);
});

test('motion: still is near zero, a moving leg is not', () => {
  const still = [0, 1, 2].map(i => synthPose(-Math.PI / 2, { noise: 0.5, rand: seeded(i) }));
  assert.ok(fit.motion(still, 'L', W, H) < 0.02);
  const moving = [0, 0.5, 1].map(th => synthPose(-Math.PI / 2 + th));
  assert.ok(fit.motion(moving, 'L', W, H) > 0.1);
});

test('spoken summary grammar', () => {
  const one = fit.advise(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 });
  assert.equal(one.overall, 'amber');
  assert.equal(one.change, null);
  const said = fit.spokenSummary(one);
  assert.match(said, /Your back angle and elbow bend look good\./);
  assert.match(said, /Your shoulder angle is outside the target\. On its own that is no reason to change anything\./);
  assert.match(said, /Nothing to change today\.$/);
  const solo = fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 50, shoulder: 60 }));
  assert.match(solo, /Your back angle looks good\./);
});

test('result rows: a status, a reason and exactly one step each', () => {
  const pedal = { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 };
  const r = fit.advise({ kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 }, pedal);
  const rows = fit.measures(r, pedal);
  const by = Object.fromEntries(rows.map(x => [x.key, x]));
  assert.equal(by.kneePedal.status, 'Needs attention');
  assert.equal(by.kneePedal.step, 'Raise the saddle about 15 mm.');
  assert.match(by.kneePedal.why, /saddle is probably low/);
  assert.equal(by.kneeStill.status, 'Borderline');
  for (const k of ['torso', 'elbow', 'shoulder']) assert.equal(by[k].status, 'After the saddle', k); // they wait for the saddle
  assert.equal(by.torso.step, 'No change needed.');
  assert.equal(by.hipBottom.status, 'For reference');
  const off = fit.measures(fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 40, shoulder: 66 }), { strokes: 12, kneeFlex: 47 });
  assert.match(off.find(x => x.key === 'shoulder').step, /Change the saddle first/);
  const alone = fit.measures(fit.advise(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 66 }), { strokes: 12, kneeFlex: 36 });
  assert.equal(alone.find(x => x.key === 'shoulder').step, 'No change on its own. If you feel cramped on the bike, a bike fitter can check your stem length.');
  for (const x of rows) { assert.ok(x.why && x.step, x.key); assert.ok(!/Excellent/.test(x.status)); }
});

test('result rows: a missing reading is never a number or "in range"', () => {
  const cases = [
    ['nothing at all', null, undefined],
    ['nothing seen pedalling', null, { strokes: 0, strokesSeen: 0, kneeFlex: NaN, torso: NaN, elbow: NaN, shoulder: NaN, hipBottom: NaN }],
    ['held still only', { kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88, ankleX: 0 }, undefined],
    ['held still only, upper body not seen', { kneeFlex: 30, torso: NaN, elbow: NaN, shoulder: NaN }, null],
  ];
  for (const [name, still, pedal] of cases) {
    const r = fit.advise(still, pedal);
    const rows = fit.measures(r, pedal);
    const text = [...rows.flatMap(x => [x.why, x.step]), ...fit.areas(r, rows).flatMap(a => [a.why, a.step]), fit.headline(r).why, fit.spokenSummary(r)].join(' | ');
    assert.ok(!/NaN|undefined/.test(text), `${name}: ${text}`);
    for (const x of rows) {
      if (Number.isFinite(x.value)) continue;
      assert.equal(x.status, 'No reading', `${name} ${x.key}`);
      assert.ok(!/counts as in range|inside the target/.test(x.why), `${name} ${x.key}: ${x.why}`);
      assert.ok(x.why && x.step, `${name} ${x.key}`);
    }
  }
  const none = Object.fromEntries(fit.measures(fit.advise(null, undefined), undefined).map(x => [x.key, x]));
  for (const k of ['torso', 'elbow', 'shoulder']) {
    assert.equal(none[k].why, 'Not measured this time.', k);
    assert.equal(none[k].step, 'Film again, with your whole body and bike in the picture.', k);
  }
  const solo = Object.fromEntries(fit.measures(fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, undefined), undefined).map(x => [x.key, x]));
  assert.equal(solo.hipBottom.why, 'Not measured this time. It is only measured while you pedal backwards.');
  assert.equal(solo.torso.status, 'Good'); // the held-still upper body is still measured
});

test('result rows: missing pedalling reading says so instead of inventing one', () => {
  const r = fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 2, kneeFlex: NaN });
  const kp = fit.measures(r, { strokes: 2, kneeFlex: NaN })[0];
  assert.equal(kp.status, 'No reading');
  assert.match(kp.step, /full 20 seconds/);
});

// A pedalling session on the synthetic rider at a given number of frames per turn.
function pedalSession(seed, framesPerTurn, { secs = 20, noise = 1.5 } = {}) {
  const rand = seeded(seed), samples = [];
  const rev = 1.1 + rand() * 0.3, fps = framesPerTurn / rev, p0 = rand() * 2 * Math.PI;
  for (let i = 0; i < secs * fps; i++) {
    const t = i / fps;
    samples.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + p0 + (2 * Math.PI * t) / rev, { noise, rand }), 'L', W, H) });
  }
  return samples;
}

test('pedalling bias at 12 frames per turn', () => {
  const errs = [];
  for (let seed = 1; seed <= 20; seed++) errs.push(fit.summarisePedal(pedalSession(seed * 13 + 1, 12)).kneeFlex - trueKneeFlexBDC());
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
  assert.ok(Math.abs(mean) < 1.5, `mean bias ${mean.toFixed(2)}`);
  for (const e of errs) assert.ok(Math.abs(e) <= 2.5, `seed error ${e.toFixed(2)}`);
});

test('too few frames per stroke: strokes are seen but not used', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const s = fit.summarisePedal(pedalSession(seed, 8));
    assert.ok(s.strokes < 5, `kept ${s.strokes}`);
    assert.ok(s.strokesSeen >= 5, `seen ${s.strokesSeen}`);
    assert.ok(s.framesPerStroke < fit.MIN_FRAMES_PER_STROKE);
    const r = fit.advise(null, s);
    assert.equal(r.change, null); // no saddle advice from strokes the phone sampled too thinly
    const kp = fit.measures(r, s).find(x => x.key === 'kneePedal');
    assert.equal(kp.status, 'No reading');
    assert.match(kp.why, /faster than this phone can measure/);
    assert.equal(kp.step, 'Film again and pedal more slowly.');
  }
});

test('hip angle is measured at the bottom of the stroke, where its range applies', () => {
  const rand = seeded(7), samples = [];
  for (let i = 0; i < 20 * 15; i++) {
    const t = i / 15;
    samples.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + (2 * Math.PI * t) / 1.1, { noise: 1.5, rand }), 'L', W, H) });
  }
  const truth = fit.frameAngles(synthPose(-Math.PI / 2), 'L', W, H).hip;
  near(fit.summarisePedal(samples).hipBottom, truth, 2);
  assert.ok(truth > 95 && truth < 110, `hip at the bottom ${truth}`);
});

test('no ankle row and no top-of-stroke hip row', () => {
  const pedal = { strokes: 12, strokesSeen: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 };
  const rows = fit.measures(fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, pedal), pedal);
  assert.ok(!rows.some(x => x.key === 'ankle' || x.key === 'hipTop'));
  const hip = rows.find(x => x.key === 'hipBottom');
  assert.equal(hip.name, 'Hip angle at the bottom of the stroke');
  assert.equal(hip.status, 'For reference');
});

test('atBottom interpolates towards the lower neighbour', () => {
  // Ankle lowest (largest y) between frames 1 and 2: the estimate moves from frame 1 towards frame 2.
  const s = [{ ankleY: 90, k: 40 }, { ankleY: 100, k: 32 }, { ankleY: 99, k: 33 }];
  const v = fit.atBottom(s, 1, 'k');
  assert.ok(v > 32 && v < 33, `${v}`);
  assert.equal(fit.atBottom(s, 0, 'k'), 40); // no neighbour on one side: the frame itself
});

// Held still at crank angle d degrees from straight down (negative: behind, towards the back wheel).
function stillAt(d, seed = 50) {
  const frames = [0, 1, 2, 3, 4].map(k => fit.frameAngles(synthPose(-Math.PI / 2 + (d * Math.PI) / 180, { noise: 1.5, rand: seeded(seed + k) }), 'L', W, H));
  return fit.summariseStill(frames);
}

test('still reading: the crank angle is checked against the pedalling bottoms', () => {
  const pedal = fit.summarisePedal(pedalSession(3, 12));
  assert.ok(pedal.strokes >= 5);
  assert.ok(fit.stillCrankAngle(stillAt(0), pedal) < 3);
  near(fit.stillCrankAngle(stillAt(-20), pedal), 20, 3);
  near(fit.stillCrankAngle(stillAt(20), pedal), 20, 3);
  assert.ok(Number.isNaN(fit.stillCrankAngle(stillAt(0), null)));
  assert.ok(Number.isNaN(fit.stillCrankAngle(stillAt(0), { ...pedal, strokes: 2 })));
});

test('still reading taken off the bottom is set aside', () => {
  const pedal = fit.summarisePedal(pedalSession(3, 12));
  const still = stillAt(-20);
  near(still.kneeFlex, 45, 1.5); // behind the bottom the knee reads too bent
  near(pedal.kneeFlex, trueKneeFlexBDC(), 2.5); // about 37
  const r = fit.advise(still, pedal);
  assert.equal(r.verdict, 'ok');
  assert.equal(r.disagree, false);
  assert.equal(r.stillOut, undefined);
  near(r.stillOffBottom, 20, 3);
  const row = fit.measures(r, pedal).find(x => x.key === 'kneeStill');
  assert.equal(row.status, 'No reading');
  assert.match(row.why, /from the bottom when you held still/);
  assert.equal(row.step, 'Next time, hold the crank pointing straight down.');
  // Without pedalling there is nothing to compare with, so the still reading is used.
  const alone = fit.advise(still, null);
  assert.equal(alone.verdict, 'stillOnly');
  assert.equal(alone.stillOffBottom, undefined);
});

test('the app locks the measured side once the picture is checked', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const calls = src.split('\n').filter(l => /fit\.nearSide\(/.test(l));
  assert.equal(calls.length, 1);
  assert.match(calls[0], /phase === 'mount' \|\| phase === 'frame'/);
});

test('spoken summary: the action first, then the reason, and nothing sends the rider to the screen', () => {
  const low = trueKneeFlexBDC([-220, 700]);
  const r = fit.advise({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  const said = fit.spokenSummary(r);
  assert.ok(said.startsWith('One change: raise the saddle about 15 millimetres.'), said);
  assert.match(said, /so the saddle is too low\./);
  assert.match(said, /15 millimetres is the most to change in one go\./);
  assert.match(said, /tap Film again/);
  assert.match(r.change.why, /so the saddle is too low/);
  const little = fit.advise(null, { strokes: 12, kneeFlex: 43, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.spokenSummary(little), /^One change: raise the saddle about 9 to 12 millimetres\..*a little low\./);
  const high = fit.advise(null, { strokes: 12, kneeFlex: 26, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.spokenSummary(high), /^One change: lower the saddle about 12 to 15 millimetres\..*a little high\./);
  const bars = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 });
  assert.match(fit.spokenSummary(bars), /^One change: raise the handlebars\. Move one spacer from above the stem to below it\. Your back is low, .* tap Film again\.$/);
  const cases = [r, little, high, bars, fit.advise(null, null), fit.advise({ kneeFlex: 40 }, null), fit.advise({ kneeFlex: 30 }, null),
    fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 }), fit.advise({ kneeFlex: 40 }, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 })];
  for (const c of cases) {
    const t = fit.spokenSummary(c);
    assert.ok(!/Check the picture on the screen/.test(t), t);
    assert.ok(!/\u2014/.test(t), t);
    assert.ok(!/°/.test(t), t); // spoken: "degrees", not the symbol
  }
});

test('result rows: honest in-range wording and a real step on every row', () => {
  const pedal = { strokes: 12, strokesSeen: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 };
  const rows = fit.measures(fit.advise({ kneeFlex: 37, torso: 45, elbow: 22, shoulder: 88 }, pedal), pedal);
  const still = rows.find(x => x.key === 'kneeStill');
  assert.match(still.why, /within 2\.5° of the 25 to 35 target/);
  assert.match(still.why, /counts as in range/);
  assert.equal(still.step, 'Nothing extra to do: it agrees with the pedalling reading.');
  assert.match(rows.find(x => x.key === 'kneePedal').why, /inside the target/);
  for (const x of rows) {
    assert.ok(!/^(Agrees with|For reference only)/.test(x.step), x.step);
    assert.ok(!/\u2014/.test(x.why + x.step), x.key);
  }
});

test('result rows: with a saddle change only the knee rows can be red', () => {
  const pedal = { strokes: 15, strokesSeen: 15, kneeFlex: 47, torso: 30, elbow: 40, shoulder: 66, hipBottom: 104 };
  const rows = fit.measures(fit.advise({ kneeFlex: 44, torso: 30, elbow: 40, shoulder: 66 }, pedal), pedal);
  const red = rows.filter(x => x.grade === 'red').map(x => x.key);
  assert.deepEqual(red, ['kneePedal', 'kneeStill']);
  for (const k of ['torso', 'elbow', 'shoulder']) assert.equal(rows.find(x => x.key === k).status, 'After the saddle');
});

test('headline by verdict', () => {
  assert.equal(fit.headline(fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 })).what, 'Film again');
  assert.match(fit.headline(fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 })).why, /held still 20°, pedalling 46°/);
  const so = fit.headline(fit.advise({ kneeFlex: 40 }, null));
  assert.equal(so.what, 'Film again before you move the saddle');
  assert.match(so.why, /^I could not measure you pedalling\. Held still, your knee bends 40°, outside the 25 to 35 target\./);
  assert.equal(fit.headline(fit.advise({ kneeFlex: 30 }, null)).what, 'Saddle height looks right, held still');
  const ok = fit.headline(fit.advise(null, { strokes: 12, kneeFlex: 41, torso: 45, elbow: 22, shoulder: 60 }));
  assert.equal(ok.what, 'Nothing to change today');
  assert.match(ok.why, /knee bends 41° at the bottom, within 2\.5° of the 30 to 40 target\. Your shoulder angle is outside the target\./);
  assert.equal(fit.headline(fit.advise(null, null)).what, 'Not enough to measure');
});

test('compared with last time, inside the camera error', () => {
  assert.equal(fit.compareLast(44, 45, '3 Oct'), 'About the same as last time (45°)');
  assert.equal(fit.compareLast(51, 45, '3 Oct'), 'Up 6° since 3 Oct');
  assert.equal(fit.compareLast(41, 45, '3 Oct'), 'Down 4° since 3 Oct');
  assert.equal(fit.compareLast(NaN, 45, 'x'), '');
  assert.equal(fit.compareLast(45, undefined, 'x'), '');
  assert.equal(fit.compareLast(47.6, 45, '3 Oct'), 'Up 3° since 3 Oct'); // 3 is outside the tolerance
});

// ── the retest loop ─────────────────────────────────────────────────────────────────────────
test('expected knee change: about 1 degree per 3 to 4 mm', () => {
  assert.deepEqual(fit.expectedKneeChange(12), [3, 4]);
  const [lo, hi] = fit.expectedKneeChange(10);
  near(lo, 2.5, 1e-9);
  near(hi, 10 / 3, 1e-9);
});

test('judging a saddle change against the reading before it', () => {
  const prev = { made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' };
  const ok = fit.judgeChange(prev, { knee: 40, src: 'pedalling' });
  assert.equal(ok.verdict, 'consistent');
  assert.match(ok.text, /^Knee bend 43° before, 40° now\. A 10 mm raise should change it by about 3°\./);
  assert.ok(ok.text.endsWith(' In range now, so leave it.'), ok.text);
  assert.ok(!/°/.test(ok.spoken), ok.spoken);
  assert.match(ok.spoken, /^Knee bend 43 degrees before, 40 degrees now\. A 10 millimetre raise/);
  assert.equal(fit.judgeChange(prev, { knee: 47, src: 'pedalling' }).verdict, 'other-way');
  assert.equal(fit.judgeChange(prev, { knee: 33, src: 'pedalling' }).verdict, 'too-much'); // moved 10, more than 3.3 + 3
  assert.equal(fit.judgeChange(prev, { knee: 40, src: 'still' }), null);
  assert.equal(fit.judgeChange({ knee: 43, src: 'pedalling' }, { knee: 40, src: 'pedalling' }), null);
  assert.equal(fit.judgeChange(prev, { knee: NaN, src: 'pedalling' }), null);
  assert.equal(fit.judgeChange({ ...prev, made: { kind: 'bars' } }, { knee: 40, src: 'pedalling' }), null);
  // The same 3 degree tolerance below what the change should do as above it. A 10 mm raise should take
  // off 2.5 to 3.3, so no change at all is still inside it, and one degree the wrong way is not.
  assert.equal(fit.judgeChange(prev, { knee: 43, src: 'pedalling' }).verdict, 'consistent');
  assert.equal(fit.judgeChange(prev, { knee: 44, src: 'pedalling' }).verdict, 'too-little');
  // Still out of range after a change that did what it should: the next step follows.
  const fits = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 50, src: 'pedalling' }, { knee: 46, src: 'pedalling' });
  assert.equal(fits.verdict, 'consistent');
  assert.match(fits.text, /about 4 to 5°\. That fits\. The next step is below\.$/);
  assert.match(fits.spoken, /That fits\. Here is the next step\.$/);
  // A lowered saddle should add knee bend.
  const drop = { made: { kind: 'saddle', dir: -1, mm: 12 }, knee: 24, src: 'pedalling' };
  assert.equal(fit.judgeChange(drop, { knee: 28, src: 'pedalling' }).verdict, 'consistent');
  assert.match(fit.judgeChange(drop, { knee: 28, src: 'pedalling' }).text, /A 12 mm drop should change it by about 3 to 4°/);
  assert.equal(fit.judgeChange(drop, { knee: 20, src: 'pedalling' }).verdict, 'other-way');
  assert.match(fit.judgeChange(drop, { knee: 20, src: 'pedalling' }).text, /It moved the other way\. Check the saddle really moved, then film once more before you change anything else\.$/);
  assert.match(fit.judgeChange(prev, { knee: 33, src: 'pedalling' }).text, /That is more than the change should do\. Film once more to check\.$/);
  for (const k of [33, 40, 44, 47]) assert.ok(!/\u2014/.test(fit.judgeChange(prev, { knee: k, src: 'pedalling' }).text));
});

test('a retest that shows less than the change should do is not "That fits"', () => {
  // A 15 mm raise should take off about 4 to 5 degrees.
  const prev = { made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 45, src: 'pedalling' };
  for (const k of [45, 47, 47.9]) {
    const j = fit.judgeChange(prev, { knee: k, src: 'pedalling' });
    assert.equal(j.verdict, 'too-little', `45 to ${k}`);
    assert.ok(j.text.endsWith(' That is less than the change should do. Check the saddle really moved, then film once more.'), j.text);
    assert.ok(!/That fits/.test(j.text + j.spoken));
  }
  assert.equal(fit.judgeChange(prev, { knee: 44, src: 'pedalling' }).verdict, 'consistent'); // 1 degree: inside 4 to 5, less 3
  assert.equal(fit.judgeChange(prev, { knee: 49, src: 'pedalling' }).verdict, 'other-way');
  // The full flow from the review: knee 47 before a 15 mm raise and 47 after holds the next change back.
  const r = fit.advise({ kneeFlex: 37, torso: 45, elbow: 20, shoulder: 88, ankleX: 0 }, { strokes: 10, strokesSeen: 10, kneeFlex: 47, torso: 45, elbow: 20, shoulder: 88, hipBottom: 100 });
  const held = fit.withRetest(r, fit.judgeChange({ ...prev, knee: 47 }, { knee: r.knee, src: r.kneeSource }));
  assert.equal(held.change, null);
  assert.equal(held.held, true);
  assert.equal(fit.headline(held).what, 'Film once more');
  const said = fit.spokenSummary(held);
  assert.ok(!/That fits|One change|raise the saddle about/.test(said), said);
});

test('a retest that does not fit holds the next change back', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.change.kind, 'saddle');
  const prev = { made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' };
  const other = fit.withRetest(r, fit.judgeChange(prev, { knee: r.knee, src: r.kneeSource }));
  assert.equal(other.retest.verdict, 'other-way');
  assert.equal(other.change, null);
  assert.equal(other.overall, 'amber');
  assert.equal(fit.headline(other).what, 'Film once more');
  assert.match(fit.headline(other).why, /^Your knee bends 47° at the bottom of the stroke, outside the 30 to 40 target\./);
  const said = fit.spokenSummary(other);
  assert.ok(said.startsWith('Knee bend 43 degrees before, 47 degrees now.'), said);
  assert.ok(!/°/.test(said), said);
  const fits = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 51, src: 'pedalling' }, { knee: r.knee, src: r.kneeSource }));
  assert.equal(fits.retest.verdict, 'consistent');
  assert.equal(fits.change.kind, 'saddle'); // it did what it should, so the next step stands
  assert.ok(fit.spokenSummary(fits).startsWith('Knee bend'));
  assert.match(fit.spokenSummary(fits), /One change: raise the saddle/);
  assert.equal(fit.withRetest(r, null), r);
});

test('the change still waiting to be checked', () => {
  const made = { at: '2026-10-09T10:00:00Z', knee: 47, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 15, at: '2026-10-09T10:05:00Z' } };
  assert.equal(fit.pendingChange([made]), made);
  // A session with no pedalling reading cannot check it, so the change still waits.
  assert.equal(fit.pendingChange([{ knee: null, src: null }, { knee: 40, src: 'still' }, made]), made);
  assert.equal(fit.pendingChange([{ knee: 37, src: 'pedalling' }, made]), null);
  assert.equal(fit.pendingChange([]), null);
  assert.equal(fit.pendingChange(undefined), null);
  // A film whose retest held the next change back said "film once more", so the change still waits,
  // and comes back marked as the second look. Only one such film is passed over.
  const held = { knee: 47, src: 'pedalling', held: true };
  assert.deepEqual(fit.pendingChange([held, made]), { ...made, recheck: true });
  assert.deepEqual(fit.pendingChange([{ knee: null, src: null }, held, made]), { ...made, recheck: true });
  assert.equal(fit.pendingChange([held, held, made]), null);
  assert.equal(fit.pendingChange([{ knee: 41, src: 'pedalling' }, held, made]), null);
});

test('the film after a held-back retest is compared with the reading before the change', () => {
  const madeAt = { at: 'A', knee: 47, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 15, at: 'A' } };
  const pedal = (k) => ({ strokes: 12, strokesSeen: 12, kneeFlex: k, torso: 45, elbow: 22, shoulder: 88 });
  // Film 2: no change showed up, so it is held back and saved with held: true.
  const r2 = fit.advise(null, pedal(47));
  const f2 = fit.withRetest(r2, fit.judgeChange(fit.pendingChange([madeAt]), { knee: r2.knee, src: r2.kneeSource }));
  assert.equal(f2.retest.verdict, 'too-little');
  assert.equal(f2.held, true);
  assert.match(fit.headline(f2).why, /until one more film shows what the last one did/);
  const history = [{ at: 'B', knee: 47, src: 'pedalling', held: true }, madeAt];
  // Film 3, the saddle now really moved: compared with film 1, and it fits.
  const r3 = fit.advise(null, pedal(43));
  const f3 = fit.withRetest(r3, fit.judgeChange(fit.pendingChange(history), { knee: r3.knee, src: r3.kneeSource }));
  assert.equal(f3.retest.verdict, 'consistent');
  assert.match(f3.retest.text, /^Knee bend 47° before, 43° now\. A 15 mm raise should change it by about 4 to 5°\. That fits\./);
  assert.equal(f3.change.kind, 'saddle');
  assert.ok(!f3.held);
  // Film 3, still no change: the second look does not hold back again, it goes by the reading.
  const r3b = fit.advise(null, pedal(47));
  const f3b = fit.withRetest(r3b, fit.judgeChange(fit.pendingChange(history), { knee: r3b.knee, src: r3b.kneeSource }));
  assert.equal(f3b.retest.verdict, 'too-little');
  assert.equal(f3b.retest.recheck, true);
  assert.ok(!f3b.held);
  assert.equal(f3b.change.kind, 'saddle');
  assert.match(f3b.retest.text, /That still does not fit the change, so I go by this reading\. The next step is below\.$/);
  assert.match(fit.spokenSummary(f3b), /so I go by this reading\. Here is the next step\. One change: raise the saddle/);
  assert.notEqual(fit.headline(f3b).what, 'Film once more');
  // In range on the second look: leave it.
  const r3c = fit.advise(null, pedal(36));
  const j3c = fit.judgeChange(fit.pendingChange(history), { knee: r3c.knee, src: r3c.kneeSource });
  assert.equal(j3c.verdict, 'too-much');
  assert.match(j3c.text, /but you are in range now, so leave it\.$/);
  assert.equal(fit.headline(fit.withRetest(r3c, j3c)).what, 'Nothing to change today');
  for (const t of [f2, f3, f3b].flatMap(x => [x.retest.text, x.retest.spoken, fit.spokenSummary(x)])) assert.ok(!/\u2014/.test(t));
});

// ── "Slower, please" while pedalling ─────────────────────────────────────────────────────────
test('"slower": only from recent strokes, with a real pose rate, while the rider is seen', async () => {
  const { synthPose } = await import('./synth.js');
  const run = (fps, T, from = 0, to = 12) => {
    const out = [];
    for (let i = Math.ceil(from * fps), t = i / fps; t < to; t = ++i / fps) out.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + (2 * Math.PI * t) / T), 'L', 1280, 720) });
    return out;
  };
  // 10 poses a second at 0.6 s a turn: 6 frames a turn, so slow to 2 s a turn.
  const fast = run(10, 0.6);
  assert.equal(fit.slowerTurn(fast, 12), 2);
  // The rider gone for more than a second: nothing, never a number that is not real.
  assert.equal(fit.slowerTurn(fast, 13.5), null);
  assert.equal(fit.slowerTurn(fast.slice(0, 1), 0.1), null);
  // Fast pedalling earlier, slow now: the old strokes no longer count.
  const slowed = [...run(10, 0.6, 0, 6), ...run(30, 2.5, 6, 14)];
  assert.equal(fit.slowerTurn(slowed, 14), null);
  // Enough frames each: nothing to say.
  assert.equal(fit.slowerTurn(run(30, 2), 12), null);
  // 3 poses a second at 1 s a turn: 4 s a turn.
  assert.equal(fit.slowerTurn(run(3, 1), 12), 4);
  // Under 2 poses a second it would ask for more than SLOWEST_TURN, which the app cannot follow.
  assert.equal(fit.slowerTurn(run(1.5, 1), 12), null);
  assert.equal(fit.slowerTurn(run(0.8, 0.5), 12), null);
});

test('the slowest turn the app asks for is one the pedalling check still follows', async () => {
  const { synthPose } = await import('./synth.js');
  // The same check as the pedal step in app.js: more than 5 samples in 2 s, then fit.isPedalling.
  for (const fps of [3, 10, 30]) {
    const samples = [];
    let last = 0, worst = 0;
    for (let t = 0; t < 30; t += 1 / fps) {
      samples.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + (2 * Math.PI * t) / fit.SLOWEST_TURN), 'L', 1280, 720) });
      const win = samples.filter(s => s.t > t - 2);
      const moving = win.length > 5 && fit.isPedalling(win, fit.median(win.map(s => s.thigh)) * 2);
      if (moving) last = t; else if (t > 4) worst = Math.max(worst, t - last);
    }
    assert.ok(worst < 3, `${fps} poses a second: the turning was lost for ${worst.toFixed(1)} s`);
  }
});

test('what "I made this change" stores, and the home card that asks for the retest', () => {
  const raise = { kind: 'saddle', raise: true, mm: [9, 12] };
  assert.deepEqual(fit.madeChange(raise, '12', 'T'), { kind: 'saddle', dir: 1, mm: 12, at: 'T' });
  assert.equal(fit.madeChange(raise, '40', 'T').mm, 15); // never more than 15 mm in one go
  assert.equal(fit.madeChange(raise, '0', 'T').mm, 9);
  assert.equal(fit.madeChange(raise, '', 'T').mm, 9);
  assert.equal(fit.madeChange({ ...raise, raise: false }, 7.6, 'T').dir, -1);
  assert.equal(fit.madeChange({ ...raise, raise: false }, 7.6, 'T').mm, 8);
  assert.deepEqual(fit.madeChange({ kind: 'bars' }, '5', 'T'), { kind: 'bars', at: 'T' });
  assert.equal(fit.madeChange(null, '5', 'T'), null);
  assert.equal(fit.retestPrompt({ kind: 'saddle', dir: 1, mm: 15 }, '9 Oct'), 'On 9 Oct you raised the saddle 15 mm. Film again to see what it did. About 3 minutes. Tap Start below.');
  assert.equal(fit.retestPrompt({ kind: 'saddle', dir: -1, mm: 8 }, '9 Oct'), 'On 9 Oct you lowered the saddle 8 mm. Film again to see what it did. About 3 minutes. Tap Start below.');
  assert.equal(fit.retestPrompt({ kind: 'bars' }, '9 Oct'), 'On 9 Oct you raised the handlebars. Film again to see what it did. About 3 minutes. Tap Start below.');
});

// ── results by area ─────────────────────────────────────────────────────────────────────────
const areasOf = (still, pedal) => { const r = fit.advise(still, pedal); return Object.fromEntries(fit.areas(r, fit.measures(r, pedal)).map(a => [a.key, a])); };

test('areas: a low saddle gives one red area, and reach waits for it', () => {
  const low = trueKneeFlexBDC([-220, 700]);
  const a = areasOf({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 });
  assert.equal(a.saddle.name, 'Saddle height');
  assert.equal(a.saddle.grade, 'red');
  assert.equal(a.saddle.status, 'Needs attention');
  assert.equal(a.saddle.step, 'Raise the saddle about 15 mm.');
  assert.equal(a.saddle.why, fit.headline(fit.advise({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 })).why);
  assert.deepEqual(a.saddle.rows.map(x => x.key), ['kneePedal', 'kneeStill']);
  assert.equal(a.reach.name, 'Reach and bar height');
  assert.equal(a.reach.status, 'After the saddle');
  assert.equal(a.reach.step, 'Nothing to do yet.');
  assert.deepEqual(a.reach.rows.map(x => x.key), ['torso', 'elbow', 'shoulder']);
  assert.equal(a.more.grade, 'info');
  assert.deepEqual(a.more.rows.map(x => x.key), ['hipBottom']);
});

test('areas: all in range is Good twice', () => {
  const a = areasOf({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(a.saddle.status, 'Good');
  assert.equal(a.saddle.step, 'Leave the saddle height as it is.');
  assert.equal(a.reach.status, 'Good');
  assert.equal(a.reach.why, 'Your back, elbow and shoulder angles are all inside their targets.');
  assert.equal(a.reach.step, 'No change needed.');
  // Within 2.5 degrees of a target is in range, but not "inside" it.
  const edge = areasOf(null, { strokes: 12, kneeFlex: 36, torso: 38, elbow: 22, shoulder: 88 });
  assert.equal(edge.reach.status, 'Good');
  assert.match(edge.reach.why, /all in range, each inside its target or within 2\.5° of it\./);
});

test('areas: a long, low front end with the saddle right', () => {
  const a = areasOf(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 });
  assert.equal(a.saddle.status, 'Good');
  assert.equal(a.reach.status, 'Needs attention');
  assert.equal(a.reach.step, 'Raise the handlebars: move one spacer from above the stem to below it.');
  assert.match(a.reach.why, /^Your back is low \(34°, target 40 to 50\).*so the front of the bike is long and low\.$/);
});

test('areas: one angle out on its own is Borderline, with nothing to change', () => {
  const a = areasOf(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 });
  assert.equal(a.reach.status, 'Borderline');
  assert.equal(a.reach.step, 'Nothing to change on its own. Compare it next time.');
  assert.match(a.reach.why, /^Your shoulder angle is outside its target\./);
  // A cramped rider: three angles out, but not two signs of a long, low front, so still no bars change.
  const c = areasOf(null, { strokes: 12, kneeFlex: 35, torso: 30, elbow: 40, shoulder: 66 });
  assert.equal(c.reach.status, 'Borderline');
  assert.match(c.reach.why, /^Your back angle, elbow bend and shoulder angle are outside their targets\./);
});

test('areas: by verdict, and every area has one step and no Excellent', () => {
  const cases = [
    [{ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 }], // disagree
    [{ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, null], // still only, out of range
    [{ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, null], // still only, in range
    [null, null], // nothing
    [null, { strokes: 2, strokesSeen: 9, kneeFlex: NaN }], // pedalled too fast
    [null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 }],
    [null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 }],
    [null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 }],
  ];
  const got = cases.map(([s, p]) => areasOf(s, p));
  assert.equal(got[0].saddle.status, 'Borderline');
  assert.equal(got[0].saddle.step, 'Film again: your two knee readings point different ways.');
  assert.equal(got[1].saddle.status, 'Borderline'); // capped: no millimetres from the held-still reading alone
  assert.equal(got[1].saddle.step, 'Film again and pedal backwards for the full 20 seconds.');
  assert.equal(got[2].saddle.status, 'Good');
  assert.equal(got[3].saddle.status, 'No reading');
  assert.equal(got[3].saddle.step, 'Film again, with your whole body and bike in the picture.');
  assert.equal(got[3].reach.status, 'No reading');
  assert.equal(got[4].saddle.step, 'Film again and pedal backwards more slowly.');
  for (const a of got) {
    assert.deepEqual(Object.keys(a), ['saddle', 'reach', 'more']);
    for (const x of Object.values(a)) {
      assert.ok(typeof x.step === 'string' && x.step.length > 0, x.key);
      assert.ok(x.why && !/\u2014/.test(x.why + x.step), x.key);
      assert.ok(!/Excellent/.test(x.status), x.status);
      assert.ok(x.status, x.key);
    }
  }
});

test('areas: a retest that holds the change back', () => {
  const pedal = { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 };
  const r = fit.withRetest(fit.advise(null, pedal), fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' }, { knee: 47, src: 'pedalling' }));
  const a = Object.fromEntries(fit.areas(r, fit.measures(r, pedal)).map(x => [x.key, x]));
  assert.equal(a.saddle.step, 'Film once more before you change anything.');
  assert.equal(a.reach.status, 'After the saddle');
});

// ── pain or numbness ────────────────────────────────────────────────────────────────────────
test('pain or numbness: said first, and it does not change the advice', () => {
  const pedal = { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 };
  const r = fit.advise(null, pedal);
  const said = fit.spokenSummary(r, { pain: true });
  assert.ok(said.startsWith('You said you get pain or numbness'), said);
  assert.match(said, /professional bike fitter/);
  assert.ok(!fit.spokenSummary(r).startsWith('You said you get pain or numbness'));
  assert.ok(!/pain/.test(fit.spokenSummary(r)));
  assert.equal(said, `${said.slice(0, said.indexOf('One change'))}${fit.spokenSummary(r)}`); // the rest is unchanged
  assert.deepEqual(fit.advise(null, pedal), r);
  assert.equal(fit.painNote(r), 'You said you get pain or numbness. Please see a professional bike fitter. The change below is only a starting point.');
  assert.match(fit.painNote(fit.advise(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88 })), /These results are only a starting point\.$/);
  // Before the retest line too.
  const re = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' }, { knee: 47, src: 'pedalling' }));
  assert.match(fit.spokenSummary(re, { pain: true }), /^You said you get pain or numbness.*starting point\. Knee bend 43 degrees before/);
  for (const t of [said, fit.painNote(r)]) { assert.ok(!/\u2014/.test(t)); assert.ok(!/°/.test(t)); }
});

test('a retest on two readings that disagree keeps the disagree wording', () => {
  const r = fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 });
  const re = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 41, src: 'pedalling' }, { knee: 46, src: 'pedalling' }));
  assert.equal(re.retest.verdict, 'other-way');
  assert.equal(fit.headline(re).what, 'Film again');
  assert.equal((fit.headline(re).why.match(/will not suggest/g) || []).length, 1);
  assert.match(fit.spokenSummary(re), /^Knee bend 41 degrees before, 46 degrees now\..*point different ways/);
});
