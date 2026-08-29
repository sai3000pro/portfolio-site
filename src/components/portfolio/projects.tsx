import { MORE_PROJECTS, PROJECTS } from "@/data/portfolio";
import { Section, SectionHeading } from "./section";
import { ConstellationCanvas } from "./constellation";
import { MoreProjects } from "./more-projects";

export function Projects() {
  return (
    <Section id="projects">
      <SectionHeading eyebrow="Selected work" title="Projects & Hackathons" />
      {/* The constellation is the highlight reel and stays at seven — it is a physics
          canvas, and every extra card is another body in the collision loop and another
          node competing for the same space. Everything else lives in the disclosure
          below rather than being crammed into the orbit. */}
      <ConstellationCanvas projects={PROJECTS} extra={MORE_PROJECTS} />
      <MoreProjects />
    </Section>
  );
}
