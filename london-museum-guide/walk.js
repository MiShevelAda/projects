// The rules of the walk, with no page in them, so the tests can use them too.
import { STOPS, WALKS, WALK_BETWEEN, HOURS } from './stops.js';

// The museum keeps London time, whatever time zone the phone is set to.
export function london(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, mins: Number(p.hour) * 60 + Number(p.minute) };
}

// Today as YYYY-MM-DD in London, for the dated notices in stops.js.
export const today = (d = new Date()) => london(d).day;

const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const clock = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;

// The hours for a given day: the usual ones, or that day's own (HOURS.special, e.g. an early close).
export const hoursOn = (day = today()) => ({ ...HOURS, ...((HOURS.special || {})[day] || {}) });

// Open now? { state: 'open' | 'before' | 'after' | 'closed-day', mins: minutes until it changes }.
export function openState(d = new Date()) {
  const { day, mins } = london(d);
  const H = hoursOn(day);
  if (H.closedDays.includes(day.slice(5)) || (H.closedDates || []).includes(day)) return { state: 'closed-day' };
  const open = hm(H.open), close = hm(H.close);
  if (mins < open) return { state: 'before', mins: open - mins };
  if (mins >= close) return { state: 'after' };
  return { state: 'open', mins: close - mins };
}

// A stop's notices: { text, until } and optionally from, and kind: 'closed' (the default when a
// notice has a from date: the walk passes the stop by on those days), 'late' (opens late, shown
// only), or 'partial' (part of it closed, shown only). A notice without from is shown up to until.
const noticesOf = (s) => s.notices || (s.notice ? [s.notice] : []);
const active = (n, day) => (!n.from || n.from <= day) && day <= n.until;
export const closedOn = (s, day = today()) => noticesOf(s).some((n) => n.from && (n.kind || 'closed') === 'closed' && active(n, day));

// A stop's notices are shown up to and including their last day, then disappear on their own.
export const noticeOn = (s, day = today()) => noticesOf(s).filter((n) => day <= n.until).map((n) => n.text).join(' ');

// A plain string always shows; a { text, until } point only up to its date.
export const pointsOn = (points, day = today()) => points
  .filter((p) => typeof p === 'string' || day <= p.until).map((p) => (typeof p === 'string' ? p : p.text));

// The stops of a walk in the order to see them: the walk's own order, with any stop the visitor put
// off till later moved to the end (in the order they were put off).
export function walkStops(walk, later = []) {
  const list = STOPS.filter((s) => (WALKS[walk] || WALKS.three).ids.includes(s.id));
  const put = later.filter((id) => list.some((s) => s.id === id));
  return [...list.filter((s) => !put.includes(s.id)), ...put.map((id) => list.find((s) => s.id === id))];
}

// The next stop to see after this one: the next in walk order that is not seen and not closed that
// day. A stop that is not on this walk (opened from a link) is placed by its order in the full walk.
export function nextOf(id, walk, { later = [], seen = {}, day = today() } = {}) {
  const list = walkStops(walk, later);
  let i = list.findIndex((s) => s.id === id);
  if (i < 0) {
    const at = STOPS.findIndex((s) => s.id === id);
    const j = list.findIndex((s) => STOPS.indexOf(s) > at);
    i = (j < 0 ? list.length : j) - 1;
  }
  return list.slice(i + 1).find((s) => !seen[s.id] && !closedOn(s, day))
    || list.slice(0, Math.max(0, i)).find((s) => !seen[s.id] && !closedOn(s, day) && s.id !== id) || null;
}

// Where the visitor is up to: the first stop not yet seen after the furthest one seen, so jumping ahead
// (a family going straight to the dinosaurs) never sends anyone back to the start. Stops skipped on the
// way come round again at the end, after the rest, like the ones put off till later.
export function upNext(walk, { later = [], seen = {}, day = today() } = {}) {
  const list = walkStops(walk, later);
  const ok = (s) => !seen[s.id] && !closedOn(s, day);
  const inOrder = list.filter((s) => !later.includes(s.id));
  const furthest = inOrder.reduce((m, s, i) => (seen[s.id] ? i : m), -1);
  return inOrder.slice(furthest + 1).find(ok) || list.find(ok) || null;
}

// Will the rest of the walk fit before the galleries start clearing? Minutes needed for what is
// left, against minutes until clearing starts (HOURS.clearing). Only meaningful while open.
export function timeCheck(walk, { later = [], seen = {}, d = new Date() } = {}) {
  const st = openState(d);
  if (st.state !== 'open') return { state: st.state, short: false };
  const { day, mins } = london(d);
  const left = walkStops(walk, later).filter((s) => !seen[s.id] && !closedOn(s, day));
  const need = left.reduce((a, s) => a + s.minutes, 0) + Math.max(0, left.length - 1) * WALK_BETWEEN;
  const avail = hm(hoursOn(day).clearing) - mins;
  // A shorter walk that would fit, offered when this one does not.
  const order = ['three', 'two', 'hour'];
  const shorter = order.slice(order.indexOf(walk) + 1).find((w) => {
    const l = walkStops(w, later).filter((s) => !seen[s.id] && !closedOn(s, day));
    return l.reduce((a, s) => a + s.minutes, 0) + Math.max(0, l.length - 1) * WALK_BETWEEN <= avail;
  }) || null;
  return { state: 'open', need, avail, short: need > avail, shorter };
}
