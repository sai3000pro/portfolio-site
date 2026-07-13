# CI/CD Pipeline

## Overview

Five workflows live in `.github/workflows/`, plus one Dependabot config. They split into a
reusable "verify" step and four workflows that each use it for a different purpose:

| File             | Trigger                                         | Purpose                                                                             |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `verify.yml`     | `workflow_call` only (not run directly)         | Install, lint, typecheck, format-check, build. Shared by `ci.yml` and `deploy.yml`. |
| `ci.yml`         | PRs and pushes to `main`/`master`               | Runs `verify`, then audits the build with Lighthouse CI.                            |
| `deploy.yml`     | Pushes to `main`/`master`, manual dispatch      | Runs `verify`, then publishes the build to GitHub Pages.                            |
| `codeql.yml`     | PRs, pushes to `main`/`master`, weekly schedule | Static security analysis (CodeQL) for JS/TS.                                        |
| `dependabot.yml` | N/A (Dependabot's own schedule)                 | Weekly PRs for dependency and GitHub Actions updates.                               |

The key design point: **nothing reaches GitHub Pages without passing lint, typecheck, format,
and a successful build first.** Before this setup, `deploy.yml` built and published on every
push with no gate — a broken commit would go straight to production.

## `verify.yml` — the shared gate

A [reusable workflow](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
invoked with `uses: ./.github/workflows/verify.yml`. It:

1. Checks out the repo and installs Bun (with `~/.bun/install/cache` cached, keyed on `bun.lock`).
2. `bun install --frozen-lockfile`
3. `bun run lint` (ESLint)
4. `bun run typecheck` (`tsc --noEmit`)
5. `bun run format:check` (Prettier `--check`)
6. `bun run build:static` (Vite build + prerender to `dist/public`)
7. Uploads `dist/public` as a workflow artifact named `site-build`.

Both `ci.yml` and `deploy.yml` call this once per run and then download the `site-build`
artifact for their own next step, instead of rebuilding from scratch. This means a deploy never
runs a second, independent build that could drift from what was verified.

`typecheck` and `format:check` are new npm scripts added to `package.json` alongside the
existing `lint`/`format` — they didn't exist before this pipeline, so this is the first time
this codebase has been typechecked and format-checked in CI.

## `ci.yml` — pull request feedback

Runs on every PR and on pushes to `main`/`master`. Two jobs:

- **`verify`** — the shared gate above.
- **`lighthouse`** — downloads the verified build and runs
  [Lighthouse CI](https://github.com/treosh/lighthouse-ci-action) (`treosh/lighthouse-ci-action`)
  against it using `lighthouserc.json` at the repo root.

Concurrency is set to cancel superseded runs on the same ref, so pushing twice in a row doesn't
queue up stale CI runs.

### Lighthouse CI (`lighthouserc.json`)

Since this is a portfolio site, Lighthouse scores are part of what's being shown off, not just
internal tooling — so this is checked on every PR:

- Audits the prerendered `dist/public` directory directly (`staticDistDir`), 3 runs averaged.
- Assertions:
  - `performance` — **warn** below 0.8 (perf scores are noisy on shared CI runners, so this
    doesn't hard-fail the build)
  - `accessibility`, `best-practices`, `seo` — **error** below 0.9 (these are deterministic
    enough to gate on)
- Uploads the report to Lighthouse's temporary public storage (auto-deleted after 7 days) so the
  full report is one click away from the Actions run log.

Adjust thresholds in `lighthouserc.json` if they turn out to be too strict/loose in practice.

## `deploy.yml` — build and publish

Runs on pushes to `main`/`master` (and manually via `workflow_dispatch`). Two jobs:

- **`verify`** — the shared gate.
- **`deploy`** — downloads the verified `site-build` artifact, re-packages it with
  `actions/upload-pages-artifact` (the tar format GitHub Pages expects), and publishes with
  `actions/deploy-pages`.

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
  (`actions/checkout`, `github/codeql-action`, etc.) current.

## Running the checks locally

```bash
bun run lint          # ESLint
bun run typecheck      # tsc --noEmit
bun run format:check   # Prettier --check
bun run format          # Prettier --write, to fix formatting issues
bun run build:static   # full production build + prerender, same as CI
```

### Windows note: local Prettier/ESLint noise

If you're on Windows with `core.autocrlf=true` (this repo's default), `bun run lint` and
`bun run format:check` will report thousands of `Delete ␍` errors locally. **This is not a real
problem** — Git stores every tracked file as LF in the repository (confirmed via
`git ls-files --eol`), autocrlf just rewrites them to CRLF on your local checkout for Windows
editors. GitHub's Linux runners check out the LF originals, so CI sees clean files regardless of
what your local working tree looks like. Don't run `prettier --write .` to "fix" this — it'll
just convert your whole working tree to CRLF-flagged content relative to what's committed.

## Required repo configuration

No secrets are needed — every workflow uses the default `GITHUB_TOKEN`. For `deploy.yml` to
work, **Settings → Pages → Source** must be set to "GitHub Actions" (already the case, since the
site was deploying before this change).

## Deliberately not included (yet)

- **Automated tests.** There's no test suite in the repo, so there's nothing for CI to run.
  Adding a `test` step to `verify.yml` is a one-line change once tests exist.
- **PR preview deployments.** GitHub Pages doesn't support per-PR preview URLs. Adding that
  would mean standing up a second host (e.g. Cloudflare Pages) just for previews — worth doing
  if PR review becomes a real part of the workflow, not before.
