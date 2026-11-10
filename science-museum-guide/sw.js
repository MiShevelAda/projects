// Offline support for First Walk.
//
// The page and its code are fetched fresh when there is signal and kept as a fallback, so an update
// arrives on the next visit with signal and the guide still opens with none. Recordings are kept in
// a cache of their own the first time they play (or all at once from "Save the walk for offline").
// A recording's file name is a hash of its words, so a kept one never goes out of date; files the
// manifest no longer lists are deleted when a new worker takes over.
//
// Every cache name starts with sm-walk-: all the apps share one origin, and this worker never
// touches a cache that is not its own. The audio cache name is also used by app.js (saveAll).
const SHELL = 'sm-walk-shell-v2';
const AUDIO = 'sm-walk-audio-v1';
const MINE = /^sm-walk-/;
const CORE = ['./', './index.html', './style.css', './app.js', './walk.js', './stops.js', './stories.js', './ask.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './audio/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (MINE.test(k) && k !== SHELL && k !== AUDIO) await caches.delete(k);
    try {
      const m = await (await fetch('./audio/manifest.json', { cache: 'no-cache' })).json();
      const keep = new Set(Object.values(m.stops).flatMap((x) => Object.values(x).map((c) => c.file)));
      const c = await caches.open(AUDIO);
      for (const r of await c.keys()) if (!keep.has(new URL(r.url).pathname.split('/').pop())) await c.delete(r);
    } catch { /* offline: tidy up next time */ }
    await self.clients.claim();
  })());
});

const isAudio = (url) => /\/audio\/[0-9a-f]{16}\.m4a$/.test(url.pathname);

// Safari asks for audio in byte ranges and expects a 206 back, so a whole cached file is cut to
// the range that was asked for.
async function ranged(req, res) {
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.byteLength;
  let start = m[1] === '' || m[1] == null ? NaN : Number(m[1]);
  let end = m[2] === '' || m[2] == null ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (Number.isNaN(start)) { start = Math.max(0, size - (Number(m[2]) || 0)); end = size - 1; } // bytes=-500
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mp4', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' },
  });
}

async function audio(req) {
  const c = await caches.open(AUDIO);
  let res = await c.match(req.url);
  if (!res) {
    // Fetch the whole file once (no range), keep it, then answer the range from it.
    const net = await fetch(req.url);
    if (!net.ok) return net;
    await c.put(req.url, net.clone());
    res = net;
  }
  return ranged(req, res);
}

async function shell(req) {
  try {
    const net = await fetch(req, { cache: 'no-cache' });
    if (net.ok) (await caches.open(SHELL)).put(req, net.clone());
    return net;
  } catch {
    return (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location.href).pathname)) return;
  e.respondWith(isAudio(url) ? audio(e.request) : shell(e.request));
});
