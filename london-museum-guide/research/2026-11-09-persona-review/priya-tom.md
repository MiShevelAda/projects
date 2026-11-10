# Priya and Tom: Natural History Museum Guide

**A simulated visit, not a real one.** One reviewer played two visitors in a phone-sized browser
(390 x 844, iPhone user agent) on the files in `preview/`, clock set to Thursday 12 November 2026.
Every finding is a hypothesis to check with real visitors. Screenshots: `research/priya-tom/`.

Test note: the published `index.html` has no viewport tag; I added the one the host wrapper should
supply. Without it a phone shows the page at desktop width. Worth one look on the private link.

## Persona

Priya (34) and Tom (36), Toronto, first time in London. Two hours on a rainy Thursday morning,
lunch in South Kensington at 13:00. Good with phones, short on patience. One phone: Tom listens on
earbuds, Priya holds it and reads along. They want the blue whale and the T. rex, no wasted steps,
and a dinner story. They worry about queues, booking and paid exhibitions.

## Usability results

| Task | Result | Taps | What happened |
|---|---|---|---|
| T1 Five seconds | Success | 0 | Name, Open Now, How Long Have You Got?, Start the Walk. Nothing above the fold says "audio guide"; the tab bar half covers Start (`t1-home-fold.png`). |
| T2 Two hours | Partial | 1 | 2 Hours is preselected but reads **"9 Stops, About 2 h 22 min"**. With lunch fixed, 22 minutes over is a broken promise. T. rex not named (`t2-two-hours.png`). |
| T3 Way there, story | Success | 2 | Start plays the way by itself; Skip to the Story starts chapter 1. Stop 1 says "Don't go in yet": six minutes on the pavement in rain (`t2-start-stop1.png`). |
| T4 Chapter 3 | Partial | 3 + 2 long scrolls | No chapter list in the player. Scroll about 2,500 px into the text, tap the heading (it resumes at once). The player is then off screen. Read-along highlight is good (`t4-reading-highlight.png`). |
| T5 Do this later | Partial | 1 + ~15 screens | On Dinosaurs the link is at 12,468 px of 12,682 (`t5-later-button.png`). It moves their T. rex to **after Fern, outdoors**, at the far end of the building (`t5-walk-after-later.png`). |
| T6 Practical | Partial | 1 + scroll | Cafes, cloakroom, step-free gate: yes. **Toilets: nowhere in the app** (`t6-visit-full.png`). |
| T7 Offline | Success | 2 | "Saved. The whole walk now plays without signal." 51 MB. The Walk tab never shows it is saved. |
| T8 Whale and T. rex | Partial | 2 | Hope is named in the route; the T. rex is not. Guess "Dinosaurs", scroll two screens to Look For. No search (`t8-dinosaurs-top.png`). |
| T9 Look For | Success, bug | 3 | Ticks persist; photo opens and closes. **Thumbnails show as a 26 x 64 px sliver**: the `.look button` grid rule also hits `.look .thumb`. Same in the source (`t9-thumb-hope.png`). |
| T10 16:30 | Partial | 0 | "About 2 h 22 min of walk left, and the galleries start clearing in 1 h." No switch offered, since 1 Hour (1 h 15 min) does not fit either; no advice (`t10-late.png`). |
| T11 Their task | Fail | 4 | Booking is clear, but not the rain reason (the museum says ticket holders skip the queue). Entrances listed, nothing on rain, queues or the subway tunnel. At 12:15 after four stops the Walk tab says **"Up Next, Stop 5 of 9, 70 min of Stories"**: 70 is the whole walk. About 78 min remain, finishing near 13:33. No finish time anywhere. Switching to 1 Hour mid-walk would fit; nothing suggests it. Ask the Guide is not told stop minutes or progress (`t11-walk-1215.png`, `t11-ask-sent.png`). |

**One phone, two people.** Tested: Priya tapping a paragraph to re-read it jumps Tom's audio
(69 s to 177 s). When a story ends, the screen moves to the next stop two seconds later, scrolled to
the top, wherever she was reading (`advance-after-story-end.png`). No auto-scroll, no sticky player.

**Order on the ground.** Sensible: Hintze Hall, Dinosaurs, stairs, floors 1 and 2, Earth Hall,
escalator, garden. Floors G, 1, 2, G, 2, G. In rain the ends hurt: it starts and finishes outdoors.

## Jobs to be done

| When we... | we want to... | so we can... | Served? |
|---|---|---|---|
| have two hours before lunch | see the famous things in time | arrive on time with stories | Partly |
| head there in rain | know whether to book, which door | stay dry, skip the queue | Partly |
| pick a walk | trust "2 Hours" | not do sums | Partly |
| share one phone | listen and read in step | both enjoy it | Partly |
| walk between stops | know where, how far, which floor | not get lost | Partly |
| find a room packed | come back sensibly | not lose the T. rex | Partly |
| are mid-walk | know what is left against 13:00 | decide what to cut | Not served |
| need a toilet | find one | not wander | Not served |
| stand at the whale | understand it | tell it at dinner | Served well |
| see a paid exhibition | know what, cost, time | decide fast | Not served |
| lose signal | keep going | not stall | Served |

