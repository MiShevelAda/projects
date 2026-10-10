// Offline support. The pose engine and model are cached on first use and served from the cache
// after that; the page and its code are fetched fresh when online, cached as a fallback.
//
// bfc- prefix + this app's version + MediaPipe Tasks Vision version + first 8 characters of the
// model sha256, both from NOTICE.md. Change it whenever anything in vendor/ or models/ changes, so
// old engine files are dropped together. (test/sw.test.mjs fails if it falls out of step.)
const CACHE = 'bfc-v2-mp0.10.35-4eaa5eb7';
const CORE = ['./', './index.html', './app.js', './fit.js', './manifest.webmanifest', './icons/icon-192.png', './vendor/mediapipe/vision_bundle.mjs'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
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
