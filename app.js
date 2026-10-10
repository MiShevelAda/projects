// Bike Fit Coach: the camera, the voice, the tilt sensor and the step-by-step flow.
// The measuring maths lives in fit.js. Add ?sim to the URL to walk the whole flow with a
// synthetic rider and no camera (add &low for a rider whose saddle is too low).

import * as fit from './fit.js';

const params = new URLSearchParams(location.search);
const SIM = params.has('sim');
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(['home', 'run', 'results', 'start', 'status', 'cam', 'overlay', 'say', 'steps', 'chips', 'skip', 'stop', 'timer',
  'histCard', 'history', 'rOverall', 'rWhat', 'rWhy', 'rDisagree', 'rWarn', 'rList', 'keepVideo', 'shotCard', 'rShot', 'again', 'speak', 'saveVideo', 'copy', 'done']
  .map(id => [id, $(id)]));
const now = () => performance.now() / 1000;
const round = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// ── voice ────────────────────────────────────────────────────────────────────────────────────
const Voice = {
  last: new Map(), voice: null,
  init() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /^en[-_]GB/i.test(v.lang) && v.localService)
        || vs.find(v => /^en[-_](US|AU|IE|GB)/i.test(v.lang) && v.localService)
        || vs.find(v => /^en/i.test(v.lang)) || null;
    };
    pick();
    speechSynthesis.addEventListener?.('voiceschanged', pick);
  },
  unlock() { // iOS only lets a page speak after a tap, so the Start tap says something silent
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  },
  // every: seconds before the same key may be said again. Returns whether it was said.
  say(text, { key = text, every = 0, interrupt = false } = {}) {
    const t = now();
    if (every && this.last.has(key) && t - this.last.get(key) < every) return false;
    this.last.set(key, t);
    el.say.textContent = text;
    log('say', text);
    if (!('speechSynthesis' in window)) return true;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
    speechSynthesis.speak(u);
    return true;
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};

// ── beeps, for the spirit level ───────────────────────────────────────────────────────────────
const Beep = {
  ctx: null,
  init() {
    try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume?.(); } catch { this.ctx = null; }
  },
  tone(freq = 660, dur = 0.07, vol = 0.22) {
    const c = this.ctx;
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  chime() { this.tone(660, 0.12); setTimeout(() => this.tone(990, 0.2), 140); },
};

// ── tilt sensor: is the phone sideways and level? ─────────────────────────────────────────────
const Tilt = {
  available: false, landscape: false, pitch: 0, roll: 0, g: null, listening: false,
  request() { // must be called straight from a tap on iOS
    const DM = window.DeviceMotionEvent;
    const listen = () => {
      if (!this.listening) window.addEventListener('devicemotion', (e) => this.onMotion(e));
      this.listening = true;
      return true;
    };
    if (DM && typeof DM.requestPermission === 'function') {
      return DM.requestPermission().then(s => (s === 'granted' ? listen() : false)).catch(() => false);
    }
    return Promise.resolve(listen());
  },
  onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const k = 0.2;
    this.g = this.g ? this.g.map((v, i) => v + k * ([a.x, a.y, a.z][i] - v)) : [a.x, a.y, a.z];
    const [x, y, z] = this.g, n = Math.hypot(x, y, z) || 1;
    this.available = true;
    this.landscape = Math.abs(x) > Math.abs(y) * 1.3;
    this.pitch = (Math.asin(Math.max(-1, Math.min(1, z / n))) * 180) / Math.PI; // camera pointing up or down
    this.roll = (Math.atan2(y, Math.abs(x)) * 180) / Math.PI;                    // horizon tilted
  },
  level() { return Math.abs(this.pitch) < 3 && Math.abs(this.roll) < 2.5; },
  error() { return Math.max(Math.abs(this.pitch) / 3, Math.abs(this.roll) / 2.5); },
};

// ── state ────────────────────────────────────────────────────────────────────────────────────
let landmarker = null, stream = null, recorder = null, chunks = [], videoBlob = null, wake = null, sim = null;
let running = false, phase = null, phaseT0 = 0, ph = {}, recent = [], sideCache = { side: 'L', n: 0 };
let session = null, lastResult = null;
const skipped = new Set(), warnings = new Set();
const debug = { phase: () => phase, poses: 0, frames: 0, said: [], errors: [] };
window.__bfc = debug;
function log(kind, msg) { if (kind === 'say') debug.said.push(msg); }

