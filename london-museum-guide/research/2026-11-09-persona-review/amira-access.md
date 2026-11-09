# Amira: access review of the Science Museum Guide

**Simulated.** An AI played Amira; nothing here comes from a real visitor. Every finding is a hypothesis for Alex to check with real wheelchair and VoiceOver users; Chromium is not VoiceOver on an iPhone.

## Persona

Amira, 29, wheelchair user, visiting with a friend. Low vision in one eye, VoiceOver for long text, Dynamic Type set large. Tires easily, so she plans breaks. Her jobs: a lifts-only route, accessible toilets and seats, no dead end at a mezzanine, every control usable by screen reader.

Method: port 8775; the published body served inside a minimal page (doctype, `lang`, viewport), since the host adds these; axe-core 4.14; Playwright 1.63 has no `page.accessibility`, so `ariaSnapshot()` and Tab walks. Files: `/tmp/claude-0/-home-user/5900d085-c2ce-5f46-bb2f-51497441b5ea/scratchpad/research/amira-access/`.

## Usability results

| # | Task | Result | Taps | What happened |
|---|---|---|---|---|
| T1 | Five seconds | Success | 0 | Clear: open now, pick a length, start. Nothing about access, so her first tap is Visit. |
| T2 | 2 hours | Success | 2 | 8 stops, 2 h 5 min, four lift rides. Nothing says the route is step-free. |
| T3 | First stop, the way, the story | Success | 3 | The way plays itself; Skip to the Story sat under the Next bar until scrolled (`T3-way.png`). Nothing about entrance steps. |
| T4 | Pause, chapter 3, resume | Partial | 2 + scroll | Tapping the heading "3. Steam Is Not Over" jumps and plays; the player shows "Chapter 3 of 7". The headings are not buttons: impossible by keyboard or switch, and VoiceOver will not announce them as actionable. |
| T5 | Do this later | Success | 1 | Moves to the end, opens the next stop and plays its directions; a toast says so. |
| T6 | Toilets, café, coat, step-free entrance | Partial | 1 + scroll | Cafés and lockers found. **No toilets** except the Changing Places one. **No step-free entrance** line, only step-free stations. Card titles are not headings, so VoiceOver cannot jump to Access. |
| T7 | Save offline | Success | 1 | "Saved." (31 MB). The message vanishes at the next minute refresh. |
| T8 | Space and the Energy Hall engines | Success | 2 to 4 | Both in the route list; Look For names four engines. Level route. |
| T9 | Look For, photo | Partial | 3 | Ticks are toggle buttons ("2 of 4"). The photo opens with focus on Close, but Tab escapes behind it and closing drops focus to the top (`kb-zoom.png`). |
| T10 | 16:30 | Partial | 0 | "About 2 h 5 min of walk left, and the galleries start clearing in 1 h." No shorter walk offered (the 1-hour one needs 61 min); times assume walking pace. |
| T11 | Accessibility audit | Partial | | Below. |

### T11: WCAG 2.1 AA audit

**axe-core**, Walk, Visit, Space, Energy Hall, light and dark: Walk and Visit 0 violations; each stop 3 in both themes: "Plays the way there" contrast 2.94 (dark 2.72), Speed name mismatch, heading order h1 to h3; with Ask shown, the Ask button (3.52). The Natural History Museum Guide gives identical results: same code.

**By hand:**

