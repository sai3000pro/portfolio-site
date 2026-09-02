/**
 * Achievement engine — persistence, rule evaluation, and the public tracking API.
 *
 * Modelled on src/lib/theme.ts: a plain module with a localStorage key in the
 * `portfolio:` namespace, every browser access wrapped in try/catch, and no
 * `window` / `document` touched at module scope. Components import `unlock()` /
 * `trackMember()` and call them from an existing handler — one line, no new
 * state, no provider. Cross-component notification rides a CustomEvent, the same
 * pattern command-palette.tsx uses for `portfolio:open-palette`.
 *
 * WHY NO REACT CONTEXT: `unlock()` needs to be callable from src/lib helpers
 * (print-resume.ts, vcard.ts) and from deep inside components that would
 * otherwise need threading. A module-level function plus a DOM event keeps every
 * call site to a single line, which is the only way an achievement system this size
 * doesn't turn into a 20-file refactor.
 *
 * WHY NO INIT SCRIPT: unlike the theme there is nothing to paint before hydration,
 * so there is deliberately no `ACHIEVEMENTS_INIT_SCRIPT` analogue. All state is
 * read in an effect, which is what keeps the server render and the first client
 * render identical.
 */

import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  TIER_POINTS,
  TOTAL_ACHIEVEMENTS,
  type Achievement,
  type Tier,
} from "@/data/achievements";

/** localStorage key holding the serialized {@link AchievementState}. */
export const ACHIEVEMENTS_STORAGE_KEY = "portfolio:achievements";

/**
 * Schema version. Bump when the shape of {@link AchievementState} changes and add
 * a migrator to {@link MIGRATIONS}. The registry grows constantly; the shape
 * should not, but the ladder exists so the first breaking change isn't ad-hoc.
 */
export const ACHIEVEMENTS_SCHEMA_VERSION = 1;

/** Fired once per batch of newly earned achievements. `detail: { ids: string[] }`. */
export const ACHIEVEMENT_UNLOCK_EVENT = "portfolio:achievement-unlocked";

/** Fired after any persisted change, including resets and cross-tab updates. */
export const ACHIEVEMENT_CHANGE_EVENT = "portfolio:achievements-changed";

/** Distinct visit days retained. Sixty is far more than any rule needs. */
const MAX_DAYS = 60;

/** Per-key cap on collected set members, so a runaway loop can't fill storage. */
const MAX_SET_MEMBERS = 128;

export interface AchievementState {
  /** Schema version — see {@link ACHIEVEMENTS_SCHEMA_VERSION}. */
  v: number;
  /** Epoch ms of the visitor's very first recorded visit. Drives `span` rules. */
  firstVisit: number;
  /** Achievement id -> epoch ms it was earned. */
  unlocked: Record<string, number>;
  /** Tracking key -> distinct members collected. Drives `set` rules. */
  sets: Record<string, string[]>;
  /** Distinct local calendar days seen, "YYYY-MM-DD". Drives `days` rules. */
  days: string[];
  /** Ids already shown in a toast, so a returning visitor isn't re-notified. */
  seen: string[];
  /** Ids already reported to the rarity endpoint. Dedupes across sessions. */
  sent: string[];
  /** Random opaque id so the rarity backend can count distinct visitors. No PII. */
  visitorId: string;
  /** When true, `unlock()` / `track*()` return immediately and nothing is stored. */
  optOut: boolean;
}

/**
 * The state a brand-new visitor starts from. Also the SSR and first-client-render
 * value, which is what makes hydration safe: the server cannot know what is
 * unlocked, so both sides render "nothing unlocked" and the effect fills it in.
 */
export function emptyState(): AchievementState {
  return {
    v: ACHIEVEMENTS_SCHEMA_VERSION,
    firstVisit: 0,
    unlocked: {},
    sets: {},
    days: [],
    seen: [],
    sent: [],
    visitorId: "",
    optOut: false,
  };
}

/** Frozen shared instance for render paths that must not mutate. */
export const EMPTY_STATE: AchievementState = Object.freeze(emptyState());

// --- Burst tracking (in memory, never persisted) ---------------------------
//
// "Ten theme flips in thirty seconds" has to mean one deliberate burst. If the
// counter were persisted it would also fire for someone who flips the theme once
// a day for ten days, which is not the joke. Timestamps live here and die with
// the tab.

const bursts = new Map<string, number[]>();

/** Burst key -> its rolling window, derived from the registry (single source of truth). */
const BURST_WINDOWS: ReadonlyMap<string, number> = new Map(
  ACHIEVEMENTS.filter((a) => a.rule.kind === "burst").map((a) => {
    const rule = a.rule as Extract<Achievement["rule"], { kind: "burst" }>;
    return [rule.key, rule.windowMs];
  }),
);

