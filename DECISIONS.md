# DECISIONS.md

**Every ruling Alex has made about these projects, in his exact words, with what it changed.** Newest
first. His words are quoted exactly, typos included, because a paraphrase is already an
interpretation. Rulings about his brand and job search live in `MiShevelAda/Alex_personal_brand`.

---

## 2026-10-10

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