| Sev. | Element | WCAG | Fix |
|---|---|---|---|
| Major | Chapter jump: `.story h3.chap`, `p[data-p]` are click-only, tabIndex -1, 20 px tall | 2.1.1, 4.1.2 | A Chapters list of 44 px `<button>`s in the player ("3. Steam Is Not Over, 1:18") |
| Major | Minute refresh: `setInterval` re-renders `main` on Walk and Visit; focus falls to `body` (tested), the Saved message is wiped | 2.4.3 | Update only the Today card's text in place |
| Major | Tab to Play, scrubber, Look For lands under `.bottombar`, 65 to 100% covered (`focus-hidden-scrubber.png`) | 2.4.7 (2.4.11 in 2.2) | `html { scroll-padding-bottom: 150px }` |
| Major | Visit: 9 of 11 card titles are `<b>`, not headings | 1.3.1 | An `<h2>` per card |
| Major | White on `#0088FF` small text: "Plays the way there" 2.94, Ask button and her own chat bubbles 3.52. Read-along dims other paragraphs to 2.85 (dark 3.79), chapter titles to 1.86. Seen stop numbers, white on zone colour, 2.0 to 3.6 | 1.4.3 | Fill `#0066D6` in light mode (5.42 with white); dim to opacity 0.7 or mark the live paragraph with a bar; dark digits |
| Moderate | Photo `#zoom`: `aria-modal` but no trap, page behind not inert, focus not returned | 2.4.3 | `<dialog>.showModal()`, focus back to the thumbnail |
| Moderate | Speed: `aria-label="Speed"` hides "1×" | 2.5.3, 4.1.2 | Visible "Speed 1×", no aria-label |
| Moderate | Scrubber: no `aria-valuetext` (reads "47.5"), 28 px tall | 4.1.2 | "0:47 of 7:32, chapter 2" |
| Moderate | Camera: focus on a 1×1 transparent input, no ring (`ask-camera-focus.png`) | 2.4.7 | `.cam:focus-within` outline |
| Moderate | Ask replaces the whole answer inside `aria-live` six times per answer; VoiceOver may read fragments (hypothesis) | 4.1.3 | `aria-busy="true"` until done |
| Minor | Tab bar labels fixed at 11 px, active one about 2.9:1; mini-map labels render about 5 px, floor numbers about 7 px | 1.4.3, 1.4.4 | `--blue-text`; drop map labels |
| Minor | Stop page reads the map before the title; Find It, Listen, Look For, The Story are not headings | 1.3.2, 1.3.1 | Title first; `<h2>`s |
| Minor | Route colours mean floor (blue 0, green 1, orange 2, red 3); the mini-map uses them for areas (orange = Entrance). Not a 1.4.1 fail: text always gives the level | | One meaning per colour |

**Passes:** 3 px focus ring elsewhere; Look For toggles; Dynamic Type scales cleanly to AX2 (at AX5 "Forward 15" overflows, `dt-53-space-player.png`); no sideways scroll at 320 px; pinch zoom on; reduced motion leaves only opacity fades; small grey text passes (4.69 to 5.23 light, 7.7 to 9.5 dark).

**Access content.** Strong directions: every floor change names a lift (21 mentions; the Natural History Museum Guide has none, and its Darwin stop says "climb the main staircase"). Mezzanines are flagged in Visit and at Flight. Missing, all VERIFIED on https://www.sciencemuseum.org.uk/visit/accessibility: accessible toilets on all levels; the Changing Places toilet needs a RADAR key; wheelchairs bookable ahead on 033 0058 0058; priority entry if the queue is a barrier; most lifts announce floors and have Braille; Energy and Space Café seats with backs and arms; Blue Badge bays on Exhibition Road. Ask the Guide is not given the Visit facts. A step-free main entrance: the museum's pages do not say; UNVERIFIED.

**For every visitor:** https://www.sciencemuseum.org.uk/visit, fetched today, says the museum is **closed all day Wednesday 11 November 2026**, closes 17:00 on 26 November, Flight is closed 19 November, Information Age opens 13:00 on 10 November. The app has none of these.

## JTBD

**Main job:** When I visit in my wheelchair with a friend, I want the best of the museum on a route I can roll, with toilets and rests I can plan, and every control working with VoiceOver, so I spend the day on the exhibits, not on finding lifts. **Served partly.**

| When I... | I want to... | so I can... | Served |
|---|---|---|---|
| plan the day | know the entrance is step-free and book a wheelchair | arrive without a detour | Partly |
| pick a walk | know it is step-free and how many lifts | avoid dead ends | Partly |
| change floor | be told which lift | not hunt for it | Well |
| tire | know where to sit, with a back | pace myself | Partly |
| need the loo | find the nearest accessible toilet | not lose twenty minutes | Not served |
| reach a gallery | know what I cannot reach | not queue for nothing | Well at Flight, partly elsewhere |
| use VoiceOver | jump by heading and keep my place | not start over | Partly |
| want a chapter again | pick it from a list | not scrub blind | Partly by touch, not by keyboard |
| set large text | have the app grow with it | read without zooming | Well |

