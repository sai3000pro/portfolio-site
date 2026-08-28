import process from "node:process";

// KEPT ON PURPOSE, despite having no importers in this repo.
//
// Its only caller was src/lib/api/example.functions.ts, deleted as unused scaffold — which
// makes this look like the obvious next thing to delete. It is not: Lovable is still
// connected to this repository, and this file plus the notes below are the pattern its
// generated server code expects to find. Removing it saves 26 lines and costs a working
// integration. Same goes for .lovable/, the @lovable.dev/vite-tanstack-config dev
// dependency, and src/lib/lovable-error-reporting.ts.
//
// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    // Add server-only values here, e.g.:
    //   databaseUrl: process.env.DATABASE_URL,
    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}
