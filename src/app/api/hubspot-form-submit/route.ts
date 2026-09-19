import { NextResponse } from "next/server";

/**
 * Submission relay for the native HubSpot team forms in the Shopify theme
 * (Concept_Theme_Files: sections/hubspot-team-{sales,discount}-form.liquid).
 *
 * Why this exists: the forms used to POST to HubSpot's Forms API
 * (/submissions/v3/integration/submit), which is a Marketing-tier feature. This route
 * does the same job with the CRM API, which is available on the basic plan:
 *
 *   1. upsert the contact, matched on email
 *   2. upsert the company, matched on name
 *   3. associate the two
 *
 * The private-app token cannot live in the theme -- theme code is public -- which is
 * the whole reason the write is proxied through here.
 *
 * NOT handled here: everything the HubSpot workflows used to do downstream of the
 * contact write (owner rotation, Deal creation, tasks, the parent-referral contact,
 * subscriptions, email). Those are Marketing-tier and are a separate piece of work.
 */

const HUBSPOT = "https://api.hubapi.com";

// Same allowlist as hubspot-logo-upload: the storefront plus the myshopify host that
// serves preview themes, which is how the forms are tested before going live.
const ALLOWED_ORIGINS = [
  "https://www.titanbattlegear.com",
  "https://titanbattlegear.com",
  "https://42ddef-3.myshopify.com",
];

// Guards against a malformed or hostile payload turning into a huge HubSpot write.
const MAX_PROPERTIES = 100;
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

class HubSpotError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function hubspot(path: string, init: RequestInit = {}) {
  const response = await fetch(`${HUBSPOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body as { message?: string } | null)?.message ?? `HubSpot ${response.status}`;
    throw new HubSpotError(message, response.status, body);
  }

  return body;
}

/**
 * Keeps only usable string values. HubSpot rejects several properties when sent as an
 * empty string, and the theme omits fields on steps the visitor never saw, so blanks
 * here are noise rather than intent.
 */
function clean(input: unknown): Props {
  if (!input || typeof input !== "object") return {};

  const out: Props = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    const str = typeof value === "string" ? value : String(value);
    if (!str.trim()) continue;
    if (str.length > MAX_VALUE_LENGTH) continue;
    out[key] = str;
    if (Object.keys(out).length >= MAX_PROPERTIES) break;
  }
  return out;
}

/**
 * HubSpot has no single upsert for arbitrary match properties, so search first and then
 * PATCH or POST. Matching mirrors what the Forms API did: contacts by email, companies
 * by name, so a repeat submitter updates their record instead of duplicating it.
 */
async function upsert(objectType: "contacts" | "companies", properties: Props, matchProperty: string) {
  const matchValue = properties[matchProperty];
  if (!matchValue) return null;

  const found = (await hubspot(`/crm/v3/objects/${objectType}/search`, {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: matchProperty, operator: "EQ", value: matchValue }] },
      ],
      properties: [matchProperty],
      limit: 1,
    }),
  })) as { results?: Array<{ id: string }> };

  const existing = found?.results?.[0];

  if (existing) {
    await hubspot(`/crm/v3/objects/${objectType}/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    return { id: existing.id, created: false };
  }

  const created = (await hubspot(`/crm/v3/objects/${objectType}`, {
    method: "POST",
    body: JSON.stringify({ properties }),
  })) as { id: string };

  return { id: created.id, created: true };
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  const fail = (status: number, error: string) =>
    NextResponse.json({ success: false, error }, { status, headers: cors });

  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    console.error("[hubspot-form-submit] HUBSPOT_PRIVATE_APP_TOKEN is not set");
    return fail(500, "Server is not configured");
  }

  let payload: {
    formName?: string;
    contact?: unknown;
    company?: unknown;
    pageUri?: string;
    pageName?: string;
    hutk?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return fail(400, "Invalid request body");
  }

  const contact = clean(payload.contact);
  const company = clean(payload.company);

  if (!contact.email) {
    return fail(400, "An email address is required");
  }

  // Reproduces what the Forms API used to stamp automatically.
  if (payload.formName && !contact.ts_intake_source) {
    contact.ts_intake_source = payload.formName;
  }
  if (!contact.lifecyclestage) {
    contact.lifecyclestage = "lead";
  }

  // Stands in for the form-submission event that the "(Native)" workflows used to enroll
  // on. Those are list-based and re-enroll when this value changes, so it must be written
  // on every submit -- including a repeat submit by the same contact, whose ts_intake_source
  // is already set and would otherwise never re-trigger. Epoch ms is what datetime expects.
  contact.ts_last_intake_at = String(Date.now());

  try {
    const contactResult = await upsert("contacts", contact, "email");
    if (!contactResult) return fail(400, "An email address is required");

    let companyResult: { id: string; created: boolean } | null = null;

    if (company.name) {
      companyResult = await upsert("companies", company, "name");

      if (companyResult) {
        // v4 default association: everything is in the path, no body.
        try {
          await hubspot(
            `/crm/v4/objects/contacts/${contactResult.id}/associations/default/companies/${companyResult.id}`,
            { method: "PUT" }
          );
        } catch (error) {
          // Losing the company link is worse than losing nothing, but far better than
          // failing a submission that has already created the contact.
          console.warn(
            "[hubspot-form-submit] association failed",
            (error as HubSpotError).message
          );
        }
      }
    }

    console.log("[hubspot-form-submit]", {
      form: payload.formName,
      contactId: contactResult.id,
      contactCreated: contactResult.created,
      companyId: companyResult?.id ?? null,
      pageUri: payload.pageUri,
    });

    return NextResponse.json(
      {
        success: true,
        contactId: contactResult.id,
        companyId: companyResult?.id ?? null,
        created: contactResult.created,
      },
      { status: 200, headers: cors }
    );
  } catch (error) {
    const hsError = error as HubSpotError;
    console.error(
      "[hubspot-form-submit] failed",
      hsError.status,
      hsError.message,
      JSON.stringify(hsError.body)
    );

    // 400 from HubSpot means the payload itself is wrong (bad email, unknown property,
    // value not in a dropdown's options) -- worth showing the visitor. Anything else is
    // ours or HubSpot's problem, so stay generic.
    return fail(
      hsError.status === 400 ? 400 : 502,
      hsError.status === 400 ? hsError.message : "Could not save your submission"
    );
  }
}
