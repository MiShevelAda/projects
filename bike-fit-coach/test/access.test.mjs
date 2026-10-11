// Round 4, builder C: round 3's leftovers from its QA. The buttons' text contrast, and large text
// (Dynamic Type at its accessibility sizes) on the question screens and in the results bar. Layout is
// measured in the browser (the round 4 C notes); these check the rules and, through the flow runner
// with the sizes it is given, what the app does with them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const run = promisify(execFile);
const runner = new URL('./flow-runner.mjs', import.meta.url).pathname;
const session = (q) => run(process.execPath, [runner, q], { timeout: 120000, maxBuffer: 1 << 26 }).then(r => JSON.parse(r.stdout));

// WCAG 2.1 contrast (1.4.3): 4.5:1, or 3:1 for large text, which is 18.66 px bold or 24 px.
const lum = (hex) => {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// The smallest size a rule can give: max(18.7px, 1.1rem) is never under 18.7 px; 1rem is 17 px, the
// iPhone's default body size (html: 106.25%, then -apple-system-body).
const minPx = (v) => { const m = v.match(/max\(([\d.]+)px/); if (m) return +m[1]; const r = v.match(/([\d.]+)rem/); if (r) return +r[1] * 17; return parseFloat(v); };

test('every filled button passes contrast in light and dark: bold and 18.7 px or more where 4.5:1 is out of reach', async () => {
  const html = await read('index.html');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const tokens = (block) => Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
  const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
  const dark = { ...light, ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('html { font-size'))) };
  const rule = (sel) => css.match(new RegExp(`\\n\\s*\\${sel} \\{([^}]+)\\}`))[1];
  const prop = (r, p) => r.match(new RegExp(`(?:^|;)\\s*${p}:\\s*([^;]+)`))?.[1].trim();
  const col = (v, t) => (v.startsWith('#') ? v : t[v.match(/var\(--([a-z-]+)\)/)[1]]);
  for (const [sel, fg, bg] of [['.primary', '#FFFFFF', 'var(--blue)'], ['.tinted', 'var(--blue-text)', 'var(--fill)']]) {
    const r = rule(sel);
    assert.equal(prop(r, 'color'), fg === '#FFFFFF' ? '#fff' : fg, sel);
    assert.equal(prop(r, 'background'), bg, sel);
    const px = minPx(prop(r, 'font-size')), bold = Number(prop(r, 'font-weight')) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    for (const [name, t] of [['light', light], ['dark', dark]]) {
      const c = ratio(col(fg, t), col(bg, t));
      assert.ok(c >= (large ? 3 : 4.5), `${sel} in ${name}: ${c.toFixed(2)}:1 at ${px} px${bold ? ' bold' : ''}`);
    }
  }
});

test('large text on a question screen: the picture shrinks, then the page scrolls, until the first answer clears the Next bar', async () => {
  // bigtext: the runner gives each question's first answer and its Next button the places the
  // browser measured at 28 px on a 375 x 667 screen (the first answer under the bar).
  const r = await session('setup=wall&flow&seed=rode&bigtext');
  const screens = ['setup', 'screen', 'fitter', 'pain', 'feel'];
  assert.deepEqual(r.flow.screens.filter(s => screens.includes(s)), screens);
  for (const s of screens) {
    const f = r.bigtext[s];
    assert.ok(f, s);
    assert.equal(f.compact, true, `${s}: the picture at the top shrinks`);
    assert.ok(f.scrolledTo > 0, `${s}: then the page scrolls the answer clear (${f.scrolledTo})`);
  }
  // At the normal size nothing changes: the picture stays and nothing scrolls.
  const n = await session('setup=wall&flow&seed=rode');
  assert.ok(n.flow.screens.includes('pain'));
  assert.deepEqual(n.bigtext ?? {}, {});
});

test('large text in the results: a bar taller than a fifth of the screen stops sticking and sits under the change card', async () => {
  const html = await read('index.html');
  assert.match(html, /\.sbar\.flowing \{ position: static;/);
  const app = await read('app.js');
  assert.match(app, /const BAR_SHARE = 0\.2;/);
  // tallbar: the runner gives the bar the height the browser measured at 28 px (230 px of 844).
  const tall = await session('setup=trainer&low&tallbar');
  assert.ok(tall.results && tall.made);
  assert.equal(tall.barFlow.flowing, true);
  assert.equal(tall.barFlow.after, 'rMade', 'right under the change card, where the millimetres are set');
  const plain = await session('setup=trainer&low');
  assert.equal(plain.barFlow.flowing, false);
  assert.equal(plain.barFlow.after, null, 'at the normal size it stays at the bottom of the screen');
});