/** Record a burst hit and return how many happened inside `windowMs`. */
function pushBurst(key: string, windowMs: number): number {
  const now = Date.now();
  const recent = (bursts.get(key) ?? []).filter((t) => now - t <= windowMs);
  recent.push(now);
  bursts.set(key, recent);
  return recent.length;
}

/** How many hits are currently inside the window, without recording a new one. */
function peekBurst(key: string, windowMs: number): number {
  const now = Date.now();
  return (bursts.get(key) ?? []).filter((t) => now - t <= windowMs).length;
}

// --- Storage ---------------------------------------------------------------

/** Module-level cache so repeated reads during a render pass are free. */
let cached: AchievementState | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function numberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function setsRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value)) {
    const members = stringArray(v);
    if (members.length > 0) out[k] = members.slice(0, MAX_SET_MEMBERS);
  }
  return out;
}

/**
 * Ordered schema migrators. `MIGRATIONS[n]` upgrades a state at version `n` to
 * version `n + 1`. Empty today — the ladder exists so the first real change is a
 * one-function addition rather than a reshaping free-for-all.
 */
const MIGRATIONS: Record<number, (state: AchievementState) => AchievementState> = {};

/**
 * Coerce anything read out of storage into a valid state. Every field is
 * defaulted individually so a partial write from a killed tab degrades instead of
 * wiping progress, and a corrupt blob resets rather than throwing into a render.
 */
function migrate(parsed: unknown): AchievementState {
  if (!isRecord(parsed)) return emptyState();

  let state: AchievementState = {
    v: typeof parsed.v === "number" ? parsed.v : ACHIEVEMENTS_SCHEMA_VERSION,
    firstVisit: typeof parsed.firstVisit === "number" ? parsed.firstVisit : 0,
    unlocked: numberRecord(parsed.unlocked),
    sets: setsRecord(parsed.sets),
    days: stringArray(parsed.days).slice(-MAX_DAYS),
    seen: stringArray(parsed.seen),
    sent: stringArray(parsed.sent),
    visitorId: typeof parsed.visitorId === "string" ? parsed.visitorId : "",
    optOut: parsed.optOut === true,
  };

  while (state.v < ACHIEVEMENTS_SCHEMA_VERSION) {
    const step = MIGRATIONS[state.v];
    if (!step) return { ...emptyState(), unlocked: state.unlocked, optOut: state.optOut };
    state = step(state);
  }

  // A state from the future (user downgraded, or we rolled back a deploy) is not
  // safe to interpret. Keep the unlocks, discard the rest.
  if (state.v > ACHIEVEMENTS_SCHEMA_VERSION) {
    return { ...emptyState(), unlocked: state.unlocked, optOut: state.optOut };
  }

  return state;
}

/** Read persisted state. Returns {@link EMPTY_STATE} on SSR or storage failure. */
export function readState(): AchievementState {
  if (typeof window === "undefined") return EMPTY_STATE;
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    cached = raw ? migrate(JSON.parse(raw)) : emptyState();
  } catch {
    // Blocked storage, quota, or malformed JSON — start clean rather than crash.
    cached = emptyState();
  }
  return cached;
}

/**
 * Persist and broadcast. No-op on SSR. A storage failure still updates the cache
 * so the session behaves correctly in private mode; it just won't survive a
 * reload, which is the right degradation for a cosmetic feature.
 */
function writeState(next: AchievementState): void {
  if (typeof window === "undefined") return;
  cached = next;
  try {
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — session-only from here. */
  }
  window.dispatchEvent(new CustomEvent(ACHIEVEMENT_CHANGE_EVENT));
}

/** Local calendar day as "YYYY-MM-DD". Local, not UTC — "days" means the visitor's. */
function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Opaque, non-identifying visitor id. Only ever leaves the browser if the
 *  rarity endpoint is configured, and even then it is a random string. */
function makeVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// --- Rule evaluation -------------------------------------------------------

/**
 * Is this achievement's rule satisfied by `state`? Pure — no I/O, no events.
 * Keeping it pure is what makes the whole engine trivially unit-testable the day
 * this repo grows a test runner.
 *
 * `event` rules are never satisfied here; they are unlocked imperatively.
 */
