import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Camera } from "lucide-react";
import { KEYS } from "@/data/achievements";
import { EXPERIENCES, type Experience, type ExperienceLogo } from "@/data/portfolio";
import { trackMember } from "@/lib/achievements";
import { assetUrl, imageAspect, responsiveImageProps } from "@/lib/assets";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { ModalNav } from "./constellation";
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
// The overlay is 860px wide at most and the logos sit in its left half, one or two to a
// row, so a plate never paints wider than ~400 CSS px and half that when there are two.
const LOGO_SIZES = "(max-width: 767px) 45vw, 400px";
/**
 * Logo plate height, and the mark's height inside it once padding is paid.
 *
 * Pixels, on purpose, and defined together so the padding stays the difference between
 * them. See the note on the plate itself for why a percentage cannot do this job.
 */
const LOGO_PLATE_H = 92;
const LOGO_PAD_Y = 14;
const LOGO_PAD_X = 18;
const LOGO_MARK_H = LOGO_PLATE_H - LOGO_PAD_Y * 2;

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
                WebkitMaskImage: `url(${assetUrl("assets/world.svg")})`,
                maskImage: `url(${assetUrl("assets/world.svg")})`,
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

/**
 * One organisation's logo, on the background its artwork was drawn for.
 *
 * Two things here are deliberate. The mark is `object-contain` inside a fixed box rather
 * than cropped to fill it: these lockups run from 12:1 (Marsh McLennan's wordmark) to
 * square (MathSoc's tie), and `cover` would slice the ends off the wide ones. And the
 * plate colour comes from the logo's own `plate`, not from the page theme, because black
 * wordmarks and white ones cannot share a background — see the note on ExperienceLogo.
 *
 * The owner's name goes in both `alt` and `title`, so the attribution travels with the
 * image whether it is being read by a screen reader or hovered by a person.
 */
function LogoPlate({ logo, company }: { logo: ExperienceLogo; company: string }) {
  const light = logo.plate === "light";
  // The plate is as wide as the mark needs and no wider. Falls back to a moderate
  // landscape box for a logo with no generated derivative, which is the only case where
  // the true shape is not known here.
  const aspect = imageAspect(logo.id) ?? 3;
  const plateWidth = Math.round(LOGO_MARK_H * aspect) + LOGO_PAD_X * 2;

  return (
    <div
      className="grid place-items-center overflow-hidden rounded-xl"
      style={{
        width: plateWidth,
        maxWidth: "100%",
        flexShrink: 1,
        // A definite height, not `aspect-ratio`. A height derived from aspect-ratio is not
        // a definite size in Chromium, so percentage heights on the child resolve to auto
        // and the mark is laid out at its intrinsic size — which for a square logo means
        // it renders as wide as the plate, as tall as it is wide, and gets sliced off by
        // the overflow. Wide wordmarks hid this for weeks because width bound them first.
        height: LOGO_PLATE_H,
        padding: `${LOGO_PAD_Y}px ${LOGO_PAD_X}px`,
        background: light ? "#ffffff" : "#11171c",
        // The plate's fill is fixed by the artwork, so its edge is the only thing that can
        // adapt — and it has to, because in the light theme a white plate sits on a white
        // panel and a 10%-black hairline all but disappears. A firmer edge plus a soft drop
        // shadow keeps it reading as a card in light mode without tinting the mark, which
        // is what borrowing a theme token (a saturated blue in both themes) would have done.
        border: `1px solid ${light ? "rgba(15,23,42,0.16)" : "rgba(255,255,255,0.10)"}`,
        boxShadow: light ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
      }}
    >
      <img
        {...responsiveImageProps(logo.src, logo.id, LOGO_SIZES)}
        alt={`${logo.owner} logo`}
        title={`${logo.owner} — logo reproduced to identify ${company}`}
        loading="lazy"
        className="object-contain"
        // Height is the pixel figure the plate is built from, for the reason above.
        // object-fit still letterboxes, which now only matters when maxWidth has had to
        // squeeze the plate on a narrow screen.
        style={{ width: "100%", height: LOGO_MARK_H }}
      />
    </div>
  );
}

