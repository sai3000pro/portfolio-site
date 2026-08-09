# Photo Wall (`/hobbies`)

**Status: shipped.** This was a design plan; it is now a reference for the code in
`src/components/portfolio/hobby-belts.tsx` — why it is built the way it is, and which knobs you
can turn. Constants are named; the file is the source of truth for their values.

The page is **branded "Photography"** while the route and every identifier stay `hobbies`.
That split is deliberate — renaming the route would break the URL, the sitemap entry, the
prerendered path and an achievement key for a cosmetic change. The rationale is at the top of
`src/routes/hobbies.tsx`.

## What it is

A full-viewport scene. Photos fly in along a spiral, hold, then settle into horizontal rows
that become infinite conveyor belts scrolling in alternating directions. Clicking a tile opens
a lightbox. Same starfield, accent and type as the landing page — a different place, not a
sixth section.

Narrow viewports and `prefers-reduced-motion` get `StaticGallery` instead: a responsive grid of
the same photos. It is not a degraded fallback — the choreography genuinely cannot work at
phone widths (see "Why the width bail").

## The one architectural decision everything rests on

The obvious implementation — absolutely position tiles on the spiral, then move them into belt
track elements — fails in React. React cannot move a DOM node between parents; a key that
changes parent unmounts and remounts, destroying element identity and any in-flight transform.
The usual workaround (FLIP + imperative `appendChild`) also costs N synchronous reflows in one
frame and gets torn back by the next re-render.

**So there are no track elements.** Every tile is an absolutely-positioned child of one tile
layer for all three phases, with `x`/`y` motion values written by a single RAF loop — the same
idiom as `constellation.tsx` (`motionValue()` pairs written from one loop, consumed via
`style={{ x, y }}`, React never re-renders at 60fps).

The belt is a **formula, not a container**:

```ts
// pitch = tileW + GAP;  period = perRow * pitch
// INVARIANT: period >= W + tileW
const raw = slot * pitch + row.dir * row.offset;
const target = wrap(-tileW, period - tileW, raw); // framer-motion's wrap()
```

