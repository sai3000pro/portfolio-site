// Image pipeline. Two modes, one script, one set of conventions.
//
//   bun run photos     hobbies mode (default) — the /hobbies gallery
//   bun run assets     assets mode            — the site's own chrome and project shots
//
// ---------------------------------------------------------------- hobbies mode
//
// Drop full-size originals — straight off a phone or camera, any size, any format — into
// photos/hobbies/ and run:
//
//   bun run photos
//
// For each original this writes into public/assets/hobbies/:
//   <slug>.webp        tile — long edge 1024px, what the justified grid renders
//   <slug>-full.webp   full — long edge 1600px, fetched only when the lightbox opens
//                             (skipped when the original is already tile-sized)
//
// ...and rewrites src/data/hobbies.generated.ts with everything derivable mechanically:
// aspect ratio, capture date and camera from EXIF, a dominant-colour accent, and a hobby
// guessed from the filename prefix.
//
// Words are NOT derived. alt text, captions and locations live in PHOTO_TEXT in
// src/data/hobbies.ts, which this script only ever reads — re-running can never clobber
// something you wrote. Each run ends by listing which photos still need alt text.
//
// Originals stay local: photos/ is gitignored and only the derived .webp files are
// committed. The manifest is therefore rebuilt from public/assets/hobbies/, not from the
// originals — so running this on a machine where photos/ is empty reports what's missing
// instead of deleting the site's photos. Nothing is ever removed without --prune.
//
// ---------------------------------------------------------------- assets mode
//
// The site's own imagery — the nav logo, the hero portrait, the project thumbnails — is
// not staged in photos/. Those originals live in public/assets/ and ARE committed; they
// are the source of truth and this script never moves, rewrites or deletes them. Assets
// mode only ever adds files, and only under public/assets/derived/.
//
//   bun run assets
//
// Naming convention, chosen so it is predictable from the original's filename alone and
// cannot collide with anything already in public/assets/:
//
//   public/assets/derived/<slug>-<width>w.webp    e.g. derived/verbalyst-800w.webp
//   public/assets/derived/favicon-32.png          the one PNG — browsers still want it
//
// <slug> is slugify(<original basename without extension>) — the same rule scripts/
// routes.mjs uses for project URLs. So "patronPal.png" → "patronpal", "Healthut.png" →
// "healthut". <width> is the derivative's real pixel width, always. A requested width
// larger than the original is clamped down rather than upscaled, and a clamped width that
// lands within 1.2x of a smaller sibling is dropped as not worth a second file — which is
// why devDucky.jpg (430px wide) gets a 400w and nothing else.
//
// The portrait is the one crop. It is displayed in a 4/5 box under object-cover, so the
// derivative is centre-cropped to 4/5 — pixel-identical to what the browser renders today,
// minus the bytes the browser was throwing away. Everything else is a plain downscale that
// preserves the original's aspect ratio exactly. `cropped` in the manifest says which.
//
// Assets mode rewrites src/data/images.generated.ts so call sites import widths and paths
// instead of hardcoding them. Paths there are bare and base-less, exactly like the hobbies
// manifest — run them through assetUrl() before they reach the DOM.
//
// It also re-encodes the hobby full-res files listed in OVERSIZED_FULL at a lower quality
// than the gallery's default. That is a repair for known outliers, not a policy: it needs
// the original in photos/hobbies/, and reports instead of guessing when one is absent.
//
// Flags (both modes):
//   --force   re-encode everything, ignoring the up-to-date check
//   --prune   delete generated files whose original is gone (default: report only)
//   --dry     report what would happen; write, move and delete nothing

import { readFile, writeFile, mkdir, readdir, stat, rename, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename, relative } from "node:path";

import sharp from "sharp";
import exifReader from "exif-reader";
import { format, resolveConfig } from "prettier";

import { slugify } from "./routes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SRC_DIR = join(ROOT, "photos/hobbies");
const OUT_DIR = join(ROOT, "public/assets/hobbies");
const MANIFEST_PATH = join(ROOT, "src/data/hobbies.generated.ts");
const HOBBIES_TS = join(ROOT, "src/data/hobbies.ts");

const ASSET_DIR = join(ROOT, "public/assets");
const DERIVED_DIR = join(ASSET_DIR, "derived");

/** Ensure nested asset targets (for example assets/spark/) have a matching
 * generated directory before Sharp writes their derivatives. */
async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}
const IMAGES_MANIFEST_PATH = join(ROOT, "src/data/images.generated.ts");

/** Public URL prefix. Base-less on purpose — assetUrl() applies BASE_URL at render time. */
const URL_PREFIX = "assets/hobbies";
const DERIVED_PREFIX = "assets/derived";

/**
 * Long-edge caps.
 *
 * TILE_MAX was 640 when the wall was conveyor belts, where a tile was never rendered much
 * above 260 CSS px and two dozen were on screen at once. The justified grid inverted both
 * halves of that: `--photo-row-h` tops out at 330px, so a landscape tile in a two-up row is
 * drawn around 500 CSS px wide, and lazy loading means only the first rows are ever fetched.
 * At 640 those tiles were visibly soft on a 2x display. 1024 covers 1x outright and 2x
 * adequately, and is simpler than a `srcset` plus a second derivative for every photo.
 */
const TILE_MAX = 1024;
const FULL_MAX = 1600;
const TILE_QUALITY = 78;
const FULL_QUALITY = 82;

/** Derivatives are built rarely and shipped forever, so they get sharp's slower effort. */
const DERIVED_EFFORT = 6;

/**
 * The site's own imagery, and what each original is actually asked to display at.
 *
 * `widths` are CSS-pixel widths the derivative should be able to serve at 1x and 2x; they
 * are requests, not promises — see effectiveWidths(). `crop` pins an output aspect ratio
 * (width / height) and centre-crops to reach it; omit it to preserve the original's.
 * `favicon` additionally emits a square PNG of that size.
 *
 * Ids are derived, not written: slugify(basename) keeps the manifest key, the output
 * filename and the original's name in lockstep.
 */
