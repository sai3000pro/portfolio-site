/**
 * The command palette's *shell*: everything that must exist before the palette's
 * 68 kB of UI (cmdk + Radix Dialog + icons) has been downloaded.
 *
 * WHY THIS MODULE EXISTS: `components/portfolio/command-palette.tsx` is the only
 * consumer of cmdk in the app, and it used to be imported eagerly from
 * `routes/__root.tsx` — so every route, including "/", paid for a dialog that
 * renders literally nothing until someone presses ⌘K. It is now lazy. But three
 * of the palette's behaviours cannot be lazy, because they have to observe input
 * that happens *before* the chunk exists:
 *
 *  1. The ⌘K / Ctrl+K shortcut itself. A listener that only starts existing once
 *     the chunk has loaded would swallow the very keypress that asked for it.
 *  2. `open`. The keypress has to be able to record "the palette is open" while
 *     the chunk is still in flight, so the component opens on mount rather than
 *     the triggering event being dropped on the floor.
 *  3. The two input-provenance flags behind the Keyboard Warrior achievement
 *     (see {@link claimKeyboardWarrior}). `lastInputWasKeyboard` is fed by *every*
 *     keydown and cleared by *every* pointerdown, including the ones that land
 *     during the chunk fetch — a mouse click missed while loading would hand out
 *     a "never touched the mouse" badge to someone who did.
 *
 * So the shortcut, the open store, and the flags stay eager (a few hundred bytes
 * of plain module state, no React tree, no cmdk); only the rendered palette is
 * code-split. `routes/__root.tsx` owns the eager host component.
 *
 * The store is deliberately module state rather than React state or context, for
 * the same reason lib/theme.ts is: `openCommandPalette()` is called from
 * nav.tsx, and importing it must not drag the heavy chunk back in.
 *
 * SSR SAFETY: nothing here touches `window` / `document` at module scope, and the
 * server snapshot is a constant `false`, so the prerendered HTML and the first
 * client render agree — the palette contributes no markup until it is opened.
 */

import { useSyncExternalStore } from "react";

import { unlock } from "@/lib/achievements";

/**
 * Custom window event other components dispatch to open the palette. Kept as a
 * plain DOM event so no extra state library / provider is needed.
 */
export const OPEN_EVENT = "portfolio:open-palette";

/**
 * Programmatically open the command palette from anywhere (e.g. a nav button).
 * SSR-safe: no-ops when there is no window.
 *
 * Importing this must stay cheap — nav.tsx is eager on every route — which is why
 * it lives here and not next to the component it opens.
 */
export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

// --- Open/close store ------------------------------------------------------

let open = false;
const listeners = new Set<() => void>();

/**
 * Set the palette's open state and notify subscribers. Safe to call before the
 * palette chunk has loaded: the state is what the component reads on mount, so a
 * ⌘K during the fetch still ends with an open palette.
 *
 * Opening the palette at all is an achievement, and it is unlocked *here* rather
 * than in a mount effect so it still fires for a visitor who opens and closes
 * again before the chunk arrives.
 */
export function setPaletteOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
  if (next) unlock("power-user");
}

