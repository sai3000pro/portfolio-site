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

import type { Achievement } from "@/data/achievements";

const ENDPOINT = (import.meta.env.VITE_ACHIEVEMENTS_ENDPOINT as string | undefined)?.trim();

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
      body: JSON.stringify({ visitorId, ids: ids.slice(0, 40) }),
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
 * Display string for a badge's rarity line. Live data reads as a real
 * measurement; the fallback is explicitly prefixed "est." so the page never
 * claims a number it doesn't have.
 */
export function formatRarity(achievement: Achievement, result: RarityResult): string {
  const pct = rarityPercent(achievement.id, result);
  if (pct === null) return `est. ${achievement.rarityHint.toLowerCase()}`;
  return `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% of visitors`;
}
