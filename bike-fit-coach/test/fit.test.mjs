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

// Round 4: Good only inside the band by more than u, Fair within u of an edge, then Needs attention
// (SPEC 4.3). Was: green to 2.5 degrees past the band, then a fixed amber pad. measure.test.mjs has the rest.
test('grading: Good inside by more than u, Fair within u of an edge, Needs attention beyond', () => {
  assert.equal(fit.grade('kneeDynamic', 39.9), 'green');
  assert.equal(fit.grade('kneeDynamic', 40), 'amber');
  assert.equal(fit.grade('kneeDynamic', 46), 'amber');
  assert.equal(fit.grade('kneeDynamic', 46.1), 'red');
  assert.equal(fit.grade('kneeDynamic', 27.5), 'red'); // was green: on 33 to 43 it is a high saddle
  assert.equal(fit.grade('kneeStatic', 37.5), 'amber');
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
  assert.equal(r.change.headline, 'Raise the saddle about 3 mm'); // 1 degree past 43 + u: the smallest step (was 15 mm)
  assert.ok(!/most to change in one go/.test(r.change.why)); // the cap is said only with pain
  assert.equal(r.kneeSource, 'pedalling');
});

test('advice: past u gives one step, in-range knee leaves the saddle alone', () => {
  // Was 43: "about 9 to 12 mm". 43 is now inside the band; 49.5 is 3.5 degrees past 43 + u: 7 mm, so 5.
  const r = fit.advise(null, { strokes: 12, kneeFlex: 49.5, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.change.headline, 'Raise the saddle about 5 mm');
  assert.equal(r.overall, 'red');
  const ok = fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(ok.change, null);
  assert.equal(ok.overall, 'green');
  assert.equal(ok.disagree, false);
  assert.match(fit.spokenSummary(ok), /^Nothing to change today\. Your saddle height looks right\./); // looks: the camera is off by a few degrees
});

test('advice: falls back to the still reading when pedalling failed, and flags disagreement', () => {
  const r = fit.advise({ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 2, kneeFlex: NaN });
  assert.equal(r.kneeSource, 'still');
  assert.equal(r.verdict, 'stillOnly');
  assert.equal(r.change, null); // no millimetres from the held-still reading alone
  assert.equal(r.overall, 'amber');
  // 47, not 46: 46 is now within u of the edge, which asks for one more film on its own.
  const d = fit.advise({ kneeFlex: 20, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(d.verdict, 'disagree');
  assert.equal(d.disagree, true);
  assert.equal(d.change, null);
  assert.equal(d.overall, 'amber');
  assert.match(fit.spokenSummary(d), /point different ways/);
});

test('advice: one reading Fair and the other out is not a disagreement', () => {
  // Was 43.5 pedalling, 11 to 14 mm: now inside the band. 47 is past u: the smallest step.
  const r = fit.advise({ kneeFlex: 34, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.verdict, 'change');
  assert.equal(r.disagree, false);
  assert.equal(r.change.headline, 'Raise the saddle about 3 mm');
  assert.deepEqual(r.change.mm, [3, 3]);
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
  assert.match(r.change.why, /^Your back is low \(34°, target 40 to 50\), your arms reach far forward \(shoulder 100°\) and your elbows are locked straight \(5°, target 15 to 30\), so the front of the bike is long and low\./);
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
  // Round 4: the elbow, not the shoulder, which is for reference only now (SPEC 4.2).
  const one = fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 40, shoulder: 60 });
  assert.equal(one.overall, 'amber');
  assert.equal(one.change, null);
  // The other angles are in the longer version that "Say it again" speaks.
  const said = fit.spokenSummary(one, { long: true });
  assert.match(said, /^Nothing to change today\./);
  assert.match(said, /Your back angle looks good\./);
  assert.match(said, /Your elbow bend is outside the target\. That is fine to ride\./);
  assert.ok(!/shoulder/.test(said), said);
  const both = fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 60 }), { long: true });
  assert.match(both, /Your back angle and elbow bend look good\./);
  // Only just outside (within u): "a little outside".
  assert.match(fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 32, shoulder: 75 }), { long: true }), /Your elbow bend is a little outside the target\./);
});

test('result rows: a status, a reason and exactly one step each', () => {
  const pedal = { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 };
  const r = fit.advise({ kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 }, pedal);
  const rows = fit.measures(r, pedal);
  const by = Object.fromEntries(rows.map(x => [x.key, x]));
  assert.equal(by.kneePedal.status, 'Needs attention');
  assert.equal(by.kneePedal.step, 'Raise the saddle about 3 mm.');
  assert.match(by.kneePedal.why, /saddle is probably low/);
  assert.equal(by.kneeStill.status, 'Fair');
  for (const k of ['torso', 'elbow']) assert.equal(by[k].status, 'After the saddle', k); // they wait for the saddle
  assert.equal(by.shoulder.status, 'For reference'); // no target to grade it on (SPEC 4.2)
  assert.equal(by.torso.step, 'No change needed.');
  assert.equal(by.hipBottom.status, 'For reference');
  const off = fit.measures(fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 40, shoulder: 66 }), { strokes: 12, kneeFlex: 47 });
  assert.match(off.find(x => x.key === 'elbow').step, /Change the saddle first/);
  const alone = fit.measures(fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 66 }), { strokes: 12, kneeFlex: 38 });
  assert.equal(alone.find(x => x.key === 'shoulder').step, 'Nothing to do. It is for reference only.');
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
  // The hip is never compared with last time on screen, so nothing says it is there "to compare".
  for (const x of [...Object.values(solo), ...Object.values(none)]) assert.ok(!/compare next time/.test(x.step), x.key);
  assert.ok(!/compare/.test(fit.areas(fit.advise(null, undefined), fit.measures(fit.advise(null, undefined), undefined))[2].step));
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
  assert.equal(hip.name, 'Hip angle with the pedal at its lowest');
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
  assert.match(row.why, /^The pedal may not have been at its lowest point when you held still \(it looked about \d+° off\)/);
  assert.equal(row.step, 'Next time, hold the pedal arm pointing straight down.');
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

test('spoken summary: the action first and short, then stop; the reason is in the longer version', () => {
  const low = trueKneeFlexBDC([-220, 700]);
  const r = fit.advise({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  const said = fit.spokenSummary(r);
  assert.equal(said, 'Raise the saddle about 3 millimetres. Change only that. When you have moved it, tell me how far.'); // was 15
  const long = fit.spokenSummary(r, { long: true });
  assert.ok(long.startsWith(said), long);
  assert.match(long, /so the saddle is a little low\./);
  assert.match(r.change.why, /so the saddle is a little low/);
  const far = fit.advise(null, { strokes: 12, kneeFlex: 52, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.spokenSummary(far), /^Raise the saddle about 10 millimetres\./);
  assert.match(fit.spokenSummary(far, { long: true }), /so the saddle is too low\./);
  // With pain: at most 5, and said why in the longer version.
  const sore = fit.advise(null, { strokes: 12, kneeFlex: 52, torso: 45, elbow: 22, shoulder: 88 }, null, { pain: true });
  assert.match(fit.spokenSummary(sore), /^Raise the saddle about 5 millimetres\./);
  assert.match(fit.spokenSummary(sore, { long: true }), /With pain, 5 millimetres is the most to change in one go\./);
  const little = fit.advise(null, { strokes: 12, kneeFlex: 49.5, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.spokenSummary(little), /^Raise the saddle about 5 millimetres\./); // was 43: 9 to 12
  assert.match(fit.spokenSummary(little, { long: true }), /a little low\./);
  const high = fit.advise(null, { strokes: 12, kneeFlex: 26, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.spokenSummary(high), /^Lower the saddle about 5 millimetres\./); // was 12 to 15
  const bars = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 });
  assert.equal(fit.spokenSummary(bars), 'Raise the handlebars: move one spacer from above the stem to below it. Change only that. Then tap I made this change.');
  assert.match(fit.spokenSummary(bars, { long: true }), /Your back is low, .*long and low\.$/);
  const cases = [r, far, sore, little, high, bars, fit.advise(null, null), fit.advise({ kneeFlex: 40 }, null), fit.advise({ kneeFlex: 30 }, null),
    fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 46 }), fit.advise({ kneeFlex: 40 }, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 })];
  for (const c of cases) for (const long of [false, true]) {
    const t = fit.spokenSummary(c, { long });
    assert.ok(!/Check the picture on the screen/.test(t), t);
    assert.ok(!/\u2014/.test(t), t);
    assert.ok(!/°/.test(t), t); // spoken: "degrees", not the symbol
    assert.ok(!/hood|crank|bottom of the stroke/.test(t), t); // rider words
  }
});

