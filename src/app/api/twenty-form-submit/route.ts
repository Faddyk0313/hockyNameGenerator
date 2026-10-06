import { NextResponse } from "next/server";
import { upsert, TwentyError } from "@/lib/twenty";
import { PERSON_FIELDS, COMPANY_FIELDS, selectValue } from "@/lib/twenty-field-map";
import { confirmUrlFor } from "@/lib/confirm-token";
import { sendEmail } from "@/lib/resend";
import {
  CONFIRMATION_SUBJECT,
  confirmationEmailHtml,
  confirmationEmailText,
} from "@/lib/discount-confirmation-email";

/**
 * Twenty counterpart of hubspot-form-submit. Same payload shape -- `contact` and
 * `company` keyed by HubSpot property names -- so the theme section needs only its
 * `submit_endpoint` setting repointed here.
 *
 * Deliberately dumb: it upserts the Person and Company, associates them, and stops.
 * Everything downstream -- lead scoring, task creation, the parent-referral contact,
 * the confirmation email -- lives in Twenty workflows, where the sales team can edit
 * the rules without a code change and a deploy. That is the whole point of moving off
 * HubSpot; encoding branch logic here would just rebuild the same bottleneck in a new
 * place.
 *
 * The referred decision-maker's details are written onto the submitting Person as
 * ordinary fields, and the Company is upserted before the Person, because the referral
 * workflow triggers on person.created and sees only the record as it was created.
 *
 * The confirmation email is the one exception to that split, and it is sent from here.
 * It was going to be a Twenty workflow step -- Twenty can send through Resend over SMTP
 * -- but the confirm button needs a per-person signed URL, and Twenty's template engine
 * can only interpolate record fields; it cannot compute an HMAC. HubSpot had the same
 * requirement and met it invisibly, stamping a `_hsenc` parameter onto a static link at
 * send time. Sending from here is the faithful port; only the copy becomes less editable.
 */

const ALLOWED_ORIGINS = [
  "https://www.titanbattlegear.com",
  "https://titanbattlegear.com",
  "https://42ddef-3.myshopify.com",
];

const MAX_VALUE_LENGTH = 65536;

type Props = Record<string, string>;

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

function clean(input: unknown): Props {
  if (!input || typeof input !== "object") return {};
  const out: Props = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    const str = typeof value === "string" ? value : String(value);
    if (!str.trim() || str.length > MAX_VALUE_LENGTH) continue;
    out[key] = str.trim();
  }
  return out;
}

/** Map HubSpot-named props onto a Twenty record, re-keying dropdowns and composites. */
function toTwenty(props: Props, map: Record<string, string>) {
  const rec: Record<string, unknown> = {};
  const name: Record<string, string> = {};
  const address: Record<string, string> = {};

  for (const [hsName, raw] of Object.entries(props)) {
    const target = map[hsName];
    if (!target) continue;

    const value = selectValue(hsName, raw);
    if (value === null) continue; // unknown dropdown option: drop the field, keep the lead

    if (target === "name.firstName") name.firstName = value;
    else if (target === "name.lastName") name.lastName = value;
    else if (target === "emails") rec.emails = { primaryEmail: value };
    else if (target === "phones") rec.phones = { primaryPhoneNumber: value };
    else if (target === "domainName") {
      const url = value.startsWith("http") ? value : `https://${value}`;
      rec.domainName = { primaryLinkUrl: url };
    } else if (target.startsWith("address.")) address[target.slice(8)] = value;
    else rec[target] = value;
  }

  if (Object.keys(name).length) rec.name = name;
  if (Object.keys(address).length) rec.address = address;
  return rec;
}

/**
 * Send the confirmation email. Never throws: by the time this runs the Person is
 * already saved in Twenty, so a Resend outage must not turn a captured lead into a
 * form error for the visitor. Failures are logged for follow-up instead.
 */
