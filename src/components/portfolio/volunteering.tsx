import { ExternalLink, MapPin } from "lucide-react";

import { formatPeriod, getSortedVolunteering, type Volunteering } from "@/data/volunteering";
import { Reveal, Section, SectionHeading } from "./section";

/**
 * Volunteering timeline.
 *
 * Renders a quiet empty state while src/data/volunteering.ts has no entries, so the
 * section can ship before the content exists without looking broken.
 */
export function VolunteeringSection() {
  const entries = getSortedVolunteering();

  return (
    <Section id="volunteering">
      <SectionHeading eyebrow="Giving back" title="Volunteering" />

      {entries.length === 0 ? (
        <Reveal>
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
    </Section>
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
