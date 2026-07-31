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

import type { HobbyPhoto } from "@/data/hobbies";
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

const settleEase = cubicBezier(0.2, 0.7, 0.3, 1);
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
          <StaticGallery photos={photos} onOpen={setOpenIndex} />
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
 */
function StaticGallery({ photos, onOpen }: { photos: HobbyPhoto[]; onOpen: (i: number) => void }) {
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
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(i)}
            className="relative block w-full overflow-hidden"
            style={{ ...TILE_SHELL, aspectRatio: String(photo.aspect ?? 4 / 3) }}
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
          </button>
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

  // Hover pauses only the row under the cursor — written by pointer move, read by the RAF
  // loop, so moving the mouse never triggers a React re-render of the tile grid.
  const hoveredRowRef = useRef<number | null>(null);

  // Every belt tile: photos cycle to fill the rows. The first occurrence of each photo is
  // the "original" and is the only one exposed to assistive tech and the tab order.
  const tiles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const photoIndex = i % photos.length;
        return {
          key: `${photos[photoIndex].id}#${Math.floor(i / photos.length)}`,
          photo: photos[photoIndex],
          photoIndex,
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

    const settleStart = (total - 1) * TUNING.FLY_STAGGER + TUNING.FLY_IN + TUNING.HOLD;

    // Replay the full spiral on every visit. Reset tiles to the collapsed, invisible start
    // state so a remount (navigating away and back) always animates fresh instead of showing
    // a half-finished or stale frame — that inconsistency was the "strange lag" on revisits.
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

    const tick = (now: number) => {
      if (cancelled) return;
      const L = layoutRef.current;
      const t = (now - t0) / 1000;
      // rAF stops while the tab is hidden; clamp so the first frame back doesn't jump.
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      const settling = t >= settleStart;
      if (settling) {
        const hoveredRow = hoveredRowRef.current;
        for (let r = 0; r < rows; r++) {
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

    raf = requestAnimationFrame(tick);
    const readyTimer = setTimeout(() => setReady(true), Math.max(0, introDuration * 1000));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(readyTimer);
      window.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("wheel", onSkip);
    };
    // Re-seeded only when the tile grid genuinely changes shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, perRow, rows, pitch]);

  const moving = !globalPaused;

  return (
    <section className="relative w-full" style={{ height: "100svh", zIndex: 2 }}>
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
        className="absolute inset-0"
        style={{
          overflow: "hidden",
          isolation: "isolate",
          contain: "layout paint",
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
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {tiles.map((tile, i) => (
          <BeltTile
            key={tile.key}
            values={values[i]}
            photo={tile.photo}
            width={tileW}
            height={tileH}
            isOriginal={tile.isOriginal}
            firstRow={i < perRow}
            moving={moving}
            onOpen={() => onOpen(tile.photoIndex)}
          />
        ))}
      </div>

      {/* Pause/play pinned to the bottom of the immersive stage (WCAG 2.2.2). */}
      <div
        className="absolute inset-x-0 flex items-center justify-center"
        style={{ bottom: "clamp(24px,5vh,56px)", zIndex: 3 }}
      >
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
  onOpen,
}: {
  values: TileValues;
  photo: HobbyPhoto;
  width: number;
  height: number;
  isOriginal: boolean;
  firstRow: boolean;
  moving: boolean;
  onOpen: () => void;
}) {
  const inner = (
    <>
      <img
        src={assetUrl(photo.src)}
        alt={isOriginal ? photo.alt : ""}
        width={width}
        height={height}
        loading="eager"
        decoding="async"
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
        ...TILE_SHELL,
      }}
      {...(isOriginal ? {} : { "aria-hidden": true, inert: true })}
    >
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
    </motion.div>
  );
}
