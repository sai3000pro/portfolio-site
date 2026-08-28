import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AchievementToaster } from "../components/portfolio/achievement-toast";
import { AchievementTracker } from "../components/portfolio/achievement-tracker";
import { ScrollTop } from "../components/portfolio/scroll-top";
import { FAVICON } from "../data/images.generated";
import { PROFILE, SOCIALS } from "../data/portfolio";
import { unlock } from "../lib/achievements";
import { initAnalytics } from "../lib/analytics";
import { assetUrl } from "../lib/assets";
import {
  installPaletteShortcuts,
  loadCommandPalette,
  prefetchCommandPaletteWhenIdle,
  usePaletteOpen,
} from "../lib/command-palette";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SITE_URL, absoluteAsset, ogImageUrl } from "../lib/site-url";
import { THEME_INIT_SCRIPT } from "../lib/theme";

/**
 * Absolute URL of the ACTUAL generated OG card for "/". scripts/seo.mjs writes
 * per-route PNG cards into dist/public; the "/" route's file is "og/index.png"
 * (see scripts/routes.mjs `getRouteMeta`).
 */
const OG_IMAGE_URL = ogImageUrl("index.png");

/** Card geometry, mirroring OG_WIDTH/OG_HEIGHT in scripts/seo.mjs. */
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

const SITE_TITLE = "Saivenkat Jilla: Software Engineer, Creator, and Problem Solver";
const SITE_DESCRIPTION =
  "Portfolio of Sai (Saivenkat Jilla) — Software Engineer studying at the University of Waterloo";

/** JSON-LD `Person` + `WebSite` graph, populated from PROFILE/SOCIALS. */
function buildJsonLd(): string {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.fullName,
    alternateName: PROFILE.name,
    description: PROFILE.bio,
    // Derived, never a literal: a hardcoded title here silently drifts away from the
    // visible hero copy (it already had). See PROFILE.jobTitle in data/portfolio.ts.
    jobTitle: PROFILE.jobTitle,
    email: `mailto:${PROFILE.email}`,
    url: SITE_URL,
    image: absoluteAsset(PROFILE.portrait),
    // sameAs = canonical profile URLs (exclude the mailto: social).
    sameAs: SOCIALS.filter((s) => !s.href.startsWith("mailto:")).map((s) => s.href),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    author: {
      "@type": "Person",
      name: PROFILE.fullName,
      url: SITE_URL,
    },
  };

  // Escaped, not raw. This string goes into the page through dangerouslySetInnerHTML, and
  // inside a <script> element the HTML parser is still hunting for "</script" — a value
  // containing one would close the tag early and spill the remainder into the document as
  // markup. Every value here is authored in this repo, so nothing today can carry that
  // sequence; the escape is what keeps it true when a future bio or job title is pasted in
  // from somewhere else. Escaping "<" as its JSON unicode form leaves the parsed data
  // identical, so consumers see exactly the same object.
  return JSON.stringify([person, website]).replace(/</g, "\\u003c");
}

const JSON_LD = buildJsonLd();

