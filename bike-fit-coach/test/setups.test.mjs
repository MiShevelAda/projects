// The three ways the bike is held (trainer or rollers, a wall, a friend), and telling the rider
// apart from anyone else the phone sees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as fit from '../fit.js';
import { synthPose, synthHelper, trueKneeFlexBDC, seeded } from './synth.js';

const W = 1280, H = 720;
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

// ── who is the rider ─────────────────────────────────────────────────────────────────────────
test('the synthetic people: the rider sits like a rider, a standing friend does not', () => {
  const rider = fit.frameAngles(synthPose(-Math.PI / 2), 'L', W, H);
  assert.ok(fit.isSeated(rider), 'at the bottom of the stroke');
  assert.ok(rider.thighFwd > 25, `${rider.thighFwd}`);
  for (const side of ['L', 'R']) {
    assert.ok(!fit.isRiding(fit.frameAngles(synthHelper(), side, W, H)), 'standing, facing the phone');
    assert.ok(!fit.isRiding(fit.frameAngles(synthHelper({ frontal: false }), side, W, H)), 'standing, side-on');
    const leaning = fit.frameAngles(synthHelper({ frontal: false, lean: 40, kneeBend: 25 }), side, W, H);
    assert.ok(fit.isRiding(leaning) && !fit.isSeated(leaning), 'leaning in: riding posture, but the thigh hangs straight down');
  }
  assert.ok(fit.clearlyVisible(synthHelper()));
  assert.ok(!fit.clearlyVisible(synthHelper({ vis: 0.3 })), 'mostly hidden behind the rider');
});

test('rider selection with two poses: a friend standing beside the bike', () => {
  const rider = synthPose(0), friend = synthHelper({ at: -1400 });
  for (const [poses, idx] of [[[rider, friend], 0], [[friend, rider], 1]]) {
    const p = fit.pickRider(poses, null, 0, W, H);
    assert.equal(p.index, idx);
    assert.equal(p.lm, rider);
    assert.equal(p.ambiguous, false);
    assert.equal(p.others, 1); // seen clearly, so the app can ask them to move
  }
  // Only the friend: nobody is the rider.
  assert.equal(fit.pickRider([friend], null, 0, W, H).lm, null);
});

test('rider selection with two poses: a friend overlapping the rider', () => {
  const rider = synthPose(0);
  // Facing the phone at the back of the bike, one hand on the saddle, overlapping the rider's hip.
  const standing = synthHelper({ at: -520, reach: [-300, 745] });
  assert.equal(fit.pickRider([standing, rider], null, 0, W, H).lm, rider);
  // Hidden behind the rider as asked: still found by the model, but not "clearly visible".
  const hidden = fit.pickRider([synthHelper({ at: -300, vis: 0.3 }), rider], null, 0, W, H);
  assert.equal(hidden.lm, rider);
  assert.equal(hidden.others, 0);
  // Leaning in side-on at the rider's hip, knees bent: riding posture, but not sitting like a rider.
  const leaning = synthHelper({ at: -260, frontal: false, lean: 40, kneeBend: 25, depth: 0.95 });
  const first = fit.pickRider([leaning, rider], null, 0, W, H);
  assert.equal(first.lm, rider);
  // Followed: both are within the gate of the rider's hips and shoulders, and only one sits like a rider.
  const next = fit.pickRider([rider, leaning], first.track, 0.1, W, H);
  assert.equal(next.lm, rider);
  assert.equal(next.ambiguous, false);
  // A second person sitting like a rider at the same spot: nobody is chosen, nothing is measured.
  const twin = synthPose(Math.PI, { cx: 640 });
  assert.ok(!fit.samePerson(rider, twin, W, H));
  const both = fit.pickRider([rider, twin], null, 0, W, H);
  assert.equal(both.lm, null);
  assert.equal(both.ambiguous, true);
  // Followed, the pose nearer the rider's last landmarks wins when it is clearly nearer (TIE_RATIO)...
  const followed = fit.pickRider([twin, rider], first.track, 0.1, W, H);
  assert.equal(followed.lm, rider);
  assert.equal(followed.ambiguous, false);
  // ...and nobody is measured when the two are about as near as each other.
  const left = synthPose(0, { cx: 560 }), right = synthPose(0, { cx: 640 });
  assert.ok(!fit.samePerson(left, right, W, H));
  assert.equal(fit.pickRider([left, right], first.track, 0.1, W, H).ambiguous, true);
  // The same body found twice is one person, not two.
  // (The real model did this in testing: two poses about 10 px apart on one person.)
  const twice = fit.pickRider([rider, synthPose(0, { noise: 8, rand: seeded(4) })], null, 0, W, H);
  assert.equal(twice.lm, rider);
  assert.equal(twice.others, 0);
});

test('rider selection stays on the rider from frame to frame, whatever the order and drop-outs', () => {
  const rand = seeded(11), noise = seeded(12);
  const fps = 15;
  let track = null, picked = 0, wrong = 0, lone = 0;
  for (let i = 0; i < 20 * fps; i++) {
    const t = i / fps, theta = -Math.PI / 2 + (2 * Math.PI * t) / 1.1;
    const rider = synthPose(theta, { noise: 1.5, rand: noise });
    const leaning = synthHelper({ at: -260, frontal: false, lean: 40, kneeBend: 25, depth: 0.95, noise: 1.5, rand: noise });
    const standing = synthHelper({ at: -700 + 200 * Math.sin(t), noise: 1.5, rand: noise });
    // The model misses the rider in about one frame in eight, and gives the poses in any order.
    const dropped = rand() < 0.12;
    const poses = [...(dropped ? [] : [rider]), leaning, standing].sort(() => rand() - 0.5);
    const p = fit.pickRider(poses, track, t, W, H);
    track = p.track;
    if (p.lm) { picked++; if (p.lm !== rider) wrong++; }
    if (dropped) { lone++; assert.equal(p.lm, null, `frame ${i}: with the rider missing, nobody may be measured`); }
  }
  assert.equal(wrong, 0);
  assert.ok(picked >= 20 * fps - lone - 2, `picked ${picked} of ${20 * fps - lone}`);
});

