# Photo Gallery (`/gallery`)

**Status: shipped.** Reference for `src/components/portfolio/photo-gallery.tsx` and the
`.photo-grid` / `.photo-tile` block in `src/styles.css` — why they are built this way, and
which knobs you can turn. Constants are named; the code is the source of truth for values.

The page is **branded "Photography"** while the data, the tracking key and half the
identifiers stay `hobby*`. That split is deliberate: renaming them would break persisted
achievement keys and the photo pipeline for a cosmetic gain.

## What it is

A browsable justified photo grid — variable-aspect tiles packed into full-width rows of
uniform height. Each photo rests under a desaturating, accent-tinted filter that lifts to
full colour on hover or keyboard focus. Clicking a tile opens the lightbox.

On load, tiles rise and fade in, staggered in reading order. The entrance is one-shot, lasts
about 1.1 seconds, and is pure CSS — **the gallery itself schedules no `requestAnimationFrame`
and no timers, ever.** (The page as a whole still has one: the decorative starfield canvas,
`hooks/use-starfield.ts`, which is shared chrome on every route and nothing to do with this
component. An earlier version of this doc claimed the page ran no rAF at all; it never did.)

## The one architectural decision everything rests on

**The grid is the DOM truth. The entrance is presentation only.**

Tiles are ordinary flow children of a flex container. They are already sitting in their
justified cells at first paint, on the server and on the client. The entrance is a CSS
animation on each tile that touches nothing but `opacity` and `transform`:

```css
@keyframes photo-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 16px, 0) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.photo-tile {
  animation: photo-rise 520ms cubic-bezier(0.2, 0.7, 0.3, 1) backwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
```

It ends at `transform: none` — the tile is not _approaching_ its cell, it has no transform at
all. **The destination needs no formula because it is the absence of one.** Nothing in JS
knows or stores where a tile belongs, so nothing can disagree with flexbox about it.

Consequences worth naming:

- **A resize mid-entrance cannot break anything.** The animation is a fixed offset from
  wherever CSS currently puts the tile; the endpoint is not stored anywhere.
- **There is no handoff**, no measurement, no refs, and no reduced-motion branch in the
  component — a media query in `styles.css` handles that, so the TSX has no motion logic left.
- **It scales to any number of photos.** Nothing depends on the tile count.

### What this replaced

The first version flew tiles in along a rotating golden-angle spiral from `scale(0.28)`,
driven by a rAF loop writing per-tile transforms that decayed to identity. It was a nice
invariant and it looked wrong. Four reasons, which compound:

1. The arm rotated while tiles travelled, so their paths crossed and photographs slid over one
   another mid-flight. Real images have hard edges the eye tracks; what read as texture on the
   flat SVG placeholders it was tuned against read as churn on actual photos.
2. A per-tile `rotate(±9deg)` added tumble on top of the crossing paths.
3. It ran 3.29s before the page settled — a long time to withhold a photo wall.
4. Only the ~14 tiles above the fold could take part, so 61 of 75 simply existed. It never read
   as one gesture, just a busy opening followed by a plain grid.

The rise fixes all four by doing less: 16px on one axis, no rotation, no crossing paths, done
in about a second. Deleting the loop also removed `MAX_SPIRAL_TILES`, the `TUNING` table, the
fold scan, the batched-measurement pass, the skip handlers, the `will-change` bookkeeping and
the `data-intro` filter gate — roughly 150 lines, replaced by nine lines of CSS.

## Justified rows come free from flexbox

There is **no JS row-packing algorithm**, and adding one would be a regression. The whole
layout is four properties driven by a single custom property, `--aspect`, written inline per
tile:

```css
.photo-grid {
  --photo-row-h: clamp(150px, 26vw, 330px);
  display: flex;
  flex-wrap: wrap;
  gap: var(--photo-gap);
}
.photo-tile {
  flex-basis: calc(var(--photo-row-h) * var(--aspect));
  flex-grow: var(--aspect);
  aspect-ratio: var(--aspect);
  max-width: calc(var(--photo-row-h) * var(--aspect) * 1.5);
}
```

Why that _is_ the greedy justified algorithm, step for step:

1. Flex line-breaking sums `flex-basis` (= `aspect × targetHeight`) plus gaps and breaks the
   line when the sum exceeds the container. That is the greedy fill.
