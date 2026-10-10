// The sound on an iPhone, and the setup guide at the top of the home screen (the 2026-10-10 hotfix).
// iOS lets a page make sound only from inside a tap, and the silent switch mutes the spoken voice and
// the beeps; none of that can run here, so these check the code is in the order it needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
const pageText = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
// A top-level function of app.js, by its source (app.js itself needs a page to load).
async function fnFrom(name) {
  const src = await read('app.js');
  const at = src.indexOf(`function ${name}(`);
  assert.ok(at >= 0, name);
  return new Function(`${src.slice(at, src.indexOf('\n}\n', at) + 2)}; return ${name};`)();
}

test('the voice: a Premium, then an Enhanced American or British voice on the phone, otherwise as before', async () => {
  const bestVoice = await fnFrom('bestVoice');
  const v = (name, lang, localService = true, voiceURI = '') => ({ name, lang, localService, voiceURI });
  const daniel = v('Daniel', 'en-GB'), samantha = v('Samantha', 'en-US');
  const enhanced = v('Samantha (Enhanced)', 'en-US'), premium = v('Ava (Premium)', 'en-US');
  assert.equal(bestVoice([daniel, samantha, enhanced, premium]), premium);
  assert.equal(bestVoice([daniel, enhanced, samantha]), enhanced);
  assert.equal(bestVoice([v('Serena (Premium)', 'en_GB'), daniel]).name, 'Serena (Premium)');
  // Safari may say it only in the voice's address.
  assert.equal(bestVoice([daniel, v('Ava', 'en-US', true, 'com.apple.voice.premium.en-US.Ava')]).name, 'Ava');
  // Not on the phone, or not American or British: not preferred.
  assert.equal(bestVoice([v('Net (Premium)', 'en-US', false), daniel]), daniel);
  assert.equal(bestVoice([v('Karen (Premium)', 'en-AU'), daniel]), daniel);
  // The order before: British on the phone, then other English on the phone, then any English.
  assert.equal(bestVoice([samantha, daniel]), daniel);
  assert.equal(bestVoice([v('Google', 'en-US', false), samantha]), samantha);
  assert.equal(bestVoice([v('Google', 'en-US', false), v('Anna', 'de-DE')]).name, 'Google');
  assert.equal(bestVoice([v('Anna', 'de-DE')]), null);
  assert.equal(bestVoice([]), null);
});

test('a tap that leads to sound sets the audio session, then wakes the beeps, then the voice, before anything waits', async () => {
  const src = await read('app.js');
  const unlock = src.slice(src.indexOf('function unlockSound('), src.indexOf('\n}\n', src.indexOf('function unlockSound(')));
  const a = unlock.indexOf("navigator.audioSession.type = 'playback'"), b = unlock.indexOf('Beep.init()'), c = unlock.indexOf('Voice.unlock()');
  assert.ok(a > 0 && a < b && b < c, unlock);
  // The voice's unlock is a real word, almost silent; the beeps' is one silent sample.
  const v = src.slice(src.indexOf('  unlock() {'), src.indexOf('  est(text)'));
  const word = v.match(/new SpeechSynthesisUtterance\('([^']*)'\)/)?.[1];
  assert.ok(word && word.trim(), v);
  const vol = Number(v.match(/u\.volume = ([\d.]+)/)?.[1]);
  assert.ok(vol > 0 && vol <= 0.05, String(vol));
  assert.match(src.slice(src.indexOf('const Beep = {'), src.indexOf('  tone(')), /createBuffer\(1, 1, /);
  // Start: everything before its first wait.
  const start = src.slice(src.indexOf('async function start()'));
  assert.ok(start.indexOf('unlockSound();') > 0 && start.indexOf('unlockSound();') < start.indexOf('await '));
  // Every other tap that speaks goes through it too.
  const calls = src.split('\n').filter(l => /Voice\.unlock\(\)/.test(l));
  assert.deepEqual(calls.map(l => l.trim()), ['if (speech) Voice.unlock();']);
  for (const fn of ['function askSetup(', 'function madeHere(', 'function madeHome(']) {
    const body = src.slice(src.indexOf(fn), src.indexOf('\n}\n', src.indexOf(fn)));
    assert.ok(body.indexOf('unlockSound()') < body.indexOf('Voice.say('), fn);
  }
  assert.match(src, /el\.speak\.addEventListener\('click', \(\) => \{ unlockSound\(\);/);
});

test('Test the Sound plays the recorded clip from one shared audio element', async () => {
  const src = await read('app.js'), html = await read('index.html');
  const handler = src.slice(src.indexOf("el.soundTest.addEventListener('click'"), src.indexOf('\n});\n', src.indexOf("el.soundTest.addEventListener('click'")));
  assert.match(handler, /unlockSound\(false\)/); // no unlock word over the clip
  assert.match(handler, /el\.soundClip\.play\(\)/);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  const audio = html.slice(html.indexOf('<audio id="soundClip"'), html.indexOf('</audio>'));
  assert.match(audio, /<source src="assets\/voice\/sound-check\.m4a" type="audio\/mp4">/);
  assert.match(audio, /<source src="assets\/voice\/sound-check\.mp3" type="audio\/mpeg">/);
  // Start stops the guide and the clip, so they do not talk over the coach.
  const start = src.slice(src.indexOf('async function start()'), src.indexOf('await ', src.indexOf('async function start()')));
  assert.match(start, /el\.guideVideo\.pause\?\.\(\);/);
  assert.match(start, /el\.soundClip\.pause\?\.\(\);/);
});

test('How to Set Up: the guide video at the top, open, above the setup question and Start', async () => {
  const html = await read('index.html'), text = pageText(html);
  const at = (id) => html.indexOf(`id="${id}"`);
  assert.ok(at('guideCard') > 0 && at('guideCard') < at('setupCard') && at('setupCard') < at('start'));
  const card = html.slice(at('guideCard'), html.indexOf('</section>', at('guideCard')));
  assert.ok(!/<details/.test(card), 'nothing to open');
  assert.match(card, /<h2 id="guide-h">How to Set Up<\/h2>/);
  const video = card.match(/<video id="guideVideo"[^>]*>/)?.[0] || '';
  for (const a of ['src="assets/setup-guide.mp4"', 'poster="assets/setup-guide-poster.jpg"', ' controls', ' playsinline', 'preload="none"']) assert.ok(video.includes(a), a);
  assert.match(card, /<button id="soundTest" class="secondary" type="button">Test the Sound<\/button>/);
  assert.match(text, /No sound\? Turn the volume up and switch off silent mode\. Keep silent mode off during the check too/);
  // His ruling: the better voice comes built in; the rider is never asked to change phone settings for it.
  assert.ok(!/Spoken Content|download a (better )?voice|Premium|Enhanced/i.test(text));
  // The other way of filming is still there, as it was.
  assert.match(html, /<summary>Another way: film a clip for the full analysis<\/summary>/);
  assert.match(html, /src="assets\/how-to\.mp4"/);
  // Small enough for a phone: the brief's limit is about 4 MB.
  assert.ok((await stat(new URL('../assets/setup-guide.mp4', import.meta.url))).size < 4 * 1024 * 1024);
});
