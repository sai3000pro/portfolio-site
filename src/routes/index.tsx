import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sai — Amateur Photographer & Web Developer" },
      { name: "description", content: "Portfolio of Sai — an aspiring web developer and amateur photographer drifting between code and the cosmos." },
      { property: "og:title", content: "Sai — Amateur Photographer & Web Developer" },
      { property: "og:description", content: "Portfolio of Sai — an aspiring web developer and amateur photographer drifting between code and the cosmos." },
    ],
  }),
  component: Index,
});

type Phase = "loading" | "warp" | "settled";

interface Star { x: number; y: number; z: number; tw: number; hue: number; }
interface StarfieldHandle { setTarget: (t: number) => void; }

function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>): StarfieldHandle {
  const stateRef = useRef({
    stars: [] as Star[],
    n: 720,
    w: 0, h: 0, cx: 0, cy: 0,
    speed: 0.0025, target: 0.0025,
    dpr: 1,
    running: false,
  });

  const setTarget = useCallback((t: number) => { stateRef.current.target = t; }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const size = () => {
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = cv.clientWidth; s.h = cv.clientHeight;
      cv.width = s.w * s.dpr; cv.height = s.h * s.dpr;
      s.cx = s.w / 2; s.cy = s.h / 2;
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
          star.z = 1; star.x = Math.random() * 2 - 1; star.y = Math.random() * 2 - 1;
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
        const color = star.hue
          ? `rgba(150,200,255,${alpha})`
          : `rgba(255,255,255,${alpha})`;
        if (warpish) {
          const k0 = fov / pz;
          const px = s.cx + star.x * k0 * s.cx;
          const py = s.cy + star.y * k0 * s.cy;
          ctx.strokeStyle = color; ctx.lineWidth = sizePx; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(sx, sy, sizePx, 0, Math.PI * 2); ctx.fill();
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener("resize", size);
    return () => { s.running = false; window.removeEventListener("resize", size); };
  }, [canvasRef]);

  return { setTarget };
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
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-9 bg-space"
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
      <div className="font-display text-muted-portfolio" style={{ fontSize: 13, letterSpacing: 3 }}>{pct}%</div>
    </motion.div>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "#", active: true },
  { label: "Resume", href: "#" },
];

