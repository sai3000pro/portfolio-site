import { useQuery } from "@tanstack/react-query";

import { fetchRarity, isRarityEnabled, type RarityResult } from "@/lib/achievement-stats";

/** Aggregate counts change slowly; five minutes is plenty fresh for a vanity stat. */
const STALE_MS = 5 * 60_000;

const BASELINE: RarityResult = { kind: "baseline" };

/**
 * Live rarity percentages for the trophy case.
 *
 * Uses the QueryClientProvider already mounted in __root.tsx. The query is
 * `enabled: false` whenever `VITE_ACHIEVEMENTS_ENDPOINT` is unset, so the default
 * configuration produces zero network activity — verify that in the Network tab,
 * it is the acceptance criterion for the inert-by-default contract.
 */
export function useAchievementRarity(): RarityResult {
  // Explicit generics: inference otherwise narrows to the "live" arm of the
  // union and rejects the baseline placeholder.
  const { data } = useQuery<RarityResult, Error, RarityResult, string[]>({
    queryKey: ["achievement-rarity"],
    queryFn: ({ signal }) => fetchRarity(signal),
    enabled: isRarityEnabled(),
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    retry: 1,
    // Never surface a loading or error state — the page falls back to authored
    // estimates, which is a complete experience on its own.
    placeholderData: BASELINE,
  });

  return data ?? BASELINE;
}
