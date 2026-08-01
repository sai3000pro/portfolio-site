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

function openFallback(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function printResume(url: string): void {
  if (typeof document === "undefined") return;

  // Drop any frame left over from a previous attempt so repeat clicks stay clean.
  document.getElementById(FRAME_ID)?.remove();

  let settled = false;
  const finish = (fallback: boolean) => {
    if (settled) return;
    settled = true;
    if (fallback) openFallback(url);
  };

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

  frame.onload = () => {
    try {
      const win = frame.contentWindow;
      if (!win) {
        finish(true);
        return;
      }
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
  window.setTimeout(() => finish(true), PRINT_GRACE_MS);
}
