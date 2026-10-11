// The sound on an iPhone, and the setup guide (the 2026-10-10 hotfix, carried into round 3: Test the
// Sound became Getting Ready's Tap to Hear Me, and the guide moved to Getting Ready).
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
  const start = src.slice(src.indexOf('async function start('));
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

test('Tap to Hear Me plays the coach\'s recorded line through the one shared audio element', async () => {
  const src = await read('app.js'), html = await read('index.html'), text = pageText(html);
  const at = src.indexOf("el.hearMe.addEventListener('click'");
  const handler = src.slice(at, src.indexOf('\n});\n', at));
  assert.ok(handler.indexOf('unlockSound()') > 0 && handler.indexOf('unlockSound()') < handler.indexOf('Voice.say(HEAR_LINE'), handler);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.match(html, /<audio id="voice" preload="auto"><\/audio>/);
  assert.match(html, /<button id="hearMe"[^>]*>[\s\S]*?Tap to Hear Me<\/button>/);
  // What to do when nothing is heard: only the volume and silent mode.
  assert.match(text, /No sound\? Turn the volume up and switch off silent mode\./);
  assert.match(text, /Volume up, silent mode off/);
  // Leaving Getting Ready stops the guide, so it never talks over the coach.
  assert.match(src, /if \(step !== 'ready'\) pauseHowTo\(\);/);
  assert.match(src, /if \(name !== 'flow'\) pauseHowTo\(\);/);
});

test('How to Set Up: Getting Ready plays the setup guide with its narration, under 4 MB', async () => {
  const src = await read('app.js'), html = await read('index.html'), text = pageText(html);
  const video = html.match(/<video id="howVideo"[^>]*>/)?.[0] || '';
  for (const a of ['src="assets/setup-guide.mp4"', 'poster="assets/setup-guide-poster.jpg"', ' playsinline', 'preload="none"']) assert.ok(video.includes(a), a);
  // The Play tap is a tap: it wakes the sound and unmutes, so the narration is heard.
  const at = src.indexOf("el.howPlay.addEventListener('click'");
  const play = src.slice(at, src.indexOf('\n});\n', at));
  assert.ok(play.indexOf('unlockSound(false)') > 0 && play.indexOf('unlockSound(false)') < play.indexOf('v.muted = false'), play);
  assert.ok(play.indexOf('v.muted = false') < play.indexOf('v.play'), play);
  // His ruling: the better voice comes built in; the rider is never asked to change phone settings for it.
  assert.ok(!/Spoken Content|download a (better )?voice|Premium|Enhanced/i.test(text));
  // Small enough for a phone: the brief's limit is about 4 MB.
  assert.ok((await stat(new URL('../assets/setup-guide.mp4', import.meta.url))).size < 4 * 1024 * 1024);
});