test('result rows: honest in-range wording and a real step on every row', () => {
  const pedal = { strokes: 12, strokesSeen: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 };
  const rows = fit.measures(fit.advise({ kneeFlex: 37, torso: 45, elbow: 22, shoulder: 88 }, pedal), pedal);
  const still = rows.find(x => x.key === 'kneeStill');
  // Just outside, within u: Fair, never "inside" (was "within 2.5°... counts as in range").
  assert.match(still.why, /within 3° of the 25 to 35 target/);
  assert.match(still.why, /closer than a phone camera can tell apart/);
  assert.equal(still.status, 'Fair');
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
  for (const k of ['torso', 'elbow']) assert.equal(rows.find(x => x.key === k).status, 'After the saddle');
  assert.equal(rows.find(x => x.key === 'shoulder').status, 'For reference');
});

test('headline by verdict', () => {
  // The headline gives the decision in words; the "Saddle height" area gives the numbers behind it.
  const dis = fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 47 });
  assert.equal(fit.headline(dis).what, 'Film again');
  assert.equal(fit.headline(dis).why, 'Your two knee readings point different ways, so I will not suggest a change yet.');
  assert.equal(fit.saddleWhy(dis), 'Held still, your knee bends 20°, under the 25 to 35 target. Pedalling, it bends 47°, over the 33 to 43 target.');
  const so = fit.headline(fit.advise({ kneeFlex: 40 }, null));
  assert.equal(so.what, 'Film again before you move the saddle');
  assert.match(so.why, /^I could not measure you pedalling\. Held still, your knee is outside its range, but that reading alone cannot say how far to move the saddle\./);
  assert.match(fit.saddleWhy(fit.advise({ kneeFlex: 40 }, null)), /^Held still, your knee bends 40°, outside the 25 to 35 target\. On its own that is only a cross-check/);
  assert.equal(fit.headline(fit.advise({ kneeFlex: 30 }, null)).what, 'Saddle height looks right, held still');
  const okR = fit.advise(null, { strokes: 12, kneeFlex: 41, torso: 45, elbow: 22, shoulder: 60 });
  const ok = fit.headline(okR);
  assert.equal(ok.what, 'Nothing to change today');
  // 41 is inside 33 to 43 but within u of its edge: Fair; the shoulder at 60 is for reference only.
  assert.equal(ok.why, 'Your knee is in range, near the edge. Your back and elbow angles are in range too.');
  assert.equal(fit.saddleWhy(okR), 'Your knee bends 41° with the pedal at its lowest point, inside the 33 to 43 target, near its edge.');
  assert.equal(fit.headline(fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 })).why, 'Your saddle height looks right. Your back and elbow angles are in range too.');
  assert.equal(fit.headline(fit.advise(null, null)).what, 'Not enough to measure');
  // A saddle change: the reason in words under the headline, the numbers in the area, never the same sentence twice.
  const low = fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(fit.headline(low).why, 'Your knee bends a little too much with the pedal at its lowest point, so the saddle is a little low. Change only this for now: moving the saddle changes your reach too.');
  assert.equal(fit.saddleWhy(low), 'Your knee is still bent 47° with the pedal at its lowest point. The target is 33 to 43, so the saddle is a little low.');
  // The words follow the step: "too" for 10 mm.
  assert.match(fit.headline(fit.advise(null, { strokes: 12, kneeFlex: 52 })).why, /^Your knee bends too much with the pedal at its lowest point, so the saddle is too low\./);
  assert.match(fit.headline(fit.advise(null, { strokes: 12, kneeFlex: 26, torso: 45, elbow: 22, shoulder: 88 })).why, /^Your knee does not bend quite enough with the pedal at its lowest point, so the saddle is a little high\./);
  const bars = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 });
  assert.match(fit.headline(bars).why, /^Your back is low, your arms reach far forward and your elbows are locked straight, so the front of the bike is long and low\. If one spacer is not enough, a shorter stem is the next step\.$/);
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
  // Moved the right way and in range now: leave it, said without numbers.
  const ok = fit.judgeChange(prev, { knee: 40, src: 'pedalling' });
  assert.equal(ok.verdict, 'consistent');
  assert.equal(ok.inRange, true);
  assert.equal(ok.text, 'Knee bend 43° before, 40° now. It moved the right way and is in range now, so leave the saddle where it is.');
  assert.equal(ok.spoken, 'Your knee moved the right way, and it is in range now. Leave the saddle where it is.');
  assert.ok(!/\d/.test(ok.spoken), ok.spoken);
  assert.equal(fit.judgeChange(prev, { knee: 47, src: 'pedalling' }).verdict, 'other-way');
  assert.equal(fit.judgeChange(prev, { knee: 33, src: 'pedalling' }).verdict, 'too-much'); // moved 10, more than 3.3 + 3
  assert.equal(fit.judgeChange(prev, { knee: 40, src: 'still' }), null);
  assert.equal(fit.judgeChange({ knee: 43, src: 'pedalling' }, { knee: 40, src: 'pedalling' }), null);
  assert.equal(fit.judgeChange(prev, { knee: NaN, src: 'pedalling' }), null);
  assert.equal(fit.judgeChange({ ...prev, made: { kind: 'bars' } }, { knee: 40, src: 'pedalling' }), null); // no angles to show
  // Less than SAME_TOL either way is too small for the camera to see: 'unseen', never "That fits".
  for (const k of [41, 43, 44, 45.9]) assert.equal(fit.judgeChange(prev, { knee: k, src: 'pedalling' }).verdict, 'unseen', `43 to ${k}`);
  // Still out of range after a change that did what it should: the next step follows.
  const fits = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 50, src: 'pedalling' }, { knee: 46, src: 'pedalling' });
  assert.equal(fits.verdict, 'consistent');
  assert.match(fits.text, /^Knee bend 50° before, 46° now\. A 15 mm raise should change it by about 4 to 5°\. That fits\. The next step is below\.$/);
  // Spoken, one number to a sentence, so each sentence is one recorded clip.
  assert.match(fits.spoken, /^Knee bend 50 degrees before\. 46 degrees now\. A 15 millimetre raise.*That fits\. Here is the next step\.$/);
  // A lowered saddle should add knee bend.
  const drop = { made: { kind: 'saddle', dir: -1, mm: 12 }, knee: 22, src: 'pedalling' };
  assert.equal(fit.judgeChange(drop, { knee: 26, src: 'pedalling' }).verdict, 'consistent');
  assert.match(fit.judgeChange(drop, { knee: 26, src: 'pedalling' }).text, /A 12 mm drop should change it by about 3 to 4°\. That fits\./);
  assert.equal(fit.judgeChange(drop, { knee: 18, src: 'pedalling' }).verdict, 'other-way');
  assert.match(fit.judgeChange(drop, { knee: 18, src: 'pedalling' }).text, /It moved the other way\. Check the saddle really moved, then film once more before you change anything else\.$/);
  // 10 mm, not 5: a 5 mm step is now too small for the camera to judge (SPEC 4.4, item 4).
  assert.equal(fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 5 }, knee: 52, src: 'pedalling' }, { knee: 44, src: 'pedalling' }).verdict, 'too-small');
  const more = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 52, src: 'pedalling' }, { knee: 44, src: 'pedalling' });
  assert.equal(more.verdict, 'too-much');
  assert.match(more.text, /That is more than the change should do\. Film once more to check\.$/);
  for (const k of [33, 40, 44, 47]) assert.ok(!/\u2014/.test(fit.judgeChange(prev, { knee: k, src: 'pedalling' }).text));
});

