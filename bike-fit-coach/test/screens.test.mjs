// The screens of round 3, read from index.html, app.js and sw.js: three tabs with a glass tab bar,
// the first visit and the returning Check tab, the check flow (Setup, Getting Ready) in its own dark
// world, the results sheet, Progress and Learn, the iOS 26 tokens, and what the service worker
// caches. The behaviour is in flow.test.mjs and ui.test.mjs; these check what the page is built from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const pageText = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const tag = (html, id) => html.match(new RegExp(`<[a-z]+[^>]*id="${id}"[^>]*>`))?.[0] || '';
const css = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];

test('three tabs, Check, Progress and Learn, in a floating glass capsule with filled symbols', async () => {
  const html = await read('index.html');
  for (const [k, name] of [['Check', 'Check'], ['Progress', 'Progress'], ['Learn', 'Learn']]) {
    const b = tag(html, `tabBtn${k}`);
    assert.match(b, /role="tab"/, k);
    assert.match(b, new RegExp(`aria-controls="tab${k}"`), k);
    assert.match(tag(html, `tab${k}`), /role="tabpanel"/, k);
    assert.match(html, new RegExp(`id="tabBtn${k}"[\\s\\S]*?<svg[\\s\\S]*?</svg>\\s*${name}</button>`), `${k}: a symbol, then the label`);
  }
  const c = css(html);
  assert.match(c, /\.tabbar \{[^}]*width: 284px; height: 62px;[^}]*border-radius: 31px;[^}]*backdrop-filter: blur\(20px\) saturate\(180%\)/);
  assert.match(c, /\.tabbar button\[aria-selected="true"\] \{ background: var\(--lens\)/, 'the selected tab in an inner pill');
  assert.match(c, /\.tabbar button \{[^}]*font-size: 11px;/, 'labels a fixed size, not rem');
  const app = await read('app.js');
  assert.match(app, /function selectTab\(name\)/);
  assert.match(app, /setAttribute\('aria-selected', String\(k === name\)\)/);
});

test('the Check tab: Add to Home Screen first in Safari, then the assessment card and the latest check', async () => {
  const html = await read('index.html'), text = pageText(html);
  for (const s of ['Keep Your Results', 'Add it to your Home Screen, so Safari keeps your results.', 'Show Me How',
    'Camera-Based', 'On This iPhone', 'Check It Now', 'Start a Check', 'Latest Check', 'Show All', 'Check Your Change']) {
    assert.ok(text.includes(s), s);
  }
  // Round 3, builder E: the steps sit one tap away, on Show Me How's overlay, which points at Safari's
  // own Share button (on iOS 26 under the three dots): three short steps, and where else to look.
  const hint = html.slice(html.indexOf('id="shareHint"'), html.indexOf('<!-- ── running'));
  assert.match(pageText(hint), /Add to Home Screen 1 Tap Share below 2 Tap Add to Home Screen 3 Tap Add No Share below\? Tap the three dots, or look up top\./);
  // One primary button on the tab: Start a Check; Show Me How is a quiet one.
  assert.match(tag(html, 'showShare'), /class="soft"/);
  assert.ok(!/id="trySafari"/.test(html), 'Try It in Safari First is gone: Start a Check does that');
  const app = await read('app.js');
  // First visit in Safari: not opened from the Home Screen (navigator.standalone, display-mode).
  assert.match(app, /navigator\.standalone === true \|\| matchMedia\('\(display-mode: standalone\)'\)\.matches/);
  assert.match(app, /el\.a2hs\.hidden = !\(inSafari && !h\.length\)/);
  assert.match(app, /el\.homeSummary\.textContent = summary/);
});

