// Build-time SEO artifact generator. Called by scripts/prerender.mjs after the
// static HTML has been written into the public dir. Produces:
//   - sitemap.xml   (all prerendered routes, absolute URLs, git-derived <lastmod>)
//   - robots.txt    (allow-all, absolute Sitemap: line)
//   - og/*.png      (one 1200x630 social card per route)
//
// The cards are authored as hand-built SVG (buildOgSvg) and then rasterized to
// PNG with sharp. They MUST ship as PNG: Facebook, X and LinkedIn all reject an
// SVG og:image outright, which silently downgrades every `summary_large_image`
// share to a bare text card. sharp is already a devDependency and already drives
// scripts/photos.mjs, so rasterizing here costs no new dependency.

import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { getRouteMeta, getFullName, absoluteUrl, SITE_ORIGIN, getBase } from "./routes.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Open Graph card geometry. Matches the SVG viewBox and the og:image:width/height meta. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Escape a string for safe inclusion in XML/SVG text or attributes. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// --- Per-route <lastmod>, derived from git ---------------------------------
//
// <lastmod> used to be the build timestamp on every URL, which told crawlers that
// all eight pages changed on every deploy. A signal that is always "everything
// changed" is a signal crawlers learn to ignore, so each route now reports the
// commit date of the source files that actually produce it.
//
// MAPPING POLICY: a route maps to the files that determine its *content* — its
// route module, the components it renders, and the data it reads. It deliberately
// does NOT include the global shell (__root.tsx, nav, starfield, theme toggle,
// styles.css). Those touch every page, so folding them in would push every route
// to the same date the moment anyone tweaks the nav — which is the uniform-date
// problem this replaces. Restyling the chrome is also not the kind of change a
// crawler needs to re-fetch a page for.
//
// Consequences worth knowing:
//   - All /projects/<slug> routes share a date. Every case study is defined in the
//     single PROJECTS array in src/data/portfolio.ts, so there is nothing
//     per-project to date. Splitting them would require per-project source files.
//   - Uncommitted working-tree edits do not move the date; only commits do. That is
//     the right call for a deploy artifact, since only committed work ships.
const ROUTE_SOURCES = {
  "/": [
    "src/routes/index.tsx",
    "src/components/portfolio/about.tsx",
    "src/components/portfolio/experience.tsx",
    "src/components/portfolio/projects.tsx",
    "src/components/portfolio/contact.tsx",
    "src/components/portfolio/section.tsx",
    "src/data/portfolio.ts",
  ],
  // /hobbies was one page carrying the photo wall, the blog listing and volunteering, so
  // it mapped to all nine of their source files and reported whichever changed last —
  // publishing a blog post moved the photo wall's date too. It is now a hub, and the four
  // pages split out of it each map to only the files that produce them.
  //
  // A pathspec with no commit history is safe here: `git log -- <unmatched path>` exits 0
  // with empty stdout (it is not an error the way `git diff --exit-code` or
  // `ls-files --error-unmatch` would be), so runGit returns "", the %cI regex fails, and
  // the route falls back to the build date with a warnOnce. That matters because these
  // five modules are brand new and uncommitted, and because prerender.mjs
  // process.exit(1)s on a thrown error — this must degrade, never throw.
  //
  // hobby-hub.tsx is listed ONLY under /hobbies: it exports HobbyHub, the hub's link
  // cards, which is that page's entire content. It also exports PageShell, the
  // Nav/Starfield/Footer wrapper all five pages use — but per the MAPPING POLICY above,
  // shared chrome is deliberately not mapped to the pages it wraps.
  "/hobbies": ["src/routes/hobbies.tsx", "src/components/portfolio/hobby-hub.tsx"],
  "/gallery": [
    "src/routes/gallery.tsx",
    "src/components/portfolio/photo-gallery.tsx",
    "src/components/portfolio/hobby-lightbox.tsx",
    "src/data/hobbies.ts",
    "src/data/hobbies.generated.ts",
  ],
  // blog.index.tsx, not blog.tsx: flat file routing spells the index that way alongside
  // the existing blog.$slug.tsx. Distinct from BLOG_ROUTE_SOURCES below — the index is
  // dated by the listing component, each post by the post template.
  "/blog": [
    "src/routes/blog.index.tsx",
    "src/components/portfolio/blog-list.tsx",
    "src/data/blog.ts",
  ],
  // /gaming is a placeholder page today, so its route module is currently its only
  // content. src/data/gaming.ts is listed ahead of existing: it is where the real
  // content will land, and an unmatched pathspec is inert until then (see above).
  "/gaming": ["src/routes/gaming.tsx", "src/data/gaming.ts"],
  "/volunteering": [
    "src/routes/volunteering.tsx",
    "src/components/portfolio/volunteering.tsx",
    "src/data/volunteering.ts",
  ],
  "/achievements": [
    "src/routes/achievements.tsx",
    "src/components/portfolio/achievement-grid.tsx",
    "src/components/portfolio/achievement-badge.tsx",
    "src/data/achievements.ts",
    "src/lib/achievements.ts",
  ],
  // Kept for completeness; the alias is `sitemap: false` so it never reaches a <lastmod>.
  "/acheivements": ["src/routes/acheivements.tsx"],
};

