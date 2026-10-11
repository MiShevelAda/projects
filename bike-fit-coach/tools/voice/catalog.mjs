// Every line the app can say, worked out from the code, so each one can be recorded in the coach's
// voice (build-voice.mjs) and test/voice.test.mjs can fail when one has no recording.
//
// Two sources:
// 1. Every Voice.say(...) in app.js, read from the source (jsread.mjs) and worked out to its exact
//    words: string constants, templates, ?:, || and +, the constants and functions they name. The
//    few values that come from elsewhere are listed in RULES below (how the bike stays up, which way
//    to pedal, the picture corrections from fit.js, "about one turn every N seconds"). Each line is
//    recorded whole, so it sounds like one sentence after another, not stitched.
// 2. Lines built from many parts at the end of a check: the spoken result (fit.spokenSummary) and the
//    note when a change is saved (fit.madeNote). These are worked out by running fit.js itself over
//    a grid of readings (summaryLines), and recorded sentence by sentence: every sentence carries at
//    most one number, so each number is one whole sentence of its own (no number stitched into a
//    sentence). The app plays them with ui.voiceParts: a whole-line clip when there is one, else
//    sentence by sentence.
//
// Number ranges are design choices: knee readings 0 to 90 degrees (a knee bent more than 90 degrees
// with the pedal at its lowest point is not a riding position), millimetres 1 to fit.MADE_MAX. A
// reading outside them is said by the phone's own voice; voice.test.mjs lists that.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Program } from './jsread.mjs';
import * as fit from '../../fit.js';
import { sentences, voiceText } from '../../ui.js';

const here = (f) => new URL(`../../${f}`, import.meta.url);
export const KNEE_SPOKEN = [0, 90];
// The voice: Kokoro-82M v1.0 (Apache-2.0), af_heart, American English, normal speed.
export const VOICE = { model: 'kokoro-v1.0', voice: 'af_heart', lang: 'en-us', speed: 1 };
// A clip's file name: a hash of the exact words the voice says (and the voice), so changed words get
// a new file and a phone never plays an old recording from its cache. Other files in the folder (the
// live app's sound check, sound-check.m4a and .mp3) never match this pattern and are left alone.
export const CLIP_NAME = /^[0-9a-f]{16}\.m4a$/;
export const clipFile = (say) => `${createHash('sha256').update(`${VOICE.voice}|${VOICE.lang}|${VOICE.speed}|${say}`).digest('hex').slice(0, 16)}.m4a`;

// ── reading app.js ───────────────────────────────────────────────────────────────────────────
const S = (v) => ({ k: 's', v: String(v) });
const LIMIT = 20000;

// Values the code does not spell out in app.js: what they can be, from fit.js.
function rules() {
  const fitSrc = new Program(readFileSync(here('fit.js'), 'utf8'));
  const appSrc = new Program(readFileSync(here('app.js'), 'utf8'));
  // The picture corrections: every say: in fit.js (checkFraming, checkSideOn) and app.js (darkness).
  const says = () => {
    const out = [];
    for (const [prog, file] of [[fitSrc, 'fit.js'], [appSrc, 'app.js']]) {
      const ev = new Evaluator(prog, file, {});
      for (const p of prog.props('say')) out.push(...ev.values(p.value).filter(v => v.k === 's'));
    }
    return out;
  };
  const setups = Object.values(fit.SETUPS);
  return {
    'S().bike': () => setups.map(s => S(s.bike)),
    'S().dir': () => [...new Set(setups.map(s => s.dir))].map(S),
    'problem.say': says,
    'fit.COME_BACK': () => [S(fit.COME_BACK)],
    'fit.slowerTurn()': () => Array.from({ length: fit.SLOWEST_TURN - 1 }, (_, i) => ({ k: 'n', v: i + 2 })),
    'fit.spokenSummary()': () => [{ k: 'fam', name: 'summary', pre: '', post: '' }],
    'fit.madeNote()': () => [{ k: 'fam', name: 'madeNote', pre: '', post: '' }],
  };
}

