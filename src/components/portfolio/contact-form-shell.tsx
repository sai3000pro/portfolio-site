import { useId, type ReactNode } from "react";
import {
  CONTACT_FIELDS,
  inputClass,
  inputStyle,
  panelStyle,
  submitClass,
  submitStyle,
  type ContactFieldName,
  type FieldRenderProps,
} from "./contact-form-chrome";

/**
 * The two eagerly-bundled pieces of the contact panel: the labelled field wrapper
 * (shared with the real form) and the placeholder that occupies the panel's exact
 * box until the code-split form arrives. See contact-form-chrome.ts for why the
 * metrics are shared, and contact.tsx for the loading state machine.
 *
 * Like contact-form-chrome.ts, this file must never import zod, react-hook-form,
 * @hookform/resolvers or @/lib/contact.
 */

export function Field({
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

  // The error sits OUTSIDE the <label>: content inside a label is folded into the
  // control's accessible NAME, which would turn "Email" into "Email Please enter a
  // valid email address." aria-describedby still points at it, so it is announced
  // as a description instead.
  return (
    <div className="block mb-4">
      <label
        htmlFor={id}
        className="font-display font-medium text-muted-portfolio block mb-2"
        style={{ fontSize: 13.5 }}
      >
        {label}
      </label>
      {children({ id, describedBy: invalid ? errorId : undefined, invalid })}
      {error && (
        <span id={errorId} className="block mt-1.5" style={{ fontSize: 12.5, color: "#d83a42" }}>
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * What the server prerenders, and what the client renders on its very first pass —
 * the two are the same tree, so hydration is a no-op here (see contact.tsx).
 *
 * It is a pixel-for-pixel stand-in rather than a grey skeleton on purpose: it is
 * built from the same `CONTACT_FIELDS`, the same `Field`, the same input chrome and
 * the same submit box as the real form, and a freshly mounted form carries no error
 * spans, so the two panels are the same height and the swap moves nothing.
 *
 * The inputs are `readOnly` rather than `disabled` so they stay focusable: a
 * keyboard visitor who arrives before the chunk does can still tab into the panel,
 * and focusing a field both starts the load and is remembered, so focus is handed
 * back to the same field once the real form takes over. `readOnly` also means there
 * is no typed value to lose across the swap.
 */
export function ContactFormPlaceholder({
  email,
  failed,
  onFieldFocusChange,
}: {
  /** Address behind the fallback link shown if the chunk never arrives. */
  email: string;
  /** The dynamic import rejected — offer a working way out instead of a dead button. */
  failed: boolean;
  /** Reports which field has focus (null on blur) so the swap can restore it. */
  onFieldFocusChange: (name: ContactFieldName | null) => void;
}) {
  return (
    <div className="rounded-2xl" style={panelStyle} aria-busy={!failed}>
      {CONTACT_FIELDS.map((field) => (
        <Field key={field.name} label={field.label}>
          {({ id }) => {
            const shared = {
              id,
              readOnly: true,
              placeholder: field.placeholder,
              onFocus: () => onFieldFocusChange(field.name),
              onBlur: () => onFieldFocusChange(null),
              style: inputStyle,
            };
            return field.rows ? (
              <textarea {...shared} rows={field.rows} className={`${inputClass} resize-y`} />
            ) : (
              <input
                {...shared}
                type={field.type}
                autoComplete={field.autoComplete}
                className={inputClass}
              />
            );
          }}
        </Field>
      ))}

      {failed ? (
        // Same box as the submit button, so the failure state costs zero pixels.
        <a
          href={`mailto:${email}`}
          className={`${submitClass} no-underline`}
          style={{ ...submitStyle, cursor: "pointer" }}
        >
          Email me directly
        </a>
      ) : (
        <button
          type="button"
          disabled
          className={submitClass}
          style={{ ...submitStyle, cursor: "progress" }}
        >
          Send Message
        </button>
      )}

      {/* Mirrors the live region the real form owns, so a failed load is spoken. */}
      <div role="alert" className="sr-only">
        {failed ? `The contact form could not be loaded. Please email ${email} instead.` : ""}
      </div>
    </div>
  );
}
