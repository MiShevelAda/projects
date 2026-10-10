// Bike Fit Coach: the camera, the voice, the tilt sensor and the step-by-step flow.
// The measuring maths lives in fit.js. Add ?sim to the URL to walk the whole flow with a
// synthetic rider and no camera (add &low for a rider whose saddle is too low).

import * as fit from './fit.js';

const params = new URLSearchParams(location.search);
const SIM = params.has('sim');
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(['home', 'run', 'results', 'start', 'status', 'cam', 'overlay', 'say', 'steps', 'chips', 'skip', 'stop', 'timer',
  'histCard', 'history', 'homeScreenTip', 'rOverall', 'rWhat', 'rWhy', 'rDisagree', 'rWarn', 'rList', 'keepVideo', 'shotCard', 'rShot', 'again', 'speak', 'saveVideo', 'copy', 'done',
  'retestCard', 'retestText', 'histLatest', 'painNo', 'painYes', 'rPain', 'rCompare', 'rMade', 'rMadeAsk', 'rMadeMmRow', 'rMadeMm', 'rMadeYes', 'rMadeNo', 'rMadeTip', 'rMadeSaved']
  .map(id => [id, $(id)]));
const now = () => performance.now() / 1000;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const round = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// ── voice ────────────────────────────────────────────────────────────────────────────────────
// Speaking time, estimated, for when the browser never reports the end of a line: about 150 words a
// minute (a second-hand figure), faster in the simulation so it does not drag.
const RATE = SIM ? 12 : 2.5; // words per second
const Voice = {
  last: new Map(), voice: null,
  pending: 0, doneAt: 0, gen: 0, // queued lines, when the last one should end, and which queue they belong to
  init() {
    if (!('speechSynthesis' in window)) return;
    el.say.removeAttribute('aria-live'); // it is spoken already; VoiceOver would say it twice
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
  // every: seconds before the same key may be said again. interrupt: cut whatever is playing, only
  // for the few lines that are urgent. Returns whether it was said.
  say(text, { key = text, every = 0, interrupt = false } = {}) {
    const t = now();
    if (every && this.last.has(key) && t - this.last.get(key) < every) return false;
    this.last.set(key, t);
    el.say.textContent = text;
    log('say', text);
    debug.speech.push({ t, text, interrupt });
    if (interrupt) this.cancel();
    this.doneAt = Math.max(this.doneAt, t) + text.split(/\s+/).length / RATE + 0.5;
    if (!('speechSynthesis' in window)) return true;
    const u = new SpeechSynthesisUtterance(text), gen = this.gen;
    if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
    u.onend = u.onerror = () => {
      if (gen !== this.gen) return; // a line from a queue that was cancelled
      this.pending = Math.max(0, this.pending - 1);
      if (!this.pending) this.doneAt = now();
    };
    this.pending++;
    speechSynthesis.speak(u);
    return true;
  },
  cancel() {
    this.gen++;
    this.pending = 0;
    this.doneAt = now();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
  stop() { this.cancel(); },
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
  available: false, denied: false, landscape: false, pitch: 0, roll: 0, g: null, listening: false,
  request() { // must be called straight from a tap on iOS
    const DM = window.DeviceMotionEvent;
    const listen = () => {
      if (!this.listening) window.addEventListener('devicemotion', (e) => this.onMotion(e));
      this.listening = true;
      return true;
    };
    if (DM && typeof DM.requestPermission === 'function') {
      return DM.requestPermission().then(s => {
        if (s === 'granted') return listen();
        this.denied = s === 'denied';
        return false;
      }).catch(() => false);
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
let session = null, lastResult = null, summaryTimer = null, lastId = null;
let riderSeen = false;
// "Do you get pain or numbness when you ride?" Health information, so it lives only in this variable
// until the page is closed: never in localStorage, history or Copy results.
let pain = false;
let lastFrameAt = 0, camWarned = false, recovering = false, recoverTries = 0, detectFails = 0;
const skipped = new Set(), warnings = new Set();
const debug = { phase: () => phase, poses: 0, frames: 0, said: [], speech: [], errors: [] };
window.__bfc = debug;
function log(kind, msg) { if (kind === 'say') debug.said.push(msg); }

const STEP_ORDER = ['phone', 'mount', 'frame', 'still', 'pedal'];
function go(name, t, reason) {
  phase = name;
  phaseT0 = t;
  ph = {};
  el.timer.hidden = true;
  el.skip.hidden = !['phone', 'frame'].includes(name);
  el.skip.textContent = 'Skip this check';
  const i = STEP_ORDER.indexOf(name);
  for (const s of el.steps.children) {
    const j = STEP_ORDER.indexOf(s.dataset.step);
    s.className = j < i ? 'done' : j === i ? 'on' : '';
    if (j === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
  }
  HANDLERS[name].enter(t, reason);
}

// Seconds since the step began and everything queued has been spoken: step clocks start when the
// instruction has been heard, not when it was queued.
const quiet = (t) => t - Math.max(phaseT0, Voice.doneAt);

function show(screen) {
  for (const s of ['home', 'run', 'results']) el[s].hidden = s !== screen;
  window.scrollTo(0, 0);
}

// ── the steps ────────────────────────────────────────────────────────────────────────────────
const HANDLERS = {
  phone: {
    enter(t, reason) {
      session.levelled = false;
      if (reason === 'moved') Voice.say('The phone moved. Level it again. I will beep until it is level.', { interrupt: true });
      // The filming guide puts the lens 60 to 80 cm off the floor; a phone on a bare chair seat sits lower.
      else Voice.say('Turn the phone sideways and stand it upright, not leaning back, on something 60 to 80 centimetres high. A chair with a box on it works. Put it about 3 metres from the side of the bike, facing the pedals. I will beep until it is level, and the beeps get faster as you get close.');
    },
    tick({ t }) {
      if (!Tilt.available) {
        // No motion sensor (or motion not allowed): level by eye against a line on the screen, then
        // tap the button. It moves on by itself 30 s after the line ends (a design choice).
        if (!ph.noSensor && quiet(t) > 1) {
          ph.noSensor = t;
          if (Tilt.denied) Voice.say('You did not allow motion, so I cannot beep for level. Next time, tap Allow when asked.');
          Voice.say('I cannot use the motion sensor, so level the phone by eye. Turn it until the floor in the picture runs parallel to the white line. Then tap the button on the screen.');
          el.skip.textContent = 'It is level';
        }
        if (ph.noSensor && quiet(t) > 30) levelByEye(t);
        return;
      }
      if (!Tilt.landscape) { ph.since = null; if (quiet(t) > 1) Voice.say('Turn the phone sideways.', { key: 'sideways', every: 8 }); return; }
      if (innerHeight > innerWidth) {
        if (quiet(t) > 1 && Voice.say((ph.lockN || 0) < 3
          ? 'The screen is stuck upright. Open Control Centre: swipe down from the top-right corner, then tap the lock with the circle arrow. Then turn the phone sideways again.'
          : 'If you cannot find it, tap Stop. The steps are on the home screen.', { key: 'lock', every: 14 })) ph.lockN = (ph.lockN || 0) + 1;
        return;
      }
      if (Tilt.level()) {
        ph.since ??= t;
        if (t - ph.since > 1.2) {
          Beep.chime();
          Voice.say('Level. Leave the phone there.');
          session.levelled = true;
          go('mount', t);
        }
        return;
      }
      ph.since = null;
      const e = Tilt.error();
      if (!ph.beep || t - ph.beep > Math.min(1, 0.12 + 0.07 * e)) { ph.beep = t; Beep.tone(e > 3 ? 440 : 620); }
      if (quiet(t) > 14) Voice.say('Not level yet. Tilt it slowly until the beeping stops.', { key: 'tilt', every: 14 });
    },
  },

  mount: {
    enter() {
      Voice.say('Now get on the bike in your normal riding position, hands on the hoods. Lean lightly on the wall, or have your helper hold the bike from the far side.');
    },
    tick({ t, rider }) {
      if (quiet(t) < 6) return; // time to walk over and get on, once the instruction has been heard
      if (rider) {
        ph.since ??= t;
        if (t - ph.since > 1.5) go('frame', t);
      } else {
        ph.since = null;
        if (quiet(t) > (ph.nags ? 14 : 20)) {
          // A different line each time, ending with the way out, rather than one sentence forever.
          ph.nags = (ph.nags || 0) + 1;
          Voice.say(ph.nags === 1 ? 'I cannot see you on the bike yet. Make sure the phone can see you and the whole bike.'
            : ph.nags === 2 ? 'I still cannot see you. Sit on the saddle, hands on the hoods, and keep still for a moment.'
            : ph.nags <= 5 ? 'Still nothing. Walk to the phone and check the whole bike is in the middle of the screen. Then get back on.'
            : 'If it still does not work, tap Stop on the screen. The tips are on the home screen.');
        }
      }
    },
  },

  frame: {
    enter() { Voice.say('Checking the picture. Stay in position.'); ph.tries = {}; },
    tick({ t, lm, side, W, H, rider }) {
      if (!rider) {
        ph.ok = null; ph.bad = null; // ph.lastBad stays, so Skip still knows what to skip
        // After asking the rider to get off and fix the phone, give them time before "lost you".
        lost(t, ph.askedOff && t - ph.askedOff < 30 ? 30 : 8);
        return;
      }
      ph.lostSince = null;
      const problem = firstProblem(lm, side, W, H, t);
      if (!problem) {
        ph.bad = null;
        ph.ok ??= t;
        if (t - ph.ok > 2) { Voice.say(ph.skippedAny ? 'Carrying on.' : 'The picture looks good.'); go('still', t); }
        return;
      }
      ph.ok = null;
      if (ph.bad?.key !== problem.key) ph.bad = ph.lastBad = { key: problem.key, since: t };
      if (t - ph.bad.since < 1.5) return;
      const n = ph.tries[problem.key] || 0;
      if (n >= 3) {
        if (quiet(t) < 11) return; // the third try gets its time too
        skipCheck(problem.key);
        Voice.say('I will carry on without this check. The numbers may be less exact.');
        return;
      }
      if (quiet(t) < (n ? 8 : 1)) return; // after a correction, time to get off and move the phone (a design choice)
      const said = `Get off the bike for a moment. ${problem.say} Then get back on.` + (n === 2 ? ' If you cannot fix it, tap Skip on the screen.' : '');
      if (Voice.say(said, { key: problem.key, every: 11 })) { ph.tries[problem.key] = n + 1; ph.askedOff = t; }
    },
  },

  still: {
    enter() {
      startRecording();
      Voice.say('Put the pedal nearest the phone at the very bottom, crank pointing straight down, foot the way it sits when you ride. Then hold still.');
    },
    tick({ t, lm, side, W, H, ang, rider }) {
      if (!rider) {
        // A frame or two without the rider during a capture is the tracker, not the rider moving.
        if (ph.cap) { ph.cap.gone ??= t; if (t - ph.cap.gone > 0.3) ph.cap = null; return; }
        lost(t);
        return giveUpStill(t);
      }
      ph.lostSince = null;
      if (ph.cap) ph.cap.gone = null;
      if (!ph.cap) {
        if (giveUpStill(t)) return;
        if (ph.retry && t - ph.retry < 2.5) return;
        const win = recent.filter(r => r.t > t - 1).map(r => r.lm);
        const still = win.length >= 3 && fit.motion(win, side, W, H) < 0.035;
        const atBottom = ang.kneeFlex < 55;
        if (still && atBottom && quiet(t) > 0.5) {
          ph.cap = { t0: t, angles: [], lms: [] };
          Voice.say('Hold it. Three. Two. One.', { interrupt: true });
        } else if (quiet(t) > 11) {
          Voice.say(atBottom ? 'Hold still for a moment.' : 'Push the pedal nearest the phone all the way to the bottom, and hold still.', { key: 'nudge', every: 11 });
        }
        return;
      }
      ph.cap.angles.push(ang);
      ph.cap.lms.push(lm);
      if (fit.motion(ph.cap.lms, side, W, H) > 0.06) {
        ph.cap = null;
        ph.retry = t;
        ph.moves = (ph.moves || 0) + 1;
        if (ph.moves >= 3) { Voice.say('You moved.', { interrupt: true }); giveUpStill(t, true); return; }
        Voice.say("You moved. Let's try again.", { interrupt: true });
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
      Voice.say('Now pedal backwards, smooth and steady, so the bike stays still. I start timing at the beep. Keep going until I say stop.');
      ph.samples = [];
      ph.said = {};
    },
    tick({ t, ang, rider }) {
      if (rider) { ph.samples.push({ t, ...ang }); ph.lostSince = null; }
      // Out of sight for more than 2 s: say so, instead of a pedalling line to someone the phone cannot see.
      const gone = !rider && lost(t, 2);
      const win = ph.samples.filter(s => s.t > t - 2);
      const moving = win.length > 5 && fit.isPedalling(win, fit.median(win.map(s => s.thigh)) * 2);
      if (moving) ph.lastMove = t;
      if (!ph.started) {
        // Timing starts at the frame the turning is first seen, so held-still frames never count as strokes.
        if (moving) { ph.started = t; ph.checkAt = t + 2; Beep.tone(880, 0.08); }
        else if (t - phaseT0 > 40) {
          Voice.say(session.still ? 'I could not see the pedals turning, so I can only give you the held-still reading.'
            : 'I could not see the pedals turning, so there is not enough to measure this time.');
          finish();
        } else if (!gone && quiet(t) > 10) Voice.say('I cannot see the pedals turning. Pedal backwards, slowly and steadily.', { key: 'nopedal', every: 10 });
        return;
      }
      const e = t - ph.started;
      const since = () => ph.samples.filter(s => s.t >= ph.started);
      // Only on a frame where the rider is seen: out of sight, the "lost" line above speaks instead.
      if (rider && t - ph.lastMove > 3) Voice.say('Keep pedalling backwards.', { key: 'keep', every: 6 });
      // Every 2 s: is the phone getting enough frames from each turn of the pedals? Only the strokes
      // of the last 6 s count, and nothing is said while the rider is out of sight (fit.slowerTurn).
      if (t >= ph.checkAt) {
        ph.checkAt = t + 2;
        const secs = fit.slowerTurn(since(), t);
        if (secs != null) Voice.say(`Slower, please. About one turn every ${secs} seconds.`, { key: 'slower', every: 8 });
      }
      if (e <= 20) {
        el.timer.hidden = false;
        el.timer.textContent = Math.max(0, Math.ceil(20 - e));
        if (e > 10 && !ph.said[10]) { ph.said[10] = 1; Voice.say('Ten seconds left.'); }
        if (e > 15 && !ph.said[15]) { ph.said[15] = 1; Voice.say('Five more seconds.'); }
        return;
      }
      // After 20 s: finish once there are 5 strokes the phone sampled well enough. If it saw only
      // fast ones, keep going up to 40 s (a design choice), then finish with whatever there is.
      if (ph.sumAt && t - ph.sumAt < 0.5 && e <= 40) return;
      ph.sumAt = t;
      const summary = fit.summarisePedal(since());
      if (summary.strokes < 5 && e <= 40) {
        el.timer.hidden = true;
        if (!ph.said.more && !gone) { ph.said.more = 1; Voice.say('Keep going, a little slower. A few more turns.'); }
        return;
      }
      if (summary.strokes < 5 && summary.strokesSeen > summary.strokes) warnings.add('fast');
      session.pedal = summary;
      Beep.chime();
      Voice.say('Stop. Well done, you can relax.', { interrupt: true });
      finish();
    },
  },
};

// Every step has a way out. The limits here (8 s lost, 2 s lost while pedalling, 0.3 s of tracker drop-out during a capture,
// 3 tries or 45 s for the still reading, 40 s to start pedalling, and the 40 s pedalling limit) are
// design choices, not published numbers.
// True once the rider has been out of sight for longer than wait.
function lost(t, wait = 8) {
  ph.lostSince ??= t;
  if (!(t - ph.lostSince > wait)) return false;
  Voice.say('I have lost you. Make sure the phone can see you and the whole bike.', { key: 'lost', every: 14 });
  return true;
}

// The still reading is a cross-check, so after 3 tries or 45 s without one the pedalling goes ahead alone.
function giveUpStill(t, force = false) {
  if (!force && (ph.cap || t - phaseT0 <= 45)) return false;
  Voice.say('I could not get a still reading. That is fine, we will use the pedalling instead.');
  session.still = null;
  go('pedal', t);
  return true;
}

// The phone step without a motion sensor: the rider says it is level (or 30 s pass).
function levelByEye(t) {
  skipped.add('level');
  warnings.add('level');
  go('mount', t);
}

function skipCheck(key) {
  skipped.add(key);
  warnings.add(key);
  ph.bad = ph.lastBad = null;
  ph.skippedAny = true;
}

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
    // Without new frames nothing below runs, so a stopped camera would mean silence. Notice it.
    // "No new frame" means the video itself stopped advancing, not a slow pose model.
    const fresh = el.cam.readyState >= 2 && el.cam.currentTime !== lastVideoTime;
    if (fresh) {
      lastFrameAt = t;
      camWarned = false;
      recoverTries = 0;
    } else if (phase && lastFrameAt && t - lastFrameAt > 2 && !camWarned && !recovering) {
      camWarned = true;
      Voice.say('The camera stopped. Come back to the phone.', { interrupt: true });
      recoverCamera(true);
    }
    if (!landmarker || !fresh) return;
    lastVideoTime = el.cam.currentTime;
    W = el.cam.videoWidth;
    H = el.cam.videoHeight;
    try {
      const res = landmarker.detectForVideo(el.cam, performance.now());
      lm = res.landmarks?.[0] || null;
      detectFails = 0;
    } catch (e) {
      if (debug.errors.length < 50) debug.errors.push(String(e));
      if (++detectFails >= 30) {
        stop();
        setStatus('The pose model stopped working. Reload the page, then tap Start.', true);
      }
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
    // The camera-side leg is settled while the picture is checked, then locked: measuring the far
    // leg gives wrong numbers (filming guide), so it must not switch in the middle of a reading.
    if ((phase === 'mount' || phase === 'frame') && ++sideCache.n % 15 === 1) sideCache.side = fit.nearSide(recent.slice(-30).map(r => r.lm));
    side = sideCache.side;
    ang = fit.frameAngles(lm, side, W, H);
    rider = ang.vis > 0.5 && fit.isRiding(ang);
  }
  riderSeen = rider;
  // A phone that gets moved during setup has to be levelled again.
  if ((phase === 'mount' || phase === 'frame') && Tilt.available && !skipped.has('level')) {
    if (!Tilt.level() || !Tilt.landscape) {
      ph.tiltBad ??= t;
      if (t - ph.tiltBad > 2.5) { go('phone', t, 'moved'); return; }
    } else ph.tiltBad = null;
  }
  // Only a phone that was confirmed level can be said to have moved.
  if ((phase === 'still' || phase === 'pedal') && session.levelled && Tilt.available && !Tilt.level()) warnings.add('moved');
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
  if (phase === 'phone' && ph.noSensor) { // levelling by eye: a straight line across the middle
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(ox, oy + (H * s) / 2); g.lineTo(ox + W * s, oy + (H * s) / 2); g.stroke();
  }
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
    // A kept clip goes to the full analysis, whose filming guide asks for 1080p or more. The pedalling
    // step's frames-per-stroke check protects the reading if bigger frames slow the pose model.
    video: el.keepVideo.checked
      ? { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  });
  el.cam.srcObject = stream;
  await el.cam.play().catch(() => {});
  // iOS ends or mutes the camera when the page goes to the background or another app takes it.
  const tr = stream.getVideoTracks()[0];
  const lostTrack = () => { if (running && document.visibilityState === 'visible') recoverCamera(); };
  tr?.addEventListener('ended', lostTrack);
  tr?.addEventListener('mute', lostTrack);
}

// Restart a camera that has ended, been muted or (force) stopped sending frames, then repeat the
// current step. If it cannot be restarted, stop and say so on the home screen.
async function recoverCamera(force = false) {
  if (SIM || !running || recovering) return;
  const tr = stream?.getVideoTracks()[0];
  if (!force && tr && tr.readyState !== 'ended' && !tr.muted) return;
  recovering = true;
  try {
    if (++recoverTries > 2) throw new Error('no frames after restarting the camera');
    if (recorder && recorder.state !== 'inactive') recorder.stop(); // the clip ends there
    stopCamera();
    await startCamera();
    if (!running) return;
    lastFrameAt = now();
    Voice.say('The camera is back. Let us do this step again.');
    if (phase) go(phase, now());
  } catch {
    stop();
    setStatus('The camera stopped. Tap Start to begin again.', true);
  } finally {
    recovering = false;
  }
}

function stopCamera() {
  stream?.getTracks().forEach(tr => tr.stop());
  stream = null;
  el.cam.srcObject = null;
}

function cameraError(e) {
  if (e && e.name === 'NotAllowedError') {
    if (navigator.standalone) return 'Camera access is off. On iPhone: Settings, Apps, Safari, Camera, Allow. Then close this app fully and open it again.';
    if (isIOS) return 'Camera access is off. In Safari, tap aA in the address bar, then Website Settings, then Camera, then Allow. Then tap Start again.';
    return 'Camera access is off. Allow the camera for this page in your browser settings, then tap Start again.';
  }
  if (e && e.name === 'NotFoundError') return 'No camera found on this device.';
  return 'The camera did not start: ' + (e?.message || e);
}

function startRecording() {
  videoBlob = null;
  if (SIM || !stream || !window.MediaRecorder || !el.keepVideo.checked) return; // off unless switched on
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported?.(m));
  let r;
  try { r = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined); } catch { recorder = null; return; }
  recorder = r;
  chunks = [];
  r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  r.onstop = () => { if (chunks.length) videoBlob = new Blob(chunks, { type: r.mimeType || 'video/mp4' }); };
  r.start(1000);
  // A design choice: 3 minutes is longer than any session, and stops a forgotten recorder filling the phone.
  setTimeout(() => { if (r.state === 'recording') r.stop(); }, 180000);
}

// Resolves with the clip once the recorder has stopped (it may have stopped already).
function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve(videoBlob);
    recorder.addEventListener('stop', () => resolve(videoBlob), { once: true });
    recorder.stop();
  });
}

