/**
 * Volunteering manifest.
 *
 * Deliberately EMPTY rather than pre-filled: these are real-world claims about a real
 * person, so placeholder organisations and invented roles have no business shipping —
 * even temporarily. The section renders a quiet empty state until you add entries, so
 * nothing looks broken in the meantime.
 *
 * To add one, copy the shape below into the array:
 *
 *   {
 *     organisation: "Waterloo Food Bank",
 *     role: "Volunteer Coordinator",
 *     start: "2025-05",              // YYYY-MM
 *     end: null,                     // null = ongoing ("Present")
 *     location: "Waterloo, ON",
 *     description: "One or two sentences on what you actually did and its impact.",
 *     highlights: ["Optional bullet", "Another bullet"],
 *     url: "https://example.org",    // optional link to the organisation
 *   }
 */

import type { GeneratedImageId } from "./images.generated";

export interface Volunteering {
  organisation: string;
  role: string;
  /** YYYY-MM. */
  start: string;
  /** YYYY-MM, or null while ongoing. */
  end: string | null;
  location?: string;
  /**
   * Optional, and that is the point: several of these roles are elected positions with no
   * write-up anywhere, and the alternative to an empty field is inventing duties for a
   * real person on a real résumé. A role with a title, an organisation and a date range
   * is already a true and useful claim; the card renders it without a paragraph.
   */
  description?: string;
  highlights?: string[];
  url?: string;
  /**
   * The organisation's own mark. Same posture as the experience logos: somebody else's
   * registered mark, trimmed of whitespace and otherwise untouched, used to identify
   * where the work happened. `organisation` above is the rights holder, so there is no
   * separate owner field to keep in sync — the alt text is built from it.
   *
   * `plate` is the background the artwork was drawn for, not the page theme. Every mark
   * here happens to be dark ink, but the field stays explicit so the first white-ink one
   * added does not quietly disappear into a white card.
   */
  logo?: { src: string; id?: GeneratedImageId; plate: "light" | "dark" };
}

export const VOLUNTEERING: Volunteering[] = [
  {
    organisation: "Holland Bloorview Kids Rehabilitation Hospital",
    logo: { src: "assets/logos/holland-bloorview.png", id: "holland-bloorview", plate: "light" },
    role: "Therapeutic Recreation Volunteer",
    start: "2023-06",
    end: null,
    location: "Toronto, ON",
    description:
      "Worked closely with Therapeutic Recreation staff to engage patients in activities designed to support physical and social rehabilitation.",
    highlights: [
      "Provided one-on-one support and led group activities, including a paper-plane-making event for over 100 clients and their families as part of the Robotics program.",
      "Facilitated play-based learning in the Therapeutic Playroom, assisted with event programming, and offered bedside support to patients recovering from brain and orthopedic injuries.",
      "Demonstrated swimming skills in the Aquatics program, contributing to clients' overall rehabilitation and well-being.",
    ],
    url: "https://hollandbloorview.ca",
  },
  {
    organisation: "Mathematics Society, University of Waterloo",
    logo: { src: "assets/logos/mathsoc.png", id: "mathsoc", plate: "light" },
    role: "Director",
    start: "2024-09",
    end: null,
    location: "Waterloo, ON",
    url: "https://mathsoc.uwaterloo.ca",
  },
  {
    organisation: "Mathematics Society, University of Waterloo",
    logo: { src: "assets/logos/mathsoc.png", id: "mathsoc", plate: "light" },
    role: "Computer Science Representative",
    start: "2024-09",
    end: null,
    location: "Waterloo, ON",
    url: "https://mathsoc.uwaterloo.ca",
  },
  {
    organisation: "Mathematics Society, University of Waterloo",
    logo: { src: "assets/logos/mathsoc.png", id: "mathsoc", plate: "light" },
    role: "At-Large Representative",
    start: "2024-05",
    end: "2024-08",
    location: "Waterloo, ON",
    url: "https://mathsoc.uwaterloo.ca",
  },
  {
    organisation: "University of Waterloo",
    logo: { src: "assets/logos/waterloo.png", id: "waterloo", plate: "light" },
    role: "Math Orientation Director",
    start: "2024-04",
    end: null,
    location: "Waterloo, ON",
    description:
      "Served as a Devisor, Tie Guard and Black Tie across first-year orientation — planning the events, running them through the week, and manning the help desk.",
    url: "https://uwaterloo.ca",
  },
  {
    organisation: "Mathematics Endowment Fund, University of Waterloo",
    logo: { src: "assets/logos/waterloo.png", id: "waterloo", plate: "light" },
    role: "First Year Representative",
    start: "2024-01",
    end: "2024-04",
    location: "Waterloo, ON",
    url: "https://uwaterloo.ca/math-endowment-fund/",
  },
  {
    organisation: "JAMHacks",
    logo: { src: "assets/logos/jamhacks.png", id: "jamhacks", plate: "light" },
    role: "JAMHacks 7 Volunteer",
    start: "2023-06",
    end: "2023-06",
    location: "Waterloo, ON",
    url: "https://jamhacks.ca",
  },
  {
    organisation: "Toronto Public Library",
    logo: {
      src: "assets/logos/toronto-public-library.png",
      id: "toronto-public-library",
      plate: "light",
    },
    role: "Leading to Reading Program Mentor",
    start: "2021-02",
    end: "2022-06",
    location: "Toronto, ON",
    url: "https://www.torontopubliclibrary.ca",
  },
];

