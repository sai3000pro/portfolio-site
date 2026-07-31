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
  /** EXIF-style capture location, e.g. "Waterloo, ON". Shown in the lightbox metadata row. */
  location?: string;
  /** Human-readable capture date, e.g. "Jul 2025". Not parsed — display only. */
  date?: string;
  /** Camera/lens string, e.g. "Sony A7 IV - 35mm". Shown in the lightbox metadata row. */
  gear?: string;
  /** HSL accent color matching the tile, e.g. "hsl(205 85% 62%)". Tints border/glow. */
  accent?: string;
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

/** Sample EXIF-style values so the lightbox metadata UI is testable against placeholders. */
const LOCATIONS = [
  "Waterloo, ON",
  "Montreal, QC",
  "Toronto, ON",
  "Vancouver, BC",
  "Austin, TX",
  "Monaco",
];
const DATES = ["Jul 2025", "Jun 2025", "Apr 2025", "Feb 2025", "Nov 2024", "Sep 2024"];
const GEAR = [
  "Sony A7 IV - 35mm",
  "Sony A7 IV - 85mm",
  "Fujifilm X-T5 - 23mm",
  "Canon R6 - 70-200mm",
  "Nikon Z6 II - 50mm",
  "iPhone 15 Pro",
];

function makePlaceholders(count: number, offset = 0): HobbyPhoto[] {
  return Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    const tag = TAGS[i % TAGS.length];
    const label = `${tag} ${String(i + 1).padStart(2, "0")}`;
    const hue = HUES[i % HUES.length];
    return {
      id: `placeholder-${i}`,
      src: placeholderSrc(label, hue),
      alt: `Placeholder tile ${i + 1} — a ${tag} photo will go here`,
      hobby: tag,
      aspect: TILE_W / TILE_H,
      location: LOCATIONS[i % LOCATIONS.length],
      date: DATES[i % DATES.length],
      gear: GEAR[i % GEAR.length],
      accent: `hsl(${hue} 85% 62%)`,
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
