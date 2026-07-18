---
type: note
status: active
tags: [architecture, overview]
project: octagons
---

# octagons — dev source of truth

Docs for developers and agents. `index.html` is the verification surface.
Contract-first: change the doc here **before** the code, then code.

## The load-bearing geometry

A regular octagon **cannot tile the plane**. Interior angle 135°, and 360/135 is not an
integer. Stronger: no strictly convex polygon with 7+ sides tiles at all — Reinhardt 1918
(priority), Niven 1978 (the clean checkable proof). This is unconditional.

Three consequences that shaped the library:

- **Non-convex octagon monotiles exist but cannot look like octagons.** The interior
  angles must sum to 1080°, which forces a reflex vertex; the remaining seven then
  average under 128.6°. The "road sign" read is exactly what the theorem forbids.
- **Voronoi is the wrong tool.** Planar Voronoi cells average *exactly* 6 sides at every
  jitter strength, forced by Euler. Never 8.
- **So: octagon + filler is the only route** that keeps the shape recognisable.

The `lattice` mode therefore uses the **truncated square tiling (4.8.8)**: a square
lattice of pitch `P` with each corner cut by `a`.

| `a` | result |
|---|---|
| 0 | plain square grid, no gaps |
| `(2 − √2)/2` ≈ 0.292893 | **exactly regular octagons**, 4.8.8 |
| 0.5 | 45°-rotated checkerboard |

Two facts worth knowing, both verified numerically:

- The family is **equiangular for every `a`** — all eight angles are 135° throughout,
  not only at the regular value. Only the side lengths vary.
- The gaps are **always** 45°-rotated squares, side `a√2`, area `2a²`. Octagon area is
  `1 − 2a²`, so the two sum to exactly 1: the tiling is exact.

## Why line art changes everything

Nothing is filled. The colour gradient runs *along* the edges. That single decision:

- removes the "bathroom tile" read — the square gap stops being a hole and becomes a node;
- **makes exact tiling optional** — invisible gaps mean shapes need not meet perfectly,
  which is what allows the node octagons and the bonding below;
- makes 3D modes cheap, but note line art has **no hidden-surface removal** (see AGENTS.md).

### Node octagons
A small octagon of radius `a`, rotated 22.5° so its vertices sit on the axes, lands
**exactly** on the endpoints of the four neighbouring flat edges. Not a fudge — the same
points. Set `nodes: 'octagon'` to drop the diamond entirely: a lattice with no squares.

### Bonding
`bond` is the probability of *omitting* a shared flat edge, fusing two octagons into one
outline. Useful range is **0.15–0.20**; by 0.4 the structure disintegrates. Edges are
selected by a deterministic hash of the cell coordinates so bonds never flicker.

This is the only "chaos" available: octagon centres are locked by the tiling, so unlike
a triangle mesh you cannot jitter positions.

## Modes

| Mode | What |
|---|---|
| `field` | Regular octagons at varying depth drifting toward the viewer. Billboards, so they stay regular at any distance. Overlapping, varying scale, optional nesting rings and parallax. |
| `lattice` | The 4.8.8 lattice, with node style and bonding. |

## Layout

| Path | Role |
|---|---|
| `octagons.js` | The source. The only file you edit. |
| `octagons.min.js` | **Generated** by `npm run build`, and **gitignored** — it exists only locally and at publish time. |
| `index.html` | Three sections; live controls drive the hero instance. |

## Determinism and time

Two properties exist for offline rendering, and both are load-bearing enough to state
here rather than only in the user README:

- **`seed`** routes the field's scatter through mulberry32 instead of `Math.random`.
  Without it the field is intentionally different on every load. Note the randomness was
  never only at start-up: octagons re-scatter when they pass the camera, so an unseeded
  run diverges *mid-animation*, not just at frame 0.
- **`step(dt)`** advances one frame off the rAF clock. `frame(dt)` is split out of
  `tick()` for exactly this.

`step(dt)` and not `render(absoluteTime)`: field motion is integrated (`o.z -= dt * …`)
and respawn re-randomises x/y, so there is no closed form to seek to. Making it seekable
means deriving respawn position from a hash of the wrap count — do that only if parallel
or out-of-order rendering is actually needed.

The lattice mode was already deterministic: bonds come from `hash(i, j, d)`, never from
`Math.random`.

## Commands

| Command | What |
|---|---|
| `npm run lint` | ESLint (also runs in the pre-commit gate) |
| `npm run build` | Minify → `octagons.min.js` |
| `npm run size` | gzip size of the minified output |

Serve locally and **look at it** — this is a visual library and lint proves nothing:
`python -m http.server 5173` then open `index.html`.

## See also
- [TODO.md](TODO.md) — backlog
- [decisions/](decisions/) — ADRs
- `../.agents/REGISTRY.md` — why the environment is set up as it is
