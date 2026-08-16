# Codebase Overview

A prerendered, statically-hosted portfolio site. This document is a map: it explains how the
pieces fit together and where each kind of decision lives. It deliberately does **not** restate
values that live in code — versions, tuning constants, interface fields, the achievement list.
Those change; the pointers don't.

## Tech stack

Read `package.json` for exact versions. In shape:

- **Vite** + **TanStack Start** (React meta-framework, SSR, file-based routing) on **React 19**
  and **TypeScript**, built with **Nitro** (`node-server` preset).
- **Tailwind CSS v4** with custom design tokens, **framer-motion** for every animation and drag
  interaction, **shadcn/ui** (Radix primitives) for form and dialog chrome.
- **TanStack Router** for routing, **TanStack Query** for the one optional network read,
  **react-hook-form** + **zod** for the contact form, **cmdk** for the command palette,
  **sonner** for toasts, **lucide-react** for icons.
- **Bun** as package manager (`bun.lock`, `bunfig.toml` with a 24h supply-chain guard).
  `sharp` and `exif-reader` are devDependencies used only by the build scripts.
- **Deployment:** GitHub Pages, via static prerendering. See [ci-cd.md](./ci-cd.md).

## Routes

This is a **multi-route site**, not a single-page scroller. Nine routes are prerendered to
static HTML at build time:

| Route              | File                        | What it is                                                                                                       |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                | `routes/index.tsx`          | Landing page: hero + the four anchor sections below.                                                             |
| `/hobbies`         | `routes/hobbies.tsx`        | The photo wall. **Branded "Photography"** — see the note below.                                                  |
| `/achievements`    | `routes/achievements.tsx`   | The trophy case.                                                                                                 |
| `/acheivements`    | `routes/acheivements.tsx`   | Deliberate misspelling alias. Forwards, `noindex`, out of the sitemap, and unlocking a secret badge is the joke. |
| `/projects/<slug>` | `routes/projects.$slug.tsx` | One case-study page per entry in `PROJECTS` (five today).                                                        |

`scripts/routes.mjs` is the single source of truth for that list. It derives the
`/projects/<slug>` routes from `src/data/portfolio.ts` and is imported by both
`vite.config.ts` (`nitro.prerender.routes`) and `scripts/prerender.mjs`, so the two can never
drift. Adding a project adds a route, a sitemap entry and an OG card with no other edits.

**The `/hobbies` naming split is deliberate.** The page, the nav link, the footer link and the
command palette all say "Photography"; the route, the file, the data module and every
identifier stay `hobbies`. Renaming the route would break the URL, the sitemap entry, the
prerendered path and an achievement key for a cosmetic change. The rationale is recorded at
the top of `src/routes/hobbies.tsx`.

The landing page's four content sections (`about`, `experience`, `projects`, `contact`) are
in-page anchors, scroll-spied by `useScrollSpy` and smooth-scrolled by the nav.

## Project structure

```
src/
├── routes/          One file per route (see the table above) + __root.tsx, the app shell
├── components/
│   ├── portfolio/   Every bespoke component for this site
│   └── ui/          shadcn/ui primitives, largely untouched
├── data/            Content and registries — the source of truth for what the site says
├── lib/             Framework-free logic: theme, achievements, contact, SEO urls, assets
├── hooks/           Reusable React hooks
├── styles.css       Design tokens (both themes), font classes, keyframe animations
├── router.tsx       Router configuration
├── start.ts         TanStack Start middleware, error capture
└── server.ts        SSR error wrapper

scripts/             Build-time Node scripts (routes, prerender, seo, photos, github-stats)
public/assets/       Committed originals: portrait, logo, résumé, project shots, world.svg
public/assets/derived/   Generated responsive derivatives (see photo-pipeline.md)
public/assets/hobbies/   Generated photo tiles (see photo-pipeline.md)
photos/              Local staging area for photo originals — gitignored
workers/             Optional Cloudflare Worker for achievement rarity stats
docs/                This directory
```

Note the `assets/` level: everything under `public/assets/`, not `public/` directly. Asset
paths are stored **bare and document-relative** (`assets/logo.png`) and must be passed through
`assetUrl()` from `src/lib/assets.ts` before they reach the DOM — the site is served from
`/portfolio-site/`, so a bare path 404s from any sub-route.

**Config at root:** `vite.config.ts` (base path + prerender), `tsconfig.json` (ES2022, strict,
`@/*` → `./src/*`), `components.json` (shadcn), `eslint.config.js` / `.prettierrc` (100 char,
double quotes), `.gitattributes` (LF everywhere — see [ci-cd.md](./ci-cd.md)), `bunfig.toml`,
`lighthouserc.json`.

## Data

`src/data/` is where content lives. **Read the file for the current shape of any interface** —
they are documented inline and change as features land.

