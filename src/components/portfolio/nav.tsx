import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Menu, Search, Trophy, X } from "lucide-react";

import { AchievementNavButton } from "@/components/portfolio/achievement-nav-button";
import { ThemeToggle } from "@/components/portfolio/theme-toggle";
import { KEYS } from "@/data/achievements";
import { GENERATED_IMAGES } from "@/data/images.generated";
import { NAV_LINKS, PROFILE } from "@/data/portfolio";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { trackBurst, unlock } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
// The palette shell, NOT the palette: this import must stay off the heavy chunk,
// or the nav (eager on every route) would drag cmdk back in behind it.
import { openCommandPalette, prefetchCommandPalette } from "@/lib/command-palette";

/**
 * The logo derivative: a single 76px square, painted at 38px (2× for retina). The
 * committed `PROFILE.logo` original is ~292 kB for a 38px badge, so the nav — which is
 * eager on every route — points here instead. One width, so no srcSet/sizes.
 */
const LOGO = GENERATED_IMAGES.logo.sources[0];

const LINK_CLASS =
  "font-display font-medium no-underline rounded-full px-[15px] py-[8px] text-muted-portfolio hover:text-ink transition-colors";
const LINK_STYLE = { fontSize: 14.5 } as const;

const ACTIVE_LINK_STYLE = {
  ...LINK_STYLE,
  textShadow: "0 0 14px rgba(93,182,255,0.55)",
} as const;

const RESUME_CLASS =
  "font-display font-semibold no-underline rounded-full px-[16px] py-[8px] text-ink transition-colors";
const RESUME_STYLE = {
  fontSize: 14.5,
  background: "var(--portfolio-surface-2)",
  border: "1px solid var(--portfolio-border-strong)",
} as const;

const PILL_STYLE = {
  background: "var(--portfolio-surface-2)",
  border: "1px solid var(--portfolio-border-strong)",
  backdropFilter: "blur(8px)",
} as const;

const MENU_ID = "mobile-nav-menu";

/** Fixed bar height (20px padding + 38px logo + 20px padding). The floating theme
 *  switch is positioned relative to this, and page content clears it. */
const NAV_HEIGHT = 78;

// Landing sections tracked by the scroll-spy, in document order. Kept at module
// scope so the hook receives a stable reference and never re-subscribes.
const SECTION_IDS = ["home", "about", "experience", "projects", "contact"];

/**
 * Fixed top bar. Section links are plain anchors while on the landing page and
 * router links back to it from anywhere else, so they keep working off-route.
 */
