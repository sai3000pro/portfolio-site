import { assetUrl } from "@/lib/assets";

/**
 * Bundled vCard helpers.
 *
 * The vCard lives in `public/contact.vcf`, so it is served from the site root.
 * Like every other public asset it must be resolved through `assetUrl` (see
 * `src/lib/assets.ts`) so it keeps working under the deploy base path
 * (e.g. `/portfolio-site/`). This module is pure and SSR-safe: it touches no
 * `window`/`document` at module scope, so it is safe to import anywhere.
 */

/** Bare, document-relative path to the bundled vCard (resolve via `assetUrl`). */
export const VCARD_PATH = "contact.vcf";

/** Suggested filename shown to the user when the vCard is downloaded. */
export const VCARD_FILENAME = "saivenkat-jilla.vcf";

/** Props needed to render an anchor that downloads the vCard. */
export interface VCardDownloadProps {
  /** Fully resolved href, base-path aware. */
  href: string;
  /** Value for the anchor's `download` attribute. */
  download: string;
}

/**
 * Build the props for a "Download vCard" link. `assetUrl` is called here (not at
 * module scope) so the base path is resolved lazily and this stays SSR-safe.
 */
export function getVCardDownloadProps(): VCardDownloadProps {
  return {
    href: assetUrl(VCARD_PATH),
    download: VCARD_FILENAME,
  };
}