2. `flex-grow: aspect` then distributes the remaining free space in proportion to aspect,
   giving `w_i = aspect_i × (C − gaps) / Σ aspect` — which is exactly the row-height solve.
3. `aspect-ratio` makes each item's height derive from its flexed width, so a row's heights
   come out uniform automatically. Nothing has to equalise them.

What that buys: zero JS, zero measurement, zero `ResizeObserver`, correct at every width,
correct with JS disabled, and **identical on server and client**. That last one is what makes
"the grid must be the SSR branch" free rather than a second component that can drift — the old
wall had a `MotionStage` and a `StaticGallery` and the static one was the only thing crawlers
ever saw. Now there is one component.

- `max-width` caps how far `flex-grow` may stretch a short final row (without it, one leftover
  photo becomes a banner).
- `flex-shrink` is left at its default so a photo wider than the container shrinks instead of
  overflowing — the correct one-per-row phone behaviour.
- **CLS is zero and no image needs to load for layout to be correct**, because `aspect` is
  already in `src/data/hobbies.generated.ts` for every photo, measured after EXIF rotation.

Row height is one knob: `--photo-row-h` — **and it is load-bearing beyond aesthetics.**

The opening of the wall is arranged deliberately (row one: the Empire State Building at dusk,
SummerHacks Winners, Blossoms Reaching for the Sky; row two opening with The Copper). But
nothing in the code names a "row" — rows are an emergent result of aspect ratios, container
width and this height. That arrangement is therefore held by **arithmetic alone**, and the
proof lives in the `ROW-ONE CONTRACT` comment on `.photo-grid` in `src/styles.css`.

The short version: every photo is 4:3 or 3:4, row one is `P,L,P` = 2.833 aspect units, and the
tile that must not join it is a 0.75 portrait. Below the 1180px section cap the content box is
`0.9·vw` and the height is `a·vw`, so "a fourth tile wraps" reduces to `3.583a > 0.9` — true at
**every** width once `a > 0.2512`. The old `24vw` failed that (between roughly 1050 and 1180px
a fourth tile joined row one); `26vw` clears it. The `330px` cap rather than `340` is what
leaves the widest case a 57px margin instead of 29.

Changing any of those three numbers silently regroups the first row with nothing failing, so
re-do the arithmetic when you touch them. `PHOTO_ORDER` in `src/data/hobbies.ts` carries the
matching row grouping, one line per rendered row, behind a `prettier-ignore`.

## The entrance

- **Pure CSS.** No rAF, no `useLayoutEffect`, no measurement, no refs. The component's only
  contribution is `--i`, the stagger slot, written inline per tile.
- **Only `opacity` and `transform` animate**, so it runs on the compositor and never touches
  layout or paint. It cannot move the justified rows; it only changes how a tile is drawn.
- **`backwards` fill** so a tile is invisible during its delay rather than flashing in and then
  animating.
- **`STAGGER_CAP = 12`.** Ordered by DOM index, which here is exactly reading order, so twelve
  covers about four rows — more than one screenful at any width. Past the cap every tile shares
  the final delay, so the below-the-fold remainder is settled before it can be scrolled to.
  Uncapped, the 75th photo would wait 3.4s for an entrance nobody is looking at.
- `prefers-reduced-motion` sets `animation: none`. The grid is unaffected; it was never
  conditional on JS or on the animation running.

## Why there is no pause button

WCAG 2.2.2 applies to motion that starts automatically and lasts **more than five seconds**.
The belts ran forever, so they needed a control. A one-shot entrance does not, and a control
that pauses nothing is a false affordance and a redundant tab stop — so the button and the
`paused` / `focused` state went with it.

The budget is asserted in comments on both sides, with the arithmetic, so a future tuning pass
cannot wander over the line silently:

```
end = STAGGER_CAP * delay + duration
    = 12 * 45ms + 520ms = 1.06 s
```

That is 3.9s of headroom. Both numbers live in `src/styles.css`; `STAGGER_CAP` is mirrored in
`photo-gallery.tsx`. Move either and re-do the sum.

The reduced-motion bail is a _separate_ mechanism serving vestibular users; it is not the
2.2.2 argument and removing the button did not weaken it.

## The hover / focus filter

