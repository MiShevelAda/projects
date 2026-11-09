// Ask the Guide: questions about a stop, typed or with a photo, answered by Claude on the viewer's
// own Claude account. It runs only inside a claude.ai viewer that grants the `sample` capability
// (the private link); anywhere else, getSample() resolves null and the card stays hidden.
//
// Each call is memoryless, so every question carries: the rules (voice, honesty, length), this
// stop's words and sources, today's hours, and the last few turns of this stop's conversation.
// Page tools let Claude open a stop, play a chapter, or put this stop off till later.

let samplePromise = null;
export function getSample() {
  if (!samplePromise) {
    samplePromise = (async () => {
      try { return window.claude?.use ? await window.claude.use('sample') : null; } catch { return null; }
    })();
  }
  return samplePromise;
}
export async function askLimits() {
  const s = await getSample();
  if (!s) return null;
  try { return await s.limits(); } catch { return {}; }
}

const RULES = (museum) => `You are the guide in "First Walk", an unofficial audio guide to the ${museum}, London. The visitor is standing in the museum now, on their phone, and has just asked you something.
How to answer:
- Short: 40 to 120 words unless they ask for more. Plain text, no headings, no lists unless they ask. British spelling.
- In the guide's voice: warm, dry, a little witty, never gushing.
- Ground every fact in the STOP DETAILS below. If they ask something those do not cover, you may answer from well-established general knowledge, and say so ("generally", "I can't confirm that from the museum's own pages"). Never invent where an object is, what is on display, opening times or prices.
- If a photo is attached, say plainly what you see first, then connect it to this stop if it matches something in the details. If you are not sure what it is, say so and suggest what to look for on the label.
- If they want to go somewhere or hear part of the story, you may use the tools: open_stop, play_chapter, do_later.
- Never name or imitate any real narrator or broadcaster. You are the First Walk guide.`;

function stopContext(stop, walkList, today) {
  const words = (stop.story || []).map((p, i) => `${stop.chapters?.[i] ? `[Chapter ${i + 1}: ${stop.chapters[i]}] ` : ''}${p}`).join('\n').slice(0, 12000);
  return `STOP DETAILS
Museum today: ${today}
This stop: ${stop.title} (id ${stop.id}), ${stop.place}.
How to find it: ${stop.find || ''}
You are there when: ${stop.arrive || ''}
Things to look for: ${(stop.look || []).join(' | ')}
Tip: ${stop.tip || 'none'}
The story the visitor can hear here, by chapter:
${words}
Sources for these facts: ${(stop.sources || []).map((s) => s.label).join('; ')}
Other stops on their walk (id: title, place): ${walkList.map((s) => `${s.id}: ${s.title}, ${s.place}`).join(' | ')}`;
}

const COPY = {
  rate_limited: 'Too many questions for now. Try again in a minute.',
  image_rejected: 'That photo did not work. Try another one.',
  refused: 'The guide cannot answer that one. Try asking another way.',
  empty_completion: 'No answer came back. Try asking another way.',
  session_expired: 'Sign in to Claude again, then ask.',
  prompt_too_large: 'That was too much to send. Ask something shorter.',
  upstream_error: 'The answer was interrupted. Ask again.',
};
const HIDE = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

const threads = new Map(); // stop id -> [{ role, content }], this visit only

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (t) => t.split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

export const ICON_CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.6-2.4h6.8L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z" fill="currentColor"/><circle cx="12" cy="13" r="3.6" fill="var(--card)"/></svg>';

// The card's markup; hidden until the viewer is known to be able to ask.
export function askCard(stop) {
  return `<section class="card ask" data-ask hidden aria-labelledby="askH">
    <div class="between"><span class="kicker" id="askH">Ask the Guide</span><span class="small">On your Claude account</span></div>
    ${(stop.ask || []).length ? `<div class="chips">${stop.ask.map((q) => `<button type="button" class="soft chip" data-q>${esc(q)}</button>`).join('')}</div>` : ''}
    <div class="thread" data-thread aria-live="polite"></div>
    <div class="preview" data-preview hidden><img alt="Your photo" data-preview-img><button type="button" class="plain" data-unphoto>Remove photo</button></div>
    <form class="askform" data-askform>
      <label class="vh" for="askq">Your question about ${esc(stop.title)}</label>
      <input id="askq" type="text" placeholder="Ask about this stop" enterkeyhint="send" autocomplete="off" maxlength="500">
      <label class="cam" data-cam hidden><span class="vh">Take a photo to ask about</span>${ICON_CAM}<input type="file" accept="image/*" capture="environment" data-photo></label>
      <button type="submit" class="send" aria-label="Ask">Ask</button>
    </form>
    <button type="button" class="plain" data-askstop hidden>Stop</button>
  </section>`;
}

