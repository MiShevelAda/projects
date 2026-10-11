// Words and shapes for the screens: titles, range bars, the Progress chart, the Check tab's summary
// and the list of changes. Pure functions with no browser code, so they run in Node tests. Nothing
// here measures anything or changes the advice: every number and sentence comes from fit.js or from
// what a session stored in its history entry.

import * as fit from './fit.js';

// ── Title Case ───────────────────────────────────────────────────────────────────────────────
// Titles and buttons in Title Case, as Apple's own flows write them ("Raise the Saddle About 10 mm").
// Short joining words stay lower case unless they come first; anything with a digit, and the units
// after a number, stay exactly as they are.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'via', 'with']);
const UNITS = new Set(['mm', 'cm', 'm', 's', 'kg']);
export function titleCase(text) {
  if (!text) return '';
  const words = String(text).split(' ');
  return words.map((w, i) => {
    if (!w || /\d/.test(w)) return w;
    const bare = w.toLowerCase().replace(/[^a-z]/g, '');
    if (UNITS.has(bare) && i > 0 && /\d/.test(words[i - 1])) return w;
    if (i > 0 && SMALL.has(bare) && !/[:.]$/.test(words[i - 1])) return w.toLowerCase();
    return w.replace(/[A-Za-z]/, (c) => c.toUpperCase());
  }).join(' ');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = (v) => Math.round(v);
const fin = Number.isFinite;

// ── the two areas, as the screens name them ───────────────────────────────────────────────────
export const AREA_TITLE = { saddle: 'Saddle Height', reach: 'Reach and Bars', more: 'More Numbers' };
// Which target each stored value is drawn against, and what the screen calls it.
export const METRIC = {
  kneePedal: { target: 'kneeDynamic', name: 'knee bend, pedal at its lowest', short: 'Knee bend' },
  kneeStill: { target: 'kneeStatic', name: 'knee bend, held still', short: 'Knee bend, held still' },
  torso: { target: 'torso', name: 'back angle', short: 'Back angle' },
  elbow: { target: 'elbow', name: 'elbow bend', short: 'Elbow bend' },
  shoulder: { target: 'shoulder', name: 'shoulder angle', short: 'Shoulder angle' },
};

// ── range bars ───────────────────────────────────────────────────────────────────────────────
// A track, the target shaded on it and a dot at the reading, so the status reads by position and
// not by colour alone (the design review, item 10). The scale is a design choice: half the target's
// width either side of it, widened to take in every reading drawn, then rounded out to 5 degrees.
export function scaleFor([lo, hi], values = []) {
  const span = hi - lo;
  let min = lo - span / 2, max = hi + span / 2;
  for (const v of values) if (fin(v)) { min = Math.min(min, v - span / 4); max = Math.max(max, v + span / 4); }
  return [Math.floor(min / 5) * 5, Math.ceil(max / 5) * 5];
}
// Where v sits on [min, max], as a share of the width from 0 to 1, kept just inside the ends so
// the dot is never cut in half.
export function place(v, [min, max], inset = 0.03) {
  const f = (v - min) / (max - min);
  return Math.max(inset, Math.min(1 - inset, f));
}

// The bar as an SVG string. value: the reading; prev: an earlier reading to draw as a hollow dot
// with an arrow to the new one (the retest win). Drawn with classes, so the colours come from the
// page's light and dark tokens. aria-hidden: the card around it carries the label (rangeLabel).
export function rangeBar({ value, lo, hi, prev = null, nowLabel = null, prevLabel = null }) {
  const W = 320, top = prev != null ? 26 : 0, H = 44 + top;
  const sc = scaleFor([lo, hi], [value, prev]);
  const x = (v) => (place(v, sc) * W).toFixed(1);
  const bx = (place(lo, sc, 0) * W), bw = (place(hi, sc, 0) * W) - bx;
  const out = [`<svg class="rbar" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">`,
    `<rect class="rb-track" x="0" y="${12 + top}" width="${W}" height="8" rx="4"/>`,
    `<rect class="rb-band" x="${bx.toFixed(1)}" y="${8 + top}" width="${bw.toFixed(1)}" height="16" rx="8"/>`];
  if (prev != null && fin(prev) && fin(value)) {
    const a = Number(x(prev)), b = Number(x(value)), dir = a > b ? 1 : -1;
    out.push(`<path class="rb-move" d="M${(a - dir * 11).toFixed(1)} ${16 + top}H${(b + dir * 14).toFixed(1)}"/>`,
      `<path class="rb-arrow" d="M${(b + dir * 20).toFixed(1)} ${10 + top}l${-dir * 6} 6l${dir * 6} 6"/>`,
      `<circle class="rb-prev" cx="${a.toFixed(1)}" cy="${16 + top}" r="8"/>`);
    if (prevLabel) out.push(`<text class="rb-cap" x="${a.toFixed(1)}" y="16" text-anchor="middle">${esc(prevLabel)}</text>`);
    if (nowLabel) out.push(`<text class="rb-cap now" x="${b.toFixed(1)}" y="16" text-anchor="middle">${esc(nowLabel)}</text>`);
  }
  if (fin(value)) out.push(`<circle class="rb-dot" cx="${x(value)}" cy="${16 + top}" r="9"/>`);
  out.push(`<text class="rb-end" x="0" y="${40 + top}">${sc[0]}°</text>`,
    `<text class="rb-target" x="${(bx + bw / 2).toFixed(1)}" y="${40 + top}" text-anchor="middle">Target ${lo} to ${hi}</text>`,
    `<text class="rb-end" x="${W}" y="${40 + top}" text-anchor="end">${sc[1]}°</text>`, '</svg>');
  return out.join('');
}

// What VoiceOver reads for one reading: "Saddle height, 44 degrees, target 30 to 40, Needs
// attention" (the design review, item 12), not the card's thirty words in a row.
export function rangeLabel(name, value, [lo, hi], status) {
  const v = fin(value) ? `${round(value)} degrees` : 'no reading';
  return [name, v, `target ${lo} to ${hi}`, status].filter(Boolean).join(', ');
}

// ── the Check tab ────────────────────────────────────────────────────────────────────────────
// One short line under the title (DECISIONS.md, 2026-10-10: one title, at most one short line), from
// the newest session that measured something (its stored grades and suggestion): the one thing to do
// if there is one, else how the saddle and reach look. The cards under it carry the rest.
// A change held by fit.withFeel says why instead: ride the last one first, a fitter's bike, or a change
// put back after it felt worse twice.
const WAIT_SUMMARY = { ride: 'Ride your last change, then check again.', worse: 'It felt worse. Ride it once more, then tell me how it felt.', fitter: 'A fitter set up your bike, so I only report.',
  undone: 'Your last change felt worse twice. A fitter can look at why.' };
export function homeSummary(latest) {
  if (!latest?.areas) return '';
  if (WAIT_SUMMARY[latest.wait]) return WAIT_SUMMARY[latest.wait];
  const g = latest.areas, sug = latest.suggested;
  // "a little" or "too", as the results said it (fit.suggestedChange keeps it; with pain the step is
  // capped, the words are not). Saved before that: from the step, "a little" for 3 and 5 mm, "too" for
  // 10; a suggestion saved before round 4 holds a range, and its grade says it, as then.
  if (sug?.kind === 'saddle') {
    const how = sug.how || (g.saddle === 'red' && !(Array.isArray(sug.mm) && sug.mm[1] < 10) ? 'too' : 'a little');
    return `Your saddle is probably ${how} ${sug.raise ? 'low' : 'high'}.`;
  }
  if (sug?.kind === 'bars') return 'The front of your bike is probably long and low.';
  // Fair with nothing to do (in range, near the edge) is in range, not "one more check".
  const saddleOk = g.saddle === 'green' || (g.saddle === 'amber' && latest.nothing);
  if (g.saddle === 'amber' && !saddleOk) return 'Your saddle height needs one more check.';
  if (!saddleOk) return 'Your last check could not measure your saddle height.';
  if (g.reach === 'green') return 'Your saddle height and reach look right.';
  if (g.reach === 'amber') return 'Your saddle height looks right. Your reach is fine to ride.';
  return 'Your saddle height looks right.';
}

// The cards under "Latest Check", from a stored session. dayLabel formats its date. The saddle card
// has the pedalling knee (or the held-still one when that is all there was) on its range bar; the
// reach card has the back, elbow and shoulder, or one line when it waited for the saddle.
export function latestCards(entry) {
  if (!entry?.areas) return [];
  const v = entry.values || {}, g = entry.areas, sug = entry.suggested;
  const kneeKey = fin(v.kneePedal) ? 'kneePedal' : fin(v.kneeStill) ? 'kneeStill' : 'kneePedal';
  const [lo, hi] = fit.TARGETS[METRIC[kneeKey].target];
  const held = (kind) => entry.wait && entry.would?.kind === kind;
  const step = sug?.kind === 'saddle' ? `${cap(fit.suggestionText(sug))}.`
    : held('saddle') ? fit.waitStep(entry)
    : g.saddle === 'green' ? 'Leave the saddle height as it is.' : '';
  const saddle = { key: 'saddle', title: AREA_TITLE.saddle, grade: g.saddle, status: fit.STATUS[g.saddle] || fit.STATUS.na,
    value: v[kneeKey], metric: METRIC[kneeKey].name, lo, hi, step };
  saddle.label = rangeLabel('Saddle height', saddle.value, [lo, hi], saddle.status) + (step ? `. ${step}` : '');
  // The shoulder is for reference only (fit.REFERENCE): no target band is drawn for it.
  const rows = ['torso', 'elbow', 'shoulder'].filter(k => fin(v[k]) && !fit.REFERENCE.includes(k)).map(k => {
    const [a, b] = fit.TARGETS[k];
    return { key: k, name: METRIC[k].short, value: v[k], lo: a, hi: b };
  });
  const reach = { key: 'reach', title: AREA_TITLE.reach, grade: g.reach, status: fit.STATUS[g.reach] || fit.STATUS.na, rows,
    collapsed: g.reach === 'after' || !rows.length,
    line: g.reach === 'after' ? 'Checked after the saddle' : !rows.length ? 'Not measured' : '',
    step: sug?.kind === 'bars' ? `${cap(fit.suggestionText(sug))}.` : held('bars') ? fit.waitStep(entry) : '' };
  reach.label = reach.collapsed ? `${AREA_TITLE.reach}: ${reach.line}`
    : [`${AREA_TITLE.reach}, ${reach.status}`, ...rows.map(r => rangeLabel(r.name, r.value, [r.lo, r.hi], ''))].join('. ') + (reach.step ? `. ${reach.step}` : '');
  return [saddle, reach];
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

// ── Progress ─────────────────────────────────────────────────────────────────────────────────
// The readings of one value over time, oldest first, from sessions filmed the same way as the newest
// one that has it (fit.sameSetup): only those are ever compared. n: how many to show, a design choice.
export function trend(history, key, n = 6) {
  // The pedalling knee only from sessions measured the way it is today (v 2), as fit.lastWith does.
  const h = (history || []).filter(s => fin(s?.values?.[key]) && (key !== 'kneePedal' || s.v >= 2));
  if (!h.length) return { points: [], setup: null };
  const setup = h[0].setup;
  const same = h.filter(s => fit.sameSetup(s.setup, setup)).slice(0, n).reverse();
  return { setup, points: same.map(s => ({ at: s.at, value: s.values[key], made: s.made || null, areas: s.areas || null })) };
}

// "Saddle up 10 mm", "Saddle down 5 mm", "Bars up one spacer": a change marker on the chart.
export function madeWords(m) {
  if (m?.kind === 'saddle') return `Saddle ${m.dir > 0 ? 'up' : 'down'} ${m.mm} mm`;
  if (m?.kind === 'bars') return 'Bars up one spacer';
  return '';
}

// The chart as an SVG string: the target band shaded, a line through the readings, each labelled,
// and a dashed marker after each check whose change was made (dotted for one not checked yet).
// dayLabel formats a date. The card around it carries the label (trendLabel). Labels that would
// overlap go on a second row; every label has a halo in the card colour (class ch-halo in the CSS).
export const CHAR_W = 6.3; // about how wide one character of the 11 px bold labels is, a design choice
export function markLabel(m, next = false) {
  const w = m?.kind === 'saddle' ? `${m.dir > 0 ? 'Up' : 'Down'} ${m.mm} mm` : m?.kind === 'bars' ? 'Bars up' : '';
  return next ? `${w}, next` : `Saddle ${w.toLowerCase()}`.replace('Saddle bars up', 'Bars up');
}
export function trendChart(points, [lo, hi], dayLabel, { pending = false } = {}) {
  const W = 326, H = 214, yTop = 40, yBot = 176, x0 = 30, x1 = 250, plotR = 286;
  const sc = scaleFor([lo, hi], points.map(p => p.value));
  const y = (v) => yBot - ((v - sc[0]) / (sc[1] - sc[0])) * (yBot - yTop);
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1)));
  const gap = n > 1 ? (x1 - x0) / (n - 1) : 80;
  const out = [`<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">`];
  out.push(`<rect class="ch-band" x="0" y="${y(hi).toFixed(1)}" width="${plotR}" height="${(y(lo) - y(hi)).toFixed(1)}"/>`);
  // Grid lines at the top and bottom of the scale and at the target's edges; a label too close to the
  // one above it is left out.
  let lastY = -99;
  for (const v of [sc[1], hi, lo, sc[0]]) {
    const yy = y(v);
    out.push(`<path class="ch-grid" d="M0 ${yy.toFixed(1)}H${plotR}"/>`);
    if (yy - lastY >= 12) { out.push(`<text class="ch-axis" x="292" y="${(yy + 4).toFixed(1)}">${round(v)}°</text>`); lastY = yy; }
  }
  out.push(`<text class="ch-bandlabel" x="8" y="${(y(lo) - 6).toFixed(1)}">TARGET ${lo} TO ${hi}</text>`);
  // A change made after check i shows between check i and the next one, or after the last one.
  const marks = [];
  points.forEach((p, i) => {
    if (!p.made) return;
    const last = i === n - 1, next = last && pending;
    const mx = last ? Math.min(plotR - 4, xs[i] + gap / 2) : (xs[i] + xs[i + 1]) / 2;
    const text = markLabel(p.made, next);
    const w = text.length * CHAR_W;
    const left = Math.max(0, Math.min(mx - w / 2, plotR - w));
    marks.push({ mx, text, left, w, next });
  });
  const rows = [];
  for (const m of marks) {
    let r = 0;
    while (rows[r] != null && rows[r] > m.left - 6) r++;
    rows[r] = m.left + m.w;
    m.row = Math.min(r, 1);
  }
  for (const m of marks) {
    out.push(`<path class="ch-mark${m.next ? ' next' : ''}" d="M${m.mx.toFixed(1)} ${m.row ? 32 : 20}V${yBot}"/>`,
      `<text class="ch-marklabel ch-halo${m.next ? ' next' : ''}" x="${(m.left + m.w / 2).toFixed(1)}" y="${m.row ? 28 : 13}" text-anchor="middle">${esc(m.text)}</text>`);
  }
  if (n > 1) out.push(`<path class="ch-line" d="${points.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${y(p.value).toFixed(1)}`).join('')}"/>`);
  points.forEach((p, i) => {
    const last = i === n - 1;
    out.push(`<circle class="ch-pt${last ? ' last' : ''}" cx="${xs[i].toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="${last ? 7 : 6}"/>`,
      `<text class="ch-val ch-halo" x="${xs[i].toFixed(1)}" y="${(y(p.value) - 12).toFixed(1)}" text-anchor="middle">${round(p.value)}°</text>`,
      `<text class="ch-day${last ? ' last' : ''}" x="${xs[i].toFixed(1)}" y="200" text-anchor="middle">${esc(dayLabel(p.at))}</text>`);
  });
  out.push('</svg>');
  return out.join('');
}

