// Central portfolio content. Pulled from the original portfolio-website and
// kept here so every section reads from a single source of truth.

import type { GeneratedImageId } from "./images.generated";

export const PROFILE = {
  name: "Sai",
  fullName: "Saivenkat Jilla",
  email: "sljilla@uwaterloo.ca",
  resumeUrl: "assets/Resume.pdf",
  portrait: "assets/portrait.jpeg",
  portraitAlt: "Pinky, the UWaterloo Math Faculty mascot, posing with Sai",
  logo: "assets/logo.png",
  /**
   * Canonical job title(s) — the single source of truth for identity strings that have to
   * agree with each other. `routes/__root.tsx` feeds this straight into the schema.org
   * `Person.jobTitle`; keep `tagline` below (the visible hero line), the <title>/og:title
   * in __root.tsx + routes/index.tsx, and `public/contact.vcf`'s TITLE saying the same
   * thing. Structured data that contradicts the rendered page is an SEO liability, and it
   * previously did: the hero said "CS student" while the JSON-LD said "Software Engineer".
   * schema.org allows multiple jobTitle values, and both of these are true at once.
   */
  jobTitle: ["Software Engineer", "Computer Science Student"],
  tagline:
    "Software engineer and CS student at the University of Waterloo, striving to make the world a better place through well-written software.",
  bio: "I'm Sai, a software engineer, amateur photographer, and passionate student advocate. My journey into tech began when I realized how much I love creating and solving problems. When I'm not coding, I enjoy watching Formula 1, playing basketball and capturing moments through my lens.",
} as const;

// Rotating roles for the hero headline.
export const ROLES: string[] = [
  "Software Engineer.",
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
  image?: string;
  /**
   * Key into GENERATED_IMAGES for this project's responsive derivatives. Set explicitly
   * rather than derived from `image`'s basename — the derivative ids are lowercase and
   * the originals are not (`assets/Healthut.png` → `healthut`), so string-munging the
   * filename would silently break the moment a new original is added with a different case.
   */
  imageId?: GeneratedImageId;
  link: string;
  winner?: boolean;
  // Hover call-to-action label (defaults to "View on Devpost →").
  cta?: string;
  repo?: string;
  // Constellation fields — all optional for backward compat.
  tagline?: string; // short text on the card; falls back to description
  details?: string; // full summary in the modal; falls back to description
  /** Optional YouTube video ID shown on the dedicated case-study page. */
  video?: string;
  /**
   * Long-form write-up, one string per paragraph, shown ONLY on the /projects/$slug
   * page. Separate from `details` on purpose: `details` also feeds the constellation
   * modal, which is a hover-sized card that a four-paragraph case study would bury.
   * A project with real depth to explain gets this; everything else falls back to
   * `details` and renders exactly as before.
   */
  summary?: string[];
  photos?: string[];
  photoCaptions?: string[];
  tech?: string[];
}

