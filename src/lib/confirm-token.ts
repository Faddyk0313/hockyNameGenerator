import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed token for the confirmation link.
 *
 * HubSpot proved confirmation by the contact visiting a tracked landing page. Here the
 * link carries the Person id plus an HMAC, so a visitor cannot mark an arbitrary record
 * confirmed by editing the URL -- the id alone is a UUID that appears in other links.
 */
const SECRET = () => process.env.CONFIRM_TOKEN_SECRET ?? "";

export function signConfirmToken(personId: string): string {
  const mac = createHmac("sha256", SECRET()).update(personId).digest("base64url");
  return `${personId}.${mac}`;
}

export function verifyConfirmToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const personId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET()).update(personId).digest("base64url");

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return personId;
}

/**
 * Absolute URL for the "CONFIRM TEAM DISCOUNT REQUEST" button.
 *
 * HubSpot linked to a static page and stamped a per-recipient `_hsenc` parameter onto
 * it at send time, which is what identified the clicker. There is no equivalent here,
 * so the identity travels in our own signed token instead.
 */
export function confirmUrlFor(personId: string): string {
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const token = signConfirmToken(personId);
  return `${base}/api/twenty-confirm?token=${encodeURIComponent(token)}`;
}
