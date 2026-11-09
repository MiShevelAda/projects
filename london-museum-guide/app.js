// First Walk: an unofficial audio and text guide to the Natural History Museum, London.
//
// Three screens, chosen by the address: #route (or none) the route, #<stop id> one stop, #before-you-go.
// Plain #names only, so a stop can be bookmarked or sent, and the address survives hosts that pass
// nothing but a plain #name through.
// Each stop has two recordings (audio/manifest.json, made by tools/build-audio.mjs):
//   way    the way there, a few sentences, played on its own when the story before it ends
//   story  the narration, which waits for a tap, the headphones or the lock screen, so it never starts
//          before the visitor is standing in front of the thing it is about.
// One <audio> element plays everything: unlike Web Audio it plays with the iPhone's silent switch
// on, carries on with the screen locked, and shows on the lock screen.

import { CHECKED, STOPS, PRACTICAL, WALKS } from './stops.js';
import { closedOn, nextOf as nextIn, noticeOn, pointsOn, walkStops as walkOf } from './walk.js';

const KEY = 'nhm-walk-'; // every saved setting carries this prefix: all the apps share one origin
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* private mode: forget it */ } },
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.2-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/></svg>',
};
const RATES = [1, 1.15, 0.9];
const clock = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const mins = (s) => `${Math.max(1, Math.round(s / 60))} min`;

const audio = $('#audio');
const state = {
  walk: WALKS[store.get('walk', 'full')] ? store.get('walk', 'full') : 'full',
  seen: store.get('seen', {}),
  found: store.get('found', {}),
  rate: RATES.includes(store.get('rate', 1)) ? store.get('rate', 1) : 1,
  now: null,      // { id, kind } loaded in the player
  ended: false,   // the loaded recording played to its end
};
let manifest = { stops: {} };

const walkStops = (walk = state.walk) => walkOf(walk);
const nextOf = (id, walk = state.walk) => nextIn(id, walk);
const byId = (id) => STOPS.find((s) => s.id === id);
const clip = (id, kind) => manifest.stops[id]?.[kind];

// ── player ────────────────────────────────────────────────────────────────────────────────────

function load(id, kind) {
  const c = clip(id, kind);
  if (!c) return false;
  if (state.now?.id !== id || state.now?.kind !== kind) {
    state.now = { id, kind };
    state.ended = false;
    audio.src = `audio/${c.file}`;
    audio.defaultPlaybackRate = audio.playbackRate = state.rate;
    mediaSession();
  }
  return true;
}

async function play(id, kind) {
  if (!load(id, kind)) { toast('This recording is missing. The words are all on the screen.'); return; }
  if (state.ended) { audio.currentTime = 0; state.ended = false; }
  try { await audio.play(); } catch { toast('Tap play to start the sound. If you still hear nothing, turn the volume up.'); }
}

function toggle() {
  if (!state.now) return;
  // After the way there has played, the next press is "I'm here": the story.
  if (state.ended && state.now.kind === 'way') return play(state.now.id, 'story');
  if (audio.paused) play(state.now.id, state.now.kind); else audio.pause();
}

function skip(sec) {
  if (!state.now) return;
  audio.currentTime = Math.min(Math.max(0, audio.currentTime + sec), (audio.duration || clip(state.now.id, state.now.kind).seconds) - 0.1);
}

function setRate() {
  state.rate = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length];
  store.set('rate', state.rate);
  audio.defaultPlaybackRate = audio.playbackRate = state.rate;
  paint();
}

function markSeen(id) { state.seen[id] = true; store.set('seen', state.seen); }

let advance = null;
audio.addEventListener('ended', () => {
  state.ended = true;
  const { id, kind } = state.now;
  if (kind === 'story') {
    markSeen(id);
    const nx = nextOf(id);
    if (nx && clip(nx.id, 'way')) {
      // A breath, then the way to the next stop; the screen follows the voice.
      clearTimeout(advance);
      advance = setTimeout(() => {
        if (state.now?.id !== id || !audio.paused) return;
        if (location.hash === `#${id}`) location.hash = `#${nx.id}`;
        play(nx.id, 'way');
      }, 2000);
    }
  }
  paint();
});
for (const ev of ['play', 'pause', 'loadedmetadata', 'ratechange']) audio.addEventListener(ev, () => { paint(); mediaState(); });
audio.addEventListener('timeupdate', () => { paintTime(); });
audio.addEventListener('error', () => { if (state.now) toast('The sound did not load. With no signal, the words are all on the screen.'); });