const STEP_ORDER = ['phone', 'mount', 'frame', 'still', 'pedal'];
function go(name, t) {
  phase = name;
  phaseT0 = t;
  ph = {};
  el.timer.hidden = true;
  el.skip.hidden = !['phone', 'frame'].includes(name);
  const i = STEP_ORDER.indexOf(name);
  for (const s of el.steps.children) {
    const j = STEP_ORDER.indexOf(s.dataset.step);
    s.className = j < i ? 'done' : j === i ? 'on' : '';
  }
  HANDLERS[name].enter(t);
}

function show(screen) {
  for (const s of ['home', 'run', 'results']) el[s].hidden = s !== screen;
  window.scrollTo(0, 0);
}

// ── the steps ────────────────────────────────────────────────────────────────────────────────
const HANDLERS = {
  phone: {
    enter() {
      Voice.say('Turn the phone sideways and stand it on a chair or a box, about 3 metres from the side of the bike, with the camera at hip height. I will beep until it is level.', { interrupt: true });
    },
    tick({ t }) {
      if (!Tilt.available) {
        if (t - phaseT0 > 4 && !ph.noSensor) {
          ph.noSensor = t;
          warnings.add('level');
          Voice.say('I cannot read the tilt sensor, so level the phone by eye, using the camera grid.');
        }
        if (ph.noSensor && t - ph.noSensor > 8) go('mount', t);
        return;
      }
      if (!Tilt.landscape) { ph.since = null; Voice.say('Turn the phone sideways.', { key: 'sideways', every: 8 }); return; }
      if (innerHeight > innerWidth) {
        Voice.say('The screen is not turning with the phone. Turn off rotation lock in Control Centre, then come back.', { key: 'lock', every: 14 });
        return;
      }
      if (Tilt.level()) {
        ph.since ??= t;
        if (t - ph.since > 1.2) {
          Beep.chime();
          Voice.say('Level. Leave the phone there.', { interrupt: true });
          go('mount', t);
        }
        return;
      }
      ph.since = null;
      const e = Tilt.error();
      if (!ph.beep || t - ph.beep > Math.min(1, 0.12 + 0.07 * e)) { ph.beep = t; Beep.tone(e > 3 ? 440 : 620); }
      if (t - phaseT0 > 14) Voice.say('Not level yet. Tilt it slowly until the beeping stops.', { key: 'tilt', every: 14 });
    },
  },

  mount: {
    enter() {
      Voice.say('Now get on the bike in your normal riding position, hands on the hoods. Lean lightly on the wall, or have your helper hold the bike from the far side.');
    },
    tick({ t, rider }) {
      if (t - phaseT0 < 6) return; // time to walk over and get on
      if (rider) {
        ph.since ??= t;
        if (t - ph.since > 1.5) go('frame', t);
      } else {
        ph.since = null;
        if (t - phaseT0 > 22) Voice.say('I cannot see you on the bike yet. Make sure the phone can see you and the whole bike.', { key: 'nosee', every: 14 });
      }
    },
  },

  frame: {
    enter() { Voice.say('Checking the picture. Stay in position.'); ph.tries = {}; },
    tick({ t, lm, side, W, H, rider }) {
      if (!rider) { ph.ok = null; ph.bad = null; return; }
      const problem = firstProblem(lm, side, W, H, t);
      if (!problem) {
        ph.bad = null;
        ph.ok ??= t;
        if (t - ph.ok > 2) { Voice.say('The picture looks good.'); go('still', t); }
        return;
      }
      ph.ok = null;
      if (ph.bad?.key !== problem.key) ph.bad = { key: problem.key, since: t };
      if (t - ph.bad.since < 1.5) return;
      const n = ph.tries[problem.key] || 0;
      if (n >= 3) {
        skipped.add(problem.key);
        warnings.add(problem.key);
        Voice.say('I will carry on anyway, but the numbers may be less exact.', { interrupt: true });
        ph.bad = null;
        return;
      }
      if (Voice.say(problem.say, { key: problem.key, every: 11 })) ph.tries[problem.key] = n + 1;
    },
  },

  still: {
    enter() {
      startRecording();
      Voice.say('Put the pedal nearest the phone at the very bottom, crank pointing straight down, foot as when you pedal. Then hold still.');
    },
    tick({ t, lm, side, W, H, ang, rider }) {
      if (!rider) { ph.cap = null; return; }
      if (!ph.cap) {
        if (ph.retry && t - ph.retry < 2.5) return;
        const win = recent.filter(r => r.t > t - 1).map(r => r.lm);
        const still = win.length >= 3 && fit.motion(win, side, W, H) < 0.035;
        const atBottom = ang.kneeFlex < 55;
        if (still && atBottom && t - phaseT0 > 4) {
          ph.cap = { t0: t, angles: [], lms: [] };
          Voice.say('Hold it. Three. Two. One.', { interrupt: true });
        } else if (t - phaseT0 > 15) {
          Voice.say(atBottom ? 'Hold still for a moment.' : 'Push the pedal nearest the phone all the way to the bottom, and hold still.', { key: 'nudge', every: 11 });
        }
        return;
      }
      ph.cap.angles.push(ang);
      ph.cap.lms.push(lm);
      if (fit.motion(ph.cap.lms, side, W, H) > 0.06) {
        ph.cap = null;
        ph.retry = t;
        Voice.say('You moved. Let us try again.', { interrupt: true });
        return;
      }
      if (t - ph.cap.t0 > 3.2) {
        session.still = fit.summariseStill(ph.cap.angles);
        session.stillShot = snapshot(lm, W, H, side, ang);
        Beep.chime();
        Voice.say('Got it.');
        go('pedal', t);
      }
    },
  },

  pedal: {
    enter() {
      Voice.say('Now pedal backwards, smooth and steady. I will time 20 seconds.');
      ph.samples = [];
      ph.said = {};
    },
    tick({ t, ang, rider }) {
      if (rider) ph.samples.push({ t, ...ang });
      const win = ph.samples.filter(s => s.t > t - 2);
      const moving = win.length > 5 && fit.isPedalling(win, fit.median(win.map(s => s.thigh)) * 2);
      if (moving) ph.lastMove = t;
      if (!ph.started) {
        if (moving) { ph.started = Math.max(phaseT0, t - 2); Beep.tone(880, 0.08); }
        else if (t - phaseT0 > 10) Voice.say('I cannot see the pedals turning. Pedal backwards, slowly and steadily.', { key: 'nopedal', every: 10 });
        return;
      }
      const e = t - ph.started;
      el.timer.hidden = false;
      el.timer.textContent = Math.max(0, Math.ceil(20 - e));
      if (t - ph.lastMove > 3) Voice.say('Keep pedalling backwards.', { key: 'keep', every: 6 });
      if (e > 10 && !ph.said[10]) { ph.said[10] = 1; Voice.say('Ten seconds left.'); }
      if (e > 15 && !ph.said[15]) { ph.said[15] = 1; Voice.say('Five more.'); }
      if (e > 20) {
        session.pedal = fit.summarisePedal(ph.samples.filter(s => s.t >= ph.started));
        Beep.chime();
        Voice.say('Stop. Well done, you can relax.', { interrupt: true });
        finish();
      }
    },
  },
};

