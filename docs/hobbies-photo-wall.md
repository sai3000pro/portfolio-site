# Hobbies Screen — Spiral → Conveyor Photo Wall

A dedicated route at `/hobbies` holding personal photos. Photos fly in along a spiral, hold,
then settle into horizontal rows that become infinite conveyor belts scrolling in alternating
directions. Same starfield, accent, and type as the landing page — a different place, not a
sixth section.

## Locked decisions

- **A real route**, not an overlay or a section. Own URL, own meta, back-button works.
- **Uniform tile boxes** with `object-fit: cover`. Per-photo aspect ratios would make both the
  belt loop math and the spiral's visual weighting fragile. True aspect is kept in the manifest
  for the lightbox only.
- **Placeholders ship in-repo** as SVG data URIs, not binary files. They travel the same
  decode/paint path as real photos, so timing tuned against them still holds later.
- **Click a tile → lightbox.** No category filters, no intro copy block.
- **Below 768px and under `prefers-reduced-motion`: a static grid.** Not a degraded fallback —
  the choreography genuinely cannot work at phone widths (see "Why the width bail" below).

## The one architectural decision everything rests on

The obvious implementation — absolutely position tiles on the spiral, then move them into belt
track elements — fails in React. React cannot move a DOM node between parents; a key that
changes parent unmounts and remounts, destroying element identity and any in-flight transform.
The usual workaround (FLIP + imperative `appendChild`) also costs N synchronous reflows in one
frame and gets torn back by the next re-render.

**So there are no track elements.** Every tile is an absolutely-positioned child of one stage
`<div>` for all three phases, with `x`/`y` motion values written by a single RAF loop — the
`constellation.tsx` idiom (`motionValue()` pairs written from one loop, consumed via
`style={{ x, y }}`, React never re-renders at 60fps).

The belt is a **formula, not a container**:

```ts
// pitch = tileW + GAP;  period = perRow * pitch
// INVARIANT: period >= W + tileW
const raw = slot * pitch + row.dir * row.offset;
const x = wrap(-tileW, period - tileW, raw); // framer-motion's wrap()
```

Mapped into `[-tileW, period - tileW)`, a tile leaving the left edge at `x = -tileW` reappears
at `period - tileW`, which is `>= W` — always offscreen at the instant it teleports. Violating
that invariant is what makes a marquee visibly "snap", so clone count is derived from it.

**The handoff is then free, because the settle's target _is_ the belt formula:**

```ts
const k = settleEase(u); // cubicBezier(0.2, 0.7, 0.3, 1), the site's signature curve
mx[i].set(from + (target - from) * k);
```

At `u = 1`, `k = 1`, so `x === beltX(...)` exactly. It doesn't approach the conveyor — it _is_
the conveyor. No measurement, no reparent, no state transition, nothing to reconcile. Position
continuity is guaranteed by construction rather than by careful measurement.

Two details that make it hold:

- **Wrap-continuity guard.** If the belt wraps mid-blend, a naive lerp tears across the whole
  period. Track the previous target; when `|target - prev| > period / 2`, shift the source by
  the same delta.
- **Velocity continuity** is a separate problem from position continuity, and is what the eased
  `speedScale` (0 → 1) provides — tiles merge onto a moving belt instead of snapping onto one.

Position is a pure function of `(layout, t)`; the loop never branches on a stored phase. That
removes a whole class of state-machine desync bugs and makes resize a matter of swapping
constants rather than restarting.

## Why RAF rather than CSS keyframes for the belts

A duplicated track animated `0 → -50%` would have been position-continuous (it starts at 0), and
it runs on the compositor. It was rejected because it can only start at full speed (a hard
velocity discontinuity exactly at the handoff), `animation-play-state: paused` is a hard stop
with no ease-out, and it cannot scroll a keyboard-focused tile into view. The compositor win is
small here: ~30 transform writes per frame is ≈0.1ms, and framer-motion batches them.

## Layout

