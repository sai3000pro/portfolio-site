# Projects Constellation

**Status: shipped.** This was a design plan; it is now a reference for the code in
`src/components/portfolio/constellation.tsx` — why it is built the way it is, and which knobs
you can turn. Values quoted here are named constants; the file is the source of truth.

## What it is

The Projects section renders each project as a draggable card panel floating in a bounded
canvas, joined by glowing strands to the projects it shares technologies with. Cards drift,
bounce off the walls and off each other, keep the momentum of a flick, and open a detail modal.

Below a width threshold it is a plain responsive card grid instead.

## The two branches

`ConstellationCanvas` renders exactly one of:

- **`animated`** — the physics canvas, `clamp(600px, 75vh, 780px)` tall.
- **`StaticProjectGrid`** — an auto-filling grid of the same cards, each a real `<button>`.

The branch is decided by `MOTION_MIN_WIDTH` measured against the **container** (`clientWidth`
of the stage), never `window.innerWidth`, and **every** comparison in the file uses that same
quantity. Mixing the two is what previously left the 768–845px viewport band showing a
constellation whose physics loop had already opted out, so the cards stayed piled up. The
container is the viewport minus `Section`'s horizontal padding, so the effective viewport
cutoff is roughly 845–930px — which is the right place to draw the line, because three cards
plus gaps only stop overlapping once the canvas is that wide.

`animated` starts `false` and is only set in a layout effect after mount. That means the
static grid is what the server prerenders **and** what the first client render produces, so
hydration always agrees, and crawlers get real card markup instead of an empty canvas awaiting
measurement.

Both branches render the same `ProjectCardFace` — thumbnail, title, tagline, a "See more →"
affordance, and a gold `★ Winner` pill on the thumbnail for hackathon winners. Only the shell
differs (an absolutely-positioned draggable `motion.div` vs. a grid cell that _is_ the button),
so the two presentations cannot drift apart.

`prefers-reduced-motion` suppresses the physics loop and the card entry stagger, but does not
by itself force the static grid: on a wide viewport a reduced-motion visitor gets the canvas
with the cards where they were seeded, still draggable, with no ambient drift. Drag has
`dragMomentum={false}` and `dragElastic={0}`, so there is no release spring to suppress either.

## Position tracking: one motion value pair per node

Each card owns a framer `motionValue` pair created **once**, outside React renders. The RAF
physics loop writes to them; framer's `drag` writes to the same values; `StrandLayer`
subscribes to them. React never re-renders during motion.

This is the decision everything else rests on. The obvious alternative — physics in a ref with
a React state mirror — fights framer's own transform writes and re-renders the whole subtree
60 times a second.

## Physics

A single `requestAnimationFrame` loop, running only while `animated` and not reduced-motion.
It reads the canvas size from a ref fed by a `ResizeObserver`, never from `clientWidth` — the
loop and framer both write to the same subtree, so a per-frame DOM read would be a forced
synchronous reflow 60×/s.

Per frame, for every node not being dragged:

1. **Ambient drift.** A small random nudge, but _only_ when the node is already slower than
   `MAX_AMBIENT_SPEED`, and the cap is applied in the same branch. A thrown card is much faster
   than that and must not be clamped down to a drift.
2. **Damping**, then integrate position.
3. **Wall bounce** against the canvas bounds, keeping `RESTITUTION` of the speed.

Then, over all pairs, **AABB collision** — cards are rectangles, so separation happens along
the axis of minimum penetration rather than the circle-circle normal an earlier sketch assumed.
`NODE_GAP` keeps a minimum gap between panel edges. A dragged card is never displaced by a
collision (the pointer owns it); its partner takes the whole push.

Releasing a drag converts framer's `info.velocity` (px/s) into the node's per-frame velocity
via `THROW_SCALE`, clamped to `MAX_THROW`. A release above `THROW_ACHIEVEMENT_SPEED` counts as
a deliberate fling and unlocks a badge — the cards are a physics toy and almost nobody realises
it until they throw one.

