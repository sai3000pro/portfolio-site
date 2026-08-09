import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";
import { Github, Linkedin, Mail, ArrowUp } from "lucide-react";

import { KEYS } from "@/data/achievements";
import { GENERATED_IMAGES } from "@/data/images.generated";
import { PROFILE, ROLES, SOCIALS } from "@/data/portfolio";
import { trackMember, unlock } from "@/lib/achievements";
import { About } from "@/components/portfolio/about";
import { Experience } from "@/components/portfolio/experience";
import { Projects } from "@/components/portfolio/projects";
import { Contact, Footer } from "@/components/portfolio/contact";
import { Nav } from "@/components/portfolio/nav";
import { Starfield } from "@/components/portfolio/starfield";
import { assetUrl } from "@/lib/assets";
import { absoluteUrl } from "@/lib/site-url";

const SOCIAL_ICONS: Record<string, typeof Github> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Email: Mail,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saivenkat Jilla: Software Engineer, Creator, and Problem Solver" },
      {
        name: "description",
        content:
          "Portfolio of Sai (Saivenkat Jilla) — Software Engineer studying at the University of Waterloo",
      },
      {
        property: "og:title",
        content: "Saivenkat Jilla: Software Engineer, Creator, and Problem Solver",
      },
      {
        property: "og:description",
        content:
          "Portfolio of Sai (Saivenkat Jilla) — Software Engineer studying at the University of Waterloo",
      },
    ],
    // The root shell deliberately declares no canonical (it would apply to every route —
    // see the comment in __root.tsx), so "/" declares its own here. absoluteUrl() with no
    // argument is the site root, trailing slash included.
    links: [{ rel: "canonical", href: absoluteUrl() }],
  }),
  component: Index,
});

/**
 * Typewriter cycling through ROLES for the hero headline.
 *
 * `frozen` (prefers-reduced-motion) skips the timer chain entirely and settles on the
 * first role, so nothing animates and nothing ticks for the life of the page. The freeze
 * is applied from the effect, not from render, so the pre-hydration markup is the same
 * either way and reduced motion cannot introduce a hydration mismatch.
 */
