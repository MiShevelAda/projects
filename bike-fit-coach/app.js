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
// The screens: &screen=towards|away (or front|rear) answers "Where will the screen face?"; &tab=
// progress|learn opens on that tab; &installed acts as if opened from the Home Screen; with ?sim,
// &seed=asked|trend|good fills a made-up history kept in memory only (seedHistory). The phone's roll,
// in the simulation: &roll=<degrees> stands the made-up phone rolled that much about its lens (the
// picture and the motion sensor both say so), &land=left|right which way up it is sideways (the top
// of the phone to the left or right as you face the screen), &conv=ios|spec the sign the sensor
// reports gravity with, and &noderoll leaves the roll in, to see what it would cost. Round 3, builder C:
// &low=<mm> how far the made-up saddle sits too low (35 by default), and a saddle change marked in this
// page view moves it by that much, so Check It Now can show a change that worked; &moved: the made-up
// phone is picked up after a check (and put back at an angle to the bike), &replaced: picked up and
// put back square on the tape marks, as a rider coming back another day would, and &nomotion: there
// is no motion reading after it, so Check It Now cannot tell whether it moved and asks; &inapp acts
// as if opened inside another app's browser. Builder D: &voice=off, with ?sim, plays no recorded clips
// and times every line by the word estimate, as before the recorded voice, for quick headless runs.

import * as fit from './fit.js';
import * as ui from './ui.js';

const params = new URLSearchParams(location.search);
const SIM = params.has('sim');
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(['home', 'flow', 'flowSetup', 'flowScreen', 'flowPain', 'flowReady', 'screenNext', 'screenBack', 'screenClose', 'painNext', 'painBack', 'painClose',
  'painErr', 'painCard', 'painQ', 'screenQ', 'run', 'results', 'start', 'status', 'cam', 'overlay', 'say', 'sayNote', 'runSetup', 'steps', 'chips', 'skip', 'stop', 'timer',
  'stage', 'placeView', 'placeSub', 'levelView', 'levelDeg', 'levelSub', 'bubble', 'bubbleBar', 'sign', 'signArrow', 'signCheck', 'signWord', 'signSub', 'ringView', 'ring', 'ringArc', 'holdIcon',
  'ringWord', 'ringSub', 'fixCard', 'fixArrow', 'field', 'fieldCheck', 'fieldUp', 'fieldDown', 'fieldWord', 'fieldSub', 'seeWhat', 'border', 'borderRect', 'stepLabel',
  'histCard', 'history', 'rOverall', 'rStatus', 'rWhat', 'rWhy', 'rDisagree', 'rWarn', 'rList', 'rHowToSlot', 'keepVideo', 'shotCard', 'rShot', 'again', 'speak', 'saveVideo', 'copy', 'done',
  'retestCard', 'retestTitle', 'retestText', 'retestStart', 'freshCard', 'newCheck', 'painNo', 'painYes', 'rPain', 'rCompare', 'rMade', 'rMadeAsk', 'rMadeSaved', 'rMadeYes', 'rMadeNo', 'rMadeNow',
  'hMade', 'hMadeQ', 'hMadeStart', 'setupCard', 'setupQ', 'setupErr', 'setupNote', 'rSetup', 'rHow', 'rHowQ', 'stopped', 'stoppedWait', 'stepsFold',
  'flowNext', 'flowClose', 'readyBack', 'readyClose', 'howPlay', 'howPlayText', 'howPlayPath', 'howVideo', 'howPoster',
  'tabCheck', 'tabProgress', 'tabLearn', 'today', 'homeStatus', 'a2hs', 'showShare', 'shareHint', 'shareHintClose', 'homeSummary',
  'assessCard', 'latestHead', 'latestSub', 'latestCards', 'showAll', 'progCard', 'segSaddle', 'segReach', 'changes', 'changesH',
  'flowAllow', 'allowStart', 'allowStatus', 'allowBack', 'allowClose', 'hearMe', 'flowWhere', 'whereYes', 'whereNo', 'whereClose',
  'rWhen', 'whenTonight', 'whenWeekend', 'whenPick', 'whenPickRow', 'whenDate', 'whenAdd', 'whenSkip', 'rWhenDone', 'rMadeHint', 'fixTape',
  'inApp', 'copyLink', 'copyDone', 'hearHint',
  'flowFitter', 'fitterQ', 'fitterCard', 'fitterErr', 'fitterNo', 'fitterYes', 'fitterNext', 'fitterBack', 'fitterClose',
  'flowFeel', 'feelQ', 'feelSub', 'feelCard', 'feelErr', 'feelNext', 'feelLater', 'feelBack', 'feelClose',
  'flowRevert', 'revertH', 'revertSub', 'revertNext', 'revertClose', 'kitRow', 'warmRow', 'kitDiff',
  'demo', 'demoVideo', 'placeVideo', 'learnDemo', 'learnVideo', 'learnTrainer', 'learnWall', 'learnFriend', 'exactU',
  'fitterSet', 'fitterSetSub', 'fitterChange']
  .map(id => [id, $(id)]));
const now = () => performance.now() / 1000;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const round = (v) => (Number.isFinite(v) ? Math.round(v) : null);

// ── voice ────────────────────────────────────────────────────────────────────────────────────
// Lines are queued here and said one at a time, and the caption on the screen (#say) changes when a
// line starts playing, not when it is queued, so the screen shows what the voice is saying.
// The voice is the coach's recorded one: every line the app can say is a clip in assets/voice/, made
// with Kokoro's af_heart voice (tools/voice/build-voice.mjs; DECISIONS.md, the Heart entry and "Needs
// to be build in"), found by its exact words in assets/voice/manifest.json and played through ONE
// shared <audio id="voice"> element. A media element follows the phone's media volume, which is
// likely to be heard with the phone on silent, where Web Audio and Web Speech follow the silent switch
// (likely, not yet confirmed on an iPhone). iOS lets a page play sound only after a tap, so a tap that
// leads to sound plays a moment of silence on that element first (Voice.unlock); after that the
// element may play on its own. A line built from parts (the spoken result) is played sentence by
// sentence (ui.voiceParts). The phone's own speech voice is only the fallback for a clip that fails
// to load or play. Without either (the Node tests, a browser with no sound), the caption and the step
// clocks go by an estimate of the speaking time: about 150 words a minute (a second-hand figure),
// faster in the simulation so it does not drag; with clips, by their real lengths.
const RATE = SIM ? 12 : 2.5; // words per second
const PAD = SIM ? 0.2 : 0.5; // seconds after each line
// Every line for the friend starts "Friend"; a design choice: 1.5 s of quiet between a line for the
// friend and one for the rider, so each can hear that the other's instruction is over.
const TURN_GAP = 1.5;
const speaker = (text) => (/^Friend\b/.test(text) ? 'friend' : 'rider');
const VOICE_DIR = 'assets/voice/';
// A twentieth of a second of silence, made here (8 kHz, 8 bit, mono WAV), for unlocking the element.
function silence() {
  const n = 400, b = new DataView(new ArrayBuffer(44 + n));
  const text = (at, s) => [...s].forEach((c, i) => b.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); b.setUint32(4, 36 + n, true); text(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true); text(36, 'data'); b.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
}
// The recorded clips. ok: this browser can play them (a real <audio> element, fetch and object URLs;
// not the Node tests). map: the manifest, words to { file, duration }, once it has loaded. Each clip
// is fetched once (through the service worker, so from its cache when offline) and kept as an object
// URL: a plain file address would make the element ask for byte ranges, which a cached copy cannot
// answer on Safari.
const Clips = {
  ok: false, el: null, map: null, loading: null, urls: new Map(), ready: new Map(), primed: false, quiet: null, selfAt: -1, part: null,
  init() {
    this.el = document.getElementById('voice');
    if (SIM && params.get('voice') === 'off') return;
    this.ok = typeof HTMLAudioElement === 'function' && this.el instanceof HTMLAudioElement && typeof fetch === 'function' && typeof URL?.createObjectURL === 'function';
    if (!this.ok) return;
    // The clips are AAC, which Safari, Chrome and Firefox play; a browser that cannot (an open-source
    // Chromium build, say) goes straight to the phone's voice instead of failing clip by clip.
    if (!this.el.canPlayType?.('audio/mp4; codecs="mp4a.40.2"')) { this.ok = false; debug.voice.errors.push('this browser does not play AAC'); return; }
    this.el.preload = 'auto';
    // The sound log (ui.soundLog, Copy Results): a pause the app did not cause, before the clip's
    // end, is the phone's (another app's sound, a call, Siri, the audio route changing). The pause
    // that comes with a clip's natural end, and any within half a second of the app pausing the
    // element or changing its clip itself (selfAt), are not cuts.
    this.el.addEventListener('pause', () => {
      const a = this.el, c = Voice.cur;
      if (now() - this.selfAt < 0.5 || !c || c.done || a.ended) return;
      if (!(a.duration > 0) || a.currentTime >= a.duration - 0.15) return;
      Voice.logCut('paused', this.part || c.text, a);
    });
    this.loading = fetch(VOICE_DIR + 'manifest.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
      .then(m => { this.map = new Map((m.clips || []).map(c => [c.text, c])); debug.voice.clips = this.map.size; })
      .catch(e => { this.map = new Map(); debug.voice.errors.push(String(e?.message || e)); });
  },
  has(text) { return !!this.map?.has(text); },
  parts(text) { return this.map ? ui.voiceParts(text, (t) => this.has(t)) : null; },
  // An object URL for a clip, fetched once; ready holds the ones already here, so a tap can start one
  // at once, inside the tap.
  url(text) {
    const c = this.map?.get(text);
    if (!c) return Promise.reject(new Error('no clip'));
    if (!this.urls.has(c.file)) {
      this.urls.set(c.file, fetch(VOICE_DIR + c.file)
        .then(r => (r.ok ? r.blob() : Promise.reject(new Error(`${c.file} ${r.status}`))))
        .then(b => { const u = URL.createObjectURL(new Blob([b], { type: 'audio/mp4' })); this.ready.set(c.file, u); return u; })
        .catch(e => { this.urls.delete(c.file); throw e; }));
    }
    return this.urls.get(c.file);
  },
  readyUrl(text) { const c = this.map?.get(text); return c ? this.ready.get(c.file) : null; },
  // Fetch a line's clips ahead of saying it, so one follows the other without a wait.
  prefetch(text) { for (const p of this.parts(text) || []) if (p.clip) this.url(p.text).catch(() => {}); },
  // Inside a tap: play a moment of silence on the element once, which is what iOS waits for before it
  // lets the element play on its own. Never while a line is playing (it would cut it off).
  unlock() {
    if (!this.ok || this.primed) return;
    this.primed = true;
    try {
      this.quiet ??= silence();
      this.selfAt = now();
      this.el.src = this.quiet;
      this.el.play()?.catch?.(() => {});
    } catch { this.primed = false; }
  },
};
// The voice to speak with: a Premium, then an Enhanced American or British English voice when one is
// installed on the phone (they sound less robotic), otherwise as before: British English on the
// phone, then other English on the phone, then any English.
function bestVoice(vs) {
  const local = (v, re) => re.test(v.lang) && v.localService;
  const tier = (word) => vs.find(v => local(v, /^en[-_](US|GB)/i) && new RegExp(word, 'i').test(`${v.name} ${v.voiceURI}`));
  return tier('premium') || tier('enhanced')
    || vs.find(v => local(v, /^en[-_]GB/i))
    || vs.find(v => local(v, /^en[-_](US|AU|IE|GB)/i))
    || vs.find(v => /^en/i.test(v.lang)) || null;
}
const Voice = {
  last: new Map(), count: new Map(), voice: null, engine: false,
  q: [], cur: null, gen: 0, lastEnd: 0, lastSpeaker: null, doneAt: 0,
  init() {
    Clips.init();
    this.engine = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
    if (!this.engine && !Clips.ok) return;
    el.say.removeAttribute('aria-live'); // it is spoken already; VoiceOver would say it twice
    if (!this.engine) return;
    // The fallback voice: the phone's best English one (bestVoice).
    const pick = () => { this.voice = bestVoice(speechSynthesis.getVoices()); };
    pick();
    speechSynthesis.addEventListener?.('voiceschanged', pick);
  },
  // iOS only lets a page make sound after a tap, so every tap that leads to the voice calls this
  // (through unlockSound): the speech fallback says one short word, almost silently (not empty and
  // not at volume 0: iOS may not count either as speaking), then the clip element plays a moment of
  // silence.
  unlock() {
    if (this.engine) {
      try {
        const u = new SpeechSynthesisUtterance('Hi');
        u.volume = 0.01;
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; }
        speechSynthesis.speak(u);
      } catch { /* the clips do not need it */ }
    }
    Clips.unlock();
  },
  // Seconds a line takes: its clips' real lengths when it has them, else the word estimate.
  est(text) {
    const parts = Clips.parts(text);
    if (parts?.length && parts.every(p => p.clip)) return parts.reduce((s, p) => s + Clips.map.get(p.text).duration, 0) + PAD;
    return text.split(/\s+/).length / RATE + PAD;
  },
  busy() { return !!this.cur || this.q.length > 0; },
  // A clip that stopped before its end, for the sound log (ui.soundLog): how, which words, how far in.
  logCut(how, text, a = Clips.el) {
    const at = Number.isFinite(a?.currentTime) ? a.currentTime : 0, of = Number.isFinite(a?.duration) ? a.duration : 0;
    debug.voice.cuts.push({ t: now(), how, text, at, of, phase });
  },
  // Whether a clip is sounding right now (not paused, not at its end).
  sounding() { return Clips.ok && !!Clips.el && !Clips.el.paused && !Clips.el.ended; },
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
    if (interrupt) this.cancel('newer', text);
    Clips.prefetch(text);
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
    const live = () => gen === this.gen && !item.done;
    const start = () => {
      if (gen !== this.gen || item.t0 != null) return;
      clearTimeout(item.show);
      item.t0 = now();
      el.say.textContent = item.text;
      debug.started.push({ t: item.t0, text: item.text, caption: el.say.textContent });
      this.recalc();
    };
    const end = () => {
      if (!live()) return;
      item.done = true;
      clearTimeout(item.show);
      clearTimeout(item.watch);
      this.cur = null;
      this.lastEnd = now();
      this.lastSpeaker = speaker(item.text);
      this.recalc();
      this.pump();
    };
    // One part by the estimate: shown, and over when its words would be.
    const byEstimate = (text) => new Promise(resolve => { start(); setTimeout(resolve, this.est(text) * 1000); });
    // One part in the phone's own voice; by the estimate when that cannot speak either.
    const speak = (text) => new Promise(resolve => {
      if (!this.engine) { byEstimate(text).then(resolve); return; }
      let u;
      try { u = new SpeechSynthesisUtterance(text); } catch { byEstimate(text).then(resolve); return; }
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
      u.onstart = start;
      u.onend = resolve;
      // A line the engine could not say (no voice, or not allowed yet) is shown and timed by the
      // estimate instead; one that was cut off just ends.
      u.onerror = (e) => { if (e?.error === 'interrupted' || e?.error === 'canceled') resolve(); else byEstimate(text).then(resolve); };
      try { speechSynthesis.speak(u); } catch { byEstimate(text).then(resolve); }
    });
    // One part from its clip, on the shared element. A clip that fails to load or play is said in the
    // phone's voice instead, and noted (window.__bfc.voice.fallback).
    const clip = (text) => new Promise(resolve => {
      const a = Clips.el, dur = Clips.map.get(text).duration;
      let settled = false, watch = null;
      const done = () => { if (settled) return; settled = true; clearTimeout(watch); a.onended = a.onerror = a.onplaying = null; resolve(); };
      const fail = (why) => {
        if (settled) return;
        settled = true; clearTimeout(watch); a.onended = a.onerror = a.onplaying = null;
        debug.voice.fallback.push({ text, why: why?.name && why.name !== 'Error' ? why.name : String(why?.message || why) });
        if (why?.name === 'NotAllowedError') Clips.primed = false; // iOS wants another tap first
        if (live()) speak(text).then(resolve); else resolve();
      };
      const go = (u) => {
        if (!live()) { resolve(); return; }
        a.onplaying = () => { start(); debug.voice.played.push({ t: now(), text }); };
        a.onended = done;
        a.onerror = () => fail(a.error ? new Error(`media error ${a.error.code}`) : new Error('media error'));
        // Design choice: a clip still not over 2 s after its length is moved past.
        watch = setTimeout(() => { if (this.sounding() && a.currentTime < dur - 0.2) this.logCut('timer', text, a); done(); }, (dur + 2) * 1000);
        try {
          Clips.part = text;
          Clips.selfAt = now();
          a.src = u;
          const p = a.play();
          p?.catch?.((e) => { if (e?.name !== 'AbortError') fail(e); });
        } catch (e) { fail(e); }
      };
      const ready = Clips.readyUrl(text);
      if (ready) { go(ready); return; }
      // Design choice: a clip not here within 3 s (a slow connection) is said in the phone's voice.
      const slow = setTimeout(() => fail(new Error('slow to load')), 3000);
      Clips.url(text).then((u) => { clearTimeout(slow); if (!settled) go(u); }, (e) => { clearTimeout(slow); fail(e); });
    });
    const begin = async () => {
      if (gen !== this.gen) return;
      // The manifest may still be on its way at the very start: wait for it, up to 1.5 s (a design
      // choice), then go without it.
      if (Clips.ok && !Clips.map) await Promise.race([Clips.loading, new Promise(r => setTimeout(r, 1500))]);
      if (gen !== this.gen) return;
      const parts = Clips.ok ? Clips.parts(item.text) : null;
      for (const p of parts?.some(x => x.clip) ? parts : [{ text: item.text, clip: false }]) {
        if (!live()) return;
        if (!p.clip) debug.voice.missing.push(p.text);
        await (p.clip ? clip(p.text) : speak(p.text));
      }
      end();
    };
    // Design choices, for engines that report nothing: a line that has not started after 1.5 s is
    // shown anyway, and one that has not ended after twice its estimate plus 2 s is moved past.
    // Moved past, what is still sounding stops, so it never plays over the next line.
    const overdue = () => {
      if (!live()) return;
      if (this.engine) { try { speechSynthesis.cancel(); } catch { /* nothing to stop */ } }
      if (this.sounding()) this.logCut('overdue', Clips.part || item.text);
      if (Clips.ok) { try { Clips.selfAt = now(); Clips.el.pause(); } catch { /* nothing playing */ } }
      end();
    };
    item.show = setTimeout(start, 1500 + (item.gap || 0) * 1000);
    item.watch = setTimeout(overdue, (2 * this.est(item.text) + 2 + (item.gap || 0)) * 1000);
    if (item.gap) setTimeout(begin, item.gap * 1000); else begin();
  },
  // why: 'newer' when a newer, urgent line cuts in (by: its words), else 'stop'; either is logged only
  // when a clip was still sounding.
  cancel(why = 'stop') {
    if (this.cur && this.sounding()) this.logCut(why, Clips.part || this.cur.text);
    this.gen++;
    if (this.cur) { clearTimeout(this.cur.show); clearTimeout(this.cur.watch); }
    this.q = [];
    this.cur = null;
    this.lastEnd = this.doneAt = now();
    if (this.engine) speechSynthesis.cancel();
    if (Clips.ok) { try { Clips.selfAt = now(); Clips.el.pause(); Clips.el.onended = Clips.el.onerror = Clips.el.onplaying = null; } catch { /* nothing playing */ } }
  },
  stop() { this.cancel('stop'); },
};

// ── beeps, for the spirit level ───────────────────────────────────────────────────────────────
const Beep = {
  ctx: null,
  // From a tap: start (or wake) the audio and play one silent sample, which is what iOS waits for.
  init() {
    try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume?.(); } catch { this.ctx = null; return; }
    try {
      const s = this.ctx.createBufferSource();
      s.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      s.connect(this.ctx.destination);
      s.start(0);
    } catch { /* the beeps may stay quiet; the voice does not depend on them */ }
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

// Every tap that leads to sound calls this first, before anything waits, because iOS allows sound
// only from inside a tap: the audio session first (so the silent switch does not mute the page,
// where the browser supports it), then the beeps, then the voice (speech: false for a tap that
// plays a recording, so the unlock word does not speak over it).
function unlockSound(speech = true) {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  Beep.init();
  if (speech) Voice.unlock();
}

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
    Watch.sample(now());
  },
  level() { return Math.abs(this.pitch) < 3 && Math.abs(this.roll) < 2.5; },
  error() { return Math.max(Math.abs(this.pitch) / 3, Math.abs(this.roll) / 2.5); },
};

