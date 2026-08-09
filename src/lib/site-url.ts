/**
 * Absolute-URL helpers for canonical links, structured data, and OG/Twitter cards.
 *
 * Social scrapers and JSON-LD both REQUIRE absolute URLs — a base-relative path like
 * "/portfolio-site/og/index.png" is silently ignored by most crawlers. Everything that
 * ends up in a <meta> or ld+json URL must go through here.
 *
 * The origin is overridable via VITE_SITE_ORIGIN; the default matches the SITE_ORIGIN
 * default in scripts/seo.mjs so the build-time sitemap and the runtime meta agree.
 */
import { assetUrl } from "@/lib/assets";

export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) || "https://sai3000pro.github.io"
).replace(/\/+$/, "");

/** Vite's build-time base; always ends with "/" (mirrors scripts/routes.mjs getBase()). */
export const BASE_URL = import.meta.env.BASE_URL;

/** Absolute URL of the site root. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_URL}`;

/** Absolute URL for a bare asset path, e.g. "assets/portrait.jpeg". */
export function absoluteAsset(path: string): string {
  return `${SITE_ORIGIN}${assetUrl(path)}`;
}

/**
 * Absolute URL for an in-app path, e.g. "hobbies" or "projects/verbalyst".
 *
 * ALWAYS ends in a trailing slash (the root is just SITE_URL). The prerenderer writes
 * every non-root route as `<route>/index.html`, so GitHub Pages 301-redirects the
 * slashless form onto the slashed one — a canonical pointing at the slashless URL would
 * name a redirect rather than the page itself. `absoluteUrl` in scripts/routes.mjs
 * applies the same rule so the sitemap and these canonicals agree exactly.
 */
export function absoluteUrl(path = ""): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${SITE_URL}${clean}/` : SITE_URL;
}

/**
 * Absolute URL of the generated OG card for a route.
 *
 * `scripts/seo.mjs` writes one PNG card per route into dist/public/og/ — "og/index.png"
 * for "/", and "og/projects-<slug>.png" for case studies (see scripts/routes.mjs).
 * PNG, not SVG: Facebook, X and LinkedIn all reject SVG og:image outright.
 */
export function ogImageUrl(file: string): string {
  return `${SITE_ORIGIN}${assetUrl(`og/${file}`)}`;
}