// Checks in order; a skipped check no longer blocks.
function firstProblem(lm, side, W, H, t) {
  const checks = [
    () => fit.checkFraming(lm, side, W, H),
    () => fit.checkSideOn(lm, side, W, H),
    () => darkness(t),
  ];
  const state = {};
  let first = null;
  for (const [i, c] of checks.entries()) {
    const p = c();
    state[i] = !p;
    if (p && !skipped.has(p.key) && !first) first = p;
  }
  chips({ 'In picture': state[0], 'Side-on': state[1], Light: state[2] });
  return first;
}

let lumaAt = 0, lumaOk = true;
const lumaCanvas = document.createElement('canvas');
function darkness(t) {
  if (SIM) return null;
  if (t - lumaAt > 1) {
    lumaAt = t;
    lumaCanvas.width = 32;
    lumaCanvas.height = 18;
    const g = lumaCanvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(el.cam, 0, 0, 32, 18);
    const d = g.getImageData(0, 0, 32, 18).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lumaOk = s / (d.length / 4) > 45;
  }
  return lumaOk ? null : { key: 'dark', say: 'It is quite dark. Turn on more lights if you can.' };
}

function chips(map) {
  el.chips.replaceChildren(...Object.entries(map).map(([k, ok]) => {
    const c = document.createElement('span');
    c.className = 'chip ' + (ok == null ? '' : ok ? 'ok' : 'bad');
    c.textContent = (ok == null ? '? ' : ok ? '✓ ' : '• ') + k;
    return c;
  }));
}

