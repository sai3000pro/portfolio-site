import { motion } from "framer-motion";
import { EXPERIENCES } from "@/data/portfolio";
import { Section, SectionHeading } from "./section";

export function Experience() {
  return (
    <Section id="experience">
      <SectionHeading eyebrow="Career trajectory" title="Work Experience" />

      <div className="mt-16 mx-auto" style={{ maxWidth: 760 }}>
        <div
          className="relative"
          style={{
            borderLeft: "1px solid rgba(93,182,255,0.25)",
            paddingLeft: "clamp(28px,4vw,48px)",
          }}
        >
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.title}
              className="relative"
              style={{ marginBottom: i === EXPERIENCES.length - 1 ? 0 : 40 }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.7, 0.3, 1] }}
            >
              {/* node */}
              <span
                className="absolute rounded-full"
                style={{
                  left: "calc(-1 * clamp(28px,4vw,48px) - 7px)",
                  top: 6,
                  width: 14,
                  height: 14,
                  background: "#5db6ff",
                  boxShadow: "0 0 14px rgba(93,182,255,0.9)",
                  border: "2px solid #021024",
                }}
              />

              <div
                className="rounded-2xl transition-colors"
                style={{
                  padding: "22px 24px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(93,182,255,0.16)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display font-semibold text-white" style={{ fontSize: 19 }}>
                    {exp.title}
                  </h3>
                  <span
                    className="font-display text-accent-bright"
                    style={{ fontSize: 13, letterSpacing: 0.4, whiteSpace: "nowrap" }}
                  >
                    {exp.duration}
                  </span>
                </div>
                <p className="font-display text-white/70 mt-0.5" style={{ fontSize: 15 }}>
                  {exp.company}
                </p>
                <p className="text-muted-portfolio mt-3" style={{ fontSize: 15, lineHeight: 1.7 }}>
                  {exp.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
