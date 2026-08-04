// Single source of truth for the site's prerendered route list.
//
// Both scripts/prerender.mjs (static HTML + sitemap + robots + OG images) and
// vite.config.ts (nitro.prerender.routes) import from here so the two can never
// drift. Project case-study routes (/projects/<slug>) are derived from the
// PROJECTS titles in src/data/portfolio.ts.
//
// portfolio.ts is TypeScript and these scripts are plain .mjs, so we do NOT
// import it (a bare `import` of a .ts file would fail under node). Instead we
// read the file and pull the titles/profile out with small, tolerant regexes.
// This is the simplest reliable approach: it needs no build step and no extra
// dependency, and it runs identically on Windows and Linux.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_PATH = join(__dirname, "../src/data/portfolio.ts");

/**
 * Canonical slug rule — MUST match the sibling agent's /projects/$slug rule:
 * lowercase, trim, replace any run of non-alphanumeric characters with "-",
 * then strip leading/trailing "-".
 *
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Read portfolio.ts once per process.
let cachedSource = null;
function readPortfolioSource() {
  if (cachedSource === null) {
    cachedSource = readFileSync(PORTFOLIO_PATH, "utf8");
  }
  return cachedSource;
}

/**
 * Extract the `export const PROJECTS: Project[] = [ ... ]` block so we don't
 * accidentally scoop up `title:` fields from EXPERIENCES or elsewhere.
 *
 * @param {string} source
 * @returns {string}
 */
function extractProjectsBlock(source) {
  const marker = "export const PROJECTS";
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error("routes.mjs: could not find `export const PROJECTS` in portfolio.ts");
  }
  // Everything up to the next top-level `export` statement is the PROJECTS block.
  const rest = source.slice(start + marker.length);
  const nextExport = rest.search(/\nexport\s/);
  return nextExport === -1 ? rest : rest.slice(0, nextExport);
}

/**
 * Pull the ordered list of project titles out of portfolio.ts.
 *
 * @returns {string[]}
 */
export function getProjectTitles() {
  const block = extractProjectsBlock(readPortfolioSource());
  const titles = [...block.matchAll(/title:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  if (titles.length === 0) {
    throw new Error("routes.mjs: found the PROJECTS block but no project titles");
  }
  return titles;
}

/**
 * Project slugs derived from the titles via {@link slugify}.
 *
 * @returns {string[]}
 */
export function getProjectSlugs() {
  return getProjectTitles().map(slugify);
}

/**
 * The site owner's full name, parsed from the PROFILE block. Used on OG images.
 * Falls back to a sane default if the field ever moves.
 *
 * @returns {string}
 */
export function getFullName() {
  const match = readPortfolioSource().match(/fullName:\s*"((?:[^"\\]|\\.)*)"/);
  return match ? match[1] : "Saivenkat Jilla";
}

/**
 * @typedef {Object} RouteMeta
 * @property {string} path        Route path, e.g. "/" or "/projects/verbalyst".
 * @property {string} title       Human title used on the OG image.
 * @property {string} changefreq  sitemap <changefreq>.
 * @property {number} priority    sitemap <priority>.
 * @property {string} ogFile      OG image path relative to the public dir.
 * @property {boolean} [sitemap]  Set false to prerender the route but keep it out
 *                                of sitemap.xml (e.g. the /acheivements alias,
 *                                which is noindex and forwards to /achievements).
 */

/**
 * Canonical route metadata, including the derived project case-study routes.
 *
 * @returns {RouteMeta[]}
 */
export function getRouteMeta() {
  const fullName = getFullName();
  const meta = [
    { path: "/", title: fullName, changefreq: "monthly", priority: 1.0, ogFile: "og/index.svg" },
    {
      path: "/hobbies",
      title: "Hobbies",
      changefreq: "monthly",
      priority: 0.7,
      ogFile: "og/hobbies.svg",
    },
    {
      path: "/achievements",
      title: "Achievements",
      changefreq: "weekly",
      priority: 0.6,
      ogFile: "og/achievements.svg",
    },
    // The load-bearing typo: prerendered so the URL resolves and forwards, but
    // noindex + excluded from the sitemap so it never competes with the real page.
    {
      path: "/acheivements",
      title: "Achievements",
      changefreq: "yearly",
      priority: 0.1,
      ogFile: "og/achievements.svg",
      sitemap: false,
    },
  ];

  for (const title of getProjectTitles()) {
    const slug = slugify(title);
    meta.push({
      path: `/projects/${slug}`,
      title,
      changefreq: "yearly",
      priority: 0.8,
      ogFile: `og/projects-${slug}.svg`,
    });
  }

  return meta;
}

/**
 * Flat list of route paths. Consumed by prerender.mjs's ROUTES loop and mirrored
 * into vite.config.ts's nitro.prerender.routes.
 *
 * @returns {string[]}
 */
export function getRoutes() {
  return getRouteMeta().map((m) => m.path);
}

/** Precomputed route list for ergonomic importing. @type {string[]} */
export const ROUTES = getRoutes();

// --- Absolute-URL helpers -------------------------------------------------

/**
 * Production origin (scheme + host, no trailing slash). Override with SITE_ORIGIN.
 * Default is this repo's GitHub Pages user host.
 */
export const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://sai3000pro.github.io").replace(
  /\/+$/,
  "",
);

/**
 * Deploy base path (always leading + trailing slash), e.g. "/portfolio-site/".
 *
 * Mirrors the base-path logic in vite.config.ts so sitemap/robots URLs match the
 * asset URLs the build emits:
 *   - SITE_BASE wins if set (CI's Lighthouse job sets it to "/").
 *   - else derive "/<repo>/" from GITHUB_REPOSITORY (root for *.github.io repos).
 *   - else fall back to this repo's documented default, "/portfolio-site/".
 *
 * @returns {string}
 */
export function getBase() {
  const withSlashes = (b) => `/${b.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
  if (process.env.SITE_BASE) return withSlashes(process.env.SITE_BASE);

  const repo = process.env.GITHUB_REPOSITORY
    ? process.env.GITHUB_REPOSITORY.split("/")[1]
    : undefined;
  if (repo) return repo.endsWith(".github.io") ? "/" : withSlashes(repo);

  return "/portfolio-site/";
}

/**
 * Absolute, deploy-correct URL for a route path.
 *
 * @param {string} route  e.g. "/" or "/projects/verbalyst".
 * @returns {string}
 */
export function absoluteUrl(route) {
  const base = getBase(); // e.g. "/portfolio-site/"
  if (route === "/") return SITE_ORIGIN + base;
  return SITE_ORIGIN + base.replace(/\/$/, "") + route;
}
