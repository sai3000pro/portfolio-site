# Plan Review: Projects Constellation

Issues and gaps found in `projects-constellation-plan.md`, grouped by severity.

**Resolved after review:**

- Node-to-node collision → added to physics model and locked decisions.
- Modal content for thin projects → content to be provided by owner before phase 5.
- Dual position system conflict + 60fps setState → resolved by locking `useMotionValue` as the position tracking approach.
- Strands not following dragged nodes → resolved: `StrandLayer` subscribes to motion values via `useTransform`, bypassing React renders.
- Sparse/disconnected graph → resolved: all 5 projects share Python, producing a fully connected graph (10 edges) with natural weight variation. Tech tags confirmed and locked in the plan.
- Canvas resize behavior → proportional rescaling (multiply each node's position by `newSize / oldSize`).
- "See details →" affordance → semi-transparent fade-in overlay centered on the star circle on hover.
- Winner node styling → gold fill/glow (`#f5c518`) + `"★ Winner"` text beneath the title label.
- Section heading → standard placement above the canvas, matching all other sections.

---

## Critical — would cause broken behavior

### 1. `dragConstraints={canvasRef}` with a scrolled-down page

FM computes constraints from `getBoundingClientRect()` on the canvas element. Since the Projects section is mid-page, the bounding rect has a non-zero `top` offset relative to the viewport when the user has scrolled. With `useMotionValue`-based positioning (now locked), this is less of a positional conflict, but the constraint boundary itself may still drift if the user scrolls during an active drag.

Worth a focused test: scroll the page so the canvas is centered in the viewport, drag a node to the edge, then try scrolling while dragging.

---

## Gaps — unspecified behavior

### 2. `localStorage` persistence doesn't account for different canvas sizes

Listed as a phase 6 nice-to-have, but positions stored as absolute `px` values on a 1440px window are wrong on a 768px window. If this is implemented, positions must be stored as fractions of canvas dimensions (values in `[0, 1]`), not raw pixel values, so they remain valid after proportional rescaling on resize.

---

### 3. Mobile: touch-scroll vs. tap-on-node conflict

On mobile, tapping a node opens the modal (correct). But if the user's scroll gesture begins on a node, the touch event is ambiguous — it could be interpreted as a tap rather than a scroll attempt.

The mobile static path needs `touch-action: manipulation` (or `none`) on the node, and deliberate `onTouchStart`/`onTouchEnd` handling to distinguish a tap from a scroll gesture.

---

### 4. Z-index of active / dragged node

When dragging a node over another, it should appear on top. Neither `z-index` management nor FM's `zIndex` motion value is mentioned. Without this, a dragged node can pass visually under others.

---

### 5. Tab order of focusable nodes

The plan says nodes are keyboard-focusable. Tab order should follow data array order (not visual position), but this isn't stated. If tab order tracked visual position, it would change every frame as nodes drift — making keyboard navigation unusable.

---

### 6. Reduced motion + FM's internal drag spring

The plan disables drift and pulses under `prefers-reduced-motion`, but FM's `drag` has its own internal spring animation on release (snap-back to constraint edge). This spring should also be suppressed, requiring `dragTransition={{ duration: 0 }}` or similar. Not mentioned.

---

## Minor / Nice-to-have gaps

- **Label truncation:** Node labels need a `max-width` with `text-overflow: ellipsis` or explicit wrapping rules. Not mentioned.
- **Minimum node spacing in grid seed:** The grid-seeding formula doesn't account for minimum inter-node distance. Fine with 5 nodes and a wide canvas, but should be explicit.
- **RAF loop cleanup:** The `useEffect` that starts the RAF loop must cancel it on unmount (`cancelAnimationFrame`). Common to miss; the physics loop should also not hold stale refs to React state.
- **Phase 2 intermediate state:** Draggable nodes with no physics and no strands means dragged nodes just stay wherever dropped with no motion. Fine internally, but worth noting if phase 2 is ever committed or demo'd on its own.
