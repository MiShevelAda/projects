# Martin, the enthusiast: Science Museum Guide

**This is a simulated visitor, not a real one.** Every finding is a hypothesis for Alex to check with real visitors.

## Persona

Martin, 68, retired mechanical engineer from Leeds, alone, three hours. Hearing aids that stream from his phone, glasses, large text on his iPhone, a bad knee (lifts only). Loves steam, clocks and flight; knows a lot, spots errors, wants depth, sources and the "why".

**Method.** Playwright Chromium, 390 x 844, Thursday 12 November 2026, 11:00. The preview has no viewport tag (the claude.ai host adds one), so I injected it. Large text: root font 150% and 200%, and page zoom 150%. Ask the Guide was tested with a stand-in only. Screenshots: `research/martin-enthusiast/`.

## Usability results

| Task | Result | Taps | Expected vs what happened | Evidence |
|---|---|---|---|---|
| T1 Five seconds | Success | 0 | "A guided walk; pick 3 Hours." Clear. The mini map's labels are 7px and unreadable. | t1-home |
| T2 About 2 h (Martin picks 3) | Success | 2 | 3 Hours shows "12 Stops, About 2 h 59 min". It has no slack for a sit-down, and the time between stops is fixed at 3 min, even for a lift user going end to end. The list gives titles only. | t2-three-hours-full |
| T3 First stop, way, story | Success | 2 + scroll | The way plays at once; "Skip to the Story" starts under the Next bar. | t3-stop1-top |
| T4 Pause, chapter 3, resume | Partial | 2 + long scroll | The player has no chapter list. I scrolled past Look For and the Tip, then tapped a small 15px heading, "3. Steam Is Not Over". That tap resumes play. The player then shows "Chapter 3 of 7" and the paragraph lights up, which is good. | t4-chapter3-heading |
| T5 Do this later | Success | 1 + scroll | The button is at the very bottom; a toast confirms it and the list shows "Later". | t5-walk-after-later |
| T6 Toilets, cafe, coat, step-free entrance | Partial | 1 + scroll | The cafe and lockers are clear. **Toilets: only a Changing Places toilet** is listed. Step-free: stations only, nothing on the entrance or buses. | t6-visit-full |
| T7 Save offline | Partial (doubt) | 2 | It says "Saved. The whole walk now plays without signal." When I then switched the network off, the Flight story **did not play**. The toast blamed the volume. | t7-saved, x-offline-play |
| T8 H5 and the Vimy | Success (3-hour walk only) | 1 each | The Vimy is the first Look For item at Flight. H5 is in the Clockmakers' Museum, which is not on the 2-hour walk. There is no search, so on that walk H5 cannot be found. | t8-flight-top |
| T9 Look For | Success, with a bug | 3 | The ticks and the "2 of 4" count work. The H5 thumbnail is squeezed into a 26px sliver; tapping it opens a good full photo. Flight has no Look For photos at all. | thumb-row, t9-photo-open |
| T10 Late, 16:30 | Partial | 0 to 1 | "About 1 h 59 min of walk left... clearing in 1 h. Switch to 1 Hour." Switching keeps only Flight and Watt and **drops the clocks**, leaving about 35 minutes unused. | t10-late, t10-after-switch |
| T11 Large text, lifts only | Success, with flaws | n/a | At 150% and 200% there is no sideways scrolling and the text reflows. The tab labels (11px), map labels (7px) and floor numbers (10px) do not grow. At 200% the mini player covers the Next button's label. Lifts: every Find It on the 3-hour walk names one (F, F, A, C, E, A); the mezzanine warning is on Visit and in the Flight Tip. The entrance's step-free status is not stated. | t11-root25-player, t11-root34-clk-look |

## Jobs to be done

**Main job.** When I have a whole afternoon at the Science Museum, I want to go deep on steam, clocks and flight with accurate, sourced detail at my own pace and without stairs, so I leave knowing things I did not know already. *Served partly.*

| When I... | I want to... | So I can... | Status |
|---|---|---|---|
| plan the day | see dated closures | not travel from Leeds to a shut door | **Not served** (shows "Open Now" on 11 Nov) |
| change floors | be given a lift | spare my knee | Served well |
| reach a stop | jump past what I know | spend time on the new | Served partly |
| hear a claim | see its source | trust it | Served partly |
| miss words through my aids | read them | not lose the thread | Served partly (13 min of "on the way" is audio only) |
| stand at H5 | get the "why" | justify the trip | Not served (79 words) |
| need a rest | find toilets and seats | keep going three hours | Served partly |
| run late | keep my favourites | not lose the clocks | Served partly |

## Questions on the move

| Question | Answered now? Where |
|---|---|
| Which lift gets me to Flight? | Yes, Find It (lift F) |
| Where is the nearest gents? | **No** |
| Somewhere to sit on Level 3? | Partly, Visit > Food (picnic seating) |
| Is the Gallery Cafe open on a Thursday? | Yes, Visit (11:00 to 14:00) |
| How did they get the planes up here? | Audio only, in the way there; not on screen |
| Is this the real Vimy, and how much is original? | Partly. The museum's 2019 blog says many small parts were replaced; the guide does not say so |
| How accurate was H5, and how was it proved? | **No** |
| How does H5 differ from H4? | No |
| What does a separate condenser actually do? | Partly: named, not explained |
| Does the Wells clock strike, and when? | Yes: "on the hour", explainer from 11:00 |
| Is Babbage's engine on show? | No (the museum's gallery page names it) |
| Where does that fact come from? | Partly: a per-stop list at the very bottom |
| Is there a hearing loop? | Partly: only "not working" in Information Age |

