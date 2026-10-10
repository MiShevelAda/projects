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
  // AI Bike Fit names this hip_angle_top, but its code measures it over the bottom-of-stroke
  // frames (analyze_bikefit.py measure()), so the range belongs to the open hip at the bottom.
  hipBottom: [85, 110, null],   // hip angle at the bottom of the stroke, report only
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
  const kn = g('knee'), an = g('ankle');
  const vis = Math.min(...['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].map(j => lm[LM[j][side]].visibility ?? 0));
  return {
    kneeFlex: 180 - interior(hp, kn, an),
    hip: interior(sh, hp, kn),
    torso: fromHorizontal(sh, hp),
    elbow: 180 - interior(sh, el, wr),
    shoulder: interior(hp, sh, el),
    ankleX: an[0],
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
    say: `The phone is at an angle to the bike. Move it a little towards the ${farBehind ? 'front' : 'back'} wheel, pointing straight at the pedals.`,
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
  return {
    kneeFlex: pick('kneeFlex'), torso: pick('torso'), elbow: pick('elbow'), shoulder: pick('shoulder'),
    ankleX: pick('ankleX'), ankleY: pick('ankleY'),
  };
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

// The value of samples[i][key] at the true bottom of the stroke, which usually falls between two
// frames. A parabola through the raw ankle heights of frames i-1, i, i+1 says how far its vertex
// sits from frame i (at most half a frame either way), and the angle is interpolated to that point.
// Taking the median of the three frames instead reads more bent: near the bottom both neighbours
// are more bent than the bottom itself.
export function atBottom(samples, i, key) {
  const a = samples[i - 1], b = samples[i], c = samples[i + 1];
  if (!a || !c) return b[key];
  const y0 = a.ankleY, y1 = b.ankleY, y2 = c.ankleY, den = y0 - 2 * y1 + y2;
  const off = den ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den)) : 0;
  return off >= 0 ? b[key] + off * (c[key] - b[key]) : b[key] + -off * (a[key] - b[key]);
}

// Design choice from the synthetic rider (scratchpad probe): at 12 frames per turn the
// bottom-of-stroke estimate is within about 1 degree on average; below that the error grows fast.
// Not a published number.
export const MIN_FRAMES_PER_STROKE = 12;

// Design choice from the synthetic rider (scratchpad probe): at up to 6 s per turn the pedal step's
// "is the crank turning" check never loses the turning for 3 s, at any pose rate from 3 to 30 a
// second; at 8 s per turn it does, and the app would then nag "Keep pedalling". So the app never
// asks for a turn slower than this. Not a published number.
export const SLOWEST_TURN = 6;

// "Slower, please": how many seconds per turn to ask for, or null when there is nothing sound to
// say. samples: the pedalling samples [{t (s), ankleY}], only frames where the rider was seen. Only
// the last 6 seconds count, so strokes from earlier, faster pedalling do not keep the line going,
// and the pose rate comes from those samples' own times. Null when the rider was not seen in the
// last second, when the pose rate is not a real number or is under 1 a second, when the recent
// strokes already have enough frames each, or when the turn it would ask for is slower than
// SLOWEST_TURN.
export function slowerTurn(samples, now) {
  const rec = (samples || []).filter(s => s.t > now - 6 && s.t <= now);
  if (rec.length < 2 || now - rec[rec.length - 1].t > 1) return null;
  const fps = (rec.length - 1) / (rec[rec.length - 1].t - rec[0].t);
  if (!Number.isFinite(fps) || fps < 1) return null;
  const { bottoms } = strokes(rec);
  if (bottoms.length < 2) return null;
  if (!(median(bottoms.slice(1).map((b, k) => b - bottoms[k])) < MIN_FRAMES_PER_STROKE)) return null;
  const secs = Math.max(2, Math.ceil(MIN_FRAMES_PER_STROKE / fps));
  return Number.isFinite(secs) && secs <= SLOWEST_TURN ? secs : null;
}

export function summarisePedal(samples) {
  const { bottoms } = strokes(samples);
  const gap = (k) => (k >= 1 ? bottoms[k] - bottoms[k - 1] : bottoms.length > 1 ? bottoms[1] - bottoms[0] : Infinity);
  const kept = bottoms.filter((_, k) => gap(k) >= MIN_FRAMES_PER_STROKE);
  const knees = kept.map(i => atBottom(samples, i, 'kneeFlex'));
  const ys = samples.map(s => s.ankleY);
  return {
    strokes: kept.length,
    strokesSeen: bottoms.length,
    framesPerStroke: bottoms.length >= 2 ? median(bottoms.slice(1).map((_, k) => gap(k + 1))) : NaN,
    kneeFlex: median(knees),
    kneeFlexSpread: knees.length > 2 ? quantile(knees, 0.9) - quantile(knees, 0.1) : NaN,
    hipBottom: median(kept.map(i => atBottom(samples, i, 'hip'))),
    // Interpolated to the true bottom like the knee: at 12 frames per turn the lowest frame can sit
    // up to 15 degrees of crank away from it, the same way on every stroke.
    bottomAnkleX: median(kept.map(i => atBottom(samples, i, 'ankleX'))),
    ankleTravel: quantile(ys, 0.95) - quantile(ys, 0.05),
    torso: median(samples.map(s => s.torso)),
    elbow: median(samples.map(s => s.elbow)),
    shoulder: median(samples.map(s => s.shoulder)),
  };
}

// How far the crank was from straight down while the rider held still, in degrees, from the ankle's
// sideways offset against where it sat at the bottom of the pedalling strokes. Half the ankle's
// up-and-down travel stands in for the crank length (raw travel: the smoothed one reads too big).
// NaN when there is no pedalling to compare with.
export function stillCrankAngle(still, pedal) {
  if (![still?.ankleX, pedal?.bottomAnkleX, pedal?.ankleTravel].every(Number.isFinite) || !(pedal.strokes >= 5)) return NaN;
  const r = pedal.ankleTravel / 2;
  if (!(r > 0)) return NaN;
  const x = Math.max(-1, Math.min(1, (still.ankleX - pedal.bottomAnkleX) / r));
  return Math.abs((Math.asin(x) * 180) / Math.PI);
}

// Design choice: on the synthetic rider 10 degrees behind the bottom already reads 3.3 degrees too
// bent. Real feet shift the ankle a little when you stop pedalling, so this is approximate.
export const STILL_CRANK_MAX = 10;

// ── the verdict ────────────────────────────────────────────────────────────────────────────

const round = (v) => Math.round(v);
const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);