// ── has the phone moved since it was levelled? ─────────────────────────────────────────────────
// Check It Now (the customer research, item 1) starts again at getting on when the phone is still
// where it was levelled: the rider only moved the saddle. The motion sensor watches from the moment
// the phone is level. Design choices, not measured on a phone: it has moved once it tips more than
// MOVE_DEG from where it was levelled for longer than MOVE_SECS (a tap that rocks it and lets it
// settle back is not a move), and with no reading for WATCH_GAP (the page hidden, the screen locked,
// motion not allowed) it cannot tell, so the app asks "Is the phone where it was?". Not seen: a phone
// slid along the box or turned about the vertical, which leaves gravity where it was; the level check
// and the picture check after getting on still catch a phone that is off. In the simulation the
// made-up phone never moves unless &moved, and &nomotion stands for no motion reading.
const MOVE_DEG = 2, MOVE_SECS = 0.5, WATCH_GAP = 1;
const Watch = {
  g0: null, state: 'none', last: 0, off: null,
  anchor(t) { this.g0 = Tilt.g ? [...Tilt.g] : null; this.off = null; this.last = t; this.set(this.g0 || SIM ? 'still' : 'unknown'); },
  sample(t) {
    if (this.state !== 'still') return;
    if (t - this.last > WATCH_GAP) { this.set('unknown'); return; }
    this.last = t;
    const d = fit.gravityAngle(this.g0, Tilt.g);
    if (d != null && d > MOVE_DEG) { this.off ??= t; if (t - this.off > MOVE_SECS) this.set('moved'); } else this.off = null;
  },
  lose() { if (this.state === 'still') this.set('unknown'); },
  reset() { this.g0 = null; this.off = null; this.set('none'); },
  // 'still', 'moved', 'unknown' or 'none' (never levelled).
  verdict(t = now()) {
    if (SIM) return this.state === 'still' && (params.has('moved') || params.has('replaced')) ? 'moved' : this.state === 'still' && params.has('nomotion') ? 'unknown' : this.state;
    if (this.state === 'still' && t - this.last > WATCH_GAP) this.set('unknown');
    return this.state;
  },
  set(st) { if (st === this.state) return; this.state = st; renderBar(); },
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') Watch.lose(); });

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
// results. Its own screen's Next waits for an answer (painSet); a check started without passing
// that screen (Check It Now, Check Again) keeps this page view's answer, or No.
let pain = false, painSet = false;
let lastFrameAt = 0, camWarned = false, recovering = false, recoverTries = 0, detectFails = 0;
const skipped = new Set(), warnings = new Set();
// poses: frames where the pose model found anyone (multi: more than one person); riders: frames where
// one of them was the rider; ambiguous: frames not measured because two people could each have been
// the rider; wrongPicks: in the simulation, frames where the app picked the made-up helper instead of
// the rider (must stay 0). asks: "turn the pedals" questions; identified: when the rider was found that
// way. started: each line as it began playing, with the caption shown at that moment. view(): what
// the camera view shows now (ui.liveView), for QA.
const debug = { phase: () => phase, setup: () => setup, screen: () => screen, session: () => session, view: () => curView, poses: 0, multi: 0, frames: 0, riders: 0, ambiguous: 0, ambiguousBy: {}, crowdFrames: 0, wrongPicks: 0, asks: 0, identified: null,
  said: [], speech: [], started: [], errors: [],
  // The recorded voice: how many clips the manifest lists, each clip as it starts playing, any part
  // said in the phone's voice because its clip failed (fallback) or has none (missing), and manifest
  // errors.
  voice: { clips: 0, played: [], fallback: [], missing: [], errors: [], cuts: [] },
  // The demos (Demo): each one shown, its clips, the step and the line it began in, and when, in
  // which step and why it ended (ended, skipped, left with its step, failed, stalled).
  demos: [] };
window.__bfc = debug;
function log(kind, msg) { if (kind === 'say') debug.said.push(msg); }

// ── how the bike stays up ─────────────────────────────────────────────────────────────────────
// "How will your bike stay up?" is asked first on the Setup screen and remembered on this phone. It
// changes the spoken steps and how long and which way to pedal (fit.SETUPS), and it is stored with
// each session, so sessions are only compared with others filmed the same way. ?setup= answers it
// for testing; a choice made on the page replaces it in the address too, so a reload keeps it.
const SKEY = 'bfc.setup';
let setup = null;
try { const v = localStorage.getItem(SKEY); if (fit.SETUPS[v]) setup = v; } catch { /* asked again */ }
if (fit.SETUPS[params.get('setup')]) setup = params.get('setup');
const SETUP_BUTTONS = ['setupTrainer', 'setupWall', 'setupFriend'].map($);
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
  for (const b of SETUP_BUTTONS) b.setAttribute('aria-checked', String(b.dataset.setup === setup));
  for (const li of document.querySelectorAll('[data-for]')) li.hidden = li.dataset.for !== (setup || 'none');
  el.flowNext.setAttribute('aria-disabled', String(!setup));
  retestNote();
}
for (const b of SETUP_BUTTONS) b.addEventListener('click', () => chooseSetup(b.dataset.setup));

// ── which way the screen faces ────────────────────────────────────────────────────────────────
// "Where will the screen face?" Towards me (the front camera, so he can see the screen from the
// bike) or Away from me (the back camera). Away from me is the default until Alex's phone test shows
// the front camera reads the same (DECISIONS.md, 2026-10-10). Remembered on this phone like the setup,
// stored with each session and its history entry, and exposed as `screen` and session.screen for the
// camera code. ?screen=towards or ?screen=away (also front or rear) answers it for testing.
const SCREEN_KEY = 'bfc.screen';
const SCREENS = ['towards', 'away'];
let screen = 'away';
try { const v = localStorage.getItem(SCREEN_KEY); if (SCREENS.includes(v)) screen = v; } catch { /* the default */ }
{ const q = { front: 'towards', rear: 'away' }[params.get('screen')] || params.get('screen'); if (SCREENS.includes(q)) screen = q; }
// The camera this session films with: 'front' when the screen faces the rider (facingMode 'user'),
// 'rear' otherwise ('environment'), as the browser reports it once the camera runs (startCamera).
// The front camera's picture is shown like a mirror (CSS only; the landmarks are never mirrored), and
// it decides the sign of the roll taken out of the picture (fit.imageRoll).
let camera = 'rear';
const frontMode = () => (session?.screen ?? screen) === 'towards';
// The front camera's picture is shown like a mirror. If Safari turns out to hand over its frames
// mirrored already (fit.FRONT_FRAMES_MIRRORED, the phone test in the README), the screen must not
// mirror them a second time; the arrows along the bike follow what is shown (ui.arrowDir).
const mirrorShown = () => camera === 'front' && !fit.FRONT_FRAMES_MIRRORED;
const SCREEN_BUTTONS = ['screenTowards', 'screenAway'].map($);
function chooseScreen(id) {
  if (!SCREENS.includes(id)) return;
  screen = id;
  try { localStorage.setItem(SCREEN_KEY, id); } catch { /* not remembered */ }
  renderScreen();
}
function renderScreen() { for (const b of SCREEN_BUTTONS) b.setAttribute('aria-checked', String(b.dataset.screen === screen)); }
for (const b of SCREEN_BUTTONS) b.addEventListener('click', () => chooseScreen(b.dataset.screen));

// Next or Start before choosing: ask instead (the steps depend on it), on the Setup screen, where
// the eye is, and out loud (the tap lets the page speak).
function askSetup() {
  if (setup) return false;
  showFlow('setup');
  el.setupCard.classList.add('needs');
  el.setupErr.hidden = false;
  el.setupCard.scrollIntoView({ block: 'center' });
  el.setupQ.focus({ preventScroll: true });
  unlockSound();
  Voice.say('First, tell me how your bike will stay up.');
  return true;
}
const S = () => fit.setupOf(session?.setup);

const STEP_ORDER = ['phone', 'mount', 'frame', 'still', 'pedal'];
function go(name, t, reason) {
  Demo.stopLive('left'); // a demo never plays into the next step
  phase = name;
  phaseT0 = t;
  ph = {};
  el.skip.hidden = !['phone', 'frame'].includes(name);
  el.skip.textContent = 'Skip';
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
// The words of the line queued last (or playing, when nothing waits behind it).
const lastQueued = () => (Voice.q[Voice.q.length - 1] || Voice.cur)?.text ?? null;

// The screens: the three tabs ('home'), the check flow before the camera ('flow': Setup, then Getting
// Ready), the camera view ('run'), and the results ('results'), a sheet in place of the tabs: no tab
// bar, a glass close button, and the dimmed colour behind its top edge. One at a time, each scrolling
// as the page. The status bar colour follows: the flow and the camera view are dark in both modes.
function show(name) {
  if (name !== 'run') Demo.stopLive('left');
  if (name !== 'home') Demo.stop('left');
  for (const s of ['home', 'flow', 'run', 'results']) el[s].hidden = s !== name;
  document.body.classList.toggle('in-flow', name === 'flow');
  document.body.classList.toggle('in-sheet', name === 'results');
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.setAttribute('content', name === 'flow' || name === 'run' ? '#131A24' : /dark/.test(m.getAttribute('media') || '') ? '#000000' : '#F2F2F7');
  }
  if (name !== 'flow') pauseHowTo();
  window.scrollTo(0, 0);
  if (name === 'results') fitBar(); // measured once the sheet is shown
}

// The check flow, one question a screen as in Apple's "Choose How to Measure": 'setup' (how the bike
// stays up), 'screen' (which way the screen faces), 'fitter' (the first time on this phone: has a bike
// fitter set this bike up?), 'pain' (the pain question), 'feel' (after a change he has ridden: better,
// the same, or worse?) and 'revert' (the second "worse": put it back), then 'ready' (Getting Ready: the
// clip, what you need, the warm-up), then, before the first check in a page view, 'allow' (why the
// iPhone asks for the camera and motion, a sound check, and Start). 'where' asks "Is the phone where
// it was?" when Check It Now cannot tell from the motion sensor. A new question screen puts
// VoiceOver on its title.
let flowStep = 'setup';
function showFlow(step) {
  const moved = step !== flowStep || el.flow.hidden;
  flowStep = step;
  el.flowSetup.hidden = step !== 'setup';
  el.flowScreen.hidden = step !== 'screen';
  el.flowFitter.hidden = step !== 'fitter';
  el.flowPain.hidden = step !== 'pain';
  el.flowFeel.hidden = step !== 'feel';
  el.flowRevert.hidden = step !== 'revert';
  el.flowReady.hidden = step !== 'ready';
  el.flowAllow.hidden = step !== 'allow';
  el.flowWhere.hidden = step !== 'where';
  if (step !== 'ready') pauseHowTo();
  show('flow');
  roomForBar();
  if (moved) ({ setup: el.setupQ, screen: el.screenQ, fitter: el.fitterQ, pain: el.painQ, feel: el.feelQ, revert: el.revertH })[step]?.focus?.({ preventScroll: true });
  if (moved) answersInView();
}

// Large text on a short screen put a question's first answer under the fixed Next bar (round 3's QA:
// 28 px text at 375 x 667). The picture at the top gives way first; if the answer is still under the
// bar, the page scrolls just enough to show it. The question is said aloud, so a title that scrolls
// up a little is still heard. Measured, since the sizes follow the iPhone's text size.
const FIRST_ANSWER = { setup: ['setupTrainer', 'flowNext'], screen: ['screenAway', 'screenNext'], fitter: ['fitterNo', 'fitterNext'],
  pain: ['painNo', 'painNext'], feel: ['feelBetter', 'feelNext'] };
function answersInView() {
  const ids = FIRST_ANSWER[flowStep];
  const sec = { setup: el.flowSetup, screen: el.flowScreen, fitter: el.flowFitter, pain: el.flowPain, feel: el.flowFeel }[flowStep];
  if (!ids || !sec) return;
  const [answer, next] = ids.map($);
  // The gap kept between the answer and the bar (a design choice).
  const under = () => {
    const a = answer.getBoundingClientRect?.(), b = next.getBoundingClientRect?.();
    return a && b ? a.bottom - (b.top - 12) : 0;
  };
  sec.classList.remove('compact');
  if (under() <= 0) return;
  sec.classList.add('compact');
  const more = under();
  if (more > 0) window.scrollTo(0, Math.ceil((window.scrollY || 0) + more));
}

window.addEventListener?.('scroll', () => el.flow.classList.toggle('scrolled', !el.flow.hidden && window.scrollY > 120), { passive: true });
// The bottom bar is fixed over the screen, so the screen leaves room under its last line for all of
// the bar, at any text size: large text makes the bar taller, and a retest's Getting Ready has a
// second button in it (Different Shoes or Shorts). Measured, since the bar's height follows the text.
function roomForBar() {
  const sec = { setup: el.flowSetup, screen: el.flowScreen, fitter: el.flowFitter, pain: el.flowPain, feel: el.flowFeel, revert: el.flowRevert,
    ready: el.flowReady, allow: el.flowAllow, where: el.flowWhere }[flowStep];
  const h = sec?.querySelector?.('.fbar')?.getBoundingClientRect?.().height;
  if (h) sec.style.paddingBottom = `${Math.ceil(h) + 16}px`;
}
window.addEventListener?.('resize', () => { if (!el.flow.hidden) { roomForBar(); answersInView(); } if (!el.results.hidden) fitBar(); }, { passive: true });

// The three tabs. ?tab=progress or ?tab=learn opens on that tab, for testing.
const TABS = { check: 'tabCheck', progress: 'tabProgress', learn: 'tabLearn' };
let tab = 'check';
function selectTab(name) {
  if (!TABS[name]) return;
  if (name !== 'learn') Demo.stop('left'); // Learn's demo, if it plays
  tab = name;
  for (const [k, id] of Object.entries(TABS)) {
    el[id].hidden = k !== name;
    $('tabBtn' + k[0].toUpperCase() + k.slice(1)).setAttribute('aria-selected', String(k === name));
  }
  window.scrollTo(0, 0);
}
for (const k of Object.keys(TABS)) $('tabBtn' + k[0].toUpperCase() + k.slice(1)).addEventListener('click', () => selectTab(k));

// The way out, said when a step cannot see the rider. At most twice each in a session, like every
// repeated line here: a sentence said a third time is one the rider has stopped hearing.
const STOP_LINE = 'If it still does not work, tap Stop on the screen. The tips are in Learn.';
// Where the phone goes, said at the start of step 1. Everything round 1 said (sideways, upright, not
// leaning back, 60 to 80 cm, a chair with a box, about 3 m, facing the pedals) and the placement
// details: opposite the pedals, the chair back away from the bike, the front edge of the box, the
// lens about level with the top of the tyres. No tilt line ever says which way to tilt. Round 5 (the
// UX review, item 6): six short lines in the order the hands do it, each its own clip and caption,
// where one 43-word line gave five instructions in one breath. The screen facing the rider ends with
// the screen, the back camera with the back of the phone.
const PLACE = {
  chair: 'Put the chair opposite the pedals, about 3 metres away.',
  back: 'Turn the chair back away from the bike.',
  box: 'Put the box on the chair.',
  phone: 'Stand the phone on it, sideways and upright.',
  lens: 'Keep the lens level with the top of the tyres.',
  face: 'Point the back of the phone at the pedals.',
  faceFront: 'Point the screen at the pedals.',
};
const LOST_STOP = 'I still cannot see you. If it does not work, tap Stop on the screen. The tips are in Learn.';
const WHO_STOP = 'I cannot tell who is on the bike. Tap Stop on the screen, then start again.';
// Round 3, the customer research (cx-research/REPORT.md): lines that keep the phone where it is for
// checking a change straight away (item 1), frame the bike before anyone gets on (3), mark the spot
// on day one (6) and ask when the change will be made (9). Each is a whole sentence with no number
// in it, so each can be one recorded clip.
const LEAVE_LINE = 'Leave the phone where it is.';
const CHECK_NOW_LINE = 'Check it now. The phone is already in place.';
const CHECK_NOW_MOVED = 'Check it now.';
const IN_PLACE_LINE = 'The phone is already in place.';
const WHERE_LINE = 'Is the phone where it was?';
const FRAME_LINE = 'Both wheels inside the frame, pedals in the middle.';
const TAPE_LINE = 'Tape the floor by the chair legs and the back wheel. Next time, line them up.';
const WHEN_LINE = 'When will you move it?';
const HEAR_LINE = 'Hello. You can hear me, so the sound is working.';
// The pain question's Next tapped before an answer.
const PAIN_ASK = 'First, tap No or Yes.';
// Round 4, Phase 0 (pro-standard SPEC 5.0 and 4.4): the lines as the SPEC words them.
const FITTER_LINE = 'Has a bike fitter set this bike up for you?';
const FEEL_LINE = 'You rode it. Better, the same, or worse?';
const FEEL_ASK = 'First, tap how it felt.';
const REVERT_LINE = { saddle: 'It felt worse twice. Put the saddle back to your tape mark.', bars: 'It felt worse twice. Put the handlebars back as they were.' };
// With pain, the results' own words (fit.PAIN_SHORT): a doctor or physio, and a bike fitter.
const REVERT_PAIN = 'With pain, see a doctor or physio, and a bike fitter.';
// Round 5: the rest of the next step, said after REVERT_LINE, as the revert screen's rows show it.
const REVERT_RIDE = 'Then ride as before.';
const REVERT_FITTER = 'A bike fitter can look at why.';
// Round 5 (the UX review, item 8): nothing the app does not keep. "I will wait" promised a wait that
// nothing timed (Getting Ready waits for a tap, as every screen does), and the kit line was a question
// with no answer on the screen, so it says what to wear.
const WARM_LINE = { trainer: 'Before I film, ride easily for five minutes.', wall: 'If you can, go for a ten-minute ride first.', friend: 'If you can, go for a ten-minute ride first.' };
const KIT_LINE = 'Wear your cycling shoes and padded shorts. They change how high you sit.';
const RETEST_KIT_LINE = 'Same shoes and shorts as last time?';
const EFFORT_LINE = 'Now pedal at the effort of a long ride, where you could still talk.';
// A rider who has checked on this phone before gets the short run (the customer research, item 7):
// under 60 spoken words before "Hold it", with "You chose: ..." and the lines that keep him safe (the
// friend holding the bike, the wall on rollers, the front brake) kept. "As last time" stands in for the
// placement details, which day one said in full; when the screen faces the other way from last time,
// the line says which way it faces now. The tape marks only once day one has asked for them.
const RETURN = {
  place: 'Set the phone up as last time, opposite the pedals.',
  placeTape: 'Set the phone up as last time, on your tape marks.',
  placeFront: 'Set the phone up opposite the pedals, with the screen facing the bike.',
  placeTapeFront: 'Set the phone up on your tape marks, with the screen facing the bike.',
  placeAway: 'Set the phone up opposite the pedals, with the screen away from the bike.',
  placeTapeAway: 'Set the phone up on your tape marks, with the screen away from the bike.',
  bikeLevel: 'Check the bike is level.',
  level: 'Level.',
  getOn: { trainer: 'Get on as before. On rollers, hold on to the wall.', wall: 'Get on as before, with the front brake gently on.', other: 'Get on as before, hands on top of the brake levers.' },
  friend: 'Friend: hold the bike, standing up straight.',
  rider: 'Rider: get on.',
  still: 'Put the pedal nearest the phone down, and hold still.',
};
// Design choices: the bike is framed for this long after its line, before the levelling beeps; and on
// day one the first "I cannot see you on the bike" waits this long, for two strips of tape.
const FRAME_SECS = 5;
const TAPE_SECS = 40;
// A rider on aero bars (fit.isAero): this app checks road bikes only (fit-rules.md rule 5).
const AERO_LINE = 'You look very low, like on aero bars. This app checks road bikes only. If this is a road bike, sit up with your hands on top of the brake levers. Otherwise, tap Stop.';

