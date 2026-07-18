---
type: note
status: active
tags: [backlog]
project: octagons
---

# Backlog

The single list of open work. Items link to plans in `../.agents/plans/active/` once one
exists; an item is dropped when its plan moves to `plans/done/`.

## Next release (0.1.1) — carry these

- `seed` + `step(dt)` are in the tree but **not published**: `octagons@0.1.0` on npm
  predates them. Anyone installing today gets neither, so the offline-rendering section
  of the README describes an API the registry does not yet have. Ship 0.1.1 soon.
- The widened npm keywords likewise only take effect on publish — npm reads them from
  the tarball, not from GitHub.
- Credits to 301ST / generator.ink are in the README; the demo panel still credits
  "Made in 301 · for oktagon.bet". Decide whether those should agree.

## Before an npm release

- **Remove `"private": true` from `package.json`.** It is the deliberate guard against
  an accidental `npm publish`; nothing else blocks the release.
- **Check the name is free on npm.** `octagons` has not been verified as available.
- **Decide the version.** Currently `0.1.0`. Publishing `1.0.0` implies API stability;
  the option surface is young and `set()` semantics may still move.
- **Sponsor attribution, if it ships.** One line and one link to a corporate page, kept
  out of `keywords` and `description` — density is what reads as spam. GitHub applies
  `rel="nofollow"` to README links, so there is no SEO gain from placing it there.
- **CDN eligibility.** cdnjs requires roughly 800 npm downloads/month or 200 GitHub
  stars; jsDelivr and unpkg serve from npm with no threshold.

## Known issues

- **No tests.** `index.html` is manual-only, so the push gate has nothing to run. Open
  question whether that is acceptable at this size.

### Resolved

- **fps measured cleanly: 60.** Both the demo (three instances, one visible) and an
  isolated lattice hold a steady 59–61 fps in a single clean tab.
- **The "lattice hang" did not exist.** It was measurement contamination — several
  leftover tabs each animating a full-screen canvas, one of them wedged. The same build
  reads 60 fps once they are closed. No library fix was needed; see the measurement rule
  in `../AGENTS.md`.

## Ideas, not scheduled

- `field` clumps toward the centre — far octagons converge on the vanishing point.
  Fix by seeding in a cone rather than a box, or pushing outward on respawn.
- Optionally snap octagon rotation to 45° steps for a stricter, more brand-like field.
- Vortex/rings mode existed in the prototypes and looked striking, but reads as a hero
  element rather than a background. Not ported.
