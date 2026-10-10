// Offline support. The pose engine and model are cached when the service worker installs (and on
// first use, for anything else), and served from the cache after that; the page and its code are
// fetched fresh when online, cached as a fallback.
//
// bfc- prefix + this app's version + MediaPipe Tasks Vision version + first 8 characters of the
// model sha256, both from NOTICE.md. Change it whenever anything in vendor/ or models/ changes, so
// old engine files are dropped together. (test/sw.test.mjs fails if it falls out of step.)
const CACHE = 'bfc-v2-mp0.10.35-4eaa5eb7';
const CORE = ['./', './index.html', './app.js', './fit.js', './manifest.webmanifest', './icons/icon-192.png', './vendor/mediapipe/vision_bundle.mjs'];

// The engine and the model, about 20 MB. On the first visit the page loads them before this worker
// controls it, so caching them only on use left them out until the second visit. The page registers
// this worker only after the model has loaded (app.js), so the browser's own cache can answer these
// requests. That is not guaranteed: the headless test browser downloaded them a second time, once, on
// the first visit. Best effort: if they fail, CORE still installs and they are cached on use as before.
const MODEL = './models/pose_landmarker_full.task';
// MediaPipe's own test for WebAssembly SIMD (the same bytes as in vision_bundle.mjs), so this caches
// the engine build that the page will ask for.
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
async function engineFiles() {
  let simd = false;
  try { await WebAssembly.instantiate(SIMD_PROBE); simd = true; } catch { /* no SIMD: the other build */ }
  const n = simd ? 'vision_wasm_internal' : 'vision_wasm_nosimd_internal';
  return [`./vendor/mediapipe/wasm/${n}.js`, `./vendor/mediapipe/wasm/${n}.wasm`, MODEL];
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(CORE).then(() => engineFiles().then((files) => c.addAll(files)).catch(() => { /* cached on use */ })))
    .then(() => self.skipWaiting()));
});

// Every app on mishevelada.github.io shares this origin's cache storage, so only this app's own
// old caches (the bfc- prefix) are ever deleted.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('bfc-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const keep = (req, res) => {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\.mp4$/.test(url.pathname)) return; // video uses range requests; leave it to the network
  // Engine and model files (the .js glue, the .wasm, the bundle and the model) always come from the
  // same cache generation, so a phone never mixes new glue code with an old engine.
  if (url.pathname.includes('/vendor/') || url.pathname.includes('/models/') || /\.png$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res))));
    return;
  }
  e.respondWith(networkFirst(req));
});

// The network, unless it takes longer than 4 s (a design choice) or fails: then the cached copy if
// there is one, otherwise whatever the network gives in the end. Only a page load falls back to
// index.html; a failed script or file stays a failure rather than turning into a web page.
async function networkFirst(req) {
  const net = fetch(req).then((res) => keep(req, res));
  const timer = new Promise((resolve) => setTimeout(resolve, 4000, 'slow'));
  const first = await Promise.race([net.catch(() => 'failed'), timer]);
  if (first instanceof Response) return first;
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    return await net;
  } catch {
    const page = req.mode === 'navigate' ? await caches.match('./index.html') : null;
    return page || Response.error();
  }
}
