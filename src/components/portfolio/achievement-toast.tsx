"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { ACHIEVEMENTS_BY_ID, TIER_POINTS, type Achievement } from "@/data/achievements";
import { ACHIEVEMENT_UNLOCK_EVENT, markSeen, unseenUnlocks } from "@/lib/achievements";
import { AchievementBadge } from "@/components/portfolio/achievement-badge";

/**
 * Xbox-style "Achievement Unlocked" popup, bottom-left, on every route.
 *
 * WHY NOT SONNER: the site's `<Toaster>` is mounted inside the contact section
 * (contact.tsx) so it only exists on "/" once that section renders, and it is
 * hardcoded `theme="dark"` which is wrong in light mode. This also needs badge
 * choreography sonner cannot express.
 *
 * WHY BOTTOM-LEFT: bottom-right is doubly occupied — ScrollTop sits at
 * bottom/right 24 and the sonner Toaster is `position="bottom-right"`. The top is
 * under the 78px nav and the z-[60] scroll-progress bar, and top-left is the logo.
 * Bottom-left is the only corner free on every route, and it reads as system HUD
 * rather than form feedback, which is the right separation from contact toasts.
 *
 * Z-ORDER: z-[80] clears the z-[70] modal scrims (constellation, experience,
 * lightbox) because an unlock can fire from inside one — "opened every project"
 * completes on the last modal open. The wrapper is `pointer-events: none` so it
 * can never steal a click from the modal underneath; only the card re-enables it.
 */

/** How long a card stays up before auto-dismissing. */
const DISPLAY_MS = 5200;

/** Longer under reduced motion — there is no movement to catch the eye. */
const DISPLAY_MS_REDUCED = 7000;

/** Unlocks arriving together collapse into one summary card at or above this. */
const SUMMARY_THRESHOLD = 3;

/**
 * Hard cap so a pathological burst can't queue forever. Overflow is still earned,
 * and is never marked seen — it resurfaces via `unseenUnlocks()` on the next mount.
 */
const MAX_QUEUE = 6;

/** A queued card: one achievement, or a collapsed burst of several. */
type Card = { ids: string[] };

