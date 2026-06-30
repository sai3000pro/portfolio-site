// Central portfolio content. Pulled from the original portfolio-website and
// kept here so every section reads from a single source of truth.

export const PROFILE = {
  name: "Sai",
  fullName: "Saivenkat Jilla",
  email: "sljilla@uwaterloo.ca",
  resumeUrl: "/assets/Resume.pdf",
  portrait: "/assets/portrait.jpeg",
  portraitAlt: "Pinky, the UWaterloo Math Faculty mascot, posing with Sai",
  logo: "/assets/logo.png",
  tagline:
    "An aspiring web developer and amateur photographer, drifting between code and the cosmos — capturing light, building things for the web, and chasing the quiet wonder in both.",
  bio: "I'm Sai, an aspiring web developer, amateur photographer, and passionate student advocate. My journey into tech began when I realized how much I love creating and solving problems. I also enjoy capturing moments through my lens and diving into the fascinating world of machine learning.",
} as const;

// Rotating roles for the hero headline.
export const ROLES: string[] = [
  "Web Developer.",
  "Amateur Photographer.",
  "Student Advocate.",
  "ML Researcher.",
];

export interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export const EXPERIENCES: Experience[] = [
  {
    title: "Machine Learning Researcher",
    company: "Alternative Protein Project",
    duration: "Jul 2024 — Present",
    description:
      "Developed and implemented a Python pipeline to analyze single-cell RNA-seq data, uncovering insights for cultivated meat research using modern ML and bioinformatics tools.",
  },
  {
    title: "Web Developer",
    company: "Global X Investments Canada",
    duration: "Jan 2025 — Apr 2025",
    description:
      "Enhanced digital engagement and internal efficiency by streamlining content workflows, optimizing performance, and automating web operations across WordPress and email campaigns.",
  },
  {
    title: "Software Developer",
    company: "University of Waterloo",
    duration: "May 2024 — Aug 2024",
    description:
      "Built and tested accessible web pages and tools within the LEARN LMS, streamlining QA processes and enhancing productivity through custom VBA solutions and improved internal tooling.",
  },
  {
    title: "Front-End Developer",
    company: "SlimeScholars",
    duration: "Dec 2023 — May 2024",
    description:
      "Engineered modular front-end features for a gamified learning platform using React.js and Tailwind, cutting latency through smart caching and preparing the product for alpha launch.",
  },
];

export interface Project {
  title: string;
  description: string;
  image: string;
  link: string;
  winner?: boolean;
}

export const PROJECTS: Project[] = [
  {
    title: "Verbalyst",
    description: "Empowering speech, unleashing confidence.",
    image: "/assets/verbalyst.png",
    link: "https://devpost.com/software/verbalyst",
    winner: true,
  },
  {
    title: "Healthut",
    description: "Making mental health resources simple and accessible.",
    image: "/assets/Healthut.png",
    link: "https://devpost.com/software/healthub",
    winner: true,
  },
  {
    title: "PatronPal",
    description: "Support your favorite creators, your way.",
    image: "/assets/patronPal.png",
    link: "https://devpost.com/software/patronpal",
  },
  {
    title: "devDucky",
    description: "Ever needed a rubber ducky timeout?",
    image: "/assets/devDucky.jpg",
    link: "https://devpost.com/software/devducky",
  },
];

export interface Social {
  label: string;
  href: string;
}

export const SOCIALS: Social[] = [
  { label: "GitHub", href: "https://github.com/sai3000pro" },
  { label: "LinkedIn", href: "https://linkedin.com/in/saivenkat-jilla" },
  { label: "Email", href: "mailto:sljilla@uwaterloo.ca" },
];

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];
