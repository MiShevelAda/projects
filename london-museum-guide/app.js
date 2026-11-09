// First Walk: an unofficial audio and text guide to a London museum. Everything about the museum
// itself (its name, hours, stops and words) is in stops.js and stories.js; this file is the same for
// every museum.
//
// Two tabs and a pushed page, chosen by the address (plain #names, so a stop can be bookmarked):
//   #walk (or none)   how long have you got, today's hours, what is up next, the route
//   #visit            tickets, entrances, food, coats, closures, offline, about
//   #<stop id>        one stop: find it, play the story, look for, the story to read, next
// Each stop has two recordings (audio/manifest.json, made by tools/build-audio.mjs):
//   way    the way there and how you know you have arrived, played when the story before it ends
//   story  the narration, which waits for a tap, the headphones or the lock screen, so it never
//          starts before the visitor is standing in front of the thing it is about.
// One <audio> element plays everything: it plays with the iPhone's silent switch on, carries on
// with the screen locked, and shows on the lock screen.

import { CHECKED, HOURS, MUSEUM, PRACTICAL, STOPS, TICKETS_URL, WALKS, WALK_BETWEEN } from './stops.js';
import { closedOn, nextOf as nextIn, noticeOn, openState, pointsOn, timeCheck, upNext as upNextIn, walkStops as walkOf } from './walk.js';

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
  chev: '<svg class="chev" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const RATES = [1, 1.15, 0.9];
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const mins = (s) => `${Math.max(1, Math.round(s / 60))} min`;
const hrs = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

const audio = $('#audio');
const state = {
  walk: WALKS[store.get('walk', 'two')] ? store.get('walk', 'two') : 'two',
  seen: store.get('seen', {}),
  found: store.get('found', {}),
  later: store.get('later', []),
  rate: RATES.includes(store.get('rate', 1)) ? store.get('rate', 1) : 1,
  now: null,      // { id, kind } loaded in the player
  ended: false,   // the loaded recording played to its end
};
let manifest = { stops: {} };

const opts = () => ({ later: state.later, seen: state.seen });
const walkStops = () => walkOf(state.walk, state.later);
const nextOf = (id) => nextIn(id, state.walk, opts());
const upNext = () => upNextIn(state.walk, opts());
const byId = (id) => STOPS.find((s) => s.id === id);
const clip = (id, kind) => manifest.stops[id]?.[kind];
const here = () => (byId(location.hash.slice(1)) ? location.hash.slice(1) : null);

// Which chapter of a stop's story a moment in its recording falls in (0 before it starts).
// starts[0] is the spoken title, starts[i + 1] chapter i.
function chapterAt(id, t) {
  const st = clip(id, 'story')?.starts || [];
  let i = 0;
  st.forEach((s, k) => { if (k > 0 && t >= s - 0.2) i = k - 1; });
  return i;
}
// The player's headline is the chapter's own title, with where it sits in the story under it.
function chapterHead(s, k) {
  const story = clip(s.id, 'story');
  const n = s.story.length;
  const title = s.chapters?.[k] || s.title;
  return `<b>${esc(title)}</b><span>Chapter ${k + 1} of ${n}${story ? `, ${mins(story.seconds)}` : ', not recorded yet'}</span>`;
}

// The floors of the building, with this stop's floor lit (or a dot outside), for the pictures.
function floorsArt(stop) {
  const rows = [['2', 10], ['1', 40], ['G', 70]];
  const out = stop.floor === 'out';
  return `<svg class="floors" viewBox="0 0 132 104" aria-hidden="true">
    ${rows.map(([f, y]) => `<rect x="${out ? 34 : 16}" y="${y}" width="${out ? 92 : 100}" height="24" rx="7" class="${f === stop.floor ? 'on' : ''}"/><text x="${out ? 46 : 28}" y="${y + 17}" class="${f === stop.floor ? 'on' : ''}">${f}</text>`).join('')}
    ${out ? '<line class="ground" x1="4" y1="100" x2="128" y2="100"/><circle class="you" cx="16" cy="88" r="9"/>' : ''}
  </svg>`;
}
const rings = '<svg class="rings" viewBox="0 0 358 168" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="179" cy="84" r="150"/><circle cx="179" cy="84" r="108"/><circle cx="179" cy="84" r="70"/></svg>';
const floorName = (f) => ({ out: 'Outside', G: 'Ground floor', 1: 'First floor', 2: 'Second floor' }[f]);

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