function mediaSession() {
  if (!('mediaSession' in navigator) || !state.now) return;
  const s = byId(state.now.id);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: state.now.kind === 'way' ? `The way to ${s.title}` : s.title,
    artist: 'First Walk', album: 'Natural History Museum, unofficial guide',
    artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
  const ms = navigator.mediaSession;
  const set = (a, f) => { try { ms.setActionHandler(a, f); } catch { /* not on this phone */ } };
  set('play', () => toggle());
  set('pause', () => audio.pause());
  set('seekbackward', () => skip(-15));
  set('seekforward', () => skip(15));
  set('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
  set('nexttrack', () => {
    if (state.now.kind === 'way') return play(state.now.id, 'story');
    const nx = nextOf(state.now.id); if (nx) { location.hash = `#${nx.id}`; play(nx.id, 'way'); }
  });
  set('previoustrack', () => { audio.currentTime = 0; });
}
function mediaState() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  try { if (audio.duration) navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate }); } catch { /* old phone */ }
}

// ── screens ───────────────────────────────────────────────────────────────────────────────────

const main = $('#main');

function route() {
  const name = location.hash.slice(1);
  if (byId(name)) return stopView(byId(name));
  if (name === 'before-you-go') return infoView();
  return homeView();
}

function homeView() {
  const list = walkStops();
  const first = list.find((s) => !state.seen[s.id] && !closedOn(s));
  const started = list.some((s) => state.seen[s.id]);
  const total = list.reduce((a, s) => a + s.minutes, 0);
  main.innerHTML = `
    <header class="hero">
      <h1>The Natural History Museum, on foot</h1>
      <p class="lead">The must-sees for a first visit, in walking order. At each one: where to look, and a story to listen to.</p>
      <div class="choose" role="radiogroup" aria-label="Which walk">
        ${Object.entries(WALKS).map(([k, w]) => `<button role="radio" aria-checked="${k === state.walk}" data-walk="${k}"><strong>${esc(w.name)}</strong><span>${w.ids.length} stops, ${esc(w.time)}</span></button>`).join('')}
      </div>
      ${first ? `<a class="primary" href="#${first.id}" data-start="${first.id}">${started ? `Carry on: ${esc(first.title)}` : 'Start the walk'}<small>${started ? `Stop ${list.indexOf(first) + 1}` : 'Begins outside, on Cromwell Road'}</small></a>`
        : `<a class="primary" href="#before-you-go">You have seen them all<small>Before you go</small></a>`}
    </header>
    <ol class="route" aria-label="The stops, about ${Math.round(total / 15) / 4} hours">
      ${list.map((s, i) => `<li class="${state.seen[s.id] ? 'seen' : ''} ${s === first && started ? 'here' : ''} ${closedOn(s) ? 'closed' : ''}" data-zone="${s.zone}">
        <a href="#${s.id}"><span class="num">${state.seen[s.id] ? '<span class="vh">Seen. Stop </span>' : '<span class="vh">Stop </span>'}${i + 1}</span>
        <span class="body"><strong>${esc(s.title)}</strong><span>${closedOn(s) ? 'Closed today, the walk goes past it' : esc(s.place)}</span></span><span class="mins">${s.minutes} min</span></a></li>`).join('')}
    </ol>
    <div class="after">
      <a class="quiet" href="#before-you-go">Before you go: hours, entrances, tips</a>
    </div>
    <p class="footnote">An unofficial guide, not made by or connected to the Natural History Museum. Check the museum's own website for today's opening times and closures.</p>`;
  main.querySelectorAll('[data-walk]').forEach((b) => b.addEventListener('click', () => { state.walk = b.dataset.walk; store.set('walk', state.walk); homeView(); }));
  const start = main.querySelector('[data-start]');
  // Starting from the route plays the way to the first stop, inside the tap.
  start?.addEventListener('click', () => { if (!state.seen[start.dataset.start]) play(start.dataset.start, 'way'); });
}

