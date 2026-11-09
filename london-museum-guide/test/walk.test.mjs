// The walk's rules: closed stops are passed by, and dated notices disappear on their own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, nextOf, noticeOn, pointsOn, today, walkStops } from '../walk.js';

const mammals = STOPS.find((s) => s.id === 'mammals');

test('the day is the phone\'s own date', () => {
  assert.equal(today(new Date(2026, 10, 9, 23, 30)), '2026-11-09');
});

test('next follows the walk, and passes a stop the museum has closed that day', () => {
  assert.equal(nextOf('dinosaurs', 'full', '2026-11-09').id, 'mammals');
  assert.equal(nextOf('dinosaurs', 'full', '2026-11-11').id, 'darwin');
  assert.equal(nextOf('dinosaurs', 'full', '2026-11-13').id, 'mammals');
  assert.equal(nextOf('dinosaurs', 'short', '2026-11-09').id, 'darwin');
  assert.equal(nextOf('sequoia', 'short').id, 'sophie');
  assert.equal(nextOf('fern', 'full'), null);
  // Opened from a link though not on the Highlights walk: carries on to the next Highlights stop.
  assert.equal(nextOf('treasures', 'short').id, 'vault');
});

test('a closure notice shows until its last day, then goes', () => {
  assert.ok(!closedOn(mammals, '2026-11-09'));
  assert.ok(closedOn(mammals, '2026-11-10') && closedOn(mammals, '2026-11-12'));
  assert.ok(noticeOn(mammals, '2026-11-09') && noticeOn(mammals, '2026-11-12'));
  assert.equal(noticeOn(mammals, '2026-11-13'), '');
  assert.deepEqual(pointsOn(['always', { text: 'until Friday', until: '2026-11-13' }], '2026-11-14'), ['always']);
});

test('an unknown walk falls back to the full walk', () => {
  assert.equal(walkStops('nonsense').length, STOPS.length);
});
