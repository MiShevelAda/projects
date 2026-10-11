// The camera view of round 3 (builder B): the camera the screen question picks, the 3 m layer with the
// screen towards the rider, the arm's-length layout with it away, the figure and its outline, the
// placement step and its spoken line. ui.liveView is the design review's state table as a pure
// function; the rest is read from index.html and app.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as ui from '../ui.js';
import * as fit from '../fit.js';
import { synthPose } from './synth.js';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const css = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const tag = (html, id) => html.match(new RegExp(`<[a-z]+[^>]*id="${id}"[^>]*>`))?.[0] || '';
const front = (s) => ui.liveView({ front: true, mirrored: true, face: 1, ...s });
const rear = (s) => ui.liveView({ front: false, mirrored: false, face: 1, ...s });

test('the state table, screen towards the rider: level, checking, not in place, in place', () => {
  const place = front({ phase: 'phone', placing: true });
  assert.equal(place.layer, 'place');
  assert.equal(place.step, 'Step 1 of 5');
  const level = front({ phase: 'phone', sensor: true, landscape: true, tilt: 2.3, bubble: 0.4 });
  assert.equal(level.layer, 'level');
  assert.equal(level.border, 'yellow', 'dashed yellow: it needs you');
  assert.equal(level.level.text, '2°');
  assert.equal(level.level.bubble, 0.4);
  assert.ok(level.caption, 'captions in the setup steps');
  assert.equal(front({ phase: 'phone', sensor: true, landscape: false }).word, 'Turn');
  const levelled = front({ phase: 'mount', levelled: true });
  assert.deepEqual(levelled.field, { tone: 'green', word: 'Level', sub: 'Leave the phone there', icon: 'check' });
  assert.equal(levelled.step, 'Step 1 of 5');
  const getOn = front({ phase: 'mount' });
  assert.deepEqual([getOn.word, getOn.border, getOn.tone, getOn.icon, getOn.ghost, getOn.figure], ['Get On', 'yellow', 'yellow', null, true, true]);
  assert.equal(front({ phase: 'mount', inView: true }).icon, 'tick', 'a tick means you are in the picture');
  assert.equal(front({ phase: 'mount', asking: true }).word, 'Turn');
  const wait = front({ phase: 'frame', rider: true });
  assert.deepEqual([wait.word, wait.sub, wait.border, wait.tone], ['Wait', 'Stay on the bike', 'blue', 'white']);
  const move = front({ phase: 'frame', rider: true, fix: { key: 'angle', toward: 'front' } });
  assert.deepEqual([move.word, move.sub, move.border, move.tone, move.icon], ['Move', 'Phone towards the front wheel', 'yellow', 'yellow', 'arrow']);
  const stay = front({ phase: 'frame', rider: true, ok: true });
  assert.deepEqual([stay.word, stay.sub, stay.border, stay.tone, stay.icon], ['Stay', 'You are in place', 'green', 'green', 'check']);
  assert.equal(stay.step, 'Step 2 of 5');
  assert.match(ui.avatarLabel(stay), /You are in place/);
  assert.match(ui.avatarLabel(move), /not in place yet\. Phone towards the front wheel\./);
});

test('the state table, screen towards the rider: holding still and pedalling go still, with only the ring', () => {
  const hold = front({ phase: 'still', hold: { capturing: true, elapsed: 1.6, total: 3.2 } });
  assert.deepEqual([hold.layer, hold.word, hold.border, hold.caption, hold.figure, hold.ghost], ['ring', 'Hold', 'blue', false, false, false]);
  assert.equal(hold.ring.frac, 0.5);
  assert.ok(hold.ring.hold);
  assert.equal(hold.step, 'Step 3 of 5');
  assert.equal(front({ phase: 'still', hold: {} }).ring.frac, 0, 'empty until the hold starts');
  // Reduce Motion: one step a second.
  assert.equal(front({ phase: 'still', reduce: true, hold: { capturing: true, elapsed: 1.6, total: 3.2 } }).ring.frac, 1 / 3.2);
  const flash = front({ phase: 'pedal', flash: true });
  assert.deepEqual([flash.layer, flash.field.tone, flash.field.icon], ['field', 'green', 'check'], 'one green flash when the reading is taken');
  const before = front({ phase: 'pedal', pedal: { started: false, total: 20, dir: 'backwards' } });
  assert.deepEqual([before.layer, before.word, before.ring.digits, before.ring.frac, before.sub], ['ring', 'Pedal', '20', 0, 'Backwards, steady']);
  const pedal = front({ phase: 'pedal', pedal: { started: true, elapsed: 10, total: 20, left: 9.6, dir: 'backwards' } });
  assert.deepEqual([pedal.ring.digits, pedal.ring.frac, pedal.border, pedal.caption, pedal.step], ['10', 0.5, 'blue', false, 'Step 4 of 5']);
  assert.equal(front({ phase: 'pedal', pedal: { started: true, elapsed: 30, total: 30, left: 0, more: true, dir: 'forwards' } }).sub, 'A few more turns');
  assert.equal(front({ phase: 'pedal', pedal: { started: false, total: 30, dir: 'forwards' } }).sub, 'Forwards, long-ride effort');
});