function NotFoundComponent() {
  // Finding a page that doesn't exist is itself a secret achievement.
  useEffect(() => {
    unlock("lost-in-space");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-space px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-accent-bright">404</h1>
        <h2 className="font-display mt-4 text-xl font-semibold text-ink">Lost in space</h2>
        <p className="mt-2 text-sm text-muted-portfolio">
          The page you're looking for drifted off the map or never existed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className={PILL_CLASS} style={PILL_STYLE}>
            Home
          </Link>
          <Link to="/" hash="projects" className={PILL_CLASS} style={PILL_STYLE}>
            Projects
          </Link>
          <Link to="/gallery" className={PILL_CLASS} style={PILL_STYLE}>
            Photography
          </Link>
          <a
            href={assetUrl(PROFILE.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={PILL_CLASS}
            style={PILL_STYLE}
          >
            Résumé
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-space px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-portfolio">
          Something went wrong on our end. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={PILL_CLASS}
            style={PILL_STYLE}
          >
            Try again
          </button>
          <a href={assetUrl("")} className={PILL_CLASS} style={PILL_STYLE}>
            Home
          </a>
          <a
            href={assetUrl(PROFILE.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={PILL_CLASS}
            style={PILL_STYLE}
          >
            Résumé
          </a>
        </div>
      </div>
    </div>
  );
}

// Translucent accent pill button, matching nav.tsx's Résumé button language.
// Token-based text color so it reads correctly in both dark and light themes.
const PILL_CLASS =
  "font-display font-semibold no-underline rounded-full px-[16px] py-[8px] text-ink " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright";
const PILL_STYLE = {
  fontSize: 14.5,
  background: "rgba(47,155,255,0.14)",
  border: "1px solid rgba(93,182,255,0.35)",
} as const;

// Skip-to-content link. Invisible (but present, and focusable) until it receives focus,
// at which point it becomes a solid pill pinned to the top-left above the nav. `focus:`
// rather than `focus-visible:` — a skip link is only ever reached by keyboard.
// `font-display`/`text-ink` are hand-written classes in styles.css, NOT Tailwind theme
// utilities, so they cannot take a `focus:` variant — they are applied unconditionally
// (harmless: sr-only clips the link to a 1px box until it is focused).
const SKIP_LINK_CLASS =
  "font-display text-ink sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 " +
  "focus:z-[100] focus:rounded-full focus:px-5 focus:py-3 focus:text-sm focus:font-semibold " +
  "focus:no-underline focus:outline-none focus:ring-2 focus:ring-accent-bright";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      {
        name: "description",
        content: SITE_DESCRIPTION,
      },
      { name: "author", content: "Saivenkat Jilla" },
      {
        property: "og:title",
        content: SITE_TITLE,
      },
      {
        property: "og:description",
        content: SITE_DESCRIPTION,
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Saivenkat Jilla" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:width", content: OG_IMAGE_WIDTH },
      { property: "og:image:height", content: OG_IMAGE_HEIGHT },
      { property: "og:image:alt", content: `Social card for ${SITE_TITLE}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    // NO canonical here. A blanket canonical in the root shell would point every route at
    // the homepage: TanStack dedupes `meta` by name/property but does NOT dedupe `links`
    // by `rel`, so a root canonical cannot be overridden — it either wins outright (the
    // route drops out of the index as a duplicate of "/") or it coexists with the route's
    // own canonical, and Google ignores BOTH when they conflict. Every indexable route
    // therefore declares exactly one canonical of its own: see routes/index.tsx,
    // hobbies.tsx, achievements.tsx, acheivements.tsx and projects.$slug.tsx.
    links: [
      // 32x32 cut of the logo, not the 292 kB original: a favicon is fetched on every
      // route. Bare manifest path, so it goes through assetUrl() like everything else.
      { rel: "icon", type: "image/png", sizes: "32x32", href: assetUrl(FAVICON.src) },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Runs synchronously before first paint to prevent a flash-of-wrong-theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
        {/* Structured data: Person + WebSite. Absolute URLs required. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body>
        {/* Skip link. Deliberately the very first node in <body> so it is the first
            focusable element in the document: a keyboard user can jump the fixed nav
            (and, on /hobbies, up to 24 photo tiles) in one Tab + Enter. It is a plain
            <a> with a fragment href, not a <Link>, so the browser handles it natively
            and it still works on the statically prerendered HTML with JS disabled.
            Each content route is responsible for exposing the matching id="main-content"
            on its <main>; where it is absent the link simply no-ops rather than breaking.
            sr-only hides it until focus; focus:fixed + z-[100] then floats it over the
            z-50 nav instead of letting not-sr-only drop it back into flow (which would
            shift the page). */}
        <a
          href="#main-content"
          className={SKIP_LINK_CLASS}
          style={{
            background: "var(--portfolio-panel)",
            border: "1px solid var(--portfolio-border)",
          }}
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * The palette UI — cmdk, a Radix dialog and a dozen icons, none of which any
 * route needs until someone actually opens it. This is the app's only code-split
 * boundary, and it is worth roughly 68 kB off every route's initial payload.
 */
const CommandPalette = lazy(() =>
  loadCommandPalette().then((module) => ({ default: module.CommandPalette })),
);

/**
 * Eager, ~nothing-sized shell for the ⌘K palette.
 *
 * It exists so the palette can be lazy WITHOUT the shortcut becoming lazy too.
 * The global keydown / pointerdown listeners are installed here on mount —
 * exactly where {@link CommandPalette}'s own effect used to install them — so the
 * very first ⌘K is caught, toggling and Escape work while the chunk is still in
 * flight, and the Keyboard Warrior input flags never miss an event. See
 * lib/command-palette.ts.
 *
 * Renders `null` until the palette has been opened at least once, so the
 * prerendered HTML and the hydration render are byte-identical to before (a
 * closed dialog rendered nothing anyway) and no Suspense boundary reaches SSR.
 * After that first open it stays mounted: unmounting on close would cut off the
 * dialog's exit animation and re-suspend on every subsequent ⌘K.
 */
function CommandPaletteHost() {
  const open = usePaletteOpen();
  const [everOpened, setEverOpened] = useState(false);

  // Adjusting state during render (the sanctioned React pattern) rather than in
  // an effect: it re-renders immediately without an extra commit, so the chunk
  // request starts in the same tick as the keypress that asked for it.
  if (open && !everOpened) setEverOpened(true);

  useEffect(() => installPaletteShortcuts(), []);

  // Warm the chunk when the browser has nothing better to do, so a first ⌘K has
  // nothing to wait for. Idle-scheduled and Save-Data-aware, so it can never
  // compete with hydration or a route transition.
  useEffect(() => prefetchCommandPaletteWhenIdle(), []);

  if (!everOpened) return null;

  return (
    <Suspense fallback={null}>
      <CommandPalette />
    </Suspense>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Privacy-first, opt-in analytics + Web Vitals. Inert unless configured.
  useEffect(() => {
    return initAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every framer-motion animation below this point honour
          prefers-reduced-motion: transform/layout animations snap to their target value
          while opacity still cross-fades. It has to sit ABOVE <Outlet />, because the
          components that animate on mount — Reveal (components/portfolio/section.tsx),
          the portrait ring, the status dot, the globe orbit — live inside the routes, and
          MotionConfig only reaches motion components in its React subtree. Wrapping the
          whole outlet is what makes this a one-line fix instead of a per-component audit. */}
      <MotionConfig reducedMotion="user">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        {/* ⌘K command palette — mounted once so it works on every route. The
            shortcut is eager; the palette UI is fetched the first time it opens. */}
        <CommandPaletteHost />
        {/* Achievements: ambient tracking + the bottom-left unlock popup. Both are
            mounted here so they survive route changes and work off the landing page. */}
        <AchievementTracker />
        <AchievementToaster />
        {/* Back-to-top. Mounted here rather than per-route: it reveals itself off scroll
            position, so it costs nothing on a page too short to scroll and appears on any
            page that grows — /gallery above all, which is 32 rows of photos deep. */}
        <ScrollTop />
      </MotionConfig>
    </QueryClientProvider>
  );
}
