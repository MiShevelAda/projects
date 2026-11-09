# Sarah, a parent with two children: Natural History Museum Guide

**Simulated visitor, not a real one.** Everything below is a hypothesis for Alex to check with real families.

## Persona

Sarah (41) lives in London. It is a half-term Saturday and she has Leo (10, mad about dinosaurs, reads everything) and Maya (6, tires fast, asks "why?" all the time). She has about 90 minutes before someone melts down. She listens with one earbud and passes it on to the kids, or plays the narration quietly on the speaker.

Method: the published preview on port 8772 in an iPhone-sized Playwright browser, clock at Saturday 14 November 2026, 10:05 London (16:30 and 17:20 for T10), tapping visible buttons only. Scripts, logs and screenshots: `research/sarah-family/`. **Setup note:** the preview `index.html` has no viewport tag, so a phone lays it out 980 px wide; I added the tag, as the claude.ai wrapper and GitHub Pages copy do. **Skipped:** real offline playback (the service worker only registers on https).

## Usability results

| Task | Result | Taps | Expected vs what happened |
|---|---|---|---|
| T1 Five seconds | Success | 0 | Clear: museum guide, open now, pick a time, Start the Walk. But the first stop shown is a building front; dinosaurs come third (`t1-home.png`). |
| T2 2 hours | Partial | 1 to 2 | 2 Hours was already selected. The card says "9 Stops, About 2 h 22 min, 70 min of Stories". "1 Hour" is really 1 h 15. Her 90 minutes fit neither walk. |
| T3 First stop | Success | 2 | Start the Walk played the way to The Building at once. Skip to the Story played chapter 1. |
| T4 Chapter 3 | Success | 2 | Pause, then tap "3. One Clay Animal's Journey" in the text: it jumps, plays by itself, and lights the paragraph. The player is now off screen, with no mini player on a stop page (`t4-chapter3-scrolled.png`). |
| T5 Too busy | Success | 1 | Deferring Dinosaurs: a toast, Darwin's way-there starts by itself, Dinosaurs becomes stop 9, "Later" (`t5-route-later.png`). No warning that the end of a 2 h 22 walk is mid-afternoon. |
| T6 Practical | Partial | 2 + scroll | The tab bar is hidden on stop pages, so it took Back, then Visit. It has cafes, coats and both step-free entrances. **Toilets are in no file of the app.** Baby change, the picnic area and quiet rooms are missing too (`t11-visit-no-toilets.png`). |
| T7 Offline | Partial | 2 | It said "Saved. The whole walk now plays without signal." That is 51 MB, all 14 stops, with no option to save only her walk. Offline playback was SKIPPED (see above). |
| T8 T. rex, and a touchable skeleton | Partial | 2, then about 18 | No search; the route shows gallery names only. Guessing Dinosaurs found the T. rex: Look For item 4, and chapter 12 of 13, **12 min 43 s** into a 15-minute story. Something to touch meant opening every stop. The only skeleton-like answer on her walk is the bronze Diplodocus skull in Fern's garden, stop 9 of 9 ("Feel the teeth. It doesn't mind."); the dog jaw and "heads you can touch" are 3-hour stops. |
| T9 Look For | Success | 4 | Ticking two items showed "2 of 4". The T. rex photo opens full size. **The thumbnails show as a 26 px sliver** in the published copy. The source `style.css` already has the fix (`thumb-trex.png`). |
| T10 16:30 | Partial | 0 to 1 | With nothing seen yet, the note says "About 2 h 22 min of walk left, and the galleries start clearing in 1 h". It gives no advice, because even 1 Hour does not fit. With three stops seen, it offers "Switch to 1 Hour" and that works well. |
| T11 A 6-year-old, and the toilet | Fail | 3, then 2 | There is no family mode, short version or question for children; speed is the only control (0.9, 1, 1.15). Toilet: Pause, Back, Visit, and nothing. Coming back worked: the mini player plus Play resumed at the same second (337 s, then 339 s). **A page reload loses the place** and goes back to "Chapter 1 of 13" (`t11-after-reload.png`). The mini player also covers the home screen's Carry On button (`t11-walk-with-dock.png`). |

**Dinosaurs first, before the queue.** One tap on Dinosaurs in the route works. But after Next took her on to Darwin, the home screen said "Up Next, Stop 1 of 9: The Building, Carry On", while the mini player said Darwin (`dino-first-home.png`). The app would send the family back outside.

## Jobs to Be Done

**Main job:** When I take two children to the NHM on a busy Saturday, I want to see the dinosaurs and a few big wow things before they tire, with no faff over toilets, food or queues, so we leave with them excited, not dragged. **Served partly.**

| When I... | I want to... | Mark |
|---|---|---|
| arrive at 10:00 | go straight to Dinosaurs, before the queue | Partly: it is stop 3, and jumping ahead confuses Up Next |
| pick a walk | get one that fits 90 minutes of child patience | Partly: the labels undersell the real times |
| stand at a stop | play a 1 to 2 minute version and ask the kids a question | Not served |
| hear "toilet NOW" | find the nearest one from here | Not served |
| hear "I'm hungry" | find a cafe or picnic spot, open now | Partly: no picnic area, no closing times |
| meet a packed room | skip it and come back | Served, but with no crowd hint beyond Dinosaurs |
| hear "is it real?" | answer at once | Partly: T. rex yes; elsewhere it is buried in the story |
| hear "can I touch it?" | know where | Partly: the content exists but cannot be found |
| take a break | resume where we were | Partly: fine in one session, lost on reload |
| leave | have something to show for it | Partly: Look For ticks; Spotted is not built |

