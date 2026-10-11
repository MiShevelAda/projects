// The phone's roll, taken out of the picture before any angle is measured (fit.imageRoll and
// fit.derotate). The geometry is built separately in synth.js (rolledPhone, rollPicture) from the
// device's own axes, for both cameras and both sideways positions, so these tests check the app's
// formula against it rather than against itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fit from '../fit.js';
import { synthPose, rolledPhone, rollPicture, seeded } from './synth.js';

const W = 1280, H = 720;
const near = (a, b, tol, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} is not within ${tol} of ${b}`);
const CASES = [];
for (const camera of ['rear', 'front']) for (const side of ['left', 'right']) for (const roll of [2, -2]) CASES.push({ camera, side, roll });
const name = (c) => `${c.camera} camera, top of the phone to the ${c.side}, rolled ${c.roll > 0 ? '+' : ''}${c.roll} degrees`;

test('the roll of the picture, from the accelerometer, for both cameras and both sideways positions', () => {
  for (const c of CASES) for (const convention of ['spec', 'ios']) for (const pitch of [0, 1.5, -2]) {
    const { g, theta } = rolledPhone({ ...c, convention, pitch });
    near(fit.imageRoll(g, c.camera), theta, 1e-9, `${name(c)}, ${convention} sign, pitch ${pitch}:`);
    near(Math.abs(theta), 2, 1e-9);
  }
  // Turning the phone anticlockwise rolls the back camera's picture one way and the front camera's
  // the other, on either side: that is the sign that differs between the cameras.
  assert.ok(rolledPhone({ camera: 'rear', side: 'left', roll: 2 }).theta < 0);
  assert.ok(rolledPhone({ camera: 'front', side: 'left', roll: 2 }).theta > 0);
  // In the raw reading the sign also flips between the two sideways positions: the same picture
  // roll comes with opposite y on the two sides, which sign(x) takes care of.
  const l = rolledPhone({ camera: 'rear', side: 'left', roll: 2 }), r = rolledPhone({ camera: 'rear', side: 'right', roll: 2 });
  assert.equal(Math.sign(l.g[1]), -Math.sign(r.g[1]));
  near(l.theta, r.theta, 1e-9);
  // No reading, or one too large to be a phone standing on a box: no correction.
  assert.equal(fit.imageRoll(null, 'rear'), 0);
  assert.equal(fit.imageRoll([0, 0, 9.81], 'rear'), 0);
  assert.equal(fit.imageRoll(rolledPhone({ roll: fit.ROLL_MAX + 2 }).g, 'rear'), 0);
  near(Math.abs(fit.imageRoll(rolledPhone({ roll: fit.ROLL_MAX - 1 }).g, 'rear')), fit.ROLL_MAX - 1, 1e-9);
});

test('a rider pose rolled by 2 degrees, with the measured roll taken out, reads the same as the upright pose', () => {
  for (const c of CASES) {
    const { g, theta } = rolledPhone({ ...c, convention: c.side === 'left' ? 'ios' : 'spec' });
    for (const th of [-Math.PI / 2, 0, Math.PI / 3, Math.PI]) {
      const upright = synthPose(th);
      const seen = rollPicture(upright, theta, W, H);
      const fixed = fit.derotate(seen, fit.imageRoll(g, c.camera), W, H);
      const a = fit.frameAngles(upright, 'L', W, H), b = fit.frameAngles(fixed, 'L', W, H), raw = fit.frameAngles(seen, 'L', W, H);
      for (const k of ['torso', 'kneeFlex', 'elbow', 'shoulder', 'hip', 'thighFwd']) near(b[k], a[k], 1e-6, `${name(c)}, ${k}:`);
      // The rolled picture alone moves the back angle by the whole roll, and the knee not at all:
      // an angle between two segments does not turn with the picture.
      near(Math.abs(raw.torso - a.torso), 2, 1e-6, `${name(c)}, back angle without the correction:`);
      near(raw.kneeFlex, a.kneeFlex, 1e-6);
      // The other camera's sign doubles the error instead of removing it.
      const wrong = fit.derotate(seen, fit.imageRoll(g, c.camera === 'rear' ? 'front' : 'rear'), W, H);
      near(Math.abs(fit.frameAngles(wrong, 'L', W, H).torso - a.torso), 4, 1e-6, `${name(c)}, the wrong camera's sign:`);
    }
  }
});

test('the lowest point of the pedal stroke is found the same way in a rolled picture once the roll is out', () => {
  // A rolled picture tips "lowest" round the crank: the ankle's lowest point in the picture is no
  // longer the crank pointing straight down. With the roll out, the pedalling reading matches.
  const rand = seeded(7), fps = 30, rev = 1.1;
  const frames = [];
  for (let i = 0; i < 20 * fps; i++) frames.push({ t: i / fps, lm: synthPose(-Math.PI / 2 + (2 * Math.PI * i) / (fps * rev), { noise: 0.5, rand }) });
  const summary = (f) => fit.summarisePedal(frames.map(x => ({ t: x.t, ...fit.frameAngles(f(x.lm), 'L', W, H) })));
  const upright = summary(lm => lm);
  for (const c of CASES) {
    const { g, theta } = rolledPhone(c);
    const fixed = summary(lm => fit.derotate(rollPicture(lm, theta, W, H), fit.imageRoll(g, c.camera), W, H));
    near(fixed.kneeFlex, upright.kneeFlex, 1e-6, `${name(c)}, knee:`);
    near(fixed.torso, upright.torso, 1e-6, `${name(c)}, back:`);
    assert.equal(fixed.strokes, upright.strokes);
  }
});

test('derotate keeps every other field of a point, and leaves an unrolled pose as it is', () => {
  const lm = synthPose(0);
  assert.equal(fit.derotate(lm, 0, W, H), lm);
  const d = fit.derotate(lm, 2, W, H);
  assert.equal(d.length, lm.length);
  for (let i = 0; i < lm.length; i++) {
    assert.equal(d[i].visibility, lm[i].visibility);
    assert.equal(d[i].z, lm[i].z);
  }
  // Turned about the centre of the picture: the centre stays put.
  const centre = fit.derotate([{ x: 0.5, y: 0.5, z: 0, visibility: 1 }], 5, W, H)[0];
  near(centre.x, 0.5, 1e-12);
  near(centre.y, 0.5, 1e-12);
});
