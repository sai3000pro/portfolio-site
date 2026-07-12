import { PROJECTS } from "@/data/portfolio";
import { Section, SectionHeading } from "./section";
import { ConstellationCanvas } from "./constellation";

export function Projects() {
  return (
    <Section id="projects">
      <SectionHeading eyebrow="Selected work" title="Projects & Hackathons" />
      <ConstellationCanvas projects={PROJECTS} />
    </Section>
  );
}
