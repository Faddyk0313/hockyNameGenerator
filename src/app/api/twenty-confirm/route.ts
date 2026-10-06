import { NextResponse } from "next/server";
import { updateOne } from "@/lib/twenty";
import { verifyConfirmToken } from "@/lib/confirm-token";

/**
 * Target of the "CONFIRM TEAM DISCOUNT REQUEST" button, replacing the HubSpot landing
 * page at 46588550.hs-sites.com/-confirmation whose visit fired workflow 1821173566.
 * Sets tsEmailConfirmation = true on the Person, then shows a plain confirmation page.
 *
 * GET is the only safe verb here because mail clients follow links with GET; the HMAC in
 * the token is what stops an arbitrary record being flagged.
 */

const SITE = "https://www.titanbattlegear.com";
const LOGO =
  "https://cdn.shopify.com/s/files/1/0635/2401/2210/files/titan_battlegear_logo.png?v=1730320377";

const NAV: Array<[string, string]> = [
  ["Home", SITE],
  ["Products", `${SITE}/pages/shop-by-collection`],
  ["Team Programs", `${SITE}/pages/team-sales-program`],
  ["Team Savings", `${SITE}/pages/team-discount-program`],
];

/** Inline SVG rather than icon files: mail-adjacent pages get opened with images off. */
const SOCIALS: Array<[string, string, string]> = [
  [
    "LinkedIn",
    "https://www.linkedin.com/company/titan-battlegear",
    "M4.98 3.5a2.5 2.5 0 1 1-.02 5.001A2.5 2.5 0 0 1 4.98 3.5M3 9h4v12H3zm7 0h3.8v1.65h.05A4.17 4.17 0 0 1 17.6 8.7c4 0 4.4 2.5 4.4 5.76V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95s-2.1 1.4-2.1 2.86V21h-4z",
  ],
  [
    "Instagram",
    "https://www.instagram.com/titan_battlegear",
    "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.3.84-.4.4-.64.8-.84 1.3-.16.4-.35 1-.4 2.1C2.6 8.5 2.6 8.9 2.6 12s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.44.9.84 1.3.4.4.8.64 1.3.84.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.44 1.3-.84.4-.4.64-.8.84-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.44-.9-.84-1.3-.4-.4-.8-.64-1.3-.84-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4m0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06m0 8.14A3.2 3.2 0 1 0 8.8 12a3.2 3.2 0 0 0 3.2 3.2m6.3-8.34a1.15 1.15 0 1 1-1.15-1.15 1.15 1.15 0 0 1 1.15 1.15",
  ],
];

/**
 * Replaces the HubSpot landing page at 46588550.hs-sites.com/-confirmation, so it mirrors
 * that page: centred wordmark, two-line headline, one line of reassurance, then the site
 * footer. Styles are inline and the layout is a table, because this is opened straight
 * from an email client's browser handoff.
 */
function page(headline: string, message: string, ok: boolean) {
  const nav = NAV.map(
    ([label, href]) =>
      `<a href="${href}" style="color:#1b2a3a;text-decoration:none;font-size:15px;padding:0 14px;display:inline-block;">${label}</a>`
  ).join("");

  const socials = SOCIALS.map(
    ([label, href, d]) =>
      `<a href="${href}" aria-label="${label}" style="display:inline-block;margin:0 6px;width:34px;height:34px;border:1px solid #d9d9e3;border-radius:50%;text-align:center;line-height:34px;">` +
      `<svg width="15" height="15" viewBox="0 0 24 24" fill="#8f8fa3" style="vertical-align:middle;"><path d="${d}"/></svg></a>`
  ).join("");

  return new NextResponse(
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${headline.replace(/<[^>]+>/g, " ").trim()}</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#1b2a3a;font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:56px 20px 0;">
      <img src="${LOGO}" alt="Titan BattleGear" width="300" height="97" style="display:block;border:0;width:300px;max-width:82%;height:auto;">
    </td></tr>

    <tr><td align="center" style="padding:72px 20px 0;">
      <h1 style="margin:0;font-size:38px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;max-width:640px;">${headline}</h1>
    </td></tr>

    <tr><td align="center" style="padding:22px 20px 0;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:${ok ? "#1b2a3a" : "#8a4b4b"};max-width:560px;">${message}</p>
    </td></tr>

    <tr><td align="center" style="padding:96px 20px 0;">
      <img src="${LOGO}" alt="" width="180" height="58" style="display:block;border:0;width:180px;max-width:60%;height:auto;">
    </td></tr>

    <tr><td align="center" style="padding:26px 20px 0;">${nav}</td></tr>
    <tr><td align="center" style="padding:22px 20px 0;">${socials}</td></tr>

    <tr><td align="center" style="padding:34px 20px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:1100px;border-top:1px solid #e6e6ee;">
        <tr><td align="center" style="padding:22px 0 44px;font-size:13px;color:#4a4a5a;">
          <a href="${SITE}/policies/privacy-policy" style="color:#5b5bd6;text-decoration:none;">Privacy Policy</a>
          <span style="color:#9a9aa8;"> &middot; </span>
          <a href="${SITE}/policies/terms-of-service" style="color:#5b5bd6;text-decoration:none;">Legal</a>
          <span style="color:#9a9aa8;"> &middot; </span>
          &copy; ${new Date().getFullYear()}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    {
      status: ok ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const personId = verifyConfirmToken(token);

  if (!personId) {
    return page(
      "That confirmation link didn't work.",
      "The link looks incomplete or has already been used. Email <a href=\"mailto:TeamSales@titanbattlegear.com\" style=\"color:#5b5bd6;\">TeamSales@titanbattlegear.com</a> and we'll sort it out.",
      false
    );
  }

  try {
    await updateOne("people", personId, { tsEmailConfirmation: true });
  } catch (err) {
    console.error("[twenty-confirm] failed", (err as Error).message);
    return page(
      "Something went wrong on our end.",
      "We couldn't record your confirmation. Email <a href=\"mailto:TeamSales@titanbattlegear.com\" style=\"color:#5b5bd6;\">TeamSales@titanbattlegear.com</a> and we'll take care of it.",
      false
    );
  }

  return page(
    "Thanks for confirming! Your<br>Team Program is in the works.",
    "A Titan Sales Representative will reach out to you shortly!",
    true
  );
}
