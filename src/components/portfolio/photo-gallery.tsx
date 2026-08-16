import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { KEYS } from "@/data/achievements";
import type { HobbyPhoto } from "@/data/hobbies";
import { trackMember } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
import { HobbyLightbox } from "@/components/portfolio/hobby-lightbox";
import { SectionHeading } from "@/components/portfolio/section";

/* ────────────────────────────── tuning ────────────────────────────── */

/**
 * How many tiles get a staggered entrance delay.
 *
 * The reveal is ordered by DOM index, which in this layout is exactly reading order — left
 * to right, top to bottom — so a cap of 12 covers roughly the first four rows, comfortably
 * more than one screenful at any width. Past the cap every tile shares the final delay, so
 * the below-the-fold remainder is already settled by the time it can be scrolled to. Without
 * a cap the 75th photo would wait 75 x 45ms = 3.4s for an entrance nobody is looking at, and
 * the WCAG budget below would blow out for no benefit.
 *
 * Keep in sync with `--photo-stagger-cap` in src/styles.css, which does the same clamp in CSS
 * for the no-JS/no-hydration case.
 */
const STAGGER_CAP = 12;

/**
 * How many tiles get eager, high-priority image loads.
 *
 * The first tile is the LCP element on /gallery for every visitor — the grid is the SSR
 * branch, so there is no client-side measurement standing between paint and this image.
 * Lazy-loading it costs a round trip that only starts after layout.
 *
 * It is widened from tile 0 to the whole first row, and the count is a constant rather than
 * a measurement because **flexbox owns the row packing** — JS never learns where row one ends
 * (that is the whole point of the layout, see the doc).
 *
 * Three is not a guess here: the first row is a fixed, deliberate trio (see the ROW-ONE
 * CONTRACT comment on `.photo-grid` in src/styles.css, which proves it holds at every
 * viewport width), so this is exactly the first row and no more. If that contract is ever
 * renegotiated, this number moves with it. On the narrowest viewports the row packs 2-up and
 * this over-eagers one image — far cheaper than lazy-loading the LCP one.
 */
const FIRST_ROW_EAGER = 3;

/** Used when a photo has no measured aspect. Every generated photo has one; placeholders too. */
const DEFAULT_ASPECT = 4 / 3;

/** Re-express an `hsl(h s l)` accent as `hsl(h s l / a)` so borders/glow can be tinted subtly. */
function accentTint(accent: string | undefined, alpha: number): string | undefined {
  if (!accent) return undefined;
  const m = /^hsl\(\s*([^)]+?)\s*\)$/i.exec(accent);
  return m ? `hsl(${m[1]} / ${alpha})` : accent;
}

/* ─────────────────────────────── tile ─────────────────────────────── */

const TILE_SHELL: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--portfolio-border)",
  background: "var(--portfolio-panel-deep)",
  overflow: "hidden",
};

const TILE_VIGNETTE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background: "linear-gradient(180deg, transparent 45%, rgba(2,10,26,0.72))",
};

/* ────────────────────────────── public ────────────────────────────── */

/**
 * A browsable justified photo grid with a staggered entrance.
 *
 * **The grid is the DOM truth; the entrance is presentation only.** Tiles are ordinary flow
 * children of a flex container and are already sitting in their justified cells at first
 * paint. The reveal is a pure CSS animation on each tile — see `.photo-tile` and the
 * `photo-rise` keyframes in src/styles.css — so there is no JavaScript in the entrance path
 * at all: no rAF, no measurement, no refs, no reduced-motion branch in this file, and no way
 * for the animation to disagree with where flexbox put things.
 *
 * WHAT THIS REPLACED, AND WHY. The first version flew tiles in along a rotating golden-angle
 * spiral from `scale(0.28)`, driven by a rAF loop writing per-tile transforms that decayed to
 * identity. It was clever and it did not look good. Four reasons, and they compound:
 *
 *   1. The arm rotated while tiles travelled, so their paths crossed and photographs slid
 *      over one another mid-flight. Real images have hard edges the eye tracks; the effect
 *      that read as texture on flat SVG placeholders read as churn on actual photos. The old
 *      SPIN comment had already conceded half of this.
 *   2. A per-tile `rotate(+/-9deg)` added tumble on top of the crossing paths.
 *   3. It ran 3.29s before the page settled — a long time to withhold a photo wall.
 *   4. Only the ~14 tiles above the fold could take part, so 61 of 75 simply existed. It
 *      never read as one gesture, just as a busy opening followed by a plain grid.
 *
 * A rise-and-fade fixes all four by doing less: tiles move ~16px on one axis, never overlap,
 * never rotate, and the whole thing is done in about 1.1s. It also scales to any number of
 * photos, which the spiral could not.
 *
 * WCAG 2.2.2: motion that runs over five seconds needs a pause control. The entrance is
 * one-shot and finishes in `STAGGER_CAP * 45ms + 520ms` = 1.06s, so no control is required —
 * and a button that pauses a one-second animation is a false affordance plus a tab stop.
 * Both numbers live in src/styles.css; re-do this sum if either moves.
 */