// Wires the card on a rendered stop. `app` gives: stop, walkList(), today(), openStop(id),
// playChapter(n), doLater(), toast(msg).
export async function wireAsk(root, app) {
  const card = root.querySelector('[data-ask]');
  if (!card) return;
  const sample = await getSample();
  if (!sample || !card.isConnected) return;
  card.hidden = false;
  const limits = await askLimits();
  const cam = card.querySelector('[data-cam]');
  if (limits?.images) {
    cam.hidden = false;
    cam.querySelector('input').accept = (limits.images.mediaTypes || ['image/jpeg', 'image/png']).join(',');
  }
  const { stop } = app;
  const thread = card.querySelector('[data-thread]');
  const form = card.querySelector('[data-askform]');
  const input = card.querySelector('#askq');
  const photoIn = card.querySelector('[data-photo]');
  const preview = card.querySelector('[data-preview]');
  const stopBtn = card.querySelector('[data-askstop]');
  let photo = null, ctl = null;
  const turns = threads.get(stop.id) || [];
  threads.set(stop.id, turns);
  // Show the conversation so far (this visit), so leaving and coming back keeps it.
  thread.innerHTML = turns.map((t) => `<div class="bubble ${t.role}">${t.role === 'user' ? `<p>${esc(t.content)}</p>` : paras(t.content)}</div>`).join('');

  photoIn.addEventListener('change', () => {
    photo = photoIn.files?.[0] || null;
    preview.hidden = !photo;
    if (photo) preview.querySelector('img').src = URL.createObjectURL(photo);
  });
  card.querySelector('[data-unphoto]').addEventListener('click', () => { photo = null; photoIn.value = ''; preview.hidden = true; });
  card.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; form.requestSubmit(); }));
  stopBtn.addEventListener('click', () => ctl?.abort());

  const tools = limits?.tools ? [
    { name: 'open_stop', description: 'Open another stop of the walk on the visitor\'s screen and play the directions to it. Use when they ask to go somewhere. Returns "opened" or an error.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'A stop id from the list of stops' } }, required: ['id'] },
      execute: (a) => app.openStop(String(a.id)) },
    { name: 'play_chapter', description: 'Play this stop\'s story from a chapter, 1-based. Use when they ask to hear a part again. Returns "playing".', inputSchema: { type: 'object', properties: { chapter: { type: 'number' } }, required: ['chapter'] },
      execute: (a) => app.playChapter(Number(a.chapter)) },
    { name: 'do_later', description: 'Move this stop to the end of the walk because it is too busy now. Returns "moved".',
      execute: () => app.doLater() },
  ] : undefined;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim() || (photo ? 'What am I looking at?' : '');
    if (!q) return;
    input.value = '';
    const shot = photo;
    const you = document.createElement('div');
    you.className = 'bubble user';
    you.innerHTML = `${shot ? `<img src="${URL.createObjectURL(shot)}" alt="Your photo">` : ''}<p>${esc(q)}</p>`;
    const ans = document.createElement('div');
    ans.className = 'bubble assistant thinking';
    ans.textContent = 'Thinking...';
    thread.append(you, ans);
    ans.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    photo = null; photoIn.value = ''; preview.hidden = true;
    ctl = new AbortController();
    stopBtn.hidden = false;
    form.querySelector('.send').disabled = true;
    const history = turns.slice(-6);
    const content = `${shot ? '[The visitor attached a photo they just took.] ' : ''}${q}`;
    try {
      const { text, truncated } = await sample(
        [{ role: 'user', content: `${RULES(app.museum)}\n\n${stopContext(stop, app.walkList(), app.today())}` }, ...history, { role: 'user', content }],
        { cache: false, signal: ctl.signal, modelTier: 'default', effort: 'low', images: shot ? [shot] : undefined, tools,
          onText: ({ text: t }) => { ans.classList.remove('thinking'); ans.innerHTML = paras(t); } },
      );
      ans.classList.remove('thinking');
      ans.innerHTML = paras(text) + (truncated ? '<p class="small">Cut short. Ask for less at a time.</p>' : '');
      turns.push({ role: 'user', content: shot ? `${q} (with a photo)` : q }, { role: 'assistant', content: text });
    } catch (err) {
      ans.classList.remove('thinking');
      const code = err?.code || 'upstream_error';
      if (code === 'cancelled') { ans.innerHTML = err.text ? paras(err.text) : '<p class="small">Stopped.</p>'; }
      else if (HIDE.has(code)) { card.hidden = true; app.toast('Ask the Guide is off for this page. You can allow it in the page\'s Permissions.'); }
      else if (code === 'images_unavailable') { cam.hidden = true; ans.innerHTML = '<p class="small">Photos cannot be sent from here. Ask in words instead.</p>'; }
      else { ans.innerHTML = `${err.text && code !== 'refused' ? paras(err.text) : ''}<p class="small">${esc(COPY[code] || COPY.upstream_error)}</p>`; }
    } finally {
      stopBtn.hidden = true;
      form.querySelector('.send').disabled = false;
      ctl = null;
    }
  });
}
