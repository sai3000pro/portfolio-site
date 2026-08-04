import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, motionValue } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { X, Camera, ArrowRight } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { Project } from "@/data/portfolio";
import { KEYS } from "@/data/achievements";
import { trackMember, unlock } from "@/lib/achievements";
import { slugify } from "@/lib/slug";
import { useFocusTrap } from "@/hooks/use-focus-trap";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 195; // card panel width
const IMG_H = Math.round(NODE_W * (10 / 16)); // 16:10 thumbnail height ≈ 122px
const NODE_H = IMG_H + 106; // thumbnail + text area (title + desc + see more)

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

function StrandLayer({
  edges,
  motionValues,
  activeNode,
}: {
  edges: Edge[];
  motionValues: Array<{ x: MotionValue<number>; y: MotionValue<number> }>;
  activeNode: number | null;
}) {
  const glowRefs = useRef<(SVGLineElement | null)[]>([]);
  const coreRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    edges.forEach((edge, i) => {
      const update = () => {
        const ax = motionValues[edge.a].x.get();
        const ay = motionValues[edge.a].y.get();
        const bx = motionValues[edge.b].x.get();
        const by = motionValues[edge.b].y.get();
        const bcx = bx + NODE_W / 2;
        const bcy = by + NODE_H / 2;
        const acx = ax + NODE_W / 2;
        const acy = ay + NODE_H / 2;
        const ptA = cardBorderPoint(ax, ay, bcx, bcy);
        const ptB = cardBorderPoint(bx, by, acx, acy);
        const x1 = String(ptA.x);
        const y1 = String(ptA.y);
        const x2 = String(ptB.x);
        const y2 = String(ptB.y);
        const gl = glowRefs.current[i];
        if (gl) {
          gl.setAttribute("x1", x1);
          gl.setAttribute("y1", y1);
          gl.setAttribute("x2", x2);
          gl.setAttribute("y2", y2);
        }
        const cl = coreRefs.current[i];
        if (cl) {
          cl.setAttribute("x1", x1);
          cl.setAttribute("y1", y1);
          cl.setAttribute("x2", x2);
          cl.setAttribute("y2", y2);
        }
      };

      unsubs.push(
        motionValues[edge.a].x.on("change", update),
        motionValues[edge.a].y.on("change", update),
        motionValues[edge.b].x.on("change", update),
        motionValues[edge.b].y.on("change", update),
      );

      update();
    });

    return () => unsubs.forEach((u) => u());
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
        {/* Wide soft corona — the outer "trail" bloom */}
        <filter id="cst-bloom" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1.2 0 0  0 0 0 2.2 0"
            result="boosted"
          />
          <feMerge>
            <feMergeNode in="boosted" />
          </feMerge>
        </filter>
        {/* Tight shimmer on the bright core line */}
        <filter id="cst-core" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow pass — outer corona, painted behind the cores */}
      {edges.map((edge, i) => {
        const isActive = activeNode !== null && (edge.a === activeNode || edge.b === activeNode);
        const alpha = isActive
          ? Math.min(0.28 + edge.weight * 0.1, 0.68)
          : 0.09 + edge.weight * 0.035;
        const width = isActive ? edge.weight * 1.4 + 4.5 : edge.weight * 0.75 + 2;

        return (
          <line
            key={`glow-${edge.a}-${edge.b}`}
            ref={(el) => {
              glowRefs.current[i] = el;
            }}
            strokeWidth={width}
            strokeLinecap="round"
            filter="url(#cst-bloom)"
            style={{ stroke: "var(--portfolio-accent)", strokeOpacity: alpha }}
          />
        );
      })}

      {/* Core pass — near-white starlight thread on top */}
      {edges.map((edge, i) => {
        const isActive = activeNode !== null && (edge.a === activeNode || edge.b === activeNode);
        const alpha = isActive
          ? Math.min(0.7 + edge.weight * 0.08, 0.96)
          : 0.22 + edge.weight * 0.06;
        const width = isActive ? edge.weight * 0.45 + 0.9 : edge.weight * 0.28 + 0.45;

        return (
          <line
            key={`core-${edge.a}-${edge.b}`}
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
            strokeWidth={width}
            strokeLinecap="round"
            filter="url(#cst-core)"
            style={{ stroke: "var(--portfolio-ink)", strokeOpacity: alpha }}
          />
        );
      })}
    </svg>
  );
}