test('a lone pose at the rider\'s spot is followed only when it is close to the rider\'s last pose', () => {
  // A rider whose thigh hangs unusually straight at the bottom of the stroke: his own pose with the
  // knee point straight under the hip, as the pose model can put it for a frame. In riding posture
  // (isRiding), but not sitting like a rider (isSeated), so it could not lock on there.
  const rider = synthPose(0);
  const straight = synthPose(-Math.PI / 2);
  straight[25] = { ...straight[25], x: straight[23].x };
  const a = fit.frameAngles(straight, 'L', W, H);
  assert.ok(fit.isRiding(a) && !fit.isSeated(a), `thigh ${a.thighFwd}, knee ${a.kneeFlex}`);
  const first = fit.pickRider([rider], null, 0, W, H);
  assert.equal(fit.pickRider([straight], first.track, 0.2, W, H).lm, straight);
  assert.equal(fit.pickRider([straight], null, 0.2, W, H).lm, null); // never to lock on
  // A helper leaning in at the rider's hip, in riding posture, on a frame where the pose model missed
  // the rider: never taken, whether or not anyone was at the hip before. It used to be taken whenever
  // nobody had been there in the last NEAR_KEEP seconds, and then followed for the rest of the session.
  const leaning = synthHelper({ at: -260, frontal: false, lean: 40, kneeBend: 25, depth: 0.95 });
  const arrives = fit.pickRider([leaning], first.track, 0.2, W, H);
  assert.equal(arrives.lm, null);
  assert.equal(arrives.ambiguous, false, 'one pose seen, and nobody else was at the hip: not two who could each be the rider');
  // Someone else was right at the rider's hip a moment ago: the lone pose could be them.
  let p = fit.pickRider([rider, leaning], null, 0, W, H);
  assert.equal(p.lm, rider);
  const alone = fit.pickRider([leaning], p.track, 0.2, W, H);
  assert.equal(alone.lm, null);
  assert.equal(alone.ambiguous, true);
  assert.equal(fit.pickRider([straight], p.track, 0.2, W, H).lm, straight, 'close to his last pose: still him');
  // Followed alone for longer than NEAR_KEEP, the helper is still not taken.
  for (let t = 0.5; t <= fit.NEAR_KEEP + 0.5; t += 0.5) p = fit.pickRider([rider], p.track, t, W, H);
  assert.equal(fit.pickRider([leaning], p.track, fit.NEAR_KEEP + 0.7, W, H).lm, null);
});

test('a helper who arrives at the rider\'s hip on a frame where the model misses the rider is never measured', () => {
  // Round 2's probe: the rider pedals alone for 5 s, then a helper comes to his hip, and from then on
  // the pose model misses the rider in some frames (only the helper is returned). Once taken, the
  // helper used to be followed for the rest of the session.
  const helpers = {
    lean: { at: -260, frontal: false, lean: 40, kneeBend: 25, depth: 0.95 },
    steady: { at: -350, frontal: false, lean: 50, kneeBend: 20, depth: 0.92, reach: [-220, 760] },
    braced: { at: -650, frontal: false, lean: 45, kneeBend: 35, depth: 0.9, reach: [450, 700] },
  };
  for (const fps of [3, 10, 30]) for (const [name, h] of Object.entries(helpers)) for (let seed = 1; seed <= 40; seed++) {
    const rand = seeded(seed * 7 + fps);
    let track = fit.trackFrom(synthPose(-Math.PI / 2), 0, W, H), riderFrames = 0, both = 0;
    for (let i = 0; i < 20 * fps; i++) {
      const t = i / fps;
      const rider = synthPose(-Math.PI / 2 + (2 * Math.PI * t) / 1.5, { noise: 1.2, rand });
      const helper = synthHelper({ ...h, noise: 1.2, rand });
      // The frame the helper arrives on, the model returns only the helper; after that, about one in seven.
      const missed = i === 5 * fps || (i > 5 * fps && rand() < 0.15);
      const poses = i < 5 * fps ? [rider] : missed ? [helper] : rand() < 0.5 ? [rider, helper] : [helper, rider];
      const p = fit.pickRider(poses, track, t, W, H, 'L', { lock: 'near' });
      track = p.track;
      assert.notEqual(p.lm, helper, `${name}, ${fps} poses/s, seed ${seed}: the helper measured at ${t.toFixed(2)} s`);
      if (i > 5 * fps && !missed) { both++; if (p.lm === rider) riderFrames++; }
    }
    assert.ok(riderFrames >= 0.9 * both, `${name}, ${fps} poses/s, seed ${seed}: the rider measured in ${riderFrames} of ${both} frames`);
  }
});

// Helpers leaning in at the rider's hip with the camera-side hand on the hoods, where the rider's
// hand is: the nearest to the rider of 5058 helper shapes tried (scratchpad fixR3b/dist.mjs), the
// first one the QA round 3 shape. The fifth sits like a rider.
const HOODS = [
  { at: -200, frontal: false, lean: 30, kneeBend: 20, depth: 0.9, reach: [540, 640] },
  { at: -200, frontal: false, lean: 30, kneeBend: 20, depth: 0.95, reach: [540, 640] },
  { at: -150, frontal: false, lean: 30, kneeBend: 10, depth: 0.85, reach: [540, 640] },
  { at: -100, frontal: false, lean: 30, kneeBend: 10, depth: 0.9, reach: [540, 640] },
  { at: -200, frontal: false, lean: 30, kneeBend: 30, depth: 1, reach: [540, 640] },
  { at: -260, frontal: false, lean: 40, kneeBend: 10, depth: 1, reach: [540, 640] },
];

test('a helper leaning in at the hip with a hand on the hoods is never taken on a frame where the model misses the rider', () => {
  // QA round 3: such a helper comes within 0.28 of a torso length of the rider, inside the old 0.33
  // gate, so on the frame they arrived and the model missed the rider they were taken, and then
  // followed for the rest of the session.
  const deg = (d) => (d * Math.PI) / 180;
  for (const h of HOODS) for (let a = 0; a < 360; a += 15) {
    const first = fit.pickRider([synthPose(deg(a))], null, 0, W, H, 'L');
    assert.ok(first.lm, `the rider at ${a}°`);
    const p = fit.pickRider([synthHelper(h)], first.track, 0.1, W, H, 'L', { lock: 'near' });
    assert.equal(p.lm, null, `${JSON.stringify(h)}: taken after the rider at ${a}°`);
  }
  // Sessions: the rider alone for 4 to 6 s, then the helper arrives on a frame the model misses the
  // rider, and after that the model misses him in one frame in twenty, pedalling or holding still.
  for (const still of [false, true]) for (const fps of [3, 10, 30]) for (const [n, h] of HOODS.entries()) for (let seed = 1; seed <= 12; seed++) {
    const rand = seeded(seed * 13 + fps + n);
    const arrive = 4 + 2 * rand();
    let track = fit.trackFrom(synthPose(-Math.PI / 2), 0, W, H), first = true;
    for (let t = 0; t < 12; t += 1 / fps) {
      const rider = synthPose(still ? -Math.PI / 2 : -Math.PI / 2 + (2 * Math.PI * t) / 1.5, { noise: 1.2, rand });
      const helper = synthHelper({ ...h, noise: 1.2, rand });
      let poses;
      if (t < arrive) poses = [rider];
      else if (first) { poses = [helper]; first = false; }
      else poses = rand() < 0.05 ? [helper] : rand() < 0.5 ? [rider, helper] : [helper, rider];
      const p = fit.pickRider(poses, track, t, W, H, 'L', { lock: 'near' });
      track = p.track;
      assert.notEqual(p.lm, helper, `${JSON.stringify(h)}, ${fps} poses/s, ${still ? 'still' : 'pedalling'}, seed ${seed}: the helper measured at ${t.toFixed(2)} s`);
    }
  }
});