const DERIVATIVE_TARGETS = [
  // 38x38 in the nav, and the source of the favicon. 614px of PNG to paint an avatar.
  { file: "logo.png", widths: [76], quality: 86, favicon: 32 },
  // The LCP element: max 212x265, a 4/5 box under object-cover.
  { file: "portrait.jpeg", widths: [424, 848], crop: 4 / 5, quality: 78 },
  // Project cards: a 195x122 thumbnail, growing to roughly 400px inside the modal.
  { file: "verbalyst.png", widths: [400, 800], quality: 80 },
  { file: "Healthut.png", widths: [400, 800], quality: 80 },
  { file: "patronPal.png", widths: [400, 800], quality: 80 },
  { file: "devDucky.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/sai-at-work.png", widths: [400, 800], quality: 80 },
  { file: "spark/homepage.png", widths: [400, 800], quality: 80 },
  { file: "spark/album.png", widths: [400, 800], quality: 80 },
  { file: "spark/gallery.png", widths: [400, 800], quality: 80 },
  { file: "spark/generated-walk.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/world-map.png", widths: [400, 800], quality: 80 },
  { file: "spark/stats.png", widths: [400, 800], quality: 80 },
  { file: "spark/architecture.png", widths: [400, 800], quality: 80 },
  { file: "spark/capture.png", widths: [400, 800], quality: 80 },
  { file: "spark/aerial-view-via-splat.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/rover.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/rover-top-view.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/vietnamese-dinner.jpg", widths: [400, 800], quality: 80 },
  { file: "spark/winners.jpg", widths: [400, 800], quality: 80 },
  // CORnet-Mouse Unity captures. The first is the card thumbnail and case-study hero; the
  // other two only ever appear in that page's gallery grid, which tops out near 400px, so
  // they get one width instead of two. Flat-shaded 3D with large uniform skies and ground
  // planes, which WebP encodes cheaply — 80 is already past the point of visible gain.
  { file: "cornet-environment.png", widths: [400, 800], quality: 80 },
  { file: "cornet-predator.png", widths: [400, 800], quality: 80 },
  { file: "cornet-agent.png", widths: [400, 800], quality: 80 },

  // ScaleUp. Captures of the running app, so they are already screen-resolution rather
  // than retina — effectiveWidths() drops the 800 for anything narrower than ~960 native,
  // which is why these ask for both and several will only emit one. `landing` is the card
  // thumbnail and case-study hero; the rest are the gallery.
  { file: "scaleup/landing.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/skill-tree.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/courses.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/skill-detail.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/quests.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/character.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/video-analysis.jpg", widths: [400, 800], quality: 80 },
  { file: "scaleup/world.jpg", widths: [400, 800], quality: 80 },

  // The Devpost galleries for the older hackathon projects. Each project's card thumbnail
  // is still the top-level original it always was (verbalyst.png, Healthut.png, ...); these
  // are the remaining frames, which only ever render in the case-study grid at ~400px.
  { file: "verbalyst/recorder.png", widths: [400, 800], quality: 80 },
  { file: "verbalyst/analysis.png", widths: [400, 800], quality: 80 },
  { file: "verbalyst/progress.png", widths: [400, 800], quality: 80 },
  { file: "verbalyst/tongue-twisters.png", widths: [400, 800], quality: 80 },
  { file: "healthut/resources.png", widths: [400, 800], quality: 80 },
  { file: "healthut/sparkers.png", widths: [400, 800], quality: 80 },
  { file: "healthut/notes.png", widths: [400, 800], quality: 80 },
  { file: "healthut/discord-bot.png", widths: [400, 800], quality: 80 },
  { file: "devducky/mic-rig.jpg", widths: [400, 800], quality: 80 },
  { file: "devducky/ide.png", widths: [400, 800], quality: 80 },
  { file: "devducky/observability.png", widths: [400, 800], quality: 80 },
  { file: "patronpal/extension.png", widths: [400, 800], quality: 80 },
  { file: "patronpal/creators.png", widths: [400, 800], quality: 80 },

  // SmartSkin and HydroHomies are new to the site, so their thumbnails live in these
  // folders too rather than at the top level: `bench` and `title-card` respectively.
  // The three SmartSkin photographs are phone-camera originals at 4-5K wide, which is
  // why they are the only new entries that will actually emit both widths.
  { file: "smartskin/bench.jpg", widths: [400, 800], quality: 80 },
  { file: "smartskin/flareups.png", widths: [400, 800], quality: 80 },
  { file: "smartskin/whiteboard.jpg", widths: [400, 800], quality: 80 },
  { file: "smartskin/wearable.jpg", widths: [400, 800], quality: 80 },
  { file: "smartskin/readout.png", widths: [400, 800], quality: 80 },
  { file: "hydrohomies/title-card.png", widths: [400, 800], quality: 80 },
  { file: "hydrohomies/detection.png", widths: [400, 800], quality: 80 },
  { file: "hydrohomies/hydropet.png", widths: [400, 800], quality: 80 },
  { file: "hydrohomies/fair-play.png", widths: [400, 800], quality: 80 },

  // Game cover art for /gaming. Publisher artwork, not mine — see the note at the top of
  // src/data/gaming.ts. Sourced from Steam's own library art for the five Steam titles and
  // the iTunes Search API for the three mobile ones, so every file is the publisher's
  // current official image rather than something scraped off a fan wiki.
  //
  // 400 is the widest any of these is ever painted: the face-out cover is 188 CSS px and
  // the spines are 34-76px, so 400 covers both at 2x. The 200 is for the spines, which are
  // a narrow centre-crop and never need more.
  { file: "games/civ6.jpg", widths: [200, 400], quality: 82 },
  { file: "games/genshin.jpg", widths: [200, 400], quality: 82 },
  { file: "games/railway-empire.jpg", widths: [200, 400], quality: 82 },
  { file: "games/mtg-arena.jpg", widths: [200, 400], quality: 82 },
  { file: "games/minecraft.jpg", widths: [200, 400], quality: 82 },
  { file: "games/clash-royale.jpg", widths: [200, 400], quality: 82 },
  { file: "games/frostpunk.jpg", widths: [200, 400], quality: 82 },
  { file: "games/cities-skylines-2.jpg", widths: [200, 400], quality: 82 },

  // Employer and institution logos for the experience overlays. Every one of these is
  // somebody else's registered mark, used here to identify where the work happened —
  // nominative use, the same thing a CV does. Each is the owner's current official
  // lockup, taken from Wikimedia Commons where the file is public domain or CC-BY-SA and
  // from the organisation's own site otherwise, and each is credited in EXPERIENCE_LOGOS.
  // They are stored untouched apart from a whitespace trim, so the plate behind them does
  // the visual evening-up rather than any edit to the artwork.
  //
  // 400 is the widest a plate ever paints (the overlay column tops out near 406 CSS px),
  // so 800 is the 2x. Quality is higher than the photographs because these are flat art
  // with hard edges, where WebP's ringing shows up on thin letterforms first.
  { file: "logos/capital-one.png", widths: [400, 800], quality: 88 },
  { file: "logos/cambridge.png", widths: [400, 800], quality: 88 },
  { file: "logos/waterloo.png", widths: [400, 800], quality: 88 },
  { file: "logos/marsh-mclennan.png", widths: [400, 800], quality: 88 },
  { file: "logos/alt-protein-project.png", widths: [400, 800], quality: 88 },
  { file: "logos/mathsoc.png", widths: [400, 800], quality: 88 },
  { file: "logos/global-x.png", widths: [400, 800], quality: 88 },
  { file: "logos/slimescholars.png", widths: [400, 800], quality: 88 },
  // Volunteering organisations. Same rules as the employer marks above.
  { file: "logos/holland-bloorview.png", widths: [400, 800], quality: 88 },
  { file: "logos/toronto-public-library.png", widths: [400, 800], quality: 88 },
  { file: "logos/jamhacks.png", widths: [400, 800], quality: 88 },
];

