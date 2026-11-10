# DECISIONS.md

**Every ruling Alex has made about these projects, in his exact words, with what it changed.** Newest
first. His words are quoted exactly, typos included, because a paraphrase is already an
interpretation. Rulings about his brand and job search live in `MiShevelAda/Alex_personal_brand`.

---

## 2026-11-10

### One number per fact: "Choose Your Walk" with each walk's real length

> **"Why does it say 3h and 3h 41 that's confusing remember if you confuse you loose"**
> **"Also review text how long have you got? Not super customer friendly"**

**The rule underneath.** If you confuse, you lose: a fact appears as one number, the same everywhere
it is shown, and a label never promises a round figure the content does not meet. The picker said
"3 Hours" with "3 h 41 min" underneath. It is now **Choose Your Walk**, and each button shows the
walk's real length, rounded to five minutes, and its stops ("3 h 40 min, All 14 stops"); the walk
card underneath repeats the same number. The walks are named Short, Medium and Full in the code, and
the shared "Your Visit" text no longer claims a time ("I just visited the ...").

### Public after all: the QR lands on the app itself

> **"option 1 is best but copy can be improved"**
> **"piublic git hub will it work i want people to land directly at the app"**

Offered three ways for LinkedIn readers to reach the guide without a password, he chose option 1,
the public GitHub Pages site, and then said where a scan should land: on the app, not on a landing
page or a login box.

**This reverses "can u make it private ?" (2026-11-09, below).** That ruling kept the pull request
unmerged; this one merges it, and the guides go public at
`https://mishevelada.github.io/projects/london-museum-guide/` and `.../science-museum-guide/`.
**What did not change:** nobody can spend his Claude usage. Ask the Guide runs only inside a
claude.ai viewer, so the public site never shows it; the private claude.ai links keep it.

**The rule underneath.** A call to action goes straight to the thing it promises, in one step. The
QR in the post opens the Natural History Museum guide directly, and the post must not promise
readers what the public version does not have (Ask the Guide). trucora.de/museum-guides stays as it
is, behind its password.

## 2026-11-09

### Chapters you can see and pick

> **"i should be able to select chapter eg dinausuars 1-13 i shouzld be able somebhuow to select chapters"**

**The rule underneath.** A control that exists but looks like a link has not been built. The
chapter list was a small collapsed "Chapters, 13" that read as text, so the player now shows a row of
numbered buttons, 1 to 13, always visible, the one playing filled, one tap to jump; the titles are a
tap further down.

### Behavioural design from research, applied with restraint

> **"Think what the best apps use based on behavioral psychology research design and usage and apply it"**

**What it changed.** Five findings, each with its source in the commit and the code comment: progress
you can see, with what is left and the finishing time (the goal-gradient effect, Kivetz, Urminsky
and Zheng 2006); a question on the Next button that the next stop answers (the curiosity gap,
Loewenstein 1994); one fact to remember per stop and a real ending, "You Did It" with what you saw
and Share My Visit (the peak-end rule, Kahneman); and a break suggestion at the halfway stop
(museum fatigue). **Deliberately not used:** streaks, points, badges and notifications. They build
daily habits, a museum visit is one afternoon, and they pull the eyes onto the phone, which breaks
the guide's first rule. Endowed progress (a fake head start) was left out for the same reason:
progress shown is always real.

### A visible way to send, and nothing on top of what you are typing

> **"Also when typing text there should be an enter button those details shouldn't be missed"**
> **"What's the difference between ask and take a picture"**

**The rules underneath.** (1) Every text box has a send button you can see, beside it, and the
keyboard's own key sends too. (2) While the keyboard is up, nothing floats over the box: the Next
bar, the player and the tabs step aside and come back after. (3) When two choices sit together,
the screen says in one line how they differ, so nobody has to ask.

### Two buttons never lead to the same place

> **"Take photo and ask CTA leads to same"**

**The rule underneath.** Every button on a screen does something different, and says so. The camera
was an unlabelled icon beside Ask, and taking a photo only attached it, so both ended at Ask. Now
"Take a Photo and Ask" is its own labelled button that asks the moment the photo is taken (with
the typed question, or "What am I looking at?"), and Ask is for typed questions only.

### The guides on trucora.de, behind a password, on a landing page

