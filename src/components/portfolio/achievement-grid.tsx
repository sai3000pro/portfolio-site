"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { HelpCircle, Lock, RotateCcw, Sparkles } from "lucide-react";

import {
  ACHIEVEMENTS,
  CATEGORY_META,
  TIER_ORDER,
  TIER_POINTS,
  type Achievement,
  type Category,
} from "@/data/achievements";
import { resetProgress } from "@/lib/achievements";
import { nextClueMilestone, useAchievements, type ClueLevel } from "@/hooks/use-achievements";
import { useAchievementRarity } from "@/hooks/use-achievement-rarity";
import { formatRarity } from "@/lib/achievement-stats";
import { AchievementBadge, type BadgeState } from "@/components/portfolio/achievement-badge";
import { Reveal, Section, SectionHeading } from "@/components/portfolio/section";

/**
 * The trophy case: progress header, filters, and the grouped badge grid.
 *
 * PRERENDER CONTRACT: this renders correctly with no client state at all — the
 * static HTML shows every badge locked and "0 / <total>", which is exactly right for a
 * first-time visitor and gives the page real indexable content. Real progress
 * arrives from useAchievements()'s effect after hydration.
 */

/** Filter modes on the toolbar. */
type Filter = "all" | "earned" | "locked" | "secret";

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "locked", label: "Locked" },
  { id: "secret", label: "Secrets" },
];

/** Fixed display order — easiest first so the wall reads as a difficulty ramp. */
const CATEGORY_ORDER: readonly Category[] = [
  "first-contact",
  "explorer",
  "tinkerer",
  "deep-space",
  "long-haul",
];

/** Pill styling shared by the filter toolbar, mirroring nav.tsx's PILL_STYLE. */
const PILL_STYLE = {
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
  backdropFilter: "blur(8px)",
} as const;

