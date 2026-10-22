/**
 * Team Custom Sales Form -> Twenty.
 *
 * Shares the Person/Company schema with the Team Discount Form; the differences are the
 * logo block (`ts_logo_authorization`, `logo_referral`, `ts_logo_upload`) and the company's
 * `ts_num_of_teams`. The file field arrives as a URL: the theme uploads to
 * `/api/hubspot-logo-upload` first and submits the returned link.
 *
 * No confirmation email. HubSpot's Team Sales form sent none -- `TS Intake - Workflow A`
 * (1776507266) notifies the sales team instead, which is a Twenty workflow, not a relay job.
 */

import { createFormHandler, corsPreflight } from "@/lib/relay";
import { TEAM_SALES_PERSON_FIELDS, TEAM_SALES_COMPANY_FIELDS } from "@/lib/twenty-field-map";
import { TEAM_SALES_NOTIFICATION_FIELDS } from "@/lib/intake-notification-fields";
import { TEAM_SALES_RECIPIENTS } from "@/lib/intake-notification-recipients";

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Team Sales Form",
  personFields: TEAM_SALES_PERSON_FIELDS,
  companyFields: TEAM_SALES_COMPANY_FIELDS,
  // Verbatim from HubSpot workflow 1822551927, which opts Team Sales submitters into
  // subscription 2615227543. The explanation text really does say "Team Discount" there --
  // their copy-paste from the discount workflow. Replicated as-is rather than corrected.
  consentBasis: "LEGITIMATE_INTEREST_PQL: Contact submitted Team Discount",
  confirmation: null,
  notification: {
    to: TEAM_SALES_RECIPIENTS,
    fields: TEAM_SALES_NOTIFICATION_FIELDS,
  },
});
