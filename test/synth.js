// A synthetic rider for tests and for the ?sim walk-through: a two-segment leg driven by a
// 170 mm crank, a fixed upper body, rendered as MediaPipe-shaped landmarks (normalised 0..1).
// World units are mm with the bottom bracket at 0,0 and y up; the bike faces image-right.

const CR = 170, THIGH = 450, SHANK = 440, UPPER = 300, FORE = 330;
const HIP = [-220, 738];
const SHO = [HIP[0] + 560 * Math.SQRT1_2, HIP[1] + 560 * Math.SQRT1_2];
const HAND = [540, 640];

function ik(a, b, l1, l2, sign) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const d = Math.min(Math.hypot(vx, vy), l1 + l2 - 1e-3);
  const ux = vx / Math.hypot(vx, vy), uy = vy / Math.hypot(vx, vy);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - x * x, 0));
  return [a[0] + ux * x - uy * h * sign, a[1] + uy * x + ux * h * sign];
}

export function legAt(theta, hip = HIP) {
  const pedal = [CR * Math.cos(theta), CR * Math.sin(theta)];
  const ankle = [pedal[0] - 35, pedal[1] + 85];
  const knee = ik(hip, ankle, THIGH, SHANK, 1);
  return { pedal, ankle, knee, heel: [ankle[0] - 55, ankle[1] - 45], toe: [pedal[0] + 85, pedal[1] - 5] };
}

// Ground truth for the tests: knee flexion when the near crank points straight down.
export function trueKneeFlexBDC(hip = HIP) {
  const { ankle, knee } = legAt(-Math.PI / 2, hip);
  const a = [hip[0] - knee[0], hip[1] - knee[1]], b = [ankle[0] - knee[0], ankle[1] - knee[1]];
  const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
  return 180 - (Math.acos(cos) * 180) / Math.PI;
}

/**
 * opts: W, H (frame px), scale (px per mm), cx, cy (bottom bracket on screen), hipShift (mm,
 * moves the hip, i.e. the saddle), farGap (px, far shoulder/hip offset along the bike, to
 * fake a camera at an angle), noise (px), rand (0..1 generator).
 */
export function synthPose(theta, opts = {}) {
  const { W = 1280, H = 720, scale = 0.33, cx = 600, cy = 520, hipShift = [0, 0], farGap = 0, noise = 0, rand = Math.random } = opts;
  const hip = [HIP[0] + hipShift[0], HIP[1] + hipShift[1]];
  const sho = [SHO[0] + hipShift[0], SHO[1] + hipShift[1]];
  const elbow = ik(sho, HAND, UPPER, FORE, -1);
  const near = legAt(theta, hip), far = legAt(theta + Math.PI, hip);
  const head = [sho[0] + 105, sho[1] + 125];
  const P = (p, dx = 0) => ({
    x: (cx + scale * p[0] + dx + (rand() - 0.5) * 2 * noise) / W,
    y: (cy - scale * p[1] + (rand() - 0.5) * 2 * noise) / H,
  });
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));
  const set = (i, p, vis, z, dx = 0) => { lm[i] = { ...P(p, dx), z, visibility: vis }; };
  set(0, head, 0.99, -0.2);
  // near side = left (11,13,15,23,25,27,29,31), far side = right
  set(11, sho, 0.97, -0.1); set(12, sho, 0.7, 0.1, farGap);
  set(13, elbow, 0.95, -0.1); set(14, elbow, 0.6, 0.1, farGap);
  set(15, HAND, 0.93, -0.1); set(16, HAND, 0.6, 0.1, farGap);
  set(23, hip, 0.97, -0.1); set(24, hip, 0.7, 0.1, farGap);
  set(25, near.knee, 0.96, -0.1); set(26, far.knee, 0.6, 0.1);
  set(27, near.ankle, 0.95, -0.1); set(28, far.ankle, 0.55, 0.1);
  set(29, near.heel, 0.9, -0.1); set(30, far.heel, 0.5, 0.1);
  set(31, near.toe, 0.9, -0.1); set(32, far.toe, 0.5, 0.1);
  return lm;
}

// Seeded generator so tests are repeatable.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
