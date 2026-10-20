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

export const OPTIONS = corsPreflight;

export const POST = createFormHandler({
  formName: "Team Sales Form",
  personFields: TEAM_SALES_PERSON_FIELDS,
  companyFields: TEAM_SALES_COMPANY_FIELDS,
  consentBasis: "LEGITIMATE_INTEREST_PQL: Contact submitted Team Custom Sales",
  confirmation: null,
});