// "Knee bend: 49 degrees on 19 Sep, 47 on 26 Sep, then the saddle went up 5 mm, 44 on 3 Oct. Target 30 to 40."
export function trendLabel(name, points, [lo, hi], dayLabel) {
  const parts = points.map((p, i) => {
    const v = `${round(p.value)}${i === 0 ? ' degrees' : ''} on ${dayLabel(p.at)}`;
    return p.made ? `${v}, then ${madeWords(p.made).replace(/^Saddle/, 'the saddle went').replace(/^Bars up/, 'the bars went up')}` : v;
  });
  return `${name}: ${parts.join(', ')}. Target ${lo} to ${hi}.`;
}

// The changes he said he made, newest first, each with what the next check filmed the same way
// showed: the knee before and after for the saddle (the stored readings, no new maths), or "Not
// checked yet" while fit.pendingChange still has it waiting.
export function changesList(history) {
  const h = history || [];
  const pending = fit.pendingChange(h);
  return h.map((s, i) => ({ s, i })).filter(({ s }) => s?.made).map(({ s, i }) => {
    const m = s.made;
    const title = m.kind === 'saddle' ? `${m.dir > 0 ? 'Raised' : 'Lowered'} the Saddle ${m.mm}\u00a0mm` : 'Raised the Handlebars';
    let then = '';
    // How it felt (fit.recordFeel): put back after two "worse" answers, or the latest answer.
    const felt = m.feel?.length ? `Felt ${{ better: 'better', same: 'the same', worse: 'worse' }[m.feel[m.feel.length - 1].said]}` : '';
    if (m.undone) then = 'Felt worse twice. Put back.';
    else if (pending?.at === s.at) then = 'Not checked yet';
    // A 3 or 5 mm change is too small for this camera to measure (fit.tooSmallToSee): no before and
    // after, as if it had been checked (SPEC 7.1, item 11).
    else if (m.kind === 'saddle' && fit.tooSmallToSee(m.mm)) then = 'Too small for me to measure';
    else if (m.kind === 'saddle' && fin(s.values?.kneePedal)) {
      const next = h.slice(0, i).reverse().find(x => fit.sameSetup(x?.setup, s.setup) && fin(x?.values?.kneePedal));
      if (next) then = `Then: knee bend ${s.values.kneePedal}° before, ${next.values.kneePedal}° after`;
    }
    return { at: s.at, title, pending: pending?.at === s.at, then, felt: m.undone ? '' : felt };
  });
}