On the private link, Ask the Guide could answer most of the "No" rows; its card works at 150%.

## Shareable facts

| Fact | Check | Guide tells it? |
|---|---|---|
| Every Flight aircraft came in through the windows by crane and was hung from the ceiling; the Vimy alone "sits on special floor supports" | VERIFIED, https://blog.sciencemuseum.org.uk/refreshed-flight-gallery-looks-to-the-skies/ | Yes |
| In 1919 the Keeper of Machinery and Inventions wrote: "It is ridiculous, of course, to compare this aeroplane with the Rocket" | VERIFIED, https://blog.sciencemuseum.org.uk/the-first-non-stop-transatlantic-flight/ | Yes, paraphrased |
| Alcock and Brown flew 1,890 miles in 15 h 57 min; Alcock was killed on 18 December 1919 near Rouen | VERIFIED, https://en.wikipedia.org/wiki/Transatlantic_flight_of_Alcock_and_Brown | Yes |
| George III tested H5 himself for ten weeks in 1772 and found it "accurate to within one third of one second per day" | VERIFIED, https://en.wikipedia.org/wiki/John_Harrison | **No** |
| H5 was acquired in 1891, when the Rev Harry Leonard Nelthropp persuaded the Company | VERIFIED, https://en.wikipedia.org/wiki/Clockmakers%27_Museum | Yes, hedged, no name |
| George Daniels conserved H5 in the 1960s | VERIFIED, https://blog.sciencemuseum.org.uk/happy-birthday-george-daniels/ | Yes |
| Tompion's longcase runs four months on one winding | VERIFIED, https://www.sciencemuseum.org.uk/see-and-do/clockmakers-museum | Yes |
| The Wells clock mechanism is believed to date from about 1390; its face stayed at Wells | VERIFIED, https://www.sciencemuseum.org.uk/see-and-do/making-modern-world | Yes |

**Spot checks (Flight and Clockmakers' Museum).** Most claims match the museum's pages. Doubts, with the exact text:

- The Flight photo's alt text says "The Vickers Vimy biplane hanging in Flight". The story says, and the museum confirms, that it stands on the floor.
- On the Flight map, the dot sits in the "West Hall" block. Find It says Flight is in the main building and that the West Hall on Level 3 is closed.
- "Look for Space Traveller II... So he redesigned it. His co-axial escapement was adopted by Omega..." The museum's blog says Space Traveller II holds an early *independent double-wheel* escapement. A reader will assume it shows the co-axial one.
- "which is thought to have held a Royal Charter since 1631" and "It is thought to have joined this collection in 1891". Both are documented, so the hedge reads as doubt. The same goes for "Its crew, according to the usual accounts, were Thomas Stafford, John Young and Eugene Cernan". There are 25 such hedges in 87 chapters.
- The caption reads "A George Daniels pocket watch from the Clockmakers' collection", but the source file is named "George Daniels Grand Complication watch". UNVERIFIED that this watch is in the collection.
- The museum's visit page, read on 9 November 2026, lists four dated changes: **the museum is closed all day Wednesday 11 November**, it closes at 17:00 on 26 November, **Flight is closed all day Thursday 19 November**, and Information Age opens at 13:00 on 10 November. None of these is in the app.

## Top issues

**Must**
1. **Dated closures.** "Open Now" on 11 November (x-wed-11-nov), no Flight notice for 19 November. The code supports `closedDates`, `special` hours and dated notices; only the data is missing. Effort S.
2. **The offline promise.** Saved files did not play with the network off. The preview has no `sw.js`, and `<audio>` never reads Cache Storage without one. Check on a real phone in airplane mode on the claude.ai link; then fix it or change the message. Effort M.
3. **"On the way" is audio only:** about 1,900 words (13 minutes) with no text, which shuts out anyone hard of hearing. Show it on the stop page. Effort S.

**Should**
4. A chapter list in the player, with next and previous chapter buttons (T4). Effort S to M.
5. The Look For thumbnail bug: the `.look button` grid also styles `.thumb`, so the photo is squeezed to 26px (thumb-row). Effort S.
6. Visit: add toilets (accessible ones on all levels, says the museum), seats, buses from Knightsbridge (C1, 14, 74) and priority entry for queues. Effort S.
7. H5 depth: add the 1772 trial by the King and the new Frodsham display that the museum's page features. Effort S (writing, re-record).
8. Large text: scale the tab labels, map labels and floor numbers; keep the mini player off the Next bar; raise the 40% fade on paragraphs not being read (it fails contrast). Effort S to M.
9. The time check should keep the stops he chooses, not drop to the canned 1-hour walk (T10). Effort M.

**Could**
10. Put sources near the top of the story, tied to chapters, and show which come from Wikipedia. Effort M.
11. Remove hedges from documented facts. Effort S.
12. Fix the Flight alt text and map dot. Effort S.
13. An object finder across all stops, so H5 is findable on any walk. Effort M.
14. Name the lift before the stairs in Find It ("stairs E or lift E" at Medicine). Effort S.

## Verdict (simulated, in Martin's words)

"It got me up to the aeroplanes and down to the clocks without one stair, and the steam was well told.
But Harrison got fewer words than the cafe, the sources were a mile down the page, and skipping a chapter meant scrolling.
And it would have sent me down from Leeds on the 11th to a locked door."