test('in range after a saddle change: leave it, even when the size did not fit (the review\'s case)', () => {
  // 15 mm raise, knee 49 to 37: more than a 15 mm raise should do, but in range now.
  const prev = { made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 49, src: 'pedalling', setup: 'wall' };
  const pedal = { strokes: 10, strokesSeen: 10, kneeFlex: 37, torso: 45, elbow: 22, shoulder: 88 };
  const j = fit.judgeChange(prev, { knee: 37, src: 'pedalling', setup: 'wall' });
  assert.equal(j.verdict, 'too-much');
  assert.equal(j.text, 'Knee bend 49° before, 37° now. It moved the right way and is in range now, so leave the saddle where it is. That is more than a 15 mm raise usually does. What counts is where it is now.');
  assert.equal(j.spoken, 'Your knee moved the right way, and it is in range now. Leave the saddle where it is.');
  const r = fit.withRetest(fit.advise(null, pedal, 'wall'), j);
  assert.ok(!r.held, 'not held, so the change is checked and the Film again card goes');
  assert.equal(fit.headline(r).what, 'Nothing to change today');
  const a = Object.fromEntries(fit.areas(r, fit.measures(r, pedal)).map(x => [x.key, x]));
  assert.equal(a.saddle.grade, 'green');
  assert.equal(a.saddle.step, 'Leave the saddle height as it is.');
  assert.equal(fit.pendingChange([{ at: 'B', setup: 'wall', knee: 37, src: 'pedalling' }, { ...prev, at: 'A' }]), null);
  // Less than it should, in range: "less than".
  const less = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 40 }, knee: 46, src: 'pedalling' }, { knee: 40, src: 'pedalling' });
  assert.equal(less.verdict, 'too-little');
  assert.match(less.text, /That is less than a 40 mm raise usually does\. What counts is where it is now\.$/);
  // In range but moved the other way: leave it, and check the saddle. Not held.
  const back = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 35, src: 'pedalling' }, { knee: 40, src: 'pedalling' });
  assert.equal(back.verdict, 'other-way');
  assert.match(back.text, /in range now, so leave the saddle where it is\. Check the saddle is where you left it\.$/);
  assert.ok(!fit.withRetest(fit.advise(null, { ...pedal, kneeFlex: 40 }), back).held);
  // 15 mm, 49 to 45: moved 4, the size fits, still out of range: "That fits".
  const fits = fit.judgeChange(prev, { knee: 45, src: 'pedalling', setup: 'wall' });
  assert.equal(fits.verdict, 'consistent');
  assert.match(fits.text, /That fits\./);
  // 15 mm, 45 to 38: in range now, said so.
  assert.match(fit.judgeChange({ ...prev, knee: 45 }, { knee: 38, src: 'pedalling', setup: 'wall' }).text, /in range now/);
});

test('a change the camera cannot see is not "That fits": unseen, held once', () => {
  // 10 mm raise, knee 49 to 49: a 10 mm raise should change it by about 3 degrees.
  const prev = { made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 49, src: 'pedalling', setup: 'wall' };
  const j = fit.judgeChange(prev, { knee: 49, src: 'pedalling', setup: 'wall' });
  assert.equal(j.verdict, 'unseen');
  assert.equal(j.text, 'Knee bend 49° before, 49° now. A 10 mm raise should change it by about 3°, about the smallest change this camera can see, so I cannot tell yet whether the saddle moved. Check the tape mark, then film once more.');
  assert.ok(!/fits/.test(j.text + j.spoken));
  const pedal = { strokes: 10, strokesSeen: 10, kneeFlex: 49, torso: 45, elbow: 22, shoulder: 88 };
  const r = fit.withRetest(fit.advise(null, pedal, 'wall'), j);
  assert.equal(r.held, true);
  assert.equal(r.change, null);
  assert.equal(fit.headline(r).what, 'Film once more');
  // A 5 mm raise with no movement: too small to see (round 4, SPEC 4.4), never "That fits".
  assert.equal(fit.judgeChange({ ...prev, made: { ...prev.made, mm: 5 }, knee: 43 }, { knee: 43, src: 'pedalling', setup: 'wall' }).verdict, 'too-small');
  // A big change that did not show: it hardly changed.
  const big = fit.judgeChange({ ...prev, made: { ...prev.made, mm: 30 } }, { knee: 48, src: 'pedalling', setup: 'wall' });
  assert.equal(big.verdict, 'unseen');
  assert.match(big.text, /should change it by about 8 to 10°, but it hardly changed\. Check the tape mark, then film once more\.$/);
  // "That fits" only from at least SAME_TOL the right way up to the expected most plus SAME_TOL.
  for (const mm of [5, 10, 15, 25, 40]) for (let k = 30; k <= 60; k += 0.5) {
    const v = fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm }, knee: 55, src: 'pedalling' }, { knee: k, src: 'pedalling' });
    const moved = 55 - k;
    const fitsSaid = /That fits/.test(v.text + v.spoken);
    assert.equal(fitsSaid, moved >= fit.SAME_TOL && moved <= mm / 3 + fit.SAME_TOL && moved >= mm / 4 - fit.SAME_TOL && !v.inRange && !fit.tooSmallToSee(mm), `${mm} mm, 55 to ${k}`);
  }
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
  assert.equal(fit.headline(other).why, 'Your last change did not do what it should have, so I will not suggest another one until one more film shows what it did.');
  assert.equal(fit.saddleWhy(other), 'Your knee bends 47° with the pedal at its lowest point, outside the 33 to 43 target.');
  const said = fit.spokenSummary(other);
  assert.ok(said.startsWith('Knee bend 43 degrees before. 47 degrees now.'), said);
  assert.ok(!/°/.test(said), said);
  const fits = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 15 }, knee: 51, src: 'pedalling' }, { knee: r.knee, src: r.kneeSource }));
  assert.equal(fits.retest.verdict, 'consistent');
  assert.equal(fits.change.kind, 'saddle'); // it did what it should, so the next step stands
  assert.ok(fit.spokenSummary(fits).startsWith('Knee bend'));
  assert.match(fit.spokenSummary(fits), /That fits\. Here is the next step\. Raise the saddle/);
  assert.equal(fit.withRetest(r, null), r);
});

test('in range, but the saddle move did not fit: only a handlebar change waits, once', () => {
  // 38, not 36: 36 is now Fair (within u of 33), and this case needs the saddle Good.
  const pedal = { strokes: 12, strokesSeen: 12, kneeFlex: 38, torso: 34, elbow: 5, shoulder: 100 };
  const r = fit.advise(null, pedal, 'wall');
  assert.equal(r.change.kind, 'bars');
  const made = { at: 'A', setup: 'wall', knee: 49, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 15, at: 'A' } };
  const w = fit.withRetest(r, fit.judgeChange(fit.pendingChange([made]), { knee: 38, src: 'pedalling', setup: 'wall' }));
  assert.equal(w.retest.verdict, 'too-much');
  assert.equal(w.change, null);
  assert.equal(w.held, true);
  assert.equal(w.heldBars.kind, 'bars');
  assert.equal(fit.headline(w).what, 'Film once more before you change the handlebars');
  const a = Object.fromEntries(fit.areas(w, fit.measures(w, pedal)).map(x => [x.key, x]));
  assert.equal(a.saddle.grade, 'green');
  assert.equal(a.saddle.step, 'Leave the saddle height as it is.');
  assert.notEqual(a.reach.grade, 'green');
  assert.equal(a.reach.step, 'Film once more before you change the handlebars.');
  assert.match(fit.spokenSummary(w), /Leave the saddle where it is\. Film once more before you change the handlebars\.$/);
  // Saved with held: true, the next film is the one-time recheck, and the bars change then goes ahead.
  const h = [{ at: 'B', setup: 'wall', knee: 38, src: 'pedalling', held: true }, made];
  const again = fit.judgeChange(fit.pendingChange(h), { knee: 38, src: 'pedalling', setup: 'wall' });
  assert.equal(again.recheck, true);
  const w2 = fit.withRetest(r, again);
  assert.ok(!w2.held);
  assert.equal(w2.change.kind, 'bars');
});

