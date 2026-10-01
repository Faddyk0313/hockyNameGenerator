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