// One priority change, in the order a fitter works: saddle height first, then the front end.
//
// Two knee readings feed the saddle verdict. The pedalling one (P) decides: Bini and Hume (2016)
// found the held-still angle differs from pedalling by about 8 degrees, and AI Bike Fit's ranges are
// offset by 5 degrees for the same reason. The held-still one (S) can only stop a change, when it is
// out of range the opposite way. res.verdict is one of:
//   'change'    P out of range, S missing, in range or out the same way: a millimetre change from P.
//   'disagree'  P and S both out of range, opposite ways: no change, film again.
//   'ok'        P in range: no saddle change (res.stillOut when S is out of range).
//   'stillOnly' no usable P: no millimetres from S alone, only whether it looks in range.
//   'none'      neither reading.
export function advise(still, pedal) {
  const pOk = !!pedal && pedal.strokes >= 5 && Number.isFinite(pedal.kneeFlex);
  // A held-still reading taken with the crank off the bottom reads too bent (or too straight), so
  // it is set aside: it cannot block a change or count as out of range.
  const crank = stillCrankAngle(still, pedal);
  const offBottom = crank > STILL_CRANK_MAX;
  const sOk = Number.isFinite(still?.kneeFlex) && !offBottom;
  const P = pOk ? pedal.kneeFlex : NaN, S = sOk ? still.kneeFlex : NaN;
  const pGrade = grade('kneeDynamic', P), sGrade = grade('kneeStatic', S);
  const dir = (g, v, r) => (g === 'green' ? 0 : v > r[1] ? 1 : -1); // +1: too bent, the saddle is low
  const dirP = pOk ? dir(pGrade, P, TARGETS.kneeDynamic) : null;
  const dirS = sOk ? dir(sGrade, S, TARGETS.kneeStatic) : null;
  const verdict = pOk
    ? (dirP === 0 ? 'ok' : sOk && dirS !== 0 && dirS !== dirP ? 'disagree' : 'change')
    : sOk ? 'stillOnly' : 'none';

  const upper = pOk ? pedal : still ?? pedal;
  const res = {
    verdict,
    knee: pOk ? P : S, kneeSource: pOk ? 'pedalling' : sOk ? 'still' : null, kneeGrade: pOk ? pGrade : sGrade,
    staticKnee: still?.kneeFlex, staticGrade: grade('kneeStatic', still?.kneeFlex),
    torso: upper?.torso, torsoGrade: grade('torso', upper?.torso),
    elbow: upper?.elbow, elbowGrade: grade('elbow', upper?.elbow),
    shoulder: upper?.shoulder, shoulderGrade: grade('shoulder', upper?.shoulder),
    hipBottom: pedal?.hipBottom,
    disagree: verdict === 'disagree', stillOut: verdict === 'ok' && dirS != null && dirS !== 0,
    // The phone saw strokes but too few frames of each: the fix is to pedal more slowly.
    tooFast: pedal?.strokesSeen >= 5 && !(pedal.strokes >= 5),
    change: null, overall: 'green', notes: [],
  };
  if (!res.stillOut) delete res.stillOut;
  if (offBottom) res.stillOffBottom = round(crank);

  if (verdict === 'change') {
    const [lo, hi] = TARGETS.kneeDynamic;
    const over = P > hi ? P - hi : lo - P;
    const a = Math.min(15, round(over * 3)), b = Math.min(15, round(over * 4));
    const mm = a === b ? `${a}` : `${a} to ${b}`;
    const raise = P > hi;
    const verb = raise ? 'Raise' : 'Lower';
    res.change = {
      kind: 'saddle', raise, mm: [a, b], capped: over * 4 > 15,
      headline: `${verb} the saddle about ${mm} mm`,
      spoken: `${verb} the saddle about ${mm} millimetres, then film again.`,
      why: (raise
        ? `Your knee is still bent ${round(P)} degrees at the bottom of the stroke. The target is ${lo} to ${hi}, so the saddle is ${pGrade === 'red' ? 'too low' : 'a little low'}.`
        : `Your knee is only bent ${round(P)} degrees at the bottom of the stroke. The target is ${lo} to ${hi}, so the saddle is ${pGrade === 'red' ? 'too high' : 'a little high'}.`)
        + (over * 4 > 15 ? ' 15 millimetres is the most to change in one go.' : ''),
    };
  } else if (verdict === 'ok') {
    // Front end, only once the saddle height is right. A deliberate difference from AI Bike Fit's
    // rule 4 (fit-rules.md), which also counts a closed shoulder (under 80) and bent elbows (over 30)
    // as signs of a long, low front end. Both usually mean the bars are close, not far: the shoulder
    // angle opens as the hands go further forward, and bent elbows mean the bars are in easy reach.
    // So this counts only the tool's own thresholds that do point to a long, low front: a back
    // under 40, a shoulder over 95 and elbows forced straight (under 8).
    const t = round(upper?.torso), sh = round(upper?.shoulder), e = round(upper?.elbow);
    const flags = [];
    if (upper?.torso < 40) flags.push(['torso', `your back is low (${t}°, target 40 to 50)`, 'your back is low']);
    if (upper?.shoulder > 95) flags.push(['shoulder', `your arms reach far forward (shoulder ${sh}°, target 80 to 95)`, 'your arms reach far forward']);
    if (upper?.elbow < 8) flags.push(['elbow', `your elbows are locked straight (${e}°, target 15 to 30)`, 'your elbows are locked straight']);
    if (flags.length >= 2) {
      const cap = (x) => x[0].toUpperCase() + x.slice(1);
      const reason = `${cap(list(flags.map(f => f[1])))}, so the front of the bike is long and low.`;
      res.change = {
        kind: 'bars', flags: flags.map(f => f[0]),
        headline: 'Raise the handlebars',
        spoken: 'Raise the handlebars by moving one spacer from above the stem to below it, then film again.',
        reason, // the why on its own, for the "Reach and bar height" area, whose step says what to do
        why: `${reason} Move one spacer from above the stem to below it. If that is not enough, a shorter stem is the next step.`,
        reasonSpoken: `${cap(list(flags.map(f => f[2])))}, so the front of the bike is long and low.`,
      };
    } else if (upper?.torso > 56) {
      res.notes.push('You sit quite upright. That is comfortable and fine for most riding; only lower the bars if you want a faster position.');
    }
  }

  const graded = [res.kneeGrade, res.torsoGrade, res.elbowGrade, res.shoulderGrade];
  const worst = graded.includes('red') ? 'red' : graded.includes('amber') ? 'amber' : 'green';
  if (verdict === 'none' || graded.every(g => g === 'na')) res.overall = 'na';
  else if (verdict === 'disagree') res.overall = 'amber';
  else if (verdict === 'stillOnly') res.overall = sGrade === 'green' ? 'green' : 'amber';
  else if (res.change?.kind === 'saddle') res.overall = pGrade; // amber or red: the knee decides it
  else if (res.change) res.overall = worst === 'green' ? 'amber' : worst;
  else res.overall = worst === 'green' ? 'green' : 'amber';
  return res;
}