test('a helper leaning in at the hip with BOTH hands on the hoods is never taken on a frame where the model misses the rider', () => {
  // QA round 3b: with the far hand on the hoods too, these helpers come within 0.235 to 0.265 of a
  // torso length of the rider, inside RELOCK_GATE. None of them sits like a rider (isSeated), so they
  // must pass the stricter UNSEATED_GATE, which they never do.
  const bothHoods = (h, o = {}) => {
    const lm = synthHelper({ ...h, ...o });
    lm[14] = { ...lm[13], x: lm[13].x - 12 / W }; lm[16] = { ...lm[15], x: lm[15].x - 12 / W };
    return lm;
  };
  const SHAPES = [...HOODS, { at: -200, frontal: false, lean: 30, kneeBend: 25, depth: 1, reach: [540, 640] },
    { at: -150, frontal: false, lean: 35, kneeBend: 15, depth: 0.95, reach: [460, 670] }];
  const deg = (d) => (d * Math.PI) / 180;
  for (const h of SHAPES) for (let a = 0; a < 360; a += 15) {
    const first = fit.pickRider([synthPose(deg(a))], null, 0, W, H, 'L');
    const p = fit.pickRider([bothHoods(h)], first.track, 0.1, W, H, 'L', { lock: 'near' });
    assert.equal(p.lm, null, `${JSON.stringify(h)}, both hands: taken after the rider at ${a}°`);
  }
  for (const still of [false, true]) for (const fps of [3, 10, 30]) for (const [n, h] of SHAPES.entries()) for (let seed = 1; seed <= 8; seed++) {
    const rand = seeded(seed * 17 + fps + n);
    const arrive = 4 + 2 * rand();
    let track = fit.trackFrom(synthPose(-Math.PI / 2), 0, W, H), first = true;
    for (let t = 0; t < 12; t += 1 / fps) {
      const rider = synthPose(still ? -Math.PI / 2 : -Math.PI / 2 + (2 * Math.PI * t) / 1.5, { noise: 1.2, rand });
      const helper = bothHoods(h, { noise: 1.2, rand });
      let poses;
      if (t < arrive) poses = [rider];
      else if (first) { poses = [helper]; first = false; }
      else poses = rand() < 0.05 ? [helper] : rand() < 0.5 ? [rider, helper] : [helper, rider];
      const p = fit.pickRider(poses, track, t, W, H, 'L', { lock: 'near' });
      track = p.track;
      assert.notEqual(p.lm, helper, `${JSON.stringify(h)}, both hands, ${fps} poses/s, ${still ? 'still' : 'pedalling'}, seed ${seed}: the helper measured at ${t.toFixed(2)} s`);
    }
  }
});

test('the rider is followed from any pedal position to any other, and found again sitting a little off', () => {
  // The gate a lone pose must pass (RELOCK_GATE) must still let the rider through: from one frame to
  // the next at any pose rate, the crank can be anywhere, and back on after a break he may sit 20 to
  // 35 mm off where he sat.
  const deg = (d) => (d * Math.PI) / 180;
  for (let a = 0; a < 360; a += 15) for (let b = 0; b < 360; b += 15) {
    const first = fit.pickRider([synthPose(deg(a))], null, 0, W, H, 'L');
    const next = synthPose(deg(b), { noise: 1.2, rand: seeded(a + b) });
    assert.equal(fit.pickRider([next], first.track, 0.1, W, H, 'L', { lock: 'near' }).lm, next, `${a}° then ${b}°`);
    for (const hipShift of [[20, 0], [-20, 0], [0, 20], [0, -20], [35, 0], [-35, 0]]) {
      const back = synthPose(deg(b), { hipShift });
      assert.equal(fit.pickRider([back], first.track, 5, W, H, 'L', { lock: 'near' }).lm, back, `${a}° then ${b}° sitting ${hipShift} mm off`);
    }
  }
});

test('the rider followed is let go after a second, and someone elsewhere is never taken meanwhile', () => {
  const rider = synthPose(0);
  const first = fit.pickRider([rider], null, 0, W, H);
  // Another person sitting like a rider, but far from the rider's spot: not the rider while followed.
  const other = synthPose(0, { cx: 1000, scale: 0.25 });
  assert.equal(fit.pickRider([other], first.track, 0.5, W, H).lm, null);
  // After TRACK_KEEP the track is dropped and the only rider in the picture is found afresh.
  assert.equal(fit.pickRider([other], first.track, 0.5 + fit.TRACK_KEEP + 0.1, W, H).lm, other);
});

// ── pedalling forwards ───────────────────────────────────────────────────────────────────────
// swap: the share of frames where the pose model mixes up the near and far legs (the ankle, heel,
// toe and knee points of the two sides trade places), at random, seeded.
const NEAR_FAR = [[25, 26], [27, 28], [29, 30], [31, 32]];
const swapLegs = (lm) => { const out = lm.map(p => ({ ...p })); for (const [a, b] of NEAR_FAR) [out[a], out[b]] = [out[b], out[a]]; return out; };
const pedalSamples = ({ way, fps = 15, rev = 1.1, secs = 30, noise = 1.5, mirror = false, seed = 7, swap = 0 }) => {
  const rand = seeded(seed), out = [];
  for (let i = 0; i < secs * fps; i++) {
    const t = i / fps;
    let lm = synthPose(-Math.PI / 2 + (way * 2 * Math.PI * t) / rev, { noise, rand, mirror });
    if (swap && rand() < swap) lm = swapLegs(lm);
    out.push({ t, ...fit.frameAngles(lm, 'L', W, H) });
  }
  return out;
};

