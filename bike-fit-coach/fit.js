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
  const face = facing(lm);
  return {
    kneeFlex: 180 - interior(hp, kn, an),
    // The thigh's angle from straight down, positive when the knee is ahead of the hip in the
    // direction the rider faces (in the picture, y points down). Used to tell a rider from a
    // person standing beside the bike (isSeated).
    thighFwd: (Math.atan2((kn[0] - hp[0]) * face, kn[1] - hp[1]) * 180) / Math.PI,
    face,
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

// Riding position rather than standing: the torso leans forward and the hands reach ahead. Above
// 20 degrees, with 0.01 for the rounding of the pixel maths, so it meets isAero at 20 with no overlap.
export function isRiding(a) {
  return a.torso > 20.01 && a.torso < 72 && a.kneeFlex > 10;
}

// Very low over the front, like a rider on time trial or triathlon aero bars: seated (the thigh
// reaches forward, as in isSeated) and the knee bent, but the back at 20 degrees or less from
// horizontal, so isRiding never accepts it. This app checks road bikes only (fit-rules.md rule 5:
// a TT setup must not be graded against road numbers), so such a pose is named, never measured.
// 20 counts as aero (0.01 for rounding, as in isRiding).
export function isAero(a) {
  return a.vis > 0.5 && a.kneeFlex > 10 && a.thighFwd >= SEATED_THIGH && a.torso <= 20.01;
}

// ── who is the rider ─────────────────────────────────────────────────────────────────────────
// With a friend holding the bike, or anyone else in the room, the pose model can see two people
// (app.js asks it for up to 2). Measuring the wrong one gives numbers that are simply wrong, so the
// rider is picked by posture and then followed from frame to frame, and a frame where the choice is
// not clear is not measured at all.

// Design choice: on the bike the thigh reaches forward of straight down. At the bottom of the
// stroke, where the hip is most open, AI Bike Fit's ranges (back 40 to 50 from horizontal, hip angle
// 85 to 110) put it 20 to 55 degrees forward (thigh = back + 90 - hip), and more everywhere else in
// the stroke. A person standing has the thigh about straight down. 15 sits between the two. It is
// asked only to lock on to a rider and to break a tie (pickRider); a rider already followed needs
// only isRiding, so an unusually open hip at the bottom of the stroke never loses a reading.
export const SEATED_THIGH = 15;
export function isSeated(a) {
  return isRiding(a) && a.thighFwd >= SEATED_THIGH;
}

const BODY = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
const pxOf = (p, W, H) => [p.x * W, p.y * H];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Torso length in pixels, the longer side: the size every distance below is measured in.
function bodyScale(lm, W, H) {
  return Math.max(...['L', 'R'].map(s => dist(pxOf(lm[LM.shoulder[s]], W, H), pxOf(lm[LM.hip[s]], W, H))));
}
// The middle of the two hips (or shoulders), which overlap side-on: the hips are where the rider
// sits on the saddle.
function midPx(lm, j, W, H) {
  const a = pxOf(lm[LM[j].L], W, H), b = pxOf(lm[LM[j].R], W, H);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// Someone the phone sees clearly: at least 8 of the 12 main body points (both arms and legs) inside
// the picture with a visibility of at least 0.5. Design choices: 0.5 is the confidence the app
// already asks of the pose model, and 8 of 12 is most of a body, so a friend mostly hidden behind
// the rider, as asked, does not count.
export function clearlyVisible(lm) {
  if (!lm) return false;
  let n = 0;
  for (const j of BODY) for (const s of ['L', 'R']) {
    const p = lm[LM[j][s]];
    if ((p.visibility ?? 0) >= 0.5 && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) n++;
  }
  return n >= 8;
}

// Mean distance in pixels between the 12 main body points (both arms and legs) of two poses.
export function poseDistance(a, b, W, H) {
  let d = 0;
  for (const j of BODY) for (const k of ['L', 'R']) d += dist(pxOf(a[LM[j][k]], W, H), pxOf(b[LM[j][k]], W, H));
  return d / 12;
}

// The same body found twice: on average its 12 main points within 0.15 of a torso length of each
// other (a design choice). Two different people never stand that exactly in one another's pose.
export function samePerson(a, b, W, H) {
  const s = Math.max(bodyScale(a, W, H), bodyScale(b, W, H)) || 1;
  return poseDistance(a, b, W, H) < 0.15 * s;
}

// Design choices. The rider's hip sits on the saddle and the hands stay on the bars, so from one
// frame to the next the hips and shoulders move far less than half a torso length, even rocking on
// rollers. Someone standing beside or behind the bike, even right at the rider's hip, has their
// shoulders well above and behind the rider's, who leans forward to the bars. The rider followed is
// let go after 1 s without being found there, and then found afresh.
export const TRACK_GATE = 0.5;
export const TRACK_KEEP = 1;
export const NEAR_KEEP = 2; // s, a design choice
// Design choice: when two poses could each be the rider, the one whose 12 main points are nearer the
// rider's last ones wins only when the other is at least this many times as far. On the synthetic
// people a helper braced at the rider's hip was always at least 4.8 times as far as the rider
// (scratchpad probe-tiebreak.mjs, 5 to 30 poses a second), so 1.5 leaves room for real pose noise.
export const TIE_RATIO = 1.5;
// Design choice, from the synthetic people (scratchpad fixR3b/dist.mjs): the rider's 12 main points
// stay within 0.21 of a torso length of an earlier pose of his at any two pedal positions, and within
// 0.245 sitting 20 to 35 mm off where he sat. Of 5058 helper shapes in riding posture inside
// TRACK_GATE (braced, leaning in at the hip, a hand on the saddle, the stem or the hoods), the nearest
// came within 0.279 of some pose of his: leaning in at the hip with the camera-side hand on the hoods,
// where his hand is. An earlier sweep without that hand had every helper at least 0.43 away, and the
// gate at 0.33. 0.25 sits between. Used where a wrong pick is the risk: a lone pose at the rider's
// spot, which may be someone else in a frame where the pose model missed the rider, and finding the
// rider again after losing him.
export const RELOCK_GATE = 0.25;
// Design choice, from the same synthetic people (QA round 3b, scratchpad qaR3-2/gate.mjs): helpers
// leaning in at the hip with BOTH hands on the hoods come within 0.235 to 0.265 of the rider's pose,
// inside RELOCK_GATE, and none of them sits like a rider (isSeated); the one helper shape that does sit
// like a rider stays at 0.269 or more. The rider's own pose with a glitched straight thigh (not seated)
// is 0.17 from his last one. So a lone pose that does not sit like a rider is taken only within 0.20.
export const UNSEATED_GATE = 0.2;

// Everyone in one frame, once each (samePerson), with what pickRider needs to know about them.
function people(poses, W, H, side) {
  const out = [];
  (poses || []).forEach((lm, index) => {
    if (!lm || lm.length < 33 || out.some(p => samePerson(p.lm, lm, W, H))) return;
    const a = frameAngles(lm, side || nearSide([lm]), W, H);
    const ok = a.vis > 0.5;
    out.push({ lm, index, riding: ok && isRiding(a), seated: ok && isSeated(a), aero: isAero(a), hip: midPx(lm, 'hip', W, H), sho: midPx(lm, 'shoulder', W, H), scale: bodyScale(lm, W, H) });
  });
  return out;
}

// A track that follows lm from time t: what pickRider keeps between frames. The app starts one from
// the identity check (pedalledCandidate) when it knows which pose is the rider.
export function trackFrom(lm, t, W, H, nearT = null) {
  return { lm, hip: midPx(lm, 'hip', W, H), sho: midPx(lm, 'shoulder', W, H), scale: bodyScale(lm, W, H), t, nearT };
}

// Two or more poses in riding posture inside the gate. The one that sits like a rider wins, as
// before, unless another is clearly (TIE_RATIO) nearer the rider's last landmarks: a design choice,
// so a rider whose thigh hangs unusually straight for a frame is not swapped for a helper who
// crouches with bent knees. Otherwise the nearest wins when it is clear, and nobody when it is not.
function tieBreak(near, live, W, H) {
  const seated = near.filter(p => p.seated);
  if (!live.lm) return seated.length === 1 ? { pick: seated[0], ambiguous: false } : { pick: null, ambiguous: true };
  const by = near.map(p => [poseDistance(p.lm, live.lm, W, H), p]).sort((a, b) => a[0] - b[0]);
  const clear = by[1][0] >= TIE_RATIO * by[0][0];
  if (seated.length === 1 && !(clear && by[0][1] !== seated[0])) return { pick: seated[0], ambiguous: false };
  if (clear) return { pick: by[0][1], ambiguous: false };
  return { pick: null, ambiguous: true };
}

/**
 * Which of the poses in one frame is the rider. poses: MediaPipe's landmark lists, in any order (the
 * order can change from frame to frame). track: the previous call's .track (null at first). t:
 * seconds. side: the camera-side leg once the app has locked it ('L' or 'R'), or null to judge each
 * pose on the side it shows best. opts.lock: how a rider may be found when none is being followed:
 *   'any'   exactly one pose in the picture sits like a rider (isSeated): the default.
 *   'alone' the same, and nobody else is in the picture at all.
 *   'near'  a pose that sits like a rider within RELOCK_GATE of the rider's last landmarks (the track
 *           kept after it went stale), and clearly (TIE_RATIO) nearer than any other: for a rider who
 *           went out of view while someone who could look like him is about.
 *   'none'  never: the app is still finding out who the rider is (followCandidates).
 * Returns { lm, index, ambiguous, others, count, aero, seatedOthers, track }:
 *   lm, index: the rider's landmarks and their place in poses, or null when nobody is the rider or
 *   the choice is not clear. ambiguous: two poses could each be the rider, so this frame must not
 *   be measured. others: how many other people the phone sees clearly (clearlyVisible). count: how
 *   many people it found at all. aero: how many of them sit very low, like on aero bars (isAero).
 *   seatedOthers: how many people other than the one picked sit like a rider (isSeated).
 * Once locked, the rider is the pose in riding posture (isRiding) whose hips and shoulders are each
 * within TRACK_GATE of the last ones, so the choice cannot jump to someone else mid-stroke. Two such
 * poses there: tieBreak. One alone there: taken only if it is within RELOCK_GATE of the rider's last
 * landmarks (UNSEATED_GATE when it does not sit like a rider), since it could be someone else in a
 * frame where the pose model missed the rider; if someone else was right at the rider's hip in the
 * last NEAR_KEEP seconds, that frame is ambiguous.
 */
export function pickRider(poses, track, t, W, H, side = null, { lock = 'any' } = {}) {
  const ps = people(poses, W, H, side);
  const live = track && t - track.t <= TRACK_KEEP ? track : null;
  let pick = null, ambiguous = false;
  if (live) {
    const gate = TRACK_GATE * live.scale;
    const near = ps.filter(p => p.riding && dist(p.hip, live.hip) <= gate && dist(p.sho, live.sho) <= gate);
    const crowded = live.nearT != null && t - live.nearT <= NEAR_KEEP;
    if (near.length > 1) ({ pick, ambiguous } = tieBreak(near, live, W, H));
    else if (near.length === 1) {
      // One pose there: taken only if it is close to the rider's last pose, whoever was about. A helper
      // who comes to the rider's hip on a frame where the pose model misses the rider is the only pose
      // there, and nobody was at the hip before; taken then, they were followed from the next frame on.
      // Not taken, it is not called a choice between two (ambiguous) unless someone else was just there.
      // A pose that does not sit like a rider (isSeated) must be closer still (UNSEATED_GATE): a friend
      // leaning in with both hands on the hoods comes within RELOCK_GATE of his pose, but never sits.
      const p = near[0];
      const ok = live.lm ? poseDistance(p.lm, live.lm, W, H) <= (p.seated ? RELOCK_GATE : UNSEATED_GATE) * live.scale : !crowded || p.seated;
      if (ok) pick = p; else if (crowded) ambiguous = true;
    }
  } else if (lock === 'any' || lock === 'alone') {
    const seated = ps.filter(p => p.seated);
    if (seated.length > 1) ambiguous = true;
    else if (seated.length === 1 && (lock === 'any' || ps.length === 1)) pick = seated[0];
  } else if (lock === 'near' && track?.lm) {
    const c = ps.filter(p => p.seated).map(p => [poseDistance(p.lm, track.lm, W, H), p]).sort((a, b) => a[0] - b[0]);
    const close = c.length && c[0][0] <= RELOCK_GATE * track.scale;
    if (close && (c.length === 1 || c[1][0] >= TIE_RATIO * c[0][0])) pick = c[0][1];
    else if (close) ambiguous = true;
  }
  const others = ps.filter(p => p !== pick && clearlyVisible(p.lm)).length;
  // nearT: the last time someone other than the rider stood within the gate of the rider's hip.
  const ref = pick || live;
  const nearNow = !!ref && ps.some(p => p !== pick && dist(p.hip, ref.hip) <= TRACK_GATE * ref.scale);
  const nearT = nearNow ? t : live?.nearT ?? null;
  return {
    lm: pick?.lm ?? null, index: pick?.index ?? null, ambiguous, others, count: ps.length, aero: ps.filter(p => p.aero).length,
    seatedOthers: ps.filter(p => p !== pick && p.seated).length,
    // A frame without a clear rider keeps the old track until it is TRACK_KEEP old; after that the
    // track is kept as it was (stale), so lock 'near' can still compare with the rider's last pose.
    track: pick ? trackFrom(pick.lm, t, W, H, nearT) : live ? { ...live, nearT } : track || null,
  };
}

// ── finding out who the rider is ──────────────────────────────────────────────────────────────
// A helper who crouches with bent knees can sit like a rider (isSeated), and if they are in view
// first, or braced at the rider's hip, posture cannot tell the two apart. Who turns the pedals can:
// the app asks the rider for two slow turns, and the pose whose ankle goes round is the rider. Up to
// MAX_CANDIDATES poses that sit like a rider are followed by their hips (within TRACK_GATE), each
// with its last ID_SECS seconds of ankle heights. Design choices: 3 s is two slow turns; at fewer than
// 2 poses a second that is under the 6 samples isPedalling needs, so the last 6 are always kept.
export const ID_SECS = 3;
export const MAX_CANDIDATES = 2;
let candidateIds = 0;

function sample(c, p, t, W, H) {
  const lm = p.lm, y = (i) => lm[i].y * H;
  const thigh = (s) => dist(pxOf(lm[LM.hip[s]], W, H), pxOf(lm[LM.knee[s]], W, H));
  const samples = [...c.samples, { t, L: y(LM.ankle.L), R: y(LM.ankle.R), thighL: thigh('L'), thighR: thigh('R') }];
  while (samples.length > 6 && t - samples[0].t > ID_SECS) samples.shift();
  return { ...c, lm, hip: p.hip, sho: p.sho, scale: p.scale, t, side: c.side + (nearSide([lm]) === 'L' ? 1 : -1), samples };
}

/**
 * The candidates for the rider, one frame on. cands: the previous call's result ([] at first). Each
 * is followed to the pose in riding posture whose hip is within TRACK_GATE of its own, the nearest
 * by poseDistance first, so two people side by side are not swapped; one not found for TRACK_KEEP is
 * dropped, and a new pose that sits like a rider becomes a candidate while there are fewer than
 * MAX_CANDIDATES. Returns the new list: { id, since, lm, hip, sho, scale, t, side, samples }.
 */
export function followCandidates(cands, poses, t, W, H) {
  const ps = people(poses, W, H, null).filter(p => p.riding);
  const next = (cands || []).filter(c => t - c.t <= TRACK_KEEP);
  const pairs = [];
  next.forEach((c, ci) => ps.forEach((p, pi) => {
    if (dist(p.hip, c.hip) <= TRACK_GATE * c.scale) pairs.push([poseDistance(p.lm, c.lm, W, H), ci, pi]);
  }));
  pairs.sort((a, b) => a[0] - b[0]);
  const usedC = new Set(), usedP = new Set();
  for (const [, ci, pi] of pairs) {
    if (usedC.has(ci) || usedP.has(pi)) continue;
    usedC.add(ci); usedP.add(pi);
    next[ci] = sample(next[ci], ps[pi], t, W, H);
  }
  ps.forEach((p, pi) => {
    if (usedP.has(pi) || !p.seated || next.length >= MAX_CANDIDATES) return;
    next.push(sample({ id: ++candidateIds, since: t, samples: [], side: 0 }, p, t, W, H));
  });
  return next;
}

// The candidate whose camera-side ankle went round (isPedalling: more than 0.2 of a leg length up and
// down) in the samples from time since on, when no other candidate's did. null otherwise.
export function pedalledCandidate(cands, since = -Infinity) {
  const moved = (cands || []).filter(c => {
    const side = c.side >= 0 ? 'L' : 'R';
    const s = c.samples.filter(x => x.t >= since);
    return isPedalling(s.map(x => ({ ankleY: x[side] })), 2 * median(s.map(x => x['thigh' + side])));
  });
  return moved.length === 1 ? moved[0] : null;
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
// say. samples: the pedalling samples [{t (s), ankleY, thigh}], only frames where the rider was seen.
// Only the last 6 seconds count, so turns from earlier, faster pedalling do not keep the line going,
// and the pose rate comes from those samples' own times. Null when the rider was not seen in the
// last second, when the pose rate is not a real number or is under 1 a second, when the recent turns
// already have enough frames each (framesPerTurn), or when the turn it would ask for is slower than
// SLOWEST_TURN.
export function slowerTurn(samples, now) {
  const rec = (samples || []).filter(s => s.t > now - 6 && s.t <= now);
  if (rec.length < 2 || now - rec[rec.length - 1].t > 1) return null;
  const fps = (rec.length - 1) / (rec[rec.length - 1].t - rec[0].t);
  if (!Number.isFinite(fps) || fps < 1) return null;
  // Turns counted by the ankle going up and down past the middle of its travel, not by the gaps
  // between stroke bottoms. Pedalling slowly, the ankle spends a long time near the bottom and pose
  // noise splits that into several "bottoms" a few frames apart, which look like fast strokes: a slow
  // rider was told to go slower. And at 5 or fewer frames a turn the smoothing in strokes() flattens
  // the strokes, so the bottoms missed a rider who really was too fast.
  if (!(framesPerTurn(rec) < MIN_FRAMES_PER_STROKE)) return null;
  const secs = Math.max(2, Math.ceil(MIN_FRAMES_PER_STROKE / fps));
  return Number.isFinite(secs) && secs <= SLOWEST_TURN ? secs : null;
}

// Where the raw ankle height crosses the middle of its travel, as sample indexes: two crossings per
// turn of the pedals. A crossing counts only once the ankle is a fifth of its travel past the middle
// (a design choice, well above the few pixels of pose noise), so noise near the middle never counts
// twice. It holds down to about 3 frames a turn, where at least one frame a turn still falls in each
// half. Empty when the ankle is not going round (less travel than isPedalling asks for).
function crossings(samples) {
  const ys = (samples || []).map(s => s.ankleY);
  const lo = quantile(ys, 0.05), hi = quantile(ys, 0.95), mid = (lo + hi) / 2, h = 0.2 * (hi - lo);
  if (!(hi - lo > 0)) return [];
  const leg = 2 * median(samples.map(s => s.thigh));
  if (Number.isFinite(leg) && !(hi - lo > 0.2 * leg)) return [];
  const at = [];
  let state = 0;
  ys.forEach((v, i) => {
    const now = v > mid + h ? 1 : v < mid - h ? -1 : 0;
    if (now && now !== state) { if (state) at.push(i); state = now; }
  });
  return at;
}

// Which way the pedals turn: +1 forwards, -1 backwards, 0 when there is not enough to tell. The
// ankle goes round with the pedal, so the angle it sweeps around the middle of its path gives the
// way it turns, and the way the rider faces (frameAngles .face) turns that into forwards or
// backwards: in the picture y points down, so with the rider facing right, forwards is clockwise
// on screen. Design choices: the ankle must travel as far as isPedalling asks; a step counts only
// when the ankle is at least an eighth of its up-and-down travel from the middle at both ends, so
// pose noise around the middle of a foot held still adds nothing; and it needs at least minTurns
// whole turns swept (one by default).
// Leg swaps. Side-on, the pose model can mix up the near and far legs for a frame (AI Bike Fit's
// filming guide warns when the tool "can't tell your near leg from your far leg"). The far ankle is
// half a turn round from the near one, so in a swapped frame the ankle jumps about half a turn, and
// atan2 counts the jump in and the jump out against the way the pedals turn: about one whole turn
// the wrong way for every swap. So a step of more than a quarter turn (DIR_MAX_STEP) is left out: at
// 4 frames a turn or more, no real step is that big. And with fewer than DIR_MIN_FRAMES frames a
// turn, judged from the middle-sized step (the median, which swaps in under half the frames do not
// move), it says 0: real steps then come close to a quarter turn, and below 4 frames a turn a swap
// can look like a small step the wrong way. Both are design choices, checked on the synthetic rider
// with up to 20% of frames swapped. Not solved: at under about 2 frames a turn (2 poses a second
// and fast pedalling) the turning itself looks like slow turning the other way, as a wagon wheel
// does on film; nothing in the samples can tell that apart.
export const DIR_MAX_STEP = Math.PI / 2;
export const DIR_MIN_FRAMES = 5;
export function pedalDirection(samples, minTurns = 1) {
  const s = (samples || []).filter(x => Number.isFinite(x.ankleX) && Number.isFinite(x.ankleY));
  if (s.length < 4) return 0;
  const ys = s.map(x => x.ankleY), travel = quantile(ys, 0.95) - quantile(ys, 0.05);
  const leg = 2 * median(s.map(x => x.thigh));
  if (!(travel > 0) || (Number.isFinite(leg) && !(travel > 0.2 * leg))) return 0;
  const cx = s.reduce((a, x) => a + x.ankleX, 0) / s.length, cy = s.reduce((a, x) => a + x.ankleY, 0) / s.length;
  const away = (x, y) => Math.hypot(x, y) >= travel / 8;
  const steps = [];
  for (let i = 1; i < s.length; i++) {
    const ax = s[i - 1].ankleX - cx, ay = s[i - 1].ankleY - cy, bx = s[i].ankleX - cx, by = s[i].ankleY - cy;
    if (away(ax, ay) && away(bx, by)) steps.push(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
  }
  if (!steps.length || !((2 * Math.PI) / median(steps.map(Math.abs)) >= DIR_MIN_FRAMES)) return 0;
  // A step of more than a quarter turn is a leg swap: left out.
  const sweep = steps.reduce((a, d) => (Math.abs(d) <= DIR_MAX_STEP ? a + d : a), 0);
  const turns = sweep / (2 * Math.PI), face = Math.sign(median(s.map(x => x.face)) || 0);
  return Math.abs(turns) >= minTurns && face ? Math.sign(turns) * face : 0;
}

// Frames per turn of the pedals, from crossings(). NaN with fewer than three crossings (less than one
// turn seen).
export function framesPerTurn(samples) {
  const at = crossings(samples);
  return at.length >= 3 ? (2 * (at[at.length - 1] - at[0])) / (at.length - 1) : NaN;
}

export function summarisePedal(samples) {
  const { bottoms } = strokes(samples);
  const gap = (k) => (k >= 1 ? bottoms[k] - bottoms[k - 1] : bottoms.length > 1 ? bottoms[1] - bottoms[0] : Infinity);
  // A stroke is one turn: the ankle goes up past the middle and back down between its bottom and the
  // one before (for the first, the one after). At about 5 frames a turn the smoothing in strokes()
  // flattens the real strokes and noise leaves "bottoms" two or three turns apart, which pass the gap
  // test and read the knee anywhere on the circle (30 to 70 degrees out on the synthetic rider).
  const cr = crossings(samples);
  const oneTurn = (k) => {
    const [a, b] = k >= 1 ? [bottoms[k - 1], bottoms[k]] : [bottoms[0], bottoms[1]];
    return b != null && cr.filter(i => i > a && i <= b).length === 2;
  };
  const kept = bottoms.filter((_, k) => gap(k) >= MIN_FRAMES_PER_STROKE && oneTurn(k));
  const knees = kept.map(i => atBottom(samples, i, 'kneeFlex'));
  const ys = samples.map(s => s.ankleY);
  return {
    strokes: kept.length,
    strokesSeen: bottoms.length,
    framesPerStroke: bottoms.length >= 2 ? median(bottoms.slice(1).map((_, k) => gap(k + 1))) : NaN,
    // Turns seen and frames per turn, from the ankle crossing the middle of its travel: the measure
    // that still holds when the phone saw too few frames of each turn for strokes() to find them.
    turnsSeen: Math.floor(cr.length / 2),
    framesPerTurn: cr.length >= 3 ? (2 * (cr[cr.length - 1] - cr[0])) / (cr.length - 1) : NaN,
    direction: pedalDirection(samples), // +1 forwards, -1 backwards, 0 not known
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

// ── how the bike stays up ──────────────────────────────────────────────────────────────────
// Three ways to keep the bike up while the phone films it (Alex, 2026-10-10). On a trainer or rollers
// the rider pedals forwards against the resistance, which is how the dynamic 30 to 40 range was
// measured: Bini and Hume (2016) filmed 30 cyclists on their own bikes on a stationary trainer, and
// AI Bike Fit's filming guide (item 8) says "Trainer is ideal ... Pedal steady 20-30 s at an easy
// effort and your normal cadence". So that reading is the main one there, and 30 s is the guide's
// upper end. Against a wall or held by a friend the bike stands on the floor, where pedalling
// forwards would drive the back wheel and move the bike, so the rider pedals backwards for 20 s, as
// before. name: the choice on the home screen; bike: how the results describe it; tag: the history.
export const SETUPS = {
  trainer: { name: 'On a trainer or rollers', bike: 'on a trainer or rollers', tag: 'Trainer', dir: 'forwards', secs: 30 },
  wall: { name: 'Leaning on a wall', bike: 'leaning on a wall', tag: 'Wall', dir: 'backwards', secs: 20 },
  friend: { name: 'A friend holds it', bike: 'held by a friend', tag: 'Friend', dir: 'backwards', secs: 20 },
};
// Sessions saved before the app asked: the bike leaned on a wall or a helper held it (which one was
// not recorded), pedalling backwards for 20 s.
const NO_SETUP = { name: null, bike: null, tag: null, dir: 'backwards', secs: 20 };
export const setupOf = (id) => SETUPS[id] || NO_SETUP;
const setupId = (id) => (SETUPS[id] ? id : null);
// Two sessions are compared only when the bike was held the same way: pedalling forwards under load
// and backwards without it are two different readings, and a session saved before the question
// existed matches only another one like it.
export const sameSetup = (a, b) => setupId(a) === setupId(b);

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
// setup: how the bike stayed up (SETUPS), which only changes the words (pedal forwards or backwards).
export function advise(still, pedal, setup = null) {
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
    // Also when the turns were seen but strokes() could not find their bottoms (framesPerTurn).
    tooFast: !(pedal?.strokes >= 5) && (pedal?.strokesSeen >= 5 || (pedal?.turnsSeen >= 5 && pedal.framesPerTurn < MIN_FRAMES_PER_STROKE)),
    // Pedal strokes seen at all (null: the pedals were never seen turning), so a session with no
    // reading can say what went wrong instead of always blaming the framing.
    strokesSeen: pedal == null ? null : (pedal.strokesSeen ?? pedal.strokes ?? 0),
    change: null, overall: 'green', notes: [],
    setup: setupId(setup),
    // Which way the pedals turned, as seen (summarisePedal .direction), or the way this setup asks for.
    pedalDir: pedal?.direction > 0 ? 'forwards' : pedal?.direction < 0 ? 'backwards' : setupOf(setup).dir,
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
      // For the screen, with ° and mm like every other line there. The spoken summary builds its own.
      why: (raise
        ? `Your knee is still bent ${round(P)}° with the pedal at its lowest point. The target is ${lo} to ${hi}, so the saddle is ${pGrade === 'red' ? 'too low' : 'a little low'}.`
        : `Your knee is only bent ${round(P)}° with the pedal at its lowest point. The target is ${lo} to ${hi}, so the saddle is ${pGrade === 'red' ? 'too high' : 'a little high'}.`)
        + (over * 4 > 15 ? ' 15 mm is the most to change in one go.' : ''),
    };
  } else if (verdict === 'ok') {
    // Front end, only once the saddle height is right. A deliberate difference from AI Bike Fit's
    // rule 4 (fit-rules.md), which also counts a closed shoulder (under 80) and bent elbows (over 30)
    // as signs of a long, low front end. Both usually mean the bars are close, not far: the shoulder
    // angle opens as the hands go further forward, and bent elbows mean the bars are in easy reach.
    // So this counts only the tool's own thresholds that do point to a long, low front: a back
    // under 40, a shoulder over 95 and elbows forced straight (under 8), each only when the screen
    // shows that angle as out of range (FRONT_SIGNS).
    const t = round(upper?.torso), sh = round(upper?.shoulder), e = round(upper?.elbow);
    const flags = [];
    if (FRONT_SIGNS.torso(upper?.torso)) flags.push(['torso', `your back is low (${t}°, target 40 to 50)`, 'your back is low']);
    if (FRONT_SIGNS.shoulder(upper?.shoulder)) flags.push(['shoulder', `your arms reach far forward (shoulder ${sh}°, target 80 to 95)`, 'your arms reach far forward']);
    if (FRONT_SIGNS.elbow(upper?.elbow)) flags.push(['elbow', `your elbows are locked straight (${e}°, target 15 to 30)`, 'your elbows are locked straight']);
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
  // The held-still reading alone is only a cross-check (it differs from pedalling by about 8 degrees,
  // Bini and Hume 2016), so it never makes the saddle Good on its own.
  else if (verdict === 'stillOnly') res.overall = 'amber';
  else if (res.change?.kind === 'saddle') res.overall = pGrade; // amber or red: the knee decides it
  else if (res.change) res.overall = 'red'; // a bars change: "Reach and bar height" needs attention
  else res.overall = worst === 'green' ? 'green' : 'amber';
  return res;
}

const NAMES = { torso: 'back angle', elbow: 'elbow bend', shoulder: 'shoulder angle' };
// The three signs of a long, low front end that advise() counts (its thresholds, from fit-rules.md),
// each only past GREEN_TOL: within 2.5 degrees of a target the screen calls a reading in range, so a
// back at 38 or a shoulder at 97 is not a sign there either (grade(), measures()). Locked elbows,
// under 8, are already more than 2.5 below the 15 to 30 target.
const FRONT_SIGNS = {
  torso: (v) => v < TARGETS.torso[0] - GREEN_TOL,
  shoulder: (v) => v > TARGETS.shoulder[1] + GREEN_TOL,
  elbow: (v) => v < 8,
};

// "inside the 30 to 40 target", or, for a reading inside the 2.5 degree tolerance but outside the
// range itself, "within 2.5 degrees of the 30 to 40 target". Never call 41 "inside" 30 to 40.
function inTarget(v, [lo, hi], unit) {
  return v >= lo && v <= hi ? `inside the ${lo} to ${hi} target` : `within 2.5${unit} of the ${lo} to ${hi} target`;
}

// The upper-body angles that are outside their target, by name ("shoulder angle").
function offAngles(r) {
  return ['torso', 'elbow', 'shoulder'].filter(k => !['green', 'na'].includes(r[k + 'Grade'])).map(k => NAMES[k]);
}
// "a little outside" when every angle that is out is only just out (amber), else "outside".
function offWords(r) {
  const ks = ['torso', 'elbow', 'shoulder'].filter(k => !['green', 'na'].includes(r[k + 'Grade']));
  return ks.every(k => r[k + 'Grade'] === 'amber') ? 'a little outside' : 'outside';
}

// A retest that did not fit what the last change should have done holds the next change back
// (withRetest sets r.held). When the two knee readings disagree, that verdict already says to film
// again, so it speaks for itself. heldSaddle: the saddle change is held (the knee is still out of
// range); r.heldBars: the saddle is in range, and only a handlebar change waits for one more film.
const heldSaddle = (r) => !!r.held && !r.heldBars && (r.verdict === 'change' || r.verdict === 'ok');

// Why a session gave no knee reading at all, from what the pedal step saw (advise() sets
// r.strokesSeen: null when the pedals were never seen turning). Never blames the framing on its own:
// that is the "Reach and bar height" area's job, when the upper body was not seen either.
function noneCause(r) {
  if (r.tooFast) return 'You pedalled faster than this phone can measure each stroke, and there was no held-still reading.';
  const n = r.strokesSeen;
  if (n >= 1 && n < 5) return `I saw only ${n} pedal ${n === 1 ? 'stroke' : 'strokes'}, and I need at least 5. There was no held-still reading either.`;
  return 'I could not see the pedals turning, and there was no held-still reading.';
}

// Rider words, not bike words (Alex: plain English, said across a room): "with the pedal at its
// lowest point", not "at the bottom of the stroke".
const LOWEST = 'with the pedal at its lowest point';

// The "Saddle height" area's reason: the readings behind it, for the screen (unit '°') or for speech
// (' degrees'). The results headline gives the decision in words and this gives the numbers, so the
// two say the same thing without repeating each other word for word.
export function saddleWhy(r, unit = '°') {
  const d = (v) => `${round(v)}${unit}`;
  const [dlo, dhi] = TARGETS.kneeDynamic, [slo, shi] = TARGETS.kneeStatic;
  if (r.change?.kind === 'saddle') return unit === '°' ? r.change.why : spokenSaddleReason(r);
  if (r.verdict === 'disagree') {
    return `Held still, your knee bends ${d(r.staticKnee)}, ${r.staticKnee > shi ? 'over' : 'under'} the ${slo} to ${shi} target. `
      + `Pedalling, it bends ${d(r.knee)}, ${r.knee > dhi ? 'over' : 'under'} the ${dlo} to ${dhi} target.`;
  }
  if (r.verdict === 'stillOnly') {
    return `Held still, your knee bends ${d(r.knee)}, ${r.kneeGrade !== 'green' ? `outside the ${slo} to ${shi} target` : inTarget(r.knee, TARGETS.kneeStatic, unit)}. `
      + `On its own that is only a cross-check, because it differs from pedalling by about 8${unit} on average.`;
  }
  if (r.verdict === 'ok') return `Your knee bends ${d(r.knee)} ${LOWEST}, ${inTarget(r.knee, TARGETS.kneeDynamic, unit)}.`;
  // Out of range, but a retest held the change back (withRetest).
  if (r.verdict === 'change') return `Your knee bends ${d(r.knee)} ${LOWEST}, outside the ${dlo} to ${dhi} target.`;
  return 'Neither knee reading worked this time.';
}

// The "Saddle height" area's one step.
export function saddleStep(r) {
  if (r.change?.kind === 'saddle') return `${r.change.headline}.`;
  if (heldSaddle(r)) return 'Film once more before you change anything.';
  if (r.verdict === 'disagree') return 'Film again: your two knee readings point different ways.';
  const { dir, secs } = setupOf(r.setup);
  if (r.tooFast && (r.verdict === 'stillOnly' || r.verdict === 'none')) return `Film again and pedal ${dir} more slowly.`;
  if (r.verdict === 'stillOnly') return `Film again and pedal ${dir} for the full ${secs} seconds.`;
  if (r.verdict === 'none') {
    return r.strokesSeen >= 1 ? `Film again and pedal ${dir} for the full ${secs} seconds.`
      : dir === 'forwards' ? 'Film again and pedal forwards at an easy effort until I say stop.'
      : 'Film again and pedal backwards, smooth and steady, until I say stop.';
  }
  return 'Leave the saddle height as it is.';
}

function spokenSaddleReason(r) {
  const [lo, hi] = TARGETS.kneeDynamic, c = r.change;
  const how = r.kneeGrade === 'red' ? 'too' : 'a little';
  return `Your knee bends ${round(r.knee)} degrees ${LOWEST}, and the target is ${lo} to ${hi}, so the saddle is ${how} ${c.raise ? 'low' : 'high'}.`;
}

// The headline and the reason under it, for the screen (unit '°') or for speech (' degrees'). The
// reason is the decision in words; the numbers are in the areas below it.
export function headline(r, unit = '°') {
  if (r.heldBars) {
    return { what: 'Film once more before you change the handlebars', why: 'Your saddle height looks right now. Your last saddle change did not move your knee as much as expected, so one more film first, to be sure, before you change anything else.' };
  }
  if (heldSaddle(r)) {
    return { what: 'Film once more', why: 'Your last change did not do what it should have, so I will not suggest another one until one more film shows what it did.' };
  }
  const c = r.change;
  if (c?.kind === 'saddle') {
    const red = r.kneeGrade === 'red';
    const gist = c.raise
      ? `Your knee bends ${red ? 'too much' : 'a little too much'} ${LOWEST}, so the saddle is ${red ? 'too low' : 'a little low'}.`
      : `Your knee does not bend ${red ? 'enough' : 'quite enough'} ${LOWEST}, so the saddle is ${red ? 'too high' : 'a little high'}.`;
    return { what: c.headline, why: `${gist} Change only this for now: moving the saddle changes your reach too.` };
  }
  if (c?.kind === 'bars') return { what: c.headline, why: `${c.reasonSpoken} If one spacer is not enough, a shorter stem is the next step.` };
  if (r.verdict === 'disagree') return { what: 'Film again', why: 'Your two knee readings point different ways, so I will not suggest a change yet.' };
  if (r.verdict === 'stillOnly') {
    const lead = r.tooFast ? 'You pedalled faster than this phone can measure each stroke.' : 'I could not measure you pedalling.';
    const slow = r.tooFast ? ' more slowly' : '';
    const dir = setupOf(r.setup).dir;
    return r.kneeGrade !== 'green'
      ? { what: 'Film again before you move the saddle', why: `${lead} Held still, your knee is outside its range, but that reading alone cannot say how far to move the saddle. Film again and pedal ${dir}${slow}.` }
      : { what: 'Saddle height looks right, held still', why: `${lead} Held still, your knee is in range, but that reading is only a cross-check. Film again and pedal ${dir}${slow} to be sure.` };
  }
  if (r.verdict === 'ok') {
    const off = offAngles(r);
    const allIn = ['torso', 'elbow', 'shoulder'].every(k => r[k + 'Grade'] === 'green');
    return { what: 'Nothing to change today',
      why: 'Your saddle height looks right.'
        + (off.length ? ` Your ${list(off)} ${off.length > 1 ? 'are' : 'is'} ${offWords(r)} the target. That is fine to ride.`
          : allIn ? ' Your back, elbow and shoulder angles are in range too.' : '') };
  }
  return { what: 'Not enough to measure', why: noneCause(r) };
}

// Nothing to do after this session: no change, nothing held back, and the saddle height looks right.
// The home screen then says "Nothing to change" beside the area pills.
export const nothingToDo = (r) => r?.verdict === 'ok' && !r.change && !r.held;

// The words the app says at the end. Short sentences: they are spoken across a room, so the action
// comes first. opts.pain: the rider said on the home screen that riding gives them pain or numbness
// that keeps coming back (fit-rules.md, Reporting honesty: recommend a professional fitter for
// persistent pain or numbness); it is said first. Then the retest, then the action in one or two
// sentences, then it stops: every number spoken is a millimetre or a knee angle, which keeps the
// recorded voice lines few (design-spec.md). opts.long: the longer version that "Say it again"
// speaks, with the reason and the other angles too.
export function spokenSummary(r, { pain = false, long = false } = {}) {
  const out = [];
  const c = r.change;
  if (pain) out.push(painNote(r));
  if (r.retest) out.push(r.retest.spoken);
  if (r.heldBars) {
    out.push('Film once more before you change the handlebars.');
  } else if (heldSaddle(r)) {
    // The retest line just said what to do ("film once more"), so only what it means for the advice.
    out.push(r.retest ? 'I will not suggest another change until then.' : headline(r, ' degrees').why);
  } else if (c?.kind === 'saddle') {
    const mm = c.mm[0] === c.mm[1] ? `${c.mm[0]}` : `${c.mm[0]} to ${c.mm[1]}`;
    // "tell me how far": the results card asks how many millimetres it moved, which is the only way
    // the next film can say what the change did.
    out.push(`${c.raise ? 'Raise' : 'Lower'} the saddle about ${mm} millimetres. Change only that. When you have moved it, tell me how far.`);
    if (long) {
      out.push(spokenSaddleReason(r));
      if (c.capped) out.push('15 millimetres is the most to change in one go.');
    }
  } else if (c?.kind === 'bars') {
    out.push('Raise the handlebars: move one spacer from above the stem to below it. Change only that. When you have done it, tap I made this change.');
    if (long) out.push(c.reasonSpoken || c.why);
  } else if (r.verdict === 'ok') {
    // "looks right", as on the screen: a phone camera is off by a few degrees, so not "is right".
    out.push('Nothing to change today. Your saddle height looks right.');
    if (long) {
      out.push(`Your knee bends ${round(r.knee)} degrees ${LOWEST}, ${inTarget(r.knee, TARGETS.kneeDynamic, ' degrees')}.`);
      if (r.stillOut && !r.stillOutAgain) out.push('Your held-still reading was outside its range. Film once more to be sure.');
      const ok = ['torso', 'elbow', 'shoulder'].filter(k => r[k + 'Grade'] === 'green').map(k => NAMES[k]);
      const off = offAngles(r);
      if (ok.length) out.push(`Your ${list(ok)} ${ok.length > 1 ? 'look' : 'looks'} good.`);
      if (off.length) out.push(`Your ${list(off)} ${off.length > 1 ? 'are' : 'is'} ${offWords(r)} the target. That is fine to ride.`);
    }
  } else if (r.verdict === 'disagree') {
    out.push('Your two knee readings point different ways, so no change yet. Film again.');
  } else if (r.verdict === 'none') {
    out.push(headline(r, ' degrees').why, saddleStep(r));
  } else {
    out.push(headline(r, ' degrees').why);
  }
  if (long) out.push(...(r.notes || []));
  return out.join(' ');
}

// ── compared with last time ──────────────────────────────────────────────────────────────────
// Design choice, from the plus or minus 2-3 degree per-reading tolerance in
// bikefit-research-ranges.md. Not a published number.
export const SAME_TOL = 3;

// The target each compared measurement is graded against (measures() row keys).
export const TARGET_OF = { kneePedal: 'kneeDynamic', kneeStill: 'kneeStatic', torso: 'torso', elbow: 'elbow', shoulder: 'shoulder' };

// "About the same as last time (45°)", "Up 6° since 3 Oct", "Down 4° since 3 Oct", or '' when
// either number is missing. A difference smaller than SAME_TOL is inside the camera's error.
// target ([lo, hi]): then the difference also says whether it is better or worse: "now inside the
// target" when it crossed into the range itself, "now in range" when into the 2.5 degree tolerance
// only (never "inside" for that, as everywhere else), else "closer to" or "further from the target".
export function compareLast(now, was, label, target = null) {
  if (!Number.isFinite(now) || !Number.isFinite(was)) return '';
  const a = Math.round(now), b = Math.round(was), d = a - b;
  if (Math.abs(d) < SAME_TOL) return `About the same as last time (${b}°)`;
  const base = d > 0 ? `Up ${d}° since ${label}` : `Down ${-d}° since ${label}`;
  if (!target) return base;
  const [lo, hi] = target;
  const off = (v) => (v < lo ? lo - v : v > hi ? v - hi : 0);
  const near = (v) => off(v) <= GREEN_TOL;
  if (off(a) === 0 && off(b) > 0) return `${base}, now inside the target`;
  if (near(a) && !near(b)) return `${base}, now in range`;
  if (off(a) < off(b)) return `${base}, closer to the target`;
  if (off(a) > off(b)) return `${base}, further from the target`;
  return base;
}

// ── less exact this time ─────────────────────────────────────────────────────────────────────
// Each warning the app can note during a session, in words, and the one fix for it. The results
// screen and Copy results use the same words. The fixes come from the correction the voice gives for
// the same problem (checkFraming, checkSideOn, the light check); 'crowd', 'level', 'dark' and 'fast'
// are the ones the review named.
const WARN = {
  level: ['the phone was not confirmed level', 'with the phone level'],
  moved: ['the phone moved while measuring', 'with the phone level'],
  feet: ['your feet were cut off', 'with the phone further away'],
  head: ['your head was cut off', 'with the phone further away'],
  edge: ['you were cut off at the side', 'with the phone further away'],
  fast: ['you pedalled faster than this phone could measure', 'pedalling more slowly'],
  small: ['you were small in the picture', 'with the phone a bit closer'],
  big: ['you filled the picture', 'with the phone further away'],
  centre: ['you were off centre', 'with you in the middle of the picture'],
  angle: ['the camera may have been at an angle', 'with the phone square to the bike'],
  dark: ['the light was low', 'in more light'],
  crowd: ['someone else in the picture made some moments unclear', 'with nobody else in the picture'],
  // Safe in every setup: never "pedal forwards" here, because the bike may be standing on the floor.
  way: [null, 'once you have checked how the bike is held'],
};
export function warnLine(keys, setup = null) {
  const ks = [...(keys || [])].filter(k => WARN[k]);
  if (!ks.length) return '';
  const words = ks.map(k => (k === 'way' ? `you pedalled ${setupOf(setup).dir === 'forwards' ? 'backwards, not forwards' : 'forwards, not backwards'}` : WARN[k][0]));
  return `Less exact this time: ${words.join(', ')}. To be sure before you change anything, film again ${WARN[ks[0]][1]}.`;
}

// The last session that measured this angle (history newest first), so a failed film in between
// does not hide "last time". The pedalling knee is compared only with sessions measured the same way
// (saved with v: 2 from this version on): the earlier estimator read up to about 4 degrees more bent
// at 10 frames a turn, which would show once as a false "Down".
// Only sessions with the bike held the same way (sameSetup) count: setup is this session's.
export function lastWith(history, key, setup = null) {
  return (history || []).find(s => sameSetup(s?.setup, setup) && Number.isFinite(s?.values?.[key]) && (key !== 'kneePedal' || s.v >= 2)) || null;
}

// When no session held the same way measured this angle: the last one that did with the bike held
// another way, so the screen can say clearly that it is not compared, rather than say nothing.
export function lastElsewhere(history, key, setup = null) {
  if (lastWith(history, key, setup)) return null;
  return (history || []).find(s => !sameSetup(s?.setup, setup) && Number.isFinite(s?.values?.[key]) && (key !== 'kneePedal' || s.v >= 2)) || null;
}

// "Not compared with 3 Oct: the bike was on a trainer or rollers then.", for lastElsewhere().
export function notCompared(entry, label) {
  const bike = setupOf(entry?.setup).bike;
  return bike ? `Not compared with ${label}: the bike was ${bike} then.` : `Not compared with ${label}: filmed before the app asked how the bike stays up.`;
}

// The newest session that measured anything, for "Your fit, last checked": a film with no reading
// at all would show two "No reading" pills there.
export function lastChecked(history) {
  return (history || []).find(s => s?.areas && Object.values(s.areas).some(g => g !== 'na')) || null;
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

// The change the rider says he made, as stored in history. raise and drop are +1 and -1; the
// millimetres are what he said, a whole number from 1 to MADE_MAX, and never the suggestion in its
// place: the retest compares the knee with what was really done. null with no usable number.
// MADE_MAX is the input's own limit, a design choice; 15 mm is rule 2's most for one change, so more
// than that is saved too, but the check is rougher (madeNote).
export const MADE_MAX = 50;
export const MADE_STEP_MAX = 15;
export function madeChange(change, mm, at) {
  if (change?.kind === 'saddle') {
    if (mm == null || String(mm).trim() === '') return null;
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n < 1 || n > MADE_MAX) return null;
    return { kind: 'saddle', dir: change.raise ? 1 : -1, mm: n, at };
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
// Sessions with the bike held another way than for the change's session (sameSetup) are passed over
// too: they cannot say what the change did, so the change keeps waiting for a film set up the same way.
export function pendingChange(history) {
  const h = history || [];
  const i = h.findIndex(s => s?.made);
  if (i < 0) return null;
  const m = h[i];
  let passed = false;
  for (const s of h.slice(0, i)) {
    if (!sameSetup(s?.setup, m.setup)) continue;
    if (s?.held && !passed) { passed = true; continue; }
    if (s?.src === 'pedalling' && Number.isFinite(s.knee)) return null;
  }
  return passed ? { ...m, recheck: true } : m;
}

// Compares this session's knee reading with the one before a saddle change.
// prev: a history entry { made: { kind, dir, mm }, knee, src }. now: { knee, src }.
// Returns null when there is nothing fair to compare, or { verdict, text, spoken, inRange, ... }.
// verdict, from how far the knee moved the way the change should move it (moved, in degrees):
//   'other-way'   moved more than SAME_TOL the wrong way.
//   'unseen'      moved less than SAME_TOL either way: about the smallest change this camera can see
//                 (one reading is off by 2 to 3 degrees, bikefit-research-ranges.md), so it cannot
//                 tell yet whether the saddle moved.
//   'too-little'  moved, but less than the change should do, by more than SAME_TOL.
//   'too-much'    more than the change should do, by more than SAME_TOL.
//   'consistent'  at least SAME_TOL the right way and no more than the expected most plus SAME_TOL:
//                 the only verdict that says "That fits".
// inRange: the knee is in range now. Then the saddle is left where it is, whatever the verdict, and
// nothing is held back for it (withRetest): what counts is where the knee is now. Out of range, a
// verdict other than 'consistent' holds the next change back for one more film.
// prev.recheck (from pendingChange): this is the second film after the change, so a reading that
// still does not fit is taken as it is (recheck: true in the result, and withRetest does not hold
// back again). prev.setup and now.setup: how the bike was held each time. Held another way, nothing
// is judged: the result says so and the change keeps waiting (verdict 'other-setup', see pendingChange).
export function judgeChange(prev, now) {
  const m = prev?.made;
  if ((m?.kind === 'bars' || m?.kind === 'saddle') && !sameSetup(prev.setup, now?.setup)) return otherSetup(prev, now);
  if (m?.kind === 'bars') return barsBeforeAfter(prev, now);
  if (m?.kind !== 'saddle' || !prev.src || prev.src !== now?.src || !Number.isFinite(prev.knee) || !Number.isFinite(now.knee)) return null;
  if (!(m.dir === 1 || m.dir === -1) || !(m.mm > 0)) return null;
  const delta = now.knee - prev.knee;
  const moved = -m.dir * delta; // positive: the expected way (raising the saddle takes knee bend off)
  const [lo, hi] = expectedKneeChange(m.mm);
  const verdict = moved < -SAME_TOL ? 'other-way' : moved < SAME_TOL ? 'unseen'
    : moved < lo - SAME_TOL ? 'too-little' : moved > hi + SAME_TOL ? 'too-much' : 'consistent';
  const recheck = !!prev.recheck;
  const inRange = grade(now.src === 'pedalling' ? 'kneeDynamic' : 'kneeStatic', now.knee) === 'green';
  const by = (unit) => (round(hi) < 1 ? `less than 1${unit}` : round(lo) === round(hi) ? `about ${round(lo)}${unit}` : `about ${round(lo)} to ${round(hi)}${unit}`);
  const verb = m.dir > 0 ? 'raise' : 'drop';
  const nums = (u) => `Knee bend ${round(prev.knee)}${u} before, ${round(now.knee)}${u} now.`;
  const should = (u, mmWord) => `A ${m.mm} ${mmWord} ${verb} should change it by ${by(u)}`;
  let text, spoken;
  if (inRange) {
    // In range now: leave the saddle, never hold it back (one change at a time, saddle first, and
    // the reading now is what counts). The spoken line has no numbers.
    if (moved >= SAME_TOL) {
      const size = verdict === 'too-much' ? 'more' : verdict === 'too-little' ? 'less' : null;
      text = `${nums('°')} It moved the right way and is in range now, so leave the saddle where it is.`
        + (size ? ` That is ${size} than a ${m.mm} mm ${verb} usually does. What counts is where it is now.` : '');
      spoken = 'Your knee moved the right way, and it is in range now. Leave the saddle where it is.';
    } else if (verdict === 'other-way') {
      text = `${nums('°')} It moved the other way, but it is in range now, so leave the saddle where it is. Check the saddle is where you left it.`;
      spoken = 'Your knee moved the other way, but it is in range now. Leave the saddle where it is, and check it is where you left it.';
    } else {
      // Moved less than SAME_TOL: too little to say which way, so no claim about it.
      text = `${nums('°')} It is in range now, so leave the saddle where it is.`;
      spoken = 'Your knee is in range now. Leave the saddle where it is.';
    }
  } else if (verdict === 'consistent') {
    text = `${nums('°')} ${should('°', 'mm')}. That fits. The next step is below.`;
    spoken = `${nums(' degrees')} ${should(' degrees', 'millimetre')}. That fits. Here is the next step.`;
  } else if (recheck) {
    // The second film that does not fit: going by this reading is the only way forward.
    text = `${nums('°')} ${should('°', 'mm')}. That still does not fit the change, so I go by this reading. The next step is below.`;
    spoken = `${nums(' degrees')} ${should(' degrees', 'millimetre')}. That still does not fit the change, so I go by this reading. Here is the next step.`;
  } else if (verdict === 'unseen') {
    // Design choice: up to an expected 6 degrees (twice SAME_TOL, a change of up to 18 mm) the change
    // is near the smallest one the camera can see; beyond that, no change at all means it hardly moved.
    const small = hi < 2 * SAME_TOL;
    const tail = small ? ', about the smallest change this camera can see, so I cannot tell yet whether the saddle moved.'
      : ', but it hardly changed.';
    text = `${nums('°')} ${should('°', 'mm')}${tail} Check the tape mark, then film once more.`;
    spoken = `${nums(' degrees')} ${should(' degrees', 'millimetre')}${tail} Check the tape mark, then film once more.`;
  } else {
    const end = {
      'other-way': ' It moved the other way. Check the saddle really moved, then film once more before you change anything else.',
      'too-little': ' That is less than the change should do. Check the saddle really moved, then film once more.',
      'too-much': ' That is more than the change should do. Film once more to check.',
    }[verdict];
    text = `${nums('°')} ${should('°', 'mm')}.${end}`;
    spoken = `${nums(' degrees')} ${should(' degrees', 'millimetre')}.${end}`;
  }
  return { verdict, before: prev.knee, now: now.knee, mm: m.mm, dir: m.dir, inRange, recheck, text, spoken };
}

// The change was made after a film with the bike held one way, and this film held it another way.
function otherSetup(prev, now) {
  const was = setupOf(prev.setup).bike, is = setupOf(now?.setup).bike;
  const then = was ? `the bike was ${was}` : 'you filmed before the app asked how the bike stays up';
  const nowSaid = is ? `this time it was ${is}` : 'this time it was set up another way';
  const again = was ? ` To see what the change did, film again with the bike ${was}.` : '';
  const what = prev.made.kind === 'bars' ? 'raising the handlebars' : `${prev.made.dir > 0 ? 'raising' : 'lowering'} the saddle`;
  const text = `Not compared with the film before ${what}: ${then}, and ${nowSaid}.${again}`;
  return { verdict: 'other-setup', kind: prev.made.kind, text, spoken: text };
}

// After raising the handlebars: the back, shoulder and elbow angles before and now. Only the numbers:
// we found no source for how much one spacer should change them, so there is no "that fits" and the
// next change is never held back. now.values: this session's upper-body angles.
function barsBeforeAfter(prev, now) {
  if (prev.src !== 'pedalling' || now?.src !== 'pedalling') return null;
  const pv = prev.values || {}, nv = now.values || {};
  const ks = ['torso', 'shoulder', 'elbow'].filter(k => Number.isFinite(pv[k]) && Number.isFinite(nv[k]));
  if (!ks.length) return null;
  const say = (unit) => ks.map(k => {
    const a = round(pv[k]), b = round(nv[k]);
    return `${NAMES[k]} ${a}${unit} before, ${b}${unit} now${Math.abs(b - a) < SAME_TOL ? ', about the same' : ''}`;
  }).join('; ');
  return {
    verdict: 'shown', kind: 'bars',
    text: `After raising the handlebars: ${say('°')}.`,
    spoken: `After raising the handlebars: ${say(' degrees')}.`,
  };
}

// The result with the retest folded in. A retest that does not fit what the change should have done
// holds the next change back (held: true, stored in history so the next film is compared with the
// reading before the change): piling a second change on a first one that has not shown up yet is
// what "one change at a time" rules out. On the second film after the change (judged.recheck) the
// reading stands, whatever it shows. With the knee in range now the saddle is never held: what counts
// is where it is now. Only a handlebar change suggested by the same film waits for one more film
// (heldBars: the change it would have been), because the saddle move that came first did not do
// what it should have.
export function withRetest(r, judged) {
  if (!judged) return r;
  if (['consistent', 'shown', 'other-setup'].includes(judged.verdict) || judged.recheck) return { ...r, retest: judged };
  if (judged.inRange) {
    if (r.change?.kind === 'bars') return { ...r, retest: judged, change: null, heldBars: r.change, held: true, overall: 'amber' };
    return { ...r, retest: judged };
  }
  return { ...r, retest: judged, change: null, overall: 'amber', held: true };
}

// What a session suggested, stored in its history entry, so the app can still ask "did you make this
// change?" after the results screen has gone: the rider usually makes the change after leaving it.
export function suggestedChange(change) {
  if (change?.kind === 'saddle') return { kind: 'saddle', raise: !!change.raise, mm: [change.mm[0], change.mm[1]] };
  if (change?.kind === 'bars') return { kind: 'bars' };
  return null;
}

// The newest session, when it suggested a change and no one has said yet whether it was made. Only
// the newest: once he has filmed again, that film is what counts.
export function askMade(history) {
  const s = history?.[0];
  return s?.suggested && !s.made ? s : null;
}

// "raise the saddle about 9 to 12 mm", from a suggestedChange().
export function suggestionText(sug) {
  if (sug?.kind === 'saddle') {
    const [a, b] = sug.mm;
    return `${sug.raise ? 'raise' : 'lower'} the saddle about ${a === b ? a : `${a} to ${b}`} mm`;
  }
  if (sug?.kind === 'bars') return 'raise the handlebars by one spacer';
  return '';
}

// The millimetre buttons on the change card. 15 is rule 2's most for one change (fit-rules.md); 5
// and 10 are a design choice, so smaller steps are one tap too. "Other" opens a number field.
export const MADE_CHOICES = [5, 10, 15];
export const LATER = 'Later: I will ask when you come back.';

// The words of the change card. where: 'results' or 'home'. mode: 'ask' (first time), 'later' (he
// tapped Later: the way to answer stays, so he can still say so when he has made it), or 'before'
// (he tapped Film again or Start without saying: ask once before filming, because the retest only
// works if the app knows). Returns { q, mm, yes, no }: mm, the millimetre buttons are shown (a saddle
// change: nothing is saved until he taps one, or Other and a number); yes, the single "I made this
// change" button (a handlebar change), or null; no, the second button, or null.
export function madeQuestion(where, mode, sug, label) {
  const what = suggestionText(sug);
  const saddle = sug?.kind === 'saddle';
  if (where === 'results') {
    if (saddle) {
      if (mode === 'before') return { q: 'Before you film again: how far did you move the saddle?', mm: true, yes: null, no: 'No, film anyway' };
      if (mode === 'later') return { q: 'I will ask when you come back. If you move it now, tell me how far.', mm: true, yes: null, no: null };
      return { q: 'When you have moved the saddle, tell me how far.', mm: true, yes: null, no: LATER };
    }
    if (mode === 'before') return { q: 'Before you film again: did you make this change?', mm: false, yes: 'Yes, I made it', no: 'No, film anyway' };
    if (mode === 'later') return { q: 'When you have made it, tap I made this change.', mm: false, yes: 'I made this change', no: null };
    return { q: 'Did you make this change?', mm: false, yes: 'I made this change', no: LATER };
  }
  const was = `After your check on ${label} I suggested you ${what}.`;
  if (saddle) {
    if (mode === 'before') return { q: `Before you start: did you ${what}? If you did, tell me how far.`, mm: true, yes: null, no: 'No, start anyway' };
    if (mode === 'later') return { q: `${was} When you have moved it, tell me how far.`, mm: true, yes: null, no: null };
    return { q: `${was} When you have moved the saddle, tell me how far.`, mm: true, yes: null, no: LATER };
  }
  if (mode === 'before') return { q: `Before you start: did you ${what}?`, mm: false, yes: 'Yes, I made it', no: 'No, start anyway' };
  if (mode === 'later') return { q: `${was} When you have made the change, tap Yes, I made it.`, mm: false, yes: 'Yes, I made it', no: null };
  return { q: `${was} Did you make this change?`, mm: false, yes: 'Yes, I made it', no: LATER };
}

// What the card says once a change is saved. More than MADE_STEP_MAX is saved as it is, and said so.
export function madeNote(made) {
  if (made?.kind === 'saddle' && made.mm > MADE_STEP_MAX) {
    return `Saved ${made.mm} mm. That is more than ${MADE_STEP_MAX} mm, the most for one change, so this check will be rougher.`;
  }
  return 'Saved. Next time you film, I will check what it did.';
}

// How to move the saddle, for the results under the saddle step, closed by default. Source: Park
// Tool, "How to Adjust a Bike Saddle and Seatpost"
// (https://www.parktool.com/en-us/blog/repair-help/how-to-adjust-a-bike-saddle-seatpost): open the
// quick-release lever or loosen the clamp bolt (usually a hex key), set the height, look down the bike
// to keep the saddle straight, never above the minimum insertion mark on the post, tighten to the
// maker's torque, often printed on the clamp. Using tape to see how far it moved is the app's own
// tip. The bike shop line is a design choice.
export function saddleHowTo(raise) {
  const steps = raise ? [
    'Put a piece of tape round the seat post, right where it goes into the frame.',
    'Open the seat clamp: flip the quick-release lever, or loosen the bolt, usually with a hex key.',
    'Pull the post up. The gap between the tape and the frame is how far it moved.',
    'Look down the bike from behind and turn the saddle so it points straight ahead.',
    'Never pull the post above the minimum insertion mark printed on it.',
    'Tighten the clamp to the torque printed on it, or in the maker\'s instructions.',
  ] : [
    'Measure up the seat post from the frame by how far you want to lower it, and put a piece of tape round the post there.',
    'Open the seat clamp: flip the quick-release lever, or loosen the bolt, usually with a hex key.',
    'Push the post down until the tape meets the frame.',
    'Look down the bike from behind and turn the saddle so it points straight ahead.',
    'Tighten the clamp to the torque printed on it, or in the maker\'s instructions.',
  ];
  return {
    title: raise ? 'How to raise the saddle' : 'How to lower the saddle',
    steps,
    notes: [
      'No torque wrench, a carbon post, or not sure: ask a bike shop.',
      'You can move it in smaller steps. Tell me how far you moved it, and I will check what it did.',
    ],
  };
}

// The home screen card that asks for the retest. label: the day of the check that suggested the
// change ("Oct 3"), not the day he said he made it. setup: how the bike was held for that check,
// which the retest has to match. The card has its own Start button.
export function retestPrompt(made, label, setup = null) {
  const bike = setupOf(setup).bike;
  const tail = bike ? `Film again with the bike ${bike}, as before, to see what it did. A few minutes.`
    : 'Film again to see what it did. A few minutes.';
  if (made?.kind === 'saddle') return `You ${made.dir > 0 ? 'raised' : 'lowered'} the saddle ${made.mm} mm after your check on ${label}. ${tail}`;
  if (made?.kind === 'bars') return `You raised the handlebars after your check on ${label}. ${tail}`;
  return '';
}

// One session in the history list, after its date and setup: the change logged, or else the one
// suggested, and the pedalling knee reading when there is one. ["raised 10 mm", "knee 49°"].
export function historyWords(s) {
  const out = [];
  const m = s?.made, sug = s?.suggested;
  if (m?.kind === 'saddle') out.push(`${m.dir > 0 ? 'raised' : 'lowered'} ${m.mm} mm`);
  else if (m?.kind === 'bars') out.push('raised the handlebars');
  else if (sug?.kind === 'saddle') { const [a, b] = sug.mm; out.push(`suggested: ${sug.raise ? 'raise' : 'lower'} about ${a === b ? a : `${a} to ${b}`} mm`); }
  else if (sug?.kind === 'bars') out.push('suggested: raise the handlebars');
  else out.push(s?.change ? s.change.toLowerCase() : 'no change');
  if (Number.isFinite(s?.values?.kneePedal)) out.push(`knee ${s.values.kneePedal}°`);
  return out;
}

// The held-still reading was out of range while the pedalling one was in range (stillOut). When the
// last session filmed the same way said so too, asking for "once more" again would never end: the
// pedalling reading counts for more. Returns r with stillOutAgain set in that case.
export function withStillHistory(r, history) {
  if (!r?.stillOut) return r;
  const last = (history || []).find(s => sameSetup(s?.setup, r.setup));
  return last?.stillOut ? { ...r, stillOutAgain: true } : r;
}

// ── pain or numbness ─────────────────────────────────────────────────────────────────────────
// fit-rules.md, Reporting honesty: recommend a professional fitter for persistent pain or numbness,
// and say it is not medical advice. NHS, "Knee pain" (https://www.nhs.uk/conditions/knee-pain/): see
// a GP if it does not improve within a few weeks; get help now if you cannot put weight on the knee
// or it is badly swollen or has changed shape. The limits: the app films from the side only, so it
// has no foot or cleat reading (README: no ankle number; fit-rules.md: the foot angle is not
// computed) and cannot see the knee move side to side (fit-rules.md says true side-to-side pelvic rock
// needs a rear-view clip; a camera at the side cannot see movement towards or away from it, at the knee either).
// The answer is asked on the home screen and never stored. It does not change the advice, and
// nothing maps where it hurts to a fix: the evidence does not support that mapping.
const PAIN_LIMITS = 'This check cannot tell what causes your pain. It films you from the side, so it cannot see your feet, your cleats, or how your knee moves side to side.';
// The same words on the screen and out loud: they have no numbers. "Try this one change first" only
// with a change to try; "Your position looks in range" only when nothing is to be done (a design
// choice: with no reading, or a change held back, neither is true, so neither is said).
export function painNote(r) {
  const first = r?.change ? 'Try this one change first. ' : nothingToDo(r) ? 'Your position looks in range. ' : '';
  return `You said pain or numbness keeps coming back. ${first}If it is no better within a few weeks, or it gets worse, see a doctor or physio, and a professional bike fitter. `
    + 'Get medical help now if your knee is badly swollen, has changed shape, or cannot take your weight. This is not medical advice. ' + PAIN_LIMITS;
}

// ── the result list, one row per measurement ─────────────────────────────────────────────────
// Statuses in the style of Apple's movement evaluations, with one difference on purpose: there is
// no "Excellent". A phone camera cannot tell the middle of a range from its edge, so a grade finer
// than "in range" would be made-up precision. The middle tier is "Fair", Apple's word for it
// (design-spec.md, Alex 2026-10-10: the design follows Apple's Health app).
export const STATUS = { green: 'Good', amber: 'Fair', red: 'Needs attention', info: 'For reference', after: 'After the saddle', na: 'No reading' };

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

  const { dir, secs } = setupOf(r.setup);
  const kp = pedal?.strokes >= 5 ? pedal.kneeFlex : NaN;
  const sp = side(kp, TARGETS.kneeDynamic);
  {
    const tooFast = !!r.tooFast; // advise() decides it, so the row and the areas agree
    rows.push(row('kneePedal', `Knee bend with the pedal at its lowest, pedalling ${r.pedalDir || dir}`, kp, 'Target 30 to 40', grade('kneeDynamic', kp),
      tooFast ? 'You pedalled faster than this phone can measure each stroke.'
        : !Number.isFinite(kp) ? 'There were not enough pedal strokes to measure.'
        : sp === 'in' ? inWhy(`Bent ${deg(kp)} each time the pedal was at its lowest point`, kp, TARGETS.kneeDynamic)
        : sp === 'high' ? `Still bent ${deg(kp)} with the pedal at its lowest point, more than the target, so the saddle is probably low.`
        : `Only bent ${deg(kp)} with the pedal at its lowest point, less than the target, so the saddle is probably high.`,
      tooFast ? 'Film again and pedal more slowly.'
        : !Number.isFinite(kp) ? `Film again and pedal ${dir} for the full ${secs} seconds.`
        : saddleFirst ? `${r.change.headline}.` : sp === 'in' ? 'Leave the saddle height as it is.' : 'Film again to confirm before you change anything.'));
  }
  {
    const off = Number.isFinite(r.stillOffBottom);
    const v = off ? NaN : r.staticKnee, s = side(v, TARGETS.kneeStatic);
    rows.push(row('kneeStill', 'Knee bend with the pedal at its lowest, held still', v, 'Target 25 to 35', grade('kneeStatic', v),
      // "may not have been": the crank check is close to its own noise (a foot that sits differently when
      // you stop pedalling moves the ankle too), and it has not been checked on a real rider yet.
      off ? `The pedal may not have been at its lowest point when you held still (it looked about ${r.stillOffBottom}° off), so I did not use this reading.`
        : !Number.isFinite(v) ? 'The still part was not measured.'
        : s === 'in' ? inWhy(`Bent ${deg(v)} with the pedal held at its lowest point`, v, TARGETS.kneeStatic)
        : `Bent ${deg(v)} with the pedal held at its lowest point, ${s === 'high' ? 'more' : 'less'} than the target.`,
      off ? 'Next time, hold the pedal arm pointing straight down.'
        : !Number.isFinite(v) ? 'Next time, hold the pedal at its lowest point until you hear "got it".'
        : r.disagree ? 'Film again: this and the pedalling reading point different ways.'
        // Out of range twice running while pedalling was in range: no third "once more" (withStillHistory).
        : r.stillOut && r.stillOutAgain ? 'Nothing extra to do: the pedalling reading counts for more.'
        : r.stillOut ? 'Film once more to be sure. The pedalling reading counts for more.'
        : r.verdict === 'stillOnly' ? (s === 'in' ? `Film again and pedal ${dir} to be sure.` : `Film again and pedal ${dir} before you move the saddle.`)
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
        : s === 'low' ? `${deg(v)} between your torso and upper arm: a closed position.`
        : `${deg(v)} between your torso and upper arm: your arms reach far forward.`,
      s === 'na' ? FILM_WHOLE : s === 'in' ? 'No change needed.' : upperStep('shoulder', s === 'low' ? 'No change on its own. If you feel cramped on the bike, a bike fitter can check your stem length.'
        : 'If you feel stretched, a shorter stem is the usual fix.')));
  }
  // A new key on purpose: old sessions measured the hip at the top of the stroke, and those
  // numbers are never compared with this one.
  const hipSeen = Number.isFinite(r.hipBottom);
  rows.push(row('hipBottom', 'Hip angle with the pedal at its lowest', r.hipBottom, 'Usually 85 to 110', 'info',
    hipSeen ? `${deg(r.hipBottom)} with the pedal at its lowest point. It depends a lot on how flexible you are.`
      : `${NOT_MEASURED} It is only measured while you pedal ${dir}.`,
    'Nothing to do. It is for reference only.'));
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
  // Saddle height: the pedalling reading decides, the held-still one can only hold a change back.
  // Held still alone is Fair whatever it reads: no millimetres from it, and it is only a
  // cross-check, so it cannot make the saddle Good (Bini and Hume 2016: about 8 degrees from pedalling).
  const sGrade = r.verdict === 'none' ? 'na' : r.verdict === 'disagree' || r.verdict === 'stillOnly' ? 'amber'
    : r.kneeGrade;
  const saddle = area('saddle', 'Saddle height', sGrade, saddleWhy(r), saddleStep(r), pick('kneePedal', 'kneeStill'));

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
  } else if (r.heldBars) {
    // A handlebar change waits for one more film (withRetest): Fair, never Good, with that one step.
    reach = area('reach', 'Reach and bar height', 'amber', r.heldBars.reason || r.heldBars.why, 'Film once more before you change the handlebars.', urows);
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
    // Fair, not Needs attention, for angles outside their range without a bars change. A design
    // choice: fit-rules.md rule 4 needs two signs before a change, and a red pill with "nothing to
    // change" under it would pull against one change at a time. Fine to ride, and compared next time.
    // Only a low back, a shoulder over 95 and locked elbows are signs of a long, low front end (see
    // advise()); a closed shoulder or bent elbows are not, so they are not called half of a bars change.
    const signs = Object.entries(FRONT_SIGNS).filter(([k, test]) => off.includes(NAMES[k]) && test(r[k])).length;
    const tail = r.verdict !== 'ok' ? ' Bar changes wait until the saddle height is settled.'
      : signs ? ' That is one sign of a long, low front end, but the handlebars only need to move when two signs point the same way. That is fine to ride.'
      : ' That is fine to ride.';
    reach = area('reach', 'Reach and bar height', 'amber',
      `Your ${list(off)} ${off.length > 1 ? `are ${offWords(r)} their targets` : `is ${offWords(r)} its target`}.${tail}`,
      'Nothing to do. I will compare it on your next check.', urows);
  }

  const more = area('more', 'More numbers', 'info', 'Extra angles for reference. They do not change the advice.',
    'Nothing to do.', pick('hipBottom'));
  return [saddle, reach, more];
}
