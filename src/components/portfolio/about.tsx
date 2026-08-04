import { motion } from "framer-motion";
import { PROFILE } from "@/data/portfolio";
import { unlock } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
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
                className="font-display font-medium rounded-full text-ink"
                style={{
                  fontSize: 13.5,
                  padding: "9px 17px",
                  background: "var(--portfolio-surface)",
                  border: "1px solid var(--portfolio-border)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <motion.a
            href={assetUrl(PROFILE.resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => unlock("paper-trail")}
            whileHover={{
              y: -2,
              borderColor: "var(--portfolio-border-strong)",
              background: "var(--portfolio-surface-2)",
            }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 font-display font-semibold no-underline rounded-full text-ink mt-10"
            style={{
              fontSize: 15,
              padding: "13px 26px",
              border: "1px solid var(--portfolio-border-strong)",
              background: "var(--portfolio-surface)",
            }}
          >
            View Résumé →
          </motion.a>
        </Reveal>
      </div>
    </Section>
  );
}