// ── the frame loop ───────────────────────────────────────────────────────────────────────────
let lastVideoTime = -1;
function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const t = now();
  let lm = null, W = 1280, H = 720;
  if (SIM) {
    ({ lm, W, H } = sim.frame(t));
  } else {
    if (!landmarker || el.cam.readyState < 2 || el.cam.currentTime === lastVideoTime) return;
    lastVideoTime = el.cam.currentTime;
    W = el.cam.videoWidth;
    H = el.cam.videoHeight;
    try {
      const res = landmarker.detectForVideo(el.cam, performance.now());
      lm = res.landmarks?.[0] || null;
    } catch (e) {
      debug.errors.push(String(e));
      return;
    }
  }
  debug.frames++;
  if (lm) debug.poses++;
  step(lm, t, W, H);
}

function step(lm, t, W, H) {
  if (lm) recent.push({ t, lm });
  while (recent.length && recent[0].t < t - 2.5) recent.shift();
  let side = null, ang = null, rider = false;
  if (lm) {
    if (++sideCache.n % 15 === 1) sideCache.side = fit.nearSide(recent.slice(-30).map(r => r.lm));
    side = sideCache.side;
    ang = fit.frameAngles(lm, side, W, H);
    rider = ang.vis > 0.5 && fit.isRiding(ang);
  }
  // A phone that gets moved during setup has to be levelled again.
  if ((phase === 'mount' || phase === 'frame') && Tilt.available && !skipped.has('level')) {
    if (!Tilt.level() || !Tilt.landscape) {
      ph.tiltBad ??= t;
      if (t - ph.tiltBad > 2.5) {
        Voice.say('The phone moved. Let us level it again.', { interrupt: true });
        go('phone', t);
        return;
      }
    } else ph.tiltBad = null;
  }
  if ((phase === 'still' || phase === 'pedal') && Tilt.available && !Tilt.level()) warnings.add('moved');
  if (phase !== 'frame') chips({ Level: !Tilt.available ? null : Tilt.level(), Rider: rider });
  draw(lm, W, H, side, ang);
  HANDLERS[phase]?.tick({ t, lm, side, W, H, ang, rider });
}

// ── drawing ──────────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [['shoulder', 'elbow'], ['elbow', 'wrist'], ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle'], ['ankle', 'heel'], ['heel', 'toe'], ['ankle', 'toe']];

function drawSkeleton(g, lm, side, P, unit, ang) {
  const other = side === 'L' ? 'R' : 'L';
  g.lineCap = 'round';
  for (const [s, col, w] of [[other, 'rgba(255,255,255,0.28)', 3], [side, '#2e8cff', 6]]) {
    g.strokeStyle = col;
    g.lineWidth = w * unit;
    for (const [a, b] of SEGMENTS) {
      const p = P(fit.LM[a][s]), q = P(fit.LM[b][s]);
      g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke();
    }
  }
  g.fillStyle = '#fff';
  for (const j of ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle']) {
    const [x, y] = P(fit.LM[j][side]);
    g.beginPath(); g.arc(x, y, 5 * unit, 0, Math.PI * 2); g.fill();
  }
  if (ang && Number.isFinite(ang.kneeFlex)) {
    const [x, y] = P(fit.LM.knee[side]);
    g.font = `700 ${Math.round(20 * unit)}px system-ui, sans-serif`;
    g.lineWidth = 4 * unit;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    const label = `knee ${Math.round(ang.kneeFlex)}°`;
    g.strokeText(label, x + 12 * unit, y - 10 * unit);
    g.fillText(label, x + 12 * unit, y - 10 * unit);
  }
}

