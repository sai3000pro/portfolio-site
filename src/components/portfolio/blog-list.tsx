import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";

import {
  formatPostDate,
  getSortedPosts,
  isDraft,
  readingMinutes,
  type BlogPost,
} from "@/data/blog";
import { Reveal, SectionHeading } from "./section";

/**
 * Cards assumed to be above the fold on a dedicated route. The grid is
 * `minmax(300px, 1fr)`, so a 1180px column fits three — take that as the first row and
 * reveal it on mount rather than on scroll.
 */
const FIRST_ROW_MAX = 3;

/**
 * Blog listing.
 *
 * A drafted post (empty `body`) renders as a non-interactive card marked "Coming soon"
 * instead of linking to an empty page — so a title can sit here while the writing
 * happens, without shipping a dead link or a blank route.
 *
 * PAGE-LEVEL CONTENT: this is the whole body of its own route, not a section in the
 * middle of one. It therefore inlines the wrapper rather than using <Section>, whose
 * clamp(70px,10vh,130px) top padding is mid-page rhythm and does not clear the 78px
 * fixed nav. The padding below is the dedicated-route figure already used by
 * blog.$slug.tsx and hobby-belts.tsx's static gallery. `id="blog"` is preserved —
 * blog.$slug.tsx still deep-links to it.
 */
export function BlogList() {
  const posts = getSortedPosts();

  return (
    <section
      id="blog"
      className="relative mx-auto w-full scroll-mt-24"
      style={{
        maxWidth: 1180,
        padding: "clamp(112px,16vh,168px) clamp(24px,5vw,80px) clamp(48px,8vh,88px)",
      }}
    >
      {/* `as="h1" immediate`: on its own route this is the page's primary title AND it
          loads above the fold, where Reveal's default whileInView trigger would wait
          for a scroll that never comes and leave it at opacity 0. */}
      <SectionHeading eyebrow="Writing" title="Blog" as="h1" immediate />

      {posts.length === 0 ? (
        <Reveal>
          <p
            className="text-muted-portfolio text-center"
            style={{ marginTop: "clamp(28px,4vh,44px)", fontSize: 16 }}
          >
            First post is on its way.
          </p>
        </Reveal>
      ) : (
        <div
          className="grid"
          style={{
            marginTop: "clamp(36px,5vh,56px)",
            gap: "clamp(16px,2vw,22px)",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {posts.map((post, i) => (
            // Same reasoning as the heading: on a dedicated route the first row of cards
            // is above the fold, so the default whileInView trigger would strand it at
            // opacity 0. The first row is `immediate`; anything past it keeps the
            // scroll-triggered reveal, which is what makes a long list feel alive.
            <Reveal key={post.slug} delay={Math.min(i * 0.06, 0.3)} immediate={i < FIRST_ROW_MAX}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

const CARD_STYLE: React.CSSProperties = {
  padding: "clamp(20px,2.4vw,26px)",
  borderRadius: 18,
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

function PostCard({ post }: { post: BlogPost }) {
  const draft = isDraft(post);

  const inner = (
    <>
      <div className="flex items-center gap-2.5 flex-wrap">
        <time
          dateTime={post.date}
          className="font-display text-accent-bright"
          style={{ fontSize: 12.5, letterSpacing: 0.6 }}
        >
          {formatPostDate(post.date)}
        </time>
        {!draft && (
          <span
            className="inline-flex items-center gap-1 text-muted-portfolio"
            style={{ fontSize: 12.5 }}
          >
            <Clock size={12} aria-hidden="true" />
            {readingMinutes(post)} min read
          </span>
        )}
        {draft && (
          <span
            className="font-display rounded-full text-muted-portfolio"
            style={{
              fontSize: 11,
              padding: "3px 9px",
              background: "var(--portfolio-surface-2)",
              border: "1px solid var(--portfolio-border)",
            }}
          >
            Coming soon
          </span>
        )}
      </div>

      <h3
        className="font-display font-bold text-ink"
        style={{ fontSize: "clamp(19px,1.7vw,22px)", lineHeight: 1.25 }}
      >
        {post.title}
      </h3>

      <p
        className="text-muted-portfolio"
        style={{ fontSize: 15, lineHeight: 1.65, textWrap: "pretty" }}
      >
        {post.excerpt}
      </p>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: "auto" }}>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="font-display rounded-full text-muted-portfolio capitalize"
              style={{
                fontSize: 11,
                padding: "3px 9px",
                background: "var(--portfolio-surface-2)",
                border: "1px solid var(--portfolio-border)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {!draft && (
        <span
          className="inline-flex items-center gap-1.5 font-display font-semibold text-accent-bright"
          style={{ fontSize: 14, marginTop: post.tags?.length ? 4 : "auto" }}
        >
          Read post
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      )}
    </>
  );

  // Drafts are not links: there is nothing to read yet.
  if (draft) {
    return (
      <div style={CARD_STYLE} aria-label={`${post.title} — coming soon`}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
        style={{ ...CARD_STYLE, textDecoration: "none" }}
      >
        {inner}
      </Link>
    </motion.div>
  );
}