/** Sources behind every /projects/<slug> case study. See MAPPING POLICY above. */
const PROJECT_ROUTE_SOURCES = ["src/routes/projects.$slug.tsx", "src/data/portfolio.ts"];

/** Sources behind every /blog/<slug> post. Post copy lives in the data file. */
const BLOG_ROUTE_SOURCES = ["src/routes/blog.$slug.tsx", "src/data/blog.ts"];

/**
 * Run git in the repo root and return trimmed stdout, or null on any failure.
 *
 * Never throws: prerender.mjs process.exit(1)s if SEO generation rejects, so a
 * missing git binary, a non-repo tarball or a hung command must degrade, not fail
 * the deploy. No shell is used, which keeps the "$" in `projects.$slug.tsx` literal
 * and behaves identically on Windows and Linux.
 *
 * @param {string[]} args
 * @returns {string | null}
 */
function runGit(args) {
  try {
    const result = spawnSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10_000,
    });
    if (result.error || result.status !== 0) return null;
    return String(result.stdout ?? "").trim();
  } catch {
    return null;
  }
}

const warned = new Set();
function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`sitemap lastmod: ${message}`);
}

/** Memoized probe: is git usable here, and is the checkout shallow? */
let gitProbe = null;
function probeGit() {
  if (gitProbe) return gitProbe;
  const inWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);
  gitProbe = {
    usable: inWorkTree === "true",
    // A shallow clone (actions/checkout defaults to fetch-depth: 1) has almost no
    // history, so most `git log -- <path>` lookups come back empty and fall back.
    shallow: inWorkTree === "true" && runGit(["rev-parse", "--is-shallow-repository"]) === "true",
  };
  return gitProbe;
}

/**
 * Build a route -> "YYYY-MM-DD" resolver backed by git, falling back to the build
 * date per route whenever git can't answer.
 *
 * @param {Date} now  Build timestamp, used as the per-route fallback.
 * @returns {(routePath: string) => string}
 */
function makeLastmodResolver(now) {
  const fallback = now.toISOString().slice(0, 10);
  const { usable, shallow } = probeGit();

  if (!usable) {
    warnOnce(
      `git unavailable or not a work tree — using the build date (${fallback}) for all routes`,
    );
    return () => fallback;
  }
  if (shallow) {
    warnOnce(
      `shallow clone — history is truncated, so routes with no reachable commit fall back to the build date (${fallback}). Set fetch-depth: 0 on the checkout that runs build:static for real per-route dates.`,
    );
  }

  // Routes sharing a source list (every /projects/<slug>) resolve with one git call.
  const cache = new Map();
  return (routePath) => {
    let sources;
    if (routePath.startsWith("/projects/")) sources = PROJECT_ROUTE_SOURCES;
    else if (routePath.startsWith("/blog/")) sources = BLOG_ROUTE_SOURCES;
    else sources = ROUTE_SOURCES[routePath];
    if (!sources || sources.length === 0) {
      warnOnce(`no source mapping for ${routePath} — using the build date (${fallback})`);
      return fallback;
    }

    const key = sources.join(" ");
    if (!cache.has(key)) {
      // -1 over several pathspecs = the most recent commit touching ANY of them.
      // Empty stdout means no commit reaches these files: untracked/new, or cut off
      // by a shallow clone. Either way, fall back rather than emit nothing.
      const iso = runGit(["log", "-1", "--format=%cI", "--", ...sources]);
      const day = iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;
      if (!day) warnOnce(`no git history for ${routePath} — using the build date (${fallback})`);
      cache.set(key, day ?? fallback);
    }
    return cache.get(key);
  };
}

