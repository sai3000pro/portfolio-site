# Projects Constellation — Implementation Plan

Convert the Projects section from a static grid into an interactive **constellation of
projects**: glowing star nodes that start in a grid-like layout, can be dragged around a
starfield, drift with ambient motion, bounce off the walls, and are connected by
**strands of light**. Clicking a node (or its "See details") opens a full project modal,
mirroring the existing Work Experience overlay.

Reference: Genshin Impact constellation screen (cyan star nodes joined by glowing lines).

## Locked decisions

- **Connection topology — curated edges via tech stack.** Strands connect projects that
  share technologies. Each project gets a `tech: string[]`; an edge is drawn between any
  two projects sharing at least one tech. The result is effectively a graph of the tech
  stack / similarity between projects. Strand brightness/weight can scale with the number
  of shared techs, and the shared tech(s) can surface on hover.
- **Mobile — static.** On small screens, render a non-draggable, tappable constellation
  (no physics), preserving tap-to-open and readable labels.
- **Drop behavior — stay where dropped + ambient physics.**
  - Nodes remain where released (no spring-back to an anchor).
  - **Ambient drift:** each node floats slowly and continuously.
  - **Throw momentum:** releasing a drag imparts the drag velocity, so a flicked node
    keeps traveling in that direction.
  - **Wall bounce:** nodes bounce off the canvas edges (velocity component inverts on
    contact), keeping everything on-screen.
  - **Node-node collision:** nodes bounce off each other (circle-circle collision:
    separate overlapping nodes equally, reflect velocity components along the collision
    normal). The dragged node is not displaced by collision — only its partner is pushed.
- **Position tracking — `useMotionValue` per node.** Each node owns a pair of FM motion
  values (`x`, `y`). The RAF physics loop writes directly to these values; FM's `drag`
  reads from the same values. This eliminates the dual-system conflict (CSS transform vs.
  absolute top/left) and means `StrandLayer` can subscribe to motion values via
  `useTransform` without triggering React re-renders at 60fps.
- **Canvas resize — proportional rescaling.** On window resize, each node's position is
  multiplied by `(newSize / oldSize)` independently on x and y. Nodes stay in the same
  relative position within the canvas; no visible jump, no re-seeding.
- **"See details →" affordance — fade-in overlay on the star.** On hover, a semi-transparent
  overlay fades in over the star circle with "See details →" centered inside it. The title
  label below remains visible. The whole node (star + label) is the click target.
- **Winner node styling — gold glow + "★ Winner" label.** Winner nodes use gold
  (`#f5c518` or similar warm gold) for the star fill and box-shadow bloom instead of cyan.
  A small `"★ Winner"` text appears beneath the title label in gold. Non-winner nodes
  remain cyan (`#5db6ff`).
- **Section heading — standard placement.** The "Projects" section heading (matching other
  sections) sits above the `ConstellationCanvas`, consistent with the rest of the page.

## What the existing code gives us

- **framer-motion** is already a dependency (`drag`, `whileDrag`, `AnimatePresence`,
  `useMotionValue`, and `onDragEnd` velocity readout).
- **`ExperienceModal`** (`src/components/portfolio/experience.tsx`) is the exact
  click → detail-overlay pattern to reuse: backdrop, ESC + scroll-lock, two-column
  photos/info, `AnimatePresence`. `ProjectModal` will mirror it.
- **Space aesthetic + blue accent** (`#5db6ff`) already matches the reference; winner
  projects can use a gold star (reusing the existing gold winner styling).
- The scroll-center "active node" measurement pattern in `Experience()` is a template for
  hover/active highlighting of a star and its strands.

## Architecture

New component tree inside the existing `<Section id="projects">`:

```
Projects
└─ ConstellationCanvas            // relative, fixed responsive height, starfield bg
   ├─ StrandLayer (SVG)           // glowing gradient lines between connected nodes
   ├─ StarNode[] (motion.div)     // draggable glowing stars + labels
   └─ ProjectModal                // AnimatePresence, mirrors ExperienceModal
```

