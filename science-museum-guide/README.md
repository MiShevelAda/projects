# Science Museum Guide

An unofficial audio and text guide for a first visit to the Science Museum in London. It walks you
through the must-sees in order, tells you where to look at each one, and has a narrator in your ear,
in the same voice and manner as the Natural History Museum Guide next door: unhurried,
curious, a little dry, and always pointing you at something real.

**Open it on your phone:** https://mishevelada.github.io/projects/science-museum-guide/ (public, no
password). Ask the Guide is not on this version: it runs on Alex's own Claude account, so it
appears only on his private claude.ai link.

Not made by or connected to the Science Museum. Galleries close and objects move: check the
museum's own website on the day.

## Using it

1. Open the link on your phone and add it to the Home Screen.
2. On **Walk**, answer **How Long Have You Got?** (1, 2 or 3 hours) and tap **Start the Walk**.
   Headphones in. The voice tells you the way, gives you something to listen to while you walk,
   and tells you how you will know you have arrived. Then press play.
3. When a story ends, the way to the next stop plays by itself, then it waits for you again.

Every stop has the same parts as the Natural History Museum guide: **Find It**, the story player
with chapter titles, **Look For**, a **Tip** where there is one, the story written out, the sources,
and **Too Busy? Do This Later**. On the private link, **Ask the Guide** answers questions about the
stop, typed or with a photo, on your own Claude account.

Why each of these exists: `JOBS.md`.

## How it differs from the Natural History Museum guide

| | Natural History Museum | Science Museum |
|---|---|---|
| Floors in the walk | Outside, ground, first, second | Lower ground to third (the walk uses 0 to 3) |
| Opening hours | 10:00 to 17:50 | 10:00 to 18:00, last entry 17:15 |
| Tickets | Free, booking advised | Free, book a timed ticket |
| Walks | Start at the building, end at the Fern | Start in the Energy Hall, end at Watt's workshop |

## How it is made

The same app as `london-museum-guide/`, with its own `stops.js`, `stories.js`, recordings, icons
and offline cache names (`sm-walk-`). See `../london-museum-guide/README.md` and `tools/README.md`
for how the narration is recorded and checked.

**The guide is based on the museum as it was in November 2026**, with no closures for particular
days. Facts were checked from the museum's own pages and blog wherever possible;
each stop lists its sources under **Where these facts come from**.
