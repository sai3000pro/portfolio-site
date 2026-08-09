/**
 * Print the résumé PDF — not the web page.
 *
 * A bare `window.print()` prints whatever is on screen, which for a portfolio means
 * the entire landing page. The résumé is a real PDF asset, so "Print résumé" must
 * target that file instead.
 *
 * Strategy: load the PDF into an offscreen iframe and print that document. This works
 * in Chromium-based browsers, which use an internal PDF viewer that exposes
 * `contentWindow.print()`. Firefox and Safari sandbox their PDF viewers more tightly
 * and can refuse or silently no-op, so every failure path (load error, thrown
 * exception, or nothing happening within a grace period) falls back to opening the PDF
 * in a new tab where the browser's own viewer offers a print button.
 */

const FRAME_ID = "resume-print-frame";
/** If the iframe hasn't reached its viewer and printed by now, open a tab instead. */
const PRINT_GRACE_MS = 2500;
/**
 * Backstop for tearing down a frame that did print. `afterprint` handles the normal
 * case, but a PDF viewer that never fires it would otherwise leak the frame forever.
 * Long enough that a user reading the preview before hitting Cancel is never cut off.
 */
const FRAME_CLEANUP_MS = 120_000;

function openFallback(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function printResume(url: string): void {
  if (typeof document === "undefined") return;

  // Drop any frame left over from a previous attempt so repeat clicks stay clean.
  document.getElementById(FRAME_ID)?.remove();

  const frame = document.createElement("iframe");
  frame.id = FRAME_ID;
  frame.title = "Résumé (print)";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // Offscreen rather than display:none / zero-size: some engines refuse to render —
  // and therefore to print — a frame they consider invisible.
  frame.style.position = "fixed";
  frame.style.left = "-9999px";
  frame.style.top = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.border = "0";
  frame.style.pointerEvents = "none";

  let settled = false;
  let graceTimer = 0;

  // Detaching a frame whose viewer is mid-print cancels the dialog, so removal is only
  // safe once we know nothing is printing from it: either we gave up and fell back
  // (no dialog was ever opened), or `afterprint` told us the dialog is closed.
  const removeFrame = () => frame.remove();

  const finish = (fallback: boolean) => {
    if (settled) return;
    settled = true;
    // Whichever path settles first owns the outcome — stop the other from also running.
    window.clearTimeout(graceTimer);

    if (fallback) {
      // Nothing is printing: the viewer errored, was unreachable, or never loaded.
      removeFrame();
      openFallback(url);
      return;
    }
    window.setTimeout(removeFrame, FRAME_CLEANUP_MS);
  };

  frame.onload = () => {
    // The grace period already elapsed and a fallback tab is open; printing now would
    // hand the user two paths at once. Just clean up.
    if (settled) {
      removeFrame();
      return;
    }
    try {
      const win = frame.contentWindow;
      if (!win) {
        finish(true);
        return;
      }
      // Fires once the print dialog closes (printed or cancelled) — the earliest moment
      // the frame is provably idle. Deferred so the frame outlives its own event dispatch.
      win.addEventListener("afterprint", () => window.setTimeout(removeFrame, 0), {
        once: true,
      });
      win.focus();
      win.print();
      // The print dialog is modal and synchronous in practice; reaching here means the
      // browser accepted it, so no fallback tab.
      finish(false);
    } catch {
      finish(true);
    }
  };

  frame.onerror = () => finish(true);

  document.body.appendChild(frame);
  frame.src = url;

  // Safety net: if onload never fires (blocked/unsupported viewer), open a tab.
  graceTimer = window.setTimeout(() => finish(true), PRINT_GRACE_MS);
}
