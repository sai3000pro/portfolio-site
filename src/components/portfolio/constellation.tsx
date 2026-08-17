import { useEffect, useId, useLayoutEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, motionValue, useReducedMotion } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { X, Camera, ArrowRight } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { Project } from "@/data/portfolio";
import { KEYS } from "@/data/achievements";
import { GENERATED_IMAGES, type GeneratedImageId } from "@/data/images.generated";
import { trackMember, unlock } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
import { slugify } from "@/lib/slug";
import { useFocusTrap } from "@/hooks/use-focus-trap";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 195; // card panel width
const IMG_H = Math.round(NODE_W * (10 / 16)); // 16:10 thumbnail height ≈ 122px
const NODE_H = IMG_H + 106; // thumbnail + text area (title + desc + see more)

/**
 * Widest the modal's screenshot is ever painted: the panel caps at 860px, the media column
 * takes half of that, less its 12px padding on each side. Used only as the `sizes` hint.
 */
const MODAL_IMG_W = 400;

/**
 * Minimum **container** width (px) for the draggable constellation. Below it we render
 * a plain responsive grid of the same cards instead.
 *
 * Deliberately measured against the container (the stage / canvas `clientWidth`), never
 * `window.innerWidth`, and every comparison in this file uses that same quantity — mixing
 * the two is what previously left the 768–845px viewport band showing a constellation
 * whose physics loop had already opted out, so the cards stayed piled up. The container is
 * the viewport minus `Section`'s `clamp(24px,5vw,80px)` padding on each side, so the
 * effective viewport cutoff is roughly 845–930px. That is the right place to draw the line:
 * three 195px cards plus gaps only stop overlapping once the canvas itself is this wide.
 *
 * Matches `MOTION_MIN_WIDTH` in `hobby-belts.tsx`, which is compared the same way.
 */
const MOTION_MIN_WIDTH = 768;

// ─── Physics tunables ─────────────────────────────────────────────────────────

const AMBIENT_JITTER = 0.09; // px/frame random nudge (panels feel heavier than stars)
const MAX_AMBIENT_SPEED = 0.3; // px/frame cap
const DAMPING = 0.98; // per-frame friction
const RESTITUTION = 0.55; // energy kept on bounce / collision
const NODE_GAP = 12; // minimum gap (px) between panel edges
const THROW_SCALE = 1 / 60; // FM velocity (px/s) → px/frame
const MAX_THROW = 14; // px/frame cap
/** Release speed (px/s) that counts as a deliberate fling for Gravity Assist. */
const THROW_ACHIEVEMENT_SPEED = 900;

// ─── Edge derivation ──────────────────────────────────────────────────────────

interface Edge {
  a: number;
  b: number;
  weight: number;
}

function deriveEdges(projects: Project[]): Edge[] {
  const edges: Edge[] = [];
  for (let a = 0; a < projects.length; a++) {
    for (let b = a + 1; b < projects.length; b++) {
      const setA = new Set(projects[a].tech ?? []);
      const shared = (projects[b].tech ?? []).filter((t) => setA.has(t));
      if (shared.length > 0) edges.push({ a, b, weight: shared.length });
    }
  }
  return edges;
}

// ─── Grid seeding ─────────────────────────────────────────────────────────────

