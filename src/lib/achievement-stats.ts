/**
 * Global achievement rarity — "4.2% of visitors found this".
 *
 * DESIGN CONTRACT (mirrors src/lib/analytics.ts):
 *   - INERT BY DEFAULT. With `VITE_ACHIEVEMENTS_ENDPOINT` unset this module makes
 *     no requests at all, and the UI falls back to each achievement's authored
 *     `rarityHint` prefixed with "est.". The site is fully functional with zero
 *     infrastructure — the endpoint is an upgrade, not a dependency.
 *   - NO CREDENTIALS IN THE CLIENT. The endpoint is a public write-only counter;
 *     there is no token to leak. That is why this talks to an owned Worker rather
 *     than to Upstash/Supabase directly, both of which would require shipping a
 *     key in the bundle.
 *   - NO PII. The only thing sent is a random `visitorId` generated in
 *     src/lib/achievements.ts and the list of achievement ids earned.
 *   - DISPLAY ONLY. Rarity must never feed back into unlock logic, so a poisoned
 *     counter can only ever make a percentage wrong — it can never grant or
 *     revoke a badge.
 *   - SSR-SAFE. Every `window` / `navigator` access is guarded.
 *
 * ENV:
 *   VITE_ACHIEVEMENTS_ENDPOINT  Base URL of the stats Worker, e.g.
 *                               https://achievements.example.workers.dev
 *                               Public by design — never treat it as a secret.
 */

import { ACHIEVEMENT_IDS, type Achievement } from "@/data/achievements";

const ENDPOINT = (import.meta.env.VITE_ACHIEVEMENTS_ENDPOINT as string | undefined)?.trim();

/**
 * Most ids one request may carry. Derived, not a literal: this was a hardcoded 40 back
 * when the registry held 37 badges, which meant the first five badges added would have
 * silently truncated a completionist's report — the one visitor whose report matters
 * most. It has to stay <= the Worker's own MAX_IDS in
 * workers/achievement-stats/src/index.ts, which is why that one is now a round number
 * with headroom rather than a matching count.
 */
const MAX_REPORTED_IDS = ACHIEVEMENT_IDS.length;

/**
 * Below this many recorded visitors the percentages are noise — "100% of
 * visitors have this legendary" on day three is worse than saying nothing. Fall
 * back to the authored estimate until the sample is meaningful.
 */
const MIN_SAMPLE = 25;

/** Aggregate counts as returned by the Worker. */
export interface RarityData {
  /** Distinct visitors who have reported at least one unlock. */
  visitors: number;
  /** Achievement id -> distinct visitors who earned it. */
  counts: Record<string, number>;
}

/** Live data, or the signal to fall back to authored estimates. */
export type RarityResult = { kind: "live"; data: RarityData } | { kind: "baseline" };

/** Configured base URL, or undefined when the feature is switched off. */
export function getAchievementsEndpoint(): string | undefined {
  return ENDPOINT || undefined;
}

/** True when live rarity is configured. Used to disable the query entirely. */
export function isRarityEnabled(): boolean {
  return Boolean(getAchievementsEndpoint());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fetch aggregate counts. Resolves to `{ kind: "baseline" }` on any failure —
 * this never rejects, because a dead counter must not surface an error on a page
 * whose entire purpose is decorative.
 */
export async function fetchRarity(signal?: AbortSignal): Promise<RarityResult> {
  const endpoint = getAchievementsEndpoint();
  if (!endpoint || typeof window === "undefined") return { kind: "baseline" };

  try {
    const response = await fetch(`${endpoint.replace(/\/+$/, "")}/rarity`, { signal });
    if (!response.ok) return { kind: "baseline" };

    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.visitors !== "number" || !isRecord(body.counts)) {
      return { kind: "baseline" };
    }

    const counts: Record<string, number> = {};
    for (const [id, value] of Object.entries(body.counts)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) counts[id] = value;
    }

    if (body.visitors < MIN_SAMPLE) return { kind: "baseline" };
    return { kind: "live", data: { visitors: body.visitors, counts } };
  } catch {
    return { kind: "baseline" };
  }
}

/**
 * Report newly earned achievements. Fire-and-forget: resolves `false` on any
 * failure so the caller can leave the ids unmarked and retry next session.
 *
 * `keepalive` lets the request outlive a navigation, which matters because most
 * unlocks happen immediately before the visitor clicks somewhere else.
 */
export async function reportUnlocks(ids: string[], visitorId: string): Promise<boolean> {
  const endpoint = getAchievementsEndpoint();
  if (!endpoint || typeof window === "undefined") return false;
  if (ids.length === 0 || !visitorId) return false;

  try {
    const response = await fetch(`${endpoint.replace(/\/+$/, "")}/unlocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, ids: ids.slice(0, MAX_REPORTED_IDS) }),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Percentage of visitors holding an achievement, or null when unknown. */
export function rarityPercent(id: string, result: RarityResult): number | null {
  if (result.kind !== "live") return null;
  const { visitors, counts } = result.data;
  if (visitors < MIN_SAMPLE) return null;

  // Clamp so a garbage response can never render "4200% of visitors".
  return Math.min(100, Math.max(0.1, ((counts[id] ?? 0) / visitors) * 100));
}

/**
 * Display string for a badge's rarity line, or `null` when there is nothing worth
 * saying. Live data reads as a real measurement; the fallback is explicitly prefixed
 * "est." so the page never claims a number it doesn't have.
 *
 * Returns null when the fallback would only echo the tier the card already prints.
 * `rarityHint` is meant to describe how many people hold a badge, but all but one
 * set it to the tier word itself, so with the stats endpoint unconfigured — which is
 * the default, and therefore what every visitor sees — the card rendered
 * "Common · est. common". Two slots, one fact, said twice. The tier is the better of
 * the two (it is always true, and not an estimate of anything), so the rarity line
 * yields. Configure VITE_ACHIEVEMENTS_ENDPOINT and this all becomes a real percentage;
 * write a hint that isn't just the tier ("Everyone has this") and it shows through.
 */
export function formatRarity(achievement: Achievement, result: RarityResult): string | null {
  const pct = rarityPercent(achievement.id, result);
  if (pct !== null) return `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% of visitors`;

  const hint = achievement.rarityHint.trim();
  if (hint.toLowerCase() === achievement.tier) return null;
  return `est. ${hint.toLowerCase()}`;
}