// ── the results sheet ────────────────────────────────────────────────────────────────────────
// Which area the headline is about, so the status above it is that area's own: the reach area for a
// handlebar change (or one held back), otherwise the saddle. Never a summary of both: one disagreed
// with the areas under it in round 1.
export function focusArea(r, areas) {
  const key = r?.change?.kind === 'bars' || r?.heldBars || r?.would?.kind === 'bars' ? 'reach' : 'saddle';
  return (areas || []).find(a => a.key === key) || null;
}

// The retest win: the saddle change he made moved the knee the right way and it is in range now, with
// nothing new to change and nothing to film again. Then the headline says so and the bar shows before
// and after. A held-still reading outside its range the first time asks for one more film (onceMore),
// so that is not a win yet: the voice would say "done" over a sheet that says "Film once more".
export const onceMore = (r) => !!(r?.stillOut && !r.stillOutAgain);
export function retestWin(r) {
  const t = r?.retest;
  return !!(t && t.inRange && fin(t.before) && fin(t.now) && ['consistent', 'too-much', 'too-little'].includes(t.verdict)
    && !r.change && !r.heldBars && !onceMore(r));
}
// The check is done: the change worked, or nothing to change and nothing to film again. Then the
// phone need not stay where it is, and the voice says when to check again (fit.COME_BACK).
// A change held by fit.withFeel (ride it first, a fitter's bike, a change put back) is done for today too.
export const checkDone = (r) => !!r?.wait || retestWin(r) || (fit.nothingToDo(r) && !onceMore(r));
// The win's one short line under its headline: the before and after (fit.judgeChange's readings),
// and which way it moved. The full reason is in Say It Again and Copy Results.
export function winLine(r) {
  const t = r?.retest;
  if (!retestWin(r)) return '';
  return `Knee bend ${round(t.before)}° before, ${round(t.now)}° now. It moved the right way.`;
}