test('forward pedalling: each stroke found, the knee recovered, and the direction told', () => {
  const fwd = fit.summarisePedal(pedalSamples({ way: -1 })); // forwards: the crank turns clockwise
  assert.ok(fwd.strokes >= 25 && fwd.strokes <= 28, `strokes ${fwd.strokes}`);
  near(fwd.kneeFlex, trueKneeFlexBDC(), 1.5);
  assert.equal(fwd.direction, 1);
  const back = fit.summarisePedal(pedalSamples({ way: 1, secs: 20 }));
  assert.equal(back.direction, -1);
  near(back.kneeFlex, fwd.kneeFlex, 1);
  // The bike facing the other way round in the picture.
  const mirrored = fit.summarisePedal(pedalSamples({ way: -1, mirror: true }));
  assert.equal(mirrored.direction, 1);
  near(mirrored.kneeFlex, trueKneeFlexBDC(), 1.5);
  // Forwards at a normal pace with a slow phone: too few frames a turn, so no reading, and "slower".
  const quick = pedalSamples({ way: -1, fps: 10, rev: 0.7, secs: 12 });
  assert.equal(fit.summarisePedal(quick).strokes, 0);
  assert.equal(fit.slowerTurn(quick, 12), 2);
});

test('the direction is not guessed from a foot held still or from less than a turn', () => {
  const still = Array.from({ length: 60 }, (_, i) => ({ t: i / 15, ...fit.frameAngles(synthPose(-Math.PI / 2, { noise: 3, rand: seeded(i) }), 'L', W, H) }));
  assert.equal(fit.pedalDirection(still), 0);
  assert.equal(fit.pedalDirection(pedalSamples({ way: -1, rev: 6, secs: 4 })), 0); // two thirds of a turn
  // Under 5 frames a turn (fit.DIR_MIN_FRAMES) the steps come too close to a quarter turn to tell a
  // real step from a leg swap, so it does not say.
  assert.equal(fit.pedalDirection(pedalSamples({ way: -1, fps: 3, rev: 1, secs: 4 })), 0);
  assert.equal(fit.pedalDirection(pedalSamples({ way: -1, fps: 6, rev: 1, secs: 4 })), 1); // 6 frames a turn tells
  assert.equal(fit.pedalDirection([]), 0);
});

test('the direction holds when the pose model swaps the near and far legs now and then', () => {
  // A swapped frame puts the ankle half a turn round, and each swap used to add about one whole turn
  // the wrong way: with 10% of frames swapped, most 4 s windows of forwards pedalling read backwards.
  // The app judges a fresh 4 s window on every frame, so every window must hold.
  for (const [way, want] of [[-1, 1], [1, -1]]) { // forwards, backwards
    for (const fps of [10, 20, 30]) for (const rev of [0.7, 1, 1.5]) for (const swap of [0.05, 0.1, 0.2]) {
      const all = pedalSamples({ way, fps, rev, secs: 24, swap, noise: 2, seed: fps * 31 + Math.round(rev * 10) + Math.round(swap * 100) });
      let right = 0, n = 0;
      for (let t0 = 0; t0 + 4 <= 24; t0 += 0.5) {
        const d = fit.pedalDirection(all.filter(s => s.t >= t0 && s.t < t0 + 4));
        assert.notEqual(d, -want, `way ${way}, ${fps} poses/s, ${rev} s a turn, ${swap * 100}% swapped, window at ${t0} s`);
        n++;
        if (d === want) right++;
      }
      // Unknown is allowed (it never says the wrong way), but most windows still tell.
      if (swap <= 0.1) assert.ok(right >= 0.8 * n, `way ${way}, ${fps} poses/s, ${rev} s, ${swap}: ${right} of ${n}`);
    }
    // Over the whole pedalling step too, which is what the results go by.
    assert.equal(fit.summarisePedal(pedalSamples({ way, fps: 20, rev: 1, swap: 0.1, noise: 2 })).direction, want);
  }
  // A single swapped frame in an otherwise clean turn changes nothing.
  const clean = pedalSamples({ way: -1, fps: 20, rev: 1, secs: 4, noise: 2 });
  clean[37] = { ...clean[37], ...fit.frameAngles(swapLegs(synthPose(-Math.PI / 2 - 2 * Math.PI * clean[37].t)), 'L', W, H) };
  assert.equal(fit.pedalDirection(clean), 1);
});

// ── the setup, stored and compared like with like ────────────────────────────────────────────
const pedal = (k, direction = 0) => ({ strokes: 12, strokesSeen: 12, kneeFlex: k, torso: 45, elbow: 22, shoulder: 88, direction });

test('the setup changes which way to pedal and for how long, in every line that says so', () => {
  assert.deepEqual(Object.keys(fit.SETUPS), ['trainer', 'wall', 'friend']);
  assert.equal(fit.SETUPS.trainer.dir, 'forwards');
  assert.equal(fit.SETUPS.trainer.secs, 30);
  for (const k of ['wall', 'friend']) { assert.equal(fit.SETUPS[k].dir, 'backwards'); assert.equal(fit.SETUPS[k].secs, 20); }
  const t = fit.advise(null, pedal(36), 'trainer');
  assert.equal(t.setup, 'trainer');
  assert.equal(t.pedalDir, 'forwards');
  assert.equal(fit.measures(t, pedal(36))[0].name, 'Knee bend with the pedal at its lowest, pedalling forwards');
  // The way the pedals were seen to turn wins over the way the setup asks for.
  assert.equal(fit.advise(null, pedal(36, -1), 'trainer').pedalDir, 'backwards');
  assert.equal(fit.advise(null, pedal(36), 'friend').pedalDir, 'backwards');
  assert.equal(fit.advise(null, pedal(36), 'nonsense').setup, null);
  const none = (s) => fit.saddleStep(fit.advise(null, { strokes: 2, strokesSeen: 2, kneeFlex: NaN }, s));
  assert.equal(none('trainer'), 'Film again and pedal forwards for the full 30 seconds.');
  assert.equal(none('wall'), 'Film again and pedal backwards for the full 20 seconds.');
  assert.equal(fit.saddleStep(fit.advise(null, undefined, 'trainer')), 'Film again and pedal forwards at an easy effort until I say stop.');
  const stillOnly = fit.advise({ kneeFlex: 30, torso: 45, elbow: 22, shoulder: 88 }, undefined, 'trainer');
  assert.match(fit.headline(stillOnly).why, /pedal forwards to be sure/);
  const rows = fit.measures(stillOnly, undefined);
  assert.equal(rows.find(x => x.key === 'kneePedal').step, 'Film again and pedal forwards for the full 30 seconds.');
  assert.match(rows.find(x => x.key === 'hipBottom').why, /while you pedal forwards\.$/);
  for (const s of ['trainer', 'wall', 'friend']) {
    const r = fit.advise(null, undefined, s);
    const text = [...fit.measures(r).flatMap(x => [x.name, x.why, x.step]), fit.headline(r).why, fit.saddleStep(r), fit.spokenSummary(r), fit.spokenSummary(r, { long: true })].join(' ');
    assert.ok(!/\u2014|undefined|NaN/.test(text), text);
    if (s === 'trainer') assert.ok(!/backwards/.test(text), text);
    else assert.ok(!/forwards/.test(text), text);
  }
});

