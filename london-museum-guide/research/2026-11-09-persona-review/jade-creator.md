# Jade, the creator: Natural History Museum Guide

**A simulated visitor, not a real one.** Every finding is a hypothesis for Alex to check with real visitors. Tested on the published files in `preview/` (port 8774), Playwright at iPhone size (390 x 844, touch), clock Thursday 12 November 2026, 14:00 London (16:30 for T10). I added the viewport tag the claude.ai host adds; without it the page renders at desktop width. Screenshots and scripts: `research/jade-creator/`.

## Persona

Jade, 22, student, posts short videos and photo carousels. One hour with a friend on a weekday afternoon. Skims, listens in snippets, wants three "wait, what?" facts, the best photo spots, and something to share from the app. Drops an app that feels slow or like homework within two minutes.

## Usability results

| Task | Result | Taps | Expected vs what happened |
|---|---|---|---|
| T1 Five seconds on home | Success | 0 | "Museum guide: pick a time, press Start." Clear. But nothing above the fold says *audio* or *headphones*, and the picture is a tilted shot of the building, not Hope. Reads like an info page. `t1-home.png` |
| T2 About 2 hours | Success | 3 | 2 Hours, glance, Start the Walk. The tab says "2 Hours", the card "About 2 h 22 min"; "1 Hour" is 1 h 15 min, over Jade's hour. No reason given to care about any stop. `t2-2hours.png` |
| T3 Way there, then story | Success | 2 | The way plays by itself (1 min 56 s); Skip to the Story starts chapter 1. If she is already inside, the first words are "Don't go in yet." `t3-story-playing.png` |
| T4 Pause, chapter 3, resume | Partial | 2, plus 3 screens of scrolling | No chapter list in the player. Chapter 3 is a blue heading 2,561 px down the written story, with no hint that tapping plays it. It works: audio jumps, paragraph lights, player reads "Chapter 3 of 7". No player stays on screen while reading. `t4-scrolled-to-ch3.png` |
| T5 Packed room, do it later | Partial | 3, plus 11 screens | "Too Busy? Do This Later" is the last thing on the page: 10,134 px down on Hope, 12,411 px on Dinosaurs, the busiest gallery. Once found it works well: toast, next stop, Hope moved to the end as "Later". `t5-walk.png` |
| T6 Toilets, cafe, coat, step-free | Partial | 1 | Visit: three cafes, the cloakroom, East Gate ramp, Queen's Gate. **Toilets are nowhere in the app.** `t6-visit.png` |
| T7 Save for offline | **Fail** on this link | 2 | Saved 51 MB: "The whole walk now plays without signal." Offline, an unplayed stop would not play, and the toast said "turn the volume up". The preview has no `sw.js`, so nothing reads the saved files. The public GitHub Pages copy has one; not tested. `t7-offline-play.png` |
| T8 Best place to photograph Hope | Partial | 1, plus 2 screens | Hope's Tip: "Save your best photograph of her for the top balcony, later on this walk." Right advice, but no floor, no link to the Sequoia stop, and the photo of that view is buried in the story. On the private link, Ask the Guide is one question. `t8-tip.png`, `ask-answer.png` |
| T9 Look For, open a photo | Partial | 4 | Ticking works, the photo opens full size. **Every thumbnail is a 26 px sliver** of its 64 px box (`.look button` sets `display: grid` with a 26 px column, and also hits `.look .thumb`). Same CSS in the Science Museum app. `t9-look-list.png` |
| T10 16:30, running late | Partial | 1 | "About 1 h 15 min of walk left, and the galleries start clearing in 1 h." No shorter walk fits, so no button and no advice on what to drop. `t10-1630-1h.png` |
| T11 Caption facts, then share | **Fail** on sharing | n/a | A fact per stop exists, but two screens down in a 600 to 2,200 word story. **No share button, copy link, fact card or postcard.** From the Home Screen there is no address bar to copy. The end screen mentions Fern (not on the 1 Hour walk) and offers nothing to keep. `end-of-walk.png` |

Speed was fine locally: home in about 130 ms and 345 KB, Hope about 770 KB; real phones untested. Chapters average 33 to 52 s (Dinosaurs 70 s): good for snippets.

## Jobs to Be Done

**Main job.** When I have an hour in a famous museum with a friend, I want the iconic bits, a few "wait, what?" facts and good shots, fast, so I can post something good and feel I did it properly. *Served partly.*

| When I... | I want to... | so I can... | Status |
|---|---|---|---|
| open the app | know what it is and where to go | not waste the hour | Partly |
| stand in front of something big | the one "no way" fact | say it to camera | Partly: buried |
| want the shot | the best spot and angle | post a good picture | Partly: Hope only |
| write a caption | a short line with a source | not post something wrong | Partly |
| find something cool | send or post it from the app | share it now | Not served |
| hit a packed room | move on, come back | keep moving | Partly |
| run short of time | know what to skip | still see the best | Partly |
| listen | pick short bits | dip in and out | Partly |
| see something unlisted | snap and ask | understand it | Served, private link only |
| finish | a recap or postcard | post the visit | Not served |
| need a break | loo and cafe | keep going | Partly |

## Questions on the move