function draw(lm, W, H, side, ang) {
  const c = el.overlay, dpr = window.devicePixelRatio || 1;
  const cw = c.clientWidth, chh = c.clientHeight;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(chh * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, chh);
  const s = Math.min(cw / W, chh / H), ox = (cw - W * s) / 2, oy = (chh - H * s) / 2;
  if (SIM) { g.fillStyle = '#16233a'; g.fillRect(ox, oy, W * s, H * s); }
  if (!lm) return;
  drawSkeleton(g, lm, side, (i) => [ox + lm[i].x * W * s, oy + lm[i].y * H * s], Math.max(0.6, Math.min(1.4, (W * s) / 900)), ang);
}

function snapshot(lm, W, H, side, ang) {
  const c = document.createElement('canvas'), k = Math.min(1, 1100 / W);
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  const g = c.getContext('2d');
  if (SIM) { g.fillStyle = '#16233a'; g.fillRect(0, 0, c.width, c.height); } else g.drawImage(el.cam, 0, 0, c.width, c.height);
  drawSkeleton(g, lm, side, (i) => [lm[i].x * c.width, lm[i].y * c.height], c.width / 900, ang);
  return c.toDataURL('image/jpeg', 0.85);
}

// ── camera, recording, screen ────────────────────────────────────────────────────────────────
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  });
  el.cam.srcObject = stream;
  await el.cam.play().catch(() => {});
}

function stopCamera() {
  stream?.getTracks().forEach(tr => tr.stop());
  stream = null;
  el.cam.srcObject = null;
}

function cameraError(e) {
  if (e && e.name === 'NotAllowedError') return 'Camera access was refused. On iPhone: Settings, Safari, Camera, Allow. Then tap Start again.';
  if (e && e.name === 'NotFoundError') return 'No camera found on this device.';
  return 'The camera did not start: ' + (e?.message || e);
}

function startRecording() {
  videoBlob = null;
  if (SIM || !stream || !window.MediaRecorder || !el.keepVideo.checked) return; // off unless switched on
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported?.(m));
  try { recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined); } catch { recorder = null; return; }
  chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.start(1000);
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve(null);
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/mp4' }));
    recorder.stop();
  });
}

async function keepAwake() {
  try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => { if (running && document.visibilityState === 'visible') keepAwake(); });

// ── start, stop, results ─────────────────────────────────────────────────────────────────────
async function start() {
  Voice.unlock();
  Beep.init();
  const tiltReady = SIM ? Promise.resolve(true) : Tilt.request();
  el.start.disabled = true;
  el.again.disabled = true;
  setStatus('Starting the camera.');
  try {
    if (!SIM) await startCamera();
  } catch (e) {
    setStatus(cameraError(e), true);
    el.start.disabled = false;
    el.again.disabled = false;
    show('home');
    return;
  }
  await tiltReady;
  keepAwake();
  if (SIM) sim = await makeSim();
  session = { at: new Date() };
  skipped.clear();
  warnings.clear();
  recent = [];
  show('run');
  running = true;
  el.start.disabled = false;
  el.again.disabled = false;
  go('phone', now());
}

function stop() {
  running = false;
  phase = null;
  Voice.stop();
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  stopCamera();
  wake?.release?.();
  show('home');
  setStatus('Stopped. Tap Start to begin again.');
}

async function finish() {
  running = false;
  phase = null;
  videoBlob = await stopRecording();
  stopCamera();
  wake?.release?.();
  lastResult = fit.advise(session.still, session.pedal);
  lastRows = fit.measures(lastResult, session.pedal);
  const previous = loadHistory()[0] || null;
  renderResults(lastResult, lastRows, previous);
  saveHistory(lastResult, lastRows);
  show('results');
  setTimeout(() => Voice.say(fit.spokenSummary(lastResult)), 2500);
}

