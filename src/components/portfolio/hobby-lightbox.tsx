import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";

import type { HobbyPhoto } from "@/data/hobbies";
import { assetUrl } from "@/lib/assets";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * Injects an alpha channel into a space-syntax HSL string, e.g.
 * "hsl(205 85% 62%)" -> "hsl(205 85% 62% / 0.4)". Returns null for a
 * missing/unexpected value so callers can fall back gracefully.
 */
function tint(accent: string | undefined, alpha: number): string | null {
  if (!accent || !accent.trim().endsWith(")")) return null;
  return accent.replace(/\)\s*$/, ` / ${alpha})`);
}

/** Minimum horizontal travel (px) before a touch drag counts as a swipe. */
const SWIPE_THRESHOLD = 44;

/** Keeps the neighbours warm so arrowing through doesn't flash empty. */
function usePreloadNeighbours(photos: HobbyPhoto[], index: number) {
  useEffect(() => {
    for (const offset of [-1, 1]) {
      const neighbour = photos[(index + offset + photos.length) % photos.length];
      if (!neighbour) continue;
      const img = new Image();
      img.src = assetUrl(neighbour.full ?? neighbour.src);
    }
  }, [photos, index]);
}

export function HobbyLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: HobbyPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  const [captionVisible, setCaptionVisible] = useState(true);
  const reduceMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  useFocusTrap(panelRef, true);
  usePreloadNeighbours(photos, index);

  const step = useCallback(
    (delta: number) => onNavigate((index + delta + photos.length) % photos.length),
    [index, photos.length, onNavigate],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start === null) return;
      const delta = (e.changedTouches[0]?.clientX ?? start) - start;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      // Swipe left -> next, swipe right -> previous.
      step(delta < 0 ? 1 : -1);
    },
    [step],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  const meta = useMemo(
    () => (photo ? [photo.location, photo.date, photo.gear].filter(Boolean) : []),
    [photo],
  );

  if (!photo) return null;

  const accentBorder = tint(photo.accent, 0.45);
  const accentRing = tint(photo.accent, 0.18);
  const accentGlow = tint(photo.accent, 0.28);
  const panelBorder = accentBorder
    ? `1px solid ${accentBorder}`
    : "1px solid rgba(93,182,255,0.25)";
  const panelShadow = photo.accent
    ? `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${accentRing}, 0 0 44px ${accentGlow}`
    : "0 30px 80px rgba(0,0,0,0.6)";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "rgba(2,6,18,0.82)", padding: "clamp(16px,4vw,40px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hobby-lightbox-caption"
    >
      <motion.div
        ref={panelRef}
        className="relative flex w-full flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth: 980,
          maxHeight: "88vh",
          background: "#0a1526",
          border: panelBorder,
          boxShadow: panelShadow,
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setCaptionVisible((v) => !v)}
          aria-pressed={captionVisible}
          aria-label={captionVisible ? "Hide caption" : "Show caption"}
          className="absolute left-3 top-3 z-10 grid place-items-center rounded-full transition-colors hover:text-white"
          style={{
            width: 36,
            height: 36,
            background: captionVisible ? "rgba(93,182,255,0.22)" : "rgba(10,20,36,0.85)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#cfe2f5",
          }}
        >
          <Info size={17} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid place-items-center rounded-full transition-colors hover:text-white"
          style={{
            width: 36,
            height: 36,
            background: "rgba(10,20,36,0.85)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#cfe2f5",
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* `flex: 1 1 auto` + `minHeight: 0` is what keeps the caption bar on screen.
            `aspectRatio` alone sets the height from the panel's full width — 980px of 4:3 is
            735px tall, and a 3:4 portrait is 1306px — which overflows the 88vh panel, and
            `overflow-hidden` then silently ate the entire bar below: caption, the prev/next
            arrows and the counter with it. Letting this box SHRINK below its aspect-derived
            height (which needs `minHeight: 0`, since a flex item's default `min-height: auto`
            refuses to go below content size) hands the leftover space back. The image is
            `object-fit: contain`, so it just letterboxes against the backing colour instead
            of cropping. Verified at 730px viewport height, where it previously clipped. */}
        <div
          className="w-full overflow-hidden"
          style={{
            aspectRatio: String(photo.aspect ?? 4 / 3),
            background: "#050c18",
            flex: "1 1 auto",
            minHeight: 0,
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <motion.img
            key={photo.id}
            src={assetUrl(photo.full ?? photo.src)}
            alt={photo.alt}
            sizes="(max-width: 980px) 100vw, 980px"
            className="w-full h-full select-none"
            style={{ objectFit: "contain" }}
            draggable={false}
            initial={reduceMotion ? undefined : { scale: 1, x: 0, y: 0 }}
            animate={reduceMotion ? undefined : { scale: 1.07, x: -10, y: -6 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
            }
          />
        </div>

        <div
          className="flex items-center justify-between gap-4"
          // `flexShrink: 0` — this bar carries the caption, the arrows and the counter, so it
          // is the one thing in the panel that must never give up height.
          style={{ padding: "14px clamp(16px,3vw,24px) 18px", flexShrink: 0 }}
        >
          {/* The caption element stays mounted even when hidden: the dialog's
              aria-labelledby points at it, so unmounting would leave the dialog
              with no accessible name. */}
          <div className="min-w-0">
            <p
              id="hobby-lightbox-caption"
              className={`font-body text-muted-portfolio on-dark${captionVisible ? "" : " sr-only"}`}
              style={{ fontSize: 14.5, lineHeight: 1.6 }}
            >
              {photo.caption ?? photo.alt}
            </p>
            {captionVisible && meta.length > 0 ? (
              <p
                className="font-body text-muted-portfolio on-dark"
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 1.5,
                  opacity: 0.7,
                  letterSpacing: 0.2,
                }}
              >
                {meta.map((item, i) => (
                  <span key={i}>
                    {i > 0 ? <span style={{ margin: "0 7px", opacity: 0.6 }}>·</span> : null}
                    {item}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NavButton label="Previous photo" onClick={() => step(-1)}>
              <ChevronLeft size={19} strokeWidth={2} />
            </NavButton>
            <span className="font-display text-muted-portfolio on-dark" style={{ fontSize: 13 }}>
              {index + 1} / {photos.length}
            </span>
            <NavButton label="Next photo" onClick={() => step(1)}>
              <ChevronRight size={19} strokeWidth={2} />
            </NavButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid place-items-center rounded-full transition-colors hover:text-white"
      style={{
        width: 34,
        height: 34,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#cfe2f5",
      }}
    >
      {children}
    </button>
  );
}
