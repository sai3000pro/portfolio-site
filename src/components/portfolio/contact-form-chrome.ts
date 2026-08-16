import type { CSSProperties } from "react";

/**
 * Box metrics and the field list shared by the contact form and by the placeholder
 * that stands in for it while its chunk is in flight (see contact-form-shell.tsx).
 *
 * WHY THIS FILE EXISTS: the form is code-split (see contact.tsx), so something has
 * to hold its space until it arrives or the swap is a CLS regression. The only way
 * to guarantee the placeholder is exactly as tall as the real form is for both to
 * be built from the same field list and the same box metrics — so every value that
 * contributes to the panel's height lives here and is used twice.
 *
 * HARD RULE: nothing in this module (or in contact-form-shell.tsx) may import zod,
 * react-hook-form, @hookform/resolvers or @/lib/contact. These files are
 * deliberately part of the eager bundle; pulling any of those in would undo the
 * split.
 */

/** The three fields, in DOM order. */
export type ContactFieldName = "name" | "email" | "message";

export interface ContactFieldSpec {
  readonly name: ContactFieldName;
  readonly label: string;
  readonly placeholder: string;
  /** Present ⇒ render a <textarea> with this many rows instead of an <input>. */
  readonly rows?: number;
  readonly type?: string;
  readonly autoComplete?: string;
}

/**
 * Single source of truth for the field set. The real form maps over it to build
 * its registered controls; the placeholder maps over it to build inert twins of
 * the same size. Adding a field therefore cannot desynchronise the two heights.
 */
export const CONTACT_FIELDS: readonly ContactFieldSpec[] = [
  { name: "name", label: "Name", placeholder: "Your name", autoComplete: "name" },
  {
    name: "email",
    label: "Email",
    placeholder: "you@example.com",
    type: "email",
    autoComplete: "email",
  },
  { name: "message", label: "Message", placeholder: "What's on your mind?", rows: 4 },
];

/** Surface + hairline used by the form panel and the social link buttons alike. */
export const surfaceChrome: CSSProperties = {
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
};

/** The form panel box. Padding is part of the height contract — keep it shared. */
export const panelStyle: CSSProperties = {
  padding: "clamp(22px,3vw,32px)",
  ...surfaceChrome,
  backdropFilter: "blur(6px)",
};

export const inputStyle: CSSProperties = {
  padding: "11px 13px",
  background: "var(--portfolio-surface)",
  border: "1px solid var(--portfolio-border)",
  color: "var(--portfolio-ink)",
};

// Shared field chrome for all three inputs. `outline-none` suppresses the UA focus
// ring, so a replacement focus indicator is mandatory (WCAG 2.4.7). The ring reads
// --portfolio-accent-bright, which styles.css redefines under `html.light`, so it
// stays visible on both grounds (#5db6ff on space, #0f62c9 on white).
// NB: the arbitrary value is deliberate — `ring-accent-bright` compiles to nothing
// because no `--color-accent-bright` is registered in the @theme block.
export const inputClass =
  "w-full rounded-lg text-ink placeholder:text-[var(--portfolio-muted)] outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--portfolio-accent-bright)]";

/**
 * Submit-button box. `<button>` and `<a>` both take it verbatim: Tailwind's
 * preflight gives buttons `font: inherit`, so an anchor with the same font-size,
 * padding and `inline-flex` centring resolves to the identical line box — which is
 * what lets the failure state swap a mailto link in without moving anything.
 */
export const submitClass =
  "font-display font-semibold rounded-full w-full mt-2 inline-flex items-center justify-center gap-2";

export const submitStyle: CSSProperties = {
  fontSize: 15,
  padding: "14px",
  color: "#021024",
  background: "linear-gradient(180deg,#5db6ff,#2f9bff)",
  boxShadow: "0 8px 24px rgba(47,155,255,0.4)",
};

export interface FieldRenderProps {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}