test('last time: only sessions with the bike held the same way, and a clear note when there are none', () => {
  const trainer = { at: 'C', v: 2, setup: 'trainer', values: { kneePedal: 36, torso: 44 } };
  const wall = { at: 'B', v: 2, setup: 'wall', values: { kneePedal: 41, torso: 47 } };
  const legacy = { at: 'A', v: 2, values: { kneePedal: 40, torso: 46 } }; // saved before the question
  const h = [trainer, wall, legacy];
  assert.equal(fit.lastWith(h, 'kneePedal', 'trainer').at, 'C');
  assert.equal(fit.lastWith(h, 'kneePedal', 'wall').at, 'B');
  assert.equal(fit.lastWith(h, 'kneePedal', 'friend'), null);
  assert.equal(fit.lastWith(h, 'torso', null).at, 'A'); // like with like, also for the old ones
  assert.equal(fit.lastElsewhere(h, 'kneePedal', 'wall'), null); // there is a same-setup one
  assert.equal(fit.lastElsewhere(h, 'kneePedal', 'friend').at, 'C');
  assert.equal(fit.notCompared(trainer, '9 Oct'), 'Not compared with 9 Oct: the bike was on a trainer or rollers then.');
  assert.equal(fit.notCompared(legacy, '8 Oct'), 'Not compared with 8 Oct: filmed before the app asked how the bike stays up.');
  assert.ok(fit.sameSetup('wall', 'wall') && fit.sameSetup(undefined, null) && !fit.sameSetup('wall', 'friend') && !fit.sameSetup(null, 'wall'));
});

test('a change made after a film on the wall is only checked by another film on the wall', () => {
  const made = { at: 'A', setup: 'wall', knee: 47, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 12, at: 'A' } };
  // A trainer film in between neither checks it nor uses it up.
  const onTrainer = { at: 'B', setup: 'trainer', knee: 44, src: 'pedalling' };
  assert.equal(fit.pendingChange([onTrainer, made]), made);
  const r = fit.advise(null, pedal(44), 'trainer');
  const j = fit.judgeChange(fit.pendingChange([made]), { knee: r.knee, src: r.kneeSource, setup: 'trainer' });
  assert.equal(j.verdict, 'other-setup');
  assert.equal(j.text, 'Not compared with the film before raising the saddle: the bike was leaning on a wall, and this time it was on a trainer or rollers. To see what the change did, film again with the bike leaning on a wall.');
  const w = fit.withRetest(r, j);
  assert.ok(!w.held, 'nothing to judge, so nothing held back');
  assert.equal(w.change.kind, 'saddle'); // this film's own reading still stands
  assert.ok(fit.spokenSummary(w).startsWith('Not compared with the film before raising the saddle'));
  // A wall film checks it, and uses it up.
  const again = fit.judgeChange(fit.pendingChange([onTrainer, made]), { knee: 44, src: 'pedalling', setup: 'wall' });
  assert.equal(again.verdict, 'consistent');
  assert.equal(fit.pendingChange([{ at: 'C', setup: 'wall', knee: 44, src: 'pedalling' }, onTrainer, made]), null);
  // After raising the bars, the same.
  const bars = { at: 'A', setup: 'friend', knee: 36, src: 'pedalling', values: { torso: 34, elbow: 5, shoulder: 100 }, made: { kind: 'bars', at: 'A' } };
  assert.equal(fit.judgeChange(bars, { knee: 37, src: 'pedalling', setup: 'wall', values: { torso: 39, elbow: 12, shoulder: 98 } }).verdict, 'other-setup');
  assert.equal(fit.judgeChange(bars, { knee: 37, src: 'pedalling', setup: 'friend', values: { torso: 39, elbow: 12, shoulder: 98 } }).verdict, 'shown');
  // The home card says how to film it.
  assert.equal(fit.retestPrompt(made.made, '9 Oct', 'wall'), 'You raised the saddle 12 mm after your 9 Oct check. Film again the same way: bike leaning on a wall. A few minutes.');
  for (const t of [j.text, j.spoken, fit.retestPrompt(made.made, '9 Oct', 'trainer')]) assert.ok(!/\u2014/.test(t));
});

test('the app asks for two poses, stores the setup with each session and compares like with like', async () => {
  const src = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /numPoses: 2/);
  assert.match(src, /fit\.pickRider\(poses, track, t, W, H/);
  assert.match(src, /h\.unshift\(\{[^}]*setup: r\.setup/);
  assert.match(src, /fit\.advise\(session\.still, session\.pedal, session\.setup\)/);
  assert.match(src, /setup: session\.setup, values:/); // the retest is told how this film was set up
  assert.match(src, /fit\.lastWith\(history, x\.key, lastResult\?\.setup\)/);
  assert.match(src, /localStorage\.setItem\(SKEY, id\)/); // the last choice is remembered on this phone
  // Never a frame from someone who might not be the rider: only the pick is measured.
  assert.ok(!/res\.landmarks\?\.\[0\]/.test(src));
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /How Will Your Bike Stay Up\?/);
  for (const k of ['trainer', 'wall', 'friend']) assert.match(html, new RegExp(`data-setup="${k}"`));
});

