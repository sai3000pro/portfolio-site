import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Menu, Search, X } from "lucide-react";

import { ThemeToggle } from "@/components/portfolio/theme-toggle";
import { KEYS } from "@/data/achievements";
import { GENERATED_IMAGES } from "@/data/images.generated";
import { NAV_LINKS, PROFILE, type NavLink } from "@/data/portfolio";
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

/** LINK_CLASS plus a focus ring, for links that sit inside a popped-open panel. */
const PANEL_LINK_CLASS = `${LINK_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright`;

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

/** The mobile sheet's panel recipe, shared with the desktop dropdown — same
 *  visual object, and `--portfolio-sheet` exists for exactly this. */
const PANEL_STYLE = {
  marginTop: 10,
  padding: 12,
  minWidth: 200,
  borderRadius: 18,
  background: "var(--portfolio-sheet)",
  border: "1px solid var(--portfolio-border-strong)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 12px 40px var(--portfolio-shadow)",
} as const;

/** Height of the gap `PANEL_STYLE.marginTop` opens between bar and panel. */
const PANEL_GAP = PANEL_STYLE.marginTop;

/** True when `pathname` IS `to`, or a route nested under it (/blog → /blog/a-post). */
const isPathActive = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

/**
 * A nav label, optionally carrying the active underline.
 *
 * `underline` is deliberately separate from "is this link active". The underline
 * is a shared `layoutId`, so every element rendering one is a claimant on the same
 * animating box — put three on screen and framer-motion picks a winner and slides
 * the underline between them. The bar and the mobile sheet are the two existing
 * claimants (they never coexist visibly, only in the DOM), and links inside the
 * dropdown are given the active *text* treatment with `underline={false}` so they
 * do not become a third. The dropdown's trigger claims it on their behalf: it
 * counts as active while any of its children's routes is the current one.
 */
