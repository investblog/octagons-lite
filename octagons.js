/**
 * Octagons — animated backgrounds built from regular octagons.
 * Zero dependencies. Line art: the colour gradient runs along the edges.
 *
 * var og = Octagons.init('.bg', { mode: 'field', colors: [...] });
 * og.stop(); og.start(); og.destroy();
 *
 * Modes:
 *   field   — regular octagons at varying depth, drifting toward the viewer
 *   lattice — the 4.8.8 truncated-square lattice, with optional bonding
 *
 * Geometry note: a regular octagon cannot tile the plane (Reinhardt 1918,
 * Niven 1978). The lattice mode uses the truncated-square tiling, where the
 * corner cut a = (2 - sqrt2) / 2 makes the octagon exactly regular and leaves
 * a 45-degree square at each lattice node. Because nothing is filled, those
 * nodes are drawn as outlines and may also be replaced by small octagons.
 */
(function () {
	'use strict';

	var A_REG = (2 - Math.SQRT2) / 2;          // 0.29289… exact regular octagon
	var TAU8 = Math.PI / 4;

	// vertices at 22.5 + k*45 (flat top, like a road sign)
	var OCT = [];
	// vertices at k*45 (points on the axes) — used for lattice nodes, where a
	// vertex must land exactly on the end of a neighbour's flat edge
	var OCTA = [];
	for (var k = 0; k < 8; k++) {
		OCT.push([Math.cos(Math.PI / 8 + k * TAU8), Math.sin(Math.PI / 8 + k * TAU8)]);
		OCTA.push([Math.cos(k * TAU8), Math.sin(k * TAU8)]);
	}

	function parseColor(str) {
		str = String(str).trim();
		if (str.charAt(0) === '#') {
			var h = str.slice(1);
			if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
			var n = parseInt(h, 16);
			return [n >> 16 & 255, n >> 8 & 255, n & 255];
		}
		var m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
		return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
	}
	function rgba(c, a) {
		return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
	}
	// stable per-edge value; must not change between frames or bonds would flicker
	function hash(i, j, d) {
		var n = Math.sin(i * 127.1 + j * 311.7 + d * 74.7) * 43758.5453;
		return n - Math.floor(n);
	}

	// mulberry32 — small, fast, good enough for scatter. Used only when `seed` is
	// given; without it the field is deliberately different on every load.
	function makeRng(seed) {
		if (seed == null) return Math.random;
		var a = seed >>> 0;
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var x = Math.imul(a ^ (a >>> 15), 1 | a);
			x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}

	function init(el, opts) {
		opts = opts || {};
		el = typeof el === 'string' ? document.querySelector(el) : el;
		if (!el) return null;

		var canvas = document.createElement('canvas');
		canvas.style.cssText = 'display:block;width:100%;height:100%';
		el.innerHTML = '';
		el.appendChild(canvas);
		var ctx = canvas.getContext('2d');

		var mode = opts.mode === 'lattice' ? 'lattice' : 'field';
		var colors = (opts.colors || ['#33417c', '#6478da', '#b3bfff']).map(parseColor);
		var accent = parseColor(opts.accent || '#e0b070');
		var hot = parseColor(opts.hot || '#e4e9ff');
		var bg = opts.background === null ? null : parseColor(opts.background || '#05070d');
		var halo = opts.halo === null ? null : parseColor(opts.halo || '#0c1330');

		var size = opts.size || 110;               // px: lattice pitch / field base
		var count = opts.count || 90;              // field only
		var speed = opts.speed == null ? 1 : opts.speed;
		var weight = opts.weight == null ? 1 : opts.weight;
		var glow = opts.glow !== false;
		var sweep = opts.sweep == null ? 1 : opts.sweep;    // lattice only
		var bond = opts.bond == null ? 0.18 : opts.bond;    // lattice only
		var nodes = opts.nodes || 'diamond';                // diamond | octagon | both
		var nodeSize = opts.nodeSize == null ? 1 : opts.nodeSize;
		var nesting = opts.nesting !== false;               // field only
		var parallax = opts.parallax !== false;             // field only
		var vignette = opts.vignette == null ? 0.45 : opts.vignette;
		// `seed` makes the field reproducible: same seed + same dt sequence => same
		// frames. Required for offline rendering, where a re-render must match.
		var seed = opts.seed == null ? null : opts.seed;
		var rnd = makeRng(seed);

		// cap DPR: a decorative background at native retina density costs real
		// framerate on mobile for a difference almost nobody sees
		var dpr = Math.min(opts.maxDpr || 2, window.devicePixelRatio || 1);

		var W = 0, H = 0, raf = null, t = 0, lastT = 0, running = false;
		var edges = [], pitch = 0, field = [];
		var pmx = 0, pmy = 0, tmx = 0, tmy = 0;

		var Z_FAR = 9.2, Z_NEAR = 0.3, FOC = 1.35;

		// ── geometry ────────────────────────────────────────

		function seedField() {
			field = [];
			rnd = makeRng(seed);   // restart the stream so re-seeding is reproducible
			var G = Math.ceil(Math.sqrt(count));
			for (var i = 0; i < count; i++) {
				var gx = i % G, gy = (i / G) | 0;
				// xy stratified on a grid, z on an independent low-discrepancy
				// sequence: deriving both from i lines the tiles up into one
				// visibly moving sheet instead of a cloud
				field.push({
					x: ((gx + rnd()) / G - 0.5) * 2.9,
					y: ((gy + rnd()) / G - 0.5) * 2.9,
					z: ((i * 0.6180339887498949) % 1) * (Z_FAR - Z_NEAR) + Z_NEAR + rnd() * 0.25,
					rot: rnd() * Math.PI * 2,
					spin: (rnd() - 0.5) * 0.13,
					acc: rnd() < 0.07,
					nest: rnd() < 0.3,
					par: 0.5 + rnd() * 0.9
				});
			}
		}

		function buildLattice() {
			edges = [];
			// guard: a zero dimension makes pitch 0 and the loop bounds infinite
			if (!(W > 0) || !(H > 0)) return;
			pitch = size * dpr;
			if (!(pitch > 0.5)) return;
			var a = A_REG * pitch, rs = a * nodeSize;
			var nC = Math.min(400, Math.ceil(W / pitch) + 3);
			var nR = Math.min(400, Math.ceil(H / pitch) + 3);
			var ox = (W - (nC - 1) * pitch) / 2, oy = (H - (nR - 1) * pitch) / 2;

			for (var j = -1; j < nR; j++) for (var i = -1; i < nC; i++) {
				var X = ox + i * pitch, Y = oy + j * pitch, p = pitch;
				// each cell owns two flats; the other two come from its neighbours,
				// so every shared edge is emitted exactly once (no double-stroking)
				// dropping a shared flat fuses two octagons into a single outline
				if (hash(i, j, 1) >= bond) push(X + a, Y, X + p - a, Y);
				if (hash(i, j, 2) >= bond) push(X, Y + a, X, Y + p - a);
				if (nodes !== 'octagon') {
					push(X + p - a, Y, X + p, Y + a);
					push(X + p, Y + p - a, X + p - a, Y + p);
					push(X + a, Y + p, X, Y + p - a);
					push(X, Y + a, X + a, Y);
				}
			}
			if (nodes !== 'diamond') {
				// a node octagon of radius a, vertices on the axes, meets the ends
				// of all four neighbouring flats exactly
				for (j = -1; j <= nR; j++) for (i = -1; i <= nC; i++) {
					var cx = ox + i * pitch, cy = oy + j * pitch;
					for (var q = 0; q < 8; q++) {
						var q2 = (q + 1) % 8;
						push(cx + OCTA[q][0] * rs, cy + OCTA[q][1] * rs,
							cx + OCTA[q2][0] * rs, cy + OCTA[q2][1] * rs);
					}
				}
			}
			function push(x1, y1, x2, y2) {
				edges.push({ x1: x1, y1: y1, x2: x2, y2: y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 });
			}
		}

		// ── painting ────────────────────────────────────────

		// Gradients depend only on size and colour, so building one per frame is
		// pure waste — three instances rebuilding six gradients each frame was
		// enough to visibly starve the page. Cached, invalidated on resize/set().
		var gLine = null, gBack = null, gVig = null;
		function dropCaches() { gLine = gBack = gVig = null; }

		function gradient() {
			if (gLine) return gLine;
			var g = ctx.createLinearGradient(0, 0, W, H);
			for (var i = 0; i < colors.length; i++) {
				g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), rgba(colors[i], 1));
			}
			return (gLine = g);
		}
		function octPath(cx, cy, r, rot, verts) {
			var co = Math.cos(rot || 0), si = Math.sin(rot || 0);
			ctx.beginPath();
			for (var i = 0; i < 8; i++) {
				var vx = verts[i][0] * r, vy = verts[i][1] * r;
				var px = cx + vx * co - vy * si, py = cy + vx * si + vy * co;
				i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
			}
			ctx.closePath();
		}
		function paintBackground() {
			if (!bg) { ctx.clearRect(0, 0, W, H); return; }
			if (!halo) { ctx.fillStyle = rgba(bg, 1); ctx.fillRect(0, 0, W, H); return; }
			if (!gBack) {
				gBack = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
				gBack.addColorStop(0, rgba(halo, 1)); gBack.addColorStop(1, rgba(bg, 1));
			}
			// the halo gradient is opaque edge-to-edge, so it doubles as the clear
			ctx.fillStyle = gBack; ctx.fillRect(0, 0, W, H);
		}
		function paintVignette() {
			if (!vignette) return;
			if (!gVig) {
				gVig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3,
					W / 2, H / 2, Math.max(W, H) * 0.75);
				gVig.addColorStop(0, 'rgba(0,0,0,0)');
				gVig.addColorStop(1, 'rgba(0,0,0,' + vignette + ')');
			}
			ctx.fillStyle = gVig; ctx.fillRect(0, 0, W, H);
		}

		function drawLattice() {
			paintBackground();
			ctx.lineCap = 'round'; ctx.lineJoin = 'round';
			ctx.beginPath();
			for (var i = 0; i < edges.length; i++) {
				ctx.moveTo(edges[i].x1, edges[i].y1); ctx.lineTo(edges[i].x2, edges[i].y2);
			}
			ctx.strokeStyle = gradient(); ctx.globalAlpha = 0.55;
			ctx.lineWidth = 0.9 * weight * dpr; ctx.stroke();
			ctx.globalAlpha = 1;

			if (sweep) {
				// bucket edges by brightness: ~10 stroke() calls rather than one per
				// edge. shadowBlur would look the same and cost roughly 3x the frame.
				var NB = 5, buckets = [], b;
				for (b = 0; b < NB; b++) buckets.push(null);
				// `speed` is the global rate knob, so it must gate the lattice too —
				// speed:0 has to freeze every mode, not just field
				var ph = (t * 0.19 * sweep * speed) % 1.6 - 0.3;
				for (i = 0; i < edges.length; i++) {
					var e = edges[i];
					var q = ((e.mx / W + e.my / H) / 2 - ph) / 0.16;
					var s = Math.exp(-q * q);
					if (s < 0.06) continue;
					b = Math.min(NB - 1, (s * NB) | 0);
					if (!buckets[b]) buckets[b] = [];
					buckets[b].push(e);
				}
				for (b = 0; b < NB; b++) {
					var list = buckets[b]; if (!list) continue;
					var sv = (b + 0.5) / NB;
					ctx.beginPath();
					for (var m = 0; m < list.length; m++) {
						ctx.moveTo(list[m].x1, list[m].y1); ctx.lineTo(list[m].x2, list[m].y2);
					}
					ctx.strokeStyle = rgba(hot, 1);
					if (glow) {
						ctx.globalAlpha = sv * 0.14;
						ctx.lineWidth = (1.2 + sv * 2.2) * 3 * weight * dpr; ctx.stroke();
					}
					ctx.globalAlpha = sv * 0.75;
					ctx.lineWidth = (0.9 + sv * 1.4) * weight * dpr; ctx.stroke();
				}
				ctx.globalAlpha = 1;
			}
			paintVignette();
		}

		function drawField(dt) {
			paintBackground();
			var base = Math.min(W, H), i, o;
			pmx += (tmx - pmx) * Math.min(1, dt * 3.2);
			pmy += (tmy - pmy) * Math.min(1, dt * 3.2);

			for (i = 0; i < field.length; i++) {
				o = field[i];
				o.z -= dt * 0.55 * speed; o.rot += o.spin * dt * speed;
				if (o.z < Z_NEAR) {
					o.z += Z_FAR - Z_NEAR;
					o.x = (rnd() - 0.5) * 2.9; o.y = (rnd() - 0.5) * 2.9;
					o.acc = rnd() < 0.07; o.nest = rnd() < 0.3;
				}
			}
			field.sort(function (a, b) { return b.z - a.z; });

			var g = gradient();
			ctx.lineJoin = 'round';
			for (i = 0; i < field.length; i++) {
				o = field[i];
				var sc = FOC / (FOC + o.z);
				var px = W / 2 + (o.x * base * 1.45 + (parallax ? pmx * o.par * sc * 90 * dpr : 0)) * sc;
				var py = H / 2 + (o.y * base * 1.45 + (parallax ? pmy * o.par * sc * 90 * dpr : 0)) * sc;
				var r = base * 0.3 * sc * (size / 110);
				if (r < 1.1) continue;
				if (px < -r * 1.6 || px > W + r * 1.6 || py < -r * 1.6 || py > H + r * 1.6) continue;

				var u = Math.max(0, Math.min(1, 1 - (o.z - Z_NEAR) / (Z_FAR - Z_NEAR)));
				var fade = Math.min(1, (Z_FAR - o.z) / 1.6) * Math.min(1, (o.z - Z_NEAR) / 1);
				if (fade <= 0.01) continue;
				var col = o.acc ? rgba(accent, 1) : g;
				var lw = (0.7 + u * 2.3) * weight * dpr;

				if (glow && u > 0.35) {
					octPath(px, py, r, o.rot, OCT);
					ctx.strokeStyle = col; ctx.globalAlpha = (u - 0.35) * 0.22 * fade;
					ctx.lineWidth = lw * 4.5; ctx.stroke();
				}
				octPath(px, py, r, o.rot, OCT);
				ctx.strokeStyle = col; ctx.globalAlpha = (0.1 + u * 0.72) * fade;
				ctx.lineWidth = lw; ctx.stroke();

				if (nesting && o.nest && u > 0.15) {
					octPath(px, py, r * 0.63, o.rot, OCT);
					ctx.globalAlpha = (0.05 + u * 0.34) * fade;
					ctx.lineWidth = lw * 0.62; ctx.stroke();
				}
			}
			ctx.globalAlpha = 1;
			paintVignette();
		}

		// ── loop / lifecycle ────────────────────────────────

		function resize() {
			var w = el.offsetWidth, h = el.offsetHeight;
			if (!w || !h) return;
			W = canvas.width = Math.round(w * dpr);
			H = canvas.height = Math.round(h * dpr);
			dropCaches();
			if (mode === 'lattice') buildLattice();
		}

		// One frame, advanced by exactly dt. Split out of tick() so a renderer can
		// drive it on its own clock instead of requestAnimationFrame.
		function frame(dt) {
			t += dt;
			if (mode === 'lattice') drawLattice(); else drawField(dt);
		}

		function tick(now) {
			frame(Math.min(0.05, (now - lastT) / 1000));
			lastT = now;
			raf = requestAnimationFrame(tick);
		}
		// `wanted` is the author's intent (start/stop); `onScreen` and page
		// visibility gate it. A page with several instances must only ever animate
		// the one being looked at — three full-screen canvases running at once was
		// enough to starve the main thread outright.
		var wanted = false, onScreen = true;
		function sync() {
			var should = wanted && onScreen && !document.hidden;
			if (should === running) return;
			running = should;
			if (should) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
			else if (raf) { cancelAnimationFrame(raf); raf = null; }
		}
		function start() { wanted = true; sync(); }
		function stop() { wanted = false; sync(); }

		function onMove(e) {
			if (!parallax) return;
			var b = canvas.getBoundingClientRect();
			tmx = (e.clientX - b.left) / b.width * 2 - 1;
			tmy = (e.clientY - b.top) / b.height * 2 - 1;
		}
		function onLeave() { tmx = 0; tmy = 0; }
		function onVisibility() { sync(); }

		var ro = null, io = null, timer = null;
		function onResize() { clearTimeout(timer); timer = setTimeout(resize, 120); }
		if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(el); }
		else window.addEventListener('resize', onResize);
		if (window.IntersectionObserver) {
			// No rootMargin. A pre-warm margin looks harmless but on the common
			// layout — full-height sections stacked edge to edge — the next section
			// is always inside it, so two instances animate at once and the saving
			// is lost. Measured: the off-screen neighbour kept running.
			io = new IntersectionObserver(function (entries) {
				onScreen = entries[entries.length - 1].isIntersecting;
				sync();
			}, { rootMargin: '0px' });
			io.observe(el);
		}
		document.addEventListener('visibilitychange', onVisibility);
		canvas.addEventListener('mousemove', onMove);
		canvas.addEventListener('mouseleave', onLeave);

		seedField();
		resize();
		if (opts.autoplay !== false) start();

		return {
			canvas: canvas,
			start: start,
			stop: stop,
			// Advance by exactly dt and draw one frame, off the rAF clock. With a
			// `seed` set this is fully reproducible, which is what offline rendering
			// needs: stop(), then step(1/fps) per output frame.
			//
			// Deliberately step(dt), not render(absoluteTime): field motion is
			// integrated (z decreases per frame and respawns re-randomise x/y), so
			// there is no closed form to seek to. Frames must be produced in order.
			step: function (dt) { frame(dt == null ? 1 / 60 : dt); },
			resize: resize,
			set: function (o) {
				for (var key in o) {
					if (!o.hasOwnProperty(key)) continue;
					var v = o[key];
					switch (key) {
						case 'mode': mode = v === 'lattice' ? 'lattice' : 'field'; break;
						case 'colors': colors = v.map(parseColor); break;
						case 'accent': accent = parseColor(v); break;
						case 'hot': hot = parseColor(v); break;
						// background/halo were missing here, so a theme switch never
						// reached the canvas and it kept painting the old palette
						case 'background': bg = v === null ? null : parseColor(v); break;
						case 'halo': halo = v === null ? null : parseColor(v); break;
						case 'size': size = v; break;
						case 'count': count = v; seedField(); break;
						case 'speed': speed = v; break;
						case 'weight': weight = v; break;
						case 'glow': glow = v; break;
						case 'sweep': sweep = v; break;
						case 'bond': bond = v; break;
						case 'nodes': nodes = v; break;
						case 'nodeSize': nodeSize = v; break;
						case 'nesting': nesting = v; break;
						case 'parallax': parallax = v; break;
						case 'vignette': vignette = v; break;
					}
				}
				dropCaches();
				if (mode === 'lattice') buildLattice();
			},
			destroy: function () {
				stop();
				if (io) io.disconnect();
				if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
				document.removeEventListener('visibilitychange', onVisibility);
				canvas.removeEventListener('mousemove', onMove);
				canvas.removeEventListener('mouseleave', onLeave);
				clearTimeout(timer);
				if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
			}
		};
	}

	/**
	 * Static tiling pattern as a CSS background — no canvas, no animation loop.
	 * The 4.8.8 lattice is periodic, so exactly one cell is a seamless tile.
	 * Returns `url("data:image/svg+xml,…")`, ready for `background-image`.
	 *
	 * document.querySelector('pre').style.backgroundImage =
	 *   Octagons.pattern({ size: 22, opacity: 0.09 });
	 */
	function pattern(opts) {
		opts = opts || {};
		var P = opts.size || 24;
		var a = A_REG * P;
		var color = opts.color || '#8fa2ff';
		var op = opts.opacity == null ? 0.12 : opts.opacity;
		var w = opts.weight == null ? 1 : opts.weight;
		var nodes = opts.nodes || 'diamond';
		var back = opts.background || null;

		var d = [];
		function n(v) { return Math.round(v * 1000) / 1000; }
		function seg(x1, y1, x2, y2) {
			d.push('M' + n(x1) + ' ' + n(y1) + 'L' + n(x2) + ' ' + n(y2));
		}

		// Flats sit exactly on the tile edge, so a stroke there is half-clipped.
		// Drawing each on BOTH opposite edges lets the neighbouring tile supply the
		// missing half — otherwise every seam renders at half thickness.
		seg(a, 0, P - a, 0); seg(a, P, P - a, P);
		seg(0, a, 0, P - a); seg(P, a, P, P - a);

		if (nodes !== 'octagon') {           // corner cuts -> the square node
			seg(P - a, 0, P, a);
			seg(P, P - a, P - a, P);
			seg(a, P, 0, P - a);
			seg(0, a, a, 0);
		}
		if (nodes !== 'diamond') {           // small octagon at each lattice node
			var corners = [[0, 0], [P, 0], [0, P], [P, P]];
			for (var c = 0; c < 4; c++) {
				var cx = corners[c][0], cy = corners[c][1];
				for (var k = 0; k < 8; k++) {
					var k2 = (k + 1) % 8;
					seg(cx + OCTA[k][0] * a, cy + OCTA[k][1] * a,
						cx + OCTA[k2][0] * a, cy + OCTA[k2][1] * a);
				}
			}
		}

		var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + P + '" height="' + P +
			'" viewBox="0 0 ' + P + ' ' + P + '">' +
			(back ? '<rect width="' + P + '" height="' + P + '" fill="' + back + '"/>' : '') +
			'<path d="' + d.join('') + '" fill="none" stroke="' + color +
			'" stroke-width="' + w + '" stroke-opacity="' + op +
			// butt caps, NOT round: every edge is its own subpath, so a round cap
			// lands on all eight vertices and blunts them. At a small pitch that
			// turns the octagon into a circle outright.
			'"/></svg>';

		if (opts.raw) return svg;
		return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
	}

	window.Octagons = { init: init, pattern: pattern };
})();