1. **`ConstellationCanvas`**
   - `relative` container, height `clamp(520px, 70vh, 720px)`; subtle starfield
     background (CSS radial dots / reused space bg).
   - Owns node **positions + velocities** in a ref (physics) with a lightweight React
     state mirror for render, driven by a single `requestAnimationFrame` loop.
   - Seeds **grid-like initial positions** from canvas size ÷ node count on mount, so it
     "starts off in a grid."
   - Measures its own size via `ResizeObserver` to keep bounds correct and responsive.

2. **`StarNode`** (one per project)
   - Absolutely-positioned `motion.div` at `positions[i]`.
   - `drag` with `dragConstraints={canvasRef}`, `whileDrag={{ scale: 1.15 }}`; while
     dragging, physics is paused for that node and position tracks the pointer.
   - `onDragEnd` reads `info.velocity` → seeds the node's velocity for throw momentum.
   - Renders a glowing star (radial-gradient core + `box-shadow` bloom + gentle twinkle),
     the **project title label**, and a **"See details →"** affordance on hover.
   - `winner` → gold star; default → cyan (`#5db6ff`).
   - Keyboard-focusable; Enter/Space opens the modal.

3. **`StrandLayer`** (SVG overlay behind nodes)
   - One `<line>`/`<path>` per edge, endpoints read from the same `positions` state so
     strands follow nodes live during drag and drift.
   - Cyan gradient stroke + blur-glow filter; opacity/width scales with shared-tech count.
   - Hovering a node brightens it and its incident strands.
   - Optional traveling pulse via animated `stroke-dashoffset`.

4. **`ProjectModal`** (reuse of `ExperienceModal` styling)
   - Left: cover image or gradient title cover (reuse current fallback). Right: title,
     full `details`/description, `winner` badge, and **paper/Devpost + GitHub links**.
   - Opened by node click or "See details"; closed by ESC/backdrop/close button.

## Physics model (desktop)

Single `requestAnimationFrame` loop over nodes not currently being dragged:

```
for each node n (not dragging):
  // ambient drift: small random acceleration, clamped to a gentle max speed
  n.v += randomJitter() * ambientAccel
  n.v *= damping                      // mild friction so throws settle, drift persists
  n.pos += n.v * dt

  // wall bounce against canvas bounds (accounting for node radius)
  if n.pos.x < min || n.pos.x > max: n.v.x *= -restitution; clamp(n.pos.x)
  if n.pos.y < min || n.pos.y > max: n.v.y *= -restitution; clamp(n.pos.y)

// node-node collision (all pairs, after individual updates)
for each pair (a, b):
  d = distance(a.pos, b.pos)
  minDist = nodeRadius * 2
  if d < minDist && d > 0:
    normal = normalize(b.pos - a.pos)
    // separate: push apart equally so they no longer overlap
    overlap = minDist - d
    a.pos -= normal * overlap / 2
    b.pos += normal * overlap / 2
    // reflect velocity components along collision normal
    relV = a.v - b.v
    impulse = dot(relV, normal) * restitution
    if impulse > 0:           // only resolve if approaching
      a.v -= normal * impulse / 2
      b.v += normal * impulse / 2
```

- **Drag** sets position directly and suspends drift for that node. Collision resolution
  still applies to the dragged node's partner — it gets pushed away — but the dragged
  node itself is not displaced by collision (the pointer controls it).
- **Release** (`onDragEnd`) converts framer-motion's `info.velocity` (px/s) into the
  node's velocity so a flick keeps going.
- **Damping** is light: enough that thrown nodes gradually slow, low enough that ambient
  drift never fully stops. Ambient jitter keeps a slow float even at rest.
- Tunables: `ambientAccel`, `maxAmbientSpeed`, `damping`, `restitution`, node radius.
- Respect `prefers-reduced-motion`: disable ambient drift + pulses, keep drag + open.