- `rows = W >= 1024 ? 3 : 2`; below 768 → static grid.
- `tileH = (H - (rows + 1) * GAP) / rows`, `tileW = round(tileH * 4/3)`.
- `perRow` is the larger of the wrap invariant (with 20% headroom) and `ceil(photos / rows)`.
- The spiral uses the **full width**, then squashes vertically by whatever it takes to fit:
  `ellipseY = min(0.62, (H/2 - tileH*0.7) / rMax)`. Fixing the squash instead of deriving it
  collapses the spiral into a small blob in the middle of a wide viewport — measured at 530px of
  a 1440px stage before this change, ~950px after.

**Why the width bail:** at 390px, three rows of tiles show ~1.4 tiles and `rMax` goes negative.
There is no version of this choreography that works there. Precedent: `constellation.tsx` bails
its entire physics loop below 768.

## Accessibility

- Belt tiles are duplicated to satisfy the wrap invariant. **Clones carry `aria-hidden`,
  `inert`, `tabIndex={-1}` and empty `alt`** — duplicate images in the a11y tree and duplicate
  tab stops is _the_ classic marquee bug. Verified: 24 focusable buttons for 24 photos.
- **Focus pauses every belt** (`onFocusCapture` on the stage), so tabbing freezes the wall and
  focus never chases a moving target. Tab order follows DOM order and is stable because belts
  move by transform only and never reorder the DOM.
- **A visible pause/play toggle** — WCAG 2.2.2 requires a mechanism to pause motion running
  longer than 5s. Hover and the open lightbox pause it too.
- The lightbox adds a **focus trap and focus restore**, which `ExperienceModal` and
  `ProjectModal` both lack. `use-focus-trap.ts` is extracted so they can adopt it later.
- `alt` is a **required** field on `HobbyPhoto` — that is what stops the a11y score rotting as
  real photos are added.
- The static grid is also what the server renders, so `dist/public/hobbies/index.html` ships
  real `<img alt>` markup for crawlers instead of an empty stage awaiting measurement.

## Traps this codebase sets

1. **Asset paths.** Paths in `data/*.ts` are bare and document-relative, which only resolves from
   the site root. From `/portfolio-site/hobbies` a bare `assets/x.png` would 404. All new refs go
   through `assetUrl()` in `src/lib/assets.ts`.
2. **Prerender only knew `/`.** `scripts/prerender.mjs` hardcoded a single fetch; it now loops
   `ROUTES`. Without this, `/portfolio-site/hobbies` falls through to `404.html` — a copy of the
   landing page — so visitors see the hero flash before the client router corrects.
   (`scripts/prerender.mjs` also needed `pathToFileURL`; a bare `C:\` path is not a valid ESM
   specifier, so `build:static` had never run on Windows.)
3. **No mobile nav exists.** `NAV_LINKS` are `hidden md:flex`, so the Footer link is the _only_
   path to `/hobbies` on a phone.
4. **Lighthouse only audits `/`** (`lighthouserc.json`), so `/hobbies` is not CI-gated. Adding
   `http://localhost/hobbies/` is the responsible follow-up — after the animation stabilizes,
   or every tuning pass becomes a CI firefight.

## Tuning

Every constant lives in the `TUNING` object at the top of `hobby-belts.tsx`. Expect the spiral
constants (`TURN_STEP`, `SWEEP`, `ELLIPSE_Y`, staggers) to want several passes by eye — they
interact non-obviously. Belt speed (~26/22/30 px/s) is the other taste call.

Placeholders are uniform gradients; real photos vary wildly in brightness and a bright photo
against `#000005` carries far more visual mass. Every tile therefore gets identical treatment
regardless of source (border, radius, bottom vignette — lifted from `constellation.tsx`) to
normalize weight. **Re-tune once with ~6 real photos in place before adding all 24.**

## Known gaps

- Reduced-motion was not independently exercised in-browser (the automation tool cannot emulate
  the media query); it shares the verified narrow-viewport `StaticGallery` branch.
- Bringing a focused-but-offscreen tile into view is not implemented — focus pauses the belts,
  which solves the moving-target problem, but a wrapped tile can still be off-screen.
- Any `pointerdown` or `wheel` skips the intro. Deliberate, but aggressive.
