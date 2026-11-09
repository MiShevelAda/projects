// The narrator's voice and how a recording is named. Shared by tools/build-audio.mjs and the tests,
// so a change of voice or of words always means a new file.
import { createHash } from 'node:crypto';
import { sayAs } from './say-as.mjs';

// Kokoro-82M, British English. bm_george: an older British man, the closest of Kokoro's voices to a
// nature documentary narrator. Slower than its default (speed 1) and with longer pauses, because a
// documentary voice leaves room for the listener to look.
export const VOICE = {
  model: 'kokoro-82m-v1.0-q8', voice: 'bm_george', lang: 'en-gb', speed: 0.82,
  sentence_pause: 0.65, clause_pause: 0.22, paragraph_gap: 1.3,
};

export const KINDS = ['way', 'story'];

// What a recording says, paragraph by paragraph.
//   way    the stop's name, then how to find it (played when the story before it ends)
//   story  the stop's name, then the story
export function spoken(stop, kind) {
  if (kind === 'way') return [stop.n === 1 ? `First stop: ${stop.title}.` : `Next stop: ${stop.title}.`, stop.find];
  return [`${stop.title}.`, ...stop.story];
}

export const clipFile = (stop, kind) => `${createHash('sha256')
  .update(JSON.stringify([VOICE, kind, spoken(stop, kind).map(sayAs)])).digest('hex').slice(0, 16)}.m4a`;