test('no Good area beside a "film once more" or "did not do what it should" headline about it', () => {
  // Over every verdict and in-range case: when the headline asks to film the saddle once more, no
  // area is Good; when it asks before a handlebar change (heldBars), that area is not Good. A Good area
  // never has a "film once more" step of its own.
  const pedalOf = (k) => ({ strokes: 12, strokesSeen: 12, kneeFlex: k, torso: 45, elbow: 22, shoulder: 88 });
  const barsPedal = (k) => ({ strokes: 12, strokesSeen: 12, kneeFlex: k, torso: 34, elbow: 5, shoulder: 100 });
  const verdicts = new Set();
  let n = 0;
  for (const recheck of [false, true]) for (const mm of [5, 10, 15, 30]) for (let before = 22; before <= 54; before += 2) for (let now = 22; now <= 54; now += 2) for (const pf of [pedalOf, barsPedal]) {
    const dir = before > 35 ? 1 : -1;
    const prev = { made: { kind: 'saddle', dir, mm }, knee: before, src: 'pedalling', recheck };
    const p = pf(now);
    const j = fit.judgeChange(prev, { knee: now, src: 'pedalling' });
    verdicts.add(`${j.verdict} ${j.inRange}`);
    const r = fit.withRetest(fit.advise(null, p), j);
    const h = fit.headline(r);
    const a = Object.fromEntries(fit.areas(r, fit.measures(r, p)).map(x => [x.key, x]));
    const asks = /^Film once more/.test(h.what) || /did not do what it should/.test(h.why);
    if (asks && !r.heldBars) assert.ok(Object.values(a).every(x => x.grade !== 'green'), `${mm} mm ${before} to ${now}: ${h.what} with a Good area`);
    if (r.heldBars) assert.ok(a.reach.grade !== 'green' && !/did not do what it should/.test(h.why), `${mm} mm ${before} to ${now}`);
    for (const x of Object.values(a)) if (x.grade === 'green') assert.ok(!/[Ff]ilm once more/.test(x.step), `${x.key}: ${x.step}`);
    n++;
  }
  for (const v of ['other-way', 'unseen', 'too-little', 'too-much', 'consistent']) for (const ir of [true, false]) {
    if (!(v === 'too-little' && ir)) assert.ok(verdicts.has(`${v} ${ir}`), `${v} ${ir} not covered`);
  }
  assert.ok(n > 1000);
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
  // Round 4: 50 before and 46.5 after, so the reading after a change that fits is still past 43 + u
  // (was 47 and 43; 43 is inside the band now).
  const madeAt = { at: 'A', knee: 50, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 15, at: 'A' } };
  const pedal = (k) => ({ strokes: 12, strokesSeen: 12, kneeFlex: k, torso: 45, elbow: 22, shoulder: 88 });
  // Film 2: no change showed up, so it is held back and saved with held: true.
  const r2 = fit.advise(null, pedal(50));
  const f2 = fit.withRetest(r2, fit.judgeChange(fit.pendingChange([madeAt]), { knee: r2.knee, src: r2.kneeSource }));
  assert.equal(f2.retest.verdict, 'unseen');
  assert.equal(f2.held, true);
  assert.match(fit.headline(f2).why, /until one more film shows what it did/);
  assert.match(fit.spokenSummary(f2), /Check the tape mark, then film once more\. I will not suggest another change until then\.$/);
  const history = [{ at: 'B', knee: 50, src: 'pedalling', held: true }, madeAt];
  // Film 3, the saddle now really moved: compared with film 1, and it fits.
  const r3 = fit.advise(null, pedal(46.5));
  const f3 = fit.withRetest(r3, fit.judgeChange(fit.pendingChange(history), { knee: r3.knee, src: r3.kneeSource }));
  assert.equal(f3.retest.verdict, 'consistent');
  assert.match(f3.retest.text, /^Knee bend 50° before, 47° now\. A 15 mm raise should change it by about 4 to 5°\. That fits\./);
  assert.equal(f3.change.kind, 'saddle');
  assert.ok(!f3.held);
  // Film 3, still no change: the second look does not hold back again, it goes by the reading.
  const r3b = fit.advise(null, pedal(50));
  const f3b = fit.withRetest(r3b, fit.judgeChange(fit.pendingChange(history), { knee: r3b.knee, src: r3b.kneeSource }));
  assert.equal(f3b.retest.verdict, 'unseen');
  assert.equal(f3b.retest.recheck, true);
  assert.ok(!f3b.held);
  assert.equal(f3b.change.kind, 'saddle');
  assert.match(f3b.retest.text, /That still does not fit the change, so I go by this reading\. The next step is below\.$/);
  assert.match(fit.spokenSummary(f3b), /so I go by this reading\. Here is the next step\. Raise the saddle/);
  assert.notEqual(fit.headline(f3b).what, 'Film once more');
  // In range on the second look: leave it.
  const r3c = fit.advise(null, pedal(36));
  const j3c = fit.judgeChange(fit.pendingChange(history), { knee: r3c.knee, src: r3c.kneeSource });
  assert.equal(j3c.verdict, 'too-much');
  assert.match(j3c.text, /in range now, so leave the saddle where it is\./);
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

test('what "I made this change" stores: the number he gave, never the suggestion', () => {
  const raise = { kind: 'saddle', raise: true, mm: [9, 12] };
  assert.deepEqual(fit.madeChange(raise, '12', 'T'), { kind: 'saddle', dir: 1, mm: 12, at: 'T' });
  // More than 10 is saved as it is (the card says the check will be rougher); up to the input's 50.
  assert.equal(fit.madeChange({ kind: 'saddle', raise: true, mm: [15, 15] }, 25, 'T').mm, 25);
  assert.equal(fit.madeChange(raise, '40', 'T').mm, 40);
  assert.equal(fit.madeChange(raise, 50, 'T').mm, 50);
  assert.equal(fit.madeChange(raise, 51, 'T'), null);
  // No number, or not a usable one: nothing saved, and never the suggested millimetres in its place.
  assert.equal(fit.madeChange({ kind: 'saddle', raise: true, mm: [15, 15] }, '', 'T'), null);
  assert.equal(fit.madeChange(raise, '  ', 'T'), null);
  assert.equal(fit.madeChange(raise, undefined, 'T'), null);
  assert.equal(fit.madeChange(raise, '0', 'T'), null);
  assert.equal(fit.madeChange(raise, 'abc', 'T'), null);
  assert.equal(fit.madeChange({ ...raise, raise: false }, 7.6, 'T').dir, -1);
  assert.equal(fit.madeChange({ ...raise, raise: false }, 7.6, 'T').mm, 8);
  assert.deepEqual(fit.madeChange({ kind: 'bars' }, '5', 'T'), { kind: 'bars', at: 'T' });
  assert.equal(fit.madeChange(null, '5', 'T'), null);
  // 10 mm is the biggest step the app gives now (was 15).
  assert.equal(fit.madeNote(fit.madeChange(raise, 25, 'T')), 'Saved 25 mm. That is more than 10 mm, the most for one change, so this check will be rougher.');
  assert.equal(fit.madeNote(fit.madeChange(raise, 10, 'T')), 'Saved. Next time you film, I will check what it did.');
  assert.deepEqual(fit.MADE_CHOICES, [3, 5, 10]);
  // The home card, dated by the check, not by the tap.
  assert.equal(fit.retestPrompt({ kind: 'saddle', dir: 1, mm: 10 }, 'Oct 3'), 'You raised the saddle 10 mm after your Oct 3 check. Film again to see what it did. A few minutes.');
  assert.equal(fit.retestPrompt({ kind: 'saddle', dir: -1, mm: 8 }, 'Oct 3'), 'You lowered the saddle 8 mm after your Oct 3 check. Film again to see what it did. A few minutes.');
  assert.equal(fit.retestPrompt({ kind: 'bars' }, 'Oct 3'), 'You raised the handlebars after your Oct 3 check. Film again to see what it did. A few minutes.');
});

test('the history row: the change logged, or else the one suggested, and the pedalling knee', () => {
  const sug = { kind: 'saddle', raise: true, mm: [15, 15] };
  assert.deepEqual(fit.historyWords({ suggested: sug, made: { kind: 'saddle', dir: 1, mm: 10 }, values: { kneePedal: 49 } }), ['raised 10 mm', 'knee 49°']);
  assert.deepEqual(fit.historyWords({ suggested: sug, values: { kneePedal: 49 } }), ['suggested: raise about 15 mm', 'knee 49°']);
  assert.deepEqual(fit.historyWords({ suggested: { kind: 'saddle', raise: false, mm: [9, 12] }, values: {} }), ['suggested: lower about 9 to 12 mm']);
  assert.deepEqual(fit.historyWords({ suggested: { kind: 'bars' }, made: { kind: 'bars' }, values: { kneePedal: 36 } }), ['raised the handlebars', 'knee 36°']);
  assert.deepEqual(fit.historyWords({ values: { kneePedal: 37 } }), ['no change', 'knee 37°']);
  assert.deepEqual(fit.historyWords({ change: 'Raise the saddle about 15 mm' }), ['raise the saddle about 15 mm']); // saved before suggested existed
});

test('how to move the saddle: Park Tool\'s steps, with the limits said', () => {
  const up = fit.saddleHowTo(true), down = fit.saddleHowTo(false);
  assert.equal(up.title, 'How to raise the saddle');
  assert.equal(down.title, 'How to lower the saddle');
  const all = (h) => [h.title, ...h.steps, ...h.notes].join(' ');
  assert.match(all(up), /tape/);
  assert.match(all(up), /minimum insertion mark/);
  assert.match(all(up), /torque/);
  assert.match(all(down), /torque/);
  assert.match(all(up), /straight/); // look down the bike to keep the saddle straight
  assert.match(all(up), /ask a bike shop/);
  assert.match(all(up), /smaller steps/);
  for (const h of [up, down]) assert.ok(!/\u2014/.test(all(h)));
});

// ── results by area ─────────────────────────────────────────────────────────────────────────
const areasOf = (still, pedal) => { const r = fit.advise(still, pedal); return Object.fromEntries(fit.areas(r, fit.measures(r, pedal)).map(a => [a.key, a])); };

test('areas: a low saddle gives one red area, and reach waits for it', () => {
  const low = trueKneeFlexBDC([-220, 700]);
  const a = areasOf({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88, hipBottom: 104 });
  assert.equal(a.saddle.name, 'Saddle height');
  assert.equal(a.saddle.grade, 'red');
  assert.equal(a.saddle.status, 'Needs attention');
  assert.equal(a.saddle.step, 'Raise the saddle about 3 mm.');
  const lowR = fit.advise({ kneeFlex: low - 8, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 15, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(a.saddle.why, lowR.change.why); // the numbers
  assert.notEqual(a.saddle.why, fit.headline(lowR).why); // not the headline's reason word for word
  assert.deepEqual(a.saddle.rows.map(x => x.key), ['kneePedal', 'kneeStill']);
  assert.equal(a.reach.name, 'Reach and bar height');
  assert.equal(a.reach.status, 'After the saddle');
  assert.equal(a.reach.step, 'Nothing to do yet.');
  assert.deepEqual(a.reach.rows.map(x => x.key), ['torso', 'elbow', 'shoulder']);
  assert.equal(a.more.grade, 'info');
  assert.deepEqual(a.more.rows.map(x => x.key), ['hipBottom']);
});

test('areas: all in range is Good twice', () => {
  const a = areasOf({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(a.saddle.status, 'Good');
  assert.equal(a.saddle.step, 'Leave the saddle height as it is.');
  assert.equal(a.reach.status, 'Good');
  assert.equal(a.reach.why, 'Your back and elbow angles are inside their targets.'); // the shoulder is for reference
  assert.equal(a.reach.step, 'No change needed.');
  // Within u of a target, outside it: Fair, and never "inside" it (was Good, "within 2.5° of it").
  const edge = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 38, elbow: 22, shoulder: 88 });
  assert.equal(edge.reach.status, 'Fair');
  assert.equal(edge.reach.why, 'Your back angle is a little outside its target. That is fine to ride.');
  // Inside, but within u of an edge: Fair, nothing to change.
  const inside = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 42, elbow: 22, shoulder: 88 });
  assert.equal(inside.reach.status, 'Fair');
  assert.equal(inside.reach.why, 'Your back and elbow angles are inside their targets. Your back angle is near the edge. That is fine to ride.');
  assert.equal(inside.reach.step, 'No change needed.');
});

test('areas: a long, low front end with the saddle right', () => {
  const a = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 34, elbow: 5, shoulder: 100 });
  assert.equal(a.saddle.status, 'Good');
  assert.equal(a.reach.status, 'Needs attention');
  assert.equal(a.reach.step, 'Raise the handlebars: move one spacer from above the stem to below it.');
  assert.match(a.reach.why, /^Your back is low \(34°, target 40 to 50\).*so the front of the bike is long and low\.$/);
});