// ── the live screen ──────────────────────────────────────────────────────────────────────────
// What the camera view shows in each state, from the design review's state table. Two ways to use
// the same spot on the chair: the screen facing the rider (front camera, front: true), read from
// 3 m, so only big things: a coloured border (blue working, dashed yellow needs you, green good),
// one word, a ring with a countdown, the result; and the screen facing away (back camera), read at
// arm's length by the rider walking back to the phone or a helper behind it: the picture, the same
// figure and outline, the last correction on a frosted card, the ring for a helper. Captions only
// in the setup steps, in both. The voice says everything either way.

// The short sign for a correction of the picture (fit.checkFraming, fit.checkSideOn, the light):
// a word for the 3 m layer and a few words for the card, along the bike in bike words, never left or
// right. toward: 'front' or 'back' (wheel), or null.
export function placeSign(p) {
  if (!p) return null;
  if (p.key === 'dark') return { word: 'Light', sub: 'Turn on more lights', toward: null };
  if (p.toward === 'front' || p.toward === 'back') return { word: 'Move', sub: `Phone towards the ${p.toward} wheel`, toward: p.toward };
  if (p.key === 'small') return { word: 'Move', sub: 'Phone a bit closer', toward: null };
  return { word: 'Move', sub: 'Phone further away', toward: null };
}

