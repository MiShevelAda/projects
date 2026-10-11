// Offline support. The pose engine and model are cached when the service worker installs (and on
// first use, for anything else), and served from the cache after that; the page and its code are
// fetched fresh when online, cached as a fallback.
//
// bfc- prefix + this app's version + MediaPipe Tasks Vision version + first 8 characters of the
// model sha256, both from NOTICE.md. Change it whenever anything in vendor/ or models/ changes, so
// old engine files are dropped together. (test/sw.test.mjs fails if it falls out of step.)
const CACHE = 'bfc-v2-mp0.10.35-4eaa5eb7';
// Every file the page needs offline. The clips (.mp4) are left to the network on purpose (see the
// fetch handler); their posters are here, so Getting Ready (the setup guide) and Learn (the Camera app
// clip) look the same offline.
const CORE = ['./', './index.html', './app.js', './fit.js', './ui.js', './manifest.webmanifest', './icons/icon-192.png', './assets/setup-guide-poster.jpg', './assets/how-to-poster.jpg',
  './vendor/mediapipe/vision_bundle.mjs', './assets/voice/manifest.json'];

// Video and sound other than the voice clips below, among them the setup guide
// (./assets/setup-guide.mp4), are never cached: the browser asks for them in byte ranges, Safari
// expects a ranged answer (206) back, and this worker does not cut ranges out of cached files, so they
// always come from the network.
const MEDIA = /\.(mp4|m4a|mp3)$/;

// The coach's recorded voice (assets/voice/, tools/voice/build-voice.mjs) has a cache of its own, so
// a new engine does not drop the clips and new clips do not touch the engine. Each clip's name is a
// hash of its words, so a cached clip never goes out of date: the clips are served from this cache
// first. The ones a first check needs (pre: true in the manifest: every instruction, and every
// sentence of a result that has no number in it) are cached when the worker installs; the rest (the
// sentences with a number, one clip for each value) are cached the first time they are played. Clips
// the manifest no longer lists are deleted when a new worker takes over.
const VOICE_CACHE = 'bfc-voice-v1';
const VOICE = './assets/voice/';
const isClip = (url) => url.pathname.includes('/assets/voice/') && /\/[0-9a-f]{16}\.m4a$/.test(url.pathname);
async function voiceManifest() {
  const res = await fetch(`${VOICE}manifest.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}
async function precacheVoice() {
  const m = await voiceManifest();
  const c = await caches.open(VOICE_CACHE);
  const want = (m.clips || []).filter((x) => x.pre).map((x) => VOICE + x.file);
  const have = new Set((await c.keys()).map((r) => new URL(r.url).pathname));
  // In small groups: one failed clip only leaves its group to be cached on use.
  const todo = want.filter((f) => !have.has(new URL(f, self.location.href).pathname));
  for (let i = 0; i < todo.length; i += 20) await c.addAll(todo.slice(i, i + 20)).catch(() => { /* cached on use */ });
}
async function pruneVoice() {
  const m = await voiceManifest();
  const keep = new Set((m.clips || []).map((x) => x.file));
  const c = await caches.open(VOICE_CACHE);
  for (const r of await c.keys()) if (!keep.has(new URL(r.url).pathname.split('/').pop())) await c.delete(r);
}

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
    .then(() => precacheVoice().catch(() => { /* cached on use */ }))
    .then(() => self.skipWaiting()));
});

// Every app on mishevelada.github.io shares this origin's cache storage, so only this app's own
// old caches (the bfc- prefix) are ever deleted.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('bfc-') && k !== CACHE && k !== VOICE_CACHE).map((k) => caches.delete(k))))
    .then(() => pruneVoice().catch(() => { /* next time */ }))
    .then(() => self.clients.claim()));
});

// The page asks on each visit (app.js, registerWorker), so clips added after this worker installed
// (new or reworded lines, with sw.js itself unchanged) are cached too, and old ones dropped.
self.addEventListener('message', (e) => {
  if (e.data === 'bfc-voice') e.waitUntil(precacheVoice().then(pruneVoice).catch(() => { /* next visit */ }));
});

const keep = (req, res) => {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // A voice clip: from its cache, else the network, then kept. The app fetches clips whole (app.js,
  // Clips); a request for a byte range (an <audio> or <video> element asking for part of a file) is
  // left to the network, because this worker does not cut ranges out of cached files.
  if (isClip(url) && !req.headers.has('range')) {
    e.respondWith(caches.open(VOICE_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (MEDIA.test(url.pathname)) return; // range requests: leave them to the network (MEDIA, above)
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
