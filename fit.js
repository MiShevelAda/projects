// Bike-fit maths. Pure functions, no DOM, so they run in the browser and in Node tests.
//
// Landmarks are MediaPipe Pose (BlazePose, 33 points), normalised 0..1. Every angle is
// computed in PIXELS (x * width, y * height): normalised coordinates stretch a landscape
// frame and would bend every angle.
//
// Target ranges follow the AI Bike Fit tool (github.com/guzlz/ai-bike-fit), which grades
// against published research: dynamic knee flexion at the bottom of the stroke 30-40 deg,
// the static (Holmes) knee range 25-35 deg, and the same tolerance and amber bands.

export const LM = {
  nose: 0,
  shoulder: { L: 11, R: 12 }, elbow: { L: 13, R: 14 }, wrist: { L: 15, R: 16 },
  hip: { L: 23, R: 24 }, knee: { L: 25, R: 26 }, ankle: { L: 27, R: 28 },
  heel: { L: 29, R: 30 }, toe: { L: 31, R: 32 },
};
const JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'heel', 'toe'];

// (green_lo, green_hi, amber_pad). Outside green +/- pad is red.
export const TARGETS = {
  kneeDynamic: [30, 40, 5],     // knee flexion at the bottom, pedalling
  kneeStatic: [25, 35, 5],      // knee flexion at the bottom, holding still (Holmes)
  torso: [40, 50, 6],           // hip-to-shoulder line, degrees above horizontal
  elbow: [15, 30, 8],           // elbow flexion
  shoulder: [80, 95, 10],       // angle between torso and upper arm
  hipTop: [85, 110, null],      // hip angle at the top of the stroke, report only
};
// A phone video resolves joints to a few degrees, so a hard band edge is false precision.
export const GREEN_TOL = 2.5;

export function grade(name, v) {
  if (v == null || !Number.isFinite(v)) return 'na';
  const [lo, hi, pad] = TARGETS[name];
  if (lo - GREEN_TOL <= v && v <= hi + GREEN_TOL) return 'green';
  if (pad == null) return 'info';
  if (lo - pad <= v && v <= hi + pad) return 'amber';
  return 'red';
}

const px = (lm, W, H) => [lm.x * W, lm.y * H];

