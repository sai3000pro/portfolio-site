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
const BLOG_PATH = join(__dirname, "../src/data/blog.ts");

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
 * Blog posts, parsed out of src/data/blog.ts the same way project titles are parsed
 * out of portfolio.ts — these scripts are .mjs and cannot import a .ts module.
 *
 * Slugs are EXPLICIT in the data (not derived from the title) so a post keeps its URL
 * if the headline is later reworded; we read the `slug:` field directly rather than
 * slugifying anything, which is why this needs its own parser.
 *
 * @returns {{ slug: string, title: string, date: string }[]}
 */
export function getBlogPosts() {
  let source;
  try {
    source = readFileSync(BLOG_PATH, "utf8");
  } catch {
    return []; // No blog data file — the blog is simply absent.
  }

  const marker = "export const BLOG_POSTS";
  const start = source.indexOf(marker);
  if (start === -1) return [];
  const rest = source.slice(start + marker.length);
  const nextExport = rest.search(/\nexport\s/);
  const block = nextExport === -1 ? rest : rest.slice(0, nextExport);

  // Each entry contributes a slug; title/date are read from the same object by
  // scanning forward from the slug match, so field order inside an entry is free.
  const posts = [];
  for (const match of block.matchAll(/slug:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const slug = match[1];
    const tail = block.slice(match.index);
    const title = tail.match(/title:\s*"((?:[^"\\]|\\.)*)"/);
    const date = tail.match(/date:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/);
    posts.push({
      slug,
      title: title ? title[1] : slug,
      date: date ? date[1] : "",
    });
  }
  // Newest first, matching getSortedPosts() in src/data/blog.ts.
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * @typedef {Object} RouteMeta
 * @property {string} path        Route path, e.g. "/" or "/projects/verbalyst".
 * @property {string} title       Human title used on the OG image.
 * @property {string} changefreq  sitemap <changefreq>.
 * @property {number} priority    sitemap <priority>.
 * @property {string} ogFile      OG image path relative to the public dir. PNG — the
 *                                major social scrapers reject SVG (see scripts/seo.mjs).
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
    { path: "/", title: fullName, changefreq: "monthly", priority: 1.0, ogFile: "og/index.png" },

    // --- /hobbies and the four pages split out of it -------------------------
    //
    // /hobbies used to BE the photo wall plus a blog listing plus volunteering, all on
    // one route. It is now a hub that links to the four pages below. `title` here is
    // printed verbatim on the generated OG card (scripts/seo.mjs), and the owner's name
    // is drawn separately underneath it — so these are the bare page names, matching each
    // route module's own <title> minus its " — Saivenkat Jilla" suffix.
    //
    // This entry said "Photography" while the page's <title> already said "Beyond the
    // Code", so /hobbies shipped a social card labelled with a different name than the
    // page. Corrected here; "Photography" moves to /gallery, which is what actually
    // inherited the photo wall.
    {
      path: "/hobbies",
      title: "Beyond the Code",
      // Thin hub: its own copy rarely changes, and it is a signpost to the pages below
      // rather than a destination, so it ranks under the content it links to.
      changefreq: "monthly",
      priority: 0.5,
      ogFile: "og/hobbies.png",
    },
    {
      // The motion-heavy photo wall. Inherits /hobbies' old changefreq/priority along
      // with its content — this is the page that used to justify them.
      path: "/gallery",
      title: "Photography",
      changefreq: "monthly",
      priority: 0.7,
      ogFile: "og/gallery.png",
    },
    {
      // MANUAL ENTRY — the /blog/<slug> loop further down derives one route per post and
      // never an index, so without this line /blog would not prerender at all: a hard
      // refresh would fall through to 404.html, and it would get no sitemap entry and no
      // OG card. Adding a post still needs no change here; adding the index did.
      path: "/blog",
      title: "Blog",
      changefreq: "monthly",
      priority: 0.6,
      ogFile: "og/blog.png",
    },
    {
      path: "/gaming",
      title: "Gaming",
      changefreq: "monthly",
      priority: 0.5,
      ogFile: "og/gaming.png",
    },
    {
      path: "/volunteering",
      title: "Volunteering",
      changefreq: "monthly",
      priority: 0.6,
      ogFile: "og/volunteering.png",
    },
    {
      path: "/achievements",
      title: "Achievements",
      changefreq: "weekly",
      priority: 0.6,
      ogFile: "og/achievements.png",
    },
    // The load-bearing typo: prerendered so the URL resolves and forwards, but
    // noindex + excluded from the sitemap so it never competes with the real page.
    {
      path: "/acheivements",
      title: "Achievements",
      changefreq: "yearly",
      priority: 0.1,
      ogFile: "og/achievements.png",
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
      ogFile: `og/projects-${slug}.png`,
    });
  }

  // One route per post. Posts only — the /blog index is NOT derivable from this list
  // (an empty blog still needs an index page), so it is declared by hand above.
  // The og/blog-<slug>.png names cannot collide with the index's og/blog.png.
  for (const post of getBlogPosts()) {
    meta.push({
      path: `/blog/${post.slug}`,
      title: post.title,
      changefreq: "yearly",
      priority: 0.6,
      ogFile: `og/blog-${post.slug}.png`,
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
 * THE definition of the deploy base — not a mirror of one. vite.config.ts imports
 * this for Vite's `base`, so the asset URLs the build emits and the absolute URLs
 * baked into sitemap.xml, robots.txt and the HTML canonicals all come from this one
 * expression. They used to be two expressions that disagreed: vite.config.ts fell
 * back to "/" with no GITHUB_REPOSITORY while this function fell back to
 * "/portfolio-site/", so a local build shipped root-relative assets and a canonical
 * of https://sai3000pro.github.io/ next to a sitemap full of
 * https://sai3000pro.github.io/portfolio-site/ URLs. Under Actions both derived
 * "/portfolio-site/" and agreed, which is why it stayed hidden.
 *
 * Resolution order:
 *   - SITE_BASE wins if set. The explicit escape hatch for serving the build from
 *     somewhere other than /<repo>/ — a custom domain, a local static server, a
 *     self-hosted path. "/" is accepted and normalizes to root. (Nothing in CI sets
 *     it today: the Lighthouse job audits the real base-path artifact rather than
 *     rebuilding at the root, precisely so the audit cannot drift from the deploy.)
 *   - else "/<repo>/" derived from GITHUB_REPOSITORY, which Actions always sets.
 *     username.github.io user/org pages are served from the root, so those get "/".
 *   - else "/": no GITHUB_REPOSITORY means a local build, and `vite dev`,
 *     `vite preview` and any plain static server all serve dist from the root.
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

  return "/";
}

/**
 * Absolute, deploy-correct URL for a route path.
 *
 * Non-root routes ALWAYS get a trailing slash. scripts/prerender.mjs writes each one as
 * `<route>/index.html`, and GitHub Pages 301-redirects the slashless form onto the
 * slashed one — so a sitemap full of slashless URLs is a sitemap full of redirects, and
 * it disagrees with the runtime canonicals. `absoluteUrl` in src/lib/site-url.ts applies
 * the identical rule; the two must stay in step.
 *
 * @param {string} route  e.g. "/" or "/projects/verbalyst".
 * @returns {string}
 */
export function absoluteUrl(route) {
  const base = getBase(); // e.g. "/portfolio-site/"
  if (route === "/") return SITE_ORIGIN + base;
  return SITE_ORIGIN + base.replace(/\/$/, "") + route.replace(/\/+$/, "") + "/";
}
