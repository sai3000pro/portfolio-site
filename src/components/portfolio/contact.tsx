import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PROFILE, SOCIALS } from "@/data/portfolio";
import { Reveal, Section, SectionHeading } from "./section";

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // No backend here — compose a prefilled email in the visitor's mail client.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Portfolio message from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
    window.location.href = `mailto:${PROFILE.email}?subject=${subject}&body=${body}`;
  };

  const fieldStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(93,182,255,0.2)",
  };

  return (
    <Section id="contact">
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
                className="inline-flex items-center justify-between rounded-xl no-underline text-white font-display"
                style={{ fontSize: 15.5, padding: "14px 18px", ...fieldStyle }}
              >
                <span>{s.label}</span>
                <span className="text-accent-bright">→</span>
              </motion.a>
            ))}
          </div>
        </Reveal>

        {/* Right: mailto form */}
        <Reveal delay={0.1}>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl"
            style={{ padding: "clamp(22px,3vw,32px)", ...fieldStyle, backdropFilter: "blur(6px)" }}
          >
            <Field label="Name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg text-white outline-none"
                style={{
                  padding: "11px 13px",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(93,182,255,0.18)",
                }}
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg text-white outline-none"
                style={{
                  padding: "11px 13px",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(93,182,255,0.18)",
                }}
              />
            </Field>
            <Field label="Message">
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full rounded-lg text-white outline-none resize-y"
                style={{
                  padding: "11px 13px",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(93,182,255,0.18)",
                }}
              />
            </Field>
            <motion.button
              type="submit"
              whileHover={{ y: -2, boxShadow: "0 12px 32px rgba(47,155,255,0.5)" }}
              whileTap={{ scale: 0.98 }}
              className="font-display font-semibold rounded-full w-full mt-2"
              style={{
                fontSize: 15,
                padding: "14px",
                color: "#021024",
                background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
                boxShadow: "0 8px 24px rgba(47,155,255,0.4)",
              }}
            >
              Send Message
            </motion.button>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span
        className="font-display font-medium text-white/80 block mb-2"
        style={{ fontSize: 13.5 }}
      >
        {label}
      </span>
      {children}
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
        borderTop: "1px solid rgba(93,182,255,0.14)",
      }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <p className="font-display font-semibold text-white" style={{ fontSize: 15.5 }}>
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