function ExperienceModal({
  exp,
  position,
  count,
  onClose,
  onNavigate,
}: {
  exp: Experience;
  position: number;
  count: number;
  onClose: () => void;
  onNavigate: (delta: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Matches the project modal. An overlay that can be stepped through with a
      // button should be steppable from the keyboard without hunting for that button.
      else if (e.key === "ArrowLeft") onNavigate(-1);
      else if (e.key === "ArrowRight") onNavigate(1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onNavigate]);

  const photos = (exp.photos ?? []).slice(0, 2);
  const logos = exp.logos ?? [];
  const logoOnly = logos.length > 0 && photos.length === 0;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        background: "var(--portfolio-scrim)",
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
      {/* Same shell as the project modal, so the two overlays step through their lists
          with the same control in the same place. stopPropagation covers the arrows as
          well as the panel — without it a press would bubble to the backdrop and close
          the thing it was trying to page through. */}
      <div className="modal-shell" style={{ maxWidth: 1000 }} onClick={(e) => e.stopPropagation()}>
        <ModalNav
          direction="prev"
          label={`Previous role: ${position > 1 ? "go to previous" : "wrap to last"}`}
          onClick={() => onNavigate(-1)}
        />

        <motion.div
          ref={panelRef}
          className="modal-shell__panel relative rounded-2xl overflow-hidden"
          style={{
            maxWidth: 860,
            maxHeight: "82vh",
            background: "var(--portfolio-panel)",
            border: "1px solid var(--portfolio-border-strong)",
            boxShadow: "0 30px 80px var(--portfolio-shadow)",
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid place-items-center rounded-full transition-colors hover:text-ink"
            style={{
              width: 36,
              height: 36,
              background: "var(--portfolio-surface)",
              border: "1px solid var(--portfolio-border)",
              color: "var(--portfolio-ink)",
            }}
          >
            <X size={18} />
          </button>

          <div
            tabIndex={0}
            role="group"
            aria-labelledby="experience-modal-title"
            style={{ maxHeight: "82vh", overflowY: "auto", overflowX: "hidden" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/*
              logos and photos — left

              Three states, not two. A logo with no photographs is a finished column, not a
              half-empty one: the "coming soon" tile only earns its space when the column
              would otherwise be blank, and promising photographs for a role that may never
              have any just dates the page. So the tile appears for an experience with
              neither, the logo centres itself when it is the only thing here, and both
              stack from the top once photographs do arrive.
            */}
              <div
                className={`flex flex-col gap-3 p-3 ${logoOnly ? "justify-center" : ""}`.trimEnd()}
              >
                {logos.length > 0 && (
                  <div className="flex gap-3">
                    {logos.map((logo) => (
                      <LogoPlate key={logo.src} logo={logo} company={exp.company} />
                    ))}
                  </div>
                )}
                {photos.map((src, i) => (
                  <img
                    key={i}
                    src={assetUrl(src)}
                    alt={`${exp.title} — ${i + 1}`}
                    loading="lazy"
                    className="w-full rounded-xl object-cover"
                    style={{ aspectRatio: photos.length === 2 ? "4 / 3" : "3 / 4" }}
                  />
                ))}
                {photos.length === 0 && logos.length === 0 && (
                  <div
                    className="flex-1 rounded-xl grid place-items-center text-muted-portfolio"
                    style={{
                      aspectRatio: "3 / 4",
                      background: "var(--portfolio-surface)",
                      border: "1px dashed var(--portfolio-border)",
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
                  className="font-display font-extrabold text-ink mt-1"
                  style={{ fontSize: "clamp(22px,3vw,30px)", lineHeight: 1.1 }}
                >
                  {exp.title}
                </h3>
                <p className="font-display text-muted-portfolio mt-1" style={{ fontSize: 15 }}>
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

        <ModalNav
          direction="next"
          label={`Next role: ${position < count ? "go to next" : "wrap to first"}`}
          onClick={() => onNavigate(1)}
        />
      </div>
    </motion.div>
  );
}

export function Experience() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Experience | null>(null);

  /**
   * Step the overlay through EXPERIENCES without closing it.
   *
   * Resolved from the open entry's position rather than held as a second piece of
   * state, so there is no index that can drift out of step with the object it is
   * supposed to be pointing at. The list is eight long and rendered on the same page,
   * so the lookup costs nothing.
   */
  const navigateExperience = useCallback((delta: number) => {
    setSelected((current) => {
      if (!current) return current;
      const at = EXPERIENCES.indexOf(current);
      if (at < 0) return current;
      return EXPERIENCES[(at + delta + EXPERIENCES.length) % EXPERIENCES.length];
    });
  }, []);

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
            borderLeft: "1px solid var(--portfolio-border)",
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

              <motion.div
                whileHover={{ y: -3 }}
                className="group relative w-full text-left rounded-2xl transition-colors"
                style={{
                  padding: "22px 24px",
                  background: "var(--portfolio-surface)",
                  border: "1px solid var(--portfolio-border)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display font-semibold text-ink" style={{ fontSize: 19 }}>
                    {exp.title}
                  </h3>
                  <span
                    className="font-display text-accent-bright"
                    style={{ fontSize: 13, letterSpacing: 0.4, whiteSpace: "nowrap" }}
                  >
                    {exp.duration}
                  </span>
                </div>

                <p className="font-display text-muted-portfolio mt-0.5" style={{ fontSize: 15 }}>
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

                {/* Stretched link: the button carries the visible "Learn more" label,
                    and its absolutely-positioned overlay makes the whole card clickable
                    without swallowing the heading into the button's a11y subtree. */}
                <button
                  type="button"
                  onClick={() => {
                    trackMember(KEYS.experiences, exp.company);
                    if (exp.coords) trackMember(KEYS.globeCities, exp.location);
                    setSelected(exp);
                  }}
                  aria-label={`Learn more about ${exp.title} at ${exp.company}`}
                  className="inline-flex items-center gap-1 font-display text-accent-bright mt-3 cursor-pointer"
                  style={{ fontSize: 13, background: "none", border: 0, padding: 0 }}
                >
                  <span className="transition-transform group-hover:translate-x-0.5">
                    Learn more →
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute rounded-2xl"
                    style={{ inset: -1, cursor: "pointer" }}
                  />
                </button>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/*
        Portalled to <body> rather than rendered here, because "here" is inside a wrapper
        with z-index: 2 — a stacking context, which caps everything within it. The overlay
        asks for z-70 and gets it only relative to that wrapper, so the fixed nav at z-50
        painted over the top 78px of the panel and swallowed clicks on its close button;
        Escape and a backdrop click still worked, which is why it went unnoticed. A portal
        moves the overlay out to the document root where its z-index means what it says.

        Safe under prerender: `selected` is null on first paint, so createPortal never runs
        during SSR, where it is unsupported.
      */}
      {typeof document === "undefined"
        ? null
        : createPortal(
            <AnimatePresence>
              {selected && (
                <ExperienceModal
                  exp={selected}
                  position={EXPERIENCES.indexOf(selected) + 1}
                  count={EXPERIENCES.length}
                  onClose={() => setSelected(null)}
                  onNavigate={navigateExperience}
                />
              )}
            </AnimatePresence>,
            document.body,
          )}
    </Section>
  );
}