/**
 * Full-res hobby files that get a lower quality than FULL_QUALITY, because their subject
 * matter is high-frequency enough that the top of the range buys nothing anyone can see.
 *
 * img-0105 is the case in point. It shipped at 719KB against a 267KB median, but that is
 * not slack in the encoder — measured at 1600px it goes 719KB @ q82, 645 @ q78, 572 @ q70,
 * 513 @ q58, 377 @ q30. A curve that flat means the bits are structure, not headroom, so a
 * byte budget aimed at the median would only be reachable by wrecking the photo. q58 takes
 * 206KB off it and hides its artefacts in exactly the detail that made it expensive.
 *
 * A hand-kept list, deliberately: a rule like "anything above 1.6x the median" moves its
 * own goalposts every time it fires and would eventually come for photos worth their size.
 *
 * Currently empty. It held img-0105-full.webp until that photo left the collection, after
 * which every run printed a "not in public/assets/hobbies — nothing to re-encode" notice
 * about a file nobody was looking for. The machinery below is kept because the next
 * oversized photo is a matter of time, and an empty list costs one skipped loop.
 */
const OVERSIZED_FULL = [];

/**
 * Formats sharp can decode from a file. Anything else in the drop folder is ignored with a
 * note rather than an error — a stray .DS_Store or .txt shouldn't fail the run.
 */
const SOURCE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".gif",
]);

const argv = process.argv.slice(2);
const args = new Set(argv.filter((a) => a.startsWith("--")));
const FORCE = args.has("--force");
const PRUNE = args.has("--prune");
const DRY = args.has("--dry");

const MODES = new Set(["hobbies", "assets"]);
const MODE = argv.find((a) => !a.startsWith("--")) ?? "hobbies";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;

/* --------------------------------------------------------------- reading src/data */

/**
 * hobbies.ts is TypeScript and this script is plain .mjs, so we read it rather than import
 * it — the same tolerant-regex approach as scripts/routes.mjs, for the same reasons: no
 * build step, no extra dependency, identical on Windows and Linux.
 *
 * @returns {Promise<{ tags: string[], described: Set<string>, tagged: Set<string> }>}
 */
async function readHobbiesSource() {
  let source = "";
  try {
    source = await readFile(HOBBIES_TS, "utf8");
  } catch {
    return { tags: [], described: new Set(), tagged: new Set() };
  }

  const tagBlock = source.match(/HOBBY_TAGS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const tags = tagBlock ? [...tagBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];

  // Which ids already have hand-written text, and which of those pin the hobby themselves.
  // Drives the closing checklists only — a filename guess that PHOTO_TEXT overrides is not
  // worth nagging about on every run.
  const textBlock = source.match(/PHOTO_TEXT[^=]*=\s*\{([\s\S]*?)\n\};/);
  const described = new Set();
  const tagged = new Set();
  if (textBlock) {
    // A key is quoted ("cn-tower") only when it has to be. Prettier strips the quotes from
    // every key that is a valid JS identifier — blossoms, coast, dawn, fish, lake, sunset —
    // so matching quoted keys alone under-counted by 20 of 75 and the run then nagged for
    // alt text that was already written. That is the kind of false alarm you "fix" by
    // pasting a duplicate entry, so both spellings are matched here.
    const KEY = String.raw`^ {2}(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*`;
    const collect = (re) => {
      for (const [, quoted, bare, body] of textBlock[1].matchAll(re)) {
        const id = quoted ?? bare;
        described.add(id);
        if (/\bhobby\s*:/.test(body)) tagged.add(id);
      }
    };
    collect(new RegExp(KEY + String.raw`\{([\s\S]*?)\n {2}\},`, "gm"));
    // Single-line entries: "id": { alt: "..." },
    collect(new RegExp(KEY + String.raw`\{([^\n{}]*)\},`, "gm"));
  }

  return { tags, described, tagged };
}

/**
 * Carry EXIF strings forward for photos whose original isn't on this machine. Without this,
 * regenerating from a fresh clone would silently blank every date and camera in the lightbox.
 *
 * @returns {Promise<Map<string, { date?: string, gear?: string }>>}
 */
async function readPreviousManifest() {
  const carried = new Map();
  let source = "";
  try {
    source = await readFile(MANIFEST_PATH, "utf8");
  } catch {
    return carried;
  }
  for (const [, body] of source.matchAll(/\{([^{}]*)\}/g)) {
    const id = body.match(/id:\s*"([^"]+)"/)?.[1];
    if (!id) continue;
    const date = body.match(/date:\s*"([^"]+)"/)?.[1];
    const gear = body.match(/gear:\s*"([^"]+)"/)?.[1];
    if (date || gear) carried.set(id, { date, gear });
  }
  return carried;
}