class Evaluator {
  constructor(prog, file, rules) { this.p = prog; this.file = file; this.rules = rules; this.busy = new Set(); }
  fail(node, msg) {
    const tok = this.p.toks[node?.at];
    const line = tok ? this.p.src.slice(0, tok.at).split('\n').length : '?';
    throw new Error(`${this.file}:${line}: ${msg}`);
  }
  key(n) {
    if (n.t === 'id') return n.name;
    if (n.t === 'member' && n.prop) { const o = this.key(n.obj); return o && `${o}.${n.prop}`; }
    if (n.t === 'call') { const c = this.key(n.callee); return c && `${c}()`; }
    if (n.t === 'paren') return this.key(n.e);
    return null;
  }
  values(n) {
    const k = this.key(n);
    if (k && this.rules[k]) return this.rules[k]();
    switch (n.t) {
      case 'str': return [S(n.v)];
      case 'num': return [{ k: 'n', v: n.v }];
      case 'nil': return [{ k: 'nil' }];
      case 'paren': return this.values(n.e);
      case 'seq': return this.values(n.list[n.list.length - 1]);
      case 'obj': return [{ k: 'obj', n }];
      case 'arr': return [{ k: 'arr', n }];
      case 'arrow': return [{ k: 'fn', arrow: n }];
      case 'cond': return [...this.values(n.yes), ...this.values(n.no)];
      case 'tpl': {
        let acc = [S(n.quasis[0])];
        n.exprs.forEach((e, i) => { acc = this.join(this.join(acc, this.values(e), e), [S(n.quasis[i + 1])], e); });
        return acc;
      }
      case 'bin':
        if (n.op === '+') return this.join(this.values(n.left), this.values(n.right), n);
        if (n.op === '||') return [...this.values(n.left).filter(v => v.k !== 'nil' && !(v.k === 's' && v.v === '')), ...this.values(n.right)];
        if (n.op === '??') return [...this.values(n.left).filter(v => v.k !== 'nil'), ...this.values(n.right)];
        if (n.op === '&&') return this.values(n.right);
        return [{ k: 'other' }];
      case 'unary': case 'other': case 'assign': case 'tagged': return [{ k: 'other' }];
      case 'id': return this.ident(n);
      case 'member': return this.member(n);
      case 'call': return this.call(n);
      default: return this.fail(n, `cannot read a ${n.t} expression`);
    }
  }
  join(as, bs, n) {
    if (as.length * bs.length > LIMIT) this.fail(n, 'too many combinations');
    const out = [];
    for (const a of as) for (const b of bs) {
      const sa = a.k === 's' || a.k === 'n', sb = b.k === 's' || b.k === 'n';
      if (sa && sb) out.push(S(`${a.v}${b.v}`));
      else if (a.k === 'fam' && sb) out.push({ ...a, post: a.post + b.v });
      else if (sa && b.k === 'fam') out.push({ ...b, pre: a.v + b.pre });
      else this.fail(n, `cannot join ${a.k} and ${b.k}`);
    }
    return out;
  }
  ident(n) {
    const d = this.p.resolve(n.name, n.at);
    if (!d) return this.fail(n, `${n.name} is not declared here`);
    if (d.param) return this.fail(n, `${n.name} is a parameter: add a rule for it in catalog.mjs`);
    if (this.busy.has(d)) return this.fail(n, `${n.name} refers to itself`);
    this.busy.add(d);
    try {
      if (d.init) return this.values(d.init);
      if (d.from) return this.member({ t: 'member', obj: d.from, prop: d.key, at: n.at });
      if (d.fn) return [{ k: 'fn', block: d.fn.block }];
      return this.fail(n, `${n.name} has no value to read`);
    } finally { this.busy.delete(d); }
  }
  member(n) {
    const k = this.key(n);
    if (k && this.rules[k]) return this.rules[k]();
    const out = [];
    for (const o of this.values(n.obj)) {
      if (o.k === 'obj') {
        if (n.prop) {
          const p = o.n.props.find(x => !x.computed && x.key === n.prop);
          out.push(...(p ? this.values(p.value) : [{ k: 'nil' }]));
        } else for (const p of o.n.props) if (p.value) out.push(...this.values(p.value));
      } else if (o.k === 'arr') {
        if (n.prop === 'length') out.push({ k: 'other' });
        else if (n.prop) this.fail(n, `cannot read .${n.prop} of a list`);
        else for (const it of o.n.items) out.push(...(it.t === 'spread' ? [] : this.values(it)));
      } else this.fail(n, `cannot read ${n.prop ? '.' + n.prop : '[...]'} of a ${o.k}`);
    }
    return out;
  }
  call(n) {
    const k = this.key(n);
    if (k && this.rules[k]) return this.rules[k]();
    if (n.callee.t !== 'id') return this.fail(n, `cannot work out a call to ${k || 'this'}: add a rule for it in catalog.mjs`);
    const out = [];
    for (const f of this.values(n.callee)) {
      if (f.k !== 'fn') this.fail(n, `${n.callee.name} is not a function here`);
      if (f.arrow?.body) out.push(...this.values(f.arrow.body));
      else for (const r of this.p.returns(f.block || f.arrow.block)) out.push(...this.values(r));
    }
    return out;
  }
}