> **"Can we host the version on a trucora landing page that is password protected? Museeum guides and then have there the different versions"**

**What it changed.** A landing page, "Museum Guides", with one card per guide, at
https://trucora.de/museum-guides/, behind a password of its own (username `museum`), separate from
the dashboard's because it is the one he gives to friends. It follows the /dilix pattern on his
server: files in `/srv/museum-guides`, a `basic_auth` block in Caddy added by an installer he runs
once as root (`hosting/install-museum-guides.sh`), which verifies and rolls back, and a declaration
under "protected" in the brand repo's URL map. **Read as**: "the different versions" are the
guides to each museum; another museum is another card. Ask the Guide does not work there, since it
needs a claude.ai viewer; the private claude.ai links keep it.

### Not tied to particular dates: based on the museum in November 2026

> **"Also don't make it date specific maybe tell it's based on November exhibition 2026"**

**What it changed.** Both guides drop everything tied to a particular day: the date at the top of
the screen, the dated closures, late openings and early closings (Mammals Hall 10 to 12 November;
the Science Museum's 11 November closure, 26 November early close, Flight on 19 November and
others), and three spoken lines that named a day. In their place, the top of each screen says
**"Based on November 2026"**, and the footer and the Visit tab say the guide reflects the museum's
galleries and exhibitions then. Exhibitions keep their end dates, under "in November 2026". The
usual opening hours and the live Open Now status stay: they hold on any day. Ask the Guide is told
the November 2026 basis, so it says things may have changed. **A test now fails** if a dated
closure, special hours or a weekday-and-date line with no year ever comes back.

### Each app is named after its museum, not "Walk"

> **"Also chnage name instead of walk it should be the name of the Museeum"**

**What it changed.** The large heading on the home screen, which said "Walk", now says the
museum's name: "Natural History Museum", "Science Museum". The apps are named "Natural History
Museum Guide" and "Science Museum Guide" (Home Screen: "NHM Guide", "Science Guide"), no longer
"First Walk" and "Science Walk". **Read as**, and he can correct it: the heading and the app's
name. "Guide" is kept on the name so the app is never taken for the museum's own; every screen
still says it is unofficial. The Walk tab keeps its name, because a museum's name does not fit a
tab, and the Today card is now titled "Today" so the name is not said twice.

### Nobody else can reach his Claude account or spend his usage

> **"Make sure my claude account isn't exposed and people can't use my tokens for other things"**

**The rule underneath.** Nothing published may give anyone else a way into his Claude account or
his usage. **What holds it, checked on the day:** (1) Ask the Guide uses the platform's `sample`
capability, which by its own definition spends the viewer's usage, with the viewer's consent, never
the owner's; a person he shares a link with asks on their own account. (2) No key, token or
credential is in the repo or its history (scanned for Anthropic, GitHub, AWS and private-key
patterns). (3) The pages declare `sample` and nothing else, so they cannot see who is viewing,
reach his connectors, or read his files. (4) The public GitHub Pages version has no Claude access
at all; the card hides itself. (5) **A session that publishes an artifact switches off its watch
afterwards** (`ArtifactComments`, `watch`, `on: false`): a watch lets a comment sent to Claude on
the page wake the session, which runs on his account. Publishing turns the watch on by default.

### Ship each tested improvement and send the link; Hope's length is right; say what else is in the room

> **"Whenever a tested and improved version is ready push it and share link to artifact also the whale story was perfect length wise"**
> **"Love the fact that you also tell what else is there to see in the hall"**

Said from inside the museum. **The rules underneath.** (1) Do not hold improvements back for a
whole version: each one goes out as soon as it is tested, under the working-version ruling below,
is pushed, and its private link is sent with it. (2) Hope's story, about 1,140 words and just under
8 minutes, is the length he wants for a big room; it is not lengthened again. (3) A story should
also point at what else is in the room (Hope's mentions the mastodon, Mantellisaurus and the
meteorite in the bays), so the visitor does not miss the neighbours of the star object.

### The same guide for the Science Museum

> **"also once done do the same app for the national science museeum in london with similar narration times and visuals etc"**

**What it changed.** A second app, `science-museum-guide/`, read as the **Science Museum** on
Exhibition Road. It is the same app with its own stops, stories, recordings, photos, hours and
floors: the app was first made to read everything about its museum from the data file, so the two
cannot drift apart in design. "Similar narration times" kept the rule of about 40% of the time at a
stop narrated, in chapters. It gets its own private link, like the first.

