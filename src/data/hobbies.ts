/**
 * Photo manifest for the /hobbies screen.
 *
 * Two halves, deliberately kept apart:
 *
 *   ./hobbies.generated.ts   machine-derived — sizes, aspect, EXIF date/camera, accent
 *                            colour. Written by `bun run photos`; never edit by hand.
 *   PHOTO_TEXT (below)       hand-written — alt text, captions, locations, and any hobby
 *                            the filename guessed wrong. The generator only reads this.
 *
 * To add photos: drop the originals into photos/hobbies/ and run `bun run photos`. It
 * resizes, converts to WebP, reads the EXIF, and rewrites the generated half. Then write
 * alt text here for the ids it lists.
 */

import { GENERATED_PHOTOS } from "./hobbies.generated";

/**
 * Photo subjects, not pastimes. These describe what is *in* the frame, which is what a
 * viewer of a photo wall actually wants — and unlike a list of sports, it stays accurate as
 * the collection grows. The pipeline guesses a tag from the filename prefix, so naming a
 * file "water-01.jpg" tags it for free.
 *
 * The runtime list is the source of truth; HobbyTag is derived from it.
 */
export const HOBBY_TAGS = [
  "landscape",
  "water",
  "sky",
  "forest",
  "urban",
  "travel",
  "wildlife",
] as const;

export type HobbyTag = (typeof HOBBY_TAGS)[number];

function isHobbyTag(value: string): value is HobbyTag {
  return (HOBBY_TAGS as readonly string[]).includes(value);
}

export interface HobbyPhoto {
  /** Stable slug — React key, clone identity, lightbox addressing. */
  id: string;
  /** Tile-sized image, e.g. "assets/hobbies/kart-01.webp". Base-less; assetUrl() prefixes it. */
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

/** The half a machine can't write. Keyed by photo id — the filename slug. */
type PhotoText = {
  alt: string;
  caption?: string;
  location?: string;
  /** Only needed when the filename prefix didn't name the hobby. */
  hobby?: HobbyTag;
  /** Override EXIF, which reports model codes ("ILCE-7M4") rather than names ("A7 IV"). */
  gear?: string;
  date?: string;
};

/**
 * `bun run photos` prints a ready-to-paste line for every photo missing an entry here.
 * Nothing in this object is ever overwritten by the generator.
 */
const PHOTO_TEXT: Record<string, PhotoText> = {
  // `location` is left blank throughout — these files carry no GPS EXIF and guessing at
  // places would put invented facts on the page. Fill them in as you like.
  "img-0021": {
    alt: "View from an aeroplane window over a reservoir and patchwork farmland, wing in frame",
    caption: "Somewhere over the approach, wing down",
    hobby: "travel",
  },
  "img-0034": {
    alt: "Green plains and farmland stretching to distant hills, seen from a hilltop viewpoint",
    caption: "Monsoon green, all the way out",
    hobby: "landscape",
  },
  "img-0048": {
    alt: "Tall trees framing a clear deep-blue twilight sky",
    caption: "Blue hour through the canopy",
    hobby: "sky",
  },
  "img-0060": {
    alt: "Sunset glowing pink and violet through silhouetted branches and leaves",
    caption: "The good ten minutes",
    hobby: "sky",
  },
  "img-0095": {
    alt: "A calm lake framed by overhanging maple leaves, pine forest on the far shore",
    caption: "Found the good spot on the shoreline",
    hobby: "water",
  },
  "img-0105": {
    alt: "Late summer sun over a rocky clearing, a cabin roof just visible through the trees",
    hobby: "forest",
  },
  "img-0108": {
    alt: "Canoes pulled up on a lakeshore at dusk, low sun over the water and pines on the point",
    caption: "Canoes in for the night",
    hobby: "water",
  },
};

/**
 * Merge the two halves. A photo with no text entry still renders — with weak alt text and a
 * guessed hobby — because a missing caption should never be able to break the wall.
 */
const REAL_PHOTOS: HobbyPhoto[] = GENERATED_PHOTOS.map((g) => {
  const text = PHOTO_TEXT[g.id];
  const hobby = text?.hobby ?? (isHobbyTag(g.hobby) ? g.hobby : HOBBY_TAGS[0]);
  return {
    id: g.id,
    src: g.src,
    full: g.full,
    aspect: g.aspect,
    date: text?.date ?? g.date,
    gear: text?.gear ?? g.gear,
    accent: g.accent,
    hobby,
    alt: text?.alt ?? `A ${hobby} photo`,
    caption: text?.caption,
    location: text?.location,
  };
});

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
const TAGS: HobbyTag[] = ["landscape", "water", "sky", "forest", "urban", "travel"];

/**
 * Placeholders carry no `location`, `date` or `gear` — on purpose.
 *
 * They used to be seeded from sample EXIF arrays ("Monaco", "Sony A7 IV - 35mm") so the
 * lightbox metadata row had something to render against. But the lightbox prints those
 * values verbatim, as capture data, and the real photos have none of them: the files carry
 * no GPS EXIF and the rest was stripped on import. The result was that the only photos on
 * the wall claiming a camera and a place were the ones that never existed — exactly the
 * invented facts the note at the top of PHOTO_TEXT says not to put on the page.
 *
 * The lightbox filters the row's items and skips the whole <p> when none survive, so a
 * placeholder simply shows its caption with no metadata line beneath it.
 */
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
      accent: `hsl(${hue} 85% 62%)`,
    };
  });
}

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
