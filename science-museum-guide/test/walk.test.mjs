// The walk's rules for the Science Museum: closures by kind, the museum-wide closed day, the early
// close, and the walks in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STOPS } from '../stops.js';
import { closedOn, findThings, hoursOn, nextOf, noticeOn, openState, timeCheck, walkMinutes, walkStops } from '../walk.js';

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

test('a walk\'s length is its stops\' minutes plus the walks between them, as the picker shows it', () => {
  assert.equal(walkMinutes([]), 0);
  assert.equal(walkMinutes([{ minutes: 10 }, { minutes: 5 }]), 10 + 5 + 3);
  // At opening on an ordinary day, the time check needs exactly the picker's length.
  for (const w of ['hour', 'two', 'three']) assert.equal(timeCheck(w, { d: at('2026-11-12T10:00:00Z') }).need, walkMinutes(walkStops(w)), w);
});

test('find something: titles, Look For items and chapter titles from every stop, on any walk', () => {
  assert.deepEqual(findThings(''), []);
  assert.deepEqual(findThings('h'), [], 'one letter finds nothing yet');
  for (const s of STOPS) {
    assert.ok(findThings(s.title).some((r) => r.kind === 'title' && r.stop === s), `${s.id}: title`);
    s.look.forEach((l, i) => assert.ok(findThings(l).some((r) => r.kind === 'look' && r.stop === s && r.i === i), `${s.id}: look ${i}`));
  }
  // Harrison's H5 is not on the 2-hour walk, and is found all the same.
  assert.ok(!walkStops('two').some((s) => s.id === 'clockmakers'));
  assert.ok(findThings('h5').some((r) => r.stop.id === 'clockmakers' && r.kind === 'look'));
  assert.ok(findThings('VIMY').some((r) => r.stop.id === 'flight'), 'case does not count');
});
