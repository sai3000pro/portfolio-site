// Central portfolio content. Pulled from the original portfolio-website and
// kept here so every section reads from a single source of truth.

export const PROFILE = {
  name: "Sai",
  fullName: "Saivenkat Jilla",
  email: "sljilla@uwaterloo.ca",
  resumeUrl: "assets/Resume.pdf",
  portrait: "assets/portrait.jpeg",
  portraitAlt: "Pinky, the UWaterloo Math Faculty mascot, posing with Sai",
  logo: "assets/logo.png",
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
    title: "Software Engineering Intern",
    company: "Capital One",
    duration: "May 2026 — Aug 2026",
    description:
      "Engineering an end-to-end interview-scheduling system using Next.js, Go, PostgreSQL, and AWS, bridging candidate and recruiter workflows through dynamic availability mapping, SSO integration, and centralized job-round management.",
    location: "Toronto, ON",
    coords: { lat: 43.6532, lon: -79.3832 },
    photos: [],
  },
  {
    title: "Undergraduate Research Assistant",
    company: "University of Cambridge · University of Waterloo",
    duration: "Jan 2026 — Apr 2026",
    description:
      "Engineered active-learning pipelines for GEDI biomass estimation, demonstrating that spatial sampling mitigates the cold-start problem by outperforming random baseline strategies by 27% under extreme data starvation (N=25). Built a 2D landscape generator using Gaussian Random Fields to simulate 3,000+ data points, modelling both smooth and chaotic environments to evaluate the situational superiority of different learning strategies. Architected a Python/SciPy evaluation suite to benchmark ML strategies, showing that Attentive Neural Processes (ANPs) outperformed Random Forests by more than 3× accuracy (R²) in chaotic environments under data starvation (<1% sample size).",
    location: "Cambridge, England",
    coords: { lat: 52.2053, lon: 0.1218 },
    photos: [],
  },
  {
    title: "Software Engineering Intern",
    company: "Marsh McLennan",
    duration: "Aug 2025 — Jan 2026",
    description:
      "Automated case-handling by building an email classifier with RAG-based semantic search and a RESTful Node.js API. Resolved 1,000+ exposed secrets by engineering a GitGuardian/JWT remediation pipeline that won an org-wide tournament. Saved 100+ hr/wk by automating 300+-instance database deployments in GitHub Actions with rollback and secret handling. Bolstered preemptive security and development velocity by piloting a GitHub bot for OWASP vulnerability auditing and building a natural-language-to-workflow app via Mastra AI. Optimized reliability for 30+ apps by refining and documenting multi-cloud designs (OCI, AWS, Azure, GCP) alongside dev teams.",
    location: "Toronto, ON",
    coords: { lat: 43.6532, lon: -79.3832 },
    photos: [],
  },
  {
    title: "Machine Learning Researcher",
    company: "Alternative Protein Project",
    duration: "Jul 2024 — Aug 2025",
    description:
      "Extracted genomic insights for cultivated meat by architecting an end-to-end RNA-seq workflow to analyze public datasets. Optimized analysis of large-scale public single-cell datasets by engineering a reproducible Python pipeline (Scanpy, anndata, pandas, scikit-learn, rpy2) that enables efficient QC, clustering, and visualization of large datasets.",
    location: "Waterloo, ON",
    coords: { lat: 43.4643, lon: -80.5204 },
    photos: [],
  },
  {
    title: "Full-Stack Software Engineer",
    company: "Mathematics Society, University of Waterloo",
    duration: "Jan 2025 — Aug 2025",
    description:
      "Eliminated unreliable API dependencies for term lookups, stabilizing the interface via memoized utility functions. Streamlined admin workflows by engineering a multi-select UI and RESTful backend endpoints for bulk exam management.",
    location: "Waterloo, ON",
    coords: { lat: 43.4643, lon: -80.5204 },
    photos: [],
  },
  {
    title: "Software Engineering Intern",
    company: "Global X Investments Canada",
    duration: "Jan 2025 — Apr 2025",
    description:
      "Increased organic traffic to core financial pages by reducing load times by 15% and refining technical SEO — through API optimizations, front-end lazy loading, and metadata enhancements to maximize indexing and retention. Drove a 32.4% email open rate and scaled web presence by deploying 80+ pages and email blasts to support product launches. Saved 100+ hr/yr by automating EN/FR content synchronization and internal linking via custom Python and PHP scripts.",
    location: "Toronto, ON",
    coords: { lat: 43.6532, lon: -79.3832 },
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
    image: "assets/verbalyst.png",
    link: "https://devpost.com/software/verbalyst",
    winner: true,
  },
  {
    title: "Healthut",
    description: "Making mental health resources simple and accessible.",
    image: "assets/Healthut.png",
    link: "https://devpost.com/software/healthub",
    winner: true,
  },
  {
    title: "PatronPal",
    description: "Support your favorite creators, your way.",
    image: "assets/patronPal.png",
    link: "https://devpost.com/software/patronpal",
  },
  {
    title: "devDucky",
    description: "Ever needed a rubber ducky timeout?",
    image: "assets/devDucky.jpg",
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