**Tunables:** `AMBIENT_JITTER`, `MAX_AMBIENT_SPEED`, `DAMPING`, `RESTITUTION`, `NODE_GAP`,
`THROW_SCALE`, `MAX_THROW`. Card geometry is `NODE_W` / `IMG_H` / `NODE_H`.

## Seeding and resize

A `ResizeObserver` on the canvas seeds a jittered grid on the first non-zero measurement, and
on every later change rescales each position by `(new / old)` independently on x and y, clamped
into bounds. Cards keep their relative position; nothing jumps and nothing is re-seeded. The
observer also publishes the size the physics loop reads.

The loop treats a width of 0 as "not measured yet" and idles, and re-checks
`MOTION_MIN_WIDTH` every frame — a narrow canvas can outlive a stage resize by a frame or two,
and the cards must not drift while it does.

## Strands

Edges are **derived, never authored**: an edge exists between two projects whose `tech` arrays
intersect, with `weight` = the number of shared technologies. Add a project with a `tech` array
and its strands appear. Weight drives stroke width and opacity, so the graph reads as a
similarity map rather than a decoration.

Two implementation details worth preserving:

- **One `<line>` per edge holds the geometry, in `<defs>`; every visual pass is a `<use>` of
  it.** A frame writes four attributes per edge no matter how many strokes are layered on.
- **The corona is concentric translucent strokes (`HALO_PASSES` / `CORE_PASSES`), not an SVG
  filter.** A `feGaussianBlur`'s cached raster is invalidated by _any_ geometry change, so with
  the lines moving every frame every filter region was re-rasterized 60×/s, on the CPU in most
  browsers. The passes are tuned so the summed alpha profile tracks the old Gaussian's; the
  falloff is piecewise rather than smooth, which at these opacities is not perceptible.

Redraws are coalesced through a **microtask**, not a rAF. Each edge listens to four motion
values that all change in the same synchronous block, so a change only marks the edge dirty and
one drain does the writing. A microtask fires once per burst — the same coalescing a rAF would
give — but lands inside the frame that moved the cards rather than trailing it, and reads
_settled_ positions, since collision resolution has already finished.

Hovering a card brightens it and its incident strands (`activeNode`). Hover state is cleared
defensively: dragging the pointer straight from one card to another fires B's hover-start
before A's hover-end, so the exit handler only clears if the highlight is still its own.

## The modal, and deep links

**The URL is the single source of truth for which modal is open.** Opening a card pushes
`?p=<slug>`; closing removes it; an effect reconciles the modal to the query string. Shared
links and the browser Back button therefore both work, and no component owns a second copy of
"which project is open".

The modal itself mirrors `ExperienceModal`: backdrop click, Escape, scroll lock, and
`AnimatePresence`. Both now share the focus trap in `hooks/use-focus-trap.ts`, and this one's
scrollable body is `tabIndex={0}` with a role and label — a scrollable region only a pointer
can reach is a WCAG 2.1.1 failure. Contents: screenshot, title, full `details`, tech chips, and
links out to the full case-study route, the Devpost/paper link, and the repo.

## Accessibility

- Titles and taglines stay in the DOM, so content is crawlable and readable either way.
- **The canvas card's focusable element is its "See more →" button**, not the card shell. The
  shell is a drag target; the button is the keyboard path to the modal.
- In the static grid the whole card is a single real `<button>` in document order, with an
  `aria-label` that names the project and flags winners. No positive `tabIndex` anywhere, so
  tab order follows the data array and never tracks the drifting visual positions.
- The strand layer is `aria-hidden` — it is pure decoration.
- Card labels are ellipsised (title) and line-clamped (tagline) so a long entry cannot blow out
  the panel.

## Known limits

- Dragging is bounded by `dragConstraints={canvasRef}`, which framer computes from the canvas's
  bounding rect. Scrolling the page mid-drag has not been exercised.
- Dragged positions are not persisted. If that is ever wanted, store fractions of the canvas
  dimensions rather than pixels, or they will be wrong at the next viewport size.
  </content>
