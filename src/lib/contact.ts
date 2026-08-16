import { z } from "zod";

// Contact form logic kept separate from the view so it can be unit-tested and
// reused. Nothing here hardcodes a third-party service — the POST target comes
// from an env var and we fall back to a mailto: link when it is absent.

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters).")
    .max(80, "That name is a little long (max 80 characters)."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email so I can reply.")
    .email("Please enter a valid email address."),
  message: z
    .string()
    .trim()
    .min(10, "Tell me a bit more — at least 10 characters.")
    .max(2000, "That message is very long (max 2000 characters)."),
});

export type ContactValues = z.infer<typeof contactSchema>;

/**
 * Read the POST endpoint from the public env var. Returns undefined when it is
 * missing/blank so callers can gracefully fall back to mailto behaviour.
 * VITE_ vars are public by design — never put a secret token here.
 */
export function getContactEndpoint(): string | undefined {
  const raw = import.meta.env.VITE_CONTACT_ENDPOINT;
  const endpoint = typeof raw === "string" ? raw.trim() : "";
  return endpoint.length > 0 ? endpoint : undefined;
}

/**
 * Build a prefilled mailto: URL — the offline-friendly fallback used when no
 * endpoint is configured, or as a suggestion when a network submit fails.
 */
export function buildMailtoUrl(recipient: string, values: Partial<ContactValues>): string {
  const name = values.name?.trim() ?? "";
  const email = values.email?.trim() ?? "";
  const message = values.message?.trim() ?? "";
  const subject = encodeURIComponent(`Portfolio message from ${name || "a visitor"}`);
  const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

export type SubmitOutcome =
  | { kind: "mailto"; url: string }
  | { kind: "success" }
  | { kind: "network-error" }
  | { kind: "server-error"; status: number };

/**
 * Generic JSON payload that works with common form backends (Formspree,
 * Resend workers, etc.). We send the core fields plus a couple of optional
 * hints; unknown backends simply ignore extras.
 */
export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  _subject: string;
  submittedAt: string;
}

export function buildPayload(values: ContactValues): ContactPayload {
  return {
    name: values.name,
    email: values.email,
    message: values.message,
    _subject: `Portfolio message from ${values.name}`,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Submit the contact form. When no endpoint is configured we hand back a
 * mailto: URL for the caller to open. Otherwise we POST JSON and distinguish
 * network failures from non-2xx server responses.
 */
export async function submitContact(
  values: ContactValues,
  recipientEmail: string,
): Promise<SubmitOutcome> {
  const endpoint = getContactEndpoint();

  if (!endpoint) {
    return { kind: "mailto", url: buildMailtoUrl(recipientEmail, values) };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildPayload(values)),
    });
  } catch {
    return { kind: "network-error" };
  }

  if (!response.ok) {
    return { kind: "server-error", status: response.status };
  }

  return { kind: "success" };
}