let lastRows = [];
function renderResults(r, rows, previous) {
  el.rOverall.className = 'pill ' + r.overall;
  el.rOverall.textContent = fit.STATUS[r.overall];
  if (r.change) {
    el.rWhat.textContent = r.change.headline;
    el.rWhy.textContent = r.change.why;
  } else {
    el.rWhat.textContent = Number.isFinite(r.knee) ? 'Saddle height looks right' : 'Not enough to measure';
    el.rWhy.textContent = Number.isFinite(r.knee)
      ? `Your knee is bent ${round(r.knee)}° at the bottom of the stroke, inside the target.` + (r.overall === 'green' ? '' : ' One angle further down is outside its target; on its own that is not a reason to change anything.')
      : 'Film again, and keep the whole bike and your whole body in the picture.';
  }
  r.notes.forEach(n => { el.rWhy.textContent += ' ' + n; });
  el.rDisagree.hidden = !r.disagree;
  const WARN = { level: 'the phone was not confirmed level', moved: 'the phone moved while measuring', feet: 'your feet were cut off', head: 'your head was cut off',
    edge: 'you were cut off at the side', small: 'you were small in the picture', big: 'you filled the picture', centre: 'you were off centre', angle: 'the camera may have been at an angle', dark: 'the light was low' };
  const w = [...warnings].map(k => WARN[k]).filter(Boolean);
  el.rWarn.hidden = !w.length;
  el.rWarn.textContent = w.length ? `Less exact this time: ${w.join(', ')}.` : '';
  el.rList.replaceChildren(...rows.map((x) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="n"></span><span class="v"></span><span class="meta"><span class="pill"></span><span class="t"></span><span class="p"></span></span><span class="why"></span><span class="step"></span>';
    li.querySelector('.n').textContent = x.name;
    li.querySelector('.v').textContent = Number.isFinite(x.value) ? `${round(x.value)}°` : '–';
    const pill = li.querySelector('.pill');
    pill.className = 'pill ' + x.grade;
    pill.textContent = x.status;
    li.querySelector('.t').textContent = x.target;
    const was = previous?.values?.[x.key];
    li.querySelector('.p').textContent = Number.isFinite(was) && Number.isFinite(x.value) ? `Last time ${was}°` : '';
    li.querySelector('.why').textContent = x.why;
    li.querySelector('.step').textContent = x.step;
    return li;
  }));
  el.shotCard.hidden = !session.stillShot;
  if (session.stillShot) el.rShot.src = session.stillShot;
  el.saveVideo.hidden = !videoBlob;
}

function resultText(r) {
  return [
    `Bike Fit Coach, ${new Date().toLocaleString()}`,
    r.change ? `Main change: ${r.change.headline}.` : 'Main change: none.',
    ...lastRows.map(x => `${x.name}: ${Number.isFinite(x.value) ? round(x.value) + '°' : 'no reading'} (${x.target}), ${x.status}. ${x.step}`),
    `Pedal strokes measured: ${session.pedal?.strokes ?? 0}.`,
    warnings.size ? `Less exact: ${[...warnings].join(', ')}.` : '',
  ].filter(Boolean).join('\n');
}

const HKEY = 'bfc.history.v1';
function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; } }
function saveHistory(r, rows) {
  const h = loadHistory();
  const values = Object.fromEntries(rows.filter(x => Number.isFinite(x.value)).map(x => [x.key, round(x.value)]));
  h.unshift({ at: new Date().toISOString(), knee: round(r.knee), src: r.kneeSource, values, change: r.change ? r.change.headline : null });
  try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch { /* private mode: keep going without history */ }
  renderHistory();
}
function renderHistory() {
  const h = loadHistory();
  el.histCard.hidden = !h.length;
  el.history.replaceChildren(...h.slice(0, 8).map(s => {
    const li = document.createElement('li');
    const d = new Date(s.at);
    const a = document.createElement('span');
    a.textContent = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const b = document.createElement('span');
    b.className = 'num';
    b.textContent = `knee ${s.knee ?? '–'}°` + (s.change ? ` · ${s.change.toLowerCase()}` : ' · no change');
    li.append(a, b);
    return li;
  }));
}

function setStatus(msg, err = false) { el.status.textContent = msg; el.status.classList.toggle('err', err); }

