import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  applyTheme,
  getStoredTheme,
  nextTheme,
  setStoredTheme,
  watchSystemTheme,
  type Theme,
} from "@/lib/theme";

/** Icon + human label for each preference, used for the icon and aria-label. */
const META: Record<Theme, { Icon: typeof Sun; label: string }> = {
  light: { Icon: Sun, label: "light" },
  dark: { Icon: Moon, label: "dark" },
  system: { Icon: Monitor, label: "system" },
};

/**
 * Translucent pill button that cycles the theme (light → dark → system) and
 * mirrors the nav's styling. It initializes its state in an effect — never
 * during render — so the server render and first client render always agree
 * (state starts as `"system"` on both), avoiding a hydration flash. The actual
 * page theme is set even earlier by `THEME_INIT_SCRIPT` in the document head.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  // Latest theme for the (stable) matchMedia listener without re-subscribing.
  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  useEffect(() => {
    // Sync to the stored preference after mount (post-hydration).
    setTheme(getStoredTheme());
    // Keep a live "system" preference in sync with the OS.
    return watchSystemTheme(() => {
      if (themeRef.current === "system") applyTheme("system");
    });
  }, []);

  const handleClick = () => {
    const next = nextTheme(theme);
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  };

  const { Icon } = META[theme];
  const upcoming = nextTheme(theme);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="theme-toggle inline-flex items-center justify-center rounded-full text-white font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
      style={{
        width: 42,
        height: 42,
        background: "rgba(47,155,255,0.14)",
        border: "1px solid rgba(93,182,255,0.35)",
        backdropFilter: "blur(8px)",
      }}
      aria-label={`Switch to ${META[upcoming].label} theme`}
      title={`Theme: ${META[theme].label}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
