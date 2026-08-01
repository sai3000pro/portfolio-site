/**
 * Theme logic for the cosmic portfolio.
 *
 * The site is dark by default (its identity); a `.light` class on the <html>
 * element re-expresses the portfolio tokens for a readable light palette. The
 * shadcn tokens key off the `.dark` class, so we always toggle exactly one of
 * `light` / `dark` on `document.documentElement`.
 *
 * The preference is a simple binary light/dark switch — there is deliberately no
 * "system" mode, so the control is a single unambiguous toggle.
 *
 * SSR SAFETY: nothing here touches `window` / `document` at module scope. Every
 * browser-only function guards with `typeof window`, so it is safe to import in
 * a server render and only call the effectful pieces from client effects.
 */

/** User-facing preference. */
export type Theme = "light" | "dark";

/** localStorage key holding the persisted {@link Theme} preference. */
export const THEME_STORAGE_KEY = "portfolio:theme";

/** Dark is the site's identity, so it is the default for a first-time visitor. */
export const DEFAULT_THEME: Theme = "dark";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Read the stored preference. Falls back to {@link DEFAULT_THEME} when nothing is
 * stored, the value is invalid, or we are not in a browser (SSR).
 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Persist the preference. No-op on SSR or when storage is unavailable. */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage may be blocked (private mode, quota) — ignore. */
  }
}

/**
 * Apply a theme by toggling the `light` / `dark` class on `<html>` and syncing
 * `color-scheme` for native UI (scrollbars, form controls). No-op on SSR.
 */
export function applyTheme(theme: Theme): Theme {
  if (typeof document === "undefined") return theme;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  return theme;
}

/** The other theme — what a toggle press will switch to. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Synchronous, self-contained IIFE (as a string) that sets the correct `<html>`
 * class BEFORE first paint to prevent a flash-of-wrong-theme (FOUC).
 *
 * Injected verbatim into the document `<head>` by src/routes/__root.tsx:
 *
 * ```tsx
 * <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
 * ```
 *
 * It reads the same {@link THEME_STORAGE_KEY} preference, defaults to dark, and is
 * wrapped in try/catch so a storage failure never blocks render.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t="${DEFAULT_THEME}";var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(t);e.style.colorScheme=t;}catch(_){}})();`;