function Nav() {
  return (
    <nav
      className="absolute top-0 left-0 right-0 z-[5] flex items-center justify-between"
      style={{ padding: "26px clamp(28px,5vw,80px)" }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="relative grid place-items-center rounded-full"
          style={{
            width: 42, height: 42,
            background: "radial-gradient(circle at 35% 30%, #5db6ff, #0a4f99 75%)",
            boxShadow: "0 0 18px rgba(47,155,255,0.6), inset 0 0 12px rgba(255,255,255,0.25)",
          }}
        >
          <span className="font-display font-extrabold text-white" style={{ fontSize: 19 }}>S</span>
          <span className="absolute rounded-full" style={{ inset: -6, border: "1px solid rgba(93,182,255,0.35)" }} />
        </div>
        <div className="font-display font-semibold text-white" style={{ fontSize: 18, letterSpacing: "0.3px" }}>
          Sai<b className="text-accent-bright">.</b>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={
              "font-display font-medium no-underline rounded-full px-[18px] py-[9px] transition-colors " +
              (l.active
                ? "text-white bg-white/[0.06] border border-white/10"
                : "text-muted-portfolio hover:text-white border border-transparent")
            }
            style={{ fontSize: 15 }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Portrait() {
  return (
    <div
      className="relative grid place-items-center justify-self-center"
      style={{ width: "clamp(260px,30vw,400px)", aspectRatio: "1" }}
    >
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: -26, border: "1px solid rgba(93,182,255,0.18)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 26, ease: "linear", repeat: Infinity }}
      >
        <span
          className="absolute rounded-full"
          style={{
            top: -5, left: "50%", width: 10, height: 10, transform: "translateX(-50%)",
            background: "#5db6ff", boxShadow: "0 0 14px #5db6ff",
          }}
        />
      </motion.div>
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ inset: -52, border: "1px dashed rgba(93,182,255,0.12)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      />
      <div
        className="portrait-sheen relative w-full h-full rounded-full overflow-hidden grid place-items-center"
        style={{
          boxShadow: "0 0 0 1px rgba(93,182,255,0.4), 0 0 60px rgba(47,155,255,0.35), inset 0 0 40px rgba(0,0,0,0.6)",
          background: "radial-gradient(circle at 35% 30%, #0a4f99, #000005 75%)",
        }}
      >
        <span className="font-display font-semibold text-white/70" style={{ fontSize: 14, letterSpacing: 2 }}>
          PORTRAIT
        </span>
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
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.2, 0.7, 0.3, 1] as [number, number, number, number] } },
};

function Hero({ show, instant }: { show: boolean; instant?: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 grid items-center"
      style={{
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
            fontSize: 13, letterSpacing: 3, padding: "7px 15px",
            background: "rgba(47,155,255,0.08)", border: "1px solid rgba(47,155,255,0.22)",
          }}
        >
          <span className="rounded-full" style={{ width: 6, height: 6, background: "#5db6ff", boxShadow: "0 0 8px #5db6ff" }} />
          Portfolio · Welcome aboard
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display font-extrabold mb-2 text-white"
          style={{ fontSize: "clamp(44px,6.6vw,92px)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
        >
          Hi there,<br />I'm Sai.
          <span className="role-gradient block">Amateur Photographer.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-muted-portfolio"
          style={{ fontSize: "clamp(16px,1.25vw,19px)", lineHeight: 1.7, margin: "28px 0 38px", maxWidth: 520, textWrap: "pretty" }}
        >
          An aspiring web developer and amateur photographer, drifting between code and the
          cosmos — capturing light, building things for the web, and chasing the quiet wonder in both.
        </motion.p>

        <motion.div variants={item} className="flex gap-4 flex-wrap">
          <motion.a
            href="#"
            whileHover={{ y: -2, boxShadow: "0 12px 36px rgba(47,155,255,0.6)" }}
            whileTap={{ scale: 0.97 }}
            className="font-display font-semibold no-underline inline-flex items-center gap-2.5 rounded-full"
            style={{
              fontSize: 15, padding: "15px 28px", color: "#021024",
              background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
              boxShadow: "0 8px 28px rgba(47,155,255,0.45)",
            }}
          >
            View Resume →
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ y: -2, borderColor: "rgba(93,182,255,0.55)", background: "rgba(47,155,255,0.08)" }}
            whileTap={{ scale: 0.97 }}
            className="font-display font-semibold no-underline inline-flex items-center gap-2.5 rounded-full text-white"
            style={{ fontSize: 15, padding: "15px 28px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.03)" }}
          >
            Explore Work
          </motion.a>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Portrait />
      </motion.div>
    </motion.div>
  );
}

function Replay({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      whileHover={{ y: -1, background: "rgba(47,155,255,0.18)" }}
      className="absolute z-40 inline-flex items-center gap-2.5 font-display font-medium rounded-full"
      style={{
        bottom: 24, right: 24, fontSize: 13, padding: "10px 16px", color: "#cfe2f5",
        background: "rgba(10,18,32,0.6)", border: "1px solid rgba(93,182,255,0.3)", backdropFilter: "blur(8px)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
        <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" />
      </svg>
      Replay intro
    </motion.button>
  );
}

function Index() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [skipIntro, setSkipIntro] = useState(false);
  const [runId, setRunId] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useStarfield(canvasRef);

  // Detect reduced motion / deep-link / hidden tab on mount (client-only)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skip = reduce || window.location.hash === "#landing" || document.visibilityState === "hidden";
    if (skip) {
      setSkipIntro(true);
      setPhase("settled");
    }
  }, []);

  useEffect(() => {
    if (skipIntro) { stars.setTarget(0.006); return; }
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
  }, [runId, skipIntro, stars]);

  const replay = () => { stars.setTarget(0.0025); setPhase("loading"); setRunId((n) => n + 1); };

  const settled = phase === "settled";

  return (
    <div className="fixed inset-0 overflow-hidden bg-space font-body text-ink" style={{ perspective: 1100 }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-500"
        style={{ zIndex: 1, opacity: phase === "loading" ? 0 : 1 }}
      />

      <motion.div
        className="absolute inset-0"
        style={{ zIndex: 2 }}
        initial={false}
        animate={phase === "loading" ? { scale: 0.06, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: skipIntro ? 0 : 2.2, ease: [0.16, 0.7, 0.2, 1] }}
        onAnimationComplete={() => { if (phase === "warp") setPhase("settled"); }}
      >
        <div className="nebula absolute inset-0 pointer-events-none" />
        <Nav />
        <Hero show={settled} instant={skipIntro} />
      </motion.div>

      <AnimatePresence>
        {phase === "loading" && <Loading key="loading" />}
      </AnimatePresence>

      {settled && <Replay onClick={replay} />}
    </div>
  );
}