function seedGrid(
  n: number,
  W: number,
  H: number,
  mvs: Array<{ x: MotionValue<number>; y: MotionValue<number> }>,
) {
  const pad = 60;
  const cols = Math.max(2, Math.ceil(Math.sqrt(n * (W / H))));
  const rows = Math.ceil(n / cols);
  const cellW = (W - pad * 2) / cols;
  const cellH = (H - pad * 2) / rows;

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * cellW + cellW / 2;
    const cy = pad + row * cellH + cellH / 2;
    const jx = (Math.random() - 0.5) * cellW * 0.1;
    const jy = (Math.random() - 0.5) * cellH * 0.1;
    mvs[i].x.set(Math.max(0, Math.min(W - NODE_W, cx - NODE_W / 2 + jx)));
    mvs[i].y.set(Math.max(0, Math.min(H - NODE_H, cy - NODE_H / 2 + jy)));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * `<img>` attributes for a project screenshot, at the given CSS display width.
 *
 * `imageId` is set explicitly on each project in portfolio.ts and keys into the generated
 * derivatives; when it is absent (a project with an `image` but no encoded sizes yet) this
 * degrades to the committed original, so nothing disappears.
 *
 * Both call sites below used to pass `project.image` straight to `src`. Those paths are
 * bare and document-relative, so they 404 under the GitHub Pages base path — everything
 * that reaches the DOM goes through `assetUrl()`.
 */
function projectImageProps(image: string, imageId: GeneratedImageId | undefined, sizes: string) {
  const generated = imageId ? GENERATED_IMAGES[imageId] : undefined;
  // Smallest source doubles as the `src` fallback; `width`/`height` come from it so the
  // browser reserves the right aspect box before the bytes land (CLS).
  const smallest = generated?.sources[0];
  return {
    src: assetUrl(smallest?.src ?? image),
    srcSet: generated?.sources.map((s) => `${assetUrl(s.src)} ${s.width}w`).join(", "),
    sizes: generated ? sizes : undefined,
    width: smallest?.width,
    height: smallest?.height,
  };
}

// Returns the point where a ray from the card's centre toward (tx, ty) exits the card border.
function cardBorderPoint(cardX: number, cardY: number, tx: number, ty: number) {
  const cx = cardX + NODE_W / 2;
  const cy = cardY + NODE_H / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const tHit = Math.min(
    NODE_W / 2 / Math.abs(dx) || Infinity,
    NODE_H / 2 / Math.abs(dy) || Infinity,
  );
  return { x: cx + dx * tHit, y: cy + dy * tHit };
}

// ─── StrandLayer ──────────────────────────────────────────────────────────────

/**
 * Corona approximation. Each entry is one stroked pass over the same geometry:
 * `dw` px added to the base width, `o` multiplied into the base opacity.
 *
 * This replaces an SVG `feGaussianBlur` (σ=5, alpha ×2.2) that used to hang off every
 * strand. A filter's cached raster is invalidated by *any* geometry change, so with the
 * lines moving every frame all 20 filter regions — each 260% of a strand's bounding box
 * over a ~1180×780 canvas — were re-rasterized 60×/s, on the CPU in most browsers. Three
 * concentric translucent strokes cost a plain stroke each and never touch a filter.
 *
 * Widths/opacities are tuned so the summed alpha profile tracks the old Gaussian's:
 * roughly ±10px of reach, brightest at the centre, fading to nothing at the edge. The
 * visible difference is that the falloff is now piecewise rather than smooth — at these
 * opacities (the outermost pass tops out around 0.2 alpha) the banding is not perceptible
 * against the canvas gradient, but a fair description is "very close, not identical".
 */
const HALO_PASSES = [
  { dw: 17, o: 0.26 },
  { dw: 8, o: 0.44 },
  { dw: 2.5, o: 0.78 },
];

/** Same trick, much tighter, standing in for the old σ=0.7 shimmer on the core thread. */
const CORE_PASSES = [
  { dw: 2.4, o: 0.3 },
  { dw: 0, o: 1 },
];

function StrandLayer({
  edges,
  motionValues,
  activeNode,
}: {
  edges: Edge[];
  motionValues: Array<{ x: MotionValue<number>; y: MotionValue<number> }>;
  activeNode: number | null;
}) {
  // One <line> per edge holds the geometry; every visual pass is a <use> of it, so a frame
  // writes 4 attributes per edge no matter how many strokes are layered on top.
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  // Sanitised so the value is safe to interpolate into an href fragment.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const dirty = new Set<number>();
    let scheduled = false;
    let disposed = false;

    const draw = (i: number) => {
      const el = lineRefs.current[i];
      if (!el) return;
      const edge = edges[i];
      const ax = motionValues[edge.a].x.get();
      const ay = motionValues[edge.a].y.get();
      const bx = motionValues[edge.b].x.get();
      const by = motionValues[edge.b].y.get();
      const ptA = cardBorderPoint(ax, ay, bx + NODE_W / 2, by + NODE_H / 2);
      const ptB = cardBorderPoint(bx, by, ax + NODE_W / 2, ay + NODE_H / 2);
      el.setAttribute("x1", String(ptA.x));
      el.setAttribute("y1", String(ptA.y));
      el.setAttribute("x2", String(ptB.x));
      el.setAttribute("y2", String(ptB.y));
    };

    /**
     * Each edge listens to four motion values and all four change on every physics frame,
     * so writing straight from the subscription redrew each edge four times a frame. Now a
     * change only marks the edge dirty and one drain does the writing.
     *
     * The drain is a microtask, not a rAF. The physics loop sets every node's x and y (and
     * then resolves collisions) in one synchronous block, and framer's drag handler sets x
     * and y together the same way, so a microtask fires exactly once per burst — the same
     * coalescing a rAF would give — but it still lands inside the frame that moved the
     * cards, rather than trailing it by one. It also reads *settled* positions, since
     * collision resolution has finished by the time it runs.
     */
    const flush = () => {
      scheduled = false;
      if (disposed) return;
      dirty.forEach(draw);
      dirty.clear();
    };

    const unsubs: Array<() => void> = [];

    edges.forEach((edge, i) => {
      const mark = () => {
        dirty.add(i);
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(flush);
      };
      unsubs.push(
        motionValues[edge.a].x.on("change", mark),
        motionValues[edge.a].y.on("change", mark),
        motionValues[edge.b].x.on("change", mark),
        motionValues[edge.b].y.on("change", mark),
      );
      draw(i);
    });

    return () => {
      disposed = true;
      unsubs.forEach((u) => u());
    };
  }, [edges, motionValues]);

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 0,
      }}
    >
      <defs>
        {edges.map((edge, i) => (
          <line
            key={`geo-${edge.a}-${edge.b}`}
            id={`${uid}-strand-${i}`}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            strokeLinecap="round"
          />
        ))}
      </defs>

      {/* Glow pass — outer corona, painted behind the cores. `stroke`, `stroke-width` and
          `stroke-opacity` are inherited presentation properties and the referenced <line>
          sets none of them, so each <use> paints the shared geometry in its own weight. */}
      {edges.map((edge, i) => {
        const isActive = activeNode !== null && (edge.a === activeNode || edge.b === activeNode);
        const alpha = isActive
          ? Math.min(0.28 + edge.weight * 0.1, 0.68)
          : 0.09 + edge.weight * 0.035;
        const width = isActive ? edge.weight * 1.4 + 4.5 : edge.weight * 0.75 + 2;

        return HALO_PASSES.map((pass) => (
          <use
            key={`glow-${edge.a}-${edge.b}-${pass.dw}`}
            href={`#${uid}-strand-${i}`}
            style={{
              stroke: "var(--portfolio-accent)",
              strokeWidth: width + pass.dw,
              strokeOpacity: alpha * pass.o,
            }}
          />
        ));
      })}

      {/* Core pass — near-white starlight thread on top */}
      {edges.map((edge, i) => {
        const isActive = activeNode !== null && (edge.a === activeNode || edge.b === activeNode);
        const alpha = isActive
          ? Math.min(0.7 + edge.weight * 0.08, 0.96)
          : 0.22 + edge.weight * 0.06;
        const width = isActive ? edge.weight * 0.45 + 0.9 : edge.weight * 0.28 + 0.45;

        return CORE_PASSES.map((pass) => (
          <use
            key={`core-${edge.a}-${edge.b}-${pass.dw}`}
            href={`#${uid}-strand-${i}`}
            style={{
              stroke: "var(--portfolio-ink)",
              strokeWidth: width + pass.dw,
              strokeOpacity: alpha * pass.o,
            }}
          />
        ));
      })}
    </svg>
  );
}

