import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROFILE } from "@/data/portfolio";
import { unlock } from "@/lib/achievements";
import { buildMailtoUrl, contactSchema, submitContact, type ContactValues } from "@/lib/contact";
import {
  CONTACT_FIELDS,
  inputClass,
  inputStyle,
  panelStyle,
  submitClass,
  submitStyle,
  type ContactFieldName,
} from "./contact-form-chrome";
import { Field } from "./contact-form-shell";

/**
 * The validated contact form — and the ONLY module on the landing page that pulls
 * in zod, react-hook-form and @hookform/resolvers (~97KB raw between them).
 *
 * It is reached exclusively through the dynamic `import()` in contact.tsx, which is
 * what keeps those three off the initial entry chunk. Do not import this file
 * statically from anything that the landing page renders eagerly, or the split
 * silently collapses back into the main bundle.
 *
 * The validation itself is untouched: same `contactSchema`, same messages, same
 * `onTouched` mode, same honeypot + minimum-time spam checks, same achievement
 * unlocks. Only *when* the code loads has changed.
 */

// Reject submissions that arrive implausibly fast — real humans take a moment
// to fill three fields, bots do not.
const MIN_SUBMIT_MS = 2000;

// Visual (and DOM) order of the fields — used to pick which invalid field to
// focus and which message to announce after a failed submit. Derived from the
// shared spec so it can never drift from what is actually rendered.
const FIELD_ORDER: readonly ContactFieldName[] = CONTACT_FIELDS.map((field) => field.name);

export interface ContactFormProps {
  /**
   * Epoch ms captured when the *section* mounted, not when this chunk arrived.
   * The minimum-time spam check is meant to measure "how long has this visitor had
   * the page open", so the clock has to start at page load exactly as it did when
   * the form was part of the entry bundle.
   */
  mountedAtMs: number;
  /**
   * Field the visitor had focused in the placeholder, if any. Focus is moved back
   * to it on mount so tabbing into the panel early is not punished by the swap.
   */
  initialFocus?: ContactFieldName | null;
}

export function ContactForm({ mountedAtMs, initialFocus }: ContactFormProps) {
  // Timestamp used for the time-to-submit check; reset after a successful send.
  const mountedAt = useRef(mountedAtMs);
  // Honeypot: a field only bots tend to fill. Kept out of react-hook-form so
  // it never affects validation state.
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Failure announcement for the alert region. `attempt` increments on every
  // failed submit so a repeated, identical message still re-renders the text
  // node — otherwise a second press with the same errors would announce nothing.
  const [submitError, setSubmitError] = useState<{ message: string; attempt: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", message: "" },
  });

  // Hand focus back to whichever placeholder field the visitor was on when this
  // chunk landed. `initialFocus` is set once, in the same batch that mounts this
  // component, so this runs at most once per visit.
  useEffect(() => {
    if (initialFocus) setFocus(initialFocus);
  }, [initialFocus, setFocus]);

  // The form is noValidate, so the browser announces nothing on a failed submit.
  // Move focus to the first invalid control (WCAG 3.3.1) and put a summary in the
  // alert region so the failure is spoken even if focus lands mid-announcement.
  const onInvalid = (fieldErrors: FieldErrors<ContactValues>) => {
    const invalid = FIELD_ORDER.filter((name) => fieldErrors[name]);
    const first = invalid[0];
    if (!first) return;

    setFocus(first, { shouldSelect: true });
    const detail = fieldErrors[first]?.message;
    setSubmitError({
      message:
        invalid.length === 1
          ? `Message not sent. 1 field needs attention. ${detail ?? ""}`.trim()
          : `Message not sent. ${invalid.length} fields need attention. ${detail ?? ""}`.trim(),
      attempt: (submitError?.attempt ?? 0) + 1,
    });
  };

  const onSubmit = async (values: ContactValues) => {
    setSubmitError(null);
    // Silently drop bot submissions — no toast, so scrapers get no signal.
    if (honeypotRef.current?.value) return;
    if (Date.now() - mountedAt.current < MIN_SUBMIT_MS) return;

    const outcome = await submitContact(values, PROFILE.email);

    switch (outcome.kind) {
      case "mailto":
        // No endpoint configured — preserve the original behaviour exactly. The
        // visitor still composed and sent a message, so the badge applies here
        // too; without this it would be unearnable on the deployed site (and
        // would take the "every other badge" completionist trophy down with it).
        unlock("cold-call");
        window.location.href = outcome.url;
        return;
      case "success":
        unlock("cold-call");
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

  const status = isSubmitting ? "Sending your message…" : "";

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      noValidate
      className="rounded-2xl"
      style={panelStyle}
    >
      {CONTACT_FIELDS.map((field) => (
        <Field key={field.name} label={field.label} error={errors[field.name]?.message}>
          {({ id, describedBy, invalid }) =>
            field.rows ? (
              <textarea
                id={id}
                {...register(field.name)}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                placeholder={field.placeholder}
                rows={field.rows}
                className={`${inputClass} resize-y`}
                style={inputStyle}
              />
            ) : (
              <input
                id={id}
                type={field.type}
                {...register(field.name)}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                className={inputClass}
                style={inputStyle}
              />
            )
          }
        </Field>
      ))}

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
        className={submitClass}
        style={{
          ...submitStyle,
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

      {/* Assertively announce a failed submit. Separate from the polite
          status above because that one only ever carries "Sending…". */}
      <div role="alert" className="sr-only">
        {submitError && <span key={submitError.attempt}>{submitError.message}</span>}
      </div>
    </form>
  );
}