test('areas: one angle out on its own is Fair, fine to ride, with nothing to do', () => {
  // Round 4: the elbow, since the shoulder is for reference only and never out (SPEC 4.2).
  const a = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 40, shoulder: 88 });
  assert.equal(a.reach.status, 'Fair');
  assert.equal(a.reach.step, 'Fine to ride. I will compare it on your next check.');
  assert.equal(a.reach.why, 'Your elbow bend is outside its target. That is fine to ride.');
  // Only the elbow a little out, no change: no "Compare it next time", no "weight on your hands".
  const little = fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 32, shoulder: 76 });
  const lr = fit.measures(little, { strokes: 12, kneeFlex: 38 });
  const la = fit.areas(little, lr)[1];
  assert.equal(la.status, 'Fair');
  assert.equal(la.why, 'Your elbow bend is a little outside its target. That is fine to ride.');
  const words = [la.why, la.step, ...lr.flatMap(x => [x.why, x.step]), fit.headline(little).why, fit.spokenSummary(little, { long: true })].join(' ');
  assert.ok(!/Compare it next time|weight on your hands/.test(words), words);
  assert.ok(fit.nothingToDo(little), 'the home screen says Nothing to change');
  assert.ok(!fit.nothingToDo(fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 })));
  // A cramped rider: three angles out, but not two signs of a long, low front, so still no bars change.
  const c = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 30, elbow: 40, shoulder: 66 });
  assert.equal(c.reach.status, 'Fair');
  assert.match(c.reach.why, /^Your back angle and elbow bend are outside their targets\./);
});

test('areas: by verdict, and every area has one step and no Excellent', () => {
  const cases = [
    [{ kneeFlex: 20 }, { strokes: 12, kneeFlex: 47 }], // disagree
    [{ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, null], // still only, out of range
    [{ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, null], // still only, in range
    [null, null], // nothing
    [null, { strokes: 2, strokesSeen: 9, kneeFlex: NaN }], // pedalled too fast
    [null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 }],
    [null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 }],
    [null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 60 }],
  ];
  const got = cases.map(([s, p]) => areasOf(s, p));
  assert.equal(got[0].saddle.status, 'Fair');
  assert.equal(got[0].saddle.step, 'Film again: your two knee readings point different ways.');
  assert.equal(got[1].saddle.status, 'Fair'); // capped: no millimetres from the held-still reading alone
  assert.equal(got[1].saddle.step, 'Film again and pedal backwards for the full 20 seconds.');
  assert.equal(got[2].saddle.status, 'Fair'); // held still alone is only a cross-check, never Good
  assert.equal(got[3].saddle.status, 'No reading');
  assert.equal(got[3].saddle.step, 'Film again and pedal backwards, smooth and steady, until I say stop.');
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
test('pain or numbness: said first, staged, with its limits and "not medical advice"', () => {
  const pedal = { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 };
  const r = fit.advise(null, pedal);
  const said = fit.spokenSummary(r, { pain: true });
  const note = fit.painNote(r);
  assert.ok(said.startsWith(note), said);
  assert.ok(note.startsWith('You said pain or numbness keeps coming back. Try this one change first.'), note);
  for (const t of [note, said]) {
    assert.match(t, /few weeks/);
    assert.match(t, /not medical advice/);
    assert.match(t, /cannot see your feet/);
    assert.match(t, /professional bike fitter/);
    assert.match(t, /doctor or physio/);
    assert.ok(!/\u2014/.test(t));
    assert.ok(!/\d|°/.test(t.slice(0, note.length)), 'no numbers in the pain note');
  }
  // Without the answer: none of it.
  const plain = fit.spokenSummary(r);
  for (const w of [/few weeks/, /not medical advice/, /cannot see your feet/, /pain/]) assert.ok(!w.test(plain), plain);
  assert.equal(said, `${note} ${plain}`); // the rest is unchanged
  assert.deepEqual(fit.advise(null, pedal), r);
  // Nothing to change: "Your position looks in range." in place of "Try this one change first."
  const ok = fit.advise(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 88 });
  assert.match(fit.painNote(ok), /^You said pain or numbness keeps coming back\. Your position looks in range\. If it is no better/);
  assert.ok(fit.spokenSummary(ok, { pain: true }).endsWith('Nothing to change today. Your saddle height looks right.'));
  // Nothing measured: neither line, since neither would be true.
  assert.match(fit.painNote(fit.advise(null, null)), /^You said pain or numbness keeps coming back\. If it is no better/);
  // Before the retest line too.
  const re = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 43, src: 'pedalling' }, { knee: 47, src: 'pedalling' }));
  assert.match(fit.spokenSummary(re, { pain: true }), /^You said pain or numbness.*side to side\. Knee bend 43 degrees before/);
});

