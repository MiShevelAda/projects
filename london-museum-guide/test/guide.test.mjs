// The guide's words and walks: every stop complete, both walks valid, the house style kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CHECKED, PRACTICAL, STOPS, WALKS } from '../stops.js';

const ROOT = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const ZONES = new Set(['outside', 'blue', 'green', 'red', 'orange']);
const FLOORS = new Set(['out', 'G', '1', '2']);

test('every stop has what the screen and the voice need', () => {
  const ids = new Set();
  for (const s of STOPS) {
    assert.ok(/^[a-z-]+$/.test(s.id) && !ids.has(s.id), `bad or repeated id ${s.id}`);
    ids.add(s.id);
    assert.ok(ZONES.has(s.zone), `${s.id}: zone`);
    for (const k of ['title', 'place', 'find']) assert.ok(s[k]?.length > 3, `${s.id}: ${k}`);
    assert.ok(s.minutes > 0, `${s.id}: minutes`);
    assert.ok(FLOORS.has(s.floor), `${s.id}: floor`);
    assert.ok(s.arrive?.length > 10, `${s.id}: how you know you have arrived`);
    assert.ok(!s.walking || (Array.isArray(s.walking) && s.walking.length <= 2), `${s.id}: walking is one or two paragraphs`);
    assert.ok(s.look.length >= 1 && s.look.length <= 4, `${s.id}: one to four things to look for`);
    assert.ok(s.story.length >= 2, `${s.id}: a story of at least two paragraphs`);
    assert.ok(s.sources.length >= 1 && s.sources.every((x) => x.url.startsWith('https://') && x.label), `${s.id}: sources`);
    if (s.pic) assert.ok(existsSync(new URL(s.pic.src, ROOT)) && s.pic.credit && s.pic.license && s.pic.page.startsWith('https://commons.wikimedia.org/'), `${s.id}: a photo needs its file, credit, licence and source page`);
    if (s.chapters) assert.ok(s.chapters.length === s.story.length && s.chapters.every((c) => c && c.split(/\s+/).length <= 7), `${s.id}: one short chapter title per paragraph`);
    for (const p of s.pics || []) {
      assert.ok(existsSync(new URL(p.src, ROOT)) && p.credit && p.license && p.page.startsWith('https://commons.wikimedia.org/'), `${s.id}: photo ${p.src} needs its file, credit, licence and source page`);
      assert.ok((p.look != null && p.look < s.look.length) || (p.chapter != null && p.chapter < s.story.length), `${s.id}: photo ${p.src} must belong to a Look For item or a chapter that exists`);
    }
    if (s.video) assert.ok(/^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)/.test(s.video.url) && s.video.title && s.video.channel, `${s.id}: a video needs a YouTube link, title and channel`);
    if (s.notice) assert.ok(s.notice.text && /^\d{4}-\d\d-\d\d$/.test(s.notice.until), `${s.id}: a notice needs text and an end date`);
  }
});

test('both walks use real stops, in the order of the full walk, starting outside', () => {
  for (const [k, w] of Object.entries(WALKS)) {
    const at = w.ids.map((id) => STOPS.findIndex((s) => s.id === id));
    assert.ok(at.every((i) => i >= 0), `${k}: unknown stop`);
    assert.deepEqual([...at].sort((a, b) => a - b), at, `${k}: out of order`);
    assert.equal(w.ids[0], 'building', `${k}: starts outside`);
    assert.ok(w.name, `${k}: name`);
  }
  assert.equal(WALKS.three.ids.length, STOPS.length);
});

test('a story is a few minutes, to listen to standing or walking', () => {
  for (const s of STOPS) {
    const words = s.story.join(' ').split(/\s+/).length;
    // Up to about two thirds of the time at a stop is narrated, at about 140 spoken words a minute.
    assert.ok(words >= 150 && words <= s.minutes * 95, `${s.id}: ${words} words for ${s.minutes} minutes`);
  }
});

test('house style: no em dashes, no impersonation, and the guide says it is unofficial', () => {
  for (const f of ['stops.js', 'app.js', 'walk.js', 'index.html', 'style.css', 'README.md', 'manifest.webmanifest', 'JOBS.md']) {
    const t = read(f);
    assert.ok(!t.includes('—'), `${f}: em dash`);
    assert.ok(!/attenborough/i.test(t), `${f}: names a real narrator; the voice is in his style of documentary, not him`);
  }
  assert.match(read('app.js'), /unofficial/i);
  assert.match(read('index.html'), /unofficial/i);
  assert.ok(CHECKED && PRACTICAL.length);
});
