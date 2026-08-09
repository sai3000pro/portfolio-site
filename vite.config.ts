// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Single source of truth for BOTH the prerendered route list (incl. derived
// /projects/<slug> case studies) and the deploy base path. scripts/prerender.mjs
// and scripts/seo.mjs import from the same module, so the asset URLs this build
// emits and the absolute URLs in sitemap.xml / robots.txt / the HTML canonicals
// are all derived from one expression and cannot drift.
import { ROUTES, getBase } from "./scripts/routes.mjs";

// See getBase() in scripts/routes.mjs for the full derivation: SITE_BASE wins if
// set, else "/<repo>/" from GITHUB_REPOSITORY (root for username.github.io user
// pages), else "/" for local builds. This used to be a second, subtly different
// copy of that logic living here — see the note in routes.mjs.
const base = getBase();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // GitHub Pages project pages serve from /<repo>/; keep root-relative for local dev.
    base,
  },
  // Static prerender for GitHub Pages (generates HTML, no server worker).
  // Cast to any because the wrapper's narrow types don't expose nitro's prerender option,
  // but the runtime spreads the full object through to nitro.
  nitro: {
    preset: "node-server",
    output: {
      dir: "dist",
      publicDir: "dist/public",
      serverDir: "dist/server",
    },
    prerender: {
      // Shared with scripts/prerender.mjs — see ./scripts/routes.mjs.
      routes: ROUTES,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});
