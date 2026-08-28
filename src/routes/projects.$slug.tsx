import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, Github, GitFork, Star } from "lucide-react";

import { PROJECTS, type Project } from "@/data/portfolio";
import { GENERATED_IMAGES } from "@/data/images.generated";
import { assetUrl } from "@/lib/assets";
import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { slugify } from "@/lib/slug";
import { formatLastCommit, getRepoStats } from "@/lib/github-stats";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";
import { ProjectLightbox } from "@/components/portfolio/project-lightbox";

/** Resolve a project (and its neighbours) from a route slug. */
function resolveBySlug(slug: string): {
  project: Project;
  index: number;
  prev: Project | null;
  next: Project | null;
} | null {
  const index = PROJECTS.findIndex((p) => slugify(p.title) === slug);
  if (index === -1) return null;
  return {
    project: PROJECTS[index],
    index,
    prev: index > 0 ? PROJECTS[index - 1] : null,
    next: index < PROJECTS.length - 1 ? PROJECTS[index + 1] : null,
  };
}

export const Route = createFileRoute("/projects/$slug")({
  head: ({ params }) => {
    const match = resolveBySlug(params.slug);
    if (!match) {
      const title = "Project not found — Saivenkat Jilla";
      return { meta: [{ title }, { property: "og:title", content: title }] };
    }
    const { project } = match;
    const title = `${project.title} — Saivenkat Jilla`;
    const description = project.tagline ?? project.description;
    // Absolute URL of the card scripts/seo.mjs generates (og/projects-<slug>.png).
    // Must be absolute: scrapers ignore base-relative og:image paths. Must be PNG:
    // they reject SVG. This canonical is now the ONLY one on the page — the root
    // shell no longer emits a blanket one (see __root.tsx).
    const ogImage = ogImageUrl(`projects-${params.slug}.png`);
    const canonical = absoluteUrl(`projects/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:image:alt", content: `Social card for ${title}` },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
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
  component: CaseStudy,
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

function NotFound() {
  return (
    <Shell>
      <section
        className="mx-auto flex w-full flex-col items-center text-center"
        style={{ maxWidth: 720, padding: "clamp(120px,20vh,220px) clamp(24px,5vw,80px)" }}
      >
        <span
          className="font-display font-medium uppercase text-accent-bright rounded-full"
          style={{
            fontSize: 12,
            letterSpacing: 3,
            padding: "6px 14px",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border)",
          }}
        >
          404
        </span>
        <h1
          className="font-display font-extrabold text-ink mt-5"
          style={{ fontSize: "clamp(30px,4.4vw,52px)", lineHeight: 1.05 }}
        >
          Project not found
        </h1>
        <p className="text-muted-portfolio mt-4" style={{ fontSize: 16, lineHeight: 1.7 }}>
          That case study doesn&apos;t exist — it may have been renamed or moved.
        </p>
        <Link
          to="/"
          hash="projects"
          className="mt-8 inline-flex items-center gap-2 font-display font-semibold no-underline rounded-full text-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{
            fontSize: 14,
            padding: "12px 22px",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to projects
        </Link>
      </section>
    </Shell>
  );
}

/** A single labelled GitHub statistic chip. */
function StatChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-display text-ink"
      style={{
        fontSize: 13,
        fontWeight: 500,
        padding: "7px 13px",
        borderRadius: 9,
        background: "var(--portfolio-surface-2)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      <span className="text-accent-bright" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  );
}

function YouTubeEmbed({ project }: { project: Project }) {
  if (!project.video) return null;

  return (
    <div
      className="mt-10 overflow-hidden rounded-xl"
      style={{
        aspectRatio: "16 / 9",
        border: "1px solid var(--portfolio-border)",
        background: "var(--portfolio-surface)",
      }}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(project.video)}`}
        title={`${project.title} demo video`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}

function GitHubStats({ repo }: { repo: string }) {
  const stats = getRepoStats(repo);
  if (!stats) return null;
  const updated = formatLastCommit(stats.pushedAt);

  return (
    <section aria-label="GitHub repository stats" className="mt-10">
      <h2
        className="font-display font-semibold text-ink"
        style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75 }}
      >
        Repository
      </h2>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <StatChip icon={<Star size={15} />}>
          {stats.stars.toLocaleString()} {stats.stars === 1 ? "star" : "stars"}
        </StatChip>
        <StatChip icon={<GitFork size={15} />}>
          {stats.forks.toLocaleString()} {stats.forks === 1 ? "fork" : "forks"}
        </StatChip>
        {stats.language && (
          <StatChip icon={<span aria-hidden="true">●</span>}>{stats.language}</StatChip>
        )}
        {updated && <StatChip icon={<span aria-hidden="true">↻</span>}>{updated}</StatChip>}
      </div>
    </section>
  );
}

/**
 * Widths the hero is actually painted at.
 *
 * The article caps at 900px with `clamp(24px,5vw,80px)` of padding a side, so the content
 * column is at most 900 - 2×80 = 740px on a wide screen and peaks around 810px right at the
 * 900px breakpoint. Below that the article is the viewport and the padding is 5vw a side, so
 * the column is 90vw until the clamp floors the padding at 24px on very small phones (where
 * 90vw over-requests by a few px — harmless, and it errs toward the sharper source).
 *
 * 810 and 740 both land between the 400w and 800w derivatives, so every viewport ≥900px asks
 * for the 800w file either way; quoting 800px keeps the hint honest without a third breakpoint.
 */
const HERO_SIZES = "(min-width: 900px) 800px, 90vw";

/**
 * The case-study hero. Renders nothing at all when the project has no image, so a project
 * without a screenshot keeps a text-only layout rather than gaining an empty frame. Every
 * project carries one today; the guard stays because the field is optional and the next one
 * added may not.
 *
 * `imageId` keys into the generated derivatives; a project with an `image` but no encoded
 * sizes yet degrades to the committed original. Every URL goes through `assetUrl()` — the
 * manifest's paths are bare and document-relative, so they 404 under the Pages base path.
 * (The constellation card does the same thing at its own display width; the two are a few
 * lines each and live either side of an ownership boundary, so they stay separate.)
 */
function HeroImage({ project }: { project: Project }) {
  if (!project.image) return null;

  const generated = project.imageId ? GENERATED_IMAGES[project.imageId] : undefined;
  // Smallest source doubles as the `src` fallback; its intrinsic width/height reserve the
  // aspect box before the bytes land, so the write-up below doesn't get shoved down (CLS).
  const smallest = generated?.sources[0];

  return (
    <img
      src={assetUrl(smallest?.src ?? project.image)}
      srcSet={generated?.sources.map((s) => `${assetUrl(s.src)} ${s.width}w`).join(", ")}
      sizes={generated ? HERO_SIZES : undefined}
      width={smallest?.width}
      height={smallest?.height}
      alt={`${project.title} — project screenshot`}
      // Top of the page: this is the LCP candidate, so it must not be lazy.
      loading="eager"
      fetchPriority="high"
      decoding="async"
      className="mt-10 w-full rounded-xl"
      style={{
        height: "auto",
        display: "block",
        border: "1px solid var(--portfolio-border)",
        background: "var(--portfolio-surface)",
      }}
    />
  );
}

function CaseStudy() {
  const { slug } = Route.useParams();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const match = resolveBySlug(slug);
  const project = match?.project;
  const prev = match?.prev ?? null;
  const next = match?.next ?? null;
  const openGalleryAt = useCallback((index: number) => setOpenIndex(index), []);
  const closeGallery = useCallback(() => setOpenIndex(null), []);
  if (!project) return <NotFound />;
  const photos = project.photos ?? [];
  // Alt text for the hero tile the gallery gains when a project has BOTH a video and an
  // image. This used to be the literal string "— interactive Gaussian-splat memory
  // capture", which was true of the only project that had a video at the time and became
  // wrong for every one that has since gained one. `imageAlt` lets a project say what its
  // hero actually shows; the fallback describes the tile's role rather than its contents,
  // which is the honest thing to say when nobody has written it down.
  const heroAlt = project.imageAlt ?? `${project.title} — project hero image`;
  const galleryPhotos = [
    ...(project.video && project.image
      ? [
          {
            src: project.image,
            alt: heroAlt,
          },
        ]
      : []),
    ...photos.map((src, i) => ({
      src,
      alt: project.photoCaptions?.[i] ?? `${project.title} — project image ${i + 1}`,
    })),
  ];
  return (
    <Shell>
      <article
        className="mx-auto w-full"
        style={{ maxWidth: 900, padding: "clamp(110px,15vh,160px) clamp(24px,5vw,80px) 40px" }}
      >
        {/* Breadcrumb */}
        <Link
          to="/"
          hash="projects"
          className="inline-flex items-center gap-2 font-display no-underline text-muted-portfolio hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright rounded"
          style={{ fontSize: 13.5 }}
        >
          <ArrowLeft size={15} aria-hidden="true" /> All projects
        </Link>

        {/* Hero */}
        <header className="mt-6">
          {project.winner && (
            <span
              className="font-display font-bold"
              style={{ color: "var(--portfolio-gold)", fontSize: 12.5, letterSpacing: 0.5 }}
            >
              ★ Hackathon Winner
            </span>
          )}
          <h1
            className="font-display font-extrabold text-ink mt-2"
            style={{ fontSize: "clamp(32px,5vw,58px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            {project.title}
          </h1>
          {project.tagline && (
            <p
              className="text-accent-bright mt-4 font-display"
              style={{ fontSize: "clamp(17px,2vw,22px)", lineHeight: 1.5, fontWeight: 500 }}
            >
              {project.tagline}
            </p>
          )}

          {project.tech && project.tech.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-6 list-none p-0 m-0">
              {project.tech.map((t) => (
                <li
                  key={t}
                  className="font-display text-accent-bright"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "4px 11px",
                    borderRadius: 7,
                    background: "var(--portfolio-surface-2)",
                    border: "1px solid var(--portfolio-border)",
                  }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 mt-7">
            <a
              href={assetUrl(project.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-display font-semibold no-underline rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
              style={{
                fontSize: 14,
                padding: "12px 22px",
                color: "#021024",
                background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
                boxShadow: "0 8px 24px rgba(47,155,255,0.4)",
              }}
            >
              {project.cta ?? "View live →"}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-display font-semibold no-underline rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                style={{
                  fontSize: 14,
                  padding: "12px 22px",
                  background: "var(--portfolio-surface)",
                  border: "1px solid var(--portfolio-border)",
                }}
              >
                <Github size={16} aria-hidden="true" /> View source
              </a>
            )}
          </div>
        </header>

        {/* Projects with a video lead with the embedded demo; otherwise the project image
            remains the hero. The image is added to the gallery below when displaced. */}
        {project.video ? <YouTubeEmbed project={project} /> : <HeroImage project={project} />}

        {/* Details write-up. A `summary` array is a multi-paragraph case study; without
            one this collapses to the single blurb the constellation modal also shows, so
            projects that never opted in render byte-identically to before. */}
        <section className="mt-10" aria-label="About this project">
          {(project.summary ?? [project.details ?? project.description]).map((paragraph, i) => (
            <p
              // Authored prose, fixed order, never reordered — the index IS the identity.
              key={i}
              className="text-muted-portfolio"
              style={{
                fontSize: "clamp(15px,1.4vw,17px)",
                lineHeight: 1.85,
                textWrap: "pretty",
                marginTop: i === 0 ? 0 : "1.15em",
              }}
            >
              {paragraph}
            </p>
          ))}
        </section>

        {/* GitHub stats */}
        {project.repo && <GitHubStats repo={project.repo} />}

        {/* Photo gallery */}
        {photos.length > 0 && (
          <section className="mt-12" aria-label="Project gallery">
            <h2
              className="font-display font-semibold text-ink"
              style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75 }}
            >
              Gallery
            </h2>
            <div
              className="mt-4 grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
            >
              {project.video && project.image && (
                <button
                  type="button"
                  onClick={() => setOpenIndex(0)}
                  className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                  aria-label={`Open ${project.title} hero image`}
                >
                  <img
                    src={assetUrl(project.image)}
                    alt={heroAlt}
                    loading="lazy"
                    className="w-full rounded-xl object-cover"
                    style={{
                      aspectRatio: "4 / 3",
                      border: "1px solid var(--portfolio-border)",
                      background: "var(--portfolio-surface)",
                    }}
                  />
                </button>
              )}
              {photos.map((src, i) => {
                const galleryIndex = (project.video && project.image ? 1 : 0) + i;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setOpenIndex(galleryIndex)}
                    className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
                    aria-label={`Open ${project.title} screenshot ${i + 1}`}
                  >
                    <img
                      src={assetUrl(src)}
                      alt={
                        project.photoCaptions?.[i] ?? `${project.title} — project image ${i + 1}`
                      }
                      loading="lazy"
                      className="w-full rounded-xl object-cover"
                      style={{
                        aspectRatio: "4 / 3",
                        border: "1px solid var(--portfolio-border)",
                        background: "var(--portfolio-surface)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Prev / next navigation */}
        <nav
          aria-label="Project navigation"
          className="mt-14 flex flex-col gap-3 sm:flex-row sm:justify-between"
          style={{ borderTop: "1px solid var(--portfolio-border)", paddingTop: 28 }}
        >
          {prev ? (
            <Link
              to="/projects/$slug"
              params={{ slug: slugify(prev.title) }}
              className="group inline-flex items-center gap-2 no-underline text-muted-portfolio hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright rounded"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span className="font-display" style={{ fontSize: 14 }}>
                <span style={{ display: "block", fontSize: 11, opacity: 0.7 }}>Previous</span>
                {prev.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {next ? (
            <Link
              to="/projects/$slug"
              params={{ slug: slugify(next.title) }}
              className="group inline-flex items-center gap-2 no-underline text-muted-portfolio hover:text-accent-bright transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright rounded sm:text-right"
            >
              <span className="font-display" style={{ fontSize: 14 }}>
                <span style={{ display: "block", fontSize: 11, opacity: 0.7 }}>Next</span>
                {next.title}
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      </article>
      <AnimatePresence>
        {openIndex !== null && (
          <ProjectLightbox
            photos={galleryPhotos}
            index={openIndex}
            onClose={closeGallery}
            onNavigate={openGalleryAt}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