function markSeen(id) {
  state.seen[id] = true; store.set('seen', state.seen);
  if (state.later.includes(id)) { state.later = state.later.filter((x) => x !== id); store.set('later', state.later); }
}

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
    artist: 'First Walk', album: `${MUSEUM.name}, unofficial guide`,
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
const dateLine = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

function route() {
  const name = location.hash.slice(1);
  document.body.classList.toggle('stop-open', !!byId(name));
  const tab = name === 'visit' ? 'visit' : 'walk';
  document.querySelectorAll('.tabbar a').forEach((a) => (a.dataset.tab === tab && !byId(name) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (byId(name)) return stopView(byId(name));
  if (name === 'visit') return visitView();
  return walkView();
}

// Today: open or not, closing time, and anything the museum has closed today.
function todayCard() {
  const st = openState();
  const pill = { open: '<span class="pill green">Open Now</span>', before: '<span class="pill amber">Opens at 10:00</span>', after: '<span class="pill">Closed for Today</span>', 'closed-day': '<span class="pill red">Closed Today</span>' }[st.state];
  const line = { open: `Closes at ${HOURS.close}, in ${hrs(st.mins)}. Last entry ${HOURS.lastEntry}.`, before: `Open ${HOURS.open} to ${HOURS.close}. Last entry ${HOURS.lastEntry}.`, after: `Open every day ${HOURS.open} to ${HOURS.close}.`, 'closed-day': MUSEUM.closedNote }[st.state];
  const shut = STOPS.filter((s) => closedOn(s));
  return `<section class="card" aria-label="Today">
    <div class="between"><b>${esc(MUSEUM.name)}</b>${pill}</div>
    <p class="small">${esc(line)}${shut.length ? ` Closed today: ${shut.map((s) => esc(s.title)).join(', ')}.` : ''}</p>
    <a class="soft" href="${TICKETS_URL}" target="_blank" rel="noopener">Book a Free Ticket</a>
  </section>`;
}

function walkView() {
  const list = walkStops();
  const nx = upNext();
  const started = list.some((s) => state.seen[s.id]);
  const total = list.reduce((a, s) => a + s.minutes, 0) + (list.length - 1) * WALK_BETWEEN;
  const tc = timeCheck(state.walk, opts());
  // Minutes of stories on this walk, from the recordings, so the version on the phone is easy to tell.
  const narrated = Math.round(list.reduce((a, s) => a + (clip(s.id, 'story')?.seconds || 0), 0) / 60);
  const pos = nx ? list.indexOf(nx) + 1 : 0;
  main.innerHTML = `<div class="tab">
    <div><p class="eyebrow">${esc(dateLine())}</p><h1 class="large">Walk</h1></div>
    ${todayCard()}
    <h2 class="h2" id="howlong">How Long Have You Got?</h2>
    <div class="seg" role="radiogroup" aria-labelledby="howlong">
      ${Object.entries(WALKS).map(([k, w]) => `<button type="button" role="radio" aria-checked="${k === state.walk}" data-walk="${k}">${esc(w.name)}</button>`).join('')}
    </div>
    ${tc.short ? `<div class="note" role="note"><span>About ${hrs(tc.need)} of walk left, and the galleries start clearing in ${hrs(Math.max(0, tc.avail))}.</span>${tc.shorter ? `<button type="button" class="soft" data-walk="${tc.shorter}">Switch to ${esc(WALKS[tc.shorter].name)}</button>` : ''}</div>` : ''}
    ${nx ? `<section class="card assess" data-zone="${nx.zone}" aria-labelledby="upnext">
      <div class="art">${rings}${floorsArt(nx)}</div>
      <div class="body">
        <span class="kicker">${started ? `Up Next, Stop ${pos} of ${list.length}` : `${list.length} Stops, About ${hrs(total)}`}${narrated ? `, ${narrated} min of Stories` : ''}</span>
        <p class="title" id="upnext">${esc(nx.title)}</p>
        <span class="meta"><span>${esc(floorName(nx.floor))}</span><span>${nx.minutes} min</span></span>
        <a class="primary" href="#${nx.id}" data-start="${nx.id}">${started ? 'Carry On' : 'Start the Walk'}</a>
      </div>
    </section>` : `<section class="card"><p class="title1">That Is the Walk</p><p class="small">${esc(MUSEUM.doneNote)}</p></section>`}
    <section class="card flat" aria-label="The stops"><ul class="list route">
      ${list.map((s, i) => `<li class="${state.seen[s.id] ? 'seen' : ''} ${closedOn(s) ? 'closed' : ''}" data-zone="${s.zone}"><a href="#${s.id}">
        <span class="num">${state.seen[s.id] ? '<span class="vh">Seen. </span>' : ''}${i + 1}</span>
        <span class="t"><b>${esc(s.title)}</b><span>${closedOn(s) ? 'Closed today, the walk goes past it' : state.later.includes(s.id) ? 'Later' : esc(s.place)}</span></span>
        <span class="mins">${s.minutes} min</span>${ICON.chev}</a></li>`).join('')}
    </ul></section>
    ${a2hsCard()}
    <p class="foot">An unofficial guide, not made by or connected to the ${esc(MUSEUM.name)}. Galleries close and things move: check the museum's website on the day.</p>
  </div>`;
  main.querySelectorAll('[data-walk]').forEach((b) => b.addEventListener('click', () => { state.walk = b.dataset.walk; store.set('walk', state.walk); walkView(); }));
  const start = main.querySelector('[data-start]');
  // Starting from the route plays the way to the stop, inside the tap.
  start?.addEventListener('click', () => play(start.dataset.start, 'way'));
  main.querySelector('[data-a2hs-hide]')?.addEventListener('click', () => { store.set('a2hs', 'hidden'); walkView(); });
}

// Safari on an iPhone, not yet on the Home Screen: three steps, like bike-fit's card.
function a2hsCard() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!ios || standalone || store.get('a2hs', '') === 'hidden') return '';
  return `<section class="card" aria-labelledby="a2hsH">
    <b id="a2hsH">Keep It on Your Home Screen</b>
    <p class="small">1. Tap Share. 2. Tap Add to Home Screen. 3. Tap Add. Then open it from there: it works full screen and without signal.</p>
    <button type="button" class="plain" data-a2hs-hide>Not Now</button>
  </section>`;
}