async function keepAwake() {
  try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!running || document.visibilityState !== 'visible') return;
  keepAwake();
  if (lastFrameAt) lastFrameAt = now(); // no frames while hidden is not a stopped camera; restart the clock
  recoverCamera();
});

// ── start, stop, results ─────────────────────────────────────────────────────────────────────
function quietResults() {
  clearTimeout(summaryTimer);
  summaryTimer = null;
  Voice.stop();
}

async function start() {
  quietResults();
  el.rShot.removeAttribute('src');
  if (session) session.stillShot = null;
  Voice.unlock();
  // Web Audio is muted by the silent switch unless the page asks for playback (not in every browser).
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
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
  Voice.last.clear();
  videoBlob = null;
  lastFrameAt = 0;
  camWarned = false;
  recoverTries = 0;
  detectFails = 0;
  skipped.clear();
  warnings.clear();
  recent = [];
  sideCache = { side: 'L', n: 0 };
  show('run');
  running = true;
  el.start.disabled = false;
  el.again.disabled = false;
  go('phone', now());
}

function stop() {
  running = false;
  phase = null;
  quietResults();
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
  const history = loadHistory();
  const previous = history[0] || null;
  // A change marked "I made this change" last time is checked against this reading (fit.judgeChange).
  const advice = fit.advise(session.still, session.pedal);
  lastResult = fit.withRetest(advice, fit.judgeChange(fit.pendingChange(history), { knee: advice.knee, src: advice.kneeSource }));
  lastRows = fit.measures(lastResult, session.pedal);
  lastAreas = fit.areas(lastResult, lastRows);
  lastId = saveHistory(lastResult, lastRows, lastAreas);
  renderResults(lastResult, lastRows, previous);
  show('results');
  summaryTimer = setTimeout(() => { summaryTimer = null; Voice.say(fit.spokenSummary(lastResult, { pain })); }, 2500);
}

