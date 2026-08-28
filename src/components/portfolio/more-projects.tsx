import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Github } from "lucide-react";

import { MORE_PROJECTS, type ShelfProject } from "@/data/portfolio";
import { responsiveImageProps } from "@/lib/assets";
import { Reveal } from "./section";
import { ProjectLightbox } from "./project-lightbox";

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
 * The lightbox below IS React state, and that is consistent rather than contradictory —
 * it is an overlay that cannot exist before hydration anyway, so nothing is lost by it
 * being unavailable until then. The disclosure has to work without JS because it gates
 * *content*; the lightbox only magnifies content already on the page.
 */
export function MoreProjects() {
  // Which project's photos are open, and at which index. One piece of state rather than
  // per-card state so only one lightbox can ever be mounted.
  const [open, setOpen] = useState<{ project: ShelfProject; index: number } | null>(null);
  const closeLightbox = useCallback(() => setOpen(null), []);
  const navigate = useCallback(
    (index: number) => setOpen((current) => (current ? { ...current, index } : null)),
    [],
  );

  if (MORE_PROJECTS.length === 0) return null;

  const photosFor = (project: ShelfProject) => [
    ...(project.image
      ? [{ src: project.image, alt: `${project.title} — project hero image` }]
      : []),
    ...(project.photos ?? []).map((src, i) => ({
      src,
      alt: project.photoCaptions?.[i] ?? `${project.title} — project image ${i + 1}`,
    })),
  ];

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
            <MoreProjectCard
              key={project.title}
              project={project}
              onOpenPhotos={() => setOpen({ project, index: 0 })}
            />
          ))}
        </div>
      </details>

      <AnimatePresence>
        {open && (
          <ProjectLightbox
            photos={photosFor(open.project)}
            index={open.index}
            onClose={closeLightbox}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>
    </Reveal>
  );
}

function MoreProjectCard({
  project,
  onOpenPhotos,
}: {
  project: ShelfProject;
  onOpenPhotos: () => void;
}) {
  // A thumbnail is only worth making interactive when there is more behind it than the
  // thumbnail itself; with no extra frames the card keeps a plain, inert <img>.
  const hasGallery = Boolean(project.image && project.photos?.length);

  const thumbnail = project.image ? (
    <img
      {...responsiveImageProps(project.image, project.imageId, "(max-width: 700px) 100vw, 320px")}
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
  ) : null;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-border)",
      }}
    >
      {/* Only the two hackathon entries carry screenshots. The rest render as text cards
          rather than getting a placeholder — a card that admits it has no capture beats a
          generated gradient pretending to be one. */}
      {hasGallery ? (
        <button
          type="button"
          onClick={onOpenPhotos}
          className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          aria-label={`Open ${project.title} screenshots`}
        >
          {thumbnail}
        </button>
      ) : (
        thumbnail
      )}

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

        {/* mt-auto pins this row to the bottom, so cards in a row line their actions up
            however much description sits above them. */}
        <div className="mt-auto flex flex-wrap items-center" style={{ gap: 14, paddingTop: 16 }}>
          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="font-display font-medium text-accent-bright rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
              style={{ fontSize: 13 }}
            >
              {project.cta ?? "View project →"}
            </a>
          ) : project.linkNote ? (
            // Not a link and deliberately not styled as one: it is an explanation, and
            // making it look clickable would be a promise the card cannot keep.
            <span className="text-muted-portfolio" style={{ fontSize: 13, fontStyle: "italic" }}>
              {project.linkNote}
            </span>
          ) : null}
          {/* Suppressed when it would duplicate the primary link — the games point `link`
              at their own repo, so showing both would be the same URL twice. */}
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
