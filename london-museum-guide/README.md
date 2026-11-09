# First Walk at the Natural History Museum

An unofficial audio and text guide for a first visit to the Natural History Museum in London. It
walks you through the must-sees in order, tells you where to look at each one, and has a narrator
in your ear, written in the manner of a classic British nature documentary: unhurried, curious, and
always pointing you at something real.

**Open it on your phone:** https://mishevelada.github.io/projects/london-museum-guide/ (live once
this folder is on `main`).

Not made by or connected to the Natural History Museum. Galleries close and specimens move: check
the museum's own website on the day.

## Using it

1. Open the link in Safari on an iPhone, or Chrome on Android. Put your headphones in.
2. Choose **Full walk** (14 stops, about 3 hours) or **Highlights** (9 stops, about 2 hours).
3. Tap **Start the walk**. The voice tells you where to stand. When you are there, press play: on
   the screen, on your headphones, or on the lock screen.
4. When a story ends, the voice tells you the way to the next stop, then waits for you again. You
   can keep the phone in your pocket the whole time.

On each stop: **Look for** is two to four things to find (tap each one when you have), and **The
story** is every word the narrator says, lit up paragraph by paragraph as it is spoken. Tap a
paragraph to hear it from there.

Before you go in, open **Before you go** and tap **Save the walk for offline**, so the galleries
without signal do not matter. **Before you go** also has the opening hours, entrances and anything
closed. A closure the museum has announced (the Mammals Hall, 10 to 12 November 2026) is skipped
on those days and its notice disappears afterwards on its own.

## How it is made

| File | What it is |
|---|---|
| `stops.js` | Every stop: where it is, how to find it, what to look for, the story, and the sources for each fact. The text guide and the recordings both come from here |
| `walk.js` | The walk's rules: the next stop, closures, dated notices |
| `app.js`, `index.html`, `style.css` | The app: three screens (the route, a stop, before you go), one audio player |
| `sw.js` | Offline: keeps the app and, once played or saved, every recording |
| `audio/` | The narration, two recordings a stop (the way there and the story), and `manifest.json` |
| `tools/` | How the narration is recorded: see `tools/README.md` |
| `test/` | `npm test`: every stop complete, years and names said properly, every recording made from the current words, closures, offline |

**The voice** is Kokoro-82M (open weights, Apache-2.0), British English, voice `bm_george`,
recorded in advance so it sounds the same on every phone and needs no signal. Slower than the
voice's default, with longer pauses between sentences and paragraphs, and a list of respellings
(`tools/say-as.mjs`) for words it would otherwise get wrong: it would read 1891 as "one thousand
eight hundred and ninety one" and Kobe as one syllable.

**Changing the words:** edit `stops.js`, then `npm run audio` re-records only the stops whose words
changed, and `npm test` fails until it has.

**Facts** were checked on 9 November 2026, from the museum's own pages wherever possible; each stop
lists its sources under **Where these facts come from**. Folklore the museum itself doubts (the
"Darwin monkeys", the Nakhla dog) is left out, and the amethyst's curse is told as the legend it is.

Fonts: Libre Caslon Display and Source Sans 3, both SIL Open Font License, in `fonts/`.
