import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Fades + lifts children into view once when scrolled to. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
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
}: {
  eyebrow: string;
  title: string;
  /** Use "h1" when the heading is the page's primary title (a dedicated route). */
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal>
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
      <Reveal delay={0.08}>
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