let lastRows = [], lastAreas = [];
function renderResults(r, rows, previous) {
  el.rOverall.className = 'pill ' + r.overall;
  el.rOverall.textContent = fit.STATUS[r.overall];
  // The headline and its reason depend on the verdict (fit.advise): a change, no change, two
  // readings that point different ways, only the held-still reading, or nothing measured.
  // Pain or numbness first: for those riders a phone check is only a starting point.
  el.rPain.hidden = !pain;
  el.rPain.textContent = pain ? fit.painNote(r) : '';
  const h = fit.headline(r);
  el.rWhat.textContent = h.what;
  el.rWhy.textContent = [h.why, ...r.notes].join(' ');
  // Before and after a change marked last time, with how much it should have moved.
  el.rCompare.hidden = !r.retest;
  el.rCompare.textContent = r.retest?.text || '';
  renderMade(r.change);
  el.rDisagree.hidden = !r.stillOut;
  const WARN = { level: 'the phone was not confirmed level', moved: 'the phone moved while measuring', feet: 'your feet were cut off', head: 'your head was cut off',
    edge: 'you were cut off at the side', fast: 'you pedalled faster than this phone could measure', small: 'you were small in the picture', big: 'you filled the picture', centre: 'you were off centre', angle: 'the camera may have been at an angle', dark: 'the light was low' };
  const w = [...warnings].map(k => WARN[k]).filter(Boolean);
  el.rWarn.hidden = !w.length;
  el.rWarn.textContent = w.length ? `Less exact this time: ${w.join(', ')}.` : '';
  // One item per area (fit.areas): its name and status, why, and one step, then the angles behind
  // it as detail, with no status or step of their own. "More numbers" starts folded away.
  const label = previous ? dayLabel(previous.at) : '';
  el.rList.replaceChildren(...lastAreas.map((a) => {
    const li = document.createElement('li');
    li.className = 'area ' + a.key;
    const detail = document.createElement('ul');
    detail.className = 'detail';
    detail.append(...a.rows.map(x => detailRow(x, previous, label)));
    if (a.key === 'more') {
      const d = document.createElement('details');
      d.innerHTML = '<summary></summary><p class="why"></p>';
      d.querySelector('summary').textContent = a.name;
      d.querySelector('.why').textContent = a.why;
      d.append(detail);
      li.append(d);
      return li;
    }
    li.innerHTML = '<div class="head"><span class="an"></span><span class="pill"></span></div><p class="why"></p><p class="step"></p>';
    li.querySelector('.an').textContent = a.name;
    const pill = li.querySelector('.pill');
    pill.className = 'pill ' + a.grade;
    pill.textContent = a.status;
    li.querySelector('.why').textContent = a.why;
    li.querySelector('.step').textContent = a.step;
    li.append(detail);
    return li;
  }));
  // The picture is titled "at the bottom of the stroke", so not shown when the crank was not there.
  const shot = Number.isFinite(r.stillOffBottom) ? null : session.stillShot;
  el.shotCard.hidden = !shot;
  if (shot) el.rShot.src = shot;
  el.saveVideo.hidden = !videoBlob;
}

