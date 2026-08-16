import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HelpCircle, Lock } from "lucide-react";

import type { Achievement, Tier } from "@/data/achievements";

/**
 * Procedurally-drawn achievement medallion — one component, zero image assets.
 *
 * A hexagonal plate carries a per-tier gradient and a specular highlight, ringed
 * by orbiting points of light whose density escalates with rarity. The orbit
 * motif is deliberate: it is the same visual grammar as starfield.tsx and the
 * project constellation, so 36 badges belong to the site instead of looking like
 * stock icons bolted on.
 *
 * The plate is a filled shape rather than text, so the tier hex pairs are safe in
 * both themes; the icon sits on that permanently-saturated surface and therefore
 * carries `.on-dark` (see the light-mode safety net in src/styles.css) to stay
 * white instead of being remapped to ink.
 *
 * SVG gradient ids are namespaced with `useId()` — a grid renders 36 of these and
 * duplicate ids would make every badge inherit the first one's gradient.
 */

/** Plate gradients, light stop first. Tier 2 is the brand accent on purpose. */
const TIER_GRADIENT: Record<Tier, readonly [string, string]> = {
  common: ["#8b9bb0", "#4a5768"],
  uncommon: ["#5db6ff", "#2f9bff"],
  rare: ["#a78bfa", "#6d28d9"],
  epic: ["#fbbf24", "#c2680a"],
  legendary: ["#34d399", "#0891b2"],
};

/** Orbiting dots per tier — the at-a-glance rarity tell. */
const TIER_ORBS: Record<Tier, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 6,
};

/** Pointy-top hexagon inscribed in a 100×100 viewBox, radius 44 about (50,50). */
const HEX_POINTS = "50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28";

/** Radius of the orbit / progress rings in viewBox units. */
const RING_RADIUS = 47;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Visual state of a badge in the grid or the unlock toast. */
export type BadgeState = "earned" | "locked" | "secret";

export function AchievementBadge({
  achievement,
  state,
  size = 64,
  progress = 0,
}: {
  achievement: Achievement;
  state: BadgeState;
  size?: number;
  /** 0..1 toward a countable rule. Draws a partial ring on locked badges. */
  progress?: number;
}) {
  const gradientId = useId();
  const sheenId = useId();
  const prefersReduced = useReducedMotion();

  const [light, dark] = TIER_GRADIENT[achievement.tier];
  const orbs = TIER_ORBS[achievement.tier];
  const Icon = state === "locked" ? Lock : achievement.icon;

  // A secret keeps its real silhouette — the shape is there, just barely. That is
  // what makes the reveal feel like recognition rather than a swap.
  const isSecret = state === "secret";
  const isEarned = state === "earned";

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
        // Locked badges are desaturated rather than hidden, so the wall still
        // reads as "these exist and you haven't got them".
        filter: isEarned ? undefined : "grayscale(1) brightness(0.85)",
        opacity: isEarned ? 1 : isSecret ? 0.55 : 0.42,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={isSecret ? "var(--portfolio-panel-deep)" : light} />
            <stop offset="100%" stopColor={isSecret ? "var(--portfolio-panel-deep)" : dark} />
          </linearGradient>
          {/* Specular highlight, echoing .portrait-sheen and .globe-shade. */}
          <radialGradient id={sheenId} cx="0.32" cy="0.26" r="0.75">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isSecret ? 0 : 0.34} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Plate. The matching stroke fakes rounded corners without a path. */}
        <polygon
          points={HEX_POINTS}
          fill={`url(#${gradientId})`}
          stroke={isSecret ? "var(--portfolio-border)" : dark}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon points={HEX_POINTS} fill={`url(#${sheenId})`} strokeLinejoin="round" />

        {/* Orbit ring — rare and above get a second, tighter pass. */}
        {!isSecret && (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke={light}
            strokeWidth="1.5"
            opacity="0.55"
          />
        )}
        {!isSecret && achievement.tier !== "common" && achievement.tier !== "uncommon" && (
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={light}
            strokeWidth="0.8"
            opacity="0.3"
          />
        )}

        {/* Progress ring on partially-completed locked badges. */}
        {!isEarned && progress > 0 && progress < 1 && (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--portfolio-accent-bright)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            transform="rotate(-90 50 50)"
          />
        )}

        {/* Orbiting points of light. Legendary rotates; everything else is static. */}
        {orbs > 0 && !isSecret && (
          <motion.g
            style={{ originX: "50px", originY: "50px" }}
            animate={
              achievement.tier === "legendary" && !prefersReduced && isEarned
                ? { rotate: 360 }
                : undefined
            }
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: orbs }, (_, i) => {
              const angle = (i / orbs) * Math.PI * 2 - Math.PI / 2;
              return (
                <circle
                  key={i}
                  cx={50 + RING_RADIUS * Math.cos(angle)}
                  cy={50 + RING_RADIUS * Math.sin(angle)}
                  r="2.6"
                  fill={light}
                />
              );
            })}
          </motion.g>
        )}
      </svg>

      {/* Icon overlays the plate. `on-dark` keeps it white in light mode. */}
      <div
        className="on-dark absolute inset-0 grid place-items-center text-white"
        style={{ opacity: isSecret ? 0.1 : 1 }}
      >
        <Icon size={size * 0.4} strokeWidth={1.75} aria-hidden="true" />
      </div>

      {/* Secrets get a question mark floating over their own faded silhouette. */}
      {isSecret && (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ color: "var(--portfolio-muted)" }}
        >
          <HelpCircle size={size * 0.36} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