test('a retest on two readings that disagree keeps the disagree wording', () => {
  const r = fit.advise({ kneeFlex: 20 }, { strokes: 12, kneeFlex: 47 });
  const re = fit.withRetest(r, fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 10 }, knee: 41, src: 'pedalling' }, { knee: 47, src: 'pedalling' }));
  assert.equal(re.retest.verdict, 'other-way');
  assert.equal(fit.headline(re).what, 'Film again');
  assert.equal((fit.headline(re).why.match(/will not suggest/g) || []).length, 1);
  assert.match(fit.spokenSummary(re), /^Knee bend 41 degrees before\. 47 degrees now\..*point different ways/);
});

// ── "Did you make this change?" after the results screen has gone ─────────────────────────────
test('the change a session suggested is kept, and asked about until it is answered', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 49.5, torso: 45, elbow: 22, shoulder: 88 });
  const sug = fit.suggestedChange(r.change);
  // One step now (was 43: 9 to 12), with how far out it was, so the Check tab says what the results said.
  assert.deepEqual(sug, { kind: 'saddle', raise: true, mm: [5, 5], how: 'a little' });
  assert.deepEqual(fit.suggestedChange({ kind: 'bars', flags: ['torso'] }), { kind: 'bars' });
  assert.equal(fit.suggestedChange(null), null);
  // What "Yes, I made it" stores from the suggestion is the same as from the change itself.
  assert.deepEqual(fit.madeChange(sug, '10', 'T'), fit.madeChange(r.change, '10', 'T'));
  const fresh = { at: 'B', knee: 43, src: 'pedalling', suggested: sug };
  assert.equal(fit.askMade([fresh]), fresh);
  assert.equal(fit.askMade([{ ...fresh, made: fit.madeChange(sug, 10, 'T') }]), null); // answered
  assert.equal(fit.askMade([{ at: 'C', knee: 36, src: 'pedalling' }, fresh]), null); // filmed again since
  assert.equal(fit.askMade([{ at: 'D', knee: 43, src: 'pedalling', change: 'Raise the saddle about 9 to 12 mm' }]), null); // saved before this existed
  assert.equal(fit.askMade([]), null);
  assert.equal(fit.askMade(undefined), null);
  // Once marked on the home screen, the retest card takes over.
  assert.equal(fit.pendingChange([{ ...fresh, made: fit.madeChange(sug, 10, 'T') }]).at, 'B');
});

test('the words of the change card: how far, never a number preselected, and Later', () => {
  const sug = { kind: 'saddle', raise: true, mm: [15, 15] };
  assert.equal(fit.suggestionText(sug), 'raise the saddle about 15 mm');
  assert.equal(fit.suggestionText({ kind: 'saddle', raise: false, mm: [9, 12] }), 'lower the saddle about 9 to 12 mm');
  assert.equal(fit.suggestionText({ kind: 'bars' }), 'raise the handlebars by one spacer');
  // Results, a saddle change: the millimetre buttons, and Not Yet (round 3, builder E: a quiet text
  // button of two words; "When will you move it?" follows it).
  assert.equal(fit.LATER, 'Not Yet');
  assert.deepEqual(fit.madeQuestion('results', 'ask', sug), { q: 'When you have moved the saddle, tell me how far.', mm: true, yes: null, no: 'Not Yet' });
  const later = fit.madeQuestion('results', 'later', sug);
  assert.equal(later.mm, true);
  assert.equal(later.no, null);
  assert.deepEqual(fit.madeQuestion('results', 'before', sug), { q: 'Before you film again: how far did you move the saddle?', mm: true, yes: null, no: 'No, film anyway' });
  // A handlebar change keeps its single button.
  assert.deepEqual(fit.madeQuestion('results', 'ask', { kind: 'bars' }), { q: 'Did you make this change?', mm: false, yes: 'I made this change', no: 'Not Yet' });
  assert.deepEqual(fit.madeQuestion('results', 'before', { kind: 'bars' }), { q: 'Before you film again: did you make this change?', mm: false, yes: 'Yes, I made it', no: 'No, film anyway' });
  // Home: says what was suggested, in one short line (the check it came from is dated under Latest Check).
  assert.equal(fit.madeQuestion('home', 'ask', sug, 'Oct 10').q, 'Did you raise the saddle about 15 mm? Tell me how far.');
  assert.equal(fit.madeQuestion('home', 'later', sug, 'Oct 10').q, 'Raise the saddle about 15 mm, then tell me how far.');
  assert.equal(fit.madeQuestion('home', 'ask', { kind: 'bars' }, 'Oct 10').q, 'Did you raise the handlebars by one spacer?');
  assert.equal(fit.madeQuestion('home', 'ask', sug, 'Oct 10').mm, true);
  assert.equal(fit.madeQuestion('home', 'later', sug, 'Oct 10').no, null);
  assert.equal(fit.madeQuestion('home', 'before', sug, 'Oct 10').no, 'No, start anyway');
  assert.equal(fit.madeQuestion('home', 'before', { kind: 'bars' }, 'Oct 10').q, 'Before you start: did you raise the handlebars by one spacer?');
  // The spoken close asks how far, which is what the card asks.
  const low = fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 47, torso: 45, elbow: 22, shoulder: 88 }));
  assert.match(low, /When you have moved it, tell me how far\.$/);
  const bars = fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 5, shoulder: 100 }));
  assert.match(bars, /Then tap I made this change\.$/); // never "done" (SPEC 7.1)
  for (const w of ['results', 'home']) for (const m of ['ask', 'later', 'before']) for (const sg of [sug, { kind: 'bars' }]) {
    const x = fit.madeQuestion(w, m, sg, 'Oct 10');
    assert.ok(!/\u2014/.test(x.q + (x.yes || '') + (x.no || '')));
    assert.ok(x.q.split(' ').length <= 12, `one short line: ${x.q}`);
  }
});

test('frame corrections are counted per session, so moving the phone cannot reset them', async () => {
  // A correction that has him move the phone sends him back through the phone and mount steps, and
  // go() clears the step state (ph). Counted there, the Skip hint and the give-up were never reached.
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(!/ph\.tries/.test(src), 'frame tries must not live in the step state');
  assert.match(src, /session = \{[^}]*tries: \{\}/);
  assert.match(src, /const n = session\.tries\[problem\.key\] \|\| 0;/);
});

test('nothing measured: says what went wrong, and the headline, area reason and step all differ', () => {
  const never = fit.advise(null, undefined); // the pedals were never seen turning
  const few = fit.advise(null, { strokes: 3, strokesSeen: 3, kneeFlex: NaN });
  const fast = fit.advise(null, { strokes: 2, strokesSeen: 9, kneeFlex: NaN });
  assert.equal(fit.headline(never).why, 'I could not see the pedals turning, and there was no held-still reading.');
  assert.equal(fit.headline(few).why, 'I saw only 3 pedal strokes, and I need at least 5. There was no held-still reading either.');
  assert.match(fit.headline(fast).why, /^You pedalled faster than this phone can measure each stroke/);
  assert.equal(fit.saddleStep(never), 'Film again and pedal backwards, smooth and steady, until I say stop.');
  assert.equal(fit.saddleStep(few), 'Film again and pedal backwards for the full 20 seconds.');
  assert.equal(fit.saddleStep(fast), 'Film again and pedal backwards more slowly.');
  for (const r of [never, few, fast]) {
    const a = fit.areas(r, fit.measures(r, undefined))[0];
    const three = [fit.headline(r).why, a.why, a.step];
    assert.equal(new Set(three).size, 3, three.join(' | '));
    assert.ok(!/whole body/.test(three.join(' ')), 'does not blame the framing on its own');
    assert.match(fit.spokenSummary(r), new RegExp(`${fit.saddleStep(r).replace(/\./g, '\\.')}$`));
  }
});

test('the on-screen saddle reason uses ° and mm, the spoken one degrees and millimetres', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 49, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(r.change.why, 'Your knee is still bent 49° with the pedal at its lowest point. The target is 33 to 43, so the saddle is a little low.');
  for (const t of [r.change.why, fit.saddleWhy(r), fit.headline(r).why]) assert.ok(!/degrees|millimetres/.test(t), t);
  assert.match(fit.saddleWhy(r, ' degrees'), /49 degrees/);
  assert.ok(!/°|\bmm\b/.test(fit.spokenSummary(r)));
  assert.ok(!/°|\bmm\b/.test(fit.spokenSummary(r, { long: true })));
});

