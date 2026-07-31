/**
 * Photo manifest for the /hobbies screen.
 *
 * There is no image pipeline in this repo — files in public/assets/hobbies/ ship exactly
 * as committed. Export tiles at roughly 640px on the long edge (WebP, ~80KB) and put the
 * full-resolution version in `full` if you want the lightbox to load something sharper.
 *
 * `src` stays a bare, base-less path; assetUrl() in @/lib/assets applies BASE_URL at
 * render time so the paths survive being loaded from the /hobbies sub-route.
 */

export type HobbyTag = "tennis" | "f1" | "basketball" | "baseball" | "soccer" | "travel" | "music";

export interface HobbyPhoto {
  /** Stable slug — React key, clone identity, lightbox addressing. */
  id: string;
  /** Tile-sized image, e.g. "assets/hobbies/kart-01.webp". */
  src: string;
  /** Optional full-resolution source, loaded only when the lightbox opens. */
  full?: string;
  /** Required — this is what keeps the a11y score from rotting as photos are added. */
  alt: string;
  caption?: string;
  hobby: HobbyTag;
  /** width / height. Sizes the lightbox before load so it doesn't jump. */
  aspect?: number;
}

const TILE_W = 640;
const TILE_H = 480;

/**
 * An SVG data URI standing in for a real photo.
 *
 * Deliberately a real <img> rather than a styled <div>: placeholders then travel the exact
 * same decode/paint path as real photos, so animation timing tuned today still holds once
 * the actual files land.
 */
function placeholderSrc(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 34%)"/><stop offset="1" stop-color="hsl(${(hue + 26) % 360} 76% 11%)"/>
</linearGradient></defs>
<rect width="${TILE_W}" height="${TILE_H}" fill="url(#g)"/>
<text x="50%" y="52%" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-size="34" font-weight="600" fill="rgba(255,255,255,0.62)" letter-spacing="2">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const HUES = [205, 265, 12, 158, 38, 320];
const TAGS: HobbyTag[] = ["tennis", "f1", "basketball", "baseball", "soccer", "travel"];

function makePlaceholders(count: number, offset = 0): HobbyPhoto[] {
  return Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    const tag = TAGS[i % TAGS.length];
    const label = `${tag} ${String(i + 1).padStart(2, "0")}`;
    return {
      id: `placeholder-${i}`,
      src: placeholderSrc(label, HUES[i % HUES.length]),
      alt: `Placeholder tile ${i + 1} — a ${tag} photo will go here`,
      hobby: tag,
      aspect: TILE_W / TILE_H,
    };
  });
}

/** Real photos go here. Append as files land in public/assets/hobbies/. */
const REAL_PHOTOS: HobbyPhoto[] = [];

/**
 * The belts need enough tiles to fill a wide viewport twice over; below this the wrap
 * seam becomes visible on screen. Placeholders top the list up so the screen stays intact
 * while real photos are added a few at a time.
 */
const MIN_TILES = 24;

export const HOBBY_PHOTOS: HobbyPhoto[] = [
  ...REAL_PHOTOS,
  ...(REAL_PHOTOS.length < MIN_TILES
    ? makePlaceholders(MIN_TILES - REAL_PHOTOS.length, REAL_PHOTOS.length)
    : []),
];
