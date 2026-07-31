import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import type { HobbyPhoto } from "@/data/hobbies";
import { assetUrl } from "@/lib/assets";
import { useFocusTrap } from "@/hooks/use-focus-trap";

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

  useFocusTrap(panelRef, true);
  usePreloadNeighbours(photos, index);

  const step = useCallback(
    (delta: number) => onNavigate((index + delta + photos.length) % photos.length),
    [index, photos.length, onNavigate],
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

  if (!photo) return null;

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
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 980,
          maxHeight: "88vh",
          background: "#0a1526",
          border: "1px solid rgba(93,182,255,0.25)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div
          className="w-full"
          style={{ aspectRatio: String(photo.aspect ?? 4 / 3), background: "#050c18" }}
        >
          <img
            src={assetUrl(photo.full ?? photo.src)}
            alt={photo.alt}
            className="w-full h-full"
            style={{ objectFit: "contain" }}
          />
        </div>

        <div
          className="flex items-center justify-between gap-4"
          style={{ padding: "14px clamp(16px,3vw,24px) 18px" }}
        >
          <p
            id="hobby-lightbox-caption"
            className="font-body text-muted-portfolio"
            style={{ fontSize: 14.5, lineHeight: 1.6 }}
          >
            {photo.caption ?? photo.alt}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <NavButton label="Previous photo" onClick={() => step(-1)}>
              <ChevronLeft size={19} strokeWidth={2} />
            </NavButton>
            <span className="font-display text-muted-portfolio" style={{ fontSize: 13 }}>
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