test('screen away: the same figure and outline, the last correction on a card, the ring kept for a helper', () => {
  const move = rear({ phase: 'frame', rider: true, fix: { key: 'centre', toward: 'back' } });
  assert.equal(move.layer, 'avatar');
  assert.ok(move.ghost && move.figure);
  assert.deepEqual(move.card, { sub: 'Phone towards the back wheel', arrow: -1 });
  const pedal = rear({ phase: 'pedal', pedal: { started: true, elapsed: 5, total: 20, left: 15, dir: 'backwards' } });
  assert.equal(pedal.layer, 'avatar', 'the picture stays');
  assert.ok(pedal.figure);
  assert.equal(pedal.ring.digits, '15');
  assert.equal(pedal.caption, false);
  // Back at the phone after a correction, re-levelling: the card stays until he is back on.
  assert.deepEqual(rear({ phase: 'phone', sensor: true, landscape: true, tilt: 4, fix: { key: 'small' } }).card, { sub: 'Phone a bit closer', arrow: 0 });
});

test('directions along the bike in bike words, and the arrow points at the real wheel', () => {
  for (const key of ['feet', 'head', 'edge', 'small', 'big', 'centre', 'angle', 'dark']) {
    for (const toward of [null, 'front', 'back']) {
      const s = ui.placeSign({ key, toward });
      assert.ok(!/\b(left|right)\b/i.test(`${s.word} ${s.sub}`), `${key}: ${s.sub}`);
    }
  }
  // The rider faces the camera's right: the front wheel is to the right of the camera's picture. The
  // back camera's picture is shown as it is; the front camera's like a mirror, so it is on the left.
  assert.equal(ui.arrowDir('front', 1, false), 1);
  assert.equal(ui.arrowDir('front', 1, true), -1);
  assert.equal(ui.arrowDir('back', 1, true), 1);
  assert.equal(ui.arrowDir('front', -1, false), -1);
  // fit's corrections carry the way along the bike that their words say.
  const W = 1280, H = 720;
  const found = [fit.checkFraming(synthPose(-Math.PI / 2, { cx: 1000 }), 'L', W, H), fit.checkFraming(synthPose(-Math.PI / 2, { cx: 260, scale: 0.25 }), 'L', W, H),
    fit.checkSideOn(synthPose(-Math.PI / 2, { farGap: -60 }), 'L', W, H), fit.checkSideOn(synthPose(-Math.PI / 2, { farGap: 60 }), 'L', W, H)];
  assert.deepEqual(found.map(p => p.key), ['centre', 'centre', 'angle', 'angle']);
  assert.deepEqual(new Set(found.map(p => p.toward)), new Set(['front', 'back']));
  for (const p of found) assert.match(p.say, new RegExp(`towards the ${p.toward} wheel`), p.say);
});