// Which way an arrow along the bike points on the screen: 1 to the right, -1 to the left. face:
// fit.facing of the rider in the camera's own picture (1: facing its right). mirrored: the picture
// is shown like a mirror (the front camera), so the arrow points at the real wheel as the rider
// sees it from the bike.
export function arrowDir(toward, face = 1, mirrored = false) {
  const raw = (toward === 'front' ? 1 : -1) * (face >= 0 ? 1 : -1);
  return mirrored ? -raw : raw;
}

// How much of the ring is filled, 0 to 1. With Reduce Motion it moves one step a second.
export function ringFrac(elapsed, total, reduce = false) {
  if (!(total > 0) || !fin(elapsed)) return 0;
  return Math.max(0, Math.min(1, (reduce ? Math.floor(elapsed) : elapsed) / total));
}

const STEP = { phone: 1, mount: 2, frame: 2, still: 3, pedal: 4 };
const stepLabel = (phase) => (STEP[phase] ? `Step ${STEP[phase]} of 5` : 'Bike Fit Check');

/**
 * The state of the camera view. s, gathered by app.js each frame:
 *   front (the 3 m layer), mirrored (the picture shown like a mirror), phase, and per step:
 *   phone: placing (the placement lines are still being said), sensor, landscape, upright (the
 *     screen itself is upright), tilt (degrees off level, the larger of the two), bubble (-1 to 1,
 *     where the level bubble sits), framing (screen away, day one: the bike is being framed in the
 *     big guide before levelling), guide (screen away: keep the guide drawn while levelling).
 *   levelled: the phone was levelled a moment ago (the green LEVEL screen).
 *   mount, frame: rider (seen on the bike), inView (someone is in the picture, for the tick),
 *     asking (the turn-the-pedals question is waiting for an answer), who (it could not tell who is
 *     riding), aero, fix (the correction last said, until he is back on the bike, or until the phone
 *     step has levelled the phone again after it, app.js), problem (what is
 *     wrong with the picture now, not said yet), ok (nothing wrong now), face (fit.facing), tip
 *     (day one: the tape tip shows until he is on the bike), tipSpeaking (the voice is saying it).
 *   still: hold { capturing, elapsed, total, lost }; flash: the reading was taken a moment ago.
 *   pedal: pedal { started, elapsed, total, left, paused, more, dir }.
 *   reduce: Reduce Motion is on.
 * Returns { layer: 'place'|'level'|'avatar'|'ring'|'field', step, border: null|'blue'|'yellow'|'green',
 *   tone: 'white'|'yellow'|'green', word, sub, icon: null|'arrow'|'check'|'tick', arrow (1 or -1),
 *   ghost, figure, caption, ring: { frac, digits, hold } | null, level: { text, bubble } | null,
 *   card: { sub, arrow, note, icon } | null (the frosted card, screen facing away; note: white, a tip
 *   rather than a correction; icon 'tape'), bikeGuide (draw the bike guide), field | null, label }.
 */