| File                   | Contents                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `portfolio.ts`         | `PROFILE`, `ROLES`, `EXPERIENCES`, `PROJECTS`, `SOCIALS`, `NAV_LINKS` and their interfaces. |
| `achievements.ts`      | The achievement registry — pure data, one object per badge, plus tier/category metadata.    |
| `hobbies.ts`           | `HOBBY_TAGS`, the `HobbyPhoto` shape, hand-written `PHOTO_TEXT`, and the merge with…        |
| `hobbies.generated.ts` | …the machine-derived photo metadata. Generated; never hand-edit.                            |
| `images.generated.ts`  | Responsive derivatives of the site's own imagery. Generated; never hand-edit.               |
| `github-stats.json`    | Repo stars/forks/last-commit, baked in by `scripts/fetch-github-stats.mjs`.                 |

Two conventions worth knowing:

- **Generated files are regenerated, not edited.** Both `*.generated.ts` files come from
  `scripts/photos.mjs`. See [photo-pipeline.md](./photo-pipeline.md).
- **`scripts/*.mjs` read `portfolio.ts` as text**, with tolerant regexes, rather than importing
  it — plain `.mjs` cannot import TypeScript without a build step, and these scripts run
  identically on Windows and Linux. Keep `PROJECTS` entries in the ordinary
  `title: "…"` object shape and it keeps working.

## Sections and features

| Feature          | Lives in                                                                          | Notes                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Nav              | `portfolio/nav.tsx`                                                               | Fixed bar; section links, résumé, palette pill, achievements button, theme toggle, and a real hamburger menu on mobile.                   |
| Hero             | `routes/index.tsx`                                                                | Portrait, typewriter roles, sports-ball tittle, CTAs, socials.                                                                            |
| Starfield        | `portfolio/starfield.tsx` + `hooks/use-starfield.ts`                              | Perspective canvas field, one RAF loop, theme-aware palette, suspends offscreen.                                                          |
| About            | `portfolio/about.tsx`                                                             |                                                                                                                                           |
| Experience       | `portfolio/experience.tsx`                                                        | Scroll-tracked timeline + SVG globe that rotates to each role's coordinates; a "Learn more" modal per role.                               |
| Projects         | `portfolio/projects.tsx` → `portfolio/constellation.tsx`                          | Drag-physics constellation above a width threshold, static card grid below. See [projects-constellation.md](./projects-constellation.md). |
| Photo gallery    | `portfolio/photo-gallery.tsx`, `hobby-lightbox.tsx`                               | Justified flexbox grid (no JS packing) + one-shot spiral intro. See [photo-gallery.md](./photo-gallery.md).                               |
| Contact + Footer | `portfolio/contact.tsx`                                                           | `Contact` and `Footer` are both exported from this file — there is no `footer.tsx`.                                                       |
| Command palette  | `portfolio/command-palette.tsx`                                                   | ⌘K / Ctrl+K.                                                                                                                              |
| Theme toggle     | `portfolio/theme-toggle.tsx` + `lib/theme.ts`                                     |                                                                                                                                           |
| Achievements     | `portfolio/achievement-*.tsx`, `lib/achievements.ts`, `hooks/use-achievements.ts` |                                                                                                                                           |

### Contact form

`src/lib/contact.ts` owns the logic, kept out of the view so it is testable. Behaviour:

- Validation with a zod schema, wired through `react-hook-form`.
- If `VITE_CONTACT_ENDPOINT` is set, it **POSTs JSON** to that endpoint (a generic payload that
  works with Formspree-style backends) and distinguishes network failure from a non-2xx
  response.
- If it is unset, it falls back to composing a prefilled `mailto:` URL. A failed POST also
  offers the mailto as an escape hatch.
- Spam defences are a honeypot field and a minimum time-to-submit.

Nothing here hardcodes a third-party service, and `VITE_*` vars are public by design — never
put a secret in one.

### Command palette

⌘K / Ctrl+K opens a `cmdk` dialog built from the same data as everything else: `NAV_LINKS`,
`PROJECTS`, `SOCIALS`, `PROFILE`. Other components open it by dispatching a
`portfolio:open-palette` window event (`openCommandPalette()`), so no provider or shared state
is needed.

### Theme

Binary light/dark, no "system" mode, so the control is one unambiguous toggle. Dark is the
site's identity and therefore the default.

`src/lib/theme.ts` is the whole story: a `light`/`dark` class on `<html>`, a `localStorage`
preference, `useTheme()` built on `useSyncExternalStore`, a `portfolio:theme-changed` event for
non-React consumers (the starfield listens to it), and `THEME_INIT_SCRIPT` — a synchronous IIFE
injected into `<head>` by `__root.tsx` that sets the class before first paint so there is no
flash of the wrong theme.

Both palettes are defined as `--portfolio-*` tokens in `src/styles.css`, with contrast ratios
noted inline. Components read the tokens, so a component almost never needs to know which
theme is active.

### Achievements

36 badges, at `/achievements`. The design is deliberately one-directional:

- `src/data/achievements.ts` is **pure data**. One object per badge: id, tier, category,
  icon, copy, and a declarative `rule`. Rules are `event` (unlocked imperatively), `burst`
  (N hits in a rolling window), `set` (distinct members, optionally a specific list), `days`,
  `span`, or `meta` (everything else unlocked).
