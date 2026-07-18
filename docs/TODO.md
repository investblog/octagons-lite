---
type: note
status: active
tags: [backlog]
project: octagons
---

# Backlog

The single list of open work. Items link to plans in `../.agents/plans/active/` once one
exists; an item is dropped when its plan moves to `plans/done/`.

## Notes

- Credits deliberately differ by surface and that is correct: the README credits 301ST
  and generator.ink (generator.ink is a 301 project), the demo panel credits
  "Made in 301 · for oktagon.bet". Not a discrepancy — leave both.

## Open

- **Trusted Publisher is not configured yet**, so releases still cannot go out over
  OIDC and carry no provenance. Steps in `../RELEASING.md`. Until it is done, the
  `NPM_TOKEN` secret has to stay, which is the thing worth closing.
- **Delete `bootstrap-publish.yml`** once trusted publishing works — it exists only to
  create the package, and stops working anyway if token publishing is disallowed.
- **CDN eligibility.** cdnjs wants roughly 800 npm downloads/month or 200 GitHub stars;
  jsDelivr and unpkg serve from npm with no threshold and already work.

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
