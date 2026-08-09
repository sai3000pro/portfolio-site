/**
 * Achievement registry — the single source of truth for the trophy system.
 *
 * This file is pure data. To add achievement #37 you add one object here and
 * (if it needs a bespoke trigger) one `unlock()` / `trackMember()` call in the
 * component that already owns the interaction. Nothing else changes: the engine
 * in src/lib/achievements.ts evaluates every rule declaratively, and the UI is
 * driven entirely off this list.
 *
 * SSR SAFETY: no `window` / `document` anywhere. Member lists are derived from
 * src/data/portfolio.ts at module scope, which is plain data.
 *
 * DESIGN NOTES
 *   - `secret: true` badges render as a `???` silhouette until earned, leaking
 *     progressively sharper `clues` as overall completion rises. Give every
 *     secret exactly two clues: `clues[0]` vague, `clues[1]` nearly explicit.
 *   - `hint` is for NON-secret locked badges — it should read as an instruction.
 *   - `rarityHint` is the fallback shown when the stats endpoint is unconfigured
 *     or the sample size is too small to quote a real percentage.
 *   - Keep ids kebab-case and stable. They are persisted in localStorage and
 *     sent to the stats worker; renaming one orphans everybody's progress.
 */

import {
  ArrowUp,
  BookMarked,
  BookOpen,
  Bug,
  CalendarCheck,
  Camera,
  Clock,
  Command,
  Compass,
  Contact,
  Copy,
  Crown,
  FileText,
  Footprints,
  Gamepad2,
  Globe,
  Hand,
  Hourglass,
  Images,
  Keyboard,
  Link2,
  MapPinOff,
  MoonStar,
  Orbit,
  Printer,
  Rocket,
  Send,
  Sparkles,
  SpellCheck,
  Sun,
  Sunrise,
  Telescope,
  Timer,
  Trophy,
  Volleyball,
  type LucideIcon,
} from "lucide-react";

import { EXPERIENCES, PROJECTS } from "@/data/portfolio";
import { slugify } from "@/lib/slug";

/** Rarity tier. Drives badge ring styling, point value, and grid sort order. */
export type Tier = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Grouping used to keep a 36-badge grid readable. */
export type Category = "first-contact" | "explorer" | "tinkerer" | "deep-space" | "long-haul";

/**
 * How an achievement is satisfied. The engine re-evaluates every rule after any
 * state mutation, so a single `trackMember()` call can complete several at once.
 *
 *   event  — unlocked imperatively via `unlock(id)`. No stored progress.
 *   burst  — `target` hits within a rolling `windowMs`. Deliberately NOT
 *            persisted: "ten theme flips in thirty seconds" must mean one
 *            frantic burst, not ten calm flips spread over ten days.
 *   set    — a set of distinct members either covers `members` exactly, or (when
 *            `members` is omitted) simply reaches `target` distinct entries.
 *   days   — the visitor has been seen on `target` distinct calendar days.
 *   span   — `target` days have elapsed since the visitor's first ever visit.
 *   meta   — every other achievement in the registry is unlocked.
 */
export type Rule =
  | { kind: "event" }
  | { kind: "burst"; key: string; target: number; windowMs: number }
  | { kind: "set"; key: string; members?: readonly string[]; target?: number }
  | { kind: "days"; target: number }
  | { kind: "span"; target: number }
  | { kind: "meta" };

export interface Achievement {
  /** Stable kebab-case id. Persisted and reported — never rename. */
  id: string;
  name: string;
  /** Shown once earned. Past tense, states what the visitor actually did. */
  description: string;
  /** Shown while locked and not secret. Omit for secrets. */
  hint?: string;
  /** Secrets only: [vague, sharp] clues revealed as completion rises. */
  clues?: readonly [string, string];
  tier: Tier;
  category: Category;
  secret: boolean;
  icon: LucideIcon;
  /** Key into src/components/portfolio/achievement-art.tsx. Epic/Legendary only. */
  art?: string;
  /** Fallback rarity copy when live stats are unavailable. */
  rarityHint: string;
  rule: Rule;
}