async function sendConfirmation(opts: {
  personId: string;
  email: string;
  firstName: string;
  companyName: string;
}) {
  try {
    const confirmUrl = confirmUrlFor(opts.personId);
    const body = {
      firstName: opts.firstName || "there",
      companyName: opts.companyName || "your organization",
      confirmUrl,
    };
    const sent = await sendEmail({
      to: opts.email,
      subject: CONFIRMATION_SUBJECT,
      html: confirmationEmailHtml(body),
      text: confirmationEmailText(body),
      replyTo: "TeamSales@titanbattlegear.com",
    });
    console.log("[twenty-form-submit] confirmation sent", {
      personId: opts.personId,
      messageId: sent.id,
    });
  } catch (err) {
    console.error(
      "[twenty-form-submit] confirmation email failed",
      opts.personId,
      (err as Error).message
    );
  }
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const fail = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status, headers: cors });

  if (!process.env.TWENTY_SERVER_URL || !process.env.TWENTY_API_KEY) {
    console.error("[twenty-form-submit] TWENTY_SERVER_URL or TWENTY_API_KEY is not set");
    return fail(500, "Server is not configured");
  }

  let payload: { formName?: string; contact?: unknown; company?: unknown; pageUri?: string };
  try {
    payload = await req.json();
  } catch {
    return fail(400, "Invalid request body");
  }

  const contact = clean(payload.contact);
  const company = clean(payload.company);
  if (!contact.email) return fail(400, "An email address is required");

  if (payload.formName && !contact.ts_intake_source) {
    contact.ts_intake_source = payload.formName;
  }
  if (!contact.customer_tag) contact.customer_tag = "B2B";

  try {
    // Company first, so the Person can be created with companyId already set. The
    // referral workflow triggers on person.created and reads the company off the
    // trigger payload; that payload is the record as created, so associating in a
    // later update is invisible to it and its Update Company step fails with
    // "Object record ID and name are required".
    let companyId: string | null = null;
    if (company.name) {
      const companyRecord = toTwenty(company, COMPANY_FIELDS);

      // Twenty puts a UNIQUE index on domainNamePrimaryLinkUrl, so the domain -- not the
      // name -- is a company's identity there. Matching on name alone meant a submission
      // that reused a known domain under a different spelling of the org name ("Oakville
      // Jr Hockey" vs "Oakville Jr. Hockey Club") found nothing, tried to create, and was
      // rejected on the duplicate domain -- losing the lead on a 400. Match the domain
      // first when there is one, and fall back to the name.
      const domain = (companyRecord.domainName as { primaryLinkUrl?: string } | undefined)
        ?.primaryLinkUrl;
      const matchFilter = domain
        ? `domainName.primaryLinkUrl[eq]:${domain}`
        : `name[eq]:${company.name}`;

      const c = await upsert("companies", matchFilter, companyRecord);
      companyId = c.id;
    }

    const personRecord = toTwenty(contact, PERSON_FIELDS);
    if (companyId) personRecord.companyId = companyId;
    const person = await upsert(
      "people",
      `emails.primaryEmail[eq]:${contact.email}`,
      personRecord
    );

    console.log("[twenty-form-submit]", {
      form: payload.formName,
      personId: person.id,
      companyId,
      created: person.created,
    });

    // Only on first capture. HubSpot's workflow had shouldReEnroll:false, so a repeat
    // submission from the same email did not re-send; awaited rather than detached
    // because a serverless function may be frozen the moment it responds.
    if (person.created) {
      await sendConfirmation({
        personId: person.id,
        email: contact.email,
        firstName: contact.firstname ?? "",
        companyName: company.name ?? "",
      });
    }

    return NextResponse.json(
      { success: true, personId: person.id, companyId, created: person.created },
      { status: 200, headers: cors }
    );
  } catch (error) {
    const e = error as TwentyError;
    console.error("[twenty-form-submit] failed", e.status, e.message, JSON.stringify(e.body));
    return fail(
      e.status === 400 ? 400 : 502,
      e.status === 400 ? e.message : "Could not save your submission"
    );
  }
}