function isSatisfied(achievement: Achievement, state: AchievementState): boolean {
  const rule = achievement.rule;
  switch (rule.kind) {
    case "event":
      return false;

    case "burst":
      return peekBurst(rule.key, rule.windowMs) >= rule.target;

    case "set": {
      const members = state.sets[rule.key] ?? [];
      if (rule.members) return rule.members.every((m) => members.includes(m));
      return members.length >= (rule.target ?? 1);
    }

    case "days":
      return state.days.length >= rule.target;

    case "span":
      if (!state.firstVisit) return false;
      return Date.now() - state.firstVisit >= rule.target * 24 * 60 * 60 * 1000;

    case "meta":
      return ACHIEVEMENTS.every((a) => a.rule.kind === "meta" || a.id in state.unlocked);
  }
}

/**
 * Unlock everything now satisfied, repeating until nothing new appears so that a
 * `meta` rule can fire in the same pass as the achievement that completed it.
 * Returns the mutated state plus the ids earned. Pure apart from reading the
 * burst map and the clock.
 */
function evaluate(state: AchievementState): { state: AchievementState; earned: string[] } {
  const earned: string[] = [];
  let next = state;

  // Two passes is enough: ordinary rules, then any `meta` rule they completed.
  for (let pass = 0; pass < 2; pass += 1) {
    const newlyEarned: string[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.id in next.unlocked) continue;
      if (isSatisfied(achievement, next)) newlyEarned.push(achievement.id);
    }
    if (newlyEarned.length === 0) break;

    const unlocked = { ...next.unlocked };
    const now = Date.now();
    for (const id of newlyEarned) unlocked[id] = now;
    next = { ...next, unlocked };
    earned.push(...newlyEarned);
  }

  return { state: next, earned };
}

/** Persist `next`, then announce anything newly earned. */
function commit(next: AchievementState, earned: string[]): void {
  writeState(next);
  if (earned.length > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids: earned } }));
  }
}

/** Shared guard: tracking is a no-op on SSR and when the visitor has opted out. */
function trackingDisabled(): boolean {
  return typeof window === "undefined" || readState().optOut;
}

// --- Public tracking API ---------------------------------------------------

/**
 * Unlock an achievement directly. Idempotent — an already-earned id is a no-op,
 * so a handler firing on every click never produces duplicate toasts.
 *
 * Unknown ids are ignored rather than throwing: a stale call site left behind by
 * a removed achievement should be harmless, not a crash.
 */
export function unlock(id: string): void {
  if (trackingDisabled()) return;
  if (!ACHIEVEMENTS_BY_ID.has(id)) return;

  const state = readState();
  if (id in state.unlocked) return;

  const withId: AchievementState = {
    ...state,
    unlocked: { ...state.unlocked, [id]: Date.now() },
  };
  const result = evaluate(withId);
  commit(result.state, [id, ...result.earned]);
}

/**
 * Record a distinct member against a tracking key — the workhorse for coverage
 * achievements ("open every project", "see three cities"). Re-adding an existing
 * member is a cheap no-op, so it is safe to call from a hover or scroll handler.
 */
export function trackMember(key: string, member: string): void {
  if (trackingDisabled() || !member) return;

  const state = readState();
  const current = state.sets[key] ?? [];
  if (current.includes(member) || current.length >= MAX_SET_MEMBERS) return;

  const withMember: AchievementState = {
    ...state,
    sets: { ...state.sets, [key]: [...current, member] },
  };
  const result = evaluate(withMember);
  commit(result.state, result.earned);
}

/**
 * Record a hit against a rolling-window burst key ("ten flips in thirty
 * seconds"). Nothing about the burst is persisted — only the achievement it
 * eventually unlocks.
 *
 * The window is read off the registry rule rather than passed in, so a call site
 * can never drift out of sync with the achievement it feeds.
 */
export function trackBurst(key: string): void {
  if (trackingDisabled()) return;

  const windowMs = BURST_WINDOWS.get(key);
  if (windowMs === undefined) return;

  pushBurst(key, windowMs);
  const result = evaluate(readState());
  if (result.earned.length > 0) commit(result.state, result.earned);
}

/**
 * Stamp today's visit. Called once per page load by the tracker: seeds
 * `firstVisit` and `visitorId` for a new visitor, appends today's date, and
 * re-evaluates the `days` / `span` grinders.
 */
export function markVisit(): void {
  if (trackingDisabled()) return;

  const state = readState();
  const day = today();
  const alreadyToday = state.days.includes(day);

  // Nothing to record and nothing to seed — skip the write entirely.
  if (alreadyToday && state.firstVisit && state.visitorId) return;

  const withVisit: AchievementState = {
    ...state,
    firstVisit: state.firstVisit || Date.now(),
    visitorId: state.visitorId || makeVisitorId(),
    days: alreadyToday ? state.days : [...state.days, day].slice(-MAX_DAYS),
  };
  const result = evaluate(withVisit);
  commit(result.state, result.earned);
}

