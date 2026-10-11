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
 * fake a camera at an angle), noise (px), rand (0..1 generator), mirror (the bike faces
 * image-left: the picture is flipped left to right).
 * theta: crank angle in radians, counterclockwise with y up. With the bike facing image-right,
 * pedalling forwards turns it clockwise, so theta goes down; backwards, it goes up.
 */
export function synthPose(theta, opts = {}) {
  const { W = 1280, H = 720, scale = 0.33, cx = 600, cy = 520, hipShift = [0, 0], farGap = 0, noise = 0, rand = Math.random, mirror = false } = opts;
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
  if (mirror) for (const p of lm) p.x = 1 - p.x;
  return lm;
}

/**
 * A person standing near the bike, for the tests and ?sim&helper=...: feet on the floor, upright or
 * leaning forward from the hips. World mm as in synthPose (bottom bracket at 0,0, y up). The floor
 * is put 270 mm below the bottom bracket and the camera at 430 mm above it: made-up numbers for this
 * made-up scene, not measurements.
 * opts: at (mm along the bike where the person stands), depth (how much smaller than the rider they
 * look, being further from the phone: 1 = same distance), frontal (facing the phone, so left and
 * right are spread apart; otherwise side-on, facing image-right like the rider), lean (degrees the
 * torso tips forward from upright), kneeBend (degrees), reach ([x, y] mm the camera-side hand
 * reaches for, e.g. the saddle), vis (visibility of every point), noise (px), rand, and the frame
 * options of synthPose (W, H, scale, cx, cy).
 */
export function synthHelper(opts = {}) {
  const { W = 1280, H = 720, scale = 0.33, cx = 600, cy = 520, at = -520, depth = 0.88, frontal = true, lean = 0, kneeBend = 5,
    reach = null, vis = 0.9, noise = 0, rand = Math.random } = opts;
  const FLOOR = -270, EYE = 430;
  const rad = (d) => (d * Math.PI) / 180;
  const ankle = [at, FLOOR + 80];
  // The knee bends forward and the hips go back, so the thigh stays near upright.
  const knee = [ankle[0] + SHANK * Math.sin(rad(kneeBend)), ankle[1] + SHANK * Math.cos(rad(kneeBend))];
  const hip = [knee[0] - THIGH * Math.sin(rad(kneeBend / 2)), knee[1] + THIGH * Math.cos(rad(kneeBend / 2))];
  const sho = [hip[0] + 560 * Math.sin(rad(lean)), hip[1] + 560 * Math.cos(rad(lean))];
  const elbow = reach ? ik(sho, reach, UPPER, FORE, -1) : [sho[0], sho[1] - UPPER];
  const wrist = reach || [elbow[0], elbow[1] - FORE];
  const head = [sho[0] + 60 * Math.sin(rad(lean)), sho[1] + 200];
  // Seen from further away: shrunk towards the point straight ahead of the camera.
  const P = (p, dx = 0) => {
    const x = cx + scale * (at + depth * (p[0] - at)) + dx * depth, y = cy - scale * (EYE + depth * (p[1] - EYE));
    return { x: (x + (rand() - 0.5) * 2 * noise) / W, y: (y + (rand() - 0.5) * 2 * noise) / H };
  };
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
  // Half-widths in px, left (+) and right (-), facing the phone; side-on they almost overlap.
  const spread = frontal ? { sho: 62, elbow: 72, wrist: 76, hip: 46, knee: 36, ankle: 36, heel: 36, toe: 40 } : { sho: 6, elbow: 6, wrist: 6, hip: 5, knee: 5, ankle: 5, heel: 5, toe: 5 };
  const set = (i, p, dx) => { lm[i] = { ...P(p, dx), z: 0.3, visibility: vis }; };
  set(0, head, 0);
  const pairs = [[11, 12, sho, 'sho'], [13, 14, elbow, 'elbow'], [23, 24, hip, 'hip'], [25, 26, knee, 'knee'], [27, 28, ankle, 'ankle']];
  for (const [l, r, p, k] of pairs) { set(l, p, spread[k]); set(r, p, -spread[k]); }
  set(15, wrist, spread.wrist); set(16, reach ? [sho[0], sho[1] - UPPER - FORE] : wrist, -spread.wrist);
  set(29, [ankle[0] - 55, ankle[1] - 45], spread.heel); set(30, [ankle[0] - 55, ankle[1] - 45], -spread.heel);
  set(31, [ankle[0] + 85, ankle[1] - 75], spread.toe); set(32, [ankle[0] + 85, ankle[1] - 75], -spread.toe);
  return lm;
}

// Seeded generator so tests are repeatable.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * A phone standing sideways and rolled about its lens, built from the device's own axes rather than
 * from fit.imageRoll, so the tests and ?sim&roll= check that function against the geometry.
 * Device axes (as DeviceMotionEvent reports them): x to the right of the screen held upright, y to
 * its top, z out of the screen. side: 'left' (the top of the phone to the left as you face the
 * screen, so x points up) or 'right' (x points down). roll: degrees, positive when the phone turns
 * anticlockwise as you face its screen. pitch: degrees the lens tips up or down (a z part of
 * gravity). camera: 'rear' (looks out of the back, along -z) or 'front' (out of the screen, +z), its
 * picture as the camera sees it, not mirrored. convention: 'spec' (accelerationIncludingGravity
 * points up, as the W3C specification says) or 'ios' (the opposite sign, as Safari on iPhone was
 * reported to give).
 * Returns g, the accelerometer reading, and theta, the roll of the picture in degrees: positive when
 * straight down in the room points down and to the right in the picture.
 */
export function rolledPhone({ camera = 'rear', side = 'left', roll = 0, pitch = 0, convention = 'spec' } = {}) {
  const r = (roll * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  // Straight down in the room, in device axes. Level, it is -x (side left) or +x (side right).
  // Turning the phone anticlockwise by r turns that vector clockwise by r in the device's axes.
  const s = side === 'left' ? -1 : 1;
  const down = [s * Math.cos(r) * Math.cos(p), -s * Math.sin(r) * Math.cos(p), Math.sin(p)];
  // The picture's right and down, in device axes (right = the camera's forward x the room's up).
  const X = [1, 0, 0], Y = [0, 1, 0], neg = (v) => v.map(c => -c);
  const axes = {
    rear: { left: { right: neg(Y), down: neg(X) }, right: { right: Y, down: X } },
    front: { left: { right: Y, down: neg(X) }, right: { right: neg(Y), down: X } },
  }[camera][side];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const theta = (Math.atan2(dot(down, axes.right), dot(down, axes.down)) * 180) / Math.PI;
  const k = convention === 'ios' ? 9.81 : -9.81;
  return { g: down.map(c => k * c), theta };
}

// What a picture rolled by theta degrees shows: the upright scene turned by -theta about the centre
// of the picture, so that straight down in the room points at theta in the picture.
export function rollPicture(lm, theta, W = 1280, H = 720) {
  const a = (-theta * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2;
  return lm.map(q => {
    const x = q.x * W - cx, y = q.y * H - cy;
    return { ...q, x: (cx + x * c - y * s) / W, y: (cy + x * s + y * c) / H };
  });
}