export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLanding = pathname === "/";
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const navigate = useNavigate();
  // The hamburger. Escape hands focus back to it (see below), so it needs a handle.
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Highlight the section currently in view — only on the landing route.
  const activeSection = useScrollSpy(SECTION_IDS, onLanding);

  // Platform-aware shortcut hint for the palette pill; resolved after mount to
  // stay SSR-safe (server + first client render both show the ⌘K default).
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    const platform =
      // navigator.userAgentData is not in all lib.dom versions.
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ||
      navigator.platform ||
      navigator.userAgent;
    setIsMac(/mac/i.test(platform));
  }, []);
  const shortcutHint = isMac ? "⌘K" : "Ctrl K";

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while the menu is open. Escape is a dismissal, not a
  // destination — it takes the focused element out of the DOM with it, so put
  // focus back on the button that opened the sheet rather than letting it fall
  // to <body> and lose the keyboard user's place. (Closing on navigation needs
  // no such rescue: the destination claims focus itself.)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Smooth-scroll an in-page section into view (honouring reduced motion) and
  // keep the URL hash in sync so links stay shareable, without the browser's
  // default instant jump fighting the smooth scroll.
  const scrollToSection = (section: string) => {
    const el = document.getElementById(section);
    if (!el) return false;
    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    // Route the hash through the router instead of history.pushState, or the
    // router's own location drifts from the address bar until the next popstate.
    // Both scroll opt-outs matter: `resetScroll` skips scroll restoration and
    // `hashScrollIntoView` skips the router's instant jump to #section — either
    // one would stomp on the smooth scroll started above. The view transition is
    // off too; there is no route change to cross-fade, only a scroll in flight.
    void navigate({
      hash: section,
      resetScroll: false,
      hashScrollIntoView: false,
      viewTransition: false,
    });
    return true;
  };

  // Shared renderer so desktop and mobile stay in sync.
  const renderLink = (
    l: (typeof NAV_LINKS)[number],
    className: string,
    style: React.CSSProperties,
  ) => {
    // A route link (e.g. /hobbies) is active when it IS the current page; a section
    // link is active when the scroll-spy says its section is in view.
    const isActive = l.to ? pathname === l.to : onLanding && activeSection === l.section;
    const activeClass = isActive ? `${className} text-ink` : className;
    const activeStyle = isActive ? { ...style, ...ACTIVE_LINK_STYLE } : style;
    const label = (
      <span className="relative inline-block">
        {l.label}
        {isActive && (
          <motion.span
            layoutId="nav-active-underline"
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: -6,
              width: "60%",
              height: 2,
              background: "var(--portfolio-accent-bright)",
              boxShadow: "0 0 10px var(--portfolio-accent-bright)",
            }}
            aria-hidden="true"
          />
        )}
      </span>
    );

    if (l.to) {
      return (
        <Link
          key={l.label}
          to={l.to}
          className={activeClass}
          style={activeStyle}
          aria-current={isActive ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          {label}
        </Link>
      );
    }

    if (onLanding) {
      return (
        <a
          key={l.label}
          href={`#${l.section}`}
          className={activeClass}
          style={activeStyle}
          aria-current={isActive ? "location" : undefined}
          onClick={(e) => {
            if (l.section && scrollToSection(l.section)) e.preventDefault();
            setOpen(false);
          }}
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        key={l.label}
        to="/"
        hash={l.section}
        className={className}
        style={style}
        onClick={() => setOpen(false)}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        padding: "20px clamp(24px,5vw,80px)",
        backdropFilter: "blur(8px)",
        background: "var(--portfolio-nav)",
        borderBottom: "1px solid var(--portfolio-border)",
        height: NAV_HEIGHT,
      }}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Link
        to="/"
        hash="home"
        className="flex items-center gap-3 no-underline"
        // Seven rapid clicks on an unresponsive thing is a time-honoured fix.
        onClick={() => trackBurst(KEYS.logoClicks)}
      >
        <img
          src={assetUrl(LOGO.src)}
          // Decorative: the link already spells out the name beside it, so alt
          // text here would only make the link announce as "Sai logo Sai . link".
          alt=""
          width={38}
          height={38}
          decoding="async"
          style={{
            width: 38,
            height: 38,
            borderRadius: "9999px",
            boxShadow: "0 0 16px rgba(47,155,255,0.5)",
          }}
        />
        <span className="font-display font-semibold text-ink" style={{ fontSize: 18 }}>
          {PROFILE.name}
          <b className="text-accent-bright">.</b>
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((l) => renderLink(l, LINK_CLASS, LINK_STYLE))}

        {/* Command palette trigger. Hover/focus starts fetching the palette chunk
            so the click has nothing to wait for; the fetch is idempotent and the
            click works regardless of whether it finished. */}
        <button
          type="button"
          onClick={openCommandPalette}
          onPointerEnter={prefetchCommandPalette}
          onFocus={prefetchCommandPalette}
          aria-label="Open command palette"
          className="ml-1 inline-flex items-center gap-2 rounded-full px-[12px] py-[7px] font-display text-muted-portfolio hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={PILL_STYLE}
        >
          <Search size={14} aria-hidden="true" />
          <span
            className="font-medium"
            style={{ fontSize: 12.5, letterSpacing: 0.5 }}
            aria-hidden="true"
          >
            {shortcutHint}
          </span>
        </button>

        <AchievementNavButton className="ml-1" />

        <ThemeToggle className="ml-1" />

        <a
          href={assetUrl(PROFILE.resumeUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${RESUME_CLASS} ml-1`}
          style={RESUME_STYLE}
          onClick={() => unlock("paper-trail")}
        >
          Résumé
        </a>
      </div>

      {/* Mobile controls: the theme switch sits beside the menu button. */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          ref={menuButtonRef}
          className="flex items-center justify-center rounded-full text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{ width: 42, height: 42, ...PILL_STYLE }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile dropdown sheet */}
      {open && (
        <div
          id={MENU_ID}
          className="md:hidden absolute right-[clamp(24px,5vw,80px)] top-full flex flex-col gap-1"
          style={{
            marginTop: 10,
            padding: 12,
            minWidth: 200,
            borderRadius: 18,
            background: "var(--portfolio-sheet)",
            border: "1px solid var(--portfolio-border-strong)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 12px 40px var(--portfolio-shadow)",
          }}
        >
          {NAV_LINKS.map((l) =>
            renderLink(
              l,
              `${LINK_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`,
              LINK_STYLE,
            ),
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openCommandPalette();
            }}
            onPointerEnter={prefetchCommandPalette}
            onFocus={prefetchCommandPalette}
            aria-label="Open command palette"
            className="inline-flex items-center gap-2 rounded-full px-[15px] py-[8px] text-left font-display font-medium text-muted-portfolio hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={LINK_STYLE}
          >
            <Search size={15} aria-hidden="true" />
            Search
          </button>

          {/* The trophy room lives in the sheet on mobile — the top bar is too
              cramped for a fourth control beside the theme switch and hamburger. */}
          <Link
            to="/achievements"
            className={`${LINK_CLASS} inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`}
            style={LINK_STYLE}
            onClick={() => setOpen(false)}
          >
            <Trophy size={15} aria-hidden="true" />
            Achievements
          </Link>

          <a
            href={assetUrl(PROFILE.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${RESUME_CLASS} mt-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`}
            style={RESUME_STYLE}
            onClick={() => {
              unlock("paper-trail");
              setOpen(false);
            }}
          >
            Résumé
          </a>
        </div>
      )}
    </motion.nav>
  );
}
