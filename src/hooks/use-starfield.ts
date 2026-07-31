import { useCallback, useEffect, useRef } from "react";

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
 * Perspective-projected starfield drawn to a 2D canvas by a single RAF loop.
 *
 * Stars travel toward the camera (`z` shrinking); `speed` eases toward `target`,
 * and above ~0.02 the dots become streaks for a warp effect. Nothing here touches
 * React state, so the loop never triggers a re-render.
 */
export function useStarfield(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { count = 720 }: StarfieldOptions = {},
): StarfieldHandle {
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
    running: false,
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

    s.running = true;
    const fov = 0.9;
    const loop = (t: number) => {
      if (!s.running) return;
      s.speed += (s.target - s.speed) * 0.04;
      ctx.clearRect(0, 0, s.w, s.h);
      const warpish = s.speed > 0.02;
      for (const star of s.stars) {
        const pz = star.z;
        star.z -= s.speed;
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
        if (!warpish) alpha *= 0.6 + 0.4 * Math.sin(t * 0.002 + star.tw);
        const color = star.hue ? `rgba(150,200,255,${alpha})` : `rgba(255,255,255,${alpha})`;
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
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener("resize", size);
    return () => {
      s.running = false;
      window.removeEventListener("resize", size);
    };
  }, [canvasRef, count]);

  return { setTarget };
}