`:hover` and `:focus-visible` cannot be expressed inline, so this lives in `src/styles.css`
alongside the other component CSS. Resting state is `filter: saturate(0.5) brightness(0.88)`
on the `<img>` plus a `mix-blend-mode: color` wash at `opacity: 0.34` toward
`var(--portfolio-accent)`; both lift on hover **and** `:focus-visible`.

- **`:focus-visible`, not `:focus`.** With `:focus`, a mouse click leaves the tile permanently
  lit after the lightbox closes and restores focus to the button that opened it.
- The colour lift **supplements** the focus ring, never replaces it — colour alone is not a
  focus indicator. The tile keeps the site-standard
  `focus-visible:ring-2 focus-visible:ring-accent-bright`.
- Under `prefers-reduced-motion` the **transition** is removed, not the reveal. A
  reduced-motion visitor still gets full colour on hover, instantly.
- The filter applies to the `<img>`, not the tile, so the border, radius and vignette are not
  desaturated with it. This is also why the entrance is free: the animation runs on the tile,
  the filter sits on the child, so the filtered image composites as a cached layer that the
  parent merely moves. The spiral needed a `data-intro` gate to switch the filter off for its
  duration — a filter pass per tile per frame was the one thing that would have made it
  expensive — and that gate is gone with it.

Real photos vary wildly in brightness, and a bright photo against a near-black page carries
far more visual mass. The knock-down, plus the identical border/radius/vignette every tile
gets regardless of source, is what normalises that weight.

## `will-change` — why there is none

There is no `will-change` anywhere in the gallery, and adding one would be a regression.

The belts needed it (30 tiles hinted indefinitely, ~17MB of layers at DPR 2 on 1440×900, plus
an `IntersectionObserver` and a `moving` gate so that memory was not pinned on a page the
visitor had scrolled past). The spiral needed a narrower version of the same thing, because
framer/motion-dom emits plain 2D `translate()` with no `translateZ`, so nothing else promoted
a tile whose transform JS rewrote every frame.

A CSS animation has neither problem. The browser knows the full timeline in advance, promotes
the element for exactly its duration, and drops the layer when it ends — the bookkeeping the
two previous designs hand-rolled is now the engine's job. `translate3d` in the keyframe is
belt-and-braces for older compositors; it is not what does the promoting.

## Accessibility

- **Every tile is a real `<button>` with the photo's `alt` and an `aria-label`.** There are no
  clones and no `aria-hidden` duplicates — the belts needed them to satisfy a wrap invariant,
  and duplicate images in the a11y tree plus duplicate tab stops is _the_ classic marquee bug.
  It is gone by construction.
- Tab order follows DOM order and is stable: the entrance animates `opacity` and `transform`
  only and never reorders or reparents anything. DOM order is `PHOTO_ORDER`, which is reading
  order, so tabbing tracks what the eye sees.
- The lightbox has a focus trap and focus restore (`hooks/use-focus-trap.ts`).
- `alt` is a **required** field on `HobbyPhoto`. That is what stops the a11y score rotting as
  photos are added; `bun run photos` prints the ids still missing one.
- There is no `aria-live` "gallery ready" announcement any more, and there should not be. The
  grid is real DOM in the prerendered HTML — assistive tech has the full list from first paint,
  so announcing readiness would be announcing something that was never not ready.
- `/gallery` is audited by Lighthouse in CI, so this does not rot silently.

## Loading

`FIRST_ROW_EAGER = 3` tiles get `loading="eager"` and `fetchPriority="high"`; everything else
is lazy. Tile 0 is the LCP element for every visitor, and because the grid is the SSR branch
there is no client measurement standing between paint and that image — lazy-loading it costs a
round trip that only starts after layout.

It is a **constant, not a measurement**, and that is not laziness: flexbox owns the row
packing, so JS never learns where row one ends. That is the point of the layout.

Three is not a guess, either — the row-one contract above fixes the first row at exactly three
tiles at every width ≥768px, so this is precisely row one and no more. On the narrowest
viewports the row packs 2-up and this over-eagers one image, which is far cheaper than
lazy-loading the LCP one. If the contract is renegotiated, this number moves with it.

## Placeholders and the photo-count trap