// "Did you make this change?": the only way the app learns what was really changed. Only the change
// (which way and how many millimetres) and when are stored, in the history entry for this session.
// One measurement under its area: name, value, target, why, and how it compares with last time.
function detailRow(x, previous, label) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="n"></span><span class="v"></span><span class="meta"><span class="t"></span><span class="p"></span></span><span class="why"></span>';
  li.querySelector('.n').textContent = x.name;
  li.querySelector('.v').textContent = Number.isFinite(x.value) ? `${round(x.value)}°` : '–';
  li.querySelector('.t').textContent = x.target;
  // Compared with the last session, inside the camera's error (fit.compareLast). The hip is for
  // reference only and is not compared.
  if (previous && x.grade !== 'info') {
    const c = fit.compareLast(x.value, previous.values?.[x.key], label);
    li.querySelector('.p').textContent = c && previous.warn?.length ? `${c}, a less exact session` : c;
  }
  li.querySelector('.why').textContent = x.why;
  return li;
}

function renderMade(change) {
  el.rMade.hidden = !change;
  if (!change) return;
  const saddle = change.kind === 'saddle';
  el.rMadeAsk.hidden = false;
  el.rMadeSaved.hidden = true;
  el.rMadeMmRow.hidden = !saddle;
  el.rMadeTip.hidden = !saddle;
  if (saddle) el.rMadeMm.value = change.mm[0];
}

