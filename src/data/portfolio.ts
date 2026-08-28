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
  /**
   * What `image` actually depicts, for the hero tile the case-study gallery adds when a
   * project has both a video and an image. Optional: without it the alt text names the
   * tile's role instead of its contents, which is correct-but-vague rather than wrong.
   * Worth writing whenever the hero shows something a reader would otherwise miss.
   */
  imageAlt?: string;
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
    imageAlt: "Spark — interactive Gaussian-splat memory capture",
    video: "s5GVI3ibZUA",
    link: "https://devpost.com/software/spark-350yoq",
    winner: true,
    cta: "View on Devpost →",
    repo: "https://github.com/sai3000pro/spark",
    // Derived WebP, not the originals in public/assets/spark/. This gallery renders a
    // plain <img> with no srcSet, so a listed path is shipped at full size into a tile
    // that is never drawn above ~430px — these thirteen were 25.2MB of PNG and JPEG for
    // roughly 700KB of actual pixels. The originals stay on disk and remain the right
    // file for og:image and anything print-bound.
    photos: [
      "assets/derived/homepage-800w.webp",
      "assets/derived/album-800w.webp",
      "assets/derived/generated-walk-800w.webp",
      "assets/derived/world-map-800w.webp",
      "assets/derived/stats-800w.webp",
      "assets/derived/architecture-800w.webp",
      "assets/derived/gallery-800w.webp",
      "assets/derived/capture-800w.webp",
      "assets/derived/aerial-view-via-splat-800w.webp",
      "assets/derived/rover-800w.webp",
      "assets/derived/rover-top-view-800w.webp",
      "assets/derived/vietnamese-dinner-800w.webp",
      "assets/derived/winners-800w.webp",
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
    title: "ScaleUp",
    description:
      "An AI music tutor that listens while you play, watches how you hold the instrument, and coaches you out loud between phrases. Skills sit on an RPG-style tree and decay on a spaced-repetition schedule, so the technique you stop practising comes back as tomorrow's quest. Built at Ignition Hacks.",
    tagline: "An AI music tutor that hears the flat note while it is still in the air.",
    details:
      "ScaleUp is an AI music tutor built at Ignition Hacks. Pick an instrument, open a node on its skill tree, and play the exercise behind it: the browser captures the take with the Web Audio API and turns it into note events, aligns them against the written score with dynamic time warping, and reads your posture from MediaPipe hand and body landmarks. The result is a grade in the terms a teacher actually uses — intonation in cents, rhythm by elastic alignment, dynamics as rank agreement — plus spoken feedback in an examiner's voice. Every attempt feeds an SM-2 spaced-repetition schedule, so skills fade when you stop practising them and resurface as daily quests. Six instruments ship with published curricula, and naming an unsupported one has Gemini generate a valid prerequisite graph for it.",
    summary: [
      "The expensive half of learning an instrument is not the scales — those are in every book. It is having a second pair of ears in the room: someone who hears the flat third while it is still in the air, and who remembers that your left hand collapsed the same way two months ago. ScaleUp is an attempt to build that ear, and to be honest about the parts it cannot hear.",
      'Everything measurable happens in the browser. The Web Audio API captures a take and a pitch tracker turns it into note events with onset, duration and cents deviation; dynamic time warping aligns those against the MusicXML score, so the feedback is "you rushed bars 5–8", not one opaque percentage. MediaPipe reads 33 body and 21 hand landmarks against 16 posture rules — and only the landmarks ever leave the page, never video. The measurements are deliberately chosen to match what a teacher listens for: intonation in cents rather than nearest-note, so a quarter-tone-flat string is a number instead of a pass; rhythm by elastic alignment, so playing slowly to get it right stops being scored as an error; dynamics as rank agreement, so the question is whether the crescendo happened rather than how loud the room was.',
      "The hard part of a live coach turned out to be knowing when not to speak. A tutor who comments on every mistake is talking over the thing you are trying to fix, so the coach holds a WebSocket open for the length of a take, follows the notes at about 10 Hz with no model involved, and speaks at most a few times — only at phrase boundaries, after at least 0.6 s of silence. The examiner's voice streams from ElevenLabs sentence by sentence so audio starts before the sentence ends, and with no API key configured every response still carries its text for the OS voice to speak. Audio is the upgrade; the words are the guarantee.",
      "Underneath the tutor is a skill tree with spaced repetition — Anki's retention mechanics pointed at an instrument. Proficiency decays on a half-life tied to your own review interval, so the quest board always knows what is fading, and nothing time-derived is stored as a number that could drift. Six instruments ship with versioned, published curricula, but skills are defined once in a shared catalogue and each instrument selects and specialises from it: banjo is the proof, with five of its seven concepts taken from the catalogue and scored through the guitar evaluator with no banjo-specific code at all.",
      "Two rules hold everywhere. The deterministic path is the floor and never a mock — scoring, examiner feedback and score generation all work with no keys and no network, so a model can improve the wording but can never change the numbers. And an unreliable measurement never becomes a confident grade: silence, a low-confidence alignment or a hand the camera cannot see is reported as missing rather than scored zero, and withholds EXP instead of inventing a number.",
    ],
    image: "assets/scaleup/landing.jpg",
    imageId: "landing",
    imageAlt: "ScaleUp’s landing page — the pitch, and Quartz the mascot",
    video: "pG5L6LhzR7Y",
    link: "https://scaleup-ashen.vercel.app/",
    cta: "Try the live app →",
    repo: "https://github.com/sai3000pro/ScaleUp",
    // Derived WebP rather than the originals: this grid renders a plain <img> with no
    // srcSet, so whatever is listed here is what ships. Same rule as CORnet-Mouse below.
    photos: [
      "assets/derived/skill-tree-800w.webp",
      "assets/derived/skill-detail-800w.webp",
      "assets/derived/courses-800w.webp",
      "assets/derived/quests-800w.webp",
      "assets/derived/world-800w.webp",
      "assets/derived/video-analysis-800w.webp",
      "assets/derived/character-800w.webp",
    ],
    photoCaptions: [
      "The piano skill tree — eleven skills wired into a prerequisite graph, with the two currently unlocked shown in green.",
      "Opening a node shows its level, EXP, mastery and next review date, alongside the drill formats available for it.",
      "The course list. Each campaign is a skill tree, and naming an instrument ScaleUp does not know has Gemini generate one.",
      "Daily quests are the decay system surfacing: skills fade over time, and rescuing a decayed one pays up to 1.5× EXP.",
      "Each skill node opens into a 3D world where the lessons behind it are laid out in order.",
      "Video technique analysis runs hand and body landmarks over a local MP4 — the file and its audio never leave the browser.",
      "Character setup. The archetype shapes your style, never your ability to learn.",
    ],
    tech: [
      "Next.js",
      "React",
      "TypeScript",
      "Python",
      "FastAPI",
      "PostgreSQL",
      "Neo4j",
      "Three.js",
      "MediaPipe",
      "Web Audio",
      "ElevenLabs",
      "Gemini",
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
    photoCaptions: [
      "The looming stimulus from the agent's own point of view — a dark ellipse swelling overhead, with the shelter wedge a short run away across the ground plane.",
      "The agent in the Unity editor. It is a plain rigid body, so the network's outputs have to move a mass under real inertia and turning limits rather than teleporting it.",
    ],
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
      "Verbalyst is an AI speech-coaching web app built at a hackathon. Users upload an MP4 recording and the platform runs it through AssemblyAI to produce an accurate transcript, then feeds that transcript into Google Vertex AI for a detailed breakdown covering pacing, filler-word frequency, clarity, and overall confidence. A Flask + Python backend ties the two APIs together, while a Tailwind-styled vanilla JS frontend keeps the experience fast and focused. Won Best Web at Ignition Hacks 2023.",
    summary: [
      "Coming out of lockdown, holding a conversation was one thing; standing up in front of a room was another entirely. Verbalyst started from that gap — the observation that speaking to a group is a skill people are expected to have and almost never get to rehearse with feedback. It was built at Ignition Hacks 2023, where it won Best Web.",
      "The app records you through the browser with both microphone and camera, as many takes as you want, and then tells you what you actually did. AssemblyAI transcribes the recording; Google Vertex AI reads the transcript back for stutters, filler words, pacing and clarity. A stats page charts those counts across successive recordings, which is the part that matters — a single take tells you very little, and the value is in watching the filler-word count fall over a fortnight. For anyone already confident there is a tongue-twister generator, which is less a game than a way to catch habits that only surface under pressure.",
      "It was built under an unusual constraint: scheduling conflicts meant the team started roughly 26 hours into the event. The honest version of what that cost is that both AI components worked — transcription and analysis each ran end to end — but wiring them together behind the Flask backend into one seamless flow did not fully land inside the remaining time. The recording front end, the analysis, and the transcription all shipped and demoed; the seam between them was the casualty.",
      "My own share was the front end — the pages in HTML, Tailwind and vanilla JavaScript, the Chart.js progress views — along with the research into which speech impediments were realistically detectable from a transcript, and the pitch video.",
    ],
    image: "assets/verbalyst.png",
    imageId: "verbalyst",
    imageAlt: "Verbalyst’s home page — record, stop and upload a speech for analysis",
    video: "DQIi4ZNcR2M",
    link: "https://devpost.com/software/verbalyst",
    winner: true,
    repo: "https://github.com/sai3000pro/Verbalyst",
    photos: [
      "assets/derived/recorder-800w.webp",
      "assets/derived/analysis-800w.webp",
      "assets/derived/progress-800w.webp",
      "assets/derived/tongue-twisters-800w.webp",
    ],
    photoCaptions: [
      "Record a speech in the browser or upload an MP4, and Verbalyst transcribes it.",
      "The AI response counts stutters and filler words back at you, with advice on pacing and pausing.",
      "The stats page charts speech impediments over successive recordings, so progress is visible.",
      "A tongue-twister generator for anyone already confident, to catch habits under pressure.",
    ],
    tech: ["Python", "Flask", "JavaScript", "HTML", "CSS", "Tailwind", "AI/ML"],
  },
  {
    title: "Healthut",
    description: "Making mental health resources simple and accessible.",
    tagline: "Mental health support on the web and straight into Discord.",
    details:
      "Healthut is a two-part mental health companion. The website surfaces curated resources organised by topic — crisis lines, self-help tools, community forums — with a clean HTML/CSS/JS interface designed to reduce friction when someone needs help fast. Alongside it, a Python-powered Discord bot brings the same resources directly into the servers where people already spend time, letting users search and browse without ever leaving their community. The Healthut logo was hand-drawn in Procreate. Won the Popular Vote at Recess Hacks 3.0.",
    summary: [
      "Good social contact is load-bearing for mental health — it tracks with memory, cognitive function, self-esteem, even physical health. The trouble is that the fear of rejection or judgement is exactly what stops people reaching for it, and that loop tightens into social anxiety. Healthut was built at Recess Hacks 3.0, for students on the wrong side of that loop, and won the Popular Vote.",
      "It is a hub rather than an app with one trick. Level 0 is the page you want when things are bad right now: crisis lines, helplines, youth mental-health organisations, and area-specific services, with nothing between you and the phone number. Everything else is for the ordinary days.",
      "The centrepiece is Conversation Sparkers — three escalating decks of prompts, Perception, Connection and Reflection, that get more searching as you go up. You can refresh a batch, keep the ones you like, or level up when you are ready for something more personal; the shuffle is random per visit, so no two people get the same set. Alongside it is a notes page for holding on to anything useful.",
      "The original plan was live chat, and abandoning it turned out to be the best decision of the weekend. Building a chat platform properly was out of reach in the time available, so the team put the same prompts into a Discord bot instead — which meant the tool arrived where students already were rather than asking them to come to a new site. It answers /prompt with a set of three questions at your chosen level, and /wildcard for something further out. Group leaders and coordinators can run it as an icebreaker, which was never the plan and is arguably the more useful outcome.",
    ],
    image: "assets/Healthut.png",
    imageId: "healthut",
    imageAlt: "Healthut’s home page — a central hub of mental health resources for students",
    video: "EatnwitU4UQ",
    link: "https://devpost.com/software/healthub",
    winner: true,
    repo: "https://github.com/sai3000pro/Wellness-App",
    photos: [
      "assets/derived/resources-800w.webp",
      "assets/derived/sparkers-800w.webp",
      "assets/derived/notes-800w.webp",
      "assets/derived/discord-bot-800w.webp",
    ],
    photoCaptions: [
      "Level 0 collects the resources someone needs fast — crisis lines, helplines and area-specific services.",
      "Conversation Sparkers deals randomly generated prompts across three levels, from first impressions to reflection.",
      "A notes page for writing down and keeping anything useful found along the way.",
      "The Discord bot brings the same prompts into the servers people already spend time in.",
    ],
    tech: ["Python", "JavaScript", "HTML", "CSS"],
  },
  {
    title: "devDucky",
    description: "Ever needed a rubber ducky timeout?",
    tagline: "An AI rubber duck that runs locally and never judges you.",
    details:
      "devDucky is a local-first AI debugging companion that runs entirely on your machine — no cloud, no data leaks. Describe your bug or paste in your code and a locally hosted LLM (served via Ollama with Unsloth-optimised models) walks you through the problem Socratically, asking questions rather than just handing you the answer. Session history is stored with Mongoose so you can revisit past debugging threads. The stack is a Vite + Node/Express frontend paired with a Flask + Python backend. Built at Hack the 6ix 2024.",
    summary: [
      "Rubber duck debugging works because explaining a problem out loud forces you to state it precisely, at which point you often hear the answer yourself. devDucky, built at Hack the 6ix 2024, asks the obvious follow-up question: what if the duck answered back? Not a chat window in a browser tab — an actual duck on the desk, listening, with an IDE behind it watching the codebase.",
      "The model runs entirely on your machine, and that is the design constraint everything else follows from. Three candidates were fine-tuned with Unsloth on Yahma's alpaca-cleaned 52k dataset — llama3.1 at 375 steps, tinyllama for one epoch, phi3 at 375 steps — and all quantised to Q4_K_M. phi3 won, not on quality but on hardware: the team's laptops could not keep the larger fine-tunes fed, and that was discovered late enough to count as a real scare. Ollama serves the model, Flask runs as a dedicated microservice around it, Express and Node handle the audio capture and analysis, Vite carries the front end, and Mongoose keeps transcripts and responses so a debugging thread can be picked back up later.",
      "Giving the duck ears was the part that ate the weekend. The plan was an RP2040, which turned out to have no compatible microphone hardware. An Arduino Nano with a built-in mic worked after about eight hours of troubleshooting, and then produced so much static interference that it was unusable. The answer in the end was a USB microphone, which worked immediately. The lesson the team wrote down afterwards was to test hardware before designing around it.",
      "What they were proudest of was the privacy story — nothing leaves the machine, no third party sees your code — and their own benchmarking, which put the base model roughly 15% ahead of Copilot on efficiency and closer to 35% once fine-tuning and retrieval were in play. Those are the team's own figures against their own measure, and are quoted here as such.",
    ],
    image: "assets/devDucky.jpg",
    imageId: "devducky",
    imageAlt: "The devDucky rubber duck on the desk, wired up beside the laptop",
    video: "ThH3bY5l78c",
    link: "https://devpost.com/software/devducky",
    repo: "https://github.com/yukui5401/devDucky2024",
    photos: [
      "assets/derived/mic-rig-800w.webp",
      "assets/derived/ide-800w.webp",
      "assets/derived/observability-800w.webp",
    ],
    photoCaptions: [
      "The duck wired up beside the laptop. The plan was an RP2040 for ears; the hardware that finally worked was a USB mic.",
      "The IDE homepage — an editor that does more than hold your code.",
      "The observability dashboard graphs CPU time per instance while the model watches the codebase.",
    ],
    tech: ["Python", "Flask", "JavaScript", "Node.js", "Express", "Vite", "AI/ML"],
  },
  {
    title: "HydroHomies",
    description:
      "A gamified hydration tracker built at DeltaHacks 12. A custom TensorFlow Lite model runs on-device to check you are actually drinking, a virtual pet lives or wilts on your daily goal, and the leaderboard ranks friends by percentage of goal met rather than raw volume.",
    tagline: "Drink water, beat your friends, don't let the pet die.",
    details:
      "HydroHomies is a gamified hydration tracker built at DeltaHacks 12, aimed at the fact that existing hydration apps feel like chores. Onboarding calculates your actual daily requirement from height, weight, age and activity level using the Mifflin-St Jeor equation. Instead of manual entry you point the camera at your bottle: a custom object-detection model, trained in Teachable Machine and exported to TensorFlow Lite, runs on-device to distinguish a full bottle from an empty one and verify you are drinking. A virtual pet evolves as you hit goals and visibly wilts when you do not, and a leaderboard ranks friends by percentage of their own goal met, so a 5'2\" user competes fairly with a 6'5\" one. Built with React Native and Expo on Firebase, with a 'Thirst Limit' algorithm capping XP per hour so the game cannot be farmed.",
    summary: [
      "It is four in the afternoon, your head hurts, and you have not had water since breakfast. Every hydration app already knows this about you and none of them help, because they are chores with a progress bar. HydroHomies, built at DeltaHacks 12, went after the two things that actually move behaviour — social pressure and nostalgia — and borrowed its shape from Tamagotchi and Duolingo rather than from a health tracker.",
      "It starts by working out what you actually need. Onboarding takes height, weight, age and activity level and runs the Mifflin-St Jeor equation, which is a real answer rather than the folk wisdom of eight cups a day. From there the loop is a virtual pet: hit your goal and it evolves, miss it and it visibly wilts. The leaderboard ranks friends by percentage of their own target met, not by volume, so a 5'2\" user and a 6'5\" one are competing on the same terms.",
      "Logging is a camera problem rather than a form. A custom object-detection model trained in Teachable Machine and exported to TensorFlow Lite runs on-device, classifying full bottle, empty bottle and no bottle, and verifying that you drank rather than taking your word for it. Clear plastic turned out to be genuinely hard — it is reflective and changes appearance under every light — so the model was retrained repeatedly against varied backgrounds, and bridging TFLite to Expo's camera without crashing the scan meant a fight with native dependencies.",
      "The two things the team had to tune by feel were the pet's health decay, which is discouraging if it dies too fast and boring if it never does, and the anti-cheating rules — a Thirst Limit capping XP per hour, and a realistic daily ceiling on how much water can earn anything. Their conclusion afterwards was that gamification only works when the feedback is instant: the pet smiling is doing more work than any number on the screen.",
    ],
    image: "assets/hydrohomies/title-card.png",
    imageId: "title-card",
    imageAlt: "The HydroHomies title card and its pixel-art turtle-in-a-glass mascot",
    link: "https://devpost.com/software/hydrohomies",
    cta: "View on Devpost →",
    repo: "https://github.com/sai3000pro/HydroHomies",
    photos: [
      "assets/derived/detection-764w.webp",
      "assets/derived/hydropet-800w.webp",
      "assets/derived/fair-play-800w.webp",
    ],
    photoCaptions: [
      "Scan-to-track: the on-device model detects the bottle and estimates volume, with its confidence shown before you confirm.",
      "The HydroPet ecosystem and the fair-play leaderboard, which ranks by percentage of goal rather than litres.",
      "The anti-cheating rules — a 'Thirst Limit' caps XP per hour, and daily logging stops at a realistic ceiling.",
    ],
    tech: ["React Native", "Expo", "TypeScript", "TensorFlow Lite", "Firebase", "AI/ML"],
  },
];

