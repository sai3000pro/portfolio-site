import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Github, Linkedin, Mail, ArrowDown } from "lucide-react";

import { NAV_LINKS, PROFILE, ROLES, SOCIALS } from "@/data/portfolio";
import { About } from "@/components/portfolio/about";
import { Experience } from "@/components/portfolio/experience";
import { Projects } from "@/components/portfolio/projects";
import { Contact, Footer } from "@/components/portfolio/contact";

const SOCIAL_ICONS: Record<string, typeof Github> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Email: Mail,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sai — Web Developer & Amateur Photographer" },
      {
        name: "description",
        content:
          "Portfolio of Sai (Saivenkat Jilla) — an aspiring web developer and amateur photographer drifting between code and the cosmos.",
      },
      { property: "og:title", content: "Sai — Web Developer & Amateur Photographer" },
      {
        property: "og:description",
        content:
          "Portfolio of Sai (Saivenkat Jilla) — an aspiring web developer and amateur photographer drifting between code and the cosmos.",
      },
    ],
  }),
  component: Index,
});

type Phase = "loading" | "warp" | "settled";

interface Star {
  x: number;
  y: number;
  z: number;
  tw: number;
  hue: number;
}
interface StarfieldHandle {
  setTarget: (t: number) => void;
}

function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>): StarfieldHandle {
  const stateRef = useRef({
    stars: [] as Star[],
    n: 720,
    w: 0,
    h: 0,
    cx: 0,
    cy: 0,
    speed: 0.0025,
    target: 0.0025,
    dpr: 1,
    running: false,
  });

  const setTarget = useCallback((t: number) => {
    stateRef.current.target = t;
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const size = () => {
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = cv.clientWidth;
      s.h = cv.clientHeight;
      cv.width = s.w * s.dpr;
      cv.height = s.h * s.dpr;
      s.cx = s.w / 2;
      s.cy = s.h / 2;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    size();

    s.stars = [];
    for (let i = 0; i < s.n; i++) {
      s.stars.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.18 ? 205 : 0,
      });
    }

    s.running = true;
    const fov = 0.9;
    const loop = (t: number) => {
      if (!s.running) return;
      s.speed += (s.target - s.speed) * 0.04;
      ctx.clearRect(0, 0, s.w, s.h);
      const warpish = s.speed > 0.02;
      for (const star of s.stars) {
        const pz = star.z;
        star.z -= s.speed;
        if (star.z <= 0.02) {
          star.z = 1;
          star.x = Math.random() * 2 - 1;
          star.y = Math.random() * 2 - 1;
          continue;
        }
        const k = fov / star.z;
        const sx = s.cx + star.x * k * s.cx;
        const sy = s.cy + star.y * k * s.cy;
        if (sx < -50 || sx > s.w + 50 || sy < -50 || sy > s.h + 50) continue;
        const sizePx = (1 - star.z) * 2.4 + (warpish ? 0.3 : 0.9);
        let alpha = warpish
          ? Math.min(1, (1 - star.z) * 1.4)
          : Math.min(1, 0.45 + (1 - star.z) * 0.9);
        if (!warpish) alpha *= 0.6 + 0.4 * Math.sin(t * 0.002 + star.tw);
        const color = star.hue ? `rgba(150,200,255,${alpha})` : `rgba(255,255,255,${alpha})`;
        if (warpish) {
          const k0 = fov / pz;
          const px = s.cx + star.x * k0 * s.cx;
          const py = s.cy + star.y * k0 * s.cy;
          ctx.strokeStyle = color;
          ctx.lineWidth = sizePx;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(sx, sy, sizePx, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener("resize", size);
    return () => {
      s.running = false;
      window.removeEventListener("resize", size);
    };
  }, [canvasRef]);

  return { setTarget };
}

/** Typewriter cycling through ROLES for the hero headline. */
function useRotatingRole(active: boolean): string {
  const [text, setText] = useState(active ? "" : ROLES[0]);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  return text;
}

function Loading() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const dur = 1700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-9 bg-space"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div
        className="load-word relative font-display font-extrabold uppercase text-white"
        style={{ fontSize: "clamp(34px,7vw,72px)", letterSpacing: "0.32em", textIndent: "0.32em" }}
      >
        LOADING
      </div>
      <div className="h-1 rounded overflow-hidden bg-white/10" style={{ width: "min(360px,62vw)" }}>
        <div
          className="h-full rounded"
          style={{
            width: pct + "%",
            background: "linear-gradient(90deg,#2f9bff,#5db6ff)",
            boxShadow: "0 0 14px rgba(47,155,255,0.8)",
          }}
        />
      </div>
      <div className="font-display text-muted-portfolio" style={{ fontSize: 13, letterSpacing: 3 }}>
        {pct}%
      </div>
    </motion.div>
  );
}

function Nav({ show }: { show: boolean }) {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        padding: "20px clamp(24px,5vw,80px)",
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,5,0.35)",
      }}
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : -12 }}
      transition={{ duration: 0.6, delay: show ? 0.2 : 0 }}
    >
      <a href="#home" className="flex items-center gap-3 no-underline">
        <img
          src={PROFILE.logo}
          alt="Sai logo"
          style={{
            width: 38,
            height: 38,
            borderRadius: "9999px",
            boxShadow: "0 0 16px rgba(47,155,255,0.5)",
          }}
        />
        <span className="font-display font-semibold text-white" style={{ fontSize: 18 }}>
          {PROFILE.name}
          <b className="text-accent-bright">.</b>
        </span>
      </a>
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="font-display font-medium no-underline rounded-full px-[15px] py-[8px] text-muted-portfolio hover:text-white transition-colors"
            style={{ fontSize: 14.5 }}
          >
            {l.label}
          </a>
        ))}
        <a
          href={PROFILE.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-semibold no-underline rounded-full px-[16px] py-[8px] text-white ml-1 transition-colors"
          style={{
            fontSize: 14.5,
            background: "rgba(47,155,255,0.14)",
            border: "1px solid rgba(93,182,255,0.35)",
          }}
        >
          Résumé
        </a>
      </div>
    </motion.nav>
  );
}