/**
 * Build the sitemap.xml body covering every prerendered route.
 *
 * @param {Date} [now]  Fallback timestamp for <lastmod> when git can't date a route.
 * @returns {string}
 */
export function buildSitemapXml(now = new Date()) {
  const lastmodFor = makeLastmodResolver(now);
  const urls = getRouteMeta()
    // Routes flagged `sitemap: false` are still prerendered, but must not be
    // advertised for indexing (see the /acheivements alias in routes.mjs).
    .filter((route) => route.sitemap !== false)
    .map((route) => {
      const loc = escapeXml(absoluteUrl(route.path));
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmodFor(route.path)}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority.toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * Build robots.txt with an absolute Sitemap: URL that matches the deploy base.
 *
 * @returns {string}
 */
export function buildRobotsTxt() {
  const sitemapUrl = SITE_ORIGIN + getBase().replace(/\/$/, "") + "/sitemap.xml";
  return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
}

/**
 * Build an on-brand 1200x630 Open Graph card as SVG.
 *
 * This is the authoring format only — {@link renderOgPng} rasterizes it before it is
 * written to disk. Nothing should reference the SVG as an og:image.
 *
 * @param {string} title  Page title (e.g. project name or "Hobbies").
 * @param {string} name   Site owner's name, shown as the footer label.
 * @returns {string}
 */
export function buildOgSvg(title, name) {
  const fontStack =
    "'Sora', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const safeTitle = escapeXml(title);
  const safeName = escapeXml(name);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5db6ff"/>
      <stop offset="100%" stop-color="#2f7fd1"/>
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#000005"/>
  <rect x="0" y="0" width="${OG_WIDTH}" height="10" fill="url(#accent)"/>
  <circle cx="1040" cy="150" r="220" fill="#5db6ff" opacity="0.08"/>
  <text x="90" y="300" font-family="${fontStack}" font-size="84" font-weight="700" fill="#f5f8ff">${safeTitle}</text>
  <text x="92" y="392" font-family="${fontStack}" font-size="34" font-weight="400" fill="#5db6ff">${safeName}</text>
  <text x="90" y="560" font-family="${fontStack}" font-size="26" font-weight="400" fill="#8aa0c0">Software engineer · photographer · student advocate</text>
</svg>
`;
}

/**
 * Rasterize an OG card to a 1200x630 PNG buffer.
 *
 * `sharp(Buffer.from(svg))` decodes SVG through libvips' resvg/librsvg backend. The card
 * declares explicit pixel width/height, so no density or resize argument is needed — but
 * we still pin the output size so a future SVG edit can't quietly change the card's
 * dimensions out from under the og:image:width/height meta.
 *
 * The font stack resolves against the BUILD machine's installed fonts, not the viewer's:
 * 'Sora' is a webfont and is not installed on CI, so the card renders in the generic
 * sans fallback. That is a deliberate accepted tradeoff — baking a real fallback into a
 * PNG beats an SVG that no scraper will fetch at all. Install Sora on the builder if the
 * exact brand face ever matters.
 *
 * @param {string} title @param {string} name
 * @returns {Promise<Buffer>}
 */
export async function renderOgPng(title, name) {
  return sharp(Buffer.from(buildOgSvg(title, name)))
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Generate sitemap.xml, robots.txt and per-route OG images into the public dir.
 *
 * @param {string} publicDir  Absolute path to the prerender output (dist/public).
 * @returns {Promise<{ sitemap: string, robots: string, ogFiles: string[] }>}
 */
export async function generateSeoArtifacts(publicDir) {
  const name = getFullName();
  const meta = getRouteMeta();

  // sitemap.xml + robots.txt
  const sitemapPath = join(publicDir, "sitemap.xml");
  const robotsPath = join(publicDir, "robots.txt");
  await writeFile(sitemapPath, buildSitemapXml());
  await writeFile(robotsPath, buildRobotsTxt());

  // Per-route OG cards, rasterized to PNG. Routes may share a card (the /acheivements
  // alias reuses /achievements'), so render each distinct file exactly once.
  const ogFiles = [];
  const seen = new Set();
  for (const route of meta) {
    if (seen.has(route.ogFile)) continue;
    seen.add(route.ogFile);
    const outPath = join(publicDir, route.ogFile);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, await renderOgPng(route.title, name));
    ogFiles.push(route.ogFile);
  }

  return { sitemap: sitemapPath, robots: robotsPath, ogFiles };
}
