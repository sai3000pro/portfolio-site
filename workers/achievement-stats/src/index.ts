/**
 * Achievement rarity counter — Cloudflare Worker + D1.
 *
 * Two endpoints:
 *   POST /unlocks  { visitorId: string, ids: string[] }  ->  204
 *   GET  /rarity                                          ->  { visitors, counts }
 *
 * WHY D1 AND NOT KV: the KV free tier caps writes at 1,000/day, and this writes
 * once per visitor per achievement — a few hundred visitors would exhaust it.
 * D1's free tier allows 100k row writes/day, and its composite primary key makes
 * per-visitor dedupe structural rather than something the client has to be
 * trusted to get right.
 *
 * WHY A WORKER AND NOT UPSTASH/SUPABASE DIRECTLY: both would require shipping a
 * credential in the browser bundle. This endpoint holds no secret at all — the
 * worst a caller can do is inflate a counter, which is bounded by the mitigations
 * below and only ever affects a decorative percentage.
 *
 * The site treats this as strictly optional: with VITE_ACHIEVEMENTS_ENDPOINT
 * unset the client never calls it and falls back to authored estimates.
 */

export interface Env {
  DB: D1Database;
  /** Comma-separated origins allowed to call this Worker. */
  ALLOWED_ORIGINS: string;
}

/**
 * Valid achievement ids. MUST stay in sync with ACHIEVEMENT_IDS in
 * src/data/achievements.ts — renaming an id there orphans its counter here.
 * The allowlist keeps junk rows out of D1 as much as it stops abuse.
 */
const VALID_IDS = new Set([
  "first-light",
  "let-there-be-light",
  "power-user",
  "paper-trail",
  "trophy-hunter",
  "full-orbit",
  "spacewalk",
  "case-study",
  "deep-reader",
  "well-connected",
  "time-traveller",
  "globetrotter",
  "star-charter",
  "gravity-assist",
  "shutterbug",
  "gallery-crawl",
  "elevator-pitch",
  "copy-that",
  "analog-backup",
  "dead-tree-format",
  "cold-call",
  "keyboard-warrior",
  "the-old-ways",
  "hat-trick",
  "disappearing-act",
  "stargazer",
  "dark-matter",
  "lost-in-space",
  "inspector-gadget",
  "spelling-bee",
  "percussive-maintenance",
  "speedrun",
  "slow-burn",
  "midnight-oil",
  "regular",
  "long-distance",
  "completionist",
]);

/** Per-request caps. A well-behaved client never approaches either. */
const MAX_IDS = 40;
const MAX_BODY_BYTES = 4096;

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  return {
    // Spoofable, but it turns away drive-by scanners for free.
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/rarity") {
      const [counts, visitors] = await Promise.all([
        env.DB.prepare("SELECT achievement, COUNT(*) AS n FROM unlocks GROUP BY achievement").all<{
          achievement: string;
          n: number;
        }>(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM visitors").first<{ n: number }>(),
      ]);

      const body = {
        visitors: visitors?.n ?? 0,
        counts: Object.fromEntries((counts.results ?? []).map((r) => [r.achievement, r.n])),
      };

      return new Response(JSON.stringify(body), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          // The edge absorbs the reads; five minutes is plenty fresh for this.
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    if (request.method === "POST" && url.pathname === "/unlocks") {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return new Response("Payload too large", { status: 413, headers: cors });
      }

      let payload: { visitorId?: unknown; ids?: unknown };
      try {
        payload = JSON.parse(raw);
      } catch {
        return new Response("Bad JSON", { status: 400, headers: cors });
      }

      const visitorId = typeof payload.visitorId === "string" ? payload.visitorId.slice(0, 64) : "";
      const ids = Array.isArray(payload.ids)
        ? payload.ids
            .filter((id): id is string => typeof id === "string" && VALID_IDS.has(id))
            .slice(0, MAX_IDS)
        : [];

      if (!visitorId || ids.length === 0) {
        return new Response("Bad request", { status: 400, headers: cors });
      }

      // INSERT OR IGNORE + composite primary key: replaying a request is free and
      // useless. Inflating a counter costs one fabricated visitor id per fake
      // unlock, which is the correct amount of friction for a vanity stat.
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO visitors (visitor, first_seen) VALUES (?, ?)").bind(
          visitorId,
          now,
        ),
        ...ids.map((id) =>
          env.DB.prepare("INSERT OR IGNORE INTO unlocks (visitor, achievement) VALUES (?, ?)").bind(
            visitorId,
            id,
          ),
        ),
      ]);

      return new Response(null, { status: 204, headers: cors });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