const NAMES = { torso: 'back angle', elbow: 'elbow bend', shoulder: 'shoulder angle' };

// "inside the 30 to 40 target", or, for a reading inside the 2.5 degree tolerance but outside the
// range itself, "within 2.5 degrees of the 30 to 40 target". Never call 41 "inside" 30 to 40.
function inTarget(v, [lo, hi], unit) {
  return v >= lo && v <= hi ? `inside the ${lo} to ${hi} target` : `within 2.5${unit} of the ${lo} to ${hi} target`;
}

// The upper-body angles that are outside their target, by name ("shoulder angle").
function offAngles(r) {
  return ['torso', 'elbow', 'shoulder'].filter(k => !['green', 'na'].includes(r[k + 'Grade'])).map(k => NAMES[k]);
}

// A retest that did not fit what the last change should have done holds the next change back
// (withRetest sets r.held). When the two knee readings disagree, that verdict already says to film
// again, so it speaks for itself.
const heldBack = (r) => !!r.held && (r.verdict === 'change' || r.verdict === 'ok');

// The sentence about the saddle height, for the screen (unit '°') or for speech (' degrees'). The
// results headline and the "Saddle height" area both use it, so the two never say different things.
export function saddleWhy(r, unit = '°') {
  const d = (v) => `${round(v)}${unit}`;
  if (r.change?.kind === 'saddle') return r.change.why;
  if (r.verdict === 'disagree') return `Your two knee readings point different ways: held still ${d(r.staticKnee)}, pedalling ${d(r.knee)}. So I will not suggest a change yet.`;
  if (r.verdict === 'stillOnly') {
    const lead = r.tooFast ? 'You pedalled faster than this phone can measure each stroke.' : 'I could not measure you pedalling.';
    const slow = r.tooFast ? ' more slowly' : '';
    return r.kneeGrade !== 'green'
      ? `${lead} Held still, your knee bends ${d(r.knee)}, outside the 25 to 35 target. Film again and pedal backwards${slow}, then I can tell you how much to change.`
      : `Held still, your knee bends ${d(r.knee)}, ${inTarget(r.knee, TARGETS.kneeStatic, unit)}. Film again and pedal backwards${slow} to be sure.`;
  }
  if (r.verdict === 'ok') return `Your saddle height looks right: your knee bends ${d(r.knee)} at the bottom, ${inTarget(r.knee, TARGETS.kneeDynamic, unit)}.`;
  // Out of range, but a retest held the change back (withRetest).
  if (r.verdict === 'change') return `Your knee bends ${d(r.knee)} at the bottom of the stroke, outside the ${TARGETS.kneeDynamic[0]} to ${TARGETS.kneeDynamic[1]} target.`;
  return r.tooFast ? 'You pedalled faster than this phone can measure each stroke. Film again and pedal more slowly.'
    : 'Film again, and keep the whole bike and your whole body in the picture.';
}

