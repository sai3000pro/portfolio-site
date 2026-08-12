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
import { Reveal, Section, SectionHeading } from "./section";

/**
 * Blog listing.
 *
 * A drafted post (empty `body`) renders as a non-interactive card marked "Coming soon"
 * instead of linking to an empty page — so a title can sit here while the writing
 * happens, without shipping a dead link or a blank route.
 */
export function BlogList() {
  const posts = getSortedPosts();

  return (
    <Section id="blog">
      <SectionHeading eyebrow="Writing" title="Blog" />

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
            <Reveal key={post.slug} delay={Math.min(i * 0.06, 0.3)}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      )}
    </Section>
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
