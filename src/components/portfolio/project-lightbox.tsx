import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { assetUrl } from "@/lib/assets";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const SWIPE_THRESHOLD = 44;

type ProjectPhoto = { src: string; alt: string };

export function ProjectLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: ProjectPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const photo = photos[index];

  useFocusTrap(panelRef, true);

  const step = useCallback(
    (delta: number) => onNavigate((index + delta + photos.length) % photos.length),
    [index, photos.length, onNavigate],
  );

  useEffect(() => {
    for (const offset of [-1, 1]) {
      const neighbour = photos[(index + offset + photos.length) % photos.length];
      if (!neighbour) continue;
      const image = new Image();
      image.src = assetUrl(neighbour.src);
    }
  }, [photos, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, step]);

  if (!photo) return null;

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) step(delta < 0 ? 1 : -1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "rgba(2,6,18,0.84)", padding: "clamp(16px,4vw,40px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.alt} — image ${index + 1} of ${photos.length}`}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        className="relative flex w-full flex-col overflow-hidden rounded-2xl"
        style={{
          maxWidth: 1100,
          maxHeight: "88vh",
          background: "#0a1526",
          border: "1px solid rgba(93,182,255,0.3)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 44px rgba(93,182,255,0.16)",
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image viewer"
          className="absolute right-3 top-3 z-10 grid place-items-center rounded-full"
          style={{
            width: 38,
            height: 38,
            background: "rgba(10,20,36,0.88)",
            color: "#cfe2f5",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <X size={19} aria-hidden="true" />
        </button>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          style={{ background: "#050c18" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <motion.img
            key={photo.src}
            src={assetUrl(photo.src)}
            alt={photo.alt}
            className="max-h-[78vh] w-full select-none object-contain"
            style={{ maxHeight: "calc(88vh - 72px)" }}
            draggable={false}
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <NavButton label="Previous image" onClick={() => step(-1)}>
            <ChevronLeft size={24} aria-hidden="true" />
          </NavButton>
          <NavButton label="Next image" onClick={() => step(1)}>
            <ChevronRight size={24} aria-hidden="true" />
          </NavButton>
        </div>

        <div
          className="flex items-start justify-between gap-4"
          style={{ padding: "12px 18px 15px", color: "#cfe2f5", flexShrink: 0 }}
        >
          <p
            className="min-w-0 whitespace-normal break-words"
            style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.82 }}
          >
            {photo.alt}
          </p>
          <span className="shrink-0 font-display" style={{ fontSize: 13 }}>
            {index + 1} / {photos.length}
          </span>
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
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-white transition-transform hover:scale-105"
      style={{
        width: 42,
        height: 42,
        background: "rgba(10,20,36,0.84)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {children}
    </button>
  );
}
