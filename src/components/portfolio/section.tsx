import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fades + lifts children into view once when scrolled to.
 *
 * Pass `immediate` for content that is already above the fold on load — a
 * dedicated route's page header, for example. The default `whileInView` trigger
 * waits for a scroll that such content never receives, leaving it invisible.
 *
 * THE TWO BRANCHES USE DIFFERENT ENGINES, ON PURPOSE.
 *
 * `immediate` is CSS (`.reveal-immediate` in src/styles.css); the scroll branch is framer.
 * The reason is that framer's `initial` is rendered into the *prerendered HTML* as an inline
 * `opacity: 0`, and only framer — i.e. only hydration — ever clears it. That is fine for
 * something below the fold, which nobody can see before the bundle lands anyway. It is wrong
 * for a page's own `<h1>`: on /gallery the heading sat at `opacity: 0` in the shipped bytes
 * while 649KB of JS downloaded, and once the photo tiles became a CSS animation the images
 * beat the title onto the screen — the page rendered its whole photo wall under a blank
 * space where "Photography" belongs.
 *
 * So above-the-fold content must not depend on JS to become *visible*. CSS is render-blocking
 * and framer is not, which makes this the one place the distinction matters. The scroll
 * branch keeps framer because `whileInView` needs the observer anyway, and by definition its
 * content is not on screen at first paint.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Animate on mount instead of on scroll. Use for above-the-fold content. */
  immediate?: boolean;
}) {
  if (immediate) {
    return (
      <div
        className={className ? `reveal-immediate ${className}` : "reveal-immediate"}
        // The only per-instance value. Staggering stays a number in the caller's hands
        // exactly as it was with framer's `transition.delay`.
        style={delay ? { animationDelay: `${delay}s` } : undefined}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Section title styled with the cosmic accent + eyebrow label. */
export function SectionHeading({
  eyebrow,
  title,
  as: Heading = "h2",
  immediate = false,
}: {
  eyebrow: string;
  title: string;
  /** Use "h1" when the heading is the page's primary title (a dedicated route). */
  as?: "h1" | "h2";
  /** Animate on mount — for a page header that loads above the fold. */
  immediate?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal immediate={immediate}>
        <span
          className="inline-flex items-center gap-2.5 font-display font-medium uppercase text-accent-bright rounded-full"
          style={{
            fontSize: 12,
            letterSpacing: 3,
            padding: "6px 14px",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border)",
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: 5,
              height: 5,
              background: "var(--portfolio-accent-bright)",
              boxShadow: "0 0 8px var(--portfolio-accent-bright)",
            }}
          />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={0.08} immediate={immediate}>
        <Heading
          className="font-display font-extrabold text-ink mt-5"
          style={{ fontSize: "clamp(30px,4.4vw,52px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}
        >
          {title}
        </Heading>
      </Reveal>
    </div>
  );
}

/** Standard vertical rhythm + max width wrapper for a page section. */
export function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="relative mx-auto w-full scroll-mt-24"
      style={{ maxWidth: 1180, padding: "clamp(70px,10vh,130px) clamp(24px,5vw,80px)" }}
    >
      {children}
    </section>
  );
}
