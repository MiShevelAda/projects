// Runs one whole ?sim session of app.js in Node, with a stand-in for the page and a virtual clock,
// and prints what happened as JSON. It is a separate process (test/flow.test.mjs starts one per
// session) because it replaces the page's globals: the clock, the timers and the frame loop.
//   node test/flow-runner.mjs "setup=friend&slide=70" [max seconds, default 600]
// "pain" in the query is for the runner, not the page: it taps Yes to the pain question before Start
// (the app never takes that answer from the address), e.g. "pain&setup=wall&pedal=stop".
// No speech engine, so the voice goes by its own estimate of the speaking time, as in the headless
// test browser. Everything the page would show is a plain object; only what the checks need is read.

// "fps=<n>" is for the runner too: the made-up camera's frames a second (30 by default).
// Round 3, builder C: a second session after the first one's results, also for the runner only:
//   then=now      tap the results' primary button while a change waits, "I Moved It <n> mm, Check
//                 Now" (it saves the millimetres it names: the stepper's, the low end of the
//                 suggestion unless mm= is typed), and run the next check;
//   then=again    tap Check Again (and, when it first asks whether the change was made, "No");
//   then=home     close the results and start a new check from the Check tab, through the three
//                 question screens and Getting Ready, as a rider coming back would (painwait: tap
//                 Next on the pain question before answering it, to see it wait);
//   then=later    tap "Later" on the change card; when=tonight|weekend|pick then answers "When will
//                 you move it?" (no second session);
//   nudge         before then=now, tap plus then minus on the millimetre stepper (the same number)
//                 and wait, so the voice points at Check It Now;
//   where=yes|no  answers "Is the phone where it was?" if it is asked;
//   mm=<n>        types that many millimetres into the change card's stepper first.
// The second session is printed as "next", with the same fields as the first.
// Skip after a correction, once, for the runner only (the QA round 3 repro, qaR/runner.mjs):
//   skiprelevel   tap Skip 2 s into the second phone step, the re-level the correction caused;
//   skipoff       tap Skip 0.5 s into the mount step he is sent back to while off the bike after it;
//   skipframe     tap Skip in the picture check 1 s after its sign first shows MOVE.
// The tap is printed as "skip": the second on the virtual clock and the step it was tapped in.
const query = process.argv[2] || '';
const parts = query.split('&').filter(Boolean);
const arg = (k) => parts.find(x => x.startsWith(`${k}=`))?.slice(k.length + 1) ?? null;
const pain = parts.includes('pain');
const fpsArg = parts.find(x => x.startsWith('fps='));
const then = arg('then'), when = arg('when'), where = arg('where'), mmArg = arg('mm'), nudge = parts.includes('nudge'), painWait = parts.includes('painwait');
const RUNNER = new Set(['pain', 'nudge', 'painwait', 'skiprelevel', 'skipoff', 'skipframe']);
const skipWhen = ['skiprelevel', 'skipoff', 'skipframe'].find(x => parts.includes(x)) || null;
let skip = null, skipSeen = null; // the tap, and when the frame step first showed MOVE (skipframe)
const pageQuery = parts.filter(x => !RUNNER.has(x) && !/^(fps|then|when|where|mm)=/.test(x)).join('&');
const maxSecs = Number(process.argv[3]) || 600;
const realSetTimeout = setTimeout;
const tick = () => new Promise(r => realSetTimeout(r, 0));

// ── a virtual clock, its timers and the frame loop ─────────────────────────────────────────────
let clock = 0; // seconds
let timerId = 0;
const timers = new Map();
const frames = [];
globalThis.setTimeout = (fn, ms = 0) => { timers.set(++timerId, { at: clock + ms / 1000, fn }); return timerId; };
globalThis.clearTimeout = (id) => { timers.delete(id); };
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock * 1000 }, configurable: true, writable: true });
function runTimers() {
  for (;;) {
    let next = null;
    for (const [id, x] of timers) if (x.at <= clock && (!next || x.at < next[1].at)) next = [id, x];
    if (!next) return;
    timers.delete(next[0]);
    next[1].fn();
  }
}