function markMade() {
  const made = fit.madeChange(lastResult?.change, el.rMadeMm.value, new Date().toISOString());
  if (!made || !lastId) return;
  const h = loadHistory(), entry = h.find(s => s.at === lastId);
  let saved = false;
  if (entry) {
    entry.made = made;
    try { localStorage.setItem(HKEY, JSON.stringify(h)); saved = true; } catch { /* private mode */ }
  }
  el.rMadeAsk.hidden = true;
  el.rMadeSaved.hidden = false;
  el.rMadeSaved.textContent = saved ? 'Saved. Next time you film, I will check what it did.'
    : 'This browser is not keeping your sessions, so I cannot check it next time.';
  renderHistory();
}

function resultText(r) {
  return [
    `Bike Fit Coach, ${new Date().toLocaleString()}`,
    `Result: ${fit.headline(r).what}.`,
    r.retest ? r.retest.text : '',
    ...lastAreas.flatMap(a => [
      `${a.name}: ${a.status}. ${a.step}`,
      ...a.rows.map(x => `  ${x.name}: ${Number.isFinite(x.value) ? round(x.value) + '°' : 'no reading'} (${x.target})`),
    ]),
    `Pedal strokes measured: ${session.pedal?.strokes ?? 0}.`,
    warnings.size ? `Less exact: ${[...warnings].join(', ')}.` : '',
  ].filter(Boolean).join('\n');
}

