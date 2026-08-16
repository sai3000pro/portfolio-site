"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

import { unlock } from "@/lib/achievements";

/**
 * Floating back-to-top button.
 *
 * Mounted once in __root.tsx, so it is available on every route rather than only the
 * landing page it started on. It lived inside src/routes/index.tsx as a private component,
 * which meant /gallery — the longest page on the site by a wide margin, 32 rows of photos —
 * had no way back up but the scrollbar.
 *
 * "Any page longer than a certain height" needs no page-length measurement and no allowlist:
 * the reveal threshold below is already that rule. A page you cannot scroll a viewport down
 * never fires it, so short routes silently opt out and a route that grows opts in the day it
 * does. Nothing needs to be registered here when a page is added.
 *
 * SSR SAFETY: the scroll listener is wired inside an effect, so nothing here runs during the
 * prerender pass. `show` starts false, so the server and the first client render agree.
 */
export function ScrollTop() {
  const prefersReduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Reveal after roughly one viewport of scrolling.
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enterExit = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 12 },
      };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          onClick={() => {
            unlock("elevator-pitch");
            window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
          }}
          aria-label="Back to top"
          initial={enterExit.initial}
          animate={enterExit.animate}
          exit={enterExit.exit}
          whileHover={prefersReduced ? undefined : { y: -2 }}
          whileTap={prefersReduced ? undefined : { scale: 0.94 }}
          transition={{ duration: prefersReduced ? 0 : 0.25, ease: "easeOut" }}
          className="fixed z-50 grid place-items-center rounded-full text-ink transition-colors hover:text-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          // z-50 keeps this under the lightbox (z-[70]) and the command palette, so it can
          // never float over an open dialog.
          style={{
            bottom: 24,
            right: 24,
            width: 46,
            height: 46,
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowUp
            size={22}
            strokeWidth={2.2}
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
