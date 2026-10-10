// Bike Fit Coach: the camera, the voice, the tilt sensor and the step-by-step flow.
// The measuring maths lives in fit.js. Add ?sim to the URL to walk the whole flow with a
// synthetic rider and no camera (add &low for a rider whose saddle is too low). &setup=trainer,
// wall or friend answers "How will your bike stay up?" (also without ?sim). In the simulation:
// &helper=visible (a friend standing near the bike, in view), &helper=lean (leaning in at the
// rider's hip, almost in riding posture) or &helper=braced (half-crouched behind the rider's hip,
// knees bent, a hand to the stem, so they sit like a rider) adds a second made-up person, there
// from the start; &late=<s> has the rider get on s seconds into the "get on the bike" step, and
// &back=<s> s into each later one (3 by default); &pedal=wrong pedals the wrong way for the setup,
// &pedal=stop stops the pedals 4 s after the timing starts, &pedal=none never turns them; &away=<s>
// takes the rider out of view for s seconds while holding still; &slide=<px>: after a picture
// correction the phone is turned or slid along without tilting it, and the rider gets back on <px>
// further along in the picture; &unfixed: moving the phone does not fix the picture, so the same
// check asks again; &arrive=<step>: a helper comes to the rider's hip in that step (see makeSim).

import * as fit from './fit.js';

const params = new URLSearchParams(location.search);
const SIM = params.has('sim');
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(['home', 'run', 'results', 'start', 'status', 'cam', 'overlay', 'say', 'sayNote', 'runSetup', 'phoneList', 'steps', 'chips', 'skip', 'stop', 'timer',
  'histCard', 'history', 'homeScreenTip', 'rOverall', 'rWhat', 'rWhy', 'rDisagree', 'rWarn', 'rList', 'keepVideo', 'shotCard', 'rShot', 'again', 'speak', 'saveVideo', 'copy', 'done',
  'retestCard', 'retestText', 'retestStart', 'histLatest', 'painNo', 'painYes', 'rPain', 'rCompare', 'rMade', 'rMadeAsk', 'rMadeSaved', 'rMadeYes', 'rMadeNo',
  'hMade', 'hMadeQ', 'hMadeStart', 'setupCard', 'setupQ', 'setupErr', 'rSetup', 'rHow', 'rHowQ', 'stopped', 'stoppedWait', 'stepsFold']
  .map(id => [id, $(id)]));