## Data model changes (`src/data/portfolio.ts`)

Extend `Project` (all optional, backward-compatible):

```ts
export interface Project {
  title: string;
  description: string;   // short, shown as label / card summary
  image?: string;
  link: string;
  winner?: boolean;
  cta?: string;
  repo?: string;
  details?: string;      // long text for the modal
  photos?: string[];     // modal imagery
  tech?: string[];       // drives edges: shared tech => strand
}
```

- **Edges are derived** from `tech` overlap at build/render time (no manual edge list):
  `edge(a, b)` exists iff `a.tech ∩ b.tech ≠ ∅`; weight = `|a.tech ∩ b.tech|`.

**Confirmed `tech` tags per project:**

| Project | `tech` |
|---|---|
| CORnet-Mouse | `Python`, `Unity`, `Reinforcement Learning`, `AI/ML` |
| Verbalyst | `Python`, `Flask`, `JavaScript`, `HTML`, `CSS`, `Tailwind`, `AI/ML` |
| Healthut | `Python`, `JavaScript`, `HTML`, `CSS` |
| PatronPal | `Python`, `Flask`, `JavaScript`, `HTML`, `CSS`, `Tailwind` |
| devDucky | `Python`, `Flask`, `JavaScript`, `Node.js`, `Express`, `Vite`, `AI/ML` |

**Derived edge map (all 10 pairs — fully connected graph):**

| Edge | Shared techs | Weight |
|---|---|---|
| Verbalyst ↔ PatronPal | Python, Flask, JS, HTML, CSS, Tailwind | 6 |
| Verbalyst ↔ Healthut | Python, JS, HTML, CSS | 4 |
| Healthut ↔ PatronPal | Python, JS, HTML, CSS | 4 |
| Verbalyst ↔ devDucky | Python, Flask, JS, AI/ML | 4 |
| PatronPal ↔ devDucky | Python, Flask, JS | 3 |
| CORnet-Mouse ↔ Verbalyst | Python, AI/ML | 2 |
| CORnet-Mouse ↔ devDucky | Python, AI/ML | 2 |
| Healthut ↔ devDucky | Python, JS | 2 |
| CORnet-Mouse ↔ Healthut | Python | 1 |
| CORnet-Mouse ↔ PatronPal | Python | 1 |

The graph is fully connected with natural weight variation. Verbalyst ↔ PatronPal will have the heaviest/brightest strand; CORnet-Mouse edges to Healthut and PatronPal will be the thinnest.

## Accessibility & fallbacks

- Titles/descriptions stay in the DOM as labels → content remains crawlable/readable.
- Nodes are focusable; Enter/Space opens the modal.
- `prefers-reduced-motion`: static positions, no drift/pulse.
- **Mobile (static):** grid-like fixed positions, strands drawn, tap-to-open, no drag/physics.

## Build phases

1. **Data** — extend `Project` with `details`, `photos`, `tech`; populate `tech` per
   project. No visual change.
2. **Canvas + nodes** — `ConstellationCanvas` with grid-seeded positions and draggable
   `StarNode`s (no strands, no physics yet).
3. **Physics** — rAF loop: ambient drift, throw momentum from `onDragEnd`, wall bounce.
4. **Strands** — `StrandLayer` SVG edges from tech overlap, glow, live tracking of drags.
5. **Modal** — `ProjectModal` mirroring `ExperienceModal`, wired to click / "See details".
6. **Polish + fallbacks** — hover highlight (node + incident strands), twinkle, optional
   pulse, reduced-motion + mobile-static paths, optional `localStorage` position persist.
7. **Verify** — `bunx prettier --write`, `bunx eslint` (expect 0), `bun run build` (exit 0).

## Open / deferred

- Optional pulse traveling along strands (phase 6, nice-to-have).
- Optional `localStorage` persistence of dragged positions (phase 6, nice-to-have).
- Modal `details` content and `photos` per project — to be provided by owner before phase 5.
