"use client";

import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import { CONSOLE_CODE_WORD, KEYS } from "@/data/achievements";
import {
  ACHIEVEMENT_CHANGE_EVENT,
  invalidateCache,
  markSent,
  markVisit,
  readState,
  trackMember,
  unlock,
} from "@/lib/achievements";
import { isRarityEnabled, reportUnlocks } from "@/lib/achievement-stats";
import { useScrollSpy } from "@/hooks/use-scroll-spy";

/**
 * Ambient achievement tracking. Renders nothing; mounted once in __root.tsx so it
 * runs on every route.
 *
 * This file exists to keep the other ~15 components honest. Anything that is not
 * a specific component's handler — visits, route changes, section coverage, dwell
 * timers, idle detection, key sequences, cross-tab sync — lives here instead of
 * being sprinkled across the site. Everything else is a single `unlock()` or
 * `trackMember()` line inside a handler that already exists.
 *
 * SSR SAFETY: every listener is wired inside an effect, so nothing here runs
 * during the server render or the prerender pass.
 */

/** Home-page sections, in document order. Mirrors nav.tsx's SECTION_IDS. */
const SECTION_IDS = ["home", "about", "experience", "projects", "contact"];

/** All five sections inside this window earns Speedrun. */
const SPEEDRUN_MS = 30_000;

/** Continuous visible time in one session that earns Slow Burn. */
const SLOW_BURN_MS = 10 * 60_000;

/** Uninterrupted stillness on the landing page that earns Stargazer. */
const IDLE_MS = 3 * 60_000;

/** The sequence. Lowercased so shift/caps don't break it. */
const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export function AchievementTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/" || pathname.endsWith("/portfolio-site/") || pathname === "";

  // --- Visit stamping ------------------------------------------------------
  useEffect(() => {
    markVisit();
    unlock("first-light");

    // Local hour, deliberately: "3am" should mean 3am where the visitor is.
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 4) unlock("midnight-oil");
  }, []);

  // --- Console easter egg --------------------------------------------------
  useEffect(() => {
    // Printed once per load. The payoff is wired in the command palette so the
    // visitor has to actually do something with what they found.
    console.log(
      `%c★ You found the console.%c\nType "${CONSOLE_CODE_WORD}" into the ⌘K palette to claim your badge.`,
      "color:#5db6ff;font-size:14px;font-weight:700",
      "color:#9fb3c8;font-size:12px",
    );
  }, []);

  // --- Route coverage ------------------------------------------------------
  useEffect(() => {
    // Both paths, deliberately. "spacewalk" is about going to look at the photos, which
    // now live at /gallery — but /hobbies is the hub that still carries the badge, is in
    // the sitemap, and is what every old bookmark and inbound link points at. Matching
    // only one would silently strand whichever half of the audience used the other, and
    // because "completionist" requires every badge, that strands a legendary with it.
    // The id itself must never change: it is persisted in localStorage and hardcoded in
    // workers/achievement-stats/src/index.ts.
    if (pathname.includes("/hobbies") || pathname.includes("/gallery")) unlock("spacewalk");
    if (pathname.includes("/achievements")) unlock("trophy-hunter");

    const caseStudy = /\/projects\/([^/]+)\/?$/.exec(pathname);
    if (caseStudy) trackMember(KEYS.caseStudies, caseStudy[1]);
  }, [pathname]);

  // --- Section coverage + speedrun ----------------------------------------
  // Reuses the existing scroll-spy observer rather than adding a second one.
  const activeSection = useScrollSpy(SECTION_IDS, onLanding);
  const sessionStart = useRef(Date.now());
  const sectionsSeen = useRef(new Set<string>());

  useEffect(() => {
    if (!activeSection) return;
    trackMember(KEYS.sections, activeSection);

    sectionsSeen.current.add(activeSection);
    if (
      sectionsSeen.current.size >= SECTION_IDS.length &&
      Date.now() - sessionStart.current <= SPEEDRUN_MS
    ) {
      unlock("speedrun");
    }
  }, [activeSection]);

  // --- Slow burn -----------------------------------------------------------
  useEffect(() => {
    let visibleMs = 0;
    const tick = 5_000;

    const timer = setInterval(() => {
      // A backgrounded tab must not grind this out for you.
      if (document.visibilityState !== "visible") return;
      visibleMs += tick;
      if (visibleMs >= SLOW_BURN_MS) {
        unlock("slow-burn");
        clearInterval(timer);
      }
    }, tick);

    return () => clearInterval(timer);
  }, []);

  // --- Stargazer: stillness on the landing page ---------------------------
  useEffect(() => {
    if (!onLanding) return;

    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => unlock("stargazer"), IDLE_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [onLanding]);

  // --- Konami --------------------------------------------------------------
  useEffect(() => {
    let buffer: string[] = [];

    const onKeyDown = (event: KeyboardEvent) => {
      buffer = [...buffer, event.key.toLowerCase()].slice(-KONAMI.length);
      if (buffer.length === KONAMI.length && buffer.every((k, i) => k === KONAMI[i])) {
        unlock("the-old-ways");
        buffer = [];
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // --- Rarity reporting ----------------------------------------------------
  useEffect(() => {
    // Completely inert unless VITE_ACHIEVEMENTS_ENDPOINT is configured.
    if (!isRarityEnabled()) return;

    let timer: ReturnType<typeof setTimeout>;

    const flush = () => {
      const state = readState();
      if (state.optOut || !state.visitorId) return;

      const pending = Object.keys(state.unlocked).filter((id) => !state.sent.includes(id));
      if (pending.length === 0) return;

      // Only mark as sent on a 2xx, so a failed report is simply retried later.
      void reportUnlocks(pending, state.visitorId).then((ok) => {
        if (ok) markSent(pending);
      });
    };

    // Debounced: a first visit can unlock several at once, and that should be one
    // request rather than five.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, 2000);
    };

    schedule();
    window.addEventListener(ACHIEVEMENT_CHANGE_EVENT, schedule);
    window.addEventListener("pagehide", flush);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(ACHIEVEMENT_CHANGE_EVENT, schedule);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // --- Cross-tab sync ------------------------------------------------------
  useEffect(() => {
    // Two open tabs would otherwise overwrite each other from stale snapshots.
    const onStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith("portfolio:achievements")) return;
      invalidateCache();
      window.dispatchEvent(new CustomEvent(ACHIEVEMENT_CHANGE_EVENT));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