/**
 * A second-shelf project.
 *
 * Deliberately NOT `Project`. It started as one, but the two constraints diverged: a
 * constellation project always has somewhere to send you, while a course project has a
 * link only if its code can be public — and for CS 241 and CS 246 it cannot be, because
 * a searchable solution to a course assignment is a problem for whoever takes it next.
 * Widening `Project.link` to optional would have loosened the type for the seven featured
 * projects and their thirteen annotations to buy nothing; a narrower type for the shelf
 * costs one interface and keeps `link` required exactly where it is genuinely required.
 *
 * These get no /projects/<slug> page. scripts/routes.mjs derives those by slicing
 * portfolio.ts from `export const PROJECTS` to the next top-level `export`, so this array
 * sits outside that window and is invisible to the prerenderer, the sitemap and the OG
 * generator by construction rather than by a flag three scripts would each have to honour.
 */
export interface ShelfProject {
  title: string;
  description: string;
  /** Card thumbnail. Absent for the projects nobody has a capture of. */
  image?: string;
  imageId?: GeneratedImageId;
  /** Where the card sends you. Absent when there is nowhere public to send anyone. */
  link?: string;
  /** Label for `link`. */
  cta?: string;
  /**
   * Shown in place of the link when there is none, so a card without one still says why
   * rather than just ending. "Code available on request" is a sentence a reader can act
   * on; a dead card is not.
   */
  linkNote?: string;
  repo?: string;
  /** Extra frames, opened in the shared lightbox from the card's thumbnail. */
  photos?: string[];
  photoCaptions?: string[];
  tech?: string[];
}

