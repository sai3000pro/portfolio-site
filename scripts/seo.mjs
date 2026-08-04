// Build-time SEO artifact generator. Called by scripts/prerender.mjs after the
// static HTML has been written into the public dir. Produces:
//   - sitemap.xml   (all prerendered routes, absolute URLs)
//   - robots.txt    (allow-all, absolute Sitemap: line)
//   - og/*.svg      (one 1200x630 social card per route)
//
// No extra dependencies: the OG cards are hand-built SVG. SVG is valid Open
// Graph media, but some social platforms (notably older Facebook/LinkedIn
// scrapers) prefer raster PNG/JPEG and may ignore an SVG og:image. Generating a
// PNG here would require a browser/canvas/satori dependency, which the task
// forbids, so we emit SVG and document the tradeoff honestly. If PNGs become a
// hard requirement later, rasterize these SVGs in CI with a dedicated step.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getRouteMeta, getFullName, absoluteUrl, SITE_ORIGIN, getBase } from "./routes.mjs";

/** Escape a string for safe inclusion in XML/SVG text or attributes. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the sitemap.xml body covering every prerendered route.
 *
 * @param {Date} [now]  Timestamp for <lastmod> (defaults to build time).
 * @returns {string}
 */
export function buildSitemapXml(now = new Date()) {
  const lastmod = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const urls = getRouteMeta()
    // Routes flagged `sitemap: false` are still prerendered, but must not be
    // advertised for indexing (see the /acheivements alias in routes.mjs).
    .filter((route) => route.sitemap !== false)
    .map((route) => {
      const loc = escapeXml(absoluteUrl(route.path));
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
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
 * @param {string} title  Page title (e.g. project name or "Hobbies").
 * @param {string} name   Site owner's name, shown as the footer label.
 * @returns {string}
 */
export function buildOgSvg(title, name) {
  const fontStack =
    "'Sora', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const safeTitle = escapeXml(title);
  const safeName = escapeXml(name);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5db6ff"/>
      <stop offset="100%" stop-color="#2f7fd1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#000005"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#accent)"/>
  <circle cx="1040" cy="150" r="220" fill="#5db6ff" opacity="0.08"/>
  <text x="90" y="300" font-family="${fontStack}" font-size="84" font-weight="700" fill="#f5f8ff">${safeTitle}</text>
  <text x="92" y="392" font-family="${fontStack}" font-size="34" font-weight="400" fill="#5db6ff">${safeName}</text>
  <text x="90" y="560" font-family="${fontStack}" font-size="26" font-weight="400" fill="#8aa0c0">Software engineer · photographer · student advocate</text>
</svg>
`;
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

  // Per-route OG cards.
  const ogFiles = [];
  for (const route of meta) {
    const outPath = join(publicDir, route.ogFile);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, buildOgSvg(route.title, name));
    ogFiles.push(route.ogFile);
  }

  return { sitemap: sitemapPath, robots: robotsPath, ogFiles };
}