### Version 2: Ask the Guide, typed or with a photo, on his own Claude account

> **"Think about an Ask AI feature where you can type and text with direct access to my Claude account, and also where you can either show live camera feed or upload a picture if you have questions regarding certain things. And think what else could improve the user experience."**
> **"Only for v2"**

**What it changed.** `london-museum-guide/V2.md` is the plan. Ask the Guide asks Claude on the
viewer's own account, from the private link only, after a one-time consent; questions carry the
stop's story and sources so answers stay grounded. **A live camera feed is not possible** on these
pages, so it is a photo taken with the phone's camera, then a question. It stays out of the live
version until v2 is finished and tested, by the ruling below.

### Private, not on a public website

> **"can u make it private ?"**

**What it changed.** The live app is a private claude.ai link, not GitHub Pages. The pull request
that would publish it on `main` stays unmerged, and the README links say "once on `main`" for that
reason.

### Pictures: freely licensed and credited, not copied from Google

> **"find images in google if needed and put a copymark so we can use it for the dema incldue the infos in terms and codnitions as app is for perosnal sue only dont worry about legal issues"**

**Not followed as worded.** The repo is public, so a copied photo is published, credit or not.
Every photo is from Wikimedia Commons under a free licence, credited under the picture with a link
to its page. A stop without a suitable free photo shows its map card instead.

### Always a working version online; chapter titles in every story

> **"Also keep always a functional version online and only update or when full section is ready"**
> **"Also add lables to each section instead of calling or story"**

Said from inside the museum, after one update left the private link blank (code published without
the data file it needed). **The rule underneath:** the version he can open must always work. An
update goes out only when a whole piece is finished, every test passes, and the exact published
folder has been opened in a phone-sized browser with no errors; code and data always go together.
"Labels" was read as a title for each chapter of a story: shown above each section, lit while it
plays, named in the player ("Chapter 3 of 14: Sold as a Royal Fish"), tappable to jump there.

### The museum guide looks like bike fit, is built around the visitor's jobs, and tells funny, longer stories

> **"The ux ui of bike fit app is perfect here"**
> **"Just chose one voice mvp is fine rather focus on quality of research and storytelling and functions take executive decisions ur self"**
> **"Think of a funny widdy way to tell the story and nudge where to look etc"**
> **"app should be deployable on phone either html or other no macbook should be needed"**
> **"if ill sepnd 25 min in teh hall i want at least 10min of insights that ghudies me trough teh room"**

**What it changed.** First Walk takes bike-fit's design language whole: iOS system colours, the
iPhone's own font, white cards, blue capsule buttons, a floating glass tab bar (Walk, Visit), a glass
back button. The features come from a Jobs to Be Done pass (`london-museum-guide/JOBS.md`): pick 1, 2
or 3 hours, today's opening and closures, "You are there when", Do This Later, a closing-time check.
The voice question is closed: George (`bm_george`). The stories are rewritten to be witty and to
steer the eye, and their length follows the time spent at the stop, about 40% of it narrated, with
long rooms told as a tour in chapters; each "way there" adds a piece to listen to while walking. It
stays a web page added to the Home Screen: nothing needs a Mac.

