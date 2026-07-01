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
  location: string;
  // Real coordinates so the globe can center on, and pin, the location.
  coords: { lat: number; lon: number } | null;
  // Extra content shown in the "learn more" overlay.
  details?: string;
  photos?: string[];
}

export const EXPERIENCES: Experience[] = [
  {
    title: "Machine Learning Researcher",
    company: "Alternative Protein Project",
    duration: "Jul 2024 — Present",
    description:
      "Developed and implemented a Python pipeline to analyze single-cell RNA-seq data, uncovering insights for cultivated meat research using modern ML and bioinformatics tools.",
    location: "Waterloo, ON",
    coords: { lat: 43.4643, lon: -80.5204 },
    details:
      "As part of the Alternative Protein Project, I built an end-to-end Python pipeline for single-cell RNA-seq analysis — spanning quality control, normalization, dimensionality reduction, clustering, and visualization. The work supports cultivated-meat research by surfacing structure in cell populations, and I worked alongside a small research team to iterate on methods and communicate findings.",
    photos: [],
  },
  {
    title: "Web Developer",
    company: "Global X Investments Canada",
    duration: "Jan 2025 — Apr 2025",
    description:
      "Enhanced digital engagement and internal efficiency by streamlining content workflows, optimizing performance, and automating web operations across WordPress and email campaigns.",
    location: "Toronto, ON",
    coords: { lat: 43.6532, lon: -79.3832 },
    details:
      "On the digital team at Global X, I streamlined content workflows across WordPress and email, improved page performance, and automated repetitive web operations to save the team time. The role blended front-end work, CMS administration, and marketing-ops automation in a fast-moving financial environment.",
    photos: [],
  },
  {
    title: "Software Developer",
    company: "University of Waterloo",
    duration: "May 2024 — Aug 2024",
    description:
      "Built and tested accessible web pages and tools within the LEARN LMS, streamlining QA processes and enhancing productivity through custom VBA solutions and improved internal tooling.",
    location: "Waterloo, ON",
    coords: { lat: 43.4643, lon: -80.5204 },
    details:
      "Within the University of Waterloo's LEARN LMS, I built and tested accessible web pages and internal tools, focusing on WCAG-compliant markup and repeatable QA. I also wrote custom VBA utilities that automated tedious manual steps, improving the team's day-to-day productivity.",
    photos: [],
  },
  {
    title: "Front-End Developer",
    company: "SlimeScholars",
    duration: "Dec 2023 — May 2024",
    description:
      "Engineered modular front-end features for a gamified learning platform using React.js and Tailwind, cutting latency through smart caching and preparing the product for alpha launch.",
    location: "Remote",
    coords: null,
    details:
      "At SlimeScholars, an early-stage gamified learning platform, I engineered modular front-end features with React and Tailwind, introduced smart caching to cut latency, and helped harden the product for its alpha launch. Working remotely, I collaborated closely with a small founding team across design and product.",
    photos: [],
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