test('Reach Fair only calls an angle a sign of a long, low front end when it is one', () => {
  // A closed shoulder is for reference only: it is not called out at all (was Fair, "outside its target").
  const closed = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 22, shoulder: 68 }).reach;
  assert.equal(closed.why, 'Your back and elbow angles are inside their targets.');
  const lowBack = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 33, elbow: 22, shoulder: 88 }).reach;
  assert.equal(lowBack.why, 'Your back angle is outside its target. That is one sign of a long, low front end, but the handlebars only need to move when two signs point the same way. That is fine to ride.');
  const bent = areasOf(null, { strokes: 12, kneeFlex: 38, torso: 45, elbow: 40, shoulder: 88 }).reach;
  assert.match(bent.why, /That is fine to ride\.$/);
  // No pedalling reading: the saddle is not settled, so bars wait whatever the angles say.
  const wait = areasOf({ kneeFlex: 30, torso: 33, elbow: 5, shoulder: 100 }, null).reach;
  assert.match(wait.why, /Bar changes wait until the saddle height is settled\.$/);
  assert.ok(!/two signs/.test(wait.why));
});

test('the summary status agrees with the areas', () => {
  // Held still alone is never Good; a bars change makes Reach Needs attention and the summary too.
  const so = fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, null);
  assert.equal(so.overall, 'amber');
  assert.equal(areasOf({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, null).saddle.grade, 'amber');
  const bars = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 36, elbow: 7, shoulder: 98 }); // amber angles, two signs
  assert.equal(bars.change.kind, 'bars');
  assert.equal(bars.overall, 'red');
  assert.equal(areasOf(null, { strokes: 12, kneeFlex: 35, torso: 36, elbow: 7, shoulder: 98 }).reach.grade, 'red');
});

test('the handlebars advice only counts angles the screen shows as out of range', () => {
  // Round 2 found "Raise the handlebars" (Needs attention) from a back at 38 and a shoulder at 97,
  // while both rows said "within 2.5° of the target ... counts as in range" and "No change needed.".
  // Round 4: a sign counts only in its Needs attention zone, past its own u (SPEC 4.3), and the
  // shoulder, for reference only, only above 95 plus u.
  const edge = { strokes: 12, strokesSeen: 12, kneeFlex: 38, torso: 38, elbow: 20, shoulder: 98 };
  const r = fit.advise(null, edge);
  assert.equal(r.change, null);
  assert.notEqual(fit.headline(r).what, 'Raise the handlebars');
  assert.equal(areasOf(null, edge).reach.status, 'Fair'); // the back is just outside, within u
  // Just past u on both: two signs, and both rows say so.
  const past = fit.advise(null, { ...edge, torso: 36.9, shoulder: 98.1 });
  assert.equal(past.change?.kind, 'bars');
  // Every combination around the edges: a sign counts exactly when its row is Needs attention (the
  // shoulder: above 95 plus u), on the side that means a long, low front, and the bars change comes
  // exactly when two signs count.
  for (const torso of [34, 36.9, 37, 37.1, 38, 39.9, 40, 45]) for (const shoulder of [90, 95, 97.9, 98, 98.1, 101])
    for (const elbow of [5, 7.9, 8, 10, 11.9, 12, 12.1, 20]) {
      const p = { strokes: 12, strokesSeen: 12, kneeFlex: 38, torso, elbow, shoulder };
      const res = fit.advise(null, p);
      const rows = Object.fromEntries(fit.measures(res, p).map(x => [x.key, x]));
      const out = { torso: rows.torso.grade === 'red' && torso < 40, shoulder: shoulder > 95 + fit.U.shoulder, elbow: elbow < 8 };
      const n = Object.values(out).filter(Boolean).length;
      const at = `torso ${torso}, shoulder ${shoulder}, elbow ${elbow}`;
      assert.equal(res.change?.kind === 'bars', n >= 2, at);
      if (res.change?.kind === 'bars') {
        assert.deepEqual(res.change.flags, ['torso', 'shoulder', 'elbow'].filter(k => out[k]), at);
        for (const k of res.change.flags) {
          assert.notEqual(rows[k].status, 'Good', `${at}: ${k} is part of the change`);
          assert.ok(!/closer than a phone camera can tell apart|inside the target/.test(rows[k].why), `${at}: ${rows[k].why}`);
          assert.equal(rows[k].step, 'Part of the main change: raise the handlebars.', at);
        }
      }
      const reach = fit.areas(res, Object.values(rows))[1];
      // The Fair reason calls an angle one sign of a long, low front only when it is one.
      if (!res.change && reach.grade === 'amber' && /outside/.test(reach.why)) assert.equal(/That is one sign of a long, low front end/.test(reach.why), n === 1, `${at}: ${reach.why}`);
    }
});

// ── slow pedalling with pose noise, and too few frames a turn ─────────────────────────────────
function rideAt(fps, rev, { secs = 22, noise = 5, seed = 1 } = {}) {
  const rand = seeded(seed * 7 + fps), p0 = rand() * 2 * Math.PI, out = [];
  for (let i = 0; i < fps * secs; i++) {
    const t = i / fps;
    out.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + p0 + (2 * Math.PI * t) / rev, { noise, rand }), 'L', W, H) });
  }
  return out;
}

test('frames per turn, from the ankle crossing the middle of its travel', () => {
  near(fit.framesPerTurn(rideAt(10, 0.5)), 5, 0.5);
  near(fit.framesPerTurn(rideAt(30, 4)), 120, 6);
  near(fit.framesPerTurn(rideAt(3, 2)), 6, 0.5);
  const still = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, ...fit.frameAngles(synthPose(-Math.PI / 2, { noise: 5, rand: seeded(i) }), 'L', W, H) }));
  assert.ok(Number.isNaN(fit.framesPerTurn(still)), 'a foot that is not going round has no turns');
});

test('"slower" is not said to a slow rider whose bottom of the stroke is noisy, and is said when it is too fast', () => {
  // The review's case: 30 poses a second, 4 s a turn, 5 px of noise said "Slower" in 30 % of sessions.
  for (const [fps, rev] of [[30, 4], [15, 4], [15, 6], [30, 6], [10, 6]]) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = rideAt(fps, rev, { seed });
      for (let t = 4; t < 22; t += 2) assert.equal(fit.slowerTurn(s.filter(x => x.t <= t), t), null, `${fps} fps, ${rev} s a turn, seed ${seed}, at ${t} s`);
    }
  }
  // Too few frames a turn, including 5 a turn, where the stroke bottoms themselves get lost.
  for (const [fps, rev] of [[5, 1], [10, 0.6], [3, 2]]) {
    const s = rideAt(fps, rev);
    assert.ok(fit.slowerTurn(s, 22) != null, `${fps} fps, ${rev} s a turn`);
  }
});

test('a turn the phone saw only about 5 times never gives a knee reading', () => {
  // These used to keep "strokes" two or three turns long and read the knee 30 to 70 degrees out.
  for (const [fps, rev, noise] of [[10, 0.5, 1.5], [5, 1, 1.5], [8, 0.6, 5], [6, 0.8, 5]]) {
    for (let seed = 1; seed <= 20; seed++) {
      const p = fit.summarisePedal(rideAt(fps, rev, { secs: 30, noise, seed }));
      assert.ok(p.strokes < 5, `${fps} fps, ${rev} s a turn, seed ${seed}: kept ${p.strokes}`);
      const r = fit.advise(null, p);
      assert.equal(r.change, null);
      assert.equal(r.tooFast, true, `${fps} fps, ${rev} s a turn, seed ${seed}`);
    }
  }
  // And a well-sampled ride keeps its strokes.
  const ok = fit.summarisePedal(rideAt(15, 1.1, { noise: 1.5 }));
  assert.ok(ok.strokes >= 16, `kept ${ok.strokes}`);
  near(ok.kneeFlex, trueKneeFlexBDC(), 1.5);
});

