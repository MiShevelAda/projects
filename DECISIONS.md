# DECISIONS.md

**Every ruling Alex has made about these projects, in his exact words, with what it changed.** Newest
first. His words are quoted exactly, typos included, because a paraphrase is already an
interpretation. Rulings about his brand and job search live in `MiShevelAda/Alex_personal_brand`.

---

## 2026-10-10

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
