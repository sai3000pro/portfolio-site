import { useId, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PROFILE, SOCIALS } from "@/data/portfolio";
import { buildMailtoUrl, contactSchema, submitContact, type ContactValues } from "@/lib/contact";
import { assetUrl } from "@/lib/assets";
import { printResume } from "@/lib/print-resume";
import { getVCardDownloadProps } from "@/lib/vcard";
import { Reveal, Section, SectionHeading } from "./section";

// Reject submissions that arrive implausibly fast — real humans take a moment
// to fill three fields, bots do not.
const MIN_SUBMIT_MS = 2000;

const inputStyle: React.CSSProperties = {
  padding: "11px 13px",
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
  color: "var(--portfolio-ink)",
};

export function Contact() {
  // Timestamp of when the form mounted, used for the time-to-submit check.
  const mountedAt = useRef(Date.now());
  // Honeypot: a field only bots tend to fill. Kept out of react-hook-form so
  // it never affects validation state.
  const honeypotRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", message: "" },
  });

  const onSubmit = async (values: ContactValues) => {
    // Silently drop bot submissions — no toast, so scrapers get no signal.
    if (honeypotRef.current?.value) return;
    if (Date.now() - mountedAt.current < MIN_SUBMIT_MS) return;

    const outcome = await submitContact(values, PROFILE.email);

    switch (outcome.kind) {
      case "mailto":
        // No endpoint configured — preserve the original behaviour exactly.
        window.location.href = outcome.url;
        return;
      case "success":
        toast.success("Message sent — thanks for reaching out!", {
          description: "I'll get back to you as soon as I can.",
        });
        reset();
        mountedAt.current = Date.now();
        return;
      case "server-error":
      case "network-error":
        toast.error("Couldn't send your message.", {
          description: `Something went wrong. You can email me directly at ${PROFILE.email}.`,
          action: {
            label: "Email instead",
            onClick: () => {
              window.location.href = buildMailtoUrl(PROFILE.email, values);
            },
          },
        });
        return;
    }
  };

  const fieldStyle: React.CSSProperties = {
    background: "var(--portfolio-surface)",
    border: "1px solid var(--portfolio-border)",
  };

  const status = isSubmitting ? "Sending your message…" : "";

  return (
    <Section id="contact">
      {/* Toasts live where the form does so success/error feedback renders. */}
      <Toaster position="bottom-right" theme="dark" richColors />
      <SectionHeading eyebrow="Say hello" title="Get in touch" />

      <div
        className="mt-14 grid items-start"
        style={{
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)",
          gap: "clamp(36px,5vw,64px)",
        }}
      >
        {/* Left: invitation + socials */}
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
                className="inline-flex items-center justify-between rounded-xl no-underline text-ink font-display"
                style={{ fontSize: 15.5, padding: "14px 18px", ...fieldStyle }}
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
              onClick={() => printResume(assetUrl(PROFILE.resumeUrl))}
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

        {/* Right: validated form (posts to VITE_CONTACT_ENDPOINT, else mailto) */}
        <Reveal delay={0.1}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="rounded-2xl"
            style={{ padding: "clamp(22px,3vw,32px)", ...fieldStyle, backdropFilter: "blur(6px)" }}
          >
            <Field label="Name" error={errors.name?.message}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  {...register("name")}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-lg text-ink placeholder:text-[var(--portfolio-muted)] outline-none"
                  style={inputStyle}
                />
              )}
            </Field>
            <Field label="Email" error={errors.email?.message}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  type="email"
                  {...register("email")}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg text-ink placeholder:text-[var(--portfolio-muted)] outline-none"
                  style={inputStyle}
                />
              )}
            </Field>
            <Field label="Message" error={errors.message?.message}>
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  {...register("message")}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full rounded-lg text-ink placeholder:text-[var(--portfolio-muted)] outline-none resize-y"
                  style={inputStyle}
                />
              )}
            </Field>

            {/* Honeypot: visually hidden but present in the DOM. Never focusable
                and hidden from assistive tech, so only bots will fill it. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
              }}
            >
              <label htmlFor="contact-company">Company (leave this empty)</label>
              <input
                id="contact-company"
                ref={honeypotRef}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={
                isSubmitting ? undefined : { y: -2, boxShadow: "0 12px 32px rgba(47,155,255,0.5)" }
              }
              whileTap={isSubmitting ? undefined : { scale: 0.98 }}
              className="font-display font-semibold rounded-full w-full mt-2 inline-flex items-center justify-center gap-2"
              style={{
                fontSize: 15,
                padding: "14px",
                color: "#021024",
                background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
                boxShadow: "0 8px 24px rgba(47,155,255,0.4)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Sending…" : "Send Message"}
            </motion.button>

            {/* Politely announce submit state to screen readers. */}
            <output aria-live="polite" className="sr-only">
              {status}
            </output>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}

interface FieldRenderProps {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  return (
    <label htmlFor={id} className="block mb-4">
      <span
        className="font-display font-medium text-muted-portfolio block mb-2"
        style={{ fontSize: 13.5 }}
      >
        {label}
      </span>
      {children({ id, describedBy: invalid ? errorId : undefined, invalid })}
      {error && (
        <span id={errorId} className="block mt-1.5" style={{ fontSize: 12.5, color: "#d83a42" }}>
          {error}
        </span>
      )}
    </label>
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
            © 2024 - {new Date().getFullYear()} | {PROFILE.fullName}
          </p>
          <p className="text-muted-portfolio" style={{ fontSize: 13.5 }}>
            Software Engineer, Creator, and Problem Solver
          </p>
        </div>
        <div className="flex gap-5">
          {/* The nav is hidden below 768px, so this is the only route to /hobbies on mobile. */}
          <Link
            to="/hobbies"
            className="font-display text-muted-portfolio no-underline transition-colors hover:text-accent-bright"
            style={{ fontSize: 14 }}
          >
            Hobbies
          </Link>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
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
