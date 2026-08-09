// Typed, SSR-safe accessor for build-time GitHub repo stats.
//
// The underlying data in `github-stats.json` is generated at build time by
// scripts/fetch-github-stats.mjs (never fetched in the browser). This module
// is pure and does not touch `window`, so it is safe to import during SSR /
// prerendering.

import statsData from "../data/github-stats.json";

/** Stats for a single GitHub repository. */
export interface RepoStats {
  /** "owner/repo" slug. */
  slug: string;
  /** Stargazer count. */
  stars: number;
  /** Fork count. */
  forks: number;
  /** Primary language, or null if none reported. */
  language: string | null;
  /** ISO-8601 timestamp of the last push, or null if unavailable. */
  pushedAt: string | null;
  /** Canonical repo URL on github.com. */
  htmlUrl: string;
}

/** Shape of the generated github-stats.json file. */
export interface GitHubStatsFile {
  /** ISO timestamp of when the data was fetched, or null for a placeholder. */
  generatedAt: string | null;
  /** Map of "owner/repo" slug -> stats. */
  repos: Record<string, RepoStats>;
}

const data = statsData as GitHubStatsFile;

/**
 * Extract the "owner/repo" slug from a GitHub URL.
 * Returns null for non-GitHub or malformed URLs.
 */
export function repoSlugFromUrl(repoUrl: string | undefined | null): string | null {
  if (!repoUrl) return null;
  const match = /github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i.exec(repoUrl);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  return `${owner}/${repo}`;
}

/**
 * Look up build-time stats for a project's `repo` URL.
 * Returns null when the URL is missing, not a GitHub repo, or has no data.
 */
export function getRepoStats(repoUrl: string | undefined | null): RepoStats | null {
  const slug = repoSlugFromUrl(repoUrl);
  if (!slug) return null;
  return data.repos[slug] ?? null;
}

/** ISO timestamp of when the stats were last refreshed (null for placeholder). */
export function getStatsGeneratedAt(): string | null {
  return data.generatedAt;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30.44 * DAY_MS; // average civil month
const YEAR_MS = 365.25 * DAY_MS;

/**
 * Unit ladder, coarsest-last. The first entry whose `limit` exceeds the elapsed time
 * wins. Thresholds mirror the buckets date-fns used here, so wording stays familiar:
 * minutes up to 45, hours up to ~a day, then days up to a month, months up to a year.
 */
const DIVISIONS: { limit: number; ms: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 45 * SECOND_MS, ms: SECOND_MS, unit: "second" },
  { limit: 45 * MINUTE_MS, ms: MINUTE_MS, unit: "minute" },
  { limit: 22 * HOUR_MS, ms: HOUR_MS, unit: "hour" },
  { limit: 30 * DAY_MS, ms: DAY_MS, unit: "day" },
  { limit: YEAR_MS, ms: MONTH_MS, unit: "month" },
  { limit: Number.POSITIVE_INFINITY, ms: YEAR_MS, unit: "year" },
];

/**
 * Locale is pinned rather than left to the runtime default: this string is produced
 * during prerender (Node, build machine locale) and again on hydration (visitor
 * locale). Anything but a fixed locale risks the two disagreeing, which React reports
 * as a hydration error. `numeric: "always"` keeps "1 day ago" instead of "yesterday".
 */
const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", { numeric: "always" });

/**
 * Format a repo's last-push time into a friendly relative string, e.g.
 * "updated 3 months ago". Returns null when no timestamp is available.
 * @param pushedAt ISO-8601 string (typically RepoStats.pushedAt)
 */
export function formatLastCommit(pushedAt: string | null | undefined): string | null {
  if (!pushedAt) return null;
  const date = new Date(pushedAt);
  if (Number.isNaN(date.getTime())) return null;

  // Signed, so a timestamp slightly in the future (clock skew) reads "in 2 minutes"
  // rather than silently flipping to the past.
  const delta = date.getTime() - Date.now();
  const elapsed = Math.abs(delta);
  const division = DIVISIONS.find((d) => elapsed < d.limit) ?? DIVISIONS[DIVISIONS.length - 1];

  return `updated ${relativeTimeFormat.format(Math.round(delta / division.ms), division.unit)}`;
}
