// The walk's rules for the Science Museum: closures by kind, the museum-wide closed day, the early
// close, and the walks in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, hoursOn, nextOf, noticeOn, openState, timeCheck, walkStops } from '../walk.js';

const at = (iso) => new Date(iso);
const byId = (id) => STOPS.find((s) => s.id === id);

test('the museum is closed all day on 11 November, and closes early on 26 November', () => {
  assert.equal(openState(at('2026-11-11T12:00:00Z')).state, 'closed-day');
  assert.equal(openState(at('2026-11-10T12:00:00Z')).state, 'open');
  assert.equal(hoursOn('2026-11-26').close, '17:00');
  assert.equal(openState(at('2026-11-26T17:10:00Z')).state, 'after');
  assert.equal(openState(at('2026-11-27T17:10:00Z')).state, 'open');
});

test('only a full closure makes the walk pass a stop by; late openings and partial closures are shown', () => {
  assert.ok(closedOn(byId('flight'), '2026-11-19'));
  assert.ok(!closedOn(byId('flight'), '2026-11-18'));
  assert.equal(nextOf('space', 'three', { day: '2026-11-19' }).id, 'energy-revolution');
  assert.equal(nextOf('energy-revolution', 'three', { day: '2026-11-19' }).id, 'clockmakers');
  assert.ok(!closedOn(byId('information-age'), '2026-11-10') && /13:00/.test(noticeOn(byId('information-age'), '2026-11-10')));
  assert.ok(!closedOn(byId('engineers'), '2026-11-17') && /wind-turbine/.test(noticeOn(byId('engineers'), '2026-11-17')));
  assert.ok(/Ages of Invention/.test(noticeOn(byId('wells-clock'), '2026-11-09')));
  assert.equal(noticeOn(byId('flight'), '2026-11-20'), '');
});

test('the walks run from the Energy Hall to the exit, and a late start offers a shorter one', () => {
  assert.deepEqual(walkStops('hour').map((s) => s.id), ['energy-hall', 'space', 'flight', 'watt-workshop']);
  assert.equal(walkStops('three').length, STOPS.length);
  const late = timeCheck('three', { d: at('2026-11-12T15:00:00Z') });
  assert.ok(late.short && late.shorter);
});
