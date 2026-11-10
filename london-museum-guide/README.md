# Natural History Museum Guide

An unofficial audio and text guide for a first visit to the Natural History Museum in London. It
walks you through the must-sees in order, tells you where to look at each one, and has a narrator
in your ear, written in the manner of a classic British nature documentary: unhurried, curious, and
always pointing you at something real.

**Open it on your phone:** https://mishevelada.github.io/projects/london-museum-guide/ (public, no
password). Ask the Guide is not on this version: it runs on Alex's own Claude account, so it
appears only on his private claude.ai link.

Not made by or connected to the Natural History Museum. Galleries close and specimens move: check
the museum's own website on the day.

## Using it

1. Open the link in Safari on an iPhone (or Chrome on Android), tap **Share**, then **Add to Home
   Screen**, and open it from there. It then works full screen and without signal.
2. On **Visit**, tap **Save the Walk for Offline** while you have good signal.
3. On **Walk**, under **Choose Your Walk**, pick a length (each button shows its real time and number of stops)
   and tap **Start the Walk**.
   Headphones in. The voice tells you the way, gives you something to listen to while you walk, and
   tells you how you will know you have arrived. Then press play: on the screen, the headphones or
   the lock screen.
4. When a story ends, the way to the next stop plays by itself, then it waits for you again. The
   phone can stay in your pocket.

On each stop: **Find It** with **You are there when**, the story player, **Look For** (things to
spot, ticked as you find them), an insider **Tip** where there is one, **The Story** lit up paragraph
by paragraph as it is spoken (tap one to hear it from there), and **Too Busy? Do This Later**, which
moves the stop to the end of the walk. The **Walk** tab shows whether the museum is open now and
until when, on London time, and warns if the rest of the walk will not fit
before the galleries start clearing, offering a shorter walk that does.

Why each of these exists: `JOBS.md`.

## How it is made

| File | What it is |
|---|---|
| `stops.js` | Every stop: where it is, its floor, zone, time, the walks, opening hours, and the sources for each fact |
| `stories.js` | Every stop's words: how to find it, you are there when, look for, the story, the piece for the walk, the tip. The text guide and the recordings both come from here |
| `walk.js` | The walk's rules: the next stop, closures, dated notices |
| `app.js`, `index.html`, `style.css` | The app, in the bike-fit app's design: two tabs (Walk, Visit), a stop page, one audio player |
| `sw.js` | Offline: keeps the app and, once played or saved, every recording |
| `audio/` | The narration, two recordings a stop (the way there and the story), and `manifest.json` |
| `tools/` | How the narration is recorded: see `tools/README.md` |
| `test/` | `npm test`: every stop complete, years and names said properly, every recording made from the current words, closures, offline |

**The voice** is Kokoro-82M (open weights, Apache-2.0), British English, voice `bm_george`,
recorded in advance so it sounds the same on every phone and needs no signal. Slower than the
voice's default, with longer pauses between sentences and paragraphs, and a list of respellings
(`tools/say-as.mjs`) for words it would otherwise get wrong: it would read 1891 as "one thousand
eight hundred and ninety one" and Kobe as one syllable.

**Changing the words:** edit `stories.js`, then `npm run audio` re-records only the stops whose words
changed, and `npm test` fails until it has.

**The guide is based on the museum as it was in November 2026**: its galleries, exhibitions and
opening hours then, with no closures for particular days, so it does not go stale by the week. Facts were checked from the museum's own pages wherever possible; each stop
lists its sources under **Where these facts come from**. Folklore the museum itself doubts (the
"Darwin monkeys", the Nakhla dog) is left out, and the amethyst's curse is told as the legend it is.

The design follows the bike-fit app's: iOS system colours and the iPhone's own font, so it needs no font files.
