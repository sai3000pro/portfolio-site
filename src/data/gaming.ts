/**
 * The games shelf.
 *
 * Rendered as a bookshelf rather than a grid of cover art, and that is a constraint as
 * much as a design choice: box art is the publisher's, not mine, so a wall of scraped
 * covers would be republishing someone else's work on a personal site. CSS spines owe
 * nobody anything, and they buy something a cover grid cannot — a spine has a *thickness*,
 * so the shelf can encode hours played in the one dimension a bookshelf already uses.
 *
 * That is the whole idea: the fat books are the ones I have actually lived in.
 */
export interface Game {
  title: string;
  /**
   * Shorter label for the spine, when the real title does not fit down the side of a book.
   * Real spines abbreviate for exactly this reason. `title` stays canonical and is what
   * the link's tooltip and accessible name use.
   */
  shelfTitle?: string;
  /**
   * What the small text at the foot of the spine says when there is no playtime. Defaults
   * to "untracked", which is the truthful answer for a game that keeps no counter.
   */
  status?: string;
  /**
   * Hours played, used for spine thickness. `null` means the platform does not report a
   * figure — Minecraft is not on Steam and keeps no counter worth quoting — and gets a
   * median spine rather than a guess.
   */
  hours: number | null;
  /** Shown verbatim when the platform is more precise than a round number of hours. */
  hoursLabel?: string;
  url: string;
  /** Spine gradient (top → bottom) and its text colour. */
  spine: { from: string; to: string; ink: string };
  /** One line on why it earns the shelf space. */
  note?: string;
}

/**
 * The face-out book in the middle of the shelf — the one a bookshop turns cover-forward.
 * Kept separate from the row rather than flagged inside it, because it renders as a
 * different shape entirely and "exactly one of these is featured" is not a property an
 * array can enforce.
 */
export const FAVOURITE: Game = {
  title: "Sid Meier's Civilization VI",
  hours: 400,
  hoursLabel: "399h 56m",
  url: "https://store.steampowered.com/app/289070/",
  spine: { from: "#e0aa4a", to: "#7a4a15", ink: "#fdf6e6" },
  note: "Four hundred hours of “one more turn”, and it has never once been one more turn.",
};

/**
 * The rest of the shelf, in the order they stand on it. Deliberately not sorted by hours:
 * a shelf sorted by thickness looks like a bar chart, and the point is that it looks like
 * a shelf. They are arranged so the thick ones do not all clump at one end.
 */
export const SHELF: Game[] = [
  {
    title: "Genshin Impact",
    hours: 400,
    url: "https://genshin.hoyoverse.com/en/",
    spine: { from: "#5ec8dd", to: "#17505f", ink: "#f0fbfd" },
  },
  {
    title: "Railway Empire",
    hours: 150,
    url: "https://store.steampowered.com/app/503940/",
    spine: { from: "#c07a44", to: "#432414", ink: "#fbf1e8" },
  },
  {
    title: "Magic: The Gathering Arena",
    shelfTitle: "MTG Arena",
    hours: 200,
    url: "https://magic.wizards.com/en/mtgarena",
    spine: { from: "#8a4bb0", to: "#2d1040", ink: "#f7effc" },
  },
  {
    title: "Minecraft",
    hours: null,
    url: "https://www.minecraft.net/",
    spine: { from: "#72ad55", to: "#2b431f", ink: "#f2fbee" },
    note: "No counter worth quoting — it predates caring about the number.",
  },
  {
    title: "Clash Royale",
    hours: 200,
    url: "https://supercell.com/en/games/clashroyale/",
    spine: { from: "#4a8ff0", to: "#16305e", ink: "#eef5ff" },
  },
  {
    title: "Frostpunk",
    hours: 40,
    url: "https://store.steampowered.com/app/323190/",
    spine: { from: "#8fb4d1", to: "#1f3243", ink: "#f2f8fc" },
  },
];

/**
 * Wanted, not played — so it leans at the end of the row the way an unshelved book does,
 * rather than standing in line pretending to be read.
 */
export const NEXT_UP: Game = {
  title: "Cities: Skylines II",
  hours: null,
  url: "https://store.steampowered.com/app/949230/",
  spine: { from: "#94a2b1", to: "#2f3742", ink: "#f4f7fa" },
  status: "wishlist",
  note: "Next on the shelf.",
};

/** Thinnest and thickest a spine is allowed to get, in px. */
const MIN_THICKNESS = 34;
const MAX_THICKNESS = 76;
/** Hours mapped to the full range. Anything at or above the top is equally thick. */
const HOURS_CEILING = 400;

/**
 * Spine thickness for a playtime.
 *
 * Square-rooted rather than linear: 400 hours is ten times 40, and a spine ten times wider
 * than its neighbour stops reading as a book and starts reading as a wall. The curve keeps
 * the ordering honest while compressing the top end, which is exactly what a real shelf
 * does — a 900-page novel is not ten times the width of a 90-page one.
 *
 * An unknown playtime lands in the middle of the range rather than at either end, so the
 * shelf never implies a number nobody has.
 */
export function spineThickness(hours: number | null): number {
  if (hours === null) return Math.round((MIN_THICKNESS + MAX_THICKNESS) / 2);
  const ratio = Math.sqrt(Math.min(hours, HOURS_CEILING) / HOURS_CEILING);
  return Math.round(MIN_THICKNESS + ratio * (MAX_THICKNESS - MIN_THICKNESS));
}

/** "399h 56m", "150 hours", or null when nothing is tracked. */
export function playtimeLabel(game: Game): string | null {
  if (game.hoursLabel) return game.hoursLabel;
  if (game.hours === null) return null;
  return `${game.hours} hours`;
}

/**
 * Total tracked hours across the shelf, already formatted, for the line under it.
 *
 * The grouping separator is hardcoded rather than left to `toLocaleString()`, which
 * formats against whatever locale the *runtime* defaults to. That is en-US in Node and
 * the visitor's own locale in the browser, so a reader in France would be served "1,390"
 * and then hydrate it to "1 390" — a mismatch React has to patch, over a number that is
 * the same in every language. Same reasoning as `formatMonth` in volunteering.ts.
 */
export function totalTrackedHoursLabel(): string {
  const total = [FAVOURITE, ...SHELF].reduce((sum, game) => sum + (game.hours ?? 0), 0);
  return String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