export function PhotoGallery({ photos }: { photos: HobbyPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  // Every distinct photo viewed counts toward Shutterbug / Gallery Crawl. Used for
  // both opening a tile and stepping through with the lightbox arrows.
  const openAt = useCallback(
    (i: number) => {
      setOpenIndex(i);
      const photo = photos[i];
      if (photo) trackMember(KEYS.photosViewed, photo.id);
    },
    [photos],
  );

  return (
    <>
      {/* zIndex 2 lifts the gallery above the decorative starfield. The route passes
          layeredMain={false} to PageShell, so <main> creates no stacking context of its
          own and the lightbox below can still cover the footer. */}
      <section
        className="relative mx-auto w-full"
        style={{
          maxWidth: 1180,
          zIndex: 2,
          padding: "clamp(112px,16vh,168px) clamp(24px,5vw,80px) clamp(48px,8vh,88px)",
        }}
      >
        <SectionHeading eyebrow="Through the lens" title="Photography" as="h1" immediate />

        <div className="photo-grid" style={{ marginTop: "clamp(36px,5vh,56px)" }}>
          {photos.map((photo, i) => {
            const aspect = photo.aspect ?? DEFAULT_ASPECT;
            const eager = i < FIRST_ROW_EAGER;
            return (
              // NOTE: never wrap this in a `motion.div` with `layout`/`layoutId`.
              //
              // The temptation is strong — these are real flow children in a real flex
              // container, so a layout animation *looks* like the natural way to move them.
              // It is not. Framer's projection engine measures the tile every frame and
              // writes its own transform to the element, which fights the CSS entrance and
              // wins on the frames it runs; that reads as jitter. The entrance is CSS
              // precisely so nothing has to be told where a settled tile belongs.
              <button
                key={photo.id}
                type="button"
                onClick={() => openAt(i)}
                className="photo-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                style={
                  {
                    ...TILE_SHELL,
                    // `--aspect` drives flex-basis, flex-grow AND aspect-ratio, so one number
                    // is the whole layout contribution. `--i` is the entrance's stagger slot,
                    // clamped here so the tail of a long wall does not queue up behind it.
                    "--aspect": String(aspect),
                    "--i": String(Math.min(i, STAGGER_CAP)),
                    borderColor: accentTint(photo.accent, 0.42) ?? "var(--portfolio-border)",
                  } as React.CSSProperties
                }
                aria-label={photo.caption ? `${photo.alt}. ${photo.caption}` : photo.alt}
              >
                <img
                  className="photo-tile__img"
                  src={assetUrl(photo.src)}
                  alt={photo.alt}
                  loading={eager ? "eager" : "lazy"}
                  fetchPriority={eager ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                  // No `sizes`: there is no `srcset`, so it would be inert. The pipeline
                  // emits one tile-sized WebP per photo plus a `full` variant the lightbox
                  // loads on demand.
                />
                <span aria-hidden className="photo-tile__wash" />
                <span aria-hidden style={TILE_VIGNETTE} />
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {openIndex !== null && (
          <HobbyLightbox photos={photos} index={openIndex} onClose={close} onNavigate={openAt} />
        )}
      </AnimatePresence>
    </>
  );
}
