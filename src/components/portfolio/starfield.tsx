import { useEffect, useRef } from "react";

import { useStarfield } from "@/hooks/use-starfield";

/**
 * Cruise speed once the page has settled.
 *
 * Kept in step with TWINKLE_RATE in use-starfield.ts: retuning one without the other
 * makes the two clocks come apart (slow travel under fast-blinking stars).
 */
const DEFAULT_SPEED = 0.005;

/**
 * Fixed, full-viewport starfield canvas plus the nebula gradient wash.
 * Sits at z-index 0; page content must establish its own stacking above it.
 */
export function Starfield({ count, speed = DEFAULT_SPEED }: { count?: number; speed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useStarfield(canvasRef, { count });

  useEffect(() => {
    stars.setTarget(speed);
    // `stars` is a fresh object each render but `setTarget` is stable (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      <div className="nebula fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
    </>
  );
}
