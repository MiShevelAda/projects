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
// Round 4, builder B: the question screens, for the runner only:
//   flow          the first check starts from the Check tab and goes through the question screens as a
//                 rider would (else it starts at Getting Ready's Start, as before); printed as "flow":
//                 the screens seen, the lines said on them, Getting Ready's kit and warm-up rows;
//   fitter=yes|no answers "Has a bike fitter set this bike up for you?" when it is asked (default No);
//   feel=better|same|worse|later answers "Better, the same, or worse?" when it is asked (default
//                 better; later: Not Ridden Yet);
//   kit=no        on Getting Ready of a retest, taps Different Shoes or Shorts instead of Start.
// then=home walks the same screens; what it saw and heard there is printed as "homeFlow", and the
// next check's lines start at Getting Ready's Start.
// Round 4, builder C: the drawn demos, for the runner only (each check prints "demos": every demo
// shown, its clips, the step and the line it began in, and when, in which step and why it ended):
//   skipdemo      tap the demo of the moves 1 s after it shows (printed as "demoTap", and whether it
//                 still showed after the tap as "demoShownAfterTap");
//   skipplace     tap the placement loop 1 s after it shows (printed as "placeTap");
//   learn=<setup> before the check, tap that setup's row in Learn, then tap the demo it plays 1 s
//                 later (printed as "learnDemo").
// Round 4, builder C: large text, for the runner only (the stand-in page has no layout, so these give
// the places the browser measured at 28 px):
//   bigtext       each question's first answer under its Next button (375 x 667); printed as
//                 "bigtext": per screen, whether the picture shrank and where the page scrolled to;
//   tallbar       the results bar 230 px tall; every check prints "barFlow": whether the bar stopped
//                 sticking, and what it was moved after.
// Round 4, the fixer (QA1's runner-n.mjs), after the first check and any then=, for the runner only:
//   repeat=<n>    tap Check Again n more times (answering "No, film anyway" to the change card and Yes
//                 to "Is the phone where it was?" when they are asked);
//   homes=<n>     then close the results and start n more checks from the Check tab, through the
//                 question screens (walk), minutes later on the virtual clock;
//   made=yes      on the Check tab's "Before you start: did you ...?", tap Save and Start (the stepper's
//                 millimetres) instead of "No, start anyway".
// Each of those checks is printed in "more", with the fields of a check and its walk as "homeFlow".
const query = process.argv[2] || '';
const parts = query.split('&').filter(Boolean);
const arg = (k) => parts.find(x => x.startsWith(`${k}=`))?.slice(k.length + 1) ?? null;
const pain = parts.includes('pain');
const fpsArg = parts.find(x => x.startsWith('fps='));
const then = arg('then'), when = arg('when'), where = arg('where'), mmArg = arg('mm'), nudge = parts.includes('nudge'), painWait = parts.includes('painwait');
const flowFirst = parts.includes('flow'), fitterArg = arg('fitter'), feelArg = arg('feel'), kitArg = arg('kit'), madeArg = arg('made');
const repeatN = Number(arg('repeat')) || 0, homesN = Number(arg('homes')) || 0;
const skipDemo = parts.includes('skipdemo'), skipPlace = parts.includes('skipplace'), learnArg = arg('learn');
const bigText = parts.includes('bigtext'), tallBar = parts.includes('tallbar');
const RUNNER = new Set(['pain', 'nudge', 'painwait', 'skiprelevel', 'skipoff', 'skipframe', 'flow', 'skipdemo', 'skipplace', 'bigtext', 'tallbar']);
const skipWhen = ['skiprelevel', 'skipoff', 'skipframe'].find(x => parts.includes(x)) || null;
let skip = null, skipSeen = null; // the tap, and when the frame step first showed MOVE (skipframe)
const pageQuery = parts.filter(x => !RUNNER.has(x) && !/^(fps|then|when|where|mm|fitter|feel|kit|learn|repeat|homes|made)=/.test(x)).join('&');
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
  // placed: where the app last put this element (the id of the parent it was appended to, or of the
  // element it was put after).
  append(...c) { this.children.push(...c); for (const x of c) if (x) x.placed = this.id; }
  after(...c) { for (const x of c) if (x) x.placed = this.id; }
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
// Every scroll the app asks for, as the y it scrolls to (bigtext, above).
const scrolls = [];
Object.assign(globalThis, { innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, scrollY: 0, matchMedia: () => ({ matches: false }),
  scrollTo: (x, y) => { scrolls.push(typeof x === 'object' ? x?.top ?? 0 : y ?? 0); } });
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', platform: 'Linux', maxTouchPoints: 0, standalone: false }, configurable: true, writable: true });
globalThis.location = { search: `?sim${pageQuery ? '&' + pageQuery : ''}`, pathname: '/', href: 'http://localhost/' };
globalThis.history = { replaceState: noop };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