// --- Notification bookkeeping ----------------------------------------------

/** Ids earned but never shown in a toast — what the toaster should announce. */
export function unseenUnlocks(): string[] {
  const state = readState();
  return Object.keys(state.unlocked).filter(
    (id) => !state.seen.includes(id) && ACHIEVEMENTS_BY_ID.has(id),
  );
}

/** Mark ids as announced so they never toast again. */
export function markSeen(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const state = readState();
  const fresh = ids.filter((id) => !state.seen.includes(id));
  if (fresh.length === 0) return;
  writeState({ ...state, seen: [...state.seen, ...fresh] });
}

/** Mark ids as reported to the rarity endpoint. */
export function markSent(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const state = readState();
  const fresh = ids.filter((id) => !state.sent.includes(id));
  if (fresh.length === 0) return;
  writeState({ ...state, sent: [...state.sent, ...fresh] });
}

// --- Progress + preferences ------------------------------------------------

export interface Progress {
  earned: number;
  total: number;
  /** 0..1 — drives the clue-reveal thresholds on /achievements. */
  ratio: number;
  points: number;
  totalPoints: number;
  byTier: Record<Tier, { earned: number; total: number }>;
}

/** Aggregate progress for the page header. Pure given a state. */
export function getProgress(state: AchievementState): Progress {
  const byTier = {} as Record<Tier, { earned: number; total: number }>;
  let earned = 0;
  let points = 0;
  let totalPoints = 0;

  for (const achievement of ACHIEVEMENTS) {
    const tier = achievement.tier;
    byTier[tier] ??= { earned: 0, total: 0 };
    byTier[tier].total += 1;
    totalPoints += TIER_POINTS[tier];

    if (achievement.id in state.unlocked) {
      byTier[tier].earned += 1;
      earned += 1;
      points += TIER_POINTS[tier];
    }
  }

  return {
    earned,
    total: TOTAL_ACHIEVEMENTS,
    ratio: TOTAL_ACHIEVEMENTS === 0 ? 0 : earned / TOTAL_ACHIEVEMENTS,
    points,
    totalPoints,
    byTier,
  };
}

/**
 * How far along a partial achievement is, 0..1. Used to draw the progress ring on
 * locked badges ("3 of 5 projects opened"). Returns 1 for anything earned and 0
 * for rules with no measurable progress.
 */
export function getRuleProgress(achievement: Achievement, state: AchievementState): number {
  if (achievement.id in state.unlocked) return 1;

  const rule = achievement.rule;
  switch (rule.kind) {
    case "set": {
      const members = state.sets[rule.key] ?? [];
      if (rule.members) {
        const hit = rule.members.filter((m) => members.includes(m)).length;
        return rule.members.length === 0 ? 0 : hit / rule.members.length;
      }
      const target = rule.target ?? 1;
      return Math.min(1, members.length / target);
    }
    case "days":
      return Math.min(1, state.days.length / rule.target);
    case "meta": {
      const others = ACHIEVEMENTS.filter((a) => a.rule.kind !== "meta");
      const done = others.filter((a) => a.id in state.unlocked).length;
      return others.length === 0 ? 0 : done / others.length;
    }
    default:
      return 0;
  }
}

/**
 * Wipe the visitor's local progress without changing aggregate identity.
 *
 * The anonymous visitor id is deliberately retained so resetting the trophy case
 * cannot manufacture a second Convex visitor. Convex also deduplicates each
 * visitor/achievement pair, so earning a badge again after a reset does not change
 * the historical aggregate count.
 */
export function resetProgress(): void {
  if (typeof window === "undefined") return;
  bursts.clear();
  const previous = readState();
  const next: AchievementState = {
    ...emptyState(),
    visitorId: previous.visitorId,
  };

  try {
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — session-only from here. */
  }
  cached = next;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENT_CHANGE_EVENT));
}

/**
 * Turn tracking off (or back on). While opted out every `unlock()` / `track*()`
 * call returns immediately, so nothing is recorded and nothing is reported.
 */
export function setOptOut(optOut: boolean): void {
  if (typeof window === "undefined") return;
  writeState({ ...readState(), optOut });
}

/**
 * Drop the in-memory cache so the next {@link readState} re-reads storage. Called
 * by the tracker's `storage` listener — without it, two open tabs would silently
 * overwrite each other's progress from stale snapshots.
 */
export function invalidateCache(): void {
  cached = null;
}
