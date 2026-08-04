import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { useAchievements } from "@/hooks/use-achievements";

/**
 * Trophy-room entry point for the nav's utility cluster.
 *
 * Built from the same 34px round-pill recipe as theme-toggle.tsx so it sits
 * beside the ⌘K pill and the theme switch without looking bolted on. The count
 * badge only appears once something has actually been earned — an empty "0/36" on
 * a first visit is noise, and before hydration the count is 0 by definition, which
 * is also what keeps the server and client markup identical.
 */
export function AchievementNavButton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const { progress, hydrated } = useAchievements();
  const showCount = hydrated && progress.earned > 0;

  return (
    <Link
      to="/achievements"
      className={`relative inline-flex items-center justify-center rounded-full text-ink font-display transition-colors hover:text-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright ${className}`}
      style={{
        width: 34,
        height: 34,
        background: "var(--portfolio-nav)",
        border: "1px solid var(--portfolio-border-strong)",
        backdropFilter: "blur(8px)",
        ...style,
      }}
      aria-label={
        showCount ? `Achievements — ${progress.earned} of ${progress.total} earned` : "Achievements"
      }
      title="Achievements"
    >
      <Trophy size={16} aria-hidden="true" />

      {showCount && (
        <span
          className="absolute grid place-items-center rounded-full font-display font-semibold on-dark text-white"
          style={{
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            fontSize: 10,
            background: "var(--portfolio-accent)",
            border: "1px solid var(--portfolio-space)",
          }}
          aria-hidden="true"
        >
          {progress.earned}
        </span>
      )}
    </Link>
  );
}
