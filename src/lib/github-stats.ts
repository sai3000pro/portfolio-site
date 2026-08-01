// Typed, SSR-safe accessor for build-time GitHub repo stats.
//
// The underlying data in `github-stats.json` is generated at build time by
// scripts/fetch-github-stats.mjs (never fetched in the browser). This module
// is pure and does not touch `window`, so it is safe to import during SSR /
// prerendering.

import { formatDistanceToNow } from "date-fns";
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

/**
 * Format a repo's last-push time into a friendly relative string, e.g.
 * "updated 3 months ago". Returns null when no timestamp is available.
 * @param pushedAt ISO-8601 string (typically RepoStats.pushedAt)
 */
export function formatLastCommit(pushedAt: string | null | undefined): string | null {
  if (!pushedAt) return null;
  const date = new Date(pushedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `updated ${formatDistanceToNow(date, { addSuffix: true })}`;
}
