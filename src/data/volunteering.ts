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

export interface Volunteering {
  organisation: string;
  role: string;
  /** YYYY-MM. */
  start: string;
  /** YYYY-MM, or null while ongoing. */
  end: string | null;
  location?: string;
  description: string;
  highlights?: string[];
  url?: string;
}

export const VOLUNTEERING: Volunteering[] = [];

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
