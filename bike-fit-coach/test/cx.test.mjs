// Round 3, builder C: the customer research's flow changes (cx-research/REPORT.md), the parts that can
// be checked without running a session: the reminder file and its times, the words of the win, how
// far the phone has tipped, the frame and tape notes on the camera view, and the screens they use.
// Whole sessions are in flow.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as fit from '../fit.js';
import * as ui from '../ui.js';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const pageText = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const tag = (html, id) => html.match(new RegExp(`<[a-z]+[^>]*id="${id}"[^>]*>`))?.[0] || '';
const section = (html, id) => { const i = html.indexOf(`id="${id}"`); return html.slice(i, html.indexOf('</section>', i)); };
const DASH = /[\u2013\u2014]/;

test('"When will you move it?": tonight at 8 pm, the weekend at 10 am, a picked day only if it is still to come', () => {
  // Saturday 10 October 2026 at 3 pm, local time.
  const sat = new Date(2026, 9, 10, 15, 0);
  const at = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
  assert.deepEqual(at(ui.remindAt('tonight', sat)), [2026, 10, 10, 20, 0]);
  // From 7 pm on: an hour from now, on the half hour.
  assert.deepEqual(at(ui.remindAt('tonight', new Date(2026, 9, 10, 19, 10))), [2026, 10, 10, 20, 30]);
  assert.deepEqual(at(ui.remindAt('tonight', new Date(2026, 9, 10, 22, 30))), [2026, 10, 10, 23, 30]);
  // The weekend: Saturday 10 am, Sunday once Saturday's has passed, next Saturday after Sunday's.
  assert.deepEqual(at(ui.remindAt('weekend', new Date(2026, 9, 7, 9, 0))), [2026, 10, 10, 10, 0]); // a Wednesday
  assert.deepEqual(at(ui.remindAt('weekend', new Date(2026, 9, 10, 8, 0))), [2026, 10, 10, 10, 0]);
  assert.deepEqual(at(ui.remindAt('weekend', sat)), [2026, 10, 11, 10, 0]);
  assert.deepEqual(at(ui.remindAt('weekend', new Date(2026, 9, 11, 11, 0))), [2026, 10, 17, 10, 0]);
  for (let d = 0; d < 7; d++) {
    const r = ui.remindAt('weekend', new Date(2026, 9, 5 + d, 12, 0));
    assert.ok([0, 6].includes(r.getDay()) && r.getHours() === 10, String(r));
  }
  // Pick a Day: the date input's own value, read as local time; a time gone by is not a reminder.
  assert.deepEqual(at(ui.remindAt('pick', sat, '2026-10-14T18:30')), [2026, 10, 14, 18, 30]);
  assert.equal(ui.remindAt('pick', sat, '2026-10-09T18:30'), null);
  assert.equal(ui.remindAt('pick', sat, ''), null);
  assert.equal(ui.remindAt('pick', sat, 'not a date'), null);
  assert.equal(ui.remindAt('someday', sat), null);
});

