# Image pipeline

One script, `scripts/photos.mjs`, in two modes. Both turn originals into WebP and write a
generated TypeScript manifest so call sites import paths and sizes instead of hardcoding them.

```
bun run photos     hobbies mode (default)  — the /hobbies photo wall
bun run assets     assets mode             — the site's own logo, portrait and project shots
```

The script's own header comment is the reference for flags and naming rules; this document
covers what the two modes are for and why they behave the way they do.

## Hobbies mode — `bun run photos`

```
photos/hobbies/          you drop originals here          (gitignored, any size/format)
        │
        │  bun run photos
        ▼
public/assets/hobbies/   tiles + full-res siblings
src/data/hobbies.generated.ts   derived metadata          (never hand-edited)
```

```bash
bun run photos              # encode what's new or changed, rewrite the manifest
bun run photos --dry        # say what would happen, touch nothing
bun run photos --force      # re-encode everything (after changing quality settings)
bun run photos --prune      # also delete tiles whose original is gone
```

Then write alt text. The run ends with a paste-ready list of every photo still missing one:

```
2 photo(s) need alt text — add to PHOTO_TEXT in src/data/hobbies.ts:
   "img-0021": { alt: "..." },
   "img-0034": { alt: "..." },
```

### What it derives per photo

| Output             | Detail                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `<slug>.webp`      | Tile — long edge 640px. What the belts render.                                                                    |
| `<slug>-full.webp` | Full — long edge 1600px. Fetched only when the lightbox opens; skipped when the original is already tile-sized.   |
| `aspect`           | Measured **after** EXIF rotation, so portrait photos size the lightbox correctly.                                 |
| `date`, `gear`     | From EXIF, when the file carries any — `"Jul 2025"`, `"Sony ILCE-7M4 - FE 35mm F1.8"`. Emitted only when present. |
| `accent`           | Dominant colour, clamped to stay legible against the page background. Tints the tile border and glow.             |
| `hobby`            | Subject tag, guessed from the filename prefix (`water-01.jpg` → `water`).                                         |

Quality constants live at the top of the script (`TILE_MAX` / `FULL_MAX`,
`TILE_QUALITY` / `FULL_QUALITY`); change them and re-run with `--force`.

`slug` is the filename through the repo's existing `slugify()` (`scripts/routes.mjs`), the same
rule that generates project URLs. `IMG_4821.PNG` → `img-4821`.

The tag vocabulary is `HOBBY_TAGS` in `src/data/hobbies.ts` — subjects, not pastimes, so it
describes what is _in_ the frame and stays accurate as the collection grows. A photo whose
filename says nothing about its subject (`IMG_0021.jpg`) is flagged once at the end of the run;
set `hobby` in `PHOTO_TEXT` and the nag stops. That is the common case here — the current
originals are all camera-roll filenames, so every one of them is tagged by hand.

Filenames also set **belt order** — the manifest is sorted by slug, and tiles fill the rows in
manifest order. Rename to reorder.

### The two halves

`src/data/hobbies.ts` merges a generated half with a hand-written one:

- **`hobbies.generated.ts`** — sizes, aspect, EXIF, accent. Rewritten on every run.
- **`PHOTO_TEXT`** in `hobbies.ts` — `alt`, `caption`, `location`, plus overrides for `hobby`,
  `gear` and `date`. **The generator only ever reads this file.** Re-running can't clobber a
  caption you wrote.

A photo with no `PHOTO_TEXT` entry still renders, with weak alt text and a guessed hobby — a
missing caption must never be able to break the wall. But `alt` is what keeps the Lighthouse
a11y score up, so the checklist at the end of each run is worth clearing.

The `gear` override exists because EXIF reports model codes, not names: `ILCE-7M4` is how Sony
writes "A7 IV". `location` is a `PHOTO_TEXT` field and nothing else — no GPS is read, and the
current photos carry none, so leaving it blank is the honest default rather than an omission.

The wall tops itself up with generated SVG placeholder tiles when there are fewer real photos
than `MIN_TILES` in `hobbies.ts` — the belts need enough tiles to fill a wide viewport twice
over or the wrap seam becomes visible. Placeholders deliberately carry no `location`, `date` or
`gear`: the lightbox prints those verbatim as capture data, and the only photos on the wall
claiming a camera and a place should not be the ones that never existed.

### Design notes

**Originals are gitignored.** `/photos` is a local staging area — a few dozen phone photos are
tens of megabytes and would live in git history forever. The derived WebP files are what belongs
in the repo. Keep your own backup of the originals; this repo is not it.

**The manifest is rebuilt from `public/assets/hobbies/`, not from the originals.** That's the
consequence of the line above: on a fresh clone `photos/` is empty but the tiles are present,
and rebuilding from the originals would empty the manifest and orphan every derived file.
Building from the tiles means a missing original is reported, never acted on. EXIF strings are
carried forward from the previous manifest for the same reason, so dates and cameras survive a
regeneration on a machine that has no originals.