// The headline and the reason under it, for the screen (unit '°') or for speech (' degrees').
export function headline(r, unit = '°') {
  if (heldBack(r)) {
    return { what: 'Film once more', why: `${saddleWhy(r, unit)} I will not suggest another change until one more film shows what the last one did.` };
  }
  if (r.change) return { what: r.change.headline, why: r.change.why };
  if (r.verdict === 'disagree') return { what: 'Film again', why: saddleWhy(r, unit) };
  if (r.verdict === 'stillOnly') {
    return { what: r.kneeGrade !== 'green' ? 'Film again before you move the saddle' : 'Saddle height looks right, held still', why: saddleWhy(r, unit) };
  }
  if (r.verdict === 'ok') {
    const off = offAngles(r);
    return { what: 'Nothing to change today',
      why: saddleWhy(r, unit)
        + (off.length ? ` Your ${list(off)} ${off.length > 1 ? 'are' : 'is'} outside the target. On its own that is no reason to change anything.` : '') };
  }
  return { what: 'Not enough to measure', why: saddleWhy(r, unit) };
}

// The words the app says at the end. Short sentences: they are spoken across a room, so the action
// comes first and nothing sends the rider to the screen. opts.pain: the rider said on the home
// screen that riding gives them pain or numbness (fit-rules.md, Reporting honesty: recommend a
// professional fitter for persistent pain or numbness). It is said first, before anything else.
export function spokenSummary(r, { pain = false } = {}) {
  const out = [];
  const c = r.change;
  if (pain) out.push(PAIN_SPOKEN);
  if (r.retest) out.push(r.retest.spoken);
  if (heldBack(r)) {
    out.push(headline(r, ' degrees').why);
  } else if (c?.kind === 'saddle') {
    const [lo, hi] = TARGETS.kneeDynamic;
    const mm = c.mm[0] === c.mm[1] ? `${c.mm[0]}` : `${c.mm[0]} to ${c.mm[1]}`;
    const how = r.kneeGrade === 'red' ? 'too' : 'a little';
    out.push(`One change: ${c.raise ? 'raise' : 'lower'} the saddle about ${mm} millimetres.`);
    out.push(`Your knee bends ${round(r.knee)} degrees at the bottom of the stroke, and the target is ${lo} to ${hi}, so the saddle is ${how} ${c.raise ? 'low' : 'high'}.`);
    if (c.capped) out.push('15 millimetres is the most to change in one go.');
    out.push('Leave everything else for now; moving the saddle changes it too. When you have moved it, tap Film again.');
  } else if (c?.kind === 'bars') {
    out.push('One change: raise the handlebars. Move one spacer from above the stem to below it.');
    out.push(c.reasonSpoken || c.why);
    out.push('When you have done it, tap Film again.');
  } else if (r.verdict === 'ok') {
    const [lo, hi] = TARGETS.kneeDynamic;
    out.push(`Your saddle height is right. Your knee bends ${round(r.knee)} degrees at the bottom, ${inTarget(r.knee, [lo, hi], ' degrees')}.`);
    if (r.stillOut) out.push('Your held-still reading was outside its range. Film once more to be sure.');
    const ok = ['torso', 'elbow', 'shoulder'].filter(k => r[k + 'Grade'] === 'green').map(k => NAMES[k]);
    const off = offAngles(r);
    if (ok.length) out.push(`Your ${list(ok)} ${ok.length > 1 ? 'look' : 'looks'} good.`);
    if (off.length) out.push(`Your ${list(off)} ${off.length > 1 ? 'are' : 'is'} outside the target. On its own that is no reason to change anything.`);
    out.push('Nothing to change today.');
  } else if (r.verdict === 'disagree') {
    out.push('Your two knee readings point different ways, so no change yet. Film again.');
  } else {
    out.push(headline(r, ' degrees').why);
  }
  out.push(...(r.notes || []));
  return out.join(' ');
}

