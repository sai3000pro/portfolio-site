/**
 * Blog manifest.
 *
 * Hand-written — there is no CMS and no MDX pipeline. Add a post by appending an entry
 * here; the listing on /hobbies and the post page at /blog/<slug> both read from this
 * array, and `scripts/routes.mjs` derives the prerendered route + sitemap entry + OG
 * card from it automatically. Nothing else needs touching.
 *
 * `slug` is explicit rather than derived from the title so a post keeps its URL (and any
 * inbound links) if you later reword the headline.
 *
 * A post with an empty `body` is treated as a DRAFT: the listing shows it as
 * "Coming soon" and does not link anywhere, so an unwritten post can sit here safely
 * without shipping an empty page.
 */

export interface BlogPost {
  /** Stable URL segment. Never change it after a post is published. */
  slug: string;
  title: string;
  /** ISO date (YYYY-MM-DD) — used for ordering, <time>, and the sitemap. */
  date: string;
  /** One or two sentences for the listing card and the meta description. */
  excerpt: string;
  /**
   * The post itself, one string per paragraph. Leave empty while drafting.
   * Plain text: it renders as paragraphs, so no markup is needed or parsed.
   */
  body: string[];
  tags?: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "best-summer-yet",
    title: "Best Summer Yet",
    date: "2026-08-12",
    excerpt:
      "A look back at the summer — the people, the places, and what made it the best one so far.",
    tags: ["life", "summer"],
    // Draft: add paragraphs here and the post page + listing link light up on their own.
    body: [],
  },
];

/** Newest first — the order the listing and the sitemap should use. */
export function getSortedPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

/** A post is a draft until it has at least one paragraph of body copy. */
export function isDraft(post: BlogPost): boolean {
  return post.body.length === 0;
}

export function findPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/**
 * Rough reading time. 200 wpm is the usual desk-research figure; it is only ever
 * rendered as an approximation, so precision does not matter.
 */
export function readingMinutes(post: BlogPost): number {
  const words = post.body.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Human date for display, e.g. "12 August 2026". Deterministic across SSR/client. */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}