function useRotatingRole(frozen: boolean): string {
  const [text, setText] = useState("");

  useEffect(() => {
    if (frozen) {
      setText(ROLES[0]);
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    let roleIdx = 0;
    let charIdx = 0;
    let deleting = false;

    const tick = () => {
      const full = ROLES[roleIdx];
      if (!deleting) {
        charIdx++;
        setText(full.slice(0, charIdx));
        if (charIdx === full.length) {
          deleting = true;
          timeout = setTimeout(tick, 2600);
          return;
        }
        timeout = setTimeout(tick, 105);
      } else {
        charIdx--;
        setText(full.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          roleIdx = (roleIdx + 1) % ROLES.length;
          timeout = setTimeout(tick, 700);
          return;
        }
        timeout = setTimeout(tick, 55);
      }
    };

    timeout = setTimeout(tick, 600);
    return () => clearTimeout(timeout);
  }, [frozen]);

  return text;
}

/**
 * The rotating headline, isolated in its own leaf component.
 *
 * The typewriter re-renders 10-18x/s forever, so the hook must NOT live in Hero — that
 * would rebuild the portrait, the name, the spinning ball and every stagger child (each
 * with fresh inline style objects) on every keystroke. Here only this text node re-renders.
 *
 * ACCESSIBILITY: the animated text is `aria-hidden`. It is mid-word most of the time
 * ("Amateur Photograph"), and assistive tech reading the region — or re-reading it after
 * the DOM mutates — would voice that fragment as if it were the content. The complete list
 * of roles is exposed once, statically, instead: strictly more information than the visual
 * treatment shows at any instant, and it never changes under the reader.
 */
function RotatingRole() {
  const prefersReduced = useReducedMotion() === true;
  const role = useRotatingRole(prefersReduced);

  return (
    <>
      <span aria-hidden="true">
        {role || "\u00A0"}
        <span className="type-caret">|</span>
      </span>
      <span className="sr-only">{ROLES.join(" ")}</span>
    </>
  );
}

/**
 * Hero portrait derivatives. This is the LCP element, so the <img> stays EAGER — no
 * `loading="lazy"` — and carries `fetchPriority="high"`; the build's `<link rel="preload">`
 * is generated from the eager tags in the SSR output, so pointing `src` here repoints the
 * preload too. The derivatives are already centre-cropped to 4/5 (matching the frame), which
 * makes the `object-cover` below a no-op rather than a crop.
 */
const PORTRAIT_SOURCES = GENERATED_IMAGES.portrait.sources;
/** Smallest source doubles as the `src` fallback for browsers that ignore srcSet. */
const PORTRAIT_FALLBACK = PORTRAIT_SOURCES[0];
const PORTRAIT_SRCSET = PORTRAIT_SOURCES.map((s) => `${assetUrl(s.src)} ${s.width}w`).join(", ");

function Portrait() {
  return (
    <div
      className="relative justify-self-center"
      style={{
        width: "clamp(168px,18vw,212px)",
        aspectRatio: "4 / 5",
        filter: "drop-shadow(0 0 50px rgba(47,155,255,0.28))",
      }}
    >
      {/* Animated blue line tracing the border: a bright arc rotates behind,
          and the inner image masks it so only a thin edge line shows. */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <motion.div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: "175%",
            aspectRatio: "1",
            x: "-50%",
            y: "-50%",
            background:
              "conic-gradient(from 0deg, transparent 0 64%, rgba(93,182,255,0.0) 66%, #2f9bff 80%, #cfe9ff 88%, #2f9bff 94%, transparent 98%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5.5, ease: "linear", repeat: Infinity }}
        />
      </div>

      {/* Inner image, inset to reveal the rotating line as a ~2px border */}
      <div
        className="absolute rounded-2xl overflow-hidden"
        style={{
          inset: 2,
          background: "var(--portfolio-space)",
          boxShadow: "0 0 0 1px rgba(93,182,255,0.18), inset 0 0 50px rgba(0,0,0,0.55)",
        }}
      >
        <img
          src={assetUrl(PORTRAIT_FALLBACK.src)}
          srcSet={PORTRAIT_SRCSET}
          sizes="212px"
          alt={PROFILE.portraitAlt}
          width={PORTRAIT_FALLBACK.width}
          height={PORTRAIT_FALLBACK.height}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        {/* sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 30% 12%, rgba(255,255,255,0.16), transparent 45%)",
          }}
        />
      </div>
    </div>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.2, 0.7, 0.3, 1] as [number, number, number, number] },
  },
};

// Shared shaded-sphere shell for the 3D ball icons.
function sphereStyle(background: string): React.CSSProperties {
  return {
    position: "relative",
    display: "inline-block",
    width: "1em",
    height: "1em",
    borderRadius: "9999px",
    overflow: "hidden",
    background,
    boxShadow: "inset -2px -2px 5px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.7)",
  };
}

function Sheen() {
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.55), transparent 44%)",
        pointerEvents: "none",
      }}
    />
  );
}

// Tennis ball — green sphere with white seam (bounces via the parent).
function TennisBall() {
  return (
    <span
      aria-hidden
      style={sphereStyle("radial-gradient(circle at 34% 30%, #e9ff70, #cdee3a 58%, #a9c92f)")}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M16 20 Q 46 50 16 80" />
        <path d="M84 20 Q 54 50 84 80" />
      </svg>
      <Sheen />
    </span>
  );
}

// An F1 slick tyre with a spoked rim (rather than the wheel emoji).
function F1Wheel() {
  const spokes = [0, 45, 90, 135];
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: "0.95em", height: "0.95em", display: "block" }}
      aria-hidden
    >
      <circle cx="50" cy="50" r="48" fill="#141414" />
      <circle cx="50" cy="50" r="31" fill="#2c2c2c" />
      <circle cx="50" cy="50" r="24" fill="#cbd0d8" />
      <g stroke="#878d96" strokeWidth="5" strokeLinecap="round">
        {spokes.map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={50 - 24 * Math.cos(r)}
              y1={50 - 24 * Math.sin(r)}
              x2={50 + 24 * Math.cos(r)}
              y2={50 + 24 * Math.sin(r)}
            />
          );
        })}
      </g>
      <circle cx="50" cy="50" r="7" fill="#6b7078" />
    </svg>
  );
}

// A spinning baseball: red seams scroll over a shaded white sphere (backspin).
function BaseballBall() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-block",
        width: "1em",
        height: "1em",
        borderRadius: "9999px",
        overflow: "hidden",
        background: "radial-gradient(circle at 34% 30%, #ffffff, #efeeee 62%, #d0cece)",
        boxShadow: "inset -2px -2px 5px rgba(0,0,0,0.28), inset 2px 2px 4px rgba(255,255,255,0.85)",
      }}
    >
      <motion.svg
        viewBox="0 0 100 300"
        preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "300%" }}
        animate={{ y: ["0%", "-33.334%"] }}
        transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
      >
        {[0, 100, 200].map((off) => (
          <g
            key={off}
            transform={`translate(0 ${off})`}
            fill="none"
            stroke="#c62828"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="2 7"
          >
            <path d="M4 25 Q 50 3 96 25" />
            <path d="M4 75 Q 50 97 96 75" />
          </g>
        ))}
      </motion.svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.6), transparent 42%)",
          pointerEvents: "none",
        }}
      />
    </span>
  );
}

// Each icon that takes a turn as the dot on the "i" in Sai, with its own idle motion.
const BALLS: {
  id: string;
  content: React.ReactNode;
  animate: TargetAndTransition;
  transition: Transition;
}[] = [
  {
    id: "soccer",
    content: <span>⚽</span>,
    animate: { rotate: 360 }, // slow spin
    transition: { rotate: { duration: 7, ease: "linear", repeat: Infinity } },
  },
  {
    id: "basketball",
    content: <span>🏀</span>,
    animate: { y: [0, -6, 0] }, // bounce
    transition: { y: { duration: 0.8, ease: "easeOut", times: [0, 0.4, 1], repeat: Infinity } },
  },
  {
    id: "f1",
    content: <F1Wheel />,
    animate: { rotate: 360 }, // fast roll
    transition: { rotate: { duration: 0.9, ease: "linear", repeat: Infinity } },
  },
  {
    id: "baseball",
    content: <BaseballBall />,
    animate: {}, // spin handled inside the component (seams scroll)
    transition: {},
  },
  {
    id: "tennis",
    content: <TennisBall />,
    animate: { y: [0, -5, 0] }, // bounce
    transition: { y: { duration: 0.7, ease: "easeOut", times: [0, 0.4, 1], repeat: Infinity } },
  },
];

function SpinningBall({ index, style }: { index: number; style?: React.CSSProperties }) {
  const ball = BALLS[index % BALLS.length];

  return (
    <span
      className="absolute inline-block"
      style={{ left: "50%", transform: "translateX(-50%)", lineHeight: 1, ...style }}
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="inline-block"
          style={{ transformPerspective: 260 }}
          // flip across to reveal the next icon, then play its idle animation
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1, ...ball.animate }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", ...ball.transition }}
        >
          {ball.content}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Renders "Sai" where the tittle of the lowercase i is a sports ball that
 *  flips to the next one each time you hover the name. */
function SaiName() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // Only a deliberate hover counts toward Hat Trick — the 10s auto-rotation would
  // otherwise hand out the badge to anyone who left the tab open.
  const flip = () =>
    setI((n) => {
      const next = n + 1;
      trackMember(KEYS.tittles, BALLS[next % BALLS.length].id);
      return next;
    });

  return (
    <span className="relative inline-block whitespace-nowrap cursor-default" onMouseEnter={flip}>
      Sa
      {/* dotless i (U+0131) so the spinning ball can stand in for the dot */}
      <span className="relative inline-block">
        ı
        <SpinningBall index={i} style={{ top: "-0.34em", fontSize: "0.34em" }} />
      </span>
    </span>
  );
}

function Hero() {
  return (
    <motion.div
      className="relative w-full flex flex-col items-center justify-center text-center"
      style={{
        minHeight: "100vh",
        gap: "clamp(16px,2.2vh,28px)",
        padding: "clamp(96px,14vh,150px) clamp(20px,6vw,40px) clamp(56px,9vh,90px)",
      }}
      variants={container}
      initial={false}
      animate="show"
    >
      {/* Portrait */}
      <motion.div variants={item}>
        <Portrait />
      </motion.div>

      {/* Current role */}
      <motion.div
        variants={item}
        className="inline-flex items-center gap-2.5 font-display font-medium uppercase text-accent-bright rounded-full"
        style={{
          fontSize: 12.5,
          letterSpacing: 3,
          padding: "7px 15px",
          background: "var(--portfolio-surface-2)",
          border: "1px solid var(--portfolio-border)",
        }}
      >
        <motion.span
          className="rounded-full"
          style={{ width: 7, height: 7, background: "#34d399", boxShadow: "0 0 8px #34d399" }}
          animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        />
        Now · SWE Intern @ Capital One
      </motion.div>

      {/* Name */}
      <motion.h1
        variants={item}
        className="font-display font-extrabold text-ink"
        style={{ fontSize: "clamp(42px,6.6vw,88px)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
      >
        Hi there,
        <br />
        I'm <SaiName />.
      </motion.h1>

      {/* Rotating role */}
      <motion.div
        variants={item}
        className="role-gradient font-display font-extrabold"
        style={{
          fontSize: "clamp(22px,4vw,52px)",
          lineHeight: 1.2,
          minHeight: "1.25em",
          whiteSpace: "nowrap",
          paddingRight: "0.14em",
        }}
      >
        <RotatingRole />
      </motion.div>

      {/* Tagline */}
      <motion.p
        variants={item}
        className="text-muted-portfolio"
        style={{
          fontSize: "clamp(15px,1.2vw,18px)",
          lineHeight: 1.7,
          maxWidth: 560,
          textWrap: "pretty",
        }}
      >
        {PROFILE.tagline}
      </motion.p>

      {/* CTAs */}
      <motion.div
        variants={item}
        className="flex gap-4 flex-wrap justify-center"
        style={{ marginTop: 4 }}
      >
        <motion.a
          href={assetUrl(PROFILE.resumeUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => unlock("paper-trail")}
          whileHover={{ y: -2, boxShadow: "0 12px 36px rgba(47,155,255,0.6)" }}
          whileTap={{ scale: 0.97 }}
          className="font-display font-semibold no-underline inline-flex items-center gap-2.5 rounded-full"
          style={{
            fontSize: 15,
            padding: "15px 28px",
            color: "#021024",
            background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
            boxShadow: "0 8px 28px rgba(47,155,255,0.45)",
          }}
        >
          View Résumé →
        </motion.a>
        <motion.a
          href="#projects"
          whileHover={{
            y: -2,
            borderColor: "var(--portfolio-border-strong)",
            background: "var(--portfolio-surface-2)",
          }}
          whileTap={{ scale: 0.97 }}
          className="font-display font-semibold no-underline inline-flex items-center gap-2.5 rounded-full text-ink"
          style={{
            fontSize: 15,
            padding: "15px 28px",
            border: "1px solid var(--portfolio-border-strong)",
            background: "var(--portfolio-surface)",
          }}
        >
          Explore Work
        </motion.a>
      </motion.div>

      {/* Socials */}
      <motion.div variants={item} className="flex items-center gap-3 justify-center">
        {SOCIALS.map((s) => {
          const Icon = SOCIAL_ICONS[s.label] ?? Mail;
          return (
            <motion.a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={s.label}
              onClick={() => trackMember(KEYS.socials, s.label)}
              whileHover={{
                y: -3,
                borderColor: "var(--portfolio-border-strong)",
                color: "var(--portfolio-accent-bright)",
              }}
              className="grid place-items-center rounded-full text-muted-portfolio"
              style={{
                width: 44,
                height: 44,
                border: "1px solid var(--portfolio-border)",
                background: "var(--portfolio-surface)",
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
            </motion.a>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

/** Thin accent bar at the very top that tracks scroll progress. Hidden entirely
 *  when the visitor prefers reduced motion. */
function ScrollProgress() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] origin-left"
      style={{
        scaleX,
        height: 3,
        background: "linear-gradient(90deg,var(--portfolio-accent),var(--portfolio-accent-bright))",
        boxShadow: "0 0 10px var(--portfolio-shadow)",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}

function ScrollTop() {
  const prefersReduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Reveal after roughly one viewport of scrolling.
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enterExit = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 12 },
      };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          onClick={() => {
            unlock("elevator-pitch");
            window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
          }}
          aria-label="Back to top"
          initial={enterExit.initial}
          animate={enterExit.animate}
          exit={enterExit.exit}
          whileHover={prefersReduced ? undefined : { y: -2 }}
          whileTap={prefersReduced ? undefined : { scale: 0.94 }}
          transition={{ duration: prefersReduced ? 0 : 0.25, ease: "easeOut" }}
          className="fixed z-50 grid place-items-center rounded-full text-ink transition-colors hover:text-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
          style={{
            bottom: 24,
            right: 24,
            width: 46,
            height: 46,
            background: "var(--portfolio-surface-2)",
            border: "1px solid var(--portfolio-border-strong)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowUp
            size={22}
            strokeWidth={2.2}
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Index() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      <ScrollProgress />
      <Starfield />

      <Nav />

      {/* Target of the skip-to-content link in __root.tsx. `tabIndex={-1}` so browsers
          that will not focus a non-focusable fragment target still move focus here. */}
      <main id="main-content" tabIndex={-1}>
        <section id="home" className="relative" style={{ zIndex: 2 }}>
          <Hero />
        </section>

        {/* Content sections */}
        <div className="relative" style={{ zIndex: 2 }}>
          <About />
          <Experience />
          <Projects />
          <Contact />
        </div>
      </main>

      {/* Outside <main> so the site footer stays a top-level contentinfo landmark. */}
      <div className="relative" style={{ zIndex: 2 }}>
        <Footer />
      </div>

      <ScrollTop />
    </div>
  );
}
