import { Moon, Sun } from "lucide-react";

import { KEYS } from "@/data/achievements";
import { trackBurst, unlock } from "@/lib/achievements";
import { applyTheme, nextTheme, setStoredTheme, useTheme } from "@/lib/theme";

/**
 * Binary light/dark switch, styled to match the nav's translucent pills.
 *
 * The theme is read from {@link useTheme}, not held locally, so this button and
 * every other consumer (the contact form's toaster, for one) always agree. That
 * hook keeps the same hydration contract this component used to implement by
 * hand: the server render and the first client render both show the dark
 * default, and the stored preference arrives after hydration. The real page theme
 * is applied even earlier by `THEME_INIT_SCRIPT` in the document head, so there is
 * no flash.
 */
export function ThemeToggle({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const theme = useTheme();

  const handleClick = () => {
    const next = nextTheme(theme);
    setStoredTheme(next);
    // Applying the theme is what notifies useTheme, so this re-renders the button.
    applyTheme(next, true);

    if (next === "light") unlock("let-there-be-light");
    trackBurst(KEYS.themeFlips);
  };

  const upcoming = nextTheme(theme);
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`theme-toggle inline-flex items-center justify-center rounded-full text-ink font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright ${className}`}
      style={{
        width: 34,
        height: 34,
        background: "var(--portfolio-nav)",
        border: "1px solid var(--portfolio-border-strong)",
        backdropFilter: "blur(8px)",
        ...style,
      }}
      aria-label={`Switch to ${upcoming} theme`}
      title={`Switch to ${upcoming} theme`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
