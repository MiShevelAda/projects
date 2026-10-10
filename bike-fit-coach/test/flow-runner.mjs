// Runs one whole ?sim session of app.js in Node, with a stand-in for the page and a virtual clock,
// and prints what happened as JSON. It is a separate process (test/flow.test.mjs starts one per
// session) because it replaces the page's globals: the clock, the timers and the frame loop.
//   node test/flow-runner.mjs "setup=friend&slide=70" [max seconds, default 600]
// "pain" in the query is for the runner, not the page: it taps Yes to the pain question before Start
// (the app never takes that answer from the address), e.g. "pain&setup=wall&pedal=stop".
// No speech engine, so the voice goes by its own estimate of the speaking time, as in the headless
// test browser. Everything the page would show is a plain object; only what the checks need is read.

// "fps=<n>" is for the runner too: the made-up camera's frames a second (30 by default).
const query = process.argv[2] || '';
const pain = query.split('&').includes('pain');
const fpsArg = query.split('&').find(x => x.startsWith('fps='));
const pageQuery = query.split('&').filter(x => x && x !== 'pain' && x !== fpsArg).join('&');
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
  createElement: () => new El(),
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
if (pain) $('painYes').click();
$('start').click();
// start() waits for the made-up rider's module to load, on the real event loop.
for (let i = 0; i < 500 && !bfc.phase(); i++) await tick();
let endAt = null;
const phases = [];
const FPS = Number(fpsArg?.slice(4)) || 30; // frames a second of the made-up camera (a design choice for the test)
while (clock < maxSecs) {
  clock += 1 / FPS;
  runTimers();
  const due = frames.splice(0);
  for (const fn of due) fn(clock * 1000);
  await null; // let finish() and other awaits go on
  const p = bfc.phase();
  if (phases[phases.length - 1]?.phase !== p) phases.push({ t: +clock.toFixed(2), phase: p });
  if (!p && !$('results').hidden && endAt == null) endAt = clock + 5; // and let the summary be said
  if (endAt != null && clock >= endAt) break;
}
console.log(JSON.stringify({
  query, results: !$('results').hidden && !bfc.phase(), phase: bfc.phase(), secs: +clock.toFixed(1), phases,
  said: bfc.said, started: bfc.started.map(x => ({ t: +x.t.toFixed(2), text: x.text })), // seconds on the virtual clock
  asks: bfc.asks, identified: bfc.identified, frames: bfc.frames, riders: bfc.riders, wrongPicks: bfc.wrongPicks,
  ambiguous: bfc.ambiguous, ambiguousBy: bfc.ambiguousBy, errors: bfc.errors,
  what: $('rWhat').textContent, warn: $('rWarn').textContent, setupLine: $('rSetup').textContent,
}));
process.exit(0);