test('the result on the camera view: one big word or the millimetres, in green or yellow, then See What to Do', () => {
  const raise = { change: { kind: 'saddle', raise: true, mm: [10, 10], headline: 'Raise the saddle about 10 mm' } };
  assert.deepEqual(ui.resultField(raise), { tone: 'yellow', icon: 'up', mm: true, word: '10 mm', sub: 'Raise the saddle about 10 mm' });
  assert.equal(ui.resultField({ change: { kind: 'saddle', raise: false, mm: [12, 15], headline: 'Lower the saddle about 12 to 15 mm' } }).word, '12 to 15 mm');
  assert.equal(ui.resultField({ change: { kind: 'saddle', raise: false, mm: [5, 6], headline: 'x' } }).icon, 'down');
  assert.deepEqual(ui.resultField({ change: { kind: 'bars', headline: 'Raise the handlebars' } }), { tone: 'yellow', icon: 'up', word: 'Bars', sub: 'Raise the handlebars' });
  assert.deepEqual(ui.resultField({ verdict: 'ok' }, { nothing: true, grade: 'green', what: 'Nothing to change today' }), { tone: 'green', icon: 'check', word: 'Good', sub: 'Nothing to change today' });
  assert.equal(ui.resultField({ verdict: 'ok' }, { win: true }).sub, 'Your saddle change worked');
  assert.deepEqual(ui.resultField({ verdict: 'disagree' }, { what: 'Film again' }), { tone: 'yellow', icon: null, word: 'Again', sub: 'Film again' });
  // Round 3 fix: nothing to change, but the held-still reading asks for one more film: AGAIN, in the
  // voice's own words, never GOOD over "Film once more to be sure".
  const once = { verdict: 'ok', stillOut: true, stillOutAgain: false };
  assert.ok(ui.onceMore(once));
  assert.deepEqual(ui.resultField(once, { nothing: true, grade: 'green', what: 'Nothing to change today', once: ui.onceMore(once) }),
    { tone: 'yellow', icon: null, word: 'Again', sub: 'Film once more to be sure' });
  assert.match(fit.spokenSummary(once), /Film once more to be sure\.$/);
  // Never Excellent, and the big words are never a status the areas do not give.
  for (const w of ['Good', 'Again', 'Bars']) assert.ok(!/Excellent/.test(w));
});

