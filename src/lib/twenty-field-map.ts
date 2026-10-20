/**
 * HubSpot property name -> Twenty field, plus dropdown value re-keying.
 *
 * Twenty requires SELECT option *values* to be UPPER_SNAKE_CASE (verified against
 * v2.43.0: sending "Not Sure" fails with INVALID_FIELD_INPUT). The option *labels*
 * carry the original HubSpot wording, so the Twenty UI reads identically to HubSpot
 * while the stored key differs. Every dropdown value from the theme must therefore
 * pass through SELECT_VALUES before it is sent.
 *
 * Source of truth for the schema itself: twenty-crm/schema/*.json.
 *
 * Each mapping carries its Twenty `kind` so the relay knows how to coerce the value.
 * Phase 1 instead named date fields in an `if` inside the route, which meant every new
 * form with a date field wrote epoch milliseconds into a DATE field and 400'd. Declaring
 * the kind here makes a new form's date field a one-line map entry.
 */

export type FieldKind =
  /** Plain scalar written through untouched. */
  | "text"
  /** Composite {primaryEmail}. */
  | "email"
  /** Composite {primaryPhoneNumber, callingCode, countryCode}. */
  | "phone"
  /** TEXT field a Twenty workflow copies into a native phone field; needs E.164. */
  | "workflowPhone"
  /** Theme sends HubSpot epoch ms; Twenty DATE wants YYYY-MM-DD. */
  | "date"
  /** Composite {primaryLinkUrl}, scheme added if missing. */
  | "link"
  /** Twenty BOOLEAN; accepts HubSpot's "true"/"Yes"/"on". */
  | "boolean"
  /** Twenty NUMBER. */
  | "number";

export type FieldMapping = { to: string; kind?: FieldKind };
export type FieldMap = Record<string, FieldMapping>;

/** Fields shared by every Titan intake form. */
const COMMON_PERSON: FieldMap = {
  firstname: { to: "name.firstName" },
  lastname: { to: "name.lastName" },
  email: { to: "emails", kind: "email" },
  mobilephone: { to: "phones", kind: "phone" },
  phone: { to: "phones", kind: "phone" },
  ts_intake_source: { to: "tsIntakeSource" },
  ts_lead_source: { to: "tsLeadSource" },
  customer_tag: { to: "customerTag" },
};

/** The decision-maker referral block, shared by the two team forms. */
const REFERRAL_PERSON: FieldMap = {
  ts_is_decision_maker: { to: "tsIsDecisionMaker" },
  ts_dm_known: { to: "tsDmKnown" },
  ts_referred_dm_role: { to: "tsReferredDmRole" },
  ts_referred_dm_name: { to: "tsReferredDmName" },
  ts_referred_dm_last_name: { to: "tsReferredDmLastName" },
  ts_referred_dm_email: { to: "tsReferredDmEmail" },
  ts_referred_dm_phone: { to: "tsReferredDmPhone", kind: "workflowPhone" },
  ts_dm_intro_permission: { to: "tsDmIntroPermission" },
};

/** Fields both team forms collect about the buying process. */
const TEAM_PERSON: FieldMap = {
  ts_intake_persona: { to: "tsIntakePersona" },
  ts_organization_role: { to: "tsOrganizationRole" },
  ts_team_sales_persona: { to: "tsTeamSalesPersona" },
  ts_desired_delivery_date: { to: "tsDesiredDeliveryDate", kind: "date" },
  ts_lead_ordering_method: { to: "tsLeadOrderingMethod" },
  ts_team_sales_lead_status: { to: "tsTeamSalesLeadStatus" },
  ts_email_confirmation: { to: "tsEmailConfirmation", kind: "boolean" },
};

const COMMON_COMPANY: FieldMap = {
  name: { to: "name" },
  website: { to: "domainName", kind: "link" },
  city: { to: "address.addressCity" },
  state: { to: "address.addressState" },
  ts_company_org_type: { to: "tsCompanyOrgType" },
};

/* --------------------------------------------------------------- per form */

export const DISCOUNT_PERSON_FIELDS: FieldMap = {
  ...COMMON_PERSON,
  ...TEAM_PERSON,
  ...REFERRAL_PERSON,
  ts_custom_interest: { to: "tsCustomInterest" },
};

export const DISCOUNT_COMPANY_FIELDS: FieldMap = {
  ...COMMON_COMPANY,
  ts_team_discount_start: { to: "tsTeamDiscountStart", kind: "date" },
  ts_discount_distribution_method: { to: "tsDiscountDistributionMethod" },
  ts_discount_status: { to: "tsDiscountStatus" },
};

export const TEAM_SALES_PERSON_FIELDS: FieldMap = {
  ...COMMON_PERSON,
  ...TEAM_PERSON,
  ...REFERRAL_PERSON,
  ts_logo_authorization: { to: "tsLogoAuthorization" },
  logo_referral: { to: "tsLogoReferral" },
  ts_logo_upload: { to: "tsLogoUpload", kind: "link" },
};

export const TEAM_SALES_COMPANY_FIELDS: FieldMap = {
  ...COMMON_COMPANY,
  ts_num_of_teams: { to: "tsNumOfTeams" },
};

