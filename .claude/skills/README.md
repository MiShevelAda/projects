# .claude/skills/

Skills every session in this repo can use. The skill check in `CLAUDE.md` looks here first.

## Vendored

| Skill | From | Why it is here |
|---|---|---|
| `karpathy-guidelines` | `multica-ai/andrej-karpathy-skills`, commit `2c60614` (2026-04-20), MIT by its README's own "License: MIT" line (the repo has no LICENSE file), copied verbatim on 2026-10-10 at Alex's request | Four coding habits that fit this repo's history: state assumptions, minimum code, surgical changes, a test that proves the goal. Text only: no scripts, no hooks |
| `prototype` | `mattpocock/skills` v1.3.1, commit `49dd158` (2026-10-09), MIT, licence kept as `LICENSE.mattpocock`, copied verbatim on 2026-10-10 at Alex's request | Shows him two or three structurally different versions of a screen to pick from, so a design choice is his, made on his phone, not a session's guess. Text only: no scripts, no hooks |

**These are ours now.** Nothing updates them; re-copy upstream to update, never edit in place.

**Where a skill says to ask first,** this repo's `CLAUDE.md` wins: Alex is not a coder and a question
costs him more than a reversible call does, so state the assumption, carry on with clear low-risk
work, and ask only what he alone can answer. The same goes for the Superpowers plugin's
brainstorming step.

**How a prototype reaches him here.** The skill keeps prototypes out of `main`, and in this repo that
matters twice: a push to `main` publishes the live app. So the variants go on a private page he opens
on his phone (an Artifact, as the mockups did), never into the live app, and only the version he
picks is built into it, properly and with tests.
