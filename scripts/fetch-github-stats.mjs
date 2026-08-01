// Fetches GitHub repo stats for every project that declares a `repo` URL in
// src/data/portfolio.ts and writes a compact JSON map to
// src/data/github-stats.json.
//
// HOW / WHEN TO RUN:
//   node scripts/fetch-github-stats.mjs
// Run this MANUALLY (or in CI) BEFORE the static build. The portfolio site is
// prerendered for GitHub Pages, so stats must be baked into JSON at build time
// and never fetched from a visitor's browser.
//
// Optionally set GITHUB_TOKEN to raise the API rate limit:
//   $env:GITHUB_TOKEN = "ghp_xxx"; node scripts/fetch-github-stats.mjs   (PowerShell)
//
// FAILURE POLICY: this script NEVER fails the build. On any network error,
// rate-limit (403/429), or missing repo (404), it logs a warning, PRESERVES the
// existing committed JSON, and exits 0. It will never overwrite good data with a
// broken or empty file.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PORTFOLIO_PATH = resolve(ROOT, "src/data/portfolio.ts");
const OUTPUT_PATH = resolve(ROOT, "src/data/github-stats.json");

const GITHUB_API = "https://api.github.com/repos";
const USER_AGENT = "portfolio-site-stats-fetcher";

/**
 * Extract unique "owner/repo" slugs from the `repo` fields in portfolio.ts.
 * We parse the source text with a regex on purpose — importing the .ts would
 * require a TS loader and pull in the whole app, which this standalone script
 * intentionally avoids.
 * @param {string} source
 * @returns {string[]}
 */
function extractRepoSlugs(source) {
  const slugs = new Set();
  // Match: repo: "https://github.com/<owner>/<repo>"  (trailing path/query stripped)
  const repoFieldRe = /repo:\s*["'`]([^"'`]+)["'`]/g;
  const githubRe = /github\.com\/([^/\s"'`?#]+)\/([^/\s"'`?#]+)/i;
  let match;
  while ((match = repoFieldRe.exec(source)) !== null) {
    const url = match[1];
    const gh = githubRe.exec(url);
    if (!gh) continue;
    const owner = gh[1];
    const repo = gh[2].replace(/\.git$/i, "");
    slugs.add(`${owner}/${repo}`);
  }
  return [...slugs];
}

/**
 * Fetch stats for a single "owner/repo" slug.
 * @param {string} slug
 * @param {Record<string, string>} headers
 * @returns {Promise<{ ok: true, stats: object } | { ok: false, reason: string }>}
 */
async function fetchRepo(slug, headers) {
  const url = `${GITHUB_API}/${slug}`;
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    return { ok: false, reason: `network error (${err?.message ?? "unknown"})` };
  }
  if (!res.ok) {
    return { ok: false, reason: `HTTP ${res.status} ${res.statusText}` };
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    return { ok: false, reason: `invalid JSON (${err?.message ?? "unknown"})` };
  }
  return {
    ok: true,
    stats: {
      slug,
      stars: typeof json.stargazers_count === "number" ? json.stargazers_count : 0,
      forks: typeof json.forks_count === "number" ? json.forks_count : 0,
      language: typeof json.language === "string" ? json.language : null,
      pushedAt: typeof json.pushed_at === "string" ? json.pushed_at : null,
      htmlUrl: typeof json.html_url === "string" ? json.html_url : `https://github.com/${slug}`,
    },
  };
}

/**
 * Read the existing committed JSON so we can preserve it on failure.
 * @returns {Promise<object | null>}
 */
async function readExisting() {
  if (!existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  let source;
  try {
    source = await readFile(PORTFOLIO_PATH, "utf8");
  } catch (err) {
    console.warn(`[github-stats] Could not read ${PORTFOLIO_PATH}: ${err?.message}`);
    console.warn("[github-stats] Preserving existing JSON. Exiting 0.");
    return;
  }

  const slugs = extractRepoSlugs(source);
  if (slugs.length === 0) {
    console.warn("[github-stats] No repo URLs found in portfolio.ts. Nothing to fetch.");
    // Still emit a valid (empty) file if none exists, so consumers typecheck.
    const existing = await readExisting();
    if (!existing) {
      await writeFile(
        OUTPUT_PATH,
        JSON.stringify({ generatedAt: new Date().toISOString(), repos: {} }, null, 2) + "\n",
        "utf8",
      );
      console.log(`[github-stats] Wrote empty scaffold to ${OUTPUT_PATH}.`);
    }
    return;
  }

  console.log(`[github-stats] Found ${slugs.length} repo(s): ${slugs.join(", ")}`);

  /** @type {Record<string, string>} */
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log("[github-stats] Using GITHUB_TOKEN for authenticated requests.");
  }

  const repos = {};
  const failures = [];
  for (const slug of slugs) {
    const result = await fetchRepo(slug, headers);
    if (result.ok) {
      repos[slug] = result.stats;
      console.log(`[github-stats]   ✓ ${slug} (★${result.stats.stars})`);
    } else {
      failures.push(`${slug}: ${result.reason}`);
      console.warn(`[github-stats]   ✗ ${slug} — ${result.reason}`);
    }
  }

  // If EVERY repo failed, do not clobber good committed data.
  if (Object.keys(repos).length === 0) {
    console.warn("[github-stats] All fetches failed. Preserving existing JSON. Exiting 0.");
    const existing = await readExisting();
    if (!existing) {
      // No prior data — write a well-formed placeholder so the build still works.
      const placeholderRepos = {};
      for (const slug of slugs) {
        placeholderRepos[slug] = {
          slug,
          stars: 0,
          forks: 0,
          language: null,
          pushedAt: null,
          htmlUrl: `https://github.com/${slug}`,
        };
      }
      await writeFile(
        OUTPUT_PATH,
        JSON.stringify({ generatedAt: null, repos: placeholderRepos }, null, 2) + "\n",
        "utf8",
      );
      console.log(`[github-stats] Wrote placeholder scaffold to ${OUTPUT_PATH}.`);
    }
    return;
  }

  // Merge: keep any previously-good entries for repos that failed this run.
  const existing = await readExisting();
  if (existing && existing.repos) {
    for (const slug of slugs) {
      if (!repos[slug] && existing.repos[slug]) {
        repos[slug] = existing.repos[slug];
        console.log(`[github-stats]   ↺ ${slug} — kept previous data`);
      }
    }
  }

  const payload = { generatedAt: new Date().toISOString(), repos };
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[github-stats] Wrote ${Object.keys(repos).length} repo(s) to ${OUTPUT_PATH}.`);
  if (failures.length > 0) {
    console.warn(`[github-stats] ${failures.length} repo(s) failed but existing data preserved.`);
  }
}

main().catch((err) => {
  // Absolute last resort: never fail the build.
  console.warn(`[github-stats] Unexpected error: ${err?.message ?? err}`);
  console.warn("[github-stats] Exiting 0 to protect the build.");
  process.exit(0);
});