test('after raising the handlebars, the next film shows what the angles did', () => {
  const prev = { at: 'A', knee: 36, src: 'pedalling', values: { kneePedal: 36, torso: 34, elbow: 5, shoulder: 100 }, made: { kind: 'bars', at: 'A' } };
  const now = { knee: 37, src: 'pedalling', values: { torso: 39, elbow: 12, shoulder: 98 } };
  const j = fit.judgeChange(fit.pendingChange([prev]), now);
  assert.equal(j.verdict, 'shown');
  assert.equal(j.text, 'After raising the handlebars: back angle 34° before, 39° now; shoulder angle 100° before, 98° now, about the same; elbow bend 5° before, 12° now.');
  // Spoken, the way each angle went, the same "about the same" as on the screen, and no numbers: they
  // stay on the screen, and six of them would need a recorded clip for every combination.
  assert.equal(j.spoken, 'After raising the handlebars, here is what changed. Your back angle went up. Your shoulder angle stayed about the same. Your elbow bend went up.');
  assert.ok(!/\d/.test(j.spoken));
  const r = fit.advise(null, { strokes: 12, kneeFlex: 37, torso: 39, elbow: 12, shoulder: 98 });
  const w = fit.withRetest(r, j);
  assert.equal(w.retest, j);
  assert.ok(!w.held); // no norm for what a spacer should do, so nothing is held back
  assert.ok(fit.spokenSummary(w).startsWith('After raising the handlebars'));
  assert.equal(fit.judgeChange(prev, { ...now, src: 'still' }), null);
  assert.equal(fit.judgeChange(prev, { knee: 37, src: 'pedalling' }), null);
  // The home card's promise ("Film again to see what it did") is now kept.
  assert.match(fit.retestPrompt(prev.made, '9 Oct'), /see what it did/);
});

test('last time: the last session that measured the angle, and the knee only when measured the same way', () => {
  const failed = { at: 'C', v: 2, values: {}, areas: { saddle: 'na', reach: 'na' } };
  const good = { at: 'B', v: 2, values: { kneePedal: 37, torso: 44 }, areas: { saddle: 'green', reach: 'green' } };
  const old = { at: 'A', values: { kneePedal: 41, torso: 46, kneeStill: 30 }, areas: { saddle: 'amber', reach: 'green' } };
  const h = [failed, good, old];
  assert.equal(fit.lastWith(h, 'torso').at, 'B'); // a failed film in between does not hide it
  assert.equal(fit.lastWith(h, 'kneeStill').at, 'A');
  assert.equal(fit.lastWith([failed, old], 'kneePedal'), null); // measured the old way: not compared
  assert.equal(fit.lastWith([failed, old], 'torso').at, 'A');
  assert.equal(fit.lastWith([], 'torso'), null);
  assert.equal(fit.lastChecked(h).at, 'B');
  assert.equal(fit.lastChecked([failed]), null);
  assert.equal(fit.lastChecked([{ at: 'X' }, old]).at, 'A'); // saved before areas existed: skipped
});

// ── round 2: results words ──────────────────────────────────────────────────────────────────
// The ?sim session: the made-up rider held still at the bottom, then pedalling backwards on a wall.
function simSession({ low = false } = {}) {
  const o = (seed) => ({ noise: 1.2, rand: seeded(seed), hipShift: low ? [0, -35] : [0, 0] });
  const still = fit.summariseStill(Array.from({ length: 10 }, (_, i) => fit.frameAngles(synthPose(-Math.PI / 2, o(100 + i)), 'L', W, H)));
  const rand = seeded(9), samples = [];
  for (let i = 0; i < 20 * 15; i++) {
    const t = i / 15;
    samples.push({ t, ...fit.frameAngles(synthPose(-Math.PI / 2 + (2 * Math.PI * t) / 1.1, { noise: 1.2, rand, hipShift: low ? [0, -35] : [0, 0] }), 'L', W, H) });
  }
  const pedal = fit.summarisePedal(samples);
  return { r: fit.advise(still, pedal, 'wall'), pedal };
}

test('the spoken summary: the action first and short', () => {
  const { r } = simSession();
  assert.equal(r.verdict, 'ok');
  const said = fit.spokenSummary(r);
  assert.ok(said.startsWith('Nothing to change today.'), said);
  assert.ok(said.split(/\s+/).length <= 25, `${said.split(/\s+/).length} words: ${said}`);
  const low = simSession({ low: true }).r;
  assert.equal(low.change.kind, 'saddle');
  const first = fit.spokenSummary(low).split('. ')[0];
  assert.match(first, /Raise the saddle/);
  // "Say it again" speaks the longer version, with the knee and the other angles.
  assert.match(fit.spokenSummary(r, { long: true }), /^Nothing to change today\. Your saddle height looks right\. Your knee bends \d+ degrees with the pedal at its lowest point/);
});

test('compared with last time: better or worse, against the target', () => {
  const knee = fit.TARGETS.kneeDynamic;
  assert.equal(fit.compareLast(37, 49, 'Oct 3', knee), 'Down 12° since Oct 3, now inside the target');
  // Within u of it, outside: closer, never "in range" (round 4: the 2.5 degree tolerance is gone).
  assert.equal(fit.compareLast(44, 49, 'Oct 3', knee), 'Down 5° since Oct 3, closer to the target');
  assert.equal(fit.compareLast(45, 49, 'Oct 3', knee), 'Down 4° since Oct 3, closer to the target');
  assert.equal(fit.compareLast(53, 49, 'Oct 3', knee), 'Up 4° since Oct 3, further from the target');
  assert.equal(fit.compareLast(25, 29, 'Oct 3', knee), 'Down 4° since Oct 3, further from the target');
  assert.equal(fit.compareLast(38, 33, 'Oct 3', knee), 'Up 5° since Oct 3'); // inside both times
  assert.equal(fit.compareLast(48, 49, 'Oct 3', knee), 'About the same as last time (49°)');
  assert.equal(fit.compareLast(37, 49, 'Oct 3'), 'Down 12° since Oct 3'); // no target: the difference only
  for (const k of Object.keys(fit.TARGET_OF)) assert.ok(fit.TARGETS[fit.TARGET_OF[k]], k);
});

test('less exact: the same words on the screen and in Copy results, with one step', () => {
  assert.equal(fit.warnLine([]), '');
  assert.equal(fit.warnLine(['crowd']), 'Less exact this time: someone else in the picture made some moments unclear. To be sure before you change anything, film again with nobody else in the picture.');
  assert.match(fit.warnLine(['level', 'dark']), /: the phone was not confirmed level, the light was low\. .* film again with the phone level\.$/);
  assert.match(fit.warnLine(['dark']), /film again in more light\.$/);
  assert.match(fit.warnLine(['fast']), /film again pedalling more slowly\.$/);
  // Pedalled the other way: never a bare "pedal forwards", the bike may be standing on the floor.
  const way = fit.warnLine(['way'], 'trainer');
  assert.match(way, /you pedalled backwards, not forwards/);
  assert.ok(!/pedal(ling)? forwards\./i.test(way), way);
  for (const k of ['level', 'moved', 'feet', 'head', 'edge', 'fast', 'small', 'big', 'centre', 'angle', 'dark', 'crowd', 'way']) {
    const t = fit.warnLine([k], 'wall');
    assert.ok(t && !/undefined|null|\u2014/.test(t), `${k}: ${t}`);
    assert.ok(!t.includes(`: ${k}.`), `${k}: the raw key`);
  }
});

test('the held-still reading out twice running: no third "film once more"', () => {
  const pedal = { strokes: 12, strokesSeen: 12, kneeFlex: 36, torso: 45, elbow: 22, shoulder: 88 };
  const still = { kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 };
  const first = fit.withStillHistory(fit.advise(still, pedal, 'wall'), []);
  assert.equal(first.stillOut, true);
  assert.match(fit.spokenSummary(first, { long: true }), /Film once more to be sure/);
  assert.equal(fit.measures(first, pedal).find(x => x.key === 'kneeStill').step, 'Film once more to be sure. The pedalling reading counts for more.');
  // The last session filmed the same way had it too (saved with stillOut: true).
  const history = [{ at: 'A', setup: 'wall', stillOut: true }];
  const second = fit.withStillHistory(fit.advise(still, pedal, 'wall'), history);
  assert.equal(second.stillOutAgain, true);
  for (const long of [false, true]) assert.ok(!/Film once more to be sure/.test(fit.spokenSummary(second, { long })));
  assert.equal(fit.measures(second, pedal).find(x => x.key === 'kneeStill').step, 'Nothing extra to do: the pedalling reading counts for more.');
  // Filmed another way last time: it does not count.
  assert.ok(!fit.withStillHistory(fit.advise(still, pedal, 'trainer'), history).stillOutAgain);
});
