import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  cubicBezier,
  motion,
  motionValue,
  useReducedMotion,
  wrap,
  type MotionValue,
} from "framer-motion";
import { Pause, Play } from "lucide-react";

import { KEYS } from "@/data/achievements";
import type { HobbyPhoto } from "@/data/hobbies";
import { trackMember } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
import { HobbyLightbox } from "@/components/portfolio/hobby-lightbox";
import { SectionHeading } from "@/components/portfolio/section";

/* ────────────────────────────── tuning ────────────────────────────── */

const TUNING = {
  /** Radians between consecutive tiles along the arm (~10 tiles per revolution). */
  TURN_STEP: 0.62,
  /** Extra angular lag while flying in — this is what curves the path into a spiral. */
  SWEEP: 1.15,
  /** Max vertical roundness of the spiral. Now it fills the screen, so it may go near-circular. */
  ELLIPSE_Y: 0.9,
  /**
   * Global rotation of the whole formation, rad/s.
   *
   * Re-tune vs. real photos (was -0.22, set against flat SVG gradients). Angular rate is
   * constant but the tangential speed it produces is not: at a 1440px viewport the outer arm
   * sits at rMax ≈ 600px, so -0.22 rad/s dragged the outermost tiles sideways at ~130px/s —
   * five times the belt speed they are about to settle into. A uniform gradient at that rate
   * reads as texture; a photograph with a hard horizon and a bright sky reads as a spinning
   * carousel, because the eye now has edges to track. -0.18 keeps the drift clearly visible
   * (~108px/s outer) while letting the frames be read during HOLD. Same reasoning, and the
   * same ~17-18% trim, as the recent starfield slow-down.
   */
  SPIN: -0.18,

  FLY_IN: 1.05,
  FLY_STAGGER: 0.035,
  HOLD: 0.6,
  SETTLE: 0.9,
  SETTLE_STAGGER: 0.022,

  /**
   * Per-row belt speeds in px/s; index wraps. Slight variation reads as depth.
   *
   * Re-tune vs. real photos (was [26, 22, 30]): the three values are unchanged, only their
   * order is. Row index is also the depth cue (DEPTH_SCALE_STEP / DEPTH_BLUR_STEP): row 0 is
   * front — full size, sharp; row 2 is furthest back — 0.94 scale, ~1.1px blur. The old order
   * gave the *back* row the fastest travel, i.e. inverted parallax. That was unreadable while
   * every tile was a flat gradient (no detail to lose to a 1.1px blur, so no depth was
   * perceived to contradict); real photographs make the blur/scale cue legible, and the
   * far row outrunning the near one then reads as a mistake. Front-to-back descending keeps
   * the identical average pace and spread, and now agrees with the depth cue.
   */
  ROW_SPEEDS: [30, 26, 22],
  GAP: 16,
  /** Belts spin up/down over ~200ms rather than snapping. */
  SPEED_EASE: 0.08,
} as const;

const MOTION_MIN_WIDTH = 768;
const THREE_ROW_MIN_WIDTH = 1024;

/** Per-row depth cue: each row back is this much smaller and this much blurrier. */
const DEPTH_SCALE_STEP = 0.03;
const DEPTH_BLUR_STEP = 0.55;
/** Drag-to-scrub: fling momentum decay (per second) + velocity clamp + move threshold. */
const DRAG_DECAY = 2.6;
const DRAG_MAX_VEL = 1600;
const DRAG_THRESHOLD = 4;

const settleEase = cubicBezier(0.2, 0.7, 0.3, 1);
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Re-express an `hsl(h s l)` accent as `hsl(h s l / a)` so borders/glow can be tinted subtly. */
function accentTint(accent: string | undefined, alpha: number): string | undefined {
  if (!accent) return undefined;
  const m = /^hsl\(\s*([^)]+?)\s*\)$/i.exec(accent);
  return m ? `hsl(${m[1]} / ${alpha})` : accent;
}

/* ────────────────────────────── layout ────────────────────────────── */

interface Row {
  dir: 1 | -1;
  speed: number;
  offset: number;
  period: number;
}

