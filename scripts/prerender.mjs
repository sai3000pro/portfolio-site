import { writeFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { ROUTES } from "./routes.mjs";
import { generateSeoArtifacts } from "./seo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// pathToFileURL: on Windows a bare "C:\..." path is not a valid ESM specifier.
const ssr = await import(pathToFileURL(join(__dirname, "../dist/server/_ssr/index.mjs")).href).then(
  (m) => m.default,
);

async function findPublicDir() {
  const candidates = [join(__dirname, "../dist/public"), join(__dirname, "../dist/client")];
  for (const dir of candidates) {
    try {
      const s = await stat(dir);
      if (s.isDirectory()) return dir;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

const origin = "http://localhost:3000";
const publicDir = await findPublicDir();
await mkdir(publicDir, { recursive: true });

// ROUTES is the single source of truth (scripts/routes.mjs). It derives the
// /projects/<slug> case-study routes from src/data/portfolio.ts, so new projects
// are prerendered automatically without touching this file.
for (const route of ROUTES) {
  let url = origin + route;
  let response = await ssr.fetch(new Request(url));

  // Follow any base-path redirect (TanStack Router redirects / to /<base>/).
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    url = new URL(response.headers.get("location"), origin).href;
    response = await ssr.fetch(new Request(url));
  }

  if (!response.ok) {
    console.error(`Prerender failed with status ${response.status} for ${url}`);
    process.exit(1);
  }

  const html = await response.text();
  const outDir = route === "/" ? publicDir : join(publicDir, route);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), html);

  console.log(`Prerendered ${url} → ${join(outDir, "index.html")}`);
}

// GitHub Pages serves 404.html for any path it has no file for. It must NOT be a copy
// of the landing page: this app hydrates <html> with hydrateRoot (TanStack Start renders
// the whole document), so hydration only succeeds when the served markup matches what the
// client renders for the current URL. Serving landing-page markup at an unknown URL makes
// the client render the not-found route against a hero DOM — a whole-document hydration
// mismatch that React resolves by throwing the server markup away, which is the blank
// screen a visitor to /portfolio-site/<garbage> currently sees.
//
// The SSR handler already returns the real, styled 404 ("Lost in space") with status 404
// for any unmatched path, so we capture THAT as 404.html. The markup then matches the
// client render exactly, the page paints its not-found UI instead of blanking, and the
// NotFoundComponent's effect that unlocks the "lost-in-space" achievement actually runs.
//
// The probe path only has to be one no route matches; its exact value never reaches the
// user (GitHub serves this file's CONTENT at whatever URL 404'd). It must go THROUGH the
// deploy base, though: under a base like /portfolio-site/ the router 307-redirects a
// bare /__not_found__ onto the base before it can 404, so we follow that redirect exactly
// as the route loop above does, then assert the destination really is a 404 — a 3xx or
// 2xx here would mean we captured a redirect stub or a real page, so we refuse to ship it.
{
  let url = `${origin}/__not_found__`;
  let response = await ssr.fetch(new Request(url));
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    url = new URL(response.headers.get("location"), origin).href;
    response = await ssr.fetch(new Request(url));
  }
  if (response.status !== 404) {
    console.error(
      `Expected 404 when prerendering the not-found page for ${url}, got ${response.status}. ` +
        `The SPA fallback (404.html) would be wrong — refusing to ship it.`,
    );
    process.exit(1);
  }
  const html = await response.text();
  await writeFile(join(publicDir, "404.html"), html);
  console.log(`Prerendered 404 fallback → ${join(publicDir, "404.html")}`);
}

// Emit sitemap.xml, robots.txt and per-route OG images from the same route list.
try {
  const { sitemap, robots, ogFiles } = await generateSeoArtifacts(publicDir);
  console.log(`Wrote ${sitemap}`);
  console.log(`Wrote ${robots}`);
  console.log(`Wrote ${ogFiles.length} OG image(s): ${ogFiles.join(", ")}`);
} catch (err) {
  console.error(`SEO artifact generation failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
