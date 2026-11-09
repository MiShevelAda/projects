// Offline and the shared origin: the service worker's files exist, every cache and saved setting
// carries this app's prefix, and nothing links outside the app's own folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const sw = read('sw.js'), app = read('app.js'), html = read('index.html');

test('every file the service worker keeps for offline exists', () => {
  const core = JSON.parse(sw.match(/const CORE = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  for (const f of core) if (f !== './') assert.ok(existsSync(new URL(f, ROOT)), `${f} is in CORE but missing`);
  for (const f of ['app.js', 'walk.js', 'stops.js', 'style.css']) assert.ok(core.includes(`./${f}`), `${f} not kept offline`);
});

test('caches and saved settings carry the app prefix, and the worker deletes only its own', () => {
  for (const name of sw.match(/'nhm-walk-[a-z]+-v\d+'/g)) assert.ok(name.startsWith("'nhm-walk-"));
  assert.match(sw, /MINE\.test\(k\)/);
  const audioCache = sw.match(/const AUDIO = '([^']+)'/)[1];
  assert.ok(app.includes(`'${audioCache}'`), 'app.js saves the walk into a different cache from the one the worker reads');
  assert.match(app, /const KEY = 'nhm-walk-'/);
  assert.ok(!/localStorage\.(get|set)Item\((?!KEY)/.test(app), 'a localStorage key without the prefix');
});

test('links stay inside the app folder', () => {
  for (const [f, t] of [['index.html', html], ['app.js', app]]) {
    assert.ok(!/(href|src)="\//.test(t), `${f}: a root-relative link breaks under /projects/<folder>/`);
  }
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
});
