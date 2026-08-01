import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, Github, GitFork, Star } from "lucide-react";

import { PROJECTS, type Project } from "@/data/portfolio";
import { assetUrl } from "@/lib/assets";
import { absoluteUrl, ogImageUrl } from "@/lib/site-url";
import { slugify } from "@/lib/slug";
import { formatLastCommit, getRepoStats } from "@/lib/github-stats";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { Footer } from "@/components/portfolio/contact";

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
    // Absolute URL of the card scripts/seo.mjs generates (og/projects-<slug>.svg).
    // Must be absolute: scrapers ignore base-relative og:image paths.
    const ogImage = ogImageUrl(`projects-${params.slug}.svg`);
    const canonical = absoluteUrl(`projects/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
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
      <main className="relative" style={{ zIndex: 2 }}>
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
            background: "rgba(47,155,255,0.08)",
            border: "1px solid rgba(47,155,255,0.22)",
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
            background: "rgba(47,155,255,0.12)",
            border: "1px solid rgba(93,182,255,0.4)",
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
        background: "rgba(93,182,255,0.08)",
        border: "1px solid rgba(93,182,255,0.22)",
      }}
    >
      <span className="text-accent-bright" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
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

function CaseStudy() {
  const { slug } = Route.useParams();
  const match = resolveBySlug(slug);
  if (!match) return <NotFound />;
  const { project, prev, next } = match;
  const photos = project.photos ?? [];

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
              style={{ color: "#f5c518", fontSize: 12.5, letterSpacing: 0.5 }}
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
                    background: "rgba(93,182,255,0.1)",
                    border: "1px solid rgba(93,182,255,0.24)",
                  }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 mt-7">
            <a
              href={project.link}
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
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(93,182,255,0.28)",
                }}
              >
                <Github size={16} aria-hidden="true" /> View source
              </a>
            )}
          </div>
        </header>

        {/* Details write-up */}
        <section className="mt-10" aria-label="About this project">
          <p
            className="text-muted-portfolio"
            style={{ fontSize: "clamp(15px,1.4vw,17px)", lineHeight: 1.85, textWrap: "pretty" }}
          >
            {project.details ?? project.description}
          </p>
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
              {photos.map((src, i) => (
                <img
                  key={src}
                  src={assetUrl(src)}
                  alt={`${project.title} — screenshot ${i + 1}`}
                  loading="lazy"
                  className="w-full rounded-xl object-cover"
                  style={{
                    aspectRatio: "4 / 3",
                    border: "1px solid rgba(93,182,255,0.18)",
                    background: "rgba(8,15,30,0.6)",
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Prev / next navigation */}
        <nav
          aria-label="Project navigation"
          className="mt-14 flex flex-col gap-3 sm:flex-row sm:justify-between"
          style={{ borderTop: "1px solid rgba(93,182,255,0.16)", paddingTop: 28 }}
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
    </Shell>
  );
}