function stopView(s) {
  const list = walkStops();
  const pos = list.indexOf(s);
  const nx = nextOf(s.id);
  const found = new Set(state.found[s.id] || []);
  const story = clip(s.id, 'story');
  main.innerHTML = `
    <nav class="top"><a href="#route">Route</a><span>${pos >= 0 ? `Stop ${pos + 1} of ${list.length}` : 'Not on this walk'}</span></nav>
    <div data-zone="${s.zone}">
      <h1>${esc(s.title)}</h1>
      <p class="place">${esc(s.place)}</p>
      ${noticeOn(s) ? `<p class="notice" role="note">${closedOn(s) ? '<strong>Closed today.</strong> ' : ''}${esc(noticeOn(s))}</p>` : ''}
      <section class="find" aria-label="Find it">
        <p>${esc(s.find)}</p>
        ${clip(s.id, 'way') ? '<button class="quiet" data-way>Hear the way</button>' : ''}
      </section>
    </div>
    <section class="player" aria-label="Listen">
      <div class="row">
        <button class="play" data-play aria-label="Play the story"></button>
        <div class="what" data-what>The story<span>${story ? mins(story.seconds) : 'Not recorded yet'}</span></div>
      </div>
      <input class="scrub" type="range" min="0" max="${story ? story.seconds : 0}" step="0.5" value="0" aria-label="Position in the recording" data-scrub>
      <div class="times"><span data-t>0:00</span><span data-left>${story ? `-${clock(story.seconds)}` : ''}</span></div>
      <div class="controls">
        <button class="quiet" data-skip="-15" aria-label="Back 15 seconds">Back 15</button>
        <button class="quiet" data-rate aria-label="Speed">${state.rate}×</button>
        <button class="quiet" data-skip="15" aria-label="Forward 15 seconds">Forward 15</button>
      </div>
    </section>
    <section class="look">
      <h2>Look for</h2>
      <ul>${s.look.map((l, i) => `<li><button aria-pressed="${found.has(i)}" data-look="${i}"><span class="box" aria-hidden="true"></span><span>${esc(l)}</span></button></li>`).join('')}</ul>
      <p class="hint">Tap each one when you have found it.</p>
    </section>
    <section class="story" aria-label="The story, to read">
      <h2>The story</h2>
      ${s.story.map((p, i) => `<p data-p="${i}">${esc(p)}</p>`).join('')}
    </section>
    ${s.sources?.length ? `<details class="sources"><summary>Where these facts come from</summary><ul>${s.sources.map((u) => `<li><a href="${esc(u.url)}" rel="noopener" target="_blank">${esc(u.label)}</a></li>`).join('')}</ul></details>` : ''}
    <div class="next">
      ${nx ? `<a class="primary" href="#${nx.id}" data-next="${nx.id}">Next: ${esc(nx.title)}<small>Plays the way there</small></a>`
        : `<a class="primary" href="#before-you-go" data-last>That is the walk<small>Before you go</small></a>`}
    </div>`;
  main.querySelector('[data-play]').addEventListener('click', () => {
    if (state.now?.id === s.id && state.now.kind === 'story' && !state.ended) toggle(); else play(s.id, 'story');
  });
  main.querySelector('[data-way]')?.addEventListener('click', () => play(s.id, 'way'));
  main.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => {
    if (state.now?.id !== s.id) load(s.id, 'story');
    skip(Number(b.dataset.skip));
  }));
  main.querySelector('[data-rate]').addEventListener('click', setRate);
  const scrub = main.querySelector('[data-scrub]');
  scrub.addEventListener('input', () => {
    if (state.now?.id !== s.id || state.now.kind !== 'story') load(s.id, 'story');
    audio.currentTime = Number(scrub.value);
  });
  main.querySelectorAll('[data-look]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.look);
    found.has(i) ? found.delete(i) : found.add(i);
    state.found[s.id] = [...found]; store.set('found', state.found);
    b.setAttribute('aria-pressed', String(found.has(i)));
  }));
  // Tap a paragraph to hear it from there.
  main.querySelectorAll('[data-p]').forEach((p) => p.addEventListener('click', () => {
    const at = story?.starts?.[Number(p.dataset.p) + 1];
    if (at == null) return;
    if (!(state.now?.id === s.id && state.now.kind === 'story')) load(s.id, 'story');
    audio.currentTime = at;
    if (audio.paused) play(s.id, 'story');
  }));
  main.querySelector('[data-next]')?.addEventListener('click', () => { markSeen(s.id); play(nx.id, 'way'); });
  main.querySelector('[data-last]')?.addEventListener('click', () => markSeen(s.id));
}

