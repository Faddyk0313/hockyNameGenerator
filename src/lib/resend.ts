/**
 * Minimal Resend client.
 *
 * Hand-rolled over fetch rather than pulling in the SDK, for the same reason as
 * lib/twenty.ts: the relay sends exactly one kind of email and a dependency would add
 * bundle weight and an upgrade surface for a single POST.
 *
 * Resend is also what Twenty itself sends through (over SMTP, as a connected account).
 * Here we use the REST API with the same key -- the transport differs, the sender
 * domain does not.
 */

const ENDPOINT = "https://api.resend.com/emails";

export class ResendError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    throw new ResendError("RESEND_API_KEY or EMAIL_FROM is not set", 500, null);
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ResendError(text.slice(0, 200) || "Resend returned a non-JSON body", res.status, text);
  }

  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? `Resend ${res.status}`;
    throw new ResendError(message, res.status, body);
  }

  return body as { id: string };
}