export const PROJECTS: Project[] = [
  {
    title: "Spark",
    description:
      "A privacy-first system that turns real-world walks into searchable, explorable 3D memories using a camera rover, iPhone LiDAR, and local AI.",
    tagline: "A camera rover that turns real-world experiences into searchable 3D memories.",
    details:
      "Spark is a privacy-focused system that combines robotics, mobile sensing, computer vision, artificial intelligence, and 3D Gaussian splatting to transform real experiences into explorable and searchable 3D memories. A custom-built capture rover and mobile application record the environment, spatial data, and movement, while a local pipeline reconstructs the scene, detects objects, and transcribes speech. The resulting memories can be revisited through connected Album, Map, Trips, and Capture views. Built by Matthew Sakhno, Jack Le, Saivenkat Jilla, and Aman Shah, Spark won first place in the SummerHacks Main Track and second place in the TECHNATION Data Intelligence Track among approximately 150 hackers.",
    summary: [
      "At SummerHacks 2026, four students set out to solve a problem most people have experienced: the more effort you spend recording a moment, the less present you are for it. The result was Spark, a privacy-focused system that combines robotics, mobile sensing, computer vision, artificial intelligence, and 3D Gaussian splatting to transform real experiences into explorable and searchable 3D memories.",
      "Built by Matthew Sakhno, Jack Le, Saivenkat Jilla, and Aman Shah, Spark won first place in the SummerHacks Main Track and second place in the TECHNATION Data Intelligence Track among approximately 150 hackers. The team earned $1,600 in prizes, along with TECHNATION backpacks and assorted accessories.",
      "Spark began with a simple question: what would it look like to preserve an experience without constantly stopping to take photographs? Most digital memories are stored as disconnected files. A photograph preserves one angle. A video preserves one path through a space. An audio recording preserves a conversation, but often without the context of where it happened. Even when people record an entire event, the result rarely captures the experience of actually being there.",
      "Spark was designed to bring those pieces back together. The system combines a custom-built capture rover, a mobile application, a local 3D reconstruction pipeline, object detection, searchable transcription, and a web experience for revisiting the completed memories. Instead of simply opening a folder of photographs, a user can return to an interactive reconstruction of the place, move through it from different viewpoints, find objects that appeared during the experience, revisit conversations, and explore the route they took.",
      "How Spark works. A phone or camera mounted on the rover records the environment while the rover moves through the space. The footage is sent over a local Wi-Fi hotspot to a laptop, where Spark processes the data and constructs a 3D Gaussian-splat reconstruction. Alongside the video, the mobile application can collect information such as AR tracking, LiDAR depth, GPS coordinates, camera intrinsics, and camera-pose data.",
      "These signals provide information about where the camera was located and how it moved. Rather than relying entirely on visual feature matching to estimate the camera’s trajectory, Spark can use data already available from the phone and rover to reduce the amount of movement that must be inferred from the images alone. The reconstruction pipeline runs locally and builds on open-source technologies including Brush for Gaussian-splat reconstruction, Whisper for speech transcription, and YOLO for object detection.",
      "This local-first architecture was important to the team. Personal memories can contain private conversations, faces, locations, and possessions. Spark was designed so that much of the processing could happen on the user’s own computer or directly in the browser rather than requiring footage to be uploaded to an external cloud service.",
      "Once a scan is complete, it becomes more than a 3D model. Each memory can be connected to photographs, detected objects, conversation transcripts, routes, and notable moments. Memories can be organized into trips, placed on a map, shared publicly, or kept private. The goal is to make memories feel less like folders and more like places a person can return to.",
    ],
    image: "assets/spark/sai-at-work.png",
    imageId: "sai-at-work",
    video: "s5GVI3ibZUA",
    link: "https://devpost.com/software/spark-350yoq",
    winner: true,
    cta: "View on Devpost →",
    repo: "https://github.com/sai3000pro/spark",
    photos: [
      "assets/spark/homepage.png",
      "assets/spark/album.png",
      "assets/spark/generated-walk.jpg",
      "assets/spark/world-map.png",
      "assets/spark/stats.png",
      "assets/spark/architecture.png",
      "assets/spark/gallery.png",
      "assets/spark/capture.png",
      "assets/spark/aerial-view-via-splat.jpg",
      "assets/spark/rover.jpg",
      "assets/spark/rover-top-view.jpg",
      "assets/spark/vietnamese-dinner.jpg",
      "assets/spark/winners.jpg",
    ],
    photoCaptions: [
      "Spark’s landing page introduces the idea of stepping back into a captured memory.",
      "The Album view presents completed Gaussian-splat memories as places to revisit.",
      "A generated walk demonstrates the reconstructed scene from an exploratory viewpoint.",
      "The World Map view plots captured memories and moments at their geographic locations.",
      "Spark’s statistics view surfaces reconstruction and memory-capture data.",
      "An architecture diagram shows how Spark connects capture hardware, local processing, and the web experience.",
      "The Gallery view organizes photographs and preserved moments from a memory.",
      "The Capture view starts a new scan and connects the rover or phone to Spark.",
      "An aerial Gaussian-splat view shows the reconstructed environment from above.",
      "The custom camera rover used to collect imagery while moving through an environment.",
      "A top-down photograph shows the rover’s camera, chassis, and drive layout.",
      "A captured dinner scene illustrates how Spark preserves an event as a spatial memory.",
      "The Spark team celebrates its SummerHacks win with the project and award materials.",
    ],
    tech: [
      "Next.js",
      "TypeScript",
      "Python",
      "Swift",
      "Three.js",
      "ARKit",
      "LiDAR",
      "YOLO",
      "Whisper",
      "Gaussian Splatting",
    ],
  },
  {
    title: "CORnet-Mouse",
    description:
      "A biologically-constrained neural network modelling the mouse visual and muscular system with reinforcement learning. In a custom Unity world, the mouse forages while fleeing a looming hawk and ignoring harmless clouds — guided by a reward function that balances survival, foraging, and energy. SYDE 552 final project.",
    tagline: "Biologically-modeled mouse brain trained to survive in a Unity world.",
    details:
      "A SYDE 552 final project that models the mouse visual and motor system using CORnet — a biologically-constrained deep neural network architecture. The model is trained with reinforcement learning inside a custom Unity environment where the mouse must forage for food while fleeing a looming hawk overhead, without being distracted by harmless passing clouds. A hand-crafted reward function balances survival, foraging efficiency, and energy expenditure, pushing the agent toward naturalistic behaviour rather than pure score maximisation.",
    summary: [
      "When a hawk's shadow expands overhead, a mouse has milliseconds to choose: freeze, or bolt for cover. This project asks whether an artificial neural network, trained under the same survival pressures, converges on the same circuit design evolution already found.",
      "We built a biologically-constrained dual-pathway network modelling the mouse visuo-motor system end to end — from retina to spinal motor output. A fast subcortical pathway (retina → superior colliculus → periaqueductal gray) handles split-second reflexive freeze/escape decisions, mirroring circuitry that survives even when the visual cortex is lesioned. A slower cortical pathway — including CORnet-M, a mouse-adapted variant of the primate CORnet-S architecture, redesigned with parallel, neuron-count-scaled visual areas instead of a serial chain — handles contextual evaluation: what the threat actually is, and where the nearest shelter lies. The two streams converge at the motor output, competing through a softmax gate that mirrors the real mutual inhibition between the brain's escape and freeze circuits.",
      "Rather than training on static labelled datasets, we trained the model inside a custom Unity 3D environment where an agent forages for food while evading a looming aerial predator, learning to ignore harmless sweeping distractors. Its actions drive real physical forces — inertia, acceleration limits, turning radius — so the network has to solve actual motor control, not just classification. A hand-crafted reward function balances foraging, death, and energy expenditure, so freeze-vs-flee behaviour emerges from ecological pressure rather than being hard-coded.",
      "To evaluate whether the architecture's structure is actually necessary — not just sufficient — we designed in-silico lesion studies: ablating the fast pathway, the cortical pathway, or both, and comparing survival outcomes against the intact model.",
    ],
    image: "assets/cornet-environment.png",
    imageId: "cornet-environment",
    // Derivatives, not the originals: the gallery renders a plain <img> with no srcSet, so
    // whatever is listed here is what ships. The widest derivative of each is still under
    // 20KB and the grid never draws these above ~430px.
    photos: ["assets/derived/cornet-predator-790w.webp", "assets/derived/cornet-agent-800w.webp"],
    link: "assets/CORnet-Mouse.pdf",
    cta: "Read paper →",
    repo: "https://github.com/Kriti1400/Syde552-Project",
    tech: ["Python", "Unity", "Reinforcement Learning", "AI/ML"],
  },
  {
    title: "Verbalyst",
    description: "Empowering speech, unleashing confidence.",
    tagline: "Upload a recording. Get AI feedback on your speech in seconds.",
    details:
      "Verbalyst is an AI speech-coaching web app built at a hackathon. Users upload an MP4 recording and the platform runs it through AssemblyAI to produce an accurate transcript, then feeds that transcript into Google Vertex AI for a detailed breakdown covering pacing, filler-word frequency, clarity, and overall confidence. A Flask + Python backend ties the two APIs together, while a Tailwind-styled vanilla JS frontend keeps the experience fast and focused. Won Best Overall at the hackathon.",
    image: "assets/verbalyst.png",
    imageId: "verbalyst",
    link: "https://devpost.com/software/verbalyst",
    winner: true,
    tech: ["Python", "Flask", "JavaScript", "HTML", "CSS", "Tailwind", "AI/ML"],
  },
  {
    title: "Healthut",
    description: "Making mental health resources simple and accessible.",
    tagline: "Mental health support on the web and straight into Discord.",
    details:
      "Healthut is a two-part mental health companion. The website surfaces curated resources organised by topic — crisis lines, self-help tools, community forums — with a clean HTML/CSS/JS interface designed to reduce friction when someone needs help fast. Alongside it, a Python-powered Discord bot brings the same resources directly into the servers where people already spend time, letting users search and browse without ever leaving their community. The Healthut logo was hand-drawn in Procreate.",
    image: "assets/Healthut.png",
    imageId: "healthut",
    link: "https://devpost.com/software/healthub",
    winner: true,
    tech: ["Python", "JavaScript", "HTML", "CSS"],
  },
  {
    title: "PatronPal",
    description: "Support your favorite creators, your way.",
    tagline: "A Chrome extension that makes tipping creators effortless.",
    details:
      "PatronPal lowers the barrier between fans and the creators they love. A Chrome extension built on Google Manifest V3 detects creator content as you browse and surfaces a one-click support panel without interrupting your flow. The extension talks to a Flask + Python backend that handles transactions and creator profiles, while the web dashboard — built with Tailwind and Flowbite components — gives creators a clean home to manage their page and track support.",
    image: "assets/patronPal.png",
    imageId: "patronpal",
    link: "https://devpost.com/software/patronpal",
    tech: ["Python", "Flask", "JavaScript", "HTML", "CSS", "Tailwind"],
  },
  {
    title: "devDucky",
    description: "Ever needed a rubber ducky timeout?",
    tagline: "An AI rubber duck that runs locally and never judges you.",
    details:
      "devDucky is a local-first AI debugging companion that runs entirely on your machine — no cloud, no data leaks. Describe your bug or paste in your code and a locally hosted LLM (served via Ollama with Unsloth-optimised models) walks you through the problem Socratically, asking questions rather than just handing you the answer. Session history is stored with Mongoose so you can revisit past debugging threads. The stack is a Vite + Node/Express frontend paired with a Flask + Python backend.",
    image: "assets/devDucky.jpg",
    imageId: "devducky",
    link: "https://devpost.com/software/devducky",
    tech: ["Python", "Flask", "JavaScript", "Node.js", "Express", "Vite", "AI/ML"],
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

export interface NavLink {
  label: string;
  /** In-page anchor on "/" (no leading "#"). Mutually exclusive with `to`. */
  section?: string;
  /** Router path, for links that leave the landing page. */
  to?: string;
  /**
   * Sub-destinations. An entry with children becomes a dropdown on the desktop bar
   * — one trigger, one tab stop — so adding routes here never widens the bar. The
   * mobile sheet has room and lists parent + children flat instead.
   *
   * Children are leaves: they carry `to` only, and are not nested further.
   */
  children?: NavLink[];
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", section: "home" },
  { label: "About", section: "about" },
  { label: "Experience", section: "experience" },
  { label: "Projects", section: "projects" },
  { label: "Contact", section: "contact" },
  {
    // The hub at /hobbies survives as its own page; these four are the routes it
    // was split into. Keeping the hub as the parent `to` is what keeps it
    // reachable — nothing else in the site links to it.
    label: "Beyond the Code",
    to: "/hobbies",
    children: [
      { label: "Photography", to: "/gallery" },
      { label: "Blog", to: "/blog" },
      { label: "Gaming", to: "/gaming" },
      { label: "Volunteering", to: "/volunteering" },
    ],
  },
];