// --- Tracking keys ---------------------------------------------------------
//
// Exported so call sites use a constant instead of a bare string. A typo in a
// tracking key fails silently, which is the worst possible failure mode here.

export const KEYS = {
  /** Home-page sections scrolled into view. */
  sections: "sections",
  /** Project slugs whose constellation modal has been opened. */
  projectModals: "project-modals",
  /** Project slugs whose /projects/<slug> case study has been read. */
  caseStudies: "case-studies",
  /** Company names whose experience modal has been opened. */
  experiences: "experiences",
  /** Distinct cities the experience globe has pinned. */
  globeCities: "globe-cities",
  /** Social labels ("GitHub", "LinkedIn") that have been clicked. */
  socials: "socials",
  /** Sports-ball tittle variants seen on the hero name. */
  tittles: "tittles",
  /** Photos opened in the photo wall lightbox. */
  photosViewed: "photos-viewed",
  /** Theme toggles — burst-tracked, in memory only. */
  themeFlips: "theme-flips",
  /** Nav logo clicks — burst-tracked, in memory only. */
  logoClicks: "logo-clicks",
} as const;

/**
 * The word printed in the console greeting by achievement-tracker.tsx. Typing it
 * into the ⌘K palette earns Inspector Gadget. Lives here, in the data layer, so
 * the printer and the matcher can never disagree.
 */
export const CONSOLE_CODE_WORD = "stardust";

/** Every home-page section id, in document order. Mirrors nav.tsx's SECTION_IDS. */
const SECTION_IDS = ["home", "about", "experience", "projects", "contact"] as const;

/** Project slugs, derived so adding a project automatically widens the goal. */
const PROJECT_SLUGS = PROJECTS.map((p) => slugify(p.title));

/** Distinct company names, derived from the experience timeline. */
const COMPANIES = [...new Set(EXPERIENCES.map((e) => e.company))];

/** Points per tier — pure flavour, but it makes the progress header feel earned. */
export const TIER_POINTS: Record<Tier, number> = {
  common: 10,
  uncommon: 20,
  rare: 40,
  epic: 75,
  legendary: 150,
};

/** Display order for tiers, rarest last. */
export const TIER_ORDER: readonly Tier[] = ["common", "uncommon", "rare", "epic", "legendary"];