- `src/lib/achievements.ts` is the engine: `localStorage` persistence with a schema-version
  ladder, pure rule evaluation, and a two-function public API — `unlock(id)` and
  `trackMember(key, member)`. Both are plain module functions, callable from a `lib` helper or
  from deep inside a component, so adding a trigger is a one-line change at an existing call
  site. Cross-component notification rides a `CustomEvent`, not React context.
- The UI (`achievement-grid.tsx`, `-badge.tsx`, `-toast.tsx`, `-nav-button.tsx`,
  `-tracker.tsx`) is driven entirely off the registry.

Adding badge #37 is one object in the registry plus, if it needs a bespoke trigger, one call.

Rarity percentages ("4.2% of visitors found this") come from an optional Cloudflare Worker in
`workers/achievement-stats/` — see its README. With `VITE_ACHIEVEMENTS_ENDPOINT` unset, the
client makes **zero** requests and the page falls back to each badge's authored estimate.

## Styling

`src/styles.css` holds:

- `--portfolio-*` design tokens, defined twice: the dark defaults on `:root`, and a light
  palette under `html.light`. The shadcn token set keys off the `.dark` class, so exactly one
  of `light` / `dark` is always on `<html>`.
- `.theme-switching`, a transient class applied during a toggle so the swap cross-fades
  instead of snapping (duration mirrored by `THEME_TRANSITION_MS` in `lib/theme.ts`).
- `.on-dark`, an opt-out for elements whose own background stays dark in light mode.
- Type classes `.font-display` (Sora) and `.font-body` (Space Grotesk); utility classes
  `.bg-space`, `.text-ink`, `.text-muted-portfolio`, `.text-accent-bright`, `.role-gradient`,
  `.nebula`.
- Animations: `.type-caret` (hero typewriter caret), `.globe-shade` / `.globe-pin` (experience
  globe), and a custom scrollbar.

## Runtime architecture

- **No global state library and no context providers for site state.** The three pieces of
  cross-cutting state — theme, achievements, palette-open — are each a module with a
  `localStorage` key (where persistence is wanted) and a `CustomEvent` for notification. The
  only provider in the tree is TanStack Query's, mounted in `__root.tsx` for the optional
  rarity fetch.
- **Animation loops never touch React state.** The constellation, the photo wall and the
  starfield each run a single `requestAnimationFrame` loop writing to framer `motionValue`s
  read via `style={{ x, y }}`. React does not re-render at 60fps anywhere.
- **Hydration safety is a recurring constraint.** Anything that depends on viewport width,
  `prefers-reduced-motion`, or `localStorage` renders its _fallback_ on the server and on the
  first client render, then switches in a layout effect. That is why both big interactive
  sections have a static branch that doubles as the prerendered, crawlable markup.
- **Reduced motion is honoured throughout**, generally by rendering the static branch rather
  than by slowing the animation down.

## Build and deployment

```bash
bun run dev            # Vite dev server with HMR
bun run build          # Production build
bun run build:static   # Build + prerender every route to static HTML
bun run preview        # Preview the production build
bun run photos         # Regenerate the /hobbies tiles + manifest
bun run assets         # Regenerate the site's own image derivatives
bun run lint / typecheck / format / format:check
```

`build:static` runs `vite build`, then `scripts/prerender.mjs`, which:

1. Loads the SSR bundle and fetches every route in `ROUTES`, writing `<route>/index.html`.
2. Copies the landing page to `404.html`, which GitHub Pages serves for unknown paths — so
   client-side routes still resolve.
3. Calls `scripts/seo.mjs` to emit `sitemap.xml`, `robots.txt` and a 1200×630 PNG Open Graph
   card per route (hand-built SVG, rasterized with `sharp`; the major scrapers reject SVG).

The base path is derived from `GITHUB_REPOSITORY` in `vite.config.ts` (`/portfolio-site/`),
falling back to `/` locally, and `SITE_BASE` overrides it. `scripts/routes.mjs` mirrors the
same logic so sitemap URLs match the asset URLs the build emits, and `src/lib/site-url.ts`
applies the identical trailing-slash rule at runtime — those three must stay in step.

Canonical links are declared **per route**, not in the root shell: a blanket canonical in
`__root.tsx` would apply the landing page's URL to every page.

## Optional environment variables

All are `VITE_*`, all public, all inert when unset:

| Variable                         | Effect when set                                                  |
| -------------------------------- | ---------------------------------------------------------------- |
| `VITE_CONTACT_ENDPOINT`          | Contact form POSTs JSON here instead of falling back to mailto.  |
| `VITE_ACHIEVEMENTS_ENDPOINT`     | Trophy case shows live rarity percentages from the stats Worker. |
| `VITE_ANALYTICS_SRC` / `_DOMAIN` | Injects a self-hosted cookieless analytics script.               |
| `VITE_VITALS_ENDPOINT`           | Web Vitals are POSTed here; otherwise dev-logged only.           |

`SITE_BASE` and `SITE_ORIGIN` (build-time, not `VITE_`) override the deploy base path and
origin used by the prerender and SEO scripts.
</content>
