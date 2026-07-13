// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split("/")[1]
  : undefined;

// User/organization pages (username.github.io) are served from the root.
// SITE_BASE overrides the GitHub-Pages-derived base — CI's Lighthouse job sets it to "/"
// because its local static server serves the build from the root, and Actions silently
// ignores attempts to override the reserved GITHUB_REPOSITORY variable.
const base =
  process.env.SITE_BASE || (repoName && !repoName.endsWith(".github.io") ? `/${repoName}/` : "/");

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
      routes: ["/"],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});
