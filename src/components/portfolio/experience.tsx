import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Camera } from "lucide-react";
import { EXPERIENCES, type Experience } from "@/data/portfolio";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Section, SectionHeading } from "./section";

// Globe geometry. The texture is equirectangular (lon -180..180, lat 90..-90).
const N = 42; // node diameter
const Z = 2.1; // zoom factor (higher = more zoomed into the region)
const BG_H = N * Z;
const BG_W = BG_H * 2; // equirectangular is 2:1
const ORBIT_RX = N * 0.62; // horizontal orbit radius (extends beyond the globe)
const ORBIT_RY = N * 0.17; // vertical radius (thin => seen nearly edge-on)
const NODE_OFFSET = `calc(-1 * clamp(28px,4vw,48px) - ${N / 2}px)`;
const DEFAULT_VIEW = { lat: 38, lon: -95 }; // North America, used for "Remote"

function earthView(coords: { lat: number; lon: number }) {
  const fx = (coords.lon + 180) / 360;
  const fy = (90 - coords.lat) / 180;
  const lx = fx * BG_W;
  const ly = fy * BG_H;
  // Middle of three tiled copies centered in the node => location at node center.
  const restX = N / 2 - (BG_W + lx);
  const startX = restX + BG_W * 0.9; // spin in ~0.9 of a rotation
  const top = N / 2 - ly;
  return { restX, startX, top };
}

/** Blue dot that, while its experience is centered on screen, grows into the
 *  real Earth — rotating to the role's location, then stopping with a red pin. */