// ── compared with last time ──────────────────────────────────────────────────────────────────
// Design choice, from the plus or minus 2-3 degree per-reading tolerance in
// bikefit-research-ranges.md. Not a published number.
export const SAME_TOL = 3;

// "About the same as last time (45°)", "Up 6° since 3 Oct", "Down 4° since 3 Oct", or '' when
// either number is missing. A difference smaller than SAME_TOL is inside the camera's error.
export function compareLast(now, was, label) {
  if (!Number.isFinite(now) || !Number.isFinite(was)) return '';
  const d = Math.round(now) - Math.round(was);
  if (Math.abs(d) < SAME_TOL) return `About the same as last time (${Math.round(was)}°)`;
  return d > 0 ? `Up ${d}° since ${label}` : `Down ${-d}° since ${label}`;
}

// ── the retest: did the change you made do what it should? ───────────────────────────────────
// fit-rules.md rule 2: about 1 degree of knee bend per 3 to 4 mm of saddle height, and "change one
// thing, then re-film". The effect of one change is small (a 10 mm raise is about 2.5 to 3.3
// degrees, inside one reading's error), so the app says what to expect instead of showing a bare
// before and after. There is no retest interval and no "ride it N times first": neither has a source.

// [least, most] degrees of knee bend a saddle change of mm should move.
export function expectedKneeChange(mm) {
  return [mm / 4, mm / 3];
}

// The change marked "I made this change" on the results screen, as stored in history. raise and
// drop are +1 and -1; the millimetres are whole numbers from 1 to 15, the most per change (rule 2).
export function madeChange(change, mm, at) {
  if (change?.kind === 'saddle') {
    const n = Math.round(Number(mm));
    return { kind: 'saddle', dir: change.raise ? 1 : -1, mm: Number.isFinite(n) && n >= 1 ? Math.min(15, n) : change.mm[0], at };
  }
  if (change?.kind === 'bars') return { kind: 'bars', at };
  return null;
}

// The session whose marked change is still waiting to be checked, newest first. Sessions with no
// pedalling reading are passed over, because they cannot say what a saddle change did; the first
// session with a pedalling reading and no change of its own means the change has been checked.
// One exception: a session whose retest held the next change back (saved with held: true) told the
// rider "film once more", so the change stays waiting for that one more film. Only one such session
// is passed over; the entry comes back with recheck: true, and judgeChange then never holds back
// again, so the app cannot ask for "once more" for ever.
export function pendingChange(history) {
  let passed = false;
  for (const s of history || []) {
    if (s?.made) return passed ? { ...s, recheck: true } : s;
    if (s?.held && !passed) { passed = true; continue; }
    if (s?.src === 'pedalling' && Number.isFinite(s.knee)) return null;
  }
  return null;
}

// Compares this session's knee reading with the one before a saddle change.
// prev: a history entry { made: { kind, dir, mm }, knee, src }. now: { knee, src }.
// Returns null when there is nothing fair to compare, or { verdict, text, spoken, ... } where
// verdict is 'consistent' (inside what the change should do, give or take one reading's error, the
// same SAME_TOL above and below), 'other-way', 'too-little' or 'too-much'. prev.recheck (from
// pendingChange): this is the second film after the change, so a reading that still does not fit
// is taken as it is (recheck: true in the result, and withRetest does not hold back again).
export function judgeChange(prev, now) {
  const m = prev?.made;
  if (m?.kind !== 'saddle' || !prev.src || prev.src !== now?.src || !Number.isFinite(prev.knee) || !Number.isFinite(now.knee)) return null;
  if (!(m.dir === 1 || m.dir === -1) || !(m.mm > 0)) return null;
  const delta = now.knee - prev.knee;
  const moved = -m.dir * delta; // positive: the expected way (raising the saddle takes knee bend off)
  const [lo, hi] = expectedKneeChange(m.mm);
  const verdict = moved < -SAME_TOL ? 'other-way' : moved < lo - SAME_TOL ? 'too-little' : moved > hi + SAME_TOL ? 'too-much' : 'consistent';
  const recheck = !!prev.recheck;
  const inRange = grade(now.src === 'pedalling' ? 'kneeDynamic' : 'kneeStatic', now.knee) === 'green';
  const by = (unit) => (round(hi) < 1 ? `less than 1${unit}` : round(lo) === round(hi) ? `about ${round(lo)}${unit}` : `about ${round(lo)} to ${round(hi)}${unit}`);
  const end = verdict === 'consistent'
    ? (inRange ? [' In range now, so leave it.'] : [' That fits. The next step is below.', ' That fits. Here is the next step.'])
    : recheck
      // The second film that does not fit: going by this reading is the only way forward.
      ? (inRange ? [' That still does not fit the change, but you are in range now, so leave it.']
        : [' That still does not fit the change, so I go by this reading. The next step is below.', ' That still does not fit the change, so I go by this reading. Here is the next step.'])
      : {
        'other-way': [' It moved the other way. Check the saddle really moved, then film once more before you change anything else.'],
        'too-little': [' That is less than the change should do. Check the saddle really moved, then film once more.'],
        'too-much': [' That is more than the change should do. Film once more to check.'],
      }[verdict];
  const verb = m.dir > 0 ? 'raise' : 'drop';
  return {
    verdict, before: prev.knee, now: now.knee, mm: m.mm, dir: m.dir, inRange, recheck,
    text: `Knee bend ${round(prev.knee)}° before, ${round(now.knee)}° now. A ${m.mm} mm ${verb} should change it by ${by('°')}.` + end[0],
    spoken: `Knee bend ${round(prev.knee)} degrees before, ${round(now.knee)} degrees now. A ${m.mm} millimetre ${verb} should change it by ${by(' degrees')}.` + (end[1] ?? end[0]),
  };
}