// ── a stand-in for the page ──────────────────────────────────────────────────────────────────
const noop = () => {};
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach(x => this.s.add(x)); }
  remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, on = !this.s.has(c)) { if (on) this.s.add(c); else this.s.delete(c); return on; }
  contains(c) { return this.s.has(c); }
}
class El {
  constructor(id = '') {
    Object.assign(this, { id, hidden: false, textContent: '', children: [], dataset: {}, style: {}, attrs: {}, value: '', disabled: false, checked: false, open: false,
      className: '', clientWidth: 844, clientHeight: 390, width: 0, height: 0, listeners: {}, sel: new Map(), html: '' });
    this.classList = new ClassList();
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.click || []) fn({ type: 'click', target: this }); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  querySelector(s) { if (!this.sel.has(s)) this.sel.set(s, new El()); return this.sel.get(s); }
  querySelectorAll() { return []; }
  replaceChildren(...c) { this.children = c; }
  append(...c) { this.children.push(...c); }
  remove() {}
  focus() {}
  scrollIntoView() {}
  getContext() { return ctx2d; }
  toDataURL() { return 'data:image/jpeg;base64,'; }
  set innerHTML(v) { this.html = v; this.sel = new Map(); }
  get innerHTML() { return this.html; }
}
const byId = new Map();
globalThis.document = {
  getElementById: (id) => { if (!byId.has(id)) byId.set(id, new El(id)); return byId.get(id); },
  querySelectorAll: () => [],
  createElement: (tag) => Object.assign(new El(), { tagName: String(tag).toUpperCase() }),
  addEventListener: noop,
  visibilityState: 'visible',
  body: new El(),
};
globalThis.window = globalThis;
Object.assign(globalThis, { innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, scrollTo: noop, matchMedia: () => ({ matches: false }) });
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', platform: 'Linux', maxTouchPoints: 0, standalone: false }, configurable: true, writable: true });
globalThis.location = { search: `?sim${pageQuery ? '&' + pageQuery : ''}`, pathname: '/', href: 'http://localhost/' };
globalThis.history = { replaceState: noop };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

// ── one session ──────────────────────────────────────────────────────────────────────────────
await import(new URL('../app.js', import.meta.url).href);
const $ = (id) => document.getElementById(id);
const bfc = globalThis.__bfc;
const FPS = Number(fpsArg?.slice(4)) || 30; // frames a second of the made-up camera (a design choice for the test)
// One frame of the virtual clock: the timers, then the frame loop.
async function frame() {
  clock += 1 / FPS;
  runTimers();
  const due = frames.splice(0);
  for (const fn of due) fn(clock * 1000);
  await null; // let finish() and other awaits go on
}
async function wait(secs) { const end = clock + secs; while (clock < end) await frame(); }
// start() waits for the made-up rider's module to load, on the real event loop.
async function started() { for (let i = 0; i < 500 && !bfc.phase(); i++) await tick(); }
// Runs from a check's start to its results, and 5 s more so the summary is said. from: how many lines
// had been said before this check's Start was tapped.
const mark = () => ({ said: bfc.said.length, started: bfc.started.length });
async function runSession(from) {
  let endAt = null, seeAt = null, seeClicked = false, runField = null, lastView = '';
  const phases = [], views = [];
  while (clock < maxSecs) {
    await frame();
    const p = bfc.phase();
    if (phases[phases.length - 1]?.phase !== p) phases.push({ t: +clock.toFixed(2), phase: p });
    if (skipWhen && !skip && $('skip').hidden === false && skipDue(p, phases)) { skip = { t: +clock.toFixed(2), phase: p }; $('skip').click(); }
    // What the camera view shows (ui.liveView), each time it changes: the step, the layer, the word,
    // the line under it, the full-screen field's word and the frosted card's line.
    const v = bfc.view?.();
    const vk = v ? JSON.stringify([p, v.layer, v.word, v.sub, v.field?.word ?? null, v.card?.sub ?? null]) : '';
    if (v && vk !== lastView) { lastView = vk; views.push({ t: +clock.toFixed(2), phase: p, layer: v.layer, word: v.word, sub: v.sub, field: v.field?.word ?? null, card: v.card?.sub ?? null }); }
    // Screen towards the rider (round 3): the result shows on the camera view first, and See What to
    // Do opens the results sheet. The app hides the button at Start, so a shown one is a real one.
    if (!p && $('seeWhat').hidden === false && !$('run').hidden && seeAt == null) seeAt = clock;
    if (seeAt != null && !seeClicked && clock - seeAt > 3) { seeClicked = true; runField = $('fieldWord').textContent; $('seeWhat').click(); }
    if (!p && !$('results').hidden && endAt == null) endAt = clock + 5; // and let the summary be said
    if (endAt != null && clock >= endAt) break;
  }
  return report(from, { seeClicked, runField, phases, views });
}
// Whether the Skip tap the query asks for is due now (see skiprelevel, skipoff, skipframe above).
function skipDue(p, phases) {
  const inFor = clock - phases[phases.length - 1].t;
  if (skipWhen === 'skiprelevel') return p === 'phone' && phases.filter(x => x.phase === 'phone').length >= 2 && inFor > 2;
  if (skipWhen === 'skipoff') return p === 'mount' && phases[phases.length - 2]?.phase === 'frame' && inFor > 0.5;
  if (p !== 'frame' || bfc.view?.()?.word !== 'Move') return false;
  skipSeen ??= clock;
  return clock - skipSeen > 1;
}
function report(from, { seeClicked, runField, phases, views = [] }) {
  return {
  query, results: !$('results').hidden && !bfc.phase(), phase: bfc.phase(), secs: +clock.toFixed(1), phases, views, skip,
  said: bfc.said.slice(from.said), started: bfc.started.slice(from.started).map(x => ({ t: +x.t.toFixed(2), text: x.text })), // seconds on the virtual clock
  asks: bfc.asks, identified: bfc.identified, frames: bfc.frames, riders: bfc.riders, wrongPicks: bfc.wrongPicks,
  ambiguous: bfc.ambiguous, ambiguousBy: bfc.ambiguousBy, errors: bfc.errors,
  what: $('rWhat').textContent, warn: $('rWarn').textContent, setupLine: $('rSetup').textContent,
  // The results sheet (round 3): the status above the headline, How to Do It, I Made This Change and
  // its millimetre stepper; and which way the screen faced, in the session and in its history entry.
  status: $('rStatus').textContent, howTo: $('rHowToSlot').children.length, made: !$('rMade').hidden, mm: $('rMadeMm').value,
  screen: bfc.session?.()?.screen ?? null, savedScreen: JSON.parse(store.get('bfc.history.v1') || '[]')[0]?.screen ?? null,
  // Round 3, builder B: the camera filmed with, the result word shown on the camera view before See
  // What to Do (screen towards the rider), the roll taken out of the last frame, and the readings saved.
  camera: bfc.session?.()?.camera ?? null, savedCamera: JSON.parse(store.get('bfc.history.v1') || '[]')[0]?.camera ?? null,
  seeWhat: seeClicked, runField, roll: bfc.roll ?? null, cameraInfo: bfc.camera ?? null,
  values: JSON.parse(store.get('bfc.history.v1') || '[]')[0]?.values ?? null,
  // Round 3, builder C: the screens on the way in, the results sheet's win and the history entry.
  // The cards under the change card: which is a full card and which one line that opens (details).
  areas: $('rList').children.map(c => ({ tag: c.tagName, cls: [c.className, ...c.classList.s].join(' ').trim(), open: !!c.open })),
  why: $('rWhy').textContent, saved: JSON.parse(store.get('bfc.history.v1') || '[]')[0] ?? null,
  // Round 3, builder E: the results' bottom bar, the one primary button: Check It Now while a change
  // waits (with Check Again as a quiet text button), else Check Again.
  bar: { shown: !$('rBar').hidden, now: !$('rMadeNow').hidden, again: $('again').hidden ? null : $('again').className },
  };
}