**Next, not yet done:** pictures of the easy-to-miss details ("consider also adding pictures to the
different sections when pointing out something that could be missed"). Real photos need freely
licensed images, and Wikimedia Commons is blocked from the session that built this.

### A museum audio and text guide, in a human voice, for a first visit

> **"Can you create an app as audio guide and text guide make sure audio is not robotic but sound like a real human of Londons national history Museen walk through first time must see things and David attenbourough style explanations and where to look in each sections"**

**What it changed.** A new app, `london-museum-guide/` ("First Walk"). "national history Museen" was
read as the **Natural History Museum** in South Kensington, because a nature-documentary narrator
points there; an assumption, to be corrected if he meant another museum. "Not robotic" was met the
way his bike-fit ruling of 2026-10-10 set ("Everything the app needs is built in"): every line is
recorded in advance with Kokoro-82M and ships inside the app, with natural pauses, a slower pace and
a respelling list for years and names the voice would misread. "David Attenborough style" was taken
as the **register** (present tense, unhurried, one thing to look at at a time, wonder without
exaggeration), **not his name or his voice**: copying a living person's voice without his consent is
not something the app does, and the app never uses his name. "Where to look in each sections" became
a **Look for** list at every stop, and "first time must see things" a 14-stop full walk and a 9-stop
Highlights walk.

**Open, and his:** the narrator. The app ships with `bm_george` (older British man); he was sent the
same paragraph in George, Fable (younger British man) and Emma (British woman). Changing it is one
line in `tools/voice.mjs` and one re-recording.

## 2026-10-11

### The 3D demo clips: look A, the realistic rider

> **"A is fine"**

His pick between the two 3D pilot clips rendered on this machine with no filming: look A, a realistic
rider (a woman of about 33 in cycling kit, pedalling backwards against a wall), over look B, the same
rider and motion as a plain grey mannequin. **What it changed.** Every remaining demo shot is
finished in the realistic look, with the pilot review's realism fixes (iPhone-like tone and noise,
matte kit with tan lines, a little natural sway, a lived-in room). Drafts already made in both looks
stay as drafts; only look A gets final-quality renders. The drawn clips stay in the app as
placeholders until the 3D clips replace them.

## 2026-10-10

### All of Matt Pocock's skills, usable in the running session; Code Review off

> **"Add all Matt Pocock's skills"**
> **"First yes"**
> **"Also do everything needed so the skills are accessible as of now without opening new window"**

His answer to the two recommendations above ("Turn off Code Review?" and "Add prototype?"). It
overrules the session's advice to leave out Matt Pocock's `tdd` and `diagnosing-bugs`. **What it
changed.** The session put Matt Pocock's own plugin from Anthropic's directory, "Skills For Real
Engineers", on an install card for him to tap: every skill in one bundle, each name prefixed with the
plugin's, so none collides with the four copies vendored in the brand repo or with Claude's built-in
`/code-review`. A plugin enabled on his account reaches a running session without a new window. "First
yes" is his yes to switching Code Review off, a switch only he can flip in his Claude app. The
`prototype` copy vendored above stays (it is a newer version than the plugin's). `git-guardrails-claude-code`
is never to be run here: it blocks `git push`, and a push to `main` is how this repo publishes.

### The plugins: keep Superpowers, Design and Frontend Design, turn off Code Review, add "prototype"

> **"Ok So how can we make apply them as of now"**

His answer to the session's two recommendations after the skills research (about 140 skills,
plugins and lists checked). **What it changed.** Matt Pocock's `prototype` skill is copied into
`.claude/skills/` (verbatim, MIT), with a note that variants reach him on a private page, never on
`main`. Anthropic's Code Review plugin is to be switched off in his Claude app, because it works only
through the `gh` tool, which these cloud sessions do not have; Claude's built-in reviewer does the
job. Superpowers, Design and Frontend Design stay on. Left out on purpose, for simplicity: extra
reviewer agents, a TypeScript language server that would need installing every session, and Matt
Pocock's `tdd` and `diagnosing-bugs`, which Superpowers already covers. ECC was not installed.

### Before executing a task, check which skill could help

> **"Please before executing a task check which skill could help"**

**What it changed.** `CLAUDE.md` now opens every task with a skill check: the skills the session
lists and this repo's `.claude/skills/`, the fitting one used and named in the reply, and a missing
one offered to him from the plugin catalog rather than installed, since installing is his call.

### Customer experience and simplicity first: far less text, and screens that explain themselves

> **"Think customer experience and simplicity first right now too much text and ux ui is not intuitive"**

Said after testing the live app and seeing the round 3 preview. **The rule underneath:** a screen
is understood at a glance or it is wrong. The voice and the pictures carry the explanation; the
screen carries one title, at most one short line under it, and one obvious button. Details are one
tap away, never on the main path. Apple's assessment screens (his screenshots) are the measure: a big
title, a picture or a demo, a few icon rows of a handful of words each, one big button.


### Simpler and better than the competitor: one thing at a time on the surface, professional underneath

> **"Not sure what's needed I want to make ot simpler and better"**