export function AchievementToaster() {
  const [queue, setQueue] = useState<Card[]>([]);
  const prefersReduced = useReducedMotion();
  const paused = useRef(false);

  const push = useCallback((ids: string[]) => {
    const known = ids.filter((id) => ACHIEVEMENTS_BY_ID.has(id));
    if (known.length === 0) return;

    // A first visit can complete several rules in one tick. Collapsing the burst
    // into a single card is the difference between a flourish and a wall.
    const cards: Card[] =
      known.length >= SUMMARY_THRESHOLD ? [{ ids: known }] : known.map((id) => ({ ids: [id] }));

    setQueue((current) => [...current, ...cards].slice(0, MAX_QUEUE));
  }, []);

  // Announce-bookkeeping deliberately lives here rather than inside `push`. The
  // MAX_QUEUE cap is applied *inside* the state updater, so `push` cannot know
  // which cards survived it — marking the whole incoming batch would record the
  // overflow as announced, `unseenUnlocks()` would never return it again, and the
  // "surfaces now rather than being silently lost" promise below would be a lie.
  // Reading it off `queue` marks exactly what made it in. `markSeen` ignores ids
  // it already holds, so re-running on every dismiss costs nothing.
  useEffect(() => {
    if (queue.length > 0) markSeen(queue.flatMap((card) => card.ids));
  }, [queue]);

  useEffect(() => {
    // Anything earned but never announced — e.g. the tab closed mid-queue last
    // visit — surfaces now rather than being silently lost.
    const pending = unseenUnlocks();
    if (pending.length > 0) push(pending);

    const onUnlock = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      if (detail?.ids?.length) push(detail.ids);
    };

    window.addEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCK_EVENT, onUnlock);
  }, [push]);

  const current = queue[0];

  // Auto-dismiss. Pauses while hovered or focused (WCAG 2.2.1 — never time out
  // content someone is actively reading).
  useEffect(() => {
    if (!current) return;

    const duration = prefersReduced ? DISPLAY_MS_REDUCED : DISPLAY_MS;
    let elapsed = 0;
    const tick = 100;
    const timer = setInterval(() => {
      if (paused.current) return;
      elapsed += tick;
      if (elapsed >= duration) setQueue((q) => q.slice(1));
    }, tick);

    return () => clearInterval(timer);
  }, [current, prefersReduced]);

  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    // Always rendered, even when empty: screen readers do not reliably announce a
    // live region that is inserted at the same moment its content appears.
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-[80]"
      style={{
        left: "clamp(12px,3vw,24px)",
        bottom: "clamp(12px,3vw,24px)",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="wait">
        {current && (
          <AchievementCard
            key={current.ids.join("|")}
            ids={current.ids}
            remaining={queue.length - 1}
            prefersReduced={Boolean(prefersReduced)}
            onDismiss={dismiss}
            onPauseChange={(value) => {
              paused.current = value;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AchievementCard({
  ids,
  remaining,
  prefersReduced,
  onDismiss,
  onPauseChange,
}: {
  ids: string[];
  remaining: number;
  prefersReduced: boolean;
  onDismiss: () => void;
  onPauseChange: (paused: boolean) => void;
}) {
  const achievements = ids
    .map((id) => ACHIEVEMENTS_BY_ID.get(id))
    .filter((a): a is Achievement => Boolean(a));
  if (achievements.length === 0) return null;

  const isSummary = achievements.length > 1;
  const lead = achievements[0];
  const points = achievements.reduce((sum, a) => sum + TIER_POINTS[a.tier], 0);

  const title = isSummary ? `${achievements.length} Achievements Unlocked` : lead.name;
  const subtitle = isSummary
    ? achievements.map((a) => a.name).join(" · ")
    : `${lead.tier[0].toUpperCase()}${lead.tier.slice(1)} · +${points} pts`;

  const enter = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: -24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <motion.div
      initial={enter.initial}
      animate={enter.animate}
      exit={enter.exit}
      transition={{ duration: prefersReduced ? 0.2 : 0.42, ease: [0.2, 0.7, 0.3, 1] }}
      onMouseEnter={() => onPauseChange(true)}
      onMouseLeave={() => onPauseChange(false)}
      onFocus={() => onPauseChange(true)}
      onBlur={() => onPauseChange(false)}
      className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl"
      style={{
        pointerEvents: "auto",
        width: "min(360px, calc(100vw - 48px))",
        padding: 14,
        background: "var(--portfolio-sheet)",
        border: "1px solid var(--portfolio-border-strong)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 12px 40px var(--portfolio-shadow)",
      }}
    >
      {/* Badge pop — this is the "badge flashes for a brief moment". */}
      <motion.div
        className="relative"
        initial={prefersReduced ? false : { scale: 0, rotate: -20 }}
        animate={prefersReduced ? undefined : { scale: [0, 1.18, 1], rotate: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {!prefersReduced && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.7, delay: 0.18 }}
            style={{ boxShadow: "0 0 34px var(--portfolio-accent-bright)" }}
          />
        )}
        <AchievementBadge achievement={lead} state="earned" size={54} />
      </motion.div>

      <div className="min-w-0 flex-1">
        <div
          className="font-display font-semibold uppercase text-accent-bright"
          style={{ fontSize: 10.5, letterSpacing: 2.4 }}
        >
          Achievement Unlocked
        </div>
        <div
          className="font-display font-semibold text-ink truncate"
          style={{ fontSize: 15.5, marginTop: 2 }}
        >
          {title}
        </div>
        <div className="text-muted-portfolio truncate" style={{ fontSize: 12.5, marginTop: 1 }}>
          {subtitle}
        </div>
        <Link
          to="/achievements"
          className="inline-block font-display font-medium text-accent-bright hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright rounded"
          style={{ fontSize: 12.5, marginTop: 6 }}
          onClick={onDismiss}
        >
          See all achievements →
        </Link>
      </div>

      {remaining > 0 && (
        <span
          className="absolute font-display font-semibold text-accent-bright"
          style={{ top: 10, right: 34, fontSize: 11 }}
        >
          +{remaining}
        </span>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss achievement notification"
        className="absolute grid place-items-center rounded-full text-muted-portfolio hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{ top: 8, right: 8, width: 22, height: 22 }}
      >
        <X size={13} aria-hidden="true" />
      </button>

      {/* Shine sweep. Plain opacity, not mixBlendMode — screen blending inverts
          unpleasantly against the light-mode sheet. */}
      {!prefersReduced && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
          }}
        />
      )}

      {/* Dismiss timer, doubling as a progress bar. */}
      {!prefersReduced && (
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: DISPLAY_MS / 1000, ease: "linear" }}
          style={{ background: "var(--portfolio-accent-bright)" }}
        />
      )}
    </motion.div>
  );
}
