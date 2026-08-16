# CI/CD Pipeline

## Overview

Five workflows live in `.github/workflows/`, plus one Dependabot config. Two of them are
reusable building blocks; the other three are entry points that compose them:

| File             | Trigger                                         | Purpose                                                                           |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `verify.yml`     | `workflow_call` only (not run directly)         | Install, lint, typecheck, format-check, build. Uploads the `site-build` artifact. |
| `lighthouse.yml` | `workflow_call` only (not run directly)         | Audits the `site-build` artifact with Lighthouse CI.                              |
| `ci.yml`         | Pull requests to `main`/`master`                | `verify` → `lighthouse`. Feedback on PRs.                                         |
| `deploy.yml`     | Pushes to `main`/`master`, manual dispatch      | `verify` → `lighthouse` → publish to GitHub Pages.                                |
| `codeql.yml`     | PRs, pushes to `main`/`master`, weekly schedule | Static security analysis (CodeQL) for JS/TS.                                      |
| `dependabot.yml` | N/A (Dependabot's own schedule)                 | Weekly PRs for dependency and GitHub Actions updates.                             |

The key design point: **nothing reaches GitHub Pages without passing lint, typecheck, format,
a successful build, and a Lighthouse audit first** — and the thing audited is the same
artifact that gets published, not a lookalike built with different settings.

## `verify.yml` — the shared gate

A [reusable workflow](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
invoked with `uses: ./.github/workflows/verify.yml`. It:

1. Checks out the repo.
2. Installs **Bun, pinned** (`oven-sh/setup-bun` with an explicit `bun-version`). An unpinned
   `latest` would silently defeat `bunfig.toml`'s `minimumReleaseAge` supply-chain guard for
   Bun itself, and let the toolchain drift out from under a green lockfile.
3. Installs **Node, pinned** (`actions/setup-node`). `build:static` is
   `vite build && node scripts/prerender.mjs` — it shells out to `node` explicitly, so
   without this the prerender (and therefore `sitemap.xml`, `robots.txt` and every OG card)
   would run on whatever ambient Node the runner image happens to ship. Dependabot's
   `github-actions` ecosystem does **not** bump this input; bump it by hand when the Node LTS
   line moves.
4. Caches `~/.bun/install/cache`, keyed on `bun.lock`.
5. `bun install --frozen-lockfile`
6. `bun run lint` (ESLint)
7. `bun run typecheck` (`tsc --noEmit`)
8. `bun run format:check` (Prettier `--check`)
9. `bun run build:static` with `NITRO_PRESET: node-server` (Vite build + prerender to
   `dist/public`).
10. Uploads `dist/public` as a workflow artifact named `site-build`.

Both `ci.yml` and `deploy.yml` call this exactly once per run, and every downstream job
consumes the resulting artifact rather than rebuilding — a deploy never runs a second,
independent build that could drift from what was verified.

## `lighthouse.yml` — the audit, on the real artifact

Also a reusable workflow. It checks out the repo (only for `lighthouserc.json` — the app is
never built here), downloads the `site-build` artifact, sanity-checks it, and runs
[Lighthouse CI](https://github.com/treosh/lighthouse-ci-action).

**The base-path trick.** `vite.config.ts` derives Vite's `base` from `GITHUB_REPOSITORY`, so
the build's asset URLs are absolute and prefixed with `/portfolio-site/`. Lighthouse's static
server serves `staticDistDir` from its root, so the artifact is unpacked one level down, into
`dist/lhci/portfolio-site/`. That makes `http://localhost/portfolio-site/` byte-for-byte
equivalent to the deployed site — including every asset URL, which is precisely what
`src/lib/assets.ts` exists to get right.

The earlier arrangement did the opposite: a **separate** root-based build with `SITE_BASE=/`,
audited instead of the real one. That is how the audit and the deploy drifted apart. The
`SITE_BASE` override still exists in `vite.config.ts` and `scripts/routes.mjs` for local use,
but no workflow sets it any more.

**The guard step.** Before running the audit, a small shell step fails loudly and specifically
rather than letting a path mismatch surface as a cryptic Lighthouse `NO_FCP` (every asset
404s, the page never paints). It checks that:

- the repository name still matches the `/portfolio-site/` path baked into `lighthouserc.json`;
- every page `lighthouserc.json` audits actually exists in the artifact;
- the artifact's HTML really does contain `/portfolio-site/`-prefixed asset URLs, i.e. it is
  the base-prefixed build and not a root-relative one.

If you change the repo name, the deploy base path, or the audited URL list, this step is what
tells you — update `lighthouserc.json`'s `url` entries and the download path together.

### Lighthouse CI (`lighthouserc.json`)

Since this is a portfolio site, Lighthouse scores are part of what's being shown off, not just
internal tooling — so this runs on every PR _and_ gates every deploy:

- `staticDistDir: "./dist/lhci"`, 3 runs averaged, headless Chrome.
- `url` lists the pages to audit: the home page and `/hobbies/`. **Keep this list explicit** —
  without it, LHCI auto-discovers and audits _every_ `*.html` under `staticDistDir`, including
  the generated `404.html`. Adding a page here means adding it to the guard step's page loop in
  `lighthouse.yml` too.
- Assertions:
  - `performance` — **warn** below 0.8 (perf scores are noisy on shared CI runners, so this
    doesn't hard-fail the build)
  - `accessibility`, `best-practices`, `seo` — **error** below 0.9 (these are deterministic
    enough to gate on)
- Uploads the report to Lighthouse's temporary public storage (auto-deleted after 7 days) and
  attaches the raw results as a workflow artifact, so the full report is one click away from
  the Actions run log.

Adjust thresholds in `lighthouserc.json` if they turn out to be too strict/loose in practice.

## `ci.yml` — pull request feedback

**Pull requests only.** Pushes to `main`/`master` are covered by `deploy.yml`, which runs the
same `verify` + `lighthouse` jobs before it publishes. Running this workflow on push as well
meant every merge did two full verify builds plus a third Lighthouse build, under two
concurrency groups that could not coordinate with each other.

Concurrency is set to cancel superseded runs on the same ref, so pushing twice in a row doesn't
queue up stale CI runs.

## `deploy.yml` — build, audit and publish

Runs on pushes to `main`/`master` and manually via `workflow_dispatch`. Three jobs:

- **`verify`** — the shared gate.
- **`lighthouse`** — `needs: verify`; the reusable audit above.
- **`deploy`** — `needs: [verify, lighthouse]`. Downloads the verified `site-build` artifact,
  re-packages it with `actions/upload-pages-artifact` (the tar format GitHub Pages expects),
  and publishes with `actions/deploy-pages`.

The Lighthouse job lives here, not in `ci.yml`, so it can actually gate the deploy. While it
sat in a separate workflow the error-level accessibility/best-practices/SEO assertions were
advisory: both workflows started independently on a push to `main` and a failing audit still
published.

`concurrency: { group: pages, cancel-in-progress: false }` ensures deploys queue instead of
overlapping or getting cancelled mid-publish.

## `codeql.yml` — security scanning

GitHub's native static analysis ([CodeQL](https://codeql.github.com/)) for the
`javascript-typescript` language pack, using `build-mode: none` (no build needed — CodeQL
analyzes JS/TS source directly). Runs on PRs, pushes to `main`/`master`, and weekly
(Monday 04:23 UTC) to catch newly-disclosed query patterns against unchanged code. Results show
up under the repo's **Security → Code scanning** tab.

## `dependabot.yml` — dependency updates

Two update streams, both weekly:

- `package-ecosystem: bun` — reads `package.json`/`bun.lock`, groups all dependency bumps into
  a single PR per week (`groups.dependencies.patterns: ["*"]`) instead of one PR per package, to
  keep the noise down for a single-maintainer repo.
- `package-ecosystem: github-actions` — keeps the Action versions in these workflows
  (`actions/checkout`, `github/codeql-action`, etc.) current. It does **not** touch the
  `bun-version` / `node-version` inputs in `verify.yml`.

## Running the checks locally

```bash
bun run lint           # ESLint
bun run typecheck      # tsc --noEmit
bun run format:check   # Prettier --check
bun run format         # Prettier --write, to fix formatting issues
bun run build:static   # full production build + prerender, same as CI
```

Line endings are pinned to LF in the working tree by `.gitattributes` (`* text=auto eol=lf`),
which overrides Git for Windows' `core.autocrlf=true`. Without it, Prettier's `endOfLine: "lf"`
default made `bun lint` and `bun run format:check` report a `Delete ␍` error on every line of
every CRLF file locally while CI — which checks out LF on `ubuntu-latest` — stayed green. If
you have a working copy from before that file existed, refresh it with:

```bash
git add --renormalize .
```

`public/contact.vcf` is deliberately exempt: RFC 6350 requires CRLF, so `.gitattributes` pins
that one file the other way.

## Required repo configuration

No secrets are needed — every workflow uses the default `GITHUB_TOKEN`. For `deploy.yml` to
work, **Settings → Pages → Source** must be set to "GitHub Actions".

## Deliberately not included (yet)

- **Automated tests.** There's no test suite in the repo, so there's nothing for CI to run.
  Adding a `test` step to `verify.yml` is a one-line change once tests exist.
- **PR preview deployments.** GitHub Pages doesn't support per-PR preview URLs. Adding that
  would mean standing up a second host (e.g. Cloudflare Pages) just for previews — worth doing
  if PR review becomes a real part of the workflow, not before.
- **`scripts/fetch-github-stats.mjs` in CI.** The repo stats shown on project pages are baked
  into `src/data/github-stats.json` by a manual run before a build; no workflow refreshes them.
  </content>
