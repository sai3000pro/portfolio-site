import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Download, Printer } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { KEYS } from "@/data/achievements";
import { PROFILE, SOCIALS } from "@/data/portfolio";
import { trackMember, unlock } from "@/lib/achievements";
import { assetUrl } from "@/lib/assets";
import { printResume } from "@/lib/print-resume";
import { useTheme } from "@/lib/theme";
import { getVCardDownloadProps } from "@/lib/vcard";
import { Reveal, Section, SectionHeading } from "./section";
import { surfaceChrome, type ContactFieldName } from "./contact-form-chrome";
import { ContactFormPlaceholder } from "./contact-form-shell";
// Type-only: erased at compile time, so it creates no static edge to the chunk.
import type { ContactFormProps } from "./contact-form";

/**
 * How far ahead of the viewport the form's chunk starts downloading. The contact
 * section is the last thing on the landing page, so a full viewport of lead time
 * means the request is in flight long before the panel is on screen and the swap
 * has effectively always happened by the time anyone can interact with it.
 */
const PRELOAD_MARGIN = "800px 0px";

type ContactFormComponent = ComponentType<ContactFormProps>;

export function Contact() {
  // Sonner needs to be told which palette to render; it cannot read our `.light`
  // class. Subscribing keeps toasts correct when the theme is flipped mid-visit.
  const theme = useTheme();
  // Timestamp of when the section mounted, handed to the form so its minimum-time
  // spam check measures page-open time exactly as it did before the split.
  const mountedAt = useRef(Date.now());

  // The stable box the form lives in: it is what the IntersectionObserver watches
  // and it survives the placeholder → form swap.
  const slotRef = useRef<HTMLDivElement>(null);
  // Which placeholder field has focus right now, so the swap can hand it back.
  const focusedFieldRef = useRef<ContactFieldName | null>(null);

  // `armed` starts false on BOTH sides of hydration and is only ever flipped from
  // an effect or a user event — never during render. That is what makes the
  // prerendered HTML and the client's first render provably identical (same
  // approach hobby-belts.tsx uses to pick its branch after mount).
  const [armed, setArmed] = useState(false);
  const [Form, setForm] = useState<ContactFormComponent | null>(null);
  const [initialFocus, setInitialFocus] = useState<ContactFieldName | null>(null);
  const [failed, setFailed] = useState(false);

  const arm = useCallback(() => setArmed(true), []);

  // Trigger 1: proximity. Fires well before the panel is visible.
  useEffect(() => {
    if (armed) return;
    const el = slotRef.current;
    // No observer (very old browser, or no element yet) — just load it.
    if (!el || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setArmed(true);
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed]);

  useEffect(() => {
    if (!armed) return;
    let alive = true;
    void import("./contact-form")
      .then((mod) => {
        if (!alive) return;
        // Both setStates land in one batch, so the form mounts already knowing
        // where focus has to go.
        setInitialFocus(focusedFieldRef.current);
        setForm(() => mod.ContactForm);
      })
      .catch(() => {
        // Offline mid-visit, a purged deploy, a blocked request: the placeholder
        // stays, but swaps its dead submit button for a working mailto link.
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [armed]);

  // Trigger 2: intent. Hovering, pressing or tabbing into the panel all start the
  // load, which covers a visitor who somehow reaches it before the observer does.
  const onFieldFocusChange = useCallback((name: ContactFieldName | null) => {
    focusedFieldRef.current = name;
    if (name) setArmed(true);
  }, []);

  return (
    <Section id="contact">
      {/* Toasts live where the form does so success/error feedback renders. */}
      <Toaster position="bottom-right" theme={theme} richColors />
      <SectionHeading eyebrow="Say hello" title="Get in touch" />

      <div
        className="mt-14 grid items-start grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        style={{ gap: "clamp(36px,5vw,64px)" }}
      >
        {/* Left: invitation + socials. Entirely server-rendered — including the
            mailto: entry in SOCIALS, which stays reachable whatever the form does. */}
        <Reveal>
          <p
            className="text-muted-portfolio"
            style={{ fontSize: "clamp(16px,1.3vw,19px)", lineHeight: 1.8, textWrap: "pretty" }}
          >
            Have an idea, an opportunity, or just want to chat? My inbox is always open, and I'll do
            my best to get back to you.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {SOCIALS.map((s) => (
              <motion.a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                whileHover={{ x: 4 }}
                onClick={() => trackMember(KEYS.socials, s.label)}
                className="inline-flex items-center justify-between rounded-xl no-underline text-ink font-display"
                style={{ fontSize: 15.5, padding: "14px 18px", ...surfaceChrome }}
              >
                <span>{s.label}</span>
                <span className="text-accent-bright">→</span>
              </motion.a>
            ))}
          </div>

          {/* Save-contact / print affordances. The print styles in styles.css strip the
              cosmic chrome so this produces a clean black-on-white résumé page. */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              {...getVCardDownloadProps()}
              onClick={() => unlock("analog-backup")}
              className="inline-flex items-center gap-2 rounded-full no-underline font-display font-medium text-muted-portfolio transition-colors hover:text-ink"
              style={{
                fontSize: 13.5,
                padding: "9px 15px",
                background: "var(--portfolio-surface-2)",
                border: "1px solid var(--portfolio-border)",
              }}
            >
              <Download size={14} strokeWidth={2} aria-hidden />
              Download vCard
            </a>
            <button
              type="button"
              onClick={() => {
                unlock("dead-tree-format");
                printResume(assetUrl(PROFILE.resumeUrl));
              }}
              className="inline-flex items-center gap-2 rounded-full font-display font-medium text-muted-portfolio transition-colors hover:text-ink"
              style={{
                fontSize: 13.5,
                padding: "9px 15px",
                background: "var(--portfolio-surface-2)",
                border: "1px solid var(--portfolio-border)",
              }}
            >
              <Printer size={14} strokeWidth={2} aria-hidden />
              Print résumé
            </button>
          </div>
        </Reveal>

        {/* Right: validated form (posts to VITE_CONTACT_ENDPOINT, else mailto).
            Code-split — the placeholder holds the exact same box until it lands. */}
        <Reveal delay={0.1}>
          <div ref={slotRef} onPointerEnter={arm} onPointerDown={arm}>
            {Form ? (
              <Form mountedAtMs={mountedAt.current} initialFocus={initialFocus} />
            ) : (
              <ContactFormPlaceholder
                email={PROFILE.email}
                failed={failed}
                onFieldFocusChange={onFieldFocusChange}
              />
            )}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer
      className="relative mx-auto w-full"
      style={{
        maxWidth: 1180,
        padding: "32px clamp(24px,5vw,80px) 48px",
        borderTop: "1px solid var(--portfolio-border)",
      }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="font-display font-semibold text-ink" style={{ fontSize: 15.5 }}>
            © 2019 - {new Date().getFullYear()} | {PROFILE.fullName}
          </p>
          <p className="text-muted-portfolio" style={{ fontSize: 13.5 }}>
            Software Engineer, Creator, and Problem Solver
          </p>
        </div>
        {/* Externals only. /gallery used to sit here too, but a route link reads as one more
            profile beside GitHub and LinkedIn; it lives in the nav's "Beyond the Code" menu
            and its mobile sheet, which is where site navigation belongs. Nothing depended on
            this copy — `spacewalk` unlocks on visiting /gallery by any route, and only the
            SOCIALS entries below feed `KEYS.socials`. */}
        <div className="flex gap-5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => trackMember(KEYS.socials, s.label)}
              className="font-display text-muted-portfolio no-underline transition-colors hover:text-accent-bright"
              style={{ fontSize: 14 }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
