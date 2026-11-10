# museum-guides

The public landing page for the two museum guides, at
https://mishevelada.github.io/projects/museum-guides/. A demo video, the opening of the Hope story to
listen to, and a card for each guide. On a computer it also shows a QR code that opens the Natural
History Museum guide on a phone. No logic, so no tests.

| File | What it is |
|---|---|
| `index.html` | The page, in the guides' own design tokens (`london-museum-guide/style.css`), light and dark |
| `demo.mp4` | The 32 second demo made for LinkedIn, 720x1280: the real Hope narration with captions, ending on the QR card |
| `demo-poster.jpg` | Its first frame, shown before it plays and as the link preview image |
| `hope-sample.m4a` | 28 seconds: the way to Hope (the start of its "way" recording) and two sentences of her story, joined at a pause |

**Keep it true, and clear out of context.** Alex, 2026-11-10: lines that need the room to make
sense ("Higher. Not that high, that is the ceiling.", "It was never close.") confuse a listener who
is not there, so the sample is the way to Hope (title, Find It) and "There she is: a blue whale ...
and a name. Hope." It is cut from `london-museum-guide/audio/` at the pauses; the read-along text is
copied from `stories.js` and `stops.js`. If those words change, cut it again and update the text. The story lengths on the cards come from the recordings: 110 and 63 minutes in November 2026.

The QR code on the trucora.de landing page is a different page; this one is public and has no
password. The LinkedIn QR opens the Natural History Museum guide directly, not this page, by
Alex's ruling of 2026-11-10 (`DECISIONS.md`).
