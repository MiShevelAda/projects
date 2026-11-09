// The walk's rules for the Science Museum: closures by kind, the museum-wide closed day, the early
// close, and the walks in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, hoursOn, nextOf, noticeOn, openState, timeCheck, walkStops } from '../walk.js';

const at = (iso) => new Date(iso);
const byId = (id) => STOPS.find((s) => s.id === id);

test('the usual hours hold on every day but Christmas: the guide is not tied to particular dates', () => {
  assert.equal(openState(at('2026-11-11T12:00:00Z')).state, 'open');
  assert.equal(hoursOn('2026-11-26').close, '18:00');
  assert.equal(openState(at('2026-11-26T17:10:00Z')).state, 'open');
  assert.equal(openState(at('2026-12-25T12:00:00Z')).state, 'closed-day');
});

test('only a full closure makes the walk pass a stop by; late openings and partial closures are shown', () => {
  // Made-up notices, so the rules are tested without tying the guide to real dates.
  const shut = { notices: [{ kind: 'closed', from: '2026-11-19', until: '2026-11-19', text: 'Closed all day.' }] };
  const late = { notices: [{ kind: 'late', from: '2026-11-10', until: '2026-11-10', text: 'Opens at 13:00.' }] };
  const part = { notices: [{ kind: 'partial', from: '2026-11-16', until: '2026-11-20', text: 'One game is closed.' }] };
  assert.ok(closedOn(shut, '2026-11-19') && !closedOn(shut, '2026-11-18'));
  assert.ok(!closedOn(late, '2026-11-10') && /13:00/.test(noticeOn(late, '2026-11-10')));
  assert.ok(!closedOn(part, '2026-11-17') && /game/.test(noticeOn(part, '2026-11-17')));
  assert.equal(noticeOn(shut, '2026-11-20'), '');
  assert.equal(nextOf('space', 'three', { day: '2026-11-19' }).id, 'energy-revolution');
  assert.ok(/Ages of Invention/.test(noticeOn(byId('wells-clock'), '2026-11-09')));
});

test('the walks run from the Energy Hall to the exit, and a late start offers a shorter one', () => {
  assert.deepEqual(walkStops('hour').map((s) => s.id), ['energy-hall', 'space', 'flight', 'watt-workshop']);
  assert.equal(walkStops('three').length, STOPS.length);
  const late = timeCheck('three', { d: at('2026-11-12T15:00:00Z') });
  assert.ok(late.short && late.shorter);
});