export function liveView(s) {
  const v = { layer: 'avatar', step: stepLabel(s.phase), border: null, tone: 'white', word: '', sub: '', icon: null, arrow: 0,
    ghost: false, figure: false, caption: ['phone', 'mount', 'frame'].includes(s.phase), ring: null, level: null, card: null, field: null, label: '' };
  const signOf = (p) => {
    const g = placeSign(p);
    Object.assign(v, { border: 'yellow', tone: 'yellow', word: g.word, sub: g.sub, icon: g.toward ? 'arrow' : null, arrow: g.toward ? arrowDir(g.toward, s.face, s.mirrored) : 0 });
    v.card = { sub: g.sub, arrow: v.arrow };
  };
  const field = (tone, word, sub, icon) => { v.layer = 'field'; v.field = { tone, word, sub, icon }; v.caption = false; };
  if (s.phase === 'phone') {
    if (s.placing) { v.layer = 'place'; v.label = 'Stand your iPhone sideways on the chair.'; return v; }
    // Screen away, the rider at the phone: before it is levelled, the bike goes inside the big guide
    // (the customer research, item 3). The card says what the voice says, so no caption.
    if (s.framing) {
      Object.assign(v, { layer: 'avatar', border: 'yellow', bikeGuide: true, caption: false, card: { sub: FRAME_TIP, arrow: 0, note: true } });
      v.label = `${FRAME_TIP}.`;
      return v;
    }
    v.border = 'yellow'; v.tone = 'yellow';
    // Screen away: the guide stays drawn behind the level numbers, so the bike stays in it.
    v.bikeGuide = !s.front && !!s.guide;
    if (!s.sensor && !s.upright) {
      Object.assign(v, { layer: 'avatar', word: 'Level', sub: 'By eye, then tap It Is Level', clear: true });
    } else if (s.upright || !s.landscape) {
      Object.assign(v, { layer: 'level', word: 'Turn', sub: 'Turn the phone sideways' });
    } else {
      v.layer = 'level';
      v.level = { text: `${Math.round(Math.abs(s.tilt) || 0)}°`, bubble: Math.max(-1, Math.min(1, s.bubble || 0)) };
      v.sub = 'Tilt slowly until the screen turns green';
    }
    // Back here after moving the phone: the correction stays on the card until he is back on.
    if (s.fix) v.card = { sub: placeSign(s.fix).sub, arrow: placeSign(s.fix).toward ? arrowDir(placeSign(s.fix).toward, s.face, s.mirrored) : 0 };
  } else if (s.levelled && (s.phase === 'mount' || s.phase === 'frame')) {
    field('green', 'Level', 'Leave the phone there', 'check');
    v.step = stepLabel('phone');
  } else if (s.phase === 'mount' || s.phase === 'frame') {
    v.ghost = true; v.figure = true;
    if (s.aero) Object.assign(v, { border: 'yellow', tone: 'yellow', word: 'Sit Up', sub: 'This app checks road bikes only' });
    else if (s.who) Object.assign(v, { border: 'yellow', tone: 'yellow', word: 'Stop', sub: 'Tap Stop, then start again' });
    else if (s.fix) signOf(s.fix);
    else if (s.phase === 'mount' && s.asking) Object.assign(v, { border: 'yellow', tone: 'yellow', word: 'Turn', sub: 'The pedals, two slow turns' });
    else if (!s.rider) {
      Object.assign(v, { border: 'yellow', tone: 'yellow', word: 'Get On', sub: 'Your normal riding position', icon: s.inView ? 'tick' : null });
      // Day one, screen away: the tape tip on the frosted card until he is on the bike, and no
      // caption while the voice says the same.
      if (s.tip && !s.front) v.card = { sub: TAPE_TIP, arrow: 0, note: true, icon: 'tape' };
    }
    else if (s.phase === 'frame' && s.ok) Object.assign(v, { border: 'green', tone: 'green', word: 'Stay', sub: 'You are in place', icon: 'check' });
    else Object.assign(v, { border: 'blue', tone: 'white', word: 'Wait', sub: 'Stay on the bike' });
  } else if ((s.phase === 'still' || s.phase === 'pedal') && s.flash) {
    // One green flash when the held-still reading is taken; the pedalling starts under it.
    field('green', 'Got It', '', 'check');
    v.step = stepLabel('still');
  } else if (s.phase === 'still') {
    const h = s.hold || {};
    Object.assign(v, { layer: s.front ? 'ring' : 'avatar', border: 'blue', word: 'Hold', figure: !s.front, ghost: false,
      sub: h.capturing ? 'Hold still' : h.lost ? 'Get back on when you are ready' : 'Pedal at its lowest point' });
    v.ring = { frac: h.capturing ? ringFrac(h.elapsed, h.total, s.reduce) : 0, digits: '', hold: true };
  } else if (s.phase === 'pedal') {
    const p = s.pedal || {};
    // On a trainer, the effort of a long ride (SPEC 5.0, round 4); backwards on the floor has no load.
    const dirWords = p.dir === 'forwards' ? 'Forwards, long-ride effort' : 'Backwards, steady';
    Object.assign(v, { layer: s.front ? 'ring' : 'avatar', border: 'blue', word: 'Pedal', figure: !s.front, ghost: false,
      sub: p.more ? 'A few more turns' : p.paused ? 'Paused' : dirWords });
    v.ring = { frac: p.more ? 1 : p.started ? ringFrac(p.elapsed, p.total, s.reduce) : 0,
      digits: p.more ? '' : String(p.started ? Math.max(0, Math.ceil(p.left)) : p.total), hold: false };
  }
  if (s.tipSpeaking && v.card?.icon === 'tape') v.caption = false;
  v.label = v.layer === 'field' ? [v.field.word, v.field.sub].filter(Boolean).join('. ') : [v.word, v.sub].filter(Boolean).join('. ');
  return v;
}