interface Layout {
  W: number;
  /** Full stage height — the whole viewport. The spiral is centred in it and covers the screen. */
  H: number;
  rows: number;
  tileW: number;
  tileH: number;
  pitch: number;
  perRow: number;
  total: number;
  cx: number;
  cy: number;
  rMax: number;
  r0: number;
  /** Vertical squash, derived so the spiral spans the whole screen without over-stretching. */
  ellipseY: number;
  /** Top of the centred belt band the spiral collapses into (viewport-space, stage-local). */
  bandTop: number;
}

function buildLayout(W: number, viewportH: number, photoCount: number): Layout {
  const { GAP } = TUNING;
  // The stage is the whole viewport now: the intro spiral fills the screen, then the tiles
  // collapse into a belt band centred inside it. Guard against a zero/tiny first measurement.
  const H = Math.max(480, viewportH);
  const rows = W >= THREE_ROW_MIN_WIDTH ? 3 : 2;

  // Belts occupy a centred band, not the full height — that band is the "resting" wall and
  // leaves the spiral room to be dramatically larger than its destination.
  const band = Math.min(H * 0.66, 560);
  const tileH = Math.round((band - (rows + 1) * GAP) / rows);
  const tileW = Math.round((tileH * 4) / 3);
  const pitch = tileW + GAP;

  // The wrap seam must always land offscreen, which requires period >= W + tileW.
  // Headroom keeps small resizes from churning the tile count.
  const minPerRow = Math.ceil(((W + tileW) * 1.2) / pitch) + 1;
  const perRow = Math.max(minPerRow, Math.ceil(photoCount / rows));

  // Let the arm use the full width, then squash vertically by whatever it takes to roughly
  // fill the viewport height. Deriving the squash (rather than fixing it) is what keeps the
  // spiral from collapsing into a small blob in the middle of a wide viewport.
  const rMax = Math.max(tileW, W / 2 - tileW * 0.55);
  const ellipseY = Math.min(TUNING.ELLIPSE_Y, Math.max(0.18, (H / 2 - tileH * 0.5) / rMax));

  // Centre the belt band vertically so the collapse reads as "spiral → belts", not "spiral → top".
  const beltHeight = rows * tileH + (rows - 1) * GAP;
  const bandTop = (H - beltHeight) / 2;

  return {
    W,
    H,
    rows,
    tileW,
    tileH,
    pitch,
    perRow,
    total: perRow * rows,
    cx: W / 2,
    cy: H / 2,
    rMax,
    r0: rMax * 0.14,
    ellipseY,
    bandTop,
  };
}

/* ────────────────────────────── public ────────────────────────────── */

/** Which belt row (if any) sits under a pointer Y offset within the stage. */
function rowAtY(L: Layout, y: number): number | null {
  const stride = L.tileH + TUNING.GAP;
  for (let r = 0; r < L.rows; r++) {
    const top = L.bandTop + r * stride;
    if (y >= top && y <= top + L.tileH) return r;
  }
  return null;
}

export function HobbyWall({ photos }: { photos: HobbyPhoto[] }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Decided after mount, so SSR and the first client render agree (StaticGallery both times).
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || reduced) return;

    let frame = 0;
    const measure = () => {
      const W = el.clientWidth;
      if (W < MOTION_MIN_WIDTH) {
        setLayout(null);
        return;
      }
      setLayout((prev) => {
        const next = buildLayout(W, window.innerHeight, photos.length);
        // Only re-key tiles when the count genuinely changes; plain resizes just swap constants.
        return prev && prev.total === next.total && prev.rows === next.rows ? { ...next } : next;
      });
    };

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(el);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduced, photos.length]);

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
      <div ref={stageRef} className="relative w-full">
        {layout && !reduced ? (
          <MotionStage
            photos={photos}
            layout={layout}
            lightboxOpen={openIndex !== null}
            onOpen={openAt}
          />
        ) : (
          <StaticGallery photos={photos} reduced={!!reduced} onOpen={openAt} />
        )}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <HobbyLightbox photos={photos} index={openIndex} onClose={close} onNavigate={openAt} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ────────────────────────── static fallback ────────────────────────── */

/**
 * Rendered for reduced-motion, narrow viewports, and — because it is also what the
 * server renders — the prerendered HTML. That last part matters: crawlers get real
 * <img alt> markup instead of an empty stage waiting on measurement.
 *
 * A gentle staggered fade-in plays for the ordinary narrow-viewport case, but is
 * suppressed entirely under prefers-reduced-motion (the grid renders fully static).
 */
