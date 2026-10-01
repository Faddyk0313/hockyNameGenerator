/**
 * "V1 - Discount Request Confirmation" -- the HubSpot marketing email (content id
 * 212751195273) that workflow 1821117057 sent on Team Discount Form submission,
 * rebuilt for Resend.
 *
 * It lives in the relay rather than in a Twenty workflow because Twenty's send-email
 * action can only send through an OAuth-connected Gmail/Outlook account
 * (send-email.workflow-action.js resolves a ConnectedAccount); there is no SMTP or
 * API-key provider hook. Sending from the relay also keeps the From address on the
 * brand domain instead of an individual's mailbox.
 *
 * The confirm button replaces HubSpot's landing page (46588550.hs-sites.com/-confirmation),
 * whose visit fired workflow 1821173566 to set ts_email_confirmation = true. Here the
 * link hits /api/twenty-confirm, which sets the same flag on the Person in Twenty.
 */

export const CONFIRMATION_SUBJECT = "Confirm Your Team Discount Request";
export const CONFIRMATION_PREVIEW =
  "Click below to verify your request. Once confirmed, our team will reach out to coordinate your discount window.";

const LOGO_URL = "https://www.titanbattlegear.com/cdn/shop/files/titan-logo.png";
const REFERRAL_FORM_URL = "https://www.titanbattlegear.com/pages/team-discount-program";

export function confirmationEmailHtml(opts: {
  firstName: string;
  companyName: string;
  confirmUrl: string;
}) {
  const { firstName, companyName, confirmUrl } = opts;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#1b3a52;">
    <span style="display:none;max-height:0;overflow:hidden;">${esc(CONFIRMATION_PREVIEW)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr><td align="center" style="padding-bottom:28px;">
            <img src="${LOGO_URL}" alt="Titan BattleGear" width="200" style="display:block;border:0;max-width:200px;height:auto;">
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:16px;">Hi ${esc(firstName)},</td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:16px;">
            Thanks for requesting information about Titan BattleGear's Team Discount Program for ${esc(companyName)}.
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:24px;">
            Before we move forward, we need a quick confirmation that you're the appropriate contact to coordinate an organization-wide discount window.
          </td></tr>

          <tr><td align="center" style="font-size:16px;line-height:1.6;font-weight:bold;padding-bottom:20px;">
            If you're the right person to coordinate this request, confirm below:
          </td></tr>

          <tr><td align="center" style="padding-bottom:28px;">
            <a href="${confirmUrl}" style="background:#3f3f3f;color:#ffffff;text-decoration:none;display:inline-block;padding:16px 28px;font-size:15px;letter-spacing:0.04em;">
              CONFIRM TEAM DISCOUNT REQUEST
            </a>
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:16px;">
            Once confirmed, our team will prepare your discount setup and purchasing window.
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:16px;">
            If you're not the right contact for this request, please forward the link below to the appropriate person within your organization.
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:28px;">
            <a href="${REFERRAL_FORM_URL}" style="color:#1a9e96;">Team Discount Referral Form</a>
          </td></tr>

          <tr><td style="font-size:17px;line-height:1.5;font-weight:bold;padding-bottom:12px;">
            Titan's Team Discount Program includes:
          </td></tr>
          <tr><td style="font-size:16px;line-height:1.7;padding-bottom:28px;">
            <ul style="margin:0;padding-left:20px;">
              <li>25% off site-wide at <a href="https://www.titanbattlegear.com" style="color:#1a9e96;">TitanBattleGear.com</a></li>
              <li>A dedicated 7-day purchasing window</li>
              <li>A custom flyer + QR code for organization-wide distribution</li>
              <li>Access to Titan's industry-leading protective gear and apparel</li>
            </ul>
          </td></tr>

          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:4px;">— Adam Collins</td></tr>
          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:4px;">Titan Battlegear Team Sales</td></tr>
          <tr><td style="font-size:16px;line-height:1.6;padding-bottom:28px;">
            <a href="mailto:TeamSales@titanbattlegear.com" style="color:#1a9e96;">TeamSales@titanbattlegear.com</a>
          </td></tr>

          <tr><td align="center" style="font-size:12px;line-height:1.6;color:#6b7c8a;border-top:1px solid #e3e8ec;padding-top:16px;">
            Titan Battle Gear, 4380 NW 120th Ave, Coral Springs, FL 33065, United States, +1-954-767-6777
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function confirmationEmailText(opts: {
  firstName: string;
  companyName: string;
  confirmUrl: string;
}) {
  return [
    `Hi ${opts.firstName},`,
    ``,
    `Thanks for requesting information about Titan BattleGear's Team Discount Program for ${opts.companyName}.`,
    ``,
    `Before we move forward, we need a quick confirmation that you're the appropriate contact to coordinate an organization-wide discount window.`,
    ``,
    `Confirm your team discount request: ${opts.confirmUrl}`,
    ``,
    `Once confirmed, our team will prepare your discount setup and purchasing window.`,
    ``,
    `If you're not the right contact, forward this form to the right person: ${REFERRAL_FORM_URL}`,
    ``,
    `Titan's Team Discount Program includes:`,
    `- 25% off site-wide at TitanBattleGear.com`,
    `- A dedicated 7-day purchasing window`,
    `- A custom flyer + QR code for organization-wide distribution`,
    `- Access to Titan's industry-leading protective gear and apparel`,
    ``,
    `— Adam Collins`,
    `Titan Battlegear Team Sales`,
    `TeamSales@titanbattlegear.com`,
    ``,
    `Titan Battle Gear, 4380 NW 120th Ave, Coral Springs, FL 33065, United States, +1-954-767-6777`,
  ].join("\n");
}