// The result with the retest folded in. A retest that does not fit what the change should have done
// holds the next change back (held: true, stored in history so the next film is compared with the
// reading before the change): piling a second change on a first one that has not shown up yet is
// what "one change at a time" rules out. On the second film after the change (judged.recheck) the
// reading stands, whatever it shows.
export function withRetest(r, judged) {
  if (!judged) return r;
  if (judged.verdict === 'consistent' || judged.recheck) return { ...r, retest: judged };
  return { ...r, retest: judged, change: null, overall: 'amber', held: true };
}

// The home screen card that asks for the retest. label: the day the change was made ("10 Oct").
export function retestPrompt(made, label) {
  const tail = 'Film again to see what it did. About 3 minutes. Tap Start below.';
  if (made?.kind === 'saddle') return `On ${label} you ${made.dir > 0 ? 'raised' : 'lowered'} the saddle ${made.mm} mm. ${tail}`;
  if (made?.kind === 'bars') return `On ${label} you raised the handlebars. ${tail}`;
  return '';
}

// ── pain or numbness ─────────────────────────────────────────────────────────────────────────
// fit-rules.md, Reporting honesty: recommend a professional fitter for persistent pain or numbness.
// The answer is asked on the home screen and never stored. It does not change the advice, and
// nothing maps where it hurts to a fix: the evidence does not support that mapping.
const PAIN_SPOKEN = 'You said you get pain or numbness, so please see a professional bike fitter. What I tell you next is only a starting point.';
export function painNote(r) {
  return `You said you get pain or numbness. Please see a professional bike fitter. ${r?.change ? 'The change below is only a starting point.' : 'These results are only a starting point.'}`;
}

// ── the result list, one row per measurement ─────────────────────────────────────────────────
// Statuses in the style of Apple's movement evaluations, with one difference on purpose: there is
// no "Excellent". A phone camera cannot tell the middle of a range from its edge, so a grade finer
// than "in range" would be made-up precision.
export const STATUS = { green: 'Good', amber: 'Borderline', red: 'Needs attention', info: 'For reference', after: 'After the saddle', na: 'No reading' };

