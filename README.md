# octagons-lite

Animated backgrounds built from **regular** octagons. Line art on canvas — the colour
gradient runs along the edges, nothing is ever filled. Zero dependencies, ~3.1 KB gzipped.

Two modes: octagons drifting toward the viewer in depth, or a static lattice.

**[Live demo →](https://investblog.github.io/octagons-lite/)**

```html
<div class="bg"></div>

<script src="octagons-lite.js"></script>
<script>
  OctagonsLite.init('.bg', { mode: 'field' });
</script>
```

The container needs a size of its own — the canvas fills it. A typical hero:

```css
.hero { position: relative; min-height: 100vh; }
.bg   { position: absolute; inset: 0; z-index: 0; }
.hero > .content { position: relative; z-index: 1; }
```

The [live demo](https://investblog.github.io/octagons-lite/) is `index.html` in this
repo — a playground with every option wired to a control, in both themes.

## Modes

### `field` — depth

Regular octagons scattered through depth, drifting toward the camera, overlapping at
different scales. Because each one faces the viewer it stays exactly regular at any
distance; only its scale changes. Some carry a concentric inner ring, a few use the
accent colour, and the field drifts with the pointer.

```js
OctagonsLite.init('.bg', {
  mode: 'field',
  count: 90,
  speed: 1,
  size: 110
});
```

### `lattice` — the 4.8.8 tiling

A square lattice with every corner cut, so each cell becomes a regular octagon and each
lattice node a small square. A soft band of light sweeps across the edges.

```js
OctagonsLite.init('.bg', {
  mode: 'lattice',
  nodes: 'octagon',   // replace the square nodes with small octagons
  bond: 0.18          // randomly fuse neighbouring octagons
});
```

`bond` is the probability of dropping a shared edge, which merges two octagons into one
outline and breaks up the regularity of the grid. Useful range is **0.15–0.2**; past
about 0.4 the lattice falls apart. The selection is deterministic, so bonds never flicker.

## Static pattern — no canvas at all

The lattice is periodic, so a single cell is a seamless tile. For a quiet texture under
code blocks, cards or panels there is no reason to run a canvas: `pattern()` returns a
repeating SVG as a ready-to-use `background-image`.

```js
document.querySelector('pre').style.backgroundImage =
  OctagonsLite.pattern({ size: 22, opacity: 0.09 });
```

Nothing animates and nothing runs afterwards — it is one tile handed to CSS.

| Option | Default | What |
|---|---|---|
| `size` | `24` | Cell pitch in px |
| `color` | `'#8fa2ff'` | Stroke colour |
| `opacity` | `0.12` | Stroke opacity — this is the contrast knob |
| `weight` | `1` | Stroke width |
| `nodes` | `'diamond'` | `'diamond'`, `'octagon'`, or `'both'` |
| `background` | `null` | Optional solid fill behind the lines |
| `raw` | `false` | Return the bare `<svg>` markup instead of a `url(...)` |

**Pick a pitch of 24px or more if the octagon shape matters.** Eight sides across ten
pixels cannot resolve: below roughly 20px the cells read as circles. That is perfectly
good as texture, but the shape — the whole point of the library — is gone. At 24–40px the
octagons and their nodes are clearly legible.

## Options

| Option | Default | Applies to | What |
|---|---|---|---|
| `mode` | `'field'` | — | `'field'` or `'lattice'` |
| `colors` | `['#33417c','#6478da','#b3bfff']` | both | Gradient stops for the edges, corner to corner |
| `accent` | `'#e0b070'` | field | Colour for the occasional highlighted octagon |
| `hot` | `'#e4e9ff'` | lattice | Colour of the sweeping light band |
| `background` | `'#05070d'` | both | Base fill. Pass `null` for a transparent canvas |
| `halo` | `'#0c1330'` | both | Soft central glow. Pass `null` to disable |
| `size` | `110` | both | Lattice pitch in px; scale factor for the field |
| `count` | `90` | field | Number of octagons |
| `speed` | `1` | both | Animation rate; `0` freezes it |
| `weight` | `1` | both | Line thickness multiplier |
| `glow` | `true` | both | Soft halo around bright edges |
| `sweep` | `1` | lattice | Speed of the light band; `0` disables it |
| `bond` | `0.18` | lattice | Probability of fusing neighbours |
| `nodes` | `'diamond'` | lattice | `'diamond'`, `'octagon'`, or `'both'` |
| `nodeSize` | `1` | lattice | Node scale; `1` meets the neighbouring edges exactly |
| `nesting` | `true` | field | Concentric inner rings on some octagons |
| `parallax` | `true` | field | Pointer-driven drift |
| `vignette` | `0.45` | both | Edge darkening; `0` disables it |
| `maxDpr` | `2` | both | Device-pixel-ratio ceiling |
| `autoplay` | `true` | both | Start animating immediately |

## API

`init()` returns `null` if the selector matches nothing, otherwise:

```js
var og = OctagonsLite.init('.bg');

og.set({ mode: 'lattice', bond: 0.25 });  // change options live
og.stop();                                 // pause
og.start();                                // resume
og.resize();                               // force a re-measure
og.destroy();                              // remove canvas, detach listeners
og.canvas;                                 // the <canvas> element
```

## Performance

The library is careful about the things that actually cost frames in a full-screen
canvas background:

- **It sleeps when off screen.** An `IntersectionObserver` pauses the loop when the
  container scrolls out of view, and page-visibility pauses it when the tab is hidden.
  This matters more than it sounds: three full-screen instances animating at once will
  starve the main thread outright.
- **Gradients are built once**, not per frame.
- **Glow avoids `shadowBlur`**, which measured roughly a third of the framerate for the
  same result. A wide dim stroke under a thin bright one gives the same look for free.
- **Device pixel ratio is capped at 2**, since a decorative background at native retina
  density costs real framerate on mobile for a difference almost nobody notices.

## About the geometry

A regular octagon **cannot tile the plane**. Its interior angle is 135°, and 360/135 is
not a whole number. The stronger result: no strictly convex polygon with seven or more
sides tiles the plane at all — proved by Reinhardt in 1918, with a clean modern proof by
Niven in 1978.

So an octagonal pattern has to give something up. The `lattice` mode uses the truncated
square tiling: cut every corner of a square grid by `(2 − √2)/2 ≈ 0.2929` of the pitch and
the cells become exactly regular octagons, leaving a 45°-rotated square at each node. The
octagons cover 82.84% of the plane and the squares the remaining 17.16%.

Drawing outlines instead of filling them is what makes this work visually. Filled, that
leftover square reads as a hole in a tile floor. As an outline it reads as a node — and
because nothing is filled, shapes no longer have to meet perfectly at all. That is what
allows the small node octagons and the random bonding: neither produces an exact tiling,
and neither needs to.

The other routes were checked and rejected. Non-convex octagons that tile alone do exist,
but their angles must sum to 1080° with at least one reflex vertex, so they never read as
octagons. Voronoi cells average exactly six sides at any jitter, never eight.

## Browser support

Any browser with `<canvas>`. `ResizeObserver` and `IntersectionObserver` are used when
available and degrade gracefully without them — the library falls back to `window.resize`
and simply stays awake.

## License

MIT.