/**
 * Ordered strongest-first rather than chronologically, with one layout concession: the two
 * cards that have screenshots lead, because a grid row sizes to its tallest card and
 * putting both images in the first row keeps the text-only cards below it compact.
 */
export const MORE_PROJECTS: ShelfProject[] = [
  {
    title: "SmartSkin",
    description:
      "A wearable that tracks humidity and temperature and warns people with eczema before a flare-up, grading local conditions 0–9. Built at GeeseHacks.",
    image: "assets/smartskin/bench.jpg",
    imageId: "bench",
    link: "https://devpost.com/software/smartskin-sqmony",
    cta: "View on Devpost →",
    repo: "https://github.com/sai3000pro/EczemaMitigator",
    photos: [
      "assets/derived/wearable-800w.webp",
      "assets/derived/flareups-800w.webp",
      "assets/derived/readout-800w.webp",
      "assets/derived/whiteboard-800w.webp",
    ],
    photoCaptions: [
      "The prototype in hand — sensor board, battery and lead, small enough to clip on.",
      "The landing page, built around the 15–20% of Canadians diagnosed with some form of eczema.",
      "The dashboard reads current temperature and humidity straight off the wearable.",
      "The architecture worked out on a whiteboard: Arduino to Python, then out to the extension and the front end.",
    ],
    tech: ["Python", "React", "TypeScript", "Express", "Arduino", "Tailwind"],
  },
  {
    title: "PatronPal",
    description:
      "A Chrome extension that splits one small monthly budget across the creators you actually watch, weighted by how much you watch them. Built at Hack the 6ix 2023.",
    image: "assets/patronPal.png",
    imageId: "patronpal",
    link: "https://devpost.com/software/patronpal",
    cta: "View on Devpost →",
    photos: ["assets/derived/extension-800w.webp", "assets/derived/creators-800w.webp"],
    photoCaptions: [
      "The extension surfaces a support panel over the video you are already watching.",
      "The dashboard ranks creators by time watched and shows what each one is being paid.",
    ],
    tech: ["Python", "Flask", "JavaScript", "HTML", "CSS", "Tailwind"],
  },
  {
    title: "Mini-C Compiler",
    description:
      "A compiler for a subset of C, written in C++: tokenisation, LR(1) parsing on a pushdown automaton, semantic analysis over an AST, and code generation targeting MIPS assembly. Constant folding, function inlining and dead-code elimination on top — 21st of 300+ students for binary size. CS 241 at Waterloo.",
    linkNote: "Course project — code available on request",
    tech: ["C++", "Compilers", "MIPS"],
  },
  {
    title: "Biquardis",
    description:
      "A Tetris-style game in C++ built on MVC, with an Observer-pattern game state to keep coupling down, event-driven 2D graphics over X11, custom keybinds, and smart pointers throughout so nothing leaks. CS 246 at Waterloo.",
    linkNote: "Course project — code available on request",
    tech: ["C++", "OOP", "MVC", "X11"],
  },
  {
    title: "COVID-19 Spike Protein Plasmid",
    description:
      "A plasmid designed in Benchling to mass-produce SARS-CoV-2 spike protein for vaccine development, built from NCBI reference sequence NC_045512.2 and the pxP420 backbone.",
    link: "https://benchling.com/s/seq-WpdLWcbE5lQy0nijXcfb",
    cta: "View the sequence →",
    tech: ["Benchling", "Recombinant DNA"],
  },
  {
    title: "Jump Whale",
    description:
      "A parody of Jump King written in Java: one whale, one jump arc, and a very long way back down.",
    link: "https://github.com/sai3000pro/Jump-Whale",
    cta: "View the source →",
    repo: "https://github.com/sai3000pro/Jump-Whale",
    tech: ["Java"],
  },
  {
    title: "TicTacToe Remastered",
    description:
      "Tic-tac-toe in C++ with the board size left up to you, so the win condition has to be worked out rather than hard-coded.",
    link: "https://github.com/sai3000pro/TicTacToeRemastered",
    cta: "View the source →",
    repo: "https://github.com/sai3000pro/TicTacToeRemastered",
    tech: ["C++"],
  },
  {
    title: "Townia and the Tyrant",
    description:
      "A text-based adventure in Java — save the town of Townia from a firedrake tyrant. Written as an ICS4U project.",
    link: "https://github.com/sai3000pro/TowniaAndTheTyrant",
    cta: "View the source →",
    repo: "https://github.com/sai3000pro/TowniaAndTheTyrant",
    tech: ["Java"],
  },
  {
    title: "Pong",
    description:
      "The 1972 arcade original rebuilt in Java — two paddles, one ball, first to five points wins.",
    link: "https://github.com/sai3000pro/Pong",
    cta: "View the source →",
    repo: "https://github.com/sai3000pro/Pong",
    tech: ["Java"],
  },
  {
    title: "The Simon Game",
    description:
      "The colour-and-sound memory game of the '70s, rebuilt as a web game in vanilla JavaScript.",
    link: "https://github.com/sai3000pro/TheSimonGame",
    cta: "View the source →",
    repo: "https://github.com/sai3000pro/TheSimonGame",
    tech: ["JavaScript", "HTML", "CSS"],
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
