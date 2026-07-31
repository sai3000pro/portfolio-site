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
import { Pause, Play, Shuffle } from "lucide-react";

import type { HobbyPhoto, HobbyTag } from "@/data/hobbies";
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
  /** Global rotation of the whole formation, rad/s. */
  SPIN: -0.22,

  FLY_IN: 1.05,
  FLY_STAGGER: 0.035,
  HOLD: 0.6,
  SETTLE: 0.9,
  SETTLE_STAGGER: 0.022,

  /** Per-row belt speeds in px/s; index wraps. Slight variation reads as depth. */
  ROW_SPEEDS: [26, 22, 30],
  GAP: 16,
  /** Belts spin up/down over ~200ms rather than snapping. */
  SPEED_EASE: 0.08,
} as const;

const MOTION_MIN_WIDTH = 768;
const THREE_ROW_MIN_WIDTH = 1024;

/** Opacity applied to tiles whose hobby doesn't match the active tag filter. */
const DIM_OPACITY = 0.14;
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

  return (
    <>
      <div ref={stageRef} className="relative w-full">
        {layout && !reduced ? (
          <MotionStage
            photos={photos}
            layout={layout}
            lightboxOpen={openIndex !== null}
            onOpen={setOpenIndex}
          />
        ) : (
          <StaticGallery photos={photos} reduced={!!reduced} onOpen={setOpenIndex} />
        )}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <HobbyLightbox
            photos={photos}
            index={openIndex}
            onClose={close}
            onNavigate={setOpenIndex}
          />
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
      <SectionHeading eyebrow="Off the clock" title="Hobbies" as="h1" />
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
              borderColor: accentTint(photo.accent, 0.4) ?? "rgba(93,182,255,0.17)",
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
              loading="lazy"
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
  // Bumped by Shuffle; included in the RAF effect deps so the full spiral intro replays.
  const [runId, setRunId] = useState(0);
  // A permutation of photo indices — the tile→photo assignment. Shuffle reshuffles it.
  const [order, setOrder] = useState<number[]>(() => photos.map((_, i) => i));
  // Active tag filter (dim non-matching tiles). null = show everything.
  const [activeTag, setActiveTag] = useState<HobbyTag | null>(null);

  // Keep `order` sized to the photo set if the prop ever changes shape.
  useEffect(() => {
    setOrder((prev) => (prev.length === photos.length ? prev : photos.map((_, i) => i)));
  }, [photos]);

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

  // The distinct hobbies present, in first-seen order — the tag legend near the controls.
  const tags = useMemo(() => Array.from(new Set(photos.map((p) => p.hobby))), [photos]);

  // Every belt tile: photos cycle to fill the rows following the shuffled `order`. The first
  // occurrence of each photo is the "original" — the only one in the tab order / a11y tree.
  const tiles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const slot = i % photos.length;
        const originalIndex = order[slot] ?? slot;
        const photo = photos[originalIndex];
        return {
          key: `${photo.id}#${Math.floor(i / photos.length)}`,
          photo,
          photoIndex: originalIndex,
          isOriginal: i < photos.length,
        };
      }),
    [total, photos, order],
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

  // Global pause: the button, keyboard focus, and the open lightbox freeze every belt.
  // Per-row hover pausing is handled separately, inside the RAF loop.
  const globalPaused = paused || focused || lightboxOpen;
  const pausedRef = useRef(false);
  pausedRef.current = globalPaused;

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

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

    const settleStart = (total - 1) * TUNING.FLY_STAGGER + TUNING.FLY_IN + TUNING.HOLD;

    // Replay the full spiral on every visit / shuffle. Reset tiles to the collapsed, invisible
    // start state so a remount (or reshuffle) always animates fresh instead of showing a
    // half-finished or stale frame — that inconsistency was the "strange lag" on revisits.
    for (const v of values) {
      v.scale.set(0.28);
      v.opacity.set(0);
      v.rotate.set(0);
    }

    // A deliberate pointer/scroll gesture still skips straight to the conveyor.
    const skip = () => {
      t0 = performance.now() - introDuration * 1000;
      speedScales.fill(1);
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
      const rect = layerEl!.getBoundingClientRect();
      const r = rowAtY(L, e.clientY - rect.top);
      if (r === null) return;
      dragRow = r;
      dragStartX = e.clientX;
      dragStartOffset = rowState[r].offset;
      dragLastX = e.clientX;
      dragLastT = performance.now();
      dragMoved = false;
      dragVel[r] = 0;
      // Don't capture yet: a tap/click must still reach the tile button to open the lightbox.
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragRow < 0) return;
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
      if (dragRow < 0) return;
      const r = dragRow;
      dragRow = -1;
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
      layerEl.addEventListener("pointerup", endDrag);
      layerEl.addEventListener("pointercancel", endDrag);
    }

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
    const readyTimer = setTimeout(
      () => {
        readyRef.current = true;
        setReady(true);
      },
      Math.max(0, introDuration * 1000),
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(readyTimer);
      io.disconnect();
      window.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("wheel", onSkip);
      if (layerEl) {
        layerEl.removeEventListener("pointerdown", onPointerDown);
        layerEl.removeEventListener("pointermove", onPointerMove);
        layerEl.removeEventListener("pointerup", endDrag);
        layerEl.removeEventListener("pointercancel", endDrag);
      }
    };
    // Re-seeded only when the tile grid genuinely changes shape, or Shuffle bumps runId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, perRow, rows, pitch, runId]);

  // Tag filter: dim non-matching tiles via the opacity motionValue. Safe only once the belts
  // have settled — before that the RAF loop still owns opacity. Re-applies after every replay
  // (ready flips false→true) and every reshuffle (tiles identity changes).
  useEffect(() => {
    if (!ready) return;
    for (let i = 0; i < tiles.length; i++) {
      const match = activeTag === null || tiles[i].photo.hobby === activeTag;
      values[i]?.opacity.set(match ? 1 : DIM_OPACITY);
    }
  }, [activeTag, ready, tiles, runId, values]);

  const shuffle = useCallback(() => {
    setOrder((prev) => {
      const next = prev.slice();
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setRunId((n) => n + 1);
  }, []);

  const moving = !globalPaused;

  return (
    <section ref={sectionRef} className="relative w-full" style={{ height: "100svh", zIndex: 2 }}>
      {/* Heading floats over the spiral so the whole viewport reads as one immersive scene. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ top: "clamp(96px,15vh,150px)", zIndex: 3, padding: "0 clamp(24px,5vw,80px)" }}
      >
        <SectionHeading eyebrow="Off the clock" title="Hobbies" as="h1" />
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
          touchAction: "pan-y",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          hoveredRowRef.current = rowAtY(layoutRef.current, e.clientY - rect.top);
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

      {/* Controls pinned to the bottom of the immersive stage (WCAG 2.2.2): tag legend,
          then Pause/Play + Shuffle. */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-3"
        style={{ bottom: "clamp(24px,5vh,56px)", zIndex: 3, padding: "0 clamp(16px,4vw,48px)" }}
      >
        {tags.length > 1 && (
          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            role="group"
            aria-label="Filter photos by hobby"
          >
            {tags.map((tag) => {
              const active = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
                  aria-pressed={active}
                  className="rounded-full font-display capitalize transition-colors"
                  style={{
                    fontSize: 11,
                    padding: "4px 11px",
                    color: active ? "#fff" : "rgba(203,225,255,0.66)",
                    background: active ? "rgba(47,155,255,0.22)" : "rgba(4,10,24,0.5)",
                    backdropFilter: "blur(6px)",
                    border: `1px solid ${active ? "rgba(93,182,255,0.5)" : "rgba(47,155,255,0.18)"}`,
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="inline-flex items-center gap-2 rounded-full font-display font-medium text-muted-portfolio transition-colors hover:text-white"
            style={{
              fontSize: 13,
              padding: "7px 15px",
              background: "rgba(4,10,24,0.55)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(47,155,255,0.22)",
            }}
          >
            {paused ? <Play size={14} strokeWidth={2} /> : <Pause size={14} strokeWidth={2} />}
            {paused ? "Play" : "Pause"}
          </button>

          <button
            type="button"
            onClick={shuffle}
            className="inline-flex items-center gap-2 rounded-full font-display font-medium text-muted-portfolio transition-colors hover:text-white"
            style={{
              fontSize: 13,
              padding: "7px 15px",
              background: "rgba(4,10,24,0.55)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(47,155,255,0.22)",
            }}
          >
            <Shuffle size={14} strokeWidth={2} />
            Shuffle
          </button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {ready ? `Photo wall ready, ${photos.length} photos.` : ""}
      </p>
    </section>
  );
}

/* ─────────────────────────────── tile ─────────────────────────────── */

const TILE_SHELL: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(93,182,255,0.17)",
  background: "#050c18",
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
  moving: boolean;
  depthScale: number;
  depthBlur: number;
  onOpen: () => void;
}) {
  // Accent tint (falls back to the default cool border/glow when a photo has no accent).
  const borderColor = accentTint(photo.accent, 0.42) ?? "rgba(93,182,255,0.17)";
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
        willChange: moving ? "transform" : undefined,
        backfaceVisibility: "hidden",
        touchAction: "manipulation",
      }}
      {...(isOriginal ? {} : { "aria-hidden": true, inert: true })}
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
          <span className="relative block w-full h-full">{inner}</span>
        )}
      </div>
    </motion.div>
  );
}