test('the reminder is a calendar file that opens the app: one event, an alert when it starts, times in UTC', () => {
  const start = new Date(Date.UTC(2026, 9, 11, 8, 0));
  const words = ui.reminderWords({ kind: 'saddle', raise: true, mm: [12, 15] });
  assert.equal(words.title, 'Bike fit: raise the saddle about 12 to 15 mm');
  assert.equal(words.notes, 'Raise the saddle about 12 to 15 mm. Then open Bike Fit Coach and check what it did.');
  assert.equal(ui.reminderWords({ kind: 'bars' }).title, 'Bike fit: raise the handlebars by one spacer');
  const url = 'https://mishevelada.github.io/projects/bike-fit-coach/';
  const ics = ui.icsReminder({ start, title: words.title, notes: words.notes, url, uid: 'one@bike-fit-coach', stamp: new Date(Date.UTC(2026, 9, 10, 12, 0)) });
  assert.ok(ics.endsWith('\r\n'));
  const lines = ics.split('\r\n').slice(0, -1);
  assert.ok(lines.every(l => l.length <= 75), 'folded at 75 characters');
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends in CRLF');
  const unfolded = ics.replace(/\r\n /g, '');
  for (const l of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:one@bike-fit-coach', 'DTSTAMP:20261010T120000Z', 'DTSTART:20261011T080000Z',
    'DTEND:20261011T083000Z', `SUMMARY:${words.title}`, `URL;VALUE=URI:${url}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']) {
    assert.ok(unfolded.split('\r\n').includes(l), l);
  }
  assert.ok(unfolded.includes(`DESCRIPTION:${words.notes}\\n${url}`), 'the description ends with the link, a newline escaped');
  // Commas, semicolons and backslashes in the words are escaped, as the standard asks.
  const odd = ui.icsReminder({ start, title: 'a, b; c\\d', notes: 'x', url, uid: 'u' });
  assert.ok(odd.includes('SUMMARY:a\\, b\\; c\\\\d'));
  assert.ok(!DASH.test(ics));
});

test('the win, said as the win: "That worked. Your saddle is done." and when to check again', () => {
  const r = fit.withRetest(fit.advise({ kneeFlex: 30, torso: 45, elbow: 25, shoulder: 85 }, { strokes: 12, kneeFlex: 37, torso: 45, elbow: 25, shoulder: 85 }, 'wall'),
    fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 12 }, knee: 44, src: 'pedalling', setup: 'wall' }, { knee: 37, src: 'pedalling', setup: 'wall' }));
  assert.ok(ui.retestWin(r), 'a win');
  assert.equal(fit.spokenSummary(r, { win: true }), 'That worked. Your saddle is done. Check again whenever you change the saddle, stem, shoes or cleats.');
  // With pain or numbness that keeps coming back, that is said first, as always.
  assert.match(fit.spokenSummary(r, { win: true, pain: true }), /^You said pain or numbness keeps coming back\..*That worked\. Your saddle is done\. Check again whenever/);
  // Say It Again: the win, then the before and after.
  const long = fit.spokenSummary(r, { win: true, long: true });
  assert.match(long, /^That worked\. Your saddle is done\. Your knee moved the right way, and it is in range now\./);
  // Without win, as before.
  assert.ok(!/That worked/.test(fit.spokenSummary(r)));
  assert.equal(fit.WIN_LINE, 'That worked. Your saddle is done.');
  assert.equal(fit.COME_BACK, 'Check again whenever you change the saddle, stem, shoes or cleats.');
});

test('a held-still reading that asks for one more film is not a win and not done: nothing says "done" over "Film once more"', () => {
  const made = { made: { kind: 'saddle', dir: 1, mm: 12 }, knee: 44, src: 'pedalling', setup: 'wall' };
  // Pedalling in range, held still out of range: fit marks it stillOut.
  const base = fit.advise({ kneeFlex: 46, torso: 45, elbow: 25, shoulder: 85 }, { strokes: 12, kneeFlex: 37, torso: 45, elbow: 25, shoulder: 85 }, 'wall');
  assert.ok(base.stillOut, 'stillOut');
  const r = fit.withRetest(base, fit.judgeChange(made, { knee: 37, src: 'pedalling', setup: 'wall' }));
  assert.ok(ui.onceMore(r));
  assert.ok(!ui.retestWin(r), 'film once more first');
  assert.ok(!ui.checkDone(r));
  const short = fit.spokenSummary(r, { win: ui.retestWin(r) });
  assert.ok(!short.includes(fit.WIN_LINE), 'not said as done');
  assert.match(short, /Film once more to be sure\.$/, 'said short too, after "Leave the phone where it is."');
  assert.equal(fit.spokenSummary(base), 'Nothing to change today. Your saddle height looks right. Film once more to be sure.');
  assert.match(fit.spokenSummary(r, { win: ui.retestWin(r), long: true }), /Film once more to be sure\./);
  // The second time, the pedalling reading counts for more: then it is a win, and done.
  const again = { ...r, stillOutAgain: true };
  assert.ok(ui.retestWin(again) && ui.checkDone(again));
  // Nothing to change on a first check: done, unless it asks for one more film.
  const fine = fit.advise({ kneeFlex: 36, torso: 45, elbow: 25, shoulder: 85 }, { strokes: 12, kneeFlex: 37, torso: 45, elbow: 25, shoulder: 85 }, 'wall');
  assert.ok(ui.checkDone(fine));
  assert.ok(!ui.checkDone(base) && ui.checkDone({ ...base, stillOutAgain: true }));
});

test('how far the phone has tipped since it was levelled: any way, whatever the length of the reading', () => {
  assert.equal(fit.gravityAngle([9.8, 0, 0], [9.8, 0, 0]), 0);
  assert.ok(Math.abs(fit.gravityAngle([9.8, 0, 0], [0, 9.8, 0]) - 90) < 1e-9);
  // 2 degrees about any axis, and the same reading at another length.
  const r = (deg) => (deg * Math.PI) / 180;
  for (const [a, b] of [[[9.8, 0, 0], [9.8 * Math.cos(r(2)), 9.8 * Math.sin(r(2)), 0]], [[9.8, 0, 0], [9.8 * Math.cos(r(2)), 0, 9.8 * Math.sin(r(2))]], [[0, -9.8, 0.3], [0, -4.9, 0.15]]]) {
    const d = fit.gravityAngle(a, b);
    assert.ok(Math.abs(d - (a[2] === 0.3 ? 0 : 2)) < 1e-6, `${d}`);
  }
  assert.equal(fit.gravityAngle(null, [1, 0, 0]), null);
  assert.equal(fit.gravityAngle([0, 0, 0], [1, 0, 0]), null);
  assert.equal(fit.gravityAngle([1, NaN, 0], [1, 0, 0]), null);
});

test('the camera view, screen away: the bike framed in a big guide on day one, then the tape tip until he is on', () => {
  // Framing: the guide, a dashed yellow border (it needs him), the words on the frosted card in white
  // and no caption saying the same.
  const f = ui.liveView({ phase: 'phone', front: false, framing: true, sensor: true, landscape: true });
  assert.equal(f.layer, 'avatar');
  assert.ok(f.bikeGuide);
  assert.equal(f.border, 'yellow');
  assert.equal(f.caption, false);
  assert.deepEqual(f.card, { sub: 'Both wheels inside the frame, pedals in the middle', arrow: 0, note: true });
  assert.equal(f.label, 'Both wheels inside the frame, pedals in the middle.');
  // Levelling after it: the guide stays drawn behind the level numbers, screen away only.
  const lv = ui.liveView({ phase: 'phone', front: false, guide: true, sensor: true, landscape: true, tilt: 4 });
  assert.equal(lv.layer, 'level');
  assert.ok(lv.bikeGuide);
  assert.ok(!ui.liveView({ phase: 'phone', front: true, guide: true, sensor: true, landscape: true, tilt: 4 }).bikeGuide);
  // The placement screen still comes first.
  assert.equal(ui.liveView({ phase: 'phone', front: false, placing: true, framing: true }).layer, 'place');
  // The tape tip: on the card with the tape icon while nobody is on the bike, the caption off while
  // the voice says it, and gone once he is on.
  const tip = ui.liveView({ phase: 'mount', front: false, tip: true, tipSpeaking: true });
  assert.deepEqual(tip.card, { sub: ui.TAPE_TIP, arrow: 0, note: true, icon: 'tape' });
  assert.equal(tip.caption, false);
  assert.equal(ui.liveView({ phase: 'mount', front: false, tip: true, tipSpeaking: false }).caption, true);
  assert.equal(ui.liveView({ phase: 'mount', front: false, tip: true, rider: true }).card, null);
  // Screen towards him: no card (he is behind the phone when it is said); the voice and caption do it.
  assert.equal(ui.liveView({ phase: 'mount', front: true, tip: true }).card, null);
  // A correction still wins over the tip.
  const fix = ui.liveView({ phase: 'mount', front: false, tip: true, fix: { key: 'sideOn', toward: 'front' } });
  assert.ok(!fix.card.note);
  assert.equal(ui.TAPE_TIP, 'Tape the floor by the chair legs and the back wheel. Next time, line them up.');
});

test('the permission screen: before the first Start, one title, one line, four short rows, Tap to Hear Me, one Start', async () => {
  const html = await read('index.html');
  const at = (s) => html.indexOf(s);
  assert.ok(at('id="flowReady"') < at('id="flowAllow"') && at('id="start"') < at('id="allowStart"'), 'after Getting Ready');
  const allow = section(html, 'flowAllow'), text = pageText(allow);
  assert.match(text, /Allow Camera and Motion/);
  assert.match(text, /Your iPhone will ask twice\. Tap Allow both times\./);
  for (const s of ['Camera: to see how you sit on the bike.', 'Motion: to beep when the phone is level.', 'It may say mishevelada.github.io. That is this app.', 'Nothing leaves this phone.']) {
    assert.ok(text.includes(s), s);
    assert.ok(s.split(' ').length <= 9, `a handful of words: ${s}`);
  }
  assert.match(tag(html, 'hearMe'), /class="ftinted"/);
  assert.match(allow, /Tap to Hear Me<\/button>/);
  // The sound check plays the coach's recorded line through the voice's one shared element
  // (test/voice.test.mjs checks the clip and the element).
  assert.match(html, /<audio id="voice" preload="auto"><\/audio>/);
  assert.equal((allow.match(/class="fprimary"/g) || []).length, 1, 'one primary button');
  assert.match(tag(html, 'allowClose'), /class="glass close"[^>]*aria-label="Close"/);
  assert.match(tag(html, 'allowBack'), /class="glass back"[^>]*aria-label="Back"/);
  // It left the Getting Ready list, where it was one long line among the setup steps.
  assert.ok(!/an iPhone asks twice/.test(pageText(section(html, 'flowReady'))));
  const app = await read('app.js');
  // Shown once a page view; Getting Ready's button says Next until then.
  assert.match(app, /if \(allowDue\(\)\) \{ showFlow\('allow'\); return; \}/);
  assert.match(app, /el\.start\.textContent = due \? 'Next' : startText;/);
  assert.match(app, /el\.allowStart\.addEventListener\('click', \(\) => \{ if \(askSetup\(\)\) return; allowSeen = true; start\(\); \}\);/);
  // The sound check unlocks sound in the live app's order, inside the tap, then says its line, which
  // the voice plays from its recorded clip.
  const unlock = app.slice(app.indexOf('function unlockSound('), app.indexOf('// ── tilt sensor'));
  assert.ok(unlock.indexOf('audioSession') < unlock.indexOf('Beep.init()') && unlock.indexOf('Beep.init()') < unlock.indexOf('Voice.unlock()'));
  const hear = app.slice(app.indexOf("el.hearMe.addEventListener('click'"), app.indexOf('// ── opened inside another app'));
  assert.match(hear, /unlockSound\(\);\n  Voice\.say\(HEAR_LINE, \{ interrupt: true \}\);/);
  // After the tap, what to do when nothing was heard: the volume and silent mode only.
  assert.match(tag(html, 'hearHint'), /role="status" hidden/);
  assert.match(allow, />No sound\? Turn the volume up and switch off silent mode\.</);
  assert.match(hear, /el\.hearHint\.hidden = false;/);
  assert.ok(!/Settings|rotation lock|download/i.test(text), 'no other setting on this screen');
});

test('Check It Now and the reminder: the question, the calendar choices, the line under Check It Now', async () => {
  const html = await read('index.html');
  const where = section(html, 'flowWhere'), wt = pageText(where);
  assert.match(wt, /Is the Phone Where It Was\?/);
  assert.match(wt, /If you have not moved it, I skip setting it up\./);
  assert.match(where, /<button id="whereYes" class="fprimary" type="button">Yes, Start<\/button>/);
  assert.match(where, /<button id="whereNo" class="ftinted" type="button">No, It Moved<\/button>/);
  assert.match(tag(html, 'whereClose'), /class="glass close"[^>]*aria-label="Close"/);
  const when = html.slice(html.indexOf('id="rWhen"'), html.indexOf('id="rMadeSaved"'));
  assert.match(pageText(when), /When Will You Move It\? I can put a reminder in your calendar\. Tonight Weekend Pick a Day/);
  for (const id of ['whenTonight', 'whenWeekend', 'whenPick']) assert.match(tag(html, id), /class="soft"/, `${id}: 44 pt`);
  assert.match(tag(html, 'whenDate'), /type="datetime-local"/);
  assert.match(tag(html, 'rMadeHint'), /class="small center"/);
  assert.match(pageText(html), /Open This in Safari Here the camera may not work, and results may not be kept\. Copy the Link/);
  const app = await read('app.js');
  // The made file: a Blob on the phone, no server.
  assert.match(app, /URL\.createObjectURL\(new Blob\(\[text\], \{ type \}\)\)/);
  assert.match(app, /offerFile\(text, 'bike-fit-check\.ics', 'text\/calendar;charset=utf-8'\)/);
  assert.ok(!/fetch\([^)]*ics/.test(app));
  // The thresholds are labelled as design choices.
  for (const k of ['MOVE_DEG = 2, MOVE_SECS = 0.5, WATCH_GAP = 1', 'FRAME_SECS = 5', 'TAPE_SECS = 40', 'NUDGE_SECS = 1.5', 'WAKE_KEEP = 600']) assert.ok(app.includes(k), k);
  const before = (k) => app.slice(Math.max(0, app.indexOf(k) - 900), app.indexOf(k));
  for (const k of ['const MOVE_DEG', 'const FRAME_SECS', 'const NUDGE_SECS', 'const WAKE_KEEP']) assert.match(before(k), /[Dd]esign choice/, k);
  for (const f of ['app.js', 'index.html', 'ui.js', 'fit.js', 'README.md', 'test/flow-runner.mjs', 'test/flow.test.mjs', 'test/cx.test.mjs']) assert.ok(!DASH.test(await read(f)), `no en or em dashes in ${f}`);
});

test('every new spoken line is a whole sentence with no number stitched in and no left or right', async () => {
  const app = await read('app.js');
  const lines = ['LEAVE_LINE', 'CHECK_NOW_LINE', 'CHECK_NOW_MOVED', 'IN_PLACE_LINE', 'WHERE_LINE', 'FRAME_LINE', 'TAPE_LINE', 'WHEN_LINE', 'HEAR_LINE']
    .map(k => app.match(new RegExp(`const ${k} = '([^']+)';`))[1]);
  const ret = app.slice(app.indexOf('const RETURN = {'), app.indexOf('};', app.indexOf('const RETURN = {')));
  lines.push(...[...ret.matchAll(/'([^']+)'/g)].map(m => m[1]), fit.WIN_LINE, fit.COME_BACK);
  assert.ok(lines.length >= 25, lines.length);
  for (const l of lines) {
    assert.match(l, /^[A-Z].*[.?]$/, `a whole sentence: ${l}`);
    assert.ok(!/\d|\$\{/.test(l), `no number stitched in: ${l}`);
    assert.ok(!/\b(left|right)\b/i.test(l), `bike words: ${l}`);
  }
});