function subscribeToPalette(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readPaletteOpen(): boolean {
  return open;
}

/** Hydration + SSR snapshot. Constant: the palette is never open on first paint. */
function getServerPaletteSnapshot(): boolean {
  return false;
}

/** Whether the palette is open, re-rendering the caller when that changes. */
export function usePaletteOpen(): boolean {
  return useSyncExternalStore(subscribeToPalette, readPaletteOpen, getServerPaletteSnapshot);
}

// --- Input provenance (Keyboard Warrior) -----------------------------------

/**
 * Was *this* opening of the palette triggered by ⌘K rather than the nav button?
 * The {@link OPEN_EVENT} path deliberately clears it — clicking "Search" is not
 * keyboard-only, however you drive the palette afterwards.
 */
let openedViaKeyboard = false;

/**
 * Was the most recent input event anywhere on the page a key rather than a
 * pointer? Sampled at the instant a palette action runs, so a mouse click on a
 * palette item (pointerdown, then click, then `onSelect`) reads `false` while an
 * Enter selection still reads `true` from the keystrokes that preceded it.
 */
let lastInputWasKeyboard = false;

/**
 * Award Keyboard Warrior if this palette session was opened by ⌘K *and* the
 * visitor has not touched a pointer since. Called from the palette's action
 * runner, before the action itself. No-op when either half is false, and
 * idempotent via `unlock()`.
 */
export function claimKeyboardWarrior(): void {
  if (openedViaKeyboard && lastInputWasKeyboard) unlock("keyboard-warrior");
}

/**
 * Register the global listeners: ⌘K / Ctrl+K toggles, Escape closes,
 * {@link OPEN_EVENT} opens, and every keydown / pointerdown updates the
 * provenance flags above. Returns an unsubscribe. Call once, from the eager host
 * in routes/__root.tsx — this is the part that must NOT be code-split.
 */
export function installPaletteShortcuts(): () => void {
  if (typeof window === "undefined") return () => {};

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openedViaKeyboard = true;
      lastInputWasKeyboard = true;
      setPaletteOpen(!open);
    } else if (e.key === "Escape") {
      // Deliberately does not touch `lastInputWasKeyboard`: Escape dismisses the
      // palette, so nothing will ever sample the flag for this keystroke.
      setPaletteOpen(false);
    } else {
      lastInputWasKeyboard = true;
    }
  };

  const onPointerDown = () => {
    lastInputWasKeyboard = false;
  };

  const onOpen = () => {
    openedViaKeyboard = false;
    setPaletteOpen(true);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener(OPEN_EVENT, onOpen);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener(OPEN_EVENT, onOpen);
  };
}

// --- Code splitting --------------------------------------------------------

/**
 * The one and only import site for the palette chunk. `React.lazy` in
 * routes/__root.tsx and {@link prefetchCommandPalette} both go through it, so
 * Rollup emits a single chunk and the browser's module registry dedupes the
 * second request to nothing.
 *
 * The cycle this creates (shell -> palette -> shell) is a dynamic edge, so it is
 * a chunk boundary rather than a circular dependency: by the time the palette
 * chunk evaluates, this module is long since initialised.
 */
export function loadCommandPalette() {
  return import("@/components/portfolio/command-palette");
}

let prefetchStarted = false;

/**
 * Warm the palette chunk so the first ⌘K has nothing to wait for. Idempotent,
 * and a failure resets the latch so a later attempt (or the real open) retries
 * instead of being permanently poisoned.
 */
export function prefetchCommandPalette(): void {
  if (prefetchStarted || typeof window === "undefined") return;
  prefetchStarted = true;
  void loadCommandPalette().catch(() => {
    prefetchStarted = false;
  });
}

/** Fallback delay where `requestIdleCallback` is unavailable (older Safari). */
const IDLE_FALLBACK_MS = 3000;

/** Upper bound on how long the idle prefetch may be deferred. */
const IDLE_TIMEOUT_MS = 8000;

/**
 * Schedule {@link prefetchCommandPalette} for the browser's next idle period, so
 * it can never compete with hydration, the hero image, or a route transition.
 * Returns a canceller.
 *
 * Skipped entirely under Save-Data: a speculative 68 kB fetch is exactly the
 * thing that header asks us not to do, and the nav button's hover prefetch plus
 * the on-demand load still cover the palette there.
 */
export function prefetchCommandPaletteWhenIdle(): () => void {
  if (typeof window === "undefined") return () => {};

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return () => {};

  if (typeof window.requestIdleCallback !== "function") {
    const timer = setTimeout(prefetchCommandPalette, IDLE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }

  const handle = window.requestIdleCallback(() => prefetchCommandPalette(), {
    timeout: IDLE_TIMEOUT_MS,
  });
  return () => window.cancelIdleCallback(handle);
}