// ─── Shared card chrome ───────────────────────────────────────────────────────
// The draggable canvas node and the static grid card render the SAME face, so the two
// presentations cannot drift apart: only the outer shell (absolutely positioned + drag
// vs. a grid cell that is itself a <button>) and the thumbnail sizing differ.

const CARD_SHELL: React.CSSProperties = {
  borderRadius: 14,
  overflow: "hidden",
  background: "var(--portfolio-panel)",
  border: "1px solid var(--portfolio-border)",
  boxShadow: "0 2px 12px var(--portfolio-shadow)",
};

const CARD_VIGNETTE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, transparent 45%, rgba(2,10,26,0.72))",
};

const SEE_MORE_STYLE: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 600,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

function ProjectCardFace({
  project,
  thumbStyle,
  onSeeMore,
}: {
  project: Project;
  /** Thumbnail sizing: a fixed `IMG_H` on the canvas, a fluid 16:10 box in the static grid. */
  thumbStyle: React.CSSProperties;
  /**
   * Canvas node: renders a real "See more" button. Static card: omitted, because the whole
   * card is already the button and a nested button would be invalid.
   */
  onSeeMore?: () => void;
}) {
  const isWinner = project.winner === true;

  return (
    <>
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          flexShrink: 0,
          ...thumbStyle,
        }}
      >
        {project.image ? (
          <img
            {...projectImageProps(project.image, project.imageId, `${NODE_W}px`)}
            alt={project.title}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #0a4f99, #05213f)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              className="font-display font-bold text-white/90 text-center on-dark"
              style={{ fontSize: 15, padding: "0 12px", lineHeight: 1.25 }}
            >
              {project.title}
            </span>
          </div>
        )}
        {/* Gradient vignette */}
        <div aria-hidden="true" style={CARD_VIGNETTE} />
        {isWinner && (
          <span
            className="absolute top-2 left-2 font-display font-bold uppercase rounded-full"
            style={{
              fontSize: 9.5,
              letterSpacing: 0.7,
              padding: "3px 9px",
              color: "#021024",
              background: "linear-gradient(180deg,#ffe27a,#f5c542)",
              boxShadow: "0 0 12px rgba(245,197,66,0.5)",
            }}
          >
            ★ Winner
          </span>
        )}
      </div>

      {/* Text area */}
      <div style={{ padding: "12px 14px 14px" }}>
        <h3
          className="font-display font-semibold text-ink"
          style={{
            fontSize: 14,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={project.title}
        >
          {project.title}
        </h3>
        <p
          className="text-muted-portfolio"
          style={
            {
              fontSize: 12,
              lineHeight: 1.55,
              marginTop: 4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as React.CSSProperties
          }
        >
          {project.tagline ?? project.description}
        </p>
        <div style={{ marginTop: 10, textAlign: "right" }}>
          {onSeeMore ? (
            <button
              type="button"
              className="font-display text-accent-bright"
              style={SEE_MORE_STYLE}
              onClick={(e) => {
                e.stopPropagation();
                onSeeMore();
              }}
              aria-label={`See more about ${project.title}`}
            >
              See more →
            </button>
          ) : (
            <span className="font-display text-accent-bright" style={SEE_MORE_STYLE}>
              See more →
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ProjectNode (draggable card panel) ───────────────────────────────────────

function ProjectNode({
  project,
  mx,
  my,
  canvasRef,
  isActive,
  reducedMotion,
  onDragStart,
  onDragEnd,
  onClick,
  onHover,
}: {
  project: Project;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  reducedMotion: boolean;
  onDragStart: () => void;
  onDragEnd: (vel: { x: number; y: number }) => void;
  onClick: () => void;
  onHover: (on: boolean) => void;
}) {
  return (
    <motion.div
      style={{
        ...CARD_SHELL,
        x: mx,
        y: my,
        position: "absolute",
        top: 0,
        left: 0,
        width: NODE_W,
        zIndex: 1,
        border: `1px solid ${
          isActive ? "var(--portfolio-border-strong)" : "var(--portfolio-border)"
        }`,
        boxShadow: isActive
          ? "0 8px 32px rgba(93,182,255,0.18), 0 2px 8px var(--portfolio-shadow)"
          : "0 2px 12px var(--portfolio-shadow)",
        cursor: "grab",
        userSelect: "none",
        touchAction: "manipulation",
        transition: reducedMotion ? "none" : "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={canvasRef}
      whileDrag={{ scale: 1.04, zIndex: 10, cursor: "grabbing" }}
      whileHover={{ scale: 1.02 }}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info.velocity)}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
    >
      <ProjectCardFace project={project} thumbStyle={{ height: IMG_H }} onSeeMore={onClick} />
    </motion.div>
  );
}

// ─── StaticProjectGrid ────────────────────────────────────────────────────────

/**
 * Rendered below `MOTION_MIN_WIDTH` and — because the branch is only decided after mount —
 * it is also what the server prerenders and what the first client render produces. That is
 * what keeps SSR and hydration in agreement, and it means crawlers get real card markup
 * instead of an empty canvas waiting on measurement.
 *
 * Each card is a single real <button> in natural document order (no positive tabIndex), so
 * the grid is fully keyboard-operable. A gentle entry stagger plays unless the visitor has
 * asked for reduced motion.
 */
function StaticProjectGrid({
  projects,
  reduced,
  onOpen,
}: {
  projects: Project[];
  reduced: boolean;
  onOpen: (project: Project) => void;
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))",
        gap: 16,
      }}
    >
      {projects.map((project, i) => (
        <motion.button
          key={project.title}
          type="button"
          onClick={() => onOpen(project)}
          className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{
            ...CARD_SHELL,
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
          aria-label={`See more about ${project.title}${
            project.winner === true ? " (hackathon winner)" : ""
          }`}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduced ? undefined : { duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease: "easeOut" }
          }
        >
          <ProjectCardFace project={project} thumbStyle={{ aspectRatio: "16 / 10" }} />
        </motion.button>
      ))}
    </div>
  );
}

// ─── ProjectModal ─────────────────────────────────────────────────────────────

function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, project !== null);

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [project, onClose]);

  const photos = (project?.photos ?? []).slice(0, 2);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: "var(--portfolio-scrim)", padding: "clamp(16px,4vw,40px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
        >
          <motion.div
            ref={panelRef}
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              maxWidth: 860,
              maxHeight: "88vh",
              background: "var(--portfolio-panel)",
              border: "1px solid var(--portfolio-border-strong)",
              boxShadow: "0 30px 80px var(--portfolio-shadow)",
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid place-items-center rounded-full transition-opacity hover:opacity-80"
              style={{
                width: 36,
                height: 36,
                background: "var(--portfolio-panel-deep)",
                border: "1px solid var(--portfolio-border)",
                color: "var(--portfolio-muted)",
              }}
            >
              <X size={18} />
            </button>

            {/* Focusable so a keyboard-only visitor can scroll the overflow with the arrow
                keys; a scrollable region that only a pointer can reach is a WCAG 2.1.1
                failure. Focusable means it needs a name, hence the role + label pairing. */}
            <div
              tabIndex={0}
              role="group"
              aria-labelledby="project-modal-title"
              style={{ maxHeight: "88vh", overflowY: "auto", overflowX: "hidden" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left — media */}
                <div className="flex flex-col gap-3 p-3">
                  {project.image ? (
                    <img
                      {...projectImageProps(project.image, project.imageId, `${MODAL_IMG_W}px`)}
                      alt={project.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full rounded-xl object-cover object-top"
                      style={{ aspectRatio: "4 / 3" }}
                    />
                  ) : photos.length > 0 ? (
                    photos.map((src, i) => (
                      <img
                        key={src}
                        // Same rule as projectImageProps above: `photos` entries are bare,
                        // document-relative paths and 404 under the Pages base path unless
                        // they go through assetUrl(). This branch only renders for a project
                        // with photos and no `image`, so the miss went unseen — every project
                        // has an `image` today.
                        src={assetUrl(src)}
                        alt={`${project.title} — ${i + 1}`}
                        loading="lazy"
                        className="w-full rounded-xl object-cover"
                        style={{ aspectRatio: photos.length === 2 ? "4 / 3" : "3 / 4" }}
                      />
                    ))
                  ) : (
                    <div
                      className="flex-1 rounded-xl grid place-items-center"
                      style={{
                        aspectRatio: "3 / 4",
                        background: "linear-gradient(135deg, #0a4f99, #05213f)",
                      }}
                    >
                      {project.winner ? (
                        <span
                          className="font-display font-bold rounded-full"
                          style={{
                            fontSize: 11,
                            letterSpacing: 1,
                            padding: "5px 11px",
                            color: "#021024",
                            background: "linear-gradient(180deg,#ffe27a,#f5c542)",
                            boxShadow: "0 0 16px rgba(245,197,66,0.5)",
                          }}
                        >
                          ★ Winner
                        </span>
                      ) : (
                        <div
                          className="flex flex-col items-center gap-2 text-muted-portfolio on-dark"
                          style={{ fontSize: 13 }}
                        >
                          <Camera size={22} />
                          Photos coming soon
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right — info */}
                <div
                  className="flex flex-col justify-center"
                  style={{ padding: "clamp(22px,3vw,34px)" }}
                >
                  {project.winner && (
                    <span
                      className="font-display font-bold"
                      style={{
                        // Sits directly on the panel ground, so it has to clear AA in both
                        // themes; the literal #f5c518 measured 1.63:1 on the light theme.
                        // (The winner pill below keeps its bright gradient — it carries its
                        // own dark-on-gold fill and is not on the page ground.)
                        color: "var(--portfolio-gold)",
                        fontSize: 12,
                        letterSpacing: 0.5,
                        marginBottom: 6,
                      }}
                    >
                      ★ Hackathon Winner
                    </span>
                  )}
                  <h3
                    id="project-modal-title"
                    className="font-display font-extrabold text-ink"
                    style={{ fontSize: "clamp(22px,3vw,30px)", lineHeight: 1.1, margin: 0 }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className="text-muted-portfolio mt-4"
                    style={{ fontSize: 15.5, lineHeight: 1.75 }}
                  >
                    {project.details ?? project.description}
                  </p>

                  {project.tech && project.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {project.tech.map((t) => (
                        <span
                          key={t}
                          className="font-display text-accent-bright"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 9px",
                            borderRadius: 6,
                            background: "var(--portfolio-surface-2)",
                            border: "1px solid var(--portfolio-border)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                      to="/projects/$slug"
                      params={{ slug: slugify(project.title) }}
                      className="font-display font-semibold no-underline inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                      style={{
                        fontSize: 13,
                        padding: "8px 18px",
                        borderRadius: 8,
                        color: "#021024",
                        background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
                        boxShadow: "0 6px 20px rgba(47,155,255,0.35)",
                      }}
                    >
                      Read case study <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a
                      href={assetUrl(project.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display font-semibold no-underline text-accent-bright transition-opacity hover:opacity-80"
                      style={{
                        fontSize: 13,
                        padding: "8px 18px",
                        borderRadius: 8,
                        background: "var(--portfolio-surface-2)",
                        border: "1px solid var(--portfolio-border-strong)",
                      }}
                    >
                      {project.cta ?? "View on Devpost →"}
                    </a>
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display font-semibold no-underline text-muted-portfolio transition-opacity hover:opacity-80"
                        style={{
                          fontSize: 13,
                          padding: "8px 18px",
                          borderRadius: 8,
                          background: "var(--portfolio-surface)",
                          border: "1px solid var(--portfolio-border)",
                        }}
                      >
                        GitHub →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ConstellationCanvas ──────────────────────────────────────────────────────

export function ConstellationCanvas({ projects }: { projects: Project[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const [activeNode, setActiveNode] = useState<number | null>(null);

  // ── Deep-linking: mirror the open modal in the URL (?p=<slug>) ────────────────
  // The URL is the single source of truth for "which modal is open". Node clicks
  // and the close button only mutate the query string; the effect below opens or
  // closes the modal to match, so shared links and the browser Back button both
  // behave correctly.
  const navigate = useNavigate();
  const pParam = useRouterState({
    select: (s) => (s.location.search as { p?: string }).p,
  });

  const handleOpen = useCallback(
    (project: Project) => {
      trackMember(KEYS.projectModals, slugify(project.title));
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, p: slugify(project.title) }),
        resetScroll: false,
      });
    },
    [navigate],
  );

  const handleClose = useCallback(() => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, p: undefined }),
      resetScroll: false,
    });
  }, [navigate]);

  useEffect(() => {
    if (!pParam) {
      setOpenProject((cur) => (cur === null ? cur : null));
      return;
    }
    const match = projects.find((p) => slugify(p.title) === pParam) ?? null;
    setOpenProject((cur) => (cur === match ? cur : match));
  }, [pParam, projects]);

  // Framer's own hook: SSR-safe (null before mount) and it re-renders when the OS
  // preference changes, which a one-shot `matchMedia(...).matches` read never did.
  const reducedMotion = useReducedMotion() === true;

  // Which branch to render. `false` on the server AND on the first client render, so the
  // prerendered HTML (the static grid) always matches what hydration produces — the width
  // is only measured afterwards, in the layout effect below.
  const [animated, setAnimated] = useState(false);

  // Decided after mount from the CONTAINER width (see MOTION_MIN_WIDTH).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let frame = 0;
    const measure = () => setAnimated(stage.clientWidth >= MOTION_MIN_WIDTH);

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(stage);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  // Motion values created once via factory — outside React renders.
  const mvsRef = useRef<Array<{ x: MotionValue<number>; y: MotionValue<number> }> | null>(null);
  if (!mvsRef.current) {
    mvsRef.current = projects.map(() => ({ x: motionValue(0), y: motionValue(0) }));
  }
  const mvs = mvsRef.current;

  const edges = useRef(deriveEdges(projects)).current;

  // Physics state in refs — never causes React re-renders.
  const vels = useRef(projects.map(() => ({ vx: 0, vy: 0 })));
  const dragging = useRef(new Set<number>());

  /**
   * Live canvas size, fed by the ResizeObserver below.
   *
   * The physics loop used to read `canvas.clientWidth` / `clientHeight` at the top of every
   * frame. Framer writes transforms to the very same subtree, so each frame was a
   * write-then-read on dirtied layout — a forced synchronous reflow 60×/s. The observer
   * already knows these numbers; the loop just reads them from here.
   */
  const canvasSize = useRef({ w: 0, h: 0 });

  // ── Seed on first measurement, rescale proportionally on resize ──────────────
  // Re-runs whenever the canvas mounts, i.e. each time the stage crosses MOTION_MIN_WIDTH.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let prevW = 0;
    let prevH = 0;

    const ro = new ResizeObserver(([entry]) => {
      const W = entry.contentRect.width;
      const H = entry.contentRect.height;
      if (W === 0 || H === 0) return;

      // The canvas has no padding, so the content box is exactly what `clientWidth` /
      // `clientHeight` used to report — the physics loop reads this instead of the DOM.
      canvasSize.current = { w: W, h: H };

      if (prevW === 0) {
        seedGrid(projects.length, W, H, mvs);
      } else if (W !== prevW || H !== prevH) {
        const sx = W / prevW;
        const sy = H / prevH;
        mvs.forEach((mv) => {
          mv.x.set(Math.max(0, Math.min(W - NODE_W, mv.x.get() * sx)));
          mv.y.set(Math.max(0, Math.min(H - NODE_H, mv.y.get() * sy)));
        });
      }

      prevW = W;
      prevH = H;
    });

    ro.observe(canvas);
    return () => {
      ro.disconnect();
      // Stale dimensions must not survive into the next canvas mount; the loop treats
      // a zero width as "not measured yet" and idles.
      canvasSize.current = { w: 0, h: 0 };
    };
  }, [animated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Physics RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion || !animated) return;

    let rafId: number;

    const tick = () => {
      const { w: W, h: H } = canvasSize.current;

      // Same container-width comparison as the branch decision above — a narrow canvas can
      // outlive a stage resize by a frame or two, and the cards must not drift while it does.
      // A width of 0 (not yet measured) also lands here, so the loop idles until it is.
      if (W < MOTION_MIN_WIDTH) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const maxX = W - NODE_W;
      const maxY = H - NODE_H;
      const n = projects.length;
      const v = vels.current;

      // Per-node: ambient drift + wall bounce.
      for (let i = 0; i < n; i++) {
        if (dragging.current.has(i)) continue;

        let { vx, vy } = v[i];
        let x = mvs[i].x.get();
        let y = mvs[i].y.get();

        // Only add ambient jitter (and cap it) when the node is drifting slowly.
        // A thrown node has speed >> MAX_AMBIENT_SPEED and must not be capped here.
        const spd = Math.sqrt(vx * vx + vy * vy);
        if (spd <= MAX_AMBIENT_SPEED) {
          vx += (Math.random() - 0.5) * AMBIENT_JITTER;
          vy += (Math.random() - 0.5) * AMBIENT_JITTER;
          const spd2 = Math.sqrt(vx * vx + vy * vy);
          if (spd2 > MAX_AMBIENT_SPEED) {
            vx = (vx / spd2) * MAX_AMBIENT_SPEED;
            vy = (vy / spd2) * MAX_AMBIENT_SPEED;
          }
        }

        vx *= DAMPING;
        vy *= DAMPING;
        x += vx;
        y += vy;

        if (x < 0) {
          x = 0;
          vx = Math.abs(vx) * RESTITUTION;
        } else if (x > maxX) {
          x = maxX;
          vx = -Math.abs(vx) * RESTITUTION;
        }
        if (y < 0) {
          y = 0;
          vy = Math.abs(vy) * RESTITUTION;
        } else if (y > maxY) {
          y = maxY;
          vy = -Math.abs(vy) * RESTITUTION;
        }

        v[i] = { vx, vy };
        mvs[i].x.set(x);
        mvs[i].y.set(y);
      }

      // AABB collision — separate along axis of minimum penetration.
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const ax = mvs[a].x.get();
          const ay = mvs[a].y.get();
          const bx = mvs[b].x.get();
          const by = mvs[b].y.get();

          const dx = bx + NODE_W / 2 - (ax + NODE_W / 2);
          const dy = by + NODE_H / 2 - (ay + NODE_H / 2);
          const overlapX = NODE_W + NODE_GAP - Math.abs(dx);
          const overlapY = NODE_H + NODE_GAP - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            const aDrag = dragging.current.has(a);
            const bDrag = dragging.current.has(b);
            const pushA = aDrag ? 0 : bDrag ? 1 : 0.5;
            const pushB = bDrag ? 0 : aDrag ? 1 : 0.5;
            const sx = dx >= 0 ? 1 : -1;
            const sy = dy >= 0 ? 1 : -1;

            if (overlapX < overlapY) {
              if (!aDrag) mvs[a].x.set(Math.max(0, Math.min(maxX, ax - sx * overlapX * pushA)));
              if (!bDrag) mvs[b].x.set(Math.max(0, Math.min(maxX, bx + sx * overlapX * pushB)));
              const relVx = v[a].vx - v[b].vx;
              if (relVx * sx > 0) {
                const imp = relVx * RESTITUTION;
                if (!aDrag) v[a].vx -= sx * imp * pushA * 2;
                if (!bDrag) v[b].vx += sx * imp * pushB * 2;
              }
            } else {
              if (!aDrag) mvs[a].y.set(Math.max(0, Math.min(maxY, ay - sy * overlapY * pushA)));
              if (!bDrag) mvs[b].y.set(Math.max(0, Math.min(maxY, by + sy * overlapY * pushB)));
              const relVy = v[a].vy - v[b].vy;
              if (relVy * sy > 0) {
                const imp = relVy * RESTITUTION;
                if (!aDrag) v[a].vy -= sy * imp * pushA * 2;
                if (!bDrag) v[b].vy += sy * imp * pushB * 2;
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion, animated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = useCallback((i: number) => {
    dragging.current.add(i);
  }, []);

  const handleDragEnd = useCallback((i: number, vel: { x: number; y: number }) => {
    dragging.current.delete(i);
    // A genuine fling, not a nudge — the cards are a physics toy and almost
    // nobody realises it until they throw one.
    if (Math.hypot(vel.x, vel.y) >= THROW_ACHIEVEMENT_SPEED) unlock("gravity-assist");
    vels.current[i] = {
      vx: Math.max(-MAX_THROW, Math.min(MAX_THROW, vel.x * THROW_SCALE)),
      vy: Math.max(-MAX_THROW, Math.min(MAX_THROW, vel.y * THROW_SCALE)),
    };
  }, []);

  return (
    <>
      {/* The stage is always rendered and always measurable; only its contents swap. */}
      <div ref={stageRef} className="relative mt-12 w-full">
        {animated ? (
          <div
            ref={canvasRef}
            style={{
              position: "relative",
              width: "100%",
              height: "clamp(600px, 75vh, 780px)",
              overflow: "hidden",
              borderRadius: 18,
              background:
                "radial-gradient(ellipse at 50% 55%, rgba(10,79,153,0.12) 0%, transparent 68%)",
              border: "1px solid var(--portfolio-border)",
            }}
          >
            <StrandLayer edges={edges} motionValues={mvs} activeNode={activeNode} />

            {projects.map((project, i) => (
              <ProjectNode
                key={project.title}
                project={project}
                mx={mvs[i].x}
                my={mvs[i].y}
                canvasRef={canvasRef}
                isActive={activeNode === i}
                reducedMotion={reducedMotion}
                onDragStart={() => handleDragStart(i)}
                onDragEnd={(vel) => handleDragEnd(i, vel)}
                onClick={() => handleOpen(project)}
                // Dragging the pointer straight from one card onto another fires B's
                // hover-start before A's hover-end, so an unconditional `null` on exit
                // would blank out the highlight B just claimed. Only clear if still ours.
                onHover={(on) => setActiveNode((cur) => (on ? i : cur === i ? null : cur))}
              />
            ))}
          </div>
        ) : (
          <StaticProjectGrid projects={projects} reduced={reducedMotion} onOpen={handleOpen} />
        )}
      </div>

      <ProjectModal project={openProject} onClose={handleClose} />
    </>
  );
}