function EarthNode({
  active,
  coords,
}: {
  active: boolean;
  coords: { lat: number; lon: number } | null;
}) {
  const view = earthView(coords ?? DEFAULT_VIEW);
  const isRemote = coords == null;

  // Elliptical orbit samples (0..2π). Front of the orbit = lower half (y > 0).
  const ox: number[] = [];
  const oy: number[] = [];
  const os: number[] = [];
  const otimes: number[] = [];
  const STEPS = 8;
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    ox.push(+(ORBIT_RX * Math.cos(a)).toFixed(2));
    oy.push(+(ORBIT_RY * Math.sin(a)).toFixed(2));
    os.push(+(1 + 0.35 * Math.sin(a)).toFixed(3));
    otimes.push(i / STEPS);
  }
  // opacity per half (tips at i = 0,4,8 are beside the globe => visible in both)
  const frontOpacity = [1, 1, 1, 1, 1, 0, 0, 0, 1];
  const behindOpacity = [0, 0, 0, 0, 1, 1, 1, 1, 0];

  return (
    <div className="absolute" style={{ left: NODE_OFFSET, top: 0, width: N, height: N }}>
      {/* blue ball — always-visible base marker */}
      <span
        className="absolute rounded-full"
        style={{
          left: "50%",
          top: "50%",
          width: 16,
          height: 16,
          transform: "translate(-50%, -50%)",
          background: "#5db6ff",
          boxShadow: "0 0 14px rgba(93,182,255,0.9)",
          border: "2px solid #021024",
        }}
      />

      <AnimatePresence>
        {active && (
          <motion.div
            key="globe"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4, rotate: -90 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              overflow: "hidden",
              zIndex: 2,
              background: "#5db6ff",
              boxShadow:
                "0 0 18px rgba(93,182,255,0.9), inset -2px -3px 8px rgba(0,5,25,0.4), inset 2px 2px 6px rgba(220,238,255,0.5)",
              pointerEvents: "none",
            }}
          >
            {/* rotating blue landmasses (3 tiled copies for seamless wrap),
                masked from the equirectangular world map over white oceans */}
            <motion.div
              style={{
                position: "absolute",
                left: 0,
                top: view.top,
                width: BG_W * 3,
                height: BG_H,
                background: "#f4f9ff",
                WebkitMaskImage: "url(assets/world.svg)",
                maskImage: "url(assets/world.svg)",
                WebkitMaskRepeat: "repeat-x",
                maskRepeat: "repeat-x",
                WebkitMaskSize: `${BG_W}px ${BG_H}px`,
                maskSize: `${BG_W}px ${BG_H}px`,
                maskMode: "alpha",
              }}
              initial={{ x: view.startX }}
              animate={{ x: view.restX }}
              transition={{ duration: 1.6, ease: [0.16, 0.7, 0.2, 1], delay: 0.1 }}
            />

            {/* spherical shading */}
            <div className="globe-shade" />

            {/* location pin (only for real locations), appears once it settles */}
            {coords && (
              <motion.span
                className="globe-pin"
                style={{ left: "50%", top: "50%" }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.45, duration: 0.4, ease: "backOut" }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {active && isRemote && (
        <>
          {/* faint orbit plane — only its tips show beyond the globe's edges */}
          <div
            className="absolute"
            style={{
              left: N / 2 - ORBIT_RX,
              top: N / 2 - ORBIT_RY,
              width: ORBIT_RX * 2,
              height: ORBIT_RY * 2,
              borderRadius: "50%",
              border: "1px solid rgba(255,90,90,0.35)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          {/* behind pass — sits beneath the opaque globe, so the Earth hides it */}
          <motion.span
            className="absolute rounded-full"
            style={{
              left: N / 2,
              top: N / 2,
              marginLeft: -3,
              marginTop: -3,
              width: 6,
              height: 6,
              background: "#ff3b3b",
              boxShadow: "0 0 9px 2px rgba(255,59,59,0.95)",
              zIndex: 1,
              pointerEvents: "none",
            }}
            animate={{ x: ox, y: oy, scale: os, opacity: behindOpacity }}
            transition={{ duration: 5, ease: "linear", repeat: Infinity, times: otimes }}
          />
          {/* front pass — over the globe */}
          <motion.span
            className="absolute rounded-full"
            style={{
              left: N / 2,
              top: N / 2,
              marginLeft: -3,
              marginTop: -3,
              width: 6,
              height: 6,
              background: "#ff3b3b",
              boxShadow: "0 0 9px 2px rgba(255,59,59,0.95)",
              zIndex: 5,
              pointerEvents: "none",
            }}
            animate={{ x: ox, y: oy, scale: os, opacity: frontOpacity }}
            transition={{ duration: 5, ease: "linear", repeat: Infinity, times: otimes }}
          />
        </>
      )}
    </div>
  );
}

function ExperienceModal({ exp, onClose }: { exp: Experience; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const photos = (exp.photos ?? []).slice(0, 2);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        background: "rgba(2,6,18,0.82)",
        padding: "clamp(16px,4vw,40px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-modal-title"
      aria-describedby="experience-modal-desc"
    >
      <motion.div
        ref={panelRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 860,
          maxHeight: "88vh",
          background: "#0a1526",
          border: "1px solid rgba(93,182,255,0.25)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid place-items-center rounded-full transition-colors hover:text-white"
          style={{
            width: 36,
            height: 36,
            background: "rgba(10,20,36,0.85)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#cfe2f5",
          }}
        >
          <X size={18} />
        </button>

        <div style={{ maxHeight: "88vh", overflowY: "auto", overflowX: "hidden" }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* photos — left */}
            <div className="flex flex-col gap-3 p-3">
              {photos.length > 0 ? (
                photos.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${exp.title} — ${i + 1}`}
                    loading="lazy"
                    className="w-full rounded-xl object-cover"
                    style={{ aspectRatio: photos.length === 2 ? "4 / 3" : "3 / 4" }}
                  />
                ))
              ) : (
                <div
                  className="flex-1 rounded-xl grid place-items-center text-muted-portfolio"
                  style={{
                    aspectRatio: "3 / 4",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(93,182,255,0.25)",
                  }}
                >
                  <div className="flex flex-col items-center gap-2" style={{ fontSize: 13 }}>
                    <Camera size={22} />
                    Photos coming soon
                  </div>
                </div>
              )}
            </div>

            {/* info — right */}
            <div
              className="flex flex-col justify-center"
              style={{ padding: "clamp(22px,3vw,34px)" }}
            >
              <span
                className="font-display text-accent-bright"
                style={{ fontSize: 13, letterSpacing: 0.4 }}
              >
                {exp.duration}
              </span>
              <h3
                id="experience-modal-title"
                className="font-display font-extrabold text-white mt-1"
                style={{ fontSize: "clamp(22px,3vw,30px)", lineHeight: 1.1 }}
              >
                {exp.title}
              </h3>
              <p className="font-display text-white/75 mt-1" style={{ fontSize: 15 }}>
                {exp.company}
              </p>
              <p className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: "#ff3b3b",
                    boxShadow: "0 0 6px rgba(255,59,59,0.85)",
                  }}
                />
                <span className="font-display text-muted-portfolio" style={{ fontSize: 13 }}>
                  {exp.location}
                </span>
              </p>
              <p
                id="experience-modal-desc"
                className="text-muted-portfolio mt-4"
                style={{ fontSize: 15.5, lineHeight: 1.75, textWrap: "pretty" }}
              >
                {exp.details ?? exp.description}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Experience() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Experience | null>(null);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      const threshold = window.innerHeight * 0.42;
      let best = -1;
      let bestDist = Infinity;
      itemRefs.current.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      setActive(bestDist <= threshold ? best : -1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Section id="experience">
      <SectionHeading eyebrow="My Professional Journey" title="Work Experience" />

      <div className="mt-16 mx-auto" style={{ maxWidth: 760 }}>
        <div
          className="relative"
          style={{
            borderLeft: "1px solid rgba(93,182,255,0.25)",
            paddingLeft: "clamp(28px,4vw,48px)",
          }}
        >
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={`${exp.company}-${exp.title}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="relative"
              style={{ marginBottom: i === EXPERIENCES.length - 1 ? 0 : 40 }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.7, 0.3, 1] }}
            >
              <EarthNode active={active === i} coords={exp.coords} />

              <motion.button
                type="button"
                onClick={() => setSelected(exp)}
                whileHover={{ y: -3 }}
                className="group w-full text-left rounded-2xl cursor-pointer transition-colors"
                style={{
                  padding: "22px 24px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(93,182,255,0.16)",
                  backdropFilter: "blur(6px)",
                }}
                aria-label={`Learn more about ${exp.title} at ${exp.company}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display font-semibold text-white" style={{ fontSize: 19 }}>
                    {exp.title}
                  </h3>
                  <span
                    className="font-display text-accent-bright"
                    style={{ fontSize: 13, letterSpacing: 0.4, whiteSpace: "nowrap" }}
                  >
                    {exp.duration}
                  </span>
                </div>

                <p className="font-display text-white/70 mt-0.5" style={{ fontSize: 15 }}>
                  {exp.company}
                </p>

                <p className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      background: "#ff3b3b",
                      boxShadow: "0 0 6px rgba(255,59,59,0.85)",
                    }}
                  />
                  <span className="font-display text-muted-portfolio" style={{ fontSize: 13 }}>
                    {exp.location}
                  </span>
                </p>

                <p className="text-muted-portfolio mt-3" style={{ fontSize: 15, lineHeight: 1.7 }}>
                  {exp.description}
                </p>

                <span
                  className="inline-flex items-center gap-1 font-display text-accent-bright mt-3 transition-transform group-hover:translate-x-0.5"
                  style={{ fontSize: 13 }}
                >
                  Learn more →
                </span>
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && <ExperienceModal exp={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </Section>
  );
}
