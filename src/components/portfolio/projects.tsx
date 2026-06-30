import { motion } from "framer-motion";
import { PROJECTS } from "@/data/portfolio";
import { Section, SectionHeading } from "./section";

export function Projects() {
  return (
    <Section id="projects">
      <SectionHeading eyebrow="Selected work" title="Projects & Hackathons" />

      <div
        className="mt-14 grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {PROJECTS.map((project, i) => (
          <motion.a
            key={project.title}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.07, ease: [0.2, 0.7, 0.3, 1] }}
            whileHover={{ y: -6 }}
            className="group relative block overflow-hidden rounded-2xl no-underline"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(93,182,255,0.16)",
            }}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
              <img
                src={project.image}
                alt={project.title}
                loading="lazy"
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(180deg, transparent 40%, rgba(2,16,36,0.85))",
                }}
              />
              {project.winner && (
                <span
                  className="absolute top-3 left-3 font-display font-bold uppercase rounded-full"
                  style={{
                    fontSize: 11,
                    letterSpacing: 1,
                    padding: "5px 11px",
                    color: "#021024",
                    background: "linear-gradient(180deg,#ffe27a,#f5c542)",
                    boxShadow: "0 0 16px rgba(245,197,66,0.5)",
                  }}
                >
                  ★ Winner
                </span>
              )}
              <span
                className="absolute bottom-3 right-3 font-display font-medium rounded-full text-white opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
                style={{
                  fontSize: 12.5,
                  padding: "7px 13px",
                  background: "rgba(47,155,255,0.85)",
                  backdropFilter: "blur(4px)",
                }}
              >
                View on Devpost →
              </span>
            </div>

            <div style={{ padding: "18px 20px 22px" }}>
              <h3 className="font-display font-semibold text-white" style={{ fontSize: 18.5 }}>
                {project.title}
              </h3>
              <p
                className="text-muted-portfolio mt-1.5"
                style={{ fontSize: 14.5, lineHeight: 1.6 }}
              >
                {project.description}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
    </Section>
  );
}
