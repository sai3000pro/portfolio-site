import { ExternalLink, MapPin } from "lucide-react";

import {
  formatPeriod,
  getVolunteeringGroups,
  getVolunteeringStats,
  type Volunteering,
  type VolunteeringGroup,
} from "@/data/volunteering";
import { imageAspect, responsiveImageProps } from "@/lib/assets";
import { Reveal, SectionHeading } from "./section";

/** Widest a logo plate is ever painted: cards cap at ~360px. */
const LOGO_SIZES = "220px";

/**
 * Plate height, and the mark's height inside it after padding.
 *
 * Both in pixels, and deliberately not `max-h-full`. That is what this started as, and
 * Chromium declined to resolve the percentage against the fixed-height grid area — the
 * square marks rendered at their full 287px and were sliced off by the plate's
 * `overflow: hidden`. A percentage that silently becomes `none` fails invisibly; a number
 * cannot. The two are defined together so the padding stays the difference between them.
 */
const LOGO_PLATE_H = 72;
const LOGO_PAD_Y = 12;
const LOGO_PAD_X = 16;
const LOGO_MARK_H = LOGO_PLATE_H - LOGO_PAD_Y * 2;

/**
 * Volunteering.
 *
 * PAGE-LEVEL CONTENT: this is the whole body of its own route, not a section in the
 * middle of one. It therefore inlines the wrapper rather than using <Section>, whose
 * clamp(70px,10vh,130px) top padding is mid-page rhythm and does not clear the 78px
 * fixed nav. `id="volunteering"` is preserved so existing hash links keep resolving.
 *
 * LAYOUT: grouped by organisation, deliberately unlike the experience timeline. Both
 * sections are "places I have been, in order", so given the same treatment they would
 * read as one list split across two pages. The experience section is role-first down a
 * single spine; this one makes the organisation the unit and nests roles inside it,
 * which is also the honest shape of the data — three of these roles are the same student
 * society, and a flat list would just say its name three times.
 *
 * WHY COLUMNS AND NOT GRID. This was a two-column CSS grid with `align-items: start`,
 * and it looked like a page with holes in it. Only two of the eight roles carry a
 * description, so card heights ran from 127px to 454px; put a 127px card beside a 454px
 * one in a grid row and you get 327px of nothing, twice over. Multi-column layout flows
 * each card into the shortest column instead of locking it to a row, which is exactly
 * the packing this data needs. It costs the reading order — columns read down, then
 * across — which is acceptable here because the cards are independent and the ordering
 * within a column is still most-recent-first.
 *
 * The rest of the empty space was inside the cards: an organisation name and one short
 * role title, floating in a 508px-wide box with its date pushed to the far right edge by
 * `justify-between`. Narrower columns and a date that sits under its role rather than
 * across the card from it close most of that, and the organisation's own mark gives the
 * header something to be.
 */
export function VolunteeringSection() {
  const groups = getVolunteeringGroups();
  const stats = getVolunteeringStats();

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
        <>
          <Reveal immediate delay={0.06}>
            <dl
              className="mx-auto grid text-center"
              style={{
                marginTop: "clamp(30px,4vh,46px)",
                maxWidth: 760,
                gap: "clamp(10px,1.5vw,18px)",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              }}
            >
              <Stat value={stats.organisations} label="organisations" />
              <Stat value={stats.roles} label={stats.roles === 1 ? "role" : "roles"} />
              <Stat value={stats.ongoing} label="ongoing today" />
              <Stat value={stats.since} label="since" />
            </dl>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="volunteering-columns" style={{ marginTop: "clamp(30px,4vh,46px)" }}>
              {groups.map((group) => (
                <OrganisationCard key={group.organisation} group={group} />
              ))}
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}

