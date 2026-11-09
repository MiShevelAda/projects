// The rules of the walk, with no page in them, so the tests can use them too.
import { STOPS, WALKS } from './stops.js';

// Today as YYYY-MM-DD in the phone's own time zone, for the dated notices in stops.js.
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A stop the museum has said is closed on these dates: the walk passes it by.
export const closedOn = (s, day = today()) => !!(s.notice?.from && s.notice.from <= day && day <= s.notice.until);

// A stop's notice is shown up to and including its last day, then disappears on its own.
export const noticeOn = (s, day = today()) => (s.notice && day <= s.notice.until ? s.notice.text : '');

// Practical points: a plain string always shows, a { text, until } point only up to its date.
export const pointsOn = (points, day = today()) => points
  .filter((p) => typeof p === 'string' || day <= p.until).map((p) => (typeof p === 'string' ? p : p.text));

export const walkStops = (walk) => STOPS.filter((s) => (WALKS[walk] || WALKS.full).ids.includes(s.id));

// The next stop on this walk after this one, passing by any stop closed that day. A stop that is not
// on this walk (opened from a link) is placed by its order in the full walk.
export function nextOf(id, walk, day = today()) {
  const at = STOPS.findIndex((s) => s.id === id);
  return walkStops(walk).find((s) => STOPS.indexOf(s) > at && !closedOn(s, day)) || null;
}