// Every line a Voice.say(...) in app.js can say, with where it is said. Lines that are a fit.js part
// (the spoken result, the saved note) come back as families, worked out separately.
export function appLines(src = readFileSync(here('app.js'), 'utf8')) {
  const prog = new Program(src);
  const ev = new Evaluator(prog, 'app.js', rules());
  const lines = new Map(), families = new Map();
  const calls = prog.calls('Voice', 'say');
  for (const c of calls) {
    for (const v of ev.values(c.arg)) {
      if (v.k === 's') { const t = voiceText(v.v); if (t) { if (!lines.has(t)) lines.set(t, []); lines.get(t).push(c.line); } }
      else if (v.k === 'fam') { const key = `${v.name}|${v.post}`; if (!families.has(key)) families.set(key, { ...v, at: [] }); families.get(key).at.push(c.line); }
      else if (v.k !== 'nil') throw new Error(`app.js:${c.line}: Voice.say gets a ${v.k}, not words`);
    }
  }
  return { lines, families: [...families.values()], calls: calls.length };
}

// ── the spoken result, from fit.js itself ─────────────────────────────────────────────────────
const range = (a, b, step = 1) => { const out = []; for (let x = a; x <= b + 1e-9; x += step) out.push(+x.toFixed(4)); return out; };
const SETUP_IDS = [...Object.keys(fit.SETUPS), null];
// Upper-body readings, one for each grade on each side of each target (fit.TARGETS): red low, amber
// low, in range, amber high, red high. Torso 60 also gives "You sit quite upright".
const UPPER = { torso: [30, 36, 45, 54, 60], elbow: [5, 9, 22, 36, 45], shoulder: [65, 74, 88, 102, 110] };
const BASE = { torso: 45, elbow: 22, shoulder: 88 };
const pedal = (knee, up = BASE, extra = {}) => ({ strokes: 12, strokesSeen: 12, kneeFlex: knee, ...up, ...extra });

// Every result the grid makes, as [result, options]. Each sentence family is swept on its own (the
// knee reading, the millimetres, the readings before and now, the upper body) while the rest stays
// put, since no sentence carries two of them.
function* results() {
  const knees = range(KNEE_SPOKEN[0], KNEE_SPOKEN[1], 0.25);
  for (const setup of SETUP_IDS) {
    // The pedalling reading alone, across the range: a change, nothing to do, or the long reasons.
    for (const k of knees) yield fit.advise(null, pedal(k), setup);
    // With a held-still reading that agrees, disagrees, or is out of range on its own.
    for (const s of [15, 30, 45]) for (const k of [20, 35, 50]) yield fit.advise({ kneeFlex: s }, pedal(k), setup);
    // Held still only, or nothing, with the pedalling seen too fast, too short, or not at all.
    for (const s of [null, 20, 30, 45]) {
      const still = s == null ? null : { kneeFlex: s };
      for (const p of [null, { strokes: 0, strokesSeen: 0 }, { strokes: 2, strokesSeen: 8 }, { strokes: 0, strokesSeen: 0, turnsSeen: 8, framesPerTurn: 6 },
        ...[1, 2, 3, 4].map(n => ({ strokes: n, strokesSeen: n }))]) yield fit.advise(still, p, setup);
    }
    // Every upper-body combination with the saddle right: the angle lists, a handlebar change.
    for (const torso of UPPER.torso) for (const elbow of UPPER.elbow) for (const shoulder of UPPER.shoulder) yield fit.advise(null, pedal(35, { torso, elbow, shoulder }), setup);
  }
}

