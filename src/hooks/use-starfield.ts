import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Star {
  x: number;
  y: number;
  z: number;
  tw: number;
  hue: number;
}

export interface StarfieldHandle {
  setTarget: (t: number) => void;
}

export interface StarfieldOptions {
  /** Star count. Lower it on routes that run a second animation loop. */
  count?: number;
}

/**
 * Particle palettes, interpolated on theme change.
 *
 * Dark: white/pale-blue stars on near-black. Light: dark ink motes (and a deeper
 * blue for the tinted minority) on white — the same drifting motion, inverted.
 */
const DARK_PLAIN_RGB = [255, 255, 255] as const;
const DARK_ACCENT_RGB = [150, 200, 255] as const;
const LIGHT_PLAIN_RGB = [12, 24, 44] as const;
const LIGHT_ACCENT_RGB = [26, 115, 216] as const;

/**
 * Per-star twinkle oscillation rate, in radians per millisecond.
 *
 * Deliberately proportional to DEFAULT_SPEED in starfield.tsx — the drift and the
 * twinkle are separate clocks, and moving only one makes the effect read as two
 * unrelated animations rather than one system. Retune both by the same ratio.
 */
const TWINKLE_RATE = 0.0017;

/**
 * Perspective-projected starfield drawn to a 2D canvas by a single RAF loop.
 *
 * Stars travel toward the camera (`z` shrinking); `speed` eases toward `target`,
 * and above ~0.02 the dots become streaks for a warp effect. Nothing here touches
 * React state, so the loop never triggers a re-render.
 *
 * Motion is conditional. Under `prefers-reduced-motion` the field is painted once
 * and the loop never starts (WCAG 2.2.2 — this canvas is the only moving thing on
 * some routes, so there would otherwise be nothing to stop). When animating, the
 * loop suspends while the canvas is offscreen or the tab is hidden, and holds its
 * twinkle clock across the gap so the field does not jump on return.
 */