// Each row: { key, name, value, target, grade, status, why, step }. Exactly one step per row.
export function measures(r, pedal) {
  const deg = (v) => `${round(v)}°`;
  // 'na' for a missing reading, so it is never described as a number or as in range.
  const side = (v, [lo, hi]) => (!Number.isFinite(v) ? 'na' : v > hi + GREEN_TOL ? 'high' : v < lo - GREEN_TOL ? 'low' : 'in');
  const NOT_MEASURED = 'Not measured this time.';
  const FILM_WHOLE = 'Film again, with your whole body and bike in the picture.';
  // In range, said honestly: a reading inside the 2.5 degree tolerance but outside the range itself
  // is not "inside the target".
  const inWhy = (phrase, v, [lo, hi]) => (v >= lo && v <= hi ? `${phrase}, inside the target.`
    : `${phrase}, within 2.5° of the ${lo} to ${hi} target. A phone camera cannot tell that apart, so it counts as in range.`);
  const bars = r.change?.kind === 'bars';
  const saddleFirst = r.change?.kind === 'saddle';
  // One change at a time, saddle first: raising or lowering it also changes the reach.
  const upperStep = (key, fallback) => (bars && r.change.flags?.includes(key) ? 'Part of the main change: raise the handlebars.'
    : saddleFirst ? 'Change the saddle first, then film again: the saddle height changes this too.' : fallback);
  // With a saddle change, the upper-body rows wait for it rather than wearing a red pill of their own.
  const upperGrade = (g) => (saddleFirst ? 'after' : g);
  const row = (key, name, value, target, grade, why, step) =>
    ({ key, name, value, target, grade: Number.isFinite(value) ? grade : 'na', status: STATUS[Number.isFinite(value) ? grade : 'na'], why, step });
  const rows = [];

  const kp = pedal?.strokes >= 5 ? pedal.kneeFlex : NaN;
  const sp = side(kp, TARGETS.kneeDynamic);
  {
    const tooFast = pedal?.strokesSeen >= 5 && !(pedal.strokes >= 5);
    rows.push(row('kneePedal', 'Knee bend at the bottom, pedalling backwards', kp, 'Target 30 to 40', grade('kneeDynamic', kp),
      tooFast ? 'You pedalled faster than this phone can measure each stroke.'
        : !Number.isFinite(kp) ? 'There were not enough pedal strokes to measure.'
        : sp === 'in' ? inWhy(`Bent ${deg(kp)} at the bottom of each stroke`, kp, TARGETS.kneeDynamic)
        : sp === 'high' ? `Still bent ${deg(kp)} at the bottom, more than the target, so the saddle is probably low.`
        : `Only bent ${deg(kp)} at the bottom, less than the target, so the saddle is probably high.`,
      tooFast ? 'Film again and pedal more slowly.'
        : !Number.isFinite(kp) ? 'Film again and pedal backwards for the full 20 seconds.'
        : saddleFirst ? `${r.change.headline}.` : sp === 'in' ? 'Leave the saddle height as it is.' : 'Film again to confirm before you change anything.'));
  }
  {
    const off = Number.isFinite(r.stillOffBottom);
    const v = off ? NaN : r.staticKnee, s = side(v, TARGETS.kneeStatic);
    rows.push(row('kneeStill', 'Knee bend at the bottom, held still', v, 'Target 25 to 35', grade('kneeStatic', v),
      off ? `The pedal was about ${r.stillOffBottom}° from the bottom when you held still, so I did not use this reading.`
        : !Number.isFinite(v) ? 'The still part was not measured.'
        : s === 'in' ? inWhy(`Bent ${deg(v)} with the pedal held at the bottom`, v, TARGETS.kneeStatic)
        : `Bent ${deg(v)} with the pedal held at the bottom, ${s === 'high' ? 'more' : 'less'} than the target.`,
      off ? 'Next time, hold the crank pointing straight down.'
        : !Number.isFinite(v) ? 'Next time, hold the pedal at the bottom until you hear "got it".'
        : r.disagree ? 'Film again: this and the pedalling reading point different ways.'
        : r.stillOut ? 'Film once more to be sure. The pedalling reading counts for more.'
        : r.verdict === 'stillOnly' ? (s === 'in' ? 'Film again and pedal backwards to be sure.' : 'Film again and pedal backwards before you move the saddle.')
        : s === sp ? 'Nothing extra to do: it agrees with the pedalling reading.'
        : 'Nothing extra to do: the pedalling reading counts for more.'));
  }
  {
    const v = r.torso, s = side(v, TARGETS.torso);
    rows.push(row('torso', 'Back angle, from horizontal', v, 'Target 40 to 50', upperGrade(grade('torso', v)),
      s === 'na' ? NOT_MEASURED : s === 'in' ? inWhy(`Your back is ${deg(v)} above horizontal`, v, TARGETS.torso)
        : s === 'low' ? `Your back is ${deg(v)} above horizontal: a long, low position.` : `Your back is ${deg(v)} above horizontal: quite upright.`,
      s === 'na' ? FILM_WHOLE : s === 'in' ? 'No change needed.' : upperStep('torso', s === 'low' ? 'If your back or neck aches, raise the bars a little.'
        : 'Fine for most riding. Lower the bars only if you want a faster position.')));
  }
  {
    const v = r.elbow, s = side(v, TARGETS.elbow);
    rows.push(row('elbow', 'Elbow bend', v, 'Target 15 to 30', upperGrade(grade('elbow', v)),
      s === 'na' ? NOT_MEASURED : s === 'in' ? inWhy(`Bent ${deg(v)}`, v, TARGETS.elbow) : s === 'low' ? `Only bent ${deg(v)}: your arms are close to straight.` : `Bent ${deg(v)}, more than the target.`,
      s === 'na' ? FILM_WHOLE : s === 'in' ? 'No change needed.' : upperStep('elbow', s === 'low' ? 'Ride with soft elbows. If you cannot, the bars may be too far away.'
        : 'No change needed on its own.')));
  }
  {
    const v = r.shoulder, s = side(v, TARGETS.shoulder);
    rows.push(row('shoulder', 'Shoulder angle, torso to arm', v, 'Target 80 to 95', upperGrade(grade('shoulder', v)),
      s === 'na' ? NOT_MEASURED : s === 'in' ? inWhy(`${deg(v)} between your torso and upper arm`, v, TARGETS.shoulder)
        : s === 'low' ? `${deg(v)} between your torso and upper arm: a closed position, with more weight on your hands.`
        : `${deg(v)} between your torso and upper arm: your arms reach far forward.`,
      s === 'na' ? FILM_WHOLE : s === 'in' ? 'No change needed.' : upperStep('shoulder', s === 'low' ? 'No change on its own. If you feel cramped on the bike, a bike fitter can check your stem length.'
        : 'If you feel stretched, a shorter stem is the usual fix.')));
  }
  // A new key on purpose: old sessions measured the hip at the top of the stroke, and those
  // numbers are never compared with this one.
  const hipSeen = Number.isFinite(r.hipBottom);
  rows.push(row('hipBottom', 'Hip angle at the bottom of the stroke', r.hipBottom, 'Usually 85 to 110', 'info',
    hipSeen ? `${deg(r.hipBottom)} at the bottom of the stroke. It depends a lot on how flexible you are.`
      : `${NOT_MEASURED} It is only measured while you pedal backwards.`,
    hipSeen ? 'Nothing to do. It is here so you can compare next time.' : 'Nothing to do.'));
  return rows;
}