test('the camera: Towards me films with the front camera, Away from me with the back one, stored with each session', async () => {
  const app = await read('app.js');
  assert.match(app, /const askedFacing = \(\) => \(\(session\?\.screen \?\? screen\) === 'towards' \? 'user' : 'environment'\);/);
  assert.match(app, /const facingMode = \{ ideal: askedFacing\(\) \};/);
  assert.equal((app.match(/\{ facingMode, width: \{ ideal: (1920|1280) \}/g) || []).length, 2, 'both resolutions');
  assert.ok(!/facingMode: \{ ideal: 'environment' \}/.test(app), 'no camera fixed in the code any more');
  assert.match(app, /h\.unshift\(\{[^}]*camera: session\?\.camera/);
  // track.getSettings() once after the first frame, into the debug info.
  assert.match(app, /if \(!camLogged\) logCamera\(\);/);
  assert.match(app, /st = stream\?\.getVideoTracks\(\)\[0\]\?\.getSettings\?\.\(\)/);
  assert.match(app, /debug\.camera = \{/);
  // The front camera's picture shown like a mirror, by CSS only.
  const html = await read('index.html');
  assert.match(css(html), /#run\.mirror \.stage \{ transform: scaleX\(-1\); \}/);
  assert.match(app, /mirrorShown\(\) \? 'mirror' : ''/);
  // One flag decides the roll's sign and whether the screen mirrors the picture (and so the arrows):
  // if Safari's front frames come mirrored already, the screen must not mirror them again.
  assert.match(app, /const mirrorShown = \(\) => camera === 'front' && !fit\.FRONT_FRAMES_MIRRORED;/);
  assert.match(app, /mirrored: mirrorShown\(\), phase/);
  assert.ok(!/camera === 'front' \? ' ?mirror' : ''/.test(app), 'no mirror decided apart from the flag');
  assert.ok(!/1 - p\.x|1 - lm\[i\]\.x/.test(app), 'the landmarks are never mirrored');
});

test('the roll is taken out before any angle is measured, and only the drawing uses the raw picture', async () => {
  const app = await read('app.js');
  const step = app.slice(app.indexOf('function step(rawPoses'), app.indexOf('// Someone else in the picture, once the rider is confirmed'));
  assert.match(step, /const poses = roll \? rawPoses\.map\(p => fit\.derotate\(p, roll, W, H\)\) : rawPoses;/);
  // Everything that measures takes the turned poses: picking the rider, the identity check, the angles.
  assert.match(step, /identify\(poses, t, W, H\)/);
  assert.match(step, /fit\.pickRider\(poses, track/);
  assert.match(step, /ang = fit\.frameAngles\(lm, side, W, H\)/);
  assert.ok(step.indexOf('fit.derotate') < step.indexOf('fit.pickRider'));
  assert.match(step, /draw\(raw, W, H, side, rawPoses\.filter/);
  assert.match(app, /return fit\.imageRoll\(Tilt\.g, camera\);/);
  // Whether he is cut off at the edges is judged where the camera saw him.
  assert.match(app, /fit\.checkFraming\(raw \|\| lm, side, W, H\)/);
});

test('the live screen is built to the design review: 14 pt border, 120 pt words, a 250 pt ring, 15 pt captions', async () => {
  const html = await read('index.html'), c = css(html), app = await read('app.js');
  assert.match(tag(html, 'borderRect'), /stroke-width="14"/);
  assert.match(tag(html, 'borderRect'), /rx="40"/);
  assert.match(app, /blue: \['#0091FF', 'none'\], yellow: \['#FFD600', '26 20'\], green: \['#30D158', 'none'\]/, 'solid blue, dashed yellow, solid green');
  assert.match(c, /\.sign \.word \{ font-size: 120px; \}/);
  assert.match(c, /\.ringWords \.word \{ font-size: 128px; \}/);
  assert.match(c, /\.ring \{ position: relative; width: 250px; height: 250px;/);
  assert.match(c, /\.ring \.digits \{[^}]*font-size: 128px;/);
  assert.match(html, /<circle id="ringArc"[^>]*stroke-width="24"/);
  assert.match(c, /\.field \.word \{ font-size: 160px;/);
  assert.match(c, /\.levelView \.deg \{[^}]*font-size: 140px;/);
  assert.match(c, /\.word \{ font-family: var\(--rounded\); font-weight: 800; text-transform: uppercase;/, 'heavy rounded capitals');
  assert.match(c, /\.caption \{[^}]*font-size: 0\.882rem;/, '15 pt, growing with the text size');
  assert.match(c, /#run\.nocap \.caption \{ display: none; \}|\.caption:empty, #run\.nocap \.caption \{ display: none; \}/);
  assert.match(c, /\.fixCard \{[^}]*font-size: 1\.412rem;/, 'the frosted card at 24 pt');
  assert.match(c, /\.fixCard \{[^}]*backdrop-filter: blur\(20px\)/);
  assert.match(c, /\.runbtn \{[^}]*min-height: 44px;/, 'a 44 pt glass Stop');
  assert.match(c, /\.seeWhat \{[^}]*min-height: 48px;/);
  assert.match(c, /#run\.front \.stage video \{ filter: blur\(8px\) brightness\(0\.5\); \}/, 'the picture blurred and dimmed behind the figure');
  assert.match(tag(html, 'stop'), /aria-label="Stop the check"/);
  assert.match(tag(html, 'overlay'), /role="img"/);
  assert.match(html, /<button id="seeWhat"[^>]*>See What to Do<\/button>/);
  // Limb widths at the live screen's size: torso 30, thigh 22, shin 20, arm 15, and no numbers.
  const fig = app.slice(app.indexOf('function drawFigure('), app.indexOf('// raw: the rider\'s landmarks where the camera saw them'));
  for (const [seg, w] of [["at('shoulder'), at('hip')", 30], ["at('hip'), at('knee')", 22], ["at('knee'), at('ankle')", 20], ["at('shoulder'), at('elbow'), at('wrist')", 15]]) assert.ok(fig.includes(`seg([${seg}], ${w})`), seg);
  assert.ok(!/fillText|strokeText/.test(fig), 'no numbers on the figure');
  const draw = app.slice(app.indexOf('function draw(raw'), app.indexOf('// ── the live screen'));
  assert.ok(!/fillText|strokeText|drawSkeleton/.test(draw), 'no numbers on the live screen');
});

test('the placement step and its spoken line: the exact details in short sentences, and never which way to tilt', async () => {
  const app = await read('app.js'), html = await read('index.html');
  // Round 3, builder E: one idea a sentence. The drawing and Learn's Every Detail carry the rest
  // (the 60 to 80 cm, the front edge of the box). Round 5 (the UX review, item 6): the 43-word line,
  // five instructions in one breath, is six short lines of 10 words at most, each its own clip and
  // caption, in the order the hands do it.
  const block = app.slice(app.indexOf('const PLACE = {'), app.indexOf('};', app.indexOf('const PLACE = {')));
  const place = Object.fromEntries([...block.matchAll(/(\w+): '([^']+)'/g)].map(m => [m[1], m[2]]));
  assert.deepEqual(Object.keys(place), ['chair', 'back', 'box', 'phone', 'lens', 'face', 'faceFront']);
  assert.equal(place.chair, 'Put the chair opposite the pedals, about 3 metres away.');
  assert.equal(place.back, 'Turn the chair back away from the bike.');
  assert.equal(place.box, 'Put the box on the chair.');
  assert.equal(place.phone, 'Stand the phone on it, sideways and upright.');
  assert.equal(place.lens, 'Keep the lens level with the top of the tyres.');
  assert.equal(place.face, 'Point the back of the phone at the pedals.');
  assert.equal(place.faceFront, 'Point the screen at the pedals.');
  for (const l of Object.values(place)) {
    assert.equal(l.split(/(?<=\.) /).length, 1, `one sentence: ${l}`);
    assert.ok(l.split(' ').length <= 10, `short: ${l}`);
  }
  assert.doesNotMatch(app, /\bPLACE_LINE\b/, 'the long line is gone');
  assert.match(app, /Voice\.say\(PLACE\.chair\);\s*Voice\.say\(PLACE\.back\);\s*Voice\.say\(PLACE\.box\);\s*Voice\.say\(PLACE\.phone\);\s*Voice\.say\(PLACE\.lens\);\s*Voice\.say\(frontMode\(\) \? PLACE\.faceFront : PLACE\.face\);/);
  assert.match(html, /<h1 id="placeH">Stand Your iPhone Sideways on the Chair<\/h1>/);
  assert.match(css(html), /\.placeText h1 \{ font-size: clamp\(28px, 4\.8vw, 40px\);/, 'about 40 pt');
  const kf = html.slice(html.indexOf('<div class="keyframe">'), html.indexOf('<div class="placeText">'));
  // The voice's words, "level with the top of the tyres": "tyre height" could be read as hub height.
  for (const s of ['chair back', 'box', 'lens at the top of the tyres', 'about 3 m, 4 big steps']) assert.ok(kf.includes(s), s);
  assert.match(html, /<p id="placeSub">On a box, 4 big steps from the pedals\.<\/p>/);
  // Every tilt line: no direction (turning the phone round flips the sign of its tilt).
  const literals = [...app.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2]);
  const tilts = literals.filter(s => /\b[Tt]ilt\b/.test(s));
  assert.ok(tilts.length >= 2);
  for (const s of tilts) assert.ok(!/\b(forward|forwards|backward|backwards|back|towards you|away from you|left|right|up|down)\b/.test(s.replace(/\$\{[^}]*\}/g, '')), s);
  // The framing line with the screen towards him.
  assert.ok(app.includes("'Stand beside the bike and look at the phone. A tick means you are in the picture.'"));
  // Eyes ahead while holding still and pedalling, with the screen towards him only.
  assert.ok(app.includes("'Eyes ahead. Hold still. Three. Two. One.'"));
  assert.ok(app.includes("Voice.say('Eyes ahead, I will count for you.')"));
});

test('the service worker still caches every file the live screen needs', async () => {
  // The live screen adds no file: its drawings are inline in index.html, its code in app.js and ui.js.
  const sw = await read('sw.js'), html = await read('index.html');
  const run = html.slice(html.indexOf('<div id="run"'), html.indexOf('<!-- ── the results'));
  assert.ok(!/src="(?!data:)[^"]+"|href="(?!#)[^"]+"/.test(run), 'nothing fetched from the camera view');
  for (const f of ['./index.html', './app.js', './ui.js', './fit.js']) assert.ok(sw.includes(`'${f}'`), f);
  assert.ok(fit.imageRoll && fit.derotate && fit.inPicture);
});