const HKEY = 'bfc.history.v1';
function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; } }
function saveHistory(r, rows, areas) {
  const h = loadHistory();
  const values = Object.fromEntries(rows.filter(x => Number.isFinite(x.value)).map(x => [x.key, round(x.value)]));
  // 'at' doubles as the session's id, so "I made this change" can find this entry again.
  const at = new Date().toISOString();
  const grades = Object.fromEntries(areas.filter(a => a.key !== 'more').map(a => [a.key, a.grade]));
  // held: this session's retest held the next change back, so the change it checked stays waiting
  // for one more film (fit.pendingChange).
  h.unshift({ at, knee: round(r.knee), src: r.kneeSource, values, areas: grades, change: r.change ? r.change.headline : null, warn: [...warnings], ...(r.held ? { held: true } : {}) });
  try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch { /* private mode: keep going without history */ }
  renderHistory();
  return at;
}
const dayLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
function renderHistory() {
  const h = loadHistory();
  // The retest card comes first on the home screen while a marked change is waiting to be checked.
  const pending = fit.pendingChange(h);
  el.retestCard.hidden = !pending;
  el.retestText.textContent = pending ? fit.retestPrompt(pending.made, dayLabel(pending.made.at || pending.at)) : '';
  el.histCard.hidden = !h.length;
  // The newest session's two areas, like a summary you can glance at.
  const latest = h[0];
  el.histLatest.hidden = !latest?.areas;
  if (latest?.areas) {
    const line = document.createElement('span');
    line.textContent = `Your fit, last checked ${dayLabel(latest.at)}`;
    el.histLatest.replaceChildren(line, areaPills(latest.areas));
  }
  el.history.replaceChildren(...h.slice(0, 8).map(s => {
    const li = document.createElement('li');
    const d = new Date(s.at);
    const a = document.createElement('span');
    a.className = 'when';
    a.textContent = dayLabel(s.at) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      + (s.change ? ` · ${s.change.toLowerCase()}` : ' · no change');
    // Sessions saved before the areas existed show their knee reading instead.
    let b;
    if (s.areas) b = areaPills(s.areas);
    else { b = document.createElement('span'); b.className = 'num small'; b.textContent = `knee ${s.knee ?? '–'}°`; }
    li.append(a, b);
    return li;
  }));
}
function areaPills(g) {
  const wrap = document.createElement('span');
  wrap.className = 'pills';
  for (const [key, name] of [['saddle', 'Saddle'], ['reach', 'Reach']]) {
    const p = document.createElement('span');
    const grade = fit.STATUS[g[key]] ? g[key] : 'na';
    p.className = 'pill sm ' + grade;
    p.textContent = `${name}: ${fit.STATUS[grade]}`;
    wrap.append(p);
  }
  return wrap;
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
el.done.addEventListener('click', () => {
  quietResults();
  // The picture is only for the results screen; it is not kept once you leave it.
  el.rShot.removeAttribute('src');
  if (session) session.stillShot = null;
  show('home');
  setStatus(landmarker || SIM ? 'Ready.' : '');
});
el.speak.addEventListener('click', () => { Voice.unlock(); if (lastResult) Voice.say(fit.spokenSummary(lastResult, { pain }), { interrupt: true }); });
el.rMadeYes.addEventListener('click', markMade);
function setPain(v) {
  pain = v;
  el.painYes.setAttribute('aria-pressed', String(v));
  el.painNo.setAttribute('aria-pressed', String(!v));
}
el.painYes.addEventListener('click', () => setPain(true));
el.painNo.addEventListener('click', () => setPain(false));
el.rMadeNo.addEventListener('click', () => { el.rMade.hidden = true; });
el.saveVideo.addEventListener('click', saveVideo);
el.copy.addEventListener('click', async () => {
  const text = resultText(lastResult);
  try { await navigator.clipboard.writeText(text); el.copy.textContent = 'Copied'; } catch { prompt?.('Copy your results:', text); }
  setTimeout(() => { el.copy.textContent = 'Copy results'; }, 2000);
});
el.skip.addEventListener('click', () => {
  const t = now();
  if (phase === 'phone') {
    if (ph.noSensor) { levelByEye(t); return; } // the button reads "It is level"
    skipped.add('level'); warnings.add('level'); Voice.say('Skipping the level check.', { interrupt: true }); go('mount', t); return;
  }
  if (phase === 'frame') {
    // The rider may have stepped off to reach the phone, so the last problem seen still counts.
    const key = ph.bad?.key ?? ph.lastBad?.key;
    if (key) { skipCheck(key); Voice.say(riderSeen ? 'Skipping that check.' : 'Skipped. Get back on the bike.', { interrupt: true }); }
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
  // Safari can delete a site's storage after 7 days without a visit; a Home Screen web app keeps
  // its own count (WebKit, "Full Third-Party Cookie Blocking and More", 2020).
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  el.homeScreenTip.hidden = !(isIOS && !standalone);
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
    setStatus('Ready. Everything runs on this phone.');
  } catch (e) {
    setStatus('The pose model did not load (' + (e?.message || e) + '). Check the connection and reload the page.', true);
    el.start.textContent = 'Not ready';
  }
}
boot();