// ─── ProjectNode (card panel) ─────────────────────────────────────────────────

function ProjectNode({
  project,
  index,
  mx,
  my,
  canvasRef,
  isActive,
  reducedMotion,
  isMobile,
  onDragStart,
  onDragEnd,
  onClick,
  onHover,
}: {
  project: Project;
  index: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  onDragStart: () => void;
  onDragEnd: (vel: { x: number; y: number }) => void;
  onClick: () => void;
  onHover: (on: boolean) => void;
}) {
  const isWinner = project.winner === true;

  return (
    <motion.div
      style={{
        x: mx,
        y: my,
        position: "absolute",
        top: 0,
        left: 0,
        width: NODE_W,
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--portfolio-panel)",
        zIndex: 1,
        border: `1px solid ${
          isActive ? "var(--portfolio-border-strong)" : "var(--portfolio-border)"
        }`,
        boxShadow: isActive
          ? "0 8px 32px rgba(93,182,255,0.18), 0 2px 8px var(--portfolio-shadow)"
          : "0 2px 12px var(--portfolio-shadow)",
        cursor: isMobile ? "default" : "grab",
        userSelect: "none",
        touchAction: "manipulation",
        transition: reducedMotion ? "none" : "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
      drag={!isMobile}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={canvasRef}
      whileDrag={{ scale: 1.04, zIndex: 10, cursor: "grabbing" }}
      whileHover={!isMobile ? { scale: 1.02 } : undefined}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info.velocity)}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
      aria-label={`${project.title}${isWinner ? " (hackathon winner)" : ""}`}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: IMG_H,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {project.image ? (
          <img
            src={project.image}
            alt={project.title}
            loading="lazy"
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 45%, rgba(2,10,26,0.72))",
          }}
        />
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
          <button
            type="button"
            tabIndex={index + 1}
            className="font-display text-accent-bright"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`See more about ${project.title}`}
          >
            See more →
          </button>
        </div>
      </div>
    </motion.div>
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

            <div style={{ maxHeight: "88vh", overflowY: "auto", overflowX: "hidden" }}>
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left — media */}
                <div className="flex flex-col gap-3 p-3">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      className="w-full rounded-xl object-cover object-top"
                      style={{ aspectRatio: "4 / 3" }}
                    />
                  ) : photos.length > 0 ? (
                    photos.map((src, i) => (
                      <img
                        key={i}
                        src={src}
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
                        color: "#f5c518",
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
                      href={project.link}
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

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );

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

  // ── Seed on first measurement, rescale proportionally on resize ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let prevW = 0;
    let prevH = 0;

    const ro = new ResizeObserver(([entry]) => {
      const W = entry.contentRect.width;
      const H = entry.contentRect.height;
      if (W === 0 || H === 0) return;

      setIsMobile(W < 768);

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
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Physics RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) return;

    let rafId: number;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const W = canvas.clientWidth;
      const H = canvas.clientHeight;

      if (W < 768) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div
        ref={canvasRef}
        className="mt-12"
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
            index={i}
            mx={mvs[i].x}
            my={mvs[i].y}
            canvasRef={canvasRef}
            isActive={activeNode === i}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            onDragStart={() => handleDragStart(i)}
            onDragEnd={(vel) => handleDragEnd(i, vel)}
            onClick={() => handleOpen(project)}
            onHover={(on) => setActiveNode(on ? i : null)}
          />
        ))}
      </div>

      <ProjectModal project={openProject} onClose={handleClose} />
    </>
  );
}