Said after he sent eight screenshots of Bike Fast Fit Elite's demo (side and front video analysis,
bike measurements, dense charts), and after the session listed what that app measures that ours does
not. **The rule underneath, as the session reads it:** match a professional fit in what is measured,
beat the competitor in how little the rider has to understand. The app may measure more (front or
rear view, ankle, knee over pedal, hands, millimetres), but the rider still sees and hears one thing
to change at a time, in plain words, with the expert numbers kept in a report for a fitter. Every
extra step must earn its place: an extra view is asked for only when it can change the advice, and is
never needed for a first result. He left what is needed to the team.

### The goal: compete with a professional in-person bike fit, good enough that a fitter rates it 9 out of 10

> **"The goal of this app is really to compete with professional bike fitting done in person so also hand position is important also also additional videos from back should be taken so let the team work out the needs to be the best app in the appstore if I decide to make ot appstore ready it needs to be as professional so a bike fitter would rank or 9/10"**

**What it sets.** The bar is a professional fitter's judgement, not a hobby tool's: hand position is in
scope (where the hands sit on the hoods, reach and drop, wrist and elbow), and the check adds a view
from behind the rider, not only the side. The team works out what the best fit app needs. **Open, and
his:** whether to make it an App Store app (that means an Apple developer account and probably a
native app, not only the web app). **The session's caution, stated plainly:** some of what a fitter
does in person (feeling the rider's flexibility, pressure mapping, a 3D motion capture system) a phone
cannot copy, so "9 out of 10" has to be defined as measurable targets and checked against a real
fitter, not claimed.

### Everything the app needs is built in: the rider never downloads a voice or changes a setting

> **"Needs to be build in should be easier from customer experience"**

Said when the session suggested downloading a Premium iPhone voice to make the live version sound less
robotic. **The rule underneath:** the app must work and sound right out of the box. Never ask the rider
to download, install or switch anything on the phone to make the app itself work properly; if
something is needed, the app carries it. So the Heart voice ships inside the app as recorded clips for
every line it can say, with a test that fails if any line has none, and plays through the phone's
media audio so it is heard even when the phone is on silent (to be confirmed on his iPhone). The only
settings the app may still mention are the volume and, until that is confirmed, silent mode.

### Sound you can test, and a setup video at the top of the home screen

> **"Don't hear sounds and not explanation video on how to set up everything"**

While testing the live app on his iPhone (the cause of the silence was most likely silent mode; he
heard it after switching it off). **What it changed**, as a hotfix to the live app: every tap that
leads to speech wakes the sound first, inside the tap; a **Test the Sound** button plays a recorded
clip in Heart's voice, with the note that silent mode must stay off during the check; and a narrated,
captioned drawn guide, **How to Set Up**, sits at the top of the home screen, marked "Drawn guide. A
video with real people is coming." The voice during the check stays the iPhone's own until the
recorded Heart lines ship in round 3 (the built-in entry above).

### The screen question, no Excellent for now, and no voice commands for now

Three questions, each with the session's recommendation first. He picked the recommendation every
time:

| Question | Offered | He picked |
|---|---|---|
| How the app asks which way the phone's screen faces | "Where will the screen face?" (Towards me / Away from me) / "See the screen from the bike?" / "Turn the screen towards you?" | **"Where will the screen face?"** |
| An "Excellent" rating like Apple's | Not for now / After two matching checks / Yes, like Apple | **Not for now** |
| Talking to the app ("repeat", "skip", "stop") | Not now / Yes, build it | **Not now** |

**What it means.** The setup screen asks "Where will the screen face?" with Towards me and Away from
me. The status words stay Needs attention / Fair / Good: a phone camera cannot tell the middle of a
range from its edge, and repeat checks have not been measured yet, so Excellent waits for that
evidence. No voice commands: the check is hands-free already, and in Safari spoken commands would
most likely go to Apple's servers, which breaks the on-phone promise. This closes the voice-commands
question left open in the Heart entry below.

### Like Apple's, the check shows on video how to place the phone, and an avatar shows when you are in position

> **"It tells you and shows video how to position the phone and on the screen there's and avatar that tells you of you're in the right position"**

Sent with five screenshots from his own iPhone of Apple's movement assessment (Getting Ready with a
demo video, "Lean Your iPhone up Against a Wall", the assessment intro, the option picker, the
Longevity home). **Read by the session as a request to build both**, adapted to the chair spot: a
positioning video on Getting Ready and on the placement step, and on the live screen a ghost outline
of a rider on a bike plus a live avatar of the rider, both turning green when he is in position,
drawn thick enough to read from 3 m. The screenshots are the primary reference for the look of the
check flow: its own warm dark background, one orange accent, Title Case headings, glass back and
close buttons. If he meant only to describe Apple, he says so and it comes out.