// The two notes on the frosted card, screen away: the bike framed before anyone gets on (said as
// "Both wheels inside the frame, pedals in the middle.") and, on day one, the tape on the floor (said
// in full as "Put a strip of tape on the floor by the chair legs and by the back wheel. Next time,
// line them up.").
export const FRAME_TIP = 'Both wheels inside the frame, pedals in the middle';
export const TAPE_TIP = 'Tape the floor by the chair legs and the back wheel. Next time, line them up.';

// What the figure on the camera view says to VoiceOver.
export function avatarLabel(v) {
  if (!v.figure) return '';
  if (v.tone === 'green') return 'Your figure is inside the dotted outline of where you should be. You are in place.';
  if (v.tone === 'yellow') return `Your figure is not in place yet. ${v.sub}.`;
  return 'Your figure is close to the dotted outline. Checking the picture.';
}

// The result on the camera view, before the results sheet: the whole screen green or yellow with one
// big word or the millimetres to change, the headline under it, then See What to Do. r: fit's result
// (withRetest); win: ui.retestWin(r); grade: the status of the area in focus (focusArea); nothing:
// fit.nothingToDo(r); what: fit.headline(r).what. Every word under the big one is fit.js's own.
// once: onceMore(r), the held-still reading asks for one more film; then the big word is AGAIN with the
// voice's own words, never GOOD over "Film once more to be sure" (QA round 3).
export function resultField(r, { win = false, grade = 'na', nothing = false, what = '', once = false } = {}) {
  const c = r?.change;
  if (win) return { tone: 'green', icon: 'check', word: 'Good', sub: 'Your saddle change worked' };
  // A change held by fit.withFeel: RIDE (it first), FITTER (ask them), KEEP (it where it is).
  if (r?.wait) return { tone: 'yellow', icon: null, word: { ride: 'Ride', worse: 'Ride', fitter: 'Fitter', undone: 'Keep' }[r.wait], sub: what };
  if (c?.kind === 'saddle') {
    return { tone: 'yellow', icon: c.raise ? 'up' : 'down', mm: true, word: c.mm[0] === c.mm[1] ? `${c.mm[0]} mm` : `${c.mm[0]} to ${c.mm[1]} mm`, sub: c.headline };
  }
  if (c?.kind === 'bars') return { tone: 'yellow', icon: 'up', word: 'Bars', sub: c.headline };
  if (once) return { tone: 'yellow', icon: null, word: 'Again', sub: 'Film once more to be sure' };
  if (nothing && grade === 'green') return { tone: 'green', icon: 'check', word: 'Good', sub: what };
  // Fair with nothing to change: in range, near the edge (fit.zone). Never AGAIN over "Nothing to change".
  if (nothing && grade === 'amber') return { tone: 'yellow', icon: 'check', word: 'Fair', sub: what };
  return { tone: 'yellow', icon: null, word: 'Again', sub: what };
}

