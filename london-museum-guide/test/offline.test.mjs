// Offline and the shared origin: the service worker's files exist, every cache and saved setting
// carries this app's prefix, and nothing links outside the app's own folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { MUSEUM } from '../stops.js';

const ROOT = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const sw = read('sw.js'), app = read('app.js'), html = read('index.html');

test('every file the service worker keeps for offline exists', () => {
  const core = JSON.parse(sw.match(/const CORE = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  for (const f of core) if (f !== './') assert.ok(existsSync(new URL(f, ROOT)), `${f} is in CORE but missing`);
  for (const f of ['app.js', 'walk.js', 'stops.js', 'stories.js', 'style.css']) assert.ok(core.includes(`./${f}`), `${f} not kept offline`);
});

test('caches and saved settings carry the app prefix, and the worker deletes only its own', () => {
  const key = MUSEUM.key;
  assert.match(key, /^[a-z]+-[a-z]+-$/);
  for (const name of sw.match(/const (SHELL|AUDIO) = '([^']+)'/g)) assert.ok(name.includes(`'${key}`), `${name} lacks ${key}`);
  assert.ok(sw.includes(`const MINE = /^${key}/`), 'the worker must recognise only its own caches');
  assert.match(sw, /MINE\.test\(k\)/);
  assert.equal(sw.match(/const AUDIO = '([^']+)'/)[1], `${key}audio-v1`, 'app.js saves the walk into the cache the worker reads');
  assert.match(app, /const KEY = MUSEUM.key/);
  assert.ok(!/localStorage\.(get|set)Item\((?!KEY)/.test(app), 'a localStorage key without the prefix');
});

test('links stay inside the app folder', () => {
  for (const [f, t] of [['index.html', html], ['app.js', app]]) {
    assert.ok(!/(href|src)="\//.test(t), `${f}: a root-relative link breaks under /projects/<folder>/`);
  }
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
});
