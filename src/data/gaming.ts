/**
 * The games shelf.
 *
 * Laid out as one turntable: every cover stands on a single round platter that spins, with
 * the game at the front full size and face-on and the rest receding around the circle.
 *
 * This is the third shape this data has taken, and the reasons are worth keeping because
 * they are what the next change has to beat.
 *
 * A row of CSS spines came first, their width encoding hours played. Nice trick, wrong
 * shape the moment there was real cover art: a spine hides the artwork by definition, and
 * the whole point of the publishers' covers is that people recognise them.
 *
 * Then a three-tier display stand, modelled on the stepped round table a library puts by
 * the door. It looked right in the sketch and wrong on the screen. Eight covers split
 * across three rings meant one ring of four, one of three and one of one, and a circle
 * with three things on it is mostly gaps — the stand read as scattered rather than
 * stocked. Depth was faked with scale and opacity, so the rings never actually looked
 * round. And the widest tier had a fixed 640px minimum, which on a phone became a
 * sideways-scrolling box showing half a shelf.
 *
 * One ring fixes all three at once: eight covers on a single circle have no gaps to speak
 * of, real CSS 3D (`perspective` + `preserve-3d`) makes the far side genuinely further
 * away rather than merely smaller, and the radius is a `clamp()` so the whole thing scales
 * down to a phone instead of overflowing it.
 *
 * ON THE COVER ART. Every image under public/assets/games/ is the publisher's, not ours.
 * They are the official current images — Steam's own library art for the five Steam
 * titles, the App Store artwork returned by the iTunes Search API for the three mobile
 * ones — rather than anything scraped off a fan wiki, so nobody is being misattributed and
 * nothing is out of date. Each carries its rights holder in `publisher`, which the
 * renderer puts into the image's alt text and title attribute, and the page states the
 * position in full underneath the shelf.
 *
 * Worth being straight about in the file that holds them: a credit line is not a licence,
 * and "for portfolio use" is not a legal exemption. What makes this ordinary rather than
 * risky is the shape of the use — a handful of thumbnails, on a personal page, naming
 * games actually played, each one linking to the publisher's own store page. If a
 * publisher ever objects the answer is to remove the image, and the shelf below is built
 * so that losing one costs nothing: `cover` is optional, and a book without it falls back
 * to the CSS spine this page shipped with.
 */
import type { GeneratedImageId } from "./images.generated";

export interface Game {
  title: string;
  /**
   * What the small text at the foot of the spine says when there is no playtime. Defaults
   * to "untracked", which is the truthful answer for a game that keeps no counter.
   */
  status?: string;
  /**
   * Hours played. `null` means the platform reports no figure — Minecraft is not on Steam
   * and keeps no counter worth quoting — and the caption says so rather than inventing one.
   */
  hours: number | null;
  /** Shown verbatim when the platform is more precise than a round number of hours. */
  hoursLabel?: string;
  url: string;
  /**
   * Official cover art, and who owns it. Optional as a pair: a game with no `cover` falls
   * back to the plain gradient spine, which is what the whole shelf looked like before the
   * art arrived and is why removing an image is a one-line change rather than a redesign.
   */
  cover?: string;
  coverId?: GeneratedImageId;
  /** Rights holder, named in the alt text and the notice under the shelf. */
  publisher?: string;
  /**
   * Gradient standing in for the cover when there is none, so a book with no art is still
   * a book on the stand rather than an empty rectangle.
   */
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
  cover: "assets/games/civ6.jpg",
  coverId: "civ6",
  publisher: "Firaxis Games / 2K",
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
    cover: "assets/games/genshin.jpg",
    coverId: "genshin",
    publisher: "HoYoverse",
    hours: 350,
    url: "https://genshin.hoyoverse.com/en/",
    spine: { from: "#5ec8dd", to: "#17505f", ink: "#f0fbfd" },
  },
  {
    title: "Railway Empire",
    cover: "assets/games/railway-empire.jpg",
    coverId: "railway-empire",
    publisher: "Gaming Minds Studios / Kalypso Media",
    hours: 150,
    url: "https://store.steampowered.com/app/503940/",
    spine: { from: "#c07a44", to: "#432414", ink: "#fbf1e8" },
  },
  {
    title: "Magic: The Gathering Arena",
    cover: "assets/games/mtg-arena.jpg",
    coverId: "mtg-arena",
    publisher: "Wizards of the Coast",
    hours: 200,
    url: "https://magic.wizards.com/en/mtgarena",
    spine: { from: "#8a4bb0", to: "#2d1040", ink: "#f7effc" },
  },
  {
    title: "Minecraft",
    cover: "assets/games/minecraft.jpg",
    coverId: "minecraft",
    publisher: "Mojang Studios",
    hours: null,
    url: "https://www.minecraft.net/",
    spine: { from: "#72ad55", to: "#2b431f", ink: "#f2fbee" },
  },
  {
    title: "Clash Royale",
    cover: "assets/games/clash-royale.jpg",
    coverId: "clash-royale",
    publisher: "Supercell",
    hours: 200,
    url: "https://supercell.com/en/games/clashroyale/",
    spine: { from: "#4a8ff0", to: "#16305e", ink: "#eef5ff" },
  },
  {
    title: "Frostpunk",
    cover: "assets/games/frostpunk.jpg",
    coverId: "frostpunk",
    publisher: "11 bit studios",
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
  cover: "assets/games/cities-skylines-2.jpg",
  coverId: "cities-skylines-2",
  publisher: "Colossal Order / Paradox Interactive",
  hours: null,
  url: "https://store.steampowered.com/app/949230/",
  spine: { from: "#94a2b1", to: "#2f3742", ink: "#f4f7fa" },
  status: "wishlist",
  note: "Next on the shelf.",
};

/**
 * Every game, in the order they stand on the turntable.
 *
 * The favourite leads because the ring opens with its first entry at the front, so this
 * array's head is also the page's opening image. `NEXT_UP` trails it round to the back for
 * the same reason in reverse: an unplayed game is the last thing the ring should offer.
 *
 * Derived rather than written out, so a game added to SHELF joins the ring automatically.
 * The three groups stay separate above because they mean different things — exactly one
 * favourite, some played, one wanted — and that is not a property an array can enforce.
 */
export const RING: Game[] = [FAVOURITE, ...SHELF, NEXT_UP];

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

/**
 * Every distinct rights holder on the shelf, for the notice underneath it.
 *
 * Deduplicated and sorted so the line is stable: derived from the data rather than written
 * out by hand, because a hardcoded list is exactly the kind of thing that silently stops
 * matching the shelf the first time a game is added.
 */
export function coverArtHolders(): string[] {
  const holders = [FAVOURITE, ...SHELF, NEXT_UP]
    .map((game) => game.publisher)
    .filter((p): p is string => Boolean(p));
  return [...new Set(holders)].sort((a, b) => a.localeCompare(b));
}