`src/data/hobbies.ts` tops the collection up to `MIN_TILES` with generated SVG placeholders.
That was **24** for the belts (they needed enough tiles to fill a wide viewport twice over or
the wrap seam showed); it is **12** now, purely so the page reads as a few rows deep at desktop
width. The grid itself is correct with one photo.

**This number is coupled to the achievement registry, and the coupling used to be silent.**
`gallery-crawl` was `{ kind: "set", key: photosViewed, target: 15 }` and `completionist` is
`{ kind: "meta" }` — every other badge. So the moment the collection dropped below 15, _both_
became permanently unearnable by everyone, which is not a failure anyone observes: it looks
like a badge nobody happens to have.

`src/data/achievements.ts` now derives the target:

```ts
const GALLERY_CRAWL_TARGET = Math.min(
  HOBBY_PHOTOS.length,
  Math.max(5, Math.round(HOBBY_PHOTOS.length * 0.75)),
);
```

The `min` against the collection size is the load-bearing clamp — the target can never exceed
what exists. The description and hint interpolate the same constant, so the copy cannot
disagree with the rule either.

Two constraints on anyone touching this:

- **Do not change the `id`.** It is persisted in `localStorage` and hardcoded in the allowlist
  in `workers/achievement-stats/src/index.ts`.
- **Use `target`, never `members`.** Lowering a `target` only ever unlocks retroactively — it
  never revokes. A `members` list would revoke: adding a photo would un-earn the badge for
  everyone who had it, and placeholder ids shift as real photos land.

`achievements.ts` importing `hobbies.ts` is safe: `hobbies.ts` imports only
`hobbies.generated.ts`, never back into `achievements.ts` (no cycle), and touches no `window`
or `document`, so `achievements.ts` stays SSR-safe.

Placeholders deliberately carry no `location`, `date` or `gear`. The lightbox prints those
verbatim as capture data, and the real photos have none — seeding placeholders with sample
EXIF meant the only photos claiming a camera and a place were the ones that never existed.

## Codebase traps this feature ran into

1. **Asset paths.** Paths in `data/*.ts` are bare and document-relative, which only resolves
   from the site root. From `/portfolio-site/gallery` a bare `assets/x.webp` would 404. Every
   reference goes through `assetUrl()` in `src/lib/assets.ts` — including the one in the
   lightbox's neighbour preloader.
2. **Prerender only knew `/`.** `scripts/prerender.mjs` hardcoded a single fetch; it now loops
   `ROUTES` from `scripts/routes.mjs`. Without this, `/portfolio-site/gallery` fell through to
   `404.html` — a copy of the landing page — so visitors saw the hero flash before the client
   router corrected. (`prerender.mjs` also needed `pathToFileURL`; a bare `C:\` path is not a
   valid ESM specifier, so `build:static` had never run on Windows.)
3. **Sitemap `lastmod` is keyed off source paths.** `scripts/seo.mjs` maps `/gallery` to the
   files that produce it; renaming the component means renaming it there too. An unmatched
   pathspec degrades to the build date rather than throwing, so this fails quietly.
4. **`layeredMain={false}`** on `PageShell`. `<main>` must not create a stacking context, or
   the `position: fixed` lightbox would be trapped inside it and the footer (rendered at
   z-index 2) would paint over it. The gallery lifts its own `<section>` to z-index 2 instead.

## Tuning

There are three numbers, and they no longer sit in one place because they no longer belong to
one mechanism:

| Knob                                      | Where                         | Governs                                                                           |
| ----------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `--photo-row-h`                           | `styles.css` on `.photo-grid` | Row packing — **and the row-one contract**. Read that comment before touching it. |
| `photo-rise` duration / `animation-delay` | `styles.css`                  | Entrance feel and the WCAG 2.2.2 budget                                           |
| `STAGGER_CAP`                             | `photo-gallery.tsx`           | How many tiles stagger; mirrored in the CSS delay arithmetic                      |

Layout and entrance do not interact: the animation is a fixed offset from wherever flexbox put
a tile, and it ends at `transform: none`. You can retune either without re-deriving the other —
the one exception being the WCAG sum, which depends on the delay and the cap together.

The lesson from the version this replaced is worth keeping: it was tuned against flat SVG
placeholders and only looked wrong once real photographs were in it. Evaluate any change to
the entrance on the actual wall, not on a few test tiles.