/* --------------------------------------------------------------- derived metadata */

/**
 * Guess the hobby from a filename prefix: "tennis-01.jpg" → "tennis". Falls back to the
 * first known tag so the manifest always typechecks; PHOTO_TEXT can override it.
 *
 * @param {string} slug @param {string[]} tags
 */
function guessHobby(slug, tags) {
  const head = slug.split("-")[0];
  if (tags.includes(head)) return { hobby: head, guessed: true };
  const match = tags.find((t) => slug.includes(t));
  if (match) return { hobby: match, guessed: true };
  return { hobby: tags[0] ?? "travel", guessed: false };
}

/** @param {number} r @param {number} g @param {number} b */
function rgbToHsl(r, g, b) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

/**
 * Dominant colour, clamped into the range the UI can actually use: the accent tints a border
 * and glow against a near-black page, so a muddy or near-black dominant would vanish.
 * Near-greyscale photos get the site's blue rather than a hue invented from sensor noise.
 *
 * @param {string} tilePath
 */
async function accentFrom(tilePath) {
  const { dominant } = await sharp(tilePath).stats();
  const [h, s, l] = rgbToHsl(dominant.r, dominant.g, dominant.b);
  if (s < 12) return "hsl(205 85% 62%)";
  const sat = Math.round(Math.min(90, Math.max(48, s)));
  const light = Math.round(Math.min(70, Math.max(54, l)));
  return `hsl(${Math.round(h)} ${sat}% ${light}%)`;
}

/**
 * Capture date and camera from EXIF, in the shapes the lightbox metadata row expects
 * ("Jul 2025", "Sony A7 IV - 35mm"). Month names are hardcoded rather than localised so two
 * machines produce byte-identical manifests.
 *
 * @param {Buffer | undefined} exif
 */
function readExif(exif) {
  if (!exif) return {};
  let tags;
  try {
    tags = exifReader(exif);
  } catch {
    return {}; // Malformed EXIF is common in exported files; never fail the run over it.
  }

  const out = {};
  const captured = tags.Photo?.DateTimeOriginal ?? tags.Image?.DateTime;
  if (captured instanceof Date && !Number.isNaN(captured.getTime())) {
    out.date = `${MONTHS[captured.getMonth()]} ${captured.getFullYear()}`;
  }

  // Makers shout in EXIF ("SONY", "NIKON CORPORATION"); models are codes and stay as-is.
  const make = String(tags.Image?.Make ?? "")
    .trim()
    .replace(/\b[A-Z]{2,}\b/g, (word) => word[0] + word.slice(1).toLowerCase());
  const model = String(tags.Image?.Model ?? "").trim();
  // Model usually already carries the make ("Canon EOS R6"); don't say it twice.
  let camera = model;
  if (make && model && !model.toLowerCase().startsWith(make.toLowerCase().split(" ")[0])) {
    camera = `${make} ${model}`;
  }

  const lens = String(tags.Photo?.LensModel ?? "").trim();
  const focal = Number(tags.Photo?.FocalLength);

  /* Phones describe their own lens in prose and repeat the body while doing it: an iPhone 11
     reports LensModel "iPhone 11 back dual wide camera 4.25mm f/1.8", which rendered the
     metadata row as "Aug 2026 · Apple iPhone 11 - iPhone 11 back dual wide camera 4.25mm
     f/1.8". Two rules clean that up without touching the real-camera path:

       1. A lens that restates the body is not a lens name — drop it.
       2. A sub-10mm focal length is a phone's true focal, not the 35mm-equivalent anyone
          means by "35mm", so printing it is worse than printing nothing.

     An interchangeable-lens body still reads as before ("Sony A7 IV - 35mm"), and a phone
     now reads as just the body ("Apple iPhone 11"), which is the whole truth available. */
  const lensRestatesBody = Boolean(
    lens && model && lens.toLowerCase().includes(model.toLowerCase()),
  );
  const optic =
    !lens || lensRestatesBody
      ? Number.isFinite(focal) && focal >= 10
        ? `${Math.round(focal)}mm`
        : ""
      : lens;

  const gear = [camera, optic].filter(Boolean).join(" - ");
  if (gear) out.gear = gear;
  return out;
}

/* --------------------------------------------------------------- files */

/** @param {string} dir */
async function listDir(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** mtime in ms, or 0 when the path doesn't exist. @param {string} p */
async function mtime(p) {
  try {
    return (await stat(p)).mtimeMs;
  } catch {
    return 0;
  }
}

/** @param {string} p */
async function size(p) {
  try {
    return (await stat(p)).size;
  } catch {
    return 0;
  }
}

/**
 * Rescue originals dropped straight into public/assets/hobbies/ — an easy mistake, since
 * that's where the finished files live. Only non-.webp images are adopted, and outputs are
 * always .webp, so this can never swallow its own product.
 */
async function adoptMisplaced() {
  const moved = [];
  for (const entry of await listDir(OUT_DIR)) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ext === ".webp" || !SOURCE_EXTS.has(ext)) continue;

    const from = join(OUT_DIR, entry.name);
    const to = join(SRC_DIR, entry.name);
    if (await mtime(to)) {
      console.warn(`  ! ${rel(from)} looks misplaced, but ${rel(to)} exists — left alone`);
      continue;
    }
    if (!DRY) await rename(from, to);
    moved.push(entry.name);
  }
  if (moved.length) {
    console.log(`Moved ${moved.length} original(s) from ${rel(OUT_DIR)} to ${rel(SRC_DIR)}:`);
    for (const name of moved) console.log(`   ${name}`);
    console.log("");
  }
}

/* --------------------------------------------------------------- encoding */