## Questions on the move

| Question | Answered? | Where |
|---|---|---|
| Which lift from here? | Yes | Find It, the way there |
| Can we go straight from Energy Revolution to Information Age? | Yes | Energy Revolution's Find It: only via Levels 0 and 3 |
| Nearest accessible toilet? | No | |
| A seat between Space and Flight? | No | |
| Is the main entrance step-free? | No | |
| Chairs with backs in the Space Café? | No | Hours only |
| Can I see into Apollo 10 from seated height? | No | |
| Can I get up to the Flight mezzanine? | Yes | Flight tip, Visit |
| Is that the real capsule that went round the Moon? | Yes | Space story |
| Why "Charlie Brown"? | Yes | Chapter 2, an Ask suggestion |
| Can I touch anything? | No | Museum: touch objects with Braille labels in five galleries |
| Audio description for objects? | Partly | Audio Eyes only at Information Age; the museum says Medicine too |
| Was there ever a pilot who used a wheelchair? | Yes | Flight, Tim Ellison |

## Shareable facts

| Fact | Check | In the guide? |
|---|---|---|
| Apollo 10's crew went faster than anyone before or since: 39,897 km/h, 26 May 1969 | VERIFIED https://en.wikipedia.org/wiki/Apollo_10 | Yes |
| The call signs were Charlie Brown and Snoopy; Schulz worried because Charlie Brown always failed | VERIFIED same page | Yes |
| Snoopy's ascent stage was sent into orbit around the Sun | VERIFIED same page | Yes |
| The Soyuz came home at 17,000 mph, over 1,500°C | VERIFIED https://www.sciencemuseum.org.uk/soyuz-descent-module | Yes |
| Helen Sharman answered "Astronaut wanted. No experience necessary", chosen from nearly 13,000; her suit took 54 measurements | VERIFIED https://www.sciencemuseum.org.uk/objects-and-stories/helen-sharman | Yes |
| Old Bess, 1777, is the oldest surviving Watt engine | VERIFIED https://en.wikipedia.org/wiki/Old_Bess_(beam_engine) | Yes |
| Tim Ellison: first wheelchair pilot in Europe with a CAA commercial licence, and first European wheelchair pilot to fly a light aircraft round the world | VERIFIED https://blog.sciencemuseum.org.uk/refreshed-flight-gallery-looks-to-the-skies/ | First half only |
| Moon rock: the guide says about three billion years; the museum's Space page says "3.5 billion-year-old" | CONFLICT, https://www.sciencemuseum.org.uk/see-and-do/space | Check which is right |

## Top issues

**Must**
1. Add the verified access facts to Visit and pass Visit to Ask. T6. S.
2. Chapter buttons in the player. T4, keyboard test. S.
3. Stop the minute refresh wiping focus and the Saved message. T6, T7, tested. S.
4. Headings on the Visit cards. T6, `aria-visit.txt`. S.
5. Add the November closures (11, 19, 26 November). Every visitor. S.

**Should**
6. Contrast: `#0066D6` buttons, gentler read-along dimming, dark digits on zone colours. T11. S.
7. Keep focus clear of the Next bar. `focus-hidden-scrubber.png`. S.
8. Photo dialog, Speed name, scrubber value, camera ring, Ask `aria-busy`. T9, T11. S.
9. Once checked on site: "Step-free, four lifts" on the Up Next card, and a nearest toilet and seat line per stop. T2. M.
10. On auto-advance, announce instead of moving focus: VoiceOver and the narrator may talk over each other (hypothesis). S.

**Could**
11. An "I take longer" option feeding the time check. T10. M.
12. Map card: drop the tiny labels, one meaning per colour, readable tab labels. S.
13. Mention touch objects, the Braille floorplan and Audio Eyes in Access. S.
14. Confirm with the museum that the main entrance is step-free, then say so. S.

## Verdict (simulated, in Amira's words)

"Best lift directions I've had from any guide, and it warned me off the Flight mezzanine before I got there.
But it doesn't know where one accessible toilet is, and VoiceOver loses my place on Visit every minute.
Fix the toilets, the chapter list and the pale text, and I'd send it to every wheelchair user I know."
