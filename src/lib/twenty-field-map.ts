/**
 * HubSpot property name -> Twenty field name, plus dropdown value re-keying.
 *
 * Twenty requires SELECT option *values* to be UPPER_SNAKE_CASE (verified against
 * v2.43.0: sending "Not Sure" fails with INVALID_FIELD_INPUT). The option *labels*
 * carry the original HubSpot wording, so the Twenty UI reads identically to HubSpot
 * while the stored key differs. Every dropdown value from the theme must therefore
 * pass through SELECT_VALUES before it is sent.
 *
 * Source of truth for the schema itself: twenty-crm/schema/discount_schema.json.
 */

export const PERSON_FIELDS: Record<string, string> = {
  // native
  firstname: "name.firstName",
  lastname: "name.lastName",
  email: "emails",
  mobilephone: "phones",
  // custom
  ts_intake_source: "tsIntakeSource",
  ts_intake_persona: "tsIntakePersona",
  ts_lead_source: "tsLeadSource",
  ts_organization_role: "tsOrganizationRole",
  ts_team_sales_persona: "tsTeamSalesPersona",
  ts_custom_interest: "tsCustomInterest",
  ts_is_decision_maker: "tsIsDecisionMaker",
  ts_dm_known: "tsDmKnown",
  ts_referred_dm_role: "tsReferredDmRole",
  ts_referred_dm_name: "tsReferredDmName",
  ts_referred_dm_last_name: "tsReferredDmLastName",
  ts_referred_dm_email: "tsReferredDmEmail",
  ts_referred_dm_phone: "tsReferredDmPhone",
  ts_dm_intro_permission: "tsDmIntroPermission",
  ts_desired_delivery_date: "tsDesiredDeliveryDate",
  ts_lead_ordering_method: "tsLeadOrderingMethod",
  ts_team_sales_lead_status: "tsTeamSalesLeadStatus",
  ts_email_confirmation: "tsEmailConfirmation",
  customer_tag: "customerTag",
};

export const COMPANY_FIELDS: Record<string, string> = {
  name: "name",
  website: "domainName",
  city: "address.addressCity",
  state: "address.addressState",
  ts_company_org_type: "tsCompanyOrgType",
  ts_team_discount_start: "tsTeamDiscountStart",
  ts_discount_distribution_method: "tsDiscountDistributionMethod",
  ts_discount_status: "tsDiscountStatus",
};

/** HubSpot dropdown value -> Twenty SELECT option value, keyed by HubSpot property. */
export const SELECT_VALUES: Record<string, Record<string, string>> = {
  ts_lead_source: {
    "Team Discount Form": "TEAM_DISCOUNT_FORM",
    "Team Sales Form": "TEAM_SALES_FORM",
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
};

/**
 * Re-key a dropdown value. Unknown values return null so the caller can drop the field
 * rather than have Twenty reject the whole write -- one bad option must not cost a lead.
 */
export function selectValue(hsProperty: string, raw: string): string | null {
  const table = SELECT_VALUES[hsProperty];
  if (!table) return raw;
  return table[raw] ?? table[raw.trim()] ?? null;
}