// Retests: a saddle change judged against the reading before it, a handlebar change, a change made
// with the bike held another way.
function* retests() {
  for (const setup of SETUP_IDS) {
    const after = (r, prev, opts) => fit.withRetest(r, fit.judgeChange(prev, { knee: r.knee, src: r.kneeSource, setup, values: { torso: r.torso, shoulder: r.shoulder, elbow: r.elbow } }));
    for (const dir of [1, -1]) {
      // The reading before, across the range, then the reading now, across the range.
      const before = dir > 0 ? 50 : 20;
      for (const x of range(KNEE_SPOKEN[0], KNEE_SPOKEN[1])) yield after(fit.advise(null, pedal(before), setup), { made: { kind: 'saddle', dir, mm: 10 }, knee: x, src: 'pedalling', setup });
      for (const y of range(KNEE_SPOKEN[0], KNEE_SPOKEN[1])) yield after(fit.advise(null, pedal(y), setup), { made: { kind: 'saddle', dir, mm: 10 }, knee: before, src: 'pedalling', setup });
      // Every millimetre, with each verdict: other way, unseen, too little, fits, too much, in range;
      // and the second film after a held-back one (recheck). The middle of the too-little band
      // (fit.SAME_TOL to the expected change less fit.SAME_TOL) is its own value: from 25 mm up,
      // mm / 3.5 lands past it (QA round 3, sweep.mjs).
      for (let mm = 1; mm <= fit.MADE_MAX; mm++) {
        const little = fit.expectedKneeChange(mm)[0] / 2;
        for (const moved of [-6, 0, 1.5, little, mm / 3.5, mm / 3 + 5, mm / 2]) for (const recheck of [false, true]) {
          const now = before - dir * moved;
          yield after(fit.advise(null, pedal(now), setup), { made: { kind: 'saddle', dir, mm }, knee: before, src: 'pedalling', setup, recheck });
        }
      }
      // In range now after a change, with a handlebar change waiting (heldBars).
      for (const moved of [-6, 0, 8]) yield after(fit.advise(null, pedal(36, { torso: 30, elbow: 5, shoulder: 110 }), setup), { made: { kind: 'saddle', dir, mm: 10 }, knee: 36 + dir * moved, src: 'pedalling', setup });
      // With the readings disagreeing.
      yield after(fit.advise({ kneeFlex: 20 }, pedal(46), setup), { made: { kind: 'saddle', dir, mm: 10 }, knee: 41, src: 'pedalling', setup });
    }
    // A handlebar change: each angle up, down or about the same.
    const was = { torso: 34, elbow: 5, shoulder: 100 };
    for (const dt of [-5, 0, 5]) for (const de of [-5, 0, 5]) for (const ds of [-5, 0, 5]) {
      const up = { torso: was.torso + dt, elbow: was.elbow + de, shoulder: was.shoulder + ds };
      yield after(fit.advise(null, pedal(36, up), setup), { made: { kind: 'bars' }, knee: 36, src: 'pedalling', setup, values: { kneePedal: 36, ...was } });
    }
    // Made with the bike held another way.
    for (const other of SETUP_IDS) {
      if (other === setup) continue;
      for (const made of [{ kind: 'bars' }, { kind: 'saddle', dir: 1, mm: 10 }, { kind: 'saddle', dir: -1, mm: 10 }]) {
        yield after(fit.advise(null, pedal(36), setup), { made, knee: 36, src: 'pedalling', setup: other, values: { kneePedal: 36, ...was } });
      }
    }
  }
}

