# Codebase Overview

## Tech Stack

**Framework & Build Tools:**

- **Vite** (v7.3.1) — build tool and dev server
- **TanStack Start** (v1.167.50) — full-stack React meta-framework, SSR, file-based routing
- **Nitro** (3.0.260603-beta) — backend server runtime
- **React** (v19.2.0)
- **TypeScript** (v5.8.3)

**Styling & Animation:**

- **Tailwind CSS** (v4.2.1) — utility-first CSS with custom design tokens
- **Framer Motion** (v12.40.0) — animations and interactive drag
- **shadcn/ui** — component library built on Radix UI primitives

**Routing & State:**

- **TanStack Router** (v1.168.25) — type-safe file-based routing
- **TanStack React Query** (v5.83.0) — server state management
- **React Hook Form** (v7.71.2) + **Zod** (v3.24.2) — form handling and validation

**Other Libraries:**

- Lucide React (icons), Recharts (charts), Embla Carousel, cmdk, date-fns, sonner (toasts)

**Package Manager:** Bun (with `bun.lock`)

**Deployment:** GitHub Pages via static prerendering

---

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx        # Root layout: QueryClient, error boundaries, meta tags
│   └── index.tsx         # Main homepage (~2,800 lines): all sections orchestrated here
├── components/
│   └── portfolio/
│       ├── section.tsx   # Shared: Section wrapper, heading, Reveal animation component
│       ├── experience.tsx # Experience section + ExperienceModal
│       ├── projects.tsx  # Projects section (current static card grid)
│       ├── about.tsx
│       ├── contact.tsx
│       └── footer.tsx
├── data/
│   └── portfolio.ts      # Single source of truth: Project, Experience, Social interfaces + data
├── styles.css            # Global styles, design tokens, custom animations
├── router.tsx            # Router configuration and initialization
├── start.ts              # TanStack Start middleware, error capture
└── server.ts             # Server-side error handling
```

**Config files at root:**

- `vite.config.ts` — dynamic base path for GitHub Pages, static prerender of `/`
- `tsconfig.json` — ES2022, strict, `@/*` → `./src/*` path alias
- `components.json` — shadcn/ui config (base color: slate, oklch color space)
- `eslint.config.js` / `.prettierrc` — lint/format (100 char line width, double quotes)
- `bunfig.toml` — Bun settings with 24h supply-chain guard

---

## Site Organization

Single-page app with anchor-based navigation (no multi-page routing). Sections scroll into view with smooth scroll + 90px offset for the fixed nav.

| Section    | Component             | Key Feature                                                   |
| ---------- | --------------------- | ------------------------------------------------------------- |
| Nav        | inline in `index.tsx` | Fixed header, logo, nav links, résumé download                |
| Hero       | inline in `index.tsx` | 3D starfield canvas, typewriter roles, warp loading animation |
| About      | `about.tsx`           | Bio, interest tags, résumé link                               |
| Experience | `experience.tsx`      | Interactive globe, expandable role modals                     |
| Projects   | `projects.tsx`        | Static card grid with winner badges and GitHub links          |
| Contact    | `contact.tsx`         | Social links + form that composes a `mailto:` URL             |
| Footer     | `footer.tsx`          | Copyright, credits, social links                              |

---

## Data Model

All content lives in `src/data/portfolio.ts`. Current interfaces:

```ts
interface Experience {
  company: string;
  role: string;
  dates: string;
  location: string;
  remote?: boolean;
  description: string;
  details?: string;
  photos?: string[];
  lat?: number;
  lng?: number;
}

interface Project {
  title: string;
  description: string;
  image?: string;
  link: string;
  winner?: boolean;
  cta?: string;
  repo?: string;
}

interface Social {
  label: string;
  href: string;
  icon: ReactNode;
}
```

Edges are computed at render time; no manual edge list needed for constellation implementation.

---

## CSS / Styling

Design tokens in `src/styles.css`:

**Portfolio Colors:**

- `--portfolio-accent: #2f9bff` (main blue)
- `--portfolio-accent-bright: #5db6ff` (bright blue)
- `--portfolio-accent-deep: #0a4f99` (dark blue)
- `--portfolio-ink: #ffffff` (text)
- `--portfolio-muted: #9fb3c8` (secondary text)
- `--portfolio-space: #000005` (dark background)

**Typography:**

- `.font-display` — Sora typeface (headers)
- `.font-body` — Space Grotesk typeface (body)

**Custom Utilities:**

- `.bg-space`, `.text-ink`, `.text-muted-portfolio`, `.text-accent-bright`, `.role-gradient`

**Animations:** `.load-word`, `.type-caret`, `.globe-pin`, `.nebula`; custom scrollbar (blue thumb on dark bg)

---

## JavaScript Architecture

**State management pattern:**

- Server side: TanStack Start error middleware, SSR entry handler
- Client side: React hooks + Framer Motion; no global state library

**Key hooks in `index.tsx`:**

- `useStarfield(canvasRef)` — custom 3D star canvas (720 stars, perspective FOV, warp speed, RAF loop); returns `{ setTarget }` for speed control
- `useRotatingRole(active)` — typewriter cycling through role strings

**Component patterns:**

- `Reveal` — scroll-triggered fade/slide-in wrapper (`once: true` viewport detection)
- `ExperienceModal` — full-screen overlay with `AnimatePresence`, ESC + scroll-lock, keyboard support
- `motion.div` + `AnimatePresence` used throughout for enter/exit transitions

**Hero loading sequence:**

- Phase 1 — "LOADING" text fill animation (1.7s)
- Phase 2 — warp speed starfield (0.9s)
- Phase 3 — settled state, sections visible
- Reduced motion / hidden tab: skips intro immediately

**Experience Globe:**

- Equirectangular world map texture as an SVG mask
- Spherical shading (highlight + shadow via radial gradient)
- Rotates to center on selected job's lat/lng
- Orbital particles for remote roles; red ping animation for location pin

**Contact form:**

- No backend — composes a `mailto:` URL from form state via `window.location.href`

---

## Build & Deployment

```
bun run dev          # Vite dev server with HMR
bun run build        # Production build (SPA hydration)
bun run build:static # Pre-rendered static HTML for GitHub Pages
bun run preview      # Preview production build
```

Static assets in `/public`: `portrait.jpeg`, `logo.png`, `Resume.pdf`, `world.svg`, project images, `CORnet-Mouse.pdf`

GitHub Pages deployment: base path is set dynamically from the repo name (`/portfolio-site/`).