const now = () => performance.now() / 1000;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const round = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// ── voice ────────────────────────────────────────────────────────────────────────────────────
// Lines are queued here and spoken one at a time, and the caption on the screen (#say) changes
// when a line starts playing (the utterance's onstart), not when it is queued, so the screen shows
// what the voice is saying. Without a speech engine, or when a line fails, the caption and the
// step clocks go by an estimate of the speaking time: about 150 words a minute (a second-hand
// figure), faster in the simulation so it does not drag.
const RATE = SIM ? 12 : 2.5; // words per second
const PAD = SIM ? 0.2 : 0.5; // seconds after each line
// Every line for the friend starts "Friend"; a design choice: 1.5 s of quiet between a line for the
// friend and one for the rider, so each can hear that the other's instruction is over.
const TURN_GAP = 1.5;
const speaker = (text) => (/^Friend\b/.test(text) ? 'friend' : 'rider');
const Voice = {
  last: new Map(), count: new Map(), voice: null, engine: false,
  q: [], cur: null, gen: 0, lastEnd: 0, lastSpeaker: null, doneAt: 0,
  init() {
    this.engine = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
    if (!this.engine) return;
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
    if (!this.engine) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  },
  est(text) { return text.split(/\s+/).length / RATE + PAD; },
  busy() { return !!this.cur || this.q.length > 0; },
  // When everything queued should be over, by the estimate (for the step clocks).
  recalc() {
    const t = now();
    if (!this.busy()) { this.doneAt = this.lastEnd; return; }
    let end = this.cur ? (this.cur.t0 != null ? this.cur.t0 : t) + this.est(this.cur.text) : t;
    for (const x of this.q) end += x.gap + this.est(x.text);
    this.doneAt = Math.max(end, t);
  },
  // key: lines with the same key share every. every: seconds before the same key may be said again.
  // max: how many times this sentence may be said in one session (Voice.count, cleared at Start).
  // interrupt: cut whatever is playing, only for the few lines that are urgent. Returns whether it
  // was queued.
  say(text, { key = text, every = 0, max = Infinity, interrupt = false } = {}) {
    const t = now();
    if (every && this.last.has(key) && t - this.last.get(key) < every) return false;
    if ((this.count.get(text) || 0) >= max) return false;
    this.last.set(key, t);
    this.count.set(text, (this.count.get(text) || 0) + 1);
    log('say', text);
    debug.speech.push({ t, text, interrupt });
    if (interrupt) this.cancel();
    const prev = this.q.length ? this.q[this.q.length - 1] : this.cur;
    const before = prev ? speaker(prev.text) : this.lastSpeaker;
    let gap = 0;
    if (before && before !== speaker(text)) gap = prev ? TURN_GAP : Math.max(0, TURN_GAP - (t - this.lastEnd));
    this.q.push({ text, gap });
    this.recalc();
    this.pump();
    return true;
  },
  pump() {
    if (this.cur || !this.q.length) return;
    const item = this.q.shift(), gen = this.gen;
    this.cur = item;
    const start = () => {
      if (gen !== this.gen || item.t0 != null) return;
      clearTimeout(item.show);
      item.t0 = now();
      el.say.textContent = item.text;
      debug.started.push({ t: item.t0, text: item.text, caption: el.say.textContent });
      this.recalc();
    };
    const end = () => {
      if (gen !== this.gen || item.done) return;
      item.done = true;
      clearTimeout(item.show);
      clearTimeout(item.watch);
      this.cur = null;
      this.lastEnd = now();
      this.lastSpeaker = speaker(item.text);
      this.recalc();
      this.pump();
    };
    const byEstimate = () => {
      clearTimeout(item.watch);
      start();
      item.watch = setTimeout(end, this.est(item.text) * 1000);
    };
    const begin = () => {
      if (gen !== this.gen) return;
      if (!this.engine) return byEstimate();
      let u;
      try { u = new SpeechSynthesisUtterance(item.text); } catch { return byEstimate(); }
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
      u.onstart = start;
      u.onend = end;
      // A line the engine could not say (no voice, or not allowed yet) is shown and timed by the
      // estimate instead; one that was cut off just ends.
      u.onerror = (e) => {
        if (gen !== this.gen || item.done) return;
        if (e?.error === 'interrupted' || e?.error === 'canceled') end(); else byEstimate();
      };
      // Design choices, for engines that report nothing: a line that has not started after 1.5 s is
      // shown anyway, and one that has not ended after twice its estimate plus 2 s is moved past.
      item.show = setTimeout(start, 1500);
      item.watch = setTimeout(end, (2 * this.est(item.text) + 2) * 1000);
      try { speechSynthesis.speak(u); } catch { byEstimate(); }
    };
    if (item.gap) setTimeout(begin, item.gap * 1000); else begin();
  },
  cancel() {
    this.gen++;
    if (this.cur) { clearTimeout(this.cur.show); clearTimeout(this.cur.watch); }
    this.q = [];
    this.cur = null;
    this.lastEnd = this.doneAt = now();
    if (this.engine) speechSynthesis.cancel();
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
let landmarker = null, stream = null, recorder = null, videoBlob = null, wake = null, sim = null;
let running = false, phase = null, phaseT0 = 0, ph = {}, recent = [], sideCache = { side: 'L', n: 0 };
// The rider followed from frame to frame (fit.pickRider), the people who could be the rider while
// that is being found out (fit.followCandidates), and anyone else the phone can see.
let track = null, cands = [], crowd = {};
let session = null, lastResult = null, lastHistory = [], summaryTimer = null, lastId = null, lastStepT = null;
let riderSeen = false;
// "Do you get pain or numbness that keeps coming back when you ride?" Health information, so it
// lives only in this variable until the page is closed: never in localStorage, history or Copy
// results. Not answered counts as No.
let pain = false;
let lastFrameAt = 0, camWarned = false, recovering = false, recoverTries = 0, detectFails = 0;
const skipped = new Set(), warnings = new Set();
// poses: frames where the pose model found anyone (multi: more than one person); riders: frames where
// one of them was the rider; ambiguous: frames not measured because two people could each have been
// the rider; wrongPicks: in the simulation, frames where the app picked the made-up helper instead of
// the rider (must stay 0). asks: "turn the pedals" questions; identified: when the rider was found that
// way. started: each line as it began playing, with the caption shown at that moment.
const debug = { phase: () => phase, setup: () => setup, poses: 0, multi: 0, frames: 0, riders: 0, ambiguous: 0, ambiguousBy: {}, crowdFrames: 0, wrongPicks: 0, asks: 0, identified: null,
  said: [], speech: [], started: [], errors: [] };
window.__bfc = debug;
function log(kind, msg) { if (kind === 'say') debug.said.push(msg); }

// ── how the bike stays up ─────────────────────────────────────────────────────────────────────
// "How will your bike stay up?" is asked first on the home screen and remembered on this phone. It
// changes the spoken steps and how long and which way to pedal (fit.SETUPS), and it is stored with
// each session, so sessions are only compared with others filmed the same way. ?setup= answers it
// for testing; a choice made on the page replaces it in the address too, so a reload keeps it.
const SKEY = 'bfc.setup';
let setup = null;
try { const v = localStorage.getItem(SKEY); if (fit.SETUPS[v]) setup = v; } catch { /* asked again */ }
if (fit.SETUPS[params.get('setup')]) setup = params.get('setup');
const SETUP_BUTTONS = [...document.querySelectorAll('#setupCard [data-setup]')];
function chooseSetup(id) {
  if (!fit.SETUPS[id]) return;
  setup = id;
  try { localStorage.setItem(SKEY, id); } catch { /* not remembered */ }
  if (params.has('setup')) {
    params.set('setup', id);
    try { history.replaceState(null, '', `${location.pathname}?${params.toString().replace(/=(?=&|$)/g, '')}`); } catch { /* the address stays */ }
  }
  el.setupCard.classList.remove('needs');
  el.setupErr.hidden = true;
  renderSetup();
}
function renderSetup() {
  for (const b of SETUP_BUTTONS) b.setAttribute('aria-pressed', String(b.dataset.setup === setup));
  for (const li of document.querySelectorAll('[data-for]')) li.hidden = li.dataset.for !== (setup || 'none');
  retestNote();
}
for (const b of SETUP_BUTTONS) b.addEventListener('click', () => chooseSetup(b.dataset.setup));
// Start before choosing: ask instead (the steps depend on it), inside the card, where the eye is,
// and out loud (the Start tap lets the page speak).
function askSetup() {
  if (setup) return false;
  el.setupCard.classList.add('needs');
  el.setupErr.hidden = false;
  el.setupCard.scrollIntoView({ block: 'center' });
  el.setupQ.focus({ preventScroll: true });
  Voice.unlock();
  Voice.say('First, tell me how your bike will stay up.');
  return true;
}
const S = () => fit.setupOf(session?.setup);

const STEP_ORDER = ['phone', 'mount', 'frame', 'still', 'pedal'];
function go(name, t, reason) {
  phase = name;
  phaseT0 = t;
  ph = {};
  el.timer.hidden = true;
  el.skip.hidden = !['phone', 'frame'].includes(name);
  el.skip.textContent = 'Skip this check';
  el.phoneList.hidden = name !== 'phone';
  const i = STEP_ORDER.indexOf(name);
  for (const s of el.steps.children) {
    const j = STEP_ORDER.indexOf(s.dataset.step);
    s.className = j < i ? 'done' : j === i ? 'on' : '';
    if (j === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
  }
  HANDLERS[name].enter(t, reason);
}

// Seconds since the step began and everything queued has been spoken: step clocks start when the
// instruction has been heard, not when it was queued. Never quiet while a line is still playing.
const quiet = (t) => (Voice.busy() ? -Infinity : t - Math.max(phaseT0, Voice.lastEnd));

function show(screen) {
  for (const s of ['home', 'run', 'results']) el[s].hidden = s !== screen;
  window.scrollTo(0, 0);
}

// The way out, said when a step cannot see the rider. At most twice each in a session, like every
// repeated line here: a sentence said a third time is one the rider has stopped hearing.
const STOP_LINE = 'If it still does not work, tap Stop on the screen. The tips are on the home screen.';
const LOST_STOP = 'I still cannot see you. If it does not work, tap Stop on the screen. The tips are on the home screen.';
const WHO_STOP = 'I cannot tell who is on the bike. Tap Stop on the screen, then start again.';
// A rider on aero bars (fit.isAero): this app checks road bikes only (fit-rules.md rule 5).
const AERO_LINE = 'You look very low, like on aero bars. This app checks road bikes only, so it cannot check this position. If this is a road bike, sit up with your hands on top of the brake levers. Otherwise, tap Stop.';

// ── the steps ────────────────────────────────────────────────────────────────────────────────
const HANDLERS = {
  phone: {
    enter(t, reason) {
      session.levelled = false;
      // Not interrupting: the rider may be following the correction that sent him here, which
      // stays on the screen under it (#sayNote) until he is back on the bike.
      if (reason === 'moved') { ph.toldBeep = true; Voice.say('The phone moved. Level it again. I will beep until it is level.'); return; }
      // How the bike is held changes which way to pedal; a wrong tap must be caught before anyone
      // gets on, so it is said first, with the way out.
      if (!session.toldSetup) {
        session.toldSetup = true;
        Voice.say(`You chose: bike ${S().bike}.`);
        Voice.say('If that is wrong, tap Stop now.');
      }
      // A trainer that holds the back wheel lifts it, so the bike tips nose down unless the front is
      // raised to match (Saris and Minoura sell riser blocks for this), and the back angle is measured
      // from horizontal, so it would read low by as much as the bike tips. Direct-drive trainers can
      // sit level or even high at the front with wide tyres, so the check is by eye: the two axles.
      if (session.setup === 'trainer') Voice.say('First, check the bike is level. The middle of the front wheel should be as high off the floor as the middle of the back wheel. If the front sits lower, put a riser block or a thick book under the front wheel.');
      // The filming guide puts the lens 60 to 80 cm off the floor; a phone on a bare chair seat sits
      // lower. The same three points stay on the screen (#phoneList) until the phone is level.
      Voice.say('Turn the phone sideways and stand it upright, not leaning back, on something 60 to 80 centimetres high. A chair with a box on it works. Put it about 3 metres from the side of the bike, facing the pedals.');
    },
    tick({ t }) {
      if (!Tilt.available) {
        // No motion sensor (or motion not allowed): nothing can tell that the phone is sideways, so the
        // screen has to be, before levelling by eye against a line on the screen and tapping the
        // button. It moves on by itself 30 s after the line ends (a design choice).
        if (innerHeight > innerWidth) {
          el.skip.hidden = true;
          if (quiet(t) > 1) uprightScreen(t, true);
          return;
        }
        el.skip.hidden = false;
        if (!ph.noSensor && quiet(t) > 1) {
          ph.noSensor = t;
          // An iPhone may not ask again after motion was refused, so no "tap Allow next time".
          if (Tilt.denied) Voice.say('You did not allow motion, so I cannot beep for level.');
          Voice.say('I cannot use the motion sensor, so level the phone by eye. Turn it until the floor in the picture runs parallel to the white line. Then tap the button on the screen.');
          el.skip.textContent = 'It is level';
        }
        if (ph.noSensor && quiet(t) > 30) levelByEye(t);
        return;
      }
      if (!ph.toldBeep) { ph.toldBeep = true; Voice.say('I will beep until it is level, and the beeps get faster as you get close.'); }
      if (!Tilt.landscape) {
        ph.since = null;
        if (quiet(t) > 1) {
          if (!Voice.say('Turn the phone sideways.', { key: 'sideways', every: 8, max: 2 })) {
            Voice.say('Turn the phone sideways. If you cannot, tap Skip on the screen.', { key: 'sideways', every: 14, max: 2 });
          }
        }
        return;
      }
      if (innerHeight > innerWidth) {
        if (quiet(t) > 1) uprightScreen(t, false);
        return;
      }
      if (Tilt.level()) {
        ph.since ??= t;
        if (t - ph.since > 1.2) {
          Beep.chime();
          session.levelled = true;
          go('mount', t); // which says "Level."
        }
        return;
      }
      ph.since = null;
      const e = Tilt.error();
      // The beeps wait for the voice: they would play over the placement instruction otherwise.
      if (quiet(t) > 1 && (!ph.beep || t - ph.beep > Math.min(1, 0.12 + 0.07 * e))) { ph.beep = t; Beep.tone(e > 3 ? 440 : 620); }
      // After two tries the line names the way out (a design choice), like every other step.
      if (quiet(t) > 14 && Voice.say((ph.tiltN || 0) < 2 ? 'Not level yet. Tilt it slowly until the beeping stops.'
        : 'Not level yet. Tilt it slowly until the beeping stops. If you cannot get it level, tap Skip on the screen.', { key: 'tilt', every: 14, max: 2 })) ph.tiltN = (ph.tiltN || 0) + 1;
    },
  },

  mount: {
    enter(t, reason) {
      // Nothing is followed from the phone step, and the rider is found afresh: the phone may have
      // moved, and whoever was in view meanwhile is not the rider just because they were there. Back
      // from a break the phone has not moved, so where he was still counts (lockMode).
      if (reason !== 'rest') track = null;
      cands = [];
      crowd.since = crowd.last = null;
      session.mounts = (session.mounts || 0) + 1;
      // With a friend in the picture, who the rider is is found by who turns the pedals; in the other
      // setups only once a second person is seen (step()).
      ph.needId = session.setup === 'friend';
      ph.askN = 0;
      // Back from the picture check because he got off to move the phone: he was told to get back
      // on, and the correction stays on the screen, so nothing new is said. Skip stays, for that check.
      if (reason === 'off') {
        ph.fromFix = true;
        el.skip.hidden = !session.fixKey || skipped.has(session.fixKey);
        return;
      }
      // Back from holding still after a break: someone sits like a rider somewhere new, him back on
      // the bike, or a friend who crouched at it while he rests. Nothing new is said. Someone else
      // was seen (that is why it came here), so who the rider is is found by who turns the pedals, and
      // meanwhile he is also found back where he was, as while holding still (lockMode).
      if (reason === 'rest') { ph.fromRest = true; ph.needId = true; return; }
      const lvl = session.levelled ? 'Level. ' : '';
      if (session.mounts > 1) {
        // Back again after moving the phone: the short version.
        Voice.say(session.setup === 'friend' ? `${lvl}Friend, hold the bike again. Rider, get back on.` : `${lvl}Get back on, same as before.`);
        return;
      }
      if (session.levelled) Voice.say('Level. Leave the phone there.');
      // How each setup keeps the bike still. Design choices, except where a source is named: the far
      // side keeps the wall or the friend out of the picture and off the camera-side arm and leg, which
      // are the ones measured (filming guide item 7: nothing blocking the near leg or arm). On the
      // synthetic rider, a bike leaning 10 degrees changes the knee and back angles by under 1 degree
      // and 20 degrees by about 2, hence "only a little". Pedalling backwards drives nothing, so a
      // gently squeezed front brake keeps a leaning bike from rolling. Where the friend holds the bike
      // is left to them: no source says where, and a crouch would make them look like a rider.
      if (session.setup === 'friend') {
        Voice.say('Friend: stand on the far side, away from the phone, next to the saddle. Stand up straight and hold the bike still.');
        Voice.say('Rider: get on in your normal riding position.');
        return;
      }
      Voice.say({
        trainer: 'Now get on the bike in your normal riding position, hands on top of the brake levers. On rollers, hold on to a wall with the hand away from the phone. I will tell you when to let go.',
        wall: 'Now get on the bike. Let it lean only a little against the wall on the far side, with the bars straight. Keep the hand nearest the phone on top of the brake lever, and squeeze the front brake gently so the bike stays still.',
      }[session.setup] || 'Now get on the bike in your normal riding position, hands on top of the brake levers. Lean lightly on the wall, or have your helper hold the bike from the far side.');
    },
    tick({ t, rider }) {
      // A rider on aero bars: named once in place of the nags, then the way out.
      if (ph.aeroSince != null && t - ph.aeroSince >= 3 && !session.aeroSaid && quiet(t) > 0.5) {
        session.aeroSaid = true;
        Voice.say(AERO_LINE);
        return;
      }
      // Back from a break and found where he was (lockMode 'near'): him, as while holding still.
      if (ph.fromRest && !ph.idDone && !ph.fallback && rider) ph.idDone = true;
      if (ph.needId && !ph.idDone && !(ph.fallback && rider)) { identityTick(t); return; }
      if (!ph.idDone && quiet(t) < 6) return; // time to walk over and get on, once the instruction has been heard
      if (rider) {
        ph.since ??= t;
        if (t - ph.since > 1.5) go('frame', t);
        return;
      }
      ph.since = null;
      if (session.aeroSaid || ph.aeroSince != null) {
        if (session.aeroSaid && quiet(t) > 14) Voice.say(STOP_LINE, { key: 'stop', every: 20, max: 2 });
        return;
      }
      if (quiet(t) > (ph.nags ? 14 : 20)) nag();
    },
  },

  frame: {
    enter() {
      if (session.skippedOff) { ph.skippedAny = true; session.skippedOff = false; } // skipped in the mount step
      Voice.say('Checking the picture. Stay in position.');
    },
    tick({ t, lm, side, W, H, rider, pick }) {
      if (!rider) {
        ph.ok = null; ph.bad = null; // ph.lastBad stays, so Skip still knows what to skip
        chips({ Rider: pick.lm ? false : null, 'In picture': null, 'Side-on': null, Light: null });
        // After a correction he gets off and moves the phone. Turned or slid along without tilting
        // it, the phone does not trip the level check (step()), but where he was in the picture
        // now means nothing: with a friend, or anyone else seen, he would only be found again near
        // there (lockMode 'near'), so he never would be. Once he has been out of sight for OFF_SECS
        // after a correction, the flow goes back to the mount step, which finds him afresh (with a
        // friend, by asking him to turn the pedals).
        ph.lostSince ??= t;
        if (ph.askedOff != null && t - ph.lostSince > OFF_SECS) { go('mount', t, 'off'); return; }
        lost(t);
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
      // Counted per session, not per step: a correction that has him move the phone sends him back
      // through the phone and mount steps, and the count must survive that or the Skip hint and the
      // give-up below are never reached.
      const n = session.tries[problem.key] || 0;
      if (n >= 3) {
        if (quiet(t) < 11) return; // the third try gets its time too
        skipCheck(problem.key);
        Voice.say('I will carry on without this check. The numbers may be less exact.');
        return;
      }
      if (quiet(t) < (n ? 8 : 1)) return; // after a correction, time to get off and move the phone (a design choice)
      const said = `Get off the bike for a moment. ${problem.say} Then get back on.` + (n === 2 ? ' If you cannot fix it, tap Skip on the screen.' : '');
      if (Voice.say(said, { key: problem.key, every: 11 })) {
        session.tries[problem.key] = n + 1;
        ph.askedOff = t;
        // The correction stays on the screen until he is back on the bike, through the phone step.
        session.fix = problem.say;
        session.fixKey = problem.key;
        session.fixOff = false;
      }
    },
  },

  still: {
    enter() {
      startRecording();
      ph.seenSecs = 0;
      ph.crowdBefore = warnings.has('crowd');
      Voice.say('Put the pedal nearest the phone at its lowest point, pedal arm pointing straight down, foot the way it sits when you ride. Then hold still.');
    },
    tick({ t, lm, side, W, H, ang, rider, pick }) {
      // Who else sits like a rider while he is followed here: a friend crouching at the bike, say.
      if (pick.lm) ph.seatedWith = Math.max(ph.seatedWith || 0, pick.seatedOthers);
      if (!rider) {
        // A frame or two without the rider during a capture is the tracker, not the rider moving.
        if (ph.cap) { ph.cap.gone ??= t; if (t - ph.cap.gone > 0.3) ph.cap = null; return; }
        // A break, which the first line of lost() invites. With a friend, or anyone else seen, he is
        // only looked for near where he was (lockMode 'near'), so back on the bike further along (a new
        // grip by the friend, the bike rolled) he would never be found. So once he has been out of
        // sight for OFF_SECS, and for a second more someone new sits like a rider (more of them than
        // while he was followed, so a friend already crouching there does not count) and is not taken
        // near where he was, the flow goes back to the mount step, which finds him afresh, as after a
        // picture correction (with a friend, or anyone else seen, by asking him to turn the pedals).
        // Not while two could each be the rider: the helper lines speak then. The 1 s is a design
        // choice, as in identityTick.
        ph.lostSince ??= t;
        const newcomer = nearOnly() && !pick.lm && !pick.ambiguous && pick.seatedOthers > (ph.seatedWith || 0);
        if (newcomer) ph.newSince ??= t; else ph.newSince = null;
        if (t - ph.lostSince > OFF_SECS && ph.newSince != null && t - ph.newSince > 1) {
          // Nothing from this step is kept (the held-still reading is taken again), so the moments it
          // lost cost nothing: the person not taken was most likely him, and "someone else in the
          // picture made some moments unclear" would not be true.
          if (!ph.crowdBefore) warnings.delete('crowd');
          go('mount', t, 'rest');
          return;
        }
        lost(t);
        return giveUpStill(t);
      }
      ph.lostSince = null;
      ph.lostN = 0;
      if (ph.cap) ph.cap.gone = null;
      if (!ph.cap) {
        if (giveUpStill(t)) return;
        if (ph.retry && t - ph.retry < 2.5) return;
        const win = recent.filter(r => r.t > t - 1).map(r => r.lm);
        const still = win.length >= 3 && fit.motion(win, side, W, H) < 0.035;
        const atBottom = ang.kneeFlex < 55;
        if (still && atBottom && quiet(t) > 0.5) {
          ph.cap = { t0: t, angles: [], lms: [] };
          ph.holds = (ph.holds || 0) + 1;
          Voice.say(ph.holds < 3 ? 'Hold it. Three. Two. One.' : 'Hold it once more. Three. Two. One.', { interrupt: true });
        } else if (quiet(t) > 11) {
          Voice.say(atBottom ? 'Hold still for a moment.' : 'Push the pedal nearest the phone all the way down, and hold still.', { key: 'nudge', every: 11, max: 2 });
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
        // The picture is one frame, but the number drawn on it is the held-still reading (the median),
        // so it matches the row on the results screen.
        session.stillShot = snapshot(lm, W, H, side, { ...ang, kneeFlex: session.still.kneeFlex });
        Beep.chime();
        Voice.say('Got it.');
        go('pedal', t);
      }
    },
  },

  pedal: {
    enter() {
      // On a trainer or rollers: forwards, against the resistance, the way the 30 to 40 range was
      // measured (fit.SETUPS). On the floor: backwards, so the bike does not move.
      // Rollers cannot be balanced standing still, so the hand stays on the wall until the wheels are
      // turning, and goes back on it before the pedals stop: British Cycling, "How to ride rollers"
      // (https://www.britishcycling.org.uk/knowledge/article/izn20141126-How-to-ride-the-rollers-0),
      // and Train Right, "Step-by-Step Instructions on How to Ride Rollers" (https://trainright.com/?p=8165).
      const roll = S().dir === 'forwards';
      const line = roll
        ? 'Now pedal forwards at an easy effort, at your normal pedalling speed. On rollers, start pedalling with your hand on the wall, and let go once you are rolling steadily. I start timing at the beep. Keep going until I say stop.'
        : 'Now pedal backwards, smooth and steady, so the bike stays still. I start timing at the beep. Keep going until I say stop.';
      Voice.say(pain ? `${line} If your knee hurts, stop pedalling.${roll ? ' On rollers, put your hand on the wall first.' : ''} I will use what I have.` : line);
      ph.samples = [];
      ph.said = {};
      ph.moveSecs = 0;
      ph.keepN = 0;
    },
    tick({ t, ang, rider }) {
      const { dir, secs } = S(), want = dir === 'forwards' ? 1 : -1;
      if (rider) { ph.samples.push({ t, ...ang }); ph.lostSince = null; }
      // Out of sight for more than 2 s: say so, instead of a pedalling line to someone the phone cannot see.
      const gone = !rider && lost(t, 2);
      const win = ph.samples.filter(s => s.t > t - 2);
      const moving = win.length > 5 && fit.isPedalling(win, fit.median(win.map(s => s.thigh)) * 2);
      if (moving) { ph.lastMove = t; ph.keepN = 0; ph.pauseLine = null; }
      // Turning the wrong way (fit.pedalDirection, over the last 4 s: it needs a whole turn to say).
      // Timing waits, or starts again, until the pedals turn the right way, so the reading is only the
      // right way. After the line has been said twice it carries on regardless, says so once, and the
      // results say so too (a design choice), so a misread direction can never hold the step up for
      // ever. On a trainer the line never says a bare "pedal forwards": if the trainer was tapped by
      // mistake and the bike stands on the floor, pedalling forwards would drive it off.
      const wrong = rider && fit.pedalDirection(ph.samples.filter(s => s.t > t - 4)) === -want;
      if (wrong && (ph.wayN || 0) < 2 && Voice.say(want > 0
        ? 'You are pedalling backwards. On a trainer, pedal forwards. If the bike is standing on the floor, keep pedalling backwards.'
        : 'You are pedalling forwards. Pedal backwards, please, so the bike stays still.', { key: 'way', every: 8 })) { ph.wayN = (ph.wayN || 0) + 1; ph.wayT = t; }
      if (wrong && ph.wayN === 2 && t - ph.wayT > 8 && quiet(t) > 1) { ph.wayN = 3; Voice.say('I will carry on and measure the way you are pedalling.'); }
      const insist = wrong && (ph.wayN || 0) < 3;
      if (!ph.started) {
        // Timing starts at the frame the turning is first seen, so held-still frames never count as strokes.
        if (moving && !insist) { ph.started = t; ph.tickAt = t; ph.checkAt = t + 2; Beep.tone(880, 0.08); }
        else if (t - phaseT0 > secs + 20) {
          Voice.say(session.still ? 'I could not see the pedals turning, so I can only give you the held-still reading.'
            : 'I could not see the pedals turning, so there is not enough to measure this time.');
          finish();
        } else if (pain && ph.pauseLine != null) {
          // With pain he was told to stop if his knee hurts, so pedals not seen turning (he never
          // started, or stopped before the timing did, or the phone saw too few frames to tell) are
          // never met with "keep pedalling": the pain line, then 5 s later the end, as when he stops
          // after the timing started, with what there is.
          if (t - ph.pauseLine > 5) {
            Beep.chime();
            Voice.say('Stop. You can relax.', { interrupt: true });
            Voice.say(session.still ? 'I could not see the pedals turning, so I can only give you the held-still reading.'
              : 'I could not see the pedals turning, so there is not enough to measure this time.');
            if (session.setup === 'friend') Voice.say('Friend, keep holding the bike until the rider is off.');
            finish();
          }
        } else if (!gone && !wrong && quiet(t) > 10) {
          if (pain) { ph.pauseLine = t; Voice.say('If it hurts, stop. I will use what I have.', { max: 2 }); }
          else if (!Voice.say(`I cannot see the pedals turning. Keep pedalling ${dir}, slowly and steadily.`, { key: 'nopedal', every: 10, max: 2 })) {
            Voice.say('Take your time. Pedal again when you are ready, or tap Stop.', { key: 'nopedal', every: 10, max: 2 });
          }
        }
        return;
      }
      if (insist) { ph.started = null; ph.said = {}; ph.moveSecs = 0; el.timer.hidden = true; return; }
      if (wrong) warnings.add('way');
      // The 20 or 30 s count only while the pedals turn: a rider who stops is not timed.
      if (moving) ph.moveSecs += Math.max(0, Math.min(0.5, t - ph.tickAt));
      ph.tickAt = t;
      const e = ph.moveSecs;
      const paused = t - ph.lastMove > 3;
      const since = () => ph.samples.filter(s => s.t >= ph.started);
      // Stopped: "Keep pedalling" at most twice in a row (a design choice), then the line that lets
      // him stop. With pain or numbness that keeps coming back, stopping ends the step with what there
      // is, 5 s later. Otherwise it waits, up to the step's existing extra 20 s (a design choice).
      // With pain he was told to stop if his knee hurts, so stopping is never met with "keep
      // pedalling": the pain line comes first.
      if (rider && paused) {
        if (!pain && ph.keepN < 2) { if (Voice.say(`Keep pedalling ${dir}.`, { key: 'keep', every: 3 })) ph.keepN++; }
        else if (ph.pauseLine == null && quiet(t) > 0.3) {
          ph.pauseLine = t;
          Voice.say(pain ? 'If it hurts, stop. I will use what I have.' : 'Take your time. Pedal again when you are ready, or tap Stop.', { max: 2 });
        }
      }
      // Also when he is out of sight and no line could be said: 20 s without the pedals turning ends it.
      // Only what came before he stopped is measured: pose noise on a foot held still looks like
      // stroke bottoms, which read as pedalling too fast. ph.lastMove is up to 2 s after the pedals
      // stopped (the turning check looks 2 s back), so those 2 s are left out too.
      if (paused && (pain && ph.pauseLine != null ? t - ph.pauseLine > 5 : t - ph.lastMove > 20)) {
        endPedal(fit.summarisePedal(since().filter(x => x.t <= ph.lastMove - 2)), true);
        return;
      }
      // Every 2 s: is the phone getting enough frames from each turn of the pedals? Only the strokes
      // of the last 6 s count, and nothing is said while the rider is out of sight (fit.slowerTurn).
      if (t >= ph.checkAt) {
        ph.checkAt = t + 2;
        const s = fit.slowerTurn(since(), t);
        if (s != null) Voice.say(`Slower, please. About one turn every ${s} seconds.`, { key: 'slower', every: 8, max: 2 });
      }
      if (e <= secs) {
        el.timer.hidden = false;
        el.timer.textContent = paused ? 'Paused' : Math.max(0, Math.ceil(secs - e));
        if (!paused && e > secs - 10 && !ph.said[10]) { ph.said[10] = 1; Voice.say('Ten seconds left.'); }
        if (!paused && e > secs - 5 && !ph.said[5]) { ph.said[5] = 1; Voice.say('Five more seconds.'); }
        return;
      }
      // After the 20 or 30 s: finish once there are 5 strokes the phone sampled well enough. If it saw
      // only fast ones, keep going up to 20 s more (a design choice), then finish with whatever there is.
      if (ph.sumAt && t - ph.sumAt < 0.5 && e <= secs + 20) return;
      ph.sumAt = t;
      const summary = fit.summarisePedal(since());
      if (summary.strokes < 5 && e <= secs + 20) {
        el.timer.hidden = true;
        // "A little slower" only when the strokes were too fast for the phone; otherwise just more.
        const fast = summary.strokesSeen > summary.strokes || summary.framesPerTurn < fit.MIN_FRAMES_PER_STROKE;
        // Not to a rider with pain who has stopped: the pain line above has said it ends with what there is.
        if (!ph.said.more && !gone && !(pain && paused)) { ph.said.more = 1; Voice.say(fast ? 'Keep going, a little slower. A few more turns.' : 'Keep going. A few more turns.'); }
        return;
      }
      endPedal(summary);
    },
  },
};

// The end of the pedalling: praise only for a full reading (design-spec.md: no invented praise for an
// incomplete one), and with a friend holding the bike, a line for them too. On a trainer or rollers,
// while the pedals still turn, the hand goes back on the wall before "Stop" (the roller guides cited
// in the pedal step); stopped: he has stopped already.
function endPedal(summary, stopped = false) {
  if (summary.strokes < 5 && (summary.strokesSeen > summary.strokes || summary.framesPerTurn < fit.MIN_FRAMES_PER_STROKE)) warnings.add('fast');
  session.pedal = summary;
  Beep.chime();
  const end = summary.strokes >= 5 && !warnings.has('fast') ? 'Stop. Well done, you can relax.' : 'Stop. You can relax.';
  if (session.setup === 'trainer' && !stopped) {
    Voice.say('On rollers, put your hand back on the wall, then stop pedalling.', { interrupt: true });
    Voice.say(end);
  } else Voice.say(end, { interrupt: true });
  if (session.setup === 'friend') Voice.say('Friend, keep holding the bike until the rider is off.');
  finish();
}

// The mount step's lines while nobody is on the bike: a different line each time, ending with the
// way out, rather than one sentence for ever. They start again each time the mount step does (ph is
// cleared then): with a limit per session, the third time he got back on there was nothing left to
// say. Within one mount the list itself says each sentence at most twice. A line counts once queued.
function nag() {
  const lines = ['I cannot see you on the bike yet. Make sure the phone can see you and the whole bike.',
    'I still cannot see you. Sit on the saddle, hands on top of the brake levers, and keep still for a moment.',
    'Still nothing. Walk to the phone and check the whole bike is in the middle of the screen. Then get back on.',
    'Still nothing. Walk to the phone and check the whole bike is in the middle of the screen. Then get back on.',
    STOP_LINE, STOP_LINE];
  const n = (ph.nags || 0) + 1;
  if (n > lines.length) return;
  if (Voice.say(lines[n - 1])) ph.nags = n;
}

// ── who is the rider ─────────────────────────────────────────────────────────────────────────
// With a friend in the picture, or anyone else seen while the rider gets on, sitting like a rider is
// not enough: a friend who crouches with bent knees can sit like one too. So the rider is asked for
// two slow turns of the pedals, and the pose whose ankle goes round is the rider (fit.followCandidates,
// fit.pedalledCandidate). Once more if nobody's ankle went round in 15 s, or when someone sat down
// after the question (a design choice: the rider who got on after the friend crouched). After that,
// a lone pose is taken only with nobody else in the picture (lock 'alone'), else the way out.
// The question belongs to the mount step: it is asked each time he gets on (at most twice each time,
// ph.askN), with no limit per session. A limit per session left a later mount waiting for an answer
// to a question that was never said. It counts only once it is queued.
const turnLine = () => `Rider: ${session.asked ? 'once more, turn' : 'turn'} the pedals slowly ${S().dir}, two turns, then stop.`;
function ask(t) {
  if (!Voice.say(turnLine())) return;
  session.asked = (session.asked || 0) + 1;
  ph.askN++;
  ph.askT = t;
  debug.asks++;
}
function identityTick(t) {
  if (!ph.askN && quiet(t) < 6) return; // time to get on, as before
  const seated = cands.filter(c => t - c.t < 0.5);
  if (seated.length) ph.seatedSince ??= t; else ph.seatedSince = null;
  if (!ph.askN) {
    if (!seated.length) { if (quiet(t) > (ph.nags ? 14 : 20)) nag(); return; }
    if (t - ph.seatedSince > 1 && quiet(t) > 0.5) ask(t);
    return;
  }
  const newcomer = cands.some(c => c.since > ph.askT + 2 && t - c.t < 0.5);
  if (newcomer) ph.satAfter = true;
  if (ph.askN === 1 && quiet(t) > 1 && (t - ph.askT > 15 || newcomer)) { ask(t); return; }
  // After a break (ph.fromRest) the one sitting like a rider may be a friend who crouched at the bike
  // while he rests, and both questions went to them. So unless someone sat down after a question,
  // they lead to no way-out line: the step waits for him as when nobody is on the bike (nag, which
  // ends with the way out), and finds him back where he was (lockMode). Someone who sits down after
  // both questions is asked again, as anyone getting on, once.
  if (ph.fromRest && ph.askN >= 2 && !ph.fallback) {
    if (newcomer && !ph.reasked && quiet(t) > 1) { ph.reasked = true; ph.askN = 0; ask(t); return; }
    if (!ph.satAfter) { if (t - ph.askT > 15 && quiet(t) > (ph.nags ? 14 : 20)) nag(); return; }
  }
  if (ph.askN >= 2 && !ph.fallback && t - ph.askT > 15 && quiet(t) > 1) ph.fallback = t;
  if (ph.fallback && quiet(t) > 1) Voice.say(WHO_STOP, { key: 'whostop', every: 20, max: 2 });
}
function identify(poses, t, W, H) {
  cands = fit.followCandidates(cands, poses, t, W, H);
  if (ph.askT == null) return;
  const c = fit.pedalledCandidate(cands, ph.askT);
  if (!c) return;
  track = fit.trackFrom(c.lm, t, W, H);
  ph.idDone = true;
  session.crowd = true;
  debug.identified = t;
}
// How a rider may be found when none is being followed (fit.pickRider). Never in the phone step, so
// nothing locks while the rider walks about. Outside the mount step, with a friend in the setup or
// anyone else seen in this session (nearOnly), only near where the rider last was ('near'): someone
// who sits like a rider is never taken just because they are the only one left in view. With nobody
// else seen yet (a wall or a trainer), anywhere, since he may get back on further along, but not in
// the first OFF_SECS after he was last followed: a pose model that missed him for a second or two
// used to hand the track to someone who came to his hip meanwhile sitting like a rider, and in that
// time he cannot have got off and back on.
const nearOnly = () => session?.setup === 'friend' || !!session?.crowd;
function lockMode(t) {
  if (phase === 'phone') return 'none';
  if (phase === 'mount') {
    if (!ph.needId) return 'any';
    if (ph.idDone) return 'near';
    if (ph.fallback) return 'alone';
    return ph.fromRest ? 'near' : 'none';
  }
  if (nearOnly()) return 'near';
  return track?.lm && t - track.t < OFF_SECS ? 'near' : 'any';
}

// The screen is upright although the phone should be sideways: first "turn it", then the rotation
// lock (Apple, "Use and customize Control Center on iPhone": swipe down from the top-right corner on
// an iPhone with Face ID, up from the bottom on one with a Home button), then the way out.
// mayBeUpright: no motion sensor, so the phone itself may still be upright.
function uprightScreen(t, mayBeUpright) {
  const n = ph.lockN || 0;
  const line = mayBeUpright && n === 0 ? 'Turn the phone sideways.'
    : n < 3 ? 'The screen is stuck upright. Open Control Centre and tap the lock with the circle arrow. Swipe down from the top-right corner, or on an iPhone with a Home button, up from the bottom. Then turn the phone sideways again.'
    : 'If you cannot get the screen sideways, tap Stop. The steps are on the home screen.';
  if (Voice.say(line, { key: 'lock', every: n === 0 ? 8 : 14, max: 2 })) ph.lockN = n + 1;
  else if (n < 3 && (Voice.count.get(line) || 0) >= 2) ph.lockN = 3;
}

// Design choice: off the bike for 3 s after a picture correction, the rider is found afresh (frame
// tick); so too after a break while holding still, once someone new sits like a rider (still tick).
// Three times the 1 s after which the rider followed is let go (fit.TRACK_KEEP), so a pose
// model that misses him for a moment on the bike does not send the flow back.
const OFF_SECS = 3;

// Every step has a way out. The limits here (8 s lost, 2 s lost while pedalling, 0.3 s of tracker drop-out during a capture,
// 3 tries or 45 s in view for the still reading, 20 s more than the pedalling time to start pedalling, and
// the same 20 s more to finish it) are design choices, not published numbers.
// True once the rider has been out of sight for longer than wait. While two people could each be
// the rider (crowd.blocking), the helper line speaks instead of "I have lost you". Holding still, the
// first line lets him take a break: he may have got off to rest.
function lost(t, wait = 8) {
  ph.lostSince ??= t;
  if (!(t - ph.lostSince > wait)) return false;
  if (crowd.blocking) return true;
  const n = ph.lostN || 0;
  const line = phase === 'still' && n === 0 ? 'Take your time. Get back on when you are ready. I will wait.'
    : n < 2 ? 'I have lost you. Make sure the phone can see you and the whole bike.' : LOST_STOP;
  if (Voice.say(line, { key: 'lost', every: 14, max: 2 })) ph.lostN = n + 1;
  return true;
}

// The still reading is a cross-check, so after 3 tries or 45 s with the rider in view and no reading
// the pedalling goes ahead alone. Time out of view does not count: he may have got off to rest.
function giveUpStill(t, force = false) {
  if (!force && (ph.cap || (ph.seenSecs || 0) <= 45)) return false;
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
  chips({ Rider: true, 'In picture': state[0], 'Side-on': state[1], Light: state[2] });
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

// ok: true (✓), false (•) or null (?, not known).
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
  let poses = [], W = 1280, H = 720, simRider = null;
  if (SIM) {
    ({ poses, W, H, rider: simRider } = sim.frame(t));
  } else {
    // Without new frames nothing below runs, so a stopped camera would mean silence. Notice it.
    // "No new frame" means the video itself stopped advancing, not a slow pose model.
    const fresh = el.cam.readyState >= 2 && el.cam.currentTime !== lastVideoTime;
    if (fresh) {
      lastFrameAt = t;
      camWarned = false;
      recoverTries = 0;
    } else if (phase && lastFrameAt && t - lastFrameAt > 2 && !camWarned && !recovering) { // 2 s without a frame: a design choice
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
      poses = res.landmarks || [];
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
  if (poses.length) debug.poses++;
  if (poses.length > 1) debug.multi++;
  step(poses, t, W, H, simRider);
}

// poses: everyone the pose model found in this frame. simRider: in the simulation, which one is
// really the rider, to count wrong picks.
function step(poses, t, W, H, simRider = null) {
  const dt = lastStepT == null ? 0 : Math.max(0, Math.min(0.5, t - lastStepT));
  lastStepT = t;
  // While the app is still finding out who the rider is, the candidates are followed first, so a
  // rider found by turning the pedals is followed from this frame on.
  if (phase === 'mount' && ph.needId && !ph.idDone) identify(poses, t, W, H);
  // The rider, out of everyone in the picture (fit.pickRider). Once the camera-side leg is locked,
  // each pose is judged on that side.
  let pick = fit.pickRider(poses, track, t, W, H, phase === 'still' || phase === 'pedal' ? sideCache.side : null, { lock: lockMode(t) });
  track = pick.track;
  if (pick.count > 1 || pick.ambiguous) { if (session && phase !== 'phone') session.crowd = true; }
  // Getting on with someone else in view, or two people who could each be the rider: nobody is
  // taken until the pedals say who the rider is.
  if (phase === 'mount' && !ph.needId && (pick.count > 1 || pick.ambiguous)) {
    ph.needId = true;
    ph.since = null;
    track = null;
    identify(poses, t, W, H);
    pick = { ...pick, lm: null, index: null };
  }
  if (pick.lm) debug.riders++;
  if (pick.ambiguous) { debug.ambiguous++; debug.ambiguousBy[phase] = (debug.ambiguousBy[phase] || 0) + 1; }
  if (simRider != null && pick.index != null && pick.index !== simRider) debug.wrongPicks++;
  watchCrowd(pick, t);
  const lm = pick.lm;
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
  // Someone very low over the front, and no rider: aero bars (fit.isAero), named in the mount step.
  if (phase === 'mount') { if (pick.aero === 1 && !rider) ph.aeroSince ??= t; else ph.aeroSince = null; }
  if (phase === 'still' && rider) ph.seenSecs = (ph.seenSecs || 0) + dt;
  // The last correction stays on the screen until he has got off and is back on the bike.
  if (session?.fix) {
    if (!rider) session.fixOff = true;
    else if (session.fixOff) session.fix = null;
  }
  el.sayNote.textContent = session?.fix || '';
  el.sayNote.hidden = !session?.fix || el.say.textContent.includes(session.fix); // not twice on the screen
  // A phone that gets moved during setup has to be levelled again.
  if ((phase === 'mount' || phase === 'frame') && Tilt.available && !skipped.has('level')) {
    if (!Tilt.level() || !Tilt.landscape) {
      ph.tiltBad ??= t;
      if (t - ph.tiltBad > 2.5) { go('phone', t, 'moved'); return; }
    } else ph.tiltBad = null;
  }
  // Only a phone that was confirmed level can be said to have moved.
  if ((phase === 'still' || phase === 'pedal') && session.levelled && Tilt.available && !Tilt.level()) warnings.add('moved');
  // "? Rider" whenever nobody is picked: the phone does not know who the rider is.
  if (phase !== 'frame') chips({ Level: !Tilt.available ? null : Tilt.level(), Rider: lm ? rider : null });
  draw(lm, W, H, side, ang, poses.filter((_, i) => i !== pick.index));
  HANDLERS[phase]?.tick({ t, lm, side, W, H, ang, rider, pick });
}

// Someone else in the picture, once the rider is confirmed (nobody is asked to move before the app
// knows who the rider is): a second person the phone sees clearly, or two people who could each be
// the rider (then nothing is measured). Once it has lasted more than 2 s, the voice asks them to
// move. While it stops the measuring the next line comes, at most every 15 s; while it does not, the
// first line once for each time someone comes into view. Every sentence at most twice in a session.
// When they stop being in the way, once: "Thanks, that is better." Gaps of up to 1.5 s count as one
// stretch, so a pose rate of 1 a second still adds up. These times are design choices.
// With a wall or a trainer the line keeps whoever holds the bike where they are: it never asks
// someone to let go of a bike with a rider on it.
const FRIEND_LINES = ["Friend: stand behind the rider, on the far side of the bike, out of the camera's view as much as you can.",
  'Friend: stand up straight, with your knees straight.', 'If I still cannot tell you apart, tap Stop.'];
const OTHER_LINES = ['I can see another person. If they are not holding the bike, ask them to step out of view.', 'If I still cannot tell you apart, tap Stop.'];
function watchCrowd(pick, t) {
  const confirmed = ['frame', 'still', 'pedal'].includes(phase) || (phase === 'mount' && (!ph.needId || ph.idDone));
  const seen = confirmed && (pick.ambiguous || (!!pick.lm && pick.others > 0));
  if (pick.ambiguous) crowd.blocking = t; else if (crowd.blocking && t - crowd.blocking > 1.5) crowd.blocking = 0;
  // Less exact only when someone else cost the measuring something: a frame where two could each be
  // the rider, or the rider lost for more than a second while someone else was in view.
  if (phase === 'still' || phase === 'pedal') {
    if (pick.ambiguous) warnings.add('crowd');
    if (!pick.lm && pick.count > 0) { crowd.lostSince ??= t; if (t - crowd.lostSince > 1) warnings.add('crowd'); } else crowd.lostSince = null;
  }
  const thank = () => { if (crowd.asked && !crowd.thanked && pick.lm) { crowd.thanked = true; Voice.say('Thanks, that is better.'); } };
  if (seen) {
    if (crowd.last == null || t - crowd.last > 1.5) { crowd.since = t; crowd.told = false; }
    crowd.last = t;
    debug.crowdFrames++;
  } else if (crowd.last != null && t - crowd.last > 1.5) {
    if (confirmed) thank(); // they stepped out of view
    crowd.since = null; crowd.last = null;
  }
  if (crowd.wasBlocking && !crowd.blocking && seen) thank(); // still in view, but no longer in the way
  crowd.wasBlocking = !!crowd.blocking;
  if (!seen || crowd.since == null || t - crowd.since <= 2) return;
  if (crowd.told && !crowd.blocking) return;
  const lines = session.setup === 'friend' ? FRIEND_LINES : OTHER_LINES;
  const n = crowd.n || 0;
  const line = crowd.blocking ? lines[Math.min(n, lines.length - 1)] : lines[0];
  if (Voice.say(line, { key: 'helper', every: 15, max: 2 })) { crowd.told = true; crowd.asked = true; crowd.n = n + 1; }
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

// others: the other people found, drawn faintly so it is clear which one is being measured.
function draw(lm, W, H, side, ang, others = []) {
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
  const unit = Math.max(0.6, Math.min(1.4, (W * s) / 900));
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 2 * unit;
  for (const o of others) {
    for (const k of ['L', 'R']) for (const [a, b] of SEGMENTS) {
      const p = o[fit.LM[a][k]], q = o[fit.LM[b][k]];
      g.beginPath(); g.moveTo(ox + p.x * W * s, oy + p.y * H * s); g.lineTo(ox + q.x * W * s, oy + q.y * H * s); g.stroke();
    }
  }
  if (!lm) return;
  drawSkeleton(g, lm, side, (i) => [ox + lm[i].x * W * s, oy + lm[i].y * H * s], unit, ang);
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
// current step. Two restarts in a row without a frame in between, then it gives up (a design choice);
// a restart that fails is tried again 2 s later (also a design choice), because iOS can refuse the
// camera for a moment while another app or Control Centre still has it. If it cannot be restarted,
// stop and say so on the home screen.
async function recoverCamera(force = false) {
  if (SIM || !running || recovering) return;
  const tr = stream?.getVideoTracks()[0];
  if (!force && tr && tr.readyState !== 'ended' && !tr.muted) return;
  recovering = true;
  let retry = false;
  try {
    if (++recoverTries > 2) throw new Error('no frames after restarting the camera');
    if (recorder && recorder.state !== 'inactive') recorder.stop(); // the clip ends there
    stopCamera();
    await startCamera();
    if (!running) return;
    lastFrameAt = now();
    Voice.say('The camera is back. Let us do this step again.');
    // The still step starts a new clip itself, so the kept clip covers the redone still and the
    // pedalling; a redone pedal step needs its own, or the clip would miss the pedalling, the part
    // the full analysis needs.
    if (phase === 'pedal') startRecording();
    if (phase) go(phase, now());
  } catch {
    if (running && recoverTries < 2) retry = true;
    else {
      stop();
      setStatus('The camera stopped. Tap Start to begin again.', true);
    }
  } finally {
    recovering = false;
  }
  if (retry) setTimeout(() => recoverCamera(true), 2000);
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
  // Each recorder keeps its own pieces: a recorder stopped by a camera restart hands in its last piece
  // after the next one has started, and that piece must not end up at the start of the new clip.
  const chunks = [];
  r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  r.onstop = () => { if (recorder === r && chunks.length) videoBlob = new Blob(chunks, { type: r.mimeType || 'video/mp4' }); };
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
  el.stopped.hidden = true;
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
  session = { at: new Date(), tries: {}, setup }; // tries: frame corrections said so far, by check
  Voice.last.clear();
  Voice.count.clear();
  videoBlob = null;
  lastFrameAt = 0;
  camWarned = false;
  recoverTries = 0;
  detectFails = 0;
  skipped.clear();
  warnings.clear();
  recent = [];
  sideCache = { side: 'L', n: 0 };
  track = null;
  cands = [];
  crowd = {};
  lastStepT = null;
  el.runSetup.textContent = fit.setupOf(setup).bike ? `Bike ${fit.setupOf(setup).bike}` : '';
  el.sayNote.hidden = true;
  show('run');
  running = true;
  el.start.disabled = false;
  el.again.disabled = false;
  setStatus(landmarker || SIM ? 'Ready.' : '');
  go('phone', now());
}

// Stopped: nothing was saved, and a change that is still waiting is still waiting. The card goes at
// the top of the home screen, where the page opens; "No, start anyway" is forgotten, so that change
// is asked about again.
function stop() {
  running = false;
  phase = null;
  quietResults();
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  stopCamera();
  wake?.release?.();
  declined.clear();
  const h = loadHistory();
  el.stoppedWait.hidden = !(fit.pendingChange(h) || fit.askMade(h));
  el.stopped.hidden = false;
  renderHistory();
  show('home');
  setStatus(landmarker || SIM ? 'Ready.' : '');
}

// The result of this session from what was measured, folded with the history from before it: the
// retest of a change made last time (fit.judgeChange) and a held-still reading out of range twice
// running (fit.withStillHistory).
function computeResult(history) {
  const advice = fit.withStillHistory(fit.advise(session.still, session.pedal, session.setup), history);
  lastResult = fit.withRetest(advice, fit.judgeChange(fit.pendingChange(history),
    { knee: advice.knee, src: advice.kneeSource, setup: session.setup, values: { torso: advice.torso, shoulder: advice.shoulder, elbow: advice.elbow } }));
  lastRows = fit.measures(lastResult, session.pedal);
  lastAreas = fit.areas(lastResult, lastRows);
}

async function finish() {
  running = false;
  phase = null;
  videoBlob = await stopRecording();
  stopCamera();
  wake?.release?.();
  howHeldTapped = false;
  lastHistory = loadHistory();
  computeResult(lastHistory);
  lastId = saveHistory(lastResult, lastRows, lastAreas);
  renderResults(lastResult, lastRows, lastHistory);
  show('results');
  summaryTimer = setTimeout(() => { summaryTimer = null; Voice.say(fit.spokenSummary(lastResult, { pain })); }, 2500);
}

let lastRows = [], lastAreas = [];
function renderResults(r, rows, history) {
  el.rOverall.className = 'pill ' + r.overall; // hidden: the areas carry the statuses
  el.rOverall.textContent = fit.STATUS[r.overall];
  // Pain or numbness first: for those riders a phone check is only a starting point.
  el.rPain.hidden = !pain;
  el.rPain.textContent = pain ? fit.painNote(r) : '';
  // The headline and its reason depend on the verdict (fit.advise): a change, no change, two
  // readings that point different ways, only the held-still reading, or nothing measured.
  const h = fit.headline(r);
  el.rWhat.textContent = h.what;
  el.rWhy.textContent = [h.why, ...r.notes].join(' ');
  // Before and after a change marked last time, with how much it should have moved.
  el.rCompare.hidden = !r.retest;
  el.rCompare.textContent = r.retest?.text || '';
  renderMade(r.change);
  // How the bike stayed up, because sessions are only compared with others filmed the same way.
  const bike = fit.setupOf(r.setup).bike;
  el.rSetup.hidden = !bike;
  el.rSetup.textContent = bike ? `Bike ${bike}, pedalling ${r.pedalDir}.` : '';
  renderHowHeld(r);
  el.rDisagree.hidden = !r.stillOut || !!r.stillOutAgain;
  const w = fit.warnLine(warnings, r.setup);
  el.rWarn.hidden = !w;
  el.rWarn.textContent = w;
  // One item per area (fit.areas): its name and status, why, and one step, then the angles behind
  // it as detail, with no status or step of their own. "More numbers" starts folded away. Under a
  // saddle change, how to make it, folded away too.
  el.rList.replaceChildren(...lastAreas.map((a) => {
    const li = document.createElement('li');
    li.className = 'area ' + a.key;
    const detail = document.createElement('ul');
    detail.className = 'detail';
    detail.append(...a.rows.map(x => detailRow(x, history)));
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
    if (a.key === 'saddle' && r.change?.kind === 'saddle') li.append(howTo(r.change.raise));
    li.append(detail);
    return li;
  }));
  // The picture is titled "with the pedal at its lowest point", so not shown when it was not there.
  const shot = Number.isFinite(r.stillOffBottom) ? null : session.stillShot;
  el.shotCard.hidden = !shot;
  if (shot) el.rShot.src = shot;
  el.saveVideo.hidden = !videoBlob;
}

// "How to raise the saddle" (fit.saddleHowTo, from Park Tool), closed by default.
function howTo(raise) {
  const h = fit.saddleHowTo(raise);
  const d = document.createElement('details');
  d.className = 'howto';
  d.id = 'rHowTo';
  const s = document.createElement('summary');
  s.textContent = h.title;
  const ol = document.createElement('ol');
  ol.append(...h.steps.map(x => { const li = document.createElement('li'); li.textContent = x; return li; }));
  d.append(s, ol, ...h.notes.map(x => { const p = document.createElement('p'); p.className = 'small'; p.textContent = x; return p; }));
  return d;
}

// The pedals turned the other way from the setup chosen: the tap may have been wrong, so ask how
// the bike was really held. A tap files this session under that setup (and remembers it); with no
// tap, nothing changes.
let howHeldTapped = false;
function renderHowHeld(r) {
  const want = fit.setupOf(r.setup).dir;
  const seen = session.pedal?.direction ? r.pedalDir : null;
  const other = seen && seen !== want;
  el.rHow.hidden = !(other || warnings.has('way') || howHeldTapped);
  if (el.rHow.hidden) return;
  el.rHowQ.textContent = howHeldTapped ? `Saved as: ${fit.setupOf(r.setup).name}. The results here are for that.`
    : other ? `You pedalled ${seen} the whole time. How was the bike held?`
    : `You pedalled ${want === 'forwards' ? 'backwards' : 'forwards'} part of the time. How was the bike held?`;
  for (const b of el.rHow.querySelectorAll('[data-refile]')) b.setAttribute('aria-pressed', String(howHeldTapped && b.dataset.refile === r.setup));
}
function refile(id) {
  if (!fit.SETUPS[id] || !session || !lastId) return;
  chooseSetup(id);
  session.setup = id;
  howHeldTapped = true;
  if (fit.setupOf(id).dir === lastResult?.pedalDir) warnings.delete('way');
  const before = loadHistory().filter(s => s.at !== lastId);
  computeResult(before);
  saveHistory(lastResult, lastRows, lastAreas, lastId);
  lastHistory = before;
  renderResults(lastResult, lastRows, before);
}

// One measurement under its area: name, value, target, why, and how it compares with last time.
function detailRow(x, history) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="n"></span><span class="v"></span><span class="meta"><span class="t"></span><span class="p"></span></span><span class="why"></span>';
  li.querySelector('.n').textContent = x.name;
  li.querySelector('.v').textContent = Number.isFinite(x.value) ? `${round(x.value)}°` : '–';
  li.querySelector('.t').textContent = x.target;
  // Compared with the last session, inside the camera's error (fit.compareLast), saying whether it
  // came closer to the target. The hip is for reference only and is not compared.
  // Only with a session filmed with the bike held the same way; if there is none, say so.
  const previous = x.grade !== 'info' ? fit.lastWith(history, x.key, lastResult?.setup) : null;
  const elsewhere = x.grade !== 'info' && Number.isFinite(x.value) ? fit.lastElsewhere(history, x.key, lastResult?.setup) : null;
  if (previous) {
    const c = fit.compareLast(x.value, previous.values[x.key], dayLabel(previous.at), fit.TARGETS[fit.TARGET_OF[x.key]]);
    li.querySelector('.p').textContent = c && previous.warn?.length ? `${c} (that check was less exact)` : c;
  } else if (elsewhere) li.querySelector('.p').textContent = fit.notCompared(elsewhere, dayLabel(elsewhere.at));
  li.querySelector('.why').textContent = x.why;
  return li;
}

// ── "how far did you move it?" ───────────────────────────────────────────────────────────────
// The change card, on the results screen ('r') and at home ('h'): the only way the app learns what
// was really changed. For a saddle change, buttons for 5, 10 and 15 mm and Other, nothing chosen
// beforehand and nothing saved until he chooses; for the handlebars, one "I made this change". Only
// the change (which way, how many millimetres) and when are stored, in that session's history entry.
const card = (p) => ({ q: p === 'r' ? $('made-h') : el.hMadeQ, mmRow: $(p + 'MadeMmRow'), otherRow: $(p + 'MadeOtherRow'), input: $(p + 'MadeMm'),
  err: $(p + 'MadeErr'), yes: $(p + 'MadeYes'), no: $(p + 'MadeNo'), tip: $(p + 'MadeTip') });
function fillCard(p, words) {
  const c = card(p);
  c.q.textContent = words.q;
  c.mmRow.hidden = !words.mm;
  c.otherRow.hidden = true;
  c.err.hidden = true;
  c.input.value = '';
  c.yes.hidden = !words.yes;
  c.yes.textContent = words.yes || '';
  c.no.hidden = !words.no;
  c.no.textContent = words.no || '';
  c.tip.hidden = !words.mm;
}

let rMadeMode = null;
function renderMade(change, mode = 'ask') {
  rMadeMode = change ? mode : null;
  el.rMade.hidden = !change;
  if (!change) return;
  fillCard('r', fit.madeQuestion('results', mode, fit.suggestedChange(change)));
  el.rMadeAsk.hidden = false;
  el.rMadeSaved.hidden = true;
}

// Stores the change on the history entry id. Returns { made, saved }, or null without a usable number.
function markMade(id, change, mm) {
  const made = fit.madeChange(change, mm, new Date().toISOString());
  if (!made || !id) return null;
  const h = loadHistory(), entry = h.find(s => s.at === id);
  let saved = false;
  if (entry) {
    entry.made = made;
    try { localStorage.setItem(HKEY, JSON.stringify(h)); saved = true; } catch { /* private mode */ }
  }
  renderHistory();
  return { made, saved };
}

function madeHere(mm) {
  const before = rMadeMode === 'before';
  const m = markMade(lastId, lastResult?.change, mm);
  if (!m) { card('r').err.hidden = false; return; }
  rMadeMode = 'saved';
  el.rMadeAsk.hidden = true;
  el.rMadeSaved.hidden = false;
  el.rMadeSaved.textContent = m.saved ? fit.madeNote(m.made) : 'This browser is not keeping your sessions, so I cannot check it next time.';
  if (m.saved && m.made.mm > fit.MADE_STEP_MAX) { Voice.unlock(); Voice.say(fit.madeNote(m.made)); }
  if (before) start();
}

// Sessions whose change he said he did not make ("No, film anyway"), for this page view only, until Stop.
const declined = new Set();
// The newest session's change, when no one has said whether it was made (fit.askMade).
function unanswered() {
  const e = fit.askMade(loadHistory());
  return e && !declined.has(e.at) ? e : null;
}

// The same question on the home screen, for when he has left the results screen without answering.
let hMadeMode = 'ask', hMadeId = null;
function renderHomeMade() {
  const e = unanswered();
  el.hMade.hidden = !e;
  if (!e) { hMadeId = null; return; }
  if (e.at !== hMadeId) { hMadeId = e.at; hMadeMode = 'ask'; }
  fillCard('h', fit.madeQuestion('home', hMadeMode, e.suggested, dayLabel(e.at)));
  // "Before you start" already starts the check with either answer.
  el.hMadeStart.hidden = hMadeMode === 'before';
}
function madeHome(mm) {
  const e = unanswered(), before = hMadeMode === 'before';
  if (!e) return;
  const m = markMade(e.at, e.suggested, mm);
  if (!m) { card('h').err.hidden = false; return; }
  if (m.saved && m.made.mm > fit.MADE_STEP_MAX) { setStatus(fit.madeNote(m.made)); Voice.unlock(); Voice.say(fit.madeNote(m.made)); }
  if (before) start();
}

// Asks the question in place of starting, once, when a change is still unanswered.
function askFirst(where) {
  if (!unanswered()) return false;
  if (where === 'results' && lastResult?.change && rMadeMode !== 'saved') {
    renderMade(lastResult.change, 'before');
    el.rMade.scrollIntoView({ block: 'center' });
    $('made-h').focus({ preventScroll: true });
    return true;
  }
  if (where === 'home' && !el.hMade.hidden) {
    hMadeMode = 'before';
    renderHomeMade();
    el.hMade.scrollIntoView({ block: 'center' });
    el.hMadeQ.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function resultText(r) {
  const w = fit.warnLine(warnings, r.setup);
  return [
    `Bike Fit Coach, ${new Date().toLocaleString()}`,
    `Result: ${fit.headline(r).what}.`,
    fit.setupOf(r.setup).bike ? `Bike ${fit.setupOf(r.setup).bike}, pedalling ${r.pedalDir}.` : '',
    r.retest ? r.retest.text : '',
    ...lastAreas.flatMap(a => [
      `${a.name}: ${a.status}. ${a.step}`,
      ...a.rows.map(x => `  ${x.name}: ${Number.isFinite(x.value) ? round(x.value) + '°' : 'no reading'} (${x.target})`),
    ]),
    `Pedal strokes measured: ${session.pedal?.strokes ?? 0}.`,
    w, // the same words as on the screen
    'Not medical advice.',
  ].filter(Boolean).join('\n');
}

const HKEY = 'bfc.history.v1';
function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; } }
// replaceAt: the id of this session's entry, to file it again (a different setup chosen afterwards);
// a change already marked as made is kept when the suggestion still stands.
function saveHistory(r, rows, areas, replaceAt = null) {
  const h = loadHistory();
  const values = Object.fromEntries(rows.filter(x => Number.isFinite(x.value)).map(x => [x.key, round(x.value)]));
  const old = replaceAt ? h.find(s => s.at === replaceAt) : null;
  if (old) h.splice(h.indexOf(old), 1);
  // 'at' doubles as the session's id, so "I made this change" can find this entry again.
  const at = replaceAt || new Date().toISOString();
  const grades = Object.fromEntries(areas.filter(a => a.key !== 'more').map(a => [a.key, a.grade]));
  // held: this session's retest held the next change back, so the change it checked stays waiting
  // for one more film (fit.pendingChange).
  // suggested: the change itself, so "Did you make this change?" can still be asked from the home screen.
  // v: how the angles were measured (2: the pedalling knee interpolated to the true bottom).
  // setup: how the bike stayed up, so it is only compared with sessions filmed the same way.
  // stillOut: the held-still reading was out of range while pedalling was in range (fit.withStillHistory).
  // nothing: nothing to do after it, for "Your fit ... Nothing to change" at home.
  h.unshift({ at, v: 2, setup: r.setup, pedalDir: r.pedalDir, knee: round(r.knee), src: r.kneeSource, values, areas: grades, change: r.change ? r.change.headline : null,
    ...(r.change ? { suggested: fit.suggestedChange(r.change) } : {}), warn: [...warnings], ...(r.held ? { held: true } : {}),
    ...(r.stillOut ? { stillOut: true } : {}), ...(fit.nothingToDo(r) ? { nothing: true } : {}),
    ...(old?.made && old.made.kind === r.change?.kind ? { made: old.made } : {}) });
  try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch { /* private mode: keep going without history */ }
  renderHistory();
  return at;
}
const dayLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
function renderHistory() {
  const h = loadHistory();
  // The retest card while a marked change is waiting to be checked, with its own Start.
  const pending = fit.pendingChange(h);
  el.retestCard.hidden = !pending;
  retestNote(pending);
  renderHomeMade();
  el.histCard.hidden = !h.length;
  el.home.classList.toggle('returning', h.length > 0);
  // For a rider who has filmed before, the setup steps fold away, so Start is on the first screen.
  el.stepsFold.open = !h.length;
  el.stepsFold.classList.toggle('first', !h.length);
  // The newest session that measured something, its two areas like a summary you can glance at.
  const latest = fit.lastChecked(h);
  el.histLatest.hidden = !latest?.areas;
  if (latest?.areas) {
    const line = document.createElement('span');
    line.textContent = `Your fit, last checked ${dayLabel(latest.at)}` + (fit.setupOf(latest.setup).bike ? `, bike ${fit.setupOf(latest.setup).bike}` : '');
    const parts = [line];
    // "Nothing to change" when no area has a step (saved with nothing: true; older sessions: both Good).
    if (latest.nothing || (latest.nothing == null && latest.areas.saddle === 'green' && latest.areas.reach === 'green' && !latest.change)) {
      const n = document.createElement('span');
      n.className = 'nothing';
      n.textContent = 'Nothing to change';
      parts.push(n);
    }
    el.histLatest.replaceChildren(...parts, areaPills(latest.areas));
  }
  el.history.replaceChildren(...h.slice(0, 8).map(s => {
    const li = document.createElement('li');
    const d = new Date(s.at);
    const a = document.createElement('span');
    a.className = 'when';
    a.textContent = [dayLabel(s.at) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      fit.setupOf(s.setup).tag, ...fit.historyWords(s)].filter(Boolean).join(' · ');
    // Sessions saved before the areas existed show their knee reading instead.
    let b;
    if (s.areas) b = areaPills(s.areas);
    else { b = document.createElement('span'); b.className = 'num small'; b.textContent = `knee ${s.knee ?? '–'}°`; }
    li.append(a, b);
    return li;
  }));
}
// The retest card's words, dated by the check that suggested the change, and a warning when the
// choice above is not how the bike was held for that check: then the next film cannot check it.
function retestNote(pending = fit.pendingChange(loadHistory())) {
  if (!pending) { el.retestText.textContent = ''; return; }
  const differs = setup && !fit.sameSetup(setup, pending.setup) && fit.setupOf(pending.setup).bike;
  el.retestText.textContent = fit.retestPrompt(pending.made, dayLabel(pending.at), pending.setup)
    + (differs ? ` You have chosen "${fit.setupOf(setup).name}" above, so that film would not check it.` : '');
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

// Start, from the main button or a card's own: ask how the bike stays up first, then about an
// unanswered change, then start.
const startFromHome = () => { if (!askSetup() && !askFirst('home')) start(); };
el.start.addEventListener('click', startFromHome);
el.retestStart.addEventListener('click', startFromHome);
el.hMadeStart.addEventListener('click', startFromHome);
el.again.addEventListener('click', () => { if (!askFirst('results')) start(); });
el.stop.addEventListener('click', stop);
el.done.addEventListener('click', () => {
  quietResults();
  // The picture is only for the results screen; it is not kept once you leave it.
  el.rShot.removeAttribute('src');
  if (session) session.stillShot = null;
  show('home');
  setStatus(landmarker || SIM ? 'Ready.' : '');
});
// "Say it again": the longer version, with the reason and the other angles.
el.speak.addEventListener('click', () => { Voice.unlock(); if (lastResult) Voice.say(fit.spokenSummary(lastResult, { pain, long: true }), { interrupt: true }); });
for (const p of ['r', 'h']) {
  const c = card(p), save = p === 'r' ? madeHere : madeHome;
  for (const b of c.mmRow.querySelectorAll('[data-mm]')) {
    b.addEventListener('click', () => {
      if (b.dataset.mm !== 'other') { save(Number(b.dataset.mm)); return; }
      c.otherRow.hidden = false;
      c.input.focus();
    });
  }
  $(p + 'MadeSave').addEventListener('click', () => save(c.input.value));
  c.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(c.input.value); });
}
el.rMadeYes.addEventListener('click', () => madeHere(null)); // the handlebars: no number
el.rMadeNo.addEventListener('click', () => {
  if (rMadeMode === 'before') { declined.add(lastId); renderHistory(); start(); return; }
  renderMade(lastResult?.change, 'later');
});
$('hMadeYes').addEventListener('click', () => madeHome(null));
$('hMadeNo').addEventListener('click', () => {
  const e = unanswered();
  if (!e) return;
  if (hMadeMode === 'before') { declined.add(e.at); renderHistory(); start(); return; }
  hMadeMode = 'later';
  renderHomeMade();
});
for (const b of el.rHow.querySelectorAll('[data-refile]')) b.addEventListener('click', () => refile(b.dataset.refile));
function setPain(v) {
  pain = v;
  el.painYes.setAttribute('aria-pressed', String(v));
  el.painNo.setAttribute('aria-pressed', String(!v));
}
el.painYes.addEventListener('click', () => setPain(true));
el.painNo.addEventListener('click', () => setPain(false));
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
  // Off the bike after a correction, the mount step has taken over (frame tick): the same Skip.
  if (phase === 'mount' && ph.fromFix && session.fixKey && !skipped.has(session.fixKey)) {
    skipCheck(session.fixKey);
    session.skippedOff = true;
    el.skip.hidden = true;
    Voice.say('Skipped. Get back on the bike.', { interrupt: true });
  }
});

// ── simulation: the whole flow with a synthetic rider ────────────────────────────────────────
// On a trainer the made-up rider pedals forwards, otherwise backwards. &helper=visible adds a friend
// standing in view beside the back of the bike, facing the phone, one hand on the saddle; &helper=lean
// one side-on at the rider's hip, leaning in with bent knees, almost in riding posture; &helper=braced
// one half-crouched behind the rider's hip, knees bent 35, leaning 45, a hand to the stem, who sits
// like a rider. &arrive=<step> has a helper come to the rider's hip during that step and stay
// (&ah=bars, the default: leaning in, the camera-side hand on the hoods where the rider's hand is;
// &ah=braced: as &helper=braced), and for the first &miss=<s> seconds (default: the first frame) the
// pose model finds only the helper, not the rider. The poses come in a shuffled order, as a real pose
// model may give them, and the frame says which one is the rider (-1: he is not among them) so wrong
// picks can be counted (debug.wrongPicks). The made-up rider does
// what the voice asks: turns the pedals twice once the question who the rider is has begun to play,
// and after a correction of the picture gets off, moves the phone (so it has to be levelled again,
// unless &slide) and gets back on.
async function makeSim() {
  const { synthPose, synthHelper, seeded } = await import('./test/synth.js');
  const low = params.has('low');
  const helper = params.get('helper');
  const late = Number(params.get('late')) || 3;
  const back = Number(params.get('back')) || 3;
  const away = Number(params.get('away')) || 0;
  const awayShift = Number(params.get('awayshift')) || 0;
  const pedalMode = params.get('pedal');
  const slide = Number(params.get('slide')) || 0;
  const unfixed = params.has('unfixed');
  const arriveIn = params.get('arrive');
  const arriving = { bars: { at: -200, frontal: false, lean: 30, kneeBend: 20, depth: 0.9, reach: [540, 640] },
    braced: { at: -650, frontal: false, lean: 45, kneeBend: 35, depth: 0.9, reach: [450, 700] } }[params.get('ah') || 'bars'];
  const arriveMiss = Number(params.get('miss')) || 0.01;
  const restPose = params.get('restpose') === 'braced';
  const shuffle = seeded(5);
  Tilt.available = true;
  Tilt.landscape = true;
  // off: when the last correction of the picture was said; moved: the phone has been moved since;
  // fixed: the picture is right (the camera was at an angle, farGap, until the phone was moved).
  const s = { off: null, moved: false, tilted: false, fixed: false, frozen: null };
  s.frame = (t) => {
    const dt = t - phaseT0;
    if (phase === 'frame' && ph.askedOff != null && ph.askedOff !== s.off) Object.assign(s, { off: ph.askedOff, moved: false, tilted: false });
    // After a correction he gets off 1 s later and moves the phone. Moving it tilts it from 3 s, so
    // the phone step has him level it again. With &slide=<px> it is turned or slid along without
    // tilting it, and at 6 s he is back on the bike, <px> further along in the picture.
    const pending = s.off != null && !s.moved;
    if (pending && slide && t - s.off > 6) Object.assign(s, { moved: true, fixed: !unfixed });
    if (pending && !slide && t - s.off > 3) s.tilted = true;
    // The phone is levelled once the placement instructions have been heard, as a rider would.
    Tilt.pitch = phase === 'phone' ? Math.max(0, 7 - 3 * Math.max(0, quiet(t))) : s.tilted ? 6 : 0.4;
    Tilt.roll = 0.3;
    if (phase === 'phone' && s.tilted) Object.assign(s, { moved: true, tilted: false, fixed: !unfixed });
    const offBike = s.off != null && !s.moved && t - s.off >= 1; // off the bike, at the phone
    // &away=<s>: once a session, 1 s into holding still, he gets off for that long to rest, then gets
    // back on, &awayshift=<px> further along in the picture if set (the bike rolled, or the friend
    // took a new grip). Back from the break he is on the bike, also if the app went back to getting on.
    if (phase === 'still' && away && s.awayAt == null && dt > 1) Object.assign(s, { awayAt: t, awayStill: phaseT0 });
    const resting = s.awayAt != null && t - s.awayAt < away;
    let lm = null;
    // farGap: the camera at an angle until the phone has been moved (farGap in synth.js), in every
    // step he is on the bike, as a real phone at an angle would see him.
    const o = { noise: 1.2, hipShift: low ? [0, -35] : [0, 0], farGap: s.fixed ? 0 : -80 };
    // Forwards turns the crank clockwise (synth.js). &pedal=wrong pedals the other way, to try the
    // "pedal forwards" line.
    const way = (session?.setup === 'trainer' ? -1 : 1) * (pedalMode === 'wrong' ? -1 : 1);
    if (phase === 'mount' && !offBike && (ph.fromRest || dt > (session.mounts > 1 ? back : late))) {
      // Asked to turn the pedals: two turns in 3 s, 2 s after the question began to play. Only a
      // question he heard: one that was never said leaves him sitting still.
      const heard = ph.askT != null ? debug.started.findLast(x => x.t >= ph.askT && /^Rider: .*turn the pedals/.test(x.text)) : null;
      const a = heard ? t - heard.t - 2 : -1;
      lm = synthPose(a > 0 && a < 3 ? (way * 2 * Math.PI * a) / 1.5 : 0, o);
    }
    if (phase === 'frame' && !offBike) lm = synthPose(0, o);
    if (phase === 'still') {
      const sd = s.awayStill === phaseT0 ? dt - away : dt;
      lm = synthPose(sd < 5 ? 0 : -Math.PI / 2, o);
    }
    if (phase === 'pedal') {
      let th = -Math.PI / 2 + way * (dt < 2 ? 0 : (2 * Math.PI * (dt - 2)) / 1.1);
      // &pedal=stop: the crank stops 4 s after the timing started. &pedal=none: it never turns.
      if (pedalMode === 'stop' && ph.started && t - ph.started > 4) th = s.frozen ??= th;
      if (pedalMode === 'none') th = -Math.PI / 2;
      lm = synthPose(th, o);
    }
    if (lm && slide && s.moved) lm = lm.map(p => ({ ...p, x: p.x + slide / 1280 }));
    if (resting) lm = null;
    if (lm && awayShift && s.awayAt != null) lm = lm.map(p => ({ ...p, x: p.x + awayShift / 1280 }));
    if (arriveIn && lm && phase === arriveIn) s.arrT ??= t;
    if (s.arrT != null && t - s.arrT < arriveMiss) lm = null; // the pose model misses him as the helper arrives
    const poses = lm ? [lm] : [];
    if (s.arrT != null) poses.push(synthHelper({ ...arriving, noise: 1.2 }));
    if (helper === 'visible') poses.push(synthHelper({ at: -520, reach: [-300, 745], noise: 1.2 }));
    if (helper === 'lean') poses.push(synthHelper({ at: -260, frontal: false, lean: 40, kneeBend: 25, depth: 0.95, noise: 1.2 }));
    if (helper === 'braced') poses.push(synthHelper({ at: -650, frontal: false, lean: 45, kneeBend: 35, depth: 0.9, reach: [450, 700], noise: 1.2 }));
    // &restpose=braced: while he is away on his break, the friend half-crouches at the bike as
    // &helper=braced does (in place of &helper's pose, or into view if there is none); once he is
    // back, as before.
    if (restPose && resting) {
      const i = poses.findIndex(x => x !== lm);
      if (i >= 0) poses.splice(i, 1);
      poses.push(synthHelper({ at: -650, frontal: false, lean: 45, kneeBend: 35, depth: 0.9, reach: [450, 700], noise: 1.2 }));
    }
    if (poses.length > 1 && shuffle() < 0.5) poses.reverse();
    return { poses, W: 1280, H: 720, rider: lm ? poses.indexOf(lm) : -1 };
  };
  return s;
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
        // Up to 2 people, so a friend holding the bike can be told apart from the rider (fit.pickRider)
        // rather than measured by mistake. In the headless test browser this made each frame about
        // twice as slow when only one person was in view.
        runningMode: 'VIDEO', numPoses: 2,
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
  renderSetup();
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
  // The service worker is registered once the model has loaded (or failed to), so when it caches the
  // engine and the model on install, the browser's own cache can answer instead of a second download.
  const registerWorker = () => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); };
  if (!navigator.mediaDevices?.getUserMedia) {
    registerWorker();
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
  registerWorker();
}
boot();