// ── the steps ────────────────────────────────────────────────────────────────────────────────
const HANDLERS = {
  phone: {
    enter(t, reason) {
      session.levelled = false;
      // Not interrupting: the rider may be following the correction that sent him here, which
      // stays on the screen (the frosted card, or the 3 m sign) until the phone is level again.
      if (reason === 'moved') { ph.toldBeep = true; Voice.say('The phone moved. Level it again. I will beep until it is level.'); return; }
      // The placement screen (title, the drawn key frame) shows while these lines are said.
      ph.placing = true;
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
      // A rider who has checked before hears the short run (RETURN).
      const back = session.returning;
      if (session.setup === 'trainer') Voice.say(back ? RETURN.bikeLevel : 'First, check the bike is level. Both wheel centres should be the same height off the floor. If the front is lower, put a thick book under the front wheel.');
      if (back) { Voice.say(returnPlace()); return; }
      // Day one: the drawn placement clip loops in the drawing's box while these lines are said (Demo).
      Demo.play('place', el.placeVideo, el.placeVideo, ['place'], { loop: true, shown: placeShown });
      // The filming guide puts the lens 60 to 80 cm off the floor; a phone on a bare chair seat sits
      // lower. The placement details of Learn's "Where the Phone Goes": opposite the pedals (along the
      // bike is the largest error the app cannot see, camera panel), the chair back away from the bike
      // (out of the picture), the phone at the front edge of the box, the lens about level with the
      // top of the tyres. The placement screen shows the same, drawn.
      Voice.say(PLACE.chair);
      Voice.say(PLACE.back);
      Voice.say(PLACE.box);
      Voice.say(PLACE.phone);
      Voice.say(PLACE.lens);
      Voice.say(frontMode() ? PLACE.faceFront : PLACE.face);
      // Screen away, he is at the phone and can see it: the bike goes inside the big guide before
      // the phone is levelled and before anyone gets on (the customer research, item 3).
      if (!frontMode()) { Voice.say(FRAME_LINE); ph.framing = true; }
    },
    tick({ t }) {
      // The bike framed in the guide first, for FRAME_SECS after its line; nothing beeps meanwhile.
      if (ph.framing) { if (quiet(t) < FRAME_SECS) return; ph.framing = false; }
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
          Voice.say('Level the phone by eye. Turn it until the floor lines up with the white line. Then tap the button on the screen.');
          el.skip.textContent = 'It Is Level';
        }
        if (ph.noSensor && quiet(t) > 30) levelByEye(t);
        return;
      }
      // A rider who has checked before knows the beeps (RETURN).
      if (!ph.toldBeep) { ph.toldBeep = true; if (!session.returning) Voice.say('I will beep until it is level. The beeps get faster as you get close.'); }
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
          session.levelAt = t; // the green LEVEL screen, for LEVEL_SECS
          // Back here after a correction: the phone has been moved and is level again, so the
          // correction has been carried out. It stayed on the screen while he levelled it, at the
          // phone; on the walk back to the bike the screen says GET ON, not the old MOVE sign, which
          // would have him move the phone a second time. (A phone slid along without tilting it never
          // comes here, so there the correction stays until he is back on the bike, as before.)
          session.fix = null;
          Watch.anchor(t); // from here the motion sensor watches whether the phone moves
          go('mount', t); // which says "Level."
        }
        return;
      }
      ph.since = null;
      const e = Tilt.error();
      // The beeps wait for the voice: they would play over the placement instruction otherwise.
      if (quiet(t) > 1 && (!ph.beep || t - ph.beep > Math.min(1, 0.12 + 0.07 * e))) { ph.beep = t; Beep.tone(e > 3 ? 440 : 620); }
      // After two tries the line names the way out (a design choice), like every other step.
      // Never which way to tilt: turning the phone round flips the sign of its tilt (camera panel).
      // With the screen towards the rider, the screen turning green is something he can see.
      const tilt = frontMode() ? 'Tilt the phone slowly until the screen turns green.' : 'Not level yet. Tilt it slowly until the beeping stops.';
      if (quiet(t) > 14 && Voice.say((ph.tiltN || 0) < 2 ? tilt
        : `${tilt} If you cannot get it level, tap Skip on the screen.`, { key: 'tilt', every: 14, max: 2 })) ph.tiltN = (ph.tiltN || 0) + 1;
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
      // Check It Now with the phone where it was levelled: straight to getting on (the customer
      // research, item 1), in the short run's words.
      // Not said when he has just been told so, or has just answered "Is the phone where it was?".
      if (reason === 'quick') { if (!(nudgedAt > t - 20) && !session.toldWhere) Voice.say(IN_PLACE_LINE); shortGetOn(); return; }
      const lvl = session.levelled ? 'Level. ' : '';
      if (session.mounts > 1) {
        // Back again after moving the phone: the short version.
        Voice.say(session.setup === 'friend' ? `${lvl}Friend, hold the bike again. Rider, get back on.` : `${lvl}Get back on, same as before.`);
        return;
      }
      if (session.returning) {
        if (session.levelled) Voice.say(RETURN.level);
        // A rider whose checks are older than the tape tip hears it once, here.
        if (!session.tapeKnown) tapeTip();
        shortGetOn();
        return;
      }
      if (session.levelled) Voice.say('Level. Leave the phone there.');
      // Day one: mark the spot, so next time the chair and the bike go back where they were (the
      // customer research, item 6). Said here, while he is still at the phone, and shown on the
      // frosted card until he is on the bike.
      if (!session.tapeKnown) tapeTip();
      // How each setup keeps the bike still. Design choices, except where a source is named: the far
      // side keeps the wall or the friend out of the picture and off the camera-side arm and leg, which
      // are the ones measured (filming guide item 7: nothing blocking the near leg or arm). On the
      // synthetic rider, a bike leaning 10 degrees changes the knee and back angles by under 1 degree
      // and 20 degrees by about 2, hence "only a little". Pedalling backwards drives nothing, so a
      // gently squeezed front brake keeps a leaning bike from rolling. Where the friend holds the bike
      // is left to them: no source says where, and a crouch would make them look like a rider.
      if (session.setup === 'friend') {
        Voice.say('Friend: stand on the far side, away from the phone, next to the saddle. Stand up straight and hold the bike still.');
        ph.demoLine = lastQueued();
        Voice.say('Rider: get on in your normal riding position.');
        return;
      }
      Voice.say({
        trainer: 'Now get on the bike and sit as you ride, hands on top of the brake levers. On rollers, hold the wall with the hand away from the phone. I will tell you when to let go.',
        wall: 'Now get on the bike. Let it lean only a little on the wall, with the bars straight. Rest the hand nearest the phone on top of the brake lever. Squeeze the front brake gently to hold the bike still.',
      }[session.setup] || 'Now get on the bike and sit as you ride, hands on top of the brake levers. Lean on the wall, or have a helper hold the bike from the far side.');
      ph.demoLine = lastQueued();
    },
    tick({ t, rider }) {
      // Day one: the demo of the moves begins with the get-on line (Demo); it ends by itself, at
      // a tap, or when this step ends. Only with the screen towards him (round 5, the UX review's
      // item 8): with the screen away he walks to the bike as the line starts and can no longer see it.
      if (ph.demoLine && Voice.cur?.text === ph.demoLine && Voice.cur.t0 != null) {
        ph.demoLine = null;
        if (frontMode()) Demo.play('moves', el.demo, el.demoVideo, demoMoves(session.setup));
      }
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
        ph.tape = false; // the tip has done its job once he is on the bike
        ph.since ??= t;
        if (t - ph.since > 1.5) go('frame', t);
        return;
      }
      ph.since = null;
      if (session.aeroSaid || ph.aeroSince != null) {
        if (session.aeroSaid && quiet(t) > 14) Voice.say(STOP_LINE, { key: 'stop', every: 20, max: 2 });
        return;
      }
      if (quiet(t) > (ph.nags ? 14 : firstNag())) nag();
    },
  },

  frame: {
    enter() {
      if (session.skippedOff) { ph.skippedAny = true; session.skippedOff = false; } // skipped in the mount step
      // A rider who has checked before hears nothing new here (RETURN): the next line is the hold.
      if (session.returning) return;
      // Screen towards him: he can see the sign, so he is told to stay on until it says otherwise.
      Voice.say(frontMode() ? 'Checking the picture. Stay on. I will tell you if the phone needs to move.' : 'Checking the picture. Stay in position.');
    },
    tick({ t, lm, raw, side, W, H, rider, pick }) {
      if (!rider) {
        ph.ok = null; ph.bad = null; ph.now = null; // ph.lastBad stays, so Skip still knows what to skip
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
      const problem = firstProblem(lm, raw, side, W, H, t);
      ph.now = problem;
      if (!problem) {
        ph.bad = null;
        ph.ok ??= t;
        if (t - ph.ok > 2) {
          const line = ph.skippedAny ? 'Carrying on.' : session.returning ? null : frontMode() ? 'That is it. You are in place.' : 'The picture looks good.';
          if (line) Voice.say(line);
          go('still', t);
        }
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
        session.fixToward = problem.toward || null; // the arrow along the bike, on the screen
        session.fixOff = false;
      }
    },
  },

  still: {
    enter() {
      startRecording();
      session.fix = null; // the picture check is over, and so is its last correction on the screen
      ph.seenSecs = 0;
      ph.crowdBefore = warnings.has('crowd');
      Voice.say(session.returning ? RETURN.still : 'Put the pedal nearest the phone at its lowest point. Keep your foot as it sits when you ride. Then hold still.');
    },
    tick({ t, lm, raw, side, W, H, ang, rider, pick }) {
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
          // Screen towards him: eyes ahead, not on the phone. Turning the trunk 10 degrees towards it
          // would read the back about 3 degrees high (camera panel, a calculation).
          Voice.say(frontMode() ? (ph.holds < 3 ? 'Eyes ahead. Hold still. Three. Two. One.' : 'Eyes ahead. Hold still once more. Three. Two. One.')
            : ph.holds < 3 ? 'Hold it. Three. Two. One.' : 'Hold it once more. Three. Two. One.', { interrupt: true });
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
        // Drawn on the picture as the camera saw it, so the raw landmarks; the number is the reading.
        session.stillShot = snapshot(raw || lm, W, H, side, { ...ang, kneeFlex: session.still.kneeFlex });
        session.flashAt = t; // one green flash: the reading is taken
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
      // On a trainer the effort is set first (SPEC 5.0, before.effort): load and cadence change knee
      // and ankle motion. Backwards on the floor drives nothing, so no effort is asked there.
      const roll = S().dir === 'forwards';
      const line = roll
        ? 'On rollers, start pedalling with your hand on the wall, and let go once you are rolling steadily. Keep going until I say stop.'
        : 'Now pedal backwards, smooth and steady. Keep going until I say stop.';
      if (roll) Voice.say(EFFORT_LINE);
      // Short lines, one after the other (DECISIONS.md, 2026-10-10: one idea a sentence): the way to
      // pedal; with pain or numbness that keeps coming back, when to stop (on rollers, the wall first);
      // and with the screen towards him, eyes ahead while pedalling too, the countdown is spoken.
      Voice.say(line);
      if (pain) Voice.say(`If your knee hurts, stop pedalling.${roll ? ' On rollers, put your hand on the wall first.' : ''} I will use what I have.`);
      if (frontMode()) Voice.say('Eyes ahead, I will count for you.');
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
      if (insist) { ph.started = null; ph.said = {}; ph.moveSecs = 0; return; }
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
        // On a trainer, slower in a harder gear, so the effort stays that of a long ride (SPEC 5.0).
        if (s != null) Voice.say(`Slower, please. About one turn every ${s} seconds.${session.setup === 'trainer' ? ' Shift to a harder gear to keep the effort.' : ''}`, { key: 'slower', every: 8, max: 2 });
      }
      // The ring and its countdown (renderLive) read these.
      ph.left = secs - e;
      ph.paused = paused;
      if (e <= secs) {
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
        ph.more = true;
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
  const end = summary.strokes >= 5 && !warnings.has('fast') ? 'Stop. Nice work, you can relax.' : 'Stop. You can relax.';
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
  // Screen towards him: he can check the picture from beside the bike, by the tick on the screen.
  const look = frontMode() ? 'Stand beside the bike and look at the phone. A tick means you are in the picture.'
    : 'Still nothing. Walk to the phone and check the whole bike is in the middle of the screen. Then get back on.';
  const lines = ['I cannot see you on the bike yet. Make sure the phone can see you and the whole bike.',
    'I still cannot see you. Sit on the saddle, hands on top of the brake levers, and keep still for a moment.',
    look, look, STOP_LINE, STOP_LINE];
  const n = (ph.nags || 0) + 1;
  if (n > lines.length) return;
  if (Voice.say(lines[n - 1])) ph.nags = n;
}
// The tape tip, said once on this phone (the first check that has not said it), and shown on the
// frosted card until he is on the bike.
function tapeTip() { Voice.say(TAPE_LINE); session.tapeSaid = true; ph.tape = true; }
// Seconds of quiet before the first of those lines: longer on day one, for the tape.
const firstNag = () => (ph.tape ? TAPE_SECS : 20);

// The short run's way onto the bike (RETURN), for a rider who has checked before and for Check It Now.
function shortGetOn() {
  if (session.setup === 'friend') { Voice.say(RETURN.friend); Voice.say(RETURN.rider); return; }
  Voice.say(RETURN.getOn[session.setup] || RETURN.getOn.other);
}
// Where the phone goes, in the short run: "as last time", unless the screen faces the other way.
function returnPlace() {
  const tape = !!session.tapeKnown;
  if (!session.lastScreen || session.lastScreen === session.screen) return tape ? RETURN.placeTape : RETURN.place;
  if (frontMode()) return tape ? RETURN.placeTapeFront : RETURN.placeFront;
  return tape ? RETURN.placeTapeAway : RETURN.placeAway;
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
    if (!seated.length) { if (quiet(t) > (ph.nags ? 14 : firstNag())) nag(); return; }
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
// an iPhone with Face ID, up from the bottom on one with a Home button; the line says only "Open
// Control Centre", one idea a sentence), then the way out. Only said when the screen is stuck: the
// one setting line left, against DECISIONS.md's "volume and silent mode only", for the main session.
// mayBeUpright: no motion sensor, so the phone itself may still be upright.
function uprightScreen(t, mayBeUpright) {
  const n = ph.lockN || 0;
  const line = mayBeUpright && n === 0 ? 'Turn the phone sideways.'
    : n < 3 ? 'The screen is stuck upright. Open Control Centre and tap the lock with the circle arrow. Then turn the phone sideways again.'
    : 'If you cannot get the screen sideways, tap Stop.';
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
  // Not "I will wait": 14 s later it says "I have lost you" (the round 5 fixer, QA minor).
  const line = phase === 'still' && n === 0 ? 'Take your time. Get back on when you are ready.'
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
  // A skipped check's correction stops showing: the sign said to move the phone for a check that no
  // longer counts (QA round 3: Skip off the bike, or in the picture check, left MOVE up).
  if (key === session.fixKey) session.fix = null;
}

// Checks in order; a skipped check no longer blocks. raw: the landmarks where the camera saw them,
// for whether he is cut off at the edges of the picture; lm: with the phone's roll taken out, for
// whether the phone points square at the bike.
function firstProblem(lm, raw, side, W, H, t) {
  const checks = [
    () => fit.checkFraming(raw || lm, side, W, H),
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

// ok: true (✓), false (•) or null (?, not known). VoiceOver reads "Level, checked", not "check mark
// Level" (the design review, item 12).
function chips(map) {
  el.chips.replaceChildren(...Object.entries(map).map(([k, ok]) => {
    const c = document.createElement('span');
    c.className = 'chip ' + (ok == null ? '' : ok ? 'ok' : 'bad');
    c.textContent = (ok == null ? '? ' : ok ? '✓ ' : '• ') + k;
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', `${k}, ${ok == null ? 'not known yet' : ok ? 'checked' : 'not yet'}`);
    return c;
  }));
}

// ── the frame loop ───────────────────────────────────────────────────────────────────────────
let lastVideoTime = -1;
function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const t = now();
  renderLive(t);
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
      if (!camLogged) logCamera();
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

// The roll of the picture right now, in degrees (fit.imageRoll), from the motion sensor and the
// camera in use: taken out of every pose before any angle is measured or the lowest point of the
// pedal is found. 0 without a sensor reading, or while the phone is not sideways.
function pictureRoll() {
  if (!Tilt.available || !Tilt.landscape || (SIM && params.has('noderoll'))) return 0;
  return fit.imageRoll(Tilt.g, camera);
}

// poses: everyone the pose model found in this frame, where the camera saw them. simRider: in the
// simulation, which one is really the rider, to count wrong picks.
function step(rawPoses, t, W, H, simRider = null) {
  const dt = lastStepT == null ? 0 : Math.max(0, Math.min(0.5, t - lastStepT));
  lastStepT = t;
  // Everything below measures the poses with the phone's roll taken out. Only the drawing and
  // whether he is cut off at the edges of the picture use them where the camera saw them (raw).
  const roll = pictureRoll();
  debug.roll = roll;
  const poses = roll ? rawPoses.map(p => fit.derotate(p, roll, W, H)) : rawPoses;
  // Someone in the picture and not cut off at its edges: the tick for "a tick means you are in the
  // picture", while he stands beside the bike. Any pose, rider or not.
  live.inView = rawPoses.some(fit.inPicture);
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
  const lm = pick.lm, raw = pick.index != null ? rawPoses[pick.index] : null;
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
  if (rider) live.riderAt = t;
  if (lm) live.face = fit.facing(raw || lm);
  // Someone very low over the front, and no rider: aero bars (fit.isAero), named in the mount step.
  if (phase === 'mount') { if (pick.aero === 1 && !rider) ph.aeroSince ??= t; else ph.aeroSince = null; }
  if (phase === 'still' && rider) ph.seenSecs = (ph.seenSecs || 0) + dt;
  // The last correction stays on the screen until he has got off and is back on the bike (or the
  // phone step has levelled the phone again after it).
  if (session?.fix) {
    if (!rider) session.fixOff = true;
    else if (session.fixOff) session.fix = null;
  }
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
  draw(raw, W, H, side, rawPoses.filter((_, i) => i !== pick.index));
  HANDLERS[phase]?.tick({ t, lm, raw, side, W, H, ang, rider, pick });
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
// The friend's first line names the same place as Getting Ready and the getting-on line (the far
// side, next to the saddle, standing up straight); once said, a friend seen again hears thanks, not
// the same line (QA round 3: a second "stand behind the rider" after she had already moved).
const FRIEND_LINES = ['Friend: stay on the far side, next to the saddle, standing up straight.',
  'Friend: stand up straight, with your knees straight.', 'If I still cannot tell you apart, tap Stop.'];
const FRIEND_STAY = 'Friend, thanks, stay there.';
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
  const line = crowd.blocking ? lines[Math.min(n, lines.length - 1)] : session.setup === 'friend' && n > 0 ? FRIEND_STAY : lines[0];
  if (Voice.say(line, { key: 'helper', every: 15, max: 2 })) { crowd.told = true; crowd.asked = true; crowd.n = n + 1; }
}

// ── drawing ──────────────────────────────────────────────────────────────────────────────────
const SEGMENTS = [['shoulder', 'elbow'], ['elbow', 'wrist'], ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle'], ['ankle', 'heel'], ['heel', 'toe'], ['ankle', 'toe']];

function drawSkeleton(g, lm, side, P, unit, ang) {
  const other = side === 'L' ? 'R' : 'L';
  g.lineCap = 'round';
  for (const [s, col, w] of [[other, 'rgba(255,255,255,0.28)', 3], [side, '#0091FF', 6]]) {
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

// ── the figure and the outline ───────────────────────────────────────────────────────────────
// Where the picture sits in the stage, in CSS px: s (px per camera pixel) and the offsets. Screen
// away: the whole picture, as large as fits. Screen towards the rider, beside the 3 m word: the
// stage's full height, showing the middle of the picture, never less than 62% of its width (a design
// choice: the outline spans 41% of it and checkFraming wants him between 30% and 70%). The video's
// own box is set to the same place, so the figure is drawn on the rider.
function stageMap(W, H) {
  const c = el.overlay, cw = c.clientWidth || 1, chh = c.clientHeight || 1;
  const s = frontMode() && curView?.layer === 'avatar' ? Math.min(chh / H, cw / (0.62 * W)) : Math.min(cw / W, chh / H);
  const m = { cw, chh, s, ox: (cw - W * s) / 2, oy: (chh - H * s) / 2 };
  const box = [m.ox, m.oy, W * s, H * s].map(v => `${Math.round(v)}px`).join(' ');
  if (box !== stageBox) {
    stageBox = box;
    Object.assign(el.cam.style, { left: `${m.ox}px`, top: `${m.oy}px`, width: `${W * s}px`, height: `${H * s}px` });
  }
  return m;
}
let stageBox = '';

// The outline of a rider on a road bike where the rider should be: the middle of the picture, the
// wheels' bottoms 80% of the way down and the head about 15% from the top (a design choice: a lens
// at the top of the tyres 3 m away puts the floor under the wheels about there). Drawn in its own
// units (the design review's drawing), facing the way the rider faces (fit.facing).
const GHOST = {
  cx: 204.45, bottom: 277.9, height: 284, wheels: [[120.3, 220.1], [288.6, 220.1]], r: 57.8,
  frame: [[[120.3, 220.1], [190, 232], [164, 143.9], [120.3, 220.1]], [[164, 143.9], [255.5, 136.8], [263.1, 161.1], [190, 232]], [[263.1, 161.1], [288.6, 220.1]]],
  body: [[[219.9, 39.2], [152.6, 106.5]], [[152.6, 106.5], [192.1, 172.1], [184.05, 246.45], [204.5, 261.8]], [[219.9, 39.2], [239.5, 86.3], [281.8, 123.2]]],
  head: [237.8, 18], headR: 24,
};
const TONE = { white: '#FFFFFF', yellow: '#FFD600', green: '#30D158' };
const ghostCanvas = document.createElement('canvas');
let ghostKey = '';
function drawGhost(g, m, W, H, face, inPlace, dpr) {
  const key = [m.cw, m.chh, m.s, W, H, face, inPlace, dpr].join(',');
  if (key !== ghostKey) {
    ghostKey = key;
    ghostCanvas.width = Math.round(m.cw * dpr);
    ghostCanvas.height = Math.round(m.chh * dpr);
    const q = ghostCanvas.getContext('2d');
    q.setTransform(dpr, 0, 0, dpr, 0, 0);
    q.clearRect(0, 0, m.cw, m.chh);
    const k = (0.65 * H) / GHOST.height, ku = k * m.s;
    const P = ([x, y]) => [m.ox + m.s * (W / 2 + face * (x - GHOST.cx) * k), m.oy + m.s * (0.8 * H - (GHOST.bottom - y) * k)];
    const line = (pts) => { q.beginPath(); q.moveTo(...P(pts[0])); for (const p of pts.slice(1)) q.lineTo(...P(p)); };
    const colour = inPlace ? TONE.green : 'rgba(255,255,255,0.8)';
    q.lineCap = 'round';
    q.lineJoin = 'round';
    // The bike, dashed.
    q.strokeStyle = colour;
    q.lineWidth = 3;
    q.setLineDash?.([9, 7]);
    for (const w of GHOST.wheels) { q.beginPath(); q.arc(...P(w), GHOST.r * ku, 0, Math.PI * 2); q.stroke(); }
    for (const f of GHOST.frame) { line(f); q.stroke(); }
    q.setLineDash?.([]);
    // The rider: an outline of thick limbs, lightly filled. The inside is cut out, then filled.
    const limbs = (w) => { q.lineWidth = w * ku; for (const b of GHOST.body) { line(b); q.stroke(); } q.beginPath(); q.arc(...P(GHOST.head), (w / 2 + GHOST.headR - 19) * ku, 0, Math.PI * 2); q.fill(); };
    q.strokeStyle = q.fillStyle = colour;
    limbs(46);
    q.globalCompositeOperation = 'destination-out';
    q.strokeStyle = q.fillStyle = '#000';
    limbs(38);
    q.globalCompositeOperation = 'source-over';
    q.strokeStyle = q.fillStyle = inPlace ? 'rgba(48,209,88,0.22)' : 'rgba(255,255,255,0.08)';
    limbs(38);
  }
  g.drawImage(ghostCanvas, 0, 0, m.cw, m.chh);
}

// Screen away, before anyone gets on: the big guide the bike goes inside (the customer research,
// item 3). The outline's own bike, where the outline puts it, drawn bolder: both wheels inside the
// picture, the pedals (an orange dot) on a dashed line down the middle, and the picture's corners
// marked, so it reads at arm's length while the phone is placed.
function drawBikeGuide(g, m, W, H) {
  const k = (0.65 * H) / GHOST.height, bbx = GHOST.frame[0][1][0]; // the pedals, in the middle
  const P = ([x, y]) => [m.ox + m.s * (W / 2 + (x - bbx) * k), m.oy + m.s * (0.8 * H - (GHOST.bottom - y) * k)];
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 5;
  g.setLineDash?.([12, 9]);
  for (const w of GHOST.wheels) { g.beginPath(); g.arc(...P(w), GHOST.r * k * m.s, 0, Math.PI * 2); g.stroke(); }
  for (const f of GHOST.frame) { g.beginPath(); g.moveTo(...P(f[0])); for (const p of f.slice(1)) g.lineTo(...P(p)); g.stroke(); }
  // The middle of the picture, top to bottom, with the pedals on it.
  g.lineWidth = 2;
  g.setLineDash?.([6, 8]);
  const mx = m.ox + (m.s * W) / 2;
  g.beginPath(); g.moveTo(mx, m.oy + 12); g.lineTo(mx, m.oy + m.s * H - 12); g.stroke();
  g.setLineDash?.([]);
  const bb = P(GHOST.frame[0][1]);
  g.fillStyle = '#FF8D28';
  g.beginPath(); g.arc(bb[0], bb[1], 10, 0, Math.PI * 2); g.fill();
  // The picture's corners.
  g.strokeStyle = '#FFFFFF';
  g.lineWidth = 5;
  const c = 34, x0 = m.ox + 10, y0 = m.oy + 10, x1 = m.ox + m.s * W - 10, y1 = m.oy + m.s * H - 10;
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    g.beginPath(); g.moveTo(x, y + dy * c); g.lineTo(x, y); g.lineTo(x + dx * c, y); g.stroke();
  }
  g.restore();
}

// The rider from the landmarks, as thick rounded limbs: torso 30, thigh 22, shin 20, arm 15 pt at
// the live screen's size (390 pt tall in landscape), the far leg fainter, and no numbers on it.
function drawFigure(g, lm, side, P, unit, colour) {
  const other = side === 'L' ? 'R' : 'L';
  const at = (j, k = side) => P(fit.LM[j][k]);
  const seg = (pts, w) => { g.lineWidth = w * unit; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = colour;
  g.globalAlpha = 0.45;
  seg([at('hip', other), at('knee', other), at('ankle', other)], 18);
  g.globalAlpha = 1;
  seg([at('shoulder'), at('hip')], 30);
  seg([at('hip'), at('knee')], 22);
  seg([at('knee'), at('ankle')], 20);
  seg([at('ankle'), at('toe')], 12);
  seg([at('shoulder'), at('elbow'), at('wrist')], 15);
  // The head, a little behind the nose towards the shoulder.
  const n = P(fit.LM.nose), sh = at('shoulder');
  g.fillStyle = colour;
  g.beginPath(); g.arc(n[0] + 0.25 * (sh[0] - n[0]), n[1] + 0.25 * (sh[1] - n[1]), 17 * unit, 0, Math.PI * 2); g.fill();
}

// raw: the rider's landmarks where the camera saw them (the picture is not turned, so neither is
// the figure). others: the other people found, drawn faintly so it is clear which one is measured.
function draw(raw, W, H, side, others = []) {
  const c = el.overlay, dpr = window.devicePixelRatio || 1;
  const m = stageMap(W, H), { cw, chh, s, ox, oy } = m;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(chh * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(chh * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, chh);
  if (frontMode() && curView?.layer === 'ring') return; // the screen goes still
  if (SIM) { g.fillStyle = '#16233a'; g.fillRect(ox, oy, W * s, H * s); }
  if (phase === 'phone' && ph.noSensor) { // levelling by eye: a straight line across the middle
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(ox, oy + (H * s) / 2); g.lineTo(ox + W * s, oy + (H * s) / 2); g.stroke();
  }
  const unit = Math.max(0.6, Math.min(1.6, (H * s) / 390));
  if (curView?.bikeGuide) drawBikeGuide(g, m, W, H);
  if (curView?.ghost) drawGhost(g, m, W, H, live.face >= 0 ? 1 : -1, curView.tone === 'green', dpr);
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 2 * unit;
  for (const o of others) {
    for (const k of ['L', 'R']) for (const [a, b] of SEGMENTS) {
      const p = o[fit.LM[a][k]], q = o[fit.LM[b][k]];
      g.beginPath(); g.moveTo(ox + p.x * W * s, oy + p.y * H * s); g.lineTo(ox + q.x * W * s, oy + q.y * H * s); g.stroke();
    }
  }
  if (!raw || !curView?.figure) return;
  drawFigure(g, raw, side, (i) => [ox + raw[i].x * W * s, oy + raw[i].y * H * s], unit, TONE[curView.tone] || TONE.white);
}

// ── the demos ────────────────────────────────────────────────────────────────────────────────
// Short clips of the next moves (assets/demo/): computer-made 3D clips of invented riders, and the
// placement loop still drawn (README, "The demos"). Each one is labelled "Computer-made demo" on
// screen. The design review's rule: a demo plays before a move, never during it.
// So they play on the first check of a setup on this phone (day one, not session.returning) while the
// rider can see the screen: the placement loop in the drawing's box while the phone is placed, then,
// with the screen towards him only, getting on and holding still, and pedalling the way this setup
// pedals, from the get-on line on (with the screen away he is walking to the bike by then). Muted: the app's own
// voice speaks. A tap anywhere on one skips it. A rider who wants to see it again taps his setup's
// row in Learn. A clip that cannot play (offline, Low Power Mode, a browser without H.264) is let go
// of at once and the check goes on as without it.
const DEMO_DIR = 'assets/demo/';
// Each clip's length in seconds (ffprobe), for the guard that ends one that never says it ended.
const DEMO_SECS = { place: 7.5, 'hold-trainer': 7, 'hold-wall': 7, 'hold-friend': 7, 'pedal-trainer': 6, 'pedal-wall': 6, 'pedal-friend': 6 };
const demoMoves = (s) => [`hold-${s}`, `pedal-${s}`];
const Demo = {
  cur: null,
  // box: what shows and takes the tap; video: its <video>; files: played one after another, or with
  // loop the one file over and over until it is stopped; shown: the box's own look while it plays.
  play(kind, box, video, files, { loop = false, shown = null } = {}) {
    // Reduce Motion (round 5, the UX review's item 10): nothing plays by itself; the drawing stays,
    // and Learn's rows still play a demo when tapped, since the tap asks for it.
    if (kind !== 'learn' && reduceMotion()) return;
    this.stop('replaced');
    const d = { kind, box, video, files, loop, shown, i: 0, timer: null,
      log: { kind, files, t: +now().toFixed(2), phase, line: Voice.cur?.text ?? null, end: null } };
    debug.demos.push(d.log);
    this.cur = d;
    vis(box, true);
    shown?.(true);
    this.clip(d);
  },
  clip(d) {
    const f = d.files[d.i], v = d.video, secs = DEMO_SECS[f] || 8;
    v.muted = true;
    v.loop = d.loop;
    v.poster = `${DEMO_DIR}${f}.jpg`;
    v.src = `${DEMO_DIR}${f}.mp4`;
    clearTimeout(d.timer);
    // Not playing within 5 s of its length (a slow connection): let go of.
    d.timer = setTimeout(() => { if (this.cur === d) this.stop('stalled'); }, (secs + 5) * 1000);
    let p;
    try { p = v.play?.(); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(() => {
      if (this.cur !== d || d.files[d.i] !== f) return;
      clearTimeout(d.timer);
      if (!d.loop) d.timer = setTimeout(() => this.next(d), (secs + 0.5) * 1000); // in case 'ended' never comes
    }, () => { if (this.cur === d) this.stop('failed'); });
  },
  next(d) {
    if (this.cur !== d) return;
    if (++d.i < d.files.length) this.clip(d); else this.stop('ended');
  },
  stop(why = 'stopped') {
    const d = this.cur;
    if (!d) return;
    this.cur = null;
    clearTimeout(d.timer);
    d.log.end = { t: +now().toFixed(2), phase, why };
    vis(d.box, false);
    d.shown?.(false);
    try { d.video.pause?.(); } catch { /* not playing */ }
    d.video.removeAttribute?.('src');
    try { d.video.load?.(); } catch { /* nothing loaded */ }
  },
  // The live screen's demos end with their step; Learn's ends when the tab or the screen changes.
  stopLive(why) { if (this.cur && this.cur.kind !== 'learn') this.stop(why); },
};
for (const v of [el.demoVideo, el.placeVideo, el.learnVideo]) {
  v.addEventListener('ended', () => { if (Demo.cur?.video === v) Demo.next(Demo.cur); });
  v.addEventListener('error', () => { if (Demo.cur?.video === v) Demo.stop('failed'); });
}
const placeShown = (on) => el.placeVideo.parentElement?.classList.toggle('playing', on); // the drawing's box takes the clip's shape
el.demo.addEventListener('click', () => { if (Demo.cur?.box === el.demo) Demo.stop('skipped'); });
el.placeVideo.addEventListener('click', () => { if (Demo.cur?.box === el.placeVideo) Demo.stop('skipped'); });
el.learnDemo.addEventListener('click', () => { if (Demo.cur?.box === el.learnDemo) Demo.stop('skipped'); });
// Learn's How Exact It Is, from the error the code uses (round 5: the page said 2.5 while u was 3).
el.exactU.textContent = ui.exactLine();
for (const [id, s] of [['learnTrainer', 'trainer'], ['learnWall', 'wall'], ['learnFriend', 'friend']]) {
  el[id].addEventListener('click', () => {
    Demo.play('learn', el.learnDemo, el.learnVideo, demoMoves(s));
    el.learnDemo.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  });
}

// ── the live screen ──────────────────────────────────────────────────────────────────────────
// What the camera view shows, state by state (ui.liveView, from the design review's state table).
// Gathered here from the steps' own state each frame; the DOM changes only when the view does,
// except the ring and the level bubble, which move every frame.
const LEVEL_SECS = 2;   // the green LEVEL screen after levelling (a design choice)
const FLASH_SECS = 0.6; // the one green flash when the held-still reading is taken (a design choice)
const DONE_SECS = 2.5;  // DONE before the result, as long as the spoken result waits (finish)
const BUBBLE_DEG = 5;   // the level bubble reaches the end of its bar at 5 degrees (a design choice)
const RIDER_KEEP = 1;   // s: a frame or two without the rider is not "off the bike" (a design choice)
const PLACE_SUB = 'On a box, 4 big steps from the pedals.';
// inView: someone is in the picture, not cut off; riderAt: when the rider was last seen on the bike;
// face: which way he faces in the camera's picture (fit.facing), for the outline and the arrows.
const live = { inView: false, riderAt: -Infinity, face: 1 };
let curView = null, viewKey = '', capText = null, doneTimer = null;
const vis = (e, on) => { if (e.toggleAttribute) e.toggleAttribute('hidden', !on); else e.hidden = !on; };
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
// The roll as the screen shows it, for the bubble: the screen's own axes, whichever camera films.
// A real bubble rises to the high end, so it moves away from the way gravity leans in the screen.
function screenRoll() {
  const g = Tilt.g;
  if (!g || !Number.isFinite(g[0]) || !Number.isFinite(g[1]) || !g[0]) return Tilt.roll || 0;
  return (Math.atan2(g[1] * (g[0] >= 0 ? 1 : -1), Math.abs(g[0])) * 180) / Math.PI;
}

function liveInput(t) {
  const s = { front: frontMode(), mirrored: mirrorShown(), phase, face: live.face, reduce: reduceMotion() };
  if (phase === 'phone') {
    // The placement screen stays while its lines are said, until the levelling starts.
    if (ph.placing && (!Voice.busy() || /^(I will beep|I cannot use the motion|Both wheels)/.test(Voice.cur?.text || ''))) ph.placing = false;
    Object.assign(s, { placing: !!ph.placing, framing: !!ph.framing && !ph.placing, guide: true,
      sensor: Tilt.available, landscape: Tilt.landscape, upright: innerHeight > innerWidth,
      tilt: Math.max(Math.abs(Tilt.pitch), Math.abs(Tilt.roll)), bubble: -screenRoll() / BUBBLE_DEG,
      fix: session?.fix ? { key: session.fixKey, toward: session.fixToward } : null });
    return s;
  }
  s.levelled = session?.levelAt != null && t - session.levelAt < LEVEL_SECS;
  s.flash = session?.flashAt != null && t - session.flashAt < FLASH_SECS;
  if (phase === 'mount' || phase === 'frame') {
    s.rider = t - live.riderAt < RIDER_KEEP;
    s.inView = live.inView;
    s.asking = phase === 'mount' && ph.needId && !ph.idDone && ph.askN > 0 && !ph.fallback;
    s.who = phase === 'mount' && !!ph.fallback && !s.rider && (Voice.count.get(WHO_STOP) || 0) > 0;
    s.aero = phase === 'mount' && !!session.aeroSaid && !s.rider;
    s.fix = session?.fix ? { key: session.fixKey, toward: session.fixToward } : null;
    s.ok = phase === 'frame' && ph.ok != null;
    // Day one: the tape tip, and whether the voice is saying it now.
    s.tip = phase === 'mount' && !!ph.tape;
    s.tipSpeaking = Voice.cur?.text === TAPE_LINE;
  } else if (phase === 'still') {
    s.hold = { capturing: !!ph.cap, elapsed: ph.cap ? t - ph.cap.t0 : 0, total: 3.2, lost: ph.lostSince != null && t - ph.lostSince > 2 };
  } else if (phase === 'pedal') {
    const { secs, dir } = S();
    s.pedal = { started: !!ph.started, elapsed: ph.moveSecs || 0, total: secs, left: ph.left ?? secs, paused: !!ph.paused, more: !!ph.more, dir };
  }
  return s;
}

// The size of a big word, so it fits the width it has: about 0.75 em a capital in a heavy rounded
// face (measured on the design review's drawings), from max down to min px.
// height: the room it has top to bottom, if that is the tighter limit (0.9 em a line).
function fitWord(e, text, width, max, min, height = Infinity) {
  const n = Math.max(1, [...String(text)].reduce((a, ch) => a + (ch === ' ' ? 0.5 : 1), 0));
  e.style.fontSize = `${Math.round(Math.max(min, Math.min(max, width / (0.75 * n), height / 0.9)))}px`;
}
const RING_C = 2 * Math.PI * 110;
function setRing(frac) {
  el.ringArc.setAttribute('stroke-dasharray', `${(RING_C * frac).toFixed(1)} ${RING_C.toFixed(1)}`);
  el.ringArc.style.display = frac > 0 ? '' : 'none'; // a round cap would draw a dot at 0
}
const BORDER = { blue: ['#0091FF', 'none'], yellow: ['#FFD600', '26 20'], green: ['#30D158', 'none'] };

function renderLive(t) {
  const v = ui.liveView(liveInput(t));
  curView = v;
  // The placement loop goes with the placement screen.
  if (Demo.cur?.kind === 'place' && v.layer !== 'place') Demo.stop('left');
  if (v.ring) setRing(v.ring.frac);
  if (v.level) el.bubble.style.transform = `translateX(${(v.level.bubble * 145).toFixed(1)}px)`;
  const key = JSON.stringify([v.layer, v.step, v.border, v.tone, v.word, v.sub, v.icon, v.arrow, v.ghost, v.figure, v.caption, v.clear, v.bikeGuide,
    v.ring && [v.ring.digits, v.ring.hold], v.level?.text, v.card, v.field, innerWidth, innerHeight, camera]);
  // The caption's height, so the big things never sit under it: measured once the caption is in
  // place for this layer (its width depends on the layer), and a new line lays the screen out again.
  const cap = v.caption ? el.say.textContent : '';
  if (key === viewKey && cap === capText) return;
  const front = frontMode();
  el.run.className = [front ? 'front' : 'rear', mirrorShown() ? 'mirror' : '', `layer-${v.layer}`, v.caption ? '' : 'nocap', v.clear ? 'clear' : '', v.layer === 'field' ? 'onfield' : ''].filter(Boolean).join(' ');
  if (cap !== capText) { capText = cap; el.run.style.setProperty?.('--capH', `${cap ? (el.say.offsetHeight || 40) + 14 : 24}px`); }
  viewKey = key;
  el.stepLabel.textContent = v.step;
  vis(el.placeView, v.layer === 'place');
  el.placeSub.textContent = front ? `${PLACE_SUB} Screen facing the bike.` : PLACE_SUB;
  vis(el.levelView, v.layer === 'level');
  el.levelDeg.textContent = v.level ? v.level.text : v.word;
  fitWord(el.levelDeg, el.levelDeg.textContent, (el.run.clientWidth || innerWidth) - 48, 140, 64);
  vis(el.bubbleBar, !!v.level);
  // Screen away and back from a correction: the card says what to fix, in place of the tilt words.
  el.levelSub.textContent = !front && v.card ? '' : v.sub;
  vis(el.levelSub, !!el.levelSub.textContent);
  // The 3 m word, beside the figure, screen towards the rider.
  vis(el.sign, front && v.layer === 'avatar' && !!v.word);
  el.sign.className = `sign tone-${v.tone}`;
  el.sign.setAttribute('aria-label', v.label);
  el.signWord.textContent = v.word;
  // As wide and as tall as the sign has room for, beside the figure and above the caption.
  fitWord(el.signWord, v.word, el.sign.clientWidth || 380, 124, 64, (el.sign.clientHeight || 300) - (v.icon ? 72 : 0) - 34);
  el.signSub.textContent = v.sub;
  vis(el.signArrow, v.icon === 'arrow');
  el.signArrow.style.transform = v.arrow > 0 ? 'scaleX(-1)' : ''; // drawn pointing left
  vis(el.signCheck, v.icon === 'check' || v.icon === 'tick');
  el.signCheck.style.color = TONE.green;
  // The ring: big and alone with the screen towards him, small over the picture for a helper.
  vis(el.ringView, !!v.ring && v.layer !== 'field');
  if (v.ring) {
    el.timer.textContent = v.ring.digits;
    vis(el.holdIcon, v.ring.hold);
    el.ring.setAttribute('aria-label', v.ring.hold ? 'Hold still' : v.ring.digits ? `${v.ring.digits} seconds to go` : 'A few more turns');
  }
  el.ringWord.textContent = v.word;
  el.ringSub.textContent = v.sub;
  // Screen away: the last correction on a frosted card, or a note (the bike guide, the tape tip) in white.
  vis(el.fixCard, !front && !!v.card && (v.layer === 'avatar' || v.layer === 'level'));
  el.fixCard.className = v.card?.note ? 'fixCard note' : 'fixCard';
  el.sayNote.textContent = v.card?.sub || '';
  vis(el.fixTape, v.card?.icon === 'tape');
  vis(el.fixArrow, !!v.card?.arrow);
  el.fixArrow.style.transform = v.card?.arrow > 0 ? 'scaleX(-1)' : '';
  vis(el.field, v.layer === 'field');
  if (v.field) renderField(v.field);
  vis(el.seeWhat, false);
  // The border round the screen: blue working, dashed yellow needs you, green good.
  vis(el.border, !!v.border && v.layer !== 'field');
  if (v.border) {
    const [colour, dash] = BORDER[v.border];
    el.borderRect.setAttribute('width', Math.max(0, (el.run.clientWidth || innerWidth) - 14));
    el.borderRect.setAttribute('height', Math.max(0, (el.run.clientHeight || innerHeight) - 14));
    el.borderRect.setAttribute('stroke', colour);
    el.borderRect.setAttribute('stroke-dasharray', dash);
  }
  el.overlay.setAttribute('aria-label', ui.avatarLabel(v));
}

// A full screen of colour: LEVEL, the reading taken, DONE, the result.
function renderField(f) {
  el.field.className = `field ${f.tone}`;
  vis(el.fieldCheck, f.icon === 'check');
  vis(el.fieldUp, f.icon === 'up');
  vis(el.fieldDown, f.icon === 'down');
  el.fieldWord.textContent = f.word;
  el.fieldWord.className = f.mm ? 'word mm' : 'word';
  fitWord(el.fieldWord, f.word, (el.field.clientWidth || innerWidth) - (f.icon ? 150 : 0) - 80, 160, 72);
  el.fieldSub.textContent = f.sub || '';
  vis(el.fieldSub, !!f.sub);
}

// Screen towards the rider, at the end: DONE, then the result as a full green or yellow screen with
// one big word or the millimetres to change (ui.resultField), then See What to Do opens the results.
// He is still on the bike, 3 m away; the results sheet is for when he walks to the phone.
function resultOnRun() {
  const win = ui.retestWin(lastResult), focus = ui.focusArea(lastResult, lastAreas);
  const res = ui.resultField(lastResult, { win, grade: win ? ui.winGrade(lastResult, lastAreas) : focus?.grade || 'na', nothing: fit.nothingToDo(lastResult), what: fit.headline(lastResult).what,
    once: ui.onceMore(lastResult) });
  const at = (f, step, button) => {
    viewKey = '';
    curView = { layer: 'field' };
    el.run.className = `${frontMode() ? 'front' : 'rear'}${mirrorShown() ? ' mirror' : ''} layer-field onfield nocap`;
    for (const e of [el.placeView, el.levelView, el.sign, el.ringView, el.fixCard, el.border]) vis(e, false);
    vis(el.field, true);
    renderField(f);
    el.stepLabel.textContent = step;
    vis(el.seeWhat, button);
    el.skip.hidden = true;
    el.stop.hidden = true; // nothing to stop: the check is saved
    if (button) el.seeWhat.focus?.({ preventScroll: true });
  };
  at({ tone: 'green', icon: 'check', word: 'Stop', sub: 'You can relax' }, 'Step 5 of 5', false);
  clearTimeout(doneTimer);
  doneTimer = setTimeout(() => { doneTimer = null; if (!el.run.hidden) at(res, 'Result', true); }, DONE_SECS * 1000);
}
el.seeWhat.addEventListener('click', () => { clearTimeout(doneTimer); doneTimer = null; show('results'); });

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
// "Where will the screen face?" picks the camera: Towards me is the front camera ('user'), Away from
// me the back one ('environment'), the default. 'ideal', so a device with only one camera still films.
const askedFacing = () => ((session?.screen ?? screen) === 'towards' ? 'user' : 'environment');
let camLogged = false;
async function startCamera() {
  const facingMode = { ideal: askedFacing() };
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    // A kept clip goes to the full analysis, whose filming guide asks for 1080p or more. The pedalling
    // step's frames-per-stroke check protects the reading if bigger frames slow the pose model.
    video: el.keepVideo.checked
      ? { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
      : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  });
  el.cam.srcObject = stream;
  await el.cam.play().catch(() => {});
  // iOS ends or mutes the camera when the page goes to the background or another app takes it.
  const tr = stream.getVideoTracks()[0];
  // The camera the browser really gave: the one asked for unless it says otherwise.
  const got = tr?.getSettings?.().facingMode;
  camera = got === 'user' ? 'front' : got === 'environment' ? 'rear' : askedFacing() === 'user' ? 'front' : 'rear';
  if (session) session.camera = camera;
  camLogged = false;
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

// Once, after the camera's first frame: what the browser really gave (camera panel: the front
// camera's resolution, frame rate and cropping in Safari are not known yet). Into the debug info
// (window.__bfc.camera) and one line of Copy Results, so a phone test can report it.
function logCamera() {
  camLogged = true;
  let st = {};
  try { st = stream?.getVideoTracks()[0]?.getSettings?.() || {}; } catch { /* not reported */ }
  debug.camera = { asked: askedFacing(), camera, mirrored: camera === 'front', facingMode: st.facingMode ?? null, width: st.width ?? null, height: st.height ?? null,
    frameRate: st.frameRate ?? null, aspectRatio: st.aspectRatio ?? null, resizeMode: st.resizeMode ?? null, videoWidth: el.cam.videoWidth, videoHeight: el.cam.videoHeight };
}
function cameraLine() {
  const c = debug.camera;
  if (!c) return '';
  const size = c.width && c.height ? `, ${c.width} by ${c.height}` : c.videoWidth ? `, ${c.videoWidth} by ${c.videoHeight}` : '';
  return `Camera: ${c.camera === 'front' ? 'front' : 'back'}${c.sim ? ' (simulation)' : ''}${size}${c.frameRate ? `, ${Math.round(c.frameRate)} frames a second` : ''}.`;
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

// quick: Check It Now with the phone still where it was levelled (checkNow): the check starts again
// at getting on, with no placement and no levelling. answered: he said so himself ("Is the phone
// where it was?", Yes).
async function start({ quick = false, answered = false } = {}) {
  quietResults();
  el.stopped.hidden = true;
  el.rShot.removeAttribute('src');
  if (session) session.stillShot = null;
  // Inside the tap: the audio session, the beeps, then the voice (unlockSound).
  unlockSound();
  const tiltReady = SIM ? Promise.resolve(true) : Tilt.request();
  starting = true;
  renderStart();
  el.again.disabled = true;
  setStatus('Starting the camera.');
  try {
    if (!SIM) await startCamera();
  } catch (e) {
    setStatus(cameraError(e), true);
    starting = false;
    renderStart();
    el.again.disabled = false;
    // Back to the screen with Start, where the reason is shown above it.
    showFlow(flowStep === 'allow' ? 'allow' : 'ready');
    return;
  }
  await tiltReady;
  keepAwake();
  if (SIM) {
    camera = screen === 'towards' ? 'front' : 'rear';
    debug.camera = { asked: askedFacing(), camera, mirrored: camera === 'front', sim: true };
    sim = await makeSim();
  }
  // tries: frame corrections said so far, by check; screen: which way the screen faces; camera: the
  // camera that films (startCamera).
  // kit: 'diff' when he said on Getting Ready that this film is in other shoes or shorts (a retest).
  session = { at: new Date(), tries: {}, setup, screen, camera, kit: kitChoice };
  kitChoice = null;
  // A rider who has checked this setup on this phone before hears the short run (RETURN); a new
  // setup is explained in full. tapeKnown: a check has asked for the tape marks already. lastScreen:
  // which way the screen faced last time with this setup.
  const before = loadHistory(), same = before.filter(x => x.setup === setup);
  Object.assign(session, { returning: same.length > 0, tapeKnown: before.some(x => x.tape), lastScreen: same[0]?.screen || null });
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
  Object.assign(live, { inView: false, riderAt: -Infinity, face: 1 });
  clearTimeout(doneTimer);
  doneTimer = null;
  viewKey = '';
  curView = null;
  capText = null;
  el.say.textContent = '';
  vis(el.seeWhat, false);
  vis(el.field, false);
  el.stop.hidden = false;
  el.runSetup.textContent = fit.setupOf(setup).bike ? `Bike ${fit.setupOf(setup).bike}` : '';
  show('run');
  running = true;
  starting = false;
  renderStart();
  el.again.disabled = false;
  setStatus(landmarker || SIM ? 'Ready.' : '');
  if (quick && placed) {
    // The phone was placed and levelled for the last check and has not moved since (or he said so):
    // the setup was told then, and a level check skipped then stays skipped.
    Object.assign(session, { quick: true, toldSetup: true, levelled: !!placed.levelled, toldWhere: answered });
    if (placed.skippedLevel) { skipped.add('level'); warnings.add('level'); }
    go('mount', now(), 'quick');
    return;
  }
  Watch.reset();
  go('phone', now());
}

// Stopped: nothing was saved, and a change that is still waiting is still waiting. The card goes at
// the top of the home screen, where the page opens; "No, start anyway" is forgotten, so that change
// is asked about again.
function stop() {
  running = false;
  phase = null;
  clearTimeout(doneTimer);
  doneTimer = null;
  quietResults();
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  stopCamera();
  wake?.release?.();
  declined.clear();
  const h = loadHistory();
  el.stoppedWait.hidden = !(fit.pendingChange(h) || fit.askMade(h));
  el.stopped.hidden = false;
  renderHistory();
  selectTab('check');
  show('home');
  if (!el.status.classList.contains('err')) setStatus(landmarker || SIM ? 'Ready.' : '');
}

// The result of this session from what was measured, folded with the history from before it: the
// retest of a change made last time (fit.judgeChange) and a held-still reading out of range twice
// running (fit.withStillHistory).
function computeResult(history) {
  // pain caps the saddle step at 5 mm; before: the film just before, when it was close to the edge
  // (fit.edgeBefore), so the two films' average decides.
  const advice = fit.withStillHistory(fit.advise(session.still, session.pedal, session.setup, { pain, before: fit.edgeBefore(history, session.setup) }), history);
  // Then the retest of a change, and the flow's own rules (fit.withFeel): one change per ride, a change
  // put back after it felt worse twice, and a bike a fitter set up.
  lastResult = fit.withFeel(fit.withRetest(advice, fit.judgeChange(fit.pendingChange(history),
    { knee: advice.knee, src: advice.kneeSource, setup: session.setup, values: { torso: advice.torso, shoulder: advice.shoulder, elbow: advice.elbow }, kit: session.kit })),
    history, { fitter: fitter === 'yes', pain });
  lastRows = fit.measures(lastResult, session.pedal);
  lastAreas = fit.areas(lastResult, lastRows);
}

async function finish() {
  running = false;
  phase = null;
  videoBlob = await stopRecording();
  stopCamera();
  howHeldTapped = false;
  lastHistory = loadHistory();
  computeResult(lastHistory);
  lastId = saveHistory(lastResult, lastRows, lastAreas);
  // Where the phone stood for this check, for Check It Now (checkNow).
  placed = { setup: session.setup, screen: session.screen, levelled: !!session.levelled && !skipped.has('level'), skippedLevel: skipped.has('level') };
  // The saddle change worked (ui.retestWin), or nothing to change: the check is done. Otherwise
  // something is to be changed or filmed again, and the phone should stay where it is: the screen
  // stays awake (a locked screen stops the motion sensor that watches whether the phone moves) until
  // the results close, or WAKE_KEEP has passed.
  const win = ui.retestWin(lastResult), done = ui.checkDone(lastResult);
  if (done) wake?.release?.(); else holdWake();
  renderResults(lastResult, lastRows, lastHistory);
  // Screen towards him, on the bike 3 m away: DONE and the result on the camera view, then See What
  // to Do opens the results. Screen away: the results straight away, as before.
  if (frontMode()) resultOnRun(); else show('results');
  // Before the result, so the next check can start where this one ended (the customer research, item 1).
  if (!done) Voice.say(LEAVE_LINE);
  // The win is said as the win, with a chime; a check with nothing to change says when to check again.
  // Not after "Ride it first" or "Ride it once more", which say when to come back themselves.
  const spoken = fit.spokenSummary(lastResult, { pain, win }) + (!win && done && !['ride', 'worse'].includes(lastResult.wait) ? ` ${fit.COME_BACK}` : '');
  Clips.prefetch(spoken); // its clips load while DONE shows
  summaryTimer = setTimeout(() => { summaryTimer = null; if (win) Beep.chime(); Voice.say(spoken); }, DONE_SECS * 1000);
}

// Design choice: the longest the screen stays awake on the results while a change waits.
const WAKE_KEEP = 600;
let wakeTimer = null;
function holdWake() {
  clearTimeout(wakeTimer);
  wakeTimer = setTimeout(() => { wakeTimer = null; if (!running) wake?.release?.(); }, WAKE_KEEP * 1000);
}
function dropWake() { clearTimeout(wakeTimer); wakeTimer = null; if (!running) wake?.release?.(); }

// ── checking the change now ──────────────────────────────────────────────────────────────────
// Check It Now and Check Again on the results: the phone was placed and levelled for the check just
// done, and the rider only moved the saddle. placed: how that check was set up (finish). The phone is
// taken as still in place when it was levelled by the motion sensor, it has not moved since (Watch),
// and the bike and the screen are as they were then. When the sensor cannot tell (no reading since,
// or the level check was skipped), one question: "Is the phone where it was?".
let placed = null;
function phoneState() {
  if (!placed || placed.setup !== setup || placed.screen !== screen) return 'none';
  if (!placed.levelled) return 'unknown';
  return Watch.verdict();
}
// from: the screen it was asked from ('results', or 'ready' for Getting Ready's Start after an
// earlier check in this page view), where the question's close button goes back to.
let whereFrom = 'results';
function checkNow(from = 'results') {
  const p = phoneState();
  if (p === 'still') { start({ quick: true }); return; }
  if (p === 'unknown') { askWhere(from); return; }
  start();
}
function askWhere(from) {
  whereFrom = from;
  quietResults();
  showFlow('where');
  unlockSound();
  Voice.say(WHERE_LINE);
}
// The results' bottom bar holds the one primary button (DECISIONS.md, 2026-10-10: one obvious button,
// at the bottom where the thumb is, the same place every time). While a change waits for its
// millimetres: the button that saves it and checks it now, named for what it saves ("I Moved It 9 mm,
// Check Now", renderNowLabel), the line under it, "The phone is already in place." (not once the phone
// moved), and Check Again as a quiet text button (film again without the change). Otherwise Check
// Again: the primary when the result asks to film again, a tinted one when the check is done. Hidden
// while "When will you move it?" asks, which has its own buttons.
function renderBar() {
  if (!el.rMadeNow) return;
  const waits = !el.rMade.hidden && !el.rMadeAsk.hidden;
  const when = !el.rMade.hidden && !el.rWhen.hidden;
  el.rMadeNow.hidden = !waits;
  el.rMadeHint.hidden = !waits || phoneState() === 'moved';
  el.again.className = waits ? 'plain' : lastResult && !ui.checkDone(lastResult) ? 'primary' : 'tinted';
  $('rBar').hidden = when;
  fitBar();
}
// The bar sticks to the bottom of the screen while it is small. At large text on a small phone it
// covered 27 to 39% of the screen (round 3's QA, 28 px text): taller than BAR_SHARE of the screen
// (a design choice), it stops sticking and sits right under the change card, where the millimetres
// are set, and scrolls with the page. Measured, since its height follows the iPhone's text size.
const BAR_SHARE = 0.2;
function fitBar() {
  const bar = $('rBar');
  if (bar.hidden) return;
  const flowing = bar.classList.contains('flowing');
  // Its height where it sticks: as measured there, or, while it flows, plus the padding it has there
  // (22 px above, 14 below), so it is not moved just to be measured.
  const h = bar.getBoundingClientRect?.().height;
  const tall = !el.rMade.hidden && (flowing ? h + 36 : h) > innerHeight * BAR_SHARE;
  if (tall === flowing) return;
  bar.classList.toggle('flowing', tall);
  if (tall) el.rMade.after(bar); else el.results.append(bar);
}

let lastRows = [], lastAreas = [];
// The results sheet, in one focus order: the status of the area the headline is about, the
// headline and one short line (fit.headline's short; the full reason is in Say It Again and Copy
// Results); the notes that change how to read it; how to make the change, one tap away, in the order
// the hands do it; "I Made This Change"; then the areas, the one in focus first with its range bar
// and its details one tap away, and an area that waits for the saddle as one line. The one primary
// button is in the bottom bar (renderBar). Every number and sentence here is fit.js's own (headline,
// areas, measures, saddleHowTo, madeQuestion); this only arranges them.
function renderResults(r, rows, history) {
  nudged = false; // a new result: Check It Now may be pointed at once more
  clearTimeout(nudgeTimer);
  el.rOverall.className = 'pill ' + r.overall; // hidden: the areas carry the statuses
  el.rOverall.textContent = fit.STATUS[r.overall];
  // Pain or numbness first: for those riders a phone check is only a starting point.
  $('rPainBox').hidden = !pain;
  $('rPainBox').open = false;
  $('rPainShort').textContent = fit.PAIN_SHORT;
  el.rPain.textContent = pain ? fit.painNote(r) : '';
  // The headline and its reason depend on the verdict (fit.advise): a change, no change, two
  // readings that point different ways, only the held-still reading, or nothing measured. On a
  // retest whose saddle change moved the knee into range (ui.retestWin), the win is the headline and
  // the before and after is its reason.
  const h = fit.headline(r);
  const win = ui.retestWin(r);
  const focus = ui.focusArea(r, lastAreas);
  // A win's status is the saddle card's own, Good only when that is Good (ui.winGrade, SPEC 4.3).
  const grade = win ? ui.winGrade(r, lastAreas) : focus?.grade || 'na';
  el.rStatus.className = 'pill ' + grade;
  el.rStatus.textContent = fit.STATUS[grade];
  el.rStatus.setAttribute('aria-label', `${ui.AREA_TITLE[focus?.key || 'saddle']}: ${fit.STATUS[grade]}`);
  el.rWhat.textContent = ui.titleCase(win ? 'Your saddle change worked' : h.what);
  el.rWhy.textContent = win ? ui.winLine(r) : h.short;
  // Before and after a change marked last time, with how much it should have moved. A change too small
  // to measure says so out loud and one tap away, in the saddle card's details (QA round 4: a 22-word
  // note under "Ride It First").
  el.rCompare.hidden = !r.retest || win || r.retest.verdict === 'too-small';
  el.rCompare.textContent = r.retest?.text || '';
  // How the bike stayed up, because sessions are only compared with others filmed the same way.
  const bike = fit.setupOf(r.setup).bike;
  el.rSetup.hidden = true; // kept for Copy Results, not shown: the sheet carries one short line
  el.rSetup.textContent = bike ? `Bike ${bike}, pedalling ${r.pedalDir}.` : '';
  renderHowHeld(r);
  el.rDisagree.hidden = !r.stillOut || !!r.stillOutAgain;
  const w = fit.warnLine(warnings, r.setup);
  el.rWarn.hidden = !w;
  el.rWarn.textContent = w;
  el.rHowToSlot.replaceChildren(...(r.change?.kind === 'saddle' ? [howTo(r.change.raise)] : []));
  renderMade(r.change);
  // The area the headline is about first, then the others in their usual order.
  const order = [...lastAreas].sort((a, b) => (b === focus) - (a === focus));
  el.rList.replaceChildren(...order.map(a => areaCard(a, r, history, { focus: a === focus, win })));
  // The picture is titled "with the pedal at its lowest point", so not shown when it was not there.
  const shot = Number.isFinite(r.stillOffBottom) ? null : session.stillShot;
  el.shotCard.hidden = !shot;
  if (shot) el.rShot.src = shot;
  el.saveVideo.hidden = !videoBlob;
}

const make = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const chevron = () => { const s = make('span', 'chevw'); s.innerHTML = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><use href="#chev"/></svg>'; return s; };
const glyph = (key) => { const s = make('span'); s.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href="#${key === 'reach' ? 'reachGlyph' : 'saddleGlyph'}"/></svg>`; return s; };
function catLine(key) {
  const c = make('span', 'cat ' + key);
  c.append(glyph(key), make('span', null, ui.AREA_TITLE[key]));
  return c;
}
function pillFor(grade, status) { return make('span', 'pill ' + (fit.STATUS[grade] ? grade : 'na'), status); }

// One reading as VoiceOver hears it, "Saddle height, 44 degrees, target 30 to 40, Needs attention",
// with the big number and the range bar under it. The bar draws prev as the reading before (a win).
function readingBlock(name, value, metric, [lo, hi], status, { prev = null, big = true, pill = null } = {}) {
  const box = make('div', big ? 'reading' : 'mini');
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', ui.rangeLabel(name, value, [lo, hi], status)
    + (prev != null ? `, ${Math.round(prev)} degrees before` : ''));
  if (big) {
    const val = make('div', 'val');
    val.append(make('span', 'big', Number.isFinite(value) ? `${Math.round(value)}°` : 'No reading'), make('span', 'metric', metric));
    box.append(val);
    if (pill) box.append(pill);
  } else {
    const mh = make('div', 'mh');
    mh.append(make('span', null, metric), make('b', null, Number.isFinite(value) ? `${Math.round(value)}°` : 'No reading'));
    box.append(mh);
  }
  if (Number.isFinite(value)) {
    const bar = make('div');
    bar.innerHTML = ui.rangeBar({ value, lo, hi, prev, nowLabel: prev != null ? `${Math.round(value)}° now` : null, prevLabel: prev != null ? `${Math.round(prev)}° before` : null });
    box.append(bar);
  }
  return box;
}

// An area's details, folded away: its reason and step in words, any note, then the readings behind
// it with how each compares with last time.
const detailList = (a, history) => { const ul = make('ul', 'detail'); ul.append(...a.rows.map(x => detailRow(x, history))); return ul; };
function readings(a, history, lines = [], nodes = []) {
  const d = make('details', 'readings');
  d.append(make('summary', null, 'Details'), ...nodes, ...lines.filter(Boolean).map(l => make('p', 'why', l)), detailList(a, history));
  return d;
}

// An area as a card: its colour line and status, the reading on its range bar, why, and one step.
// An area that waits for the saddle, and "More numbers", are one line that opens.
function areaCard(a, r, history, { focus, win }) {
  if (a.key === 'more' || (a.grade === 'after' && !focus)) {
    const d = make('details', 'card oneline');
    const s = make('summary');
    const line = make('span');
    line.append(make('b', a.key, `${ui.AREA_TITLE[a.key]}: `), make('span', 'sec', a.key === 'more' ? 'for reference' : 'checked after the saddle'));
    s.append(line, chevron());
    d.append(s, ...[a.why, a.step, ...(a.key === 'reach' ? r.notes || [] : [])].filter(Boolean).map(l => make('p', 'why', l)), detailList(a, history));
    d.classList.add('area');
    return d;
  }
  const card = make('section', 'card area ' + a.key);
  const top = make('div', 'top');
  top.append(catLine(a.key), pillFor(a.grade, a.status));
  card.append(top);
  const by = Object.fromEntries(a.rows.map(x => [x.key, x]));
  // The back, elbow and shoulder bars when reach and bars is not what the headline is about: one tap
  // away, with the step in plain words on the card (DECISIONS.md, 2026-10-10: one change at a time on
  // top, the expert numbers underneath).
  let minis = [];
  if (a.key === 'saddle') {
    const k = Number.isFinite(by.kneePedal?.value) ? 'kneePedal' : Number.isFinite(by.kneeStill?.value) ? 'kneeStill' : 'kneePedal';
    const [lo, hi] = fit.TARGETS[ui.METRIC[k].target];
    card.append(readingBlock('Saddle height', by[k]?.value, ui.METRIC[k].name, [lo, hi], a.status, { prev: win ? r.retest.before : null }));
  } else {
    // The shoulder is for reference only: its number is in the details, with no target bar.
    minis = ['torso', 'elbow'].filter(k => by[k]).map(k => readingBlock(ui.METRIC[k].short, by[k].value, ui.METRIC[k].short, fit.TARGETS[k], '', { big: false }));
    if (focus) { card.append(...minis); minis = []; } else card.append(make('p', 'step', a.step));
  }
  // The reason, the step and, after a saddle change that worked, when to check again (whenever
  // something that moves the fit changes: the customer research's suggestion; there is no set time to
  // wait, README) are one tap away: the headline and the voice already say them.
  const stepShown = a.key !== 'saddle' && !focus;
  const tooSmall = a.key === 'saddle' && r.retest?.verdict === 'too-small' ? r.retest.text : null;
  card.append(readings(a, history, [a.why, stepShown ? null : a.step, tooSmall, ui.checkDone(r) && a.key === 'saddle' && !['ride', 'worse'].includes(r.wait) ? fit.COME_BACK : null, ...(a.key === 'reach' ? r.notes || [] : [])], minis));
  return card;
}

// "How to Do It" (fit.saddleHowTo, from Park Tool), in the order the hands do it, one tap away
// (DECISIONS.md, 2026-10-10: details one tap away; the headline says what to change).
function howTo(raise) {
  const h = fit.saddleHowTo(raise);
  const d = make('details', 'card howto');
  d.id = 'rHowTo';
  d.open = false;
  const s = make('summary');
  s.setAttribute('aria-label', ui.titleCase(h.title));
  s.append(make('span', null, 'How to Do It'), chevron());
  const ol = make('ol', 'nums');
  ol.append(...h.steps.map(x => make('li', null, x)));
  d.append(s, ol, ...h.notes.map(x => make('p', 'small', x)));
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
  li.querySelector('.v').textContent = Number.isFinite(x.value) ? `${round(x.value)}°` : 'No reading';
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
// The change card, on the results sheet ('r', "I Made This Change") and on the Check tab ('h', "Your
// Last Change"): the only way the app learns what was really changed. For a saddle change, a
// millimetre stepper (type a number, or tap minus and plus) that starts at the low end of the
// suggestion, "How far did it move? Less is fine."; nothing is saved until he taps a button. For
// the handlebars, no number. Only the change (which way, how many millimetres) and when are
// stored, in that session's history entry. The words come from fit.madeQuestion.
const card = (p) => ({ q: p === 'r' ? $('made-h') : el.hMadeQ, mmRow: $(p + 'MadeMmRow'), input: $(p + 'MadeMm'),
  err: $(p + 'MadeErr'), yes: $(p + 'MadeYes'), no: $(p + 'MadeNo') });
function fillCard(p, words, sug) {
  const c = card(p);
  c.q.textContent = words.q;
  c.mmRow.hidden = !words.mm;
  c.err.hidden = true;
  c.input.value = words.mm && sug?.kind === 'saddle' ? String(Math.max(1, sug.mm[0])) : '';
  c.no.hidden = !words.no;
  c.no.textContent = words.no || '';
}
// The stepper: whole millimetres from 1 to fit.MADE_MAX, the field's own limits.
function stepMm(p, d) {
  const c = card(p);
  const v = Math.round(Number(c.input.value));
  c.input.value = String(Math.max(1, Math.min(fit.MADE_MAX, (Number.isFinite(v) && v > 0 ? v : 0) + d)));
  c.err.hidden = true;
  if (p === 'r') { renderNowLabel(); nudgeCheckNow(); }
}
// The results' primary button while a change waits says what it saves, from the stepper as it is
// now: "I Moved It 9 mm, Check Now" (ui.checkNowLabel), redrawn with every change to the number.
function renderNowLabel() {
  const l = ui.checkNowLabel(lastResult?.change, card('r').input.value);
  el.rMadeNow.textContent = l.text;
  el.rMadeNow.setAttribute('aria-label', l.aria);
}

// Once he has set how far it moved on the results, the voice points at Check It Now (the customer
// research, item 1): "Check it now. The phone is already in place.", or only "Check it now." once
// the phone has moved. Once per result, NUDGE_SECS after the last change to the number, so a few
// taps on the stepper are not talked over (a design choice).
const NUDGE_SECS = 1.5;
// nudgedAt: when it was said, so Check It Now right after it does not say "already in place" twice
// (within 20 s, a design choice).
let nudged = false, nudgeTimer = null, nudgedAt = -Infinity;
function nudgeCheckNow() {
  if (nudged || !lastResult?.change) return;
  clearTimeout(nudgeTimer);
  nudgeTimer = setTimeout(() => {
    nudgeTimer = null;
    if (nudged || el.results.hidden || running || !['ask', 'later'].includes(rMadeMode)) return;
    nudged = true;
    nudgedAt = now();
    Voice.say(phoneState() === 'moved' ? CHECK_NOW_MOVED : CHECK_NOW_LINE);
  }, NUDGE_SECS * 1000);
}

let rMadeMode = null;
function renderMade(change, mode = 'ask') {
  rMadeMode = change ? mode : null;
  el.rMade.hidden = !change;
  if (!change) { renderBar(); return; }
  const sug = fit.suggestedChange(change);
  const words = fit.madeQuestion('results', mode, sug);
  fillCard('r', words, sug);
  // The card's own title says what it asks; the question shows only when it says something more
  // ("Before you film again: ...", "I will ask when you come back ...").
  $('made-h').hidden = mode === 'ask';
  renderNowLabel();
  el.rMadeYes.hidden = mode === 'before';
  el.rMadeYes.textContent = 'Save, Check Later';
  // "Later" first asks when he will move it (renderWhen); after that, the card as before.
  el.rMadeAsk.hidden = mode === 'when';
  el.rWhen.hidden = mode !== 'when';
  if (mode === 'when') { el.whenPickRow.hidden = true; el.whenPick.hidden = false; }
  if (mode === 'ask') el.rWhenDone.hidden = true;
  el.rMadeSaved.hidden = true;
  renderBar();
}

// ── "When will you move it?" ──────────────────────────────────────────────────────────────────
// After "Later" on the results (the change is not made yet): Tonight, Weekend or Pick a Day makes a
// calendar file on the phone (ui.icsReminder: no server, no web push) whose event opens this app.
// Nothing about it is stored. Not checked on an iPhone yet: what Safari does with the file, from
// Safari and from a Home Screen app (the customer research marks it a hypothesis).
const appUrl = () => { try { return new URL('./', location.href).href; } catch { return String(location.href); } };
const whenLabel = (d) => d.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
function remind(choice) {
  const sug = fit.suggestedChange(lastResult?.change);
  const at = ui.remindAt(choice, new Date(), choice === 'pick' ? el.whenDate.value : null);
  if (!at) { el.whenDate.focus?.(); return; }
  const words = ui.reminderWords(sug);
  const text = ui.icsReminder({ start: at, title: words.title, notes: words.notes, url: appUrl(), uid: `${Date.now()}-${Math.random().toString(36).slice(2)}@bike-fit-coach` });
  offerFile(text, 'bike-fit-check.ics', 'text/calendar;charset=utf-8');
  debug.ics = text;
  renderMade(lastResult?.change, 'later');
  el.rWhenDone.hidden = false;
  el.rWhenDone.textContent = `Calendar reminder made for ${whenLabel(at)}.`;
}
function offerFile(text, name, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { if (debug.errors.length < 50) debug.errors.push(`calendar: ${e?.message || e}`); }
}
for (const [b, choice] of [[el.whenTonight, 'tonight'], [el.whenWeekend, 'weekend']]) b.addEventListener('click', () => remind(choice));
el.whenPick.addEventListener('click', () => {
  // Tomorrow at 10 am to start from (a design choice); the picker changes it.
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  el.whenDate.value ||= `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
  el.whenPickRow.hidden = false;
  el.whenPick.hidden = true;
  el.whenDate.focus?.();
});
el.whenAdd.addEventListener('click', () => remind('pick'));
el.whenSkip.addEventListener('click', () => renderMade(lastResult?.change, 'later'));

// Stores the change on the history entry id. Returns { made, saved }, or null without a usable number.
// at: when the change counts as made, for "Better, the same, or worse?" (fit.feelDue): now, or, said
// later on the Check tab, the check that suggested it (he made it some time since, and has usually
// ridden it; the question has Not Ridden Yet if not). QA round 4: stamped with the tap, a change saved
// on the Check tab after days of riding got "Ride It First" and the question was never asked.
function markMade(id, change, mm, at = new Date().toISOString()) {
  const made = fit.madeChange(change, mm, at);
  if (!made || !id) return null;
  const h = loadHistory(), entry = h.find(s => s.at === id);
  let saved = false;
  if (entry) {
    // In the simulation the made-up saddle moves by what he says he moved it (makeSim).
    const mmOf = (x) => (x?.kind === 'saddle' ? x.dir * x.mm : 0);
    if (SIM) simSaddle += mmOf(made) - mmOf(entry.made);
    entry.made = made;
    saved = storeHistory(h);
  }
  renderHistory();
  return { made, saved };
}

// startNow: "I Moved It <n> mm, Check Now", which saves the change and starts a check straight away:
// the phone is already in place and the questions were answered for this check.
function madeHere(mm, startNow = false) {
  const before = rMadeMode === 'before';
  const m = markMade(lastId, lastResult?.change, mm);
  if (!m) { card('r').err.hidden = false; return; }
  rMadeMode = 'saved';
  el.rMadeAsk.hidden = true;
  el.rMadeSaved.hidden = false;
  el.rMadeSaved.textContent = m.saved ? fit.madeNote(m.made) : 'This browser is not keeping your sessions, so I cannot check it next time.';
  renderBar();
  if (m.saved && m.made.mm > fit.MADE_STEP_MAX && !startNow && !before) { unlockSound(); Voice.say(fit.madeNote(m.made)); }
  // The phone is where it was for the check just done, unless the motion sensor says otherwise.
  if (before || startNow) checkNow();
}

// Sessions whose change he said he did not make ("No, film anyway"), for this page view only, until Stop.
const declined = new Set();
// The newest session's change, when no one has said whether it was made (fit.askMade).
function unanswered() {
  const e = fit.askMade(loadHistory());
  return e && !declined.has(e.at) ? e : null;
}

// The same question on the Check tab, for when he has left the results without answering.
let hMadeMode = 'ask', hMadeId = null;
function renderHomeMade() {
  // Not for a change suggested before the bike fitter answer was changed to Yes: the Check tab no
  // longer gives it (ui.fitterChanged), so it does not ask whether it was made either.
  const u = unanswered();
  const e = u && ui.fitterChanged(u, fitterAnswer()) !== 'yes' ? u : null;
  el.hMade.hidden = !e;
  if (!e) { hMadeId = null; return; }
  if (e.at !== hMadeId) { hMadeId = e.at; hMadeMode = 'ask'; }
  const words = fit.madeQuestion('home', hMadeMode, e.suggested, dayLabel(e.at));
  fillCard('h', words, e.suggested);
  const saddle = e.suggested?.kind === 'saddle';
  $('hMadeYes').hidden = false;
  $('hMadeYes').textContent = saddle ? (hMadeMode === 'before' ? 'Save and Start' : 'Save') : (words.yes || 'Yes, I made it');
  // Its own Start stays hidden: the assessment card right under it has Start a Check, and "Before
  // you start" already starts the check with either answer.
  el.hMadeStart.hidden = true;
}
function madeHome(mm) {
  const e = unanswered(), before = hMadeMode === 'before';
  if (!e) return;
  const m = markMade(e.at, e.suggested, mm, e.at);
  if (!m) { card('h').err.hidden = false; return; }
  if (m.saved && m.made.mm > fit.MADE_STEP_MAX) { setStatus(fit.madeNote(m.made)); unlockSound(); Voice.say(fit.madeNote(m.made)); }
  if (before) newCheck();
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
    selectTab('check');
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
    fit.headline(r).why, // the full reason, which the screen keeps to one short line
    ...(r.notes || []),
    fit.setupOf(r.setup).bike ? `Bike ${fit.setupOf(r.setup).bike}, pedalling ${r.pedalDir}.` : '',
    r.retest ? r.retest.text : '',
    ...lastAreas.flatMap(a => [
      `${a.name}: ${a.status}. ${a.step}`,
      ...a.rows.map(x => `  ${x.name}: ${Number.isFinite(x.value) ? round(x.value) + '°' : 'no reading'} (${x.target})`),
    ]),
    ...fit.reportLines(r), // what each reading is set against, and where the millimetres come from
    fitter === 'yes' ? 'A bike fitter set up this bike: the app reports, and suggests a change only with pain, at most 5 mm.' : '',
    fit.feelReport(lastHistory),
    `Pedal strokes measured: ${session.pedal?.strokes ?? 0}.`,
    cameraLine(),
    w, // the same words as on the screen
    ...ui.soundLog({ ok: Clips.ok, played: debug.voice.played.length, fallback: debug.voice.fallback.length, cuts: debug.voice.cuts }),
    'Not medical advice.',
  ].filter(Boolean).join('\n');
}

const HKEY = 'bfc.history.v1';
// ?sim&seed=<name> fills a made-up history for testing the screens (see SEEDS below) and keeps it in
// memory only, so a simulation never touches the history stored on this phone.
const MEMORY = SIM && params.has('seed') ? { h: null } : null;
function loadHistory() {
  if (MEMORY) return JSON.parse(JSON.stringify(MEMORY.h || []));
  try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; }
}
// Returns whether it was kept.
function storeHistory(h) {
  if (MEMORY) { MEMORY.h = JSON.parse(JSON.stringify(h)); return true; }
  try { localStorage.setItem(HKEY, JSON.stringify(h)); return true; } catch { return false; } // private mode: keep going without history
}
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
  // screen: which way the screen faced ('towards': the front camera, 'away': the back one), so the
  // two cameras' readings can be told apart later (camera panel, 2026-10-10); camera: the camera the
  // browser really filmed with ('front' or 'rear'), which can differ on a device with only one.
  // stillOut: the held-still reading was out of range while pedalling was in range (fit.withStillHistory).
  // nothing: nothing to do after it, for "Nothing to change" at home.
  // edge: the pedalling knee to one decimal, when it was just outside its range by less than the
  // app's error, so the film straight after it is averaged with it (fit.edgeBefore); also when this
  // film was itself averaged (fit.edgeReading), so two films near the edge always pair.
  h.unshift({ at, v: 2, setup: r.setup, screen: session?.screen || null, camera: session?.camera || null, pedalDir: r.pedalDir, knee: round(r.knee), src: r.kneeSource, values, areas: grades, change: r.change ? r.change.headline : null,
    ...(r.change ? { suggested: fit.suggestedChange(r.change) } : {}), warn: [...warnings], ...(r.held ? { held: true } : {}),
    ...(r.stillOut ? { stillOut: true } : {}), ...(fit.nothingToDo(r) ? { nothing: true } : {}),
    ...(fit.edgeReading(r) != null ? { edge: fit.edgeReading(r) } : {}),
    // kit: filmed in other shoes or shorts than last time (a retest), so not compared (fit.pendingChange).
    // wait and would: a change fit.withFeel held (ride it first, a fitter's bike, a change put back), and
    // that change, for the Check tab's words; never as suggested, so it is never asked as made.
    ...(session?.kit === 'diff' ? { kit: 'diff' } : {}),
    ...(r.wait ? { wait: r.wait, would: fit.suggestedChange(r.would) } : {}),
    // tape: day one asked for tape marks on the floor, so the short run can say "on your tape marks".
    ...(session?.tapeSaid || old?.tape ? { tape: true } : {}),
    ...(old?.made && old.made.kind === r.change?.kind ? { made: old.made } : {}) });
  storeHistory(h.slice(0, 30));
  renderHistory();
  return at;
}
const dayLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
debug.history = loadHistory; // for test/flow-runner.mjs, which cannot see a seeded history otherwise

// Everything drawn from the history: the Check tab, Progress, and the setup steps on Getting Ready.
function renderHistory() {
  const h = loadHistory();
  const pending = fit.pendingChange(h);
  renderAssess(pending);
  renderHomeMade();
  // The setup steps on Getting Ready stay folded away, one tap from the list, the first time too:
  // the voice says each of them during the check (DECISIONS.md, 2026-10-10: details one tap away).
  renderCheckTab(h);
  renderProgress(h);
  el.histCard.hidden = !h.length;
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
    else { b = document.createElement('span'); b.className = 'num small'; b.textContent = s.knee != null ? `knee ${s.knee}°` : 'knee not measured'; }
    li.append(a, b);
    return li;
  }));
}

// The assessment card on the Check tab: "Check Your Change" with its own Check It Now while a marked
// change waits to be checked, otherwise "Check Your Road Bike Position" and Start a Check.
function renderAssess(pending) {
  el.retestCard.hidden = !pending;
  el.retestStart.hidden = !pending;
  el.freshCard.hidden = !!pending;
  el.newCheck.hidden = !!pending;
  el.assessCard.setAttribute('aria-labelledby', pending ? 'retestTitle' : 'assessTitle');
  retestNote(pending);
}

// The retest card's words, dated by the check that suggested the change, and a warning when the
// setup chosen is not how the bike was held for that check: then the next check cannot check it.
// The same warning shows on the Setup screen, under the question.
function retestNote(pending = fit.pendingChange(loadHistory())) {
  const differs = !!(pending && setup && !fit.sameSetup(setup, pending.setup) && fit.setupOf(pending.setup).bike);
  el.setupNote.hidden = !differs;
  el.setupNote.textContent = differs ? `Your last change was checked with the bike ${fit.setupOf(pending.setup).bike}. Choose that again.` : '';
  if (!pending) { el.retestTitle.textContent = ''; el.retestText.textContent = ''; return; }
  const text = fit.retestPrompt(pending.made, dayLabel(pending.at), pending.setup);
  const cut = text.indexOf('. ');
  el.retestTitle.textContent = cut > 0 ? text.slice(0, cut + 1) : text;
  el.retestText.textContent = (cut > 0 ? text.slice(cut + 2) : '')
    + (differs ? ` Your next check is set to "${fit.setupOf(setup).name}", so it would not show it.` : '');
}

// The Check tab: the Add to Home Screen card on a first visit in Safari; then one summary sentence,
// the assessment card, and the latest check's two areas on their range bars.
let inSafari = false;
function renderCheckTab(h) {
  el.today.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  el.a2hs.hidden = !(inSafari && !h.length);
  // One primary button on the tab: Start a Check (the Home Screen card's Show Me How is a quiet one),
  // or, opened inside another app's browser, Copy the Link, with Start a Check stepping back.
  el.newCheck.className = el.inApp.hidden ? 'primary' : 'tinted';
  const latest = fit.lastChecked(h);
  // With the history, so a change put back since the latest check is said (ui.undoneSince), and the
  // bike fitter answer as it is now, which Learn can change after the check (ui.fitterChanged).
  const answer = fitterAnswer();
  const summary = ui.homeSummary(latest, h, answer);
  el.homeSummary.hidden = !summary;
  el.homeSummary.textContent = summary;
  el.latestHead.hidden = !latest;
  el.latestSub.textContent = latest ? [dayLabel(latest.at), fit.setupOf(latest.setup).name].filter(Boolean).join(' · ') : '';
  el.latestCards.replaceChildren(...ui.latestCards(latest, h, answer).map(latestCard));
}
// A card under Latest Check. It opens that area on Progress.
function latestCard(c) {
  const b = make('button', c.collapsed ? 'card oneline' : 'card area');
  b.type = 'button';
  b.setAttribute('aria-label', c.label);
  b.addEventListener('click', () => { progArea = c.key; selectTab('progress'); renderProgress(); });
  if (c.collapsed) {
    const line = make('span', 'stack');
    line.append(make('b', c.key, c.title), make('span', 'sec', c.line));
    b.append(line, chevron());
    return b;
  }
  const top = make('div', 'top');
  top.append(catLine(c.key), chevron());
  b.append(top);
  if (c.key === 'saddle') {
    b.append(readingBlock('Saddle height', c.value, c.metric, [c.lo, c.hi], c.status, { pill: pillFor(c.grade, c.status) }));
  } else {
    b.append(pillFor(c.grade, c.status));
    for (const r of c.rows) b.append(readingBlock(r.name, r.value, r.name, [r.lo, r.hi], '', { big: false }));
  }
  if (c.step) b.append(make('p', 'step', c.step));
  return b;
}

// ── Progress ─────────────────────────────────────────────────────────────────────────────────
// Saddle Height: the pedalling knee over the last checks filmed the same way, on its target band,
// with a marker for each change made. Reach and Bars: the back, elbow and shoulder the same way.
// Under each, how the newest compares with the first one shown (fit.compareLast), and which way the
// bike was held for the checks shown: checks are only compared with checks filmed the same way. The
// camera's limits are in Learn, How Exact It Is. Then the changes he made, and every check.
let progArea = 'saddle';
function renderProgress(h = loadHistory()) {
  el.segSaddle.setAttribute('aria-checked', String(progArea === 'saddle'));
  el.segReach.setAttribute('aria-checked', String(progArea === 'reach'));
  const pending = fit.pendingChange(h);
  const c = el.progCard;
  c.className = 'card prog ' + progArea;
  const keys = progArea === 'saddle' ? ['kneePedal'] : ['torso', 'elbow']; // the shoulder has no target to chart against
  const parts = [];
  let shownSetup = null;
  for (const key of keys) {
    const t = ui.trend(h, key);
    if (!t.points.length) continue;
    shownSetup = t.setup;
    const pts = t.points, last = pts[pts.length - 1], first = pts[0];
    const [lo, hi] = fit.TARGETS[ui.METRIC[key].target];
    const sub = make('div', 'sub');
    if (!parts.length) sub.append(make('span', 'eyebrow', 'Latest'));
    const head = make('div', 'latest');
    head.append(make('span', 'big', `${Math.round(last.value)}°`), make('span', 'small', `${ui.METRIC[key].short.toLowerCase()} · ${dayLabel(last.at)}`));
    sub.append(head);
    const grade = last.areas?.[progArea];
    if (!parts.length && grade) sub.append(pillFor(grade, fit.STATUS[grade] || fit.STATUS.na));
    const chart = make('div');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', ui.trendLabel(ui.METRIC[key].short, pts, [lo, hi], dayLabel));
    chart.innerHTML = ui.trendChart(pts, [lo, hi], dayLabel, { pending: !!pending && pending.at === last.at });
    sub.append(chart);
    let note = pts.length > 1 ? fit.compareLast(last.value, first.value, dayLabel(first.at), [lo, hi]) : 'One check so far. The next one shows here beside it.';
    if (pts.length > 1 && /^About the same as last time/.test(note)) note = note.replace('last time', `on ${dayLabel(first.at)}`);
    sub.append(make('p', null, /\.$/.test(note) ? note : `${note}.`));
    parts.push(sub);
  }
  if (!parts.length) {
    c.replaceChildren(make('p', null, progArea === 'saddle' ? 'No knee reading yet. Your checks show here.'
      : 'No back or elbow reading yet. Your checks show here.'));
    const go = make('button', 'primary', 'Start a Check');
    go.type = 'button';
    go.addEventListener('click', beginCheck);
    c.append(go);
  } else {
    if (pending && progArea === 'saddle' && pending.made?.kind === 'saddle') parts.push(make('p', null, `Not checked yet: ${ui.madeWords(pending.made).toLowerCase()}.`));
    const bike = fit.setupOf(shownSetup).bike;
    if (bike) parts.push(make('p', 'small', `Checks with the bike ${bike}.`));
    c.replaceChildren(...parts);
  }
  const changes = ui.changesList(h);
  el.changesH.hidden = el.changes.hidden = !changes.length;
  el.changes.replaceChildren(...changes.map(x => {
    const li = make('li');
    const words = make('span');
    words.append(make('b', null, x.title), make('br'), make('span', 'small', [dayLabel(x.at), x.then, x.felt].filter(Boolean).join(' · ')));
    li.append(words);
    if (x.pending) {
      const b = make('button', 'soft', 'Check It Now');
      b.type = 'button';
      b.addEventListener('click', beginCheck);
      li.append(b);
    }
    return li;
  }));
}
for (const b of [el.segSaddle, el.segReach]) b.addEventListener('click', () => { progArea = b === el.segReach ? 'reach' : 'saddle'; renderProgress(); });

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

// The status line sits above Start on Getting Ready; an error is also shown on the Check tab, where
// Stop leaves him.
function setStatus(msg, err = false) {
  el.status.textContent = msg;
  el.status.classList.toggle('err', err);
  // The permission screen already says nothing leaves the phone: there, only loading and errors.
  el.allowStatus.textContent = err || !/^(Ready|Simulation)/.test(msg) ? msg : '';
  el.allowStatus.classList.toggle('err', err);
  el.homeStatus.hidden = !err;
  el.homeStatus.textContent = err ? msg : '';
  if (!el.flow.hidden) roomForBar(); // a longer line makes the bottom bar taller
}

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

// ── the way in ───────────────────────────────────────────────────────────────────────────────
// A check starts from the Check tab (Start a Check, Check It Now, the Home Screen card's Try It in
// Safari First) or from Progress: first the question about an unanswered change, then the Setup
// screen, then Getting Ready, whose Start starts the camera. From the results, Check It Now and
// Check Again start straight away: the phone is already in place.
function beginCheck() { if (!askFirst('home')) newCheck(); }
// The Setup screen for a new check: the pain question is asked afresh each time, nothing pressed, and
// so are the fitter and feel questions when they are due.
function newCheck() {
  clearPain();
  fitterPick = null; fitterShown = false; renderFitter();
  feelPick = null; feelAsked = false; renderFeel();
  kitChoice = null;
  showFlow('setup');
}
for (const b of [el.newCheck, el.retestStart, el.hMadeStart]) b.addEventListener('click', beginCheck);
el.flowNext.addEventListener('click', () => { if (!askSetup()) showFlow('screen'); });
el.screenNext.addEventListener('click', afterScreen);
el.screenBack.addEventListener('click', () => showFlow('setup'));
// The pain question's Next waits for No or Yes: a rider with pain that keeps coming back must not
// skip it unseen (the advice to see a doctor or physio, and the line to stop pedalling if the knee
// hurts, come only with Yes).
el.painNext.addEventListener('click', () => {
  if (!painSet) {
    el.painCard.classList.add('needs');
    el.painErr.hidden = false;
    el.painQ.focus?.({ preventScroll: true });
    unlockSound();
    Voice.say(PAIN_ASK);
    return;
  }
  afterPain();
});
el.painBack.addEventListener('click', () => showFlow(fitterShown ? 'fitter' : 'screen'));
for (const b of [el.flowClose, el.screenClose, el.painClose, el.fitterClose, el.feelClose, el.revertClose]) b.addEventListener('click', () => show('home'));
el.readyClose.addEventListener('click', () => show('home'));
el.readyBack.addEventListener('click', () => showFlow('pain'));
// Getting Ready's button: before the first check in a page view it is Next, to the screen that says
// why the iPhone asks for the camera and motion (the customer research, item 4); after that, Start.
// On a retest, Different Shoes or Shorts under it does the same, and that film is not compared.
function readyStart() {
  if (el.start.disabled) return;
  if (askSetup()) return;
  if (allowDue()) { showFlow('allow'); return; }
  // After a check in this page view, the phone may still be where it was levelled.
  checkNow('ready');
}
el.start.addEventListener('click', readyStart);
el.kitDiff.addEventListener('click', () => { kitChoice = 'diff'; readyStart(); });
el.allowStart.addEventListener('click', () => { if (askSetup()) return; allowSeen = true; start(); });
el.allowBack.addEventListener('click', () => showFlow('ready'));
el.allowClose.addEventListener('click', () => show('home'));
// "Is the phone where it was?": Yes starts at getting on, No sets the phone up again. The close
// button goes back to where it was asked from.
el.whereYes.addEventListener('click', () => start({ quick: true, answered: true }));
el.whereNo.addEventListener('click', () => start());
el.whereClose.addEventListener('click', () => { Voice.stop(); if (whereFrom === 'ready') showFlow('ready'); else show('results'); });
el.again.addEventListener('click', () => { if (!askFirst('results')) checkNow(); });
el.stop.addEventListener('click', stop);
el.done.addEventListener('click', () => {
  quietResults();
  dropWake();
  // The picture is only for the results; it is not kept once they close.
  el.rShot.removeAttribute('src');
  if (session) session.stillShot = null;
  selectTab('check');
  show('home');
  setStatus(landmarker || SIM ? 'Ready.' : '');
});
el.showAll.addEventListener('click', () => selectTab('progress'));
el.showShare.addEventListener('click', () => { el.shareHint.hidden = false; el.shareHintClose.focus?.(); });
el.shareHintClose.addEventListener('click', () => { el.shareHint.hidden = true; el.showShare.focus?.(); });

// Getting Ready's clip: the How to Set Up guide, a narrated drawn guide of this check's own steps,
// played in place. The Play tap is a tap, so it plays with its narration (Heart's voice), as the live
// hotfix did; the captions are drawn into it too, for anyone who cannot listen.
function pauseHowTo() {
  if (!el.howVideo || el.howVideo.hidden) return;
  try { el.howVideo.pause(); } catch { /* not playing */ }
  playLabel(false);
}
function playLabel(playing) {
  el.howPlayText.textContent = playing ? 'Pause' : 'Play';
  el.howPlay.setAttribute('aria-label', playing ? 'Pause the setup guide' : 'Play the setup guide');
  el.howPlayPath.setAttribute('d', playing ? 'M4 2h3.5v14H4zM10.5 2H14v14h-3.5z' : 'M4 2.5v13l11-6.5z');
}
el.howPlay.addEventListener('click', () => {
  const v = el.howVideo;
  if (!v.hidden && !v.paused) { pauseHowTo(); return; }
  v.hidden = false;
  el.howPoster.hidden = true;
  Voice.stop(); // the warm-up line, if it is still being said, gives way to the guide's own narration
  unlockSound(false);
  v.muted = false;
  playLabel(true);
  const p = v.play?.();
  // Offline the clip is not there (the service worker leaves video to the network): the picture
  // comes back and the pill says so.
  p?.catch?.(() => { v.hidden = true; el.howPoster.hidden = false; playLabel(false); el.howPlayText.textContent = 'Needs a Connection'; });
});
el.howVideo.addEventListener('ended', () => playLabel(false));

// "Say It Again": the longer version, with the reason and the other angles.
el.speak.addEventListener('click', () => { unlockSound(); if (lastResult) Voice.say(fit.spokenSummary(lastResult, { pain, long: true }), { interrupt: true }); });
for (const p of ['r', 'h']) {
  const c = card(p);
  $(p + 'MadeLess').addEventListener('click', () => stepMm(p, -1));
  $(p + 'MadeMore').addEventListener('click', () => stepMm(p, 1));
  c.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') (p === 'r' ? madeHere(c.input.value) : madeHome(c.input.value)); });
  if (p === 'r') c.input.addEventListener('input', () => { renderNowLabel(); nudgeCheckNow(); });
}

// ── has a bike fitter set this bike up? ─────────────────────────────────────────────────────────
// SPEC 4.4 item 8 and 5.0: asked once on this phone, on its own question screen after the screen
// question, and remembered ('yes' or 'no'). Yes: the app reports and gives no millimetres, unless he
// says yes to the pain question; then at most 5 mm, and "tell your bike fitter" (fit.withFeel).
// Moving a fitter's setup on an unvalidated reading is what would make a fitter score the app low.
const FITTER_KEY = 'bfc.fitter', FITTER_AT_KEY = 'bfc.fitterAt';
let fitter = null, fitterAt = null;
try { const v = localStorage.getItem(FITTER_KEY); if (v === 'yes' || v === 'no') fitter = v; } catch { /* asked */ }
// fitterAt: when the answer was last changed in Learn, so the Check tab can tell a check from before it
// (ui.fitterChanged).
try { fitterAt = localStorage.getItem(FITTER_AT_KEY) || null; } catch { /* this visit only */ }
const fitterAnswer = () => ({ fitter, fitterAt });
// fitterPick: the answer tapped on the screen, saved by Next; fitterShown: asked in this check, so
// Back from the pain question goes back to it.
let fitterPick = null, fitterShown = false;
function renderFitter() {
  el.fitterYes.setAttribute('aria-checked', String(fitterPick === 'yes'));
  el.fitterNo.setAttribute('aria-checked', String(fitterPick === 'no'));
  el.fitterNext.setAttribute('aria-disabled', String(!fitterPick));
  if (fitterPick) { el.fitterCard.classList.remove('needs'); el.fitterErr.hidden = true; }
}
el.fitterYes.addEventListener('click', () => { fitterPick = 'yes'; renderFitter(); });
el.fitterNo.addEventListener('click', () => { fitterPick = 'no'; renderFitter(); });
// After the screen question: the fitter question the first time (said too: the tap lets the page
// speak), else the pain question.
function afterScreen() {
  if (fitter != null) { showFlow('pain'); return; }
  fitterShown = true;
  showFlow('fitter');
  unlockSound();
  Voice.say(FITTER_LINE);
}
// Next waits for an answer, as on the pain question.
el.fitterNext.addEventListener('click', () => {
  if (!fitterPick) {
    el.fitterCard.classList.add('needs');
    el.fitterErr.hidden = false;
    el.fitterQ.focus?.({ preventScroll: true });
    unlockSound();
    Voice.say(PAIN_ASK);
    return;
  }
  fitter = fitterPick;
  try { localStorage.setItem(FITTER_KEY, fitter); } catch { /* asked again next time */ }
  renderFitterRow();
  showFlow('pain');
});
el.fitterBack.addEventListener('click', () => showFlow('screen'));
// The one place to change the answer (round 5, the UX review's item 10: a wrong tap made the app
// report-only for good): a row in Learn, shown once it is answered. A tap changes it, and the next
// check goes by it.
function renderFitterRow() {
  el.fitterSet.hidden = fitter == null;
  el.fitterSetSub.textContent = fitter === 'yes' ? 'Yes: I only report what I see.' : 'No: I suggest one change at a time.';
  el.fitterChange.setAttribute('aria-label', `Set up by a bike fitter: ${fitter === 'yes' ? 'Yes' : 'No'}. Change`);
}
// The Check tab is drawn again with the new answer (the round 5 fixer, QA1 blocking 1: it still said
// "A fitter set up your bike" after a change to No).
el.fitterChange.addEventListener('click', () => {
  fitter = fitter === 'yes' ? 'no' : 'yes';
  fitterAt = new Date().toISOString();
  try { localStorage.setItem(FITTER_KEY, fitter); localStorage.setItem(FITTER_AT_KEY, fitterAt); } catch { /* this visit only */ }
  renderFitterRow();
  renderHistory();
});
renderFitterRow();

// ── better, the same, or worse? ─────────────────────────────────────────────────────────────────
// SPEC 4.4 item 3: after a change he has ridden (fit.feelDue: the newest change, not settled, saved at
// least fit.RIDE_AFTER ago), asked after the pain question, before Getting Ready, and said. Next waits
// for an answer, stored with the change (fit.recordFeel). The next step comes only after better or the
// same (fit.withFeel holds it otherwise). The second "worse" on the same change: put it back (the
// revert screen), recorded as undone; with pain, see a bike fitter. Not Ridden Yet goes on without an
// answer, and then no next step is given. Asked at most once a check.
let feelPick = null, feelAsked = false, feelEntry = null;
const FEEL_BUTTONS = [['feelBetter', 'better'], ['feelSame', 'same'], ['feelWorse', 'worse']].map(([id, v]) => [$(id), v]);
function renderFeel() {
  for (const [b, v] of FEEL_BUTTONS) b.setAttribute('aria-checked', String(v === feelPick));
  el.feelNext.setAttribute('aria-disabled', String(!feelPick));
  if (feelPick) { el.feelCard.classList.remove('needs'); el.feelErr.hidden = true; }
}
for (const [b, v] of FEEL_BUTTONS) b.addEventListener('click', () => { feelPick = v; renderFeel(); });
// The change it is about, in one short line: "Since you raised the saddle 5 mm."
const feelSince = (m) => (m?.kind === 'saddle' ? `Since you ${m.dir > 0 ? 'raised' : 'lowered'} the saddle ${m.mm} mm.` : 'Since you raised the handlebars.');
function afterPain() {
  const e = feelAsked ? null : fit.feelDue(loadHistory());
  if (!e) { toReady(); return; }
  feelEntry = e;
  el.feelSub.textContent = feelSince(e.made);
  renderFeel();
  showFlow('feel');
  unlockSound();
  Voice.say(FEEL_LINE);
}
el.feelNext.addEventListener('click', () => {
  if (!feelPick) {
    el.feelCard.classList.add('needs');
    el.feelErr.hidden = false;
    el.feelQ.focus?.({ preventScroll: true });
    unlockSound();
    Voice.say(FEEL_ASK);
    return;
  }
  feelAsked = true;
  const rec = fit.recordFeel(loadHistory(), feelEntry?.at, feelPick);
  if (rec) { storeHistory(rec.history); renderHistory(); }
  if (rec?.revert) { showRevert(rec.entry.made); return; }
  toReady();
});
el.feelLater.addEventListener('click', () => { feelAsked = true; toReady(); });
el.feelBack.addEventListener('click', () => showFlow('pain'));
// "Put the saddle back": one title, one line, the next step as three short rows, and I Put It Back.
// It ends the check (round 5, the UX review's item 5): the Check tab opens, its line says the same
// next step (ui.homeSummary), and no film starts, since the saddle is back where it was. With pain,
// the last row says to see a bike fitter. The arrow points the way the saddle goes back: up after
// lowering it, down after raising it (and down for the handlebars, back down after raising them).
const REVERT_ARROW = { down: 'M244 84v34M232 106l12 13 12-13', up: 'M244 118V84M232 96l12-13 12 13' };
function showRevert(m) {
  const bars = m?.kind === 'bars';
  $('revertArrow').setAttribute('d', REVERT_ARROW[!bars && m?.dir < 0 ? 'up' : 'down']);
  el.revertH.textContent = bars ? 'Put the Handlebars Back' : 'Put the Saddle Back';
  el.revertSub.textContent = 'It felt worse twice.';
  $('revertBack').textContent = bars ? 'Handlebars back as they were' : 'Saddle back to your tape mark';
  $('revertRide').textContent = 'Then ride as before';
  $('revertFitter').textContent = pain ? 'With pain, see a doctor or physio, and a bike fitter' : 'A bike fitter can look at why';
  showFlow('revert');
  unlockSound();
  Voice.say(REVERT_LINE[bars ? 'bars' : 'saddle']);
  Voice.say(REVERT_RIDE);
  Voice.say(pain ? REVERT_PAIN : REVERT_FITTER);
}
el.revertNext.addEventListener('click', () => show('home'));

// ── Getting Ready: the warm-up and the kit ──────────────────────────────────────────────────────
// SPEC 5.0, folded into Getting Ready rather than a screen of their own: a row and a spoken line for
// the warm-up (five easy minutes on a trainer; a ten-minute ride first, if he can, against a wall or
// with a friend), and the kit row: cycling shoes and padded shorts, said too on the first check. On
// a retest (a change waits to be checked) the row and the voice ask "Same shoes and shorts as last
// time?": Start is yes; Different Shoes or Shorts is no, and that film is kept but not compared
// (kitChoice, stored as kit: 'diff'; fit.judgeChange, fit.pendingChange).
let readyKit = null, kitChoice = null;
function renderReady() {
  const h = loadHistory();
  readyKit = !h.length ? 'first' : fit.pendingChange(h) ? 'retest' : null;
  el.warmRow.textContent = setup === 'trainer' ? 'Ride easily for 5 minutes first' : 'A 10-minute ride first, if you can';
  el.kitRow.textContent = readyKit === 'retest' ? 'Same shoes and shorts as last time' : 'Your road bike, cycling shoes and padded shorts';
  el.kitDiff.hidden = readyKit !== 'retest';
  if (!el.flow.hidden && flowStep === 'ready') roomForBar();
}
// Forward to Getting Ready, from the last question: the warm-up said before filming, then the kit.
function toReady() {
  renderReady();
  showFlow('ready');
  unlockSound();
  if (WARM_LINE[setup]) Voice.say(WARM_LINE[setup]);
  if (readyKit === 'first') Voice.say(KIT_LINE);
  else if (readyKit === 'retest') Voice.say(RETEST_KIT_LINE);
}

// ── the permission screen and the sound check ───────────────────────────────────────────────────
// Shown once a page view, before the first Start: an iPhone asks for the camera and for motion, and
// may name the site. allowSeen: it has been shown and its Start tapped.
let allowSeen = false, starting = false, startText = 'Loading…', startReady = false;
const allowDue = () => !allowSeen;
function setStart(text, ready) { startText = text; startReady = ready; renderStart(); }
function renderStart() {
  const due = allowDue();
  el.start.textContent = due ? 'Next' : startText;
  el.start.disabled = starting || (!due && !startReady);
  el.allowStart.textContent = startText;
  el.allowStart.disabled = starting || !startReady;
}
// "Tap to Hear Me": the coach's own recorded line, played like every other line through the one
// shared <audio id="voice"> element, so what is heard here is what the check will sound like (and a
// media element is likely heard on silent, not yet confirmed on a phone). Inside the tap, sound is
// unlocked first, in the live app's order (unlockSound). The clip is fetched when the page loads
// (boot), so it starts inside the tap.
el.hearMe.addEventListener('click', () => {
  // What to do when nothing was heard: only the volume and silent mode, the two settings the app may
  // mention (DECISIONS.md, 2026-10-10).
  el.hearHint.hidden = false;
  el.hearHint.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  unlockSound();
  Voice.say(HEAR_LINE, { interrupt: true });
});

// ── opened inside another app ───────────────────────────────────────────────────────────────────
// A link opened from Instagram, Facebook, LinkedIn and the like opens in that app's own browser,
// which may not keep the results or allow the camera (the customer research, first run, step 1). The
// card there says to open it in Safari, with the link to copy. Found by the app names those browsers
// put in their user agent; &inapp in the simulation.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Twitter|Snapchat|GSA\//;
const inAppBrowser = () => IN_APP.test(navigator.userAgent || '') || (SIM && params.has('inapp'));
el.copyLink.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(appUrl()); el.copyDone.hidden = false; } catch { prompt?.('Copy this link, then open it in Safari:', appUrl()); }
});
// The value for a saddle change, or null for the handlebars (no number).
const mmFor = (change, p) => (change?.kind === 'saddle' ? card(p).input.value : null);
// The results' primary button saves exactly the change it names, never a number it did not show: a
// label that has fallen behind the stepper is redrawn, and nothing is saved by that tap.
el.rMadeNow.addEventListener('click', () => {
  if (el.rMadeNow.textContent !== ui.checkNowLabel(lastResult?.change, card('r').input.value).text) { renderNowLabel(); return; }
  madeHere(mmFor(lastResult?.change, 'r'), true);
});
el.rMadeYes.addEventListener('click', () => madeHere(mmFor(lastResult?.change, 'r')));
el.rMadeNo.addEventListener('click', () => {
  if (rMadeMode === 'before') { declined.add(lastId); renderHistory(); checkNow(); return; }
  // Not made yet: when will it be (the customer research, item 9), once; then the card as before.
  if (rMadeMode === 'ask') { renderMade(lastResult?.change, 'when'); unlockSound(); Voice.say(WHEN_LINE, { interrupt: true }); $('when-t').focus?.({ preventScroll: true }); return; }
  renderMade(lastResult?.change, 'later');
});
$('hMadeYes').addEventListener('click', () => { const e = unanswered(); madeHome(mmFor(e?.suggested, 'h')); });
$('hMadeNo').addEventListener('click', () => {
  const e = unanswered();
  if (!e) return;
  if (hMadeMode === 'before') { declined.add(e.at); renderHistory(); newCheck(); return; }
  hMadeMode = 'later';
  renderHomeMade();
});
for (const b of el.rHow.querySelectorAll('[data-refile]')) b.addEventListener('click', () => refile(b.dataset.refile));
function setPain(v) {
  pain = v;
  painSet = true;
  renderPain();
}
function clearPain() {
  pain = false;
  painSet = false;
  renderPain();
}
function renderPain() {
  el.painYes.setAttribute('aria-checked', String(painSet && pain));
  el.painNo.setAttribute('aria-checked', String(painSet && !pain));
  el.painNext.setAttribute('aria-disabled', String(!painSet));
  if (painSet) { el.painCard.classList.remove('needs'); el.painErr.hidden = true; }
}
el.painYes.addEventListener('click', () => setPain(true));
el.painNo.addEventListener('click', () => setPain(false));
el.saveVideo.addEventListener('click', saveVideo);
el.copy.addEventListener('click', async () => {
  const text = resultText(lastResult);
  try { await navigator.clipboard.writeText(text); el.copy.textContent = 'Copied'; } catch { prompt?.('Copy your results:', text); }
  setTimeout(() => { el.copy.textContent = 'Copy Results'; }, 2000);
});
el.skip.addEventListener('click', () => {
  const t = now();
  if (phase === 'phone') {
    // Back here after a correction, the phone has been moved, so that correction has been carried
    // out: the walk back to the bike shows GET ON, as when it is levelled (the phone step), not the
    // old MOVE sign, which would have him move the phone a second time (QA round 3).
    session.fix = null;
    if (ph.noSensor) { levelByEye(t); return; } // the button reads "It Is Level"
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
// The made-up saddle's height in mm from where &low puts it: each saddle change marked in this page
// view moves it by that much (markMade), so Check It Now can show what a change did.
let simSaddle = 0;
// The made-up phone, once moved square to the bike, stays square for the next check in this page view,
// unless &moved (it is picked up after each check).
let simSquare = false;
async function makeSim() {
  const { synthPose, synthHelper, seeded, rolledPhone, rollPicture } = await import('./test/synth.js');
  const low = params.has('low');
  const lowMm = low ? (Number(params.get('low')) || 35) : 0;
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
  // &roll=<degrees>: the phone stands rolled about its lens, the picture rolled with it and the
  // motion sensor reading it (synth.js rolledPhone, built from the device's axes, not from fit.js).
  const rollDeg = Number(params.get('roll')) || 0;
  const phone = rollDeg ? rolledPhone({ camera, side: params.get('land') === 'right' ? 'right' : 'left', roll: rollDeg, convention: params.get('conv') === 'spec' ? 'spec' : 'ios' }) : null;
  const shuffle = seeded(5);
  Tilt.available = true;
  Tilt.landscape = true;
  Tilt.g = phone ? phone.g : null;
  // off: when the last correction of the picture was said; moved: the phone has been moved since;
  // fixed: the picture is right (the camera was at an angle, farGap, until the phone was moved).
  const s = { off: null, moved: false, tilted: false, fixed: simSquare && !params.has('moved'), frozen: null };
  s.frame = (t) => {
    const dt = t - phaseT0;
    if (phase === 'frame' && ph.askedOff != null && ph.askedOff !== s.off) Object.assign(s, { off: ph.askedOff, moved: false, tilted: false });
    // After a correction he gets off 1 s later and moves the phone. Moving it tilts it from 3 s, so
    // the phone step has him level it again. With &slide=<px> it is turned or slid along without
    // tilting it, and at 6 s he is back on the bike, <px> further along in the picture.
    const pending = s.off != null && !s.moved;
    if (pending && slide && t - s.off > 6) { Object.assign(s, { moved: true, fixed: !unfixed }); simSquare = s.fixed; }
    if (pending && !slide && t - s.off > 3) s.tilted = true;
    // The phone is levelled once the placement instructions have been heard, as a rider would.
    Tilt.pitch = phase === 'phone' ? Math.max(0, 7 - 3 * Math.max(0, quiet(t))) : s.tilted ? 6 : 0.4;
    Tilt.roll = phone ? Math.abs(rollDeg) : 0.3;
    if (phase === 'phone' && s.tilted) { Object.assign(s, { moved: true, tilted: false, fixed: !unfixed }); simSquare = s.fixed; }
    const offBike = s.off != null && !s.moved && t - s.off >= 1; // off the bike, at the phone
    // &away=<s>: once a session, 1 s into holding still, he gets off for that long to rest, then gets
    // back on, &awayshift=<px> further along in the picture if set (the bike rolled, or the friend
    // took a new grip). Back from the break he is on the bike, also if the app went back to getting on.
    if (phase === 'still' && away && s.awayAt == null && dt > 1) Object.assign(s, { awayAt: t, awayStill: phaseT0 });
    const resting = s.awayAt != null && t - s.awayAt < away;
    let lm = null;
    // farGap: the camera at an angle until the phone has been moved (farGap in synth.js), in every
    // step he is on the bike, as a real phone at an angle would see him.
    const o = { noise: 1.2, hipShift: [0, simSaddle - lowMm], farGap: s.fixed ? 0 : -80 };
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
    const rider = lm ? poses.indexOf(lm) : -1;
    return { poses: phone ? poses.map(p => rollPicture(p, phone.theta, 1280, 720)) : poses, W: 1280, H: 720, rider };
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

// Escape closes what is on top: the Share hint, the results, the check flow (with a keyboard).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!el.shareHint.hidden) el.shareHint.hidden = true;
  else if (!el.results.hidden) el.done.click();
  else if (!el.flow.hidden) show('home');
});

const VKEY = 'bfc.keepVideo';
try { el.keepVideo.checked = localStorage.getItem(VKEY) === '1'; } catch { /* default stays off */ }
el.keepVideo.addEventListener('change', () => { try { localStorage.setItem(VKEY, el.keepVideo.checked ? '1' : '0'); } catch { /* not remembered */ } });

// ?sim&seed=<name>: a made-up history, kept in memory only (MEMORY above), to see the screens.
//   asked: one check that suggested raising the saddle, not answered yet (the Check tab asks).
//   trend: three checks with the bike leaning on a wall, the saddle raised 5 mm after the first and
//          10 mm after the last, not checked yet (Check Your Change, the Progress chart).
//   good: one check with nothing to change.
//   rode: the saddle raised 5 mm three days ago and filmed straight after (ride it first); not asked
//         how it felt yet, so the next check asks.
//   worse: the same, already "worse" once a day ago, so a second "worse" puts it back.
//   worselow: as worse, for a saddle lowered 5 mm.
//   unsaid: a check three days ago that suggested raising the saddle 5 mm; he made the change after
//           closing the results and has not said so yet (the Check tab asks before the next check).
function seedHistory(name) {
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const entry = (n, knee, sh, more) => ({ at: day(n), v: 2, setup: 'wall', screen: 'away', pedalDir: 'backwards', knee, src: 'pedalling',
    values: { kneePedal: knee, kneeStill: knee - 4, torso: 46, elbow: 22, shoulder: sh, hipBottom: 98 }, warn: [], ...more });
  const raise = (a, b, g) => ({ areas: { saddle: g, reach: 'after' }, change: `Raise the saddle about ${a === b ? a : `${a} to ${b}`} mm`, suggested: { kind: 'saddle', raise: true, mm: [a, b] } });
  const made = (n, mm) => ({ made: { kind: 'saddle', dir: 1, mm, at: day(n) } });
  if (name === 'asked') return [entry(7, 47, 79, raise(15, 15, 'red'))];
  if (name === 'trend') return [entry(7, 44, 79, { ...raise(12, 15, 'amber'), ...made(6, 10) }), entry(14, 47, 78, { ...raise(15, 15, 'red'), ...made(13, 5) }), entry(21, 49, 76, raise(15, 15, 'red'))];
  if (name === 'good') return [entry(7, 36, 86, { areas: { saddle: 'green', reach: 'green' }, change: null, nothing: true })];
  const ride = (n, knee) => entry(n, knee, 80, { areas: { saddle: 'red', reach: 'after' }, change: null, wait: 'ride', would: { kind: 'saddle', raise: true, mm: [5, 5] } });
  const rode = (feel) => entry(3, 49, 79, { ...raise(5, 5, 'red'), made: { kind: 'saddle', dir: 1, mm: 5, at: day(3), ...(feel ? { feel } : {}) } });
  if (name === 'rode') return [ride(2.99, 47), rode()];
  if (name === 'worse') return [ride(1, 47), ride(2.99, 47), rode([{ said: 'worse', at: day(1) }])];
  if (name === 'unsaid') return [entry(3, 49, 79, raise(5, 5, 'red'))];
  // worselow: as worse, but the change was lowering the saddle 5 mm.
  if (name === 'worselow') {
    const lowered = entry(3, 27, 79, { areas: { saddle: 'red', reach: 'after' }, change: 'Lower the saddle about 5 mm', suggested: { kind: 'saddle', raise: false, mm: [5, 5] },
      made: { kind: 'saddle', dir: -1, mm: 5, at: day(3), feel: [{ said: 'worse', at: day(1) }] } });
    return [{ ...ride(1, 29), would: { kind: 'saddle', raise: false, mm: [5, 5] } }, lowered];
  }
  return [];
}

async function boot() {
  Voice.init();
  // The sound check's line, ready before its tap, so it plays inside the tap.
  Clips.loading?.then(() => Clips.prefetch(HEAR_LINE));
  if (MEMORY) MEMORY.h = seedHistory(params.get('seed'));
  // Safari can delete a site's storage after 7 days without a visit; a Home Screen web app keeps
  // its own count (WebKit, "Full Third-Party Cookie Blocking and More", 2020). So a first visit in
  // Safari opens with the Add to Home Screen card. The simulation shows it too, so it can be seen
  // headless; &installed acts as if the app were opened from the Home Screen.
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || params.has('installed');
  const inApp = !standalone && inAppBrowser();
  el.inApp.hidden = !inApp;
  inSafari = !standalone && !inApp && (isIOS || SIM);
  renderStart();
  renderSetup();
  renderScreen();
  renderHistory();
  selectTab(TABS[params.get('tab')] ? params.get('tab') : 'check');
  show('home');
  requestAnimationFrame(loop);
  if (SIM) {
    setStart('Start the Simulation', true);
    setStatus('Simulation: no camera, a made-up rider on a made-up bike.');
    return;
  }
  // The service worker is registered once the model has loaded (or failed to), so when it caches the
  // engine and the model on install, the browser's own cache can answer instead of a second download.
  // Once it runs, it is asked to bring the voice clips up to date (sw.js, 'bfc-voice').
  const registerWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.ready?.then((r) => r.active?.postMessage('bfc-voice')).catch(() => {});
  };
  if (!navigator.mediaDevices?.getUserMedia) {
    registerWorker();
    setStatus('This browser cannot use the camera. Open the page in Safari or Chrome.', true);
    setStart('Camera not available', false);
    return;
  }
  setStatus('Getting the pose model ready. The first time it downloads about 20 MB.');
  try {
    landmarker = await loadPose();
    setStart('Start', true);
    setStatus('Ready. Everything runs on this phone.');
  } catch (e) {
    setStatus('The pose model did not load (' + (e?.message || e) + '). Check the connection and reload the page.', true);
    setStart('Not ready', false);
  }
  registerWorker();
}
boot();
