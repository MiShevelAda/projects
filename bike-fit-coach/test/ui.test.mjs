// The words and shapes of the screens (ui.js): Title Case, range bars, the Check tab's summary and
// cards, the Progress chart and the list of changes. None of it measures anything: every number
// here comes from fit.js or a stored session, so the tests check that the screens show exactly that.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fit from '../fit.js';
import * as ui from '../ui.js';

const day = (iso) => iso.slice(5, 10);
const DASH = /[\u2013\u2014]/;

test('Title Case for titles and buttons: short words lower case, numbers and units untouched', () => {
  assert.equal(ui.titleCase('Raise the saddle about 10 mm'), 'Raise the Saddle About 10 mm');
  assert.equal(ui.titleCase('Raise the saddle about 9 to 12 mm'), 'Raise the Saddle About 9 to 12 mm');
  assert.equal(ui.titleCase('Nothing to change today'), 'Nothing to Change Today');
  assert.equal(ui.titleCase('Film once more before you change the handlebars'), 'Film Once More Before You Change the Handlebars');
  assert.equal(ui.titleCase('Your saddle change worked'), 'Your Saddle Change Worked');
  assert.equal(ui.titleCase('the first word'), 'The First Word');
  assert.equal(ui.titleCase(''), '');
  // Every headline fit.headline can give comes out with its numbers unchanged.
  for (const what of ['Raise the saddle about 15 mm', 'Lower the saddle about 3 to 4 mm', 'Raise the handlebars', 'Film again', 'Not enough to measure']) {
    const t = ui.titleCase(what);
    assert.deepEqual(t.match(/\d+/g), what.match(/\d+/g), t);
    assert.equal(t.toLowerCase(), what.toLowerCase());
  }
});