/**
 * The same entries, grouped by organisation.
 *
 * The page groups rather than listing flat because four of these roles are at two
 * institutions, and a flat reverse-chronological list renders "Mathematics Society" three
 * times in a column — which reads as repetition rather than as a progression through an
 * organisation. Grouping also gives the section a shape the experience timeline does not
 * have, which is the point: it is a different kind of history and should not look like a
 * second copy of the résumé.
 *
 * Groups are ordered by their most recent role, and roles within a group keep
 * getSortedVolunteering()'s order, so "currently a Director" sits above "was an At-Large
 * Representative" without either list needing its own sort.
 */
export interface VolunteeringGroup {
  organisation: string;
  url?: string;
  location?: string;
  logo?: Volunteering["logo"];
  roles: Volunteering[];
}

export function getVolunteeringGroups(): VolunteeringGroup[] {
  const groups = new Map<string, VolunteeringGroup>();
  for (const entry of getSortedVolunteering()) {
    const existing = groups.get(entry.organisation);
    if (existing) {
      existing.roles.push(entry);
    } else {
      groups.set(entry.organisation, {
        organisation: entry.organisation,
        url: entry.url,
        location: entry.location,
        logo: entry.logo,
        roles: [entry],
      });
    }
  }
  return [...groups.values()];
}

/** Most recent first. Ongoing roles (end === null) sort above finished ones. */
export function getSortedVolunteering(): Volunteering[] {
  return [...VOLUNTEERING].sort((a, b) => {
    if (a.end === null && b.end !== null) return -1;
    if (b.end === null && a.end !== null) return 1;
    return b.start.localeCompare(a.start);
  });
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "May 2025" from "2025-05". Deterministic, so SSR and client agree. */
function formatMonth(value: string): string {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "May 2025 — Present" / "May 2024 — Aug 2024". */
export function formatPeriod(entry: Volunteering): string {
  return `${formatMonth(entry.start)} — ${entry.end ? formatMonth(entry.end) : "Present"}`;
}

/**
 * The three figures across the top of the page.
 *
 * Every one is counted from VOLUNTEERING rather than typed out, which is the only reason
 * a summary like this is worth having: a hand-written "6 organisations" is a claim that
 * silently goes stale the first time a seventh is added, and nobody ever remembers to
 * update the number that is furthest from the data.
 *
 * `since` is the earliest start year, not a duration, so the line never has to be
 * recomputed against today's date — which would also make it non-deterministic between
 * the prerender and the browser.
 */
export interface VolunteeringStats {
  organisations: number;
  roles: number;
  since: number;
}

export function getVolunteeringStats(): VolunteeringStats {
  const years = VOLUNTEERING.map((entry) => Number(entry.start.slice(0, 4))).filter(Boolean);
  return {
    organisations: new Set(VOLUNTEERING.map((entry) => entry.organisation)).size,
    roles: VOLUNTEERING.length,
    since: years.length ? Math.min(...years) : new Date().getFullYear(),
  };
}
