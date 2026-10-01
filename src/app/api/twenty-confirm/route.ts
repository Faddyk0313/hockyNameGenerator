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

function page(title: string, message: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f7f9fa;color:#1b3a52;">
  <div style="max-width:520px;margin:12vh auto;padding:40px 28px;background:#fff;border-radius:8px;text-align:center;">
    <div style="font-size:40px;line-height:1;margin-bottom:16px;">${ok ? "✓" : "!"}</div>
    <h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>
    <p style="font-size:16px;line-height:1.6;margin:0;color:#44616f;">${message}</p>
  </div>
</body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const personId = verifyConfirmToken(token);

  if (!personId) {
    return page(
      "That link didn't work",
      "The confirmation link looks incomplete. Please email TeamSales@titanbattlegear.com and we'll sort it out.",
      false
    );
  }

  try {
    await updateOne("people", personId, { tsEmailConfirmation: true });
  } catch (err) {
    console.error("[twenty-confirm] failed", (err as Error).message);
    return page(
      "Something went wrong",
      "We couldn't record your confirmation. Please email TeamSales@titanbattlegear.com.",
      false
    );
  }

  return page(
    "Request confirmed",
    "Thanks — your team discount request is confirmed. Our team will reach out to coordinate your discount window.",
    true
  );
}