| Question | Answered? Where |
|---|---|
| Where are the toilets? | No |
| Nearest cafe? | Partly: Visit; tips on Sophie, Marine Reptiles |
| How long till we are done? | Partly: walk total; time check only when short |
| 20 minutes left: the one must-see? | No |
| Best spot to film Hope? | Yes: Hope Tip, Sequoia Look For; Ask (private) |
| Dinosaurs queue is mad, skip it? | Partly: Do This Later, at the page bottom |
| Is that real bone? | Partly: Ask chip (private only); the Hope story never says so |
| Is the T. rex real? | Yes: "A model, not a skeleton" |
| How big, like a bus? | Partly: 25 m, 4.5 tonnes, no everyday comparison |
| Weirdest thing here? | Partly: in the story, never flagged |
| Can I touch anything? | Partly: in the text (Fern's bronzes, Kobe meteorite) |
| What is that? (photo) | Yes on the private link; no on the public one |
| Photos and flash allowed? | No |
| Is the curse real? | Yes: Vault story, as legend |

## Shareable facts (10-second video hooks)

| Hook | Check | In the guide? |
|---|---|---|
| Front doors off their hinges, the 6 m skull turned on its side, centimetres to spare | VERIFIED nhm.ac.uk/discover/news/2017/july/museum-unveils-hope-the-blue-whale-skeleton.html | Yes, Hope ch. 5 |
| The whole whale sold for £111; the museum paid £250 for the skeleton | VERIFIED nhm.ac.uk/discover/hope-the-blue-whale-history.html | Yes, Hope ch. 3 |
| The tree was 1,300 years old and 101 m tall, felled in 1891, the year the whale stranded | VERIFIED nhm.ac.uk/discover/giant-sequoia-slice.html, en.wikipedia.org/wiki/Hope_(whale). "1,341 rings" UNVERIFIED there | Yes, except 101 m |
| The museum's T. rex jaw was first named Dynamosaurus | VERIFIED en.wikipedia.org/wiki/Tyrannosaurus. "Lost by one page" UNVERIFIED | Yes, Dinosaurs ch. 11 |
| Iguanodon's nose horn was its thumb | VERIFIED en.wikipedia.org/wiki/Iguanodon | Yes, Dinosaurs ch. 6 |
| The clay animals were cast at a sanitary-pipe factory | VERIFIED nhm.ac.uk/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html | Yes, Building ch. 3 |
| Adam stood above the door until the Second World War; now it is empty | VERIFIED same page | Yes, Building ch. 6 |
| Cursed amethyst: seven boxes, "not for 33 years after my death"; his daughter waited 12 months | VERIFIED nhm.ac.uk/visit/weird-objects-in-the-museum.html | Yes, Vault |
| The top diamond changes from olive green to yellow | VERIFIED nhm.ac.uk/discover/how-do-coloured-diamonds-form.html | Yes, Vault |
| A telephone directory is sealed inside the blue whale model | VERIFIED en.wikipedia.org/wiki/Natural_History_Museum,_London | Yes, 3 Hours only |
| Fern's 15 m tail tapers to a finger's width, nothing holding it up | VERIFIED nhm.ac.uk/discover/the-making-of-fern-the-diplodocus-engineering-meets-natural-history.html | Yes, Fern |
| Stegosaurus teeth: the size of a little fingernail | VERIFIED nhm.ac.uk/discover/stegosaurus-brought-to-life.html | Yes, Sophie ch. 4 |

The guide has these and gets them right, but the four most postable (amethyst, diamond, phone book, Fern) are off the 1 Hour walk, and none is marked as a highlight.

## Top issues

**Must**

1. **Sharing.** A Share button on each stop: the phone's share sheet with title, one line and the public link to that stop; copy link as fallback. T11. S to M.
2. **Fix the thumbnails**: `display: block` on `.look .thumb`, both apps. T9. S.
3. **No offline promise where it cannot work.** Without a service worker, hide the Save card or say offline needs the public link; fix the "turn the volume up" toast. T7. S.
4. **"Too Busy? Do This Later" at the top**, beside the player. T5. S.

**Should**

5. **Three quick facts at the top of each stop**, each tapping to play its chapter (start times exist). T11. M (writing and checking).
6. **A "Photo spot" line per stop**, with the Commons photo of that view. T8. M.
7. **Chapter list in the player.** T4. S to M.
8. **Toilets in Visit**, from a museum source. T6. S.
9. **When the walk will not fit, say what to drop.** T10. S to M.
10. **Count a stop seen when she moves on**, not only via Next or the story's end; a skimmer's Up Next stays on The Building. T5. S.

**Could**

11. **Spotted tab and postcard** (V2.md): ticked items and photos as one image. L.
12. **Home says "audio guide, headphones in"**, with Hope as the picture. T1. S.
13. **Ask chip "Best photo spot?"** on Hope, Darwin, Sequoia, Fern. S.
14. **End note** mentions Fern on walks without her. S.
15. Toast and mini player cover the page for 5 s after Do This Later (`t5-after-later.png`). S.

## Verdict (simulated, Jade's words)

"The stories are bangers once you find them: the doors-off-the-hinges whale is going straight in my caption.
But it's loads of scrolling, I had to hunt for the skip button, and the little photo slivers look broken.
Let me share a stop and put three quick facts up top, and I'd actually keep it."