/** One figure in the summary strip. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-xl"
      style={{
        padding: "14px 10px 12px",
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      <dt className="sr-only">{label}</dt>
      <dd
        className="font-display text-accent-bright"
        style={{ fontSize: "clamp(24px,3.2vw,32px)", fontWeight: 800, lineHeight: 1 }}
      >
        {value}
      </dd>
      <p
        className="text-muted-portfolio font-display"
        style={{ fontSize: 11.5, letterSpacing: 0.6, marginTop: 6, textTransform: "uppercase" }}
      >
        {label}
      </p>
    </div>
  );
}

function OrganisationCard({ group }: { group: VolunteeringGroup }) {
  const multi = group.roles.length > 1;

  return (
    <article
      className="volunteering-card rounded-2xl"
      style={{
        padding: "clamp(16px,1.8vw,20px)",
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      {group.logo && (
        <div
          className="grid place-items-center overflow-hidden rounded-xl"
          style={{
            // Sized to the mark, not to the card: a square logo gets a square plate
            // rather than sitting as a small badge in the middle of a card-wide field.
            width: Math.round(LOGO_MARK_H * (imageAspect(group.logo.id) ?? 3)) + LOGO_PAD_X * 2,
            maxWidth: "100%",
            height: LOGO_PLATE_H,
            marginBottom: 14,
            padding: `${LOGO_PAD_Y}px ${LOGO_PAD_X}px`,
            background: group.logo.plate === "light" ? "#ffffff" : "#11171c",
            border: `1px solid ${
              group.logo.plate === "light" ? "rgba(15,23,42,0.16)" : "rgba(255,255,255,0.10)"
            }`,
            boxShadow: group.logo.plate === "light" ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
          }}
        >
          <img
            {...responsiveImageProps(group.logo.src, group.logo.id, LOGO_SIZES)}
            alt={`${group.organisation} logo`}
            title={`${group.organisation} — logo reproduced to identify the organisation`}
            loading="lazy"
            className="object-contain"
            // Fill the padded box and let object-fit letterbox the artwork inside it.
            // Sizing the element from the image's own dimensions is what broke: it makes
            // containment depend on a percentage max-height resolving, and when that
            // fails there is no second line of defence. This way the element's box is
            // always exactly the plate, whatever shape the mark is.
            style={{ width: "100%", height: LOGO_MARK_H }}
          />
        </div>
      )}

      <header>
        {group.url ? (
          <a
            href={group.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-ink hover:text-accent-bright focus-visible:ring-accent-bright inline-flex items-baseline gap-1.5 font-bold no-underline transition-colors focus-visible:ring-2 focus-visible:outline-none"
            style={{ fontSize: 16.5, lineHeight: 1.3, textWrap: "balance" }}
          >
            {group.organisation}
            <ExternalLink size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
          </a>
        ) : (
          <h3
            className="font-display text-ink font-bold"
            style={{ fontSize: 16.5, lineHeight: 1.3, textWrap: "balance" }}
          >
            {group.organisation}
          </h3>
        )}

        <div
          className="text-muted-portfolio mt-1.5 flex flex-wrap items-center"
          style={{ fontSize: 12.5, gap: "4px 10px" }}
        >
          {group.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} aria-hidden="true" />
              {group.location}
            </span>
          )}
          {/* Only when it is telling you something you cannot see at a glance. A card
              with one role does not need to announce that it has one role. */}
          {multi && <span>{group.roles.length} roles</span>}
        </div>
      </header>

      {/* The rail is what carries "more than one role here" without a heading saying so.
          A single-role card gets it too, so cards line up rather than one starting 13px
          to the left of its neighbour. */}
      <ol
        className="mt-4 flex flex-col"
        style={{
          gap: 14,
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
          top: "0.4em",
          width: 10,
          height: 10,
          borderRadius: "9999px",
          background: ongoing ? "var(--portfolio-accent-bright)" : "var(--portfolio-surface-2)",
          border: `1px solid ${ongoing ? "transparent" : "var(--portfolio-border-strong)"}`,
          boxShadow: ongoing ? "0 0 9px 1px var(--portfolio-accent-bright)" : "none",
        }}
      />

      {/* Stacked, not spread. `justify-between` across a 500px card left a canyon between
          a four-word role and its dates; under the title the two read as one unit. */}
      <h4 className="font-display text-ink font-semibold" style={{ fontSize: 14.5 }}>
        {role.role}
      </h4>
      <p
        className="font-display"
        style={{
          fontSize: 12,
          letterSpacing: 0.3,
          marginTop: 2,
          color: ongoing ? "var(--portfolio-accent-bright)" : "var(--portfolio-muted)",
        }}
      >
        {formatPeriod(role)}
      </p>

      {/* Both optional. A role with neither renders as its title and dates alone, which is
          the whole reason `description` is optional — see the note in volunteering.ts. */}
      {role.description && (
        <p
          className="text-muted-portfolio mt-2"
          style={{ fontSize: 13.5, lineHeight: 1.6, textWrap: "pretty" }}
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
              style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 14, position: "relative" }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: "0.6em",
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
