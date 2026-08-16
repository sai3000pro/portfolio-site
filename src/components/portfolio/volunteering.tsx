import { ExternalLink, MapPin } from "lucide-react";

import { formatPeriod, getSortedVolunteering, type Volunteering } from "@/data/volunteering";
import { Reveal, SectionHeading } from "./section";

/**
 * Volunteering timeline.
 *
 * Renders a quiet empty state while src/data/volunteering.ts has no entries, so the
 * section can ship before the content exists without looking broken.
 *
 * PAGE-LEVEL CONTENT: this is the whole body of its own route, not a section in the
 * middle of one. It therefore inlines the wrapper rather than using <Section>, whose
 * clamp(70px,10vh,130px) top padding is mid-page rhythm and does not clear the 78px
 * fixed nav. The padding below is the dedicated-route figure already used by
 * blog.$slug.tsx and hobby-belts.tsx's static gallery. `id="volunteering"` is
 * preserved so existing hash links keep resolving.
 */
export function VolunteeringSection() {
  const entries = getSortedVolunteering();

  return (
    <section
      id="volunteering"
      className="relative mx-auto w-full scroll-mt-24"
      style={{
        maxWidth: 1180,
        padding: "clamp(112px,16vh,168px) clamp(24px,5vw,80px) clamp(48px,8vh,88px)",
      }}
    >
      {/* `as="h1" immediate`: on its own route this is the page's primary title AND it
          loads above the fold, where Reveal's default whileInView trigger would wait
          for a scroll that never comes and leave it at opacity 0. */}
      <SectionHeading eyebrow="Giving back" title="Volunteering" as="h1" immediate />

      {entries.length === 0 ? (
        // Same reason as the heading: with VOLUNTEERING empty this paragraph is the
        // entire body of the route, so it is above the fold too.
        <Reveal immediate>
          <p
            className="text-muted-portfolio text-center"
            style={{ marginTop: "clamp(28px,4vh,44px)", fontSize: 16 }}
          >
            Coming soon.
          </p>
        </Reveal>
      ) : (
        <div
          className="flex flex-col"
          style={{ marginTop: "clamp(36px,5vh,56px)", gap: "clamp(14px,1.8vw,20px)" }}
        >
          {entries.map((entry, i) => (
            <Reveal key={`${entry.organisation}-${entry.start}`} delay={Math.min(i * 0.06, 0.3)}>
              <VolunteeringCard entry={entry} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function VolunteeringCard({ entry }: { entry: Volunteering }) {
  return (
    <article
      style={{
        padding: "clamp(20px,2.4vw,28px)",
        borderRadius: 18,
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h3
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(18px,1.6vw,21px)" }}
        >
          {entry.role}
        </h3>
        <span
          className="font-display text-accent-bright"
          style={{ fontSize: 13, letterSpacing: 0.4 }}
        >
          {formatPeriod(entry)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-display font-medium text-ink no-underline hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={{ fontSize: 15 }}
          >
            {entry.organisation}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <span className="font-display font-medium text-ink" style={{ fontSize: 15 }}>
            {entry.organisation}
          </span>
        )}

        {entry.location && (
          <span
            className="inline-flex items-center gap-1 text-muted-portfolio"
            style={{ fontSize: 13.5 }}
          >
            <MapPin size={12} aria-hidden="true" />
            {entry.location}
          </span>
        )}
      </div>

      <p
        className="mt-3 text-muted-portfolio"
        style={{ fontSize: 15.5, lineHeight: 1.7, textWrap: "pretty" }}
      >
        {entry.description}
      </p>

      {entry.highlights && entry.highlights.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {entry.highlights.map((h) => (
            <li
              key={h}
              className="text-muted-portfolio"
              style={{ fontSize: 14.5, lineHeight: 1.6, paddingLeft: 16, position: "relative" }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "0.6em",
                  width: 5,
                  height: 5,
                  borderRadius: "9999px",
                  background: "var(--portfolio-accent-bright)",
                }}
              />
              {h}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
