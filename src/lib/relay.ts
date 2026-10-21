/**
 * Shared Twenty intake handler.
 *
 * Phase 1 shipped one route hard-wired to the Team Discount Form. Phase 2 adds more forms,
 * and copy-pasting that route is how `hubspot-form-submit` and `twenty-form-submit` already
 * drifted apart (one grew a MAX_PROPERTIES cap the other lacks). So the handler lives here,
 * parameterised by a small per-form config, and each route is a few lines of configuration.
 *
 * Deliberately dumb, as in Phase 1: it upserts the Person and Company, associates them, and
 * stops. Lead scoring, task creation, the parent-referral contact -- all of that lives in
 * Twenty workflows, where the sales team can edit the rules without a deploy. Encoding branch
 * logic here would rebuild the HubSpot bottleneck in a new place.
 *
 * The confirmation email is the one exception and is sent from here, because the confirm
 * button needs a per-person HMAC URL and Twenty's template engine can only interpolate record
 * fields. HubSpot met the same requirement invisibly with `_hsenc`.
 */

import { NextResponse } from "next/server";
import { upsert, TwentyError } from "@/lib/twenty";
import { selectValue, type FieldMap } from "@/lib/twenty-field-map";
import { confirmUrlFor } from "@/lib/confirm-token";
import { sendEmail } from "@/lib/resend";

const ALLOWED_ORIGINS = [
  "https://www.titanbattlegear.com",
  "https://titanbattlegear.com",
  "https://42ddef-3.myshopify.com",
];

const MAX_VALUE_LENGTH = 65536;

/** Phase 1 cap, kept: a runaway payload should not become a 100-field write. */
const MAX_PROPERTIES = 100;

type Props = Record<string, string>;

export type ConfirmationConfig = {
  subject: string;
  replyTo: string;
  html: (vars: { firstName: string; companyName: string; confirmUrl: string }) => string;
  text: (vars: { firstName: string; companyName: string; confirmUrl: string }) => string;
};

export type FormConfig = {
  /** Used for logs, and as the fallback for ts_intake_source / consent source. */
  formName: string;
  personFields: FieldMap;
  /** Omit for forms that capture no organization. */
  companyFields?: FieldMap;
  /** Per-form dropdown tables, when a property's options differ from the global map. */
  selectValues?: Record<string, Record<string, string>>;
  /**
   * Mirrors HubSpot's legalBasisExplanation. Null for forms that are not a marketing
   * opt-in event, so we do not record consent that was never given.
   */
  consentBasis: string | null;
  /** Null for forms that send no confirmation email. */
  confirmation: ConfirmationConfig | null;
  /** Default phone region. The forms have no country selector. */
  phoneDefault?: { callingCode: string; countryCode: string };
};

const DEFAULT_PHONE = { callingCode: "+1", countryCode: "CA" };

/* ------------------------------------------------------------------ coercion */

// TBG custom code: The forms have no country selector, so normalize Canadian/NANP input
// into the composite shape required by Twenty v2.43.
function toNanpNationalNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

// TBG custom code: The theme submits date fields as Unix milliseconds (HubSpot's format),
// while Twenty's DATE fields only accept a calendar date.
export function toTwentyDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!/^\d{13}$/.test(value)) return null;
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toBoolean(value: string): boolean {
  return ["true", "yes", "on", "1", "checked"].includes(value.toLowerCase());
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

function clean(input: unknown): Props {
  if (!input || typeof input !== "object") return {};
  const out: Props = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Object.keys(out).length >= MAX_PROPERTIES) break;
    const str = typeof value === "string" ? value : String(value);
    if (!str.trim() || str.length > MAX_VALUE_LENGTH) continue;
    out[key] = str.trim();
  }
  return out;
}

/**
 * Map HubSpot-named props onto a Twenty record, re-keying dropdowns and building the
 * composite shapes. The field's declared `kind` decides the coercion, so adding a form with
 * a date or phone field needs no change here.
 */
function toTwenty(props: Props, map: FieldMap, cfg: FormConfig) {
  const rec: Record<string, unknown> = {};
  const name: Record<string, string> = {};
  const address: Record<string, string> = {};
  const phone = cfg.phoneDefault ?? DEFAULT_PHONE;

  for (const [hsName, raw] of Object.entries(props)) {
    const mapping = map[hsName];
    if (!mapping) continue;

    const value = selectValue(hsName, raw, cfg.selectValues);
    if (value === null) continue; // unknown dropdown option: drop the field, keep the lead

    const { to, kind } = mapping;

    if (to === "name.firstName") name.firstName = value;
    else if (to === "name.lastName") name.lastName = value;
    else if (to.startsWith("address.")) address[to.slice(8)] = value;
    else if (kind === "email") rec.emails = { primaryEmail: value };
    else if (kind === "phone") {
      rec[to] = {
        primaryPhoneNumber: toNanpNationalNumber(value),
        primaryPhoneCallingCode: phone.callingCode,
        primaryPhoneCountryCode: phone.countryCode,
      };
    } else if (kind === "workflowPhone") {
      // A Twenty workflow copies this TEXT field into a native phone field, which rejects
      // a bare national number.
      rec[to] = `${phone.callingCode}${toNanpNationalNumber(value)}`;
    } else if (kind === "date") {
      const date = toTwentyDate(value);
      if (date) rec[to] = date;
    } else if (kind === "link") {
      const url = value.startsWith("http") ? value : `https://${value}`;
      rec[to] = { primaryLinkUrl: url };
    } else if (kind === "boolean") rec[to] = toBoolean(value);
    else if (kind === "number") {
      const n = Number(value);
      if (!Number.isNaN(n)) rec[to] = n;
    } else rec[to] = value;
  }

  if (Object.keys(name).length) rec.name = name;
  if (Object.keys(address).length) rec.address = address;
  return rec;
}