// ── one session ──────────────────────────────────────────────────────────────────────────────
// What index.html hides until the app shows it, where a check reads it before the app touches it.
for (const id of ['demo', 'placeVideo', 'learnDemo']) document.getElementById(id).hidden = true;
// bigtext: each question's first answer, and its Next button, where the browser put them at 28 px on
// a 375 x 667 screen: the answer's bottom under the button's top.
if (bigText) {
  for (const [a, n] of [['setupTrainer', 'flowNext'], ['screenAway', 'screenNext'], ['fitterNo', 'fitterNext'], ['painNo', 'painNext'], ['feelBetter', 'feelNext']]) {
    document.getElementById(a).getBoundingClientRect = () => ({ top: 643, bottom: 708, height: 65 });
    document.getElementById(n).getBoundingClientRect = () => ({ top: 582, bottom: 634, height: 52 });
  }
}
// tallbar: the results bar as tall as the browser drew it at 28 px (230 px).
if (tallBar) document.getElementById('rBar').getBoundingClientRect = () => ({ top: 160, bottom: 390, height: 230 });
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
// The history as the page keeps it: in memory with &seed (the page's MEMORY), else on this "phone".
const hist = () => (bfc.history ? bfc.history() : JSON.parse(store.get('bfc.history.v1') || '[]'));
// Through the question screens from the Check tab (see flow above), up to Getting Ready, where the
// caller taps Start. painYes: the answer to the pain question. Returns what was seen and said.
const FLOW = { setup: 'flowSetup', screen: 'flowScreen', fitter: 'flowFitter', pain: 'flowPain', feel: 'flowFeel', revert: 'flowRevert', ready: 'flowReady', allow: 'flowAllow', where: 'flowWhere' };
const shown = () => ($('flow').hidden ? null : Object.keys(FLOW).find(k => $(FLOW[k]).hidden === false) || null);
function walk(painYes) {
  const from = bfc.said.length, info = { screens: [], bigtext: {} };
  let sLen = scrolls.length;
  $('newCheck').click();
  // "Before you start: did you ...?" on the Check tab, for a change suggested and not answered.
  if ($('flow').hidden && $('hMade').hidden === false && $('hMadeNo').hidden === false) {
    info.madeAsked = $('hMadeQ').textContent || true;
    $(madeArg === 'yes' ? 'hMadeYes' : 'hMadeNo').click();
  }
  for (let i = 0; i < 12; i++) {
    const step = shown();
    info.screens.push(step);
    // Large text: whether this screen's picture shrank, and where the page scrolled to as it opened.
    if (step) {
      const compact = $(FLOW[step]).classList.contains('compact'), ys = scrolls.slice(sLen).filter(y => y > 0);
      if (compact || ys.length) info.bigtext[step] = { compact, scrolledTo: ys.length ? ys[ys.length - 1] : 0 };
    }
    sLen = scrolls.length;
    if (step === 'setup') $('flowNext').click();
    else if (step === 'screen') $('screenNext').click();
    else if (step === 'fitter') { info.fitterQ = $('fitterQ').textContent; $(fitterArg === 'yes' ? 'fitterYes' : 'fitterNo').click(); $('fitterNext').click(); }
    else if (step === 'pain') {
      if (painWait) { $('painNext').click(); info.painWaited = $('flowPain').hidden === false && $('flow').hidden === false && $('painErr').hidden === false; }
      $(painYes ? 'painYes' : 'painNo').click(); $('painNext').click();
    } else if (step === 'feel') {
      info.feelQ = $('feelQ').textContent; info.feelSub = $('feelSub').textContent;
      if (feelArg === 'later') $('feelLater').click();
      else { $({ better: 'feelBetter', same: 'feelSame', worse: 'feelWorse' }[feelArg || 'better']).click(); $('feelNext').click(); }
    } else if (step === 'revert') { info.revertH = $('revertH').textContent; info.revertSub = $('revertSub').textContent; info.revertArrow = $('revertArrow').getAttribute('d'); $('revertNext').click(); }
    else break;
  }
  Object.assign(info, { said: bfc.said.slice(from), kitRow: $('kitRow').textContent, warmRow: $('warmRow').textContent, kitDiff: $('kitDiff').hidden === false,
    fitterStored: store.get('bfc.fitter') ?? null, history: hist() });
  return info;
}
// Getting Ready's Start, or Different Shoes or Shorts (kit=no) when it shows.
const tapStart = () => (kitArg === 'no' && $('kitDiff').hidden === false ? $('kitDiff') : $('start')).click();
// start() waits for the made-up rider's module to load, on the real event loop.
async function started() { for (let i = 0; i < 500 && !bfc.phase(); i++) await tick(); }
// Runs from a check's start to its results, and 5 s more so the summary is said. from: how many lines
// had been said before this check's Start was tapped.
const mark = () => ({ said: bfc.said.length, started: bfc.started.length, demos: (bfc.demos || []).length });
async function runSession(from) {
  let endAt = null, seeAt = null, seeClicked = false, runField = null, lastView = '';
  let demoAt = null, placeAt = null, demoTap = null, demoShownAfterTap = null, placeTap = null;
  const phases = [], views = [];
  while (clock < maxSecs) {
    await frame();
    const p = bfc.phase();
    if (phases[phases.length - 1]?.phase !== p) phases.push({ t: +clock.toFixed(2), phase: p });
    // The demo taps (skipdemo, skipplace above), 1 s after each first shows.
    if ($('demo').hidden === false) demoAt ??= clock;
    if ($('placeVideo').hidden === false && $('placeView').hidden === false) placeAt ??= clock;
    if (skipDemo && !demoTap && demoAt != null && clock - demoAt > 1 && $('demo').hidden === false) {
      demoTap = { t: +clock.toFixed(2), phase: p };
      $('demo').click();
      demoShownAfterTap = $('demo').hidden === false;
    }
    if (skipPlace && !placeTap && placeAt != null && clock - placeAt > 1 && $('placeVideo').hidden === false) { placeTap = { t: +clock.toFixed(2), phase: p }; $('placeVideo').click(); }
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
  return { ...report(from, { seeClicked, runField, phases, views }), demoTap, demoShownAfterTap, placeTap };
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
  demos: (bfc.demos || []).slice(from.demos ?? 0),
  asks: bfc.asks, identified: bfc.identified, frames: bfc.frames, riders: bfc.riders, wrongPicks: bfc.wrongPicks,
  ambiguous: bfc.ambiguous, ambiguousBy: bfc.ambiguousBy, errors: bfc.errors,
  what: $('rWhat').textContent, warn: $('rWarn').textContent, setupLine: $('rSetup').textContent, compare: $('rCompare').hidden ? null : $('rCompare').textContent,
  // The results sheet (round 3): the status above the headline, How to Do It, I Made This Change and
  // its millimetre stepper; and which way the screen faced, in the session and in its history entry.
  status: $('rStatus').textContent, howTo: $('rHowToSlot').children.length, made: !$('rMade').hidden, mm: $('rMadeMm').value,
  screen: bfc.session?.()?.screen ?? null, savedScreen: hist()[0]?.screen ?? null,
  // Round 3, builder B: the camera filmed with, the result word shown on the camera view before See
  // What to Do (screen towards the rider), the roll taken out of the last frame, and the readings saved.
  camera: bfc.session?.()?.camera ?? null, savedCamera: hist()[0]?.camera ?? null,
  seeWhat: seeClicked, runField, roll: bfc.roll ?? null, cameraInfo: bfc.camera ?? null,
  values: hist()[0]?.values ?? null,
  // Round 3, builder C: the screens on the way in, the results sheet's win and the history entry.
  // The cards under the change card: which is a full card and which one line that opens (details).
  areas: $('rList').children.map(c => ({ tag: c.tagName, cls: [c.className, ...c.classList.s].join(' ').trim(), open: !!c.open })),
  why: $('rWhy').textContent, saved: hist()[0] ?? null, history: hist(),
  // Round 4, builder B: the Check tab's card for a change still waiting to be checked.
  retestCard: $('retestCard').hidden === false,
  // Round 3, builder E: the results' bottom bar, the one primary button: Check It Now while a change
  // waits (with Check Again as a quiet text button), else Check Again.
  bar: { shown: !$('rBar').hidden, now: !$('rMadeNow').hidden, again: $('again').hidden ? null : $('again').className },
  // Round 4, builder C: whether the bar stopped sticking (large text), and where it was moved to.
  barFlow: { flowing: $('rBar').classList.contains('flowing'), after: $('rBar').placed === 'rMade' ? 'rMade' : null },
  };
}