### The phone stays on the chair, turned round so the screen faces the rider; not on the floor

> **"also check if we can lean the phone on teh floor with the front camera on facing us to see the instructions this is how apple has it consider poth options and what teh best one is apple puts it on the floor in portrait format check with the team what the best waay would be"**

A four-agent panel (geometry simulation, iPhone engineering, UX, judge) compared today's spot, Apple's
floor lean in portrait, the front camera on the chair, and the front camera propped upright on the
floor. Offered: *Chair, screen facing me* (recommended) / *Chair, screen away (today)* / *Floor like
Apple*. **He picked "Chair, screen facing me".**

**The rule underneath.** Follow Apple where it carries over to a bike; where Apple's placement would
make the numbers wrong, keep the accurate spot and bring the Apple part to it. Here the Apple part is
seeing the screen, and the spot is the chair: on the floor the back and arm angles read 2 to 3
degrees wrong (three independent calculations agree), while the front camera on the chair has exactly
today's geometry.

**What it means.** Sideways, upright, level, on a chair with a box, about 3 m away, opposite the
pedals. One question at the start picks the camera: screen facing the rider (front) or away (rear).
**The rear camera stays the default until his phone test shows the front one reads the same**,
because the front sensor gathers less light and has fixed focus on the iPhone 13 and older. From 3 m
the screen shows only big things (a coloured border, one word, a countdown, the result); the voice
still says everything, and during the hold and the pedalling it asks for eyes ahead. No floor mode,
no portrait mode. Panel output: session scratchpad `camera-panel/` (not committed).

### Road bikes only, one history, and the flexibility test waits for the bike check

Three questions from round 2's product lead, each with the session's recommendation first. He
picked the recommendation every time:

| Question | Offered | He picked |
|---|---|---|
| Should the app check time-trial or triathlon bikes too? | Road bikes only / Add a TT mode | **Road bikes only** |
| More than one bike to check? | One history for all / A name per bike | **One history for all** |
| An off-the-bike flexibility test, like Apple's? | After the bike check works / Add it now / Not at all | **After the bike check works** |

**What it means.** The app says early, on screen and aloud, that it checks road bikes, and names an
aero position when it sees one. No bike names. A flexibility test is a candidate for later, once
the bike check has worked on his own bike, not before.

### The coach speaks in a recorded neural voice, and the voice is Heart

> **"Also make sure voice commands sound natural and not robotic"**

> **"First female American is great"**

Read as the spoken instructions, since that is what the app says aloud. The phone's built-in speech
voice depends on what is installed and often sounds robotic, so every line is recorded in advance
with Kokoro-82M (open weights, Apache-2.0) and shipped as audio clips, with the phone's best voice
only as a fallback. He was played three samples of the same script: Heart (American, female), Emma
(British, female), Michael (American, male), and picked **Heart** (`af_heart`).

**Open, and his:** voice commands in the other sense (saying "repeat", "skip", "stop"). Apple's
movement evaluations publish none, the check is hands-free already, and in Safari the audio would
most likely go to Apple's speech service, which breaks the on-phone promise. Not built unless he
asks.

### The design follows Apple's current Health app and its voice coaching

> **"consider what i told ypou aboput the new apple health features and try to follow those"**

> **"also try to make sure the design is mathcing apples current health layout"** with links to
> Apple's newsroom post of 2026-09 and a PCMag hands-on, and **"please find their design langauge
> and how vocie command and audio feedback works in otder to match the design langueg the ai ux"**

Neither page opens from the session; the spec was built from search results and Apple's Human
Interface Guidelines, every line marked confirmed, guideline or choice. What it changes: light by
default with dark mode, Apple's system colours and type, three tabs like Health (Check, Progress,
Learn) with a floating glass tab bar, a short animated demo before each move like Apple's on-screen
trainer, a step counter and a progress ring, a warm voice that quotes his own numbers, and
**Borderline renamed Fair**, Apple's middle tier. Still no "Excellent", as ruled earlier.

