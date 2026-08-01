/**
 * Theme logic for the cosmic portfolio.
 *
 * The site is dark by default (its identity); a `.light` class on the <html>
 * element re-expresses the portfolio tokens for a readable light palette. The
 * shadcn tokens key off the `.dark` class, so we always toggle exactly one of
 * `light` / `dark` on `document.documentElement`.
 *
 * SSR SAFETY: nothing here touches `window` / `document` at module scope. Every
 * browser-only function guards with `typeof window`, so it is safe to import in
 * a server render and only call the effectful pieces from client effects.
 */

/** User-facing preference. `"system"` follows the OS via `matchMedia`. */
export type Theme = "light" | "dark" | "system";

/** A concrete, applied theme (what `"system"` resolves to). */
export type ResolvedTheme = "light" | "dark";

/** localStorage key holding the persisted {@link Theme} preference. */
export const THEME_STORAGE_KEY = "portfolio:theme";

const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";
const THEMES: readonly Theme[] = ["light", "dark", "system"];

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Read the stored preference. Returns `"system"` when nothing is stored, the
 * value is invalid, or we are not in a browser (SSR).
 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
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

/** Resolve the OS preference. Defaults to `"dark"` (the site identity) on SSR. */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia(PREFERS_DARK_QUERY).matches ? "dark" : "light";
}

/** Collapse a {@link Theme} into the concrete theme that should be applied. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

/**
 * Apply a theme by toggling the `light` / `dark` class on `<html>` and syncing
 * `color-scheme` for native UI (scrollbars, form controls). Returns the concrete
 * theme that was applied. No-op / `"dark"` on SSR.
 */
export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  if (typeof document === "undefined") return resolved;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  return resolved;
}

/**
 * Subscribe to OS color-scheme changes so a `"system"` preference stays live.
 * `callback` receives the newly resolved theme. Returns an unsubscribe function.
 * No-op (returns a noop) on SSR.
 */
export function watchSystemTheme(callback: (resolved: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia(PREFERS_DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => callback(event.matches ? "dark" : "light");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** The preference order used by a cycling toggle: light → dark → system → …. */
export function nextTheme(theme: Theme): Theme {
  const index = THEMES.indexOf(theme);
  return THEMES[(index + 1) % THEMES.length];
}

/**
 * Synchronous, self-contained IIFE (as a string) that sets the correct `<html>`
 * class BEFORE first paint to prevent a flash-of-wrong-theme (FOUC).
 *
 * A later agent must inject this verbatim into the document `<head>` as an inline
 * script that runs before the stylesheet renders, e.g.:
 *
 * ```tsx
 * <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
 * ```
 *
 * It reads the same {@link THEME_STORAGE_KEY} preference, resolves `"system"` via
 * `matchMedia`, and is wrapped in try/catch so a storage failure never blocks render.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var d=t==="dark"||(t==="system"&&window.matchMedia("${PREFERS_DARK_QUERY}").matches);var e=document.documentElement;e.classList.remove("light","dark");var r=d?"dark":"light";e.classList.add(r);e.style.colorScheme=r;}catch(_){}})();`;