Mapped into `[-tileW, period - tileW)`, a tile leaving the left edge at `x = -tileW` reappears
at `period - tileW`, which is `>= W` — always offscreen at the instant it teleports. Violating
that invariant is what makes a marquee visibly "snap", so the tile count per row is derived
from it (with headroom, so small resizes don't churn the count).

**The handoff is then free, because the settle's target _is_ the belt formula:**

```ts
const k = settleEase(u); // cubicBezier(0.2, 0.7, 0.3, 1), the site's signature curve
v.x.set(from + (target - from) * k);
```

At `u = 1`, `k = 1`, so `x === beltX(...)` exactly. It doesn't approach the conveyor — it _is_
the conveyor. No measurement, no reparent, no state transition, nothing to reconcile.

Two details that make it hold:

- **Wrap-continuity guard.** If the belt wraps mid-blend, a naive lerp tears across the whole
  period. The loop tracks the previous target; when `|target - prev| > period / 2` it shifts
  the source by the same delta.
- **Velocity continuity** is a separate problem from position continuity, and is what the eased
  per-row `speedScale` (0 → 1, at `SPEED_EASE`) provides — tiles merge onto a moving belt
  instead of snapping onto one.

Position is a pure function of `(layout, t)`; the loop never branches on a stored phase. That
removes a whole class of state-machine desync bugs and makes resize a matter of swapping
constants rather than restarting.

Rows fill **serpentine** — each row lays its tiles out in its own travel direction — so the
settle telegraphs which way that row is about to move.

## Why RAF rather than CSS keyframes for the belts

A duplicated track animated `0 → -50%` would have been position-continuous and would run on the
compositor. It was rejected because it can only start at full speed (a hard velocity
discontinuity exactly at the handoff), `animation-play-state: paused` is a hard stop with no
ease-out, and it cannot support per-row hover pausing or drag-to-scrub. The compositor win is
small here: ~30 transform writes per frame is ≈0.1ms, and framer batches them.

## Layout

`buildLayout(W, viewportH, photoCount)`:

- The stage is the **whole viewport** (`100svh`). The spiral fills it; the belts settle into a
  centred band, so the collapse reads as "spiral → belts", not "spiral → top".
- `rows = W >= THREE_ROW_MIN_WIDTH ? 3 : 2`; below `MOTION_MIN_WIDTH` → static grid.
- The band is a fraction of the viewport height, capped, and `tileH` is derived from it;
  `tileW = round(tileH * 4/3)`.
- `perRow` is the larger of the wrap invariant (with headroom) and `ceil(photos / rows)`.
- The spiral uses the **full width** (`rMax` from `W`), then squashes vertically by whatever it
  takes to fit: `ellipseY = min(ELLIPSE_Y, max(0.18, (H/2 - tileH*0.5) / rMax))`. Deriving the
  squash instead of fixing it is what stops the spiral collapsing into a small blob in the
  middle of a wide viewport.

**Why the width bail:** at phone widths, three rows of tiles show barely more than one tile
each and `rMax` goes negative. There is no version of this choreography that works there.
Precedent: `constellation.tsx` bails its entire physics loop below the same threshold, and
compares the same quantity (container `clientWidth`, not `window.innerWidth`).

The branch is decided in a layout effect after mount, so `StaticGallery` is what the server
prerenders _and_ what the first client render produces — hydration always agrees, and
`dist/public/hobbies/index.html` ships real `<img alt>` markup for crawlers instead of an empty
stage awaiting measurement.

## Interaction

- **Pause/play button**, bottom-right. WCAG 2.2.2 requires a mechanism to pause motion running
  longer than 5s. It sits in the empty area below the belt band so it never overlaps a tile.
- **Keyboard focus anywhere in the wall pauses every belt** (`onFocusCapture` on the tile
  layer), so tabbing freezes the wall and focus never chases a moving target.
- **Hover pauses only the row under the cursor.** The hovered row is written to a ref by
  pointer move and read by the RAF loop, so moving the mouse never re-renders the tile grid.
- **The open lightbox pauses everything.**
- **Drag-to-scrub.** Dragging horizontally over a row scrubs that row and a release imparts
  fling momentum, decaying back into the ordinary belt speed (`DRAG_DECAY`, clamped by
  `DRAG_MAX_VEL`, with a `DRAG_THRESHOLD` before it counts as a drag). The click that ends a
  scrub is swallowed so it does not also open the lightbox.
- **Any `pointerdown` or `wheel` skips the intro** straight to the conveyor. Skipping also
  brings the "belts are live" gate forward, or drag-to-scrub would stay refused for the rest of
  the intro's nominal duration on a wall that is visibly already running.
- The loop **suspends entirely while the wall is offscreen** (IntersectionObserver) and holds
  its clock across the gap so the phase resumes cleanly.

`touch-action` on the tile layer is `pan-y pinch-zoom`. Naming `pinch-zoom` explicitly matters:
the layer covers a full `100svh` and the stage renders from tablet widths up, so a bare `pan-y`
took page zoom away for a whole screen height (WCAG 1.4.4). It costs the scrub nothing — a
scrub is one pointer, and a second is already refused.

## Accessibility

- Belt tiles are duplicated to satisfy the wrap invariant. **The first occurrence of each photo
  is the "original"** — it is the only one rendered as a real `<button>` with the photo's `alt`
  and an `aria-label`. Clones are plain `<div>`s carrying `aria-hidden` and an empty `alt`: not
  focusable, not in the a11y tree, still mouse-clickable. Duplicate images in the a11y tree and
  duplicate tab stops is _the_ classic marquee bug.
- Tab order follows DOM order and is stable, because belts move by transform only and never
  reorder the DOM.
- The lightbox has a **focus trap and focus restore**. `hooks/use-focus-trap.ts` was extracted
  here first; the experience and project modals have since adopted it too.
- `alt` is a **required** field on `HobbyPhoto`. That is what stops the a11y score rotting as
  real photos are added; `bun run photos` prints the ids still missing one.
- An `aria-live` region announces the wall as ready once the belts are running.
- `/hobbies/` is audited by Lighthouse in CI alongside `/`, so this does not rot silently.

## Performance notes

- `will-change: transform` is applied to tiles **only while the wall is genuinely animating**
  (`!globalPaused && onscreen`). Every hinted tile is a promoted compositor layer — three rows
  of ten at a 1440×900 viewport is roughly 17MB of layers at DPR 2. It cannot simply be
  dropped: framer writes plain 2D translates, so nothing else promotes these tiles, and an
  unpromoted tile whose transform changes every frame invalidates the full-viewport layer it
  paints into. Hoisting the hint to the tile layer instead is strictly worse — one full-viewport
  layer is larger on its own and would not remove the per-tile writes.
- The tile layer's viewport-space top edge is cached and invalidated by scroll/resize/hover
  rather than measured per pointer event; `getBoundingClientRect()` forces a layout, and doing
  it per event while 30 transforms are being written is a synchronous reflow per event.
- Depth cues (`DEPTH_SCALE_STEP`, `DEPTH_BLUR_STEP`) and the per-photo accent tint live on an
  inner shell as constants. The RAF loop owns only the outer transform and opacity.
- The starfield on this route is asked for fewer stars than the landing page, because the belt
  loop shares the main thread.
- The first row's images are eager and high-priority; everything else is lazy. In the static
  grid the same applies to tile 0 only, which is the LCP element for every phone visitor.

## Tuning

Every choreography constant lives in the `TUNING` object at the top of `hobby-belts.tsx`, with
the reasoning for the current values in comments beside them. Expect the spiral constants
(`TURN_STEP`, `SWEEP`, `ELLIPSE_Y`, the staggers) to want several passes by eye — they interact
non-obviously.

Two values were re-tuned once real photographs replaced the placeholder gradients, and the
reasoning generalises:

- **`SPIN`** was slowed. Angular rate is constant but the tangential speed it produces is not —
  at a wide viewport the outer arm was dragging tiles sideways several times faster than the
  belt speed they were about to settle into. A uniform gradient at that rate reads as texture; a
  photograph with a hard horizon reads as a spinning carousel, because the eye now has edges to
  track.
- **`ROW_SPEEDS`** kept its three values and changed their order. Row index is also the depth
  cue — row 0 is front (full size, sharp), the last row is furthest back (smaller, blurrier).
  The old order gave the _back_ row the fastest travel, i.e. inverted parallax. That was
  invisible while every tile was a flat gradient; real photographs make the blur/scale cue
  legible and the far row outrunning the near one then reads as a mistake.

Real photos vary wildly in brightness, and a bright photo against a near-black page carries far
more visual mass. Every tile therefore gets identical treatment regardless of source — border,
radius, bottom vignette, all lifted from `constellation.tsx` — to normalise weight.

## Placeholders

`src/data/hobbies.ts` tops the list up with generated SVG placeholder tiles until there are
`MIN_TILES` photos: the belts need enough tiles to fill a wide viewport twice over or the wrap
seam becomes visible. They are real `<img>` elements rather than styled `<div>`s, so they travel
the same decode/paint path as real photos and timing tuned against them still holds.

They deliberately carry no `location`, `date` or `gear`. The lightbox prints those verbatim as
capture data, and the real photos have none — so seeding placeholders with sample EXIF meant
the only photos on the wall claiming a camera and a place were the ones that never existed.

## Codebase traps this feature ran into

1. **Asset paths.** Paths in `data/*.ts` are bare and document-relative, which only resolves
   from the site root. From `/portfolio-site/hobbies` a bare `assets/x.webp` would 404. All refs
   go through `assetUrl()` in `src/lib/assets.ts`.
2. **Prerender only knew `/`.** `scripts/prerender.mjs` hardcoded a single fetch; it now loops
   `ROUTES` from `scripts/routes.mjs`. Without this, `/portfolio-site/hobbies` fell through to
   `404.html` — a copy of the landing page — so visitors saw the hero flash before the client
   router corrected. (`prerender.mjs` also needed `pathToFileURL`; a bare `C:\` path is not a
   valid ESM specifier, so `build:static` had never run on Windows.)

## Known gaps

- Reduced motion has not been independently exercised in-browser; it shares the verified
  narrow-viewport `StaticGallery` branch.
- Bringing a focused-but-offscreen tile into view is not implemented. Focus pauses the belts,
  which solves the moving-target problem, but a wrapped tile can still be off-screen.
  </content>