function stopView(s) {
  const list = walkStops();
  const pos = list.indexOf(s);
  const nx = nextOf(s.id);
  const found = new Set(state.found[s.id] || []);
  const story = clip(s.id, 'story');
  const notice = noticeOn(s);
  main.innerHTML = `<div class="stopview" data-zone="${s.zone}">
    <div class="hero">${rings}${floorsArt(s)}</div>
    <div class="topfade" aria-hidden="true"></div>
    <a class="glass" href="#walk" aria-label="Back to the walk">${ICON.back}</a>
    <div class="tab">
      <div>
        <p class="eyebrow">${pos >= 0 ? `Stop ${pos + 1} of ${list.length}` : 'Not on this walk'}, ${s.minutes} min</p>
        <h1 class="title1">${esc(s.title)}</h1>
        <p class="where">${esc(s.place)}</p>
      </div>
      ${notice ? `<p class="note" role="note">${closedOn(s) ? '<b>Closed today.</b> ' : ''}${esc(notice)}</p>` : ''}
      <section class="card" aria-labelledby="findH">
        <span class="kicker" id="findH">Find It</span>
        <p>${esc(s.find)}</p>
        ${s.arrive ? `<p class="arrive">${esc(s.arrive)}</p>` : ''}
        ${clip(s.id, 'way') ? '<button type="button" class="soft" data-way>Hear the Way</button>' : ''}
      </section>
      <section class="card player" aria-label="Listen">
        <div class="row">
          <button class="play" type="button" data-play aria-label="Play the story"></button>
          <div class="what" data-what>${chapterHead(s, 0)}</div>
        </div>
        <button type="button" class="soft" data-tostory hidden>Skip to the Story</button>
        <input class="scrub" type="range" min="0" max="${story ? story.seconds : 0}" step="0.5" value="0" aria-label="Position in the recording" data-scrub>
        <div class="times"><span data-t>0:00</span><span data-left>${story ? `-${mmss(story.seconds)}` : ''}</span></div>
        <div class="controls">
          <button type="button" class="soft" data-skip="-15" aria-label="Back 15 seconds">Back 15</button>
          <button type="button" class="soft" data-rate aria-label="Speed">${state.rate}×</button>
          <button type="button" class="soft" data-skip="15" aria-label="Forward 15 seconds">Forward 15</button>
        </div>
      </section>
      <section class="card flat look" aria-labelledby="lookH">
        <div class="head between"><span class="kicker" id="lookH">Look For</span><span class="kicker" data-count>${found.size} of ${s.look.length}</span></div>
        ${s.pic ? `<figure class="pic"><img src="${esc(s.pic.src)}" alt="${esc(s.pic.alt)}" loading="lazy" width="${s.pic.w}" height="${s.pic.h}"><figcaption>${esc(s.pic.caption)} <a href="${esc(s.pic.page)}" target="_blank" rel="noopener">Photo: ${esc(s.pic.credit)}, ${esc(s.pic.license)}</a></figcaption></figure>` : ''}
        <ul class="list">${s.look.map((l, i) => `<li><button type="button" aria-pressed="${found.has(i)}" data-look="${i}"><span class="box" aria-hidden="true"></span><span class="txt">${esc(l)}</span></button></li>`).join('')}</ul>
      </section>
      ${s.tip ? `<p class="note tip"><span><b>Tip.</b> ${esc(s.tip)}</span></p>` : ''}
      ${s.video ? `<a class="card watch" href="${esc(s.video.url)}" target="_blank" rel="noopener">
        <span class="wicon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7.5v9l7.5-4.5z" fill="currentColor"/></svg></span>
        <span class="wt"><span class="kicker">Watch</span><b>${esc(s.video.title)}</b><span class="small">${esc(s.video.channel)}${s.video.minutes ? `, ${s.video.minutes} min` : ''}${s.video.views ? `, ${esc(s.video.views)}` : ''}. Opens YouTube.</span></span>${ICON.chev}</a>` : ''}
      <section class="card story" aria-labelledby="storyH">
        <span class="kicker" id="storyH">The Story</span>
        ${s.story.map((p, i) => `${s.chapters?.[i] ? `<h3 class="chap" data-c="${i}">${i + 1}. ${esc(s.chapters[i])}</h3>` : ''}<p data-p="${i}">${esc(p)}</p>`).join('')}
      </section>
      ${s.sources?.length ? `<details class="card sources"><summary>Where These Facts Come From</summary><ul>${s.sources.map((u) => `<li><a href="${esc(u.url)}" rel="noopener" target="_blank">${esc(u.label)}</a></li>`).join('')}</ul></details>` : ''}
      ${!state.seen[s.id] && pos >= 0 && nx ? `<button type="button" class="plain" data-later>${state.later.includes(s.id) ? 'Put It Back in Order' : 'Too Busy? Do This Later'}</button>` : ''}
    </div>
    <div class="bottombar">
      ${nx ? `<a class="primary" href="#${nx.id}" data-next="${nx.id}">Next: ${esc(nx.title)}<small>Plays the way there</small></a>`
        : '<a class="primary" href="#walk" data-last>Finish the Walk</a>'}
    </div>
  </div>`;
  // The big button controls whatever of this stop is loaded: the way there or the story. After the
  // way there has ended it plays the story; after the story has ended it plays it again.
  main.querySelector('[data-play]').addEventListener('click', () => {
    if (state.now?.id === s.id && (!state.ended || state.now.kind === 'way')) toggle(); else play(s.id, 'story');
  });
  main.querySelector('[data-tostory]').addEventListener('click', () => play(s.id, 'story'));
  main.querySelector('[data-way]')?.addEventListener('click', () => play(s.id, 'way'));
  main.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => {
    if (state.now?.id !== s.id) load(s.id, 'story');
    skip(Number(b.dataset.skip));
  }));
  main.querySelector('[data-rate]').addEventListener('click', setRate);
  const scrub = main.querySelector('[data-scrub]');
  scrub.addEventListener('input', () => {
    if (state.now?.id !== s.id) load(s.id, 'story');
    audio.currentTime = Number(scrub.value);
  });
  main.querySelectorAll('[data-look]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.look);
    found.has(i) ? found.delete(i) : found.add(i);
    state.found[s.id] = [...found]; store.set('found', state.found);
    b.setAttribute('aria-pressed', String(found.has(i)));
    main.querySelector('[data-count]').textContent = `${found.size} of ${s.look.length}`;
  }));
  // Tap a paragraph to hear it from there.
  main.querySelectorAll('[data-p], [data-c]').forEach((p) => p.addEventListener('click', () => {
    const at = story?.starts?.[Number(p.dataset.p ?? p.dataset.c) + 1];
    if (at == null) return;
    if (!(state.now?.id === s.id && state.now.kind === 'story')) load(s.id, 'story');
    audio.currentTime = at;
    if (audio.paused) play(s.id, 'story');
  }));
  main.querySelector('[data-later]')?.addEventListener('click', () => {
    state.later = state.later.includes(s.id) ? state.later.filter((x) => x !== s.id) : [...state.later, s.id];
    store.set('later', state.later);
    if (state.later.includes(s.id)) { toast(`${s.title} moved to the end of the walk.`); location.hash = `#${nx.id}`; play(nx.id, 'way'); } else stopView(s);
  });
  main.querySelector('[data-next]')?.addEventListener('click', () => { markSeen(s.id); play(nx.id, 'way'); });
  main.querySelector('[data-last]')?.addEventListener('click', () => markSeen(s.id));
}