export function TrophyCase() {
  const { state, progress, isUnlocked, progressOf, clueLevelOf } = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");
  const rarity = useAchievementRarity();

  const milestone = useMemo(() => nextClueMilestone(state, progress), [state, progress]);

  const visible = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) => {
        switch (filter) {
          case "earned":
            return isUnlocked(a.id);
          case "locked":
            return !isUnlocked(a.id);
          case "secret":
            return a.secret;
          default:
            return true;
        }
      }),
    [filter, isUnlocked],
  );

  const pct = Math.round(progress.ratio * 100);

  return (
    <Section id="trophy-case">
      {/* `immediate` throughout the header: this is a dedicated route, so the
          title, progress panel, and filters all load above the fold and would
          otherwise sit at opacity 0 waiting for a scroll that never happens. */}
      <SectionHeading eyebrow="Trophy case" title="Achievements" as="h1" immediate />

      {/* --- Progress header ------------------------------------------------ */}
      <Reveal delay={0.12} immediate>
        <div
          className="mx-auto mt-10 rounded-2xl"
          style={{
            maxWidth: 720,
            padding: "clamp(20px,3vw,28px)",
            background: "var(--portfolio-surface)",
            border: "1px solid var(--portfolio-border)",
          }}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className="font-display font-extrabold text-ink"
                style={{ fontSize: "clamp(34px,5vw,56px)", lineHeight: 1 }}
              >
                {progress.earned}
                <span className="text-muted-portfolio" style={{ fontSize: "0.5em" }}>
                  {" "}
                  / {progress.total}
                </span>
              </div>
              <div className="text-muted-portfolio" style={{ fontSize: 13.5, marginTop: 4 }}>
                badges earned
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-display font-bold text-accent-bright"
                style={{ fontSize: "clamp(20px,3vw,28px)", lineHeight: 1 }}
              >
                {progress.points.toLocaleString()}
              </div>
              <div className="text-muted-portfolio" style={{ fontSize: 13.5, marginTop: 4 }}>
                of {progress.totalPoints.toLocaleString()} points
              </div>
            </div>
          </div>

          <div
            className="mt-5 w-full overflow-hidden rounded-full"
            style={{ height: 8, background: "var(--portfolio-surface-2)" }}
            role="progressbar"
            aria-valuenow={progress.earned}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label={`${progress.earned} of ${progress.total} achievements earned`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, var(--portfolio-accent), var(--portfolio-accent-bright))",
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TIER_ORDER.map((tier) => {
              const tally = progress.byTier[tier];
              if (!tally) return null;
              return (
                <span
                  key={tier}
                  className="rounded-full font-display capitalize text-muted-portfolio"
                  style={{ fontSize: 12, padding: "4px 10px", ...PILL_STYLE }}
                >
                  {tally.earned}/{tally.total} {tier}
                </span>
              );
            })}
          </div>

          {milestone && (
            <p
              className="mt-4 flex items-center gap-2 text-muted-portfolio"
              style={{ fontSize: 13 }}
            >
              <Sparkles size={14} className="text-accent-bright" aria-hidden="true" />
              Earn {milestone.need} more to sharpen the clues on {milestone.secrets} hidden badge
              {milestone.secrets === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </Reveal>

      {/* --- Filters --------------------------------------------------------- */}
      <Reveal delay={0.16} immediate>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className="rounded-full font-display font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                style={{
                  fontSize: 13,
                  padding: "7px 16px",
                  ...PILL_STYLE,
                  background: active ? "var(--portfolio-surface-2)" : PILL_STYLE.background,
                  borderColor: active ? "var(--portfolio-border-strong)" : undefined,
                  color: active ? "var(--portfolio-ink)" : "var(--portfolio-muted)",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* --- Grid ------------------------------------------------------------ */}
      {CATEGORY_ORDER.map((category) => {
        const group = visible.filter((a) => a.category === category);
        if (group.length === 0) return null;

        const all = ACHIEVEMENTS.filter((a) => a.category === category);
        const earned = all.filter((a) => isUnlocked(a.id)).length;

        return (
          <div key={category} className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display font-bold text-ink" style={{ fontSize: 21 }}>
                {CATEGORY_META[category].label}
              </h2>
              <span className="font-display text-accent-bright" style={{ fontSize: 13 }}>
                {earned} / {all.length}
              </span>
            </div>
            <p className="text-muted-portfolio" style={{ fontSize: 13.5, marginTop: 2 }}>
              {CATEGORY_META[category].blurb}
            </p>

            <div
              className="mt-5 grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}
            >
              {group.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  clueLevel={clueLevelOf(achievement)}
                  progress={progressOf(achievement)}
                  unlockedAt={state.unlocked[achievement.id]}
                  rarity={formatRarity(achievement, rarity)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <ResetControl />
    </Section>
  );
}

/**
 * One badge tile. Four visual states, driven entirely by `clueLevel`:
 * earned, locked-with-hint, secret-with-clue, and fully hidden.
 *
 * TWO tiles are disclosures, for opposite reasons. A fully hidden secret hides its
 * "interact more" message behind a hover or a click. An *earned* tile hides its
 * criteria — the "before" text — behind a click, because unlocking a badge replaces the
 * one line that said what to do with a line of flavour, and a week later nobody
 * remembers which of thirty-seven things they did to get it. Both swaps are React state
 * rather than CSS `:hover`, because a CSS-only reveal is invisible to assistive tech,
 * and the control carries `aria-expanded` plus real Enter/Space handling so it is
 * operable without a mouse.
 *
 * WHY NOT A NATIVE `<button>`: a button's content model is phrasing content, and
 * this tile's children are flow content — `<p>`, the layout `<div>`s, and the
 * `<div>` that `AchievementBadge` renders. Rewriting all of that into spans would
 * mean reshaping the shared badge component for one caller. `role="button"` with an
 * explicit key handler is the supported ARIA equivalent, so that is what this uses.
 */
function AchievementCard({
  achievement,
  clueLevel,
  progress,
  unlockedAt,
  rarity,
}: {
  achievement: Achievement;
  clueLevel: ClueLevel;
  progress: number;
  unlockedAt?: number;
  /** null when there is no measurement and the hint would only repeat the tier. */
  rarity: string | null;
}) {
  const [probing, setProbing] = useState(false);
  const earned = clueLevel === "earned";
  const hidden = clueLevel === "hidden";

  const state: BadgeState = earned ? "earned" : achievement.secret ? "secret" : "locked";

  const title = earned || !achievement.secret ? achievement.name : hidden ? "???" : "Hidden badge";

  // The "before" text: what you actually had to do. Ordinary badges print it while
  // locked and it then disappears behind the flavour line; secrets never show it at all,
  // and their sharp clue is the same instruction written as a nudge. Once earned, either
  // one answers the only question a finished badge leaves — "what did I do for this?"
  const criteria = achievement.hint ?? achievement.clues?.[1] ?? null;

  const body = (() => {
    if (earned) return probing && criteria ? criteria : achievement.description;
    if (!achievement.secret) return achievement.hint ?? "";
    if (probing && hidden) return "Interact with the site more to receive clues.";
    switch (clueLevel) {
      case "category":
        return `${CATEGORY_META[achievement.category].label} · ${achievement.tier}`;
      case "vague":
        return achievement.clues?.[0] ?? "";
      case "sharp":
        return achievement.clues?.[1] ?? achievement.hint ?? "";
      default:
        return "Hover for a hint.";
    }
  })();

  // Every unearned secret keeps the "there is something to read here" cursor...
  const hinting = achievement.secret && !earned;

  // ...but only a fully hidden one has anything to disclose: `body` consults
  // `probing` in exactly one branch, `probing && hidden`. At category / vague /
  // sharp the clue is already on screen, so exposing those tiles as buttons
  // advertised an action that could never change anything.
  const probeable = achievement.secret && hidden;

  // An earned tile is the other kind of disclosure: click to swap the brag for the
  // criteria. Click and keyboard only — no hover. A hidden secret is a single tile you
  // go hunting for, but the earned set is most of the wall, and swapping text under the
  // cursor as you sweep across it turns reading the page into a flicker.
  const recallable = earned && criteria !== null;

  const toggle = () => setProbing((v) => !v);
  const revealable = probeable || recallable;

  return (
    <div
      // The whole tile is the disclosure control, focusable only when it has
      // something left to reveal.
      {...(revealable
        ? {
            role: "button" as const,
            tabIndex: 0,
            "aria-expanded": probing,
            onClick: toggle,
            // WCAG 2.1.1: `role="button"` promises Enter and Space, and neither
            // did anything here. Space additionally has to be swallowed or it
            // scrolls the page out from under the tile the visitor is reading.
            onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              toggle();
            },
            ...(probeable
              ? {
                  onMouseEnter: () => setProbing(true),
                  onMouseLeave: () => setProbing(false),
                  onFocus: () => setProbing(true),
                  onBlur: () => setProbing(false),
                }
              : {}),
          }
        : {})}
      className={`flex flex-col items-center rounded-2xl text-center transition-colors ${
        hinting ? "cursor-help" : recallable ? "cursor-pointer" : ""
      } ${
        revealable ? "focus-visible:outline-none focus-visible:ring-2" : ""
      } focus-visible:ring-accent-bright`}
      style={{
        padding: 18,
        background: earned ? "var(--portfolio-surface-2)" : "var(--portfolio-surface)",
        border: `1px solid ${earned ? "var(--portfolio-border-strong)" : "var(--portfolio-border)"}`,
      }}
    >
      <AchievementBadge achievement={achievement} state={state} size={72} progress={progress} />

      <div
        className="font-display font-semibold text-ink"
        style={{ fontSize: 14.5, marginTop: 12 }}
      >
        {title}
      </div>

      {/* On a `revealable` tile this text is inside the button, whose children are
          presentational — so it reaches assistive tech as part of the computed
          name. Toggling therefore changes both the name and `aria-expanded`, which
          is what gets the revealed message announced rather than silently swapped. */}
      <p
        className="text-muted-portfolio"
        style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.45 }}
      >
        {body}
      </p>

      {/* The affordance. Without it the swap is undiscoverable — nothing about a
          finished tile suggests it still has a second face. The label names what you
          get, not what you press, so it doubles as the expanded/collapsed readout for
          anyone hearing the tile rather than seeing it. */}
      {recallable && (
        <div
          className="flex items-center gap-1 font-display text-accent-bright"
          style={{ fontSize: 11.5, marginTop: 6 }}
        >
          <HelpCircle size={11} aria-hidden="true" />
          {probing ? "Hide" : "How you got it"}
        </div>
      )}

      <div
        className="mt-auto flex items-center gap-1.5 pt-3 text-muted-portfolio"
        style={{ fontSize: 11.5 }}
      >
        {/* Tier is printed in BOTH states, and that is the point of this shape.
            It used to be the locked-only half of an if/else, so the moment you earned a
            badge the one line telling you how rare it was got replaced by its point value —
            the rarity vanished exactly when you had most earned the right to see it. A
            locked card claiming "Rare" that goes quiet on unlock reads like the card is
            hiding the good part.

            The separator belongs to the piece that follows it, never between two
            always-present slots, so nothing can trail a bare "·". The lock glyph takes no
            separator (it is an icon butting against a word); "+10" does. */}
        {earned ? (
          <>
            <span className="text-accent-bright">+{TIER_POINTS[achievement.tier]}</span>
            <span aria-hidden="true">·</span>
          </>
        ) : (
          <Lock size={11} aria-hidden="true" />
        )}
        <span className="capitalize">{achievement.tier}</span>
        {rarity ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{rarity}</span>
          </>
        ) : null}
      </div>

      {earned && unlockedAt ? (
        <div className="text-muted-portfolio" style={{ fontSize: 11, marginTop: 3, opacity: 0.75 }}>
          {new Date(unlockedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Reset progress. Two-step inline confirm rather than a modal — it keeps the
 * styling in portfolio tokens and is the fastest way to re-test the first-visit
 * flow without digging through devtools storage.
 */
function ResetControl() {
  const [confirming, setConfirming] = useState(false);

  // Never leave the page sitting in a primed destructive state.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="mt-16 flex flex-col items-center gap-3">
      <p className="text-muted-portfolio text-center" style={{ fontSize: 12.5, maxWidth: 460 }}>
        Progress is stored in this browser only — no account, no cookies, nothing personal.
      </p>

      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetProgress();
              setConfirming(false);
            }}
            className="rounded-full font-display font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={{
              fontSize: 12.5,
              padding: "7px 16px",
              background: "var(--portfolio-surface-2)",
              border: "1px solid var(--portfolio-border-strong)",
              color: "var(--portfolio-ink)",
            }}
          >
            Yes, erase everything
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full font-display text-muted-portfolio transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={{ fontSize: 12.5, padding: "7px 16px", ...PILL_STYLE }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-full font-display text-muted-portfolio transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{ fontSize: 12.5, padding: "7px 16px", ...PILL_STYLE }}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset progress
        </button>
      )}
    </div>
  );
}
