/**
 * Internal "new submission" notification, rebuilt for Resend.
 *
 * HubSpot sent one of these on every submission of all four intake forms -- not from a
 * workflow but from the form itself, via `configuration.notifyRecipients`. Scanning all
 * 25 enabled flows for the form GUIDs finds no notify action, so for Photo Submission and
 * Titan Moments Giveaway (which have no workflows at all) this email was the *only* thing
 * that told anyone an entry had arrived.
 *
 * HubSpot's own template is built in and is not exposed by the forms API, so this is a
 * rebuild of its shape rather than a copy: subject, the page it came from, every submitted
 * field as a label/value list in form order, and a link to the record. The field order and
 * the labels are not invented -- they are read from the live form definitions
 * (`/marketing/v3/forms/{guid}`), so the email reads in the same order as the form.
 *
 * Sent from the relay rather than a Twenty workflow for the same reason as the confirmation
 * email: Twenty's send-email action requires an OAuth-connected mailbox, and sending here
 * keeps the From address on the brand domain.
 */

/** A field as HubSpot renders it in the notification: its label, and the submitted value. */
export type NotificationRow = { label: string; value: string };

const LOGO_URL =
  "https://cdn.shopify.com/s/files/1/0635/2401/2210/files/titan_battlegear_logo.png?v=1730320377";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * HubSpot's label text is HTML-encoded in the form definition ("Media &amp; Story Release"),
 * so decode the few entities it actually uses before re-escaping for output. Without this
 * the email shows the raw entity.
 */
export function decodeLabel(label: string) {
  return label
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

export function notificationSubject(formName: string, rows: NotificationRow[]) {
  // HubSpot leads with the form name; the submitter's name makes it scannable in a thread.
  const first = rows.find((r) => r.label === "First Name")?.value ?? "";
  const last = rows.find((r) => r.label === "Last Name")?.value ?? "";
  const who = [first, last].filter(Boolean).join(" ");
  return who ? `New submission: ${formName} — ${who}` : `New submission: ${formName}`;
}

export function notificationEmailHtml(opts: {
  formName: string;
  rows: NotificationRow[];
  pageUri?: string;
  recordUrl?: string;
  /** Recipients the form listed that no longer resolve to a user; surfaced, not hidden. */
  unresolvedRecipients?: string[];
}) {
  const { formName, rows, pageUri, recordUrl, unresolvedRecipients = [] } = opts;

  const cells = rows
    .map(
      (r) => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e3e8ee;font-size:13px;color:#51606f;width:42%;vertical-align:top;">${esc(decodeLabel(r.label))}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e3e8ee;font-size:13px;color:#1b3a52;vertical-align:top;">${esc(r.value) || "<span style=\"color:#9aa8b5;\">—</span>"}</td>
          </tr>`
    )
    .join("\n");

  const warning = unresolvedRecipients.length
    ? `<tr><td style="padding:12px;background:#fff6e5;border:1px solid #f0d9a8;border-radius:4px;font-size:12px;color:#7a5a12;">
          This form also lists ${unresolvedRecipients.length} HubSpot recipient ID(s) that no longer
          match an active user (${esc(unresolvedRecipients.join(", "))}). They were not emailed.
        </td></tr><tr><td style="height:16px;"></td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7f9;font-family:Helvetica,Arial,sans-serif;color:#1b3a52;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f9;">
      <tr><td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr><td align="center" style="padding-bottom:20px;">
            <img src="${LOGO_URL}" alt="Titan BattleGear" width="180" height="58" style="display:block;border:0;width:180px;max-width:180px;height:auto;">
          </td></tr>
          ${warning}
          <tr><td style="background:#ffffff;border:1px solid #e3e8ee;border-radius:6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:18px 12px 6px;">
                <div style="font-size:16px;font-weight:bold;color:#1b3a52;">New submission: ${esc(formName)}</div>
                ${pageUri ? `<div style="font-size:12px;color:#7a8794;padding-top:4px;">Submitted on <a href="${esc(pageUri)}" style="color:#2a6fb0;">${esc(pageUri)}</a></div>` : ""}
              </td></tr>
              ${cells}
            </table>
          </td></tr>
          ${
            recordUrl
              ? `<tr><td align="center" style="padding-top:20px;">
            <a href="${esc(recordUrl)}" style="display:inline-block;background:#1b3a52;color:#ffffff;text-decoration:none;font-size:14px;padding:11px 22px;border-radius:4px;">View the record</a>
          </td></tr>`
              : ""
          }
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function notificationEmailText(opts: {
  formName: string;
  rows: NotificationRow[];
  pageUri?: string;
  recordUrl?: string;
  unresolvedRecipients?: string[];
}) {
  const { formName, rows, pageUri, recordUrl, unresolvedRecipients = [] } = opts;
  const lines = [`New submission: ${formName}`];
  if (pageUri) lines.push(`Submitted on ${pageUri}`);
  lines.push("");
  for (const r of rows) lines.push(`${decodeLabel(r.label)}: ${r.value || "—"}`);
  if (recordUrl) lines.push("", `View the record: ${recordUrl}`);
  if (unresolvedRecipients.length) {
    lines.push(
      "",
      `Note: ${unresolvedRecipients.length} HubSpot recipient ID(s) on this form no longer match an active user (${unresolvedRecipients.join(", ")}) and were not emailed.`
    );
  }
  return lines.join("\n");
}