function infoView() {
  const total = Object.values(manifest.stops).reduce((a, x) => a + (x.story?.bytes || 0) + (x.way?.bytes || 0), 0);
  main.innerHTML = `
    <nav class="top"><a href="#route">Route</a><span></span></nav>
    <h1>Before you go</h1>
    <div class="info">
      ${PRACTICAL.map((p) => ({ ...p, points: pointsOn(p.points) })).filter((p) => p.points.length).map((p) => `<section><h2>${esc(p.title)}</h2><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}
      <section>
        <h2>No signal in the galleries?</h2>
        <p>Save every recording on this phone before you go in. It takes ${total ? `about ${Math.ceil(total / 1e6)} MB` : 'a few megabytes'}.</p>
        <button class="quiet" data-save>Save the walk for offline</button>
        <p class="progress" data-progress role="status"></p>
      </section>
      <section>
        <h2>About this guide</h2>
        <p>Unofficial, and not made by or connected to the Natural History Museum. Galleries close and specimens move, so check the museum's own website on the day. Each fact in a story links to where it comes from.</p>
        <p>The narrator is a recorded computer voice, Kokoro-82M, made in advance so that it sounds the same on every phone and needs no signal.</p>
        <button class="text-btn" data-reset>Start the walk again from the beginning</button>
      </section>
      <p class="checked">Facts and practical details checked ${esc(CHECKED)}.</p>
    </div>`;
  main.querySelector('[data-save]').addEventListener('click', saveAll);
  main.querySelector('[data-reset]').addEventListener('click', () => {
    state.seen = {}; state.found = {}; store.set('seen', {}); store.set('found', {});
    toast('Your progress is cleared.'); location.hash = '#route';
  });
}

async function saveAll() {
  const out = main.querySelector('[data-progress]');
  const files = Object.values(manifest.stops).flatMap((x) => [x.way?.file, x.story?.file]).filter(Boolean);
  if (!('caches' in window)) { out.textContent = 'This browser cannot save the walk. It will play while you have signal.'; return; }
  try {
    const c = await caches.open('nhm-walk-audio-v1');
    let n = 0;
    for (const f of files) {
      const url = new URL(`audio/${f}`, location.href).href;
      if (!(await c.match(url))) { const r = await fetch(url); if (!r.ok) throw new Error(f); await c.put(url, r); }
      out.textContent = `Saved ${++n} of ${files.length}`;
    }
    out.textContent = 'Saved. The whole walk now plays without signal.';
  } catch { out.textContent = 'Saving stopped part way. Try again where the signal is better.'; }
}

// ── painting the player ───────────────────────────────────────────────────────────────────────

function paint() {
  const playing = !audio.paused && !state.ended;
  const here = byId(location.hash.slice(1)) ? location.hash.slice(1) : null;
  const p = main.querySelector('[data-play]');
  if (p) {
    const mine = state.now?.id === here && state.now?.kind === 'story';
    const on = mine && playing;
    p.innerHTML = on ? ICON.pause : ICON.play;
    p.setAttribute('aria-label', on ? 'Pause the story' : 'Play the story');
    const what = main.querySelector('[data-what]');
    const wayOn = state.now?.id === here && state.now?.kind === 'way' && playing;
    const story = clip(here, 'story');
    if (what) what.innerHTML = wayOn ? 'The way there<span>Playing now. Press play when you arrive.</span>'
      : `The story<span>${story ? mins(story.seconds) : 'Not recorded yet'}</span>`;
    const r = main.querySelector('[data-rate]'); if (r) r.textContent = `${state.rate}×`;
    const w = main.querySelector('[data-way]'); if (w) w.setAttribute('aria-pressed', String(wayOn));
  }
  // The dock shows what is playing on every screen except that stop's own.
  const dock = $('#dock');
  const show = state.now && state.now.id !== here && (playing || (!state.ended && audio.currentTime > 0) || (state.ended && state.now.kind === 'way'));
  dock.hidden = !show;
  if (show) {
    const s = byId(state.now.id);
    $('#dock-play').innerHTML = playing ? ICON.pause : ICON.play;
    $('#dock-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('#dock-link').href = `#${s.id}`;
    $('#dock-link').innerHTML = `${esc(s.title)}<span>${state.now.kind === 'way' ? (state.ended ? 'Press play when you arrive' : 'The way there') : 'The story'}</span>`;
  }
  paintTime();
}

function paintTime() {
  const here = byId(location.hash.slice(1)) ? location.hash.slice(1) : null;
  const mine = state.now?.id === here && state.now?.kind === 'story';
  const story = clip(here, 'story');
  const t = mine ? audio.currentTime : 0, d = (mine && audio.duration) || story?.seconds || 0;
  const scrub = main.querySelector('[data-scrub]');
  if (scrub && document.activeElement !== scrub) { scrub.max = d; scrub.value = t; }
  const tt = main.querySelector('[data-t]'); if (tt) tt.textContent = clock(t);
  const left = main.querySelector('[data-left]'); if (left && d) left.textContent = `-${clock(d - t)}`;
  // Read along: light the paragraph being spoken. starts[0] is the title, starts[i + 1] paragraph i.
  const box = main.querySelector('.story');
  if (box) {
    const live = mine && !audio.paused && !state.ended && story?.starts;
    box.classList.toggle('live', !!live);
    if (live) {
      let i = -1;
      story.starts.forEach((s, k) => { if (k > 0 && t >= s - 0.2) i = k - 1; });
      box.querySelectorAll('[data-p]').forEach((p) => p.classList.toggle('now', Number(p.dataset.p) === Math.max(0, i)));
    }
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}

$('#dock-play').addEventListener('click', toggle);

// On a change of screen, focus moves to the new screen so a screen reader starts reading there; on
// first load it stays put, so the first Tab still reaches "Skip to content".
function show(moved = true) {
  route();
  window.scrollTo(0, 0);
  if (moved) main.focus({ preventScroll: true });
  paint();
}
window.addEventListener('hashchange', () => show());

async function boot() {
  try { const r = await fetch('audio/manifest.json', { cache: 'no-cache' }); if (r.ok) manifest = await r.json(); } catch { /* offline with nothing cached: the text guide still works */ }
  show(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