## Questions on the move

| Question | Answered? Where |
|---|---|
| Where are the toilets? | No |
| How long to the next stop? | Partly: spoken directions, no minutes |
| Which floor are we on? | Partly: floor card per stop, nothing between |
| How much is left; done by 1? | No |
| Coffee on the way? | Partly: Visit; Sophie tip names Earth Hall Cafe |
| Wet coats and umbrella, cost? | Partly: cloakroom named, no prices |
| Dinosaurs queue now or later? | Partly: tip and Do This Later |
| Is that real bone? (Hope) | Private link only, Ask chip |
| Is the T. rex real? | Yes: model, chapter 12; real jaw, chapter 11 |
| Why is she called Hope? | Yes, chapter 10 |
| Best photo of the whale? | Yes: Hope tip, Sequoia chapter 7 |
| Is the curse real? | Yes, Vault chapter 13 |
| Is the earthquake room scary? | Yes, Find It and tip |
| Is Jurassic Oceans worth paying for? | No: names and dates only |
| Which entrance keeps us dry? | No |

## Shareable facts

| Fact | Check | In guide? |
|---|---|---|
| Hope stranded at Wexford on 25 March 1891; the whale fetched £111 at auction, the skeleton was sold to the museum for £250 | VERIFIED https://www.nhm.ac.uk/discover/hope-the-blue-whale-history.html | Yes |
| Her six-metre skull went through the front doors, removed for it, with centimetres to spare | VERIFIED https://www.nhm.ac.uk/discover/hope-the-blue-whale-display.html | Yes |
| The T. rex jaw is from the first T. rex skeleton found (Wyoming, 1900), first named Dynamosaurus; in 1906 Osborn kept Tyrannosaurus | VERIFIED https://en.wikipedia.org/wiki/Dynamosaurus ("one page earlier" UNVERIFIED) | Yes |
| The museum's T. rex dresses up for Christmas every year | VERIFIED https://www.nhm.ac.uk/visit/galleries-and-museum-map/dinosaurs.html | No |
| The sequoia was 1,300 years old when felled; here since 1893 | VERIFIED https://www.nhm.ac.uk/discover/giant-sequoia-slice.html, but the page dates the felling both 1891 and 1893, so "same year as Hope" is shaky | Yes |
| The Aurora Pyramid of Hope holds 296 coloured diamonds | VERIFIED https://www.nhm.ac.uk/visit/galleries-and-museum-map/the-vault.html | Yes |
| The cursed amethyst was sealed in seven boxes until 33 years after Heron-Allen's death; his daughter waited 12 months | VERIFIED https://www.nhm.ac.uk/visit/weird-objects-in-the-museum.html | Yes |
| Sophie, found in Wyoming in 2003, was first nicknamed Sarah; on show December 2014 | VERIFIED https://en.wikipedia.org/wiki/Stegosaurus | Yes |

Practical, VERIFIED on nhm.ac.uk on 9 November 2026: ticket holders skip the queue (`/visit.html`);
a subway tunnel runs from South Kensington station to the Central Entrance
(`/visit/getting-here.html`); toilets are on the museum map, coat £4, umbrella £3, and the Mammals
Hall is closed 10 to 12 November, which is stop 4 of the 3-hour walk and has no notice in the app
(`/visit/facilities.html`).

## Top issues

**Must**

1. **Time left and a finish time.** "About 78 min left, done about 13:33" on the Walk tab and
   stop page; let them set "leave by 13:00" and suggest what to drop. Fix the mid-walk kicker.
   T11, T2. Effort M (kicker S).
2. **"2 Hours" is 2 h 22 min.** Trim it or label it honestly. T2. S.
3. **Do This Later is buried and lands badly.** Put it by Find It; return the stop after the next
   one or "on your way out", never after an outdoor finale. T5. S to move, M to reinsert.
4. **Toilets.** A line in Visit now; nearest toilets per stop once checked on site. T6. S, then M.

**Should**

5. **Rain and arrival.** Subway tunnel, "a free ticket skips the queue", cloakroom prices, "listen
   to The Building while you queue", and a way to skip the two outdoor stops. T11, T3. S, then M.
6. **Shared phone.** Safe re-reading (a play mark per chapter, not the whole paragraph),
   follow-along scroll, a sticky mini player on the stop page, no jump while reading. M.
7. **Chapter list in the player.** T4. S to M.
8. **Thumbnail bug.** `display: block` on `.look .thumb`. T9. S.
9. **Name the famous things.** "Dinosaurs: the T. rex"; a find box. T8. S.
10. **Mammals Hall notice** for 10 to 12 November. S.

**Could**

11. Paid exhibitions: what, price, time needed. T11. S.
12. Minutes and floor change on the Next button. S.
13. At 16:30, offer the best two or three stops that fit. T10. M.
14. The Christmas-jumper T. rex as a seasonal line. S.

## Verdict (simulated)

> Priya: "The stories are brilliant; the whale sold for £250 is our dinner story."
> Tom: "But my audio jumped whenever Priya touched the screen, and it never said how much was left. We were late for lunch."
> Both: "Tell us about the tunnel, show the toilets, make 2 hours mean 2 hours, and we'd recommend it."
