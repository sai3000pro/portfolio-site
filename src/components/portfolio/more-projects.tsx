import { ChevronDown, Github } from "lucide-react";

import { MORE_PROJECTS, type Project } from "@/data/portfolio";
import { responsiveImageProps } from "@/lib/assets";
import { Reveal } from "./section";

/**
 * The second shelf, under the constellation.
 *
 * Built on `<details>`/`<summary>` rather than React state, and the distinction is
 * load-bearing rather than stylistic. This route is prerendered, so with `useState` the
 * cards would either be absent from the shipped HTML (conditional render — invisible to
 * crawlers and to anyone whose JS never arrives) or present but needing hydration before
 * they could be opened. `<details>` puts every card in the prerendered markup, collapses
 * it with no script at all, and brings keyboard support and the right ARIA semantics with
 * it. There is no `open` prop here on purpose: the browser owns that state.
 *
 * These are NOT constellation projects. They have no /projects/<slug> page — see the note
 * on MORE_PROJECTS in portfolio.ts for why that is a separate export rather than a flag —
 * so each card's only way out is its `link`, and the card is a plain anchor.
 */
export function MoreProjects() {
  if (MORE_PROJECTS.length === 0) return null;

  return (
    <Reveal>
      <details className="more-projects mx-auto w-full" style={{ maxWidth: 1180, marginTop: 44 }}>
        <summary
          className="font-display flex cursor-pointer list-none items-center justify-center gap-2 rounded-full text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{
            fontSize: "clamp(14px,1.5vw,16px)",
            fontWeight: 500,
            padding: "11px 22px",
            width: "fit-content",
            margin: "0 auto",
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
          }}
        >
          More of my projects
          <span className="text-muted-portfolio" style={{ fontSize: 13 }}>
            ({MORE_PROJECTS.length})
          </span>
          {/* Rotated by the `.more-projects[open]` rule in styles.css — the open state has
              no JS behind it, so the affordance cannot be driven from here either. */}
          <ChevronDown size={16} className="more-projects__chevron" aria-hidden="true" />
        </summary>

        <div
          className="grid"
          style={{
            marginTop: 28,
            gap: "clamp(14px,1.8vw,20px)",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {MORE_PROJECTS.map((project) => (
            <MoreProjectCard key={project.title} project={project} />
          ))}
        </div>
      </details>
    </Reveal>
  );
}

function MoreProjectCard({ project }: { project: Project }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      {/* Only the two hackathon entries carry screenshots. The five older builds render as
          text cards rather than getting a placeholder — a card that admits it has no
          capture beats a generated gradient pretending to be one. */}
      {project.image ? (
        <img
          {...responsiveImageProps(
            project.image,
            project.imageId,
            "(max-width: 700px) 100vw, 320px",
          )}
          alt={project.title}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            aspectRatio: "16 / 10",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
            borderBottom: "1px solid var(--portfolio-border)",
          }}
        />
      ) : null}

      <div className="flex flex-1 flex-col" style={{ padding: "16px 18px 18px" }}>
        <h3 className="font-display font-semibold text-ink" style={{ fontSize: 16 }}>
          {project.title}
        </h3>
        <p
          className="text-muted-portfolio"
          style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 7, textWrap: "pretty" }}
        >
          {project.description}
        </p>

        {project.tech?.length ? (
          <ul className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
            {project.tech.map((tech) => (
              <li
                key={tech}
                className="text-muted-portfolio rounded-full"
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  background: "var(--portfolio-surface-2)",
                  border: "1px solid var(--portfolio-border)",
                }}
              >
                {tech}
              </li>
            ))}
          </ul>
        ) : null}

        {/* mt-auto pins the links to the bottom, so cards in a row line their actions up
            however much description sits above them. */}
        <div className="mt-auto flex flex-wrap items-center" style={{ gap: 14, paddingTop: 16 }}>
          <a
            href={project.link}
            target="_blank"
            rel="noreferrer"
            className="font-display font-medium text-accent-bright rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            style={{ fontSize: 13 }}
          >
            {project.cta ?? "View project →"}
          </a>
          {/* Suppressed when it would duplicate the primary link — the five games point
              `link` at their own repo, so showing both would be the same URL twice. */}
          {project.repo && project.repo !== project.link ? (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="text-muted-portfolio inline-flex items-center rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
              style={{ fontSize: 13, gap: 5 }}
              aria-label={`${project.title} on GitHub`}
            >
              <Github size={13} aria-hidden="true" />
              Source
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
