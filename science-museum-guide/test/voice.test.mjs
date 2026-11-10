// The narration: said properly, recorded for the current words, and lined up for the read-along.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { STOPS } from '../stops.js';
import { RESPELL, sayAs, sayYear } from '../tools/say-as.mjs';
import { KINDS, clipFile, spoken } from '../tools/voice.mjs';

const ROOT = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('audio/manifest.json', ROOT), 'utf8'));

test('years are said the way a British narrator says them', () => {
  assert.equal(sayYear(1891), 'eighteen ninety-one');
  assert.equal(sayYear(1905), 'nineteen oh five');
  assert.equal(sayYear(1900), 'nineteen hundred');
  assert.equal(sayYear(2004), 'two thousand and four');
  assert.equal(sayYear(2017), 'twenty seventeen');
  assert.equal(sayAs('in the 1930s'), 'in the nineteen thirties');
  assert.equal(sayAs('about 1,300 years'), 'about 1,300 years');
  assert.equal(sayAs('a moving T. rex'), 'a moving T-rex');
});

test('nothing reaches the voice that it would say wrong', () => {
  for (const s of STOPS) for (const k of KINDS) for (const p of spoken(s, k).map(sayAs)) {
    assert.ok(!/(?<![\d,.])(1\d{3}|20\d{2})(?![\d,.]\d)/.test(p), `${s.id}.${k}: a year in figures: ${p}`);
    for (const [word] of RESPELL) assert.ok(!p.includes(word), `${s.id}.${k}: "${word}" not respelled`);
  }
});

test('every stop has both recordings, made from its current words', () => {
  for (const s of STOPS) for (const k of KINDS) {
    const c = manifest.stops[s.id]?.[k];
    assert.ok(c, `${s.id}.${k}: no recording. Run: npm run audio`);
    assert.equal(c.file, clipFile(s, k), `${s.id}.${k}: the words changed since it was recorded. Run: npm run audio`);
    const f = new URL(`audio/${c.file}`, ROOT);
    assert.ok(existsSync(f), `${s.id}.${k}: ${c.file} missing`);
    assert.equal(statSync(f).size, c.bytes, `${s.id}.${k}: size differs from the manifest`);
    assert.ok(c.seconds > 3, `${s.id}.${k}: too short`);
  }
});

test('the read-along knows where every paragraph starts', () => {
  for (const s of STOPS) {
    const c = manifest.stops[s.id].story;
    assert.equal(c.starts.length, s.story.length + 1, `${s.id}: one start for the title and one per paragraph`);
    c.starts.forEach((t, i) => i && assert.ok(t > c.starts[i - 1], `${s.id}: starts must rise`));
    assert.ok(c.starts.at(-1) < c.seconds, `${s.id}: last paragraph starts after the end`);
  }
});