export const PHOTO_PERSON_FIELDS: FieldMap = {
  ...COMMON_PERSON,
  ts_photo_url: { to: "tsPhotoUrl", kind: "link" },
  ts_photo_caption: { to: "tsPhotoCaption" },
  ts_photo_consent: { to: "tsPhotoConsent", kind: "boolean" },
};

export const GIVEAWAY_PERSON_FIELDS: FieldMap = {
  ...COMMON_PERSON,
  titan_moment: { to: "tsTitanMoment" },
  ts_photo_url: { to: "tsPhotoUrl", kind: "link" },
  ts_giveaway_consent: { to: "tsGiveawayConsent", kind: "boolean" },
};

/* ------------------------------------------------------------ select maps */

/**
 * HubSpot dropdown value -> Twenty SELECT option value, keyed by HubSpot property.
 *
 * Shared across forms *by property name*. That is safe only while a property means the
 * same thing everywhere, which is true today because the `ts_*` properties are global
 * HubSpot contact properties. A form that needs different options for the same property
 * name must pass its own table through FormConfig.selectValues instead.
 */
export const SELECT_VALUES: Record<string, Record<string, string>> = {
  ts_lead_source: {
    "Team Discount Form": "TEAM_DISCOUNT_FORM",
    "Team Sales Form": "TEAM_SALES_FORM",
    "Photo Submission": "PHOTO_SUBMISSION",
    "Titan Moments Giveaway": "TITAN_MOMENTS_GIVEAWAY",
    Other: "OTHER",
  },
  ts_organization_role: {
    Parent: "PARENT",
    Player: "PLAYER",
    Coach: "COACH",
    Director: "DIRECTOR",
    "Team Admin": "TEAM_ADMIN",
    "Team Manager": "TEAM_MANAGER",
    Dealer: "DEALER",
    Other: "OTHER",
  },
  ts_team_sales_persona: {
    "I am the decision maker for team purchases": "DECISION_MAKER",
    "I influence or help coordinate purchases": "INFLUENCER",
    "I am a parent/player/supporter": "PARENT_SUPPORTER",
  },
  ts_custom_interest: { Yes: "YES", No: "NO", Maybe: "MAYBE" },
  ts_is_decision_maker: { Yes: "YES", No: "NO", Unknown: "UNKNOWN" },
  ts_dm_known: { Yes: "YES", No: "NO", "Not Sure": "NOT_SURE" },
  ts_referred_dm_role: {
    Director: "DIRECTOR",
    "Team Manager": "TEAM_MANAGER",
    "Team Admin": "TEAM_ADMIN",
    Coach: "COACH",
    Dealer: "DEALER",
    Other: "OTHER",
  },
  ts_dm_intro_permission: { Yes: "YES", No: "NO", Unsure: "UNSURE" },
  ts_lead_ordering_method: {
    "Titan-Hosted Team Store": "TITAN_HOSTED_TEAM_STORE",
    "Single Invoice (Bulk Shipping)": "SINGLE_INVOICE_BULK",
    "Dealer or Org Hosted Store": "DEALER_OR_ORG_HOSTED",
    Unknown: "UNKNOWN",
  },
  ts_team_sales_lead_status: {
    New: "NEW",
    Working: "WORKING",
    "DM Identified": "DM_IDENTIFIED",
    "DM Confirmed": "DM_CONFIRMED",
    Disqualified: "DISQUALIFIED",
    Nurture: "NURTURE",
  },
  ts_company_org_type: {
    Youth: "YOUTH",
    "High School/College": "HIGH_SCHOOL_COLLEGE",
    "Junior/Pro": "JUNIOR_PRO",
    Other: "OTHER",
  },
  ts_discount_distribution_method: {
    "We will email the code to our organization": "EMAIL_TO_ORG",
    "Please provide a shareable flyer with QR code": "FLYER_QR",
  },
  ts_discount_status: {
    "Pending Activation": "PENDING_ACTIVATION",
    Activated: "ACTIVATED",
    "Not Requested": "NOT_REQUESTED",
    Scheduled: "SCHEDULED",
  },
  // Team Sales
  ts_logo_authorization: { Yes: "YES", No: "NO", "Not Sure": "NOT_SURE" },
  ts_num_of_teams: {
    "1": "ONE",
    "2-4": "TWO_TO_FOUR",
    "5-8": "FIVE_TO_EIGHT",
    "9+": "NINE_PLUS",
  },
  // Titan Moments Giveaway. Values confirmed from the live HubSpot property.
  titan_moment: {
    "Titan Snipe": "TITAN_SNIPE",
    "Titan Dangle": "TITAN_DANGLE",
    "Titan Hatty": "TITAN_HATTY",
    "Titan PlayMaker": "TITAN_PLAYMAKER",
  },
};

/**
 * Re-key a dropdown value. Unknown values return null so the caller can drop the field
 * rather than have Twenty reject the whole write -- one bad option must not cost a lead.
 */
export function selectValue(
  hsProperty: string,
  raw: string,
  overrides?: Record<string, Record<string, string>>
): string | null {
  const table = overrides?.[hsProperty] ?? SELECT_VALUES[hsProperty];
  if (!table) return raw;
  return table[raw] ?? table[raw.trim()] ?? null;
}