function NavLabel({ label, underline }: { label: string; underline: boolean }) {
  return (
    <span className="relative inline-block">
      {label}
      {underline && (
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
}

/**
 * Desktop dropdown for a NAV_LINKS entry that has children.
 *
 * It exists so new routes can be added without widening the bar: one trigger
 * replaces one link, and the bar stays at six items. The panel is absolutely
 * positioned and never contributes to layout, so NAV_HEIGHT stays put.
 *
 * A DISCLOSURE, not a menu. The panel holds ordinary links that Tab walks in DOM
 * order, so there is no `role="menu"` — that role promises arrow-key navigation
 * and a roving tabindex, and advertising a keyboard contract this does not
 * implement is worse than not claiming the role. Same button + `aria-expanded` +
 * `aria-controls` shape as the hamburger below. Closed, the panel is not rendered
 * at all, so the collapsed dropdown costs exactly one tab stop — the same one the
 * plain link it replaced cost.
 *
 * NOT `ui/dropdown-menu.tsx`: it would drag `@radix-ui/react-dropdown-menu` onto
 * the nav's chunk, which is eager on every route — the identical trap the command
 * palette import at the top of this file is written to dodge.
 *
 * NOT `useFocusTrap`: that hook is scoped to modals. It force-focuses the first
 * element on open and restores focus on teardown, and both would fight a
 * non-modal dropdown whose whole point is that you can Tab straight out of it.
 * The mobile sheet pointedly does not use it either.
 */
function NavDropdown({
  link,
  isActive,
  pathname,
  renderChild,
}: {
  link: NavLink;
  isActive: boolean;
  pathname: string;
  renderChild: (child: NavLink, onNavigate: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Escape hands focus back to the trigger, and the trigger opens on focus — so
  // the dismissal would instantly undo itself. Set only when a focus event is
  // actually coming, and consumed by the handler it is meant for.
  const restoringFocus = useRef(false);
  const panelId = `nav-dropdown-${link.label.toLowerCase().replace(/\s+/g, "-")}`;

  // Close on navigation, like the mobile sheet.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while open. Same reasoning as the mobile sheet: Escape takes
  // the focused element out of the DOM with it, so put the keyboard user back on
  // the trigger rather than dropping them on <body>. Only when focus is really
  // inside, though — a dropdown opened by hover left focus wherever it was, and
  // pulling it into the nav would be a focus grab rather than a rescue.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const focused = document.activeElement;
      const insidePanel =
        Boolean(wrapRef.current?.contains(focused)) && focused !== triggerRef.current;
      setOpen(false);
      if (insidePanel) {
        restoringFocus.current = true;
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      ref={wrapRef}
      className="relative"
      // Mouse only. On touch, pointerenter lands immediately before click, so a
      // tap would open the panel and the click would toggle it straight back shut.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      // ...and never yank the panel out from under a keyboard user who tabbed
      // into it and then happened to move the mouse away. Focus closes it, via
      // onBlur below.
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        if (e.currentTarget.contains(document.activeElement)) return;
        setOpen(false);
      }}
      // Tabbing off the last item (or shift-Tabbing off the trigger) closes;
      // moving focus between the trigger and the panel does not, since both are
      // inside this wrapper.
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setOpen(false);
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={`${PANEL_LINK_CLASS} inline-flex items-center gap-1 ${isActive ? "text-ink" : ""}`}
        style={isActive ? ACTIVE_LINK_STYLE : LINK_STYLE}
        aria-expanded={open}
        aria-controls={panelId}
        onFocus={() => {
          if (restoringFocus.current) {
            restoringFocus.current = false;
            return;
          }
          setOpen(true);
        }}
        // `detail === 0` marks a click the browser synthesized from a keypress.
        // The keydown handler below already dealt with those; ignoring them here
        // means a stray one can never toggle a second time.
        onClick={(e) => {
          if (e.detail === 0) return;
          toggle();
        }}
        // WCAG 2.1.1, the same call achievement-grid.tsx's secret tile makes:
        // Enter and Space are handled explicitly. `preventDefault()` is what
        // makes that safe as well as necessary — it cancels the click the button
        // would otherwise synthesize, so the panel toggles once rather than
        // twice, and it stops Space scrolling the page out from under the panel
        // that just opened.
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggle();
        }}
      >
        <NavLabel label={link.label} underline={isActive} />
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        />
      </button>

      {open && (
        <>
          {/* The panel hangs PANEL_GAP below the bar. That gap belongs to neither
              the trigger nor the panel, so a pointer travelling down to the panel
              would cross dead space and trip pointerleave before arriving. This
              bridge covers it; being a descendant of the wrapper, hovering it
              suppresses pointerleave exactly as hovering the panel does. */}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-full"
            style={{ height: PANEL_GAP }}
          />
          <div
            id={panelId}
            className="absolute left-0 top-full flex flex-col gap-1"
            style={PANEL_STYLE}
          >
            {link.children?.map((child) => renderChild(child, () => setOpen(false)))}
          </div>
        </>
      )}
    </div>
  );
}

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

  // A route link is active when it IS the current page (or a page nested under
  // it); a link with children is also active while any child's route is current,
  // which is what keeps "Beyond the Code" lit while you are on /gallery. A section
  // link is active when the scroll-spy says its section is in view.
  const isLinkActive = (l: NavLink): boolean => {
    if (l.to) {
      return (
        isPathActive(pathname, l.to) ||
        (l.children?.some((c) => Boolean(c.to) && isPathActive(pathname, c.to!)) ?? false)
      );
    }
    return onLanding && activeSection === l.section;
  };

  // Shared renderer so desktop and mobile stay in sync. `underline` is opt-out for
  // links inside the dropdown — see NavLabel for why a third claimant is a problem
  // — and `onNavigate` lets the dropdown close itself on a click that does not
  // change the route (clicking the page you are already on).
  const renderLink = (
    l: NavLink,
    className: string,
    style: React.CSSProperties,
    opts: { underline?: boolean; onNavigate?: () => void } = {},
  ) => {
    const { underline = true, onNavigate } = opts;
    const isActive = isLinkActive(l);
    const close = onNavigate ?? (() => setOpen(false));
    const activeClass = isActive ? `${className} text-ink` : className;
    const activeStyle = isActive ? { ...style, ...ACTIVE_LINK_STYLE } : style;
    const label = <NavLabel label={l.label} underline={isActive && underline} />;

    if (l.to) {
      return (
        <Link
          key={l.label}
          to={l.to}
          className={activeClass}
          style={activeStyle}
          aria-current={isActive ? "page" : undefined}
          onClick={close}
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
            close();
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
        onClick={close}
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
        // Deliberately borderless. The translucent background plus the blur already
        // separate the bar from what scrolls under it; a 1px rule on top of that read
        // as a seam across the starfield rather than as an edge.
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
        {NAV_LINKS.map((l) =>
          l.children ? (
            <NavDropdown
              key={l.label}
              link={l}
              isActive={isLinkActive(l)}
              pathname={pathname}
              renderChild={(child, onNavigate) =>
                renderLink(child, PANEL_LINK_CLASS, LINK_STYLE, {
                  underline: false,
                  onNavigate,
                })
              }
            />
          ) : (
            renderLink(l, LINK_CLASS, LINK_STYLE)
          ),
        )}

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
          style={PANEL_STYLE}
        >
          {/* Children are listed flat, indented under their parent. The sheet has
              the room, and a nested disclosure on a touch sheet is strictly worse
              than a list: two taps to reach anything, and a hit target that hides
              the thing you were aiming for. */}
          {NAV_LINKS.flatMap((l) => [
            renderLink(l, PANEL_LINK_CLASS, LINK_STYLE),
            ...(l.children ?? []).map((child) =>
              renderLink(
                child,
                PANEL_LINK_CLASS,
                { ...LINK_STYLE, paddingLeft: 30 },
                {
                  underline: false,
                },
              ),
            ),
          ])}

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
