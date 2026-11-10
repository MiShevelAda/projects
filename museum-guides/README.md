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
| `hope-sample.m4a` | The first 55 seconds of the Hope story recording (title, chapters 1 and 2), faded out |

**Keep it true.** The sample is cut from `london-museum-guide/audio/` and the read-along text is
copied from `stories.js`. If the Hope story's first two chapters change, cut the sample again
(ffmpeg, from 0 to the start of chapter 3, `starts[3]` in `audio/manifest.json`) and update the
text. The story lengths on the cards come from the recordings: 110 and 63 minutes in November 2026.

The QR code on the trucora.de landing page is a different page; this one is public and has no
password. The LinkedIn QR opens the Natural History Museum guide directly, not this page, by
Alex's ruling of 2026-11-10 (`DECISIONS.md`).