function StaticGallery({
  photos,
  reduced,
  onOpen,
}: {
  photos: HobbyPhoto[];
  reduced: boolean;
  onOpen: (i: number) => void;
}) {
  return (
    <div
      className="relative mx-auto w-full"
      style={{
        maxWidth: 1180,
        zIndex: 2,
        padding: "clamp(112px,16vh,168px) clamp(24px,5vw,80px) clamp(48px,8vh,88px)",
      }}
    >
      <SectionHeading eyebrow="Through the lens" title="Photography" as="h1" />
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: TUNING.GAP,
          marginTop: "clamp(36px,5vh,56px)",
        }}
      >
        {photos.map((photo, i) => (
          <motion.button
            key={photo.id}
            type="button"
            onClick={() => onOpen(i)}
            className="relative block w-full overflow-hidden"
            style={{
              ...TILE_SHELL,
              aspectRatio: String(photo.aspect ?? 4 / 3),
              borderColor: accentTint(photo.accent, 0.4) ?? "var(--portfolio-border)",
            }}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduced
                ? undefined
                : { duration: 0.5, delay: Math.min(i * 0.04, 0.6), ease: "easeOut" }
            }
          >
            <img
              src={assetUrl(photo.src)}
              alt={photo.alt}
              // This grid is the mobile, reduced-motion AND prerendered-SSR path, so its first
              // tile is the LCP element on /hobbies for every phone visitor. Lazy-loading it
              // costs a round trip that only starts after layout — eager + high priority for
              // tile 0 only; everything below the fold stays lazy.
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              className="w-full h-full"
              style={{ objectFit: "cover", display: "block" }}
            />
            <span aria-hidden style={TILE_VIGNETTE} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── motion stage ─────────────────────────── */

interface TileValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
}

function MotionStage({
  photos,
  layout,
  lightboxOpen,
  onOpen,
}: {
  photos: HobbyPhoto[];
  layout: Layout;
  lightboxOpen: boolean;
  onOpen: (i: number) => void;
}) {
  const { total, perRow, rows, tileW, tileH, pitch } = layout;

  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  // Mirrors the IntersectionObserver below into React (it fires on scroll-in/out, never per
  // frame). Only used to decide whether the tiles are worth keeping on the compositor.
  const [onscreen, setOnscreen] = useState(true);

  // Hover pauses only the row under the cursor — written by pointer move, read by the RAF
  // loop, so moving the mouse never triggers a React re-render of the tile grid.
  const hoveredRowRef = useRef<number | null>(null);

  // Bridges between the RAF-effect closure (which owns pointer drag + IntersectionObserver)
  // and React: the stage section, the tile layer, settle state, offscreen visibility, and a
  // one-shot flag that swallows the click that ends a scrub so it doesn't open the lightbox.
  const sectionRef = useRef<HTMLElement>(null);
  const tileLayerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const visibleRef = useRef(true);
  const suppressClickRef = useRef(false);

  // Cached viewport-space top edge of the tile layer. Both hover-to-pause (every mousemove) and
  // drag-to-scrub (every pointerdown) need it to turn clientY into a row index, and
  // getBoundingClientRect() forces a layout — measuring it per pointer event, while 30 tiles are
  // having transforms written on the same main thread, is a synchronous reflow per event.
  // The value only moves when the layer moves: a page scroll, a resize, or a reflow above us.
  // Scroll and resize set the dirty flag (see the effect below); `layout` changing covers the
  // parent's ResizeObserver; mouseenter re-dirties as a catch-all for anything else (a late
  // image or font reflowing the page while the cursor is elsewhere) at one measure per entry.
  const layerTopRef = useRef(0);
  const layerTopDirtyRef = useRef(true);
  const layerTop = useCallback(() => {
    const el = tileLayerRef.current;
    if (!el) return 0;
    if (layerTopDirtyRef.current) {
      layerTopRef.current = el.getBoundingClientRect().top;
      layerTopDirtyRef.current = false;
    }
    return layerTopRef.current;
  }, []);
  const invalidateLayerTop = useCallback(() => {
    layerTopDirtyRef.current = true;
  }, []);

  useEffect(() => {
    // Passive + capture: scroll doesn't bubble, so capture is what catches a scrolling ancestor
    // as well as the document. The handler only sets a boolean — the re-measure is deferred to
    // the next pointer event that actually needs it, so a scroll burst costs zero layouts.
    window.addEventListener("scroll", invalidateLayerTop, { passive: true, capture: true });
    window.addEventListener("resize", invalidateLayerTop);
    return () => {
      window.removeEventListener("scroll", invalidateLayerTop, true);
      window.removeEventListener("resize", invalidateLayerTop);
    };
  }, [invalidateLayerTop]);

  // Every belt tile: photos cycle to fill the rows. The first occurrence of each photo is the
  // "original" — the only one in the tab order / a11y tree.
  const tiles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const slot = i % photos.length;
        const photo = photos[slot];
        return {
          key: `${photo.id}#${Math.floor(i / photos.length)}`,
          photo,
          photoIndex: slot,
          isOriginal: i < photos.length,
        };
      }),
    [total, photos],
  );

  // Created once per tile count; the RAF loop writes to these, React never re-renders.
  const valuesRef = useRef<TileValues[]>([]);
  if (valuesRef.current.length !== total) {
    valuesRef.current = Array.from({ length: total }, () => ({
      x: motionValue(0),
      y: motionValue(0),
      scale: motionValue(0.28),
      rotate: motionValue(0),
      opacity: motionValue(0),
    }));
  }
  const values = valuesRef.current;

  // Global pause: the pause button, keyboard focus, and the open lightbox freeze every belt.
  // Per-row hover pausing is handled separately, inside the RAF loop.
  const globalPaused = paused || focused || lightboxOpen;
  const pausedRef = useRef(false);
  pausedRef.current = globalPaused;

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // A new `layout` object means the parent's ResizeObserver re-measured; the layer's box may
  // have moved even if the window itself never fired `resize` (a sidebar/scrollbar change).
  useEffect(invalidateLayerTop, [layout, invalidateLayerTop]);

  const introDuration =
    (total - 1) * TUNING.FLY_STAGGER +
    TUNING.FLY_IN +
    TUNING.HOLD +
    (total - 1) * TUNING.SETTLE_STAGGER +
    TUNING.SETTLE;

  useEffect(() => {
    const rowState: Row[] = Array.from({ length: rows }, (_, r) => ({
      dir: r % 2 === 0 ? 1 : -1,
      speed: TUNING.ROW_SPEEDS[r % TUNING.ROW_SPEEDS.length],
      offset: 0,
      period: perRow * pitch,
    }));

    const prevTarget = new Array<number | undefined>(total).fill(undefined);
    const srcShift = new Float64Array(total);

    let raf = 0;
    let cancelled = false;
    let t0 = performance.now();
    let last = t0;
    // Per-row spin-up/down, so one belt can ease to a stop under the cursor while the
    // others keep running. Also lets each row spin up independently after the settle.
    const speedScales = new Float64Array(rows);

    // Drag-to-scrub: per-row fling velocity (offset units/sec) that decays back into the
    // auto-scroll, plus the transient state of the gesture currently in progress.
    const dragVel = new Float64Array(rows);
    let dragRow = -1;
    // Which pointer owns the gesture. endDrag listens on window (see below), so it has to
    // ignore releases from any other pointer — a second finger, or a different device.
    let dragPointerId = -1;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let dragLastX = 0;
    let dragLastT = 0;
    let dragMoved = false;

    // Offscreen pause bookkeeping — while stopped we hold the clock so the intro/belt phase
    // resumes exactly where it left off instead of jumping forward.
    let stopped = false;
    let stoppedAt = 0;

    readyRef.current = false;
    setReady(false);

    // The "belts are live" gate: drag-to-scrub refuses to start until it flips, and the
    // aria-live region announces off it. It lives in a re-armable timer rather than a fixed
    // one because skip() can legitimately bring it forward (see below).
    let readyTimer = 0;
    const markReady = () => {
      readyRef.current = true;
      setReady(true);
    };
    const armReady = (delayMs: number) => {
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(markReady, Math.max(0, delayMs));
    };

    const settleStart = (total - 1) * TUNING.FLY_STAGGER + TUNING.FLY_IN + TUNING.HOLD;

    // Replay the full spiral on every visit. Reset tiles to the collapsed, invisible start
    // state so a remount always animates fresh instead of showing a half-finished or stale
    // frame — that inconsistency was the "strange lag" on revisits.
    for (const v of values) {
      v.scale.set(0.28);
      v.opacity.set(0);
      v.rotate.set(0);
    }

    // A deliberate pointer/scroll gesture still skips straight to the conveyor.
    const skip = () => {
      t0 = performance.now() - introDuration * 1000;
      speedScales.fill(1);
      // Rewinding the clock puts the belts at steady state from this frame on, so the ready
      // gate has to move with them. Leaving the original timer to run meant drag-to-scrub was
      // refused (and the announcement stayed silent) for the rest of the intro's nominal
      // ~3.9s on a wall that was visibly already running.
      armReady(0);
    };
    const onSkip = () => skip();
    window.addEventListener("pointerdown", onSkip, { once: true });
    window.addEventListener("wheel", onSkip, { once: true, passive: true });

    // ── drag-to-scrub (pointer events, so touch works too) ─────────────────
    const layerEl = tileLayerRef.current;
    const onPointerDown = (e: PointerEvent) => {
      // Only after the belts are running, and only one gesture at a time.
      if (!readyRef.current || dragRow >= 0) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const L = layoutRef.current;
      const r = rowAtY(L, e.clientY - layerTop());
      if (r === null) return;
      dragRow = r;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartOffset = rowState[r].offset;
      dragLastX = e.clientX;
      dragLastT = performance.now();
      dragMoved = false;
      dragVel[r] = 0;
      // Don't capture yet: a tap/click must still reach the tile button to open the lightbox.
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragRow < 0 || e.pointerId !== dragPointerId) return;
      const dx = e.clientX - dragStartX;
      if (!dragMoved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragMoved = true;
        try {
          layerEl!.setPointerCapture(e.pointerId);
        } catch {
          // capture is best-effort
        }
      }
      const row = rowState[dragRow];
      // Same offset convention as the belt formula (raw = slot*pitch + dir*offset), so a
      // rightward drag pushes tiles right regardless of the row's travel direction.
      row.offset = dragStartOffset + row.dir * dx;
      const now = performance.now();
      const dt = Math.max(now - dragLastT, 8) / 1000;
      dragVel[dragRow] = (row.dir * (e.clientX - dragLastX)) / dt;
      dragLastX = e.clientX;
      dragLastT = now;
      e.preventDefault();
    };
    const endDrag = (e: PointerEvent) => {
      if (dragRow < 0 || e.pointerId !== dragPointerId) return;
      const r = dragRow;
      dragRow = -1;
      dragPointerId = -1;
      if (dragMoved) {
        dragVel[r] = Math.max(-DRAG_MAX_VEL, Math.min(DRAG_MAX_VEL, dragVel[r]));
        suppressClickRef.current = true;
        try {
          layerEl!.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      } else {
        dragVel[r] = 0;
      }
    };
    if (layerEl) {
      layerEl.addEventListener("pointerdown", onPointerDown);
      layerEl.addEventListener("pointermove", onPointerMove, { passive: false });
    }
    // The gesture must be ENDED on window, not on the layer. Capture is deliberately deferred
    // until the move threshold (so a tap still reaches the tile button), which means a press
    // that never crosses it is never captured — release it outside the layer (past the window
    // edge, or over the fixed nav) and a layer-bound pointerup/pointercancel never fires.
    // dragRow would then stay set forever: the rAF loop eases that row to a permanent stop and
    // every later onPointerDown bails early, killing scrub site-wide until remount.
    // Listening on window catches the release wherever it lands; a captured pointer still
    // retargets to the layer and bubbles up here, and endDrag is idempotent either way.
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    // Last-resort net for the same failure: an uncaptured press released past the window edge
    // may deliver no pointer event to the document at all. Losing window focus with a gesture
    // still open means that gesture is over — drop it rather than let the row stay frozen.
    const onWindowBlur = () => {
      if (dragRow < 0) return;
      dragVel[dragRow] = 0;
      dragRow = -1;
      dragPointerId = -1;
    };
    window.addEventListener("blur", onWindowBlur);

    const tick = (now: number) => {
      if (cancelled) return;
      // Wall scrolled out of view: stop advancing and stop scheduling frames entirely.
      if (!visibleRef.current) {
        stopped = true;
        stoppedAt = now;
        raf = 0;
        return;
      }
      const L = layoutRef.current;
      const t = (now - t0) / 1000;
      // rAF stops while the tab is hidden; clamp so the first frame back doesn't jump.
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      const settling = t >= settleStart;
      if (settling) {
        const hoveredRow = hoveredRowRef.current;
        for (let r = 0; r < rows; r++) {
          if (dragRow === r) {
            // Row is being scrubbed: its offset is driven by the pointer; hold auto-scroll at 0.
            speedScales[r] += (0 - speedScales[r]) * TUNING.SPEED_EASE;
            continue;
          }
          // Fling momentum, decaying back into the ordinary belt speed.
          if (dragVel[r] !== 0) {
            rowState[r].offset += dragVel[r] * dt;
            dragVel[r] *= Math.exp(-dt * DRAG_DECAY);
            if (Math.abs(dragVel[r]) < 2) dragVel[r] = 0;
          }
          // A row stops if the whole wall is paused, or if the cursor is over that row.
          const rowPaused = pausedRef.current || hoveredRow === r;
          speedScales[r] += ((rowPaused ? 0 : 1) - speedScales[r]) * TUNING.SPEED_EASE;
          rowState[r].offset += rowState[r].speed * speedScales[r] * dt;
        }
      }

      for (let i = 0; i < total; i++) {
        const v = values[i];
        const r = Math.floor(i / L.perRow);
        const row = rowState[r] ?? rowState[0];
        const col = i % L.perRow;
        // Serpentine: each row fills in its own belt direction, so the settle
        // telegraphs which way that row is about to move.
        const slot = row.dir > 0 ? col : L.perRow - 1 - col;

        const p = clamp01((t - i * TUNING.FLY_STAGGER) / TUNING.FLY_IN);
        const u = clamp01((t - settleStart - i * TUNING.SETTLE_STAGGER) / TUNING.SETTLE);

        // Spiral position, evaluated at full extension once the fly-in finishes.
        const frac = total === 1 ? 0 : i / (total - 1);
        const rEnd = L.r0 + (L.rMax - L.r0) * frac;
        const rStart = rEnd + L.rMax * 1.7;
        const radius = rStart + (rEnd - rStart) * easeOutCubic(p);
        const theta = i * TUNING.TURN_STEP + TUNING.SWEEP * (1 - p) + TUNING.SPIN * t;
        const sx = L.cx + radius * Math.cos(theta) - L.tileW / 2;
        const sy = L.cy + radius * Math.sin(theta) * L.ellipseY - L.tileH / 2;

        if (u <= 0) {
          v.x.set(sx);
          v.y.set(sy);
          v.scale.set(0.28 + 0.72 * easeOutCubic(p));
          v.rotate.set((i % 2 ? 9 : -9) * (1 - p));
          // Ramp in late: tiles are still outside the stage early on, and the stage clips
          // vertically (a top/bottom mask would dim the settled outer rows).
          v.opacity.set(clamp01((p - 0.12) / 0.38));
          continue;
        }

        // Belt position — the actual steady-state formula, evaluated now.
        const raw = slot * L.pitch + row.dir * row.offset;
        const target = wrap(-L.tileW, row.period - L.tileW, raw);

        // If the belt wraps mid-blend, shift the source by the same delta so the
        // interpolation doesn't tear across the whole period.
        const prev = prevTarget[i];
        if (prev !== undefined && Math.abs(target - prev) > row.period / 2) {
          srcShift[i] += target - prev;
        }
        prevTarget[i] = target;

        const rowY = L.bandTop + r * (L.tileH + TUNING.GAP);
        const k = settleEase(u);
        const from = sx + srcShift[i];

        v.x.set(from + (target - from) * k);
        v.y.set(sy + (rowY - sy) * k);
        if (u < 1) {
          v.scale.set(1);
          v.rotate.set(0);
          v.opacity.set(1);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    // ── pause when offscreen ───────────────────────────────────────────────
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting ?? true;
        visibleRef.current = vis;
        // Cheap (fires on scroll-in/out only) and it lets the tiles drop their compositor
        // layers while the wall is parked offscreen — see `moving` below.
        setOnscreen(vis);
        if (vis && stopped && !cancelled) {
          stopped = false;
          // Hold the clock steady across the gap so the phase resumes cleanly.
          t0 += performance.now() - stoppedAt;
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 },
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    raf = requestAnimationFrame(tick);
    armReady(introDuration * 1000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(readyTimer);
      io.disconnect();
      window.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", onWindowBlur);
      if (layerEl) {
        layerEl.removeEventListener("pointerdown", onPointerDown);
        layerEl.removeEventListener("pointermove", onPointerMove);
      }
    };
    // Re-seeded only when the tile grid genuinely changes shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, perRow, rows, pitch]);

  /**
   * Whether the belts are genuinely animating this instant — the gate for `will-change` on the
   * tiles (see BeltTile). Every tile that carries the hint is a promoted compositor layer:
   * 3 rows x 10 at a 1440x900 viewport is 30 layers of 220x165 CSS px, ~0.58MB each at DPR 2,
   * ~17MB held for as long as the hint is applied.
   *
   * It can't simply be dropped: framer v12 writes plain 2D `translateX()/translateY()`
   * (motion-dom's buildTransform emits no translateZ), so nothing else promotes these tiles,
   * and an unpromoted tile whose transform changes every frame invalidates the full-viewport
   * layer it paints into — trading 17MB of GPU memory for a main-thread raster per frame.
   * Hoisting the hint to the tile layer instead is strictly worse: one 1440x900 layer is
   * ~20.7MB on its own, and it would not stop the 30 per-tile transform writes below it.
   *
   * So: keep the hint exactly while it earns its memory. `globalPaused` already covered the
   * pause button / focus / lightbox; adding `onscreen` is what stops ~17MB from being pinned
   * indefinitely on a page where the wall has been scrolled past — the RAF loop was already
   * suspended in that state, so the layers were being retained for an animation that wasn't
   * running. Cost: re-promoting on scroll-back can drop a frame, which lands under the wall's
   * own restart.
   */
  const moving = !globalPaused && onscreen;

  return (
    <section ref={sectionRef} className="relative w-full" style={{ height: "100svh", zIndex: 2 }}>
      {/* Heading floats over the spiral so the whole viewport reads as one immersive scene. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ top: "clamp(96px,15vh,150px)", zIndex: 3, padding: "0 clamp(24px,5vw,80px)" }}
      >
        <SectionHeading eyebrow="Through the lens" title="Photography" as="h1" />
      </div>

      {/* Tile layer: the spiral fills this (the whole screen), then collapses into the belts.
          Clipped to the viewport with a soft edge-fade so the belt seam never shows. */}
      <div
        ref={tileLayerRef}
        className="absolute inset-0"
        style={{
          overflow: "hidden",
          isolation: "isolate",
          contain: "layout paint",
          // Reserve horizontal gestures for drag-to-scrub; vertical still scrolls the page.
          // `pinch-zoom` must be listed explicitly: this layer is `absolute inset-0` over a
          // 100svh section, and the stage renders from 768px up, so on a tablet a bare `pan-y`
          // took page zoom away for a full screen height (WCAG 1.4.4). Naming it back costs the
          // drag nothing — a scrub is one pointer, and `dragRow >= 0` already refuses a second,
          // so the two-finger gesture the browser needs for a pinch is one this code never
          // claims. When the browser does take it, it fires pointercancel for the held finger,
          // which window-level endDrag treats as a normal release.
          touchAction: "pan-y pinch-zoom",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
        }}
        onMouseEnter={invalidateLayerTop}
        onMouseMove={(e) => {
          hoveredRowRef.current = rowAtY(layoutRef.current, e.clientY - layerTop());
        }}
        onMouseLeave={() => {
          hoveredRowRef.current = null;
        }}
        onClickCapture={(e) => {
          // Swallow the click that terminates a scrub so it doesn't open the lightbox.
          if (suppressClickRef.current) {
            e.stopPropagation();
            e.preventDefault();
            suppressClickRef.current = false;
          }
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {tiles.map((tile, i) => {
          const rowIndex = Math.floor(i / perRow);
          return (
            <BeltTile
              key={tile.key}
              values={values[i]}
              photo={tile.photo}
              width={tileW}
              height={tileH}
              isOriginal={tile.isOriginal}
              firstRow={i < perRow}
              moving={moving}
              depthScale={1 - rowIndex * DEPTH_SCALE_STEP}
              depthBlur={rowIndex * DEPTH_BLUR_STEP}
              onOpen={() => onOpen(tile.photoIndex)}
            />
          );
        })}
      </div>

      {/* Compact pause control (WCAG 2.2.2). Anchored to the bottom-right corner, in the empty
          area below the centred belt band, so \u2014 unlike the old full-width bar \u2014 it never
          overlaps the belts or blocks a tile click. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Play the photo wall" : "Pause the photo wall"}
        className="absolute inline-flex items-center gap-2 rounded-full font-display font-medium text-muted-portfolio transition-opacity hover:opacity-80"
        style={{
          right: "clamp(16px,4vw,40px)",
          bottom: "clamp(16px,4vh,36px)",
          zIndex: 3,
          fontSize: 12.5,
          padding: "7px 14px",
          background: "var(--portfolio-nav)",
          backdropFilter: "blur(6px)",
          border: "1px solid var(--portfolio-border)",
        }}
      >
        {paused ? <Play size={13} strokeWidth={2} /> : <Pause size={13} strokeWidth={2} />}
        {paused ? "Play" : "Pause"}
      </button>

      <p aria-live="polite" className="sr-only">
        {ready ? `Photo wall ready, ${photos.length} photos.` : ""}
      </p>
    </section>
  );
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

function BeltTile({
  values,
  photo,
  width,
  height,
  isOriginal,
  firstRow,
  moving,
  depthScale,
  depthBlur,
  onOpen,
}: {
  values: TileValues;
  photo: HobbyPhoto;
  width: number;
  height: number;
  isOriginal: boolean;
  firstRow: boolean;
  /** Belts are animating right now: onscreen and not paused. Gates the compositor hint only. */
  moving: boolean;
  depthScale: number;
  depthBlur: number;
  onOpen: () => void;
}) {
  // Accent tint (falls back to the default cool border/glow when a photo has no accent).
  const borderColor = accentTint(photo.accent, 0.42) ?? "var(--portfolio-border)";
  const glow = accentTint(photo.accent, 0.26);

  // Depth cue + accent live on an inner shell as CONSTANTS, never touched by the RAF loop —
  // the loop owns only the motion.div transform (x/y/scale/rotate) and opacity.
  const shell: React.CSSProperties = {
    width: "100%",
    height: "100%",
    ...TILE_SHELL,
    borderColor,
    boxShadow: glow
      ? `0 0 0 1px ${accentTint(photo.accent, 0.14)}, 0 8px 26px -12px ${glow}`
      : undefined,
    transform: depthScale !== 1 ? `scale(${depthScale})` : undefined,
    transformOrigin: "center",
    filter: depthBlur > 0 ? `blur(${depthBlur}px)` : undefined,
  };

  const inner = (
    <>
      <img
        src={assetUrl(photo.src)}
        alt={isOriginal ? photo.alt : ""}
        width={width}
        height={height}
        loading={firstRow ? "eager" : "lazy"}
        decoding="async"
        sizes={`${width}px`}
        fetchPriority={firstRow ? "high" : "low"}
        draggable={false}
        className="w-full h-full"
        style={{ objectFit: "cover", display: "block" }}
      />
      <span aria-hidden style={TILE_VIGNETTE} />
    </>
  );

  return (
    // NOTE: never add `layout`/`layoutId` here — framer's projection engine would
    // measure and overwrite the x/y written by the RAF loop.
    <motion.div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        x: values.x,
        y: values.y,
        scale: values.scale,
        rotate: values.rotate,
        opacity: values.opacity,
        // Promotes this tile to its own compositor layer, so keep it only while the wall is
        // actually animating (see `moving` in MotionStage — ~17MB of layers across 30 tiles).
        willChange: moving ? "transform" : undefined,
        backfaceVisibility: "hidden",
        // `manipulation` already permits pinch-zoom, so it intersects with the layer's
        // `pan-y pinch-zoom` to leave pinch working over a tile as well as between tiles.
        touchAction: "manipulation",
      }}
      {...(isOriginal ? {} : { "aria-hidden": true })}
    >
      <div style={shell}>
        {isOriginal ? (
          <button
            type="button"
            onClick={onOpen}
            tabIndex={0}
            className="relative block w-full h-full"
            style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
            aria-label={photo.caption ? `${photo.alt}. ${photo.caption}` : photo.alt}
          >
            {inner}
          </button>
        ) : (
          // Clone: a duplicate the belt needs to loop. Mouse-clickable (opens the same photo),
          // but not focusable and hidden from assistive tech (the original carries a11y/tab).
          <div
            onClick={onOpen}
            className="relative block w-full h-full"
            style={{ cursor: "pointer" }}
          >
            {inner}
          </div>
        )}
      </div>
    </motion.div>
  );
}