function visitView() {
  const total = Object.values(manifest.stops).reduce((a, x) => a + (x.story?.bytes || 0) + (x.way?.bytes || 0), 0);
  main.innerHTML = `<div class="tab info">
    <div><p class="eyebrow">${esc(dateLine())}</p><h1 class="large">Visit</h1></div>
    ${todayCard()}
    <section class="card" aria-labelledby="offH">
      <b id="offH">No Signal in the Galleries?</b>
      <p class="small">Save every recording on this phone before you go in. It takes ${total ? `about ${Math.ceil(total / 1e6)} MB` : 'a few megabytes'}.</p>
      <button type="button" class="soft" data-save>Save the Walk for Offline</button>
      <p class="small progress" data-progress role="status"></p>
    </section>
    ${PRACTICAL.map((p) => ({ ...p, points: pointsOn(p.points) })).filter((p) => p.points.length).map((p) => `<section class="card"><b>${esc(p.title)}</b><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}
    <section class="card">
      <b>About This Guide</b>
      <p class="small">Unofficial, and not made by or connected to the ${esc(MUSEUM.name)}. Each stop lists where its facts come from. The narrator is a recorded computer voice, Kokoro-82M, made in advance so it sounds the same on every phone and needs no signal. Photos are from Wikimedia Commons, each credited under it with its licence.</p>
      <button type="button" class="plain" data-reset>Start the Walk Again</button>
    </section>
    <p class="foot">Facts and practical details checked ${esc(CHECKED)}.</p>
  </div>`;
  main.querySelector('[data-save]').addEventListener('click', saveAll);
  main.querySelector('[data-reset]').addEventListener('click', () => {
    state.seen = {}; state.found = {}; state.later = [];
    store.set('seen', {}); store.set('found', {}); store.set('later', []);
    toast('Your progress is cleared.'); location.hash = '#walk';
  });
}

async function saveAll() {
  const out = main.querySelector('[data-progress]');
  const files = [...Object.values(manifest.stops).flatMap((x) => [x.way?.file, x.story?.file]).filter(Boolean).map((f) => `audio/${f}`),
    ...STOPS.filter((s) => s.pic).map((s) => s.pic.src)];
  if (!('caches' in window)) { out.textContent = 'This browser cannot save the walk. It will play while you have signal.'; return; }
  try {
    const c = await caches.open('nhm-walk-audio-v1');
    let n = 0;
    for (const f of files) {
      const url = new URL(f, location.href).href;
      if (!(await c.match(url))) { const r = await fetch(url); if (!r.ok) throw new Error(f); await c.put(url, r); }
      out.textContent = `Saved ${++n} of ${files.length}`;
    }
    out.textContent = 'Saved. The whole walk now plays without signal.';
  } catch { out.textContent = 'Saving stopped part way. Try again where the signal is better.'; }
}

// ── painting the player ───────────────────────────────────────────────────────────────────────

function paint() {
  const playing = !audio.paused && !state.ended;
  const id = here();
  const p = main.querySelector('[data-play]');
  if (p) {
    const mine = state.now?.id === id;
    const on = mine && playing;
    const way = mine && state.now.kind === 'way' && !state.ended;
    p.innerHTML = on ? ICON.pause : ICON.play;
    p.setAttribute('aria-label', on ? 'Pause' : way ? 'Play the way there' : 'Play');
    const wayOn = way && playing;
    const story = clip(id, 'story');
    const what = main.querySelector('[data-what]');
    const k = mine && state.now.kind === 'story' && !state.ended ? chapterAt(id, audio.currentTime) : 0;
    if (what) what.innerHTML = way ? `<b>The Way There</b><span>${wayOn ? 'Playing now' : 'Paused'}. Tap Skip to the Story when you arrive.</span>`
      : chapterHead(byId(id), k);
    const ts = main.querySelector('[data-tostory]'); if (ts) ts.hidden = !way;
    const r = main.querySelector('[data-rate]'); if (r) r.textContent = `${state.rate}×`;
    const w = main.querySelector('[data-way]'); if (w) w.setAttribute('aria-pressed', String(wayOn));
  }
  // The mini player shows what is playing on every screen except that stop's own.
  const dock = $('#dock');
  const show = state.now && state.now.id !== id && (playing || (!state.ended && audio.currentTime > 0) || (state.ended && state.now.kind === 'way'));
  dock.hidden = !show;
  if (show) {
    const s = byId(state.now.id);
    $('#dock-play').innerHTML = playing ? ICON.pause : ICON.play;
    $('#dock-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('#dock-link').href = `#${s.id}`;
    const ck = chapterAt(s.id, audio.currentTime);
    $('#dock-link').innerHTML = `${esc(s.title)}<span>${state.now.kind === 'way' ? (state.ended ? 'Press play when you arrive' : 'The way there') : esc(s.chapters?.[ck] || 'The story')}</span>`;
  }
  paintTime();
}