/**
 * Send the confirmation email. Never throws: by the time this runs the Person is already
 * saved in Twenty, so a Resend outage must not turn a captured lead into a form error for
 * the visitor. Failures are logged for follow-up instead.
 */
async function sendConfirmation(
  cfg: ConfirmationConfig,
  opts: { personId: string; email: string; firstName: string; companyName: string },
  formName: string
) {
  try {
    const body = {
      firstName: opts.firstName || "there",
      companyName: opts.companyName || "your organization",
      confirmUrl: confirmUrlFor(opts.personId),
    };
    const sent = await sendEmail({
      to: opts.email,
      subject: cfg.subject,
      html: cfg.html(body),
      text: cfg.text(body),
      replyTo: cfg.replyTo,
    });
    console.log(`[${formName}] confirmation sent`, {
      personId: opts.personId,
      messageId: sent.id,
    });
  } catch (err) {
    console.error(`[${formName}] confirmation email failed`, opts.personId, (err as Error).message);
  }
}

/* -------------------------------------------------------------------- route */

export function corsPreflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export function createFormHandler(cfg: FormConfig) {
  return async function POST(req: Request) {
    const cors = corsHeaders(req.headers.get("origin"));
    const fail = (status: number, error: string) =>
      NextResponse.json({ success: false, error }, { status, headers: cors });

    if (!process.env.TWENTY_SERVER_URL || !process.env.TWENTY_API_KEY) {
      console.error(`[${cfg.formName}] TWENTY_SERVER_URL or TWENTY_API_KEY is not set`);
      return fail(500, "Server is not configured");
    }

    let payload: { formName?: string; contact?: unknown; company?: unknown };
    try {
      payload = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const contact = clean(payload.contact);
    const company = clean(payload.company);
    if (!contact.email) return fail(400, "An email address is required");

    const formName = payload.formName || cfg.formName;
    if (!contact.ts_intake_source) contact.ts_intake_source = formName;
    if (!contact.customer_tag) contact.customer_tag = "B2B";

    const now = new Date().toISOString();

    try {
      // Company first, so the Person can be created with companyId already set. The referral
      // workflow triggers on person.created and reads the company off the trigger payload;
      // that payload is the record as created, so associating in a later update is invisible
      // to it and its Update Company step fails with "Object record ID and name are required".
      let companyId: string | null = null;
      // The organization's name arrives under different HubSpot properties per form ("name" on
      // the team forms, "company" on the consumer ones), so read it off the *mapped* record
      // rather than assuming a property name.
      const companyRecord = cfg.companyFields
        ? toTwenty(company, cfg.companyFields, cfg)
        : null;
      const companyName =
        typeof companyRecord?.name === "string" ? companyRecord.name : "";
      if (companyRecord && companyName) {

        // Twenty puts a UNIQUE index on domainNamePrimaryLinkUrl, so the domain -- not the
        // name -- is a company's identity there. Matching on name alone meant a submission
        // reusing a known domain under a different spelling ("Oakville Jr Hockey" vs
        // "Oakville Jr. Hockey Club") found nothing, tried to create, and was rejected on the
        // duplicate domain -- losing the lead on a 400. Twenty stores the domain
        // scheme-stripped and filters match the stored string literally, so the lookup must
        // use the bare host.
        const domain = (companyRecord.domainName as { primaryLinkUrl?: string } | undefined)
          ?.primaryLinkUrl?.replace(/^https?:\/\//, "")
          .replace(/\/+$/, "");
        const matchFilter = domain
          ? `domainName.primaryLinkUrl[eq]:${domain}`
          : `name[eq]:${companyName}`;

        const c = await upsert("companies", matchFilter, companyRecord);
        companyId = c.id;
      }

      const personRecord = toTwenty(contact, cfg.personFields, cfg);
      if (companyId) personRecord.companyId = companyId;

      // Consent. HubSpot opted submitters into a subscription on LEGITIMATE_INTEREST_PQL --
      // there is no checkbox, the submission itself is the basis. Twenty has no subscription
      // object, so rather than drop the record we store what makes it auditable: the flag,
      // when it happened, the basis, and which form it came from. This is a record of the
      // event, not a consent platform; when marketing email lands somewhere real these four
      // fields are what gets migrated.
      if (cfg.consentBasis) {
        personRecord.tsMarketingConsent = true;
        personRecord.tsMarketingConsentAt = now;
        personRecord.tsMarketingConsentBasis = cfg.consentBasis;
        personRecord.tsMarketingConsentSource = formName;
      }

      personRecord.tsLastIntakeAt = now;

      const person = await upsert(
        "people",
        `emails.primaryEmail[eq]:${contact.email}`,
        personRecord
      );

      console.log(`[${cfg.formName}]`, {
        form: formName,
        personId: person.id,
        companyId,
        created: person.created,
      });

      // Only on first capture. HubSpot's workflow had shouldReEnroll:false, so a repeat
      // submission from the same email did not re-send; awaited rather than detached because
      // a serverless function may be frozen the moment it responds.
      if (cfg.confirmation && person.created) {
        await sendConfirmation(
          cfg.confirmation,
          {
            personId: person.id,
            email: contact.email,
            firstName: contact.firstname ?? "",
            companyName,
          },
          cfg.formName
        );
      }

      return NextResponse.json(
        { success: true, personId: person.id, companyId, created: person.created },
        { status: 200, headers: cors }
      );
    } catch (error) {
      const e = error as TwentyError;
      console.error(`[${cfg.formName}] failed`, e.status, e.message, JSON.stringify(e.body));
      return fail(
        e.status === 400 ? 400 : 502,
        e.status === 400 ? e.message : "Could not save your submission"
      );
    }
  };
}