// ── the results' primary button while a change waits ──────────────────────────────────────────
// It saves the change as made and starts a check at once, so it says what it saves (QA round 3: a
// bare "Check It Now" stored a saddle change the rider had not made yet). change: fit's result's
// change; mm: what the stepper holds now. A number fit.madeChange would not store gives a label with
// no number, and the tap shows the stepper's error instead of saving. Returns { text, aria, mm }.
export function checkNowLabel(change, mm) {
  if (change?.kind === 'bars') return { text: 'I Raised the Bars, Check Now', aria: 'I raised the handlebars. Save that and check now.', mm: null };
  const made = fit.madeChange(change, mm, '');
  if (!made) return { text: 'I Moved It, Check Now', aria: 'I moved the saddle. Type how far first.', mm: null };
  return { text: `I Moved It ${made.mm} mm, Check Now`, aria: `I moved the saddle ${made.mm} millimetres. Save that and check now.`, mm: made.mm };
}

// ── a reason to come back ────────────────────────────────────────────────────────────────────
// "When will you move it?" after "Later" on the change card: Tonight, Weekend or Pick a Day, and a
// calendar file made on the phone (no server, no web push) that opens the app. The times are design
// choices: tonight is 8 pm, or an hour from now on the half hour once it is 7 pm or later; the
// weekend is Saturday at 10 am, or Sunday at 10 am once Saturday's has passed. Pick a Day gives the
// day and time chosen, if it is still to come. now: a Date. Returns a Date, or null.
export function remindAt(choice, now = new Date(), picked = null) {
  const at = (d, h) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
  if (choice === 'tonight') {
    if (now.getHours() < 19) return at(now, 20);
    const x = new Date(now.getTime() + 60 * 60000);
    x.setSeconds(0, 0);
    if (x.getMinutes() % 30) x.setMinutes(x.getMinutes() + 30 - (x.getMinutes() % 30));
    return x;
  }
  if (choice === 'weekend') {
    for (let i = 0; i < 8; i++) {
      const d = at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), 10);
      if ((d.getDay() === 6 || d.getDay() === 0) && d > now) return d;
    }
    return null;
  }
  if (choice === 'pick') {
    const d = picked instanceof Date ? picked : picked ? new Date(picked) : null;
    return d && Number.isFinite(d.getTime()) && d > now ? d : null;
  }
  return null;
}

// What the reminder says, from the change suggested (fit.suggestedChange).
export function reminderWords(sug) {
  const what = fit.suggestionText(sug);
  return {
    title: what ? `Bike fit: ${what}` : 'Bike fit: check your position',
    notes: what ? `${what[0].toUpperCase()}${what.slice(1)}. Then open Bike Fit Coach and check what it did.` : 'Open Bike Fit Coach and check your position.',
  };
}

// A calendar file (iCalendar, RFC 5545) with one event and an alert when it starts. start: a Date;
// minutes: how long, a design choice; url: the app's own address, so the event opens it; uid and
// stamp (a Date) make each file its own event. Times are written in UTC, so the phone shows them in
// its own time zone. Lines end in CRLF and are folded at 75 characters, as the standard asks.
export function icsReminder({ start, minutes = 30, title, notes, url, uid, stamp = new Date() }) {
  const t = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
  const txt = (x) => String(x).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => { const out = []; let rest = line; while (rest.length > 75) { out.push(rest.slice(0, 75)); rest = ` ${rest.slice(75)}`; } out.push(rest); return out.join('\r\n'); };
  const end = new Date(start.getTime() + minutes * 60000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bike Fit Coach//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${t(stamp)}`, `DTSTART:${t(start)}`, `DTEND:${t(end)}`, `SUMMARY:${txt(title)}`,
    `DESCRIPTION:${txt(`${notes}\n${url}`)}`, `URL;VALUE=URI:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${txt(title)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

// ── the recorded voice ───────────────────────────────────────────────────────────────────────
// Every line the app says is recorded in the coach's voice (Kokoro, af_heart) and listed by its exact
// words in assets/voice/manifest.json (tools/voice/build-voice.mjs). The words are compared after
// this clean-up, the same in the app and in the build.
export const voiceText = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
// A line's sentences: split after a full stop, question mark or exclamation mark that ends a word.
// No lookbehind in the pattern: older Safari cannot parse one, and the whole page would fail.
export function sentences(text) {
  const out = [];
  let cur = '';
  for (const w of voiceText(text).split(' ')) {
    if (!w) continue;
    cur = cur ? `${cur} ${w}` : w;
    if (/[.?!]$/.test(w)) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}
// How a line is played: one clip for the whole line when there is one, otherwise the longest run of
// sentences that has a clip, then the next, so a line built from parts (the spoken result) is played
// sentence by sentence. has(text): whether a clip has these exact words. A sentence with no clip
// comes back as { clip: false }, for the phone's own voice.
export function voiceParts(text, has) {
  const s = sentences(text), out = [];
  for (let i = 0; i < s.length;) {
    let j = s.length;
    while (j > i && !has(s.slice(i, j).join(' '))) j--;
    if (j === i) { out.push({ text: s[i], clip: false }); i++; } else { out.push({ text: s.slice(i, j).join(' '), clip: true }); i = j; }
  }
  return out;
}