function paintTime() {
  const id = here();
  const mine = state.now?.id === id;
  const story = clip(id, 'story');
  const cur = mine ? clip(id, state.now.kind) : story;
  const t = mine ? audio.currentTime : 0, d = (mine && audio.duration) || cur?.seconds || 0;
  // The mini player's progress line, on the other screens.
  const bar = $('#dock-bar'); if (bar && state.now) { const dd = audio.duration || clip(state.now.id, state.now.kind)?.seconds || 1; bar.style.width = `${Math.min(100, (audio.currentTime / dd) * 100)}%`; }
  const scrub = main.querySelector('[data-scrub]');
  if (scrub && document.activeElement !== scrub) { scrub.max = d; scrub.value = t; }
  const tt = main.querySelector('[data-t]'); if (tt) tt.textContent = mmss(t);
  const left = main.querySelector('[data-left]'); if (left && d) left.textContent = `-${mmss(d - t)}`;
  // Read along: light the paragraph being spoken. starts[0] is the title, starts[i + 1] paragraph i.
  const box = main.querySelector('.story');
  if (box) {
    const live = mine && state.now.kind === 'story' && !audio.paused && !state.ended && story?.starts;
    box.classList.toggle('live', !!live);
    if (live) {
      let i = -1;
      story.starts.forEach((s, k) => { if (k > 0 && t >= s - 0.2) i = k - 1; });
      const k = Math.max(0, i);
      box.querySelectorAll('[data-p]').forEach((p) => p.classList.toggle('now', Number(p.dataset.p) === k));
      box.querySelectorAll('[data-c]').forEach((c) => c.classList.toggle('now', Number(c.dataset.c) === k));
      const what = main.querySelector('[data-what]');
      if (what && what.dataset.k !== String(k)) { what.innerHTML = chapterHead(byId(id), k); what.dataset.k = String(k); }
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
window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 24), { passive: true });
// The Today card counts down; refresh it each minute on the tabs.
setInterval(() => { if (!here() && !document.hidden) { const y = window.scrollY; route(); window.scrollTo(0, y); paint(); } }, 60000);

async function boot() {
  try { const r = await fetch('audio/manifest.json', { cache: 'no-cache' }); if (r.ok) manifest = await r.json(); } catch { /* offline with nothing cached: the text guide still works */ }
  show(false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