/** Human labels + one-line blurbs for the category groups on /achievements. */
export const CATEGORY_META: Record<Category, { label: string; blurb: string }> = {
  "first-contact": { label: "First Contact", blurb: "The basics. Everyone gets these." },
  explorer: { label: "Explorer", blurb: "Cover the ground. See what's actually here." },
  tinkerer: { label: "Tinkerer", blurb: "Touch things. Most of them do something." },
  "deep-space": { label: "Deep Space", blurb: "Nobody is going to tell you where these are." },
  "long-haul": { label: "Long Haul", blurb: "These ones cost you time." },
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  // --- First Contact -------------------------------------------------------
  {
    id: "first-light",
    name: "First Light",
    description: "Arrived. The rest of the wall is up to you.",
    hint: "Load the site. You already did this.",
    tier: "common",
    category: "first-contact",
    secret: false,
    icon: Sunrise,
    rarityHint: "Everyone has this",
    rule: { kind: "event" },
  },
  {
    id: "let-there-be-light",
    name: "Let There Be Light",
    description: "Switched the site out of the dark. Bold choice.",
    hint: "Flip the theme toggle to light mode.",
    tier: "common",
    category: "first-contact",
    secret: false,
    icon: Sun,
    rarityHint: "Common",
    rule: { kind: "event" },
  },
  {
    id: "power-user",
    name: "Power User",
    description: "Opened the command palette instead of scrolling like a civilian.",
    hint: "Press ⌘K (or Ctrl+K).",
    tier: "common",
    category: "first-contact",
    secret: false,
    icon: Command,
    rarityHint: "Common",
    rule: { kind: "event" },
  },
  {
    id: "paper-trail",
    name: "Paper Trail",
    description: "Opened the résumé. The whole site is technically optional.",
    hint: "Open the résumé from anywhere on the site.",
    tier: "common",
    category: "first-contact",
    secret: false,
    icon: FileText,
    rarityHint: "Common",
    rule: { kind: "event" },
  },
  {
    id: "trophy-hunter",
    name: "Trophy Hunter",
    description: "Found the trophy room. Welcome — there are 35 more.",
    hint: "Visit the achievements page.",
    tier: "common",
    category: "first-contact",
    secret: false,
    icon: Trophy,
    rarityHint: "Common",
    rule: { kind: "event" },
  },

  // --- Explorer ------------------------------------------------------------
  {
    id: "full-orbit",
    name: "Full Orbit",
    description: "Scrolled past every section on the landing page.",
    hint: "Scroll through all five sections of the home page.",
    tier: "common",
    category: "explorer",
    secret: false,
    icon: Orbit,
    rarityHint: "Common",
    rule: { kind: "set", key: KEYS.sections, members: SECTION_IDS },
  },
  {
    id: "spacewalk",
    name: "Spacewalk",
    description: "Left the résumé behind and went looking at the photos.",
    hint: "Visit the Photography page.",
    tier: "common",
    category: "explorer",
    secret: false,
    icon: Footprints,
    rarityHint: "Common",
    rule: { kind: "event" },
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "Read a full project write-up instead of skimming the card.",
    hint: "Open any project's case-study page.",
    tier: "common",
    category: "explorer",
    secret: false,
    icon: BookOpen,
    rarityHint: "Common",
    rule: { kind: "set", key: KEYS.caseStudies, target: 1 },
  },
  {
    id: "deep-reader",
    name: "Deep Reader",
    description: "Read every single case study. All of them. Genuinely impressive.",
    hint: "Read the case study for every project.",
    tier: "rare",
    category: "explorer",
    secret: false,
    icon: BookMarked,
    rarityHint: "Rare",
    rule: { kind: "set", key: KEYS.caseStudies, members: PROJECT_SLUGS },
  },
  {
    id: "well-connected",
    name: "Well Connected",
    description: "Checked both the GitHub and the LinkedIn. Doing your homework.",
    hint: "Visit both the GitHub and LinkedIn links.",
    tier: "uncommon",
    category: "explorer",
    secret: false,
    icon: Link2,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.socials, members: ["GitHub", "LinkedIn"] },
  },
  {
    id: "time-traveller",
    name: "Time Traveller",
    description: "Opened every stop on the experience timeline.",
    hint: "Open the details for every role in the timeline.",
    tier: "uncommon",
    category: "explorer",
    secret: false,
    icon: Clock,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.experiences, members: COMPANIES },
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    description: "Watched the globe swing to three different cities.",
    hint: "See the globe pin three different locations.",
    tier: "uncommon",
    category: "explorer",
    secret: false,
    icon: Globe,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.globeCities, target: 3 },
  },
  {
    id: "star-charter",
    name: "Star Charter",
    description: "Opened every star in the project constellation.",
    hint: "Open every project in the constellation.",
    tier: "uncommon",
    category: "explorer",
    secret: false,
    icon: Compass,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.projectModals, members: PROJECT_SLUGS },
  },

  // --- Tinkerer ------------------------------------------------------------
  {
    id: "gravity-assist",
    name: "Gravity Assist",
    description: "Launched a project card across the screen. It is a physics engine, after all.",
    hint: "Fling a project card hard enough to make it fly.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Rocket,
    rarityHint: "Uncommon",
    rule: { kind: "event" },
  },
  {
    id: "shutterbug",
    name: "Shutterbug",
    description: "Opened a photo full-size on the photo wall.",
    hint: "Open a photo in the photo wall lightbox.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Camera,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.photosViewed, target: 1 },
  },
  {
    id: "gallery-crawl",
    name: "Gallery Crawl",
    description: "Flipped through fifteen photos. Someone is procrastinating.",
    hint: "View fifteen different photos in the lightbox.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Images,
    rarityHint: "Uncommon",
    rule: { kind: "set", key: KEYS.photosViewed, target: 15 },
  },
  {
    id: "elevator-pitch",
    name: "Elevator Pitch",
    description: "Took the shortcut back to the top.",
    hint: "Use the back-to-top button.",
    tier: "common",
    category: "tinkerer",
    secret: false,
    icon: ArrowUp,
    rarityHint: "Common",
    rule: { kind: "event" },
  },
  {
    id: "copy-that",
    name: "Copy That",
    description: "Copied the email address straight to your clipboard.",
    hint: "Copy the email address from the command palette.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Copy,
    rarityHint: "Uncommon",
    rule: { kind: "event" },
  },
  {
    id: "analog-backup",
    name: "Analog Backup",
    description: "Downloaded the contact card. Very organised of you.",
    hint: "Download the vCard from the contact section.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Contact,
    rarityHint: "Uncommon",
    rule: { kind: "event" },
  },
  {
    id: "dead-tree-format",
    name: "Dead Tree Format",
    description: "Sent the résumé to a printer. In this economy.",
    hint: "Print the résumé.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Printer,
    rarityHint: "Uncommon",
    rule: { kind: "event" },
  },
  {
    id: "cold-call",
    name: "Cold Call",
    description: "Actually sent a message. That one lands in a real inbox.",
    hint: "Send a message through the contact form.",
    tier: "uncommon",
    category: "tinkerer",
    secret: false,
    icon: Send,
    rarityHint: "Uncommon",
    rule: { kind: "event" },
  },
  {
    id: "keyboard-warrior",
    name: "Keyboard Warrior",
    description: "Ran a command palette action without ever touching the mouse.",
    hint: "Open the palette and run an action using only the keyboard.",
    tier: "rare",
    category: "tinkerer",
    secret: false,
    icon: Keyboard,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },

  // --- Deep Space (all secret) --------------------------------------------
  {
    id: "the-old-ways",
    name: "The Old Ways",
    description: "↑ ↑ ↓ ↓ ← → ← → B A. Some things never stop working.",
    clues: [
      "Muscle memory from a console you probably never owned.",
      "Ten keys, no clicks. It opens with two taps upward and lands on two letters.",
    ],
    tier: "epic",
    category: "deep-space",
    secret: true,
    icon: Gamepad2,
    art: "konami",
    rarityHint: "Epic",
    rule: { kind: "event" },
  },
  {
    id: "hat-trick",
    name: "Hat Trick",
    description: "Found all five balls hiding on the dot of the 'i'.",
    clues: [
      "One letter on this site is wearing something it shouldn't be.",
      "Hover the name in the hero. The tittle on the 'i' keeps changing sport.",
    ],
    tier: "rare",
    category: "deep-space",
    secret: true,
    icon: Volleyball,
    rarityHint: "Rare",
    rule: { kind: "set", key: KEYS.tittles, target: 5 },
  },
  {
    id: "stargazer",
    name: "Stargazer",
    description: "Sat perfectly still for three minutes and just watched the stars.",
    clues: [
      "Some visitors never look up. Fewer still stop moving.",
      "Do nothing on the home page for three whole minutes. The starfield is the reward.",
    ],
    tier: "rare",
    category: "deep-space",
    secret: true,
    icon: Telescope,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },
  {
    id: "dark-matter",
    name: "Dark Matter",
    description: "Flipped the theme ten times in thirty seconds. The toggle forgives you.",
    clues: [
      "There is one control on this site you can genuinely abuse.",
      "Hammer the light/dark switch ten times inside half a minute.",
    ],
    tier: "epic",
    category: "deep-space",
    secret: true,
    icon: MoonStar,
    art: "dark-matter",
    rarityHint: "Epic",
    rule: { kind: "burst", key: KEYS.themeFlips, target: 10, windowMs: 30_000 },
  },
  {
    id: "lost-in-space",
    name: "Lost in Space",
    description: "Found a page that doesn't exist. Congratulations?",
    clues: [
      "Not every address on this site goes somewhere.",
      "Type a URL that was never going to work and see what greets you.",
    ],
    tier: "rare",
    category: "deep-space",
    secret: true,
    icon: MapPinOff,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },
  {
    id: "inspector-gadget",
    name: "Inspector Gadget",
    description: "Read the console, found the word, and typed it back. Proper detective work.",
    clues: [
      "Developers leave notes for other developers in places users never look.",
      "Open DevTools, read the console greeting, then type what it gives you into ⌘K.",
    ],
    tier: "epic",
    category: "deep-space",
    secret: true,
    icon: Bug,
    art: "inspector",
    rarityHint: "Epic",
    rule: { kind: "event" },
  },
  {
    id: "spelling-bee",
    name: "Spelling Bee",
    description: "Reached the trophy room by misspelling it. The typo is load-bearing now.",
    clues: [
      "The word on this page's own URL is one people get wrong constantly.",
      "Try reaching this page with 'achievements' spelled the wrong way round: /acheivements.",
    ],
    tier: "epic",
    category: "deep-space",
    secret: true,
    icon: SpellCheck,
    art: "spelling-bee",
    rarityHint: "Epic",
    rule: { kind: "event" },
  },
  {
    id: "percussive-maintenance",
    name: "Percussive Maintenance",
    description: "Clicked the logo seven times to see if anything would happen. It did.",
    clues: [
      "When something doesn't respond, the traditional fix is to hit it repeatedly.",
      "Click the logo in the top-left seven times in a row.",
    ],
    tier: "epic",
    category: "deep-space",
    secret: true,
    icon: Hand,
    art: "percussive",
    rarityHint: "Epic",
    rule: { kind: "burst", key: KEYS.logoClicks, target: 7, windowMs: 4_000 },
  },

  // --- Long Haul -----------------------------------------------------------
  {
    id: "speedrun",
    name: "Speedrun",
    description: "Hit all five sections in under thirty seconds. Any% complete.",
    hint: "Reach every section of the home page in under thirty seconds.",
    tier: "rare",
    category: "long-haul",
    secret: false,
    icon: Timer,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },
  {
    id: "slow-burn",
    name: "Slow Burn",
    description: "Ten minutes in a single sitting. You're either thorough or stuck.",
    hint: "Spend ten minutes on the site in one visit.",
    tier: "rare",
    category: "long-haul",
    secret: false,
    icon: Hourglass,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },
  {
    id: "midnight-oil",
    name: "Burning the Midnight Oil",
    description: "Showed up between 2 and 4 in the morning. Go to sleep.",
    clues: [
      "This one has nothing to do with where you click.",
      "Come back at an hour no reasonable person is browsing portfolios.",
    ],
    tier: "rare",
    category: "long-haul",
    secret: true,
    icon: MoonStar,
    rarityHint: "Rare",
    rule: { kind: "event" },
  },
  {
    id: "regular",
    name: "Regular",
    description: "Came back on three separate days. This is basically a relationship.",
    hint: "Visit the site on three different days.",
    tier: "epic",
    category: "long-haul",
    secret: false,
    icon: CalendarCheck,
    art: "regular",
    rarityHint: "Epic",
    rule: { kind: "days", target: 3 },
  },
  {
    id: "long-distance",
    name: "Long Distance",
    description: "Returned a month after your first visit. Genuinely, thank you.",
    hint: "Come back thirty days after your first visit.",
    tier: "legendary",
    category: "long-haul",
    secret: false,
    icon: Sparkles,
    art: "long-distance",
    rarityHint: "Legendary",
    rule: { kind: "span", target: 30 },
  },
  {
    id: "completionist",
    name: "Completionist",
    description: "Every badge on the wall. There is nothing left to find.",
    hint: "Earn every other achievement.",
    tier: "legendary",
    category: "long-haul",
    secret: false,
    icon: Crown,
    art: "completionist",
    rarityHint: "Legendary",
    rule: { kind: "meta" },
  },
];

/** Fast id lookup. */
export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, Achievement> = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** Total number of achievements — used for progress and the clue thresholds. */
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

/** Every valid id. The stats worker uses the same list as its allowlist. */
export const ACHIEVEMENT_IDS: readonly string[] = ACHIEVEMENTS.map((a) => a.id);