test('range bars: the target shaded inside the track, the reading as a dot, never cut off', () => {
  for (const [lo, hi] of [[30, 40], [25, 35], [40, 50], [15, 30], [80, 95]]) {
    for (const v of [lo - 20, lo, (lo + hi) / 2, hi, hi + 20]) {
      const [min, max] = ui.scaleFor([lo, hi], [v]);
      assert.ok(min <= lo && max >= hi, `${lo}-${hi}: scale ${min}-${max}`);
      assert.ok(min < v && v < max, `${v} inside ${min}-${max}`);
      assert.ok(min % 5 === 0 && max % 5 === 0);
      const f = ui.place(v, [min, max]);
      assert.ok(f >= 0.03 && f <= 0.97, `${v}: ${f}`);
    }
  }
  // The dot is on the right side of the band for a reading above the target, and inside it for one in it.
  const svg = ui.rangeBar({ value: 44, lo: 30, hi: 40 });
  const num = (re) => Number(svg.match(re)[1]);
  const bandX = num(/rb-band" x="([\d.]+)"/), bandW = num(/rb-band" x="[\d.]+" y="\d+" width="([\d.]+)"/), dot = num(/rb-dot" cx="([\d.]+)"/);
  assert.ok(dot > bandX + bandW, 'above the target: right of the band');
  const inside = ui.rangeBar({ value: 35, lo: 30, hi: 40 });
  const dot2 = Number(inside.match(/rb-dot" cx="([\d.]+)"/)[1]);
  assert.ok(dot2 > bandX && dot2 < bandX + bandW, 'in the target: on the band');
  assert.match(svg, /Target 30 to 40/);
  assert.match(svg, /aria-hidden="true"/);
  assert.ok(!/rb-prev/.test(svg));
  // The retest win: before as a hollow dot, an arrow to now, both labelled.
  const win = ui.rangeBar({ value: 38, lo: 30, hi: 40, prev: 49, nowLabel: '38° now', prevLabel: '49° before' });
  assert.match(win, /rb-prev/);
  assert.match(win, /rb-arrow/);
  assert.match(win, /38° now/);
  assert.match(win, /49° before/);
  // No reading: no dot.
  assert.ok(!/rb-dot/.test(ui.rangeBar({ value: NaN, lo: 30, hi: 40 })));
  for (const s of [svg, win]) assert.ok(!DASH.test(s));
});

test('VoiceOver reads one reading as one short sentence', () => {
  assert.equal(ui.rangeLabel('Saddle height', 44.4, [30, 40], 'Needs attention'), 'Saddle height, 44 degrees, target 30 to 40, Needs attention');
  assert.equal(ui.rangeLabel('Back angle', NaN, [40, 50], ''), 'Back angle, no reading, target 40 to 50');
});

const entry = (more) => ({ at: '2026-10-03T10:00:00.000Z', v: 2, setup: 'wall', knee: 44, src: 'pedalling',
  values: { kneePedal: 44, kneeStill: 40, torso: 46, elbow: 22, shoulder: 79 }, warn: [], ...more });

test('the Check tab summary: one short line in the results\' own words, from only what the session stored', () => {
  // Round 3, builder E (DECISIONS.md, 2026-10-10: one title, at most one short line): the one thing to
  // do when there is one, else how the saddle and reach look. The cards under it carry the rest.
  const low = entry({ areas: { saddle: 'amber', reach: 'after' }, suggested: { kind: 'saddle', raise: true, mm: [12, 15] } });
  assert.equal(ui.homeSummary(low), 'Your saddle is probably a little low.');
  assert.equal(ui.homeSummary({ ...low, areas: { saddle: 'red', reach: 'after' }, suggested: { kind: 'saddle', raise: false, mm: [9, 12] } }),
    'Your saddle is probably too high.');
  assert.equal(ui.homeSummary(entry({ areas: { saddle: 'green', reach: 'green' }, nothing: true })), 'Your saddle height and reach look right.');
  assert.equal(ui.homeSummary(entry({ areas: { saddle: 'green', reach: 'amber' } })), 'Your saddle height looks right. Your reach is fine to ride.');
  assert.equal(ui.homeSummary(entry({ areas: { saddle: 'green', reach: 'red' }, suggested: { kind: 'bars' } })), 'The front of your bike is probably long and low.');
  assert.equal(ui.homeSummary(entry({ areas: { saddle: 'amber', reach: 'after' } })), 'Your saddle height needs one more check.');
  assert.equal(ui.homeSummary(entry({ areas: { saddle: 'na', reach: 'na' } })), 'Your last check could not measure your saddle height.');
  for (const g of ['green', 'amber', 'na']) for (const r of ['green', 'amber', 'after', 'red']) {
    const line = ui.homeSummary(entry({ areas: { saddle: g, reach: r } }));
    assert.ok(line.split(' ').length <= 12, `about 12 words at most: ${line}`);
  }
  assert.equal(ui.homeSummary(null), '');
  assert.equal(ui.homeSummary({ at: 'x' }), '');
});

test('the Latest Check cards: the stored knee on its range bar, and reach as one line while it waits', () => {
  const [s, r] = ui.latestCards(entry({ areas: { saddle: 'amber', reach: 'after' }, suggested: { kind: 'saddle', raise: true, mm: [12, 15] } }));
  assert.equal(s.title, 'Saddle Height');
  assert.equal(s.value, 44);
  assert.deepEqual([s.lo, s.hi], [30, 40]);
  assert.equal(s.status, 'Fair');
  assert.equal(s.step, 'Raise the saddle about 12 to 15 mm.');
  assert.equal(s.label, 'Saddle height, 44 degrees, target 30 to 40, Fair. Raise the saddle about 12 to 15 mm.');
  assert.ok(r.collapsed);
  assert.equal(r.line, 'Checked after the saddle');
  assert.equal(r.label, 'Reach and Bars: Checked after the saddle');
  // Only the held-still reading: that one, against its own target.
  const [still] = ui.latestCards(entry({ values: { kneeStill: 33 }, areas: { saddle: 'amber', reach: 'na' } }));
  assert.equal(still.value, 33);
  assert.deepEqual([still.lo, still.hi], [25, 35]);
  assert.equal(still.metric, 'knee bend, held still');
  // Reach measured: three rows with their own targets.
  const [, reach] = ui.latestCards(entry({ areas: { saddle: 'green', reach: 'amber' } }));
  assert.ok(!reach.collapsed);
  assert.deepEqual(reach.rows.map(x => [x.key, x.value, x.lo, x.hi]), [['torso', 46, 40, 50], ['elbow', 22, 15, 30], ['shoulder', 79, 80, 95]]);
  assert.deepEqual(ui.latestCards(null), []);
});

const at = (d) => `2026-${d}T10:00:00.000Z`;
const H = [
  entry({ at: at('10-03'), values: { kneePedal: 44, torso: 46 }, made: { kind: 'saddle', dir: 1, mm: 10, at: at('10-04') } }),
  entry({ at: at('10-01'), setup: 'trainer', values: { kneePedal: 36 } }),
  entry({ at: at('09-26'), values: { kneePedal: 47, torso: 45 }, made: { kind: 'saddle', dir: 1, mm: 5, at: at('09-27') } }),
  entry({ at: at('09-22'), v: 1, values: { kneePedal: 52 } }),
  entry({ at: at('09-19'), values: { kneePedal: 49, torso: 44 } }),
];

test('Progress: only checks filmed the same way as the newest, oldest first, and only today\'s knee reading', () => {
  const t = ui.trend(H, 'kneePedal');
  assert.equal(t.setup, 'wall');
  assert.deepEqual(t.points.map(p => p.value), [49, 47, 44], 'the trainer check and the old v1 reading are left out');
  assert.equal(t.points[1].made.mm, 5);
  assert.equal(ui.trend(H, 'kneePedal', 2).points.length, 2);
  assert.deepEqual(ui.trend(H, 'torso').points.map(p => p.value), [44, 45, 46]);
  assert.deepEqual(ui.trend([], 'kneePedal').points, []);
});

test('the Progress chart: the band, one point per check, a marker per change, labels that do not overlap', () => {
  const pts = ui.trend(H, 'kneePedal').points;
  const svg = ui.trendChart(pts, [30, 40], day, { pending: true });
  assert.equal((svg.match(/class="ch-pt/g) || []).length, 3);
  assert.match(svg, /TARGET 30 TO 40/);
  assert.equal((svg.match(/class="ch-mark[ "]/g) || []).length, 2);
  assert.match(svg, /ch-mark next/, 'the change after the last check is not checked yet');
  assert.match(svg, />Saddle up 5 mm</);
  assert.match(svg, />Up 10 mm, next</);
  for (const v of ['49°', '47°', '44°']) assert.ok(svg.includes(`>${v}<`), v);
  // Two marker labels on one row never overlap (CHAR_W is the estimate of their width).
  const labels = [...svg.matchAll(/class="ch-marklabel[^"]*" x="([\d.]+)" y="(\d+)" text-anchor="middle">([^<]+)</g)].map(m => ({ x: +m[1], y: +m[2], w: m[3].length * ui.CHAR_W }));
  for (const a of labels) for (const b of labels) {
    if (a === b || a.y !== b.y) continue;
    assert.ok(a.x + a.w / 2 <= b.x - b.w / 2 || b.x + b.w / 2 <= a.x - a.w / 2, JSON.stringify([a, b]));
  }
  // Not pending: the last marker is a plain one.
  assert.ok(!/ch-mark next/.test(ui.trendChart(pts, [30, 40], day)));
  assert.equal(ui.trendLabel('Knee bend', pts, [30, 40], day),
    'Knee bend: 49 degrees on 09-19, 47 on 09-26, then the saddle went up 5 mm, 44 on 10-03, then the saddle went up 10 mm. Target 30 to 40.');
  assert.ok(!DASH.test(svg));
});

test('the changes he made: what the next check filmed the same way showed, or not checked yet', () => {
  const list = ui.changesList(H);
  assert.equal(list.length, 2);
  assert.equal(list[0].title, 'Raised the Saddle 10 mm');
  assert.ok(list[0].pending);
  assert.equal(list[0].then, 'Not checked yet');
  assert.equal(list[1].title, 'Raised the Saddle 5 mm');
  assert.ok(!list[1].pending);
  // The trainer check in between was filmed another way, so the wall check after it counts.
  assert.equal(list[1].then, 'Then: knee bend 47° before, 44° after');
  assert.equal(ui.changesList([entry({ made: { kind: 'bars', at: 'x' } })])[0].title, 'Raised the Handlebars');
  assert.equal(ui.markLabel({ kind: 'saddle', dir: -1, mm: 4 }), 'Saddle down 4 mm');
  assert.equal(ui.markLabel({ kind: 'bars' }), 'Bars up');
});

test('the results sheet: the status shown is the status of the area the headline is about', () => {
  const low = fit.advise({ kneeFlex: 45 }, { strokes: 8, kneeFlex: 48, torso: 45, elbow: 20, shoulder: 88 }, 'wall');
  const rows = fit.measures(low, { strokes: 8, kneeFlex: 48 });
  const areas = fit.areas(low, rows);
  assert.equal(ui.focusArea(low, areas).key, 'saddle');
  assert.equal(ui.focusArea(low, areas).status, 'Needs attention');
  // A handlebar change: the reach area is the focus.
  const bars = fit.advise({ kneeFlex: 30 }, { strokes: 8, kneeFlex: 35, torso: 30, elbow: 5, shoulder: 100 }, 'wall');
  assert.equal(bars.change?.kind, 'bars');
  assert.equal(ui.focusArea(bars, fit.areas(bars, fit.measures(bars, { strokes: 8, kneeFlex: 35 }))).key, 'reach');
});

test('the retest win: only when the saddle change moved the knee the right way into range, with nothing new to change', () => {
  const prev = { at: 'A', setup: 'wall', knee: 49, src: 'pedalling', made: { kind: 'saddle', dir: 1, mm: 10, at: 'A' } };
  const now = (knee) => fit.withRetest(fit.advise(null, { strokes: 8, kneeFlex: knee, torso: 45, elbow: 20, shoulder: 88 }, 'wall'),
    fit.judgeChange(prev, { knee, src: 'pedalling', setup: 'wall' }));
  assert.ok(ui.retestWin(now(38)), 'moved 11 the right way, in range');
  assert.ok(!ui.retestWin(now(47)), 'still out of range');
  assert.ok(!ui.retestWin(fit.advise(null, { strokes: 8, kneeFlex: 38 }, 'wall')), 'no retest');
  // In range but it moved less than the camera can see: not called a win.
  const small = { ...prev, knee: 40 };
  const r = fit.withRetest(fit.advise(null, { strokes: 8, kneeFlex: 38, torso: 45, elbow: 20, shoulder: 88 }, 'wall'), fit.judgeChange(small, { knee: 38, src: 'pedalling', setup: 'wall' }));
  assert.ok(!ui.retestWin(r));
});

test('round 3 fix: the button that saves a change and checks it now says what it saves', () => {
  const raise = { kind: 'saddle', raise: true, mm: [9, 12] }, lower = { kind: 'saddle', raise: false, mm: [5, 5] };
  assert.deepEqual(ui.checkNowLabel(raise, '9'), { text: 'I Moved It 9 mm, Check Now', aria: 'I moved the saddle 9 millimetres. Save that and check now.', mm: 9 });
  assert.equal(ui.checkNowLabel(lower, 12).text, 'I Moved It 12 mm, Check Now');
  // The number is the one fit.madeChange would store, whole millimetres from 1 to fit.MADE_MAX.
  assert.equal(ui.checkNowLabel(raise, '7.6').mm, fit.madeChange(raise, '7.6', '').mm);
  for (const bad of ['', ' ', '0', '-3', String(fit.MADE_MAX + 1), 'abc', null]) {
    const l = ui.checkNowLabel(raise, bad);
    assert.equal(l.mm, null, `${bad}`);
    assert.ok(!/\d/.test(l.text), `no number it would not store: ${l.text}`);
  }
  assert.equal(ui.checkNowLabel(raise, String(fit.MADE_MAX)).mm, fit.MADE_MAX);
  assert.deepEqual(ui.checkNowLabel({ kind: 'bars' }, ''), { text: 'I Raised the Bars, Check Now', aria: 'I raised the handlebars. Save that and check now.', mm: null });
  // Title Case, as a button.
  for (const l of [ui.checkNowLabel(raise, 9), ui.checkNowLabel(raise, ''), ui.checkNowLabel({ kind: 'bars' })]) assert.equal(ui.titleCase(l.text), l.text);
});
