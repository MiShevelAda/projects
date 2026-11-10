// The walk's rules: the time you have picks the walk, closed stops are passed by, later stops wait at
// the end, dated notices disappear on their own, and the clock is London's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, findThings, london, nextOf, noticeOn, openState, pointsOn, timeCheck, upNext, walkMinutes, walkStops } from '../walk.js';

// A made-up stop with a closure, so the rules are tested without tying the guide to real dates.
const shut = { id: 'shut', notice: { text: 'Closed for three days.', from: '2026-11-10', until: '2026-11-12' } };
const at = (iso) => new Date(iso);

test('the clock is London time, whatever the phone says', () => {
  assert.deepEqual(london(at('2026-11-09T14:30:00Z')), { day: '2026-11-09', mins: 14 * 60 + 30 });
  assert.deepEqual(london(at('2026-07-01T09:00:00Z')), { day: '2026-07-01', mins: 10 * 60 }); // summer time
});

test('open, before, after and the Christmas closure', () => {
  assert.equal(openState(at('2026-11-09T09:00:00Z')).state, 'before');
  assert.deepEqual(openState(at('2026-11-09T17:00:00Z')), { state: 'open', mins: 50 });
  assert.equal(openState(at('2026-11-09T18:00:00Z')).state, 'after');
  assert.equal(openState(at('2026-12-25T12:00:00Z')).state, 'closed-day');
});

test('each walk is real stops in the full walk\'s order, and later stops wait at the end', () => {
  assert.deepEqual(walkStops('hour').map((s) => s.id), ['building', 'hope', 'dinosaurs', 'darwin', 'sequoia']);
  assert.equal(walkStops('three').length, STOPS.length);
  assert.equal(walkStops('nonsense').length, STOPS.length);
  assert.deepEqual(walkStops('hour', ['dinosaurs']).map((s) => s.id), ['building', 'hope', 'darwin', 'sequoia', 'dinosaurs']);
});

test('next passes closed and seen stops, and comes back for one put off till later', () => {
  assert.equal(nextOf('dinosaurs', 'three', { day: '2026-11-09' }).id, 'mammals');
  assert.equal(nextOf('dinosaurs', 'three', { day: '2026-11-11' }).id, 'mammals'); // no dated closures: any day is the same
  assert.equal(nextOf('hope', 'hour', { later: ['dinosaurs'] }).id, 'darwin');
  assert.equal(nextOf('sequoia', 'hour', { later: ['dinosaurs'] }).id, 'dinosaurs');
  assert.equal(nextOf('sequoia', 'two').id, 'sophie');
  assert.equal(nextOf('treasures', 'two').id, 'vault'); // opened from a link, not on this walk
  assert.equal(nextOf('fern', 'three', { seen: Object.fromEntries(STOPS.map((s) => [s.id, true])) }), null);
  assert.equal(upNext('two', { seen: { building: true, hope: true } }).id, 'dinosaurs');
  // Straight to the dinosaurs, then Darwin: the walk carries on from there, not from the pavement outside.
  assert.equal(upNext('two', { seen: { dinosaurs: true, darwin: true } }).id, 'vault');
  // Skipped stops come round at the end, before nothing is left.
  assert.equal(upNext('hour', { seen: { dinosaurs: true, darwin: true, sequoia: true } }).id, 'building');
  assert.equal(upNext('hour', { seen: { building: true }, later: ['hope'] }).id, 'dinosaurs');
});

test('the time check offers a shorter walk when this one will not fit before clearing', () => {
  const late = timeCheck('three', { d: at('2026-11-09T15:00:00Z') });
  assert.ok(late.short && late.shorter);
  assert.equal(timeCheck('hour', { d: at('2026-11-09T10:00:00Z') }).short, false);
  assert.equal(timeCheck('two', { d: at('2026-11-09T20:00:00Z') }).state, 'after');
});

test('a closure notice shows until its last day, then goes', () => {
  assert.ok(!closedOn(shut, '2026-11-09'));
  assert.ok(closedOn(shut, '2026-11-10') && closedOn(shut, '2026-11-12'));
  assert.ok(noticeOn(shut, '2026-11-12'));
  assert.equal(noticeOn(shut, '2026-11-13'), '');
  assert.deepEqual(pointsOn(['always', { text: 'until Friday', until: '2026-11-13' }], '2026-11-14'), ['always']);
});

test('a walk\'s length is its stops\' minutes plus the walks between them, as the picker shows it', () => {
  assert.equal(walkMinutes([]), 0);
  assert.equal(walkMinutes([{ minutes: 10 }]), 10);
  assert.equal(walkMinutes([{ minutes: 10 }, { minutes: 5 }]), 10 + 5 + 3);
  // At opening, with nothing seen and nothing closed, the time check needs exactly the picker's length.
  for (const w of ['hour', 'two', 'three']) assert.equal(timeCheck(w, { d: at('2026-11-09T10:00:00Z') }).need, walkMinutes(walkStops(w)), w);
  // The names say 1, 2 and 3 hours; the real lengths are longer, which is why the picker shows them.
  assert.ok(walkMinutes(walkStops('hour')) > 60 && walkMinutes(walkStops('three')) > walkMinutes(walkStops('two')));
});

test('find something: titles, Look For items and chapter titles from every stop, forgiving of how it is typed', () => {
  const fake = [
    { id: 'a', title: 'Hope, the Blue Whale', look: ['The T. rex jaw, lower left.'], chapters: ["Owen's New Word"] },
    { id: 'b', title: 'Café Mégalodon', look: [], chapters: ['A Blue Tit'] },
  ];
  assert.deepEqual(findThings('', fake), []);
  assert.deepEqual(findThings('a', fake), [], 'one letter finds nothing yet');
  for (const q of ['trex', 't rex', 'T. Rex', '  T REX ']) assert.deepEqual(findThings(q, fake).map((r) => [r.stop.id, r.kind, r.i]), [['a', 'look', 0]], q);
  assert.deepEqual(findThings('blue', fake).map((r) => [r.stop.id, r.kind]), [['a', 'title'], ['b', 'chapter']], 'titles first');
  assert.deepEqual(findThings('whale blue', fake).map((r) => r.kind), ['title'], 'every word, in any order');
  assert.equal(findThings('cafe megalodon', fake)[0].stop.id, 'b', 'accents do not count');
  assert.equal(findThings('owens', fake)[0].kind, 'chapter', 'punctuation does not count');
  assert.deepEqual(findThings('zebra', fake), []);
  // Every stop is found by its own title, and every Look For item by its own words, on any walk.
  for (const s of STOPS) {
    assert.ok(findThings(s.title).some((r) => r.kind === 'title' && r.stop === s), `${s.id}: title`);
    s.look.forEach((l, i) => assert.ok(findThings(l).some((r) => r.kind === 'look' && r.stop === s && r.i === i), `${s.id}: look ${i}`));
  }
  assert.ok(findThings('trex').some((r) => r.stop.id === 'dinosaurs' && r.kind === 'look'), 'the T. rex is found');
});