// ── who turns the pedals: telling the rider from a helper who crouches like one ───────────────
// The review's postures: a friend half-crouched, knees bent 30 to 40, leaning 30 to 60, 300 to 800 mm
// behind the hip, one hand to the stem. synthHelper puts the camera-side hand on the stem at reach.
const BRACED = [[-650, 45, 35], [-450, 40, 40], [-800, 40, 40], [-500, 40, 30], [-300, 45, 35]];
const braced = (at, lean, kneeBend, more = {}) => ({ at, frontal: false, lean, kneeBend, depth: 0.9, reach: [450, 700], ...more });

test('a braced helper sits like a rider, so posture alone cannot tell them apart', () => {
  for (const [at, lean, kb] of [[-650, 45, 35], [-450, 40, 40], [-800, 40, 40], [-300, 45, 35]]) {
    const a = fit.frameAngles(synthHelper(braced(at, lean, kb)), 'L', W, H);
    assert.ok(fit.isSeated(a), `${at}/${lean}/${kb}`);
  }
  // In view first, the old lock-on took the helper: the identity check is what prevents it.
  const p = fit.pickRider([synthHelper(braced(-650, 45, 35))], null, 0, W, H);
  assert.ok(p.lm, 'lock any: the only seated pose is taken');
  assert.equal(fit.pickRider([synthHelper(braced(-650, 45, 35))], null, 0, W, H, null, { lock: 'none' }).lm, null);
});

for (const fps of [5, 10]) {
  test(`identity by who turns the pedals, then 20 s of following, at ${fps} poses a second`, () => {
    for (const [at, lean, kb] of BRACED) {
      const rand = seeded(at + fps), order = seeded(kb + fps);
      const h = braced(at, lean, kb, { noise: 1.2, rand });
      // The helper in view from t = 0; the rider seated from 10 s and turning the pedals from 12 to 15 s.
      let cands = [], found = null;
      for (let i = 0; i < 16 * fps && !found; i++) {
        const t = i / fps;
        const poses = [synthHelper(h)];
        let rider = null;
        if (t >= 10) {
          rider = synthPose(t >= 12 && t < 15 ? -(2 * Math.PI * (t - 12)) / 1.5 : 0, { noise: 1.2, rand });
          poses.push(rider);
        }
        if (order() < 0.5) poses.reverse();
        cands = fit.followCandidates(cands, poses, t, W, H);
        assert.ok(cands.length <= fit.MAX_CANDIDATES);
        const c = fit.pedalledCandidate(cands, 12);
        if (c) found = { c, t, rider };
        else assert.ok(t < 15, `${at}/${lean}/${kb}: nobody identified by ${t.toFixed(1)} s`);
      }
      assert.ok(found, `${at}/${lean}/${kb}: identified`);
      assert.equal(found.c.lm, found.rider, `${at}/${lean}/${kb}: the identity check picked the helper`);
      // Then pedalling, at 15 frames a turn so every stroke can be measured.
      let track = fit.trackFrom(found.c.lm, found.t, W, H), wrong = 0, amb = 0;
      const samples = [], rev = 15 / fps;
      for (let i = 1; i <= 20 * fps; i++) {
        const t = found.t + i / fps;
        const rider = synthPose(-Math.PI / 2 + (2 * Math.PI * (i / fps)) / rev, { noise: 1.2, rand });
        const poses = [synthHelper(h), rider];
        if (order() < 0.5) poses.reverse();
        const p = fit.pickRider(poses, track, t, W, H, 'L', { lock: 'near' });
        track = p.track;
        if (p.ambiguous) amb++;
        if (p.lm && p.lm !== rider) wrong++;
        if (p.lm === rider) samples.push({ t, ...fit.frameAngles(rider, 'L', W, H) });
      }
      assert.equal(wrong, 0, `${at}/${lean}/${kb}: wrong picks`);
      assert.ok(amb <= 0.02 * 20 * fps, `${at}/${lean}/${kb}: ${amb} ambiguous`);
      near(fit.summarisePedal(samples).kneeFlex, trueKneeFlexBDC(), 1.5);
    }
  });
}

test('the identity check: only an ankle that goes round counts, and only one', () => {
  const rider = (t) => synthPose(-(2 * Math.PI * t) / 1.5, { noise: 1.2, rand: seeded(3) });
  let cands = [];
  // Two people sitting still: nobody.
  for (let t = 0; t < 4; t += 0.1) cands = fit.followCandidates(cands, [synthPose(0), synthHelper(braced(-650, 45, 35))], t, W, H);
  assert.equal(cands.length, 2);
  assert.equal(fit.pedalledCandidate(cands), null);
  // Samples before the question do not count.
  let c2 = [];
  for (let t = 0; t < 3; t += 0.1) c2 = fit.followCandidates(c2, [rider(t), synthHelper(braced(-650, 45, 35))], t, W, H);
  assert.ok(fit.pedalledCandidate(c2, 0));
  assert.equal(fit.pedalledCandidate(c2, 3), null);
  // At one pose a second, the last 6 samples are kept, so slow pose rates still have enough to judge.
  let c3 = [];
  for (let t = 0; t < 8; t += 1) c3 = fit.followCandidates(c3, [synthPose(-(2 * Math.PI * t) / 2.3)], t, W, H);
  assert.ok(c3[0].samples.length >= 6);
  assert.ok(fit.pedalledCandidate(c3));
  // Two people both turning pedals: nobody, it cannot say which is the rider.
  let c4 = [];
  for (let t = 0; t < 3; t += 0.1) c4 = fit.followCandidates(c4, [rider(t), synthPose(-(2 * Math.PI * t) / 1.5, { cx: 1000, scale: 0.25 })], t, W, H);
  assert.equal(c4.length, 2);
  assert.equal(fit.pedalledCandidate(c4), null);
  // Someone who stops being seen is dropped after TRACK_KEEP.
  assert.equal(fit.followCandidates(cands, [], 4 + fit.TRACK_KEEP + 0.1, W, H).length, 0);
});