/**
 * Encode one derivative.
 *
 * .rotate() with no argument applies the EXIF orientation flag. Without it every portrait
 * phone photo lands sideways and the manifest's aspect ratio is wrong too.
 *
 * @param {string} src @param {string} dest @param {number} max @param {number} quality
 */
function encodePipeline(src, max, quality) {
  return sharp(src)
    .rotate()
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5 });
}

/** @param {string} src @param {string} dest @param {number} max @param {number} quality */
function encode(src, dest, max, quality) {
  return encodePipeline(src, max, quality).toFile(dest);
}

/**
 * Bring one original's derivatives up to date.
 *
 * @param {{ path: string, name: string, slug: string }} source
 * @returns {Promise<{ action: "new" | "update" | "skip", exif: object }>}
 */
async function encodeSource(source) {
  const tilePath = join(OUT_DIR, `${source.slug}.webp`);
  const fullPath = join(OUT_DIR, `${source.slug}-full.webp`);

  const meta = await sharp(source.path).metadata();
  // width/height are pre-rotation; the 90°/270° orientation flags (5-8) swap them.
  const swapped = (meta.orientation ?? 1) >= 5;
  const longEdge = Math.max(swapped ? meta.height : meta.width, swapped ? meta.width : meta.height);
  const wantsFull = longEdge > TILE_MAX;

  const srcTime = await mtime(source.path);
  const tileTime = await mtime(tilePath);
  const fullExists = await mtime(fullPath);
  // A photo too small to need a full-res sibling can never be stale on account of one.
  const fullTime = wantsFull ? fullExists : Infinity;
  const stale = FORCE || tileTime < srcTime || fullTime < srcTime;
  const action = !stale ? "skip" : tileTime ? "update" : "new";

  if (stale && !DRY) {
    await encode(source.path, tilePath, TILE_MAX, TILE_QUALITY);
    if (wantsFull) {
      await encode(source.path, fullPath, FULL_MAX, FULL_QUALITY);
    } else if (fullExists) {
      // The original was replaced by a smaller one; drop the now-pointless full-res sibling.
      await unlink(fullPath);
    }
  }

  return { action, exif: readExif(meta.exif) };
}

/**
 * Describe one finished tile for the manifest.
 *
 * Geometry and colour are read from the tile rather than the original: it is already
 * oriented, it is small enough that a full decode is free, and it exists even when the
 * original doesn't.
 *
 * @param {string} slug @param {object} exif @param {string[]} tags
 */
async function describeTile(slug, exif, tags) {
  const tilePath = join(OUT_DIR, `${slug}.webp`);
  const meta = await sharp(tilePath).metadata();
  const hasFull = Boolean(await mtime(join(OUT_DIR, `${slug}-full.webp`)));
  const { hobby, guessed } = guessHobby(slug, tags);

  const entry = {
    id: slug,
    src: `${URL_PREFIX}/${slug}.webp`,
    ...(hasFull ? { full: `${URL_PREFIX}/${slug}-full.webp` } : {}),
    aspect: Number((meta.width / meta.height).toFixed(4)),
    hobby,
    ...(exif.date ? { date: exif.date } : {}),
    ...(exif.gear ? { gear: exif.gear } : {}),
    accent: await accentFrom(tilePath),
  };

  const bytes =
    (await size(tilePath)) + (hasFull ? await size(join(OUT_DIR, `${slug}-full.webp`)) : 0);
  return { entry, bytes, guessed };
}

/* --------------------------------------------------------------- manifest */