export function interior(a, b, c) {
  const bax = a[0] - b[0], bay = a[1] - b[1], bcx = c[0] - b[0], bcy = c[1] - b[1];
  const n = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (!n) return NaN;
  const cos = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function fromHorizontal(top, bottom) {
  const dx = Math.abs(bottom[0] - top[0]), dy = Math.abs(bottom[1] - top[1]);
  if (!dx && !dy) return NaN;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function median(xs) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function quantile(xs, q) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  return v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
}

// Which side faces the camera: the one MediaPipe sees better, then the one it puts nearer.
export function nearSide(frames) {
  let score = 0;
  for (const lm of frames) {
    for (const j of JOINTS) {
      const l = lm[LM[j].L], r = lm[LM[j].R];
      score += (l.visibility ?? 0) - (r.visibility ?? 0);
      score += 0.5 * Math.sign((r.z ?? 0) - (l.z ?? 0)); // smaller z = closer to the camera
    }
  }
  return score >= 0 ? 'L' : 'R';
}

// +1 if the rider faces image-right, -1 if image-left.
export function facing(lm) {
  const hipX = (lm[LM.hip.L].x + lm[LM.hip.R].x) / 2;
  const wristX = (lm[LM.wrist.L].x + lm[LM.wrist.R].x) / 2;
  return Math.sign((wristX - hipX) || (lm[LM.nose].x - hipX)) || 1;
}

// Every angle the report needs, for one frame, on one side.
export function frameAngles(lm, side, W, H) {
  const g = (j) => px(lm[LM[j][side]], W, H);
  const sh = g('shoulder'), el = g('elbow'), wr = g('wrist'), hp = g('hip');
  const kn = g('knee'), an = g('ankle'), toe = g('toe');
  const vis = Math.min(...['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].map(j => lm[LM[j][side]].visibility ?? 0));
  return {
    kneeFlex: 180 - interior(hp, kn, an),
    hip: interior(sh, hp, kn),
    torso: fromHorizontal(sh, hp),
    elbow: 180 - interior(sh, el, wr),
    shoulder: interior(hp, sh, el),
    ankle: interior(kn, an, toe),
    ankleY: an[1],
    thigh: Math.hypot(kn[0] - hp[0], kn[1] - hp[1]),
    vis,
  };
}

// ── setup checks ────────────────────────────────────────────────────────────────────────────
// Each returns null when fine, or {key, say} with the correction to speak.

export function checkFraming(lm, side, W, H) {
  const pts = [LM.nose, ...JOINTS.map(j => LM[j][side])].map(i => lm[i]);
  const margin = 0.02;
  const feet = [LM.ankle[side], LM.heel[side], LM.toe[side]].map(i => lm[i]);
  if (feet.some(p => p.y > 1 - margin || (p.visibility ?? 1) < 0.3)) {
    return { key: 'feet', say: 'Your feet are cut off. Move the phone further away.' };
  }
  if (lm[LM.nose].y < margin) return { key: 'head', say: 'Your head is cut off. Move the phone further away.' };
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  if (Math.min(...xs) < margin || Math.max(...xs) > 1 - margin) {
    return { key: 'edge', say: 'You are cut off at the side of the picture. Move the phone further away.' };
  }
  const tall = Math.max(...ys) - Math.min(...ys);
  if (tall < 0.42) return { key: 'small', say: 'You look small in the picture. Move the phone a bit closer.' };
  if (tall > 0.9) return { key: 'big', say: 'You fill the whole picture. Move the phone a bit further away.' };
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  if (cx < 0.3 || cx > 0.7) {
    // Image-left is the rear of the bike when the rider faces image-right.
    const towardImageLeft = cx < 0.5;
    const rear = (facing(lm) > 0) === towardImageLeft;
    return { key: 'centre', say: `You are near the edge of the picture. Move the phone a little towards the ${rear ? 'back' : 'front'} wheel.` };
  }
  return null;
}

// Side-on: seen square from the side, the left and right shoulders and hips overlap.
// The horizontal gap between them, relative to torso length, grows as the camera turns.
export function sideOnError(lm, side, W, H) {
  const other = side === 'L' ? 'R' : 'L';
  const s = px(lm[LM.shoulder[side]], W, H), s2 = px(lm[LM.shoulder[other]], W, H);
  const h = px(lm[LM.hip[side]], W, H), h2 = px(lm[LM.hip[other]], W, H);
  const torso = Math.hypot(s[0] - h[0], s[1] - h[1]);
  if (!torso) return { ratio: NaN, farBehind: false };
  const gap = ((s2[0] - s[0]) + (h2[0] - h[0])) / 2;
  const f = facing(lm);
  return { ratio: Math.abs(gap) / torso, farBehind: Math.sign(gap) === -f };
}

export function checkSideOn(lm, side, W, H, limit = 0.22) {
  const { ratio, farBehind } = sideOnError(lm, side, W, H);
  if (!(ratio > limit)) return null;
  // Far side showing behind the near side: the camera sits towards the rear, and the reverse.
  return {
    key: 'angle',
    say: `The phone is at an angle to the bike. Move it a little towards the ${farBehind ? 'front' : 'back'} wheel, pointing straight at the cranks.`,
  };
}

// Riding position rather than standing: the torso leans forward and the hands reach ahead.
export function isRiding(a) {
  return a.torso > 20 && a.torso < 72 && a.kneeFlex > 10;
}

// ── still capture ─────────────────────────────────────────────────────────────────────────────

// Largest movement of the key joints between the first and last frame, as a share of thigh length.
export function motion(framesLm, side, W, H) {
  if (framesLm.length < 2) return 0; // nothing to compare yet; callers decide how many frames they need
  const ids = ['hip', 'knee', 'ankle', 'shoulder', 'wrist'].map(j => LM[j][side]);
  let worst = 0;
  const a = framesLm[0], ref = frameAngles(a, side, W, H).thigh || 1;
  for (const b of framesLm.slice(1)) {
    for (const i of ids) worst = Math.max(worst, Math.hypot((b[i].x - a[i].x) * W, (b[i].y - a[i].y) * H) / ref);
  }
  return worst;
}

// Median of each angle over the frames held still.
export function summariseStill(angles) {
  const pick = (k) => median(angles.map(a => a[k]));
  return { kneeFlex: pick('kneeFlex'), torso: pick('torso'), elbow: pick('elbow'), shoulder: pick('shoulder'), ankle: pick('ankle') };
}

// ── pedalling ───────────────────────────────────────────────────────────────────────────────

function smooth(xs, k = 2) {
  return xs.map((_, i) => {
    let s = 0, n = 0;
    for (let j = i - k; j <= i + k; j++) if (j >= 0 && j < xs.length && Number.isFinite(xs[j])) { s += xs[j]; n++; }
    return n ? s / n : NaN;
  });
}

// Bottom and top of each stroke from the ankle's height. samples: [{t (s), ankleY (px, down is +)}].
// Returns indexes of bottoms (ankle lowest) and tops (ankle highest).
export function strokes(samples, minGap = 0.35) {
  const y = smooth(samples.map(s => s.ankleY));
  const lo = quantile(y, 0.05), hi = quantile(y, 0.95), amp = hi - lo;
  const out = { bottoms: [], tops: [], amp };
  if (!(amp > 0)) return out;
  const near = (v, target) => Math.abs(v - target) < 0.3 * amp;
  for (let i = 1; i < y.length - 1; i++) {
    if (!Number.isFinite(y[i])) continue;
    const isMax = y[i] >= y[i - 1] && y[i] > y[i + 1];
    const isMin = y[i] <= y[i - 1] && y[i] < y[i + 1];
    const add = (list) => {
      const last = list[list.length - 1];
      if (last != null && samples[i].t - samples[last].t < minGap) {
        if ((list === out.bottoms ? y[i] > y[last] : y[i] < y[last])) list[list.length - 1] = i;
      } else list.push(i);
    };
    if (isMax && near(y[i], hi)) add(out.bottoms);
    if (isMin && near(y[i], lo)) add(out.tops);
  }
  return out;
}

// True when the ankle has been going round: enough up-and-down in the recent window.
export function isPedalling(samples, legLength) {
  if (samples.length < 6) return false;
  const ys = samples.map(s => s.ankleY);
  // The ankle travels about two crank lengths, close to 0.38 of leg length; 0.2 leaves margin.
  return quantile(ys, 0.95) - quantile(ys, 0.05) > 0.2 * legLength;
}

export function summarisePedal(samples) {
  const { bottoms, tops } = strokes(samples);
  const around = (idx, key) => idx.map(i => median([samples[i - 1], samples[i], samples[i + 1]].filter(Boolean).map(s => s[key])));
  return {
    strokes: bottoms.length,
    kneeFlex: median(around(bottoms, 'kneeFlex')),
    kneeFlexSpread: bottoms.length > 2 ? quantile(around(bottoms, 'kneeFlex'), 0.9) - quantile(around(bottoms, 'kneeFlex'), 0.1) : NaN,
    ankle: median(around(bottoms, 'ankle')),
    hipTop: median(around(tops, 'hip')),
    torso: median(samples.map(s => s.torso)),
    elbow: median(samples.map(s => s.elbow)),
    shoulder: median(samples.map(s => s.shoulder)),
  };
}

// ── the verdict ────────────────────────────────────────────────────────────────────────────

const round = (v) => Math.round(v);

// One priority change, in the order a fitter works: saddle height first, then the front end.
export function advise(still, pedal) {
  const usePedal = pedal && pedal.strokes >= 5 && Number.isFinite(pedal.kneeFlex);
  const knee = usePedal ? pedal.kneeFlex : still?.kneeFlex;
  const kneeRange = usePedal ? TARGETS.kneeDynamic : TARGETS.kneeStatic;
  const kneeGrade = grade(usePedal ? 'kneeDynamic' : 'kneeStatic', knee);
  const upper = usePedal ? pedal : still;
  const res = {
    knee, kneeSource: usePedal ? 'pedalling' : 'still', kneeGrade,
    staticKnee: still?.kneeFlex, staticGrade: grade('kneeStatic', still?.kneeFlex),
    torso: upper?.torso, torsoGrade: grade('torso', upper?.torso),
    elbow: upper?.elbow, elbowGrade: grade('elbow', upper?.elbow),
    shoulder: upper?.shoulder, shoulderGrade: grade('shoulder', upper?.shoulder),
    hipTop: pedal?.hipTop, ankle: usePedal ? pedal.ankle : still?.ankle,
    disagree: false, change: null, overall: 'green', notes: [],
  };

  // Both knee readings exist and point different ways: say so rather than pick one quietly.
  if (usePedal && Number.isFinite(still?.kneeFlex)) {
    const dir = (g, v, r) => (g === 'green' ? 0 : v > r[1] ? 1 : -1);
    res.disagree = dir(res.kneeGrade, knee, TARGETS.kneeDynamic) !== dir(res.staticGrade, still.kneeFlex, TARGETS.kneeStatic);
  }

  if (Number.isFinite(knee) && kneeGrade !== 'green') {
    const [lo, hi] = kneeRange;
    const over = knee > hi ? knee - hi : lo - knee;
    const a = Math.min(15, round(over * 3)), b = Math.min(15, round(over * 4));
    const mm = a === b ? `${a}` : `${a} to ${b}`;
    const raise = knee > hi;
    const verb = raise ? 'Raise' : 'Lower';
    res.change = {
      kind: 'saddle',
      headline: `${verb} the saddle about ${mm} mm`,
      spoken: `${verb} the saddle about ${mm} millimetres, then film again.`,
      why: (raise
        ? `Your knee is still bent ${round(knee)} degrees at the bottom of the stroke. The target is ${lo} to ${hi}, so the saddle is probably a little low.`
        : `Your knee is only bent ${round(knee)} degrees at the bottom of the stroke. The target is ${lo} to ${hi}, so the saddle is probably a little high.`)
        + (over * 4 > 15 ? ' 15 millimetres is the most to change in one go.' : ''),
    };
  } else {
    let flags = 0;
    if (upper?.torso < 40) flags++;
    if (upper?.shoulder < 80) flags++;
    if (upper?.elbow > 30 || upper?.elbow < 8) flags++;
    if (flags >= 2) {
      res.change = {
        kind: 'bars',
        headline: 'Raise the handlebars',
        spoken: 'Raise the handlebars by moving one spacer from above the stem to below it, then film again.',
        why: 'Your back, shoulder and elbow angles together say you are stretched long and low. Move one spacer from above the stem to below it. If that is not enough, a shorter stem is the next step.',
      };
    } else if (upper?.torso > 56) {
      res.notes.push('You sit quite upright. That is comfortable and fine for most riding; only lower the bars if you want a faster position.');
    }
  }
  const graded = [res.kneeGrade, res.torsoGrade, res.elbowGrade, res.shoulderGrade];
  const worst = graded.includes('red') ? 'red' : graded.includes('amber') ? 'amber' : 'green';
  res.overall = res.change ? (worst === 'green' ? 'amber' : worst) : worst === 'green' ? 'green' : 'amber';
  return res;
}

const NAMES = { torso: 'back angle', elbow: 'elbow bend', shoulder: 'shoulder angle' };

// The words the app says at the end. Short sentences: they are spoken across a room.
export function spokenSummary(r) {
  const out = [];
  if (r.change) out.push(`${r.change.why} ${r.change.spoken}`);
  else if (Number.isFinite(r.knee)) out.push(`Your knee is bent ${round(r.knee)} degrees at the bottom of the stroke. That is in range, so leave the saddle height alone.`);
  else out.push('There was not enough to measure. Please film again.');
  if (r.disagree) out.push('Your still reading and your pedalling reading disagree, so treat this as a maybe and film once more.');
  const ok = [], off = [];
  for (const k of ['torso', 'elbow', 'shoulder']) {
    if (r[k + 'Grade'] === 'green') ok.push(NAMES[k]);
    else if (r[k + 'Grade'] !== 'na') off.push(NAMES[k]);
  }
  const list = (xs) => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0];
  if (ok.length) out.push(`Your ${list(ok)} ${ok.length > 1 ? 'look' : 'looks'} good.`);
  if (off.length && r.change?.kind !== 'bars') out.push(`Your ${list(off)} ${off.length > 1 ? 'are' : 'is'} outside the target. Check the picture on the screen.`);
  return out.join(' ');
}
