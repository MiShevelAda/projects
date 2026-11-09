# Persona review of two museum guide apps: shared brief

You are one of five reviewers, each playing a different visitor, plus one researcher. Stay in your
persona's shoes for the usability test; switch to analyst for the write-up. **You are simulating a
visitor, not one, and your report must say so.** Your findings are hypotheses for the owner, Alex
(not a coder), to check with real visitors.

S = /tmp/claude-0/-home-user/5900d085-c2ce-5f46-bb2f-51497441b5ea/scratchpad

## The apps

Phone web apps, unofficial audio and text guides for a first visit, built in the style of iOS:

- **Natural History Museum Guide**: the exact published files are in `$S/preview/`. Source:
  `/home/user/projects/london-museum-guide/` (read `JOBS.md`, `V2.md`, `stops.js`, `stories.js`,
  `app.js`, `walk.js`). 14 stops; walks of 1, 2 or 3 hours; about 135 minutes of narration.
- **Science Museum Guide**: published files in `$S/sm-preview/`, source
  `/home/user/projects/science-museum-guide/`. 12 stops, about 83 minutes of narration. Same app code.

What each has: a Walk tab (Today card with live open/closed status, How Long Have You Got? 1/2/3
hours, a time check, the route list, Up Next), a stop page (photo with a floor map card, Find It,
"You are there when", the player with chapter titles, Look For checklist with photo thumbnails, a
Tip, a Watch link, the story written out with chapter titles and photos, sources, "Too Busy? Do This
Later", a bottom Next button that plays the way to the next stop), a Visit tab (hours, tickets,
getting in, food, coats, access, exhibitions, Save for Offline), and **Ask the Guide** (typed or
photo questions answered by Claude on the viewer's Claude account: only on the private claude.ai
link, hidden elsewhere). Narration is a recorded British voice. Everything says "Based on November
2026" and is unofficial.

## How to run them (do not touch any other port)

Each reviewer uses its OWN port (given in your task). Start a server for the app you test:
`node $S/tools/serve.cjs $S/preview <port> &` (NHM) or `node $S/tools/serve.cjs $S/sm-preview <port> &` (SM).
Open `http://127.0.0.1:<port>/index.html` with Playwright (`require('playwright')` works anywhere;
`chromium.launch()` needs no options). Use an iPhone-sized context: `{ viewport: { width: 390,
height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }`. Routes are hash URLs: `#walk`,
`#visit`, `#<stop id>`. **Set the clock to visiting hours** or the app will say the museum is
closed: `await page.clock.setFixedTime(new Date('2026-11-12T11:00:00Z'))` before `goto`
(a Thursday, 11:00 London). Wrap every wait in a timeout; never call `audio.play()` on an element
with no source (it can hang forever): press the app's own play button instead. Write your scripts
in `$S/research/<your name>/`, screenshots there too, and look at the screenshots you take (Read
the PNG) rather than assuming.

To see the Ask the Guide card (it needs Claude), inject a stand-in before load, exactly as
`$S/tools/ask_test.cjs` does (`window.claude = { use: async (n) => n === 'sample' ? sample : null }`).
Judge its design and the questions you would ask; its real answers cannot be tested here.

## What to do

1. **Usability test, in persona.** Run these tasks as your persona would, by tapping what a
   person would tap (Playwright `click` on visible text or buttons, not by jumping to URLs unless a
   person could). For each: success / partial / fail, number of taps, what you expected vs what
   happened, and a screenshot of any friction.
   - T1 Five-second test on the home screen: what is this, and what would you do first?
   - T2 "We have about 2 hours": choose a walk, understand what is in it, start it.
   - T3 Get to the first stop and hear how to get there; then play the story there.
   - T4 Pause, jump to the third chapter, resume; then find where you are in the story.
   - T5 The room is packed: put this stop off till later, and see what happens to the walk.
   - T6 Practical: find the toilets, a cafe, where to leave a coat, the step-free entrance.
   - T7 Save the walk for offline before going into a gallery with no signal.
   - T8 Find a specific object you want to see (your persona names one) using only the app.
   - T9 Use Look For: tick items and open a photo.
   - T10 Running late (set the clock to 16:30 London): what does the app tell you to do?
   - T11 Your persona's own task (given in your brief).
2. **Jobs to Be Done** for your persona: their main job and the jobs along the way (When I...,
   I want to..., so I can...). Mark each: served well / served partly / not served.
3. **Questions on the move.** List at least 12 questions your persona would actually ask: while
   walking between two stops, and while standing at a stop (practical, factual, emotional,
   kid-style, "is that real?"). For each, say whether the app answers it now and where.
4. **Memorable, shareable facts**: at least 6 for your stops that your persona would repeat over
   dinner or post. Check each against a real source (allowed hosts: nhm.ac.uk,
   sciencemuseum.org.uk, blog.sciencemuseum.org.uk, collection.sciencemuseumgroup.org.uk,
   en.wikipedia.org; others are blocked) and label VERIFIED (with URL) or UNVERIFIED. Say whether the
   guide already tells it. Never invent a number, date, name or quote.
5. **Recommendations**: what is missing or wrong in functions and UX/UI for your persona, ranked
   Must / Should / Could, each with the evidence (task, screenshot) and a rough effort (S/M/L).

House rules for anything you write: no em dashes, British spelling, plain words.

## Output

Write `$S/research/<your name>.md` with these sections: Persona, Usability results (a table T1 to
T11), JTBD, Questions on the move, Shareable facts, Top issues (Must/Should/Could), and a three-line
verdict in the persona's own words, marked as simulated. Keep it under 1,800 words. Your final
reply to me: the five most important findings, each one line, and the path of your report.
Stop your server when you finish (kill the node process on your port).
