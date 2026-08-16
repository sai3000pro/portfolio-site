import { useCallback, useEffect, useState } from "react";

import { ACHIEVEMENTS, TOTAL_ACHIEVEMENTS, type Achievement } from "@/data/achievements";
import {
  ACHIEVEMENT_CHANGE_EVENT,
  EMPTY_STATE,
  getProgress,
  getRuleProgress,
  readState,
  type AchievementState,
  type Progress,
} from "@/lib/achievements";

/**
 * Completion thresholds at which a secret achievement leaks its next clue.
 *
 * Gating on overall completion is what makes the page's "interact with the site
 * more to receive clues" copy literally true: the board really does open up as
 * you play, and it needs no extra persisted state to do it.
 */
export const CLUE_THRESHOLDS = { category: 0.25, vague: 0.5, sharp: 0.75 } as const;

/** How much of a secret is currently visible on the grid. */
export type ClueLevel = "hidden" | "category" | "vague" | "sharp" | "earned";

export interface AchievementsView {
  state: AchievementState;
  progress: Progress;
  /** False until the client effect has read storage — use it to skip transitions. */
  hydrated: boolean;
  isUnlocked: (id: string) => boolean;
  /** 0..1 toward a countable rule; 1 when earned. Drives the badge progress ring. */
  progressOf: (achievement: Achievement) => number;
  /** How much of a secret to reveal right now. Always "earned" once unlocked. */
  clueLevelOf: (achievement: Achievement) => ClueLevel;
}

/**
 * Subscribe to achievement state.
 *
 * HYDRATION CONTRACT: the initial value is {@link EMPTY_STATE} on both the server
 * and the first client render — storage is only read inside the effect. This is
 * the same approach theme-toggle.tsx documents, and it is what guarantees the
 * prerendered `/achievements` HTML (everything locked) matches what React expects
 * on hydration. Reading localStorage in a `useState` initializer would look
 * simpler and would break every prerendered page.
 */
export function useAchievements(): AchievementsView {
  const [state, setState] = useState<AchievementState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(readState());
    sync();
    setHydrated(true);

    window.addEventListener(ACHIEVEMENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ACHIEVEMENT_CHANGE_EVENT, sync);
  }, []);

  const isUnlocked = useCallback((id: string) => id in state.unlocked, [state]);

  const progressOf = useCallback(
    (achievement: Achievement) => getRuleProgress(achievement, state),
    [state],
  );

  const progress = getProgress(state);

  const clueLevelOf = useCallback(
    (achievement: Achievement): ClueLevel => {
      if (achievement.id in state.unlocked) return "earned";
      if (!achievement.secret) return "sharp";

      // Stumbling onto a secret is itself a clue: any real progress toward it
      // reveals everything, because the visitor has clearly already found it.
      if (getRuleProgress(achievement, state) > 0) return "sharp";

      const ratio = TOTAL_ACHIEVEMENTS === 0 ? 0 : progress.earned / TOTAL_ACHIEVEMENTS;
      if (ratio >= CLUE_THRESHOLDS.sharp) return "sharp";
      if (ratio >= CLUE_THRESHOLDS.vague) return "vague";
      if (ratio >= CLUE_THRESHOLDS.category) return "category";
      return "hidden";
    },
    [state, progress.earned],
  );

  return { state, progress, hydrated, isUnlocked, progressOf, clueLevelOf };
}

/**
 * How many more achievements are needed before secrets leak their next clue, and
 * how many still-locked secrets that would affect. Returns `null` once every
 * threshold has been passed. Powers the nudge line under the progress header.
 */
export function nextClueMilestone(
  state: AchievementState,
  progress: Progress,
): { need: number; secrets: number } | null {
  const thresholds = [CLUE_THRESHOLDS.category, CLUE_THRESHOLDS.vague, CLUE_THRESHOLDS.sharp];
  const ratio = progress.total === 0 ? 0 : progress.earned / progress.total;

  const threshold = thresholds.find((t) => ratio < t);
  if (threshold === undefined) return null;

  const secrets = ACHIEVEMENTS.filter((a) => a.secret && !(a.id in state.unlocked)).length;
  if (secrets === 0) return null;

  return { need: Math.max(1, Math.ceil(threshold * progress.total) - progress.earned), secrets };
}
