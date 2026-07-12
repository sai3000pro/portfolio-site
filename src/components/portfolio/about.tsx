import { motion } from "framer-motion";
import { PROFILE } from "@/data/portfolio";
import { Reveal, Section, SectionHeading } from "./section";

const TAGS = ["Web Development", "Photography", "Machine Learning", "Student Advocacy"];

export function About() {
  return (
    <Section id="about">
      <SectionHeading eyebrow="Who I am" title="A bit about me" />

      <div className="mx-auto mt-12 text-center" style={{ maxWidth: 760 }}>
        <Reveal>
          <p
            className="text-muted-portfolio"
            style={{ fontSize: "clamp(17px,1.5vw,22px)", lineHeight: 1.85, textWrap: "pretty" }}
          >
            {PROFILE.bio}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="font-display font-medium rounded-full text-white/90"
                style={{
                  fontSize: 13.5,
                  padding: "9px 17px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(93,182,255,0.22)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <motion.a
            href={PROFILE.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{
              y: -2,
              borderColor: "rgba(93,182,255,0.55)",
              background: "rgba(47,155,255,0.08)",
            }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 font-display font-semibold no-underline rounded-full text-white mt-10"
            style={{
              fontSize: 15,
              padding: "13px 26px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            View Résumé →
          </motion.a>
        </Reveal>
      </div>
    </Section>
  );
}