function Portrait() {
  return (
    <div
      className="relative justify-self-center"
      style={{
        width: "clamp(240px,26vw,340px)",
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
          src={PROFILE.portrait}
          alt={PROFILE.portraitAlt}
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

      {/* Floating status chip */}
      <div
        className="absolute flex items-center gap-2 rounded-full font-display"
        style={{
          left: -18,
          bottom: 26,
          padding: "9px 15px",
          fontSize: 12.5,
          color: "#dbeafe",
          background: "rgba(8,16,30,0.72)",
          border: "1px solid rgba(93,182,255,0.3)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        }}
      >
        <motion.span
          className="rounded-full"
          style={{ width: 8, height: 8, background: "#34d399" }}
          animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        />
        Open to opportunities
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

// Sports balls (and a tire) that take turns being the dot on the "i" in Sai.
const BALLS = ["⚽", "🏀", "🛞", "⚾", "🎾"];

function SpinningBall({ index, style }: { index: number; style?: React.CSSProperties }) {
  return (
    <motion.span
      className="absolute inline-block"
      style={{ left: "50%", x: "-50%", lineHeight: 1, transformOrigin: "center", ...style }}
      aria-hidden
      // subtle idle rock back and forth
      animate={{ rotate: [-7, 7, -7] }}
      transition={{ duration: 3.4, ease: "easeInOut", repeat: Infinity }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="inline-block"
          // flip across to reveal the next ball
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {BALLS[index % BALLS.length]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** Renders "Sai" where the tittle of the lowercase i is a sports ball that
 *  flips to the next one each time you hover the name. */
function SaiName() {
  const [i, setI] = useState(0);
  return (
    <span
      className="relative inline-block whitespace-nowrap cursor-default"
      onMouseEnter={() => setI((n) => n + 1)}
    >
      Sa
      {/* dotless i (U+0131) so the spinning ball can stand in for the dot */}
      <span className="relative inline-block">
        ı
        <SpinningBall index={i} style={{ top: "-0.2em", fontSize: "0.52em" }} />
      </span>
    </span>
  );
}

function Hero({ show, instant }: { show: boolean; instant?: boolean }) {
  const role = useRotatingRole(show);
  return (
    <motion.div
      className="relative grid items-center w-full"
      style={{
        minHeight: "100vh",
        gridTemplateColumns: "1.15fr 0.85fr",
        gap: "clamp(30px,5vw,90px)",
        padding: "0 clamp(28px,6vw,110px)",
      }}
      variants={container}
      initial={instant ? false : "hidden"}
      animate={show ? "show" : "hidden"}
    >
      <div style={{ maxWidth: 640 }}>
        <motion.div
          variants={item}
          className="inline-flex items-center gap-2.5 font-display font-medium uppercase text-accent-bright rounded-full mb-[26px]"
          style={{
            fontSize: 13,
            letterSpacing: 3,
            padding: "7px 15px",
            background: "rgba(47,155,255,0.08)",
            border: "1px solid rgba(47,155,255,0.22)",
          }}
        >
          <span
            className="rounded-full"
            style={{ width: 6, height: 6, background: "#5db6ff", boxShadow: "0 0 8px #5db6ff" }}
          />
          Portfolio · Welcome aboard
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display font-extrabold mb-2 text-white"
          style={{ fontSize: "clamp(44px,6.6vw,92px)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
        >
          Hi there,
          <br />
          I'm <SaiName />.
          <span
            className="role-gradient block"
            style={{
              fontSize: "clamp(24px,4.4vw,58px)",
              lineHeight: 1.2,
              minHeight: "1.25em",
              whiteSpace: "nowrap",
            }}
          >
            {role || "\u00A0"}
            <span className="type-caret" aria-hidden>
              |
            </span>
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-muted-portfolio"
          style={{
            fontSize: "clamp(16px,1.25vw,19px)",
            lineHeight: 1.7,
            margin: "28px 0 38px",
            maxWidth: 520,
            textWrap: "pretty",
          }}
        >
          {PROFILE.tagline}
        </motion.p>

        <motion.div variants={item} className="flex gap-4 flex-wrap">
          <motion.a
            href={PROFILE.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
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
              borderColor: "rgba(93,182,255,0.55)",
              background: "rgba(47,155,255,0.08)",
            }}
            whileTap={{ scale: 0.97 }}
            className="font-display font-semibold no-underline inline-flex items-center gap-2.5 rounded-full text-white"
            style={{
              fontSize: 15,
              padding: "15px 28px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            Explore Work
          </motion.a>
        </motion.div>

        <motion.div variants={item} className="flex items-center gap-3 mt-8">
          {SOCIALS.map((s) => {
            const Icon = SOCIAL_ICONS[s.label] ?? Mail;
            return (
              <motion.a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                whileHover={{
                  y: -3,
                  borderColor: "rgba(93,182,255,0.55)",
                  color: "#5db6ff",
                }}
                className="grid place-items-center rounded-full text-muted-portfolio"
                style={{
                  width: 44,
                  height: 44,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
              </motion.a>
            );
          })}
        </motion.div>
      </div>

      <motion.div variants={item} className="hidden md:block">
        <Portrait />
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#about"
        aria-label="Scroll to about"
        variants={item}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-portfolio no-underline"
        style={{ bottom: "clamp(18px,4vh,40px)" }}
        whileHover={{ color: "#5db6ff" }}
      >
        <span className="font-display uppercase" style={{ fontSize: 11, letterSpacing: 3 }}>
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
        >
          <ArrowDown size={18} strokeWidth={1.8} />
        </motion.span>
      </motion.a>
    </motion.div>
  );
}

function Index() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [skipIntro, setSkipIntro] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useStarfield(canvasRef);

  // Detect reduced motion / deep-link / hidden tab on mount (client-only)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skip =
      reduce || window.location.hash === "#landing" || document.visibilityState === "hidden";
    if (skip) {
      setSkipIntro(true);
      setPhase("settled");
    }
  }, []);

  useEffect(() => {
    if (skipIntro) {
      stars.setTarget(0.006);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    setPhase("loading");
    stars.setTarget(0.0025);

    after(1850, () => {
      setPhase("warp");
      stars.setTarget(0.16);
      after(900, () => stars.setTarget(0.045));
      after(1700, () => stars.setTarget(0.006));
    });
    after(1850 + 2400, () => setPhase((p) => (p === "warp" ? "settled" : p)));

    return () => timers.forEach(clearTimeout);
    // stars handle is stable (useCallback) but identity changes each render; intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipIntro]);

  // Lock page scroll until the intro settles.
  useEffect(() => {
    const locked = phase !== "settled";
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const settled = phase === "settled";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-space font-body text-ink">
      {/* Persistent starfield background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full transition-opacity duration-500"
        style={{ zIndex: 0, opacity: phase === "loading" ? 0 : 1 }}
      />
      <div className="nebula fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      <Nav show={settled} />

      {/* Hero — zooms in out of the warp */}
      <motion.section
        id="home"
        className="relative"
        style={{ zIndex: 2 }}
        initial={false}
        animate={phase === "loading" ? { scale: 0.06, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: skipIntro ? 0 : 2.2, ease: [0.16, 0.7, 0.2, 1] }}
        onAnimationComplete={() => {
          if (phase === "warp") setPhase("settled");
        }}
      >
        <Hero show={settled} instant={skipIntro} />
      </motion.section>

      {/* Content sections */}
      <div className="relative" style={{ zIndex: 2 }}>
        <About />
        <Experience />
        <Projects />
        <Contact />
        <Footer />
      </div>

      <AnimatePresence>{phase === "loading" && <Loading key="loading" />}</AnimatePresence>
    </div>
  );
}