test('a braced helper is never taken when the model misses the rider, or after he was out of view', () => {
  for (const [at, lean, kb] of [[-650, 45, 35], [-300, 45, 35], [-250, 45, 35], [-200, 40, 40]]) for (const fps of [5, 10, 30]) {
    const rand = seeded(3), r2 = seeded(4);
    const h = braced(at, lean, kb, { noise: 1.5, rand });
    let track = fit.trackFrom(synthPose(-Math.PI / 2), 0, W, H), wrong = 0, picked = 0, lone = 0;
    for (let i = 1; i <= 30 * fps; i++) {
      const t = i / fps;
      const rider = synthPose(-Math.PI / 2 + (2 * Math.PI * t) / 1.4, { noise: 1.5, rand });
      // The model misses the rider in about one frame in eight, and he is out of view from 15 to 17 s.
      const gone = r2() < 0.12 || (t > 15 && t < 17);
      const poses = [...(gone ? [] : [rider]), synthHelper(h)];
      if (r2() < 0.5) poses.reverse();
      const p = fit.pickRider(poses, track, t, W, H, 'L', { lock: 'near' });
      track = p.track;
      if (p.lm) { picked++; if (p.lm !== rider) wrong++; }
      if (gone) { lone++; assert.equal(p.lm, null); }
    }
    assert.equal(wrong, 0, `${at}/${lean}/${kb} at ${fps}: wrong picks`);
    assert.ok(picked >= 30 * fps - lone - 2, `${at}/${lean}/${kb} at ${fps}: found again after the gap (${picked} of ${30 * fps - lone})`);
  }
  // lock 'alone' takes a lone seated pose only with nobody else in the picture.
  const rider = synthPose(0), hp = synthHelper(braced(-650, 45, 35));
  assert.equal(fit.pickRider([rider], null, 0, W, H, null, { lock: 'alone' }).lm, rider);
  assert.equal(fit.pickRider([rider, synthHelper({ at: -1400 })], null, 0, W, H, null, { lock: 'alone' }).lm, null);
  assert.equal(fit.pickRider([rider, hp], null, 0, W, H, null, { lock: 'alone' }).ambiguous, true);
  // lock 'near': the helper alone, far from where the rider was, is never taken.
  const stale = fit.trackFrom(rider, 0, W, H);
  assert.equal(fit.pickRider([hp], stale, 5, W, H, null, { lock: 'near' }).lm, null);
  assert.equal(fit.pickRider([hp, synthPose(-Math.PI / 2)], stale, 5, W, H, null, { lock: 'near' }).index, 1);
});

test('one pose per person is counted, so the app knows when a second person came into view', () => {
  const rider = synthPose(0);
  assert.equal(fit.pickRider([rider], null, 0, W, H).count, 1);
  assert.equal(fit.pickRider([rider, synthPose(0, { noise: 8, rand: seeded(4) })], null, 0, W, H).count, 1);
  assert.equal(fit.pickRider([rider, synthHelper({ at: -1400 })], null, 0, W, H).count, 2);
});

// ── road bikes only: a time trial position is named, not measured ─────────────────────────────
// A rider on aero bars, built like Tom's (scratchpad/tom/ttsynth.js): the torso near flat, the upper
// arm forward of square to it, forearms along the extensions.
function ttPose(torso, theta = -Math.PI / 2) {
  const rad = (d) => (d * Math.PI) / 180;
  const lm = synthPose(theta);
  const hip = [-160, 753], a = rad(torso);
  const sho = [hip[0] + 560 * Math.cos(a), hip[1] + 560 * Math.sin(a)];
  const u = a + rad(10), elbow = [sho[0] + 300 * Math.sin(u), sho[1] - 300 * Math.cos(u)];
  const hand = [elbow[0] + 330 * Math.cos(rad(10)), elbow[1] + 330 * Math.sin(rad(10))];
  const leg = (th) => { // the same leg as synthPose, from the TT hip
    const pedal = [170 * Math.cos(th), 170 * Math.sin(th)], ankle = [pedal[0] - 35, pedal[1] + 85];
    const vx = ankle[0] - hip[0], vy = ankle[1] - hip[1], d = Math.min(Math.hypot(vx, vy), 889.9);
    const ux = vx / Math.hypot(vx, vy), uy = vy / Math.hypot(vx, vy), x = (450 ** 2 - 440 ** 2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(450 ** 2 - x * x, 0));
    return { ankle, knee: [hip[0] + ux * x - uy * hh, hip[1] + uy * x + ux * hh] };
  };
  const P = (p) => ({ x: (600 + 0.33 * p[0]) / W, y: (520 - 0.33 * p[1]) / H });
  const set = (i, p, vis) => { lm[i] = { ...P(p), z: lm[i].z, visibility: vis }; };
  const n = leg(theta), f = leg(theta + Math.PI);
  set(0, [sho[0] + 150, sho[1] + 70], 0.99);
  for (const [l, r, p] of [[11, 12, sho], [13, 14, elbow], [15, 16, hand], [23, 24, hip]]) { set(l, p, 0.95); set(r, p, 0.7); }
  set(25, n.knee, 0.96); set(26, f.knee, 0.6); set(27, n.ankle, 0.95); set(28, f.ankle, 0.55);
  return lm;
}

test('isAero: a rider on aero bars at 5 to 20 degrees, never a road rider or a helper', () => {
  for (const torso of [5, 10, 15, 20]) for (const theta of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    const a = fit.frameAngles(ttPose(torso, theta), 'L', W, H);
    near(a.torso, torso, 0.5);
    assert.ok(fit.isAero(a), `torso ${torso}, crank ${theta.toFixed(2)}: ${JSON.stringify({ k: a.kneeFlex, th: a.thighFwd })}`);
    assert.ok(!fit.isRiding(a), 'never accepted as a road rider');
  }
  for (let th = 0; th < 2 * Math.PI; th += 0.5) assert.ok(!fit.isAero(fit.frameAngles(synthPose(th), 'L', W, H)));
  for (const h of [{}, { frontal: false }, { frontal: false, lean: 40, kneeBend: 25 }, { frontal: false, lean: 60, kneeBend: 10 }, braced(-650, 45, 35)]) {
    assert.ok(!fit.isAero(fit.frameAngles(synthHelper(h), 'L', W, H)), JSON.stringify(h));
  }
  assert.equal(fit.pickRider([ttPose(10)], null, 0, W, H).aero, 1);
  assert.equal(fit.pickRider([ttPose(10)], null, 0, W, H).lm, null);
});

// ── what the app says and shows: source checks ───────────────────────────────────────────────
// Every string literal in a JavaScript file, outside comments: the lines the app can say or show.
function literals(src) {
  const code = src.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, '')).join('\n');
  return [...code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2] ?? m[3]);
}
const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
// What a person reads on the page: the text of index.html, without its tags, styles and scripts.
const pageText = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');

test('nobody is asked to step out of view without "if they are not holding the bike"', async () => {
  const lines = literals(await read('app.js')).filter(s => /step out of view|out of view/i.test(s));
  assert.ok(lines.length >= 1);
  // Round 3 fix: the friend is no longer told to get out of view, so no line is let off this rule.
  for (const s of lines) assert.match(s, /If they are not holding the bike/, s);
});

