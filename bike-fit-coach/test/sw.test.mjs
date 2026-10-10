// The service worker's cache name has to change whenever the vendored engine or the model does,
// and it must never delete another app's cache on the shared mishevelada.github.io origin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');

test('the cache name carries the engine version and the model hash from NOTICE.md', async () => {
  const sw = await read('sw.js'), notice = await read('NOTICE.md');
  const version = notice.match(/MediaPipe Tasks Vision (\d+\.\d+\.\d+)/)?.[1];
  const sha = notice.match(/sha256\s*`([0-9a-f]{64})`/)?.[1];
  assert.ok(version, 'no MediaPipe version in NOTICE.md');
  assert.ok(sha, 'no model sha256 in NOTICE.md');
  const cache = sw.match(/const CACHE = '([^']+)'/)?.[1];
  assert.ok(cache, 'no CACHE constant in sw.js');
  assert.ok(cache.startsWith('bfc-'), cache);
  assert.ok(cache.includes(`mp${version}`), `${cache} does not name MediaPipe ${version}`);
  assert.ok(cache.includes(sha.slice(0, 8)), `${cache} does not carry the model hash ${sha.slice(0, 8)}`);
});

test('activation deletes only this app\'s own old caches', async () => {
  const sw = await read('sw.js');
  const activate = sw.slice(sw.indexOf("addEventListener('activate'"), sw.indexOf("addEventListener('fetch'"));
  assert.match(activate, /startsWith\('bfc-'\)/);
  assert.match(activate, /k !== CACHE/);
});

test('only a page load falls back to index.html', async () => {
  const sw = await read('sw.js');
  const code = sw.split('\n').filter(l => !/^\s*\/\//.test(l));
  const uses = code.filter(l => l.includes("caches.match('./index.html')"));
  assert.ok(uses.length >= 1);
  for (const l of uses) assert.match(l, /req\.mode === 'navigate'/, l.trim());
});

test('engine and model files are served from one cache generation', async () => {
  const sw = await read('sw.js');
  assert.match(sw, /includes\('\/vendor\/'\)/);
  assert.match(sw, /includes\('\/models\/'\)/);
});

test('the engine and the model are cached when the worker installs, not only on the second visit', async () => {
  const { access } = await import('node:fs/promises');
  const sw = await read('sw.js');
  const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
  assert.match(install, /engineFiles\(\)/);
  assert.match(install, /addAll\(CORE\)\.then\(/, 'CORE first, and a CORE failure still fails the install');
  // Every file it may ask for exists, or addAll would fail.
  const model = sw.match(/const MODEL = '([^']+)'/)[1];
  const names = [...sw.matchAll(/'(vision_wasm[a-z_]*internal)'/g)].map(m => m[1]);
  assert.deepEqual(names.sort(), ['vision_wasm_internal', 'vision_wasm_nosimd_internal']);
  for (const f of [model, ...names.flatMap(n => [`vendor/mediapipe/wasm/${n}.js`, `vendor/mediapipe/wasm/${n}.wasm`])]) {
    await access(new URL(`../${f.replace(/^\.\//, '')}`, import.meta.url));
  }
  // The SIMD test is MediaPipe's own, so it picks the build the page loads.
  const bundle = await read('vendor/mediapipe/vision_bundle.mjs');
  const probe = sw.match(/SIMD_PROBE = new Uint8Array\(\[([^\]]+)\]\)/)[1].replace(/\s/g, '');
  assert.ok(bundle.replace(/\s/g, '').includes(`newUint8Array([${probe}])`), 'the SIMD probe differs from the bundle');
  // And the page registers the worker only after the model has loaded.
  const app = await read('app.js');
  const boot = app.slice(app.indexOf('async function boot()'));
  assert.ok(boot.indexOf('landmarker = await loadPose()') < boot.lastIndexOf('registerWorker();'));
});

test('the setup guide and the sound check: the poster is cached, the video and the clips are left to the network', async () => {
  const { access } = await import('node:fs/promises');
  const sw = await read('sw.js');
  const core = sw.slice(sw.indexOf('const CORE = ['), sw.indexOf('];', sw.indexOf('const CORE = [')));
  assert.match(core, /'\.\/assets\/setup-guide-poster\.jpg'/);
  // Media is asked for in byte ranges, which a cached copy is not cut to, so it is never cached.
  const media = new RegExp(sw.match(/const MEDIA = \/(.+)\/;/)[1]);
  const files = ['assets/setup-guide.mp4', 'assets/voice/sound-check.m4a', 'assets/voice/sound-check.mp3'];
  for (const f of files) {
    assert.ok(sw.includes(`./${f}`), `sw.js does not name ${f}`);
    assert.ok(media.test(`/projects/bike-fit-coach/${f}`), `${f} is not left to the network`);
    assert.ok(!core.includes(f), `${f} is in CORE`);
  }
  const fetchHandler = sw.slice(sw.indexOf("addEventListener('fetch'"));
  assert.ok(fetchHandler.indexOf('if (MEDIA.test(url.pathname)) return;') < fetchHandler.indexOf('respondWith'));
  for (const f of [...files, 'assets/setup-guide-poster.jpg']) await access(new URL(`../${f}`, import.meta.url));
});