## Questions on the move

| Question | When | Does the app answer it? |
|---|---|---|
| Where's the toilet? | anywhere | No |
| How long till the dinosaurs? | walking | Partly: stop number and minutes, no countdown |
| Is there a queue? | walking | Partly: a fixed tip, nothing live |
| Is the T. rex real? Is it alive? | at the stop | Yes: Look For says "A model, not a skeleton" |
| How big was a real T. rex? | at the stop | No: it gives the model's reported 4 m, not the animal's size |
| Could it eat me? Could I outrun it? | at the stop | Partly: chapter 12 at 12:43; the Ask chip is on the private link only |
| How do they know what colour it was? | at the stop | Partly: chapter 3 |
| Why did they die? | at the stop | Yes: chapter 13 |
| Can I touch it? | at the stop | Partly: Fern, Kobe and two 3-hour stops |
| Where can we eat our sandwiches? | anywhere | No |
| Is there somewhere quiet? (meltdown) | anywhere | No |
| Can we go home now? | walking | Partly: the time check covers closing only |

## Shareable facts

| Fact | Check | In the guide? |
|---|---|---|
| A real Velociraptor was about the size of a turkey; the film ones were twice its size, modelled on Deinonychus | VERIFIED: en.wikipedia.org/wiki/Velociraptor; nhm.ac.uk/discover/dino-directory/velociraptor.html | Yes, chapter 9 |
| T. rex teeth were up to 20 cm long, and it had 60 | VERIFIED: nhm.ac.uk/discover/dino-directory/tyrannosaurus.html | No |
| Some T. rex skulls are over 1.5 m long, longer than people are tall | VERIFIED: same page | No |
| T. rex swallowed the bone it crunched; pieces turn up in its fossilised dung | VERIFIED: same page | No |
| An adult T. rex's top speed was about 22 km/h | VERIFIED: same page. The guide's "you could probably outrun one" quote is UNVERIFIED by me | Partly |
| Hope is 25.2 m long, and her bones were still leaking oil more than a century after she died | VERIFIED: nhm.ac.uk/discover/news/2017/july/museum-unveils-hope-the-blue-whale-skeleton.html | Length yes, oil no |
| Stegosaurus tail spikes are a "thagomizer", from a 1982 Far Side cartoon | VERIFIED: en.wikipedia.org/wiki/Thagomizer | Yes, at Sophie |
| Fern's tail tapers to the width of a human finger | VERIFIED: nhm.ac.uk/discover/the-making-of-fern-the-diplodocus-engineering-meets-natural-history.html | Yes |

Two things to check. The museum's own family tour page calls Fern "24-metre-long", while its making-of page and the guide say over 25 m. That page also says the Dinosaurs exit faces the Dino Store, which parents may want warning of.

## Top issues

**Must**
1. **Toilets, baby change, picnic area and quiet spaces.** Put them on Visit, and the nearest ones on each stop's Find It card. The NHM says all toilets and baby change are marked on its map. The picnic area is on the lower ground floor. Quiet spaces include Images of Nature and the Contemplation Room (nhm.ac.uk/visit/facilities.html and eat-drink-and-shop.html). Evidence: T6, T11. Effort: S for Visit, M per stop.
2. **Family mode (V2 lists it).** Per stop: a 60 to 90 second children's version, one "ask the kids" question per chapter, and Real, Model, Bronze and "You can touch" labels on Look For items. Evidence: the Dinosaurs story runs 15 min with around 60 names of people and places and 38 dates or big numbers; the T. rex comes at 12:43. Its sentences read about UK Year 7, fine for Leo, but the density is adult. Effort: L.
3. **Start anywhere, and Up Next follows you.** Evidence: `dino-first-home.png`. Effort: M.

**Should**
4. Remember the story position across a reload (T11). S.
5. A simple Find: headline objects ("T. rex, Dinosaurs, chapter 12") and "things to touch" (T8). M.
6. The mini player must not cover Carry On, and stop pages need a shortcut to toilets and food (T6, T11). S.
7. Republish the thumbnail CSS fix (T9). S.
8. Honest walk lengths, or a 90-minute family walk (T2). S to M.
9. Late in the day, when nothing fits, say what to see (T10). S.
10. Cafe closing times and children's food: the T. rex Restaurant is 11:00 to 16:00 per the NHM family page, and serves kids' meals (eat-drink-and-shop page). S.

**Could**
11. Add the child-pleasing verified facts above. S each, but each needs re-recording.
12. Child-style Ask chips ("Could it eat me?", "Is it alive?") and toilets in Ask's context. Private link only. S.
13. Spotted as an I-spy sticker book for children. M.

## Verdict (simulated, in Sarah's words)

"The dinosaur bits are clever and Leo would love the turkey-sized raptor, but it's written for me, not for Maya.
Fifteen minutes in Dinosaurs before the T. rex? She'd be on the floor by minute three.
And no toilets? With a six-year-old that's the first thing I need, not the last."