if (pain) $('painYes').click();
const from1 = mark();
$('start').click();
// Before the first check in a page view, Getting Ready's button leads to the permission screen.
const allowShown = $('flowAllow').hidden === false;
if (allowShown) $('allowStart').click();
await started();
const first = await runSession(from1);
const out = { ...first, allowShown };
if (then) {
  const from = mark();
  if (nudge) { $('rMadeMore').click(); $('rMadeLess').click(); await wait(3); }
  out.nudged = bfc.said.slice(from.said);
  // Typed, as a browser would: the value, then the field's input event.
  if (mmArg) { $('rMadeMm').value = mmArg; for (const fn of $('rMadeMm').listeners.input || []) fn({ type: 'input', target: $('rMadeMm') }); }
  if (then === 'now') {
    // What the bar's primary button said when it was tapped, and what that tap stored on the first
    // check's history entry (still the newest entry until the next check is saved).
    out.nowLabel = $('rMadeNow').textContent;
    out.nowAria = $('rMadeNow').getAttribute('aria-label');
    $('rMadeNow').click();
    out.madeByNow = JSON.parse(store.get('bfc.history.v1') || '[]')[0]?.made ?? null;
  }
  if (then === 'again') {
    $('again').click();
    // A change waits, so Check Again asks first whether it was made: "No, film anyway".
    out.beforeAsked = $('made-h').hidden === false;
    if (out.beforeAsked) $('rMadeNo').click();
  }
  // Through the three question screens: the bike (remembered), the screen (remembered), the pain
  // question (No), then Getting Ready's Start. painwait: Next on the pain question first, before an
  // answer, to see it wait.
  if (then === 'home') {
    $('done').click(); $('newCheck').click(); $('flowNext').click(); $('screenNext').click();
    if (painWait) { $('painNext').click(); out.painWaited = $('flowPain').hidden === false && $('flow').hidden === false && $('painErr').hidden === false; }
    $('painNo').click(); $('painNext').click(); $('start').click();
  }
  if (then === 'later') {
    $('rMadeNo').click();
    out.whenShown = $('rWhen').hidden === false;
    out.whenSaid = bfc.said.slice(from.said);
    if (when) {
      if (when === 'pick') { $('whenPick').click(); out.pickDefault = $('whenDate').value; }
      $({ tonight: 'whenTonight', weekend: 'whenWeekend', pick: 'whenAdd' }[when]).click();
    }
    out.ics = bfc.ics ?? null;
    out.whenDone = $('rWhenDone').hidden === false ? $('rWhenDone').textContent : null;
    out.madeAskShown = $('rMadeAsk').hidden === false;
  } else {
    await wait(0.5);
    out.whereShown = $('flowWhere').hidden === false && $('flow').hidden === false;
    out.whereSaid = bfc.said.slice(from.said);
    if (out.whereShown && where) $(where === 'yes' ? 'whereYes' : 'whereNo').click();
    out.allowAgain = $('flowAllow').hidden === false && $('flow').hidden === false;
    await started();
    out.next = await runSession(from);
  }
}
console.log(JSON.stringify(out));
process.exit(0);