// Every spoken result the grid gives, as the app says it (app.js finish: the come-back line after a
// check with nothing to change; "Say It Again": the long version). Deterministic, in a fixed order.
export function summaryLines() {
  const out = new Set();
  const add = (r) => {
    const win = r.retest ? [false, true] : [false];
    for (const pain of [false, true]) for (const long of [false, true]) for (const w of win) {
      const said = fit.spokenSummary(r, { pain, long, win: w });
      out.add(voiceText(said));
      if (!long) out.add(voiceText(`${said} ${fit.COME_BACK}`));
    }
  };
  for (const r of results()) add(fit.withStillHistory(r, []));
  // The held-still reading out of range twice running ("once more" is not asked again).
  for (const setup of SETUP_IDS) add(fit.withStillHistory(fit.advise({ kneeFlex: 45 }, pedal(35), setup), [{ setup, stillOut: true }]));
  for (const r of retests()) add(r);
  return [...out].filter(Boolean);
}

// "Saved." and "Saved N mm. ..." for every millimetre the change card takes.
export function madeNoteLines() {
  const out = new Set([fit.madeNote(null)]);
  for (let mm = 1; mm <= fit.MADE_MAX; mm++) out.add(fit.madeNote({ kind: 'saddle', dir: 1, mm }));
  return [...out].map(voiceText);
}

// ── the catalog ──────────────────────────────────────────────────────────────────────────────
// lines: every line the app can say, { text, from, whole } (whole: recorded as one clip; otherwise
// sentence by sentence). units: the exact texts to record, each once, most important first: every
// app.js line (the instructions, all heard on a first check), then sentences without a number, then
// the numbered ones nearest the target ranges first. summaryFamilies: the families app.js uses.
export function catalog() {
  const app = appLines();
  const lines = [];
  for (const [text, at] of app.lines) lines.push({ text, from: `app.js:${at.join(',')}`, whole: true });
  const famNames = new Set(app.families.map(f => f.name));
  if (famNames.has('summary')) for (const text of summaryLines()) lines.push({ text, from: 'fit.spokenSummary', whole: false });
  if (famNames.has('madeNote')) for (const text of madeNoteLines()) lines.push({ text, from: 'fit.madeNote', whole: false });
  for (const f of app.families) if (!['summary', 'madeNote'].includes(f.name) || f.pre || (f.post && voiceText(f.post) !== fit.COME_BACK)) {
    throw new Error(`app.js:${f.at.join(',')}: a ${f.name} line with words around it that the catalog does not work out`);
  }
  const units = new Map();
  for (const l of lines) for (const u of l.whole ? [l.text] : sentences(l.text)) if (!units.has(u)) units.set(u, rank(u, l.whole));
  return {
    lines,
    units: [...units.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([text, priority]) => ({ text, priority })),
    families: app.families,
    calls: app.calls,
  };
}

// The numbers in a sentence that vary: the target ranges and fixed limits said in words ("30 to
// 40", "within 2.5 degrees", "15 millimetres is the most", "at least 5") are not counted.
export function variables(text) {
  const rest = text.replace(/\b30 to 40\b/g, '').replace(/\b2\.5 degrees\b/g, '').replace(/\b15 (millimetres|mm)(?= is the most|, the most)/g, '')
    .replace(/more than 15 mm\b/g, '').replace(/at least 5\b/g, '');
  return (rest.match(/\d+(\.\d+)?/g) || []).map(Number);
}
// Lower is recorded first: 0 every app.js line, 1 a sentence with no varying number (these two are
// precached for a first check offline), then the numbered ones, the nearer the knee range (30 to 40)
// and the stepper's 10 millimetres, the sooner. A design choice for when a build is stopped partway.
function rank(text, whole) {
  if (whole) return 0;
  const nums = variables(text);
  if (!nums.length) return 1;
  const d = Math.min(...nums.map(n => (/millimetre|mm\b/.test(text) ? Math.abs(n - 10) : Math.min(Math.abs(n - 30), Math.abs(n - 40)))));
  return 2 + d;
}

// The words given to the voice for a line, where the screen's short form would be read out oddly.
// The caption keeps the line's own words.
export function sayAs(text) {
  return text.replace(/\bmm\b/g, 'millimetres');
}
