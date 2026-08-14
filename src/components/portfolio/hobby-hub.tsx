import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Gamepad2, HandHeart, PenLine, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Footer } from "./contact";
import { Nav } from "./nav";
import { Reveal, Section, SectionHeading } from "./section";
import { Starfield } from "./starfield";

/**
 * Page shell shared by /hobbies, /gallery, /blog, /gaming and /volunteering.
 *
 * Every one of those routes is the same five lines — starfield, nav, main landmark,
 * footer — and they were five copies until this split gave them a reason to agree.
 * blog.$slug.tsx still has a private `Shell` of the same shape; it is identical apart
 * from the `layeredMain` switch below and should be collapsed into this one, but that
 * file is owned elsewhere right now.
 */
export function PageShell({
  children,
  layeredMain = true,
}: {
  children: ReactNode;
  /**
   * Whether <main> gets its own stacking context (`position: relative; z-index: 2`),
   * which lifts ordinary page content above the decorative starfield at z-index 0.
   *
   * Pass `false` for a page whose content manages its own layering — the photo wall
   * on /gallery resolves its internal z-indexes against the root stacking context,
   * and wrapping it in a new one reshuffles the spiral, the belts and the lightbox.
   * Such a page must lift itself above the starfield on its own.
   */
  layeredMain?: boolean;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      {/* Fewer stars than the landing page — these pages share the main thread. */}
      <Starfield count={380} />

      <Nav />

      {/* Landmark + target of the root skip link. It has to start AFTER <Nav /> for the
          skip to be worth anything, and it excludes the decorative starfield and the
          footer. Exactly one per page: two #main-content elements break the skip link. */}
      {layeredMain ? (
        // paddingTop clears the 78px fixed nav, matching /achievements.
        <main
          id="main-content"
          tabIndex={-1}
          className="relative"
          style={{ zIndex: 2, paddingTop: 40 }}
        >
          {children}
        </main>
      ) : (
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      )}

      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
}

/** One hub card per destination route. Descriptions state what the page holds — no claims. */
const HUB_CARDS = [
  {
    to: "/gallery",
    icon: Camera,
    label: "Through the lens",
    title: "Photography",
    description:
      "A wall of landscape, water, sky and travel frames, each with its own capture details.",
  },
  {
    to: "/blog",
    icon: PenLine,
    label: "Writing",
    title: "Blog",
    description: "Posts collected in one place, newest first.",
  },
  {
    to: "/gaming",
    icon: Gamepad2,
    label: "Downtime",
    title: "Gaming",
    description: "Nothing here yet — this page is still being put together.",
  },
  {
    to: "/volunteering",
    icon: HandHeart,
    label: "Giving back",
    title: "Volunteering",
    description: "A timeline of volunteering roles, organisations and dates.",
  },
] as const;

const CARD_STYLE: React.CSSProperties = {
  padding: "clamp(20px,2.4vw,26px)",
  borderRadius: 18,
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  textDecoration: "none",
};

const ICON_STYLE: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--portfolio-surface-2)",
  border: "1px solid var(--portfolio-border)",
};

/**
 * The /hobbies hub.
 *
 * /hobbies used to stack the photo wall, the blog listing and the volunteering timeline
 * under a single title and a single canonical. Each now has its own route; this page is
 * the index of them.
 */
export function HobbyHub() {
  return (
    <Section id="beyond-the-code">
      <SectionHeading as="h1" immediate eyebrow="Outside work" title="Beyond the Code" />

      <Reveal immediate delay={0.14}>
        <p
          className="mx-auto text-center text-muted-portfolio"
          style={{ marginTop: 18, maxWidth: 560, fontSize: 16.5, lineHeight: 1.7 }}
        >
          Four sections, each on its own page.
        </p>
      </Reveal>

      <div
        className="grid"
        style={{
          marginTop: "clamp(36px,5vh,56px)",
          gap: "clamp(16px,2vw,22px)",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        }}
      >
        {HUB_CARDS.map((card, i) => (
          <Reveal key={card.to} immediate delay={0.2 + i * 0.06}>
            <HubCard card={card} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function HubCard({ card }: { card: (typeof HUB_CARDS)[number] }) {
  const Icon: LucideIcon = card.icon;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
      <Link
        to={card.to}
        className="no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={CARD_STYLE}
      >
        <span className="text-accent-bright" style={ICON_STYLE} aria-hidden="true">
          <Icon size={19} />
        </span>

        <span
          className="font-display font-medium uppercase text-accent-bright"
          style={{ fontSize: 11.5, letterSpacing: 2 }}
        >
          {card.label}
        </span>

        <h2
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(19px,1.7vw,22px)", lineHeight: 1.25 }}
        >
          {card.title}
        </h2>

        <p
          className="text-muted-portfolio"
          style={{ fontSize: 15, lineHeight: 1.65, textWrap: "pretty" }}
        >
          {card.description}
        </p>

        <span
          className="inline-flex items-center gap-1.5 font-display font-semibold text-accent-bright"
          style={{ fontSize: 14, marginTop: "auto" }}
        >
          Open
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}