/** @param {Array<Record<string, unknown>>} entries */
function renderManifest(entries) {
  const body = entries
    .map((e) => {
      const lines = Object.entries(e).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`);
      return `  {\n${lines.join("\n")}\n  },`;
    })
    .join("\n");

  return `// GENERATED by scripts/photos.mjs — do not edit.
//
// Everything here is derived from the originals in photos/hobbies/. Words (alt, caption,
// location) and any hobby correction belong in PHOTO_TEXT in ./hobbies.ts, which the
// generator never writes to. Regenerate with: bun run photos
//
// Order follows filename order, and that is the order tiles fill the belts — rename to
// reorder.

/** One photo's mechanically-derived metadata. \`hobby\` is a filename guess. */
export interface GeneratedPhoto {
  id: string;
  src: string;
  full?: string;
  aspect: number;
  hobby: string;
  date?: string;
  gear?: string;
  accent: string;
}

export const GENERATED_PHOTOS: GeneratedPhoto[] = [
${body || ""}
];
`;
}

/** Run the repo's own prettier over generated source so format:check can't fail on it. */
async function prettify(source, filepath) {
  try {
    const config = (await resolveConfig(filepath)) ?? {};
    return await format(source, { ...config, filepath });
  } catch {
    return source;
  }
}

/* --------------------------------------------------------------- assets mode */

/**
 * Turn requested CSS widths into widths worth actually writing.
 *
 * Two rules, both about not shipping a file that earns nothing: never upscale (a "2x" wider
 * than the original is just the original with a misleading name), and drop a width that
 * ends up within 1.2x of a smaller sibling, because at that point the browser is choosing
 * between two near-identical downloads.
 *
 * @param {number[]} requested @param {number} native  Widest real width available.
 * @returns {number[]} ascending
 */
function effectiveWidths(requested, native) {
  const clamped = [...new Set(requested.map((w) => Math.min(w, native)))].sort((a, b) => a - b);
  const kept = [];
  for (const w of clamped) {
    if (kept.length && w < kept[kept.length - 1] * 1.2) continue;
    kept.push(w);
  }
  return kept;
}

/**
 * Encode one site-asset derivative.
 *
 * fit:"cover" is only reached for `crop` targets, and its centre position is the same crop
 * CSS object-fit:cover + the default object-position performs — so a cropped derivative
 * renders identically to the original in its box, it just stops shipping the pixels the
 * browser was already discarding.
 *
 * @param {string} src @param {string} dest
 * @param {number} width @param {number | undefined} height @param {number} quality
 */
function encodeDerivative(src, dest, width, height, quality) {
  const pipeline = sharp(src).rotate();
  return (
    height
      ? pipeline.resize({ width, height, fit: "cover", position: "centre" })
      : pipeline.resize({ width, withoutEnlargement: true })
  )
    .webp({ quality, effort: DERIVED_EFFORT })
    .toFile(dest);
}

/**
 * Build every derivative for one entry of DERIVATIVE_TARGETS.
 *
 * @param {{ file: string, widths: number[], crop?: number, quality: number, favicon?: number }} target
 */
async function buildDerivatives(target) {
  const srcPath = join(ASSET_DIR, target.file);
  const srcBytes = await size(srcPath);
  if (!srcBytes) {
    console.error(`  ! ${target.file} is missing from ${rel(ASSET_DIR)} — skipped`);
    process.exitCode = 1;
    return null;
  }

  const id = slugify(basename(target.file, extname(target.file)));
  const meta = await sharp(srcPath).metadata();
  const swapped = (meta.orientation ?? 1) >= 5;
  const nativeW = swapped ? meta.height : meta.width;
  const nativeH = swapped ? meta.width : meta.height;
  // A cropped target can only be as wide as the crop allows before it starts upscaling.
  const native = target.crop ? Math.min(nativeW, Math.floor(nativeH * target.crop)) : nativeW;

  const srcTime = await mtime(srcPath);
  const sources = [];
  let written = 0;
  let bytes = 0;

  for (const width of effectiveWidths(target.widths, native)) {
    const height = target.crop ? Math.round(width / target.crop) : undefined;
    const name = `${id}-${width}w.webp`;
    const dest = join(DERIVED_DIR, name);
    const stale = FORCE || (await mtime(dest)) < srcTime;

    if (stale && !DRY) {
      await ensureParentDir(dest);
      await encodeDerivative(srcPath, dest, width, height, target.quality);
      written++;
    }

    // Read the geometry back rather than computing it, so rounding can never disagree with
    // what the file actually is. A dry run on a not-yet-built file falls back to the maths.
    const out = (await mtime(dest))
      ? await sharp(dest).metadata()
      : { width, height: height ?? Math.round((width * nativeH) / nativeW) };
    const outBytes = await size(dest);
    bytes += outBytes;
    sources.push({ src: `${DERIVED_PREFIX}/${name}`, width: out.width, height: out.height });
    console.log(
      `  ${stale ? "+" : "="} ${name}  ${out.width}x${out.height}  ${kb(outBytes)}`.trimEnd(),
    );
  }

  if (target.favicon) {
    const name = `favicon-${target.favicon}.png`;
    const dest = join(DERIVED_DIR, name);
    const stale = FORCE || (await mtime(dest)) < srcTime;
    if (stale && !DRY) {
      // palette:true quantises to an indexed PNG. A logo is a handful of flat colours, so
      // the loss is invisible at 32px and the file lands an order of magnitude smaller.
      await sharp(srcPath)
        .rotate()
        .resize({ width: target.favicon, height: target.favicon, fit: "cover", position: "centre" })
        .png({ compressionLevel: 9, palette: true })
        .toFile(dest);
      written++;
    }
    const outBytes = await size(dest);
    bytes += outBytes;
    console.log(
      `  ${stale ? "+" : "="} ${name}  ${target.favicon}x${target.favicon}  ${kb(outBytes)}`,
    );
  }

  if (!sources.length) return null;
  const largest = sources[sources.length - 1];
  return {
    entry: {
      id,
      original: `assets/${target.file}`,
      cropped: Boolean(target.crop),
      aspect: Number((largest.width / largest.height).toFixed(4)),
      sources,
    },
    srcBytes,
    bytes,
    written,
    favicon: target.favicon
      ? {
          src: `${DERIVED_PREFIX}/favicon-${target.favicon}.png`,
          width: target.favicon,
          height: target.favicon,
        }
      : null,
  };
}

/**
 * Re-encode the OVERSIZED_FULL photos at their reduced quality.
 *
 * Always from the original, never from the shipped .webp — a second lossy pass over an
 * already-lossy file is how a photo quietly turns to mush. No original, no re-encode.
 *
 * Idempotence is by content, not by mtime: we encode to a buffer and only write when it
 * differs from what is on disk. That costs one encode per run and buys two things mtime
 * can't — the repair survives a `bun run photos --force` putting the q82 file back, and it
 * never rewrites a file that is already exactly what this function would produce.
 */
async function squeezeOversizedFull() {
  const originals = new Map();
  for (const entry of await listDir(SRC_DIR)) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (SOURCE_EXTS.has(ext)) originals.set(slugify(basename(entry.name, ext)), entry.name);
  }

  let saved = 0;
  for (const { name, quality } of OVERSIZED_FULL) {
    const dest = join(OUT_DIR, name);
    const before = await size(dest);
    if (!before) {
      console.log(`  ? ${name} not in ${rel(OUT_DIR)} — nothing to re-encode`);
      continue;
    }

    const slug = basename(name, ".webp").replace(/-full$/, "");
    const original = originals.get(slug);
    if (!original) {
      console.log(`  ? ${name} is ${kb(before)} but ${slug}'s original isn't in ${rel(SRC_DIR)}`);
      console.log("    Restore it and re-run — re-encoding the .webp itself would compound loss.");
      continue;
    }

    const wanted = await encodePipeline(join(SRC_DIR, original), FULL_MAX, quality).toBuffer();
    const current = await readFile(dest);
    if (!FORCE && current.equals(wanted)) {
      console.log(`  = ${name}  ${kb(before)}, already at q${quality}`);
      continue;
    }
    if (DRY) {
      console.log(
        `  + ${name}  would re-encode at q${quality}: ${kb(before)} → ${kb(wanted.length)}`,
      );
      continue;
    }

    await writeFile(dest, wanted);
    saved += before - wanted.length;
    console.log(`  + ${name}  ${kb(before)} → ${kb(wanted.length)} at q${quality}`);
  }
  return saved;
}

/** @param {Array<Record<string, unknown>>} entries @param {object | null} favicon */
function renderImageManifest(entries, favicon) {
  const ids = entries.map((e) => JSON.stringify(e.id)).join(" | ");
  const body = entries
    .map((e) => {
      const sources = e.sources
        .map(
          (s) => `      { src: ${JSON.stringify(s.src)}, width: ${s.width}, height: ${s.height} },`,
        )
        .join("\n");
      return [
        `  ${JSON.stringify(e.id)}: {`,
        `    id: ${JSON.stringify(e.id)},`,
        `    original: ${JSON.stringify(e.original)},`,
        `    cropped: ${e.cropped},`,
        `    aspect: ${e.aspect},`,
        `    sources: [`,
        sources,
        `    ],`,
        `  },`,
      ].join("\n");
    })
    .join("\n");

  const faviconBlock = favicon
    ? `
/** 32x32 PNG cut from the logo. PNG because \`<link rel="icon">\` still wants one. */
export const FAVICON: GeneratedImageSource = {
  src: ${JSON.stringify(favicon.src)},
  width: ${favicon.width},
  height: ${favicon.height},
};
`
    : "";

  return `// GENERATED by scripts/photos.mjs assets — do not edit.
//
// Responsive derivatives of the committed originals in public/assets/. Regenerate with:
// bun run assets
//
// \`src\` values are bare and document-relative, like the hobbies manifest — run them
// through assetUrl() from ~/lib/assets before they reach the DOM, or they will 404 under
// the GitHub Pages base path. Build a srcSet the same way:
//
//   const srcSet = img.sources.map((s) => \`\${assetUrl(s.src)} \${s.width}w\`).join(", ");
//
// The originals themselves are untouched and still the right file for anything that needs
// full resolution or a non-cropped frame (og:image, for instance).

/** One encoded size. \`width\`/\`height\` are the file's real pixel dimensions. */
export interface GeneratedImageSource {
  src: string;
  width: number;
  height: number;
}

export interface GeneratedImage {
  id: string;
  /** The committed original these were derived from, as a bare asset path. */
  original: string;
  /** True when the derivative is a centre-crop, not a plain downscale of the original. */
  cropped: boolean;
  /** Aspect ratio (width / height) of the derivatives, which may differ from the original. */
  aspect: number;
  /** Ascending by width; the last entry is the largest available. Never empty. */
  sources: GeneratedImageSource[];
}

export type GeneratedImageId = ${ids};

export const GENERATED_IMAGES: Record<GeneratedImageId, GeneratedImage> = {
${body}
};
${faviconBlock}`;
}

/* --------------------------------------------------------------- main: hobbies */

async function runHobbies() {
  const { tags, described, tagged } = await readHobbiesSource();
  const carried = await readPreviousManifest();

  await mkdir(SRC_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });
  await adoptMisplaced();

  const sources = [];
  const ignored = [];
  for (const entry of await listDir(SRC_DIR)) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) {
      ignored.push(entry.name);
      continue;
    }
    sources.push({
      path: join(SRC_DIR, entry.name),
      name: entry.name,
      slug: slugify(basename(entry.name, ext)),
    });
  }
  sources.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  // Two originals that slugify the same would silently overwrite each other's output.
  const bySlug = new Map();
  for (const s of sources) {
    const clash = bySlug.get(s.slug);
    if (clash) {
      console.error(`Name collision: "${s.name}" and "${clash}" both become "${s.slug}" and would`);
      console.error("overwrite each other. Rename one and re-run.");
      process.exit(1);
    }
    bySlug.set(s.slug, s.name);
  }

  console.log(`${sources.length} original(s) in ${rel(SRC_DIR)}/${DRY ? "   (dry run)" : ""}`);

  const exifBySlug = new Map();
  let encoded = 0;
  for (const source of sources) {
    try {
      const { action, exif } = await encodeSource(source);
      exifBySlug.set(source.slug, exif);
      if (action !== "skip") encoded++;
      console.log(`  ${action === "skip" ? "=" : "+"} ${source.name} → ${source.slug}.webp`);
    } catch (err) {
      console.error(`  ! ${source.name}: ${err instanceof Error ? err.message : err}`);
      if (/^\.hei[cf]$/i.test(extname(source.name))) {
        console.error("    HEIC decode failed — export as JPEG from Photos and re-drop it.");
      }
      process.exitCode = 1;
    }
  }

  // The manifest is rebuilt from the tiles, not the originals, so a photo whose original
  // isn't on this machine keeps working instead of disappearing from the site.
  const tileNames = (await listDir(OUT_DIR))
    .filter((e) => e.isFile() && e.name.endsWith(".webp"))
    .map((e) => e.name);
  const tileSet = new Set(tileNames);
  const slugs = tileNames
    // Skip full-res siblings, but only when the tile they belong to actually exists — a photo
    // genuinely named "sunset-full.jpg" is still a tile in its own right.
    .filter((n) => !(n.endsWith("-full.webp") && tileSet.has(n.replace(/-full\.webp$/, ".webp"))))
    .map((n) => basename(n, ".webp"))
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  const unknownTag = [];
  const noOriginal = [];
  let totalBytes = 0;

  for (const slug of slugs) {
    if (!bySlug.has(slug)) noOriginal.push(slug);
    const exif = exifBySlug.get(slug) ?? carried.get(slug) ?? {};
    try {
      const { entry, bytes, guessed } = await describeTile(slug, exif, tags);
      entries.push(entry);
      totalBytes += bytes;
      if (!guessed && !tagged.has(slug)) unknownTag.push(slug);
    } catch (err) {
      console.error(`  ! ${slug}.webp: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }

  if (noOriginal.length) {
    console.log("");
    const prunable = PRUNE && sources.length > 0;
    if (PRUNE && !prunable) {
      console.log("--prune ignored: photos/hobbies/ is empty, so every tile would look orphaned.");
      console.log(
        "Restore your originals first, or delete the files by hand if that's the intent.",
      );
    }
    for (const slug of noOriginal) {
      if (prunable && !DRY) {
        // A locked file (OneDrive sync, an open preview, a dev server) must not abort the run
        // and cost us the manifest write — report it and keep the entry so the site still works.
        let failed = null;
        for (const name of [`${slug}.webp`, `${slug}-full.webp`]) {
          if (!tileSet.has(name)) continue;
          try {
            await unlink(join(OUT_DIR, name));
          } catch (err) {
            failed = err instanceof Error ? err.message : String(err);
          }
        }
        if (failed) {
          console.error(`  ! could not remove ${slug}: ${failed}`);
          process.exitCode = 1;
        } else {
          const at = entries.findIndex((e) => e.id === slug);
          if (at >= 0) entries.splice(at, 1);
          console.log(`  - removed ${slug} (no original)`);
        }
      } else if (prunable) {
        console.log(`  - would remove ${slug} (no original)`);
      } else {
        console.log(`  ? ${slug}.webp has no original in photos/hobbies/ — kept`);
      }
    }
    if (!PRUNE) console.log("    Re-run with --prune to delete them.");
  }

  if (!DRY) {
    await writeFile(MANIFEST_PATH, await prettify(renderManifest(entries), MANIFEST_PATH), "utf8");
  }

  console.log("");
  console.log(
    `${encoded} encoded, ${sources.length - encoded} already current — ` +
      `${entries.length} photo(s), ${kb(totalBytes)} total`,
  );
  console.log(`${DRY ? "Would write" : "Wrote"} ${rel(MANIFEST_PATH)}`);
  if (ignored.length)
    console.log(`Ignored ${ignored.length} non-image file(s): ${ignored.join(", ")}`);

  const needText = entries.map((e) => e.id).filter((id) => !described.has(id));
  if (needText.length) {
    console.log("");
    console.log(
      `${needText.length} photo(s) need alt text — add to PHOTO_TEXT in src/data/hobbies.ts:`,
    );
    for (const id of needText) console.log(`   "${id}": { alt: "..." },`);
  }
  if (unknownTag.length) {
    console.log("");
    console.log(`No hobby in the filename for: ${unknownTag.join(", ")}`);
    console.log(`   Rename with a known prefix (${tags.join(", ")}) or set hobby in PHOTO_TEXT.`);
  }
}

/* --------------------------------------------------------------- main: assets */

async function runAssets() {
  await mkdir(DERIVED_DIR, { recursive: true });

  // The derivative id is the slugified BASENAME, so the folder is not part of it:
  // spark/stats.png and verbalyst/stats.png would both be "stats". Nothing downstream
  // would complain — they would overwrite each other's .webp files, and the later entry
  // would win the manifest key while the earlier one silently vanished from the site.
  // Hobbies mode has always checked for this; assets mode did not, and it only stayed
  // safe while every original sat in one flat folder. Now that projects have their own
  // directories, two of them naming a screenshot the same obvious thing is a matter of
  // time, so fail loudly here instead.
  const byId = new Map();
  for (const target of DERIVATIVE_TARGETS) {
    const id = slugify(basename(target.file, extname(target.file)));
    const clash = byId.get(id);
    if (clash) {
      console.error(`Name collision: "${target.file}" and "${clash}" both become "${id}" and`);
      console.error("would overwrite each other's derivatives. Rename one and re-run.");
      process.exit(1);
    }
    byId.set(id, target.file);
  }

  console.log(
    `${DERIVATIVE_TARGETS.length} original(s) in ${rel(ASSET_DIR)}/${DRY ? "   (dry run)" : ""}`,
  );

  const entries = [];
  const expected = new Set();
  let favicon = null;
  let originalBytes = 0;
  let derivedBytes = 0;
  let written = 0;

  for (const target of DERIVATIVE_TARGETS) {
    try {
      const built = await buildDerivatives(target);
      if (!built) continue;
      entries.push(built.entry);
      originalBytes += built.srcBytes;
      derivedBytes += built.bytes;
      written += built.written;
      for (const s of built.entry.sources) expected.add(basename(s.src));
      if (built.favicon) {
        favicon = built.favicon;
        expected.add(basename(built.favicon.src));
      }
    } catch (err) {
      console.error(`  ! ${target.file}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }

  // Same posture as hobbies mode: an unrecognised file is reported, never quietly deleted.
  const strays = (await listDir(DERIVED_DIR))
    .filter((e) => e.isFile() && !expected.has(e.name))
    .map((e) => e.name)
    .sort();
  if (strays.length) {
    console.log("");
    for (const name of strays) {
      if (PRUNE && !DRY) {
        try {
          await unlink(join(DERIVED_DIR, name));
          console.log(`  - removed ${name} (no longer generated)`);
        } catch (err) {
          console.error(
            `  ! could not remove ${name}: ${err instanceof Error ? err.message : err}`,
          );
          process.exitCode = 1;
        }
      } else if (PRUNE) {
        console.log(`  - would remove ${name} (no longer generated)`);
      } else {
        console.log(`  ? ${name} is in ${rel(DERIVED_DIR)} but no longer generated — kept`);
      }
    }
    if (!PRUNE) console.log("    Re-run with --prune to delete them.");
  }

  console.log("");
  console.log(`Re-encoding oversized full-res hobby photos:`);
  const squeezed = await squeezeOversizedFull();

  if (!DRY && entries.length) {
    const source = renderImageManifest(entries, favicon);
    await writeFile(IMAGES_MANIFEST_PATH, await prettify(source, IMAGES_MANIFEST_PATH), "utf8");
  }

  console.log("");
  console.log(
    `${written} encoded — ${entries.length} image(s), ` +
      `${kb(originalBytes)} of originals → ${kb(derivedBytes)} of derivatives`,
  );
  if (squeezed > 0) console.log(`Reclaimed a further ${kb(squeezed)} from ${rel(OUT_DIR)}/`);
  console.log(`${DRY ? "Would write" : "Wrote"} ${rel(IMAGES_MANIFEST_PATH)}`);
  console.log("");
  console.log("Originals in public/assets/ are untouched — they remain the full-resolution");
  console.log("source and the right file for og:image and anything print-bound.");
}

/* --------------------------------------------------------------- dispatch */

if (!MODES.has(MODE)) {
  console.error(`Unknown mode "${MODE}". Expected one of: ${[...MODES].join(", ")}`);
  console.error("  bun run photos    the /hobbies gallery");
  console.error("  bun run assets    the site's own logo, portrait and project shots");
  process.exit(1);
}

if (MODE === "assets") {
  await runAssets();
} else {
  await runHobbies();
}