// Learn's row for a setup, tapped before the check (learn=, above), and its demo tapped 1 s later.
let learnDemo = null;
if (learnArg) {
  const row = $(`learn${learnArg[0].toUpperCase()}${learnArg.slice(1)}`);
  row.click();
  const d = (bfc.demos || []).at(-1);
  learnDemo = { files: d?.files ?? null, shown: $('learnDemo').hidden === false, muted: $('learnVideo').muted === true };
  await wait(1);
  $('learnDemo').click();
  Object.assign(learnDemo, { afterTap: $('learnDemo').hidden === false, why: (bfc.demos || []).at(-1)?.end?.why ?? null });
}
const flow = flowFirst ? walk(pain) : null;
if (!flowFirst && pain) $('painYes').click();
const from1 = mark();
tapStart();
// Before the first check in a page view, Getting Ready's button leads to the permission screen.
const allowShown = $('flowAllow').hidden === false;
if (allowShown) $('allowStart').click();
await started();
const first = await runSession(from1);
const out = { ...first, allowShown, flow, learnDemo, bigtext: flow?.bigtext };
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
    out.madeByNow = hist()[0]?.made ?? null;
  }
  if (then === 'again') {
    $('again').click();
    // A change waits, so Check Again asks first whether it was made: "No, film anyway".
    out.beforeAsked = $('made-h').hidden === false;
    if (out.beforeAsked) $('rMadeNo').click();
  }
  // Through the question screens (walk): the bike (remembered), the screen (remembered), the fitter
  // question the first time, the pain question (No), the feel question when it is due, then Getting
  // Ready's Start. painwait: Next on the pain question first, before an answer, to see it wait. The
  // next check's lines start at Start.
  let fromNext = from;
  if (then === 'home') {
    $('done').click();
    out.homeFlow = walk(false);
    out.painWaited = out.homeFlow.painWaited;
    fromNext = mark();
    tapStart();
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
    out.whereSaid = bfc.said.slice(fromNext.said);
    if (out.whereShown && where) $(where === 'yes' ? 'whereYes' : 'whereNo').click();
    out.allowAgain = $('flowAllow').hidden === false && $('flow').hidden === false;
    await started();
    out.next = await runSession(fromNext);
  }
}
// repeat= and homes= (above): more checks after the first one (and its then=), each printed in "more".
out.more = [];
for (let i = 0; i < repeatN + homesN; i++) {
  let from = mark(), hf = null;
  if (i < repeatN) {
    $('again').click();
    if ($('made-h').hidden === false) $('rMadeNo').click();
  } else {
    $('done').click();
    await wait(1);
    hf = walk(false);
    from = mark();
    tapStart();
  }
  await wait(0.5);
  if ($('flowWhere').hidden === false && $('flow').hidden === false) $('whereYes').click();
  await started();
  const r = await runSession(from);
  out.more.push({ ...r, homeFlow: hf });
}
console.log(JSON.stringify(out));
process.exit(0);