// ── results by area ──────────────────────────────────────────────────────────────────────────
// Apple's movement evaluations rate each area once, with why you got it and one step. Here there
// are two areas you can act on, plus the extra numbers. fit-rules.md rule 4 reads the back, shoulder
// and elbow together because they share one cause, so they are graded as one area, not three.
// rows: the output of measures(). Each area: { key, name, grade, status, why, step, rows }.
export function areas(r, rows) {
  const by = Object.fromEntries((rows || []).map(x => [x.key, x]));
  const pick = (...ks) => ks.map(k => by[k]).filter(Boolean);
  const area = (key, name, grade, why, step, rs) => ({ key, name, grade, status: STATUS[grade], why, step, rows: rs });
  const held = heldBack(r);

  // Saddle height: the pedalling reading decides, the held-still one can only hold a change back.
  const sGrade = r.verdict === 'none' ? 'na' : r.verdict === 'disagree' ? 'amber'
    : r.verdict === 'stillOnly' ? (r.kneeGrade === 'red' ? 'amber' : r.kneeGrade) // no millimetres from it alone
    : r.kneeGrade;
  const sStep = r.change?.kind === 'saddle' ? `${r.change.headline}.`
    : held ? 'Film once more before you change anything.'
    : r.verdict === 'disagree' ? 'Film again: your two knee readings point different ways.'
    : r.tooFast && (r.verdict === 'stillOnly' || r.verdict === 'none') ? 'Film again and pedal backwards more slowly.'
    : r.verdict === 'stillOnly' ? 'Film again and pedal backwards for the full 20 seconds.'
    : r.verdict === 'none' ? 'Film again, with your whole body and bike in the picture.'
    : 'Leave the saddle height as it is.';
  const saddle = area('saddle', 'Saddle height', sGrade, saddleWhy(r), sStep, pick('kneePedal', 'kneeStill'));

  // Reach and bar height.
  const U = ['torso', 'elbow', 'shoulder'];
  const g = Object.fromEntries(U.map(k => [k, r[k + 'Grade']]));
  const seen = U.filter(k => g[k] !== 'na');
  const off = offAngles(r);
  const urows = pick('torso', 'elbow', 'shoulder');
  let reach;
  if (r.change?.kind === 'saddle' || r.verdict === 'change') {
    // Also when a retest held a saddle change back: the saddle is still not right.
    reach = area('reach', 'Reach and bar height', 'after', 'Moving the saddle changes your reach too, so this waits until the saddle is right.', 'Nothing to do yet.', urows);
  } else if (r.change?.kind === 'bars') {
    reach = area('reach', 'Reach and bar height', 'red', r.change.reason || r.change.why, 'Raise the handlebars: move one spacer from above the stem to below it.', urows);
  } else if (!seen.length) {
    reach = area('reach', 'Reach and bar height', 'na', 'I could not measure your back, elbow and shoulder this time.', 'Film again, with your whole body and bike in the picture.', urows);
  } else if (!off.length) {
    const inside = seen.every(k => { const [lo, hi] = TARGETS[k]; return r[k] >= lo && r[k] <= hi; });
    const who = seen.length === 3 ? 'back, elbow and shoulder angles are' : `${list(seen.map(k => NAMES[k]))} ${seen.length > 1 ? 'are' : 'is'}`;
    // Honest wording: within 2.5 degrees of a target counts as in range, but is not "inside" it.
    reach = area('reach', 'Reach and bar height', 'green',
      inside ? `Your ${who} all inside their targets.`.replace(' is all inside their targets', ' is inside its target')
        : `Your ${who} all in range, each inside its target or within 2.5° of it.`.replace(' is all in range, each', ' is in range,'),
      'No change needed.', urows);
  } else {
    // Borderline, not Needs attention, for angles outside their range without a bars change. A design
    // choice: fit-rules.md rule 4 needs two signs before a change, and a red pill with "nothing to
    // change" under it would pull against one change at a time.
    reach = area('reach', 'Reach and bar height', 'amber',
      `Your ${list(off)} ${off.length > 1 ? 'are outside their targets' : 'is outside its target'}. The handlebars only need to move when two signs point the same way.`,
      'Nothing to change on its own. Compare it next time.', urows);
  }

  const more = area('more', 'More numbers', 'info', 'Extra angles for reference. They do not change the advice.',
    'Nothing to do. They are here so you can compare next time.', pick('hipBottom'));
  return [saddle, reach, more];
}
