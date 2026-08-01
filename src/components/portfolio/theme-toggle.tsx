import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  DEFAULT_THEME,
  applyTheme,
  getStoredTheme,
  nextTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Binary light/dark switch, styled to match the nav's translucent pills.
 *
 * State is initialized in an effect — never during render — so the server render
 * and the first client render agree (both start at {@link DEFAULT_THEME}) and
 * hydration never mismatches. The real page theme is applied even earlier by
 * `THEME_INIT_SCRIPT` in the document head, so there is no flash.
 */
export function ThemeToggle({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleClick = () => {
    const next = nextTheme(theme);
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next, true);
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
