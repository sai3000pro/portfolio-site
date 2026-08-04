import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AchievementToaster } from "../components/portfolio/achievement-toast";
import { AchievementTracker } from "../components/portfolio/achievement-tracker";
import { CommandPalette } from "../components/portfolio/command-palette";
import { PROFILE, SOCIALS } from "../data/portfolio";
import { unlock } from "../lib/achievements";
import { initAnalytics } from "../lib/analytics";
import { assetUrl } from "../lib/assets";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SITE_URL, absoluteAsset, ogImageUrl } from "../lib/site-url";
import { THEME_INIT_SCRIPT } from "../lib/theme";

/**
 * Absolute URL of the ACTUAL generated OG card for "/". scripts/seo.mjs writes
 * per-route SVG cards into dist/public; the "/" route's file is "og/index.svg"
 * (see scripts/routes.mjs `getRouteMeta`).
 */
const OG_IMAGE_URL = ogImageUrl("index.svg");

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
    jobTitle: "Software Engineer",
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

  return JSON.stringify([person, website]);
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
          <Link to="/hobbies" className={PILL_CLASS} style={PILL_STYLE}>
            Hobbies
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
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", type: "image/png", href: `${import.meta.env.BASE_URL}assets/logo.png` },
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
        {children}
        <Scripts />
      </body>
    </html>
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {/* ⌘K command palette — mounted once so it works on every route. */}
      <CommandPalette />
      {/* Achievements: ambient tracking + the bottom-left unlock popup. Both are
          mounted here so they survive route changes and work off the landing page. */}
      <AchievementTracker />
      <AchievementToaster />
    </QueryClientProvider>
  );
}
