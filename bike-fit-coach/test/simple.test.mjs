// Round 3, builder E: the simplicity pass (DECISIONS.md, 2026-10-10: "Think customer experience and
// simplicity first right now too much text and ux ui is not intuitive"). A screen carries one title,
// at most one short line, one obvious primary button and icon rows of a handful of words; details sit
// one tap away; the voice carries the instructions in short sentences. These check what the page and
// the voice are built from. The behaviour of the bottom bar is in flow.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as fit from '../fit.js';
import * as ui from '../ui.js';
import { appLines } from '../tools/voice/catalog.mjs';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
// Design choices: "about 12 words" for a line on a screen, with a little room (14); 22 words for one
// spoken sentence (the friend's old "stand behind the rider" line, kept whole for its safety test, was the
// longest); 16 s for the longest recorded line (it was 22 s before this pass).
const LINE_WORDS = 14, SPOKEN_WORDS = 22, CLIP_SECS = 16;
const words = (s) => s.split(/\s+/).filter(Boolean).length;
// The text blocks a rider sees without a tap: everything outside <details> (a tap away), drawings and
// comments, split at every tag, so each block is one line of text on the screen.
const blocks = (html) => html.replace(/<details[\s\S]*?<\/details>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ')
  .split(/<[^>]+>/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
const between = (html, a, b) => { const i = html.indexOf(a); assert.ok(i >= 0, a); const j = html.indexOf(b, i); assert.ok(j > i, b); return html.slice(i, j); };
// Round 4: the fitter question, the feel question and the revert screen are flow screens too.
const SCREENS = {
  'How Will Your Bike Stay Up?': ['id="flowSetup"', 'id="flowScreen"'],
  'Where Will the Screen Face?': ['id="flowScreen"', 'id="flowFitter"'],
  'Has a Bike Fitter Set This Bike Up for You?': ['id="flowFitter"', 'id="flowPain"'],
  'Pain or Numbness That Keeps Coming Back When You Ride?': ['id="flowPain"', 'id="flowFeel"'],
  'Better, the Same, or Worse?': ['id="flowFeel"', 'id="flowRevert"'],
  'Put the Saddle Back': ['id="flowRevert"', 'id="flowReady"'],
  'Getting Ready': ['id="flowReady"', 'id="flowAllow"'],
  'Allow Camera and Motion': ['id="flowAllow"', 'id="flowWhere"'],
  'Is the Phone Where It Was?': ['id="flowWhere"', '<!-- ── the three tabs'],
  'Check tab': ['id="tabCheck"', 'id="tabProgress"'],
  'Progress': ['id="tabProgress"', 'id="tabLearn"'],
  'Show Me How': ['id="shareHint"', '<!-- ── running'],
  'the camera view': ['<div id="run"', '<!-- ── the results'],
  'the results': ['id="results"', '<audio id="voice"'],
};

test('no paragraph on a main-path screen: every line a rider sees without a tap is about 12 words at most', async () => {
  const html = await read('index.html');
  for (const [name, [a, b]] of Object.entries(SCREENS)) {
    const long = blocks(between(html, a, b)).filter(x => words(x) > LINE_WORDS);
    assert.deepEqual(long, [], `${name}: ${long.join(' | ')}`);
  }
  // Learn is the reference, but its rows are short too, and its longer text sits behind a tap.
  const learn = blocks(between(html, 'id="tabLearn"', '<div class="tabfade"'));
  assert.deepEqual(learn.filter(x => words(x) > LINE_WORDS), []);
});

test('one primary button on each step of the check, at the bottom where the thumb is', async () => {
  const html = await read('index.html');
  for (const [name, [a, b]] of Object.entries(SCREENS).slice(0, 9)) {
    const s = between(html, a, b);
    assert.equal((s.match(/class="fprimary"/g) || []).length, 1, name);
    // Inside the bottom bar.
    assert.match(s.slice(s.indexOf('<div class="fbar">')), /class="fprimary"/, name);
  }
  // The results: one primary in the bar that sticks to the bottom (Check It Now; app.js renderBar
  // makes Check Again the primary when no change waits, and a quiet text button when one does).
  const res = between(html, 'id="results"', '<audio id="voice"');
  // "When will you move it?" has its own primary, Add to Calendar, while the bar is hidden.
  const when = between(res, 'id="rWhen"', 'id="rMadeSaved"');
  assert.match(when, /<button id="whenAdd" class="primary"/);
  assert.equal((res.replace(when, '').match(/class="primary"/g) || []).length, 1);
  assert.match(res, /<div id="rBar" class="sbar">\s*<button id="rMadeNow" class="primary"/);
  const app = await read('app.js');
  assert.match(app, /el\.again\.className = waits \? 'plain' : lastResult && !ui\.checkDone\(lastResult\) \? 'primary' : 'tinted';/);
  assert.match(app, /\$\('rBar'\)\.hidden = when;/);
  // Every way the change card is drawn redraws the bar, a result with no change too.
  assert.match(app, /if \(!change\) \{ renderBar\(\); return; \}/);
  // The Check tab: Start a Check is the one primary; the other buttons there step back.
  for (const id of ['showShare', 'hMadeYes']) assert.match(html, new RegExp(`id="${id}" class="(soft|tinted)"`), id);
  assert.match(app, /el\.newCheck\.className = el\.inApp\.hidden \? 'primary' : 'tinted';/);
  // Back and close are the glass circles; secondary actions are quiet text buttons.
  for (const id of ['rMadeYes', 'rMadeNo']) assert.match(html, new RegExp(`id="${id}" class="plain"`), id);
});

test('details one tap away: the how-to, the setup steps, the placement details, the pain note and the area readings', async () => {
  const html = await read('index.html'), app = await read('app.js');
  assert.match(app, /d\.id = 'rHowTo';\n  d\.open = false;/);
  assert.match(html, /<details class="fold" id="stepsFold">\s*<summary>Setup Steps<\/summary>/);
  assert.ok(!/stepsFold\.open = /.test(app), 'the setup steps never open by themselves');
  assert.match(html, /<details id="rPainBox" class="note painbox" hidden><summary id="rPainShort"><\/summary><p id="rPain"><\/p><\/details>/);
  assert.match(app, /\$\('rPainShort'\)\.textContent = fit\.PAIN_SHORT;/);
  assert.match(app, /d\.append\(make\('summary', null, 'Details'\)/);
  // The full reason and the setup line go into Copy Results, the report for a fitter.
  const report = app.slice(app.indexOf('function resultText('), app.indexOf('const HKEY'));
  assert.match(report, /fit\.headline\(r\)\.why/);
  assert.match(report, /Bike \$\{fit\.setupOf\(r\.setup\)\.bike\}, pedalling/);
});

test('the results headline has one short line under it, for every verdict, and the safety lines stay short', () => {
  const pedal = (knee, more = {}) => ({ strokes: 12, strokesSeen: 12, kneeFlex: knee, torso: 45, elbow: 22, shoulder: 88, ...more });
  const results = [];
  for (let k = 10; k <= 70; k += 0.5) results.push(fit.advise(null, pedal(k), 'wall'));
  for (const still of [null, { kneeFlex: 20 }, { kneeFlex: 30 }, { kneeFlex: 45 }]) {
    for (const p of [null, { strokes: 0, strokesSeen: 0 }, { strokes: 2, strokesSeen: 2 }, { strokes: 2, strokesSeen: 8 }]) results.push(fit.advise(still, p, 'trainer'));
  }
  results.push(fit.advise(null, pedal(35, { torso: 30, elbow: 5, shoulder: 110 }), 'friend'), fit.advise({ kneeFlex: 20 }, pedal(46), 'wall'));
  const verdicts = new Set();
  for (const r of results) {
    const h = fit.headline(r);
    verdicts.add(h.what.replace(/\d+( to \d+)?/, 'N'));
    assert.ok(h.short && words(h.short) <= LINE_WORDS, `${h.what}: ${h.short}`);
    assert.match(h.short, /^[A-Z].*\.$/, h.short);
    assert.ok(h.why.length >= h.short.length, 'the full reason is kept for Say It Again and the report');
  }
  assert.ok(verdicts.size >= 7, [...verdicts].join(' | '));
  assert.ok(words(fit.PAIN_SHORT) <= LINE_WORDS);
  assert.match(fit.PAIN_SHORT, /doctor or physio, and a bike fitter/);
  // The win's line: the before and after, and which way it moved.
  const win = fit.withRetest(fit.advise(null, pedal(37), 'wall'), fit.judgeChange({ made: { kind: 'saddle', dir: 1, mm: 12 }, knee: 44, src: 'pedalling', setup: 'wall' }, { knee: 37, src: 'pedalling', setup: 'wall' }));
  assert.equal(ui.winLine(win), 'Knee bend 44° before, 37° now. It moved the right way.');
  assert.equal(ui.winLine(fit.advise(null, pedal(47), 'wall')), '');
});

test('the voice: short sentences, one idea each, and no recorded line longer than 16 s', async () => {
  const { lines } = appLines();
  const long = [];
  for (const line of lines.keys()) for (const s of line.split(/(?<=[.?])\s+/)) if (words(s) > SPOKEN_WORDS) long.push(s);
  assert.deepEqual(long, []);
  const manifest = JSON.parse(await read('assets/voice/manifest.json'));
  const slow = manifest.clips.filter(c => c.duration > CLIP_SECS).map(c => `${c.duration.toFixed(1)} s: ${c.text}`);
  assert.deepEqual(slow, []);
  // The pedalling instruction is three short lines, not one: the way to pedal, the pain line, eyes ahead.
  const app = await read('app.js');
  const pedal = app.slice(app.indexOf('  pedal: {'), app.indexOf('    tick({ t, ang, rider }) {', app.indexOf('  pedal: {')));
  assert.match(pedal, /Voice\.say\(line\);\n\s*if \(pain\) Voice\.say\(`If your knee hurts, stop pedalling\./);
  assert.match(pedal, /if \(frontMode\(\)\) Voice\.say\('Eyes ahead, I will count for you\.'\);/);
  assert.ok(!/I start timing at the beep/.test(app));
});

test('everything the app needs is built in: the only settings named are the volume and silent mode, outside the stuck-screen line', async () => {
  // DECISIONS.md, 2026-10-10, "Needs to be build in": never ask the rider to download, install or
  // switch anything. The rotation lock line is said only when the screen is stuck upright, and is
  // flagged for the main session; no screen shows it.
  const html = await read('index.html');
  const text = blocks(html).join(' ');
  assert.ok(!/rotation lock|Control Centre|Settings app|download|install/i.test(text), text.match(/.{30}(rotation lock|Control Centre|Settings app|download|install).{30}/i)?.[0]);
});