test('a new check asks one question a screen, in order, with Away from me the default and visible', async () => {
  const html = await read('index.html'), text = pageText(html);
  const at = (s) => html.indexOf(s);
  // Round 3 fix: one title, one short line and one Next each, as Apple's "Choose How to Measure".
  const order = ['id="flowSetup"', 'How Will Your Bike Stay Up?', 'id="flowNext"', 'id="flowScreen"', 'Where Will the Screen Face?', 'id="screenNext"',
    'id="flowPain"', 'Pain or Numbness That Keeps Coming Back When You Ride?', 'id="painNext"', 'id="flowReady"', 'id="start"'];
  for (let i = 1; i < order.length; i++) assert.ok(at(order[i - 1]) >= 0 && at(order[i - 1]) < at(order[i]), `${order[i - 1]} before ${order[i]}`);
  const section = (id) => html.slice(at(`<section id="${id}"`), html.indexOf('\n  </section>', at(`<section id="${id}"`)));
  for (const [id, h1] of [['flowSetup', 'setupQ'], ['flowScreen', 'screenQ'], ['flowPain', 'painQ']]) {
    const s = section(id);
    assert.equal((s.match(/<h1 /g) || []).length, 1, `${id}: one title`);
    assert.match(s, new RegExp(`<h1 id="${h1}" class="q" tabindex="-1">`), id);
    assert.equal((s.match(/<div class="fhead">\s*<h1[^>]*>[^<]+<\/h1>\s*<p>[^<]+<\/p>\s*<\/div>/g) || []).length, 1, `${id}: one short line under it`);
    assert.equal((s.match(/role="radiogroup"/g) || []).length, 1, `${id}: one question`);
    assert.equal((s.match(/class="fprimary"/g) || []).length, 1, `${id}: one Next`);
  }
  // The default answer is the first card on its screen, chosen, so it is seen above the Next bar.
  const scr = section('flowScreen');
  assert.ok(scr.indexOf('id="screenAway"') < scr.indexOf('id="screenTowards"'));
  assert.match(tag(html, 'screenAway'), /aria-checked="true"/);
  assert.match(tag(html, 'screenTowards'), /aria-checked="false"/);
  assert.match(text, /Away from me Default/);
  // The pain question: nothing chosen, and its Next waits for an answer.
  for (const id of ['painNo', 'painYes']) assert.match(tag(html, id), /role="radio" aria-checked="false"/, id);
  assert.match(tag(html, 'painNext'), /aria-disabled="true"/);
  // The note sits one tap away, under Which Should I Pick?
  assert.match(html, /<details class="finfo"><summary>Which Should I Pick\?<\/summary><p>[^<]*Towards me is still being tested on a real iPhone\.<\/p><\/details>/);
  for (const id of ['setupTrainer', 'setupWall', 'setupFriend', 'screenTowards', 'screenAway']) assert.match(tag(html, id), /role="radio"/, id);
  for (const id of ['screenBack', 'painBack']) assert.match(tag(html, id), /class="glass back"[^>]*aria-label="Back"/, id);
  for (const id of ['flowClose', 'screenClose', 'painClose']) assert.match(tag(html, id), /class="glass close"[^>]*aria-label="Close"/, id);
  const app = await read('app.js');
  assert.match(app, /let screen = 'away';/);
  assert.match(app, /session = \{ at: new Date\(\), tries: \{\}, setup, screen, camera \}/);
  assert.match(app, /h\.unshift\(\{[^}]*screen: session\?\.screen/);
  assert.match(app, /el\.flowNext\.addEventListener\('click', \(\) => \{ if \(!askSetup\(\)\) showFlow\('screen'\); \}\);/);
  assert.match(app, /el\.screenNext\.addEventListener\('click', \(\) => showFlow\('pain'\)\);/);
  assert.match(app, /el\.readyBack\.addEventListener\('click', \(\) => showFlow\('pain'\)\);/);
  assert.match(app, /el\.painNext\.setAttribute\('aria-disabled', String\(!painSet\)\);/);
});

test('Getting Ready: the How to Set Up guide, a glass Play pill, inline and muted, four short rows, the steps one tap away', async () => {
  const html = await read('index.html'), text = pageText(html);
  // Round 3 fix: the setup guide (the live hotfix), never the older Camera app clip, which shows a
  // different product (a hidden helper, a 5 s hold, "upload to Google Drive"). That clip stays only in
  // Learn's "Another Way: Film a Clip".
  assert.match(tag(html, 'howPoster'), /src="assets\/setup-guide-poster\.jpg"/);
  const v = tag(html, 'howVideo');
  assert.match(v, /src="assets\/setup-guide\.mp4"/);
  assert.match(v, /poster="assets\/setup-guide-poster\.jpg"/);
  assert.match(v, /muted/);
  assert.match(v, /playsinline/);
  assert.match(tag(html, 'howPlay'), /aria-label="Play the setup guide"/);
  assert.match(html, /<div class="vhero" data-clip="guide">/);
  assert.ok(!/Stand-in clip/.test(text), 'no stand-in label on the main path');
  const ready = html.slice(html.indexOf('id="flowReady"'), html.indexOf('id="flowAllow"'));
  assert.ok(!/how-to\.mp4|how-to-poster/.test(ready.replace(/<!--[\s\S]*?-->/g, '')), 'the Camera app clip is never on Getting Ready');
  const learn = html.slice(html.indexOf('id="tabLearn"'), html.indexOf('<div class="tabfade"'));
  assert.match(learn, /<summary>Another Way: Film a Clip for the Full Analysis<\/summary>[\s\S]*src="assets\/how-to\.mp4"/);
  const app = await read('app.js');
  assert.match(app, /playing \? 'Pause the setup guide' : 'Play the setup guide'/);
  const sw = await read('sw.js');
  assert.match(sw.match(/const CORE = \[([^\]]+)\]/)[1], /'\.\/assets\/setup-guide-poster\.jpg'/, 'the poster offline');
  const { stat } = await import('node:fs/promises');
  assert.ok((await stat(new URL('../assets/setup-guide.mp4', import.meta.url))).size > 1e6, 'the guide is in this tree');
  const rows = [...ready.match(/<ul class="ilist">([\s\S]*?)<\/ul>/)[1].matchAll(/<span>([^<]+)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(rows, ['A chair and a 20 cm box', 'Your road bike, kit and shoes', '3 m of space, with light on you', 'Volume up, silent mode off']);
  for (const r of rows) assert.ok(r.split(' ').length <= 8, `a handful of words: ${r}`);
  // The setup steps fold away, closed, the first time too; no rotation lock (DECISIONS.md: only the
  // volume and silent mode may be mentioned).
  assert.match(tag(html, 'stepsFold'), /<details class="fold" id="stepsFold">/);
  assert.ok(!/rotation lock|Control Centre/i.test(pageText(ready)));
  assert.match(text, /Getting Ready/);
});

test('glass circle buttons, no Cancel or Done words, and every button at least 44 pt', async () => {
  const html = await read('index.html');
  for (const id of ['flowClose', 'readyClose', 'done', 'shareHintClose']) assert.match(tag(html, id), /class="glass close"[^>]*aria-label="Close"/, id);
  assert.match(tag(html, 'readyBack'), /class="glass back"[^>]*aria-label="Back"/);
  const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  for (const b of buttons) assert.ok(!/^(Cancel|Done)$/.test(b), b);
  const c = css(html);
  assert.match(c, /\.glass \{[^}]*width: 44px; height: 44px;/);
  for (const cls of ['primary', 'tinted', 'fprimary']) assert.match(c, new RegExp(`\\.${cls} \\{[^}]*min-height: 5[02]px;`), cls);
  for (const cls of ['soft', 'plain', 'link']) assert.match(c, new RegExp(`\\.${cls} \\{[^}]*min-height: 44px;`), cls);
  assert.match(c, /\.stepper button \{[^}]*width: 44px; height: 44px;/);
});

test('the results: a sheet in place of the tabs, one focus order, and no card squeezed to 0 px', async () => {
  const html = await read('index.html'), text = pageText(html);
  assert.match(tag(html, 'results'), /class="sheet"[^>]*role="dialog"/);
  const at = (id) => html.indexOf(`id="${id}"`);
  assert.ok(at('rStatus') < at('rWhat') && at('rWhat') < at('rWhy') && at('rWhy') < at('rHowToSlot') && at('rHowToSlot') < at('rMade') && at('rMade') < at('rList'));
  assert.match(text, /I Made This Change/);
  assert.match(text, /How far did it move\?/);
  assert.match(text, /The phone is already in place\./);
  for (const id of ['rMadeLess', 'rMadeMore', 'rMadeMm', 'rMadeNow']) assert.ok(at(id) > 0, id);
  // Round 3, builder E: the one primary button at the bottom, in a bar that sticks there: Check It Now
  // with the line under it, and Check Again.
  const bar = html.slice(at('rBar'), html.indexOf('</div>', at('rBar')));
  for (const id of ['rMadeNow', 'rMadeHint', 'again']) assert.ok(bar.includes(`id="${id}"`), id);
  assert.match(css(html), /\.sbar \{ position: sticky; bottom: 0;/);
  // The safety lines, short, on the results sheet.
  assert.match(text, /Not medical advice\. For pain that keeps coming back, see a bike fitter\./);
  // The how-to card rendered 0 px tall in round 2 (flex shrink with overflow hidden): nothing in the
  // sheet or the tabs may shrink.
  const c = css(html);
  assert.match(c, /\.sheet \.in > \* \{ flex: none; \}/);
  assert.match(c, /\.tab > \* \{ flex: none; \}/);
  const app = await read('app.js');
  assert.match(app, /d\.open = false;/, 'How to Do It is one tap away');
  // One screen at a time: no tab bar under the sheet, and nothing behind it to reach.
  assert.match(app, /for \(const s of \['home', 'flow', 'run', 'results'\]\) el\[s\]\.hidden = s !== name;/);
  assert.match(app, /document\.body\.classList\.toggle\('in-sheet', name === 'results'\)/);
});

test('Progress and Learn have what the review asked for', async () => {
  const text = pageText(await read('index.html'));
  for (const s of ['Saddle Height', 'Reach and Bars', 'Changes You Made', 'All Checks']) assert.ok(text.includes(s), s);
  // Checks are only compared with checks done the same way: Progress says which way under its chart.
  assert.match(await read('app.js'), /parts\.push\(make\('p', 'small', `Checks with the bike \$\{bike\}\.`\)\)/);
  for (const s of ['How a Check Works', 'Where the Phone Goes', 'Three Ways to Hold the Bike', 'Add to Home Screen First', 'Mark the Spot', 'Private by Design', 'How Exact It Is']) assert.ok(text.includes(s), s);
  const html = await read('index.html');
  const steps = html.match(/<ol class="card flat list nums steps8">([\s\S]*?)<\/ol>/)[1];
  assert.equal((steps.match(/<li>/g) || []).length, 8, 'eight steps');
  const place = html.match(/<ol class="list nums place">([\s\S]*?)<\/ol>/)[1];
  assert.equal((place.match(/<li>/g) || []).length, 10, 'ten placement details');
  // Round 3, builder E: the ten details one tap away, under the drawing.
  assert.match(html, /<details class="learnmore inset">\s*<summary>Every Detail<\/summary>\s*<ol class="list nums place">/);
  for (const li of steps.match(/<li>[\s\S]*?<\/li>/g)) assert.ok(li.replace(/<[^>]+>/g, '').split(' ').length <= 8, li);
  assert.match(html, /<svg class="above"[^>]*role="img"[^>]*aria-label="Seen from above:/);
  // Accuracy only in the README's words: the study's 3 to 9 degrees, 2.5 degrees counted as in range.
  assert.match(text, /typically off by 3 to 9 degrees against lab markers/);
});

test('iOS 26 colour tokens, light and dark, the check flow dark in both, and status words in normal capitals', async () => {
  const html = await read('index.html'), c = css(html);
  for (const t of ['--blue: #0088FF', '--bg: #F2F2F7', '--card: #FFFFFF', '--red-text: #C4001A', '--orange-text: #A82C00', '--green-text: #1E7A35', '--indigo: #6155F5']) assert.ok(c.includes(t), t);
  const dark = c.slice(c.indexOf('@media (prefers-color-scheme: dark)'));
  for (const t of ['--blue: #0091FF', '--bg: #000000', '--card: #1C1C1E']) assert.ok(dark.includes(t), t);
  assert.ok(!/#007AFF|#2e8cff/i.test(c), 'the old blues are gone');
  assert.match(c, /--f-bg: #131A24;/);
  assert.match(c, /\.flow \{[^}]*background: var\(--f-bg\)[^}]*color-scheme: dark;/);
  const pill = c.match(/\.pill \{[^}]*\}/)[0];
  assert.ok(!/text-transform/.test(pill), pill);
  assert.match(pill, /font-weight: 700/);
  // Text grows with the iPhone's text size.
  assert.match(c, /@supports \(font: -apple-system-body\) \{ html \{ font: -apple-system-body; \} \}/);
  assert.ok(!/[\u2013\u2014]/.test(html), 'no en or em dashes');
  assert.ok(!/[\u2013\u2014]/.test(await read('ui.js')));
});

test('the service worker caches the new files under its own prefix', async () => {
  const sw = await read('sw.js');
  const core = sw.match(/const CORE = \[([^\]]+)\]/)[1];
  for (const f of ['./ui.js', './assets/setup-guide-poster.jpg', './assets/how-to-poster.jpg', './index.html', './app.js', './fit.js']) assert.ok(core.includes(`'${f}'`), f);
  const { access } = await import('node:fs/promises');
  for (const f of core.match(/'([^']+)'/g).map(x => x.slice(1, -1)).filter(f => f !== './')) await access(new URL(`../${f.slice(2)}`, import.meta.url));
  assert.match(sw, /const CACHE = 'bfc-/);
});

test('VoiceOver: check chips read "Level, done", area readings read as one short sentence', async () => {
  const app = await read('app.js');
  assert.match(app, /c\.setAttribute\('aria-label', `\$\{k\}, \$\{ok == null \? 'not known yet' : ok \? 'done' : 'not yet'\}`\)/);
  assert.match(app, /box\.setAttribute\('aria-label', ui\.rangeLabel\(/);
  assert.match(app, /el\.rStatus\.setAttribute\('aria-label'/);
});

test('round 3 fix: white on the blue primary buttons passes WCAG AA, as large text', async () => {
  // WCAG 2.1: 4.5:1 for text, 3:1 for large text, which is 18.66 px (14 pt) bold or 24 px. The iOS 26
  // blues give white 3.52:1 (light, #0088FF) and 3.23:1 (dark and the check flow, #0091FF), so the
  // labels are bold and at least 18.7 px at every text size: then 3:1 applies and both pass.
  const html = await read('index.html'), c = css(html);
  const lum = (hex) => {
    const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const light = c.match(/--blue: (#[0-9A-F]{6});/i)[1];
  const dark = c.slice(c.indexOf('@media (prefers-color-scheme: dark)')).match(/--blue: (#[0-9A-F]{6});/i)[1];
  const flow = c.match(/--f-accent: (#[0-9A-F]{6});/i)[1];
  for (const cls of ['primary', 'fprimary']) {
    const rule = c.match(new RegExp(`\\.${cls}, \\.(?:primary|fprimary) \\{[^}]*\\}|\\.${cls} \\{[^}]*\\}`, 'g')).join(' ');
    const weight = Number(rule.match(/font-weight: (\d+)/)?.[1]);
    const size = rule.match(/font-size: max\(([\d.]+)px, [\d.]+rem\)/);
    const large = weight >= 700 && size && Number(size[1]) >= 18.66;
    for (const bg of cls === 'primary' ? [light, dark] : [flow]) {
      const r = ratio(bg, '#FFFFFF');
      assert.ok(r >= (large ? 3 : 4.5), `.${cls}: white on ${bg} is ${r.toFixed(2)}:1 with ${weight} weight, ${size ? size[0] : 'no size floor'}`);
    }
  }
});
