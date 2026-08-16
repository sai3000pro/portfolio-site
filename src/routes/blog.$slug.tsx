import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import {
  findPost,
  formatPostDate,
  getSortedPosts,
  isDraft,
  readingMinutes,
  type BlogPost,
} from "@/data/blog";
import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";

/** Resolve a post and its neighbours (newest-first order, same as the listing). */
function resolveBySlug(slug: string): {
  post: BlogPost;
  prev: BlogPost | null;
  next: BlogPost | null;
} | null {
  const posts = getSortedPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  return {
    post: posts[index],
    // "prev" = the newer post, "next" = the older one, matching reading order.
    prev: index > 0 ? posts[index - 1] : null,
    next: index < posts.length - 1 ? posts[index + 1] : null,
  };
}

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const match = resolveBySlug(params.slug);
    if (!match) {
      const title = "Post not found — Saivenkat Jilla";
      return { meta: [{ title }, { property: "og:title", content: title }] };
    }
    const { post } = match;
    const title = `${post.title} — Saivenkat Jilla`;
    // Absolute + PNG, same rules as the case-study cards: scrapers ignore
    // base-relative og:image paths and reject SVG. scripts/seo.mjs generates this file.
    const ogImage = ogImageUrl(`blog-${post.slug}.png`);
    const canonical = absoluteUrl(`blog/${post.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: title },
        { property: "og:description", content: post.excerpt },
        { property: "og:image", content: ogImage },
        { property: "og:image:alt", content: `Social card for ${title}` },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { property: "article:published_time", content: post.date },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  loader: ({ params }) => {
    if (!resolveBySlug(params.slug)) throw notFound();
  },
  notFoundComponent: NotFound,
  component: Post,
});

const PAGE_CLASS = "relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={PAGE_CLASS}>
      <Starfield count={380} />
      <Nav />
      <main id="main-content" tabIndex={-1} className="relative" style={{ zIndex: 2 }}>
        {children}
      </main>
      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
}

const EYEBROW_STYLE: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 3,
  padding: "6px 14px",
  background: "var(--portfolio-surface-2)",
  border: "1px solid var(--portfolio-border)",
};

const BACK_LINK_CLASS =
  "inline-flex items-center gap-1.5 font-display font-medium text-muted-portfolio no-underline hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright";

function NotFound() {
  return (
    <Shell>
      <section
        className="mx-auto flex w-full flex-col items-center text-center"
        style={{ maxWidth: 720, padding: "clamp(120px,20vh,220px) clamp(24px,5vw,80px)" }}
      >
        <span
          className="font-display font-medium uppercase text-accent-bright rounded-full"
          style={EYEBROW_STYLE}
        >
          404
        </span>
        <h1
          className="font-display font-extrabold text-ink mt-5"
          style={{ fontSize: "clamp(30px,4.4vw,52px)", lineHeight: 1.05 }}
        >
          Post not found
        </h1>
        <p className="text-muted-portfolio mt-4" style={{ fontSize: 16, lineHeight: 1.7 }}>
          That post doesn&apos;t exist — it may have been renamed or moved.
        </p>
        <Link to="/blog" className={`${BACK_LINK_CLASS} mt-8`}>
          <ArrowLeft size={15} aria-hidden="true" />
          All posts
        </Link>
      </section>
    </Shell>
  );
}

function Post() {
  const { slug } = Route.useParams();
  const match = resolveBySlug(slug);
  if (!match) return <NotFound />;
  const { post, prev, next } = match;
  const draft = isDraft(post);

  return (
    <Shell>
      <article
        className="mx-auto w-full"
        style={{
          maxWidth: 760,
          padding: "clamp(112px,16vh,168px) clamp(24px,5vw,80px) clamp(48px,8vh,88px)",
        }}
      >
        <Link to="/blog" className={BACK_LINK_CLASS} style={{ fontSize: 14 }}>
          <ArrowLeft size={15} aria-hidden="true" />
          All posts
        </Link>

        <header style={{ marginTop: 24 }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <time
              dateTime={post.date}
              className="font-display text-accent-bright"
              style={{ fontSize: 13, letterSpacing: 0.5 }}
            >
              {formatPostDate(post.date)}
            </time>
            {!draft && (
              <span
                className="inline-flex items-center gap-1 text-muted-portfolio"
                style={{ fontSize: 13 }}
              >
                <Clock size={12.5} aria-hidden="true" />
                {readingMinutes(post)} min read
              </span>
            )}
          </div>

          <h1
            className="font-display font-extrabold text-ink"
            style={{
              marginTop: 14,
              fontSize: "clamp(30px,4.4vw,50px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
            }}
          >
            {post.title}
          </h1>

          <p
            className="text-muted-portfolio"
            style={{ marginTop: 16, fontSize: 17.5, lineHeight: 1.7, textWrap: "pretty" }}
          >
            {post.excerpt}
          </p>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-display rounded-full text-muted-portfolio capitalize"
                  style={{
                    fontSize: 11.5,
                    padding: "3px 10px",
                    background: "var(--portfolio-surface-2)",
                    border: "1px solid var(--portfolio-border)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div
          style={{
            marginTop: 32,
            paddingTop: 32,
            borderTop: "1px solid var(--portfolio-border)",
          }}
        >
          {draft ? (
            <p className="text-muted-portfolio" style={{ fontSize: 16.5, lineHeight: 1.8 }}>
              This one isn&apos;t written yet — check back soon.
            </p>
          ) : (
            <div className="flex flex-col" style={{ gap: 20 }}>
              {post.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-muted-portfolio"
                  style={{ fontSize: 17, lineHeight: 1.85, textWrap: "pretty" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {(prev || next) && (
          <nav
            aria-label="More posts"
            className="flex flex-wrap items-center justify-between gap-4"
            style={{
              marginTop: 48,
              paddingTop: 28,
              borderTop: "1px solid var(--portfolio-border)",
            }}
          >
            {prev ? (
              <Link
                to="/blog/$slug"
                params={{ slug: prev.slug }}
                className={BACK_LINK_CLASS}
                style={{ fontSize: 14.5 }}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to="/blog/$slug"
                params={{ slug: next.slug }}
                className={BACK_LINK_CLASS}
                style={{ fontSize: 14.5 }}
              >
                {next.title}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </nav>
        )}
      </article>
    </Shell>
  );
}