test('on a trainer, the wrong-way line never says a bare "pedal forwards"', async () => {
  const src = await read('app.js');
  for (const s of literals(src).filter(x => /Pedal forwards/.test(x))) assert.match(s, /If the bike is standing on the floor/, s);
  assert.match(src, /'You are pedalling backwards\. On a trainer, pedal forwards\. If the bike is standing on the floor, keep pedalling backwards\.'/);
  // The setup chosen is said first, with the way out, and shown on the run screen.
  assert.match(src, /Voice\.say\(`You chose: bike \$\{S\(\)\.bike\}\.`\);\s*Voice\.say\('If that is wrong, tap Stop now\.'\)/);
  assert.match(await read('index.html'), /id="runSetup"/);
});

test('on rollers, no line says to let go of the wall before the pedals turn, and stopping starts at the wall', async () => {
  // Rollers cannot be balanced standing still: the guides say to start pedalling with a hand on the
  // wall, let go once rolling, and put the hand back on the wall to stop (British Cycling, "How to
  // ride rollers"; Train Right, "Step-by-Step Instructions on How to Ride Rollers").
  const src = await read('app.js');
  const lines = literals(src).filter(s => /let go/.test(s) && !/someone to let go/.test(s));
  assert.ok(lines.length >= 2);
  for (const s of lines) {
    for (const sentence of s.split(/(?<=\.)\s+/).filter(x => /let go/.test(x))) {
      assert.ok(!/let go[^.]*\bfirst\b/.test(sentence), sentence);
      assert.ok(/^I will tell you when to let go\.$/.test(sentence) || /start pedalling with your hand on the wall, and let go once you are rolling steadily/.test(sentence), sentence);
    }
  }
  // Every line that says to stop pedalling on a trainer or rollers names the wall first.
  for (const s of literals(src).filter(x => /stop pedalling/.test(x) && /rollers/.test(x))) assert.match(s, /wall/, s);
  // The stop: the rollers line comes before "Stop", on a trainer or rollers only.
  const end = src.slice(src.indexOf('function endPedal('), src.indexOf('\n}\n', src.indexOf('function endPedal(')));
  assert.match(end, /session\.setup === 'trainer'[^\n]*\n\s*Voice\.say\('On rollers, put your hand back on the wall, then stop pedalling\.', \{ interrupt: true \}\);\n\s*Voice\.say\(end\);/);
  assert.match(pageText(await read('index.html')), /On rollers, set up with a wall on the far side, away from the phone, so you can hold on while you get on, hold still, and start and stop pedalling\./);
});

test('the turn-the-pedals question and the get-on lines are not capped per session', async () => {
  // A cap per session left a later time on the bike waiting in silence (flow.test.mjs runs it).
  const src = await read('app.js');
  const ask = src.slice(src.indexOf('function ask('), src.indexOf('function identityTick('));
  assert.ok(!/max:/.test(ask), ask);
  assert.match(ask, /if \(!Voice\.say\(turnLine\(\)/); // counted only once queued
  const nag = src.slice(src.indexOf('function nag('), src.indexOf('// ── who is the rider'));
  assert.ok(!/max:/.test(nag), nag);
  assert.match(nag, /if \(Voice\.say\(lines\[n - 1\][^\n]*\) ph\.nags = n;/);
});

test('the level beeps wait for the voice', async () => {
  const src = await read('app.js');
  const phone = src.slice(src.indexOf('  phone: {'), src.indexOf('  mount: {'));
  const tones = phone.split('\n').filter(l => /Beep\.tone\(/.test(l));
  assert.ok(tones.length >= 1);
  for (const l of tones) assert.match(l, /quiet\(t\) > 1/, l.trim());
  // And the phone-moved line no longer cuts off the correction he is following.
  assert.ok(!/The phone moved\. Level it again\.[^\n]*interrupt: true/.test(src));
});

test('rider words: no "hood" or "crank" outside brackets, and "with the pedal at its lowest point"', async () => {
  for (const f of ['app.js', 'fit.js']) {
    for (const s of literals(await read(f))) {
      const outside = s.replace(/\([^)]*\)/g, '');
      assert.ok(!/\bhoods?\b|\bcranks?\b|bottom of the stroke/i.test(outside), `${f}: ${s}`);
    }
  }
  const text = pageText(await read('index.html')).replace(/\([^)]*\)/g, '');
  assert.ok(!/\bhoods?\b|\bcranks?\b|bottom of the stroke/i.test(text), text.match(/.{40}(hood|crank|bottom of the stroke).{40}/i)?.[0]);
});

test('"minutes" only as "A few minutes", until a real first session has been timed', async () => {
  for (const f of ['index.html', 'fit.js']) {
    const src = await read(f);
    const all = src.match(/.{0,6}minutes/g) || [];
    assert.ok(all.length >= 1, f);
    for (const m of all) assert.match(m, /A few minutes/, `${f}: ${m}`);
  }
});

test('the home screen: road bikes only, the pain question asked fresh and unanswered, Not medical advice', async () => {
  const html = await read('index.html');
  const text = pageText(html);
  assert.match(text, /road bike/);
  assert.match(text, /aero bars/);
  assert.match(text, /Pain or Numbness That Keeps Coming Back When You Ride\?/);
  // Asked every time and never stored: said under the question (round 3 fix: the question has its own
  // screen) and in Learn, Private by Design.
  assert.match(text, /Pain or Numbness That Keeps Coming Back When You Ride\?\s+Your answer is never saved\./);
  assert.match(text, /Your pain answer is never saved\./);
  assert.match(html, /id="painNo"[^>]*aria-checked="false"/);
  assert.match(html, /id="painYes"[^>]*aria-checked="false"/);
  assert.match(text, /Not medical advice\./);
  assert.ok(!/or a big change/.test(text));
  // The order: the setup question, the pain question, Start, then everything else.
  const at = (id) => html.indexOf(`id="${id}"`);
  assert.ok(at('setupCard') < at('painQ') && at('painQ') < at('start') && at('start') < at('retestCard') && at('start') < at('hMade') && at('start') < at('histCard'));
  for (const id of ['retestStart', 'hMadeStart', 'stopped', 'setupErr', 'stepsFold']) assert.ok(at(id) > 0, id);
  assert.ok(!/\u2014/.test(text));
});
