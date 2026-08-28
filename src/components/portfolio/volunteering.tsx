import { ExternalLink, MapPin } from "lucide-react";

import {
  formatPeriod,
  getVolunteeringGroups,
  type Volunteering,
  type VolunteeringGroup,
} from "@/data/volunteering";
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
 *
 * LAYOUT: grouped by organisation, deliberately unlike the experience timeline. Both
 * sections are "places I have been, in order", so given the same treatment they would
 * read as one list split across two pages. The experience section is role-first down a
 * single spine; this one makes the organisation the unit and nests roles inside it, which
 * is also the honest shape of the data — three of these roles are the same student
 * society, and a flat list would just say its name three times.
 */
export function VolunteeringSection() {
  const groups = getVolunteeringGroups();

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

      {groups.length === 0 ? (
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
          className="grid"
          style={{
            marginTop: "clamp(36px,5vh,56px)",
            gap: "clamp(14px,1.8vw,20px)",
            // Two columns once there is room, one below. `auto-fit` rather than
            // `auto-fill` so a lone trailing card spans the row instead of leaving a
            // visible gap beside it.
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
            alignItems: "start",
          }}
        >
          {groups.map((group, i) => (
            // The first two are above the fold at desktop widths, so they cannot wait for
            // a scroll; the rest reveal normally as the column comes into view.
            <Reveal key={group.organisation} immediate={i < 2} delay={Math.min(i * 0.06, 0.3)}>
              <OrganisationCard group={group} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function OrganisationCard({ group }: { group: VolunteeringGroup }) {
  return (
    <article
      className="h-full"
      style={{
        padding: "clamp(20px,2.4vw,28px)",
        borderRadius: 18,
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      <header>
        {group.url ? (
          <a
            href={group.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-baseline gap-1.5 font-display font-bold text-ink no-underline hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={{ fontSize: "clamp(17px,1.5vw,20px)", textWrap: "balance" }}
          >
            {group.organisation}
            <ExternalLink size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
          </a>
        ) : (
          <h3
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(17px,1.5vw,20px)", textWrap: "balance" }}
          >
            {group.organisation}
          </h3>
        )}

        {group.location && (
          <p
            className="mt-1 inline-flex items-center gap-1 text-muted-portfolio"
            style={{ fontSize: 13 }}
          >
            <MapPin size={12} aria-hidden="true" />
            {group.location}
          </p>
        )}
      </header>

      {/* The rail is what carries "more than one role here" without a heading saying so.
          A single-role card gets it too, so cards in a row line up rather than one
          starting 13px to the left of its neighbour. */}
      <ol
        className="mt-4 flex flex-col"
        style={{
          gap: 18,
          paddingLeft: 15,
          borderLeft: "1px solid var(--portfolio-border-strong)",
        }}
      >
        {group.roles.map((role) => (
          <RoleEntry key={`${role.role}-${role.start}`} role={role} />
        ))}
      </ol>
    </article>
  );
}

function RoleEntry({ role }: { role: Volunteering }) {
  const ongoing = role.end === null;

  return (
    <li style={{ position: "relative" }}>
      {/* Sits on the rail, not beside it: -21px is the 15px padding plus the 1px border
          plus half the 10px dot. An ongoing role gets the accent and a glow, so "what am
          I doing now" is answerable from across the page. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -21,
          top: "0.45em",
          width: 10,
          height: 10,
          borderRadius: "9999px",
          background: ongoing ? "var(--portfolio-accent-bright)" : "var(--portfolio-surface-2)",
          border: `1px solid ${ongoing ? "transparent" : "var(--portfolio-border-strong)"}`,
          boxShadow: ongoing ? "0 0 9px 1px var(--portfolio-accent-bright)" : "none",
        }}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h4 className="font-display font-semibold text-ink" style={{ fontSize: 15.5 }}>
          {role.role}
        </h4>
        <span
          className="font-display"
          style={{
            fontSize: 12.5,
            letterSpacing: 0.3,
            color: ongoing ? "var(--portfolio-accent-bright)" : "var(--portfolio-muted)",
          }}
        >
          {formatPeriod(role)}
        </span>
      </div>

      {/* Both optional. A role with neither renders as its title and dates alone, which is
          the whole reason `description` is optional — see the note in volunteering.ts. */}
      {role.description && (
        <p
          className="mt-1.5 text-muted-portfolio"
          style={{ fontSize: 14.5, lineHeight: 1.65, textWrap: "pretty" }}
        >
          {role.description}
        </p>
      )}

      {role.highlights && role.highlights.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {role.highlights.map((h) => (
            <li
              key={h}
              className="text-muted-portfolio"
              style={{ fontSize: 13.5, lineHeight: 1.6, paddingLeft: 14, position: "relative" }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "0.62em",
                  width: 4,
                  height: 4,
                  borderRadius: "9999px",
                  background: "var(--portfolio-accent-bright)",
                  opacity: 0.75,
                }}
              />
              {h}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
