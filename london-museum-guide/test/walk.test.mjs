// The walk's rules: the time you have picks the walk, closed stops are passed by, later stops wait at
// the end, dated notices disappear on their own, and the clock is London's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, london, nextOf, noticeOn, openState, pointsOn, timeCheck, upNext, walkStops } from '../walk.js';

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
