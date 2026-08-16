import { useEffect, useState } from "react";

/**
 * Observe a set of section elements (by DOM id) and report which one is
 * currently the most visible in the viewport. Backed by a single
 * {@link IntersectionObserver} so there is no scroll-listener spam.
 *
 * SSR-safe: the observer is only wired up inside an effect, and the hook
 * short-circuits when disabled or when `IntersectionObserver` is unavailable
 * (e.g. during prerender). The observer is disconnected on unmount or whenever
 * the inputs change.
 *
 * Pass a stable `sectionIds` reference (e.g. a module-level constant) so the
 * effect does not re-subscribe on every render.
 *
 * @param sectionIds Ordered list of element ids to track.
 * @param enabled Only observe while `true` (e.g. restrict to the landing route).
 * @returns The active section id, or `null` before anything is resolved.
 */
export function useScrollSpy(sectionIds: string[], enabled = true): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActiveId(null);
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Track each section's latest visible ratio; the most-visible wins.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        // Bias the detection band toward the upper-middle of the viewport so a
        // section becomes "active" as its heading clears the fixed nav.
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds, enabled]);

  return enabled ? activeId : null;
}
