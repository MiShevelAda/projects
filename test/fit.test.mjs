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
  assert.equal(fit.grade('hipTop', 70), 'info');
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
  assert.match(fit.spokenSummary(ok), /leave the saddle height alone/);
});

test('advice: falls back to the still reading when pedalling failed, and flags disagreement', () => {
  const r = fit.advise({ kneeFlex: 40, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 2, kneeFlex: NaN });
  assert.equal(r.kneeSource, 'still');
  assert.match(r.change.headline, /^Raise the saddle/);
  const d = fit.advise({ kneeFlex: 20, torso: 45, elbow: 22, shoulder: 88 }, { strokes: 12, kneeFlex: 46, torso: 45, elbow: 22, shoulder: 88 });
  assert.equal(d.disagree, true);
  assert.match(fit.spokenSummary(d), /disagree/);
});

test('advice: a long low front end, once the saddle is right', () => {
  const r = fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 34, elbow: 35, shoulder: 76 });
  assert.equal(r.change.kind, 'bars');
  assert.equal(r.overall, 'amber'); // all three just inside their amber bands
  assert.equal(fit.advise(null, { strokes: 12, kneeFlex: 35, torso: 30, elbow: 40, shoulder: 66 }).overall, 'red');
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
  assert.match(said, /Your shoulder angle is outside the target\./);
  const solo = fit.spokenSummary(fit.advise(null, { strokes: 12, kneeFlex: 36, torso: 45, elbow: 50, shoulder: 60 }));
  assert.match(solo, /Your back angle looks good\./);
});