**Nothing is deleted without `--prune`** — and `--prune` declines to prune when
`photos/hobbies/` is empty, because every tile would look orphaned. It says so and carries on
with the rest of the run rather than aborting.

**Encoding is incremental** — mtime against the source, so a re-run after adding one photo
re-encodes one photo. `--force` when you change the quality constants.

**EXIF rotation is applied, not stripped.** `sharp().rotate()` with no argument bakes in the
orientation flag; without it every portrait phone photo lands sideways _and_ the recorded
aspect ratio is wrong, which would break the lightbox sizing.

**Generated TypeScript is run through the repo's own prettier** before being written, so
`format:check` can never fail on a file you didn't write.

## Assets mode — `bun run assets`

The site's own imagery — the nav logo, the hero portrait, the project thumbnails — is not
staged in `photos/`. Those originals live in `public/assets/` and are the source of truth; this
mode never moves, rewrites or deletes them. It only ever adds files, and only under
`public/assets/derived/`.

```
public/assets/derived/<slug>-<width>w.webp    e.g. derived/verbalyst-800w.webp
public/assets/derived/favicon-32.png          the one PNG — browsers still want it
```

`<slug>` is `slugify(basename)`, so `patronPal.png` → `patronpal`. `<width>` is always the
derivative's **real** pixel width: a requested width larger than the original is clamped rather
than upscaled, and a clamped width landing within 1.2× of a smaller sibling is dropped as not
worth a second file.

What gets built is the `DERIVATIVE_TARGETS` table at the top of the script — one row per
original, listing the CSS widths it needs to serve at 1× and 2×, a quality, and optionally a
`crop` aspect ratio or a `favicon` size. The portrait is the one crop: it is displayed in a 4/5
box under `object-cover`, so the derivative is centre-cropped to 4/5 and renders pixel-identical
to the original, minus the bytes the browser was throwing away. Everything else is a plain
downscale. `cropped` in the manifest records which.

The output manifest is `src/data/images.generated.ts` — `GENERATED_IMAGES` keyed by id, plus
`FAVICON`. Call sites import widths and paths from there (`GENERATED_IMAGES.portrait.sources`
in the hero, `GENERATED_IMAGES.logo.sources[0]` in the nav) and build a `srcSet` from them.
`Project.imageId` in `src/data/portfolio.ts` is the key linking a project to its derivatives; it
is set explicitly rather than derived from the image filename, because the ids are lowercase and
the originals are not.

Assets mode also re-encodes the hobby full-res files listed in `OVERSIZED_FULL` at a lower
quality than the gallery default. That is a repair for known outliers, not a policy: it needs
the original in `photos/hobbies/` and reports instead of guessing when one is absent, it always
re-encodes from the original rather than from the shipped `.webp` (a second lossy pass over an
already-lossy file is how a photo quietly turns to mush), and it is idempotent by content rather
than by mtime, so the repair survives a `bun run photos --force` putting the high-quality file
back.

`--force`, `--prune` and `--dry` work here too. `--prune` removes files in
`public/assets/derived/` that are no longer generated; without it they are reported and kept.

## Paths are base-less

Both manifests store **bare, document-relative** paths (`assets/hobbies/img-0021.webp`). They
must go through `assetUrl()` from `src/lib/assets.ts` before they reach the DOM, or they 404
under the GitHub Pages base path. Build a `srcSet` the same way:

```ts
const srcSet = img.sources.map((s) => `${assetUrl(s.src)} ${s.width}w`).join(", ");
```

## Gotchas

- **HEIC works.** sharp's prebuilt binary carries HEIF decode, so iPhone originals can be
  dropped in as-is. If a decode ever fails, the error says to export as JPEG.
- **Dropped a photo in `public/assets/hobbies/` by mistake?** Hobbies mode moves it to
  `photos/hobbies/` and processes it. Only non-`.webp` files are adopted, and outputs are
  always `.webp`, so it can't swallow its own product. Assets mode has no such rescue — its
  originals are meant to live in `public/assets/`.
- **Two originals that slugify the same** (`sunset-01.jpg` and `Sunset 01.jpeg`) abort the run
  rather than silently overwriting each other.
- **Non-image files** in the drop folder are listed and ignored, not treated as errors.
- **A locked file** (OneDrive sync, an open preview) during `--prune` is reported and skipped;
  the run still writes the manifest rather than losing the whole pass to one `EBUSY`.

## Related

`sharp` is a devDependency, shared with `scripts/seo.mjs`, which uses it to rasterize the
per-route Open Graph cards to PNG — the major social scrapers reject an SVG `og:image`.
</content>