export function useStarfield(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { count = 720 }: StarfieldOptions = {},
): StarfieldHandle {
  // framer's hook rather than a one-shot `matchMedia().matches`: it is SSR-safe and it
  // re-renders when the OS preference flips, so the effect below re-runs and switches
  // between the animated and static paths without a reload.
  const prefersReduced = useReducedMotion() === true;

  const stateRef = useRef({
    stars: [] as Star[],
    n: count,
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    speed: 0.0025,
    target: 0.0025,
    dpr: 1,
    /** 0 = dark palette, 1 = light palette; eased so theme changes cross-fade. */
    lightMix: 0,
  });

  const setTarget = useCallback((t: number) => {
    stateRef.current.target = t;
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    s.n = count;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Start at the theme already applied by THEME_INIT_SCRIPT, so the first frame
    // paints the correct palette rather than easing into it.
    s.lightMix = document.documentElement.classList.contains("light") ? 1 : 0;

    const size = () => {
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = cv.clientWidth;
      s.h = cv.clientHeight;
      cv.width = s.w * s.dpr;
      cv.height = s.h * s.dpr;
      s.cx = s.w / 2;
      s.cy = s.h / 2;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    size();

    s.stars = [];
    for (let i = 0; i < s.n; i++) {
      s.stars.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.18 ? 205 : 0,
      });
    }

    const fov = 0.9;

    /**
     * Paint one frame at animation time `t` (ms).
     *
     * `advance` is false for the reduced-motion still: the field is drawn exactly as it
     * would look on the first frame, but nothing is stepped forward and the palette snaps
     * rather than eases (there is no next frame to ease on).
     */
    const draw = (t: number, advance: boolean) => {
      if (advance) s.speed += (s.target - s.speed) * 0.04;
      ctx.clearRect(0, 0, s.w, s.h);
      const warpish = s.speed > 0.02;
      // Ease between the dark and light particle palettes instead of snapping on the
      // frame the class flips — a hard colour swap on ~700 particles is the most
      // visible part of a choppy theme change.
      const target = document.documentElement.classList.contains("light") ? 1 : 0;
      s.lightMix += advance ? (target - s.lightMix) * 0.08 : target - s.lightMix;
      const mix = s.lightMix;
      for (const star of s.stars) {
        const pz = star.z;
        if (advance) star.z -= s.speed;
        if (star.z <= 0.02) {
          star.z = 1;
          star.x = Math.random() * 2 - 1;
          star.y = Math.random() * 2 - 1;
          continue;
        }
        const k = fov / star.z;
        const sx = s.cx + star.x * k * s.cx;
        const sy = s.cy + star.y * k * s.cy;
        if (sx < -50 || sx > s.w + 50 || sy < -50 || sy > s.h + 50) continue;
        const sizePx = (1 - star.z) * 2.4 + (warpish ? 0.3 : 0.9);
        let alpha = warpish
          ? Math.min(1, (1 - star.z) * 1.4)
          : Math.min(1, 0.45 + (1 - star.z) * 0.9);
        if (!warpish) alpha *= 0.6 + 0.4 * Math.sin(t * TWINKLE_RATE + star.tw);
        // Interpolate white-on-black → ink-on-white across `mix`.
        const dark = star.hue ? DARK_ACCENT_RGB : DARK_PLAIN_RGB;
        const lightRgb = star.hue ? LIGHT_ACCENT_RGB : LIGHT_PLAIN_RGB;
        const r = Math.round(dark[0] + (lightRgb[0] - dark[0]) * mix);
        const g = Math.round(dark[1] + (lightRgb[1] - dark[1]) * mix);
        const b = Math.round(dark[2] + (lightRgb[2] - dark[2]) * mix);
        const fade = 1 + ((star.hue ? 0.72 : 0.62) - 1) * mix;
        const color = `rgba(${r},${g},${b},${alpha * fade})`;
        if (warpish) {
          const k0 = fov / pz;
          const px = s.cx + star.x * k0 * s.cx;
          const py = s.cy + star.y * k0 * s.cy;
          ctx.strokeStyle = color;
          ctx.lineWidth = sizePx;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(sx, sy, sizePx, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // rAF handle and a per-effect cancellation flag. Both are locals, NOT fields on the
    // shared `stateRef` — a flag on shared state cannot distinguish "this effect run was
    // torn down" from "a newer run started", so an orphaned loop would keep drawing.
    let raf = 0;
    let cancelled = false;
    /** Last animation time handed to `draw`, so a resize can repaint the same frame. */
    let clock = 0;

    const onResize = () => {
      size();
      // Resizing the backing store clears it; if no frame is scheduled (reduced motion, or
      // suspended offscreen/hidden) nothing would repaint it, leaving a blank canvas.
      if (raf === 0 && !cancelled) draw(clock, false);
    };
    window.addEventListener("resize", onResize);

    if (prefersReduced) {
      draw(0, false);
      // The loop normally polls the <html> class every frame to pick up theme changes.
      // With no loop, watch the class directly so a light/dark toggle still repaints.
      const themeObserver = new MutationObserver(() => draw(0, false));
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => {
        cancelled = true;
        themeObserver.disconnect();
        window.removeEventListener("resize", onResize);
      };
    }

    // ── suspend while offscreen or backgrounded ────────────────────────────
    // Time spent suspended, subtracted from the rAF timestamp so the twinkle phase
    // resumes where it stopped instead of jumping forward by the length of the pause.
    let visible = true;
    let pausedAt = 0;
    let clockOffset = 0;

    const frame = (now: number) => {
      if (cancelled) return;
      if (!visible || document.hidden) {
        pausedAt = now;
        raf = 0;
        return;
      }
      clock = now - clockOffset;
      draw(clock, true);
      raf = requestAnimationFrame(frame);
    };

    // Set once the deferred start below has fired. Until then resume() must not schedule
    // anything — the IntersectionObserver callback runs on observe and would otherwise
    // start the loop immediately, defeating the deferral.
    let started = false;

    const resume = () => {
      if (cancelled || !started || raf !== 0 || !visible || document.hidden) return;
      if (pausedAt) {
        clockOffset += performance.now() - pausedAt;
        pausedAt = 0;
      }
      raf = requestAnimationFrame(frame);
    };

    const suspend = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (!pausedAt) pausedAt = performance.now();
    };

    const onVisibility = () => (document.hidden ? suspend() : resume());
    document.addEventListener("visibilitychange", onVisibility);

    // A no-op while the canvas is `position: fixed` (it always intersects), but it is what
    // stops the loop if the field is ever placed in flow, and it costs one observer.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) resume();
        else suspend();
      },
      { threshold: 0 },
    );
    io.observe(cv);

    // Paint one frame synchronously so the field is present at first paint — the page
    // must never show a bare background — but hold the *animation* until the main
    // thread has finished hydrating. 720 stars at one arc-fill each is ~43k path fills
    // a second, and starting that while React is still hydrating competes directly
    // with time-to-interactive on the landing page. The visitor cannot perceive the
    // first few hundred milliseconds of drift; they can perceive a janky load.
    draw(0, false);

    let startHandle = 0;
    let usedIdleCallback = false;
    const startLoop = () => {
      startHandle = 0;
      started = true;
      resume();
    };

    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      usedIdleCallback = true;
      // The timeout is the point: on a busy thread idle may never come on its own.
      startHandle = idle(startLoop, { timeout: 500 });
    } else {
      startHandle = window.setTimeout(startLoop, 200);
    }

    return () => {
      cancelled = true;
      if (startHandle !== 0) {
        if (usedIdleCallback) window.cancelIdleCallback?.(startHandle);
        else window.clearTimeout(startHandle);
      }
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [canvasRef, count, prefersReduced]);

  return { setTarget };
}
