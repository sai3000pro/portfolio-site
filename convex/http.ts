import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const VALID_ACHIEVEMENT_IDS = new Set([
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
  "press-start",
  "giving-back",
  "full-rotation",
  "reference-check",
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
  "one-more-turn",
  "speedrun",
  "slow-burn",
  "midnight-oil",
  "regular",
  "long-distance",
  "completionist",
]);

const MAX_IDS = 80;
const MAX_BODY_BYTES = 4096;

function corsHeaders(): Headers {
  return new Headers({
    // These endpoints carry no credentials. Wildcard CORS keeps local previews and
    // GitHub Pages builds working without putting an origin allowlist in Convex env.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
}

function response(body: BodyInit | null, status = 200, contentType?: string): Response {
  const headers = corsHeaders();
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(body, { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const options = httpAction(async () => response(null, 204));

const getRarity = httpAction(async (ctx) => {
  const data = await ctx.runQuery(internal.achievements.getRarity, {});
  return response(JSON.stringify(data), 200, "application/json");
});

const recordUnlocks = httpAction(async (ctx, request) => {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return response("Payload too large", 413);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return response("Bad JSON", 400);
  }

  if (!isRecord(payload)) return response("Bad request", 400);

  const visitorId = typeof payload.visitorId === "string" ? payload.visitorId.trim() : "";
  const ids = Array.isArray(payload.ids)
    ? [
        ...new Set(
          payload.ids.filter(
            (id): id is string => typeof id === "string" && VALID_ACHIEVEMENT_IDS.has(id),
          ),
        ),
      ].slice(0, MAX_IDS)
    : [];

  if (visitorId.length === 0 || visitorId.length > 128 || ids.length === 0) {
    return response("Bad request", 400);
  }

  await ctx.runMutation(internal.achievements.recordUnlocks, {
    visitorId,
    achievementIds: ids,
    firstSeen: Date.now(),
  });

  return response(null, 204);
});

http.route({ path: "/rarity", method: "GET", handler: getRarity });
http.route({ path: "/rarity", method: "OPTIONS", handler: options });
http.route({ path: "/unlocks", method: "POST", handler: recordUnlocks });
http.route({ path: "/unlocks", method: "OPTIONS", handler: options });

export default http;