async function saveVideo() {
  if (!videoBlob) return;
  const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const name = `bike-fit-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`;
  const file = new File([videoBlob], name, { type: videoBlob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Bike fit clip' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

el.start.addEventListener('click', start);
el.again.addEventListener('click', start);
el.stop.addEventListener('click', stop);
el.done.addEventListener('click', () => { show('home'); setStatus(landmarker || SIM ? 'Ready.' : ''); });
el.speak.addEventListener('click', () => { Voice.unlock(); if (lastResult) Voice.say(fit.spokenSummary(lastResult), { interrupt: true }); });
el.saveVideo.addEventListener('click', saveVideo);
el.copy.addEventListener('click', async () => {
  const text = resultText(lastResult);
  try { await navigator.clipboard.writeText(text); el.copy.textContent = 'Copied'; } catch { prompt?.('Copy your results:', text); }
  setTimeout(() => { el.copy.textContent = 'Copy results'; }, 2000);
});
el.skip.addEventListener('click', () => {
  const t = now();
  if (phase === 'phone') { skipped.add('level'); warnings.add('level'); Voice.say('Skipping the level check.', { interrupt: true }); go('mount', t); return; }
  if (phase === 'frame') {
    const key = ph.bad?.key;
    if (key) { skipped.add(key); warnings.add(key); Voice.say('Skipping that check.', { interrupt: true }); ph.bad = null; }
  }
});

// ── simulation: the whole flow with a synthetic rider ────────────────────────────────────────
async function makeSim() {
  const { synthPose } = await import('./test/synth.js');
  const low = params.has('low');
  Tilt.available = true;
  Tilt.landscape = true;
  return {
    frame(t) {
      const dt = t - phaseT0;
      Tilt.pitch = phase === 'phone' ? Math.max(0, 7 - 3 * dt) : 0.4;
      Tilt.roll = 0.3;
      let lm = null;
      const o = { noise: 1.2, hipShift: low ? [0, -35] : [0, 0] };
      if (phase === 'mount' && dt > 3) lm = synthPose(0, o);
      if (phase === 'frame') lm = synthPose(0, { ...o, farGap: dt < 5 ? -80 : 0 });
      if (phase === 'still') lm = synthPose(dt < 5 ? 0 : -Math.PI / 2, o);
      if (phase === 'pedal') lm = synthPose(-Math.PI / 2 + (dt < 2 ? 0 : (2 * Math.PI * (dt - 2)) / 1.1), o);
      return { lm, W: 1280, H: 720 };
    },
  };
}

// ── boot ─────────────────────────────────────────────────────────────────────────────────────
async function loadPose() {
  const { FilesetResolver, PoseLandmarker } = await import('./vendor/mediapipe/vision_bundle.mjs');
  const files = await FilesetResolver.forVisionTasks(new URL('vendor/mediapipe/wasm', location.href).href);
  let lastErr;
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: new URL('models/pose_landmarker_full.task', location.href).href, delegate },
        runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
    } catch (e) { lastErr = e; debug.errors.push(`${delegate}: ${e?.message || e}`); }
  }
  throw lastErr;
}

const VKEY = 'bfc.keepVideo';
try { el.keepVideo.checked = localStorage.getItem(VKEY) === '1'; } catch { /* default stays off */ }
el.keepVideo.addEventListener('change', () => { try { localStorage.setItem(VKEY, el.keepVideo.checked ? '1' : '0'); } catch { /* not remembered */ } });

async function boot() {
  Voice.init();
  renderHistory();
  requestAnimationFrame(loop);
  if (SIM) {
    el.start.disabled = false;
    el.start.textContent = 'Start the simulation';
    setStatus('Simulation: no camera, a made-up rider on a made-up bike.');
    return;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('This browser cannot use the camera. Open the page in Safari or Chrome.', true);
    el.start.textContent = 'Camera not available';
    return;
  }
  setStatus('Getting the pose model ready. The first time it downloads about 20 MB.');
  try {
    landmarker = await loadPose();
    el.start.disabled = false;
    el.start.textContent = 'Start';
    setStatus('Ready. The pose model runs on this phone.');
  } catch (e) {
    setStatus('The pose model did not load (' + (e?.message || e) + '). Check the connection and reload the page.', true);
    el.start.textContent = 'Not ready';
  }
}
boot();
