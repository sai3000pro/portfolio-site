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

import { useSyncExternalStore } from "react";

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
 * Duration of the colour cross-fade, in ms. Must stay in sync with the
 * `html.theme-switching` transition duration in src/styles.css.
 */
export const THEME_TRANSITION_MS = 320;

/** Pending cleanup for the transition class, so rapid toggles don't strand it. */
let transitionTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Fired on `window` after {@link applyTheme} actually changes the active theme.
 * `detail: { theme }`. Same transport as `portfolio:achievements-changed` and
 * `portfolio:open-palette`, so a non-React listener (a canvas, a lib helper) can
 * react to a theme flip without importing anything from React.
 */
export const THEME_CHANGE_EVENT = "portfolio:theme-changed";

/**
 * Client-side cache of the theme currently on `<html>`, lazily seeded from
 * storage on first read.
 *
 * It exists because {@link useSyncExternalStore} requires a snapshot that is
 * cheap and stable across calls within a render; hitting `localStorage` on every
 * render would satisfy neither. `THEME_INIT_SCRIPT` and {@link getStoredTheme}
 * read the same key, so the lazy seed always agrees with what is painted.
 */
let currentTheme: Theme | null = null;

/** The active theme: the cache if seeded, otherwise whatever is stored. */
function readCurrentTheme(): Theme {
  currentTheme ??= getStoredTheme();
  return currentTheme;
}

/**
 * Apply a theme by toggling the `light` / `dark` class on `<html>` and syncing
 * `color-scheme` for native UI (scrollbars, form controls). No-op on SSR.
 *
 * `animate` briefly adds `.theme-switching`, which enables a global colour
 * transition (see styles.css) so the swap cross-fades instead of snapping. Skip it
 * for the initial paint — you only want it for a deliberate user toggle.
 *
 * Subscribers ({@link useTheme}, {@link THEME_CHANGE_EVENT}) are notified only when
 * the theme actually changes. A re-apply of the theme already in effect — which is
 * what an initial-load call is — writes the same classes and stays silent, so it
 * can never nudge a hydrating tree off its server snapshot.
 */
export function applyTheme(theme: Theme, animate = false): Theme {
  if (typeof document === "undefined") return theme;
  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-switching");
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove("theme-switching");
    }, THEME_TRANSITION_MS);
  }

  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;

  if (readCurrentTheme() !== theme) {
    currentTheme = theme;
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
  }

  return theme;
}

/** Subscribe to theme changes. Returns an unsubscribe. No-op on SSR. */
function subscribeToTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/** Hydration + SSR snapshot. Constant, because the server cannot know the preference. */
function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}

/**
 * The active theme, re-rendering the caller whenever it changes. The single
 * source of truth for any component that needs to *read* the theme.
 *
 * HYDRATION CONTRACT: `getServerThemeSnapshot` is used both on the server and for
 * the client's hydration render, so both sides start at {@link DEFAULT_THEME} and
 * the markup matches; React then checks the live snapshot in a post-hydration
 * effect and re-renders if the visitor's stored preference differs. That is the
 * same contract theme-toggle.tsx used to hand-roll with `useState` + `useEffect`.
 *
 * WHY useSyncExternalStore RATHER THAN useState + useEffect (the shape
 * use-achievements.ts uses): a consumer that mounts *after* hydration — a
 * client-side route change, a lazily rendered section — gets the correct theme in
 * its very first render instead of painting one frame of the default and
 * correcting. That matters here and not for achievements, because the theme is
 * already on `<html>` before first paint (`THEME_INIT_SCRIPT`), so a component
 * rendering `dark` for a frame on a light page is a visible flash rather than a
 * momentarily-empty trophy case.
 *
 * WHY NO CONTEXT PROVIDER: the store is module state, not tree state. Every
 * consumer subscribes directly, so there is nothing for a provider to carry and
 * no `<ThemeProvider>` to thread through the prerendered routes.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, readCurrentTheme, getServerThemeSnapshot);
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