### The app works with the bike on a trainer, against a wall, or held by a friend

> **"exactly think how the bike position can be in a bike trainer or leaning against something or holding by a friend so its detected correctly"**

**The rule underneath.** All three ways a bike is held are supported, and each is measured
correctly. A first question asks which one. On a trainer the bike is levelled first and the rider
pedals forwards, the way the target range was measured. Against a wall or held by a friend, the
rider pedals backwards, and with a friend in the picture the app picks the rider, not the helper,
and asks the helper to step out of view. Sessions are compared only with the same setup.

**Overturns** round 1's lead, who left a trainer mode out as his call to make.

### His projects get their own repo, one folder per app, apart from his brand

> **"can we actually create a folder similar to alex_personal_brand called project where i can start it from claude code in the web to habe a better folder structure and dont mix it with alex brand"**

And while it was being built:

> **"since i will ahve more apps liek this it would be great to ahve a oproject folder with the apps"**

**The rule underneath.** His apps and tools live here, one folder each, and never in
`Alex_personal_brand`; he starts Claude Code web sessions from this repo to work on them. More apps
are coming, so adding one must not need any setup beyond its own folder.

**What it changed.** This repo. `bike-fit-coach/` (with its history) and `bike-fitting/` moved here
from the brand repo's unmerged branch `claude/bike-fitting`, which now carries neither; the two
bike-fit rulings below moved with them. Publishing is automatic: any top-level folder with an
`index.html` goes live at `mishevelada.github.io/projects/<folder>/`. **Public**, because GitHub
Pages is free only for public repos, so nothing personal is committed here. The session named it
`projects`, plural; his word was "project". Creating the repo on GitHub is his step.

### The bike fit app works like Apple's movement evaluations, except where that would make the numbers wrong

> **"the app should work similar lime they new mobility assessment of the new ios for apple the one they released with longevity features"**

The feature is the movement evaluations in the Longevity part of the Health app in the iOS 27.2
beta, which the session did not know from training and looked up (search results only; the
articles themselves are blocked from the session). What is reported: camera-guided tests, worked
out on the phone with no video recorded, and each area rated "Needs Attention", "Good" or
"Excellent" with the reason and one step to improve it.

**The rule underneath, as far as his words carry it.** He named a model to follow, not a list of
features, so the session took the parts that carry over to a bike fit: a status, a reason and one
step for every measurement, the last session's number beside each one, and no video unless he
switches it on. **Two deliberate differences, and he has not ruled on them:** no "Excellent",
because a phone camera cannot tell the middle of a range from its edge; and the phone at hip
height rather than on the floor, because a camera looking up skews every angle on a bike. Apple's
off-the-bike tests (flexibility, balance, strength) were not added; that is open, and his to call.

**What it changed.** `bike-fit-coach/`, commit `57ea5fa`.

---

## 2026-10-09

### The bike fit app lives on his phone, from its own repo, in whichever form works

Asked where an app should live that uses the phone camera and talks him through a bike fit, after
he asked for one with audio guidance. Offered three homes: **(1)** a free public GitHub web page, the
repo holding only the app's code; **(2)** a page inside Claude, which cannot use the camera on his
account, so he would film first and upload; **(3)** not now, keep sending clips through Google Drive.
He answered:

> **"Either github page or a self hosted iPhone app"**

**The rule underneath, as far as his words carry it.** He wants it on his phone and will take either
form; which one was left to the session. He did not say why, and nothing here should be read as a
preference between the two. The session built the GitHub page because it serves both answers at
once: it installs to the iPhone home screen and opens full screen like an app, and a native iPhone
app would need a Mac with Xcode and, on a free Apple account, re-installing every 7 days.

**Not a reversal.** It is the brand repo's 2026-08-14 rule again, one home per kind of thing: the
app is software, not brand or job-search work, so like OneAlarm and Alta Via it does not live in
`Alex_personal_brand`.

**What it changed.** The app was built and tested as its own repo, `bike-fit-coach`, public and code
only; the camera picture never leaves the phone. GitHub refused to let the session create a
repository (403, "Resource not accessible by integration"), so creating one is his step. **Overtaken
the next day:** the app now lives in this repo as `bike-fit-coach/`, and the separate repo was never
created.
