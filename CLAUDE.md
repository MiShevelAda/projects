# CLAUDE.md: projects

Alex's personal projects: anything of his that is neither his brand nor his job search. Those two
live in `MiShevelAda/Alex_personal_brand`, and nothing moves between the repos. **One folder per
project**, each with its own README saying what it is and how to run it.

## This repo is public

GitHub Pages is free only for public repos, and the apps here are served from Pages, so everything
committed is readable by anyone, for good. Commit code, docs and generic assets. Personal material
stays on his devices: videos and photos of him, body measurements, health data, names, anything
from the brand repo. Each project's `.gitignore` carries its own list; check it covers a new file
type before that file type first appears.

## Alex is not a coder

His words, 2026-08-07: *"I need to know what you need me to do and you need to guide me through
it... explain it to me like I'm eight years old, because I'm not a coder."* Say who does what in
every reply. A step only he can do (a login, a decision, something only his eyes confirm) comes as
numbered clicks, with what he should see when it worked and how long it takes.

## His decisions

`DECISIONS.md` holds every ruling he makes about these projects, newest first, in his exact words,
with what it changed. Record one the moment he chooses, corrects or overrules, in the same commit
as the work. Write what he said, never what you infer he meant.

## Publishing

A push to `main` publishes. **An app is a top-level folder with an `index.html`**, and
`.github/workflows/pages.yml` serves it at `https://mishevelada.github.io/projects/<folder>/`, on a
front page built from each app's `<title>` and `<meta name="description">`. A new app needs no
publishing change; give it both tags, relative links only, and an `npm test` if it has logic. Any
failing test stops the deploy for every app, and the last good site stays live.

## Projects

| Folder | What it is |
|---|---|
| `bike-fit-coach/` | Phone web app: checks his bike position through the camera, with spoken guidance. Live at https://mishevelada.github.io/projects/bike-fit-coach/ |
| `bike-fitting/` | AI Bike Fit, the video analysis tool (Python), **vendored** from guzlz/ai-bike-fit, AGPL-3.0. Update by re-copying upstream; edit nothing in place. Its own `CLAUDE.md` and `/bikefit` skill (pet names, roasting) are upstream's and apply inside that folder only |
